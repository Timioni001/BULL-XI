# End-to-end devnet run: Pro preview and friends leagues (Nov 26 2026)

Command: `npx tsx scripts/onchain/pro-e2e.ts`. Two brand-new players open Pro portfolios (sponsored), claim $1,000 test dollars each (the portfolio becomes private in MagicBlock's TEE), A invests $300 equally across a 15-stock squad at the onchain price book, A creates a $10 friends league and both join (pot $20 held in the league account), both seal squads, a 4-minute test gameweek runs to full time (MagicBlock crank), entries are revealed and scored, and `settle_league` pays the pot to the winner's portfolio.

```

08:14:17 player A FTUhgiHh2Wx9ZrbBTRkeK4NziBqNqZ2gsoDoT6dehsJT
08:14:17 player B DnmsNvwWxkdW2EN2vHBhpv7exat34exPjbpiSnWCcnsm
08:14:18 gameweek 905680857 created + delegated https://explorer.solana.com/tx/PU8XmaAmDiVooBmvNM94ApeTmmrw6voXYFc1AcGxZgZJqc8nkK5XMGWnmEooR6f8jEB4RngfUWjtRiQRVVytU6W?cluster=devnet
08:14:19 Alice portfolio created + delegated https://explorer.solana.com/tx/451Wutbx5gmfoPCFVReN17BTFdCxjKkzTR1xLxxKVWkGFPzULnfa8xzJo9YAyHMTMBUtLkMV6q6R19RGmKGASCKP?cluster=devnet
08:14:20 Alice manager + entry created + delegated https://explorer.solana.com/tx/2PG1oBqUHipr9vTewQi67pEyT1WkMP1YvYDy9atfou5DdAj8isGzx98cNUy1QroizXTDtcDQWFHW7sHSS4pm2rjL?cluster=devnet
08:14:21 Bola portfolio created + delegated https://explorer.solana.com/tx/3sJWdEpv9nWfHo7K7JAm8d7fuEBCWBTFFvr8L9XxrGCAFRXSZvNEQcco3cgRPMVVoY5R87HrMB66pWXXaip3Bdcy?cluster=devnet
08:14:22 Bola manager + entry created + delegated https://explorer.solana.com/tx/eQ5TSGqUt7pJ9nt13ggRYFpQ14q3HzRNfmGUHZc6Q6Fa2yMSEhE6CG3tTvA77vg5ZgS8w7JwmH8Ur9FnAPaSYKf?cluster=devnet
08:14:24 MagicBlock crank scheduled https://explorer.solana.com/tx/bntB3cWopfHknhXn2aDJrtxnqeF5iBbBGPRJ8hQeVpXKxKzWBzciQ3ABCUwfU9B72wSG2mTe5JrCUcqD18iXMMN?cluster=custom&customUrl=https%3A%2F%2Fdevnet-tee.magicblock.app
08:14:26 A claimed test dollars (portfolio now private) https://explorer.solana.com/tx/2YEPBMwfYAYFXMp8QG8FkwY3tZ6M9dgVX6EsJ3132NPSRzYeUfsDZWDFZwzH7b6Xu9Bx8LEDxazSDdrUJvkF7C5W?cluster=custom&customUrl=https%3A%2F%2Fdevnet-tee.magicblock.app
08:14:27 B claimed test dollars https://explorer.solana.com/tx/5nf3Nit28FZBKQfvTfM3aLHLF8EyiefBSXRqKUhnfKCYc6FYd7T9CL7cNvjozg7G4bf3BoJHpyrXeyXYQGGaoQgR?cluster=custom&customUrl=https%3A%2F%2Fdevnet-tee.magicblock.app
08:14:28 A invested $300 in their 15 stocks https://explorer.solana.com/tx/4e7v4WJ1RE3gfrXQodnKzxAKzTXkwCcmnu9DDfykK4PSffif9mwCEasBbsXHDUTqMsVmRUPzuJBeh2yW1TP6Jgi4?cluster=custom&customUrl=https%3A%2F%2Fdevnet-tee.magicblock.app
08:14:28 A portfolio: cash $700.00 | invested $300.00 | holdings vtix 0.0563, gldx 0.0612, msftx 0.0407, googlx 0.0727 ...
08:14:28 privacy: stranger sees A's portfolio? false
08:14:29 league 7T5NEW created + delegated ($10 entry) https://explorer.solana.com/tx/E1wziG17faVHiPBNR5C6VuvRoMXY4cpUQNC4d83KnFyTCC1ZPSB5Atjr8r7nMUe717QpSkS67HjqJnChWijD2aF?cluster=devnet
08:14:30 A joined, paid $10 from portfolio https://explorer.solana.com/tx/3RcxGcsroqHDcdcq9VJXhFzGBJeMLgcf8LYYnx852RoreGo3brk9XJakxKZGsaz96eW3nPdyB9zDjG2aaqqVs2uB?cluster=custom&customUrl=https%3A%2F%2Fdevnet-tee.magicblock.app
08:14:31 B joined, paid $10 from portfolio https://explorer.solana.com/tx/5cRcatPctsfUAH4wha6dX3QLnsx4P4c6tD8A99PyPBKjBfbRsPGznug9j9XPRuDXnEEuvR2Q8pxDNd4gvwWrhZcr?cluster=custom&customUrl=https%3A%2F%2Fdevnet-tee.magicblock.app
08:14:31 pot: $20.00
08:14:32 A sealed squad https://explorer.solana.com/tx/4V2TULDBo6oaRjrb8Yex4tx9cRuPV7TKwXjAuvnh5vHtufLWBCGkjUNDmZRzfvh9TMmH2t1us8Eq5qVT5JLFjtdZ?cluster=custom&customUrl=https%3A%2F%2Fdevnet-tee.magicblock.app
08:14:33 B sealed squad https://explorer.solana.com/tx/5z6AB6Pw4AFKugPkLukSfDE8VQwXG9o973qoaWGz1hkNLVbkYMY3eV9dcA7y4CGqMdfRS3o57Uu7hXokhDYUcSge?cluster=custom&customUrl=https%3A%2F%2Fdevnet-tee.magicblock.app
08:16:54 gameweek -> kickedOff
08:18:58 gameweek -> live
08:19:04 gameweek -> closing
08:20:57 gameweek -> final
08:21:00 points: A 0 | B 2
08:21:01 league settled: pot paid to the winner https://explorer.solana.com/tx/2pmbK77LDXemXZd6JsyfcujNDHpmHbUjxNZspzvU5L48ijVfYa6H6gCRwQRxyL83SrHCNTtLZKbKJmxXp7DYm8y5?cluster=custom&customUrl=https%3A%2F%2Fdevnet-tee.magicblock.app
08:21:02 winner B with 2 pts | paid $20.00
08:21:02 cash A $690.00 -> $690.00 | cash B $990.00 -> $1010.00
```
