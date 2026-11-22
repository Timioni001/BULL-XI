import { describe, expect, it } from "vitest";
import {
  appendTransactionMessageInstructions,
  createNoopSigner,
  createTransactionMessage,
  generateKeyPairSigner,
  getBase64EncodedWireTransaction,
  getBase64Encoder,
  partiallySignTransactionMessageWithSigners,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  type Blockhash,
  type Instruction,
  type TransactionSigner,
} from "@solana/kit";
import { checkRelayTransaction, cosign } from "./relay";
import { entryIxs, joinIxs, sealIx } from "./game";
import { pushPricesIx } from "./price-book";

const lifetime = { blockhash: "11111111111111111111111111111111" as Blockhash, lastValidBlockHeight: BigInt(1) };

async function wire(feePayer: TransactionSigner, ixs: Instruction[]) {
  const msg = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(feePayer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(lifetime, m),
    (m) => appendTransactionMessageInstructions(ixs, m),
  );
  const tx = await partiallySignTransactionMessageWithSigners(msg);
  return new Uint8Array(getBase64Encoder().encode(getBase64EncodedWireTransaction(tx)));
}

describe("fee relay", () => {
  it("sponsors a player's join and entry on Solana", async () => {
    const player = await generateKeyPairSigner();
    const sponsorKey = await generateKeyPairSigner();
    const sponsor = createNoopSigner(sponsorKey.address);
    const join = await wire(sponsor, await joinIxs(player, sponsor, "Ada", "Ada XI"));
    expect(checkRelayTransaction(join, sponsor.address, "solana")).toMatchObject({ ok: true, instructions: ["create_manager", "delegate_manager"] });
    const entry = await wire(sponsor, await entryIxs(player, sponsor, 20414));
    expect(checkRelayTransaction(entry, sponsor.address, "solana").ok).toBe(true);
    // The co-signed transaction carries both signatures.
    const signed = await cosign(join, sponsorKey);
    expect(signed.length).toBe(join.length);
    expect(signed).not.toEqual(join);
  });

  it("sponsors sealing on the TEE but not on Solana", async () => {
    const player = await generateKeyPairSigner();
    const sponsor = createNoopSigner((await generateKeyPairSigner()).address);
    const s = ["spyx", "qqqx", "msftx", "aaplx", "amznx", "googlx", "metax", "nvdax", "avgox", "pltrx", "llyx", "tsmx", "tslax", "mstrx", "coinx"];
    const seal = await wire(sponsor, [await sealIx(player, 1, { squad: s, starters: s.slice(0, 11), bench: s.slice(11), captainId: "nvdax", viceId: "msftx" })]);
    expect(checkRelayTransaction(seal, sponsor.address, "tee").ok).toBe(true);
    expect(checkRelayTransaction(seal, sponsor.address, "solana")).toMatchObject({ ok: false, reason: "Instruction not allowed here" });
  });

  it("refuses other fee payers, other instructions and the sponsor as a player", async () => {
    const player = await generateKeyPairSigner();
    const sponsor = createNoopSigner((await generateKeyPairSigner()).address);
    const other = await wire(player, await joinIxs(player, player, "Ada", "Ada XI"));
    expect(checkRelayTransaction(other, sponsor.address, "solana")).toMatchObject({ ok: false, reason: "Fee payer must be the sponsor" });

    const push = await wire(sponsor, [await pushPricesIx(sponsor.address, [BigInt(1)])]);
    expect(checkRelayTransaction(push, sponsor.address, "tee")).toMatchObject({ ok: false, reason: "Instruction not allowed here" });

    const selfJoin = await wire(sponsor, await joinIxs(sponsor, sponsor, "Me", "Me XI"));
    expect(checkRelayTransaction(selfJoin, sponsor.address, "solana")).toMatchObject({ ok: false, reason: "Sponsor can only be the payer" });
  });

  it("refuses unsigned player transactions and garbage", async () => {
    const sponsor = createNoopSigner((await generateKeyPairSigner()).address);
    const player = createNoopSigner((await generateKeyPairSigner()).address);
    const unsigned = await wire(sponsor, await joinIxs(player, sponsor, "Ada", "Ada XI"));
    expect(checkRelayTransaction(unsigned, sponsor.address, "solana")).toMatchObject({ ok: false, reason: "Player signature missing" });
    expect(checkRelayTransaction(new Uint8Array([1, 2, 3]), sponsor.address, "solana").ok).toBe(false);
  });
});
