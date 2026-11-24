/* eslint-disable @typescript-eslint/no-require-imports -- plain Node script (CommonJS) */
/**
 * Records the demo video from the real app (phone size, captions on screen).
 *   1. npx wrangler dev --config worker/wrangler.jsonc --port 8787   (game Worker)
 *   2. NEXT_PUBLIC_PRIVY_APP_ID=off NEXT_PUBLIC_GAME_API=http://localhost:8787 npm run build && npx serve out -l 3100
 *   3. node scripts/docs/record-demo.cjs   -> docs/media/bullxi-demo.webm (then ffmpeg to mp4)
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const B = process.env.APP_URL || "http://localhost:3100";
const OUT = path.resolve(__dirname, "../../docs/media");
const PROFILE = process.env.PROFILE_ID || "8hnidnTb6oHvMfmXz5WWwWtuG5JcBRDTHWZ9kYGV2xiR";

const CAPTION_JS = `
window.__cap = (title, body) => {
  let el = document.getElementById("__cap");
  if (!el) {
    el = document.createElement("div");
    el.id = "__cap";
    el.style.cssText = "position:fixed;left:12px;right:12px;top:12px;z-index:2147483647;padding:12px 14px;border-radius:18px;background:rgba(17,17,17,.92);color:#fff;font:600 14px/1.35 system-ui,sans-serif;box-shadow:0 12px 30px rgba(0,0,0,.35);transition:opacity .25s;pointer-events:none";
    document.documentElement.appendChild(el);
  }
  el.style.opacity = title ? "1" : "0";
  el.innerHTML = title ? '<div style="color:#ff8a5c;font-size:11px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:3px">' + title + '</div>' + (body || "") : "";
};`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    recordVideo: { dir: OUT, size: { width: 390, height: 844 } },
  });
  await ctx.addInitScript(CAPTION_JS);
  const page = await ctx.newPage();
  const cap = (t, b) => page.evaluate(([t, b]) => window.__cap(t, b), [t, b]);
  const wait = (ms) => page.waitForTimeout(ms);
  const scroll = async (y, steps = 12) => {
    for (let i = 0; i < steps; i++) {
      await page.mouse.wheel(0, y / steps);
      await wait(60);
    }
  };

  // 1. Landing
  await page.goto(B + "/");
  await wait(1200);
  await cap("BULL-XI", "Fantasy football for tokenized stocks. Built on Solana and MagicBlock.");
  await wait(3500);
  await scroll(900);
  await wait(1500);

  // 2. Build a squad
  await page.goto(B + "/app?demo=0");
  await wait(800);
  await page.goto(B + "/app/squad");
  await wait(1200);
  await cap("1. Pick 15 real stocks", "41 xStocks with live prices. Auto-pick builds a legal squad: 100 credits, 2/5/5/3, max 3 per sector.");
  await wait(2500);
  await page.getByRole("button", { name: /Auto-pick/ }).first().click();
  await wait(2500);
  const slot = page.getByRole("button", { name: /^[A-Z]+x$/ }).nth(4);
  await slot.click().catch(() => {});
  await cap("Live price, real chart", "Prices are the xStocks reference price. The same prices are written onchain every minute.");
  await wait(3500);
  await page.keyboard.press("Escape");
  await wait(600);

  // 3. Pick team + captain
  await page.goto(B + "/app/pick");
  await wait(1500);
  await cap("2. Starting XI and captain", "Captain scores double. Formation rules are enforced onchain, not just in the app.");
  await wait(3500);

  // 4. Lock = seal in the TEE
  await page.goto(B + "/app/lock");
  await wait(1500);
  await cap("3. Lock before kickoff", "No wallet, no SOL, no pop-ups. Guests play with a key kept on this device.");
  await wait(2000);
  await page.getByRole("button", { name: "Lock squad" }).last().click();
  await cap("Sealed in MagicBlock's Private ER", "The squad goes into a TEE rollup with a members-only permission. Rivals can't read it until kickoff.");
  await page.getByText("Sealed on Solana").waitFor({ timeout: 90000 }).catch(() => {});
  await wait(3500);

  // 5. Proof page
  await page.goto(B + "/proof");
  await wait(3000);
  await cap("4. Everything is checkable", "Live from devnet: price updates, squads, settled results, this hour's gameweek and its VRF golden stock.");
  await wait(3000);
  await scroll(700);
  await wait(2500);
  await cap("All MagicBlock pieces are load-bearing", "Private ER, VRF, cranks and commits, each doing real work.");
  await scroll(900);
  await wait(3000);

  // 6. Live (demo replay)
  await page.goto(B + "/app?demo=1");
  await wait(2000);
  await page.goto(B + "/app/lock");
  await page.getByRole("button", { name: /Demo: start now/ }).last().waitFor({ timeout: 15000 }).catch(() => {});
  await wait(800);
  await page.getByRole("button", { name: /Demo: start now/ }).last().click().catch(() => {});
  await page.waitForURL("**/app/live").catch(() => {});
  await cap("5. Live gameweek", "Points move with prices. The golden stock (★) drawn by VRF scores double. Demo replay shown at 10x.");
  await wait(7000);
  await scroll(500);
  await wait(3500);

  // 7. Settled onchain, public profile
  await page.goto(B + "/app/manager?id=" + PROFILE);
  await page.getByText("Results").first().waitFor({ timeout: 15000 }).catch(() => {});
  await wait(2500);
  await cap("6. Settled on Solana", "At full time the program scores every squad and commits results. Anyone can verify them.");
  await wait(4500);
  await cap("BULL-XI", "Seal. Reveal. Score. Settle. Onchain, every hour.");
  await wait(3500);

  const video = page.video();
  await ctx.close();
  const file = await video.path();
  fs.renameSync(file, path.join(OUT, "bullxi-demo.webm"));
  await browser.close();
  console.log("wrote", path.join(OUT, "bullxi-demo.webm"));
})();
