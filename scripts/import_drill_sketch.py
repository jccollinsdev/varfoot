#!/usr/bin/env python3

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image


TARGET_SIZE = (800, 480)
PADDING = 28
WHITE_THRESHOLD = 248


def trim_white_bounds(image: Image.Image) -> Image.Image:
    rgb = image.convert("RGB")
    width, height = rgb.size
    pixels = rgb.load()

    left = width
    top = height
    right = -1
    bottom = -1

    for y in range(height):
        for x in range(width):
            r, g, b = pixels[x, y]
            if min(r, g, b) < WHITE_THRESHOLD:
                left = min(left, x)
                top = min(top, y)
                right = max(right, x)
                bottom = max(bottom, y)

    if right == -1:
        return rgb

    return rgb.crop((left, top, right + 1, bottom + 1))


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: import_drill_sketch.py <source.png> <target.png>", file=sys.stderr)
        return 1

    source = Path(sys.argv[1])
    target = Path(sys.argv[2])

    image = Image.open(source)
    cropped = trim_white_bounds(image)

    max_width = TARGET_SIZE[0] - (PADDING * 2)
    max_height = TARGET_SIZE[1] - (PADDING * 2)
    cropped.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)

    canvas = Image.new("RGB", TARGET_SIZE, "white")
    x = (TARGET_SIZE[0] - cropped.width) // 2
    y = (TARGET_SIZE[1] - cropped.height) // 2
    canvas.paste(cropped, (x, y))

    target.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(target, format="PNG", optimize=True)
    print(target)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
