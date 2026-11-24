//! Pure game rules, mirrored from lib/game/rules.ts. No accounts, no clock,
//! so every rule is unit tested here.

use crate::universe::*;

pub const SQUAD_SIZE: usize = 15;
pub const XI_SIZE: usize = 11;
pub const BENCH_SIZE: usize = 4;
pub const POINTS_PER_PERCENT: i128 = 10;
pub const POINT_CAP: i32 = 50;
pub const BEAT_BENCHMARK_BONUS: i32 = 2;
/// +2 for the biggest gainer among every stock started that gameweek.
pub const TOP_GAINER_BONUS: i32 = 2;
/// No top gainer (nobody started anything, or no prices).
pub const NO_STOCK: u8 = u8::MAX;
/// Beat SPYx by at least 0.5 percentage points (in millionths of a percent).
pub const BEAT_BENCHMARK_MARGIN_E6: i128 = 500_000;
pub const CAPTAIN_MULTIPLIER: i32 = 2;
pub const TRIPLE_CAPTAIN_MULTIPLIER: i32 = 3;

/// Chips that change scoring (Wildcard and Free Hit only change transfers).
pub const CHIP_NONE: u8 = 0;
pub const CHIP_TRIPLE_CAPTAIN: u8 = 1;
pub const CHIP_BENCH_BOOST: u8 = 2;
pub const CHIP_HEDGE: u8 = 3;
pub const CHIP_WILDCARD: u8 = 4;
pub const CHIP_FREE_HIT: u8 = 5;

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum RuleError {
    UnknownStock,
    Duplicate,
    SquadQuota,
    OverBudget,
    SectorLimit,
    LineupMismatch,
    Formation,
    Captain,
    Chip,
}

pub struct Lineup {
    pub squad: [u8; SQUAD_SIZE],
    pub starters: [u8; XI_SIZE],
    pub bench: [u8; BENCH_SIZE],
    pub captain: u8,
    pub vice: u8,
    pub chip: u8,
    pub hedge: u8,
}

/// 15 stocks: 2 ETF, 5 Blue Chip, 5 Growth, 3 High Risk, 100 credits, max 3 per sector.
pub fn validate_squad(squad: &[u8; SQUAD_SIZE]) -> Result<(), RuleError> {
    let mut seen = [false; STOCK_COUNT];
    let mut per_pos = [0u8; 4];
    let mut per_sector = [0u8; SECTOR_COUNT];
    let mut credits: u32 = 0;
    for &s in squad {
        let i = s as usize;
        if i >= STOCK_COUNT {
            return Err(RuleError::UnknownStock);
        }
        if seen[i] {
            return Err(RuleError::Duplicate);
        }
        seen[i] = true;
        per_pos[POSITION[i] as usize] += 1;
        per_sector[SECTOR[i] as usize] += 1;
        credits += CREDITS_X10[i] as u32;
    }
    if per_pos != SQUAD_QUOTA {
        return Err(RuleError::SquadQuota);
    }
    if credits > BUDGET_X10 {
        return Err(RuleError::OverBudget);
    }
    if per_sector.iter().any(|&c| c > MAX_PER_SECTOR) {
        return Err(RuleError::SectorLimit);
    }
    Ok(())
}

/// Starters + bench must be exactly the squad; legal formation; captain and vice distinct starters.
pub fn validate_lineup(l: &Lineup) -> Result<(), RuleError> {
    validate_squad(&l.squad)?;
    let mut in_squad = [false; STOCK_COUNT];
    for &s in &l.squad {
        in_squad[s as usize] = true;
    }
    let mut used = [false; STOCK_COUNT];
    let mut xi = [0u8; 4];
    for &s in l.starters.iter().chain(l.bench.iter()) {
        let i = s as usize;
        if i >= STOCK_COUNT || !in_squad[i] || used[i] {
            return Err(RuleError::LineupMismatch);
        }
        used[i] = true;
    }
    for &s in &l.starters {
        xi[POSITION[s as usize] as usize] += 1;
    }
    for p in 0..4 {
        if xi[p] < XI_MIN[p] || xi[p] > XI_MAX[p] {
            return Err(RuleError::Formation);
        }
    }
    if l.captain == l.vice || !l.starters.contains(&l.captain) || !l.starters.contains(&l.vice) {
        return Err(RuleError::Captain);
    }
    if l.chip > CHIP_FREE_HIT || (l.chip == CHIP_HEDGE && !l.starters.contains(&l.hedge)) {
        return Err(RuleError::Chip);
    }
    Ok(())
}

