#!/usr/bin/env node
// Generates one consistent, dark-mode, neon-green SVG diagram per catalog drill into public/drills/.
// Run with: node scripts/generate-drill-diagrams.mjs
//
// Style contract (see docs/drill-asset-manifest.md):
//   - 360x240 card, dark fill (#101216) + subtle border, rounded corners
//   - neon green (#39ff73) = the primary movement / action / target
//   - muted gray/white (#9aa1a9 / #c7cbd1) = player figures, equipment, static lines
//   - amber accent (#ff9d4d) = secondary cues: arrows, cones, defenders, partner figures
//   - every diagram ends with a small uppercase caption naming the drill's core action

import { mkdirSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "drills");

const COLORS = {
  bg: "#101216",
  panel: "#15181c",
  border: "#262a30",
  green: "#39ff73",
  greenDim: "rgba(57,255,115,0.22)",
  greenLine: "rgba(57,255,115,0.45)",
  mute: "#9aa1a9",
  mute2: "#c7cbd1",
  faint: "#4a4f57",
  amber: "#ff9d4d",
};

const W = 360;
const H = 240;

// ───────────────────────────── primitives ─────────────────────────────

const arrowMarker = `
  <marker id="arrowGreen" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0,0 L10,5 L0,10 Z" fill="${COLORS.green}" />
  </marker>
  <marker id="arrowAmber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0,0 L10,5 L0,10 Z" fill="${COLORS.amber}" />
  </marker>
  <marker id="arrowMute" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M0,0 L10,5 L0,10 Z" fill="${COLORS.mute}" />
  </marker>`;

function frame(title, body, caption) {
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(title)} diagram">
  <defs>${arrowMarker}</defs>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="16" fill="${COLORS.bg}" stroke="${COLORS.border}" />
  <rect x="14" y="14" width="${W - 28}" height="${H - 56}" rx="12" fill="${COLORS.panel}" stroke="${COLORS.border}" stroke-width="1" />
  <g>${body}</g>
  <text x="${W / 2}" y="${H - 20}" text-anchor="middle" fill="${COLORS.mute2}" font-family="Nunito, -apple-system, sans-serif" font-size="12" font-weight="800" letter-spacing="0.04em">${esc(caption)}</text>
