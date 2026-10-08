// Focused inverse shape choice and small-rectangle touch checks in a fresh context.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://127.0.0.1:4401';
const out = process.env.CAPTURE_DIR || '.capelet-brooch-qa';
const fixture = fs.readFileSync(path.join(out, 'new-rectangle-outfit.json'), 'utf8');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 320, height: 568 }, hasTouch: true, reducedMotion: 'reduce' });
  await context.addInitScript(raw => localStorage.setItem('paper-couture.pinboard.v1', raw), fixture);
  const page = await context.newPage(); page.setDefaultTimeout(60000); const errors = []; page.on('pageerror', e => errors.push(String(e)));
  const btn = name => page.getByRole('button', { name, exact: true });
  const settle = () => page.waitForFunction(() => window.paperCouture && !paperCouture.controller.moving && paperCouture.view.t === paperCouture.view.target && !paperCouture.displayCam.glide && paperCouture.sheet.front.geometry.attributes.position?.count > 0);
  const state = () => page.evaluate(() => JSON.parse(JSON.stringify(paperCouture.pinboard.state)));
  const recipe = () => page.evaluate(() => ({ shape: paperCouture.options.broochShape, paper: paperCouture.paperId, turn: paperCouture.quarterTurns, position: paperCouture.printPosition }));
  const result = { physicalPhoneTested: false };
  try {
    await page.goto(base + '/?design=framed-brooch&broochShape=rectangle&paper=corner-bloom&turn=3&printX=.125&printY=.125&step=99&view=display'); await settle();
    const original = await recipe(); assert.deepEqual(original, { shape: 'rectangle', paper: 'corner-bloom', turn: 3, position: { x: .125, y: .125 } });
    await page.reload(); await settle(); assert.deepEqual(await recipe(), original);
    await page.getByRole('button', { name: /^View board/ }).click(); assert.deepEqual(await state(), JSON.parse(fixture));
    const r = await page.locator('.pinboard-canvas').boundingBox(), initial = await state(), item = initial.items.at(-1);
    const x = r.x + r.width * (.5 + item.x / 3.6), y = r.y + r.height * (.5 - item.y / 4.2);
    const cdp = await context.newCDPSession(page), touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
    const durableBefore = await page.evaluate(() => ({ saved: localStorage.getItem('paper-couture.pinboard.v1'), history: paperCouture.pinboard.history.length }));
    await touch('touchStart', [{ x, y }]); await touch('touchMove', [{ x: x - 18, y: y - 12 }]);
    await page.waitForFunction(() => paperCouture.pinboard.drag?.moved); assert.notDeepEqual((await state()).items, initial.items);
    await touch('touchCancel', []); await page.waitForFunction(() => !paperCouture.pinboard.drag); assert.deepEqual((await state()).items, initial.items);
    assert.deepEqual(await page.evaluate(() => ({ saved: localStorage.getItem('paper-couture.pinboard.v1'), history: paperCouture.pinboard.history.length })), durableBefore);
    await touch('touchStart', [{ x, y }]); await touch('touchMove', [{ x: x - 18, y: y - 12 }]); await touch('touchEnd', []); await page.waitForFunction(() => !paperCouture.pinboard.drag); assert.notDeepEqual((await state()).items, initial.items); await btn('Undo').click(); assert.deepEqual((await state()).items, initial.items); await cdp.detach();
    await btn('Return to piece').click(); await btn('Revisit fold').click(); await settle(); await btn('Square').click();
    assert.deepEqual(await recipe(), { ...original, shape: 'square' }); assert.equal(await page.evaluate(() => paperCouture.controller.step), 0);
    for (let i = 0; i < 4; i++) { await page.locator('.dock:not(.display-dock) .btn-primary').click(); if (await page.evaluate(() => paperCouture.controller.moving)) await page.locator('.dock:not(.display-dock) .btn-primary').click(); await settle(); }
    assert.deepEqual((await state()).items, initial.items); await page.reload(); await settle(); assert.deepEqual(await recipe(), { ...original, shape: 'square' }); assert.deepEqual((await state()).items, initial.items);
    assert.deepEqual(errors, []); result.passed = true; result.checks = ['Rectangle option/turn/offset URL reload', '320px actual small rectangle touch cancel, commit and Undo', 'Rectangle to Square Revisit resets affected folds and preserves paper recipe', 'Refold/reload leave all five existing captures intact'];
  } catch (e) { result.failure = String(e); throw e; }
  finally { fs.writeFileSync(path.join(out, 'choice-touch.json'), JSON.stringify(result, null, 2)); await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
