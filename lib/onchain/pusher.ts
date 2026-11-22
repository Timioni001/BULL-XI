/**
 * One price push: fetch real xStock prices, write them to the price book on
 * the Ephemeral Rollup in a single transaction (optionally committing to
 * Solana in the same transaction). Shared by the Cloudflare cron Worker and
 * the local fallback script. Web Crypto only, no Node APIs.
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
  signBytes,
  signTransactionMessageWithSigners,
  type KeyPairSigner,
} from "@solana/kit";
import { teeLogin, teeRpcUrl } from "./tee-auth";
import { commitPriceBookIx, pushPricesIx, toMicroUsd } from "./price-book";
import { PRICE_BOOK_STOCKS } from "./universe";

export interface PushOptions {
  signer: KeyPairSigner;
  /** Ephemeral Rollup RPC. A TEE (Private ER) URL logs in first. */
  erRpc: string;
  /** Jupiter Price API v3 */
  priceUrl: string;
  /** Also commit the price book to Solana in the same transaction */
  commit?: boolean;
}

export interface PushResult {
  signature: string;
  priced: number;
  missing: string[];
  committed: boolean;
}

type JupPrice = { usdPrice?: number; stockData?: { price?: number } } | null;

export async function fetchUniversePrices(priceUrl: string): Promise<{ prices: bigint[]; missing: string[] }> {
  const ids = PRICE_BOOK_STOCKS.map(([, mint]) => mint).join(",");
  const res = await fetch(`${priceUrl}?ids=${ids}`, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`price API ${res.status}`);
  const body = (await res.json()) as Record<string, JupPrice>;
  const missing: string[] = [];
  const prices = PRICE_BOOK_STOCKS.map(([ticker, mint]) => {
    const p = body[mint];
    const v = toMicroUsd(p?.stockData?.price ?? p?.usdPrice);
    if (v === BigInt(0)) missing.push(ticker);
    return v;
  });
  return { prices, missing };
}

export async function pushOnce({ signer, erRpc, priceUrl, commit = false }: PushOptions): Promise<PushResult> {
  const { prices, missing } = await fetchUniversePrices(priceUrl);
  if (missing.length === prices.length) throw new Error("no prices returned");
  // The Private ER only accepts transactions with a login token.
  const url = erRpc.includes("tee") ? teeRpcUrl(erRpc, (await teeLogin(erRpc, signer.address, (m) => signBytes(signer.keyPair.privateKey, m))).token) : erRpc;
  const rpc = createSolanaRpc(url);
  const [{ value: blockhash }, push, commitIx] = await Promise.all([
    rpc.getLatestBlockhash().send(),
    pushPricesIx(signer.address, prices),
    commit ? commitPriceBookIx(signer.address) : Promise.resolve(null),
  ]);
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(signer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
    (m) => appendTransactionMessageInstructions(commitIx ? [push, commitIx] : [push], m),
  );
  const tx = await signTransactionMessageWithSigners(message);
  await rpc.sendTransaction(getBase64EncodedWireTransaction(tx), { encoding: "base64", preflightCommitment: "confirmed" }).send();
  return { signature: getSignatureFromTransaction(tx), priced: prices.length - missing.length, missing, committed: !!commitIx };
}
