//! BULL-XI onchain program.
//!
//! Everything runs on MagicBlock's Private Ephemeral Rollup (TEE) on devnet:
//! - **Price book**: live price of every stock plus a running price x time sum,
//!   written every minute by the price pusher. Any TWAP is a difference of sums.
//! - **Managers**: public profiles (name, team, season points). Committed to
//!   Solana after every settlement, so results live on the base layer.
//! - **Gameweeks**: deadline and end time, plus opening and closing TWAPs
//!   snapshotted from the price book.
//! - **Entries**: a manager's sealed squad for one gameweek. Private inside the
//!   TEE (only the manager and the game crank can read it) until kickoff, then
//!   revealed, settled with the rules in `game.rs`, and committed to Solana.

pub mod game;
pub mod universe;

use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use ephemeral_rollups_sdk::access_control::instructions::{CreateEphemeralPermissionCpi, UpdateEphemeralPermissionCpi};
use ephemeral_rollups_sdk::access_control::structs::{EphemeralMembersArgs, EphemeralPermission, Member, PERMISSION_SEED};
use ephemeral_rollups_sdk::anchor::{commit, delegate, ephemeral};
use ephemeral_rollups_sdk::consts::{EPHEMERAL_VAULT_ID, MAGIC_PROGRAM_ID, PERMISSION_PROGRAM_ID};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::MagicIntentBundleBuilder;

use game::{Lineup, RuleError, BENCH_SIZE, SQUAD_SIZE, XI_SIZE};

declare_id!("EZi2Raxa2hba9Bt5jYKf6nUkbQ4xgZeHbuBxjVJTCPXN");

pub const PRICE_BOOK_SEED: &[u8] = b"price_book";
pub const CONFIG_SEED: &[u8] = b"config";
pub const MANAGER_SEED: &[u8] = b"manager";
pub const GAMEWEEK_SEED: &[u8] = b"gameweek";
pub const ENTRY_SEED: &[u8] = b"entry";
/// Room for growth beyond today's 41 stocks.
pub const MAX_STOCKS: usize = 48;
pub const NAME_LEN: usize = 24;
/// Members of a sealed entry's permission: the manager and the game crank.
pub const ENTRY_MEMBERS: usize = 2;
/// Member can read the account and its transactions.
pub const FULL_VIEW: u8 = 0b1_1111;

/// Validators the program will delegate to (MagicBlock devnet/mainnet TEE and Asia ER).
pub const TEE_VALIDATOR: Pubkey = pubkey!("MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo");
pub const ASIA_VALIDATOR: Pubkey = pubkey!("MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57");

pub mod status {
    pub const OPEN: u8 = 0;
    pub const KICKED_OFF: u8 = 1;
    pub const LIVE: u8 = 2;
    pub const CLOSING: u8 = 3;
    pub const FINAL: u8 = 4;
}

pub mod entry_status {
    pub const CREATED: u8 = 0;
    pub const SEALED: u8 = 1;
    pub const REVEALED: u8 = 2;
    pub const SETTLED: u8 = 3;
}

#[ephemeral]
#[program]
pub mod bullxi {
    use super::*;

