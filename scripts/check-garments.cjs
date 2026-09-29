// Optional production-browser check. npm install --no-save playwright, then
// npm run build -- --base /play/paper-couture/ && node scripts/check-garments.cjs
// PLAYWRIGHT_MODULE and CHROMIUM_MODULE may point to external browser tooling.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = 'docs/garment-studies/final';
const csp = "default-src 'self'; base-uri 'none'; connect-src 'self'; font-src 'self'; form-action 'none'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; upgrade-insecure-requests";
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((req, res) => {
    const name = new URL(req.url, 'http://local').pathname;
    if (!name.startsWith('/play/paper-couture/')) { res.writeHead(404).end(); return; }
    const relative = name.slice('/play/paper-couture/'.length) || 'index.html';
    const file = path.resolve('dist', relative);
    if (!file.startsWith(path.resolve('dist') + '/') || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Content-Security-Policy': csp });
    res.end(fs.readFileSync(file));
  });
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  let browser;
  const errors = [];
  try {
    let launch = { headless: true, args: ['--no-sandbox', '--use-angle=swiftshader'] };
    if (process.env.CHROMIUM_MODULE) {
      const binary = require(process.env.CHROMIUM_MODULE).default;
      launch = { headless: true, executablePath: await binary.executablePath(), args: [...binary.args, '--use-angle=swiftshader'] };
    }
    browser = await chromium.launch(launch);
    const p = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
    p.setDefaultTimeout(20000);
    p.on('pageerror', e => errors.push(String(e)));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    p.on('requestfailed', r => errors.push(`${r.url()}: ${r.failure()?.errorText}`));
    const root = `http://127.0.0.1:${server.address().port}/play/paper-couture/`;
    const state = () => p.evaluate(() => ({ step: paperCouture.controller.step, moving: paperCouture.controller.moving, shape: paperCouture.silhouetteId, paper: paperCouture.paperId, turn: paperCouture.quarterTurns, attached: paperCouture.attached, accessory: paperCouture.accessoryId, wing: paperCouture.bowWing }));
    const fold = async () => {
      const step = (await state()).step;
      await p.locator('.dock .btn-primary').click();
      // A second press completes this fold; it must not start another one.
      if ((await state()).moving) await p.locator('.dock .btn-primary').click();
      await p.waitForFunction(s => paperCouture.controller.step === s + 1 && !paperCouture.controller.moving, step);
    };
    const back = async () => {
      const step = (await state()).step;
      await p.getByRole('button', { name: 'Back', exact: true }).click();
      if ((await state()).moving) await p.getByRole('button', { name: 'Back', exact: true }).click();
      await p.waitForFunction(s => paperCouture.controller.step === s - 1 && !paperCouture.controller.moving, step);
    };
    const display = async () => {
      await p.getByRole('button', { name: 'Display', exact: true }).click();
      await p.waitForFunction(() => paperCouture.view.inDisplay);
    };
    const capture = async name => {
      await p.waitForFunction(() => !paperCouture.displayCam.glide);
      await p.screenshot({ path: `${output}/${name}.png` });
    };
    for (const [id, steps] of [['skirt', 7], ['vest', 6]]) {
      console.log(`Checking ${id}`);
      await p.goto(root + `?design=${id}&paper=tidal-bands&turn=1`);
      await p.waitForFunction(() => window.paperCouture);
      assert.equal(await p.evaluate(() => paperCouture.garmentId), id);
      // Reset during a fold, then go all the way forward and backward through the UI.
      await p.locator('.dock .btn-primary').click();
      await p.getByRole('button', { name: 'Start over', exact: true }).click();
      assert.equal((await state()).step, 0); assert.equal((await state()).moving, false);
      for (let i = 0; i < steps; i++) await fold();
      for (let i = 0; i < steps; i++) await back();
      assert.equal((await state()).step, 0);
      for (let i = 0; i < steps; i++) {
        await fold();
        if (i === 2) {
          await p.getByRole('button', { name: /^Turn paper/ }).click();
          assert.equal((await state()).step, 3);
          assert.equal((await state()).turn, 2);
        }
      }
      await display();
      for (const preset of ['Front', 'Angle', 'Back']) {
        await p.getByRole('button', { name: preset, exact: true }).click();
        await capture(`${id}-tidal-${preset.toLowerCase()}`);
      }
      // A contrasting print catches lost front/reverse mapping and clipping.
      await p.getByRole('radio', { name: 'Cut-paper mosaic', exact: true }).click();
      await p.getByRole('button', { name: 'Front', exact: true }).click();
      for (let turn = 0; turn < 4; turn++) {
        const before = (await state()).turn;
        await p.getByRole('button', { name: /^Turn paper/ }).click();
        assert.equal((await state()).turn, (before + 1) % 4);
        assert.equal((await state()).step, steps);
        await capture(`${id}-mosaic-turn-${(before + 1) % 4}`);
      }
      console.log(`Checking ${id} accessory`);
      await p.getByLabel('Accessory type').selectOption(id === 'skirt' ? 'bow' : 'pin');
      await p.getByRole('button', { name: 'Fold accessory', exact: true }).click();
      assert.equal(await p.getByLabel('Garment design').isDisabled(), true);
      const wings = id === 'skirt' ? 2 : 1;
      for (let wing = 0; wing < wings; wing++) {
        for (let i = 0; i < 5; i++) await fold();
        await p.locator('.dock .btn-primary').click();
      }
      await p.waitForFunction(() => paperCouture.view.inDisplay);
      assert.equal((await state()).attached, true);
      const positions = await p.getByLabel('Accessory position').locator('option').evaluateAll(xs => xs.map(x => x.value));
      assert.equal(positions.length, id === 'skirt' ? 3 : 5);
      for (const pos of positions) {
        await p.getByLabel('Accessory position').selectOption(pos);
        assert.equal(await p.evaluate(() => paperCouture.pinPosition), pos);
      }
      await p.getByRole('button', { name: 'Front', exact: true }).click();
      await capture(`${id}-accessory`);
      for (const size of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
        await p.setViewportSize(size);
        assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        const controls = await p.locator('.studio-controls').boundingBox();
        const dock = await p.locator('.display-dock').boundingBox();
        assert(controls.y + controls.height < dock.y, `${id}: controls overlap display dock`);
        await capture(`${id}-${size.width}`);
      }
      await p.setViewportSize({ width: 1280, height: 800 });
      await p.getByRole('button', { name: 'Edit accessory', exact: true }).click();
      await p.getByRole('button', { name: 'Back to garment', exact: true }).click();
      assert.equal((await state()).step, steps);
      await p.getByRole('button', { name: 'Remove accessory', exact: true }).click();
      assert.equal((await state()).attached, false);
    }
    // Switching designs resets the sheet, retains the chosen print and turn,
    // and normalizes the old attachment position against the new garment.
    const before = await state();
    await p.getByLabel('Garment design').selectOption('skirt');
    assert.equal((await state()).step, 0);
    assert.equal((await state()).paper, before.paper); assert.equal((await state()).turn, before.turn);
    assert.equal(await p.evaluate(() => paperCouture.pinPosition.startsWith('waist')), true);
    await p.getByLabel('Garment design').selectOption('jacket');
    assert.equal(await p.evaluate(() => paperCouture.timeline.ops.length), 6);
    await p.getByLabel('Garment design').selectOption('dress');
    await fold(); await fold();
    await p.getByRole('button', { name: 'Wide flare', exact: true }).click();
    assert.equal((await state()).shape, 'flare');
    assert.deepEqual(errors, []);
    fs.writeFileSync(`${output}/browser-result.json`, JSON.stringify({ passed: true, engine: 'Headless Chromium; software WebGL', checks: ['skirt: 7 steps forward and reverse', 'vest: 6 steps forward and reverse', 'reset during motion', 'rotation between folds preserves step', 'front/angle/back presets', 'finished paper change and all four rotations', 'skirt: both bow wings and three positions', 'vest: diamond pin and five positions', 'accessory edit/return/remove', 'portrait and landscape controls', 'design change preserves paper and turn', 'attachment position normalized', 'jacket available and dress silhouette choice'], errors }, null, 2));
    console.log('Garment browser checks passed');
  } finally { await browser?.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
