// Kimono and obi in the real app, by their actual controls: the design list,
// the kimono colour choice at the first fold, folding the obi from its own square
// and attaching it at the waist, every step forward and back, a revisit of the
// choice from the finished piece, Display presets, a board capture at the
// suggested size, and phone widths. Isolated local contexts only; never reads
// the owner's browser profile or saved board.
//
//   BASE_URL=http://127.0.0.1:4173 CAPTURE_DIR=docs/kimono/evidence/browser node scripts/check-kimono-browser.cjs
//
// Browser checks use Chromium with software WebGL and emulated touch: they are
// not a real phone, mobile Safari or physical paper.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://127.0.0.1:4173';
const out = process.env.CAPTURE_DIR || 'docs/kimono/evidence/browser';
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
    await load('design=kimono&paper=indigo-lattice&step=0');
    const ids = await page.getByLabel('Garment design').locator('option').evaluateAll((xs) => xs.map((x) => x.value));
    assert(ids.includes('kimono'), 'the kimono is in the design list');
    assert.equal(await page.getByLabel('Garment design').inputValue(), 'kimono');
    assert.match(await page.locator('.studio-note').innerText(), /square sleeves from one rigid squash/);
    assert.equal(await page.locator('.shape-choices').isVisible(), true, 'kimono colour choice at the first fold');
    assert.equal(await btn('Printed kimono').getAttribute('aria-pressed'), 'true', 'the printed kimono is the default');
    const printFinal = await geometry();
    assert.equal((await state()).total, 8);
    await btn('Reverse-colour kimono').click(); await settle();
    assert.equal((await state()).step, 0);
    assert.equal((await state()).total, 7, 'the reverse-colour kimono folds the first step up, with no turn');
    assert.notEqual(await geometry(), printFinal, 'the two colourways finish differently');
    assert.match(page.url(), /kimono=reverse/);
    await shot('choice');
    for (let i = 0; i < 7; i++) { await advance(); if (i === 5) await shot('reverse-collar'); }
    await shot('reverse-finished');
    await back(); await advance();
    assert.equal((await state()).step, 7);
    await page.locator(`[data-revisit="kimonoSide"]`).click(); await settle();
    assert.equal((await state()).step, 0);
    await btn('Printed kimono').click(); await settle();
    assert.equal((await state()).total, 8);
    for (let i = 0; i < 8; i++) { await advance(); await shot(`print-step-${i + 1}`); }
    assert.equal((await state()).step, 8);
    assert(!/kimono=reverse/.test(page.url()), 'the default choice is not written to the URL');
    result.checks.push('Design list, kimono colour choice at the first fold (aria-pressed, URL), forward/back by the buttons, revisit from the finished piece, both colourways finished.');
    // the obi: its own square, folded by the buttons, attached at the waist (the only position)
    await page.getByLabel('Accessory type').selectOption('obi'); await btn('Fold accessory').click(); await settle();
    await page.getByRole('radio', { name: 'Plum seed', exact: true }).click(); await settle();
    const obiSteps = await page.evaluate(() => paperCouture.timeline.ops.length);
    assert.equal(obiSteps, 4, 'the obi folds in four steps');
    for (let i = 0; i < obiSteps; i++) { await advance(); await shot(`obi-step-${i + 1}`); }
    await btn('Attach').click(); await settle();
    assert.deepEqual(await page.getByLabel('Accessory position').locator('option').evaluateAll((xs) => xs.map((x) => x.value)), ['waist']);
    assert.equal((await state()).design, 'kimono');
    result.checks.push('Obi folded from its own square in four steps with its own paper (Plum seed), attached at the waist, the only position offered.');
    // Display presets, with the obi attached
    if (await btn('Display').isVisible()) { await btn('Display').click(); await settle(); }
    for (const v of ['Front', 'Angle', 'Back']) { await btn(v).click(); await settle(); await shot(`display-${v.toLowerCase()}`); }
    // the board: suggested size and an exact capture of the live geometry
    await page.getByRole('button', { name: /^(Pinboard|View board) \(/ }).click();
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
      await ph.load('design=kimono&paper=running-stitch&step=0');
      for (let i = 0; i < 8; i++) {
        const before = (await ph.state()).step;
        await ph.page.locator('.dock:not([hidden]) .btn-primary').tap();
        if (await ph.page.evaluate(() => paperCouture.controller.moving)) await ph.page.locator('.dock:not([hidden]) .btn-primary').tap();
        await ph.settle(); assert.equal((await ph.state()).step, before + 1);
      }
      assert.equal(await ph.page.evaluate(() => document.documentElement.scrollWidth), w, 'no horizontal page scroll');
      await ph.shot(`phone-${w}`);
      await ph.context.close();
    }
    result.checks.push('Phone-sized 390 x 844 and 320 x 568 with emulated touch: eight taps fold the default kimono; no horizontal page scroll.');
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
