#!/usr/bin/env node
// Capture the 5 app screens used by the pitch deck / demo reel, loaded with the
// "Explore demo athlete" profile (Sansar Karki, incoming freshman chasing varsity).
// Drives the locally-installed Google Chrome via puppeteer-core against the dev
// server (default http://localhost:3000). Saves 390x844 @2x PNGs to public/screenshots.
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const OUT = join(ROOT, "public", "screenshots");
const URL_BASE = process.env.PREVIEW_URL || "http://localhost:3000";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// nav index -> output file (bottom-nav order: Today, Plan, Train, Fuel, Coach)
const TABS = [
  { idx: 0, file: "01-today.png" },
  { idx: 1, file: "02-roadmap.png" },
  { idx: 2, file: "03-progress.png" },
  { idx: 3, file: "04-nutrition.png" },
  { idx: 4, file: "05-coach.png" },
];

await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--hide-scrollbars", "--force-color-profile=srgb"],
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2 },
});

try {
  const page = await browser.newPage();
  await page.goto(URL_BASE, { waitUntil: "networkidle2" });

  // Start from a clean slate, then load the demo athlete.
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload({ waitUntil: "networkidle2" });

  // Hide the Next.js dev-tools overlay so it never lands in a shot.
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });

  await page.waitForSelector("button.vf-btn-ghost", { timeout: 15000 });
  await page.click("button.vf-btn-ghost");
  await page.waitForSelector(".bottom-nav button", { timeout: 15000 });
  await sleep(1200); // let charts/rings animate in

  for (const { idx, file } of TABS) {
    await page.evaluate((i) => {
      const btns = document.querySelectorAll(".bottom-nav button");
      btns[i]?.click();
    }, idx);
    await sleep(900);
    // ensure scrolled to top for a consistent frame
    await page.evaluate(() => {
      const sc = document.querySelector('[class*="phone-column"], main, body');
      window.scrollTo(0, 0);
      if (sc) sc.scrollTop = 0;
    });
    await sleep(400);
    await page.screenshot({ path: join(OUT, file), type: "png" });
    console.log("wrote", file);
  }
} finally {
  await browser.close();
}
