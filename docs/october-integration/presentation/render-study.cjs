/**
 * Production-only visual study. First run scripts/check-roomy-board.cjs to create
 * its real twelve-capture fixture, or supply BOARD_FIXTURE=/path/to/twelve-piece.json.
 * Serve dist/ separately in the same network namespace, then set BASE_URL,
 * PLAYWRIGHT_MODULE and CHROMIUM_EXECUTABLE_PATH as for the other browser scripts.
 * Outputs are ignored by default; no application code or saved user board is edited.
 *
 * The first six views preserve the twelve-piece fixture's captures and positions.
 * Guide-only views use isolated copies with no items, or the original shirt/skirt
 * captures translated to x=0. Their geometry, paper sizes and y coordinates stay
 * exact. These show a dressing reference, not automatic fitting or physical proof.
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const out = process.env.CAPTURE_DIR || path.join(root, '.october-qa/presentation-visual');
const base = process.env.BASE_URL || 'http://127.0.0.1:4193';
const fixture = fs.readFileSync(process.env.BOARD_FIXTURE || path.join(root, '.october-qa/roomy/twelve-piece.json'), 'utf8');
const original = JSON.parse(fixture), errors = [], observations = [];
fs.mkdirSync(out, { recursive: true });
(async () => {
 const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
 const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, reducedMotion: 'reduce' });
 const page = await context.newPage(); page.setDefaultTimeout(60000); page.on('pageerror', e => errors.push(String(e)));
 const settle = () => page.waitForFunction(() => window.paperCouture && !paperCouture.controller.moving);
 const button = name => page.getByRole('button', { name, exact: true });
 const select = (label, value) => page.getByLabel(label, { exact: true }).selectOption(value);
 let currentFixture;
 const load = async state => {
  currentFixture = state;
  await page.goto(base); await settle();
  await page.evaluate(raw => localStorage.setItem('paper-couture.pinboard.v1', raw), JSON.stringify(state));
  await page.reload(); await settle();
  await page.getByRole('button', { name: /^View board/ }).click();
  await page.getByText('Finish & photograph', { exact: true }).click();
 };
 const photograph = async (name, exportPNG) => {
  assert.deepEqual(await page.evaluate(() => structuredClone(paperCouture.pinboard.state.items)), currentFixture.items);
  // Empty boards correctly disable Photograph. Their guide is still inspected
  // through the actual arranging canvas without changing that product behavior.
  const photoAllowed = currentFixture.items.length > 0;
  if (photoAllowed) await button('Photograph').click();
  await page.locator('.pinboard-canvas').screenshot({ path: path.join(out, name + '-canvas.png') });
  const result = { name, mode: photoAllowed ? 'photograph' : 'arranging', appearance: await page.evaluate(() => paperCouture.pinboard.state.appearance) };
  if (exportPNG) {
   const [download] = await Promise.all([page.waitForEvent('download'), button('Save photograph').click()]);
   const file = path.join(out, name + '.png'); await download.saveAs(file);
   const bytes = fs.readFileSync(file); Object.assign(result, { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) });
  }
  observations.push(result); if (photoAllowed) await button('Back to arranging').click();
 };
 const finish = async (surface, pins, light, guide = 'none') => {
  await select('Board surface', surface); await select('Pin style', pins);
  await select('Board lighting', light); await select('Figure guide', guide);
  if (guide !== 'none') await page.getByLabel('Include guide in photograph', { exact: true }).check();
 };
 try {
  if (!process.env.GUIDES_ONLY) {
  await load(original);
  await photograph('01-original', true);
  for (const [name, surface, pins, light, guide] of [
   ['02-natural-brass-soft', 'natural', 'brass', 'soft', 'none'],
   ['03-rose-pearl-guides', 'rose', 'pearl', 'soft', 'two'],
   ['04-slate-red-guides', 'slate', 'red', 'soft', 'two'],
   ['05-natural-brass-warm', 'natural', 'brass', 'warm', 'none'],
   ['06-natural-brass-clear', 'natural', 'brass', 'clear', 'none'],
  ]) { await finish(surface, pins, light, guide); await photograph(name, true); }
  await finish('natural', 'brass', 'soft', 'two');
  await page.getByLabel('Include guide in photograph', { exact: true }).uncheck();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(out, 'phone-arranging.png') });
  await button('Photograph').click(); await page.screenshot({ path: path.join(out, 'phone-photograph.png') });
  assert(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth));
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const blank = { ...original, selected: null, items: [] }; delete blank.appearance;
  await load({ ...blank, format: 'standard' });
  await finish('natural', 'none', 'soft', 'one'); await photograph('07-phone-one-guide', false);
  await load({ ...blank, format: 'roomy' });
  await finish('natural', 'none', 'soft', 'two'); await photograph('08-phone-two-guides', false);
  const dressed = original.items.filter(i => i.title.startsWith('Camp-collar shirt') || i.title.startsWith('Wrap skirt')).map(i => ({ ...i, x: 0 }));
  assert.equal(dressed.length, 2);
  await load({ ...blank, format: 'standard', items: dressed });
  await finish('natural', 'brass', 'soft', 'one'); await photograph('09-phone-dressed-guide', false);
  assert.deepEqual(errors, []);
 } finally {
  fs.writeFileSync(path.join(out, process.env.GUIDES_ONLY ? 'guide-results.json' : 'results.json'), JSON.stringify({ browser: browser.version(), originalPieces: original.items.length,
   guideFixture: 'Isolated copies: empty Standard/Roomy boards, then original shirt and wrap skirt translated to x=0; geometry, scale and y coordinates unchanged.', observations, errors }, null, 2));
  console.log(JSON.stringify({ captures: observations, errors })); await browser.close();
 }
})().catch(e => { console.error(e); process.exitCode = 1; });
