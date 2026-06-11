#!/usr/bin/env python3
from __future__ import annotations

import math
import shutil
import subprocess
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "demo" / "varfoot-demo-2min.mp4"
BUILD = ROOT / "demo" / "video-build"
FPS = 30
W, H = 1920, 1080

BG = (10, 10, 11)
SURFACE = (22, 24, 27)
SURFACE_2 = (30, 34, 38)
TEXT = (244, 245, 246)
TEXT_2 = (166, 174, 184)
TEXT_3 = (112, 120, 130)
GREEN = (57, 255, 115)
BLUE = (77, 182, 255)
YELLOW = (255, 210, 63)

FONT_REGULAR = "/System/Library/Fonts/Avenir Next.ttc"
FONT_MONO = "/System/Library/Fonts/SFNSMono.ttf"


def font(size: int, mono: bool = False) -> ImageFont.FreeTypeFont:
    path = FONT_MONO if mono else FONT_REGULAR
    try:
        return ImageFont.truetype(path, size=size)
    except OSError:
        return ImageFont.load_default(size=size)


def wrap(draw: ImageDraw.ImageDraw, text: str, font_obj: ImageFont.ImageFont, max_width: int) -> list[str]:
    lines: list[str] = []
    for paragraph in text.split("\n"):
        words = paragraph.split()
        current = ""
        for word in words:
            trial = f"{current} {word}".strip()
            if draw.textbbox((0, 0), trial, font=font_obj)[2] <= max_width:
                current = trial
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
        lines.append("")
    if lines and lines[-1] == "":
        lines.pop()
    return lines


def draw_wrapped(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    font_obj: ImageFont.ImageFont,
    fill: tuple[int, int, int],
    max_width: int,
    line_gap: int = 8,
) -> int:
    x, y = xy
    for line in wrap(draw, text, font_obj, max_width):
        if not line:
            y += font_obj.size + line_gap
            continue
        draw.text((x, y), line, font=font_obj, fill=fill)
        y += font_obj.size + line_gap
    return y


