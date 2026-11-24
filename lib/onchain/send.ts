/**
 * Build, sign and send one transaction, then wait for confirmation.
 * Runtime-agnostic: used by scripts, the Worker and the browser.
 */
import {
  AccountRole,
  appendTransactionMessageInstructions,
  createSolanaRpc,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Address,
  type Instruction,
  type TransactionSigner,
} from "@solana/kit";

/** Appends a read-only account (e.g. the validator identity a delegate instruction expects). */
export function withRemaining<T extends Instruction>(ix: T, ...extra: Address[]): T {
  return { ...ix, accounts: [...(ix.accounts ?? []), ...extra.map((address) => ({ address, role: AccountRole.READONLY }))] };
}

export async function sendAndConfirm(rpcUrl: string, feePayer: TransactionSigner, ixs: Instruction[], opts: { timeoutMs?: number; skipPreflight?: boolean } = {}): Promise<string> {
  const rpc = createSolanaRpc(rpcUrl);
  const { value: blockhash } = await rpc.getLatestBlockhash().send();
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(feePayer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
    (m) => appendTransactionMessageInstructions(ixs, m),
  );
  const tx = await signTransactionMessageWithSigners(message);
  const sig = getSignatureFromTransaction(tx);
  const wire = getBase64EncodedWireTransaction(tx);
  try {
    await rpc.sendTransaction(wire, { encoding: "base64", preflightCommitment: "confirmed", skipPreflight: opts.skipPreflight }).send();
  } catch (e) {
    // Rollups answer some rejections with a generic error; simulate to surface the program logs.
    const logs = await explainFailure(rpcUrl, wire);
    throw new Error(`${e instanceof Error ? e.message : String(e)}${logs ? `\n${logs}` : ""}`);
  }
  const until = Date.now() + (opts.timeoutMs ?? 40_000);
  while (Date.now() < until) {
    const { value } = await rpc.getSignatureStatuses([sig]).send();
    const s = value[0];
    if (s?.err) throw new Error(`Transaction failed: ${JSON.stringify(s.err, (_, v) => (typeof v === "bigint" ? v.toString() : v))} (${sig})`);
    if (s?.confirmationStatus === "confirmed" || s?.confirmationStatus === "finalized") return sig;
    await new Promise((r) => setTimeout(r, 800));
  }
  throw new Error(`Not confirmed in time: ${sig}`);
}

/** Polls until an account's owner matches (delegation and undelegation settle asynchronously). */
export async function waitForOwner(rpcUrl: string, account: Address, owner: Address, timeoutMs = 90_000): Promise<void> {
  const rpc = createSolanaRpc(rpcUrl);
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const info = await rpc.getAccountInfo(account, { encoding: "base64" }).send();
    if (info.value?.owner === owner) return;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`${account} did not move to ${owner} in time`);
}

/** Simulates a rejected transaction and returns its error and last program logs, if any. */
export async function explainFailure(rpcUrl: string, wireBase64: string): Promise<string | null> {
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "simulateTransaction", params: [wireBase64, { encoding: "base64", sigVerify: false, replaceRecentBlockhash: true }] }),
    });
    const body = (await res.json()) as { result?: { value?: { err?: unknown; logs?: string[] } } };
    const v = body.result?.value;
    if (!v?.err) return null;
    return `simulation: ${JSON.stringify(v.err)} | ${(v.logs ?? []).slice(-6).join(" | ")}`;
  } catch {
    return null;
  }
}
