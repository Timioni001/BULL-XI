# BULL-XI

**Fantasy football for onchain stocks.** Pick 15 tokenized stocks, wear the captain's armband and win your league, 24/7. Built for MagicBlock Solana Blitz v10 (Entertainment Finance).

> Status: step 4 of the build plan. A complete, polished product on simulated market data. Live Solana prices (step 5) and the onchain game (step 6) come next. See [CLAUDE.md](CLAUDE.md) for the brief and [docs/PLAN.md](docs/PLAN.md) for structure.

## Run it

```bash
npm install
npm run dev            # http://localhost:3000
npm run check          # lint + typecheck + tests + production build
```

On your phone: `npm run dev -- -H 0.0.0.0`, then open `http://<your-computer-ip>:3000`.

## Tour

| URL | What |
|---|---|
| `/` | Landing page with a live mini-pitch |
| `/app` | Onboarding, then the game |
| `/app/squad` → `/app/pick` → `/app/lock` → `/app/live` | Build, pick, lock, watch live |
| `/app/leagues`, `/app/leagues/office` | Leagues, tables, head-to-head |
| `/join/TRD-9X4` | Invite link landing (try it) |
| `/app/transfers`, `/app/chips`, `/app/history`, `/app/profile`, `/app/pro` | The rest of the game |
| `/proof` | For judges: where each piece runs, counters, explorer links |
| `/api/card?gw=13&pts=73&rank=1&of=12&league=Office%20Legends&team=Your%20XI&best=NVDAx:34&cap=COINx:46` | 1080x1350 share card |

## Demo mode (for recording)

Add `?demo=1` to any URL (or toggle it in Profile). Demo mode:
- runs the simulated market 10x faster so points move on camera,
- shows **Demo: start now** on the deadline screen (skip the countdown),
- shows **Demo: blow the whistle** on the live screen (jump to the result and share card).

`?demo=0` turns it off. Without demo mode, gameweeks start and end on their real schedule.

## Review switches

| Param | Effect |
|---|---|
| `?mock=slow` | 2.5s latency on every data call (loading states) |
| `?mock=error` | every data call fails (error states) |
| `?mock=empty` | empty leagues and history |
| `?mock=off` | back to normal |
| `/app?intro` | replay onboarding |

Profile → **Reset demo** clears your saved squad and leagues.

## Architecture

```
UI (app/, components/)  ──►  lib/data/index.ts  ──►  Phase 1: lib/data/mock/*  (seeded, simulated 24/7 market)
        │                                         └►  Phase 2: MagicBlock ER + Pyth Lazer oracle, Solana program
        └──►  lib/game/rules.ts   pure rules: squads, scoring, captain, chips, transfers (unit tested)
        └──►  lib/store/game.ts   Zustand, persisted locally
        └──►  lib/copy.ts         every user-facing string
```

## MagicBlock map (planned)

| UX moment | MagicBlock tech |
|---|---|
| Squad hidden until kickoff | Private Ephemeral Rollup |
| Live points every second | Ephemeral Rollup + Pyth Lazer oracle |
| Deadline lock and settlement | Cranks |
| Final standings | Commit / Undelegate |
| Prize payouts | Magic Actions |
| Entry fees and prize pool | Ephemeral SPL Token |
| No pop-ups for captain and transfers | Session Keys |
| Head-to-head draws | VRF |
| Season rank and badges | SOAR |

Program addresses: BULL-XI game program deploys in step 6. Real-time pricing oracle: `PriCems5tHihc6UDXDjzjeawomAwBduWMGAi8ZUjppd`.

## Stack

Next.js 16 (App Router, strict TS), Tailwind v4, shadcn/ui, Motion, Zustand, NumberFlow, vaul, sonner, cmdk, dnd-kit, TradingView Lightweight Charts, canvas-confetti, `next/og`.
