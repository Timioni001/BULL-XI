# Submission copy (Solana Blitz v10)

Paste into `build.magicblock.app/?stage=blitz#submit`.

**Project name:** BULL-XI

**One-liner:** Fantasy football for tokenized stocks: pick 15 real stocks, seal your squad privately, and get scored onchain from time-weighted prices. Every hour.

**Category / theme:** Entertainment Finance

**Links**
- App: https://bullxi.timioni1490.workers.dev
- Proof page (live devnet numbers): https://bullxi.timioni1490.workers.dev/proof
- GitHub: https://github.com/Timioni001/BULL-XI
- Program (devnet): https://explorer.solana.com/address/EZi2Raxa2hba9Bt5jYKf6nUkbQ4xgZeHbuBxjVJTCPXN?cluster=devnet
- Demo video: `docs/media/bullxi-demo.mp4` in the repo
- End-to-end devnet run with every signature: `docs/devnet-runs/`

**Description (short)**

BULL-XI turns tokenized stocks (xStocks) into a fantasy league that runs every hour. You build a 15-stock squad within 100 credits, pick a captain and lock it before kickoff. Your squad is sealed inside MagicBlock's Private Ephemeral Rollup, so rivals can't copy it. At kickoff it is revealed, a golden stock is drawn with MagicBlock VRF, and points come from time-weighted average prices written onchain every minute. At full time the program scores every squad and commits the results to Solana. No wallet, no SOL and no pop-ups: guests play with a device key, fees are sponsored.

**How we use MagicBlock (all load-bearing)**

| MagicBlock | What it does in BULL-XI |
|---|---|
| Private Ephemeral Rollup (TEE) | Squads are sealed with a members-only permission until kickoff, then revealed. The whole game state lives here so one transaction can read squads, gameweek and prices |
| Ephemeral Rollup state | A price book of 41 stocks with running price x time sums, written every minute for free; any TWAP is two subtractions |
| VRF | At kickoff a golden stock (double points) is drawn among the stocks started that week. Callback is checked against our scoped VRF identity |
| Cranks (ScheduleTask) | The rollup itself ticks each gameweek through its TWAP snapshots on a timer |
| Commit | Every settled result and season record is committed to Solana |

**What's technically interesting**

- Game rules and scoring run onchain (squad quotas, budget, sector cap, formation, TWAP points, captain, chips, top gainer, auto-subs, golden stock), mirrored in TypeScript and checked for parity.
- TWAP over any window costs four snapshots per gameweek, thanks to running sums in the price book.
- A fee relay co-signs only an allowlist of game instructions, and the sponsor can only ever be the fee payer.
- The front end is a static site and the back end is one Cloudflare Worker, on free tiers. Total infrastructure cost: $0.

**Team:** Timioni001
