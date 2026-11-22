/**
 * Game client for the bullxi program: gameweek ids, player instructions,
 * account reads and the crank (snapshot, reveal, settle). Runtime-agnostic.
 */
import { address, createSolanaRpc, getBase58Decoder, type Address, type Instruction, type ReadonlyUint8Array, type TransactionSigner } from "@solana/kit";
import {
  BULLXI_PROGRAM_ADDRESS,
  ENTRY_DISCRIMINATOR,
  fetchMaybeEntry,
  fetchMaybeGameweek,
  fetchMaybeManager,
  findEntryPda,
  findGameweekPda,
  findManagerPda,
  getCreateEntryInstructionAsync,
  getCreateGameweekInstructionAsync,
  getCreateManagerInstructionAsync,
  getDelegateEntryInstructionAsync,
  getDelegateGameweekInstructionAsync,
  getDelegateManagerInstructionAsync,
  getEntryDecoder,
  getRevealEntryInstructionAsync,
  getSealEntryInstructionAsync,
  getSettleEntryInstruction,
  getSnapshotGameweekInstructionAsync,
  type Entry,
  type Gameweek as GameweekAccount,
  type Manager,
} from "./bullxi";
import { DELEGATION_PROGRAM_ID } from "./price-book";
import { PRICE_BOOK_STOCKS } from "./universe";
import { withRemaining } from "./send";

export const TEE_VALIDATOR = address("MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo");

export const GW_STATUS = { open: 0, kickedOff: 1, live: 2, closing: 3, final: 4 } as const;
export const ENTRY_STATUS = { created: 0, sealed: 1, revealed: 2, settled: 3 } as const;
export const CHIP_CODE = { none: 0, tripleCaptain: 1, benchBoost: 2, hedge: 3, wildcard: 4, freeHit: 5 } as const;

/* ------------------------------ Gameweek ids ----------------------------- */

const DAY = 86_400_000;
const HOUR = 3_600_000;
/** Daily gameweek id = UTC day of its deadline. Flash ids start at 100,000,000 + UTC hour. */
export function gameweekId(kind: "daily" | "flash", deadlineMs: number): number {
  return kind === "daily" ? Math.floor(deadlineMs / DAY) : 100_000_000 + Math.floor(deadlineMs / HOUR);
}

/* -------------------------------- Stocks -------------------------------- */

const INDEX = new Map(PRICE_BOOK_STOCKS.map(([t], i) => [t.toLowerCase(), i]));
export const stockIndex = (id: string) => {
  const i = INDEX.get(id);
  if (i === undefined) throw new Error(`Unknown stock ${id}`);
  return i;
};
export const stockId = (i: number) => PRICE_BOOK_STOCKS[i]?.[0].toLowerCase() ?? `#${i}`;

export interface SealInput {
  squad: string[];
  starters: string[];
  bench: string[];
  captainId: string;
  viceId: string;
  chip?: keyof typeof CHIP_CODE | null;
  hedgeId?: string | null;
  transferHit?: number;
}

/* ------------------------------ Instructions ----------------------------- */

/** Base layer: create a manager profile and hand it to the private rollup. */
export async function joinIxs(authority: TransactionSigner, payer: TransactionSigner, name: string, team: string): Promise<Instruction[]> {
  return [
    await getCreateManagerInstructionAsync({ authority, payer, name, team }),
    withRemaining(await getDelegateManagerInstructionAsync({ authority, payer, pda: (await findManagerPda({ authority: authority.address }))[0] }), TEE_VALIDATOR),
  ];
}

/** Base layer: create an empty entry for a gameweek and hand it to the private rollup. */
export async function entryIxs(authority: TransactionSigner, payer: TransactionSigner, gameweek: number): Promise<Instruction[]> {
  const [entry] = await findEntryPda({ gameweek, authority: authority.address });
  return [
    await getCreateEntryInstructionAsync({ authority, payer, gameweek }),
    withRemaining(await getDelegateEntryInstructionAsync({ authority, payer, gameweek, pda: entry }), TEE_VALIDATOR),
  ];
}

/** Private rollup: seal the squad. */
export async function sealIx(authority: TransactionSigner, gameweek: number, s: SealInput): Promise<Instruction> {
  const [entry] = await findEntryPda({ gameweek, authority: authority.address });
  const [gw] = await findGameweekPda({ id: gameweek });
  return getSealEntryInstructionAsync({
    entry,
    gameweek: gw,
    authority,
    squad: Uint8Array.from(s.squad.map(stockIndex)),
    starters: Uint8Array.from(s.starters.map(stockIndex)),
    bench: Uint8Array.from(s.bench.map(stockIndex)),
    captain: stockIndex(s.captainId),
    vice: stockIndex(s.viceId),
    chip: CHIP_CODE[s.chip ?? "none"],
    hedge: s.hedgeId ? stockIndex(s.hedgeId) : 0,
    transferHit: Math.min(255, s.transferHit ?? 0),
  });
}

