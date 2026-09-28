from pathlib import Path
import os
ROOT = Path(__file__).resolve().parents[1]
CAPTURE_DIR = Path(os.environ.get("CAPTURE_DIR", str(ROOT / "docs" / "captures")))
CAPTURE_DIR.mkdir(parents=True, exist_ok=True)
BASE_URL = os.environ.get("BASE_URL", "http://localhost:4173/").rstrip("/") + "/"
import asyncio, json
from playwright.async_api import async_playwright
U=BASE_URL
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        errs=[]
        async def page(vp, mobile=False):
            ctx = await b.new_context(viewport=vp, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile)
            pg = await ctx.new_page()
            pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
            pg.on('pageerror', lambda e: errs.append(str(e)))
            return pg
        J = lambda pg, js: pg.evaluate(js)
        settle = "(async()=>{const P=window.paperCouture;for(let i=0;i<400&&(P.view.t!==P.view.target||P.controller.moving);i++)await new Promise(r=>setTimeout(r,50));if(P.view.inDisplay)P.displayCam.update(1);})()"
        pg = await page({'width':1280,'height':800})
        await pg.goto(U); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=str(CAPTURE_DIR / 'c3-start.png'))
        await J(pg,"(()=>{const c=window.paperCouture.controller;c.jumpTo(2);c.beginScrub();c.scrubTo(0.55)})()"); await pg.wait_for_timeout(500)
        await pg.screenshot(path=str(CAPTURE_DIR / 'c3-mid.png'))
        await J(pg,"window.paperCouture.controller.endScrub(true)"); await J(pg,settle)
        await J(pg,"window.paperCouture.controller.jumpTo(6)"); await pg.wait_for_timeout(400)
        await pg.screenshot(path=str(CAPTURE_DIR / 'c3-finished.png'))
        await pg.get_by_role('button', name='Display').click()
        # capture mid-transition
        await pg.wait_for_function("window.paperCouture.view.t>0.45", timeout=20000)
        await pg.screenshot(path=str(CAPTURE_DIR / 'c3-transition.png'))
        await J(pg,settle); await pg.wait_for_timeout(300)
        await pg.screenshot(path=str(CAPTURE_DIR / 'c3-display-front.png'))
        for v,name in [('Angle','angle'),('Back','back')]:
            await pg.get_by_role('button', name=v, exact=True).click(); await J(pg,"window.paperCouture.displayCam.update(1)"); await pg.wait_for_timeout(300)
            await pg.screenshot(path=str(CAPTURE_DIR / f'c3-display-{name}.png'))
        await pg.get_by_role('button', name='Angle', exact=True).click(); await J(pg,"window.paperCouture.displayCam.update(1)")
        for pid in ['Ivory, ink border','Indigo lattice','Botanical sprigs']:
            await pg.get_by_role('radio', name=pid).click(); await pg.wait_for_timeout(300)
            await pg.screenshot(path=str(CAPTURE_DIR / f"c3-paper-{pid.split()[0].strip(',').lower()}.png"))
        await pg.get_by_role('radio', name='Stripe and disc').click()
        await pg.get_by_role('button', name='Turn paper').click(); await pg.get_by_role('button', name='Front', exact=True).click(); await J(pg,"window.paperCouture.displayCam.update(1)"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=str(CAPTURE_DIR / 'c3-rotated.png'))
        await pg.get_by_role('button', name='Return to the workshop').click(); await J(pg,settle); await pg.wait_for_timeout(300)
        print('back in workshop, step =', await J(pg,'window.paperCouture.controller.step'), 'view =', await J(pg,'window.paperCouture.view.mode'))
        await pg.screenshot(path=str(CAPTURE_DIR / 'c3-returned.png'))
        await pg.context.close()
        ph = await page({'width':390,'height':844}, True)
        await ph.goto(U); await ph.wait_for_timeout(1500)
        await ph.screenshot(path=str(CAPTURE_DIR / 'c3-phone-start.png'))
        await ph.goto(U+'?step=6&view=display'); await ph.wait_for_timeout(1500)
        await ph.screenshot(path=str(CAPTURE_DIR / 'c3-phone-display.png'))
        print('errors:', json.dumps(errs[:8]))
        await b.close()
asyncio.run(main())
