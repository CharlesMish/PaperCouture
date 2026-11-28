// Starting points, through the real interface of a served build: the placement
// panel's finished preview, the fold veil, a suggested start, a found start,
// a saved start that returns when the paper is chosen again and on reload, and
// the existing sliding controls. Optional, like the other browser reviews; it
// is not part of `npm test` or CI.
//
//   npm run build && npm run preview
//   BASE_URL=http://127.0.0.1:4173 node scripts/check-starting-points-browser.cjs
//
// PLAYWRIGHT_MODULE and CHROMIUM_EXECUTABLE_PATH are read as in the other
// browser checks. Captures go to CAPTURE_DIR (default .starting-points-qa, not
// committed). Headless Chromium only: no real phone and no physical paper.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.BASE_URL || 'http://127.0.0.1:4173';
const out = process.env.CAPTURE_DIR || '.starting-points-qa';
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [], checks = [];
  const ok = text => { checks.push(text); console.log(text); };
  for (const [width, height] of [[1400, 950], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const page = await context.newPage(); page.setDefaultTimeout(60000);
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const settle = () => page.waitForFunction(() => window.paperCouture && !paperCouture.controller.moving && paperCouture.view.t === paperCouture.view.target);
    const state = () => page.evaluate(() => ({ design: paperCouture.garmentId, paper: paperCouture.paperId, turn: paperCouture.quarterTurns, x: paperCouture.printPosition.x, y: paperCouture.printPosition.y, step: paperCouture.controller.step }));
    const btn = name => page.getByRole('button', { name, exact: true });
    const chooseGarment = async id => { await page.getByLabel('Garment design').selectOption(id); await settle(); };
    const dialog = page.locator('.print-dialog');
    const open = async () => { await btn('Position print').click(); await dialog.locator('.print-start[data-kind=turn]').first().waitFor(); };
    const done = async () => { await btn('Done').click(); await settle(); };
    const inked = canvas => canvas.evaluate(c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n / (c.width * c.height); });
    const shot = name => page.screenshot({ path: path.join(out, `${name}-${width}.png`) });

    // A fixed paper: four turns, a suggestion, no sliding controls.
    await page.goto(`${base}/?design=jacket&paper=border-print&step=99&view=display`); await settle();
    await open();
    assert.match(await dialog.innerText(), /fixed placement|authored placement/);
    // The suggestion is one of the four turns under its own name, so it is not shown twice.
    assert.equal(await dialog.locator('.print-start[data-kind=turn]').count(), 3);
    assert.ok(await inked(dialog.locator('.print-finished')) > .2, 'finished preview is drawn');
    const suggestion = dialog.locator('.print-start[data-kind=suggested]');
    assert.equal(await suggestion.count(), 1); assert.match(await suggestion.innerText(), /Waves across the yoke/);
    assert.deepEqual((await state()).turn, 0, 'a suggestion is offered, not applied');
    await suggestion.click(); await settle();
    assert.equal((await state()).turn, 2); assert.equal(await suggestion.getAttribute('aria-pressed'), 'true');
    await shot('border-print-jacket'); await done();
    ok(`${width}px: fixed paper shows four turns and one suggestion; choosing it turns the sheet twice`);

    // Choosing a curated paper for a piece begins from its suggestion; a link still opens as drawn.
    await page.goto(`${base}/?design=jacket&step=99&view=display`); await settle();
    const pick = async name => { await page.getByRole('radio', { name, exact: true }).click(); await settle(); };
    await pick('Border print');
    let b = await state(); assert.equal(b.turn, 2, 'Border print begins two turns round on the jacket'); assert.equal(b.x, 0);
    // The start does not follow the paper to a piece that has none, and the dress keeps its hem.
    await btn('Fold accessory').click(); await settle();
    await pick('Oat linen');
    await btn('Back to garment').click(); await settle();
    assert.equal((await state()).turn, 2, 'editing accessory paper preserves the jacket placement');
    await chooseGarment('dress');
    assert.equal((await state()).turn, 0, 'the dress shows Border print as drawn');
    await chooseGarment('jacket');
    assert.equal((await state()).turn, 2);
    // Another paper does not inherit the turn that only the suggestion made.
    await pick('Oat linen'); assert.equal((await state()).turn, 0);
    // A turn the person makes is theirs: it is kept across papers, as before.
    await page.getByRole('button', { name: /^Turn paper/ }).click(); await settle(); assert.equal((await state()).turn, 1);
    await pick('Slate grain'); assert.equal((await state()).turn, 1, 'a turn the person set is kept');
    // An experimental paper is offered its suggestion but begins as drawn.
    await page.goto(`${base}/?design=clutch&step=99&view=display`); await settle();
    await pick('Corner bloom'); b = await state(); assert.equal(b.turn, 0); assert.equal(b.x, 0);
    // A sliding curated paper begins at its suggested position.
    await page.goto(`${base}/?design=kimono&step=99&view=display`); await settle();
    await pick('Plum scatter'); b = await state(); assert.equal(b.x, -0.2265625); assert.equal(b.turn, 0);
    ok(`${width}px: a curated paper begins from its suggestion when chosen, goes back to as drawn on a piece without one, and never overrides a turn the person made; an experimental paper begins as drawn`);

    // A sliding motif the kimono hides as drawn: a found placement, then the old nudges still work.
    await page.goto(`${base}/?design=kimono&paper=plum-scatter&step=99&view=display`); await settle();
    await open();
    const named = dialog.locator('.print-start[data-kind=suggested]');
    assert.match(await named.innerText(), /Blossom on the sleeve/);
    await named.click(); await settle();
    let s = await state(); assert.equal(s.turn, 0); assert.equal(s.x, -0.2265625); assert.equal(s.y, 0);
    await dialog.getByRole('button', { name: 'Right', exact: true }).click(); await settle();
    assert.equal((await state()).x, -0.2265625 + 1 / 32);
    assert.equal(await named.getAttribute('aria-pressed'), 'false');
    await dialog.getByRole('button', { name: 'Reset print', exact: true }).click(); await settle();
    assert.equal((await state()).x, 0);
    // The veil can be turned off, and the choice is remembered for the next opening.
    const veil = dialog.getByLabel('Dim what the fold hides');
    assert.equal(await veil.isChecked(), true); await veil.uncheck();
    await dialog.getByRole('button', { name: 'Show the back', exact: true }).click();
    assert.match(await dialog.innerText(), /Finished kimono · back/);
    await done(); await open(); assert.equal(await veil.isChecked(), false); await veil.check();

    // Save a personal offset that is different from the curated suggestion.
    await named.click(); await settle();
    await dialog.getByRole('button', { name: 'Right', exact: true }).click(); await settle();
    const savedX = -0.2265625 + 1 / 32;
    assert.equal((await state()).x, savedX);
    await dialog.getByRole('button', { name: 'Save as my start', exact: true }).click();
    assert.match(await dialog.innerText(), /Saved\./);
    assert.match(await dialog.locator('.print-start[data-kind=saved]').innerText(), /Yours/);
    await shot('plum-scatter-kimono'); await done();

    // Reload this exact entry. The app writes the active turn and position into its URL.
    assert.equal(Number(new URL(page.url()).searchParams.get('printX')), savedX);
    await page.reload(); await settle();
    assert.equal((await state()).x, savedX);
    await chooseGarment('dress');
    assert.equal((await state()).x, 0, 'a saved kimono placement must not follow a reload onto the dress');
    await chooseGarment('kimono');
    assert.equal((await state()).x, savedX);
    await pick('Oat linen');
    s = await state(); assert.equal(s.paper, 'oat-linen'); assert.equal(s.x, 0);
    await pick('Plum scatter');
    s = await state(); assert.equal(s.x, savedX); assert.equal(s.turn, 0);

    // A bare link picks up the saved start. Each colourway owns its own beginning.
    await page.goto(`${base}/?design=kimono&paper=plum-scatter`); await settle();
    assert.equal((await state()).x, savedX);
    await btn('Reverse-colour kimono').click(); await settle();
    assert.equal((await state()).x, 0, 'the reverse colourway has no start of its own yet');
    await btn('Printed kimono').click(); await settle();
    assert.equal((await state()).x, savedX, 'returning to the printed colourway restores its saved start');

    // A shared URL remains an explicit placement, even when it happens to match a saved start.
    await page.goto(`${base}/?design=kimono&paper=plum-scatter&turn=1`); await settle();
    s = await state(); assert.equal(s.turn, 1); assert.equal(s.x, 0);
    await page.goto(`${base}/?design=kimono&paper=plum-scatter&printX=${savedX}`); await settle();
    await page.reload(); await settle();
    await chooseGarment('dress');
    assert.equal((await state()).x, savedX, 'an explicitly linked placement carries to a piece without its own start');

    // An explicit nudge away and back must count as a user placement too.
    await chooseGarment('kimono');
    await open();
    await btn('Left').click(); await btn('Right').click(); await done();
    await chooseGarment('dress');
    assert.equal((await state()).x, savedX, 'a manual placement may equal the saved coordinates');

    await page.goto(`${base}/?design=kimono&paper=plum-scatter&step=99&view=display`); await settle();
    await open(); await dialog.getByRole('button', { name: 'Forget my start', exact: true }).click();
    assert.match(await dialog.innerText(), /Saved start removed\./);
    assert.equal(await dialog.locator('.print-start[data-kind=saved]').count(), 0); await done();
    await pick('Oat linen'); await pick('Plum scatter');
    assert.equal((await state()).x, -0.2265625, 'choosing the curated swatch again uses its sleeve suggestion');
    await page.goto(`${base}/?design=kimono&paper=plum-scatter`); await settle();
    assert.equal((await state()).x, 0, 'a paper-only link opens as drawn once its saved start is removed');
    ok(`${width}px: suggested start applied, nudges and reset unchanged, veil remembered, saved start returns on reselect and reload, is kept per piece and colourway, and can be forgotten`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no sideways page scroll');
    await context.close();
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(out, 'browser-checks.json'), JSON.stringify({ base, checks, errors }, null, 2));
  console.log('Starting points browser check passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
