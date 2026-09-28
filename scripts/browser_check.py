from pathlib import Path
import os
ROOT = Path(__file__).resolve().parents[1]
CAPTURE_DIR = Path(os.environ.get("CAPTURE_DIR", str(ROOT / "docs" / "captures")))
CAPTURE_DIR.mkdir(parents=True, exist_ok=True)
BASE_URL = os.environ.get("BASE_URL", "http://localhost:4173/").rstrip("/") + "/"
import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':1280,'height':800})).new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto(BASE_URL); await pg.wait_for_timeout(1200)
        J=pg.evaluate; P='window.paperCouture'
        wait="(async()=>{const P=window.paperCouture;for(let i=0;i<600&&(P.view.t!==P.view.target||P.controller.moving);i++)await new Promise(r=>setTimeout(r,50));})()"
        # paper change and rotation mid-fold, at several steps
        for s in [0,2,4]:
            await J(f"{P}.controller.jumpTo({s})"); await pg.get_by_role('button', name='Fold').or_(pg.get_by_role('button', name='Turn over')).click()
            await pg.wait_for_timeout(250)
            await pg.get_by_role('radio', name='Indigo lattice').click(); await pg.get_by_role('button', name='Rotate pattern').click()
            await J(wait)
            print(f'step {s}: after paper change mid-fold -> step', await J(f'{P}.controller.step'))
        await pg.get_by_role('radio', name='Stripe and disc').click()
        # Display is only offered when finished
        await J(f"{P}.controller.jumpTo(3)"); await J(f"{P}.enterDisplay()"); print('enterDisplay at step 3 ->', await J(f'{P}.view.mode'))
        await J(f"{P}.controller.jumpTo(6)")
        # reverse mid-transition, both ways
        await pg.get_by_role('button', name='Display').click(); await pg.wait_for_function(f"{P}.view.t>0.4", timeout=20000)
        await pg.get_by_role('button', name='Return to the workshop').click(); await J(wait)
        print('Workshop pressed mid-way in:', await J(f'{P}.view.mode'), await J(f'{P}.view.t'))
        await pg.get_by_role('button', name='Display').click(); await J(wait)
        await pg.get_by_role('button', name='Turntable').click(); await pg.wait_for_timeout(1500)
        print('turntable on:', await J(f'{P}.displayCam.turntable'), '| aria-pressed', await pg.get_by_role('button', name='Turntable').get_attribute('aria-pressed'))
        await pg.get_by_role('button', name='Back', exact=True).click()
        print('preset stops turntable:', not await J(f'{P}.displayCam.turntable'))
        await J(f'{P}.displayCam.update(1)'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=str(CAPTURE_DIR / 'c3-back-lit.png'))
        await pg.get_by_role('button', name='Angle', exact=True).click(); await J(f'{P}.displayCam.update(1)'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=str(CAPTURE_DIR / 'c3-angle-fit.png'))
        # zoom in with the wheel, then reset view
        await pg.mouse.move(640,380)
        for _ in range(6): await pg.mouse.wheel(0,-300); await pg.wait_for_timeout(80)
        d1 = await J(f'{P}.displayCam.controls.getDistance()')
        await pg.get_by_role('button', name='Reset view').click(); await J(f'{P}.displayCam.update(1)'); await pg.wait_for_timeout(200)
        d2 = await J(f'{P}.displayCam.controls.getDistance()')
        print(f'zoomed distance {d1:.2f}, after Reset view {d2:.2f} (default {await J(f"{P}.displayCam.defaultDistance()"):.2f})')
        await pg.keyboard.press('Escape'); await J(wait)
        print('Escape ->', await J(f'{P}.view.mode'), '| step kept:', await J(f'{P}.controller.step'))
        print('errors:', json.dumps(errs[:5]))
        await b.close()
asyncio.run(main())
