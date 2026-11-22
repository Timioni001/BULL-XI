# BULL-XI

**Fantasy football for onchain stocks.** Pick 15 tokenized stocks, wear the captain's armband and win your league, 24/7. Built for MagicBlock Solana Blitz v10 (Entertainment Finance).

> Status: Phase 2, checkpoint 2 (devnet). Real xStock prices; sealed squads in MagicBlock's Private Ephemeral Rollup; onchain scoring and settlement committed to Solana; public manager profiles; sponsored fees so players never need SOL; Cloudflare static site plus one game Worker. Devnet preview with test tokens priced from real market data. See [CLAUDE.md](CLAUDE.md) for the brief, [docs/PLAN.md](docs/PLAN.md) for structure and [docs/STOCKS.md](docs/STOCKS.md) for the stock universe.

## Run it

```bash
npm install
npm run dev            # http://localhost:3000
npm run check          # lint + typecheck + tests + production build (static export to out/)
```

Preview the static build like production: `npm run build && npx serve out`.

On your phone: `npm run dev -- -H 0.0.0.0`, then open `http://<your-computer-ip>:3000`.

## Tour

| URL | What |
|---|---|
| `/` | Landing page with a live mini-pitch |
| `/app` | Onboarding, then the game |
| `/app/squad` → `/app/pick` → `/app/lock` → `/app/live` | Build, pick, lock, watch live |
| `/app/leagues`, `/app/league?id=office` | Leagues, tables, head-to-head |
| `/join?code=TRD-9X4` | Invite link landing (try it) |
| `/app/transfers`, `/app/chips`, `/app/history`, `/app/profile`, `/app/pro` | The rest of the game |
| `/proof` | For judges: where each piece runs, counters, explorer links |
| `/app/manager?id=8hnidnTb6oHvMfmXz5WWwWtuG5JcBRDTHWZ9kYGV2xiR` | Public manager profile, results read from devnet |

## Demo mode (for recording)

Add `?demo=1` to any URL (or toggle it in Profile). Demo mode:
- uses the simulated market, 10x faster, so points move on camera (real prices barely move on weekends),
- shows **Demo: start now** on the deadline screen (skip the countdown),
- shows **Demo: blow the whistle** on the live screen (jump to the result and share card).

`?demo=0` turns it off. Without demo mode, gameweeks start and end on their real schedule.

## Review switches

| Param | Effect |
|---|---|
| `?mock=slow` | 2.5s latency on every data call (loading states) |
| `?mock=error` | every data call fails (error states) |
| `?mock=empty` | empty leagues and history |
| `?mock=sim` | simulated market instead of real prices |
| `?mock=off` | back to normal |
| `/app?intro` | replay onboarding |

Profile → **Reset demo** clears your saved squad and leagues.

## Architecture

```
UI (app/, components/)  ──►  lib/data/index.ts  ──►  lib/data/live/*    real xStock prices (Jupiter, free, no key)
        │                                         ├►  lib/data/onchain.ts  seal squads, profiles, results (loaded on demand)
        │                                         └►  lib/data/mock/*    leagues, history, simulated market for demo mode
        │
        │   lib/onchain/*            @solana/kit clients: generated program client, game, crank, relay checks, TEE login
        │   worker/  (Cloudflare)    cron every minute: prices, snapshots, reveals, settlement. POST /relay sponsors fees
        │   onchain/programs/bullxi  price book, managers, gameweeks, sealed entries, settlement (MagicBlock Private ER)
        └──►  lib/game/rules.ts   pure rules, mirrored onchain in onchain/programs/bullxi/src/game.rs (both unit tested)
        └──►  lib/store/game.ts   Zustand, persisted locally
        └──►  lib/copy.ts         every user-facing string
```

## How a gameweek runs onchain

Everything lives on MagicBlock's **Private Ephemeral Rollup (TEE)** on devnet, so settlement can read squads and prices in one transaction.

1. **Prices.** Every minute the Worker writes all 41 prices to the price book. Each push also adds price x seconds to a running sum per stock, so any TWAP is a difference of two sums.
2. **Seal.** A signed-in manager locks their squad. The app creates their profile and entry on Solana (sponsored, they need no SOL), hands them to the private rollup, then seals the squad there. A privacy permission lets only the manager and the game crank read it.
3. **Kickoff.** At the deadline the crank snapshots the price book and reveals every sealed entry. From now on anyone can read them.
4. **TWAP.** The crank snapshots again after the opening window (first 10% of the gameweek) and at the start and end of the closing window. Points use opening TWAP vs closing TWAP, not a single trade.
5. **Settle.** At full time the crank scores each entry with the rules in `game.rs` (the same rules as `lib/game/rules.ts`), adds it to the manager's season, and commits both to Solana in the same transaction.
6. **Profiles.** `/app/manager?id=<player id>` shows anyone's season and results, each with a proof link to Solana.

Squad rules (15 stocks, 2/5/5/3, 100 credits, max 3 per sector, legal formation, captain and vice) are enforced onchain, not just in the app.

## Deploy (Cloudflare, free plan)

Everything runs on Cloudflare. No Vercel.

```bash
npx wrangler login                 # once, opens the browser
npm run deploy:web                 # next build (static export) + Workers Static Assets -> bullxi.<you>.workers.dev
npx wrangler secret put PUSHER_KEY --config worker/wrangler.jsonc   # devnet-only key (JSON byte array)
npm run deploy:worker              # game Worker: cron every minute + /health, /price-book, /sponsor, /relay
```

