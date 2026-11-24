/**
 * Onchain play for signed-in managers (devnet + MagicBlock Private ER).
 * Loaded on demand from lib/data/index.ts. Players never need SOL: the game
 * Worker co-signs as fee payer for an allowlist of game instructions.
 */
import {
  appendTransactionMessageInstructions,
  address,
  createNoopSigner,
  createSolanaRpc,
  createTransactionMessage,
  getBase58Decoder,
  getBase64EncodedWireTransaction,
  getTransactionDecoder,
  getTransactionEncoder,
  partiallySignTransactionMessageWithSigners,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
  type Instruction,
  type ReadonlyUint8Array,
  type SignatureDictionary,
  type TransactionPartialSigner,
} from "@solana/kit";
import { config, explorer, GAME_API } from "@/lib/config";
import { BULLXI_PROGRAM_ADDRESS, ENTRY_DISCRIMINATOR, MANAGER_DISCRIMINATOR, findConfigPda, findEntryPda, findManagerPda, getEntryDecoder, getEntrySize, getSetProfileInstructionAsync } from "@/lib/onchain/bullxi";
import { DELEGATION_PROGRAM_ID, decodePriceBook, priceBookAddress } from "@/lib/onchain/price-book";
import { PRICE_BOOK_STOCKS } from "@/lib/onchain/universe";
import { dailyDeadline } from "@/lib/onchain/crank";
import { ENTRY_STATUS, accountHome, decodeName, entryIxs, gameweekId, joinIxs, readEntry, readGameweek, readManager, sealIx, stockId, type SealInput } from "@/lib/onchain/game";
import { teeLogin, teeRpcUrl } from "@/lib/onchain/tee-auth";
import type { ManagerRecord, OnchainResult, PlayerSigner, ProofStats, SealResult } from "./types";

export class OnchainError extends Error {
  constructor(
    public code: "not-open" | "flash" | "relay" | "timeout" | "signature",
    message: string,
  ) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let sponsorCache: Address | null = null;
async function sponsor(): Promise<Address> {
  if (sponsorCache) return sponsorCache;
  const res = await fetch(`${GAME_API}/sponsor`);
  if (!res.ok) throw new OnchainError("relay", "The game server is not reachable");
  sponsorCache = address(((await res.json()) as { address: string }).address);
  return sponsorCache;
}

/** Wraps the player's sign function (Privy) as a kit partial signer. */
function playerSigner(p: PlayerSigner): TransactionPartialSigner {
  const addr = address(p.address);
  return {
    address: addr,
    async signTransactions(txs) {
      return Promise.all(
        txs.map(async (tx) => {
          const signed = getTransactionDecoder().decode(await p.signTransaction(new Uint8Array(getTransactionEncoder().encode(tx))));
          const sig = signed.signatures[addr];
          if (!sig) throw new OnchainError("signature", "The transaction was not signed");
          return { [addr]: sig } as SignatureDictionary;
        }),
      );
    },
  };
}

async function relay(to: "solana" | "tee", ixs: (fee: ReturnType<typeof createNoopSigner>) => Promise<Instruction[]>): Promise<string> {
  const fee = createNoopSigner(await sponsor());
  const rpc = createSolanaRpc(to === "solana" ? config.solanaRpc : config.teeRpc);
  const { value: blockhash } = await rpc.getLatestBlockhash().send();
  const msg = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(fee, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
    async (m) => appendTransactionMessageInstructions(await ixs(fee), m),
  );
  const tx = await partiallySignTransactionMessageWithSigners(await msg);
  const res = await fetch(`${GAME_API}/relay`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tx: getBase64EncodedWireTransaction(tx), to }),
  });
  const out = (await res.json().catch(() => ({}))) as { ok?: boolean; signature?: string; tx?: string; error?: string };
  if (!res.ok || !out.ok) throw new OnchainError("relay", out.error ?? "The game server refused the transaction");
  if (out.signature) return out.signature;
  if (!out.tx) throw new OnchainError("relay", "The game server sent nothing back");
  // Solana transactions come back co-signed; the browser sends them.
  return createSolanaRpc(config.solanaRpc).sendTransaction(out.tx as never, { encoding: "base64", preflightCommitment: "confirmed" }).send();
}

