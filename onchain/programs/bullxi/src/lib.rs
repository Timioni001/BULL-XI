//! BULL-XI onchain program.
//!
//! Checkpoint 1: the price book. One account holds the live price of every
//! stock in the game plus a running price x time sum per stock, so any
//! gameweek's time-weighted average price (TWAP) is
//! `(cum_end - cum_start) / (t_end - t_start)`.
//!
//! The account is delegated to a MagicBlock Ephemeral Rollup, where the
//! price pusher writes to it every minute for free. It is committed back to
//! Solana on a schedule so the base layer always has a recent copy.

use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::{commit, delegate, ephemeral};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::MagicIntentBundleBuilder;

declare_id!("EZi2Raxa2hba9Bt5jYKf6nUkbQ4xgZeHbuBxjVJTCPXN");

pub const PRICE_BOOK_SEED: &[u8] = b"price_book";
/// Room for growth beyond today's 41 stocks.
pub const MAX_STOCKS: usize = 48;

#[ephemeral]
#[program]
pub mod bullxi {
    use super::*;

    /// Creates the price book on Solana. `pusher` is the only key allowed to write prices.
    pub fn init_price_book(ctx: Context<InitPriceBook>, pusher: Pubkey, count: u8) -> Result<()> {
        require!(count as usize <= MAX_STOCKS && count > 0, BullError::BadCount);
        let book = &mut ctx.accounts.price_book;
        book.admin = ctx.accounts.admin.key();
        book.pusher = pusher;
        book.count = count;
        book.bump = ctx.bumps.price_book;
        Ok(())
    }

    /// Admin can rotate the pusher key (and grow the list of stocks).
    pub fn configure(ctx: Context<Configure>, pusher: Pubkey, count: u8) -> Result<()> {
        let book = &mut ctx.accounts.price_book;
        require!(count as usize <= MAX_STOCKS && count >= book.count, BullError::BadCount);
        book.pusher = pusher;
        book.count = count;
        Ok(())
    }

    /// Writes the latest prices (micro-USD, 0 = no update for that stock)
    /// and advances every stock's price x time sum. Runs on the Ephemeral Rollup.
    pub fn push_prices(ctx: Context<PushPrices>, prices: Vec<u64>) -> Result<()> {
        let book = &mut ctx.accounts.price_book;
        require!(prices.len() == book.count as usize, BullError::BadCount);
        let now = Clock::get()?.unix_timestamp;
        apply_prices(book, &prices, now)?;
        Ok(())
    }

    /// Delegates the price book to an Ephemeral Rollup validator
    /// (pass the validator identity as the first remaining account).
    pub fn delegate_price_book(ctx: Context<DelegatePriceBook>) -> Result<()> {
        ctx.accounts.delegate_pda(
            &ctx.accounts.payer,
            &[PRICE_BOOK_SEED],
            DelegateConfig {
                validator: ctx.remaining_accounts.first().map(|a| a.key()),
                ..Default::default()
            },
        )?;
        Ok(())
    }

    /// Commits the current price book from the rollup to Solana.
    pub fn commit_price_book(ctx: Context<CommitPriceBook>) -> Result<()> {
        require_keys_eq!(ctx.accounts.payer.key(), ctx.accounts.price_book.pusher, BullError::NotPusher);
        MagicIntentBundleBuilder::new(
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.magic_context.to_account_info(),
            ctx.accounts.magic_program.to_account_info(),
        )
        .commit(&[ctx.accounts.price_book.to_account_info()])
        .build_and_invoke()?;
        Ok(())
    }

    /// Commits and hands the price book back to Solana (admin only).
    pub fn undelegate_price_book(ctx: Context<CommitPriceBook>) -> Result<()> {
        require_keys_eq!(ctx.accounts.payer.key(), ctx.accounts.price_book.admin, BullError::NotAdmin);
        MagicIntentBundleBuilder::new(
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.magic_context.to_account_info(),
            ctx.accounts.magic_program.to_account_info(),
        )
        .commit_and_undelegate(&[ctx.accounts.price_book.to_account_info()])
        .build_and_invoke()?;
        Ok(())
    }
}

