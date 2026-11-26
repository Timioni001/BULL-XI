# BULL-XI

**A fantasy league for tokenized stocks, running on Solana and MagicBlock's Private Ephemeral Rollup.**
Players pick 15 real stocks (xStocks), seal their squad privately before the deadline, and are scored onchain from time-weighted prices. Results are committed to Solana.

Built for MagicBlock Solana Blitz v10. Runs on **devnet**: test SOL, real market prices, $0 infrastructure.

![App screens: build a squad, seal it, watch live, public profile](docs/images/app-screens.png)

| | |
|---|---|
| App | `https://bull-xi.timioni1490.workers.dev` |
| Proof page (live devnet numbers) | `/proof` |
| Program (devnet) | [`EZi2Raxa2hba9Bt5jYKf6nUkbQ4xgZeHbuBxjVJTCPXN`](https://explorer.solana.com/address/EZi2Raxa2hba9Bt5jYKf6nUkbQ4xgZeHbuBxjVJTCPXN?cluster=devnet) |
| Demo film (91 s, made in code with Remotion from real app recordings) | [`docs/media/bullxi-film.mp4`](docs/media/bullxi-film.mp4) |
| Raw walkthrough (80 s, screen recording) | [`docs/media/bullxi-demo.mp4`](docs/media/bullxi-demo.mp4) |
| Full devnet run with every signature | [`docs/devnet-runs/`](docs/devnet-runs/2026-11-24-e2e-v3.md) |

## Try it in 2 minutes

1. Open the app, tap **Start playing free**, then **Auto-pick** and **Pick your team**.
2. Tap **Lock squad**. Within a few seconds you'll see **Sealed on Solana**: your squad is now inside MagicBlock's Private ER. You sign in with Google or email first; no wallet, no SOL, no pop-ups.
3. Switch the deadline to **Flash** before locking to play the hourly gameweek: it kicks off on the hour and settles an hour later. Then **Watch live**.
4. Open **/proof** to see the live counters, this hour's gameweek and its VRF golden stock.
5. Short on time? Add `?demo=1` for a 10x replay of a gameweek.

---

## What it does

- **A gameweek every hour.** Daily (20:00 UTC) and hourly flash gameweeks run onchain, so anyone can play a full cycle in about an hour.
- **Golden stock (MagicBlock VRF).** At kickoff a random stock among those started that week is drawn onchain; it scores double for everyone who has it.
- **The rollup runs its own clock (MagicBlock cranks).** Scheduled tasks on the TEE advance each gameweek through its TWAP snapshots.
- **Real prices.** 41 xStocks priced from the xStocks reference price (Jupiter API, free). The app polls every 3 s; a Worker writes the same prices onchain every minute.
- **Sealed squads.** A locked squad lives in MagicBlock's **Private ER (TEE)** with a members-only permission. Rivals can't read it until kickoff.
- **Onchain rules and scoring.** Squad rules (15 stocks, 2/5/5/3, 100 credits, max 3 per sector, formation, captain) and scoring (TWAP move, captain, chips, bonuses, auto-subs) run in the program.
- **Settlement on Solana.** At full time each squad is scored and the result plus the manager's season record are committed to Solana.
- **Sign in with Google or email, then no SOL and no pop-ups.** Privy creates a Solana account for every player automatically and it signs game actions silently. If that account can't sign, a key kept on the device seals the squad as a fallback. A sponsor key pays fees for an allowlist of game instructions only.
- **Live table.** During a gameweek the app scores every revealed squad from the onchain opening TWAP and live prices, the same maths as settlement.
- **Demo mode.** `?demo=1` replays a gameweek at 10x with a simulated league, for quick looks.

---

## Architecture

![Architecture](docs/images/architecture.png)

| Part | Where | What it does |
|---|---|---|
| **App** | Cloudflare Workers Static Assets (`wrangler.jsonc`) | Next.js static export. No server code. Talks to Jupiter, the Worker, devnet and the TEE directly |
| **Game Worker** | Cloudflare Worker `bullxi-game` (`worker/`) | Cron every minute: push prices, snapshot TWAPs, reveal, settle. `POST /relay` co-signs allowlisted game transactions |
| **bullxi program** | Solana devnet, accounts delegated to the MagicBlock TEE (`onchain/`) | Price book, gameweeks, sealed entries, managers, scoring, settlement |
| **Sign-in** | Privy (free tier) | Google and email accounts get a Solana key automatically; Phantom, Solflare and Backpack also work |

Everything game-related lives on **one rollup (the TEE)** so a single transaction can read a squad, the gameweek and the price book together.

---

## A gameweek onchain

![Gameweek lifecycle](docs/images/gameweek.png)

1. **Seal.** The app creates the player's profile and entry on Solana (sponsored), delegates them to the TEE, then seals the squad there. A permission lets only the player and the crank read it.
2. **Kickoff.** At the deadline a MagicBlock crank snapshots the price book, every squad is revealed, and MagicBlock VRF draws the golden stock.
3. **Opening TWAP.** After the first 10% of the gameweek, the average price per stock is fixed.
4. **Full time.** The closing TWAP is fixed over the last 10%, and the program finds the top gainer among every stock started that week.
5. **Settle and commit.** Each squad is scored with `game.rs` and committed to Solana with the manager's updated season.

Daily gameweeks have a 20:00 UTC deadline and last 24 hours; flash gameweeks start every hour and last one. TWAP snapshots run on MagicBlock cranks scheduled on the rollup (`tick_gameweek`); the Worker also calls them as a backup and handles reveal, the VRF request and settlement. Every one of these steps is permissionless.

### The price book and TWAP

![Price book](docs/images/pricebook.png)

One 1.6 KB account holds the latest price of every stock and a running `price x seconds` sum. Any window's TWAP is `(cum_end - cum_start) / (t_end - t_start)`, so a 24-hour gameweek needs only four snapshots.

### Sponsored actions

![Relay](docs/images/relay.png)

The relay only co-signs these instructions, and the sponsor may only appear as the fee payer:

| Where | Allowed |
|---|---|
| Solana | `create_manager`, `delegate_manager`, `create_entry`, `delegate_entry` |
| TEE | `seal_entry`, `set_profile` |

Solana's public devnet RPC blocks Cloudflare Workers, so Solana-side transactions are returned co-signed and the browser sends them.

---

## The program

`onchain/programs/bullxi` (Anchor 1.x, `ephemeral-rollups-sdk` 0.17 with `access-control`).

| Account | Seeds | Lives on | Holds |
|---|---|---|---|
| `PriceBook` | `price_book` | TEE | 48 price slots (micro-USD), running TWAP sums, pusher key |
| `Config` | `config` | Solana | Admin and crank keys |
| `Gameweek` | `gameweek_v3`, id | TEE | Deadline, end, window, opening and closing TWAP, picked stocks, top gainer, VRF golden stock |
| `Entry` | `entry`, gameweek, player | TEE (private until kickoff) | Squad, XI, bench, captain, vice, chip, points |
| `Manager` | `manager`, player | TEE, committed to Solana | Name, team, gameweeks, season points, best week |

| Instruction | Who | Layer |
|---|---|---|
| `push_prices`, `commit_price_book` | Pusher | TEE |
| `create_gameweek`, `delegate_gameweek` | Admin or crank | Solana |
| `create_manager`, `delegate_manager`, `create_entry`, `delegate_entry` | Player (sponsored) | Solana |
| `seal_entry`, `set_profile` | Player (sponsored) | TEE |
| `snapshot_gameweek`, `tick_gameweek` | Anyone, or a MagicBlock crank (`schedule_ticks`) | TEE |
| `request_golden` → `golden_callback` | Anyone after kickoff → MagicBlock VRF (scoped identity only) | TEE |
| `reveal_entry`, `settle_entry` | Anyone after the right time (crank) | TEE |

Rules live in `onchain/programs/bullxi/src/game.rs` and mirror `lib/game/rules.ts`. Both are unit tested, and `scripts/onchain/live-check.ts` checks that the app's live score equals the onchain settled score.

---

## What's verified on devnet

From the end-to-end run on Nov 24 ([full log](docs/devnet-runs/2026-11-24-e2e-v3.md)): a brand-new player with no SOL, a 5-minute test gameweek, program v3.

| Check | Result | Evidence |
|---|---|---|
| Sponsored join and entry (player has 0 SOL) | Pass | [create + delegate profile](https://explorer.solana.com/tx/zuKBxvBZjijLdFopUfWSrn8iVyF5S7BnLDQoWW7VpskorHVU4zGYABbdcFDKHYisD5S8zEmpuvsQggYocbVgUsP?cluster=devnet) · [create + delegate entry](https://explorer.solana.com/tx/3hcwR3bvFBBpVx29doFLJsM251aSfh9SX1f56SQjGiqnZMiFwSiTij2i7oAMbWPdeWivGjPtcs9BSxumzLG7EjEZ?cluster=devnet) |
| MagicBlock crank scheduled on the TEE | Pass | [schedule_ticks](https://explorer.solana.com/tx/3iFAYo9bfupcFdw2QToUupBUB6SMtoetg9D3oDLrdVQbogS2h6EXayATnFdsAUzvHpaFEchghBuR39iZxerQvCnr?cluster=custom&customUrl=https%3A%2F%2Fdevnet-tee.magicblock.app) |
| Squad sealed in the TEE | Pass | [seal_entry](https://explorer.solana.com/tx/4UjTYPPF5V81LhVd55pvsuayLvub7SS6mEGYYXCghznh1AHznz6GauMdNrtkvNj65uCsJ2EGofQVm4qThpJgtWhX?cluster=custom&customUrl=https%3A%2F%2Fdevnet-tee.magicblock.app) |
| Stranger can't read the sealed squad; player can | Pass | log, before kickoff |
| Kickoff, live, closing and final advanced by the MagicBlock crank alone | Pass | log, 4 of 4 steps |
| Golden stock drawn by MagicBlock VRF (callback landed: UNHx) | Pass | [request_golden](https://explorer.solana.com/tx/4xMXxc1B4cjFpR9BZ2LoEzuemkT96gGeK7fG3GeGy4oD26zgoy2nuBcHQydmM3sZ9YfEtnEFVxkZMALSgTtXCteA?cluster=custom&customUrl=https%3A%2F%2Fdevnet-tee.magicblock.app) |
| Squad public after kickoff | Pass | [reveal_entry](https://explorer.solana.com/tx/5YjTEhunDLjdSz35gwHLQ71UaxzSh5nPv7cy1nHhVtgUdVm8JPD6aCvj7qvKeLmRAjPUhjYc8nHbCKbqCgEZZhPK?cluster=custom&customUrl=https%3A%2F%2Fdevnet-tee.magicblock.app) |
| Settled onchain (7 pts) and committed to Solana | Pass | [settle](https://explorer.solana.com/tx/23fdvXkWVGK7MFc2FprDr2cgrug6a9w1Lk3JS9Uq2nncFDSc6AxwvEsmbvzMCfewbk7u9DC5CwzAqdsjqwDtyFmi?cluster=custom&customUrl=https%3A%2F%2Fdevnet-tee.magicblock.app) · [manager on Solana](https://explorer.solana.com/address/961VZjtTUfDnYjJZpqQF63nLTwzt2spoPFMEHDP6v9yc?cluster=devnet) · [entry on Solana](https://explorer.solana.com/address/yHfYFccD14oQUdNPAXrhmhV85gu8ujuxS9QswcSv3zQ?cluster=devnet) |
| App live score equals onchain settled score | Pass | `scripts/onchain/live-check.ts` |
| A browser seals from the app in ~8 s with no wallet or SOL (device-key path) | Pass | Playwright run, demo video |
| Sign-in is required before playing (Google or email via Privy) | Pass | Playwright: gate shown, Privy modal opens |

Rust: 15 unit tests (squad rules, scoring, TWAP, top gainer, auto-subs, golden stock). TypeScript: 57 (rules, relay allowlist, price book encoding).

## Threat model

| Risk | Mitigation |
|---|---|
| Copying a rival's squad before kickoff | Squads live in the TEE with a members-only permission (player + crank). Base-layer accounts never hold the squad before kickoff |
| Draining the fee sponsor | `/relay` co-signs only 6 game instructions, the sponsor may only be the fee payer, max 4 instructions, player signature required. Devnet-only key |
| Forged VRF result | `#[vrf_callback]` only accepts our program's scoped VRF identity; a duplicate callback has no effect |
| Gaming the price with one trade | Points use time-weighted average prices over 10% windows, from a price book written every minute |
| Crank going down | Every step is permissionless: MagicBlock cranks, the Worker, or anyone can advance it. Cranks are armed per gameweek |
| Illegal squads via direct calls | Squad, budget, sector, formation and captain rules are enforced in `seal_entry`, not only in the app |
| Price source | One source (xStocks reference price via Jupiter). Mainnet would add a second source and sanity bounds |

Known trust: the relay and the crank can read sealed squads (they forward and settle them). The pusher key decides prices; mainnet would move this to an oracle.

## Glossary

| Term | Plain English |
|---|---|
| xStock | A tokenized share that tracks a real stock (NVDAx tracks Nvidia) |
| TWAP | Time-weighted average price: the average over a window, so one odd trade can't swing points |
| Ephemeral Rollup (ER) | A fast, free MagicBlock runtime that takes over Solana accounts for a while and commits results back |
| Private ER / TEE | An ER running in secure hardware; accounts can be readable only by chosen members |
| VRF | Verifiable randomness: a random number anyone can check wasn't rigged |
| Crank | A scheduled task that calls a program on a timer |
| Commit | Writing the rollup's latest state back to Solana |

## Live on devnet

![Proof page](docs/images/proof.png)

| What | Address |
|---|---|
| Program | [`EZi2Raxa2hba9Bt5jYKf6nUkbQ4xgZeHbuBxjVJTCPXN`](https://explorer.solana.com/address/EZi2Raxa2hba9Bt5jYKf6nUkbQ4xgZeHbuBxjVJTCPXN?cluster=devnet) |
| Price book | [`3QmqpfrpbsTU6J4t8vjhFHr8BZo5yczp6C8zZFnRE7pK`](https://explorer.solana.com/address/3QmqpfrpbsTU6J4t8vjhFHr8BZo5yczp6C8zZFnRE7pK?cluster=devnet) |
| Game config | [`5orhWwHuxps7KWzsbCrNKdo9dYFMjvc9WkzcH6dKjQxk`](https://explorer.solana.com/address/5orhWwHuxps7KWzsbCrNKdo9dYFMjvc9WkzcH6dKjQxk?cluster=devnet) |
| TEE validator | `MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo` (`devnet-tee.magicblock.app`) |

`/proof` in the app reads these live: price updates, managers, squads, settled results and today's gameweek.

---

## Deploy (Cloudflare dashboard, no local machine needed)

**1. Web app.** Workers & Pages → Create → Import a repository → this repo.
Branch `main`, build command `npm run build`, deploy command `npx wrangler deploy`, variable `NODE_VERSION=22`, project name `bull-xi` (must match `wrangler.jsonc`).

**2. Game Worker.** Workers & Pages → Create → Import a repository → this repo again.
Project name **`bullxi-game`** (must match `worker/wrangler.jsonc`), build command empty, deploy command `npx wrangler deploy --config worker/wrangler.jsonc`, variable `NODE_VERSION=22`.

**3. Its key.** Open `bullxi-game` → Settings → Variables and Secrets → Add → type **Secret**, name `PUSHER_KEY`, value = the `[12,34,...]` line of the pusher key. Save, then Deployments → Retry deployment.

**4. Check.** `https://bullxi-game.timioni1490.workers.dev/health` shows `"ok": true` within two minutes. The app expects the Worker at that URL (`GAME_API` in `lib/config.ts`).

From a terminal instead: `npx wrangler login`, `npm run deploy:web`, `npx wrangler secret put PUSHER_KEY --config worker/wrangler.jsonc`, `npm run deploy:worker`.

### Keys (devnet only)

| Key | Role |
|---|---|
| `deployer` `6hxtk7…Y3uT` | Program upgrade authority, admin of the price book and config |
| `pusher` `NdtGUb…BgrWy` | The Worker's key: price pusher, crank, fee sponsor (`PUSHER_KEY`) |
| `program` | Program address keypair |

Keys never go in the repo. Scripts read them from `~/.config/solana/bullxi/` (or `BULLXI_KEYS_DIR`).

---

## Run locally

```bash
npm install
npm run dev              # http://localhost:3000
npm run check            # lint + typecheck + tests + static build
```

| Switch | Effect |
|---|---|
| `?demo=1` | Simulated market, 10x faster, plus "start now" and "blow the whistle" buttons |
| `?mock=sim` | Simulated market at normal speed |
| `?mock=slow` / `error` / `empty` | Loading, error and empty states |
| `NEXT_PUBLIC_PRIVY_APP_ID=off` | Build without sign-in |

## Onchain scripts

```bash
npm run onchain:test           # Rust tests: price book maths and every game rule
npm run onchain:build          # cargo build-sbf --arch v0
npm run onchain:gen            # regenerate the stock table (universe.rs) from the app's list
npm run onchain:client         # regenerate the typed @solana/kit client from the IDL (Codama)
npm run onchain:schedule -- 8  # create the next 8 daily gameweeks
npm run onchain:crank          # what the Worker cron does, locally (add -- --loop)
npm run onchain:read           # price book on the TEE and on Solana
npx tsx scripts/onchain/e2e.ts         # 5-minute gameweek end to end: seal, privacy, reveal, TWAP, settle, commit
npx tsx scripts/onchain/live-check.ts  # app live score vs onchain settled score
```

## Repo map

```
app/, components/        Next.js app (static export)
lib/data/                the only data API the UI uses (live prices, onchain play, simulated mode)
lib/onchain/             @solana/kit clients: generated program client, game, crank, relay checks, TEE login
lib/game/rules.ts        game rules (TypeScript), unit tested
lib/auth/                sign-in context; Privy behind it
worker/                  game Worker: cron + /relay + /health + /price-book
onchain/programs/bullxi  Anchor program; src/game.rs mirrors rules.ts
scripts/onchain/         deploy, schedule, crank, e2e and inspection scripts
docs/                    diagrams (docs/diagrams, rendered to docs/images), stock list
```

## MagicBlock map

| Need | Tech | Status |
|---|---|---|
| Squads hidden until kickoff | Private ER (TEE) + members-only permission | Live |
| Prices and TWAP for scoring | Price book on the Private ER | Live |
| Golden stock draw | VRF (scoped identity, ephemeral queue) | Live |
| TWAP snapshots on a timer | MagicBlock cranks (ScheduleTask) | Live |
| Reveal, settlement | Permissionless instructions, Worker crank | Live |
| Results on Solana | Commit from the rollup | Live |
| No gas, no pop-ups | Sponsored relay + Privy | Live (session keys planned) |
| Prize payouts | Magic Actions | Planned |
| Entry fees and prize pool | Ephemeral SPL Token | Planned |
| Season badges | SOAR | Planned |

Why our own price book: MagicBlock's pricing oracle only accepts its own signer, and its feed list has no stocks.

## Known limits

- Devnet only. Mainnet is a one-line change in `lib/config.ts` (`NETWORK`), plus real funding.
- Gameweeks are created ahead from a script (the Worker can't write to Solana's public devnet RPC). Daily through Dec 2, hourly flash for three days at a time.
- With a plain payer the rollup allows 10 commits per delegated account, so each manager can settle 10 gameweeks before re-delegation.
- The relay sees a squad when it forwards the seal (like the crank). Other players cannot.
- Mini-league tables for private leagues are still local; the onchain table is everyone in the gameweek.