def gradient_bg() -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img, "RGBA")
    for y in range(H):
        t = y / H
        r = int(BG[0] + 10 * t)
        g = int(BG[1] + 14 * t)
        b = int(BG[2] + 16 * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b, 255))
    for x in range(-W, W * 2, 92):
        draw.line([(x, H), (x + W // 2, 0)], fill=(57, 255, 115, 18), width=1)
    for y in range(120, H, 120):
        draw.line([(0, y), (W, y)], fill=(255, 255, 255, 8), width=1)
    return img


def paste_phone(base: Image.Image, screenshot_path: Path, x: int = 1220, y: int = 78, h: int = 930) -> None:
    shot = Image.open(screenshot_path).convert("RGB")
    scale = h / shot.height
    w = int(shot.width * scale)
    shot = shot.resize((w, h), Image.Resampling.LANCZOS)
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer, "RGBA")
    d.rounded_rectangle((x - 20, y - 20, x + w + 20, y + h + 20), radius=54, fill=(0, 0, 0, 170))
    d.rounded_rectangle((x - 8, y - 8, x + w + 8, y + h + 8), radius=42, outline=(255, 255, 255, 36), width=2)
    mask = Image.new("L", (w, h), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, w, h), radius=36, fill=255)
    layer.paste(shot, (x, y), mask)
    base.alpha_composite(layer)


def draw_brand(draw: ImageDraw.ImageDraw) -> None:
    draw.rounded_rectangle((96, 72, 154, 130), radius=14, fill=GREEN)
    draw.text((171, 79), "VarFoot", font=font(40), fill=TEXT)
    draw.text((96, 145), "LexHack '26 - Build for someone real", font=font(22), fill=TEXT_2)


def slide(scene: dict[str, object], index: int) -> Path:
    img = gradient_bg().convert("RGBA")
    draw = ImageDraw.Draw(img, "RGBA")
    draw_brand(draw)

    label = str(scene["label"]).upper()
    title = str(scene["title"])
    body = str(scene["body"])
    bullets = scene.get("bullets", [])

    accent = scene.get("accent", GREEN)
    draw.text((96, 228), label, font=font(20, mono=True), fill=accent)
    title_bottom = draw_wrapped(draw, (96, 272), title, font(62), TEXT, 870, line_gap=8)
    body_y = max(432, title_bottom + 28)
    y = draw_wrapped(draw, (100, body_y), body, font(28), TEXT_2, 830, line_gap=10)

    if bullets:
        y += 24
        for item in bullets:
            draw.rounded_rectangle((100, y + 8, 116, y + 24), radius=8, fill=accent)
            y = draw_wrapped(draw, (136, y), str(item), font(28), TEXT, 800, line_gap=10) + 8

    screenshot = scene.get("screenshot")
    if screenshot:
        paste_phone(img, ROOT / "public" / "screenshots" / str(screenshot))
    else:
        draw.rounded_rectangle((1160, 190, 1745, 780), radius=28, fill=SURFACE, outline=(255, 255, 255, 32), width=2)
        draw.text((1210, 250), "Jordan Reyes", font=font(54), fill=TEXT)
        draw.text((1210, 323), "16-year-old JV midfielder", font=font(31), fill=TEXT_2)
        stats = [("70", "readiness"), ("38", "days to tryout"), ("1", "specific next session")]
        sx = 1210
        for value, label_text in stats:
            draw.rounded_rectangle((sx, 430, sx + 155, 575), radius=18, fill=SURFACE_2, outline=(57, 255, 115, 55), width=2)
            draw.text((sx + 28, 454), value, font=font(48, mono=True), fill=GREEN)
            draw.text((sx + 28, 520), label_text, font=font(18), fill=TEXT_2)
            sx += 175
        draw_wrapped(
            draw,
            (1210, 640),
            "The point is not another generic workout app. It is a plan for one player who knows the goal but needs the next right step.",
            font(27),
            TEXT_2,
            455,
            line_gap=9,
        )

    path = BUILD / f"slide_{index:02d}.png"
    img.convert("RGB").save(path, quality=95)
    return path


VOICEOVER = """
VarFoot was built for Jordan Reyes, a JV midfielder trying to make varsity.

Jordan already trains. The problem is that training alone becomes guesswork: one day a YouTube drill, another day pushups, sometimes a coach's old PDF. None of that answers the real question: am I closer to varsity, and what should I work on first?

VarFoot starts with a soccer-specific baseline and turns the results into a varsity readiness score. The demo athlete is at about JV level, with a clear next problem: speed and agility are holding the profile back.

The Today screen makes that concrete. Jordan sees the score, the biggest gap, and one next session instead of a pile of advice. This is the whole product philosophy: reduce uncertainty, then make the next action obvious.

The roadmap is not a canned calendar. It is generated from Jordan's measured gaps and the tryout date. When Jordan completes a session, the future plan continues after the completed work instead of rewinding to today.

The Progress tab shows the underlying evidence: score history, a radar view, and weakest-first gaps. A player can see which skills are already varsity-level and which drills still need attention.

Fuel matters too, but VarFoot treats teen nutrition carefully. Food search comes from USDA FoodData Central, and targets are planning estimates, not medical prescriptions. The app focuses on balanced meals, snacks, hydration, and recovery.

Finally, the Coach tab uses Gemini, but it is grounded in Jordan's actual state: readiness score, top gaps, roadmap, and meals. Ask what to work on first and the answer is specific to Jordan, not generic soccer advice.

That is the core idea: a high-school soccer player should not have to guess their way toward varsity. VarFoot gives them a baseline, a plan, and a coach that understands their data.
""".strip()


SCENES = [
    {
        "label": "The person",
        "title": "Jordan wants varsity. Guesswork is the enemy.",
        "body": "A JV player can care deeply and still waste weeks on the wrong work. VarFoot turns that uncertainty into a baseline, gaps, and a next session.",
        "bullets": ["Specific player", "Specific tryout goal", "Specific next action"],
        "duration": 19,
        "accent": BLUE,
    },
    {
        "label": "Today",
        "title": "One screen answers: where am I, and what now?",
        "body": "Jordan sees readiness, top gap, and the next training session without digging through a dashboard.",
        "bullets": ["70/100 JV readiness", "Speed/agility is the biggest gap", "Next session already queued"],
        "screenshot": "01-today.png",
        "duration": 20,
    },
    {
        "label": "Plan",
        "title": "The roadmap is generated from measured weaknesses.",
        "body": "VarFoot ranks gaps, respects the tryout date, and keeps future sessions after completed work.",
        "bullets": ["No canned calendar", "Future-date regression fixed", "Built around the tryout deadline"],
        "screenshot": "02-roadmap.png",
        "duration": 20,
        "accent": YELLOW,
    },
    {
        "label": "Progress",
        "title": "Jordan can see proof, not vibes.",
        "body": "The Progress tab shows history, radar, weakest-first gaps, and varsity-level badges.",
        "bullets": ["Score trend", "Skill radar", "Weakest-first drill list"],
        "screenshot": "03-progress.png",
        "duration": 20,
        "accent": BLUE,
    },
    {
        "label": "Fuel",
        "title": "Nutrition is useful, careful, and grounded.",
        "body": "USDA search powers real macro math. Teen targets are estimates, not prescriptions.",
        "bullets": ["FoodData Central search", "Youth-safe protein estimate", "Hydration and recovery context"],
        "screenshot": "04-nutrition.png",
        "duration": 20,
    },
    {
        "label": "Coach",
        "title": "The AI coach sees Jordan's actual state.",
        "body": "Gemini answers with the player's score, gaps, roadmap, and logged meals instead of generic motivation.",
        "bullets": ["Streaming response", "Grounded context", "Specific recommendation"],
        "screenshot": "05-coach.png",
        "duration": 23,
        "accent": YELLOW,
    },
    {
        "label": "Closing",
        "title": "A varsity plan for the player training alone.",
        "body": "VarFoot gives a high-school athlete a baseline, a prioritized roadmap, safer fueling context, and a coach that understands their data.",
        "bullets": ["Built for one real-feeling athlete", "Works end to end", "Ready for LexHack demo day"],
        "duration": 17,
        "accent": BLUE,
    },
]


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True)


