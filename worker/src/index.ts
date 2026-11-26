/**
 * BULL-XI game Worker (Cloudflare, free plan).
 *
 * Cron, every minute (lib/onchain/crank.ts):
 *   push live prices to the price book on the MagicBlock Private ER (TEE),
 *   create the next daily gameweek, take TWAP snapshots, reveal sealed squads
 *   after kickoff, settle and commit results to Solana at full time.
 *   Once a day (00:00 UTC) the push also commits the price book to Solana.
 *
 * HTTP:
 *   GET  /health      last price push as seen onchain
 *   GET  /price-book  decoded price book from the TEE (cached 10s)
 *   POST /relay       { tx: base64, to: "solana" | "tee" } co-signs as fee payer
 *                     for allowlisted game instructions only (lib/onchain/relay.ts).
 *                     "tee": sent from here. "solana": returned to the player's
 *                     browser to send, because Solana's public devnet RPC blocks
 *                     requests from Cloudflare Workers.
 *   GET  /sponsor     the fee payer address players build transactions with
 *
 * Secret: PUSHER_KEY (devnet-only key, JSON byte array) via `wrangler secret put`.
 */
import { createKeyPairSignerFromBytes, createSolanaRpc, getBase64Decoder, getBase64Encoder, signBytes, type KeyPairSigner } from "@solana/kit";
import { runCrank } from "../../lib/onchain/crank";
import { decodePriceBook, priceBookAddress } from "../../lib/onchain/price-book";
import { checkRelayTransaction, cosign, type RelayTarget } from "../../lib/onchain/relay";
import { teeLogin, teeRpcUrl, type TeeToken } from "../../lib/onchain/tee-auth";
import { PRICE_BOOK_STOCKS } from "../../lib/onchain/universe";

interface Env {
  PUSHER_KEY: string;
  ER_RPC: string;
  SOLANA_RPC: string;
  PRICE_URL: string;
  NETWORK: string;
}

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "content-type": "application/json",
};
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { ...cors, ...extra } });

let signerCache: KeyPairSigner | null = null;
/** Reads PUSHER_KEY: a [n,n,...] byte array (64 numbers). Extra text around it, as in PUSHER_KEY.txt, is ignored. */
export function parseKey(raw: string | undefined): Uint8Array {
  if (!raw || !raw.trim()) throw new Error("PUSHER_KEY secret is not set");
  const arr = raw.match(/\[[\d\s,]+\]/)?.[0];
  if (!arr) throw new Error("PUSHER_KEY must contain the [n,n,...] line from PUSHER_KEY.txt");
  const bytes = JSON.parse(arr) as number[];
  if (bytes.length !== 64) throw new Error(`PUSHER_KEY has ${bytes.length} numbers, expected 64`);
  return new Uint8Array(bytes);
}

async function signer(env: Env) {
  signerCache ??= await createKeyPairSignerFromBytes(parseKey(env.PUSHER_KEY));
  return signerCache;
}

// The TEE login token lives for a while; reuse it within this isolate.
let teeToken: TeeToken | null = null;
async function teeUrl(env: Env) {
  if (!teeToken || Date.now() > teeToken.expiresAt) {
    const s = await signer(env);
    teeToken = await teeLogin(env.ER_RPC, s.address, (m) => signBytes(s.keyPair.privateKey, m));
  }
  return teeRpcUrl(env.ER_RPC, teeToken.token);
}

async function readBook(env: Env) {
  const rpc = createSolanaRpc(env.ER_RPC);
  const address = await priceBookAddress();
  const info = await rpc.getAccountInfo(address, { encoding: "base64" }).send();
  if (!info.value) return null;
  const book = decodePriceBook(Uint8Array.from(atob(info.value.data[0]), (c) => c.charCodeAt(0)));
  return {
    address,
    network: env.NETWORK,
    updates: book.updates,
    lastPushAt: book.lastTs * 1000,
    ageSeconds: Math.max(0, Math.round(Date.now() / 1000 - book.lastTs)),
    stocks: book.prices.map((p, i) => ({ ticker: PRICE_BOOK_STOCKS[i]?.[0], price: p })),
  };
}

async function relay(req: Request, env: Env): Promise<Response> {
  let body: { tx?: string; to?: RelayTarget };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Bad request" }, 400);
  }
  if (!body.tx || (body.to !== "solana" && body.to !== "tee")) return json({ ok: false, error: "Bad request" }, 400);
  const wire = new Uint8Array(getBase64Encoder().encode(body.tx));
  if (wire.length > 1232) return json({ ok: false, error: "Transaction too large" }, 400);
  const s = await signer(env);
  const check = checkRelayTransaction(wire, s.address, body.to);
  if (!check.ok) return json({ ok: false, error: check.reason }, 403);
  const signed = await cosign(wire, s);
  if (body.to === "solana") {
    console.log(JSON.stringify({ relay: check.instructions, to: "solana", cosigned: true }));
    return json({ ok: true, tx: getBase64Decoder().decode(signed) });
  }
  const res = await fetch(await teeUrl(env), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "sendTransaction", params: [getBase64Decoder().decode(signed), { encoding: "base64", preflightCommitment: "confirmed" }] }),
  });
  const out = (await res.json()) as { result?: string; error?: { message?: string } };
  if (out.error || !out.result) {
    console.error(JSON.stringify({ relay: check.instructions, error: out.error?.message }));
    return json({ ok: false, error: out.error?.message ?? "Send failed" }, 502);
  }
  console.log(JSON.stringify({ relay: check.instructions, to: body.to, signature: out.result }));
  return json({ ok: true, signature: out.result });
}

export default {
  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext) {
    const t = new Date(event.scheduledTime);
    const commit = t.getUTCHours() === 0 && t.getUTCMinutes() === 0;
    ctx.waitUntil(
      (async () => {
        try {
          const r = await runCrank({ signer: await signer(env), solanaRpc: env.SOLANA_RPC, teeRpc: env.ER_RPC, priceUrl: env.PRICE_URL, now: event.scheduledTime }, { commit });
          // Shows up in Workers Logs and `wrangler tail`.
          (r.errors.length ? console.error : console.log)(JSON.stringify({ ok: r.errors.length === 0, ...r }));
        } catch (e) {
          console.error(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
        }
      })(),
    );
  },

  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (url.pathname === "/relay" && req.method === "POST") {
      try {
        return await relay(req, env);
      } catch (e) {
        return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
      }
    }
    if (url.pathname === "/sponsor") {
      try {
        return json({ address: (await signer(env)).address });
      } catch (e) {
        return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
      }
    }
    if (url.pathname === "/health" || url.pathname === "/price-book") {
      const cache = caches.default;
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const book = await readBook(env);
        if (!book) return json({ ok: false, error: "price book not found" }, 404);
        const body = url.pathname === "/health" ? { ok: book.ageSeconds < 180, updates: book.updates, lastPushAt: book.lastPushAt, ageSeconds: book.ageSeconds } : book;
        const res = json(body, 200, { "cache-control": "public, max-age=10" });
        ctx.waitUntil(cache.put(req, res.clone()));
        return res;
      } catch (e) {
        return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 502);
      }
    }
    return json({ ok: true, routes: ["/health", "/price-book", "/sponsor", "POST /relay"] });
  },
} satisfies ExportedHandler<Env>;
