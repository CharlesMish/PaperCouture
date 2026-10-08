#!/usr/bin/env python3
"""Capture one garment for review: every workshop step, the display presets,
the waist (or any) step mid-motion, and every paper front and back.

    BASE_URL=http://127.0.0.1:43123/ DESIGN=fit-flare python3 scripts/capture_dress.py

Writes docs/<DESIGN>/ (steps.png, motion.png, papers.png; tiles/ stays out of
git). Requires Playwright Chromium and Pillow; reuses the camera handling of
capture_papers.py. PAPERS=id,id overrides the paper list.
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path

from playwright.async_api import async_playwright

import capture_papers as cp

ROOT = Path(__file__).resolve().parents[1]
DESIGN = os.environ.get("DESIGN", "fit-flare")
OUT = Path(os.environ.get("OUT_DIR", str(ROOT / "docs" / DESIGN)))
BASE = os.environ.get("BASE_URL", "http://127.0.0.1:43123/").rstrip("/") + "/"
MOTION_STEP = int(os.environ.get("MOTION_STEP", "4"))  # op index shown mid-motion
MOTION_T = [0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 0.95]


# the curated papers, then Sunray pleats
PAPERS = os.environ.get(
    "PAPERS",
    "stripe-disc,running-stitch,pinstripe-lining,plum-scatter,oat-linen,slate-grain,plum-seed,"
    "border-print,botanical,indigo-lattice,ivory-border,sunray-pleats",
).split(",")

# studio controls sit over the table on this branch; hide them for captures too
HIDE_MORE = """() => {
  for (const sel of ['.studio-controls', '.shape-choices', '.print-position']) {
    for (const el of document.querySelectorAll(sel)) el.style.visibility = 'hidden';
  }
}"""


def url(paper: str, step: int, display: bool) -> str:
    return BASE + f"?design={DESIGN}&paper={paper}&step={step}" + ("&view=display" if display else "")


async def main():
    tiles = OUT / "tiles"
    tiles.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=cp.LAUNCH)
        page = await (await browser.new_context(viewport=cp.VIEWPORT, device_scale_factor=1)).new_page()
        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

        await page.goto(url("grid", 0, False), wait_until="networkidle")
        await cp.settle(page, False, None)
        steps = await page.evaluate("() => window.paperCouture.timeline.ops.map((o) => o.op.title)")

        step_items = []
        for k in range(len(steps) + 1):
            await page.goto(url("grid", k, False), wait_until="networkidle")
            await cp.settle(page, False, None)
            await page.evaluate(HIDE_MORE)
            dest = tiles / f"step-{k}.png"
            await page.screenshot(path=str(dest))
            step_items.append((dest, "Flat square" if k == 0 else f"{k}. {steps[k - 1]}"))
        for preset in ("front", "angle", "back"):
            await page.goto(url("grid", len(steps), True), wait_until="networkidle")
            await cp.settle(page, True, None if preset == "front" else preset)
            await page.evaluate(HIDE_MORE)
            dest = tiles / f"display-{preset}.png"
            await page.screenshot(path=str(dest))
            step_items.append((dest, f"Display · {preset}"))

        motion_items = []
        await page.goto(url("botanical", MOTION_STEP, False), wait_until="networkidle")
        await cp.settle(page, False, None)
        await page.evaluate(HIDE_MORE)
        for t in MOTION_T:
            await page.evaluate(
                "(t) => { const c = window.paperCouture.controller; if (!c.isScrubbing) c.beginScrub(); c.scrubTo(t); }",
                t,
            )
            await page.evaluate("() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))")
            dest = tiles / f"motion-{int(t * 100):02d}.png"
            await page.screenshot(path=str(dest))
            motion_items.append((dest, f"Step {MOTION_STEP + 1} at {int(t * 100)}%"))

        paper_items = []
        for pid in PAPERS:
            for preset in ("front", "back"):
                await page.goto(url(pid, len(steps), True), wait_until="networkidle")
                await cp.settle(page, True, None if preset == "front" else preset)
                await page.evaluate(HIDE_MORE)
                name = await page.evaluate("() => document.querySelector('.paper-name').textContent")
                dest = tiles / f"{pid}-{preset}.png"
                await page.screenshot(path=str(dest))
                paper_items.append((dest, f"{name} · {preset}"))

        await browser.close()
        print("console errors:", errors[:8])
        if errors:
            raise SystemExit("console errors during capture")

    cp.make_sheet(step_items, 5, OUT / "steps.png", f"{DESIGN}: workshop steps, then the display presets")
    cp.make_sheet(motion_items, 4, OUT / "motion.png", f"{DESIGN}: step {MOTION_STEP + 1} in motion")
    cp.make_sheet(paper_items, 6, OUT / "papers.png", f"{DESIGN}: curated papers and Sunray pleats, front then back")


if __name__ == "__main__":
    asyncio.run(main())
