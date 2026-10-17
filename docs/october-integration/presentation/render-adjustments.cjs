/**
 * Matched production renders for slim pins and independently adjustable guides.
 * Generate the real twelve-piece fixture with scripts/check-roomy-board.cjs, or
 * pass BOARD_FIXTURE. Serve dist/ in the same network namespace as this script.
 * BASE_URL, CAPTURE_DIR, PLAYWRIGHT_MODULE and CHROMIUM_EXECUTABLE_PATH follow
 * the other browser scripts. No diagnostic state writes or source imports.
 * All twelve item records must stay byte-for-byte equivalent through the study.
 * CONTROLS_ONLY=1 replays the same real controls but skips large PNG exports.
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const base = process.env.BASE_URL || 'http://127.0.0.1:5667';
const out = process.env.CAPTURE_DIR || path.join(root, '.october-qa/presentation-adjustments');
const fixture = JSON.parse(fs.readFileSync(process.env.BOARD_FIXTURE || path.join(root, '.october-qa/roomy/twelve-piece.json'), 'utf8'));
const result = { captures: [], errors: [], sourceRequests: [], bundles: [], physicalPhoneTested: false };
fs.mkdirSync(out, { recursive: true });

(async () => {
 const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
 const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, reducedMotion: 'reduce' });
 const page = await context.newPage(); page.setDefaultTimeout(60000);
 page.on('pageerror', e => result.errors.push(String(e)));
 page.on('request', request => {
  const pathname = new URL(request.url()).pathname;
  if (/\/(src|node_modules|@vite)\//.test(pathname)) result.sourceRequests.push(pathname);
  if (/\/assets\/.*\.js$/.test(pathname) && !result.bundles.includes(pathname)) result.bundles.push(pathname);
 });
 const button = name => page.getByRole('button', { name, exact: true });
 const control = label => page.getByLabel(label, { exact: true });
 const state = () => page.evaluate(() => structuredClone(paperCouture.pinboard.state));
 const settle = () => page.waitForFunction(() => window.paperCouture && !paperCouture.controller.moving);
 const details = async text => {
  const summary = page.locator('summary').filter({ hasText: new RegExp(`^${text}$`) });
  if (!await summary.evaluate(e => e.parentElement.open)) await summary.click();
 };
 const sameItems = async () => assert.deepEqual((await state()).items, fixture.items);
 const photograph = async name => {
  await sameItems(); if (process.env.CONTROLS_ONLY) return;
  await button('Photograph').click();
  await page.locator('.pinboard-canvas').screenshot({ path: path.join(out, name + '-canvas.png') });
  const [download] = await Promise.all([page.waitForEvent('download'), button('Save photograph').click()]);
  const file = path.join(out, name + '.png'); await download.saveAs(file);
  const bytes = fs.readFileSync(file);
  result.captures.push({ name, appearance: (await state()).appearance, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) });
  await button('Back to arranging').click();
 };
 try {
  assert.equal(fixture.items.length, 12); assert.equal(fixture.format, 'roomy');
  await page.goto(base); await settle();
  await page.evaluate(raw => localStorage.setItem('paper-couture.pinboard.v1', raw), JSON.stringify(fixture));
  await page.reload(); await settle(); await page.getByRole('button', { name: /^View board/ }).click();
  await details('Finish & photograph');
  await control('Board surface').selectOption('natural');
  await control('Board lighting').selectOption('soft');
  await control('Figure guide').selectOption('none');
  for (const style of ['brass', 'white', 'black']) {
   await control('Pin style').selectOption(style); await photograph('pins-' + style);
  }
  await control('Figure guide').selectOption('two');
  await control('Include guide in photograph').check();
  const guideBefore = (await state()).appearance;
  await photograph('guides-default');
  await details('Adjust guides'); await control('Guide to adjust').selectOption('right');
  await control('Guide size').fill('150'); await control('Guide size').dispatchEvent('change');
  await button('Guide up').click();
  const guideAfter = (await state()).appearance;
  assert.deepEqual(guideAfter.guideTransforms?.left, guideBefore.guideTransforms?.left);
  assert.equal(guideAfter.guideTransforms.right.scale, 1.5);
  assert(Math.abs(guideAfter.guideTransforms.right.y - .08) < 1e-12);
  await photograph('guides-independent');
  await page.setViewportSize({ width: 390, height: 844 });
  await details('Finish & photograph'); await details('Adjust guides');
  // Scroll the existing tools panel for a labelled controls screenshot only;
  // this is presentation framing, not evidence of unaided touch discovery.
  await page.locator('.board-tools').evaluate(tools => {
   const panel = tools.querySelector('.board-guide-adjust');
   tools.scrollTop += panel.getBoundingClientRect().top - tools.getBoundingClientRect().top - 5;
  });
  await page.screenshot({ path: path.join(out, 'guide-controls-390.png') });
  await sameItems(); assert(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth));
  result.guideChange = { before: guideBefore, after: guideAfter, viewport: [390, 844], allTwelveItemsUnchanged: true };
  assert.deepEqual(result.errors, []); assert.deepEqual(result.sourceRequests, []); result.passed = true;
 } catch (error) {
  result.failure = String(error); await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {}); throw error;
 } finally {
  result.browser = browser.version();
  fs.writeFileSync(path.join(out, process.env.CONTROLS_ONLY ? 'controls-results.json' : 'results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2)); await browser.close();
 }
})().catch(error => { console.error(error); process.exitCode = 1; });
