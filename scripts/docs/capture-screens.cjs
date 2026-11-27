/* eslint-disable @typescript-eslint/no-require-imports -- plain Node script (CommonJS) */
/**
 * Captures the "how to use" screenshots for the README (390x844, 2x), using
 * the real app against devnet (sealing, Pro and leagues are real transactions).
 *   APP_URL: build with NEXT_PUBLIC_PRIVY_APP_ID=off (device account), served locally
 *   GATE_URL: normal build (shows the sign-in screen)
 *   node scripts/docs/capture-screens.cjs  -> docs/images/screens/*.png
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const APP = process.env.APP_URL || "http://localhost:3101";
const GATE = process.env.GATE_URL || "http://localhost:3102";
const PROFILE = process.env.PROFILE_ID || "BX1cRWN4g1WvPAVBbyzUR2iSqnjesvc9E4d2QH1bARzW";
const OUT = path.resolve(__dirname, "../../docs/images/screens");
fs.mkdirSync(OUT, { recursive: true });

const phone = (b) => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: "light" });
const shot = async (page, name) => {
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log("shot", name);
};
const quiet = (page) => page.evaluate(() => document.querySelectorAll("[data-sonner-toaster]").forEach((t) => ((t).style.display = "none")));

(async () => {
  const b = await chromium.launch();

  // 1. Sign-in
  {
    const ctx = await phone(b);
    const p = await ctx.newPage();
    await p.goto(GATE + "/app/squad");
    await p.getByText(/Sign in to play/i).waitFor({ timeout: 30000 });
    await p.waitForTimeout(800);
    await shot(p, "01-signin");
    await ctx.close();
  }

  // 2-5, 9-12: one player (device account) through the whole flow
  const ctx = await phone(b);
  const p = await ctx.newPage();
  await p.goto(APP + "/app?demo=0");
  await p.evaluate(() => localStorage.clear());
  await p.goto(APP + "/app/squad");
  await p.getByRole("button", { name: /Auto-pick/ }).first().click({ timeout: 30000 });
  await p.waitForTimeout(1500);
  await quiet(p);
  await shot(p, "02-squad");

  await p.getByRole("button", { name: /Why this squad/ }).first().click();
  await p.waitForTimeout(7000);
  await shot(p, "03-thesis");
  await p.keyboard.press("Escape");

  await p.goto(APP + "/app/pick");
  await p.waitForTimeout(2500);
  await p.getByRole("button", { name: /^[A-Z]+x$/ }).nth(4).click();
  await p.waitForTimeout(1200);
  await shot(p, "04-captain");
  await p.keyboard.press("Escape");

  await p.goto(APP + "/app/lock");
  await p.waitForTimeout(2000);
  await p.getByRole("button", { name: "Lock squad" }).last().click();
  await p.getByText("Sealed on Solana").waitFor({ timeout: 120000 });
  await p.waitForTimeout(1500);
  await quiet(p);
  await shot(p, "05-sealed");

  await p.goto(APP + "/app/pro");
  await p.getByRole("button", { name: /Claim \$1,000/ }).last().click({ timeout: 30000 });
  await p.getByText("Portfolio value").waitFor({ timeout: 150000 });
  await p.getByRole("button", { name: /Invest \$250/ }).last().click();
  await p.getByText(/shares/).first().waitFor({ timeout: 120000 });
  await p.waitForTimeout(2500);
  await quiet(p);
  await p.evaluate(() => window.scrollTo(0, 420));
  await p.waitForTimeout(600);
  await shot(p, "09-pro");
  await p.evaluate(() => window.scrollTo(0, 1300));
  await p.waitForTimeout(600);
  await shot(p, "10-holdings");

  await p.goto(APP + "/app/leagues");
  await p.waitForTimeout(3000);
  await p.getByRole("button", { name: /Create league/ }).first().click();
  await p.waitForTimeout(700);
  await p.getByPlaceholder("Office Legends").fill("Desk Bulls");
  await p.getByRole("radio", { name: "$5" }).click();
  await p.waitForTimeout(600);
  await shot(p, "11-create-league");
  await p.getByRole("button", { name: /^Create league$/ }).last().click();
  await p.waitForURL("**/app/friends**", { timeout: 180000 });
  await p.getByText(/Pot/).first().waitFor({ timeout: 30000 });
  await p.waitForTimeout(4000);
  await quiet(p);
  await shot(p, "12-league-pot");
  await ctx.close();

  // 6. Live gameweek (demo replay)
  {
    const c = await phone(b);
    const q = await c.newPage();
    await q.goto(APP + "/app?demo=0");
    await q.goto(APP + "/app/squad");
    await q.getByRole("button", { name: /Auto-pick/ }).first().click({ timeout: 30000 });
    await q.waitForTimeout(800);
    await q.goto(APP + "/app?demo=1");
    await q.waitForTimeout(1500);
    await q.goto(APP + "/app/lock");
    await q.getByRole("button", { name: "Lock squad" }).last().click({ timeout: 20000 });
    await q.getByRole("button", { name: /Demo: start now/ }).last().click({ timeout: 20000 });
    await q.waitForURL("**/app/live");
    await q.waitForTimeout(9000);
    await quiet(q);
    await shot(q, "06-live");
    await c.close();
  }

  // 7. Public results, 8. proof
  {
    const c = await phone(b);
    const q = await c.newPage();
    await q.goto(APP + "/app/manager?id=" + PROFILE);
    await q.getByText("Results").first().waitFor({ timeout: 30000 }).catch(() => {});
    await q.waitForTimeout(2500);
    await shot(q, "07-results");
    await q.goto(APP + "/proof");
    await q.waitForTimeout(7000);
    await shot(q, "08-proof");
    await c.close();
  }
  await b.close();
})();
