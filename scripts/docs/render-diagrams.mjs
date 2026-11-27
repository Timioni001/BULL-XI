// Renders docs/diagrams/diagrams.html and howto.html sections to docs/images/*.png (2x).
//   node scripts/docs/render-diagrams.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright"); // preinstalled or devDependency
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1300, height: 900 }, deviceScaleFactor: 2 });
for (const [file, ids] of [
  ["diagrams.html", ["architecture", "gameweek", "relay", "pricebook", "money"]],
  ["howto.html", ["hero", "howto-build", "howto-play", "howto-pro"]],
]) {
  await page.setViewportSize({ width: file === "howto.html" ? 1500 : 1300, height: 900 });
  await page.goto("file://" + path.join(root, "docs/diagrams", file));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  for (const id of ids) {
    await page.locator(`#${id}`).screenshot({ path: path.join(root, `docs/images/${id}.png`) });
    console.log("wrote", `docs/images/${id}.png`);
  }
}
await browser.close();
