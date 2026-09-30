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
// Declared outside the async body so the final catch can report them.
const errors = [];
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
    for (let i = 0; i < 5; i++) await fold();
    // The choice is offered before the reveal turn; it names the turned option
    // as a printed corner, before the extra fold is made.
    const cuffChoice = await p.locator('.shape-choices').evaluate(f => ({
      legend: f.querySelector('legend').textContent,
      names: Array.from(f.querySelectorAll('button')).map(b => b.getAttribute('aria-label')),
      overflow: f.scrollWidth > f.clientWidth + 1,
    }));
    assert.deepEqual(cuffChoice.names, ['Plain', 'Printed corners']);
    assert(/print/.test(cuffChoice.legend), 'cuff choice legend describes the printed corner');
    assert(!cuffChoice.overflow, 'cuff choices overflow at 1280x800');
    await p.screenshot({ path: `${output}/cuffs-choice.png` });
    await p.setViewportSize({ width: 390, height: 844 });
    await p.waitForTimeout(200);
    const cuffPhoneOverflow = await p.locator('.shape-choices').evaluate(f => f.scrollWidth > f.clientWidth + 1 || document.documentElement.scrollWidth > window.innerWidth);
    assert(!cuffPhoneOverflow, 'cuff choices overflow at 390x844');
    await p.screenshot({ path: `${output}/cuffs-choice-390.png` });
    await p.setViewportSize({ width: 1280, height: 800 });
    await fold();
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
    checks.push(`jacket turned cuffs: choice legend ${JSON.stringify(cuffChoice.legend)}, choices ${JSON.stringify(cuffChoice.names)}, no overflow at 1280x800 or 390x844; 7 steps through the UI; grips at the cuff step ${JSON.stringify(cuffGrips)} (1280x800), ${JSON.stringify(phoneGrips)} (390x844)`);
    // 3. Sailor-collar top: parked as a study (Astra review of PR #11), so the
    // URL falls back to the dress and the design list no longer offers it.
    await p.goto(root + '?design=sailor&paper=pinstripe-lining');
    await p.waitForFunction(() => window.paperCouture);
    assert.equal(await p.evaluate(() => paperCouture.garmentId), 'dress', 'parked sailor top should open the dress');
    const designs = await p.getByLabel('Garment design').locator('option').evaluateAll(xs => xs.map(x => x.value));
    assert(!designs.includes('sailor'), 'sailor top is not selectable');
    checks.push(`sailor top parked: ?design=sailor opens the dress; designs ${JSON.stringify(designs)}`);
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
    const k2 = await accessory('jacket', 6, 'kerchief', 5, 'neckline', 'kerchief-jacket-neckline', 'border-print');
    const q1 = await accessory('jacket', 6, 'pocket', 5, 'chest-left', 'pocket-jacket-chest-left');
    assert.deepEqual(q1.positions.slice().sort(), ['chest-left', 'chest-right']);
    const q2 = await accessory('dress', 6, 'pocket', 5, 'chest-right', 'pocket-dress-chest-right', 'border-print');
    // Skirts have no neckline or chest: those types are disabled there.
    await open('?design=skirt&paper=pinstripe-lining&step=9&view=display', 9);
    const skirtTypes = await p.getByLabel('Accessory type').locator('option').evaluateAll(xs => Object.fromEntries(xs.map(x => [x.value, x.disabled])));
    assert.equal(skirtTypes.kerchief, true); assert.equal(skirtTypes.pocket, true); assert.equal(skirtTypes.bow, false);
    checks.push(`neckerchief positions ${JSON.stringify(k1.positions)} / ${JSON.stringify(k2.positions)}; pocket positions ${JSON.stringify(q1.positions)} / ${JSON.stringify(q2.positions)}; skirt disables kerchief and pocket`);
    // 5. Selector round trip (Astra P3): attach on the jacket, change to the
    // wrap skirt (no place for it) and finish, then back to the jacket and
    // finish. The selector must show the kept accessory and offer Edit; a
    // deliberate choice made on the skirt must be preserved instead.
    const finish = async () => {
      const n = await p.evaluate(() => paperCouture.timeline.ops.length);
      while (await step() < n) await fold();
    };
    const design = async id => {
      await p.getByLabel('Garment design').selectOption(id);
      await p.waitForFunction(id => paperCouture.garmentId === id, id);
      await finish();
    };
    const selector = () => p.evaluate(() => {
      const s = document.querySelector('[aria-label="Accessory type"]');
      const edit = Array.from(document.querySelectorAll('.studio-controls button')).find(b => /accessory$/.test(b.textContent) && !/Remove/.test(b.textContent));
      return { value: s.value, name: s.selectedOptions[0].textContent, edit: edit.textContent };
    });
    const roundTrip = [];
    for (const [type, position] of [['kerchief', 'neckline'], ['pocket', 'chest-left']]) {
      await accessory('jacket', 6, type, 5, position, `roundtrip-${type}-jacket`);
      await design('skirt');
      const onSkirt = await selector();
      assert.notEqual(onSkirt.value, type, `${type} is unavailable on the skirt`);
      await design('jacket');
      assert.equal(await p.evaluate(() => paperCouture.attached), true);
      const back = await selector();
      assert.deepEqual([back.value, back.edit], [type, 'Edit accessory'], `${type}: selector after the round trip ${JSON.stringify(back)}`);
      assert.equal(await p.evaluate(() => paperCouture.accessoryId), type);
      await p.screenshot({ path: `${output}/roundtrip-${type}-selector.png` });
      roundTrip.push(`${type}: skirt shows ${onSkirt.name}/${onSkirt.edit}, jacket restores ${back.name}/${back.edit}`);
    }
    // A deliberate selection on the skirt is kept.
    await accessory('jacket', 6, 'kerchief', 5, 'neckline', 'roundtrip-kerchief-jacket');
    await design('skirt');
    await p.getByLabel('Accessory type').selectOption('bow');
    await design('jacket');
    const deliberate = await selector();
    assert.deepEqual([deliberate.value, deliberate.edit], ['bow', 'Fold accessory'], `deliberate selection ${JSON.stringify(deliberate)}`);
    roundTrip.push(`deliberate Two-piece bow chosen on the skirt stays ${deliberate.name}/${deliberate.edit} on the jacket`);
    checks.push('accessory selector round trip: ' + roundTrip.join('; '));
    // Existing accessories still fold and attach.
    const pin = await accessory('dress', 6, 'pin', 5, 'neckline', 'pin-dress-neckline-regression');
    checks.push(`diamond pin still attaches; dress positions ${JSON.stringify(pin.positions)}`);
    assert.deepEqual(errors, []);
    fs.writeFileSync(`${output}/browser-result.json`, JSON.stringify({ passed: true, engine: 'Headless Chromium; software WebGL', checks, errors, note: 'Browser review only; not a real-phone check.' }, null, 2));
    console.log('Draft browser review passed'); checks.forEach(c => console.log(' - ' + c));
  } finally { await browser?.close(); server.close(); }
})().catch(e => { console.error(e); console.error('errors:', errors); process.exitCode = 1; });
