# BULL-XI

**Fantasy football for onchain stocks.** Pick 15 tokenized stocks, wear the captain's armband and win your league, 24/7. Built for MagicBlock Solana Blitz v10 (Entertainment Finance).

> Status: Phase 2, checkpoint 1 (devnet). Real xStock prices in the app, the `bullxi` price book program, a Cloudflare price pusher and a static Cloudflare deploy. Devnet preview with test tokens priced from real market data. See [CLAUDE.md](CLAUDE.md) for the brief, [docs/PLAN.md](docs/PLAN.md) for structure and [docs/STOCKS.md](docs/STOCKS.md) for the stock universe.

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
UI (app/, components/)  ──►  lib/data/index.ts  ──►  lib/data/live/*   real xStock prices (Jupiter, free, no key)
        │                                         ├►  lib/data/mock/*   leagues, history, simulated market for demo mode
        │                                         └►  lib/onchain/*     price book client (@solana/kit)
        │
        │   worker/  (Cloudflare cron, every minute)  ──►  push_prices on the MagicBlock Ephemeral Rollup
        │   onchain/programs/bullxi                    ──►  price book + onchain TWAP, delegated to the devnet ER
        └──►  lib/game/rules.ts   pure rules: squads, scoring, captain, chips, transfers (unit tested)
        └──►  lib/store/game.ts   Zustand, persisted locally
        └──►  lib/copy.ts         every user-facing string
```

## Deploy (Cloudflare, free plan)

Everything runs on Cloudflare. No Vercel.

```bash
npx wrangler login                 # once, opens the browser
npm run deploy:web                 # next build (static export) + Workers Static Assets -> bullxi.<you>.workers.dev
npx wrangler secret put PUSHER_KEY --config worker/wrangler.jsonc   # paste the devnet-only pusher key (JSON byte array)
npm run deploy:worker              # price pusher cron (every minute) + /health and /price-book
```

`wrangler.jsonc` serves `out/` as static assets. `worker/wrangler.jsonc` is the pusher. The pusher key is a dedicated devnet-only key and only ever lives in `wrangler secret`, never in the repo.

## Onchain (devnet)

```bash
npm run onchain:test               # Rust unit tests for the price book math
npm run onchain:build              # cargo build-sbf --arch v0 -> onchain/target/deploy/bullxi.so
solana program deploy onchain/target/deploy/bullxi.so --program-id <program keypair> -u devnet
npm run onchain:setup              # create the price book and delegate it to the devnet ER
npm run onchain:push               # local fallback pusher (add -- --loop to run every minute)
```

Keys live outside the repo in `~/.config/solana/bullxi/` (`deployer.json`, `pusher.json`, `program.json`). Program ID: `EZi2Raxa2hba9Bt5jYKf6nUkbQ4xgZeHbuBxjVJTCPXN`.

The price book holds the latest price of all 41 stocks (micro-USD) plus a running price x time sum per stock, so any gameweek TWAP is `(cum_end - cum_start) / (t_end - t_start)`. Pushes on the rollup are free. It is committed to Solana once a day: with a plain payer the ER allows 10 commits per delegation.

## Sign-in (optional, free)

Playing never needs an account. Signing in (Google or email, via Privy's free tier) saves your team to an account and creates a Solana account for you automatically. Crypto users can sign in with Phantom, Solflare or Backpack on Go Pro.

1. Create a free app at dashboard.privy.io and enable Google, Email and Wallets (Solana).
2. Add your site under Allowed origins (e.g. `https://bullxi.<you>.workers.dev` and `http://localhost:3000`).
3. Put the App ID (public, not a secret) in `PRIVY_APP_ID` in `lib/config.ts`, or set `NEXT_PUBLIC_PRIVY_APP_ID` in the Cloudflare build settings.

Without an App ID the sign-in UI is hidden. If Privy fails to load, the app falls back to guest play.

## Live on devnet

| What | Address |
|---|---|
| `bullxi` program | [`EZi2Raxa2hba9Bt5jYKf6nUkbQ4xgZeHbuBxjVJTCPXN`](https://explorer.solana.com/address/EZi2Raxa2hba9Bt5jYKf6nUkbQ4xgZeHbuBxjVJTCPXN?cluster=devnet) |
| Price book (delegated to the MagicBlock devnet ER) | [`3QmqpfrpbsTU6J4t8vjhFHr8BZo5yczp6C8zZFnRE7pK`](https://explorer.solana.com/address/3QmqpfrpbsTU6J4t8vjhFHr8BZo5yczp6C8zZFnRE7pK?cluster=devnet) |
| ER validator | `MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57` (devnet-as.magicblock.app) |

`npm run onchain:read` prints the live rollup copy and the last copy saved to Solana.

## MagicBlock map

| UX moment | MagicBlock tech |
|---|---|
| Squad hidden until kickoff | Private Ephemeral Rollup |
| Live prices and TWAP | Ephemeral Rollup price book, written every minute (built) |
| Deadline lock and settlement | Cranks |
| Final standings | Commit / Undelegate |
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
