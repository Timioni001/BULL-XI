# BULL-XI: Product Brief

> Fantasy Premier League for onchain stocks. Pick a squad of tokenized stocks, wear the captain's armband and compete in live leagues 24/7 on Solana.

Built for MagicBlock Solana Blitz v10 (theme: Entertainment Finance). Deadline: Nov 27 2026.

**Current phase: PHASE 2 on devnet, $0 budget.** Phase 1 (the UX prototype) is done. Phase 2 makes it real on Solana devnet and MagicBlock devnet (ER and TEE), checkpoint by checkpoint. Every data call still goes through the typed data layer in `lib/data/`.

### Phase 2 hard rules
- **Budget $0.** No paid services, APIs or domains. If something would cost money, stop and ask first
- **Network lives in one value:** `NETWORK` in `lib/config.ts`. Mainnet is a one-line change, only if MagicBlock sponsors it
- **Every claim on the landing page and /proof must be true on devnet**, with devnet explorer links. Test tokens are labelled "Devnet preview with test tokens priced from real market data."
- **Hosting is Cloudflare only.** Next.js static export (`output: "export"`) served by Workers Static Assets (`wrangler.jsonc`, free workers.dev). No SSR adapter, no server routes, no server actions. Dynamic pages use query params. Do not set `run_worker_first`
- **One small Worker** (`worker/`, `bullxi-game`) runs the cron every minute (prices, snapshots, reveals, settlement) and tiny APIs, including `/relay`, which sponsors fees for an allowlist of game instructions. Secrets via `wrangler secret put`. Solana's public devnet RPC blocks Cloudflare, so the Worker never writes to Solana directly
- **Prices:** the browser polls the free Jupiter Price API (xStocks reference price) every 3s (the free API rate-limits 1/s for the full batch and the reference price updates about once a minute; pauses when the tab is hidden, backs off on rate limits). The Worker writes the same prices to our price book on the Ephemeral Rollup every minute, which builds the onchain TWAP

---

## 1. Product in one paragraph

Managers build a 15-stock squad of tokenized stocks (xStocks such as NVDAx, TSLAx, AAPLx, SPYx) within a 100-credit budget. They pick a starting XI and a captain (2x points), make transfers and play chips each gameweek. Points come from real onchain price moves. Tokenized stocks trade 24/7, so there is always a live gameweek. Free leagues use virtual squads. Pro leagues use real xStocks the manager owns and keeps; only a small league fee goes into the prize pool.

## 2. Who it is for

1. **FPL fans** who know captains, chips and mini-leagues but have never touched stocks or crypto. They must understand the app in 10 seconds with zero crypto jargon.
2. **Crypto traders** who want a social, competitive way to play tokenized stocks.

Design for group 1. If an FPL fan gets confused, the UX has failed.

## 3. Game rules (source of truth)

