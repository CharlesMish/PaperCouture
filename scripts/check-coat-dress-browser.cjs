// Coat-dress in the real app, by its actual controls: the design list, the coat
// colour choice at its fold, every step forward and back, a revisit of the
// choice from the finished piece, Display presets, a board capture at the
// suggested size, and phone widths. Isolated local contexts only; never reads
// the owner's browser profile or saved board.
//
//   BASE_URL=http://127.0.0.1:4173 CAPTURE_DIR=docs/coat-dress/evidence/browser node scripts/check-coat-dress-browser.cjs
//
// Browser checks use Chromium with software WebGL and emulated touch: they are
// not a real phone, mobile Safari or physical paper.
const { chromium, openBoard } = require('./lib/legacy-playwright.cjs');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://127.0.0.1:4173';
const out = process.env.CAPTURE_DIR || 'docs/coat-dress/evidence/browser';
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
    const settle = () => page.waitForFunction(() => window.paperCouture && !paperCouture.controller.moving&&!paperCouture.cameraSettling && paperCouture.view.t === paperCouture.view.target && !paperCouture.displayCam.glide);
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
    await load('design=coat-dress&paper=indigo-lattice&step=0');
    const ids = await page.getByLabel('Garment design').locator('option').evaluateAll((xs) => xs.map((x) => x.value));
    assert(ids.includes('coat-dress'), 'the coat-dress is in the design list');
    assert.equal(await page.getByLabel('Garment design').inputValue(), 'coat-dress');
    assert.match(await page.locator('.studio-note').innerText(), /rigid shoulder collapse/);
    // the only choice is offered after the shared turn-over, before the shoulders
    assert.equal(await page.locator('.shape-choices').isHidden(), true, 'no choice before the first turn');
    await advance();
    assert.equal(await page.locator('.shape-choices').isVisible(), true, 'coat colour choice at the shoulder fold');
    assert.equal(await btn('Reverse-colour coat').getAttribute('aria-pressed'), 'true', 'reverse-colour coat is the default');
    const reverseFinal = await geometry();
    assert.equal((await state()).total, 4);
    await btn('Printed coat').click(); await settle();
    assert.equal((await state()).step, 1, 'choosing keeps the completed turn-over');
    assert.equal((await state()).total, 3, 'the printed coat has no reveal turn');
    assert.notEqual(await geometry(), reverseFinal, 'the two colourways finish differently');
    assert.match(page.url(), /coat=print/);
    await shot('choice');
    // fold to the end and back by the buttons, then forward again
    await advance(); await shot('printed-shoulders'); await advance(); await shot('printed-finished');
    await back(); await back(); await advance(); await advance();
    assert.equal((await state()).step, 3);
    // revisit the choice from the finished piece: it rewinds to the choice only
    await page.locator(`[data-revisit="coatSide"]`).click(); await settle();
    assert.equal((await state()).step, 1);
    await btn('Reverse-colour coat').click(); await settle();
    assert.equal((await state()).total, 4);
    for (let i = 0; i < 3; i++) { await advance(); await shot(`reverse-step-${i + 2}`); }
    assert.equal((await state()).step, 4);
    assert(!/coat=print/.test(page.url()), 'the default choice is not written to the URL');
    result.checks.push('Design list, coat colour choice at the shoulder fold (thumbnails, aria-pressed, URL), forward/back by the buttons, revisit from the finished piece, both colourways finished.');
    // Display presets
    await page.locator('.dock:not([hidden]) .btn-primary').click(); await settle();
    for (const v of ['Front', 'Angle', 'Back']) { await btn(v).click(); await settle(); await shot(`display-${v.toLowerCase()}`); }
    // the board: suggested size and an exact capture of the live geometry
    await openBoard(page);
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
      await ph.load('design=coat-dress&paper=running-stitch&step=0');
      for (let i = 0; i < 4; i++) {
        const before = (await ph.state()).step;
        await ph.page.locator('.dock:not([hidden]) .btn-primary').tap();
        if (await ph.page.evaluate(() => paperCouture.controller.moving)) await ph.page.locator('.dock:not([hidden]) .btn-primary').tap();
        await ph.settle(); assert.equal((await ph.state()).step, before + 1);
      }
      assert.equal(await ph.page.evaluate(() => document.documentElement.scrollWidth), w, 'no horizontal page scroll');
      await ph.shot(`phone-${w}`);
      await ph.context.close();
    }
    result.checks.push('Phone-sized 390 x 844 and 320 x 568 with emulated touch: four taps fold the default coat; no horizontal page scroll.');
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
