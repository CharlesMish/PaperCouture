const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.BASE_URL || 'http://127.0.0.1:5637';
const out = process.env.CAPTURE_DIR || '.design-picker-qa';
fs.mkdirSync(out, { recursive: true });
(async () => {
 const browser = await chromium.launch({ args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
 try {
  const context = await browser.newContext({ reducedMotion: 'reduce', hasTouch: true });
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  const settle = () => page.waitForFunction(() => window.paperCouture && !paperCouture.controller.moving && paperCouture.view.t === paperCouture.view.target);
  const state = () => page.evaluate(() => ({ id: paperCouture.garmentId, step: paperCouture.controller.step,
   paper: paperCouture.paperId, options: paperCouture.options, saved: localStorage.getItem('paper-couture.pinboard.v1') }));
  for (const width of [1280, 390, 320]) {
   await page.setViewportSize({ width, height: 900 });
   await page.goto(base + '/?design=dress&paper=oat-linen&step=2'); await settle();
   const before = await state();
   const open = page.getByRole('button', { name: 'Browse pieces', exact: true });
   await open.click();
   const dialog = page.getByRole('dialog', { name: 'Choose a piece to fold' });
   await page.waitForFunction(() => document.querySelectorAll('.design-card svg').length === 22);
   assert.equal(await dialog.locator('.design-card').count(), 22);
   assert.deepEqual(await dialog.locator('.design-card').evaluateAll(cs => cs.slice(0,4).map(c => c.dataset.design)), ['swing-coat','fit-flare','camp-shirt','capelet']);
   const bounds = await dialog.boundingBox(); assert(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
   assert(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth));
   await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowLeft');
   assert.deepEqual(await state(), before, 'Browsing must not advance underlying folds');
   await page.screenshot({ path: `${out}/chooser-${width}.png` });
   await page.keyboard.press('Escape'); assert.equal(await dialog.isVisible(), false);
   assert(await open.evaluate(el => el === document.activeElement), 'Closing returns focus');
   await open.click(); await dialog.getByRole('button', { name: 'Swing coat', exact: true }).click(); await settle();
   assert.equal((await state()).id, 'swing-coat');
   assert.equal((await state()).paper, before.paper);
   await open.click(); await dialog.getByRole('button', { name: 'Dress', exact: true }).click(); await settle();
   assert.deepEqual(await state(), before, 'Returning preserves options, progress, paper and board save');
   await page.getByLabel('Garment design', { exact: true }).selectOption('mitten-right'); await settle();
   await open.click(); assert.equal(await dialog.locator('[data-design="mitten-right"]').getAttribute('aria-pressed'), 'true');
   await page.keyboard.press('Escape'); await page.reload(); await settle(); assert.equal((await state()).id,'mitten-right');
   await page.screenshot({ path: `${out}/workspace-${width}.png` });
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(`${out}/results.json`, JSON.stringify({ browser: browser.version(), widths: [1280,390,320], previews:22, errors, passed:true }, null,2));
  console.log('Design chooser passed: 22 previews, ordering, phone bounds, modal keys/focus, progress and URL preservation');
 } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
