/**
 * One-time setup on devnet, after `solana program deploy`:
 *   1. create the price book (deployer = admin, pusher = devnet-only key)
 *   2. delegate it to the MagicBlock devnet Private ER (TEE)
 *
 *   npm run onchain:setup
 */
import {
  appendTransactionMessageInstructions,
  createSolanaRpc,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  address,
  type Instruction,
  type KeyPairSigner,
} from "@solana/kit";
import { config, explorer } from "../../lib/config";
import { delegatePriceBookIx, initPriceBookIx, priceBookAddress } from "../../lib/onchain/price-book";
import { PRICE_BOOK_STOCKS } from "../../lib/onchain/universe";
import { loadSigner } from "./common";

async function send(rpcUrl: string, signer: KeyPairSigner, ixs: Instruction[]) {
  const rpc = createSolanaRpc(rpcUrl);
  const { value: blockhash } = await rpc.getLatestBlockhash().send();
  const msg = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(signer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
    (m) => appendTransactionMessageInstructions(ixs, m),
  );
  const tx = await signTransactionMessageWithSigners(msg);
  const sig = getSignatureFromTransaction(tx);
  await rpc.sendTransaction(getBase64EncodedWireTransaction(tx), { encoding: "base64", preflightCommitment: "confirmed" }).send();
  for (let i = 0; i < 40; i++) {
    const { value } = await rpc.getSignatureStatuses([sig]).send();
    const s = value[0];
    if (s?.err) throw new Error(`tx failed: ${JSON.stringify(s.err)}`);
    if (s?.confirmationStatus === "confirmed" || s?.confirmationStatus === "finalized") return sig;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`tx not confirmed: ${sig}`);
}

async function main() {
  const admin = await loadSigner("deployer");
  const pusher = await loadSigner("pusher");
  const book = await priceBookAddress();
  const rpc = createSolanaRpc(config.solanaRpc);
  console.log("price book", book);

  const existing = await rpc.getAccountInfo(book, { encoding: "base64" }).send();
  if (!existing.value) {
    const sig = await send(config.solanaRpc, admin, [await initPriceBookIx(admin.address, pusher.address, PRICE_BOOK_STOCKS.length)]);
    console.log("created", explorer("tx", sig));
  } else {
    console.log("already exists, owner", existing.value.owner);
  }

  const after = await rpc.getAccountInfo(book, { encoding: "base64" }).send();
  if (after.value?.owner === "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh") {
    console.log("already delegated");
  } else {
    const sig = await send(config.solanaRpc, admin, [await delegatePriceBookIx(admin.address, address(config.teeValidator))]);
    console.log("delegated to", config.teeValidator, explorer("tx", sig));
  }
  console.log("account", explorer("address", book));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
