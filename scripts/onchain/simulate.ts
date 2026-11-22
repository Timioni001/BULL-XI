/**
 * Simulates a crank instruction on the TEE and prints logs.
 *   npx tsx scripts/onchain/simulate.ts snapshot <gameweekId>
 */
import { appendTransactionMessageInstructions, createSolanaRpc, createTransactionMessage, getBase64EncodedWireTransaction, pipe, setTransactionMessageFeePayerSigner, setTransactionMessageLifetimeUsingBlockhash, signBytes, signTransactionMessageWithSigners } from "@solana/kit";
import { config } from "../../lib/config";
import { snapshotIx } from "../../lib/onchain/game";
import { teeLogin, teeRpcUrl } from "../../lib/onchain/tee-auth";
import { loadSigner } from "./common";

async function main() {
  const [, id] = process.argv.slice(2);
  const crank = await loadSigner("pusher");
  const url = teeRpcUrl(config.teeRpc, (await teeLogin(config.teeRpc, crank.address, (m) => signBytes(crank.keyPair.privateKey, m))).token);
  const rpc = createSolanaRpc(url);
  const { value: bh } = await rpc.getLatestBlockhash().send();
  const tx = await signTransactionMessageWithSigners(pipe(createTransactionMessage({ version: 0 }), (m) => setTransactionMessageFeePayerSigner(crank, m), (m) => setTransactionMessageLifetimeUsingBlockhash(bh, m), (m) => appendTransactionMessageInstructions([], m)));
  void tx;
  const ix = await snapshotIx(Number(id));
  const real = await signTransactionMessageWithSigners(pipe(createTransactionMessage({ version: 0 }), (m) => setTransactionMessageFeePayerSigner(crank, m), (m) => setTransactionMessageLifetimeUsingBlockhash(bh, m), (m) => appendTransactionMessageInstructions([ix], m)));
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "simulateTransaction", params: [getBase64EncodedWireTransaction(real), { encoding: "base64", sigVerify: false }] }) });
  console.log(JSON.stringify(await r.json(), null, 1).slice(0, 2500));
}
void main();
