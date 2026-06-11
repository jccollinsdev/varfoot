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

const PORTRAITS = new Map();
async function loadPortraitDataUrls() {
  for (const file of ["sansar.png", "saaransh.png"]) {
    const buf = await readFile(join(ROOT, "demo", "creators", file));
    PORTRAITS.set(file, `data:image/png;base64,${buf.toString("base64")}`);
  }
}

function portrait(file, size = 300) {
  return image({
    dataUrl: PORTRAITS.get(file),
    width: size,
    height: size,
    fit: "cover",
    alt: file.replace(".png", ""),
  });
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
await loadPortraitDataUrls();

// 1 — Title
slide(p, [
  row({ width: 1470, height: 760, gap: 70, align: "center" }, [
    column({ width: 880, gap: 18 }, [
      kicker("LexHack '26 / Build something real for someone", C.blue),
      h1("VarFoot", 850),
      h2("A personalized AI soccer roadmap for athletes trying to make varsity.", 840),
      body("Changing future athletes all around the world. Built by Sansar Karki & Saaransh Jinna — and built for a real one chasing varsity.", 820, 100),
      row({ width: 720, gap: 28 }, [
        metric("70", "readiness", C.green),
        metric("35", "days to tryouts", C.blue),
        metric("1", "next session", C.yellow),
      ]),
    ]),
    column({ width: 410, gap: 16 }, [
      phone("01-today.png", 360, 740),
    ]),
  ]),
], "Lead with the line: I built this for myself. A personalized AI soccer roadmap for athletes trying to make varsity.");

// 2 — Built for a real person
slide(p, [
  row({ width: 1470, height: 760, gap: 72, align: "center" }, [
    column({ width: 820, gap: 22 }, [
      kicker("Built for a real person", C.green),
      h1("This was built for me.", 800),
      body("Sansar Karki — an incoming freshman trying to make varsity soccer. I have been documenting the journey publicly, so this is not a hypothetical user.", 790, 130),
      bullets([
        "Instagram: @sansar.mp4",
        "1,100+ followers following the varsity push",
        "Real training clips, a real public goal, a real deadline",
      ], C.green, 780),
    ]),
    column({ width: 540, height: 700, gap: 16, align: "center" }, [
      t("@sansar.mp4", 520, 70, f(46, C.text, true)),
      t("1,100+ followers", 520, 50, f(26, C.muted, true)),
      t("[ Insert a clean screenshot of the @sansar.mp4 profile here — handle + follower count ]", 520, 240, f(22, C.dim, false)),
    ]),
  ]),
], "Proof this is real: public Instagram journey at @sansar.mp4, 1,100+ followers. Add the profile screenshot before presenting.");

// 3 — The real problem
slide(p, [
  row({ width: 1470, height: 760, gap: 72, align: "center" }, [
    column({ width: 770, gap: 22 }, [
      kicker("The real problem", C.yellow),
      h2("Motivation was never the issue. A plan was.", 760),
      body("I was training hard, posting the journey, and staying consistent. What I did not have was a system that told me what to work on and whether it was moving me toward varsity.", 750, 150),
      bullets([
        "Training hard, but guessing at priorities.",
        "No baseline, no benchmark, no ranked next step.",
        "No clear line from a weakness to a drill to tryout-readiness.",
      ], C.yellow, 750),
    ]),
    column({ width: 560, gap: 18 }, [
      body("The question was never:", 530, 50),
      h2("\"Will I put in the work?\"", 540),
      body("It was:", 530, 40),
      h2("\"What exactly should I work on today to become varsity-ready?\"", 540),
    ]),
  ]),
], "Frame it as my own problem: effort was there, a system was not.");

// 4 — Why existing solutions fail
slide(p, [
  column({ width: 1470, height: 760, gap: 28 }, [
    kicker("Why existing solutions fail", C.red),
    h2("Everything available solves a different problem.", 1180),
    row({ width: 1440, gap: 40, align: "start" }, [
      column({ width: 690, gap: 18 }, [
        bullets([
          "Generic YouTube drills are not personalized to my position or weaknesses.",
          "Fitness apps track workouts but do not understand soccer tryouts.",
        ], C.red, 690),
      ]),
      column({ width: 690, gap: 18 }, [
        bullets([
          "Coaches give team feedback and are not available every day.",
          "Nutrition apps are not built around a teen athlete with soccer-specific goals.",
        ], C.red, 690),
      ]),
    ]),
    body("The result: a motivated player can spend months on the wrong work and never know it.", 1200, 80),
  ]),
], "Each existing option is generic where I needed specific.");

// 5 — The VarFoot solution
slide(p, [
  row({ width: 1470, height: 760, gap: 70, align: "center" }, [
    column({ width: 760, gap: 22 }, [
      kicker("The VarFoot solution", C.green),
      h2("One loop: assess, diagnose, plan, train, fuel, coach.", 740),
      body("VarFoot turns the goal into a repeatable system the player can run without waiting for a coach to personalize every session.", 720, 110),
      bullets([
        "Assessment across technical, physical, speed, recovery, and fueling.",
        "Weakness diagnosis: every drill ranked weakest-first.",
        "Personalized roadmap built from real gaps and the tryout date.",
        "Daily sessions, fuel support, and a grounded AI coach.",
      ], C.green, 730),
    ]),
    row({ width: 640, gap: 28, align: "center" }, [
      phone("01-today.png", 280, 600),
      phone("02-roadmap.png", 280, 600),
    ]),
  ]),
], "Assessment -> weakness diagnosis -> roadmap -> daily sessions -> fuel -> AI coach.");

// 6 — Demo flow
slide(p, [
  row({ width: 1470, height: 760, gap: 56, align: "center" }, [
    column({ width: 700, gap: 22 }, [
      kicker("Demo flow", C.blue),
      h2("Click Explore demo athlete — it loads my profile.", 690),
      body("Judges see the app populated as Sansar, an incoming freshman chasing varsity, with no onboarding required.", 670, 110),
      bullets([
        "Onboarding / assessment baseline.",
        "Personalized plan and a training session.",
        "Drill guidance with diagrams.",
        "Fuel tab and the AI coach.",
      ], C.blue, 680),
    ]),
    row({ width: 700, gap: 20, align: "center" }, [
      phone("03-progress.png", 208, 446),
      phone("04-nutrition.png", 208, 446),
      phone("05-coach.png", 208, 446),
    ]),
  ]),
], "Live order: assessment, plan, session, drill, fuel, coach. Use the demo athlete; mention the full assessment exists.");

// 7 — Technical execution
slide(p, [
  column({ width: 1470, height: 760, gap: 20 }, [
    kicker("Technical execution", C.blue),
    h2("A real working app, not a mockup.", 1180),
    row({ width: 1430, gap: 24 }, [
      metric("50", "drill catalog", C.green),
      metric("0-100", "readiness model", C.blue),
      metric("USDA", "live food data", C.yellow),
      metric("35/35", "tests passing", C.green),
    ]),
    row({ width: 1440, gap: 40, align: "start" }, [
      bullets([
        "Next.js 16 + React 19 + TypeScript, installable as a PWA.",
        "Supabase auth + PostgreSQL with row-level security for sync.",
        "Deterministic, unit-tested scoring and roadmap engine.",
      ], C.blue, 690),
      bullets([
        "Gemini 3.1 Flash Lite streaming AI coach + roadmap summaries.",
        "USDA FoodData Central API for real macro math.",
        "Teen-safe nutrition guardrails; deployed on Vercel.",
      ], C.blue, 690),
    ]),
  ]),
], "Stack: Next.js/PWA, Supabase, Gemini, USDA, deterministic engine, 50-drill catalog, safe AI guardrails, Vercel.");

// 8 — Impact
slide(p, [
  row({ width: 1470, height: 760, gap: 70, align: "center" }, [
    column({ width: 820, gap: 24 }, [
      kicker("Impact", C.green),
      h1("It turns a vague dream into a daily plan.", 810),
      body("VarFoot helps an athlete like me know what to do, why it matters, and how today's session connects to the tryout goal.", 790, 130),
      bullets([
        "Every session traces back to a measured weakness.",
        "Progress is checked against varsity, not vibes.",
        "The same problem belongs to thousands of players with no plan.",
      ], C.green, 780),
    ]),
    phone("03-progress.png", 360, 740),
  ]),
], "Impact: the goal finally becomes actionable, and it generalizes beyond me.");

// 9 — What changed because of VarFoot
slide(p, [
  column({ width: 1470, height: 760, gap: 30 }, [
    kicker("What changed because of VarFoot", C.blue),
    h2("Before and after.", 1180),
    row({ width: 1440, gap: 48, align: "start" }, [
      column({ width: 690, gap: 16 }, [
        t("BEFORE", 690, 40, f(22, C.red, true)),
        bullets([
          "Random training, unclear priorities.",
          "No way to know if the work matched the varsity goal.",
          "Effort without a system.",
        ], C.red, 690),
      ]),
      column({ width: 690, gap: 16 }, [
        t("AFTER", 690, 40, f(22, C.green, true)),
        bullets([
          "Personalized daily sessions from ranked weaknesses.",
          "Progress tracked against the tryout date.",
          "A coach-like assistant that always knows the next step.",
        ], C.green, 690),
      ]),
    ]),
  ]),
], "Contrast the before/after so judges feel the change.");

// 10 — About the creators
function creatorCard(file, name, lines, accent) {
  return column({ width: 700, gap: 16, align: "start" }, [
    row({ width: 700, gap: 22, align: "center" }, [
      portrait(file, 150),
      column({ width: 528, gap: 6 }, [
        t(name, 528, 46, f(30, C.text, true)),
        t(lines.role, 528, 56, f(20, accent, true)),
      ]),
    ]),
    t(lines.bio, 700, 200, f(21, C.muted, false)),
  ]);
}

slide(p, [
  column({ width: 1470, height: 760, gap: 30 }, [
    kicker("About the creators", C.green),
    h2("Two 8th graders from Andover, MA.", 1180),
    row({ width: 1450, gap: 50, align: "start" }, [
      creatorCard("sansar.png", "Sansar Karki", {
        role: "Doherty Middle School · @sansar.mp4",
        bio: "Trying to make varsity soccer as a freshman and documenting the journey to 1,100+ followers. Builds apps and is into AI and robotics. VarFoot is the system he wished he had — so he built it.",
      }, C.green),
      creatorCard("saaransh.png", "Saaransh Jinna", {
        role: "Wood Hill Middle School",
        bio: "Training to make the AHS tennis team; into robotics and math. Plays piano and any sport with friends. Brings the same athlete-chasing-a-spot perspective to how VarFoot is designed.",
      }, C.blue),
    ]),
  ]),
], "We are two 8th-grade athletes from Andover. Sansar is the soccer player VarFoot was built for; we built it together.");

// 11 — Closing
slide(p, [
  row({ width: 1470, height: 760, gap: 70, align: "center" }, [
    column({ width: 860, gap: 24 }, [
      kicker("Closing", C.green),
      h1("Built for someone real: me.", 840),
      body("VarFoot was built for one athlete with a real, public goal. If it can help me chase varsity, it can help thousands of athletes with the same goal and no plan.", 820, 140),
      bullets([
        "Live app: varfoot.vercel.app",
        "Demo button: Explore demo athlete (loads Sansar's profile)",
        "Public journey: @sansar.mp4",
      ], C.green, 800),
    ]),
    phone("01-today.png", 360, 740),
  ]),
], "Close on the thesis: a real tool built by an athlete for himself, based on a real public varsity journey.");

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