/// % change x 1e6 (1.8% = 1_800_000). 0 if either price is missing.
pub fn pct_e6(open: u64, close: u64) -> i128 {
    if open == 0 || close == 0 {
        return 0;
    }
    (close as i128 - open as i128) * 100_000_000 / open as i128
}

/// +1.8% = 18 pts, -2.0% = -20 pts, rounded half away from zero, capped at +/-50.
pub fn base_points(open: u64, close: u64) -> i32 {
    if open == 0 || close == 0 {
        return 0;
    }
    let num = (close as i128 - open as i128) * 100 * POINTS_PER_PERCENT; // points x open
    let den = open as i128;
    let mag = (2 * num.abs() + den) / (2 * den);
    let pts = if num < 0 { -mag } else { mag };
    pts.clamp(-(POINT_CAP as i128), POINT_CAP as i128) as i32
}

/// Points for one stock before the captain multiplier (base + bonuses, hedge applied).
pub fn stock_points(i: usize, open: &[u64], close: &[u64], hedged: bool, top_gainer: u8) -> i32 {
    let base = base_points(open[i], close[i]);
    let mut bonus = 0;
    let halted = open[i] == 0 || close[i] == 0;
    if !halted && i != BENCHMARK && pct_e6(open[i], close[i]) - pct_e6(open[BENCHMARK], close[BENCHMARK]) >= BEAT_BENCHMARK_MARGIN_E6 {
        bonus += BEAT_BENCHMARK_BONUS;
    }
    if !halted && i == top_gainer as usize {
        bonus += TOP_GAINER_BONUS;
    }
    let mut pts = base + bonus;
    if hedged && pts < 0 {
        pts = 0;
    }
    pts
}

/// Is this XI a legal formation (1 ETF, 3-5 Blue Chip, 2-5 Growth, 1-3 High Risk)?
pub fn is_valid_formation(starters: &[u8; XI_SIZE]) -> bool {
    let mut xi = [0u8; 4];
    for &s in starters {
        xi[POSITION[s as usize] as usize] += 1;
    }
    (0..4).all(|p| xi[p] >= XI_MIN[p] && xi[p] <= XI_MAX[p])
}

/// Auto-subs, as in lib/game/rules.ts: each halted starter is replaced by the
/// first active bench stock (in bench order) that keeps the formation legal.
pub fn apply_auto_subs(l: &Lineup, halted: impl Fn(u8) -> bool) -> ([u8; XI_SIZE], [u8; BENCH_SIZE]) {
    let mut starters = l.starters;
    let mut bench = l.bench;
    for out_i in 0..XI_SIZE {
        let out = l.starters[out_i];
        if !halted(out) {
            continue;
        }
        let pos = starters.iter().position(|&s| s == out).unwrap();
        for b in 0..BENCH_SIZE {
            let inn = bench[b];
            if halted(inn) {
                continue;
            }
            let mut next = starters;
            next[pos] = inn;
            if is_valid_formation(&next) {
                starters = next;
                bench[b] = out;
                break;
            }
        }
    }
    (starters, bench)
}

/// Biggest gainer (TWAP %) among the picked stocks, or NO_STOCK. Ties go to the lower index.
pub fn top_gainer(picked: u64, open: &[u64], close: &[u64]) -> u8 {
    let mut best: Option<(usize, i128)> = None;
    for i in 0..STOCK_COUNT.min(64) {
        if picked & (1u64 << i) == 0 || open[i] == 0 || close[i] == 0 {
            continue;
        }
        let p = pct_e6(open[i], close[i]);
        if best.map_or(true, |(_, b)| p > b) {
            best = Some((i, p));
        }
    }
    best.map_or(NO_STOCK, |(i, _)| i as u8)
}

/// Bitmask of a lineup's starters (used to find the gameweek's top gainer).
pub fn starters_mask(starters: &[u8; XI_SIZE]) -> u64 {
    starters.iter().fold(0u64, |m, &s| m | (1u64 << s))
}

