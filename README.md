# BULL-XI

Fantasy football for tokenized stocks. Pick a 15-stock squad, wear the captain's armband and compete in live leagues 24/7.

**Phase 1: UX prototype on mock data.** No blockchain code yet. See [CLAUDE.md](CLAUDE.md) for the product brief and [docs/PLAN.md](docs/PLAN.md) for structure and design tokens.

## Run it

```bash
npm install
npm run dev            # http://localhost:3000
npm run check          # lint + typecheck + tests + build
```

Open it on your phone: run `npm run dev -- -H 0.0.0.0` and visit `http://<your-computer-ip>:3000`, or deploy the branch to Vercel.

## Hero flow

`/` Onboarding → `/squad` Squad Builder (Auto-pick, Stock Picker, Stock Detail) → `/pick` Pick Team → `/lock` Deadline / Lock → `/live` Live Gameweek.

## Review switches

Add to any URL to see other states. The setting sticks for the tab.

| Param | Effect |
|---|---|
| `?mock=slow` | 2.5s latency on every data call (loading states) |
| `?mock=error` | every data call fails (error states) |
| `?mock=empty` | empty leagues and history |
| `?mock=off` | back to normal |
| `/?intro` | replay onboarding |

Profile tab → **Reset demo** clears your saved squad.

## Architecture

- `lib/data/` is the only thing the UI calls. Phase 1 returns seeded mock data and a simulated 24/7 market. Phase 2 swaps the bodies for MagicBlock without touching UI code.
- `lib/game/rules.ts` holds every game rule as pure functions, with unit tests in `rules.test.ts`.
- `lib/store/game.ts` is the Zustand store (squad, lineup, lock), persisted to localStorage.
