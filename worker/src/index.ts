/**
 * BULL-XI price pusher (Cloudflare Worker, free plan).
 *
 * Cron, every minute: one batched fetch of real xStock prices, one signed
 * transaction to our price book on the MagicBlock Ephemeral Rollup.
 * Once a day (00:00 UTC, the daily gameweek boundary) the same transaction
 * also commits the price book to Solana. Commits are rationed on purpose: with
 * a plain payer the ER accepts only 10 commits per delegation, while pushes on
 * the rollup itself are free and unlimited.
 *
 * HTTP:
 *   GET /health      last push as seen onchain
 *   GET /price-book  decoded price book from the rollup (cached 10s)
 *
 * Secrets: PUSHER_KEY (devnet-only key, JSON byte array) via `wrangler secret put`.
 */
import { createKeyPairSignerFromBytes, createSolanaRpc } from "@solana/kit";
import { decodePriceBook, priceBookAddress } from "../../lib/onchain/price-book";
import { pushOnce } from "../../lib/onchain/pusher";
import { PRICE_BOOK_STOCKS } from "../../lib/onchain/universe";

interface Env {
  PUSHER_KEY: string;
  ER_RPC: string;
  PRICE_URL: string;
  NETWORK: string;
}

const cors = { "access-control-allow-origin": "*", "content-type": "application/json" };

async function signer(env: Env) {
  return createKeyPairSignerFromBytes(new Uint8Array(JSON.parse(env.PUSHER_KEY) as number[]));
}

async function readBook(env: Env) {
  const rpc = createSolanaRpc(env.ER_RPC);
  const address = await priceBookAddress();
  const info = await rpc.getAccountInfo(address, { encoding: "base64" }).send();
  if (!info.value) return null;
  const bytes = Uint8Array.from(atob(info.value.data[0]), (c) => c.charCodeAt(0));
  const book = decodePriceBook(bytes);
  return {
    address,
    network: env.NETWORK,
    updates: book.updates,
    lastPushAt: book.lastTs * 1000,
    ageSeconds: Math.max(0, Math.round(Date.now() / 1000 - book.lastTs)),
    stocks: book.prices.map((p, i) => ({ ticker: PRICE_BOOK_STOCKS[i]?.[0], price: p })),
  };
}

export default {
  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext) {
    const t = new Date(event.scheduledTime);
    const commit = t.getUTCHours() === 0 && t.getUTCMinutes() === 0;
    ctx.waitUntil(
      (async () => {
        try {
          const r = await pushOnce({ signer: await signer(env), erRpc: env.ER_RPC, priceUrl: env.PRICE_URL, commit });
          console.log(JSON.stringify({ ok: true, ...r }));
        } catch (e) {
          // Shows up in Workers Logs and `wrangler tail`.
          console.error(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
        }
      })(),
    );
  },

  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/health" || url.pathname === "/price-book") {
      const cache = caches.default;
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const book = await readBook(env);
        if (!book) return new Response(JSON.stringify({ ok: false, error: "price book not found" }), { status: 404, headers: cors });
        const body = url.pathname === "/health" ? { ok: book.ageSeconds < 180, updates: book.updates, lastPushAt: book.lastPushAt, ageSeconds: book.ageSeconds } : book;
        const res = new Response(JSON.stringify(body), { headers: { ...cors, "cache-control": "public, max-age=10" } });
        ctx.waitUntil(cache.put(req, res.clone()));
        return res;
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), { status: 502, headers: cors });
      }
    }
    return new Response(JSON.stringify({ ok: true, routes: ["/health", "/price-book"] }), { headers: cors });
  },
} satisfies ExportedHandler<Env>;