</svg>`;
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function ball(x, y, r = 7, fill = COLORS.mute2) {
  return `<g>
    <circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" />
    <path d="M${x - r * 0.5} ${y - r * 0.2} l${r * 0.5} ${-r * 0.45} l${r * 0.5} ${r * 0.45} l${-r * 0.2} ${r * 0.55} h${-r * 0.6} Z" fill="${COLORS.bg}" opacity="0.55" />
  </g>`;
}

function cone(x, y, scale = 1, color = COLORS.amber) {
  const w = 11 * scale, h = 16 * scale;
  return `<g>
    <path d="M${x} ${y - h} L${x + w / 2} ${y} L${x - w / 2} ${y} Z" fill="${color}" opacity="0.92" />
    <rect x="${x - w / 2 - 1.5}" y="${y}" width="${w + 3}" height="${2.4 * scale}" rx="1.2" fill="${color}" opacity="0.6" />
  </g>`;
}

// Minimal "pin" figure — circle head + posture line. dir: 1 = facing right, -1 = facing left.
function figure(x, y, { color = COLORS.mute2, dir = 1, pose = "stand", label } = {}) {
  let limbs = "";
  if (pose === "stand") {
    limbs = `
      <line x1="${x}" y1="${y - 16}" x2="${x}" y2="${y - 2}" stroke="${color}" stroke-width="2.4" stroke-linecap="round" />
      <line x1="${x}" y1="${y - 11}" x2="${x + dir * 7}" y2="${y - 4}" stroke="${color}" stroke-width="2.2" stroke-linecap="round" />
      <line x1="${x}" y1="${y - 2}" x2="${x - 5}" y2="${y + 12}" stroke="${color}" stroke-width="2.4" stroke-linecap="round" />
      <line x1="${x}" y1="${y - 2}" x2="${x + dir * 7}" y2="${y + 12}" stroke="${color}" stroke-width="2.4" stroke-linecap="round" />`;
  } else if (pose === "low") {
    limbs = `
      <line x1="${x}" y1="${y - 12}" x2="${x - dir * 2}" y2="${y - 1}" stroke="${color}" stroke-width="2.4" stroke-linecap="round" />
      <line x1="${x - dir * 2}" y1="${y - 7}" x2="${x + dir * 8}" y2="${y - 10}" stroke="${color}" stroke-width="2.2" stroke-linecap="round" />
      <line x1="${x - dir * 2}" y1="${y - 1}" x2="${x - dir * 9}" y2="${y + 11}" stroke="${color}" stroke-width="2.4" stroke-linecap="round" />
      <line x1="${x - dir * 2}" y1="${y - 1}" x2="${x + dir * 6}" y2="${y + 12}" stroke="${color}" stroke-width="2.4" stroke-linecap="round" />`;
  } else if (pose === "run") {
    limbs = `
      <line x1="${x}" y1="${y - 15}" x2="${x + dir * 3}" y2="${y - 2}" stroke="${color}" stroke-width="2.4" stroke-linecap="round" />
      <line x1="${x + dir * 3}" y1="${y - 10}" x2="${x - dir * 8}" y2="${y - 14}" stroke="${color}" stroke-width="2.2" stroke-linecap="round" />
      <line x1="${x + dir * 3}" y1="${y - 10}" x2="${x + dir * 11}" y2="${y - 4}" stroke="${color}" stroke-width="2.2" stroke-linecap="round" />
      <line x1="${x + dir * 3}" y1="${y - 2}" x2="${x - dir * 7}" y2="${y + 5}" stroke="${color}" stroke-width="2.4" stroke-linecap="round" />
      <line x1="${x + dir * 3}" y1="${y - 2}" x2="${x + dir * 10}" y2="${y + 12}" stroke="${color}" stroke-width="2.4" stroke-linecap="round" />`;
  } else if (pose === "jump") {
    limbs = `
      <line x1="${x}" y1="${y - 16}" x2="${x}" y2="${y - 4}" stroke="${color}" stroke-width="2.4" stroke-linecap="round" />
      <line x1="${x}" y1="${y - 12}" x2="${x + dir * 9}" y2="${y - 17}" stroke="${color}" stroke-width="2.2" stroke-linecap="round" />
      <line x1="${x}" y1="${y - 12}" x2="${x - dir * 7}" y2="${y - 16}" stroke="${color}" stroke-width="2.2" stroke-linecap="round" />
      <line x1="${x}" y1="${y - 4}" x2="${x - 6}" y2="${y + 6}" stroke="${color}" stroke-width="2.4" stroke-linecap="round" />
      <line x1="${x}" y1="${y - 4}" x2="${x + 6}" y2="${y + 6}" stroke="${color}" stroke-width="2.4" stroke-linecap="round" />`;
  } else if (pose === "plank") {
    return `<g>
      <line x1="${x - 22}" y1="${y}" x2="${x + 16}" y2="${y}" stroke="${color}" stroke-width="2.6" stroke-linecap="round" />
      <line x1="${x - 22}" y1="${y}" x2="${x - 26}" y2="${y + 10}" stroke="${color}" stroke-width="2.4" stroke-linecap="round" />
      <line x1="${x + 16}" y1="${y}" x2="${x + 22}" y2="${y + 10}" stroke="${color}" stroke-width="2.4" stroke-linecap="round" />
      <line x1="${x - 16}" y1="${y}" x2="${x - 19}" y2="${y + 10}" stroke="${color}" stroke-width="2.4" stroke-linecap="round" />
      <circle cx="${x + 21}" cy="${y - 6}" r="6" fill="${color}" />
      ${label ? `<text x="${x - 4}" y="${y + 24}" text-anchor="middle" fill="${COLORS.mute}" font-family="Nunito, sans-serif" font-size="9" font-weight="800">${esc(label)}</text>` : ""}
    </g>`;
  } else if (pose === "wallsit") {
    return `<g>
      <line x1="${x}" y1="${y - 24}" x2="${x}" y2="${y - 8}" stroke="${color}" stroke-width="2.6" stroke-linecap="round" />
      <line x1="${x}" y1="${y - 8}" x2="${x + 14}" y2="${y - 8}" stroke="${color}" stroke-width="2.4" stroke-linecap="round" />
      <line x1="${x + 14}" y1="${y - 8}" x2="${x + 14}" y2="${y + 10}" stroke="${color}" stroke-width="2.4" stroke-linecap="round" />
      <circle cx="${x}" cy="${y - 30}" r="6" fill="${color}" />
      <line x1="${x}" y1="${y - 20}" x2="${x - 10}" y2="${y - 14}" stroke="${color}" stroke-width="2.2" stroke-linecap="round" />
      ${label ? `<text x="${x + 6}" y="${y + 24}" text-anchor="middle" fill="${COLORS.mute}" font-family="Nunito, sans-serif" font-size="9" font-weight="800">${esc(label)}</text>` : ""}
    </g>`;
  } else if (pose === "balance") {
    limbs = `
      <line x1="${x}" y1="${y - 16}" x2="${x}" y2="${y - 2}" stroke="${color}" stroke-width="2.4" stroke-linecap="round" />
      <line x1="${x}" y1="${y - 9}" x2="${x - 8}" y2="${y - 13}" stroke="${color}" stroke-width="2.2" stroke-linecap="round" />
      <line x1="${x}" y1="${y - 9}" x2="${x + 8}" y2="${y - 13}" stroke="${color}" stroke-width="2.2" stroke-linecap="round" />
      <line x1="${x}" y1="${y - 2}" x2="${x + 1}" y2="${y + 12}" stroke="${color}" stroke-width="2.4" stroke-linecap="round" />
      <path d="M${x - 6} ${y - 4} q 6 -8 12 0" stroke="${color}" stroke-width="2.2" fill="none" stroke-linecap="round" />`;
  }
  return `<g>
    <circle cx="${x}" cy="${y - 21}" r="6.4" fill="${color}" />
    ${limbs}
    ${label ? `<text x="${x}" y="${y + 24}" text-anchor="middle" fill="${COLORS.mute}" font-family="Nunito, sans-serif" font-size="9" font-weight="800">${esc(label)}</text>` : ""}
  </g>`;
}

function wall(x, y, w, h) {
  const rows = 3;
  const bricks = [];
  for (let r = 0; r < rows; r++) {
    const ry = y + (h / rows) * r;
    const offset = r % 2 === 0 ? 0 : (w / 4) / 2;
    bricks.push(`<line x1="${x}" y1="${ry}" x2="${x + w}" y2="${ry}" stroke="${COLORS.faint}" stroke-width="1" />`);
    for (let c = -1; c < 5; c++) {
      const cx = x + offset + c * (w / 4);
      if (cx > x && cx < x + w) bricks.push(`<line x1="${cx}" y1="${ry}" x2="${cx}" y2="${ry + h / rows}" stroke="${COLORS.faint}" stroke-width="1" />`);
    }
  }
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${COLORS.bg}" stroke="${COLORS.mute}" stroke-width="2" rx="2" />
    ${bricks.join("")}
  </g>`;
}

