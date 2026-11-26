# Solana Blitz v10: what judges look for, and our checklist

## The hackathon (researched Nov 24)

| | |
|---|---|
| Host | MagicBlock |
| Theme | **Entertainment Finance**: "apps where you trade, collect, compete and win assets you actually own, with game mechanics on top" |
| Dates | Kickoff livestream Fri Nov 20, 14:00 UTC. Submissions due **Fri Nov 27** (14:00 UTC per MagicBlock's post) |
| Prizes | 1st $500, 2nd $250, 3rd $150, Wizardio's Choice $100 (USDC) |
| Requirement | Integrate MagicBlock: Ephemeral Rollups, Private Ephemeral Rollups or VRF |
| Submit | `build.magicblock.app/?stage=blitz#submit`: GitHub, demo, proof of work (explorer link showing the ER integration). Register with Telegram, connect a wallet for prizes |
| Judging (from past Blitz guidance) | **Creativity**, **technical depth**, and **how clearly the project shows what only real-time Solana can do**. "No sticker on a fork": the MagicBlock integration must be real |

Sources: the v10 Luma page, MagicBlock's launch post, a DevRels review of the Blitz program, and public v10 entries on GitHub.

## What strong v10 entries do (competitor scan)

- **pnl-royale** (TEE + crank + VRF + session keys): live app, "play instantly" with a burner wallet and house bots, devnet run logs with every signature, a threat model, pass/fail verification tables, an explicit "not yet verified" list.
- **the-pit** (TEE + VRF + ER): 89-second demo video, screenshots, a live link, a plain-language glossary, a per-component verification table.

Takeaways: judges reward **(1) zero-friction try-it**, **(2) a short video**, **(3) verifiable devnet evidence**, **(4) several MagicBlock pieces that are actually load-bearing**, **(5) honesty about limits**.

## Checklist

### Integration depth (technical depth)
- [x] Private ER (TEE): squads sealed with a members-only permission, revealed at kickoff
- [x] Ephemeral Rollup state: price book, gameweeks, entries, managers all live on the TEE
- [x] Commit to Solana: every settled result and season record
- [x] Onchain rules and scoring (squad rules, TWAP, captain, chips, bonuses, auto-subs)
- [x] **VRF**: a random "Golden stock" drawn at kickoff doubles its points for everyone who started it
- [x] **MagicBlock cranks**: TWAP snapshots scheduled on the rollup itself (ScheduleTask), Worker as backup
- [x] Sponsored fees: players never need SOL

### Zero-friction try-it (creativity, UX)
- [x] Sign-in required (Google or email); every locked squad is sealed onchain with the player's account, device key as fallback
- [x] **Hourly flash gameweeks onchain**: a judge can lock, watch live and see settlement within about an hour
- [x] Demo mode for instant simulated playback
- [x] Public profiles and a live /proof page

### Evidence (proof of work)
- [x] /proof reads every number live from devnet
- [x] README: architecture diagrams, account and instruction tables, devnet addresses
- [x] "What's verified" table with devnet transaction links from an end-to-end run
- [x] Threat model and known limits
- [x] Demo video (recorded from the real app) and screenshots
- [x] Submission copy ready to paste (`docs/SUBMISSION.md`)

### Operations (yours)
- [ ] Deploy the game Worker (`bullxi-game`) and add the `PUSHER_KEY` secret (README, Deploy)
- [ ] Submit at `build.magicblock.app/?stage=blitz#submit` before Fri Nov 27, 14:00 UTC
- [ ] Post the demo video on X tagging @magicblock (optional, helps visibility)
