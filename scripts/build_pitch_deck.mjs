#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DEFAULT_RUNTIME_NODE_MODULES =
  "/Users/sansarkarki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
const runtimeRequire = createRequire(join(process.env.ARTIFACT_TOOL_NODE_MODULES || DEFAULT_RUNTIME_NODE_MODULES, "resolver.js"));
const artifactPath = runtimeRequire.resolve("@oai/artifact-tool");
const artifactRequire = createRequire(artifactPath);
const {
  Presentation,
  PresentationFile,
  column,
  row,
  text,
  image,
  drawSlideToCtx,
} = await import(artifactPath);
const { Canvas } = await import(artifactRequire.resolve("skia-canvas"));

const THREAD_ID = process.env.CODEX_THREAD_ID || `manual-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const WORKSPACE = join(ROOT, "outputs", THREAD_ID, "presentations", "varfoot-lexhack-pitch");
const PREVIEW_DIR = join(WORKSPACE, "preview");
const QA_DIR = join(WORKSPACE, "qa");
const FINAL = join(ROOT, "demo", "varfoot-lexhack-pitch.pptx");
const W = 1600;
const H = 900;
const SCREENSHOTS = new Map();

const C = {
  bg: "#0a0a0b",
  text: "#f4f5f6",
  muted: "#9aa1a9",
  dim: "#686e76",
  green: "#39ff73",
  blue: "#4db6ff",
  yellow: "#ffd23f",
  red: "#ff6b5e",
};

const f = (size, color = C.text, bold = false) => ({
  fontSize: size,
  color,
  bold,
  typeface: "Avenir Next",
  wrap: "square",
});

const t = (value, width, height, style = {}) =>
  text(value, {
    width,
    height,
    style: { ...f(28), ...style },
  });

const kicker = (value, color = C.green) => t(value.toUpperCase(), 1000, 34, f(18, color, true));
const h1 = (value, width = 950) => t(value, width, 150, f(58, C.text, true));
const h2 = (value, width = 760) => t(value, width, 120, f(44, C.text, true));
const body = (value, width = 780, height = 110) => t(value, width, height, f(25, C.muted, false));

function bullets(items, color = C.green, width = 780) {
  return column({ width, gap: 12 }, items.map((item) =>
    row({ width, gap: 12, align: "start" }, [
      t("-", 20, 34, f(25, color, true)),
      t(item, width - 40, 56, f(24, C.text, true)),
    ]),
  ));
}

function metric(value, label, color = C.green) {
  return column({ width: 210, height: 120, gap: 2, padding: 16 }, [
    t(value, 190, 58, { ...f(48, color, true), typeface: "SF Mono" }),
    t(label, 180, 40, f(19, C.muted, true)),
  ]);
}

async function loadScreenshotDataUrls() {
  for (const file of ["01-today.png", "02-roadmap.png", "03-progress.png", "04-nutrition.png", "05-coach.png"]) {
    const buf = await readFile(join(ROOT, "public", "screenshots", file));
    SCREENSHOTS.set(file, `data:image/png;base64,${buf.toString("base64")}`);
  }
}

function phone(file, width = 340, height = 720) {
  return image({
    dataUrl: SCREENSHOTS.get(file),
    width,
    height,
    fit: "contain",
    alt: file.replace(".png", ""),
  });
}

function slide(presentation, elements, notes) {
  const s = presentation.slides.add({ width: W, height: H });
  s.background.fill = C.bg;
  s.compose(column({ width: W, height: H, padding: 64, gap: 24 }, elements));
  if (notes) s.speakerNotes.text = notes;
  return s;
}

const p = Presentation.create();
await loadScreenshotDataUrls();

slide(p, [
  row({ width: 1470, height: 760, gap: 70, align: "center" }, [
    column({ width: 860, gap: 24 }, [
      kicker("LexHack '26 / Build for someone real", C.blue),
      h1("VarFoot gives the player training alone a varsity plan.", 850),
      body("Built for Jordan Reyes, a 16-year-old JV midfielder who already trains after school but does not know whether the work is actually moving him toward varsity.", 820, 140),
      row({ width: 720, gap: 28 }, [
        metric("70", "readiness", C.green),
        metric("38", "days left", C.blue),
        metric("1", "next session", C.yellow),
      ]),
    ]),
    column({ width: 430, gap: 16 }, [
      phone("01-today.png", 360, 740),
    ]),
  ]),
], "Open with Jordan, not the tech stack.");

slide(p, [
  row({ width: 1470, height: 760, gap: 72, align: "center" }, [
    column({ width: 770, gap: 22 }, [
      kicker("Problem", C.yellow),
      h2("Caring is not enough when training is guesswork.", 760),
      body("High-school soccer players can find drills anywhere. What they cannot easily find is an honest baseline, a benchmark, and a prioritized next step.", 750, 130),
      bullets([
        "Team practice gives feedback, not a personal roadmap.",
        "PDF drills give activities, not readiness.",
        "Generic fitness apps miss tryouts, positions, and varsity standards.",
      ], C.yellow, 750),
    ]),
    column({ width: 560, gap: 16 }, [
      body("The question Jordan is really asking:", 530, 50),
      h2("Am I closer to varsity, and what should I work on first?", 540),
    ]),
  ]),
]);

slide(p, [
  row({ width: 1470, height: 760, gap: 70, align: "center" }, [
    column({ width: 740, gap: 22 }, [
      kicker("Product loop", C.green),
      h2("Baseline -> score -> gap -> session -> updated plan.", 720),
      body("VarFoot turns tryout prep into a loop the player can repeat without waiting for a coach to personalize every session.", 700, 110),
      bullets([
        "19-drill baseline across technical, physical, speed, recovery, and fueling.",
        "Freshman/JV/varsity anchors make the score understandable.",
        "Completed sessions regenerate future work from the latest state.",
      ], C.green, 720),
    ]),
    row({ width: 650, gap: 28, align: "center" }, [
      phone("01-today.png", 280, 600),
      phone("02-roadmap.png", 280, 600),
    ]),
  ]),
]);

slide(p, [
  row({ width: 1470, height: 760, gap: 70, align: "center" }, [
    column({ width: 680, gap: 22 }, [
      kicker("Proof object", C.blue),
      h2("The roadmap is generated from Jordan's measured gaps.", 660),
      body("The plan is not a canned Day 1 / Day 2 calendar. It ranks weaknesses, balances training load, and respects the tryout date.", 650, 120),
      bullets([
        "Speed/agility rises because it is Jordan's biggest blocker.",
        "Focus labels say Passing, First Touch, Speed/Agility.",
        "Regeneration now continues after future completed sessions.",
      ], C.blue, 660),
    ]),
    phone("02-roadmap.png", 360, 740),
  ]),
]);

slide(p, [
  row({ width: 1470, height: 760, gap: 72, align: "center" }, [
    column({ width: 690, gap: 22 }, [
      kicker("Feedback", C.green),
      h2("Progress shows evidence, not vibes.", 680),
      body("Jordan can see history, a skill radar, weakest-first gaps, and which drills have already reached varsity level.", 660, 120),
      bullets([
        "Score trend for the improvement story.",
        "Radar for skill balance.",
        "Filters that keep the weakest-first list scannable.",
      ], C.green, 660),
    ]),
    phone("03-progress.png", 360, 740),
  ]),
]);

slide(p, [
  row({ width: 1470, height: 760, gap: 72, align: "center" }, [
    column({ width: 700, gap: 22 }, [
      kicker("Safety", C.yellow),
      h2("Fueling is useful, but careful because Jordan is a minor.", 690),
      body("The Fuel tab uses USDA FoodData Central for real food data. Targets are planning estimates, not medical prescriptions.", 670, 130),
      bullets([
        "Protein uses about 1.5 g/kg/day instead of a high calorie percentage.",
        "Calories use a sex-neutral estimate because the app does not collect sex.",
        "Coach language points to balanced meals, hydration, and adult support.",
      ], C.yellow, 680),
    ]),
    phone("04-nutrition.png", 360, 740),
  ]),
]);

slide(p, [
  row({ width: 1470, height: 760, gap: 72, align: "center" }, [
    column({ width: 700, gap: 22 }, [
      kicker("AI coach", C.blue),
      h2("The coach is grounded in Jordan's actual state.", 690),
      body("Gemini receives readiness, top gaps, today's roadmap session, recent history, and today's meals. It is not a generic soccer chatbot.", 670, 130),
      bullets([
        "Streaming response feels live in the demo.",
        "Context includes score, gaps, plan, and food log.",
        "Prompt includes teen nutrition safety constraints.",
      ], C.blue, 680),
    ]),
    phone("05-coach.png", 360, 740),
  ]),
]);

slide(p, [
  column({ width: 1470, height: 760, gap: 34 }, [
    kicker("Clinical grade", C.green),
    h1("88-91 / 100 if the final deployment and hosted video land.", 1180),
    row({ width: 1430, gap: 24 }, [
      metric("36-38", "impact / 40", C.green),
      metric("26-28", "tech / 30", C.blue),
      metric("17-18", "design / 20", C.yellow),
      metric("9", "presentation / 10", C.green),
    ]),
    body("The project is prize-contending because it has one clear person, a real problem, a working end-to-end app, and a demo path judges can understand quickly.", 1210, 100),
    bullets([
      "Lead with Jordan's uncertainty, then show how each screen removes it.",
      "Use the demo athlete live; mention the full assessment, do not perform all 19 drills.",
      "Upload the generated 2:08 walkthrough to YouTube or Vimeo before Devpost submission.",
    ], C.green, 1200),
  ]),
]);

slide(p, [
  row({ width: 1470, height: 760, gap: 70, align: "center" }, [
    column({ width: 820, gap: 24 }, [
      kicker("Demo close", C.blue),
      h1("VarFoot is not motivation. It is the next right step.", 820),
      body("For Jordan, the app answers the question that matters: what should I do today to become varsity-ready?", 780, 120),
      bullets([
        "Live app: varfoot.vercel.app",
        "Demo button: Explore demo athlete",
        "Submission video: demo/varfoot-demo-2min.mp4",
      ], C.blue, 760),
    ]),
    phone("01-today.png", 360, 740),
  ]),
]);

await mkdir(join(ROOT, "demo"), { recursive: true });
await mkdir(PREVIEW_DIR, { recursive: true });
await mkdir(QA_DIR, { recursive: true });

await writeFile(join(WORKSPACE, "profile-plan.txt"), [
  "task mode: create",
  "primary deck-profile: product-platform",
  "secondary gates: consumer-retail sports proof objects, live hackathon demo rhythm",
  "required proof objects: app screenshots, clinical rubric grade, demo/video requirements",
  "brand constraints: use existing VarFoot mark/name and screenshots only",
  "QA gates: render all slides, contact-sheet readability, no generic feature-card deck",
].join("\n"));

await writeFile(join(WORKSPACE, "source-notes.txt"), [
  "Source: local VarFoot repo and screenshots in public/screenshots.",
  "Identity asset: VarFoot wordmark/text only; no invented external marks.",
  "Nutrition references are documented in docs/scoring-model.md.",
].join("\n"));

const exported = await PresentationFile.exportPptx(p);
await writeFile(FINAL, exported.data);

const previewPaths = [];
for (const [index, s] of p.slides.items.entries()) {
  const canvas = new Canvas(W, H);
  const ctx = canvas.getContext("2d");
  await drawSlideToCtx(s, undefined, ctx);
  const preview = join(PREVIEW_DIR, `slide-${String(index + 1).padStart(2, "0")}.png`);
  await writeFile(preview, await canvas.toBuffer("png"));
  previewPaths.push(preview);
}

const sheet = new Canvas(1600, 960);
const sheetCtx = sheet.getContext("2d");
sheetCtx.fillStyle = C.bg;
sheetCtx.fillRect(0, 0, 1600, 960);
for (const [index, preview] of previewPaths.entries()) {
  const { loadImage } = await import(artifactRequire.resolve("skia-canvas"));
  const img = await loadImage(preview);
  const x = (index % 3) * 520 + 24;
  const y = Math.floor(index / 3) * 300 + 34;
  sheetCtx.drawImage(img, x, y, 490, 276);
  sheetCtx.fillStyle = C.muted;
  sheetCtx.font = "18px Avenir Next";
  sheetCtx.fillText(String(index + 1), x, y - 8);
}
const contact = join(QA_DIR, "contact-sheet.png");
await writeFile(contact, await sheet.toBuffer("png"));

console.log(`Wrote ${FINAL}`);
console.log(`Rendered previews to ${PREVIEW_DIR}`);
console.log(`Contact sheet ${contact}`);
