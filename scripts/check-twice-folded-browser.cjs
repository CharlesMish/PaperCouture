// Twice folded, through the real interface of a served build: the paper is
// chosen from its swatch, folded into the two pieces it was styled on, stepped
// back and refolded, turned, pinned, photographed, reloaded and exported again.
// Optional, like the other browser reviews; it is not part of `npm test`.
//
//   npm run build && npm run preview            (or npm run dev)
//   BASE_URL=http://127.0.0.1:4173 node scripts/check-twice-folded-browser.cjs
//
// PLAYWRIGHT_MODULE and CHROMIUM_EXECUTABLE_PATH are read as in the other
// browser checks. Captures go to CAPTURE_DIR (default .twice-folded-qa, not
// committed). Headless Chromium only: no real phone and no physical paper.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.BASE_URL || 'http://127.0.0.1:4173';
const out = process.env.CAPTURE_DIR || '.twice-folded-qa';
const PAPER = 'twice-folded';
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
  const page = await context.newPage(); page.setDefaultTimeout(60000);
  const errors = [], checks = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const ok = text => { checks.push(text); console.log(text); };
  const settle = () => page.waitForFunction(() => window.paperCouture && !paperCouture.controller.moving && paperCouture.view.t === paperCouture.view.target && !paperCouture.displayCam.glide);
  const state = () => page.evaluate(() => ({ design: paperCouture.garmentId, paper: paperCouture.paperId, turn: paperCouture.quarterTurns, step: paperCouture.controller.step, count: paperCouture.controller.count }));
  const recipe = () => page.evaluate(() => ({ front: paperCouture.sheet.front.material.map.userData.paperRecipe, back: paperCouture.sheet.back.material.map.userData.paperRecipe }));
  const btn = name => page.getByRole('button', { name, exact: true });
  const dock = () => page.locator('.dock:not([hidden])');
  const press = async (control, delta) => {
    const before = (await state()).step; await control.click();
    if (await page.evaluate(() => paperCouture.controller.moving)) await control.click();
    await settle(); assert.equal((await state()).step, before + delta);
  };
  const advance = () => press(dock().locator('.btn-primary'), 1);
  const back = () => press(dock().getByRole('button', { name: 'Back', exact: true }), -1);
  const foldAll = async () => { for (let s = await state(); s.step < s.count; s = await state()) await advance(); };
  const turnPaper = async () => { await page.getByRole('button', { name: /^Turn paper/ }).click(); await settle(); };
  const view = async name => { await btn(name).click(); await settle(); await page.waitForTimeout(250); };
  const shot = name => page.screenshot({ path: path.join(out, name + '.png') });
  const dialog = page.locator('dialog[open]');
  const pinCurrent = async cm => {
    await btn('Pinboard').click(); await page.waitForTimeout(400);
    await dialog.locator('select').filter({ has: page.locator('option', { hasText: 'cm square' }) }).first().selectOption(String(cm));
    await btn('Pin current piece').click(); await page.waitForTimeout(500);
    await dialog.getByRole('button', { name: 'Return to folding', exact: true }).click(); await settle(); await page.waitForTimeout(300);
  };
  const board = () => page.evaluate(() => {
    const s = paperCouture.pinboard.state;
    return { appearance: s.appearance, format: s.format ?? 'standard', items: s.items.map(i => ({ title: i.title, x: +i.x.toFixed(2), y: +i.y.toFixed(2), tilt: i.tilt, squareCm: i.paperSize.sideCm,
      papers: [...new Set(i.snapshot.materials.filter(m => m.paper).map(m => `${m.paper.id}@${m.paper.turns}`))] })) };
  });
  const photograph = async name => {
    await dialog.getByRole('button', { name: 'Photograph', exact: true }).click(); await page.waitForTimeout(400);
    const [download] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Save photograph', exact: true }).click()]);
    const file = path.join(out, name); await download.saveAs(file);
    await page.waitForFunction(() => /PNG ready/.test(document.querySelector('dialog[open]').textContent));
    await dialog.getByRole('button', { name: 'Back to arranging', exact: true }).click(); await page.waitForTimeout(200);
    return fs.readFileSync(file);
  };

  try {
    // --- Registered as an experiment, selectable from its swatch.
    assert((await page.goto(base + '/')).ok()); await settle();
    const swatch = page.getByRole('radio', { name: 'Twice folded', exact: true });
    assert.match(await swatch.getAttribute('title'), /^Experimental · Twice folded: /);
    const row = await page.locator('.swatches > *').evaluateAll(nodes => nodes.map(e => e.classList.contains('paper-group-label') ? '#' + e.textContent : e.getAttribute('aria-label')));
    assert(row.indexOf('Twice folded') > row.indexOf('#Experiments'));
    await swatch.click(); await settle();
    ok('Twice folded is offered under Experiments and selected from its swatch.');

    // --- Kimono, reverse colour, sheet at 0 degrees.
    await page.getByLabel('Garment design').selectOption('kimono'); await settle();
    assert.deepEqual(await state(), { design: 'kimono', paper: PAPER, turn: 0, step: 0, count: 8 });
    await page.getByRole('button', { name: 'Reverse-colour kimono' }).click(); await settle();
    for (let i = 0; i < 4; i++) await advance();
    await back(); await back();
    assert.equal((await state()).paper, PAPER); assert.equal((await recipe()).front.id, PAPER);
    await foldAll();
    const kimono = await state(); assert.equal(kimono.step, kimono.count);
    for (let i = 1; i <= 4; i++) { await turnPaper(); assert.equal((await state()).turn, i % 4); assert.equal((await recipe()).back.turns, i % 4); assert.equal((await state()).step, kimono.count); }
    await btn('Display').click(); await settle(); await page.waitForTimeout(300);
    await view('Front'); await shot('kimono-front'); await view('Angle'); await shot('kimono-angle');
    ok(`Kimono, reverse colour: ${kimono.count} folds, two Back, refolded; four quarter-turns on the finished piece return to 0° with both faces turning together.`);
    await pinCurrent(24);

    // --- Folding fan, printed side, sheet turned 180 degrees.
    await page.getByLabel('Garment design').selectOption('sensu'); await settle();
    assert.equal((await state()).paper, PAPER);
    if ((await state()).step) { await btn('Start over').click(); await settle(); }
    while ((await state()).turn !== 2) await turnPaper();
    for (let i = 0; i < 5; i++) await advance();
    for (let i = 0; i < 3; i++) await back();
    await foldAll();
    assert.deepEqual(await state(), { design: 'sensu', paper: PAPER, turn: 2, step: 7, count: 7 });
    await btn('Display').click(); await settle(); await page.waitForTimeout(300);
    await view('Front'); await shot('fan-front'); await view('Angle'); await shot('fan-angle');
    ok('Folding fan, printed, sheet at 180°: seven folds, three Back, refolded; paper and turn kept.');
    await pinCurrent(20);

    // --- Arrange with the board's own controls, photograph and save.
    await page.getByRole('button', { name: /^View board/ }).click(); await page.waitForTimeout(500);
    const repeat = async (name, n) => { for (let i = 0; i < n; i++) await dialog.getByRole('button', { name, exact: true }).click(); };
    await dialog.getByLabel('Selected board piece').selectOption({ index: 0 }); await repeat('Reset selected', 1); await repeat('Move down', 7);
    await dialog.getByLabel('Selected board piece').selectOption({ index: 1 }); await repeat('Reset selected', 1); await repeat('Move up', 9);
    await dialog.locator('summary', { hasText: 'Finish & photograph' }).click(); await page.waitForTimeout(200);
    await dialog.getByLabel('Board surface').selectOption('linen');
    await dialog.getByLabel('Pin style').selectOption('white');
    await dialog.getByLabel('Board lighting').selectOption('clear');
    await page.waitForTimeout(300);
    const arranged = await board();
    assert.deepEqual(arranged.items.map(i => i.papers), [[`${PAPER}@0`], [`${PAPER}@2`]]);
    assert.deepEqual(arranged.items.map(i => [i.x, i.y, i.squareCm]), [[0, -0.56, 24], [0, 0.72, 20]]);
    const first = await photograph('pinboard.png');
    assert.equal(first.readUInt32BE(16), 1800); assert.equal(first.readUInt32BE(20), 2100);
    ok('Board: kimono (24 cm) and fan (20 cm) arranged, photographed and saved as a 1800 × 2100 PNG.');

    // --- Reload: the saved board restores the new paper and draws the same picture.
    await page.reload(); await settle(); await page.waitForTimeout(500);
    assert.match(await page.getByRole('button', { name: /^View board/ }).innerText(), /2\/12/);
    await page.getByRole('button', { name: /^View board/ }).click(); await page.waitForTimeout(800);
    assert.deepEqual(await board(), arranged);
    await dialog.locator('summary', { hasText: 'Finish & photograph' }).click(); await page.waitForTimeout(200);
    const second = await photograph('pinboard-after-reload.png');
    assert.deepEqual(second, first, 'the reloaded board must export the same PNG');
    ok('Reload: both pieces, positions, sizes and finish restored; the second PNG is byte-identical to the first.');

    assert.deepEqual(errors, []);
    ok('No page exceptions or console errors.');
    fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({ base, checks, board: arranged, realPhoneTested: false, physicalPaperTested: false }, null, 2) + '\n');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