`wrangler.jsonc` serves `out/` as static assets. `worker/wrangler.jsonc` is the game Worker (`bullxi-game`). Its one key is devnet-only: it pushes prices, runs the crank and sponsors players' fees. It only ever lives in `wrangler secret`, never in the repo. The app expects the Worker at `GAME_API` in `lib/config.ts` (or `NEXT_PUBLIC_GAME_API`).

**Fee sponsorship.** `/relay` co-signs only these instructions: create and hand over a profile or an entry (on Solana), seal a squad or rename (on the rollup). The sponsor can only ever be the fee payer. Solana's public devnet RPC blocks requests from Cloudflare Workers, so for Solana transactions the Worker returns the co-signed transaction and the player's browser sends it. For the same reason daily gameweeks are created ahead with `npm run onchain:schedule`.

## Onchain (devnet)

```bash
npm run onchain:test               # Rust unit tests: price book math and every game rule
npm run onchain:build              # cargo build-sbf --arch v0 -> onchain/target/deploy/bullxi.so
npm run onchain:gen                # regenerate the stock table (universe.rs) from the app's stock list
npm run onchain:client             # regenerate the typed client (lib/onchain/bullxi) from the IDL (Codama)
npm run onchain:schedule -- 8      # create the next 8 daily gameweeks (20:00 UTC deadline)
npm run onchain:crank              # local fallback for the Worker cron (add -- --loop)
npm run onchain:read               # price book on the rollup and on Solana
npx tsx scripts/onchain/e2e.ts     # full 5-minute gameweek: seal, privacy check, reveal, TWAP, settle, commit
```

Keys live outside the repo in `~/.config/solana/bullxi/` (`deployer.json` = upgrade authority and admin, `pusher.json` = pusher, crank and sponsor, `program.json`).

Commits are rationed: with a plain payer the ER allows 10 commits per delegated account. The price book commits once a day; each manager commits once per settled gameweek.

## Sign-in (optional, free)

Playing never needs an account. Signing in (Google or email, via Privy's free tier) saves your team to an account and creates a Solana account for you automatically. Crypto users can sign in with Phantom, Solflare or Backpack on Go Pro.

App ID in use: `cmwrt3lfl02rq0ijqz5htjny5` (allowed origin: `https://bullxi.timioni1490.workers.dev`).

1. Create a free app at dashboard.privy.io and enable Google, Email and Wallets (Solana).
2. Add your site under Allowed origins (e.g. `https://bullxi.<you>.workers.dev` and `http://localhost:3000`).
3. Put the App ID (public, not a secret) in `PRIVY_APP_ID` in `lib/config.ts`, or set `NEXT_PUBLIC_PRIVY_APP_ID` in the Cloudflare build settings.

Without an App ID the sign-in UI is hidden. If Privy fails to load, the app falls back to guest play.

## Live on devnet

| What | Address |
|---|---|
| `bullxi` program | [`EZi2Raxa2hba9Bt5jYKf6nUkbQ4xgZeHbuBxjVJTCPXN`](https://explorer.solana.com/address/EZi2Raxa2hba9Bt5jYKf6nUkbQ4xgZeHbuBxjVJTCPXN?cluster=devnet) |
| Price book (delegated to the MagicBlock TEE) | [`3QmqpfrpbsTU6J4t8vjhFHr8BZo5yczp6C8zZFnRE7pK`](https://explorer.solana.com/address/3QmqpfrpbsTU6J4t8vjhFHr8BZo5yczp6C8zZFnRE7pK?cluster=devnet) |
| Game config | [`5orhWwHuxps7KWzsbCrNKdo9dYFMjvc9WkzcH6dKjQxk`](https://explorer.solana.com/address/5orhWwHuxps7KWzsbCrNKdo9dYFMjvc9WkzcH6dKjQxk?cluster=devnet) |
| Private ER (TEE) validator | `MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo` (devnet-tee.magicblock.app) |
| Example settled manager (e2e test) | [`D96wQNjc…`](https://explorer.solana.com/address/D96wQNjcChdNs96m1wBS448PFgff1sosAykwARSX6qZ3?cluster=devnet), profile at `/app/manager?id=8hnidnTb6oHvMfmXz5WWwWtuG5JcBRDTHWZ9kYGV2xiR` |

`npm run onchain:read` prints the live rollup copy and the last copy saved to Solana.

## MagicBlock map

| UX moment | MagicBlock tech |
|---|---|
| Squad hidden until kickoff | Private Ephemeral Rollup: sealed entries with a members-only permission, revealed at kickoff (built) |
| Live prices and TWAP | Price book on the Private ER, written every minute (built) |
| Deadline lock and settlement | Crank in the game Worker: snapshots, reveal, settle (built; MagicBlock cranks next) |
| Final standings | Commit: each settled entry and manager is committed to Solana (built) |
| Prize payouts | Magic Actions |
| Entry fees and prize pool | Ephemeral SPL Token |
| No pop-ups for captain and transfers | Session Keys |
| Head-to-head draws | VRF |
| Season rank and badges | SOAR |

Why our own price book: MagicBlock's real-time pricing oracle only accepts updates signed by MagicBlock's oracle key, and its feed list has no stocks.

## Media

Company logos live in `public/logos/` (WebP, served locally so no image link can break) and are trademarks of their owners, shown to identify each stock. Access goes through `lib/data/media.ts`.

## Stack

Next.js 16 (App Router, strict TS), Tailwind v4, shadcn/ui, Motion, Zustand, NumberFlow, vaul, sonner, cmdk, dnd-kit, TradingView Lightweight Charts, canvas-confetti, `@solana/kit`, Anchor, Wrangler. The share card is drawn in the browser with canvas. Fonts: Archivo (extended display), Instrument Serif (landing), Geist and Geist Mono.