function goal(x, y, w, h) {
  const net = [];
  for (let i = 1; i < 5; i++) net.push(`<line x1="${x + (w / 5) * i}" y1="${y}" x2="${x + (w / 5) * i}" y2="${y + h}" stroke="${COLORS.faint}" stroke-width="1" />`);
  for (let i = 1; i < 4; i++) net.push(`<line x1="${x}" y1="${y + (h / 4) * i}" x2="${x + w}" y2="${y + (h / 4) * i}" stroke="${COLORS.faint}" stroke-width="1" />`);
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${COLORS.mute2}" stroke-width="2.4" />
    ${net.join("")}
    <line x1="${x}" y1="${y + h}" x2="${x + w}" y2="${y + h}" stroke="${COLORS.mute2}" stroke-width="2.4" />
  </g>`;
}

function arrow(x1, y1, x2, y2, { color = "green", dashed = false, curve = 0, width = 2.2 } = {}) {
  const marker = color === "green" ? "arrowGreen" : color === "amber" ? "arrowAmber" : "arrowMute";
  const stroke = color === "green" ? COLORS.green : color === "amber" ? COLORS.amber : COLORS.mute;
  let d = `M${x1} ${y1} L${x2} ${y2}`;
  if (curve) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - curve;
    d = `M${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
  }
  return `<path d="${d}" stroke="${stroke}" stroke-width="${width}" fill="none" stroke-linecap="round" ${dashed ? 'stroke-dasharray="5 4"' : ""} marker-end="url(#${marker})" />`;
}

function dashedSquare(x, y, w, h, color = COLORS.green) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" fill-opacity="0.08" stroke="${color}" stroke-width="1.6" stroke-dasharray="5 4" rx="3" />`;
}

function distanceLabel(x1, y, x2, text) {
  const midX = (x1 + x2) / 2;
  return `<g>
    <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${COLORS.faint}" stroke-width="1.4" stroke-dasharray="2 3" />
    <line x1="${x1}" y1="${y - 4}" x2="${x1}" y2="${y + 4}" stroke="${COLORS.faint}" stroke-width="1.4" />
    <line x1="${x2}" y1="${y - 4}" x2="${x2}" y2="${y + 4}" stroke="${COLORS.faint}" stroke-width="1.4" />
    <text x="${midX}" y="${y - 8}" text-anchor="middle" fill="${COLORS.mute}" font-family="'IBM Plex Mono', monospace" font-size="10" font-weight="600">${esc(text)}</text>
  </g>`;
}

function timerRing(cx, cy, r, pct, label) {
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.max(0, Math.min(1, pct));
  return `<g>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${COLORS.border}" stroke-width="6" />
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${COLORS.green}" stroke-width="6" stroke-linecap="round"
      stroke-dasharray="${dash} ${circ}" transform="rotate(-90 ${cx} ${cy})" />
    <text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="${COLORS.mute2}" font-family="'IBM Plex Mono', monospace" font-size="12" font-weight="800">${esc(label)}</text>
  </g>`;
}

function tag(x, y, text, color = COLORS.green) {
  const w = 13 + text.length * 6.1;
  return `<g>
    <rect x="${x}" y="${y - 13}" width="${w}" height="19" rx="9.5" fill="${color}" fill-opacity="0.14" stroke="${color}" stroke-opacity="0.5" />
    <text x="${x + w / 2}" y="${y + 1}" text-anchor="middle" fill="${color}" font-family="Nunito, sans-serif" font-size="10" font-weight="800" letter-spacing="0.03em">${esc(text)}</text>
  </g>`;
}

// ───────────────────────────── scenes ─────────────────────────────
// Each scene returns inner SVG markup for the 332x148 content area starting at (28, 28).

