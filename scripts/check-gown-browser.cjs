// One-shoulder gown in the real app, by its actual controls: the design list,
// the gown colour choice at the first fold, every step forward and back, a revisit of the
// choice from the finished piece, Display presets, a board capture at the
// suggested size, and phone widths. Isolated local contexts only; never reads
// the owner's browser profile or saved board.
//
//   BASE_URL=http://127.0.0.1:4173 CAPTURE_DIR=docs/gown/evidence/browser node scripts/check-gown-browser.cjs
//
// Browser checks use Chromium with software WebGL and emulated touch: they are
// not a real phone, mobile Safari or physical paper.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://127.0.0.1:4173';
const out = process.env.CAPTURE_DIR || 'docs/gown/evidence/browser';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const result = { base, checks: [], errors: [], physicalPaperTested: false, physicalPhoneTested: false };
  fs.mkdirSync(out, { recursive: true });
  const make = async (width = 1180, height = 900, touch = false) => {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', hasTouch: touch, isMobile: touch });
    const page = await context.newPage(); page.setDefaultTimeout(30000);
    page.on('pageerror', (e) => result.errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') result.errors.push(m.text()); });
    const btn = (name) => page.getByRole('button', { name, exact: true });
    const settle = () => page.waitForFunction(() => window.paperCouture && !paperCouture.controller.moving && paperCouture.view.t === paperCouture.view.target && !paperCouture.displayCam.glide);
    const state = () => page.evaluate(() => ({ design: paperCouture.garmentId, step: paperCouture.controller.step, total: paperCouture.timeline.ops.length, name: document.querySelector('.workshop-title, .dock h2')?.textContent ?? '' }));
    const load = async (q) => { const r = await page.goto(base + '/?' + q); assert(r.ok()); await settle(); };
    const primary = () => page.locator('.dock:not([hidden]) .btn-primary');
    const advance = async () => { const before = (await state()).step; await primary().click(); if (await page.evaluate(() => paperCouture.controller.moving)) await primary().click(); await settle(); assert.equal((await state()).step, before + 1); };
    const back = async () => { const before = (await state()).step; await btn('Back').click(); if (await page.evaluate(() => paperCouture.controller.moving)) await btn('Back').click(); await settle(); assert.equal((await state()).step, before - 1); };
    const shot = (name) => page.screenshot({ path: path.join(out, name + '.png') });
    const geometry = () => page.evaluate(() => JSON.stringify(paperCouture.timeline.states.at(-1).facets.map((f) => [f.poly, f.T, f.rank])));
    return { context, page, btn, settle, state, load, advance, back, shot, geometry };
  };
  try {
    const { context, page, btn, settle, state, load, advance, back, shot, geometry } = await make();
    await load('design=gown&paper=indigo-lattice&step=0');
    const ids = await page.getByLabel('Garment design').locator('option').evaluateAll((xs) => xs.map((x) => x.value));
    assert(ids.includes('gown'), 'the gown is in the design list');
    assert.equal(await page.getByLabel('Garment design').inputValue(), 'gown');
    assert.match(await page.locator('.studio-note').innerText(), /empire waist from one rigid collapse/);
    // the only choice is offered at the first fold
    assert.equal(await page.locator('.shape-choices').isVisible(), true, 'gown colour choice at the first fold');
    assert.equal(await btn('Printed gown').getAttribute('aria-pressed'), 'true', 'the printed gown is the default');
    const printFinal = await geometry();
    assert.equal((await state()).total, 9);
    await btn('Reverse-colour gown').click(); await settle();
    assert.equal((await state()).step, 0);
    assert.equal((await state()).total, 10, 'the reverse-colour gown turns over after the hem band');
    assert.notEqual(await geometry(), printFinal, 'the two colourways finish differently');
    assert.match(page.url(), /gown=reverse/);
    await shot('choice');
    // fold to the end and back by the buttons, then forward again
    for (let i = 0; i < 10; i++) { await advance(); if (i === 8) await shot('reverse-waist'); }
    await shot('reverse-finished');
    await back(); await back(); await advance(); await advance();
    assert.equal((await state()).step, 10);
    // revisit the choice from the finished piece: it rewinds to the choice only
    await page.getByLabel('Fold to revisit').selectOption('gownSide');
    await btn('Revisit fold').click(); await settle();
    assert.equal((await state()).step, 0);
    await btn('Printed gown').click(); await settle();
    assert.equal((await state()).total, 9);
    for (let i = 0; i < 9; i++) { await advance(); await shot(`print-step-${i + 1}`); }
    assert.equal((await state()).step, 9);
    assert(!/gown=reverse/.test(page.url()), 'the default choice is not written to the URL');
    result.checks.push('Design list, gown colour choice at the first fold (aria-pressed, URL), forward/back by the buttons, revisit from the finished piece, both colourways finished.');
    // Display presets
    await page.locator('.dock:not([hidden]) .btn-primary').click(); await settle();
    for (const v of ['Front', 'Angle', 'Back']) { await btn(v).click(); await settle(); await shot(`display-${v.toLowerCase()}`); }
    // the board: suggested size and an exact capture of the live geometry
    await page.getByRole('button', { name: /^View board/ }).click();
    assert.equal(Number(await page.getByLabel('Starting square size').inputValue()), 20);
    await btn('Pin current piece').click();
    const board = await page.evaluate(() => structuredClone(paperCouture.pinboard.state));
    const item = board.items.at(-1);
    assert.equal(item.paperSize.sideCm, 20);
    const live = await page.evaluate(() => Array.from(paperCouture.sheet.front.geometry.attributes.position.array));
    assert.deepEqual(item.snapshot.geometries[0].position, live);
    await shot('board');
    result.checks.push('Display front/angle/back; board capture at the suggested 20 cm with exact live geometry.');
    await context.close();
    // phone widths, by tapping
    for (const [w, h] of [[390, 844], [320, 568]]) {
      const ph = await make(w, h, true);
      await ph.load('design=gown&paper=running-stitch&step=0');
      for (let i = 0; i < 9; i++) {
        const before = (await ph.state()).step;
        await ph.page.locator('.dock:not([hidden]) .btn-primary').tap();
        if (await ph.page.evaluate(() => paperCouture.controller.moving)) await ph.page.locator('.dock:not([hidden]) .btn-primary').tap();
        await ph.settle(); assert.equal((await ph.state()).step, before + 1);
      }
      assert.equal(await ph.page.evaluate(() => document.documentElement.scrollWidth), w, 'no horizontal page scroll');
      await ph.shot(`phone-${w}`);
      await ph.context.close();
    }
    result.checks.push('Phone-sized 390 x 844 and 320 x 568 with emulated touch: nine taps fold the default gown; no horizontal page scroll.');
    assert.deepEqual(result.errors, []);
  } catch (e) {
    result.errors.push(String(e && e.stack || e));
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
    if (result.errors.length) process.exit(1);
  }
})();