/// Gameweek total from opening and closing TWAPs (micro-USD per stock), with
/// auto-subs for halted stocks (no price), the vice taking the armband if the
/// captain is halted, chips, the gameweek's top gainer and any transfer hit.
pub fn score_lineup(l: &Lineup, open: &[u64], close: &[u64], transfer_hit: u8, top: u8) -> i32 {
    let halted = |s: u8| open[s as usize] == 0 || close[s as usize] == 0;
    let (starters, bench) = apply_auto_subs(l, halted);
    let captain = if !halted(l.captain) {
        Some(l.captain)
    } else if !halted(l.vice) {
        Some(l.vice)
    } else {
        None
    };
    let mult = if l.chip == CHIP_TRIPLE_CAPTAIN { TRIPLE_CAPTAIN_MULTIPLIER } else { CAPTAIN_MULTIPLIER };
    let mut total = 0;
    for &s in &starters {
        let p = stock_points(s as usize, open, close, l.chip == CHIP_HEDGE && l.hedge == s, top);
        total += if Some(s) == captain && starters.contains(&s) { p * mult } else { p };
    }
    if l.chip == CHIP_BENCH_BOOST {
        for &s in &bench {
            total += stock_points(s as usize, open, close, false, top);
        }
    }
    total - transfer_hit as i32
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Cheapest legal squad built from the generated universe.
    fn squad() -> Lineup {
        let mut picks: Vec<u8> = Vec::new();
        let mut per_sector = [0u8; SECTOR_COUNT];
        for pos in 0..4u8 {
            let mut idx: Vec<usize> = (0..STOCK_COUNT).filter(|&i| POSITION[i] == pos).collect();
            idx.sort_by_key(|&i| CREDITS_X10[i]);
            let mut n = 0;
            for i in idx {
                if n == SQUAD_QUOTA[pos as usize] {
                    break;
                }
                if per_sector[SECTOR[i] as usize] < MAX_PER_SECTOR {
                    per_sector[SECTOR[i] as usize] += 1;
                    picks.push(i as u8);
                    n += 1;
                }
            }
        }
        let squad: [u8; 15] = picks.clone().try_into().unwrap();
        // 1 ETF, 4 Blue, 4 Growth, 2 Risk start; bench 1 ETF, 1 Blue, 1 Growth, 1 Risk
        let starters = [squad[0], squad[2], squad[3], squad[4], squad[5], squad[7], squad[8], squad[9], squad[10], squad[12], squad[13]];
        let bench = [squad[1], squad[6], squad[11], squad[14]];
        Lineup { squad, starters, bench, captain: starters[5], vice: starters[1], chip: CHIP_NONE, hedge: 0 }
    }

    #[test]
    fn base_points_match_the_app() {
        assert_eq!(base_points(100_000_000, 101_800_000), 18);
        assert_eq!(base_points(100_000_000, 98_000_000), -20);
        assert_eq!(base_points(100_000_000, 100_050_000), 1); // +0.05% rounds half away
        assert_eq!(base_points(100_000_000, 99_950_000), -1);
        assert_eq!(base_points(100_000_000, 120_000_000), 50); // cap
        assert_eq!(base_points(100_000_000, 80_000_000), -50);
        assert_eq!(base_points(0, 1), 0);
    }

    #[test]
    fn valid_squad_and_lineup_pass() {
        let l = squad();
        assert_eq!(validate_squad(&l.squad), Ok(()));
        assert_eq!(validate_lineup(&l), Ok(()));
    }

    #[test]
    fn rejects_bad_squads() {
        let mut l = squad();
        l.squad[1] = l.squad[0];
        assert_eq!(validate_squad(&l.squad), Err(RuleError::Duplicate));
        let mut l = squad();
        l.squad[0] = 200;
        assert_eq!(validate_squad(&l.squad), Err(RuleError::UnknownStock));
        let mut l = squad();
        // swap an ETF for a Blue Chip not in the squad -> quota broken
        let extra = (0..STOCK_COUNT).find(|&i| POSITION[i] == 1 && !l.squad.contains(&(i as u8))).unwrap();
        l.squad[0] = extra as u8;
        assert_eq!(validate_squad(&l.squad), Err(RuleError::SquadQuota));
    }

    #[test]
    fn rejects_bad_lineups() {
        let mut l = squad();
        l.captain = l.vice;
        assert_eq!(validate_lineup(&l), Err(RuleError::Captain));
        let mut l = squad();
        std::mem::swap(&mut l.starters[0], &mut l.bench[1]); // ETF out, Blue in -> 0 ETF
        assert_eq!(validate_lineup(&l), Err(RuleError::Formation));
        let mut l = squad();
        l.chip = CHIP_HEDGE;
        l.hedge = l.bench[0];
        assert_eq!(validate_lineup(&l), Err(RuleError::Chip));
    }

    #[test]
    fn scoring_applies_captain_bonus_hedge_and_chips() {
        let l = squad();
        let open = vec![100_000_000u64; STOCK_COUNT];
        let mut close = vec![100_000_000u64; STOCK_COUNT];
        close[l.captain as usize] = 102_000_000; // +2% = 20, beats SPYx (0%) by 2 -> +2 = 22, x2 = 44
        close[l.starters[2] as usize] = 99_000_000; // -1% = -10
        assert_eq!(score_lineup(&l, &open, &close, 0, NO_STOCK), 44 - 10);
        assert_eq!(score_lineup(&l, &open, &close, 4, NO_STOCK), 44 - 10 - 4);

        let mut tc = squad();
        tc.chip = CHIP_TRIPLE_CAPTAIN;
        assert_eq!(score_lineup(&tc, &open, &close, 0, NO_STOCK), 66 - 10);

        let mut h = squad();
        h.chip = CHIP_HEDGE;
        h.hedge = h.starters[2];
        assert_eq!(score_lineup(&h, &open, &close, 0, NO_STOCK), 44);

        let mut bb = squad();
        bb.chip = CHIP_BENCH_BOOST;
        close[bb.bench[0] as usize] = 101_000_000; // ETF on bench +1% = 10 (+2 beats SPYx by 1) = 12
        assert_eq!(score_lineup(&bb, &open, &close, 0, NO_STOCK), 44 - 10 + 12);
    }

    #[test]
    fn halted_captain_passes_armband_to_vice() {
        let l = squad();
        let open = vec![100_000_000u64; STOCK_COUNT];
        let mut close = vec![100_000_000u64; STOCK_COUNT];
        close[l.captain as usize] = 0; // no price = halted
        close[l.vice as usize] = 101_000_000; // +1% = 10 + 2 bonus = 12, x2 = 24
        assert_eq!(score_lineup(&l, &open, &close, 0, NO_STOCK), 24);
    }

    #[test]
    fn top_gainer_gets_the_bonus() {
        let l = squad();
        let open = vec![100_000_000u64; STOCK_COUNT];
        let mut close = vec![100_000_000u64; STOCK_COUNT];
        close[l.starters[3] as usize] = 103_000_000; // +3% = 30 +2 beat SPYx
        close[l.starters[4] as usize] = 101_000_000; // +1% = 10 +2 beat SPYx
        let picked = starters_mask(&l.starters);
        let top = top_gainer(picked, &open, &close);
        assert_eq!(top, l.starters[3]);
        assert_eq!(score_lineup(&l, &open, &close, 0, top), 32 + 2 + 12);
        // A stock nobody started can't be the top gainer.
        let outsider = (0..STOCK_COUNT as u8).find(|s| !l.squad.contains(s)).unwrap();
        close[outsider as usize] = 150_000_000;
        assert_eq!(top_gainer(picked, &open, &close), l.starters[3]);
        assert_eq!(top_gainer(0, &open, &close), NO_STOCK);
    }

    #[test]
    fn halted_starter_is_auto_subbed_keeping_formation() {
        let l = squad();
        let open = vec![100_000_000u64; STOCK_COUNT];
        let mut close = vec![100_000_000u64; STOCK_COUNT];
        // Halt a Blue Chip starter; first bench stock is the ETF (illegal), next is the Blue Chip.
        let out = l.starters[1];
        close[out as usize] = 0;
        let halted = |s: u8| close[s as usize] == 0;
        let (st, be) = apply_auto_subs(&l, halted);
        assert!(st.contains(&l.bench[1]) && !st.contains(&out));
        assert!(be.contains(&out));
        assert!(is_valid_formation(&st));
        // The sub scores: +1% on the bench Blue Chip = 10 + 2 beat SPYx.
        close[l.bench[1] as usize] = 101_000_000;
        assert_eq!(score_lineup(&l, &open, &close, 0, NO_STOCK), 12);
    }
}