const scenes = {
  // Player passes into a wall and the rebound returns — used for all wall-based first-touch / weak-foot drills.
  wallRebound({ steps, note, behind }) {
    const wallX = 250, wallY = 50, wallW = 18, wallH = 96;
    const px = 90, py = 150;
    return `
      ${wall(wallX, wallY, wallW, wallH)}
      ${behind ? cone(56, 168, 0.85, COLORS.amber) : ""}
      ${figure(px, py, { dir: 1, pose: "stand", label: "You" })}
      ${ball(px + 26, py + 10, 6.5)}
      ${arrow(px + 30, py + 6, wallX - 6, wallY + wallH / 2 - 8, { color: "green", curve: -10 })}
      ${arrow(wallX - 6, wallY + wallH / 2 + 10, px + 16, py - 2, { color: "amber", dashed: true, curve: 14 })}
      ${distanceLabel(px - 16, 188, wallX, steps)}
      ${tag(190, 64, note ?? "REBOUND", COLORS.green)}
    `;
  },

  // Throw the ball up, let it drop, control it on the ground.
  throwAndControl({ note }) {
    const px = 110, py = 156;
    return `
      ${figure(px, py, { dir: 1, pose: "stand", label: "You" })}
      ${ball(px + 6, 60, 7)}
      <path d="M${px + 6} 60 q 30 60 30 86" stroke="${COLORS.green}" stroke-width="2.2" fill="none" stroke-dasharray="4 4" marker-end="url(#arrowGreen)" />
      ${dashedSquare(px - 6, 192, 60, 14, COLORS.green)}
      <text x="${px + 24}" y="202" text-anchor="middle" fill="${COLORS.mute2}" font-family="'IBM Plex Mono', monospace" font-size="9" font-weight="700">FIRST BOUNCE</text>
      ${tag(225, 70, note ?? "CUSHION & KILL", COLORS.green)}
      ${arrow(px + 36, 64, px + 70, 90, { color: "amber", curve: -16, dashed: true })}
      <text x="${px + 92}" y="86" fill="${COLORS.mute}" font-family="Nunito, sans-serif" font-size="9" font-weight="800">ABOVE HEAD HEIGHT</text>
    `;
  },

  // Two cones forming a gate, ball driven through from a distance.
  gatePass({ steps, gateLabel, lowArc }) {
    const px = 70, py = 160;
    const c1x = 248, c2x = 274, cy = 150;
    return `
      ${cone(c1x, cy, 1, COLORS.amber)}${cone(c2x, cy, 1, COLORS.amber)}
      <line x1="${c1x + 6}" y1="${cy - 2}" x2="${c2x - 6}" y2="${cy - 2}" stroke="${COLORS.green}" stroke-width="1.6" stroke-dasharray="3 3" />
      ${figure(px, py, { dir: 1, pose: "stand", label: "You" })}
      ${ball(px + 22, py + 12, 6.5)}
      ${lowArc
        ? arrow(px + 26, py + 8, (c1x + c2x) / 2, cy - 2, { color: "green", curve: -28 })
        : arrow(px + 26, py + 8, (c1x + c2x) / 2, cy - 2, { color: "green" })}
      ${distanceLabel(px - 14, 196, (c1x + c2x) / 2, steps)}
      ${tag(150, 70, gateLabel ?? "THROUGH THE GATE", COLORS.green)}
    `;
  },

  // Square target zone with a high looping ball landing inside it.
  targetSquare({ steps, squareLabel }) {
    const px = 64, py = 168;
    const sqX = 250, sqY = 78, sqW = 64, sqH = 50;
    return `
      ${dashedSquare(sqX, sqY, sqW, sqH, COLORS.green)}
      <text x="${sqX + sqW / 2}" y="${sqY + sqH / 2 + 4}" text-anchor="middle" fill="${COLORS.green}" font-family="'IBM Plex Mono', monospace" font-size="10" font-weight="800">${esc(squareLabel ?? "TARGET")}</text>
      ${figure(px, py, { dir: 1, pose: "stand", label: "You" })}
      ${ball(px + 22, py + 8, 6.5)}
      <path d="M${px + 24} ${py + 4} Q 200 18 ${sqX + sqW / 2} ${sqY + 6}" stroke="${COLORS.green}" stroke-width="2.2" fill="none" stroke-dasharray="5 4" marker-end="url(#arrowGreen)" />
      ${distanceLabel(px - 12, 200, sqX, steps)}
    `;
  },

  // A line of cones with a weaving dribble path (slalom / cone-cut / figure-8).
  coneWeave({ count, pattern, note }) {
    const startX = 64, endX = 296, y = 124;
    const n = count ?? 5;
    const cones = [];
    const pathPts = [];
    for (let i = 0; i < n; i++) {
      const cx = startX + (i * (endX - startX)) / (n - 1);
      cones.push(cone(cx, y, 0.92, COLORS.amber));
      const offset = pattern === "figure8" ? (i % 2 === 0 ? -22 : 22) : (i % 2 === 0 ? 20 : -20);
      pathPts.push(`${cx} ${y + offset}`);
    }
    const d = `M${pathPts[0]} ` + pathPts.slice(1).map((p) => `Q ${p.split(" ")[0]} ${y} ${p}`).join(" ");
    return `
      ${cones.join("")}
      <path d="${d}" stroke="${COLORS.green}" stroke-width="2.2" fill="none" stroke-dasharray="5 4" marker-end="url(#arrowGreen)" />
      ${ball(startX - 18, y + 18, 6.5)}
      ${figure(startX - 18, y + 36, { dir: 1, pose: "low", label: "Start" })}
      ${tag(132, 70, note ?? "WEAVE THROUGH", COLORS.green)}
    `;
  },

  // Square box — one player shielding the ball, an attacker pressing.
  shieldBox({ note, partner = true }) {
    const x = 110, y = 76, s = 96;
    return `
      ${dashedSquare(x, y, s, s, COLORS.mute)}
      ${cone(x, y, 0.8, COLORS.amber)}${cone(x + s, y, 0.8, COLORS.amber)}${cone(x, y + s, 0.8, COLORS.amber)}${cone(x + s, y + s, 0.8, COLORS.amber)}
      ${figure(x + s / 2 - 6, y + s / 2 + 14, { dir: 1, pose: "low", label: "You" })}
      ${ball(x + s / 2 + 8, y + s / 2 + 18, 6.5)}
      ${partner ? figure(x + s / 2 + 34, y + s / 2 + 8, { dir: -1, pose: "low", color: COLORS.amber, label: "Partner" }) : ""}
      ${tag(x + s / 2 - 34, y - 14, note ?? "SHIELD & HOLD", COLORS.green)}
      <path d="M${x + s / 2 + 14} ${y + s / 2 + 6} a 18 18 0 1 1 -2 -10" stroke="${COLORS.green}" stroke-width="1.8" fill="none" stroke-dasharray="3 3" marker-end="url(#arrowGreen)" opacity="0.8" />
    `;
  },

  // Sprint between two cones, with a directional arrow and turn marker.
  sprintLane({ steps, note, turn = false, withBall = false, partner = false }) {
    const c1x = 70, c2x = 290, y = 150;
    return `
      ${cone(c1x, y, 1, COLORS.mute)}${cone(c2x, y, 1, COLORS.amber)}
      <text x="${c1x}" y="${y + 28}" text-anchor="middle" fill="${COLORS.mute}" font-family="Nunito, sans-serif" font-size="9" font-weight="800">A</text>
      <text x="${c2x}" y="${y + 28}" text-anchor="middle" fill="${COLORS.mute}" font-family="Nunito, sans-serif" font-size="9" font-weight="800">B</text>
      ${turn
        ? `<path d="M${c1x + 14} ${y - 4} a 10 10 0 1 1 -1 -10" stroke="${COLORS.green}" stroke-width="2" fill="none" marker-end="url(#arrowGreen)" />
           ${arrow(c1x + 16, y - 2, c2x - 16, y - 2, { color: "green", width: 2.4 })}`
        : arrow(c1x + 16, y - 2, c2x - 16, y - 2, { color: "green", width: 2.4 })}
      ${figure(c1x + 4, y - 30, { dir: 1, pose: "run", label: "" })}
      ${withBall ? ball(c1x + 22, y - 14, 6) : ""}
      ${partner ? figure(c2x + 24, y - 30, { dir: -1, pose: "stand", color: COLORS.amber, label: "Partner" }) : ""}
      ${distanceLabel(c1x, 196, c2x, steps)}
      ${tag(140, 70, note ?? "SPRINT", COLORS.amber)}
    `;
  },

  // Defending lane: attacker dribbles at a defender who jockeys / tackles.
  defendingLane({ note, action = "jockey" }) {
    const c1x = 80, c2x = 280, y = 150;
    return `
      ${cone(c1x, y, 0.9, COLORS.mute)}${cone(c2x, y, 0.9, COLORS.mute)}
      <line x1="${c1x}" y1="${y + 2}" x2="${c2x}" y2="${y + 2}" stroke="${COLORS.faint}" stroke-width="1.4" stroke-dasharray="3 4" />
      ${figure(c2x - 30, y - 14, { dir: -1, pose: "low", color: COLORS.amber, label: "Partner" })}
      ${ball(c2x - 14, y - 6, 6)}
      ${figure(c1x + 56, y - 14, { dir: -1, pose: action === "slide" ? "low" : "low", label: "You" })}
      ${arrow(c2x - 36, y - 14, c1x + 70, y - 14, { color: "amber", dashed: true })}
      ${action === "tackle"
        ? arrow(c1x + 70, y - 6, c2x - 26, y - 2, { color: "green", curve: -6 })
        : arrow(c1x + 80, y + 2, c1x + 40, y + 2, { color: "green" })}
      ${tag(146, 70, note ?? "JOCKEY — STAY ON FEET", COLORS.green)}
    `;
  },

  // Aerial duel: a toss/cross arrives, player jumps to head it.
  aerial({ steps, note, toGoal = true }) {
    const px = 200, py = 150;
    const partnerX = 268;
    return `
      ${toGoal ? goal(56, 92, 50, 56) : `${cone(56, 162, 1, COLORS.mute)}<text x="56" y="186" text-anchor="middle" fill="${COLORS.mute}" font-family="Nunito, sans-serif" font-size="9" font-weight="800">FENCE</text>`}
      ${figure(partnerX, 168, { dir: -1, pose: "stand", color: COLORS.amber, label: "Partner" })}
      ${ball(partnerX - 18, 110, 6.5)}
      <path d="M${partnerX - 14} ${164} Q ${partnerX - 40} 96 ${px + 8} 118" stroke="${COLORS.amber}" stroke-width="2" fill="none" stroke-dasharray="4 4" marker-end="url(#arrowAmber)" />
      ${figure(px, py, { dir: -1, pose: "jump", label: "You" })}
      <path d="M${px - 4} 122 Q ${px - 30} 100 ${px - 70} 92" stroke="${COLORS.green}" stroke-width="2.2" fill="none" marker-end="url(#arrowGreen)" />
      ${distanceLabel(70, 200, px, steps)}
      ${tag(150, 70, note ?? "MEET IT WITH YOUR FOREHEAD", COLORS.green)}
    `;
  },

  // Static hold poses — plank, wall sit, balance — with a capped progress ring.
  hold({ pose, ringLabel, ringPct, equip }) {
    const px = 120, py = 168;
    return `
      ${equip === "wall" ? wall(190, 96, 14, 80) : ""}
      ${figure(px, py, { dir: 1, pose, label: pose === "plank" ? "Hold straight" : pose === "wallsit" ? "90°  knees over ankles" : "Eyes forward, knees soft" })}
      ${timerRing(268, 110, 34, ringPct, ringLabel)}
      ${tag(190, 176, "HOLD UNTIL FORM BREAKS", COLORS.amber)}
    `;
  },

  // Goal-facing finishing drills — strike toward marked zones.
  finishing({ note, fromSpot = "PENALTY SPOT", curl = false, selfFeed = false }) {
    const gx = 230, gy = 78, gw = 86, gh = 60;
    const px = 70, py = 168;
    return `
      ${goal(gx, gy, gw, gh)}
      ${dashedSquare(gx + gw - 26, gy + 6, 22, 22, COLORS.green)}
      ${dashedSquare(gx + 4, gy + gh - 28, 22, 22, COLORS.green)}
      ${selfFeed ? wall(60, 96, 14, 60) : ""}
      ${figure(px, py, { dir: 1, pose: "stand", label: fromSpot })}
      ${ball(px + 24, py + 8, 6.5)}
      ${curl
        ? `<path d="M${px + 28} ${py + 4} Q 190 60 ${gx + gw - 16} ${gy + 18}" stroke="${COLORS.green}" stroke-width="2.2" fill="none" stroke-dasharray="5 4" marker-end="url(#arrowGreen)" />
           ${cone(168, 142, 0.9, COLORS.mute)}<text x="168" y="160" text-anchor="middle" fill="${COLORS.mute}" font-family="Nunito, sans-serif" font-size="8" font-weight="800">WALL</text>`
        : arrow(px + 28, py + 2, gx + gw - 18, gy + 16, { color: "green", curve: -10 })}
      ${tag(150, 64, note ?? "PICK A CORNER", COLORS.green)}
    `;
  },

  // Ball-mastery / juggling / weak-foot rhythm work — looping touch arcs above the player.
  ballMastery({ note, weakFoot = false }) {
    const px = 180, py = 172;
    return `
      ${figure(px, py, { dir: weakFoot ? -1 : 1, pose: "balance", label: weakFoot ? "Weak foot only" : "Soft touches" })}
      ${ball(px, 130, 7)}
      <path d="M${px - 14} 138 q 14 -22 28 0" stroke="${COLORS.green}" stroke-width="2" fill="none" stroke-dasharray="4 4" />
      <path d="M${px - 20} 148 q 20 -34 40 0" stroke="${COLORS.greenLine}" stroke-width="1.6" fill="none" stroke-dasharray="3 4" />
      ${weakFoot ? tag(116, 70, note ?? "WEAK FOOT ONLY", COLORS.amber) : tag(126, 70, note ?? "KEEP IT ALIVE", COLORS.green)}
    `;
  },

  // Fitness / shuttle test — marked lane with progressive levels.
  shuttleTest({ note }) {
    const x1 = 70, x2 = 290, y = 150;
    return `
      <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${COLORS.mute2}" stroke-width="2.4" />
      <line x1="${x1}" y1="${y - 10}" x2="${x1}" y2="${y + 10}" stroke="${COLORS.mute2}" stroke-width="2.4" />
      <line x1="${x2}" y1="${y - 10}" x2="${x2}" y2="${y + 10}" stroke="${COLORS.mute2}" stroke-width="2.4" />
      <line x1="${(x1 + x2) / 2}" y1="${y - 10}" x2="${(x1 + x2) / 2}" y2="${y + 10}" stroke="${COLORS.faint}" stroke-width="1.6" stroke-dasharray="3 3" />
      <text x="${x1}" y="${y + 26}" text-anchor="middle" fill="${COLORS.mute}" font-family="Nunito, sans-serif" font-size="8" font-weight="800">20m</text>
      <text x="${x2}" y="${y + 26}" text-anchor="middle" fill="${COLORS.mute}" font-family="Nunito, sans-serif" font-size="8" font-weight="800">TURN</text>
      ${figure(x1 + 30, y - 22, { dir: 1, pose: "run" })}
      ${arrow(x1 + 50, y - 28, x2 - 50, y - 28, { color: "green" })}
      <path d="M${x2 - 50} ${y - 24} a 9 9 0 1 1 0.4 8" stroke="${COLORS.amber}" stroke-width="2" fill="none" marker-end="url(#arrowAmber)" />
      ${tag(140, 72, note ?? "BEAT THE BEEP", COLORS.green)}
    `;
  },

  // Bodyweight conditioning reps (pushups / box jumps / long jump / rotations).
  bodyweight({ note, pose = "stand", equip }) {
    const px = 150, py = 170;
    return `
      ${equip === "box" ? `<rect x="${px + 30}" y="${py - 26}" width="46" height="26" rx="3" fill="${COLORS.elev ?? COLORS.panel}" stroke="${COLORS.mute}" stroke-width="2" />` : ""}
      ${pose === "pushup"
        ? `<g>
            <line x1="${px - 26}" y1="${py + 6}" x2="${px + 14}" y2="${py + 6}" stroke="${COLORS.mute2}" stroke-width="2.6" stroke-linecap="round" />
            <line x1="${px - 26}" y1="${py + 6}" x2="${px - 30}" y2="${py + 16}" stroke="${COLORS.mute2}" stroke-width="2.4" stroke-linecap="round" />
            <line x1="${px + 14}" y1="${py + 6}" x2="${px + 18}" y2="${py + 16}" stroke="${COLORS.mute2}" stroke-width="2.4" stroke-linecap="round" />
            <line x1="${px - 8}" y1="${py + 6}" x2="${px - 8}" y2="${py + 16}" stroke="${COLORS.mute2}" stroke-width="2.4" stroke-linecap="round" />
            <circle cx="${px + 19}" cy="${py}" r="6" fill="${COLORS.mute2}" />
            <path d="M${px - 30} ${py + 16} q 50 16 56 0" stroke="${COLORS.green}" stroke-width="1.8" fill="none" stroke-dasharray="3 3" />
          </g>`
        : figure(px, py, { dir: 1, pose, label: note })}
      ${pose === "jump" ? `<path d="M${px - 16} ${py + 6} Q ${px + 30} ${py - 30} ${px + 76} ${py + 6}" stroke="${COLORS.green}" stroke-width="2" fill="none" stroke-dasharray="4 4" marker-end="url(#arrowGreen)" />` : ""}
      ${tag(130, 70, note ?? "STRICT FORM, FULL REPS", COLORS.green)}
    `;
  },

  // Daily check-in / nutrition log cards — simple iconographic tile.
  checkin({ icon, note }) {
    const cx = 180, cy = 105;
    const icons = {
      fuel: `<path d="M${cx - 16} ${cy - 18} h 32 v 30 a 16 16 0 0 1 -32 0 Z" fill="none" stroke="${COLORS.green}" stroke-width="2.4" />
             <path d="M${cx - 10} ${cy - 6} h 20" stroke="${COLORS.green}" stroke-width="2" stroke-dasharray="3 3" />`,
      water: `<path d="M${cx} ${cy - 22} C ${cx - 16} ${cy - 2} ${cx - 16} ${cy + 14} ${cx} ${cy + 14} C ${cx + 16} ${cy + 14} ${cx + 16} ${cy - 2} ${cx} ${cy - 22} Z" fill="${COLORS.greenDim}" stroke="${COLORS.green}" stroke-width="2.2" />`,
      sleep: `<path d="M${cx + 14} ${cy - 18} a 18 18 0 1 0 0 34 a 14 14 0 0 1 0 -34 Z" fill="${COLORS.greenDim}" stroke="${COLORS.green}" stroke-width="2.2" />
              <circle cx="${cx - 16}" cy="${cy - 14}" r="1.6" fill="${COLORS.mute}" /><circle cx="${cx - 22}" cy="${cy - 4}" r="1.2" fill="${COLORS.mute}" />`,
    };
    return `
      <circle cx="${cx}" cy="${cy}" r="34" fill="${COLORS.bg}" stroke="${COLORS.border}" stroke-width="1.4" />
      ${icons[icon] ?? icons.fuel}
      ${tag(126, 168, note ?? "LOG IT DAILY", COLORS.green)}
    `;
  },
};