async function confirmOnSolana(sig: string, timeoutMs = 45_000) {
  const rpc = createSolanaRpc(config.solanaRpc);
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const { value } = await rpc.getSignatureStatuses([sig as never]).send();
    const s = value[0];
    if (s?.err) throw new OnchainError("relay", "The transaction failed");
    if (s?.confirmationStatus === "confirmed" || s?.confirmationStatus === "finalized") return;
    await sleep(1000);
  }
  throw new OnchainError("timeout", "Solana is slow right now. Try again in a minute.");
}

async function waitFor<T>(fn: () => Promise<T | null>, timeoutMs = 45_000): Promise<T> {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await sleep(1500);
  }
  throw new OnchainError("timeout", "This is taking longer than usual. Try again in a minute.");
}

/** Onchain gameweek id for the app's daily gameweek. Flash gameweeks stay offchain for now. */
export function onchainGameweekId(kind: "daily" | "flash", deadlineIso: string): number {
  if (kind !== "daily") throw new OnchainError("flash", "Flash gameweeks are not onchain yet");
  return gameweekId("daily", new Date(deadlineIso).getTime());
}

/** Creates the manager's public profile the first time they play. */
export async function ensureManager(p: PlayerSigner, name: string, team: string): Promise<void> {
  const authority = address(p.address);
  const [pda] = await findManagerPda({ authority });
  if ((await accountHome(config.solanaRpc, pda)) !== "missing") return;
  const signer = playerSigner(p);
  const sig = await relay("solana", (fee) => joinIxs(signer, fee, name.slice(0, 24) || "Manager", team.slice(0, 24) || "My XI"));
  await confirmOnSolana(sig);
}

/**
 * Seals the squad inside the Private ER for this gameweek. Only the manager
 * (and the game crank) can read it until kickoff.
 */
export async function sealSquadOnchain(
  p: PlayerSigner,
  input: { kind: "daily" | "flash"; deadline: string; managerName: string; teamName: string } & SealInput,
): Promise<SealResult> {
  const id = onchainGameweekId(input.kind, input.deadline);
  const authority = address(p.address);
  if (!(await readGameweek(config.teeRpc, id))) throw new OnchainError("not-open", "This gameweek is not open onchain yet");
  await ensureManager(p, input.managerName, input.teamName);

  const signer = playerSigner(p);
  const [entry] = await findEntryPda({ gameweek: id, authority });
  if ((await accountHome(config.solanaRpc, entry)) === "missing") {
    const sig = await relay("solana", (fee) => entryIxs(signer, fee, id));
    await confirmOnSolana(sig);
  }
  // The new entry shows up in the rollup a moment after delegation.
  await waitFor(async () => (await readEntry(config.teeRpc, id, authority)) ?? (await readOwnEntry(p, id)));

  const before = Math.floor(Date.now() / 1000) - 5;
  const signature = await relay("tee", async () => [await sealIx(signer, id, input)]);
  // Read it back as the player: proves it landed, and that only they can see it.
  const sealed = await waitFor(async () => {
    const e = await readOwnEntry(p, id);
    return e && e.status >= ENTRY_STATUS.sealed && Number(e.sealedTs) >= before ? e : null;
  });
  return { gameweek: id, signature, address: entry, sealedAt: Number(sealed.sealedTs) * 1000 };
}

/** Reads the player's own sealed entry from the Private ER (needs their login). */
async function readOwnEntry(p: PlayerSigner, gameweek: number) {
  const token = await teeToken(p);
  return readEntry(teeRpcUrl(config.teeRpc, token), gameweek, address(p.address));
}

const tokens = new Map<string, { token: string; expiresAt: number }>();
async function teeToken(p: PlayerSigner): Promise<string> {
  const hit = tokens.get(p.address);
  if (hit && Date.now() < hit.expiresAt) return hit.token;
  const t = await teeLogin(config.teeRpc, address(p.address), p.signMessage);
  tokens.set(p.address, t);
  return t.token;
}

