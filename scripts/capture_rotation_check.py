#!/usr/bin/env python3
"""Contact sheets for the two-sided quarter-turn check.

    BASE_URL=http://127.0.0.1:4173/ python3 scripts/capture_rotation_check.py before
    BASE_URL=http://127.0.0.1:4173/ python3 scripts/capture_rotation_check.py after

`before` is the app at 542d7d1's texture mapping (front rotates, reverse does not).
`after` is the registered mapping. Flat back turns the step-0 sheet group 180°
about model Y — the same axis as the app's turn-over — and lifts it a little so
the reverse sits above the table. That turn is capture-only; it does not run
the collar fold.
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "rotation-check"
BASE = os.environ.get("BASE_URL", "http://127.0.0.1:4173/").rstrip("/") + "/"
VIEWPORT = {"width": 1000, "height": 760}

LAUNCH = [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--disable-dev-shm-usage",
]

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

HIDE = """() => {
  for (const sel of ['.papers', '.dock', '.masthead', '.start-over']) {
    const el = document.querySelector(sel);
    if (el) el.style.visibility = 'hidden';
  }
}"""

# Flat back: reverse faces the workshop camera. A 180° turn about model Y sends
# the sheet under the table (model +z becomes world −y), so it is lifted in
# model z. Guides are parked below; show() refreshes visibility but not position.
FLAT_BACK = """() => {
  const root = window.paperCouture.stage.modelRoot;
  const sheet = root.children.find((c) => c.children[0] && c.children[0].isMesh && c.children[0].material && c.children[0].material.side === 0);
  const guides = root.children.find((c) => c !== sheet);
  if (!sheet) throw new Error('sheet group not found');
  if (guides) guides.position.z = -8;
  sheet.rotation.y = Math.PI;
  sheet.position.z = 0.08;
}"""


def url(paper: str, turn: int, step: int, display: bool) -> str:
    q = f"?paper={paper}&turn={turn}&step={step}"
    if display:
        q += "&view=display"
    return BASE + q


async def settle(page, display: bool, preset: str | None, flat_back: bool):
    await page.wait_for_function("() => window.paperCouture && window.paperCouture.controller")
    await page.wait_for_function(
        """() => {
          const P = window.paperCouture;
          return P.view.t === P.view.target && !P.controller.moving;
        }"""
    )
    if display:
        await page.wait_for_function("() => window.paperCouture.view.inDisplay")
        await page.evaluate(
            """(preset) => {
              const cam = window.paperCouture.displayCam;
              if (preset) cam.show(preset);
              cam.update(1);
            }""",
            preset,
        )
    await page.evaluate(HIDE)
    if flat_back:
        await page.evaluate(FLAT_BACK)
    await page.evaluate("() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))")
    await page.wait_for_timeout(80)


def make_sheet(items: list[tuple[Path, str]], cols: int, dest: Path, heading: str):
    font = ImageFont.truetype(FONT, 22)
    head = ImageFont.truetype(FONT_BOLD, 26)
    label_h = 36
    pad = 16
    sample = Image.open(items[0][0])
    scale = 520 / sample.width
    tw, th = int(sample.width * scale), int(sample.height * scale)
    sample.close()
    rows = (len(items) + cols - 1) // cols
    head_h = 72
    sheet = Image.new("RGB", (pad + cols * (tw + pad), head_h + pad + rows * (th + label_h + pad)), "#f3f0e8")
    draw = ImageDraw.Draw(sheet)
    draw.text((pad, 16), heading, fill="#2e2a25", font=head)
    for i, (path, label) in enumerate(items):
        im = Image.open(path).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
        r, c = divmod(i, cols)
        x = pad + c * (tw + pad)
        y = head_h + pad + r * (th + label_h + pad)
        sheet.paste(im, (x, y))
        draw.text((x, y + th + 6), label, fill="#2e2a25", font=font)
    dest.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(dest, optimize=True)
    print(f"sheet {dest} {sheet.size[0]}x{sheet.size[1]}")


async def main(phase: str):
    if phase not in ("before", "after"):
        raise SystemExit("usage: capture_rotation_check.py before|after")
    tmp = Path(os.environ.get("SHOT_DIR", f"/tmp/rotation-check-{phase}"))
    tmp.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)

    shots: list[tuple[Path, str]] = []
    garden: list[tuple[Path, str]] = []
    errors: list[str] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(args=LAUNCH)
        context = await browser.new_context(viewport=VIEWPORT, device_scale_factor=1)
        page = await context.new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

        async def grab(paper: str, turn: int, kind: str, dest: Path):
            display = kind.startswith("folded")
            step = 6 if display else 0
            preset = "back" if kind == "folded-back" else ("front" if kind == "folded-front" else None)
            await page.goto(url(paper, turn, step, display), wait_until="networkidle")
            await settle(page, display, preset, kind == "flat-back")
            await page.screenshot(path=str(dest))
            print(phase, kind, paper, turn)

        kinds = [
            ("flat-front", "flat front"),
            ("flat-back", "flat back"),
            ("folded-front", "folded front"),
            ("folded-back", "folded back"),
        ]
        for turn in range(4):
            for kind, label in kinds:
                dest = tmp / f"diag-{turn}-{kind}.png"
                await grab("rotation-check", turn, kind, dest)
                shots.append((dest, f"{turn * 90}° · {label}"))

        for turn in range(4):
            dest = tmp / f"garden-{turn}.png"
            await grab("reverse-garden", turn, "folded-back", dest)
            garden.append((dest, f"Reverse garden · {turn * 90}°"))

        print("console errors:", errors[:8])
        await browser.close()

    tag = "before the fix" if phase == "before" else "after the fix"
    diag_name = "diagnostic-grid-before.png" if phase == "before" else "diagnostic-grid.png"
    garden_name = f"reverse-garden-back-{phase}.png"
    make_sheet(
        shots,
        4,
        OUT / diag_name,
        f"Diagnostic sheet, {tag}. Rows 0/90/180/270. Columns: flat front, flat back, folded front, folded back.",
    )
    make_sheet(
        garden,
        4,
        OUT / garden_name,
        f"Reverse garden, finished dress, back view, {tag}.",
    )
    if errors:
        raise SystemExit("console errors during capture: " + " | ".join(errors[:6]))


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else ""))