// ───────────────────────────── per-drill scene assignments ─────────────────────────────

const drillScenes = {
  "wall-cushion-rebound": ["wallRebound", { steps: "5 big steps", note: "20 PASSES — CUSHION DEAD" }],
  "high-ball-drop-dead": ["throwAndControl", { note: "10 THROWS" }],
  "gate-pass-15": ["gatePass", { steps: "15 big steps", gateLabel: "2-STEP GATE" }],
  "long-ping-30": ["targetSquare", { steps: "30 big steps", squareLabel: "5x5 STEPS" }],
  "weak-foot-wall-routine": ["wallRebound", { steps: "7 big steps", note: "60s — WEAK FOOT ONLY" }],
  "cone-slalom-10": ["coneWeave", { count: 5, pattern: "slalom", note: "IN-OUT-TURN-BACK" }],
  "box-shield": ["shieldBox", { note: "PROTECT FOR 20s+" }],
  "shoulder-check-wall-pass": ["wallRebound", { steps: "5 steps · cone 3 back", note: "SCAN, THEN TRAP", behind: true }],
  "give-and-go-check-run": ["sprintLane", { steps: "10 big steps", note: "PLANT — BURST — RECEIVE", turn: true, partner: true }],
  "recovery-sprint-25": ["sprintLane", { steps: "25 big steps", note: "TURN ON “TURNOVER”", turn: true }],
  "ten-step-jockey": ["defendingLane", { note: "LOW STANCE — DELAY", action: "jockey" }],
  "poke-tackle-timing": ["defendingLane", { note: "POKE WHEN TOUCH DRIFTS", action: "tackle" }],
  "header-clearance": ["aerial", { steps: "12 big steps", note: "FOREHEAD — EYES OPEN" }],

  "max-pushups": ["bodyweight", { note: "STRICT FORM TO FAILURE", pose: "pushup" }],
  "plank-hold": ["hold", { pose: "plank", ringLabel: "5:00", ringPct: 0.62, equip: "" }],
  "wall-sit-hold": ["hold", { pose: "wallsit", ringLabel: "4:30", ringPct: 0.5, equip: "wall" }],
  "daily-calories": ["checkin", { icon: "fuel", note: "TARGET: 3,500 KCAL / DAY" }],
  "daily-water": ["checkin", { icon: "water", note: "TARGET: 1 GALLON / DAY" }],
  "sleep-duration": ["checkin", { icon: "sleep", note: "TARGET: 8–9 HOURS / NIGHT" }],

  "juggling-control": ["ballMastery", { note: "COUNT CONSECUTIVE TOUCHES" }],
  "sole-roll-combo": ["ballMastery", { note: "30s — ROLL & SWITCH" }],
  "two-touch-wall-combo": ["wallRebound", { steps: "3 big steps", note: "RECEIVE, THEN PASS BACK" }],
  "inside-outside-cone-cut": ["coneWeave", { count: 4, pattern: "diamond", note: "BOTH FEET — STAY LOW" }],
  "figure-eight-dribble": ["coneWeave", { count: 2, pattern: "figure8", note: "3 LOOPS — BALL CLOSE" }],
  "one-touch-passing-square": ["coneWeave", { count: 4, pattern: "square", note: "ONE TOUCH — ROTATE CORNERS" }],
  "driven-ball-switch": ["gatePass", { steps: "25 big steps", gateLabel: "DRIVEN — ON THE GROUND", lowArc: true }],
  "weak-foot-finishing": ["finishing", { note: "WEAK FOOT — PLACEMENT", fromSpot: "PENALTY SPOT" }],
  "weak-foot-juggling": ["ballMastery", { note: "WEAK FOOT — COUNT TOUCHES", weakFoot: true }],
  "power-strike-target": ["finishing", { note: "LOW & DRIVEN — PICK A SIDE", fromSpot: "TOP OF BOX" }],
  "first-time-finish": ["finishing", { note: "NO CONTROLLING TOUCH", fromSpot: "ANGLED FEED", selfFeed: true }],
  "curl-and-place-free-kick": ["finishing", { note: "SHAPE OVER PACE", fromSpot: "20 STEPS OUT", curl: true }],
  "pro-agility-shuttle": ["sprintLane", { steps: "5 - 10 - 5 yards", note: "TOUCH EACH LINE", turn: true }],
  "thirty-yard-sprint": ["sprintLane", { steps: "30 yards", note: "RUN THROUGH THE LINE", withBall: false }],
  "beep-test-level": ["shuttleTest", { note: "STAY AHEAD OF THE BEEP" }],
  "yoyo-intermittent-level": ["shuttleTest", { note: "SHUTTLE + 10s RECOVERY JOG" }],
  "plyo-box-jumps": ["bodyweight", { note: "60s — SOFT LANDINGS", pose: "jump", equip: "box" }],
  "single-leg-balance-hold": ["hold", { pose: "balance", ringLabel: "75s", ringPct: 0.4, equip: "" }],
  "core-plank-rotation": ["bodyweight", { note: "ROTATE — HIPS STAY HIGH", pose: "plank" }],
  "standing-long-jump": ["bodyweight", { note: "TWO FEET — MEASURE TO HEEL", pose: "jump" }],
  "one-v-one-close-down": ["shieldBox", { note: "CLOSE DOWN — SHOW THEM AWAY" }],
  "recovery-run-reaction": ["sprintLane", { steps: "5 steps to cone", note: "REACT ON THE CALL", turn: true, partner: true }],
  "field-scan-frequency": ["ballMastery", { note: "60s — HEAD UP, BALL ALIVE" }],
  "blind-side-run-timing": ["sprintLane", { steps: "10 steps", note: "CURVE — ARRIVE IN STRIDE", turn: true, partner: true, withBall: true }],
  "overlap-and-return": ["sprintLane", { steps: "wide channel", note: "OVERLAP — CALL EARLY", partner: true, withBall: true }],
  "crossing-far-post-run": ["aerial", { steps: "wide delivery", note: "ARRIVE LATE, NOT EARLY" }],
  "flick-on-header-control": ["aerial", { steps: "chest-height toss", note: "CUSHION — DON'T CLEAR", toGoal: false }],
  "sliding-tackle-technique": ["defendingLane", { note: "STUDS DOWN — THROUGH THE BALL", action: "slide" }],
  "reaction-ball-drop-catch": ["ballMastery", { note: "REACT BEFORE 2ND BOUNCE" }],
  "hydration-checkin": ["checkin", { icon: "water", note: "DAYS ON TARGET / 7" }],
  "sleep-recovery-routine": ["checkin", { icon: "sleep", note: "NIGHTS 8H+ / 7" }],
};

// ───────────────────────────── render & write ─────────────────────────────

function render(id, title) {
  const entry = drillScenes[id];
  if (!entry) throw new Error(`No diagram scene mapped for drill id "${id}"`);
  const [sceneName, params] = entry;
  const scene = scenes[sceneName];
  if (!scene) throw new Error(`Unknown scene "${sceneName}" for drill id "${id}"`);
  const body = scene(params);
  const caption = (params.note ?? title).toUpperCase();
  return frame(title, body, caption.length > 46 ? caption.slice(0, 44) + "…" : caption);
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  // Clear any stale generated diagrams from previous runs (keep nothing else in the dir).
  for (const f of readdirSync(OUT_DIR)) {
    if (f.endsWith(".svg")) unlinkSync(join(OUT_DIR, f));
  }

  const ids = Object.keys(drillScenes);
  for (const id of ids) {
    const svg = render(id, id.replace(/-/g, " "));
    writeFileSync(join(OUT_DIR, `${id}.svg`), svg, "utf8");
  }

  console.log(`Generated ${ids.length} drill diagrams into ${OUT_DIR}`);
}

main();