/** Base layer (admin or crank): create a gameweek and delegate it to the private rollup. */
export async function createGameweekIxs(signer: TransactionSigner, id: number, kind: 0 | 1, deadlineMs: number, endMs: number): Promise<Instruction[]> {
  const [gw] = await findGameweekPda({ id });
  return [
    await getCreateGameweekInstructionAsync({ admin: signer, id, kind, deadlineTs: BigInt(Math.floor(deadlineMs / 1000)), endTs: BigInt(Math.floor(endMs / 1000)) }),
    withRemaining(await getDelegateGameweekInstructionAsync({ payer: signer, id, pda: gw }), TEE_VALIDATOR),
  ];
}

/* --------------------------------- Reads --------------------------------- */

export async function readManager(rpcUrl: string, authority: Address): Promise<Manager | null> {
  const [pda] = await findManagerPda({ authority });
  const m = await fetchMaybeManager(createSolanaRpc(rpcUrl), pda);
  return m.exists ? m.data : null;
}

export async function readGameweek(rpcUrl: string, id: number): Promise<GameweekAccount | null> {
  const [pda] = await findGameweekPda({ id });
  const g = await fetchMaybeGameweek(createSolanaRpc(rpcUrl), pda);
  return g.exists ? g.data : null;
}

export async function readEntry(rpcUrl: string, gameweek: number, authority: Address): Promise<Entry | null> {
  const [pda] = await findEntryPda({ gameweek, authority });
  const e = await fetchMaybeEntry(createSolanaRpc(rpcUrl), pda);
  return e.exists ? e.data : null;
}

/** Where an account lives: missing, on Solana (ours), or delegated to a rollup. */
export async function accountHome(rpcUrl: string, account: Address): Promise<"missing" | "solana" | "delegated"> {
  const info = await createSolanaRpc(rpcUrl).getAccountInfo(account, { encoding: "base64" }).send();
  if (!info.value) return "missing";
  return info.value.owner === DELEGATION_PROGRAM_ID ? "delegated" : info.value.owner === BULLXI_PROGRAM_ADDRESS ? "solana" : "missing";
}

/** All entries of a gameweek visible to the caller (the crank sees sealed ones too). */
export async function listEntries(rpcUrl: string, gameweek: number): Promise<{ address: Address; data: Entry }[]> {
  const gw = new Uint8Array(4);
  new DataView(gw.buffer).setUint32(0, gameweek, true);
  const b58 = getBase58Decoder();
  const res = await createSolanaRpc(rpcUrl)
    .getProgramAccounts(BULLXI_PROGRAM_ADDRESS, {
      encoding: "base64",
      filters: [
        { memcmp: { offset: BigInt(0), bytes: b58.decode(ENTRY_DISCRIMINATOR) as never, encoding: "base58" } },
        { memcmp: { offset: BigInt(8), bytes: b58.decode(gw) as never, encoding: "base58" } },
      ],
    })
    .send();
  const dec = getEntryDecoder();
  return res.map((a) => ({ address: a.pubkey, data: dec.decode(Uint8Array.from(atob(a.account.data[0]), (c) => c.charCodeAt(0))) }));
}

/* --------------------------------- Crank --------------------------------- */

/** The next step for a gameweek, or null if nothing is due yet. */
export function snapshotDue(g: GameweekAccount, nowSec: number, bookLastTs: number): boolean {
  const d = Number(g.deadlineTs);
  const e = Number(g.endTs);
  const w = Number(g.window);
  switch (g.status) {
    case GW_STATUS.open:
      return nowSec >= d;
    case GW_STATUS.kickedOff:
      return nowSec >= d + w && bookLastTs > Number(g.tmpTs);
    case GW_STATUS.live:
      return nowSec >= e - w;
    case GW_STATUS.closing:
      return nowSec >= e && bookLastTs > Number(g.tmpTs);
    default:
      return false;
  }
}

export async function snapshotIx(id: number): Promise<Instruction> {
  const [gw] = await findGameweekPda({ id });
  return getSnapshotGameweekInstructionAsync({ gameweek: gw });
}

export async function revealIx(entry: Address, gameweek: number): Promise<Instruction> {
  const [gw] = await findGameweekPda({ id: gameweek });
  return getRevealEntryInstructionAsync({ entry, gameweek: gw });
}

export async function settleIx(payer: TransactionSigner, entry: Address, gameweek: number, authority: Address): Promise<Instruction> {
  const [gw] = await findGameweekPda({ id: gameweek });
  const [manager] = await findManagerPda({ authority });
  return getSettleEntryInstruction({ payer, entry, gameweek: gw, manager });
}

export const decodeName = (b: ReadonlyUint8Array) => new TextDecoder().decode(b as Uint8Array).replace(/\0+$/, "");
