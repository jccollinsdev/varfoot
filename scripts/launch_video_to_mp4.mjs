// Convert the standalone HTML launch video (deterministic 40s timeline,
// 1080x1920 portrait) into a clean MP4 by stepping its global clock frame by
// frame in headless Chrome and assembling the frames with ffmpeg.
//
//   node scripts/launch_video_to_mp4.mjs
//
// Source : ~/Downloads/VarFoot Launch Video Player.html
// Output : demo/varfoot-launch-40s.mp4  (H.264, 30fps, yuv420p, silent)
import puppeteer from "puppeteer-core";
import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(homedir(), "Downloads", "VarFoot Launch Video Player.html");
const FRAMES = join(ROOT, ".launch-frames");
const OUT = join(ROOT, "demo", "varfoot-launch-40s.mp4");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FPS = 30;
const W = 1080;
const H = 1920;

const run = (cmd, args) =>
  new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "inherit", "inherit"] });
    p.on("close", (c) => (c === 0 ? res() : rej(new Error(`${cmd} exited ${c}`))));
  });

async function main() {
  if (!existsSync(SRC)) throw new Error(`Source not found: ${SRC}`);
  await rm(FRAMES, { recursive: true, force: true });
  await mkdir(FRAMES, { recursive: true });
  await mkdir(dirname(OUT), { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
    args: ["--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb"],
  });
  const page = await browser.newPage();
  await page.goto(pathToFileURL(SRC).href, { waitUntil: "networkidle0" });

  // Read the timeline duration, freeze the clock, neutralize the fit-to-window
  // scale, and hide the player controls so frames are pixel-exact 1080x1920.
  const DUR = await page.evaluate(() => {
    // eslint-disable-next-line no-undef
    playing = false;
    const stage = document.getElementById("stage");
    stage.style.transform = "scale(1)";
    document.getElementById("ctrl").style.display = "none";
    return typeof DUR !== "undefined" ? DUR : 40; // eslint-disable-line no-undef
  });
  await page.evaluate(() => document.fonts.ready);

  const totalFrames = Math.round(DUR * FPS);
  console.log(`Rendering ${totalFrames} frames @ ${FPS}fps (${DUR}s)…`);
  for (let f = 0; f < totalFrames; f++) {
    const t = f / FPS;
    await page.evaluate((tt) => {
      // eslint-disable-next-line no-undef
      t = tt;
      // eslint-disable-next-line no-undef
      update();
    }, t);
    const name = String(f).padStart(5, "0");
    await page.screenshot({
      path: join(FRAMES, `f_${name}.png`),
      clip: { x: 0, y: 0, width: W, height: H },
    });
    if (f % 60 === 0) console.log(`  ${f}/${totalFrames}`);
  }
  await browser.close();

  console.log("Encoding MP4…");
  await run("ffmpeg", [
    "-y",
    "-framerate", String(FPS),
    "-i", join(FRAMES, "f_%05d.png"),
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    OUT,
  ]);
  await rm(FRAMES, { recursive: true, force: true });
  console.log(`✓ ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