/// Pure update so it can be unit tested without a validator.
pub fn apply_prices(book: &mut PriceBook, prices: &[u64], now: i64) -> Result<()> {
    if book.start_ts == 0 {
        book.start_ts = now;
    } else {
        require!(now >= book.last_ts, BullError::ClockWentBack);
        let dt = (now - book.last_ts) as u128;
        for i in 0..book.count as usize {
            book.cum[i] = book.cum[i]
                .checked_add(book.prices[i] as u128 * dt)
                .ok_or(BullError::Overflow)?;
        }
    }
    for (i, p) in prices.iter().enumerate() {
        if *p > 0 {
            if book.prices[i] == 0 && book.start_ts != now {
                // First price for a stock added later: TWAP starts here.
                book.first_ts[i] = now;
            }
            book.prices[i] = *p;
        }
    }
    book.last_ts = now;
    book.updates = book.updates.saturating_add(1);
    Ok(())
}

#[account]
#[derive(InitSpace)]
pub struct PriceBook {
    pub admin: Pubkey,
    pub pusher: Pubkey,
    pub count: u8,
    pub bump: u8,
    /// Number of pushes so far
    pub updates: u64,
    /// Unix seconds of the first and the latest push
    pub start_ts: i64,
    pub last_ts: i64,
    /// Latest price per stock, micro-USD (1 USD = 1_000_000)
    pub prices: [u64; MAX_STOCKS],
    /// Running sum of price x seconds since start_ts, per stock
    pub cum: [u128; MAX_STOCKS],
    /// When each stock got its first price, if it joined after start_ts (else 0)
    pub first_ts: [i64; MAX_STOCKS],
}

#[derive(Accounts)]
pub struct InitPriceBook<'info> {
    #[account(init, payer = admin, space = 8 + PriceBook::INIT_SPACE, seeds = [PRICE_BOOK_SEED], bump)]
    pub price_book: Account<'info, PriceBook>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Configure<'info> {
    #[account(mut, seeds = [PRICE_BOOK_SEED], bump = price_book.bump, has_one = admin @ BullError::NotAdmin)]
    pub price_book: Account<'info, PriceBook>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct PushPrices<'info> {
    #[account(mut, seeds = [PRICE_BOOK_SEED], bump = price_book.bump, has_one = pusher @ BullError::NotPusher)]
    pub price_book: Account<'info, PriceBook>,
    pub pusher: Signer<'info>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegatePriceBook<'info> {
    pub payer: Signer<'info>,
    /// CHECK: the price book PDA, checked by seeds in delegate_pda
    #[account(mut, del)]
    pub pda: UncheckedAccount<'info>,
}

#[commit]
#[derive(Accounts)]
pub struct CommitPriceBook<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [PRICE_BOOK_SEED], bump = price_book.bump)]
    pub price_book: Account<'info, PriceBook>,
}

#[error_code]
pub enum BullError {
    #[msg("Wrong number of stocks")]
    BadCount,
    #[msg("Only the price pusher can do this")]
    NotPusher,
    #[msg("Only the admin can do this")]
    NotAdmin,
    #[msg("Clock went backwards")]
    ClockWentBack,
    #[msg("Number overflow")]
    Overflow,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn book(count: u8) -> PriceBook {
        PriceBook {
            admin: Pubkey::default(),
            pusher: Pubkey::default(),
            count,
            bump: 0,
            updates: 0,
            start_ts: 0,
            last_ts: 0,
            prices: [0; MAX_STOCKS],
            cum: [0; MAX_STOCKS],
            first_ts: [0; MAX_STOCKS],
        }
    }

    #[test]
    fn twap_is_time_weighted() {
        let mut b = book(2);
        apply_prices(&mut b, &[100, 200], 1_000).unwrap();
        apply_prices(&mut b, &[110, 0], 1_060).unwrap(); // 60s at 100; stock 1 unchanged
        apply_prices(&mut b, &[110, 0], 1_180).unwrap(); // 120s at 110
        assert_eq!(b.cum[0], 100 * 60 + 110 * 120);
        assert_eq!(b.cum[1], 200 * 180);
        // TWAP of stock 0 over the window
        assert_eq!(b.cum[0] / 180, (100 * 60 + 110 * 120) / 180);
        assert_eq!(b.prices[1], 200);
        assert_eq!(b.updates, 3);
    }

    #[test]
    fn rejects_clock_going_back() {
        let mut b = book(1);
        apply_prices(&mut b, &[1], 100).unwrap();
        assert!(apply_prices(&mut b, &[1], 99).is_err());
    }

    #[test]
    fn fits_in_a_committable_account() {
        assert!(8 + PriceBook::INIT_SPACE <= 10_240);
    }
}
