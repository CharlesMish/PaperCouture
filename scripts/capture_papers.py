#!/usr/bin/env python3
"""Capture every visible paper under one camera, then build contact sheets.

Uses the running app (query params for paper, step, turn, and view). UI chrome
is hidden only after layout, so the camera insets stay the same for every shot.

    BASE_URL=http://127.0.0.1:43123/ python3 scripts/capture_papers.py

Requires Playwright Chromium and Pillow. Writes docs/paper-studies/
(or docs/paper-studies-02 when STUDY=2).
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get("BASE_URL", "http://127.0.0.1:43123/").rstrip("/") + "/"
VIEWPORT = {"width": 900, "height": 680}

# STUDY=1 (default) is the first collection. STUDY=2 captures the second
# collection into docs/paper-studies-02. OUT_DIR overrides either folder.
STUDY = os.environ.get("STUDY", "1")

PAPERS_1 = [
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
ROTATIONS_1 = {pid: (0, 90, 180, 270) for pid in ("corner-bloom", "falling-chevrons", "wide-frame", "open-stems")}

PAPERS_2 = [
    ("midnight-orchard", "Midnight orchard"),
    ("tidal-bands", "Tidal bands"),
    ("plum-scatter", "Plum scatter"),
    ("cut-paper-mosaic", "Cut-paper mosaic"),
    ("woven-checks", "Woven checks"),
    ("reverse-garden", "Reverse garden"),
]
# 0° and 90° for every study-2 paper. 180° and 270° where the placement is
# asymmetric enough that a half turn moves the picture.
ROTATIONS_2 = {
    "midnight-orchard": (0, 90, 180, 270),
    "tidal-bands": (0, 90, 180, 270),
    "plum-scatter": (0, 90, 180, 270),
    "cut-paper-mosaic": (0, 90, 180, 270),
    "woven-checks": (0, 90),
    "reverse-garden": (0, 90),
}

if STUDY in ("2", "02"):
    PAPERS = PAPERS_2
    ROTATIONS = ROTATIONS_2
    DEFAULT_OUT = ROOT / "docs" / "paper-studies-02"
    FLAT_COLS = 3
    FOLDED_COLS = 6
    ROTATION_COLS = 4
    FLAT_HEADING = "Study 2 — flat square, workshop, step 0"
    FOLDED_HEADING = "Study 2 — finished dress, front preset, then angle, then back"
    ROTATION_HEADING = "Study 2 — finished dress, front preset, pattern rotations"
else:
    PAPERS = PAPERS_1
    ROTATIONS = ROTATIONS_1
    DEFAULT_OUT = ROOT / "docs" / "paper-studies"
    FLAT_COLS = 5
    FOLDED_COLS = 5
    ROTATION_COLS = 4
    FLAT_HEADING = "Flat square, workshop, step 0"
    FOLDED_HEADING = "Finished dress — front preset, then angle, then back"
    ROTATION_HEADING = "Finished dress, front preset, four pattern rotations"

OUT = Path(os.environ.get("OUT_DIR", str(DEFAULT_OUT)))

LAUNCH = [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--disable-dev-shm-usage",
]
# Optional system Chrome. Unset, Playwright's Chromium is used.
CHROME = os.environ.get("CHROME_PATH", "").strip()

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
        launch_kwargs = {"args": LAUNCH}
        if CHROME:
            launch_kwargs["executable_path"] = CHROME
        browser = await p.chromium.launch(**launch_kwargs)
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
        for pid, degrees in ROTATIONS.items():
            for deg in degrees:
                turn = deg // 90
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
        FLAT_COLS,
        OUT / "flat-grid.png",
        FLAT_HEADING,
    )
    make_sheet(
        [(OUT / "front" / f"{pid}.png", f"{names[pid]} · front") for pid, _ in PAPERS]
        + [(OUT / "angle" / f"{pid}.png", f"{names[pid]} · angle") for pid, _ in PAPERS]
        + [(OUT / "back" / f"{pid}.png", f"{names[pid]} · back") for pid, _ in PAPERS],
        FOLDED_COLS,
        OUT / "folded-grid.png",
        FOLDED_HEADING,
    )
    make_sheet(
        [
            (OUT / "rotations" / f"{pid}-{deg}.png", label(pid, deg))
            for pid, degrees in ROTATIONS.items()
            for deg in degrees
        ],
        ROTATION_COLS,
        OUT / "rotation-grid.png",
        ROTATION_HEADING,
    )


if __name__ == "__main__":
    asyncio.run(main())
