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

    // Save a start, change paper, come back: it begins from the saved start.
    await named.click(); await settle();
    await dialog.getByRole('button', { name: 'Save as my start', exact: true }).click();
    assert.match(await dialog.innerText(), /Saved\./);
    assert.match(await dialog.locator('.print-start[data-kind=saved]').innerText(), /Yours/);
    await shot('plum-scatter-kimono'); await done();
    await page.getByRole('radio', { name: 'Oat linen', exact: true }).click(); await settle();
    s = await state(); assert.equal(s.paper, 'oat-linen'); assert.equal(s.x, 0);
    await page.getByRole('radio', { name: 'Plum scatter', exact: true }).click(); await settle();
    s = await state(); assert.equal(s.x, -0.2265625); assert.equal(s.turn, 0);
    // A bare link begins from it; a link that names a placement does not.
    await page.goto(`${base}/?design=kimono&paper=plum-scatter`); await settle();
    assert.equal((await state()).x, -0.2265625);
    await page.goto(`${base}/?design=kimono&paper=plum-scatter&turn=1`); await settle();
    s = await state(); assert.equal(s.turn, 1); assert.equal(s.x, 0);
    // The other colourway and another piece keep their own starts.
    await page.goto(`${base}/?design=kimono&kimono=reverse&paper=plum-scatter`); await settle();
    assert.equal((await state()).x, 0);
    await page.goto(`${base}/?design=dress&paper=plum-scatter`); await settle();
    assert.equal((await state()).x, 0);
    // Forget it.
    await page.goto(`${base}/?design=kimono&paper=plum-scatter&step=99&view=display`); await settle();
    await open(); await dialog.getByRole('button', { name: 'Forget my start', exact: true }).click();
    assert.equal(await dialog.locator('.print-start[data-kind=saved]').count(), 0); await done();
    await page.goto(`${base}/?design=kimono&paper=plum-scatter`); await settle();
    assert.equal((await state()).x, 0);
    ok(`${width}px: suggested start applied, nudges and reset unchanged, veil remembered, saved start returns on reselect and reload, is kept per piece and colourway, and can be forgotten`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no sideways page scroll');
    await context.close();
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(out, 'browser-checks.json'), JSON.stringify({ base, checks, errors }, null, 2));
  console.log('Starting points browser check passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
