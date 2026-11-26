/* eslint-disable @typescript-eslint/no-require-imports -- plain Node script */
/**
 * Records crisp app clips for the film at iPhone 15 Pro size (393 wide, 3x), 798 tall: the
 * screen below the status bar and Dynamic Island, which the film draws.
 * Uses the Chrome DevTools screencast so frames are full resolution, then
 * ffmpeg turns each clip into a constant 30 fps mp4 in video/public/clips.
 *
 *   APP_URL=http://localhost:3101 (build with NEXT_PUBLIC_PRIVY_APP_ID=off)
 *   GATE_URL=http://localhost:3102 (normal build, shows the sign-in screen)
 *   node video/scripts/record-clips.cjs [clip ...]
 */
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const APP = process.env.APP_URL || "http://localhost:3101";
const GATE = process.env.GATE_URL || "http://localhost:3102";
const PROFILE = process.env.PROFILE_ID || "BX1cRWN4g1WvPAVBbyzUR2iSqnjesvc9E4d2QH1bARzW";
const OUT = path.resolve(__dirname, "../public/clips");
const TMP = path.resolve(__dirname, "../.frames");
const FPS = 30;

/** Shows a soft touch ripple wherever the page is tapped, like a screen recording on a phone. */
const TOUCH_JS = `
addEventListener("pointerdown", (e) => {
  const d = document.createElement("div");
  d.style.cssText = "position:fixed;z-index:2147483647;pointer-events:none;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(120,120,120,.35);border:2px solid rgba(255,255,255,.8);transform:scale(.6);opacity:1;transition:transform .45s ease-out,opacity .45s ease-out;left:" + e.clientX + "px;top:" + e.clientY + "px";
  document.documentElement.appendChild(d);
  requestAnimationFrame(() => { d.style.transform = "scale(1.4)"; d.style.opacity = "0"; });
  setTimeout(() => d.remove(), 600);
}, true);`;

async function newPhone(browser) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 798 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: "light" });
  await ctx.addInitScript(TOUCH_JS);
  const page = await ctx.newPage();
  return { ctx, page };
}

/** Starts a screencast; returns stop() which writes <name>.mp4. */
async function record(page, name) {
  const cdp = await page.context().newCDPSession(page);
  const dir = path.join(TMP, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const frames = [];
  cdp.on("Page.screencastFrame", async (f) => {
    const file = path.join(dir, `${String(frames.length).padStart(5, "0")}.jpg`);
    fs.writeFileSync(file, Buffer.from(f.data, "base64"));
    frames.push({ file, t: f.metadata.timestamp });
    await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1179, maxHeight: 2394, everyNthFrame: 1 });
  const started = Date.now() / 1000;
  return async () => {
    await page.waitForTimeout(300);
    await cdp.send("Page.stopScreencast").catch(() => {});
    const ended = Date.now() / 1000;
    if (!frames.length) throw new Error(`no frames for ${name}`);
    // Constant frame rate: hold each frame until the next one arrives, scaled so
    // the clip lasts exactly as long as the wall-clock recording.
    const raw = frames.map((f, i) => Math.max(0.001, (frames[i + 1]?.t ?? frames[i].t + 1 / FPS) - f.t));
    const k = (ended - started) / raw.reduce((a, b) => a + b, 0);
    const list = frames.map((f, i) => `file '${f.file}'\nduration ${(raw[i] * k).toFixed(4)}`).join("\n");
    fs.writeFileSync(path.join(dir, "list.txt"), `${list}\nfile '${frames.at(-1).file}'\n`);
    fs.mkdirSync(OUT, { recursive: true });
    const out = path.join(OUT, `${name}.mp4`);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(dir, "list.txt"), "-vf", `fps=${FPS},scale=1178:2394:flags=lanczos,format=yuv420p`, "-c:v", "libx264", "-crf", "16", "-preset", "slow", out]);
    console.log("clip", name, `${(ended - started).toFixed(1)}s`, frames.length, "frames");
  };
}

const wait = (page, ms) => page.waitForTimeout(ms);
const scroll = (page, y) => page.evaluate((y) => window.scrollBy({ top: y, behavior: "smooth" }), y);

