#!/usr/bin/env node
// Generates PNG PWA / home-screen icons from public/varfoot-mark.svg.
// The mark is a self-contained navy (#0D1C28) rounded square with the V-cleat,
// so we flatten onto that same navy to fill the square corners (iOS applies its
// own rounding) and produce a padded maskable variant for Android safe zones.
//
// Run with: node scripts/generate-icons.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");
const SVG = readFileSync(join(PUBLIC, "varfoot-mark.svg"));
const NAVY = "#0D1C28";

/** Render the SVG to a crisp square PNG buffer at `size`px. */
async function renderSvg(size) {
  return sharp(SVG, { density: 384 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

/** Full-bleed icon: SVG flattened onto navy so the square corners are filled. */
async function makeFlat(size, out) {
  const logo = await renderSvg(size);
  await sharp({ create: { width: size, height: size, channels: 4, background: NAVY } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(join(PUBLIC, out));
  console.log(`  ${out}  (${size}x${size})`);
}

/** Maskable icon: logo scaled to ~80% on a full navy field so it survives circle/squircle crops. */
async function makeMaskable(size, out) {
  const inner = Math.round(size * 0.8);
  const logo = await renderSvg(inner);
  await sharp({ create: { width: size, height: size, channels: 4, background: NAVY } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(join(PUBLIC, out));
  console.log(`  ${out}  (${size}x${size}, maskable safe zone)`);
}

console.log("Generating VarFoot icons:");
await makeFlat(180, "apple-touch-icon.png");
await makeFlat(192, "icon-192.png");
await makeFlat(512, "icon-512.png");
await makeMaskable(512, "icon-maskable-512.png");
console.log("Done.");
