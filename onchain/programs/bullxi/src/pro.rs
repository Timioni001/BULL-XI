//! Pro preview maths (pure, unit tested): buying a squad as a portfolio at
//! price-book prices, valuing it, and picking a friends league winner.
//!
//! Units: dollars are micro-USD (1 USD = 1_000_000), shares are micro-shares
//! (1 share = 1_000_000), prices are micro-USD per share.

pub const MICRO: u128 = 1_000_000;
/// Smallest amount you can invest in a 15-stock squad: $15 (one dollar each).
pub const MIN_INVEST: u64 = 15 * 1_000_000;

#[derive(Debug, PartialEq, Eq)]
pub enum ProError {
    NotEnoughCash,
    TooSmall,
    NoPrice,
}

/// Splits `amount` equally across `stocks` and returns (micro-shares bought per stock, dollars spent).
/// Any remainder smaller than one micro-dollar per stock stays as cash.
pub fn buy_equal(stocks: &[u8], amount: u64, cash: u64, prices: &[u64]) -> Result<(Vec<(u8, u64)>, u64), ProError> {
    if amount < MIN_INVEST {
        return Err(ProError::TooSmall);
    }
    if amount > cash {
        return Err(ProError::NotEnoughCash);
    }
    let each = amount / stocks.len() as u64;
    let mut out = Vec::with_capacity(stocks.len());
    for &s in stocks {
        let p = *prices.get(s as usize).unwrap_or(&0);
        if p == 0 {
            return Err(ProError::NoPrice);
        }
        let shares = (each as u128 * MICRO / p as u128) as u64;
        out.push((s, shares));
    }
    Ok((out, each * stocks.len() as u64))
}

/// Market value (micro-USD) of holdings at the given prices.
pub fn value(shares: &[u64], prices: &[u64]) -> u64 {
    shares
        .iter()
        .zip(prices.iter())
        .map(|(s, p)| (*s as u128 * *p as u128 / MICRO) as u64)
        .sum()
}

/// Winner of a league: the highest score among members with a settled entry
/// (None = no entry). Ties go to whoever joined first. None if nobody played.
pub fn league_winner(points: &[Option<i32>]) -> Option<(usize, i32)> {
    let mut best: Option<(usize, i32)> = None;
    for (i, p) in points.iter().enumerate() {
        if let Some(p) = p {
            if best.map_or(true, |(_, b)| *p > b) {
                best = Some((i, *p));
            }
        }
    }
    best
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn buys_equal_dollars_of_each_stock() {
        // $150 over 3 stocks priced $100, $50, $200
        let prices = [100_000_000, 50_000_000, 200_000_000];
        let (got, spent) = buy_equal(&[0, 1, 2], 150_000_000, 1_000_000_000, &prices).unwrap_or_else(|_| (vec![], 0));
        assert_eq!(spent, 150_000_000);
        assert_eq!(got, vec![(0, 500_000), (1, 1_000_000), (2, 250_000)]);
        let mut shares = [0u64; 3];
        for (s, n) in got {
            shares[s as usize] = n;
        }
        assert_eq!(value(&shares, &prices), 150_000_000);
        // prices up 10%
        let up = [110_000_000, 55_000_000, 220_000_000];
        assert_eq!(value(&shares, &up), 165_000_000);
    }

    #[test]
    fn rejects_bad_buys() {
        let prices = [100_000_000, 0];
        assert_eq!(buy_equal(&[0], 10_000_000, 1_000_000_000, &prices), Err(ProError::TooSmall));
        assert_eq!(buy_equal(&[0], 20_000_000, 10_000_000, &prices), Err(ProError::NotEnoughCash));
        assert_eq!(buy_equal(&[0, 1], 20_000_000, 100_000_000, &prices), Err(ProError::NoPrice));
    }

    #[test]
    fn winner_is_top_score_first_joiner_on_ties() {
        assert_eq!(league_winner(&[Some(5), None, Some(12), Some(12)]), Some((2, 12)));
        assert_eq!(league_winner(&[Some(-3), Some(-1)]), Some((1, -1)));
        assert_eq!(league_winner(&[None, None]), None);
    }
}
