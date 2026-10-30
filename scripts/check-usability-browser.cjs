// The usability pass in the real app, by its controls:
// - hidden folds: "See this fold" is offered at the kimono's sleeves, the gown's cap
//   sleeve and the fit-and-flare's shoulders (not at an ordinary dress fold); it
//   draws the moving paper over the layers above it without moving the camera or
//   the paper; it stays on through Fold and Back (replay); hidden-paper grips are
//   labelled, 44 px, inside the screen, and dragging one folds the step;
// - short screens: at 844 x 390 and 320 x 568 the step title stays, the
//   instructions open with "Instructions", lie between the top controls and the
//   dock, and "Piece notes" and "Instructions" close each other; at 390 x 844
//   everything shows; no horizontal scroll; at 320 x 568 the highlight and the
//   open instructions together, through Fold, Back and rotation;
// - no WebGL: a readable message, Try again, and the finished pieces drawn flat;
//   a lost graphics context shows a notice until it returns, and says only what a
//   reload really keeps (not an accessory being folded or attached).
// Isolated local contexts only.
//
//   BASE_URL=http://127.0.0.1:4173 CAPTURE_DIR=.usability-qa node scripts/check-usability-browser.cjs
//
// Chromium with software WebGL and emulated touch: not a real phone.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://127.0.0.1:4173';
const out = process.env.CAPTURE_DIR || '.usability-qa';
const HIDDEN = [['kimono', 7, 'Move the hidden paper'], ['gown', 8, 'Fold the hidden paper'], ['fit-flare', 5, 'Fold the hidden paper']];
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const result = { base, checks: [], errors: [], physicalPhoneTested: false };
  fs.mkdirSync(out, { recursive: true });
  const make = async (width = 1180, height = 900, touch = false, init) => {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', hasTouch: touch, isMobile: touch });
    if (init) await context.addInitScript(init);
    const page = await context.newPage(); page.setDefaultTimeout(30000);
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    const settle = () => page.waitForFunction(() => window.paperCouture && !paperCouture.controller.moving && paperCouture.view.t === paperCouture.view.target && !paperCouture.displayCam.glide);
    const state = () => page.evaluate(() => ({ step: paperCouture.controller.step, inspecting: paperCouture.inspectingOp, overlay: paperCouture.hiddenPaper.group.visible, camera: paperCouture.stage.camera.position.toArray() }));
    const load = async (q) => { const r = await page.goto(base + '/?' + q); assert(r.ok()); await settle(); await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); };
    const shot = (name) => page.screenshot({ path: path.join(out, name + '.png') });
    const rect = (sel) => page.locator(sel).first().evaluate((e) => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }; });
    return { context, page, errors, settle, state, load, shot, rect };
  };
  try {
    // --- hidden folds
    {
      const s = await make();
      const inspect = s.page.locator('.inspect-toggle');
      await s.load('design=dress&paper=oat-linen&step=2');
      assert.equal(await inspect.isVisible(), false, 'an ordinary dress fold is not flagged');
      for (const [design, step, label] of HIDDEN) {
        await s.load(`design=${design}&paper=oat-linen&step=${step}`);
        assert.equal(await inspect.isVisible(), true, `${design} step ${step + 1}: See this fold offered`);
        assert.equal(await inspect.getAttribute('aria-pressed'), 'false');
        const grips = s.page.locator('.fold-handle.hidden-paper');
        assert(await grips.count() >= 1, `${design}: a grip on the hidden paper`);
        for (const b of await grips.evaluateAll((bs) => bs.map((b) => ({ label: b.getAttribute('aria-label'), r: b.getBoundingClientRect().toJSON() })))) {
          assert(b.label.startsWith(label), `${design}: grip label ${b.label}`);
          assert(b.r.width >= 44 && b.r.height >= 44 && b.r.left >= 0 && b.r.top >= 0 && b.r.right <= 1180 && b.r.bottom <= 900, `${design}: grip size and position`);
        }
        await s.shot(`${design}-hidden-offered`);
        const before = await s.state();
        assert.equal(before.overlay, false);
        await inspect.click(); await s.page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
        const on = await s.state();
        assert.equal(on.inspecting, step); assert.equal(on.overlay, true, `${design}: highlight drawn`);
        assert.deepEqual(on.camera, before.camera, 'the highlight does not move the camera');
        assert.equal(on.step, step, 'nor the paper');
        assert.equal(await inspect.getAttribute('aria-pressed'), 'true');
        assert.match(await s.page.locator('.inspect-note').innerText(), /The paper and the view are unchanged/);
        await s.shot(`${design}-hidden-highlight`);
        // replay: fold, back, and the highlight is still on for this step
        await s.page.locator('.dock:not([hidden]) .btn-primary').click(); await s.settle();
        assert.equal((await s.state()).step, step + 1);
        await s.page.getByRole('button', { name: 'Back', exact: true }).click(); await s.settle();
        const again = await s.state();
        assert.equal(again.step, step); assert.equal(again.inspecting, step); assert.equal(again.overlay, true, 'replay keeps the highlight');
        await inspect.click(); await s.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        assert.equal((await s.state()).overlay, false);
        // drag a hidden-paper grip along its arrow: the step folds
        const g = await grips.first().evaluate((b) => { const r = b.getBoundingClientRect(), t = new DOMMatrix(getComputedStyle(b.firstElementChild).transform); return { x: r.x + r.width / 2, y: r.y + r.height / 2, vx: t.a, vy: t.b }; });
        await s.page.mouse.move(g.x, g.y); await s.page.mouse.down();
        assert.equal(await s.page.evaluate(() => paperCouture.controller.isScrubbing), true, `${design}: the grip starts a drag`);
        await s.page.mouse.move(g.x + g.vx * 120, g.y + g.vy * 120, { steps: 6 }); await s.page.mouse.up(); await s.settle();
        assert.equal((await s.state()).step, step + 1, `${design}: dragging the grip folds the step`);
        result.checks.push(`${design} step ${step + 1}: See this fold offered; highlight on without moving camera or paper; kept through Fold and Back; labelled 44 px grips in view; dragging a grip folds the step.`);
      }
      assert.deepEqual(s.errors, []);
      await s.context.close();
    }
    // --- short screens
    for (const [w, h, compact] of [[844, 390, true], [390, 844, false], [320, 568, true]]) {
      const s = await make(w, h, true);
      await s.load('design=kimono&paper=oat-linen&step=7');
      assert.equal(await s.page.evaluate(() => document.documentElement.scrollWidth), w, 'no horizontal page scroll');
      const title = s.page.locator('.dock:not(.display-dock) .step-title'), hint = s.page.locator('#step-hint');
      const instructions = s.page.getByRole('button', { name: 'Instructions', exact: true });
      // narrow screens fold the top controls into one row while folding: the notes are under More
      const bar = await s.page.locator('.studio-controls').evaluate((e) => e.classList.contains('folding-bar'));
      const notes = s.page.getByRole('button', { name: bar ? 'More' : 'Piece notes', exact: true });
      assert.equal(await title.isVisible(), true, `${w}x${h}: the step title stays`);
      assert.equal(await s.page.locator('.inspect-toggle').isVisible(), true);
      const dock = await s.rect('.dock:not([hidden])');
      assert(dock.bottom <= h && dock.top >= 0, `${w}x${h}: dock in view`);
      if (!compact) {
        // a long instruction (this squash is one) starts behind Instructions on any screen,
        // with the title as the cue; a screen with room shows a short one in full
        const long = (await s.page.locator('.dock.long-hint').count()) > 0;
        assert.equal(await hint.isVisible(), !long); assert.equal(await instructions.isVisible(), long);
        assert.equal(await s.page.getByRole('button', { name: 'Piece notes', exact: true }).isVisible(), false);
        // on a narrow screen the top controls are one row while folding; the note is under More
        const more = s.page.getByRole('button', { name: 'More', exact: true });
        if (await more.isVisible()) { await more.tap(); await s.page.waitForTimeout(150); }
        assert.equal(await s.page.locator('.experiment-note').isVisible(), true);
        if (await more.isVisible() && await more.getAttribute('aria-expanded') === 'true') { await more.tap(); await s.page.waitForTimeout(150); }
        const controls = await s.rect('.studio-controls');
        assert(controls.bottom <= dock.top, `${w}x${h}: controls and dock do not overlap`);
        await s.shot(`short-${w}x${h}`);
        result.checks.push(`${w}x${h}: instructions and notes shown; dock and top controls apart; no horizontal scroll.`);
        await s.context.close(); continue;
      }
      assert.equal(await hint.isVisible(), false, `${w}x${h}: instructions start closed`);
      assert.equal(await s.page.locator('.experiment-note').isVisible(), false, `${w}x${h}: notes start closed`);
      await s.shot(`short-${w}x${h}-closed`);
      await instructions.tap(); await s.page.waitForTimeout(200);
      assert.equal(await instructions.getAttribute('aria-expanded'), 'true');
      assert.equal(await hint.isVisible(), true);
      const open = await s.rect('#step-hint'), controls = await s.rect('.studio-controls');
      assert(open.top >= controls.bottom - 1 && open.bottom <= h, `${w}x${h}: open instructions between the controls and the screen edge (${JSON.stringify({ open, controls })})`);
      assert(await hint.evaluate((e) => e.scrollHeight <= e.clientHeight + 1 || getComputedStyle(e).overflowY === 'auto'), 'long instructions scroll');
      assert.equal(await s.page.locator('.fold-handles').evaluate((e) => getComputedStyle(e).visibility), 'hidden', 'grips step aside under the open instructions');
      await s.shot(`short-${w}x${h}-instructions`);
      await notes.tap(); await s.page.waitForTimeout(200);
      assert.equal(await s.page.locator('.experiment-note').isVisible(), true);
      assert.equal(await hint.isVisible(), false, 'opening the notes closes the instructions');
      await s.shot(`short-${w}x${h}-notes`);
      await instructions.tap(); await s.page.waitForTimeout(200);
      assert.equal(await s.page.locator('.experiment-note').isVisible(), false, 'opening the instructions closes the notes');
      await instructions.tap(); await s.page.waitForTimeout(200);
      assert.equal(await s.page.locator('.fold-handles').evaluate((e) => getComputedStyle(e).visibility), 'visible', 'grips return when the instructions close');
      // folding still works from the compact dock
      await s.page.locator('.dock:not([hidden]) .btn-primary').tap(); await s.settle();
      assert.equal((await s.state()).step, 8);
      assert.equal(await s.page.evaluate(() => document.documentElement.scrollWidth), w);
      assert.deepEqual(s.errors, []);
      result.checks.push(`${w}x${h}: title kept; Instructions opens the full text between the top controls and the screen edge; Piece notes (More, on a narrow screen) and Instructions close each other; grips step aside while either is open; Fold works; no horizontal scroll.`);
      await s.context.close();
    }
    // --- the highlight and open instructions together on a small phone, through Fold, Back and rotation
    {
      const s = await make(320, 568, true);
      await s.load('design=kimono&paper=oat-linen&step=7');
      const tap = (name) => s.page.getByRole('button', { name, exact: true }).tap();
      const fits = async (w, h, where) => {
        assert.equal(await s.page.evaluate(() => document.documentElement.scrollWidth), w, `${where}: no horizontal scroll`);
        const box = await s.page.evaluate(() => {
          const r = (q) => { const e = document.querySelector(q); return e && e.getBoundingClientRect().toJSON(); };
          return { controls: r('.studio-controls'), dock: r('.dock:not(.display-dock)'), hint: r('#step-hint'), note: r('.inspect-note') };
        });
        assert(await s.page.locator('#step-hint').isVisible() && await s.page.locator('.inspect-note').isVisible(), `${where}: instructions and the highlight's note both shown`);
        // either clear of the top controls, or (too little room) the open dock covers them
        const onTop = (r) => s.page.evaluate((r) => { const d = document.querySelector('.dock:not(.display-dock)'); return [r.top + 2, r.bottom - 2].every((y) => d.contains(document.elementFromPoint(r.left + r.width / 2, y))); }, r);
        assert(box.hint.top >= box.controls.bottom - 1 || await onTop(box.hint), `${where}: instructions clear of the top controls or over them ${JSON.stringify(box)}`);
        assert(await onTop(box.hint) && await onTop(box.note), `${where}: the instructions and the highlight's note are not covered by anything`);
        assert(box.note.bottom <= box.dock.bottom + 0.5 && box.hint.top >= 0, `${where}: the highlight's note inside the dock, the instructions on screen`);
        assert(box.dock.bottom <= h && box.dock.top >= 0, `${where}: dock on screen`);
        // every dock control is on screen and is what a tap at its centre reaches
        for (const b of await s.page.locator('.dock:not(.display-dock) button:visible').all()) {
          const ok = await b.evaluate((e) => { const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight && e.contains(document.elementFromPoint(x, y)); });
          assert(ok, `${where}: ${await b.innerText()} reachable`);
        }
      };
      await tap('See this fold'); await tap('Instructions'); await s.page.waitForTimeout(250);
      assert.equal((await s.state()).overlay, true);
      await fits(320, 568, '320x568 highlight + instructions');
      await s.shot('combined-320x568');
      await s.page.locator('.dock:not([hidden]) .btn-primary').tap(); await s.settle();
      assert.equal((await s.state()).step, 8, 'Fold works with both open');
      await tap('Back'); await s.settle();
      const back = await s.state();
      assert.equal(back.step, 7); assert.equal(back.inspecting, 7); assert.equal(back.overlay, true, 'the highlight is back for the replay');
      assert.equal(await s.page.getByRole('button', { name: 'Instructions', exact: true }).getAttribute('aria-expanded'), 'true', 'instructions stay open through Fold and Back');
      await fits(320, 568, '320x568 after Fold and Back');
      // rotate to landscape and back
      await s.page.setViewportSize({ width: 568, height: 320 }); await s.page.waitForTimeout(400); await s.settle();
      await fits(568, 320, '568x320 rotated');
      await s.shot('combined-568x320');
      await s.page.setViewportSize({ width: 320, height: 568 }); await s.page.waitForTimeout(400); await s.settle();
      await fits(320, 568, '320x568 rotated back');
      assert.deepEqual(s.errors, []);
      result.checks.push('320x568 with See this fold and Instructions both open: instructions and the highlight note clear of the top controls (at 568x320, with no room, the open dock covers them), every dock control on screen and reachable; Fold and Back keep both; rotation to 568x320 and back keeps the same.');
      await s.context.close();
    }
    // --- no WebGL, and a lost context
    {
      const s = await make(390, 844, true, () => {
        const get = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...a) { return /webgl/.test(type) ? null : get.call(this, type, ...a); };
      });
      await s.page.goto(base + '/?design=kimono');
      const alert = s.page.getByRole('alert');
      await alert.waitFor();
      assert.match(await alert.innerText(), /could not start/);
      assert.equal(await s.page.getByRole('button', { name: 'Try again', exact: true }).isVisible(), true);
      await s.page.waitForFunction(() => document.querySelectorAll('.startup-gallery li').length > 0);
      const cards = await s.page.locator('.startup-gallery li').count();
      assert(cards >= 20, `${cards} finished pieces drawn flat`);
      assert.equal(await s.page.locator('#stage').isVisible(), false);
      assert(s.errors.some((e) => /WebGL/.test(e)), 'the underlying error is still reported to the console');
      await s.shot('no-webgl');
      result.checks.push(`No WebGL: a readable alert, Try again, and ${cards} finished pieces drawn flat; no empty table.`);
      await s.context.close();
    }
    {
      const s = await make();
      await s.load('design=dress&paper=oat-linen&step=2');
      await s.page.evaluate(() => paperCouture.stage.renderer.forceContextLoss());
      await s.page.getByRole('status').filter({ hasText: 'interrupted' }).waitFor();
      await s.shot('context-lost');
      await s.page.evaluate(() => paperCouture.stage.renderer.forceContextRestore());
      await s.page.waitForFunction(() => !document.querySelector('.context-lost'));
      result.checks.push('A lost graphics context shows a notice with Reload; it goes away when the context returns.');
      await s.context.close();
    }
    // --- what the lost-context notice promises about a reload, and that it holds
    {
      const s = await make();
      const finish = async () => { while (!(await s.page.evaluate(() => paperCouture.controller.finished))) { await s.page.locator('.dock:not([hidden]) .btn-primary').click(); await s.settle(); } };
      const lose = async () => {
        await s.page.evaluate(() => paperCouture.stage.renderer.forceContextLoss());
        const notice = s.page.getByRole('status').filter({ hasText: 'interrupted' });
        await notice.waitFor();
        const text = await notice.innerText();
        await s.page.evaluate(() => paperCouture.stage.renderer.forceContextRestore());
        await s.page.waitForFunction(() => !document.querySelector('.context-lost'));
        return text;
      };
      await s.load('design=jacket&paper=oat-linen&step=99');
      assert.match(await lose(), /Reloading keeps the box jacket, its paper and its step\./);
      await s.page.getByLabel('Accessory type').selectOption('kerchief');
      await s.page.getByRole('button', { name: 'Fold accessory', exact: true }).click(); await s.settle();
      assert.equal(await s.page.evaluate(() => paperCouture.accessoryMode), true);
      assert.match(await lose(), /not the accessory you are folding/);
      await finish();
      await s.page.getByRole('button', { name: 'Attach', exact: true }).click(); await s.settle();
      assert.equal(await s.page.evaluate(() => paperCouture.attached), true);
      assert.match(await lose(), /not the attached accessory/);
      await s.page.reload(); await s.settle();
      const after = await s.page.evaluate(() => ({ design: paperCouture.garmentId, finished: paperCouture.controller.finished, paper: paperCouture.paperId, attached: paperCouture.attached, accessoryMode: paperCouture.accessoryMode }));
      assert.deepEqual(after, { design: 'jacket', finished: true, paper: 'oat-linen', attached: false, accessoryMode: false }, 'a reload keeps the piece, paper and step, and not the accessory, as the notice says');
      result.checks.push('Lost-context notice: on the piece it promises the piece, paper and step; while folding an accessory, and with one attached, it says the accessory is not kept; a reload then keeps exactly the piece, paper and step.');
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
