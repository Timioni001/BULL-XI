# BULL-XI Phase 1 plan

Short version of the build plan. CLAUDE.md stays the source of truth.

## Folder structure

```
app/                     Routes (App Router). Thin: compose feature components.
  page.tsx               Onboarding (3 swipe cards)
  squad/                 Squad Builder (pitch + Auto-pick + Stock Picker sheet)
  pick/                  Pick Team (XI, captain, vice, bench order)
  lock/                  Deadline / Lock
  live/                  Live Gameweek (hero)
  manifest.ts            PWA manifest
components/
  ui/                    shadcn primitives (button, drawer, input, skeleton)
  brand/                 Logo
  layout/                AppShell, TopBar, BottomBar, TabBar
  pitch/                 Pitch, PitchSlot, BenchStrip
  stock/                 StockAvatar, StockRow, StockPicker, StockDetailSheet, PriceChart
  game/                  CaptainBadge, BudgetBar, SquadHints, Countdown, PositionLegend
  live/                  PointsTicker, RankDelta, LiveSlot, EventFeed, MiniTable
  states/                EmptyState, ErrorState, skeletons
lib/
  data/                  Typed async data layer. The only thing UI talks to.
    types.ts             Shared domain types
    index.ts             Public API: getStocks, subscribeLivePrices, getLeagues, lockSquad ...
    mock/                Phase 1 implementations (seeded mock data, random-walk feed, live engine)
  game/
    rules.ts             All game rules, pure, unit tested
    autopick.ts          Valid-squad generator, pure, unit tested
  store/                 Zustand stores (squad, lineup, lock state), persisted locally
  hooks/                 useLivePrices, useLiveGameweek, useCountdown, useHydrated
  format.ts, motion.ts   Number formatting, motion tokens
```

Phase 2 swaps `lib/data/mock/*` for MagicBlock implementations behind the same `lib/data/index.ts` signatures.

## Design tokens

| Token | Dark (default) | Light |
|---|---|---|
| background | #0A0A0A | #FAFAFA |
| surface-1 / 2 / 3 | #121212 / #1A1A1A / #242424 | #FFFFFF / #F2F2F2 / #E8E8E8 |
| foreground | #FFFFFF | #0A0A0A |
| muted text | #8C8C8C | #6B6B6B |
| hairline | white 8% | black 8% |
| bull | #16C784 (gains only) | same |
| bear | #EA3943 (losses only) | same |
| gold | #F5C451 (captain, winners only) | same |

- Pitch is monochrome (charcoal stripes, white lines) so green and red only ever mean money moving.
- Validation errors use neutral text with an icon, never red.
- Type: Geist Sans for UI, Geist Mono for tickers and clocks. Tabular numerals on everything.
- Scale: 11 label (caps, tracked) / 13 caption / 15 body / 17 title / 22 heading / 34 stat / 64 live total.
- Spacing: 4px grid, 16px side gutter, 12px card padding, safe-area aware bottom bar.
- Radius: 8 chips, 12 cards, 16 tiles, 24 sheets.
- Motion: fast 150ms (taps), base 200ms (state), slow 250ms (sheets, rank moves), ease-out `cubic-bezier(.2,.8,.2,1)`. Springs for number rollers. Price flash 600ms fade.

## Build order

1. Foundations: tokens, AppShell, data layer + price feed, rules + tests
2. Onboarding
3. Squad Builder + Auto-pick + Stock Picker sheet (+ Stock Detail sheet)
4. Pick Team
5. Deadline / Lock
6. Live Gameweek
7. Review stop. Then Leagues, Transfers, Chips, History, Profile, Go Pro

## Step 4 additions

- Brand accent: electric indigo `#6C5CFF` for primary buttons, active tabs, countdown and seal. Never for price moves.
- Sector rings (low saturation) on monogram tiles: tech, finance, energy, consumer, health, industrial, crypto, index.
- Display type: Space Grotesk. UI: Geist. Tickers and clocks: Geist Mono.
- Texture: diagonal pitch stripes, angled card cuts, faint noise, inner glows.
- Routes: landing at `/`, the game at `/app/*`, `/proof` for judges, `/join/[code]` for invites, `/api/card` share images.
- Desktop (1024px+): side nav, main column, sticky aside. Phones keep the floating pill tab bar.
- All copy lives in `lib/copy.ts`.

## Visual refresh (after step 4)

- App: charcoal surfaces (#161618 / #212124 / #2B2B2F), orange accent #FF5B1F with near-black text on orange (AA 7.6:1).
- Display: Archivo at 125% width, black weight, uppercase two-tone page titles (white over grey).
- Header on phones: avatar, search, notifications. Big rounded cards, icon chips, uppercase full-width CTA.
- Stock picker: "Choose a" poster cards in a snap carousel (StockArt), then the full list.
- Landing: light editorial theme (`.theme-light`), Instrument Serif headline, a CSS 3D corridor of cards, dark nav pill and a typing prompt pill.
- Green and red still only mean gains and losses. Gold still only means captain and winners.
