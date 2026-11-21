/**
 * Client for the BULL-XI price book account (onchain/programs/bullxi).
 * Pure and runtime-agnostic: used by the Cloudflare price pusher, the local
 * scripts and the web app. Relative imports only, so any bundler can build it.
 */
import { AccountRole, address, getAddressDecoder, getAddressEncoder, getProgramDerivedAddress, type Address, type Instruction } from "@solana/kit";

export const BULLXI_PROGRAM_ID = address("EZi2Raxa2hba9Bt5jYKf6nUkbQ4xgZeHbuBxjVJTCPXN");
export const DELEGATION_PROGRAM_ID = address("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh");
export const MAGIC_PROGRAM_ID = address("Magic11111111111111111111111111111111111111");
export const MAGIC_CONTEXT_ID = address("MagicContext1111111111111111111111111111111");
export const SYSTEM_PROGRAM_ID = address("11111111111111111111111111111111");

export const MAX_STOCKS = 48;
/** Prices are stored in micro-USD. */
export const PRICE_SCALE = 1_000_000;

// Anchor discriminators (onchain/idl/bullxi.json)
const DISC = {
  initPriceBook: [157, 234, 106, 155, 13, 236, 168, 86],
  configure: [245, 7, 108, 117, 95, 196, 54, 217],
  pushPrices: [120, 246, 190, 84, 249, 75, 136, 47],
  delegatePriceBook: [188, 142, 157, 218, 56, 237, 107, 10],
  commitPriceBook: [236, 171, 222, 12, 41, 181, 219, 67],
  undelegatePriceBook: [185, 210, 76, 123, 126, 150, 126, 121],
  account: [58, 79, 217, 46, 6, 199, 93, 200],
} as const;

const enc = new TextEncoder();
const addrEnc = getAddressEncoder();

async function pda(seeds: (string | Address)[], program: Address): Promise<Address> {
  const [a] = await getProgramDerivedAddress({
    programAddress: program,
    // Base58 addresses are 32+ characters; plain text seeds here are short.
    seeds: seeds.map((s) => (s.length >= 32 ? addrEnc.encode(s as Address) : enc.encode(s))),
  });
  return a;
}

export const priceBookAddress = () => pda(["price_book"], BULLXI_PROGRAM_ID);

const u8s = (...parts: ArrayLike<number>[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};
const u32le = (n: number) => new Uint8Array(new Uint32Array([n]).buffer);
const u64le = (n: bigint) => {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigUint64(0, n, true);
  return b;
};

/** USD price to the onchain integer (0 = no update). */
export function toMicroUsd(usd: number | undefined): bigint {
  if (!usd || !Number.isFinite(usd) || usd <= 0) return BigInt(0);
  return BigInt(Math.round(usd * PRICE_SCALE));
}

export function encodePushPrices(prices: bigint[]): Uint8Array {
  return u8s(DISC.pushPrices, u32le(prices.length), ...prices.map(u64le));
}

export async function pushPricesIx(pusher: Address, prices: bigint[]): Promise<Instruction> {
  return {
    programAddress: BULLXI_PROGRAM_ID,
    accounts: [
      { address: await priceBookAddress(), role: AccountRole.WRITABLE },
      { address: pusher, role: AccountRole.READONLY_SIGNER },
    ],
    data: encodePushPrices(prices),
  };
}

/** Commit the rollup copy of the price book to Solana. Payer must be the pusher. */
export async function commitPriceBookIx(payer: Address): Promise<Instruction> {
  return {
    programAddress: BULLXI_PROGRAM_ID,
    accounts: [
      { address: payer, role: AccountRole.WRITABLE_SIGNER },
      { address: await priceBookAddress(), role: AccountRole.WRITABLE },
      { address: MAGIC_PROGRAM_ID, role: AccountRole.READONLY },
      { address: MAGIC_CONTEXT_ID, role: AccountRole.WRITABLE },
    ],
    data: new Uint8Array(DISC.commitPriceBook),
  };
}

export async function initPriceBookIx(admin: Address, pusher: Address, count: number): Promise<Instruction> {
  return {
    programAddress: BULLXI_PROGRAM_ID,
    accounts: [
      { address: await priceBookAddress(), role: AccountRole.WRITABLE },
      { address: admin, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM_ID, role: AccountRole.READONLY },
    ],
    data: u8s(DISC.initPriceBook, addrEnc.encode(pusher), [count]),
  };
}

export async function delegatePriceBookIx(payer: Address, validator: Address): Promise<Instruction> {
  const book = await priceBookAddress();
  return {
    programAddress: BULLXI_PROGRAM_ID,
    accounts: [
      { address: payer, role: AccountRole.WRITABLE_SIGNER },
      { address: await pda(["buffer", book], BULLXI_PROGRAM_ID), role: AccountRole.WRITABLE },
      { address: await pda(["delegation", book], DELEGATION_PROGRAM_ID), role: AccountRole.WRITABLE },
      { address: await pda(["delegation-metadata", book], DELEGATION_PROGRAM_ID), role: AccountRole.WRITABLE },
      { address: book, role: AccountRole.WRITABLE },
      { address: BULLXI_PROGRAM_ID, role: AccountRole.READONLY },
      { address: DELEGATION_PROGRAM_ID, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM_ID, role: AccountRole.READONLY },
      { address: validator, role: AccountRole.READONLY },
    ],
    data: new Uint8Array(DISC.delegatePriceBook),
  };
}

export interface PriceBook {
  admin: Address;
  pusher: Address;
  count: number;
  updates: number;
  /** Unix seconds */
  startTs: number;
  lastTs: number;
  /** USD */
  prices: number[];
  /** Running price x seconds sum, micro-USD seconds */
  cum: bigint[];
  firstTs: number[];
}

export function decodePriceBook(data: Uint8Array): PriceBook {
  if (!DISC.account.every((b, i) => data[i] === b)) throw new Error("Not a price book account");
  const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const dec = getAddressDecoder();
  let o = 8;
  const admin = dec.decode(data.subarray(o, o + 32));
  o += 32;
  const pusher = dec.decode(data.subarray(o, o + 32));
  o += 32;
  const count = data[o];
  o += 2; // count + bump
  const updates = Number(v.getBigUint64(o, true));
  const startTs = Number(v.getBigInt64(o + 8, true));
  const lastTs = Number(v.getBigInt64(o + 16, true));
  o += 24;
  const prices: number[] = [];
  for (let i = 0; i < MAX_STOCKS; i++) prices.push(Number(v.getBigUint64(o + i * 8, true)) / PRICE_SCALE);
  o += MAX_STOCKS * 8;
  const cum: bigint[] = [];
  for (let i = 0; i < MAX_STOCKS; i++) cum.push(v.getBigUint64(o + i * 16, true) + (v.getBigUint64(o + i * 16 + 8, true) << BigInt(64)));
  o += MAX_STOCKS * 16;
  const firstTs: number[] = [];
  for (let i = 0; i < MAX_STOCKS; i++) firstTs.push(Number(v.getBigInt64(o + i * 8, true)));
  return { admin, pusher, count, updates, startTs, lastTs, prices: prices.slice(0, count), cum: cum.slice(0, count), firstTs: firstTs.slice(0, count) };
}

/** TWAP in USD between two snapshots of the price book. */
export function twapBetween(a: Pick<PriceBook, "cum" | "lastTs">, b: Pick<PriceBook, "cum" | "lastTs">, index: number): number | null {
  const dt = b.lastTs - a.lastTs;
  if (dt <= 0) return null;
  return Number((b.cum[index] - a.cum[index]) / BigInt(dt)) / PRICE_SCALE;
}