/** Renames the manager or team onchain. No-op until the manager has a profile. */
export async function updateProfileOnchain(p: PlayerSigner, name: string, team: string): Promise<boolean> {
  const authority = address(p.address);
  if (!(await readManager(config.teeRpc, authority).catch(() => null))) return false;
  const signer = playerSigner(p);
  await relay("tee", async () => [await getSetProfileInstructionAsync({ authority: signer, name: name.slice(0, 24) || "Manager", team: team.slice(0, 24) || "My XI" })]);
  return true;
}

/* --------------------------------- Reads --------------------------------- */

/** A manager's public record: live copy from the rollup, else the last copy on Solana. */
export async function getManagerRecord(addr: string): Promise<ManagerRecord | null> {
  const a = address(addr);
  const m = (await readManager(config.teeRpc, a).catch(() => null)) ?? (await readManager(config.solanaRpc, a));
  if (!m) return null;
  return {
    address: addr,
    name: decodeName(m.name),
    team: decodeName(m.team),
    joinedAt: Number(m.createdTs) * 1000,
    gameweeks: m.gameweeks,
    totalPoints: Number(m.totalPoints),
    bestPoints: m.bestPoints,
    bestGameweek: m.bestGameweek,
    lastGameweek: m.lastGameweek,
    lastPoints: m.lastPoints,
  };
}

/**
 * Settled gameweeks for a manager, newest first. Settled entries are committed
 * to Solana; the rollup keeps the live copy, so it is read there (one call, no
 * public RPC rate limits), plus any entries already handed back to Solana.
 */
export async function getManagerResults(addr: string): Promise<OnchainResult[]> {
  const b58 = getBase58Decoder();
  const rpc = createSolanaRpc(config.solanaRpc);
  const filters = [
    { memcmp: { offset: BigInt(0), bytes: b58.decode(ENTRY_DISCRIMINATOR) as never, encoding: "base58" as const } },
    { memcmp: { offset: BigInt(12), bytes: addr as never, encoding: "base58" as const } },
  ];
  const tee = createSolanaRpc(config.teeRpc);
  const lists = await Promise.all([
    tee.getProgramAccounts(BULLXI_PROGRAM_ADDRESS, { encoding: "base64", filters }).send(),
    rpc.getProgramAccounts(BULLXI_PROGRAM_ADDRESS, { encoding: "base64", filters }).send().catch(() => []),
  ]);
  const seen = new Set<string>();
  const res = lists.flat().filter((a) => !seen.has(a.pubkey) && !!seen.add(a.pubkey));
  const dec = getEntryDecoder();
  return res
    .map((a) => ({ account: a.pubkey as string, e: dec.decode(Uint8Array.from(atob(a.account.data[0]), (c) => c.charCodeAt(0))) }))
    .filter(({ e }) => e.status === ENTRY_STATUS.settled)
    .map(({ account, e }) => ({
      gameweek: e.gameweek,
      date: e.gameweek < 100_000_000 ? new Date(e.gameweek * 86_400_000 + 20 * 3_600_000).toISOString() : null,
      points: e.points,
      captain: stockId(e.captain),
      settledAt: Number(e.settledTs) * 1000,
      account,
    }))
    .sort((x, y) => y.settledAt - x.settledAt);
}

/* --------------------------------- Proof --------------------------------- */

const GW_LABEL = ["Open for squads", "Kicked off", "Live", "Closing", "Full time"];

