// Room for the paper, in the real app:
// - the workshop camera frames the paper the current step involves: closer as the
//   piece gets smaller, never farther out than the whole sheet; still while a step
//   waits and while it is dragged; settled when a fold has finished; Back retraces;
// - on narrow screens in the workshop the top controls fold down to one row
//   (Browse pieces, the design list, More); More opens the rest over the paper
//   without moving it, and closes on a press outside, Escape, or a choice; folding
//   an accessory keeps the full controls with Back to garment;
// - the paper's size on screen is recorded and has to clear a floor per viewport.
// Isolated local contexts only.
//
//   BASE_URL=http://127.0.0.1:4173 CAPTURE_DIR=.phone-layout-qa node scripts/check-phone-layout-browser.cjs
//
// Chromium with software WebGL and emulated touch: not a real phone.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://127.0.0.1:4173';
const out = process.env.CAPTURE_DIR || '.phone-layout-qa';
// width of the kimono at step 8 on screen, in CSS px: before this change it was 41 / 110 / 220
const FLOOR = { '320x568': 140, '390x844': 250, '1180x900': 330 };
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const result = { base, checks: [], paperPx: {}, errors: [], physicalPhoneTested: false };
  fs.mkdirSync(out, { recursive: true });
  const make = async (width, height, touch) => {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    const page = await context.newPage(); page.setDefaultTimeout(30000);
    const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
    const settle = () => page.waitForFunction(() => window.paperCouture && !paperCouture.controller.moving && paperCouture.view.t === paperCouture.view.target && !paperCouture.displayCam.glide);
    const load = async (q) => { assert((await page.goto(base + '/?' + q)).ok()); await settle(); await frames(); };
    const frames = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const camera = () => page.evaluate(() => paperCouture.stage.camera.position.toArray().map((n) => +n.toFixed(6)));
    const paper = () => page.evaluate(() => {
      const P = paperCouture, cam = P.stage.camera, V = cam.position.constructor, c = P.stage.renderer.domElement;
      const pos = P.sheet.front.geometry.getAttribute('position'), m = P.stage.modelRoot.matrixWorld;
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (let i = 0; i < pos.count; i++) {
        const v = new V(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(m).project(cam);
        const x = (v.x + 1) / 2 * c.clientWidth, y = (1 - v.y) / 2 * c.clientHeight;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
      return { w: Math.round(x1 - x0), h: Math.round(y1 - y0), top: y0, bottom: y1, left: x0, right: x1 };
    });
    const shot = (name) => page.screenshot({ path: path.join(out, name + '.png') });
    return { context, page, errors, settle, load, frames, camera, paper, shot };
  };
  try {
    // --- framing follows the paper; still while waiting and dragging; Back retraces
    {
      const s = await make(1180, 900, false);
      await s.load('design=kimono&paper=oat-linen&step=0');
      const start = await s.camera();
      await s.load('design=kimono&paper=oat-linen&step=7');
      const k = await s.paper();
      result.paperPx['1180x900'] = k;
      assert(k.w >= FLOOR['1180x900'], `desktop kimono step 8 is ${k.w}px wide`);
      const waiting = await s.camera();
      assert.notDeepEqual(waiting, start, 'the camera comes closer as the piece gets smaller');
      await s.page.waitForTimeout(400); await s.frames();
      assert.deepEqual(await s.camera(), waiting, 'still while the step waits');
      // a short drag of a grip, released before the fold commits: the camera does not move
      const g = await s.page.locator('.fold-handle').first().evaluate((b) => { const r = b.getBoundingClientRect(), t = new DOMMatrix(getComputedStyle(b.firstElementChild).transform); return { x: r.x + r.width / 2, y: r.y + r.height / 2, vx: t.a, vy: t.b }; });
      await s.page.mouse.move(g.x, g.y); await s.page.mouse.down();
      await s.page.mouse.move(g.x + g.vx * 20, g.y + g.vy * 20, { steps: 3 }); await s.frames();
      assert.deepEqual(await s.camera(), waiting, 'still while the first part of a fold is dragged');
      await s.page.mouse.up(); await s.settle(); await s.frames();
      assert.equal(await s.page.evaluate(() => paperCouture.controller.step), 7);
      // fold to the end: settled when the fold is; Back retraces to the same pose
      await s.page.locator('.dock:not([hidden]) .btn-primary').click(); await s.settle(); await s.frames();
      const done = await s.camera();
      await s.page.waitForTimeout(300); await s.frames();
      assert.deepEqual(await s.camera(), done, 'settled when the fold has finished');
      await s.page.getByRole('button', { name: 'Back', exact: true }).click(); await s.settle(); await s.frames();
      assert.deepEqual(await s.camera(), waiting, 'Back retraces the framing');
      // the whole piece stays in view at every step of a long fold
      for (let step = 0; step <= 8; step++) {
        await s.load(`design=kimono&paper=oat-linen&step=${step}`);
        const p = await s.paper();
        assert(p.left >= 0 && p.right <= 1180 && p.top >= 0 && p.bottom <= 900, `kimono step ${step}: the paper in view ${JSON.stringify(p)}`);
      }
      await s.shot('desktop-kimono-8');
      assert.deepEqual(s.errors, []);
      result.checks.push(`1180x900: kimono step 8 ${k.w}px wide (was 220); camera still while waiting and during a short drag, settled after the fold, Back retraces; the paper in view at every kimono step.`);
      await s.context.close();
    }
    // --- the folding bar on narrow screens
    for (const [w, h] of [[320, 568], [390, 844]]) {
      const s = await make(w, h, true);
      const key = `${w}x${h}`;
      await s.load('design=kimono&paper=oat-linen&step=7');
      const bar = s.page.locator('.studio-controls');
      assert.equal(await bar.evaluate((e) => e.classList.contains('folding-bar')), true, `${key}: folding bar`);
      const more = s.page.getByRole('button', { name: 'More', exact: true });
      for (const c of [s.page.getByRole('button', { name: 'Browse pieces', exact: true }), s.page.getByLabel('Garment design', { exact: true }), more]) assert.equal(await c.isVisible(), true);
      for (const name of ['Revisit fold']) assert.equal(await s.page.getByRole('button', { name, exact: true }).isVisible(), false, `${key}: ${name} under More`);
      // one row: every shown control's vertical centre within a few px of the others'
      const rows = await bar.evaluate((e) => [...e.children].filter((c) => c.getBoundingClientRect().height > 0).map((c) => { const r = c.getBoundingClientRect(); return r.top + r.height / 2; }));
      assert(rows.length === 3 && Math.max(...rows) - Math.min(...rows) <= 3, `${key}: one row of three controls ${JSON.stringify(rows)}`);
      const k = await s.paper();
      result.paperPx[key] = k;
      assert(k.w >= FLOOR[key], `${key}: kimono step 8 is ${k.w}px wide`);
      const barBottom = await bar.evaluate((e) => e.getBoundingClientRect().bottom);
      const dockTop = await s.page.locator('.dock:not(.display-dock)').evaluate((e) => e.getBoundingClientRect().top);
      assert(k.top >= barBottom - 2 && k.bottom <= dockTop + 2, `${key}: the paper between the bar and the dock`);
      await s.shot(`${key}-bar`);
      // More: over the paper, without moving it; closes on a press outside, Escape, and a choice
      const cam = await s.camera();
      await more.tap(); await s.frames();
      assert.equal(await more.getAttribute('aria-expanded'), 'true');
      assert.equal(await s.page.getByRole('button', { name: 'Revisit fold', exact: true }).isVisible(), true);
      assert.equal(await s.page.getByRole('button', { name: /^View board/ }).isVisible(), true);
      assert.deepEqual(await s.camera(), cam, `${key}: opening More does not move the paper`);
      await s.shot(`${key}-more`);
      await s.page.mouse.click(w / 2, k.bottom - 4); await s.frames();
      assert.equal(await more.getAttribute('aria-expanded'), 'false', 'a press outside closes More');
      await more.tap(); await s.page.keyboard.press('Escape');
      assert.equal(await more.getAttribute('aria-expanded'), 'false', 'Escape closes More');
      await more.tap();
      await s.page.getByLabel('Fold to revisit').selectOption('kimonoSide');
      await s.page.getByRole('button', { name: 'Revisit fold', exact: true }).tap(); await s.settle();
      assert.equal(await more.getAttribute('aria-expanded'), 'false', 'a choice closes More');
      assert.equal(await s.page.evaluate(() => paperCouture.controller.step), 0, 'Revisit works from More');
      // finished: the bar stays, accessories under More; folding one keeps the full controls
      await s.load('design=kimono&paper=oat-linen&step=99');
      assert.equal(await bar.evaluate((e) => e.classList.contains('folding-bar')), true, `${key}: the bar stays on the finished piece`);
      await more.tap();
      await s.page.getByLabel('Accessory type').selectOption('obi');
      await s.page.getByRole('button', { name: 'Fold accessory', exact: true }).tap(); await s.settle();
      assert.equal(await s.page.evaluate(() => paperCouture.accessoryMode), true);
      assert.equal(await bar.evaluate((e) => e.classList.contains('folding-bar')), false, `${key}: full controls while folding an accessory`);
      assert.equal(await s.page.getByRole('button', { name: 'Back to garment', exact: true }).isVisible(), true);
      assert.equal(await s.page.evaluate(() => document.documentElement.scrollWidth), w, 'no horizontal scroll');
      assert.deepEqual(s.errors, []);
      result.checks.push(`${key}: one-row bar (Browse, Design, More); kimono step 8 ${k.w}px wide, between the bar and the dock; More shows Revisit and View board over the paper without moving it, closes on a press outside, Escape and a choice; Revisit works from it; finished piece keeps the bar with accessories under More; folding the obi brings back the full controls with Back to garment.`);
      await s.context.close();
    }
  } catch (e) {
    result.errors.push(String(e && e.stack || e));
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
    if (result.errors.length) process.exit(1);
  }
})();
