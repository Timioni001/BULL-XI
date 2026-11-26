/**
 * Pro preview (test dollars, portfolio = your squad) and friends leagues with
 * an onchain pot. Runtime-agnostic instruction builders and reads.
 */
import { address, createSolanaRpc, getBase58Decoder, type Address, type Instruction, type TransactionSigner } from "@solana/kit";
import {
  BULLXI_PROGRAM_ADDRESS,
  LEAGUE_DISCRIMINATOR,
  fetchMaybeLeague,
  fetchMaybePortfolio,
  findEntryPda,
  findGameweekPda,
  findLeaguePda,
  findPortfolioPda,
  getBuySquadInstructionAsync,
  getClaimTestDollarsInstructionAsync,
  getCreateLeagueInstructionAsync,
  getCreatePortfolioInstructionAsync,
  getDelegateLeagueInstructionAsync,
  getDelegatePortfolioInstructionAsync,
  getJoinLeagueInstruction,
  getLeagueDecoder,
  getSellAllInstructionAsync,
  getSettleLeagueInstruction,
  type League,
  type Portfolio,
} from "./bullxi";
import { TEE_VALIDATOR, stockIndex } from "./game";
import { withRemaining } from "./send";

export const MICRO = 1_000_000;
export const TEST_DOLLARS = 1_000;
export const LEAGUE_MAX = 8;

/* --------------------------------- Portfolio -------------------------------- */

/** Solana: create the portfolio and hand it to the private rollup (sponsor pays). */
export async function portfolioIxs(authority: TransactionSigner, payer: TransactionSigner): Promise<Instruction[]> {
  const [pda] = await findPortfolioPda({ authority: authority.address });
  return [
    await getCreatePortfolioInstructionAsync({ authority, payer }),
    withRemaining(await getDelegatePortfolioInstructionAsync({ authority, payer, pda }), TEE_VALIDATOR),
  ];
}

export const claimIx = (authority: TransactionSigner) => getClaimTestDollarsInstructionAsync({ authority });

/** Invests `dollars` equally across the 15 stocks of the squad. */
export const buySquadIx = (authority: TransactionSigner, squad: string[], dollars: number) =>
  getBuySquadInstructionAsync({ authority, squad: Uint8Array.from(squad.map(stockIndex)), amount: BigInt(Math.round(dollars * MICRO)) });

export const sellAllIx = (authority: TransactionSigner) => getSellAllInstructionAsync({ authority });

export async function readPortfolio(rpcUrl: string, authority: Address): Promise<Portfolio | null> {
  const [pda] = await findPortfolioPda({ authority });
  const p = await fetchMaybePortfolio(createSolanaRpc(rpcUrl), pda);
  return p.exists ? p.data : null;
}

/* ---------------------------------- Leagues --------------------------------- */

// Join codes: 6 characters of Crockford base32 (no I, L, O, U), 30 bits of league id.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export function leagueCode(id: number): string {
  let s = "";
  for (let i = 0; i < 6; i++) s = ALPHABET[(id >>> (i * 5)) & 31] + s;
  return s;
}
export function leagueIdFromCode(code: string): number | null {
  const c = code.trim().toUpperCase().replace(/O/g, "0").replace(/[IL]/g, "1");
  if (!/^[0-9A-Z]{6}$/.test(c)) return null;
  let id = 0;
  for (const ch of c) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) return null;
    id = id * 32 + v;
  }
  return id;
}
export const newLeagueId = () => 1 + Math.floor(Math.random() * (2 ** 30 - 2));

/** Solana: create a league for one gameweek and hand it to the rollup (sponsor pays). */
export async function createLeagueIxs(creator: TransactionSigner, payer: TransactionSigner, id: number, name: string, gameweek: number, feeDollars: number): Promise<Instruction[]> {
  const [pda] = await findLeaguePda({ id });
  return [
    await getCreateLeagueInstructionAsync({ creator, payer, id, name, gameweek, fee: BigInt(Math.round(feeDollars * MICRO)) }),
    withRemaining(await getDelegateLeagueInstructionAsync({ payer, id, pda }), TEE_VALIDATOR),
  ];
}

/** Rollup: join (paid leagues move the fee from the player's portfolio into the pot). */
export async function joinLeagueIx(member: TransactionSigner, league: League): Promise<Instruction> {
  const [pda] = await findLeaguePda({ id: league.id });
  const [gw] = await findGameweekPda({ id: league.gameweek });
  const portfolio = league.fee > BigInt(0) ? (await findPortfolioPda({ authority: member.address }))[0] : undefined;
  return getJoinLeagueInstruction({ league: pda, gameweek: gw, member, portfolio });
}

/** Rollup: pay the pot to the winner once every member's entry is scored. */
export async function settleLeagueIx(league: League): Promise<Instruction> {
  const [pda] = await findLeaguePda({ id: league.id });
  const [gw] = await findGameweekPda({ id: league.gameweek });
  const members = league.members.slice(0, league.count);
  const entries = await Promise.all(members.map(async (m) => (await findEntryPda({ gameweek: league.gameweek, authority: m }))[0]));
  const portfolios = league.fee > BigInt(0) ? await Promise.all(members.map(async (m) => (await findPortfolioPda({ authority: m }))[0])) : [];
  const ix = getSettleLeagueInstruction({ league: pda, gameweek: gw });
  return {
    ...ix,
    accounts: [
      ...(ix.accounts ?? []),
      ...entries.map((a) => ({ address: a, role: 0 as const })),
      ...portfolios.map((a) => ({ address: a, role: 1 as const })),
    ],
  };
}

export async function readLeague(rpcUrl: string, id: number): Promise<League | null> {
  const [pda] = await findLeaguePda({ id });
  const l = await fetchMaybeLeague(createSolanaRpc(rpcUrl), pda);
  return l.exists ? l.data : null;
}

/** Every league, optionally only for one gameweek (offset of `gameweek` in the account is 69). */
export async function listLeagues(rpcUrl: string, gameweek?: number): Promise<League[]> {
  const b58 = getBase58Decoder();
  const filters: { memcmp: { offset: bigint; bytes: never; encoding: "base58" } }[] = [{ memcmp: { offset: BigInt(0), bytes: b58.decode(LEAGUE_DISCRIMINATOR) as never, encoding: "base58" } }];
  if (gameweek !== undefined) {
    const gw = new Uint8Array(4);
    new DataView(gw.buffer).setUint32(0, gameweek, true);
    filters.push({ memcmp: { offset: BigInt(69), bytes: b58.decode(gw) as never, encoding: "base58" } });
  }
  const res = await createSolanaRpc(rpcUrl).getProgramAccounts(BULLXI_PROGRAM_ADDRESS, { encoding: "base64", filters }).send();
  const dec = getLeagueDecoder();
  return res.map((a) => dec.decode(Uint8Array.from(atob(a.account.data[0]), (c) => c.charCodeAt(0))));
}

export const NO_WINNER = address("11111111111111111111111111111111");
