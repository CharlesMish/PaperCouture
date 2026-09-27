#!/usr/bin/env python3
"""Capture every visible paper under one camera, then build contact sheets.

Uses the running app (query params for paper, step, turn, and view). UI chrome
is hidden only after layout, so the camera insets stay the same for every shot.

    BASE_URL=http://127.0.0.1:43123/ python3 scripts/capture_papers.py

Requires Playwright Chromium and Pillow. Writes docs/paper-studies/.
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get("OUT_DIR", str(ROOT / "docs" / "paper-studies")))
BASE = os.environ.get("BASE_URL", "http://127.0.0.1:43123/").rstrip("/") + "/"
VIEWPORT = {"width": 900, "height": 680}

# Swatch order. The diagnostic grid stays hidden and is not part of the study.
PAPERS = [
    ("stripe-disc", "Stripe and disc"),
    ("ivory-border", "Ivory, ink border"),
    ("indigo-lattice", "Indigo lattice"),
    ("botanical", "Botanical sprigs"),
    ("wide-frame", "Wide frame"),
    ("corner-bloom", "Corner bloom"),
    ("open-stems", "Open stems"),
    ("falling-chevrons", "Falling chevrons"),
    ("seed-dashes", "Seed dashes"),
    ("ink-reverse", "Ink reverse"),
]

# Rotation changes where these land on the dress. Ink reverse's drawn back
# does not rotate with the pattern, and seed dashes only swap dash direction.
ROTATION_IDS = ["corner-bloom", "falling-chevrons", "wide-frame", "open-stems"]

LAUNCH = [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--disable-dev-shm-usage",
]

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def url(paper: str, turn: int, step: int, display: bool) -> str:
    q = f"?paper={paper}&turn={turn}&step={step}"
    if display:
        q += "&view=display"
    return BASE + q


HIDE = """() => {
  for (const sel of ['.papers', '.dock', '.masthead', '.start-over']) {
    const el = document.querySelector(sel);
    if (el) el.style.visibility = 'hidden';
  }
}"""

CAM = """() => {
  const c = window.paperCouture.stage.camera;
  return {
    pos: c.position.toArray().map((n) => Math.round(n * 1000) / 1000),
    aspect: Math.round(c.aspect * 1000) / 1000,
  };
}"""


async def settle(page, display: bool, preset: str | None):
    await page.wait_for_function("() => window.paperCouture && window.paperCouture.controller")
    await page.wait_for_function(
        """() => {
          const P = window.paperCouture;
          return P.view.t === P.view.target && !P.controller.moving;
        }"""
    )
    if display:
        await page.wait_for_function("() => window.paperCouture.view.inDisplay")
        if preset:
            await page.evaluate(
                """(preset) => {
                  const cam = window.paperCouture.displayCam;
                  cam.show(preset);
                  cam.update(1);
                }""",
                preset,
            )
        else:
            await page.evaluate("() => window.paperCouture.displayCam.update(1)")
    await page.evaluate(HIDE)
    await page.evaluate(
        "() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))"
    )
    await page.wait_for_timeout(120)


def make_sheet(items: list[tuple[Path, str]], cols: int, dest: Path, heading: str):
    font = ImageFont.truetype(FONT, 22)
    head = ImageFont.truetype(FONT_BOLD, 28)
    label_h = 36
    pad = 18
    # Scale tiles so a five-column sheet stays sharp but not enormous.
    sample = Image.open(items[0][0])
    scale = 640 / sample.width
    tw, th = int(sample.width * scale), int(sample.height * scale)
    sample.close()
    rows = (len(items) + cols - 1) // cols
    head_h = 64
    sheet_w = pad + cols * (tw + pad)
    sheet_h = head_h + pad + rows * (th + label_h + pad)
    sheet = Image.new("RGB", (sheet_w, sheet_h), "#f3f0e8")
    draw = ImageDraw.Draw(sheet)
    draw.text((pad, 18), heading, fill="#2e2a25", font=head)
    for i, (path, label) in enumerate(items):
        im = Image.open(path).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
        r, c = divmod(i, cols)
        x = pad + c * (tw + pad)
        y = head_h + pad + r * (th + label_h + pad)
        sheet.paste(im, (x, y))
        draw.text((x, y + th + 6), label, fill="#2e2a25", font=font)
    dest.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(dest, optimize=True)
    print(f"sheet {dest.name} {sheet.size[0]}x{sheet.size[1]}")


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for sub in ("flat", "front", "angle", "back", "rotations"):
        (OUT / sub).mkdir(parents=True, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(args=LAUNCH)
        context = await browser.new_context(viewport=VIEWPORT, device_scale_factor=1)
        page = await context.new_page()
        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

        cams: dict[str, list] = {"flat": [], "front": [], "angle": [], "back": [], "rotation": []}

        async def grab(paper: str, turn: int, kind: str, dest: Path):
            display = kind != "flat"
            step = 0 if kind == "flat" else 6
            preset = {"angle": "angle", "back": "back"}.get(kind)
            await page.goto(url(paper, turn, step, display), wait_until="networkidle")
            await settle(page, display, preset)
            cam = await page.evaluate(CAM)
            if kind in cams:
                cams[kind].append((paper, turn, cam))
            await page.screenshot(path=str(dest))
            print(kind, paper, turn, cam["pos"])

        for pid, _name in PAPERS:
            await grab(pid, 0, "flat", OUT / "flat" / f"{pid}.png")
            await grab(pid, 0, "front", OUT / "front" / f"{pid}.png")
            await grab(pid, 0, "angle", OUT / "angle" / f"{pid}.png")
            await grab(pid, 0, "back", OUT / "back" / f"{pid}.png")

        names = dict(PAPERS)
        for pid in ROTATION_IDS:
            for turn, deg in enumerate((0, 90, 180, 270)):
                await grab(pid, turn, "rotation", OUT / "rotations" / f"{pid}-{deg}.png")

        for kind, shots in cams.items():
            first = shots[0][2]
            bad = [s for s in shots if s[2] != first]
            print(f"camera {kind}: {len(shots)} shots, mismatches {len(bad)}")
            for s in bad[:6]:
                print("  ", s)

        print("console errors:", errors[:8])
        await browser.close()
        if errors:
            raise SystemExit("console errors during capture")

    def label(pid: str, deg: int) -> str:
        return f"{names[pid]} · {deg}°"

    make_sheet(
        [(OUT / "flat" / f"{pid}.png", label(pid, 0)) for pid, _ in PAPERS],
        5,
        OUT / "flat-grid.png",
        "Flat square, workshop, step 0",
    )
    make_sheet(
        [(OUT / "front" / f"{pid}.png", f"{names[pid]} · front") for pid, _ in PAPERS]
        + [(OUT / "angle" / f"{pid}.png", f"{names[pid]} · angle") for pid, _ in PAPERS]
        + [(OUT / "back" / f"{pid}.png", f"{names[pid]} · back") for pid, _ in PAPERS],
        5,
        OUT / "folded-grid.png",
        "Finished dress — front preset, then angle, then back",
    )
    make_sheet(
        [
            (OUT / "rotations" / f"{pid}-{deg}.png", label(pid, deg))
            for pid in ROTATION_IDS
            for deg in (0, 90, 180, 270)
        ],
        4,
        OUT / "rotation-grid.png",
        "Finished dress, front preset, four pattern rotations",
    )


if __name__ == "__main__":
    asyncio.run(main())
