# Submission copy (Solana Blitz v10)

Paste into `build.magicblock.app/?stage=blitz#submit`. Post the X video first, then use its link for Pitch & Demo.

## Form fields

**Project name**

```
BULL-XI
```

**Description**

```
BULL-XI is a real-time stock-picking competition built on Solana and MagicBlock. Participants assemble a portfolio of 15 tokenized equities (xStocks such as NVDAx, TSLAx and SPYx) within a fixed budget, designate one holding to count double, and commit their selection before each round opens. Rounds run hourly and daily, and results are calculated from live market prices.

The app uses familiar fantasy-sports language (squad, captain, gameweek) to make equity markets approachable for a mainstream audience.

MagicBlock integration (all live on devnet):
- Private Ephemeral Rollup (TEE): submitted portfolios remain confidential until the round opens, preventing copy-trading. Pro portfolios and league prize pools are held under the same members-only access.
- Onchain price book: 41 prices are written to the rollup every minute. Scoring uses time-weighted average prices, which limits the impact of any single trade.
- Cranks: each round advances from open to settlement on a schedule executed by the rollup itself.
- VRF: a verifiably random bonus asset is selected at the start of each round.
- Commit: final results and season standings are committed to Solana for independent verification.

Pro preview: each selection becomes an investment. Test funds are allocated equally across the 15 holdings at the onchain price, held privately, and can be sold at any time. Private leagues collect entry fees into an onchain prize pool that is paid to the winner automatically at settlement. An explainer sets out the reasoning behind every automated selection, using current price data and no forecasts.

Onboarding: users sign in with Google or email. An account is provisioned automatically and network fees are sponsored, so no wallet software or SOL is required. All game rules and scoring are enforced by the onchain program.

Status: devnet preview using test funds priced from real market data. Next milestone: real-money Pro, with USDC deposits purchasing real xStocks.
```

**Categories:** Games, DeFi, Privacy

**Project website**

```
https://bull-xi.timioni1490.workers.dev
```

**GitHub Project Repo** (set it to Public)

```
https://github.com/Timioni001/BULL-XI
```

**Pitch & Demo:** the link to the X post with the film.

**Explorer link (integration proof)**

```
https://explorer.solana.com/address/EZi2Raxa2hba9Bt5jYKf6nUkbQ4xgZeHbuBxjVJTCPXN?cluster=devnet
```

**On-chain addresses**

| Address | What it is |
|---|---|
| `EZi2Raxa2hba9Bt5jYKf6nUkbQ4xgZeHbuBxjVJTCPXN` | bullxi program |
| `3QmqpfrpbsTU6J4t8vjhFHr8BZo5yczp6C8zZFnRE7pK` | Price book (on the TEE) |
| `5orhWwHuxps7KWzsbCrNKdo9dYFMjvc9WkzcH6dKjQxk` | Game config |
| `NdtGUbfoM3dWsEczQNDLTzii9SfVPPv49zmPdJBgrWy` | Fee sponsor and crank |

**Extra proof links** (for the description or any notes field)

- League pot paid to the winner inside the rollup: https://explorer.solana.com/tx/2pmbK77LDXemXZd6JsyfcujNDHpmHbUjxNZspzvU5L48ijVfYa6H6gCRwQRxyL83SrHCNTtLZKbKJmxXp7DYm8y5?cluster=custom&customUrl=https%3A%2F%2Fdevnet-tee.magicblock.app
- Picks sealed in the TEE: https://explorer.solana.com/tx/4UjTYPPF5V81LhVd55pvsuayLvub7SS6mEGYYXCghznh1AHznz6GauMdNrtkvNj65uCsJ2EGofQVm4qThpJgtWhX?cluster=custom&customUrl=https%3A%2F%2Fdevnet-tee.magicblock.app
- Bonus stock drawn by VRF: https://explorer.solana.com/tx/4xMXxc1B4cjFpR9BZ2LoEzuemkT96gGeK7fG3GeGy4oD26zgoy2nuBcHQydmM3sZ9YfEtnEFVxkZMALSgTtXCteA?cluster=custom&customUrl=https%3A%2F%2Fdevnet-tee.magicblock.app
- Live numbers: https://bull-xi.timioni1490.workers.dev/proof
- Every signature from two full devnet runs: `docs/devnet-runs/`

## X post (the demo)

Attach `docs/media/bullxi-film.mp4`.

### Option A: one long post (needs X Premium)

```
Introducing BULL-XI: a real-time stock-picking competition on Solana, built on @magicblock for Solana Blitz.

Participants build a portfolio of 15 tokenized equities, designate one holding to count double, and commit before each round opens. Rounds run every hour, scored from live market prices.

MagicBlock integration
• Private Ephemeral Rollup: portfolios stay confidential until the round opens, preventing copy-trading
• Onchain price book: 41 prices written every minute; scoring uses time-weighted averages
• Cranks: every round advances to settlement on the rollup's own schedule
• VRF: a verifiably random bonus asset is drawn each round
• Commit: final results are written to Solana for independent verification

Pro preview
• Selections become investments, allocated equally at the onchain price and held privately
• Private leagues pool entry fees onchain and pay the winner automatically at settlement
• Every automated pick comes with a data-based rationale, no forecasts

Google or email sign-in. Network fees are sponsored, so no wallet software or SOL is required.

Live on devnet with test funds priced from real market data.

App: https://bull-xi.timioni1490.workers.dev
Live proof: https://bull-xi.timioni1490.workers.dev/proof
Code: https://github.com/Timioni001/BULL-XI
```

### Option B: thread (any account, each post under 280 characters)

1/ (attach the video)
```
Introducing BULL-XI: a real-time stock-picking competition on Solana, built on @magicblock for Solana Blitz.

Build a 15-stock portfolio, commit before the round opens, and compete on live market prices. New rounds every hour.

https://bull-xi.timioni1490.workers.dev
```

2/
```
Confidentiality: portfolios are sealed in MagicBlock's Private Ephemeral Rollup until the round opens, preventing copy-trading.

Fairness: a verifiably random bonus asset is drawn by VRF at the start of every round.
```

3/
```
Scoring integrity: 41 prices are written to an onchain price book every minute, and results use time-weighted averages.

Automation: MagicBlock cranks advance each round to settlement, and final results are committed to Solana.
```

4/
```
Pro preview: selections become investments, allocated equally at the onchain price and held privately.

Private leagues pool entry fees onchain and pay the winner automatically at settlement.
```

5/
```
Every automated pick comes with a rationale: the company's business, its role in the portfolio, and its price moves today and this week. No forecasts.

Sign-in is Google or email. Fees are sponsored, so no wallet software or SOL is needed.
```

6/
```
Live on devnet with test funds priced from real market data.

Live proof: https://bull-xi.timioni1490.workers.dev/proof
Code: https://github.com/Timioni001/BULL-XI
```

## Before submitting

1. Make the GitHub repo Public.
2. Open the app and `/proof` once so the numbers are fresh.
3. Post on X, copy the post link into Pitch & Demo.
4. Submit before Fri Nov 27, 14:00 UTC.
