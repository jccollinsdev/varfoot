// Captures real screenshots of every VarFoot screen for the demo-video brief.
// Run with the dev server up on :3000 — `node scripts/capture-screens.mjs`.
// Output: docs/screenshots/*.png  (430x900 phone frame centered on black, @2x)
import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs", "screenshots");
const BASE = "http://localhost:3000";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    defaultViewport: { width: 480, height: 948, deviceScaleFactor: 2 },
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();

  const shot = async (name) => {
    await sleep(650);
    // Hide the Next.js dev-tools badge so screenshots are clean.
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
    await page.screenshot({ path: join(OUT, `${name}.png`) });
    console.log("✓", name);
  };

  // Click the first button/link whose visible text matches (case-insensitive).
  const clickText = async (text, { exact = false } = {}) => {
    const ok = await page.evaluate(
      (t, ex) => {
        const els = [...document.querySelectorAll("button, a, [role=button]")];
        const hit = els.find((el) => {
          const s = (el.innerText || el.textContent || "").trim();
          return ex ? s.toLowerCase() === t.toLowerCase() : s.toLowerCase().includes(t.toLowerCase());
        });
        if (hit) { hit.click(); return true; }
        return false;
      },
      text,
      exact,
    );
    if (ok) await sleep(750);
    return ok;
  };

  const setLS = async (entries) => {
    await page.evaluate((e) => {
      for (const [k, v] of Object.entries(e)) {
        if (v === null) localStorage.removeItem(k);
        else localStorage.setItem(k, v);
      }
    }, entries);
  };

  // Reload into the populated demo athlete, landing on Today with the nav visible.
  const resetToToday = async () => {
    await setLS({ "varfoot.app-state": null, "varfoot.guest-mode": null });
    await page.reload({ waitUntil: "networkidle0" });
    await clickText("Explore demo athlete");
  };

  // ── 1. Auth / landing ──────────────────────────────────────────────
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await setLS({ "varfoot.app-state": null, "varfoot.guest-mode": null });
  await page.reload({ waitUntil: "networkidle0" });
  await shot("01-auth");

  // ── 2. Onboarding step 1 (identity) ────────────────────────────────
  await setLS({ "varfoot.guest-mode": "true", "varfoot.app-state": null });
  await page.reload({ waitUntil: "networkidle0" });
  await shot("02-onboarding");

  // ── 3. Onboarding step 2 (fill name → continue) ────────────────────
  const nameInput = await page.$(".vf-input");
  if (nameInput) {
    await nameInput.click();
    await nameInput.type("Sansar Karki", { delay: 25 });
    await sleep(300);
    await clickText("Continue");
    await shot("03-onboarding-step2");
  }

  // ── 4. Today (dashboard) ───────────────────────────────────────────
  await resetToToday();
  await shot("04-today");

  // ── 5. Plan (roadmap) ──────────────────────────────────────────────
  await clickText("Plan", { exact: true });
  await shot("05-plan");

  // ── 6. Train (drills + progress) ───────────────────────────────────
  await clickText("Train", { exact: true });
  await shot("06-train");

  // ── 7. Coach (AI) ──────────────────────────────────────────────────
  await clickText("Coach", { exact: true });
  await shot("07-coach");

  // ── 8. Fuel (nutrition) ────────────────────────────────────────────
  await clickText("Fuel", { exact: true });
  await shot("08-fuel");

  // ── 9. Meal builder (sub-screen of Fuel) ───────────────────────────
  if (await clickText("Log a meal")) await shot("09-meal-builder");

  // ── 10. Drill detail (sub-screen of Train) ─────────────────────────
  await resetToToday();
  await clickText("Train", { exact: true });
  {
    const opened = await page.evaluate(() => {
      const nav = new Set(["today", "plan", "train", "fuel", "coach"]);
      const btn = [...document.querySelectorAll("button")].find((b) => {
        const t = (b.innerText || "").trim().toLowerCase();
        return t && !nav.has(t) && t !== "sk" && b.offsetHeight > 56;
      });
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (opened) { await sleep(750); await shot("10-drill-detail"); }
  }

  // ── 11. Readiness + 12. Gap analysis (assessment) from Today ───────
  await resetToToday();
  if (await clickText("VARSITY READINESS")) {
    await shot("11-readiness");
    if (await clickText("gap")) await shot("12-gap-analysis");
  }

  // ── 13. Coach with a live AI answer (real Gemini response) ─────────
  await resetToToday();
  await clickText("Coach", { exact: true });
  if (await clickText("What should I work on first?")) {
    await sleep(9000); // let the streamed answer finish
    await shot("13-coach-chat");
  }

  // ── 14. Profile sheet ──────────────────────────────────────────────
  await resetToToday();
  if (await clickText("SK", { exact: true })) await shot("14-profile");

  await browser.close();
  console.log("\nAll screenshots saved to docs/screenshots/");
}

main().catch((e) => { console.error(e); process.exit(1); });