def build_audio() -> Path | None:
    say = shutil.which("say")
    if not say:
        return None
    script_path = BUILD / "voiceover.txt"
    script_path.write_text(VOICEOVER, encoding="utf-8")
    aiff = BUILD / "voiceover.aiff"
    m4a = BUILD / "voiceover.m4a"
    run([say, "-r", "148", "-o", str(aiff), "-f", str(script_path)])
    run(["ffmpeg", "-y", "-i", str(aiff), "-c:a", "aac", "-b:a", "160k", str(m4a)])
    return m4a


def probe_duration(path: Path) -> float:
    proc = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nk=1:nw=1", str(path)],
        check=True,
        text=True,
        capture_output=True,
    )
    return float(proc.stdout.strip())


def main() -> None:
    BUILD.mkdir(parents=True, exist_ok=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)

    slides = [slide(scene, i) for i, scene in enumerate(SCENES)]
    audio = build_audio()

    scene_total = sum(float(scene["duration"]) for scene in SCENES)
    if audio:
        audio_duration = probe_duration(audio)
        if audio_duration > scene_total:
            extra = audio_duration - scene_total + 1.5
            SCENES[-1]["duration"] = float(SCENES[-1]["duration"]) + extra

    segments: list[Path] = []
    for i, (scene, slide_path) in enumerate(zip(SCENES, slides)):
        seg = BUILD / f"seg_{i:02d}.mp4"
        duration = str(float(scene["duration"]))
        run([
            "ffmpeg",
            "-y",
            "-loop",
            "1",
            "-t",
            duration,
            "-i",
            str(slide_path),
            "-vf",
            f"fps={FPS},format=yuv420p",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            str(seg),
        ])
        segments.append(seg)

    concat = BUILD / "concat.txt"
    concat.write_text("".join(f"file '{seg}'\n" for seg in segments), encoding="utf-8")
    silent = BUILD / "silent.mp4"
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat), "-c", "copy", str(silent)])

    if audio:
        run([
            "ffmpeg",
            "-y",
            "-i",
            str(silent),
            "-i",
            str(audio),
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            "-shortest",
            str(OUT),
        ])
    else:
        shutil.copyfile(silent, OUT)

    dur = probe_duration(OUT)
    if not 120 <= dur <= 180:
        raise SystemExit(f"Demo video duration must be 120-180 seconds, got {dur:.1f}s")
    print(f"Wrote {OUT} ({dur:.1f}s)")


if __name__ == "__main__":
    main()
