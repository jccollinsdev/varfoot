// Headless smoke test of the live deployment: loads varfoot.vercel.app,
// clicks "Explore demo athlete", and reports the rendered text + key screens.
import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs", "live-verify");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "https://varfoot.vercel.app";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    defaultViewport: { width: 430, height: 932, deviceScaleFactor: 2 },
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await sleep(800);
  const authText = await page.evaluate(() => document.body.innerText);
  console.log("=== AUTH SCREEN TEXT ===");
  console.log(authText.slice(0, 600));
  await page.screenshot({ path: join(OUT, "01-auth.png") });

  const clicked = await page.evaluate(() => {
    const els = [...document.querySelectorAll("button, a, [role=button]")];
    const hit = els.find((el) =>
      /explore demo athlete/i.test((el.innerText || "").trim())
    );
    if (hit) { hit.click(); return true; }
    return false;
  });
  console.log("\nClicked demo athlete CTA:", clicked);
  await sleep(2500);
  const todayText = await page.evaluate(() => document.body.innerText);
  console.log("\n=== AFTER DEMO LOAD (Today) ===");
  console.log(todayText.slice(0, 900));
  await page.screenshot({ path: join(OUT, "02-today.png") });

  const hasSansar = /sansar/i.test(todayText);
  const hasVarFooty = /varfooty/i.test(authText + todayText);
  console.log("\n=== SIGNALS ===");
  console.log("mentions Sansar:", hasSansar);
  console.log("leaks 'VarFooty':", hasVarFooty);
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
