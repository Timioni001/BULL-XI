//! Pure game rules, mirrored from lib/game/rules.ts. No accounts, no clock,
//! so every rule is unit tested here.

use crate::universe::*;

pub const SQUAD_SIZE: usize = 15;
pub const XI_SIZE: usize = 11;
pub const BENCH_SIZE: usize = 4;
pub const POINTS_PER_PERCENT: i128 = 10;
pub const POINT_CAP: i32 = 50;
pub const BEAT_BENCHMARK_BONUS: i32 = 2;
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

/// Points for one stock before the captain multiplier (base + beat-SPYx bonus, hedge applied).
pub fn stock_points(i: usize, open: &[u64], close: &[u64], hedged: bool) -> i32 {
    let base = base_points(open[i], close[i]);
    let mut bonus = 0;
    let halted = open[i] == 0 || close[i] == 0;
    if !halted && i != BENCHMARK && pct_e6(open[i], close[i]) - pct_e6(open[BENCHMARK], close[BENCHMARK]) >= BEAT_BENCHMARK_MARGIN_E6 {
        bonus += BEAT_BENCHMARK_BONUS;
    }
    let mut pts = base + bonus;
    if hedged && pts < 0 {
        pts = 0;
    }
    pts
}

/// Gameweek total from opening and closing TWAPs (micro-USD per stock).
/// A stock with no price is halted: it scores 0 and the vice takes the armband.
/// League bonuses (top gainer) are applied off this base by the league table.
pub fn score_lineup(l: &Lineup, open: &[u64], close: &[u64], transfer_hit: u8) -> i32 {
    let halted = |s: u8| open[s as usize] == 0 || close[s as usize] == 0;
    let captain = if !halted(l.captain) {
        Some(l.captain)
    } else if !halted(l.vice) {
        Some(l.vice)
    } else {
        None
    };
    let mult = if l.chip == CHIP_TRIPLE_CAPTAIN { TRIPLE_CAPTAIN_MULTIPLIER } else { CAPTAIN_MULTIPLIER };
    let mut total = 0;
    for &s in &l.starters {
        let p = stock_points(s as usize, open, close, l.chip == CHIP_HEDGE && l.hedge == s);
        total += if Some(s) == captain { p * mult } else { p };
    }
    if l.chip == CHIP_BENCH_BOOST {
        for &s in &l.bench {
            total += stock_points(s as usize, open, close, false);
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
        assert_eq!(score_lineup(&l, &open, &close, 0), 44 - 10);
        assert_eq!(score_lineup(&l, &open, &close, 4), 44 - 10 - 4);

        let mut tc = squad();
        tc.chip = CHIP_TRIPLE_CAPTAIN;
        assert_eq!(score_lineup(&tc, &open, &close, 0), 66 - 10);

        let mut h = squad();
        h.chip = CHIP_HEDGE;
        h.hedge = h.starters[2];
        assert_eq!(score_lineup(&h, &open, &close, 0), 44);

        let mut bb = squad();
        bb.chip = CHIP_BENCH_BOOST;
        close[bb.bench[0] as usize] = 101_000_000; // ETF on bench +1% = 10 (+2 beats SPYx by 1) = 12
        assert_eq!(score_lineup(&bb, &open, &close, 0), 44 - 10 + 12);
    }

    #[test]
    fn halted_captain_passes_armband_to_vice() {
        let l = squad();
        let open = vec![100_000_000u64; STOCK_COUNT];
        let mut close = vec![100_000_000u64; STOCK_COUNT];
        close[l.captain as usize] = 0; // no price = halted
        close[l.vice as usize] = 101_000_000; // +1% = 10 + 2 bonus = 12, x2 = 24
        assert_eq!(score_lineup(&l, &open, &close, 0), 24);
    }
}