    /* ------------------------------ Price book ------------------------------ */

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
    /// and advances every stock's price x time sum. Runs on the rollup.
    pub fn push_prices(ctx: Context<PushPrices>, prices: Vec<u64>) -> Result<()> {
        let book = &mut ctx.accounts.price_book;
        require!(prices.len() == book.count as usize, BullError::BadCount);
        let now = Clock::get()?.unix_timestamp;
        apply_prices(book, &prices, now)?;
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

    /// Commits and hands the price book back to Solana (admin only), e.g. to move rollups.
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

    /// Delegates the price book (pass the validator identity as the first remaining account).
    pub fn delegate_price_book(ctx: Context<DelegatePriceBook>) -> Result<()> {
        let validator = allowed_validator(ctx.remaining_accounts)?;
        ctx.accounts.delegate_pda(&ctx.accounts.payer, &[PRICE_BOOK_SEED], DelegateConfig { validator: Some(validator), ..Default::default() })?;
        Ok(())
    }

    /* -------------------------------- Config -------------------------------- */

    /// Game config on Solana: who may create gameweeks, and the crank that settles them.
    pub fn init_config(ctx: Context<InitConfig>, crank: Pubkey) -> Result<()> {
        let c = &mut ctx.accounts.config;
        c.admin = ctx.accounts.admin.key();
        c.crank = crank;
        c.bump = ctx.bumps.config;
        Ok(())
    }

    /* ------------------------------- Managers ------------------------------- */

    /// Creates a manager's public profile on Solana. A sponsor may pay.
    pub fn create_manager(ctx: Context<CreateManager>, name: String, team: String) -> Result<()> {
        let m = &mut ctx.accounts.manager;
        m.authority = ctx.accounts.authority.key();
        m.bump = ctx.bumps.manager;
        m.name = fixed_name(&name)?;
        m.team = fixed_name(&team)?;
        m.created_ts = Clock::get()?.unix_timestamp;
        Ok(())
    }

    /// Hands the profile to the private rollup, where settlement updates it.
    pub fn delegate_manager(ctx: Context<DelegateManager>) -> Result<()> {
        require_tee(ctx.remaining_accounts)?;
        let authority = ctx.accounts.authority.key();
        ctx.accounts.delegate_pda(
            &ctx.accounts.payer,
            &[MANAGER_SEED, authority.as_ref()],
            DelegateConfig { validator: Some(TEE_VALIDATOR), ..Default::default() },
        )?;
        Ok(())
    }

    /// Renames the manager or team. Runs on the rollup.
    pub fn set_profile(ctx: Context<SetProfile>, name: String, team: String) -> Result<()> {
        let m = &mut ctx.accounts.manager;
        m.name = fixed_name(&name)?;
        m.team = fixed_name(&team)?;
        Ok(())
    }

    /* ------------------------------- Gameweeks ------------------------------ */

    /// Admin creates a gameweek on Solana. kind 0 = daily (24h), 1 = flash (1h).
    pub fn create_gameweek(ctx: Context<CreateGameweek>, id: u32, kind: u8, deadline_ts: i64, end_ts: i64) -> Result<()> {
        require!(end_ts > deadline_ts && kind <= 1, BullError::BadSchedule);
        let g = &mut ctx.accounts.gameweek;
        g.id = id;
        g.kind = kind;
        g.bump = ctx.bumps.gameweek;
        g.deadline_ts = deadline_ts;
        g.end_ts = end_ts;
        // TWAP windows: the first and last 10% of the gameweek, at least 2 minutes.
        g.window = ((end_ts - deadline_ts) / 10).max(120);
        g.status = status::OPEN;
        Ok(())
    }

    pub fn delegate_gameweek(ctx: Context<DelegateGameweek>, id: u32) -> Result<()> {
        require_tee(ctx.remaining_accounts)?;
        require_keys_eq!(ctx.accounts.payer.key(), ctx.accounts.config.admin, BullError::NotAdmin);
        ctx.accounts.delegate_pda(
            &ctx.accounts.payer,
            &[GAMEWEEK_SEED, &id.to_le_bytes()],
            DelegateConfig { validator: Some(TEE_VALIDATOR), ..Default::default() },
        )?;
        Ok(())
    }

    /// Moves a gameweek through its TWAP snapshots. Anyone can call it once the
    /// time has come; it reads the price book in the same rollup.
    /// OPEN -> KICKED_OFF (at deadline) -> LIVE (opening TWAP) -> CLOSING -> FINAL (closing TWAP).
    pub fn snapshot_gameweek(ctx: Context<SnapshotGameweek>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let book = &ctx.accounts.price_book;
        let g = &mut ctx.accounts.gameweek;
        let n = book.count as usize;
        match g.status {
            status::OPEN => {
                require!(now >= g.deadline_ts, BullError::TooEarly);
                g.tmp_cum = book.cum;
                g.tmp_ts = book.last_ts;
                g.status = status::KICKED_OFF;
            }
            status::KICKED_OFF => {
                require!(now >= g.deadline_ts + g.window && book.last_ts > g.tmp_ts, BullError::TooEarly);
                g.open_twap = twap_between(&g.tmp_cum, g.tmp_ts, &book.cum, book.last_ts, n);
                g.status = status::LIVE;
            }
            status::LIVE => {
                require!(now >= g.end_ts - g.window, BullError::TooEarly);
                g.tmp_cum = book.cum;
                g.tmp_ts = book.last_ts;
                g.status = status::CLOSING;
            }
            status::CLOSING => {
                require!(now >= g.end_ts && book.last_ts > g.tmp_ts, BullError::TooEarly);
                g.close_twap = twap_between(&g.tmp_cum, g.tmp_ts, &book.cum, book.last_ts, n);
                g.status = status::FINAL;
            }
            _ => return err!(BullError::AlreadyFinal),
        }
        Ok(())
    }

    /* -------------------------------- Entries ------------------------------- */

    /// Creates an empty entry on Solana and pre-funds the rent of its privacy
    /// permission. The squad itself is never sent to Solana before kickoff.
    pub fn create_entry(ctx: Context<CreateEntry>, gameweek: u32) -> Result<()> {
        let e = &mut ctx.accounts.entry;
        e.gameweek = gameweek;
        e.authority = ctx.accounts.authority.key();
        e.bump = ctx.bumps.entry;
        e.status = entry_status::CREATED;
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.key(),
                Transfer { from: ctx.accounts.payer.to_account_info(), to: ctx.accounts.entry.to_account_info() },
            ),
            ephemeral_rollups_sdk::ephemeral_accounts::rent(EphemeralPermission::size_of(ENTRY_MEMBERS) as u32),
        )?;
        Ok(())
    }

    pub fn delegate_entry(ctx: Context<DelegateEntry>, gameweek: u32) -> Result<()> {
        require_tee(ctx.remaining_accounts)?;
        let authority = ctx.accounts.authority.key();
        ctx.accounts.delegate_pda(
            &ctx.accounts.payer,
            &[ENTRY_SEED, &gameweek.to_le_bytes(), authority.as_ref()],
            DelegateConfig { validator: Some(TEE_VALIDATOR), ..Default::default() },
        )?;
        Ok(())
    }

    /// Seals (or re-seals) the manager's squad inside the private rollup before
    /// the deadline. The entry becomes readable only by the manager and the crank.
    #[allow(clippy::too_many_arguments)]
    pub fn seal_entry(
        ctx: Context<SealEntry>,
        squad: [u8; SQUAD_SIZE],
        starters: [u8; XI_SIZE],
        bench: [u8; BENCH_SIZE],
        captain: u8,
        vice: u8,
        chip: u8,
        hedge: u8,
        transfer_hit: u8,
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        require!(now < ctx.accounts.gameweek.deadline_ts && ctx.accounts.gameweek.status == status::OPEN, BullError::DeadlinePassed);
        let lineup = Lineup { squad, starters, bench, captain, vice, chip, hedge };
        game::validate_lineup(&lineup).map_err(rule_error)?;

        let e = &mut ctx.accounts.entry;
        require!(e.status <= entry_status::SEALED, BullError::AlreadyFinal);
        e.squad = squad;
        e.starters = starters;
        e.bench = bench;
        e.captain = captain;
        e.vice = vice;
        e.chip = chip;
        e.hedge = hedge;
        e.transfer_hit = transfer_hit;
        e.sealed_ts = now;
        e.status = entry_status::SEALED;

        let (authority, gw, bump) = (e.authority, e.gameweek.to_le_bytes(), e.bump);
        let members = vec![
            Member { flags: FULL_VIEW, pubkey: authority },
            Member { flags: FULL_VIEW, pubkey: ctx.accounts.config.crank },
        ];
        let seeds: &[&[u8]] = &[ENTRY_SEED, &gw, authority.as_ref(), &[bump]];
        let a = &ctx.accounts;
        let exists = a.permission.owner == &PERMISSION_PROGRAM_ID && !a.permission.data_is_empty();
        if exists {
            UpdateEphemeralPermissionCpi {
                permissioned_account: a.entry.to_account_info(),
                permission: a.permission.to_account_info(),
                payer: a.entry.to_account_info(),
                authority: a.entry.to_account_info(),
                vault: a.ephemeral_vault.to_account_info(),
                magic_program: a.magic_program.to_account_info(),
                permission_program: a.permission_program.to_account_info(),
                authority_is_signer: false,
                args: EphemeralMembersArgs { is_private: true, members },
            }
            .invoke_signed(&[seeds])?;
        } else {
            CreateEphemeralPermissionCpi {
                permissioned_account: a.entry.to_account_info(),
                permission: a.permission.to_account_info(),
                payer: a.entry.to_account_info(),
                vault: a.ephemeral_vault.to_account_info(),
                magic_program: a.magic_program.to_account_info(),
                permission_program: a.permission_program.to_account_info(),
                args: EphemeralMembersArgs { is_private: true, members },
            }
            .invoke_signed(&[seeds])?;
        }
        Ok(())
    }

    /// After kickoff anyone can reveal a sealed entry: it becomes public in the rollup.
    pub fn reveal_entry(ctx: Context<RevealEntry>) -> Result<()> {
        let g = &ctx.accounts.gameweek;
        require!(Clock::get()?.unix_timestamp >= g.deadline_ts, BullError::TooEarly);
        let e = &mut ctx.accounts.entry;
        require!(e.status == entry_status::SEALED, BullError::NotSealed);
        e.status = entry_status::REVEALED;
        let (authority, gw, bump) = (e.authority, e.gameweek.to_le_bytes(), e.bump);
        let members = vec![
            Member { flags: FULL_VIEW, pubkey: authority },
            Member { flags: FULL_VIEW, pubkey: ctx.accounts.config.crank },
        ];
        let seeds: &[&[u8]] = &[ENTRY_SEED, &gw, authority.as_ref(), &[bump]];
        let a = &ctx.accounts;
        UpdateEphemeralPermissionCpi {
            permissioned_account: a.entry.to_account_info(),
            permission: a.permission.to_account_info(),
            payer: a.entry.to_account_info(),
            authority: a.entry.to_account_info(),
            vault: a.ephemeral_vault.to_account_info(),
            magic_program: a.magic_program.to_account_info(),
            permission_program: a.permission_program.to_account_info(),
            authority_is_signer: false,
            args: EphemeralMembersArgs { is_private: false, members },
        }
        .invoke_signed(&[seeds])?;
        Ok(())
    }

    /// Scores a revealed entry from the gameweek's TWAPs, adds it to the
    /// manager's season, and commits both to Solana in the same transaction.
    pub fn settle_entry(ctx: Context<SettleEntry>) -> Result<()> {
        let g = &ctx.accounts.gameweek;
        require!(g.status == status::FINAL, BullError::TooEarly);
        let now = Clock::get()?.unix_timestamp;
        let e = &mut ctx.accounts.entry;
        require!(e.status == entry_status::REVEALED, BullError::NotRevealed);
        let lineup = Lineup { squad: e.squad, starters: e.starters, bench: e.bench, captain: e.captain, vice: e.vice, chip: e.chip, hedge: e.hedge };
        let points = game::score_lineup(&lineup, &g.open_twap, &g.close_twap, e.transfer_hit);
        e.points = points;
        e.settled_ts = now;
        e.status = entry_status::SETTLED;

        let m = &mut ctx.accounts.manager;
        m.gameweeks = m.gameweeks.saturating_add(1);
        m.total_points = m.total_points.saturating_add(points as i64);
        if m.gameweeks == 1 || points > m.best_points {
            m.best_points = points;
            m.best_gameweek = g.id;
        }
        m.last_gameweek = g.id;
        m.last_points = points;

        ctx.accounts.entry.exit(&crate::ID)?;
        ctx.accounts.manager.exit(&crate::ID)?;
        MagicIntentBundleBuilder::new(
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.magic_context.to_account_info(),
            ctx.accounts.magic_program.to_account_info(),
        )
        .commit(&[ctx.accounts.entry.to_account_info(), ctx.accounts.manager.to_account_info()])
        .build_and_invoke()?;
        Ok(())
    }
}