### Squad
- 15 stocks: 2 ETF, 5 Blue Chip, 5 Growth, 3 High Risk
- Budget: 100.0 credits. Each stock has a credit price (e.g. NVDAx 12.5, SPYx 6.0)
- Max 3 stocks from the same sector (like FPL's max 3 per club)

### Positions (football mapping)
| Football | BULL-XI | Starting XI rule |
|---|---|---|
| Goalkeeper | ETF | exactly 1 |
| Defender | Blue Chip | 3 to 5 |
| Midfielder | Growth | 2 to 5 |
| Forward | High Risk | 1 to 3 |

Starting XI = 11 stocks. Bench = 4 (ordered, auto-sub only if a stock is halted).

### Scoring per gameweek
- Base points = % price change over the gameweek x 10, rounded (+1.8% = 18 pts, -2.0% = -20 pts)
- Uses time-weighted average price (TWAP), not a single trade
- Per-stock cap: +50 / -50 points
- Captain: 2x. Vice-captain takes over only if the captain is halted
- Bonus: +3 if a stock beats SPYx that gameweek. +2 for the top gainer in your mini-league

### Transfers
- 1 free transfer per gameweek, can bank up to 2
- Each extra transfer costs -4 points

### Chips (each once per season)
| Chip | Effect |
|---|---|
| Wildcard | Unlimited free transfers this gameweek |
| Free Hit | One-gameweek squad, reverts after |
| Triple Captain | Captain scores 3x |
| Bench Boost | Bench points count |
| Hedge | Pick one stock; its negative points become 0 |

### Gameweeks
- **Daily Gameweek:** 24h, runs every day (markets are onchain and 24/7)
- **Flash Gameweek:** 1h, for quick action
- Deadline: squads lock and are hidden until the gameweek starts

### Modes
- **Free:** virtual squad, global and private leagues
- **Pro:** entry fee in USDC. Squad is bought as real xStocks into the manager's vault. Manager keeps the stocks. Prize pool = league fees minus a platform cut

## 4. UX priorities (in order)

1. **FPL familiarity.** The squad builder must look and feel like FPL's pitch view: four rows on a pitch, a bench strip below, a captain armband icon.
2. **Squad built in under 60 seconds.** Offer "Auto-pick" that builds a valid squad instantly, then let users tweak it.
3. **The live gameweek is the hero screen.** Points tick up and down live, ranks move, and green and red flashes show price moves. It should feel like watching a match.
4. **No crypto words on core screens.** Say "stocks", "credits", "entry fee", "prize". Never "wallet", "SPL", "rollup" or "sign transaction" until the Pro payment step.
5. **Thumb-first mobile.** Designed at 390x844. Primary actions sit in the bottom third. Tablets use the full width (up to 720px); desktop adds a side nav and two-column layouts. Everything must fit from 320px phones to 1920px monitors.
6. **Instant feedback.** Every tap responds within 100ms with motion or state change.
7. **Empty, loading and error states** designed for every screen.

## 5. Screens (Phase 1)

1. **Landing / Onboarding**: 3 swipe cards (Pick stocks, Wear the armband, Win leagues), then "Build your squad". Players sign in (Google or email) before entering the app.
2. **Squad Builder**: pitch view, budget bar (credits left), position slots, Auto-pick, validation hints ("Need 1 more Growth").
3. **Stock Picker** (bottom sheet): search, filter by position and sector, sort by credits / form / ownership %. Each row: ticker, name, credits, 24h move, selected-by %.
4. **Stock Detail** (sheet): price chart (1D/1W), credits, ownership %, recent gameweek points.
5. **Pick Team**: choose starting XI, captain (C), vice (V) and bench order. Drag or tap-to-swap.
6. **Deadline / Confirm**: countdown, squad summary, "Lock squad" button. Locked state shows a seal or lock animation (later: hidden in a Private Ephemeral Rollup).
7. **Live Gameweek** (hero): total points ticking, each stock's live points on the pitch, captain highlighted, league rank with up/down arrow, chip in use.
8. **Leagues**: My leagues list, mini-league table (rank, manager, GW pts, total), create / join with code, head-to-head fixtures.
9. **Transfers**: out and in flow, cost preview (-4), budget check.
10. **Chips**: 5 chip cards, active / used states, confirm modal.
11. **Gameweek History**: past gameweeks, points, rank, best captain.
12. **Profile**: manager name, team name, season rank, badges (later via SOAR).
13. **Go Pro** (UI only, mocked): explains real stocks you keep, entry fee, prize pool. Connect-wallet button is a stub.

## 6. Brand and visual direction

- **Logo:** black bull horns over a triangle "T/R" mark. File at `public/logo.png`
- **Base palette:** monochrome. Background near-black `#0A0A0A` in dark mode, `#FAFAFA` in light. Text pure white or black
- **Market colours (the only colours):** Bull green `#16C784` for gains and Bear red `#EA3943` for losses. Use them only for price and points moves, so they always mean something
- **Accent:** gold `#F5C451` reserved for the captain armband and winners
- **Type:** a geometric sans for UI (Inter or Geist). Tabular numerals for every number so ticking points don't jitter
- **Feel:** premium sports broadcast meets trading terminal. Sharp, confident, fast. No cartoon or casino vibes
- **Motion:** quick (150 to 250ms), purposeful. Number tickers, rank arrows sliding, a subtle pitch glow on the live screen

## 7. Tech stack

- Next.js (App Router) + TypeScript (strict)
- Tailwind CSS + shadcn/ui primitives
- Framer Motion for animation
- Zustand for client state (squad, picks, chips)
- Recharts or lightweight-charts for stock charts
- PWA-ready (installable on phones)
- Hosting: Cloudflare Workers Static Assets (`npm run deploy:web`) plus the pusher Worker (`npm run deploy:worker`)
- Onchain: Anchor 1.x program in `onchain/` (`bullxi`), ephemeral-rollups-sdk 0.17.x with `access-control` (devnet ERs run validator v1), typed client generated with Codama into `lib/onchain/bullxi`, game rules mirrored in `game.rs`. Box large accounts (4 KB stack)
- Sign-in: Privy (Google, email, Solana wallets) behind `lib/auth`. Wallet words only on Go Pro
- **Data layer:** `lib/data/` exposes typed async functions (`getStocks()`, `getLivePrices()`, `getLeague()`, `lockSquad()` etc.). Phase 1 returns mock data with a simulated live price feed (random walk every second). Phase 2 swaps implementations for real prices and MagicBlock without UI changes. Demo mode and `?mock=sim` keep the simulated market

### Mock data to create
- ~40 xStocks across 4 positions and ~8 sectors, each with ticker, name, sector, position, credits, price, 24h change, ownership %
- 3 mini-leagues with 8 to 20 fake managers each
- 5 past gameweeks of history

## 8. Phase 2: MagicBlock integration map

Every piece must be load-bearing. Built so far: price book on the Private ER (checkpoint 1); sealed squads with members-only permissions, onchain scoring, settlement committed to Solana, public profiles (checkpoint 2); top gainer and auto-subs onchain, live table from revealed onchain squads, live /proof (checkpoint 3); VRF golden stock, MagicBlock cranks for snapshots, hourly flash gameweeks, device key as a sealing fallback (checkpoint 4); sign-in required before playing, responsive from phone to desktop (checkpoint 5). Everything runs on the devnet TEE so one transaction can read squads and prices.

| UX moment | MagicBlock tech |
|---|---|
| Squad hidden until deadline | Private Ephemeral Rollup |
| Live points and ranks every second | Ephemeral Rollup + our own price book (MagicBlock's oracle only accepts its own signer, and its public Pyth Lazer list has only crypto feeds) |
| Deadline lock and gameweek settlement | Cranks |
| Final standings onchain | Commit / Undelegate |
| Prize payout at settlement | Magic Actions |
| Entry fees and prize pool | Ephemeral SPL Token |
| Private Pro payouts with compliance | Private Payments API |
| No wallet popups for transfers or captain changes | Session Keys |
| Head-to-head draws and tiebreaks | VRF |
| Season rank and badges | SOAR |
| Routing transactions | Magic Router |

## 9. Rules for working on this repo

- UX quality is the priority. Polish beats feature count
- Mobile first. Check every screen at 390px wide
- Keep components small and reusable (`StockCard`, `PitchSlot`, `PointsTicker`, `CaptainBadge`, `RankDelta`)
- All game rules live in one pure module `lib/game/rules.ts` with unit tests
- Never hardcode data in components; always go through `lib/data/`
- Run lint, typecheck and build before saying a task is done
- No em dashes in UI copy. Short, plain sentences