const CLIPS = {
  /** Sign-in screen (normal build) */
  async signin(browser) {
    const { ctx, page } = await newPhone(browser);
    await page.goto(GATE + "/app/squad");
    await page.getByText(/Sign in to play/i).waitFor({ timeout: 20000 });
    await wait(page, 600);
    const stop = await record(page, "signin");
    await wait(page, 1800);
    await page.locator("main button").first().click();
    await wait(page, 3200);
    await stop();
    await ctx.close();
  },

  /** Empty squad, Auto-pick fills the pitch, then on to Pick team */
  async squad(browser) {
    const { ctx, page } = await newPhone(browser);
    await page.goto(APP + "/app?demo=0");
    await wait(page, 800);
    await page.evaluate(() => localStorage.clear());
    await page.goto(APP + "/app/squad");
    await page.getByRole("button", { name: /Auto-pick/ }).first().waitFor({ timeout: 20000 });
    await wait(page, 1200);
    const stop = await record(page, "squad");
    await wait(page, 1200);
    await page.getByRole("button", { name: /Auto-pick/ }).first().click();
    await wait(page, 2600);
    await page.getByRole("button", { name: /Shuffle/ }).first().click().catch(() => {});
    await wait(page, 2400);
    await stop();
    await ctx.close();
  },

  /** Pick team: give the armband */
  async pick(browser) {
    const { ctx, page } = await newPhone(browser);
    await page.goto(APP + "/app?demo=0");
    await page.goto(APP + "/app/squad");
    await page.getByRole("button", { name: /Auto-pick/ }).first().click({ timeout: 20000 });
    await wait(page, 800);
    await page.goto(APP + "/app/pick");
    await wait(page, 2000);
    const stop = await record(page, "pick");
    await wait(page, 1500);
    await page.getByRole("button", { name: /^[A-Z]+x$/ }).nth(4).click({ timeout: 5000 }).catch(() => {});
    await wait(page, 1600);
    await page.locator("button:visible", { hasText: /Make captain/ }).first().click({ timeout: 5000 }).catch((e) => console.log("captain", e.message.split("\n")[0]));
    await wait(page, 2200);
    await stop();
    await ctx.close();
  },

  /** Lock: the squad is sealed on Solana for real (devnet, via the live game Worker) */
  async lock(browser) {
    const { ctx, page } = await newPhone(browser);
    await page.goto(APP + "/app?demo=0");
    await page.evaluate(() => localStorage.clear());
    await page.goto(APP + "/app?demo=0");
    await page.goto(APP + "/app/squad");
    await page.getByRole("button", { name: /Auto-pick/ }).first().click({ timeout: 20000 });
    await wait(page, 800);
    await page.goto(APP + "/app/lock");
    await wait(page, 2500);
    const stop = await record(page, "lock");
    await wait(page, 1500);
    await page.getByRole("button", { name: "Lock squad" }).last().click();
    await page.getByText("Sealed on Solana").waitFor({ timeout: 90000 });
    await wait(page, 2500);
    await stop();
    await ctx.close();
  },

  /** Live gameweek (demo replay, labelled in the app) */
  async live(browser) {
    const { ctx, page } = await newPhone(browser);
    await page.goto(APP + "/app?demo=0");
    await page.goto(APP + "/app/squad");
    await page.getByRole("button", { name: /Auto-pick/ }).first().click({ timeout: 20000 });
    await wait(page, 800);
    await page.goto(APP + "/app?demo=1");
    await wait(page, 1500);
    await page.goto(APP + "/app/lock");
    await page.getByRole("button", { name: "Lock squad" }).last().click({ timeout: 20000 });
    await page.getByRole("button", { name: /Demo: start now/ }).last().click({ timeout: 20000 });
    await page.waitForURL("**/app/live");
    await wait(page, 2500);
    const stop = await record(page, "live");
    await wait(page, 7000);
    await scroll(page, 420);
    await wait(page, 3500);
    await stop();
    await ctx.close();
  },

  /** Leagues table */
  async league(browser) {
    const { ctx, page } = await newPhone(browser);
    await page.goto(APP + "/app?demo=1");
    await page.goto(APP + "/app/leagues");
    await wait(page, 2500);
    const stop = await record(page, "league");
    await wait(page, 1500);
    await page.getByText(/SUNDAY LEAGUE/i).first().click().catch(() => {});
    await wait(page, 3500);
    await stop();
    await ctx.close();
  },

  /** /proof: live devnet numbers */
  async proof(browser) {
    const { ctx, page } = await newPhone(browser);
    await page.goto(APP + "/proof");
    await wait(page, 5000);
    const stop = await record(page, "proof");
    await wait(page, 2000);
    for (let i = 0; i < 3; i++) {
      await scroll(page, 380);
      await wait(page, 1600);
    }
    await stop();
    await ctx.close();
  },

  /** Auto-pick, then "Why this squad" with real moves */
  async thesis(browser) {
    const { ctx, page } = await newPhone(browser);
    await page.goto(APP + "/app?demo=0");
    await page.evaluate(() => localStorage.clear());
    await page.goto(APP + "/app/squad");
    await page.getByRole("button", { name: /Auto-pick/ }).first().click({ timeout: 20000 });
    await wait(page, 1500);
    await page.keyboard.press("Escape");
    const stop = await record(page, "thesis");
    await wait(page, 800);
    await page.getByRole("button", { name: /Why this squad/ }).first().click();
    await wait(page, 5000);
    await page.evaluate(() => document.querySelector("[data-vaul-drawer] .overflow-y-auto, [data-vaul-drawer] [class*=overflow]")?.scrollBy({ top: 700, behavior: "smooth" }));
    await wait(page, 3500);
    await stop();
    await ctx.close();
  },

  /** Go Pro: claim test dollars, invest the squad (real devnet, private rollup) */
  async pro(browser) {
    const { ctx, page } = await newPhone(browser);
    await page.goto(APP + "/app?demo=0");
    await page.evaluate(() => localStorage.clear());
    await page.goto(APP + "/app/squad");
    await page.getByRole("button", { name: /Auto-pick/ }).first().click({ timeout: 20000 });
    await wait(page, 800);
    await page.goto(APP + "/app/pro");
    await page.getByRole("button", { name: /Claim \$1,000/ }).last().waitFor({ timeout: 30000 });
    await wait(page, 1000);
    const stop = await record(page, "pro");
    await wait(page, 1200);
    await page.getByRole("button", { name: /Claim \$1,000/ }).last().click();
    await page.getByText("Portfolio value").waitFor({ timeout: 120000 });
    await wait(page, 1500);
    await page.getByRole("button", { name: /Invest \$250/ }).last().click();
    await page.getByText(/shares/).first().waitFor({ timeout: 90000 });
    await wait(page, 1500);
    await scroll(page, 500);
    await wait(page, 2500);
    await stop();
    await ctx.close();
  },

  /** Friends league: create with a $5 pot, land on the league page */
  async pot(browser) {
    const { ctx, page } = await newPhone(browser);
    await page.goto(APP + "/app?demo=0");
    await page.goto(APP + "/app/leagues");
    await wait(page, 2500);
    const stop = await record(page, "pot");
    await wait(page, 1000);
    await page.getByRole("button", { name: /Create league/ }).first().click();
    await wait(page, 800);
    await page.getByPlaceholder("Office Legends").fill("Desk Bulls");
    await wait(page, 600);
    await page.getByRole("radio", { name: "$5" }).click();
    await wait(page, 600);
    await page.getByRole("button", { name: /^Create league$/ }).last().click();
    await page.waitForURL("**/app/friends**", { timeout: 150000 });
    await page.getByText(/Pot/).first().waitFor({ timeout: 30000 });
    await wait(page, 3500);
    await stop();
    await ctx.close();
  },

  /** Public profile with results settled on Solana */
  async profile(browser) {
    const { ctx, page } = await newPhone(browser);
    await page.goto(APP + "/app/manager?id=" + PROFILE);
    await page.getByText("Results").first().waitFor({ timeout: 30000 }).catch(() => {});
    await wait(page, 2000);
    const stop = await record(page, "profile");
    await wait(page, 2200);
    await scroll(page, 400);
    await wait(page, 2500);
    await stop();
    await ctx.close();
  },
};

(async () => {
  const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CLIPS);
  const browser = await chromium.launch();
  for (const n of names) {
    try {
      await CLIPS[n](browser);
    } catch (e) {
      console.log("FAILED", n, e.message.split("\n")[0]);
    }
  }
  await browser.close();
  fs.rmSync(TMP, { recursive: true, force: true });
})();