/* ------------------------------- Helpers ------------------------------- */

fn rule_error(e: RuleError) -> Error {
    match e {
        RuleError::UnknownStock => error!(BullError::UnknownStock),
        RuleError::Duplicate => error!(BullError::Duplicate),
        RuleError::SquadQuota => error!(BullError::SquadQuota),
        RuleError::OverBudget => error!(BullError::OverBudget),
        RuleError::SectorLimit => error!(BullError::SectorLimit),
        RuleError::LineupMismatch => error!(BullError::LineupMismatch),
        RuleError::Formation => error!(BullError::Formation),
        RuleError::Captain => error!(BullError::Captain),
        RuleError::Chip => error!(BullError::Chip),
    }
}

fn fixed_name(s: &str) -> Result<[u8; NAME_LEN]> {
    let b = s.trim().as_bytes();
    require!(!b.is_empty() && b.len() <= NAME_LEN, BullError::BadName);
    let mut out = [0u8; NAME_LEN];
    out[..b.len()].copy_from_slice(b);
    Ok(out)
}

fn allowed_validator(rem: &[AccountInfo]) -> Result<Pubkey> {
    let v = rem.first().map(|a| a.key()).ok_or(BullError::BadValidator)?;
    require!(v == TEE_VALIDATOR || v == ASIA_VALIDATOR, BullError::BadValidator);
    Ok(v)
}

