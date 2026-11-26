/**
 * Fee sponsorship for players. A player's account starts with no SOL, so the
 * Worker co-signs as fee payer, but only for an allowlist of game
 * instructions, and only where the sponsor is the designated payer.
 * Pure checks here (unit tested); signing and sending live in the Worker.
 */
import {
  getCompiledTransactionMessageDecoder,
  getTransactionDecoder,
  getTransactionEncoder,
  signBytes,
  type Address,
  type KeyPairSigner,
  type ReadonlyUint8Array,
  type SignatureBytes,
} from "@solana/kit";
import {
  BULLXI_PROGRAM_ADDRESS,
  BUY_SQUAD_DISCRIMINATOR,
  CLAIM_TEST_DOLLARS_DISCRIMINATOR,
  CREATE_LEAGUE_DISCRIMINATOR,
  CREATE_PORTFOLIO_DISCRIMINATOR,
  DELEGATE_LEAGUE_DISCRIMINATOR,
  DELEGATE_PORTFOLIO_DISCRIMINATOR,
  JOIN_LEAGUE_DISCRIMINATOR,
  SELL_ALL_DISCRIMINATOR,
  CREATE_ENTRY_DISCRIMINATOR,
  CREATE_MANAGER_DISCRIMINATOR,
  DELEGATE_ENTRY_DISCRIMINATOR,
  DELEGATE_MANAGER_DISCRIMINATOR,
  SEAL_ENTRY_DISCRIMINATOR,
  SET_PROFILE_DISCRIMINATOR,
} from "./bullxi";

export type RelayTarget = "solana" | "tee";

/** Allowed instructions per target, and the account slot where the sponsor may appear (payer). */
const ALLOW: Record<RelayTarget, { disc: ReadonlyUint8Array; payerSlot: number | null; name: string }[]> = {
  solana: [
    { disc: CREATE_MANAGER_DISCRIMINATOR, payerSlot: 2, name: "create_manager" },
    { disc: DELEGATE_MANAGER_DISCRIMINATOR, payerSlot: 0, name: "delegate_manager" },
    { disc: CREATE_ENTRY_DISCRIMINATOR, payerSlot: 2, name: "create_entry" },
    { disc: DELEGATE_ENTRY_DISCRIMINATOR, payerSlot: 0, name: "delegate_entry" },
    { disc: CREATE_PORTFOLIO_DISCRIMINATOR, payerSlot: 2, name: "create_portfolio" },
    { disc: DELEGATE_PORTFOLIO_DISCRIMINATOR, payerSlot: 0, name: "delegate_portfolio" },
    { disc: CREATE_LEAGUE_DISCRIMINATOR, payerSlot: 2, name: "create_league" },
    { disc: DELEGATE_LEAGUE_DISCRIMINATOR, payerSlot: 0, name: "delegate_league" },
  ],
  tee: [
    { disc: SEAL_ENTRY_DISCRIMINATOR, payerSlot: null, name: "seal_entry" },
    { disc: SET_PROFILE_DISCRIMINATOR, payerSlot: null, name: "set_profile" },
    { disc: CLAIM_TEST_DOLLARS_DISCRIMINATOR, payerSlot: null, name: "claim_test_dollars" },
    { disc: BUY_SQUAD_DISCRIMINATOR, payerSlot: null, name: "buy_squad" },
    { disc: SELL_ALL_DISCRIMINATOR, payerSlot: null, name: "sell_all" },
    { disc: JOIN_LEAGUE_DISCRIMINATOR, payerSlot: null, name: "join_league" },
  ],
};

const MAX_INSTRUCTIONS = 4;
const same = (a: ReadonlyUint8Array, b: ReadonlyUint8Array) => a.length >= b.length && b.every((x, i) => a[i] === x);

export interface RelayCheck {
  ok: boolean;
  reason?: string;
  instructions?: string[];
}

/** Validates a player-signed transaction that names the sponsor as fee payer. */
export function checkRelayTransaction(wire: Uint8Array, sponsor: Address, target: RelayTarget): RelayCheck {
  let tx;
  let msg;
  try {
    tx = getTransactionDecoder().decode(wire);
    msg = getCompiledTransactionMessageDecoder().decode(tx.messageBytes);
  } catch {
    return { ok: false, reason: "Could not decode transaction" };
  }
  if (msg.version !== 0) return { ok: false, reason: "Only v0 transactions" };
  if ("addressTableLookups" in msg && (msg.addressTableLookups?.length ?? 0) > 0) return { ok: false, reason: "No lookup tables" };
  const keys = msg.staticAccounts;
  if (keys[0] !== sponsor) return { ok: false, reason: "Fee payer must be the sponsor" };
  const ixs = msg.instructions;
  if (ixs.length === 0 || ixs.length > MAX_INSTRUCTIONS) return { ok: false, reason: "Too many instructions" };
  const names: string[] = [];
  for (const ix of ixs) {
    if (keys[ix.programAddressIndex] !== BULLXI_PROGRAM_ADDRESS) return { ok: false, reason: "Only BULL-XI instructions" };
    const data = ix.data ?? new Uint8Array();
    const rule = ALLOW[target].find((r) => same(data, r.disc));
    if (!rule) return { ok: false, reason: "Instruction not allowed here" };
    const accounts = ix.accountIndices ?? [];
    for (let slot = 0; slot < accounts.length; slot++) {
      if (accounts[slot] === 0 && slot !== rule.payerSlot) return { ok: false, reason: "Sponsor can only be the payer" };
    }
    names.push(rule.name);
  }
  // Every signer other than the sponsor must already have signed.
  const missing = Object.entries(tx.signatures).filter(([k, v]) => k !== sponsor && !v);
  if (missing.length) return { ok: false, reason: "Player signature missing" };
  return { ok: true, instructions: names };
}

/** Adds the sponsor's signature. Call only after checkRelayTransaction passed. */
export async function cosign(wire: Uint8Array, sponsor: KeyPairSigner): Promise<Uint8Array> {
  const tx = getTransactionDecoder().decode(wire);
  const sig = (await signBytes(sponsor.keyPair.privateKey, tx.messageBytes)) as SignatureBytes;
  return new Uint8Array(getTransactionEncoder().encode({ ...tx, signatures: { ...tx.signatures, [sponsor.address]: sig } }));
}
