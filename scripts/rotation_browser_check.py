#!/usr/bin/env python3
"""Click through Workshop and Display on the built app.

Turn paper mid-fold (progress kept), turn in Display (view and fold kept),
four turns return to 0°, switching papers keeps the turn, Back and Start over
still work. Saves three screenshots under docs/rotation-check/.
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "rotation-check"
BASE = os.environ.get("BASE_URL", "http://127.0.0.1:4173/").rstrip("/") + "/"

LAUNCH = [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--disable-dev-shm-usage",
]

STATE = """() => {
  const P = window.paperCouture;
  const pose = P.controller.pose();
  const btn = document.querySelector('button.rotate');
  return {
    step: P.controller.step,
    moving: P.controller.moving,
    finished: P.controller.finished,
    op: pose.op,
    t: pose.t,
    pending: pose.pending,
    mode: P.view.mode,
    inDisplay: P.view.inDisplay,
    turn: btn ? btn.getAttribute('aria-label') : '',
    label: btn ? btn.innerText.replace(/\\s+/g, ' ').trim() : '',
    name: (document.querySelector('.paper-name') || {}).textContent || '',
    cam: P.stage.camera.position.toArray(),
  };
}"""


def cam_dist(a, b) -> float:
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


async def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    problems: list[str] = []
    errors: list[str] = []

    def check(cond: bool, msg: str) -> None:
        print(("ok  " if cond else "FAIL") + " " + msg)
        if not cond:
            problems.append(msg)

    async with async_playwright() as p:
        browser = await p.chromium.launch(args=LAUNCH)
        page = await (await browser.new_context(viewport={"width": 1280, "height": 800})).new_page()
        page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

        await page.goto(BASE, wait_until="networkidle")
        await page.wait_for_function("() => window.paperCouture && window.paperCouture.controller")
        turn = page.get_by_role("button", name="Turn paper")
        primary = page.locator("button.btn-primary")

        # Mid-fold: start a fold, then turn the paper before it finishes.
        await primary.click()
        await page.wait_for_function("() => window.paperCouture.controller.moving")
        await page.wait_for_timeout(280)
        before = await page.evaluate(STATE)
        await turn.click()
        mid = await page.evaluate(STATE)
        check(before["moving"] and before["step"] == 0 and before["t"] > 0.05, f"fold was in progress (t={before['t']:.2f})")
        check(mid["step"] == before["step"] and mid["op"] == before["op"] and mid["moving"], "turn mid-fold kept the step")
        check(mid["t"] + 1e-3 >= before["t"] - 0.05, f"fold progress not reset ({before['t']:.2f} -> {mid['t']:.2f})")
        check("90" in mid["turn"] and mid["label"] == "Turn paper", f"control reads {mid['label']!r} / {mid['turn']!r}")
        await page.screenshot(path=str(OUT / "browser-workshop-midfold.png"))

        # Four turns from the start return to 0°.
        await page.goto(BASE, wait_until="networkidle")
        await page.wait_for_function("() => window.paperCouture")
        seen = []
        for _ in range(4):
            await turn.click()
            seen.append((await page.evaluate(STATE))["turn"])
        check(seen == [
            "Turn paper (now 90°)",
            "Turn paper (now 180°)",
            "Turn paper (now 270°)",
            "Turn paper (now 0°)",
        ], f"four turns -> {seen}")
        await page.screenshot(path=str(OUT / "browser-four-turns.png"))

        # Switch papers after a turn; the quarter turn and the flat sheet stay.
        await turn.click()
        await page.get_by_role("radio", name="Reverse garden").click()
        switched = await page.evaluate(STATE)
        check(
            switched["name"] == "Reverse garden, paper turned 90°" and switched["step"] == 0 and not switched["moving"],
            f"paper switch kept the turn ({switched['name']!r}, step {switched['step']})",
        )

        # Back, then Start over.
        async def finish_one() -> None:
            await primary.click()
            await page.wait_for_function("() => window.paperCouture.controller.moving", timeout=5000)
            await primary.click()
            await page.wait_for_function("() => !window.paperCouture.controller.moving", timeout=5000)

        await finish_one()
        await finish_one()
        rested = await page.evaluate(STATE)
        check(rested["step"] == 2 and not rested["moving"], f"two folds land on step {rested['step']}")
        await page.get_by_role("button", name="Back", exact=True).click()
        await page.wait_for_function("() => window.paperCouture.controller.step === 1 && !window.paperCouture.controller.moving")
        backed = await page.evaluate(STATE)
        check(backed["step"] == 1 and "90" in backed["turn"], f"Back returned to step {backed['step']} and kept the turn")
        await page.get_by_role("button", name="Start over").click()
        await page.wait_for_timeout(50)
        reset = await page.evaluate(STATE)
        check(reset["step"] == 0 and not reset["moving"] and "90" in reset["turn"], f"Start over -> step {reset['step']}, turn kept")

        # Finish the dress with clicks, enter Display, look at the back, then turn.
        for _ in range(6):
            await finish_one()
        done = await page.evaluate(STATE)
        check(done["finished"] and done["step"] == 6, f"finished at step {done['step']}")
        await page.get_by_role("button", name="Display").click()
        await page.wait_for_function("() => window.paperCouture.view.inDisplay")
        await page.locator(".segmented").get_by_role("button", name="Back", exact=True).click()
        await page.evaluate("() => window.paperCouture.displayCam.update(1)")
        await page.wait_for_timeout(80)
        at_back = await page.evaluate(STATE)
        await turn.click()
        turned = await page.evaluate(STATE)
        check(turned["inDisplay"] and turned["step"] == 6 and not turned["moving"], "display turn kept fold state and view mode")
        check("180" in turned["turn"], f"display turn advanced ({turned['turn']})")
        dist = cam_dist(at_back["cam"], turned["cam"])
        check(dist < 0.05, f"display camera stayed put (moved {dist:.4f})")
        await page.screenshot(path=str(OUT / "browser-display-turn.png"))

        print("console errors:", errors[:8])
        await browser.close()

    if errors:
        problems.append("console errors: " + " | ".join(errors[:4]))
    if problems:
        print(f"\n{len(problems)} problem(s)")
        sys.exit(1)
    print("\nbrowser checks passed")


if __name__ == "__main__":
    asyncio.run(main())
