// Optional production-browser review of the draft proposals
// (docs/geometry-collection/drafts/NOTES.md). npm install --no-save playwright, then
// npm run build -- --base /play/paper-couture/ && node scripts/check-drafts-review.cjs
// PLAYWRIGHT_MODULE may point to external browser tooling; SHOTS_DIR overrides the output.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.SHOTS_DIR || 'docs/geometry-collection/drafts/shots';
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
  const checks = [];
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-angle=swiftshader'] });
    const p = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
    p.setDefaultTimeout(20000);
    p.on('pageerror', e => errors.push(String(e)));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    p.on('requestfailed', r => errors.push(`${r.url()}: ${r.failure()?.errorText}`));
    const root = `http://127.0.0.1:${server.address().port}/play/paper-couture/`;
    const step = () => p.evaluate(() => paperCouture.controller.step);
    const fold = async () => {
      const s = await step();
      await p.locator('.dock .btn-primary').click();
      if (await p.evaluate(() => paperCouture.controller.moving)) await p.locator('.dock .btn-primary').click();
      await p.waitForFunction(s => paperCouture.controller.step === s + 1 && !paperCouture.controller.moving, s);
    };
    const settle = () => p.waitForFunction(() => !paperCouture.displayCam.glide);
    const capture = async name => { await settle(); await p.waitForTimeout(150); await p.screenshot({ path: `${output}/${name}.png` }); };
    const preset = name => p.getByRole('button', { name, exact: true }).click();
    // Small flaps get 44px screen grips from the existing FoldHandles; wait for them to render.
    const handles = async () => {
      await p.locator('.fold-handle').first().waitFor({ state: 'visible', timeout: 5000 });
      return p.locator('.fold-handle').evaluateAll(xs => xs.map(x => { const r = x.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
    };
    // Finished garments straight from the URL, in Display view.
    const open = async (query, steps) => {
      await p.goto(root + query);
      await p.waitForFunction(() => window.paperCouture);
      assert.equal(await p.evaluate(() => paperCouture.timeline.ops.length), steps, query);
      assert.equal(await step(), steps, query);
      assert.equal(await p.evaluate(() => paperCouture.view.inDisplay), true, query);
    };
    // 1. Papers on the dress (front and back) and the jacket.
    for (const paper of ['pinstripe-lining', 'border-print']) {
      await open(`?design=dress&paper=${paper}&step=6&view=display`, 6);
      assert.equal(await p.evaluate(() => paperCouture.paperId), paper);
      await capture(`paper-${paper}-dress-front`);
      await preset('Back'); await capture(`paper-${paper}-dress-back`);
    }
    await open('?design=jacket&paper=pinstripe-lining&step=6&view=display', 6);
    await capture('paper-pinstripe-lining-jacket-front');
    await open('?design=vest&paper=pinstripe-lining&step=8&view=display', 8);
    await capture('paper-pinstripe-lining-vest-front');
    checks.push('both papers selectable, on dress front/back, pinstripe on jacket and vest');
    // 2a. Pleat depth: all three, same paper.
    for (const depth of ['shallow', 'classic', 'deep']) {
      await p.goto(root + `?design=pleats&paper=border-print&pleats=${depth}`);
      await p.waitForFunction(() => window.paperCouture);
      const n = await p.evaluate(() => paperCouture.timeline.ops.length);
      await p.goto(root + `?design=pleats&paper=border-print&pleats=${depth}&step=${n}&view=display`);
      await p.waitForFunction(() => window.paperCouture && paperCouture.view.inDisplay);
      assert.equal(await p.evaluate(() => paperCouture.options.pleatDepth), depth);
      await capture(`pleats-${depth}`);
    }
    checks.push('pleat depth shallow/classic/deep via URL');
    // 2b. Turned cuffs, walked through the UI so the flap step and its grips are seen.
    await p.goto(root + '?design=jacket&paper=pinstripe-lining&cuffs=turned');
    await p.waitForFunction(() => window.paperCouture);
    assert.equal(await p.evaluate(() => paperCouture.timeline.ops.length), 7);
    for (let i = 0; i < 6; i++) await fold();
    const cuffGrips = await handles();
    assert.equal(cuffGrips.length, 2, 'one grip per cuff flap');
    assert(cuffGrips.every(([w, h]) => w >= 44 && h >= 44), 'cuff grips are at least 44px');
    await p.screenshot({ path: `${output}/cuffs-turned-step.png` });
    await p.setViewportSize({ width: 390, height: 844 });
    const phoneGrips = await handles();
    assert(phoneGrips.length === 2 && phoneGrips.every(([w, h]) => w >= 44 && h >= 44), 'cuff grips at phone size');
    await p.screenshot({ path: `${output}/cuffs-turned-step-390.png` });
    await p.setViewportSize({ width: 1280, height: 800 });
    await fold();
    await p.getByRole('button', { name: 'Display', exact: true }).click();
    await p.waitForFunction(() => paperCouture.view.inDisplay);
    await capture('cuffs-turned-front');
    await open('?design=jacket&paper=pinstripe-lining&cuffs=plain&step=6&view=display', 6);
    await capture('cuffs-plain-front');
    checks.push(`jacket turned cuffs: 7 steps through the UI; grips at the cuff step ${JSON.stringify(cuffGrips)} (1280x800), ${JSON.stringify(phoneGrips)} (390x844)`);
    // 3. Sailor-collar top.
    for (const paper of ['pinstripe-lining', 'border-print', 'tidal-bands']) {
      await open(`?design=sailor&paper=${paper}&step=6&view=display`, 6);
      await capture(`sailor-${paper}-front`);
      await preset('Back'); await capture(`sailor-${paper}-back`);
      await preset('Angle'); await capture(`sailor-${paper}-angle`);
    }
    await p.goto(root + '?design=sailor&paper=pinstripe-lining');
    await p.waitForFunction(() => window.paperCouture);
    for (let i = 0; i < 6; i++) await fold();
    checks.push('sailor top: 6 steps through the UI, front/back/angle on three papers');
    // 4. Accessories: fold each from its own square in the studio and place it.
    const accessory = async (garment, steps, type, folds, position, name, paper = 'pinstripe-lining') => {
      await open(`?design=${garment}&paper=${paper}&step=${steps}&view=display`, steps);
      const types = await p.getByLabel('Accessory type').locator('option').evaluateAll(xs => xs.map(x => [x.value, x.disabled]));
      await p.getByLabel('Accessory type').selectOption(type);
      await p.getByRole('button', { name: 'Fold accessory', exact: true }).click();
      for (let i = 0; i < folds; i++) await fold();
      await p.locator('.dock .btn-primary').click();
      await p.waitForFunction(() => paperCouture.view.inDisplay && paperCouture.attached);
      const positions = await p.getByLabel('Accessory position').locator('option').evaluateAll(xs => xs.map(x => x.value));
      await p.getByLabel('Accessory position').selectOption(position);
      assert.equal(await p.evaluate(() => paperCouture.pinPosition), position);
      await preset('Front');
      await capture(name);
      return { types, positions };
    };
    const k1 = await accessory('dress', 6, 'kerchief', 5, 'neckline', 'kerchief-dress-neckline');
    assert.deepEqual(k1.positions, ['neckline']);
    const k2 = await accessory('sailor', 6, 'kerchief', 5, 'neckline', 'kerchief-sailor-neckline', 'border-print');
    const q1 = await accessory('jacket', 6, 'pocket', 5, 'chest-left', 'pocket-jacket-chest-left');
    assert.deepEqual(q1.positions.slice().sort(), ['chest-left', 'chest-right']);
    const q2 = await accessory('sailor', 6, 'pocket', 5, 'chest-left', 'pocket-sailor-chest-left', 'border-print');
    // Skirts have no neckline or chest: those types are disabled there.
    await open('?design=skirt&paper=pinstripe-lining&step=9&view=display', 9);
    const skirtTypes = await p.getByLabel('Accessory type').locator('option').evaluateAll(xs => Object.fromEntries(xs.map(x => [x.value, x.disabled])));
    assert.equal(skirtTypes.kerchief, true); assert.equal(skirtTypes.pocket, true); assert.equal(skirtTypes.bow, false);
    checks.push(`neckerchief positions ${JSON.stringify(k1.positions)} / ${JSON.stringify(k2.positions)}; pocket positions ${JSON.stringify(q1.positions)} / ${JSON.stringify(q2.positions)}; skirt disables kerchief and pocket`);
    // Existing accessories still fold and attach.
    const pin = await accessory('dress', 6, 'pin', 5, 'neckline', 'pin-dress-neckline-regression');
    checks.push(`diamond pin still attaches; dress positions ${JSON.stringify(pin.positions)}`);
    assert.deepEqual(errors, []);
    fs.writeFileSync(`${output}/browser-result.json`, JSON.stringify({ passed: true, engine: 'Headless Chromium; software WebGL', checks, errors, note: 'Browser review only; not a real-phone check.' }, null, 2));
    console.log('Draft browser review passed'); checks.forEach(c => console.log(' - ' + c));
  } finally { await browser?.close(); server.close(); }
})().catch(e => { console.error(e); console.error('errors:', errors); process.exitCode = 1; });
