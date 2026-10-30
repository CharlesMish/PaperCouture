// Room for the paper, in the real app:
// - the workshop camera frames the paper the current step involves: closer as the
//   piece gets smaller, never farther out than the whole sheet; still while a step
//   waits and for the whole of a drag (long, reversed, or cancelled); moving from
//   where it held, without a jump, once the drag is let go; Back retraces;
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
    const page = await context.newPage(); page.setDefaultTimeout(Number(process.env.CHECK_TIMEOUT_MS) || 30000); // a slower machine (software WebGL) may need longer
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
    // --- a non-final step whose frame changes (kimono step 7 -> 8): the camera holds
    //     still for the whole of a drag, however far, through a reversal; on release it
    //     moves from where it held, without a jump; a fold that falls back never moves it
    for (const touch of [false, true]) {
      const s = await make(1180, 900, touch);
      const cdp = touch ? await s.context.newCDPSession(s.page) : null;
      const finger = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y }] });
      await s.load('design=kimono&paper=oat-linen&step=7');
      const B = await s.camera();
      await s.load('design=kimono&paper=oat-linen&step=6');
      const A = await s.camera();
      const span = Math.hypot(...A.map((v, i) => v - B[i]));
      assert(span > 0.3, `kimono step 7 and 8 are framed differently (${span})`);
      const t = () => s.page.evaluate(() => paperCouture.controller.pose().t);
      const grip = await s.page.locator('.fold-handle').first().evaluate((b) => { const r = b.getBoundingClientRect(), m = new DOMMatrix(getComputedStyle(b.firstElementChild).transform); return { x: r.x + r.width / 2, y: r.y + r.height / 2, vx: m.a, vy: m.b }; });
      let at = 0;
      const down = () => touch ? finger('touchStart', grip.x, grip.y) : s.page.mouse.move(grip.x, grip.y).then(() => s.page.mouse.down());
      const moveTo = (d) => { at = d; const x = grip.x + grip.vx * d, y = grip.y + grip.vy * d; return touch ? finger('touchMove', x, y) : s.page.mouse.move(x, y); };
      // drag along the arrow, a few px at a time, until progress passes `goal` (or falls below it)
      const dragTo = async (goal) => {
        const up = goal >= await t();
        for (let n = 0; n < 400; n++) {
          const now = await t();
          if (up ? now >= goal : now <= goal) return now;
          await moveTo(at + (up ? 6 : -6));
        }
        throw new Error(`drag never reached ${goal}: ${JSON.stringify(await s.page.evaluate(() => ({ scrubbing: paperCouture.controller.isScrubbing, pose: paperCouture.controller.pose(), step: paperCouture.controller.step })))} at ${at}px, grip ${JSON.stringify(grip)}`);
      };
      // camera, fold progress and time each frame, and the moment the finger or button lets go
      const record = () => s.page.evaluate(() => {
        window.__cams = []; window.__released = null;
        for (const type of ['pointerup', 'pointercancel']) window.addEventListener(type, () => { window.__released ??= performance.now(); }, { capture: true, once: true });
        // stamped when drawn (a frame's start time can precede an event handled within it)
        const rec = () => { const now = performance.now(), P = paperCouture; window.__cams.push({ now, t: P.controller.pose().t, cam: P.stage.camera.position.toArray() }); if (window.__cams.length < 400 && (P.controller.moving || window.__cams.length < 40 || now - (window.__released ?? now) < 700)) requestAnimationFrame(rec); };
        requestAnimationFrame(rec);
      });
      const recorded = () => s.page.evaluate(() => ({ cams: window.__cams, released: window.__released }));
      const near = (c, ref) => Math.hypot(...c.map((v, i) => v - ref[i])) <= 0.01 * span;
      const ease = (e) => { const x = Math.min(1, Math.max(0, e)); return x * x * (3 - 2 * x); };
      // no jump: before the release the camera is where it held; after it, it has moved no
      // further from there than the 0.35 s ease allows at that moment; it ends on the next
      // frame, having moved one way
      const glides = async (where) => {
        const { cams, released } = await recorded();
        assert(released !== null, `${where}: release seen`);
        for (const r of cams) {
          const moved = Math.hypot(...r.cam.map((v, i) => v - A[i]));
          if (r.now < released) assert(moved <= 1e-6, `${where}: still before the release`);
          else assert(moved <= (ease((r.now - released) / 350) + 0.05) * span, `${where}: ${(moved / span).toFixed(2)} of the way ${Math.round(r.now - released)} ms after release; A ${JSON.stringify(A)} B ${JSON.stringify(B)} trace ${JSON.stringify(cams.map((c) => [Math.round(c.now - released), +c.t.toFixed(3), c.cam.map((n) => +n.toFixed(3))]))}`);
        }
        assert(near(cams.at(-1).cam, B), `${where}: arrives at the next frame`);
        for (let i = 1; i < cams.length; i++) assert(Math.hypot(...cams[i].cam.map((v, k) => v - B[k])) <= Math.hypot(...cams[i - 1].cam.map((v, k) => v - B[k])) + 1e-9, `${where}: moves one way`);
      };
      const still = async (where) => { await s.frames(); assert.deepEqual(await s.camera(), A, `${touch ? 'touch' : 'mouse'}: camera still ${where}`); };
      // 1. a long drag, reversed and taken forward again, then let go: the fold finishes
      await down();
      for (const goal of [0.45, 0.75, 0.9]) { await dragTo(goal); await still(`at ${goal} of the drag`); }
      await dragTo(0.2); await still('after reversing to 0.2');
      await dragTo(0.9); await still('forward again to 0.9');
      await record();
      if (touch) await finger('touchEnd'); else await s.page.mouse.up();
      await s.settle(); await s.page.waitForTimeout(700); await s.frames();
      await glides(`${touch ? 'touch' : 'mouse'}: released at 0.9`);
      assert.equal(await s.page.evaluate(() => paperCouture.controller.step), 7);
      // 2. a long drag that falls back: on a touch screen a real touchcancel; with a mouse, let go below the commit point
      await s.load('design=kimono&paper=oat-linen&step=6'); at = 0;
      await down(); await dragTo(0.9); await still('at 0.9 before falling back');
      if (!touch) { await dragTo(0.25); await still('dragged back to 0.25'); }
      await record();
      if (touch) await finger('touchCancel'); else await s.page.mouse.up();
      await s.settle(); await s.page.waitForTimeout(700); await s.frames();
      for (const r of (await recorded()).cams) assert.deepEqual(r.cam.map((n) => +n.toFixed(6)), A, `${touch ? 'touchcancel' : 'release below the commit point'}: the camera never moves`);
      assert.equal(await s.page.evaluate(() => paperCouture.controller.step), 6, 'the fold fell back');
      // The next actions follow on without reloading: a release must not shape later motions.
      const fold = s.page.locator('.dock:not(.display-dock) .btn-primary'), back = s.page.getByRole('button', { name: 'Back', exact: true });
      const pressed = (b) => touch ? b.tap() : b.click();
      // 2b. then Fold: the camera moves over the fold's last 40% as usual (not from where the drag was let go)
      await record(); await pressed(fold); await s.settle(); await s.page.waitForTimeout(400); await s.frames();
      {
        const { cams } = await recorded();
        const mid = cams.filter((r) => r.t >= 0.65 && r.t < 0.88);
        assert(mid.length > 0, 'frames recorded mid-fold');
        for (const r of mid) assert(Math.hypot(...r.cam.map((v, i) => v - A[i])) > 0.02 * span, `Fold after a fallen-back drag: the camera moves from 60% of the fold, not from 90% (at t ${r.t.toFixed(2)} it had not moved)`);
        assert(near(cams.at(-1).cam, B), 'Fold after a fallen-back drag arrives at the next frame');
      }
      await pressed(back); await s.settle(); await s.page.waitForTimeout(400); await s.frames();
      assert.deepEqual(await s.camera(), A, 'Back returns to the step\'s own frame');
      // 3. a drag pulled right to the end: nothing of the fold is left to move with, so a short glide, without a jump
      at = 0; await down(); await dragTo(0.999); await still('at the very end of the drag');
      await record(); if (touch) await finger('touchEnd'); else await s.page.mouse.up(); await s.settle();
      await s.page.waitForTimeout(700); await s.frames();
      await glides(`${touch ? 'touch' : 'mouse'}: pulled to the end`);
      // 3b. then Back: the camera starts where it is and retraces over the fold's last 40%, without a jump
      await record(); await pressed(back); await s.settle(); await s.page.waitForTimeout(400); await s.frames();
      {
        const { cams } = await recorded();
        const after = cams.filter((r) => r.t < 0.999);
        assert(after.length > 0, 'frames recorded during Back');
        for (const r of after.filter((r) => r.t > 0.62)) {
          const fromB = Math.hypot(...r.cam.map((v, i) => v - B[i]));
          const expected = 1 - ease((r.t - 0.6) / 0.4); // the share of the way back to the wider frame
          assert(fromB <= (expected + 0.08) * span, `Back after a drag pulled to the end: at t ${r.t.toFixed(2)} the camera is ${(fromB / span).toFixed(2)} of the way back already (jumped)`);
        }
        assert.deepEqual(await s.camera(), A, 'Back after a drag pulled to the end ends on the step\'s own frame');
      }
      assert.deepEqual(s.errors, []);
      result.checks.push(touch
        ? 'Kimono step 7 (frame changes to step 8), touch: camera still through a drag to 0.45, 0.75, 0.9, back to 0.2 and forward to 0.9; on lifting the finger it eases from where it held (never ahead of the 0.35 s ease), one way, to the next frame; a real touchcancel from 0.9 falls back with the camera never moving; then Fold moves the camera over the last 40% of the fold as usual; pulled to the very end, the same ease; then Back retraces without a jump (no reloads between).'
        : 'Kimono step 7 (frame changes to step 8), mouse: camera still through a drag to 0.45, 0.75, 0.9, back to 0.2 and forward to 0.9; on release it eases from where it held (never ahead of the 0.35 s ease), one way, to the next frame; dragged to 0.9 and back below the commit point, it falls back with the camera never moving; then Fold moves the camera over the last 40% of the fold as usual; pulled to the very end, the same ease; then Back retraces without a jump (no reloads between).');
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
      assert.equal(await s.page.getByRole('button', { name: 'Change kimono colour', exact: true }).isVisible(), false, `${key}: Change under More`);
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
      assert.equal(await s.page.getByRole('button', { name: 'Change kimono colour', exact: true }).isVisible(), true);
      assert.equal(await s.page.getByRole('button', { name: /^(Pinboard|View board) \(/ }).isVisible(), true);
      assert.deepEqual(await s.camera(), cam, `${key}: opening More does not move the paper`);
      await s.shot(`${key}-more`);
      await s.page.mouse.click(w / 2, k.bottom - 4); await s.frames();
      assert.equal(await more.getAttribute('aria-expanded'), 'false', 'a press outside closes More');
      await more.tap(); await s.page.keyboard.press('Escape');
      assert.equal(await more.getAttribute('aria-expanded'), 'false', 'Escape closes More');
      await more.tap();
      await s.page.locator(`[data-revisit="kimonoSide"]`).tap(); await s.settle();
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
      result.checks.push(`${key}: one-row bar (Browse, Design, More); kimono step 8 ${k.w}px wide, between the bar and the dock; More shows Revisit and Pinboard over the paper without moving it, closes on a press outside, Escape and a choice; Revisit works from it; finished piece keeps the bar with accessories under More; folding the obi brings back the full controls with Back to garment.`);
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
