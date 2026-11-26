# Submission copy (Solana Blitz v10)

Paste into `build.magicblock.app/?stage=blitz#submit`. Post the X video first, then use its link for Pitch & Demo.

## Form fields

**Project name**

```
BULL-XI
```

**Description**

```
BULL-XI is a live stock-picking competition on Solana. You build a portfolio of 15 tokenized stocks (xStocks such as NVDAx, TSLAx and SPYx) within a fixed budget, pick one stock to count double, and lock it in before the round starts. A new round starts every hour, plus a daily one, and every point comes from real price moves.

How it uses MagicBlock (every piece does real work, all live on devnet):
- Private Ephemeral Rollup (TEE): locked picks stay sealed until the round starts, so no one can copy them. Pro portfolios and league prize pots also live here, readable only by their owners.
- Price book on the rollup: 41 live prices written every minute. Scores use time-weighted prices, so one odd trade can't move the result.
- MagicBlock cranks: the rollup moves each round from start to finish on a timer, with no server involved.
- VRF: a bonus stock is drawn at the start of each round and scores double for everyone who holds it.
- Commit: every final score and season record is written back to Solana, where anyone can check it.

Pro preview turns your picks into investments: test dollars split equally across your 15 stocks at the onchain price, private to you, and you can sell any time. Friends leagues hold entry fees in an onchain pot that is paid to the winner automatically.

Accounts and fees: sign in with Google or email. An account is created for you and the game covers network fees, so there is no wallet app to install and no gas to buy. Rules and scoring are enforced in the program, not just the app.

Devnet preview with test dollars priced from real market data. Next step: real-money Pro, with USDC deposits buying real xStocks.
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
BULL-XI: a live stock-picking competition on Solana, built for @magicblock Solana Blitz.

How it works
• Pick 15 tokenized stocks (NVDAx, TSLAx, SPYx and more) within a fixed budget
• Choose one stock to count double, then lock your picks before the round starts
• A new round every hour. Points come from real price moves, measured with time-weighted prices so one odd trade can't swing a score
• Not sure what to pick? Auto-pick explains every choice with real data from today and this week

What MagicBlock does
• Private Ephemeral Rollup: your picks stay sealed until the round starts, so no one can copy them
• Price book on the rollup: 41 live prices written every minute
• Cranks: each round runs from start to finish on its own timer
• VRF: a bonus stock is drawn every round and scores double
• Commit: every final score is written to Solana for anyone to verify

Pro preview
• Your picks become your investments: test dollars split equally across your 15 stocks at the onchain price
• Your portfolio is private to you. Sell any time
• Friends leagues hold entry fees in an onchain pot, paid to the winner automatically

Sign in with Google or email. The game covers network fees, so there's no wallet app to install and no gas to buy.

Live on devnet with test dollars priced from real market data.

Try it: https://bull-xi.timioni1490.workers.dev
Proof: https://bull-xi.timioni1490.workers.dev/proof
Code: https://github.com/Timioni001/BULL-XI
```

### Option B: thread (works on any account, each post under 280 characters)

1/ (attach the video)
```
BULL-XI: a live stock-picking competition on Solana.

Pick 15 real stocks, choose one to count double, lock in. A new round every hour, scored from real price moves.

Built on @magicblock for Solana Blitz 🧵
https://bull-xi.timioni1490.workers.dev
```

2/
```
Your picks stay sealed in MagicBlock's Private Ephemeral Rollup until the round starts. No one can copy them.

At the start, VRF draws a bonus stock that scores double for everyone holding it.
```

3/
```
Scores use time-weighted prices from a price book on the rollup, updated every minute, so one odd trade can't swing a result.

MagicBlock cranks run every round on a timer. Final scores are committed to Solana.
```

4/
```
Not sure what to pick? Auto-pick explains every choice: what the company does, its role in your portfolio, and its real moves today and this week.

No forecasts. Just the reasoning.
```

5/
```
Pro preview: your picks become your investments.

Test dollars split across your 15 stocks at the onchain price, private to you, sell any time. Friends leagues hold entry fees in an onchain pot that pays the winner automatically.
```

6/
```
Sign in with Google or email. The game covers network fees: no wallet app, no gas.

Devnet preview with test dollars priced from real market data.

Proof: https://bull-xi.timioni1490.workers.dev/proof
Code: https://github.com/Timioni001/BULL-XI
```

## Before submitting

1. Make the GitHub repo Public.
2. Open the app and `/proof` once so the numbers are fresh.
3. Post on X, copy the post link into Pitch & Demo.
4. Submit before Fri Nov 27, 14:00 UTC.