/** Live numbers for /proof. Every value is read from devnet or the Private ER. */
export async function getProofStats(): Promise<ProofStats> {
  const b58 = getBase58Decoder();
  const tee = createSolanaRpc(config.teeRpc);
  const base = createSolanaRpc(config.solanaRpc);
  const disc = (d: ReadonlyUint8Array) => [{ memcmp: { offset: BigInt(0), bytes: b58.decode(d) as never, encoding: "base58" as const } }];
  const slice = { offset: 0, length: 0 };
  const bookAddr = await priceBookAddress();
  const [cfg] = await findConfigPda();
  const deadline = dailyDeadline(Date.now()) - 86_400_000; // the gameweek that kicked off most recently
  const liveId = gameweekId("daily", deadline);
  const nextId = gameweekId("daily", dailyDeadline(Date.now()));

  const [book, managers, squads, entries, live, next] = await Promise.all([
    tee.getAccountInfo(bookAddr, { encoding: "base64" }).send(),
    tee.getProgramAccounts(BULLXI_PROGRAM_ADDRESS, { encoding: "base64", dataSlice: slice, filters: disc(MANAGER_DISCRIMINATOR) }).send(),
    // Every entry ever created, counted on Solana (squads inside stay private).
    // Other Anchor programs can have an "Entry" account too: match our exact size as well.
    base.getProgramAccounts(DELEGATION_PROGRAM_ID, { encoding: "base64", dataSlice: slice, filters: [...disc(ENTRY_DISCRIMINATOR), { dataSize: BigInt(getEntrySize()) }] }).send().catch(() => []),
    tee.getProgramAccounts(BULLXI_PROGRAM_ADDRESS, { encoding: "base64", filters: disc(ENTRY_DISCRIMINATOR) }).send(),
    readGameweek(config.teeRpc, liveId).catch(() => null),
    readGameweek(config.teeRpc, nextId).catch(() => null),
  ]);
  const pb = book.value ? decodePriceBook(Uint8Array.from(atob(book.value.data[0]), (c) => c.charCodeAt(0))) : null;
  const dec = getEntryDecoder();
  const settled = entries.filter((a) => dec.decode(Uint8Array.from(atob(a.account.data[0]), (c) => c.charCodeAt(0))).status === ENTRY_STATUS.settled).length;
  const g = live ?? next;
  const gId = live ? liveId : nextId;
  const bits = g ? g.picked.toString(2).split("").filter((b) => b === "1").length : 0;
  const ex = (a: string) => explorer("address", a);

  return {
    network: config.label,
    previewNotice: config.previewNotice,
    counters: { pushes: pb?.updates ?? 0, managers: managers.length, squads: squads.length, settled },
    priceBook: {
      address: bookAddr,
      lastPushAt: (pb?.lastTs ?? 0) * 1000,
      prices: (pb?.prices ?? []).map((p, i) => ({ ticker: PRICE_BOOK_STOCKS[i]?.[0] ?? `#${i}`, price: p })),
    },
    gameweek: g
      ? {
          id: gId,
          deadline: new Date(Number(g.deadlineTs) * 1000).toISOString(),
          status: GW_LABEL[g.status] ?? "Unknown",
          startedStocks: bits,
          topGainer: g.topGainer < PRICE_BOOK_STOCKS.length ? PRICE_BOOK_STOCKS[g.topGainer][0] : null,
        }
      : null,
    stack: [
      { moment: "Squads sealed until kickoff", tech: "Private Ephemeral Rollup (TEE) + members-only permission", status: "live" },
      { moment: "Live prices and TWAP for scoring", tech: "Price book on the Private ER, written every minute", status: "live" },
      { moment: "Kickoff, reveal and settlement", tech: "Crank in the game Worker (every minute)", status: "live" },
      { moment: "Final scores on Solana", tech: "Commit from the rollup to Solana", status: "live" },
      { moment: "Squad rules and scoring", tech: "Enforced in the bullxi program", status: "live" },
      { moment: "No gas, no pop-ups for players", tech: "Sponsored fees + Privy accounts", status: "live", note: "Session keys planned" },
      { moment: "Prize payouts", tech: "Magic Actions", status: "planned" },
      { moment: "Entry fees and prize pool", tech: "Ephemeral SPL Token", status: "planned" },
      { moment: "Head-to-head draws", tech: "VRF", status: "planned" },
      { moment: "Season badges", tech: "SOAR", status: "planned" },
    ],
    addresses: [
      { label: "bullxi program", address: BULLXI_PROGRAM_ADDRESS, href: ex(BULLXI_PROGRAM_ADDRESS) },
      { label: "Price book", address: bookAddr, href: ex(bookAddr) },
      { label: "Game config", address: cfg, href: ex(cfg) },
      { label: "Private ER validator (TEE)", address: config.teeValidator, href: ex(config.teeValidator) },
    ],
  };
}
