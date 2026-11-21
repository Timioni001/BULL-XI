# BULL-XI: Product Brief

> Fantasy Premier League for onchain stocks. Pick a squad of tokenized stocks, wear the captain's armband and compete in live leagues 24/7 on Solana.

Built for MagicBlock Solana Blitz v10 (theme: Entertainment Finance). Deadline: Nov 27 2026.

**Current phase: UX FIRST.** Build a polished, clickable, mobile-first prototype on mock data. No blockchain code yet. Every data call goes through a typed data layer so MagicBlock and Solana can be swapped in later without touching UI code.

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
5. **Thumb-first mobile.** Designed at 390x844. Primary actions sit in the bottom third. Desktop is a centered phone-width column for now.
6. **Instant feedback.** Every tap responds within 100ms with motion or state change.
7. **Empty, loading and error states** designed for every screen.

## 5. Screens (Phase 1)

1. **Landing / Onboarding**: 3 swipe cards (Pick stocks, Wear the armband, Win leagues), then "Build your squad". Free mode needs no signup.
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

## 7. Tech stack (Phase 1)

- Next.js (App Router) + TypeScript (strict)
- Tailwind CSS + shadcn/ui primitives
- Framer Motion for animation
- Zustand for client state (squad, picks, chips)
- Recharts or lightweight-charts for stock charts
- PWA-ready (installable on phones)
- **Mock data layer:** `lib/data/` exposes typed async functions (`getStocks()`, `getLivePrices()`, `getLeague()`, `lockSquad()` etc.). Phase 1 returns mock data with a simulated live price feed (random walk every second). Phase 2 swaps implementations for MagicBlock without UI changes

### Mock data to create
- ~40 xStocks across 4 positions and ~8 sectors, each with ticker, name, sector, position, credits, price, 24h change, ownership %
- 3 mini-leagues with 8 to 20 fake managers each
- 5 past gameweeks of history

## 8. Phase 2 (not now): MagicBlock integration map

Reference only. Do not build until the UX is approved.

| UX moment | MagicBlock tech |
|---|---|
| Squad hidden until deadline | Private Ephemeral Rollup |
| Live points and ranks every second | Ephemeral Rollup + Price Oracle (Pyth Lazer) |
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
