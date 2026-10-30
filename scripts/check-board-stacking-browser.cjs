// Production checks for the overlap-stacking integration. Isolated saved-board
// fixtures reuse actual captured mitten geometry; subsequent edits use controls.
// STACKING_BASELINE=1 records the same twelve-piece fixture before the change.
const { chromium, openBoard } = require('./lib/legacy-playwright.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const base = process.env.BASE_URL || 'http://127.0.0.1:5637';
const out = process.env.CAPTURE_DIR || '.october-qa/stacking';
const baseline = process.env.STACKING_BASELINE === '1';
const key = 'paper-couture.pinboard.v1';
const original = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/october-integration/browser/outfit.json'), 'utf8'));
const mitten = original.items.find(item => item.title.includes('thumb left'));
assert(mitten, 'Retained fixture has a real captured mitten');
const item = (id, x, y) => ({ ...structuredClone(mitten), id, x, y, tilt: 0 });
const appearance = { surface: 'natural', pins: 'white', guide: 'two', guideInPhoto: true, lighting: 'soft' };
const fixture = items => ({ version: 1, background: original.background, format: 'roomy', appearance, selected: items.at(-1).id, items });
const grid = fixture(Array.from({ length: 12 }, (_, i) => item(`mitten-${i}`, -1.5 + i % 4, 1.7 - Math.floor(i / 4) * 1.7)));
const small = fixture([item('left', -.95, -.4), item('right', .95, -.4), item('separate', 0, 1.4)]);
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, hasTouch: true, reducedMotion: 'reduce', acceptDownloads: true });
  const page = await context.newPage(); page.setDefaultTimeout(60000);
  const result = { baseline, browser: browser.version(), checks: [], errors: [], exports: {}, physicalPhoneTested: false };
  page.on('pageerror', e => result.errors.push(String(e)));
  const btn = name => page.getByRole('button', { name, exact: true });
  const control = name => page.getByLabel(name, { exact: true });
  const settle = () => page.waitForFunction(() => window.paperCouture && !paperCouture.controller.moving&&!paperCouture.cameraSettling
    && paperCouture.view.t === paperCouture.view.target && !paperCouture.displayCam.glide);
  const open = () => openBoard(page);
  const state = () => page.evaluate(() => structuredClone(paperCouture.pinboard.state));
  const load = async value => {
    await page.goto(base + '/?design=mitten-left&paper=oat-linen&step=99&view=display'); await settle();
    await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key, value });
    await page.reload(); await settle(); await open();
    assert.equal(await page.evaluate(k => localStorage.getItem(k), key), JSON.stringify(value), 'Loading must not rewrite a board');
    assert.deepEqual(await state(), value);
  };
  const metrics = () => page.evaluate(() => {
    const b = paperCouture.pinboard;
    return b.state.items.map(item => {
      const box = b.selection.box.clone().setFromObject(b.groups.get(item.id), true), pin = b.decor.pins.get(item.id);
      return { id: item.id, min: box.min.toArray(), max: box.max.toArray(), pin: pin && { visible: pin.visible, position: pin.position.toArray() } };
    });
  });
  const near = (a, b, label) => assert(Math.abs(a - b) < 1e-6, `${label}: ${a} != ${b}`);
  const grounded = rows => rows.forEach(row => near(row.min[2], -.10, `${row.id} rests at board depth`));
  const png = async name => {
    const [download] = await Promise.all([page.waitForEvent('download'), btn('Save PNG').click()]);
    const file = path.join(out, name + '.png'); await download.saveAs(file);
    const bytes = fs.readFileSync(file), value = { sha256: crypto.createHash('sha256').update(bytes).digest('hex'), width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
    result.exports[name] = value; return value;
  };
  try {
    await load(grid);
    result.twelve = await metrics();
    await page.screenshot({ path: path.join(out, 'twelve-separated.png') });
    const firstPNG = await png('twelve-separated');
    if (baseline) return;
    grounded(result.twelve);
    for (const row of result.twelve) {
      assert(row.pin.visible, 'Each separated piece has its own visible pin');
      assert(row.pin.position[2] > row.min[2] && row.pin.position[2] <= row.max[2] + .003, 'Pin follows the paper surface');
    }
    assert(await btn('Board full · 12 pieces').isDisabled());
    assert.equal(firstPNG.width, 2400); assert.equal(firstPNG.height, 2800);
    await page.reload(); await settle(); await open();
    assert.deepEqual(await state(), grid); assert.deepEqual(await metrics(), result.twelve);
    assert.deepEqual(await png('twelve-reloaded'), firstPNG);
    result.checks.push('Twelve separated real captures sit at board depth with surface-following pins; saved state is unchanged and reload exports the identical 2400×2800 PNG.');

    await load(small); grounded(await metrics());
    // Real reset controls create two coincident pieces and leave a third apart.
    for (const id of ['left', 'right']) { await control('Selected board piece').selectOption(id); await btn('Reset selected').click(); }
    let rows = await metrics(), left = rows.find(r => r.id === 'left'), right = rows.find(r => r.id === 'right');
    near(left.min[2], -.10, 'First overlapping piece remains grounded');
    near(right.min[2] - left.max[2], .025, 'Later piece clears the whole earlier capture');
    near(rows.find(r => r.id === 'separate').min[2], -.10, 'Unrelated third piece stays grounded');
    assert(!left.pin.visible && right.pin.visible, 'Covered pin stays hidden');
    const overlap = await state(), overlapPNG = await png('overlap-right-above');
    await control('Selected board piece').selectOption('left'); await btn('Bring forward').click();
    rows = await metrics(); left = rows.find(r => r.id === 'left'); right = rows.find(r => r.id === 'right');
    near(left.min[2] - right.max[2], .025, 'Bring forward changes the physical depth order');
    assert(left.pin.visible && !right.pin.visible, 'Pin occlusion follows the new order');
    await btn('Undo').click();
    assert.deepEqual((await state()).items, overlap.items);
    assert.deepEqual(await png('overlap-after-undo'), overlapPNG);
    result.checks.push('Overlapping captures retain the .025 clearance; a third separated piece stays down; Bring forward and Undo update depth and pin occlusion and restore identical export pixels.');

    await control('Selected board piece').selectOption('right');
    for (let i = 0; i < 13; i++) await btn('Move right').click();
    await control('Pinboard tilt').fill('12'); await control('Pinboard tilt').dispatchEvent('change');
    grounded(await metrics());
    const separate = await state(), separatePNG = await png('moved-and-tilted');
    assert.deepEqual(separate.items.map(i => i.snapshot), overlap.items.map(i => i.snapshot));
    await btn('Reset selected').click();
    rows = await metrics(); assert(rows.find(r => r.id === 'right').min[2] > rows.find(r => r.id === 'left').max[2]);
    await btn('Undo').click(); assert.deepEqual(await state(), separate);
    assert.deepEqual(await png('moved-after-undo'), separatePNG);
    await page.reload(); await settle(); await open();
    assert.deepEqual(await state(), separate); grounded(await metrics());
    assert.deepEqual(await png('moved-after-reload'), separatePNG);
    result.checks.push('Move and tilt release a piece from its old stack; reset re-stacks it; Undo/reload preserve captures and restore depth and export exactly.');
    assert.deepEqual(result.errors, []); result.passed = true;
  } catch (e) {
    result.failure = String(e); await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {}); throw e;
  } finally {
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2)); await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
