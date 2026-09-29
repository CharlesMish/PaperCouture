// Optional production-browser check. npm install --no-save playwright, then
// npm run build -- --base /play/paper-couture/ && node scripts/check-styling.cjs
// PLAYWRIGHT_MODULE and CHROMIUM_MODULE may point to external browser tooling.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = 'docs/astra-review/styling';
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
    await p.goto(root + '?step=2&paper=cut-paper-mosaic&turn=1');
    await p.waitForFunction(() => window.paperCouture);
    await p.screenshot({ path: `${output}/choice.png` });
    console.log('Checking silhouettes');
    for (const [id, label] of [['straight', 'Straight'], ['classic', 'Classic A-line'], ['flare', 'Wide flare']]) {
      await p.getByRole('button', { name: label, exact: true }).click();
      assert.equal((await state()).step, 2); assert.equal((await state()).paper, 'cut-paper-mosaic'); assert.equal((await state()).turn, 1);
      for (let i = 0; i < 4; i++) await fold();
      await p.getByRole('button', { name: 'Display', exact: true }).click();
      await p.waitForFunction(() => paperCouture.view.inDisplay);
      await p.screenshot({ path: `${output}/${id}.png` });
      await p.getByRole('button', { name: 'Revisit shape fold', exact: true }).click();
      assert.equal((await state()).step, 2);
    }
    await p.getByRole('button', { name: 'Classic A-line', exact: true }).click();
    for (let i = 0; i < 4; i++) await fold();
    console.log('Checking bow');
    await p.getByLabel('Accessory type').selectOption('bow');
    await p.getByRole('button', { name: 'Fold accessory', exact: true }).click();
    for (let wing = 0; wing < 2; wing++) {
      assert.equal((await state()).wing, wing);
      for (let i = 0; i < 5; i++) await fold();
      await p.locator('.dock .btn-primary').click();
    }
    await p.waitForFunction(() => paperCouture.view.inDisplay);
    assert.equal((await state()).attached, true);
    for (const pos of ['neckline', 'chest-left', 'chest-right', 'waist-left', 'waist', 'waist-right']) {
      await p.getByLabel('Accessory position').selectOption(pos);
      assert.equal(await p.evaluate(() => paperCouture.pinPosition), pos);
    }
    await p.screenshot({ path: `${output}/bow-waist.png` });
    console.log('Checking edit, remove, pin and reset');
    await p.getByRole('button', { name: 'Edit accessory', exact: true }).click();
    await p.getByRole('button', { name: /^Turn paper/ }).click();
    await p.getByRole('button', { name: 'Attach', exact: true }).click();
    await p.waitForFunction(() => paperCouture.view.inDisplay);
    assert.equal((await state()).turn, 1); // garment rotation untouched
    await p.getByRole('button', { name: 'Remove accessory', exact: true }).click();
    assert.equal((await state()).attached, false);
    await p.getByLabel('Accessory type').selectOption('pin');
    await p.getByRole('button', { name: 'Fold accessory', exact: true }).click();
    for (let i = 0; i < 5; i++) await fold();
    await p.getByRole('button', { name: 'Attach', exact: true }).click();
    await p.waitForFunction(() => paperCouture.view.inDisplay);
    assert.equal((await state()).accessory, 'pin');
    // Reset during motion, reverse, and switch designs with an accessory saved.
    await p.getByRole('button', { name: 'Revisit shape fold', exact: true }).click();
    await p.locator('.dock .btn-primary').click();
    await p.getByRole('button', { name: 'Start over', exact: true }).click();
    assert.equal((await state()).step, 0); assert.equal((await state()).moving, false);
    await fold(); await p.getByRole('button', { name: 'Back', exact: true }).click();
    if ((await state()).moving) await p.getByRole('button', { name: 'Back', exact: true }).click();
    assert.equal((await state()).step, 0);
    await p.getByLabel('Garment design').selectOption('jacket');
    for (let i = 0; i < 6; i++) await fold();
    await p.getByRole('button', { name: 'Display', exact: true }).click();
    await p.waitForFunction(() => paperCouture.view.inDisplay);
    console.log('Checking phone layouts');
    for (const size of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
      await p.setViewportSize(size);
      await p.screenshot({ path: `${output}/jacket-${size.width}.png` });
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const controls = await p.locator('.studio-controls').boundingBox();
      const dock = await p.locator('.display-dock').boundingBox();
      assert(controls.y + controls.height < dock.y, 'top controls overlap display dock');
    }
    await p.setViewportSize({ width: 390, height: 844 });
    await p.getByLabel('Garment design').selectOption('dress');
    await fold(); await fold();
    await p.screenshot({ path: `${output}/choice-phone.png` });
    await p.getByRole('button', { name: 'Wide flare', exact: true }).click();
    assert.equal((await state()).shape, 'flare');
    assert.deepEqual(errors, []);
    fs.writeFileSync(`${output}/browser-result.json`, JSON.stringify({ passed: true, engine: 'Headless Chromium; software WebGL', checks: ['three silhouettes through UI', 'revisit preserves paper and turn', 'both bow wings folded separately', 'six attachment positions', 'independent accessory rotation', 'remove and switch to pin', 'mid-fold reset and reverse', 'jacket with accessory', 'portrait and landscape controls', 'phone shape choice'], errors }, null, 2));
    console.log('Styling browser checks passed');
  } finally { await browser?.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