fn require_tee(rem: &[AccountInfo]) -> Result<()> {
    if let Some(v) = rem.first() {
        require_keys_eq!(v.key(), TEE_VALIDATOR, BullError::BadValidator);
    }
    Ok(())
}

/// Average price (micro-USD) per stock between two price book states.
pub fn twap_between(cum_a: &[u128; MAX_STOCKS], ts_a: i64, cum_b: &[u128; MAX_STOCKS], ts_b: i64, n: usize) -> [u64; MAX_STOCKS] {
    let mut out = [0u64; MAX_STOCKS];
    let dt = (ts_b - ts_a) as u128;
    if dt == 0 {
        return out;
    }
    for i in 0..n.min(MAX_STOCKS) {
        out[i] = (cum_b[i].saturating_sub(cum_a[i]) / dt) as u64;
    }
    out
}

/// Pure update so it can be unit tested without a validator.
pub fn apply_prices(book: &mut PriceBook, prices: &[u64], now: i64) -> Result<()> {
    if book.start_ts == 0 {
        book.start_ts = now;
    } else {
        require!(now >= book.last_ts, BullError::ClockWentBack);
        let dt = (now - book.last_ts) as u128;
        for i in 0..book.count as usize {
            book.cum[i] = book.cum[i].checked_add(book.prices[i] as u128 * dt).ok_or(BullError::Overflow)?;
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

/* -------------------------------- State -------------------------------- */

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

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    /// Key that reveals and settles entries (can read sealed entries)
    pub crank: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Manager {
    pub authority: Pubkey,
    pub bump: u8,
    pub name: [u8; NAME_LEN],
    pub team: [u8; NAME_LEN],
    pub created_ts: i64,
    pub gameweeks: u32,
    pub total_points: i64,
    pub best_points: i32,
    pub best_gameweek: u32,
    pub last_gameweek: u32,
    pub last_points: i32,
}

#[account]
#[derive(InitSpace)]
pub struct Gameweek {
    pub id: u32,
    pub kind: u8,
    pub status: u8,
    pub bump: u8,
    pub deadline_ts: i64,
    pub end_ts: i64,
    /// Length of the opening and closing TWAP windows, seconds
    pub window: i64,
    /// Price book state saved at the start of the current window
    pub tmp_ts: i64,
    pub tmp_cum: [u128; MAX_STOCKS],
    /// Opening and closing TWAP per stock, micro-USD
    pub open_twap: [u64; MAX_STOCKS],
    pub close_twap: [u64; MAX_STOCKS],
}

#[account]
#[derive(InitSpace)]
pub struct Entry {
    pub gameweek: u32,
    pub authority: Pubkey,
    pub bump: u8,
    pub status: u8,
    pub sealed_ts: i64,
    pub settled_ts: i64,
    pub squad: [u8; SQUAD_SIZE],
    pub starters: [u8; XI_SIZE],
    pub bench: [u8; BENCH_SIZE],
    pub captain: u8,
    pub vice: u8,
    pub chip: u8,
    pub hedge: u8,
    pub transfer_hit: u8,
    pub points: i32,
}

/* ------------------------------- Accounts ------------------------------- */

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

#[derive(Accounts)]
pub struct InitConfig<'info> {
    #[account(init, payer = admin, space = 8 + Config::INIT_SPACE, seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateManager<'info> {
    #[account(init, payer = payer, space = 8 + Manager::INIT_SPACE, seeds = [MANAGER_SEED, authority.key().as_ref()], bump)]
    pub manager: Account<'info, Manager>,
    pub authority: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegateManager<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub authority: Signer<'info>,
    /// CHECK: the manager PDA, checked by seeds
    #[account(mut, del, seeds = [MANAGER_SEED, authority.key().as_ref()], bump)]
    pub pda: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct SetProfile<'info> {
    #[account(mut, seeds = [MANAGER_SEED, authority.key().as_ref()], bump = manager.bump, has_one = authority)]
    pub manager: Account<'info, Manager>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(id: u32)]
pub struct CreateGameweek<'info> {
    #[account(init, payer = admin, space = 8 + Gameweek::INIT_SPACE, seeds = [GAMEWEEK_SEED, &id.to_le_bytes()], bump)]
    pub gameweek: Account<'info, Gameweek>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = admin @ BullError::NotAdmin)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[delegate]
#[derive(Accounts)]
#[instruction(id: u32)]
pub struct DelegateGameweek<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    /// CHECK: the gameweek PDA, checked by seeds
    #[account(mut, del, seeds = [GAMEWEEK_SEED, &id.to_le_bytes()], bump)]
    pub pda: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct SnapshotGameweek<'info> {
    #[account(mut, seeds = [GAMEWEEK_SEED, &gameweek.id.to_le_bytes()], bump = gameweek.bump)]
    pub gameweek: Account<'info, Gameweek>,
    #[account(seeds = [PRICE_BOOK_SEED], bump = price_book.bump)]
    pub price_book: Account<'info, PriceBook>,
}

#[derive(Accounts)]
#[instruction(gameweek: u32)]
pub struct CreateEntry<'info> {
    #[account(init, payer = payer, space = 8 + Entry::INIT_SPACE, seeds = [ENTRY_SEED, &gameweek.to_le_bytes(), authority.key().as_ref()], bump)]
    pub entry: Account<'info, Entry>,
    pub authority: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[delegate]
#[derive(Accounts)]
#[instruction(gameweek: u32)]
pub struct DelegateEntry<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub authority: Signer<'info>,
    /// CHECK: the entry PDA, checked by seeds
    #[account(mut, del, seeds = [ENTRY_SEED, &gameweek.to_le_bytes(), authority.key().as_ref()], bump)]
    pub pda: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct SealEntry<'info> {
    #[account(mut, seeds = [ENTRY_SEED, &entry.gameweek.to_le_bytes(), authority.key().as_ref()], bump = entry.bump, has_one = authority)]
    pub entry: Account<'info, Entry>,
    #[account(seeds = [GAMEWEEK_SEED, &entry.gameweek.to_le_bytes()], bump = gameweek.bump)]
    pub gameweek: Account<'info, Gameweek>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    pub authority: Signer<'info>,
    /// CHECK: the entry's permission PDA under the Permission Program
    #[account(mut, seeds = [PERMISSION_SEED, entry.key().as_ref()], bump, seeds::program = PERMISSION_PROGRAM_ID)]
    pub permission: UncheckedAccount<'info>,
    /// CHECK: Permission Program
    #[account(address = PERMISSION_PROGRAM_ID)]
    pub permission_program: UncheckedAccount<'info>,
    /// CHECK: ephemeral rent vault
    #[account(mut, address = EPHEMERAL_VAULT_ID)]
    pub ephemeral_vault: UncheckedAccount<'info>,
    /// CHECK: Magic Program
    #[account(address = MAGIC_PROGRAM_ID)]
    pub magic_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct RevealEntry<'info> {
    #[account(mut, seeds = [ENTRY_SEED, &entry.gameweek.to_le_bytes(), entry.authority.as_ref()], bump = entry.bump)]
    pub entry: Account<'info, Entry>,
    #[account(seeds = [GAMEWEEK_SEED, &entry.gameweek.to_le_bytes()], bump = gameweek.bump)]
    pub gameweek: Account<'info, Gameweek>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    /// CHECK: the entry's permission PDA
    #[account(mut, seeds = [PERMISSION_SEED, entry.key().as_ref()], bump, seeds::program = PERMISSION_PROGRAM_ID)]
    pub permission: UncheckedAccount<'info>,
    /// CHECK: Permission Program
    #[account(address = PERMISSION_PROGRAM_ID)]
    pub permission_program: UncheckedAccount<'info>,
    /// CHECK: ephemeral rent vault
    #[account(mut, address = EPHEMERAL_VAULT_ID)]
    pub ephemeral_vault: UncheckedAccount<'info>,
    /// CHECK: Magic Program
    #[account(address = MAGIC_PROGRAM_ID)]
    pub magic_program: UncheckedAccount<'info>,
}

#[commit]
#[derive(Accounts)]
pub struct SettleEntry<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [ENTRY_SEED, &entry.gameweek.to_le_bytes(), entry.authority.as_ref()], bump = entry.bump)]
    pub entry: Account<'info, Entry>,
    #[account(seeds = [GAMEWEEK_SEED, &entry.gameweek.to_le_bytes()], bump = gameweek.bump)]
    pub gameweek: Account<'info, Gameweek>,
    #[account(mut, seeds = [MANAGER_SEED, entry.authority.as_ref()], bump = manager.bump)]
    pub manager: Account<'info, Manager>,
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
    #[msg("Names must be 1 to 24 characters")]
    BadName,
    #[msg("That validator is not allowed")]
    BadValidator,
    #[msg("End must be after the deadline")]
    BadSchedule,
    #[msg("Too early for this step")]
    TooEarly,
    #[msg("This gameweek is already final")]
    AlreadyFinal,
    #[msg("The deadline has passed")]
    DeadlinePassed,
    #[msg("Entry is not sealed")]
    NotSealed,
    #[msg("Entry is not revealed yet")]
    NotRevealed,
    #[msg("Unknown stock")]
    UnknownStock,
    #[msg("The same stock appears twice")]
    Duplicate,
    #[msg("Squad needs 2 ETF, 5 Blue Chip, 5 Growth and 3 High Risk")]
    SquadQuota,
    #[msg("Squad is over the 100 credit budget")]
    OverBudget,
    #[msg("Max 3 stocks from one sector")]
    SectorLimit,
    #[msg("Starters and bench must be your 15 stocks")]
    LineupMismatch,
    #[msg("Formation is not legal")]
    Formation,
    #[msg("Captain and vice must be two different starters")]
    Captain,
    #[msg("That chip can't be played like this")]
    Chip,
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
        assert_eq!(b.prices[1], 200);
        assert_eq!(b.updates, 3);
    }

    #[test]
    fn twap_between_snapshots() {
        let mut b = book(1);
        apply_prices(&mut b, &[100], 0).unwrap();
        apply_prices(&mut b, &[100], 60).unwrap();
        let (a_cum, a_ts) = (b.cum, b.last_ts);
        apply_prices(&mut b, &[130], 120).unwrap(); // 60s at 100
        apply_prices(&mut b, &[130], 180).unwrap(); // 60s at 130
        let t = twap_between(&a_cum, a_ts, &b.cum, b.last_ts, 1);
        assert_eq!(t[0], 115);
    }

    #[test]
    fn rejects_clock_going_back() {
        let mut b = book(1);
        apply_prices(&mut b, &[1], 100).unwrap();
        assert!(apply_prices(&mut b, &[1], 99).is_err());
    }

    #[test]
    fn accounts_fit_in_committable_size() {
        assert!(8 + PriceBook::INIT_SPACE <= 10_240);
        assert!(8 + Gameweek::INIT_SPACE <= 10_240);
        assert!(8 + Entry::INIT_SPACE <= 10_240);
    }

    #[test]
    fn names_are_bounded() {
        assert!(fixed_name("Desk Bulls").is_ok());
        assert!(fixed_name("").is_err());
        assert!(fixed_name(&"x".repeat(25)).is_err());
    }
}
