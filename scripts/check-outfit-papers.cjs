// Node 24 + Playwright, a dev server for candidate imports, optional PR23 dev baseline.
// Only disposable browser contexts are used; no owner's browser storage is read/cleared.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.DEV_URL || 'http://127.0.0.1:5203';
const baseline = process.env.BASELINE_URL;
const out = process.env.CAPTURE_DIR || 'docs/outfit-papers/evidence';
const papers = ['oat-linen', 'slate-grain', 'ginkgo-pairs'];
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1100, height: 800 }, hasTouch: true, reducedMotion: 'reduce', acceptDownloads: true });
  const page = await context.newPage(); page.setDefaultTimeout(45000);
  const result = { base, baseline: baseline || null, baselineSHA: 'feb9cc80f5ca0da7ef2e49619665458c2f923c5a', phase: process.env.FLOW_ONLY ? 'interaction' : 'complete', errors: [], checks: [], captures: 0 };
  page.on('pageerror', e => result.errors.push(String(e)));
  const settle = () => page.waitForFunction(() => window.paperCouture && !paperCouture.controller.moving && paperCouture.view.t === paperCouture.view.target && !paperCouture.displayCam.glide);
  const load = async query => { await page.goto(base + '/?' + query); await settle(); };
  const button = name => page.getByRole('button', { name, exact: true });
  const shot = async name => { await page.screenshot({ path: path.join(out, name + '.png') }); result.captures++; };
  // Compare the persisted representation: JSON intentionally normalizes -0 to 0.
  const board = () => page.evaluate(() => JSON.parse(JSON.stringify(paperCouture.pinboard.state)));
  try {
    await load('');
    if (!process.env.FLOW_ONLY) {
    const hashPapers = p => p.evaluate(async () => {
      const { PAPERS } = await import('/src/papers/index.ts'), { paperCanvas } = await import('/src/render/textures.ts');
      const hashes = {};
      for (const paper of PAPERS) for (const side of ['front', 'back']) {
        const canvas = paperCanvas(paper, side, 0), bytes = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        hashes[paper.id + '/' + side] = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(x => x.toString(16).padStart(2, '0')).join('');
      }
      return { hashes, registry: PAPERS.map(p => ({ id: p.id, name: p.name, hidden: !!p.hidden, curation: p.curation })) };
    });
    const current = await hashPapers(page);
    assert.equal(new Set(current.registry.map(p => p.id)).size, current.registry.length);
    if (baseline) {
      const oldPage = await context.newPage(); await oldPage.goto(baseline); await oldPage.waitForFunction(() => window.paperCouture);
      const old = await hashPapers(oldPage); await oldPage.close();
      for (const [key, hash] of Object.entries(old.hashes)) assert.equal(current.hashes[key], hash, key + ' changed');
      for (const prior of old.registry) assert.deepEqual(current.registry.find(p => p.id === prior.id), prior);
      result.oldRasterCount = Object.keys(old.hashes).length;
      result.checks.push('All PR23 paper rasters, IDs, names, hidden flags and curation remain exact.');
    }
    fs.writeFileSync(path.join(out, 'raster-hashes.json'), JSON.stringify(current, null, 2));

    // Registration checks use alpha masks before shared stationary paper grain.
    result.ink = await page.evaluate(async () => {
      const { findPaper } = await import('/src/papers/index.ts'), { paperCanvas } = await import('/src/render/textures.ts');
      const { sourceShift, normalizePosition } = await import('/src/papers/printPosition.ts');
      const paper = findPaper('ginkgo-pairs'), size = 1024;
      const data = canvas => canvas.getContext('2d').getImageData(0, 0, size, size).data;
      const mask = (side, turn, offset) => {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d'), shift = sourceShift(offset, turn);
        ctx.translate((side === 'front' ? shift.x : -shift.x) * size, -shift.y * size);
        paper.placement[side](ctx, size); return data(canvas);
      };
      const registration = []; let stationary = 0, changed = 0;
      for (let turn = 0; turn < 4; turn++) for (const offset of [{ x: 0, y: 0 }, { x: .125, y: -.0625 }, { x: -.25, y: .25 }]) {
        const f = mask('front', turn, offset), b = mask('back', turn, offset);
        let unmatched = 0, inkPixels = 0;
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
          const a = f[(y * size + x) * 4 + 3] > 32, c = b[(y * size + size - 1 - x) * 4 + 3] > 32;
          if (a) inkPixels++;
          if (a === c) continue;
          let nearby = false;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue;
            if ((a ? b[(yy * size + size - 1 - xx) * 4 + 3] : f[(yy * size + xx) * 4 + 3]) > 32) nearby = true;
          }
          if (!nearby) unmatched++;
        }
        registration.push({ turn, offset, unmatched, inkPixels });
      }
      for (const side of ['front', 'back']) {
        const offset = { x: .125, y: -.0625 }, a = data(paperCanvas(paper, side, 0)), b = data(paperCanvas(paper, side, 0, offset));
        const m = mask(side, 0, { x: 0, y: 0 }), n = mask(side, 0, offset);
        for (let i = 0; i < a.length; i += 4) {
          const equal = a[i] === b[i] && a[i + 1] === b[i + 1] && a[i + 2] === b[i + 2] && a[i + 3] === b[i + 3];
          if (!m[i + 3] && !n[i + 3]) { if (!equal) throw Error('Grain or ground moved'); stationary++; }
          else if (!equal) changed++;
        }
      }
      return { registration, stationary, changed,
        clamped: normalizePosition(paper, { x: 1, y: -1 }),
        quietOffsets: ['oat-linen', 'slate-grain'].map(id => normalizePosition(findPaper(id), { x: .125, y: .125 })) };
    });
    assert(result.ink.registration.every(r => r.unmatched === 0 && r.inkPixels > 1000));
    assert(result.ink.stationary > 100000 && result.ink.changed > 10000);
    assert.deepEqual(result.ink.clamped, { x: .25, y: -.25 });
    assert(result.ink.quietOffsets.every(p => p.x === 0 && p.y === 0));
    result.checks.push('Ginkgo paired contours register within one raster pixel at four turns and three bounded offsets; ground/grain stay fixed. Quiet papers explicitly keep fixed placement.');

    const flats = await page.evaluate(async ids => {
      const { findPaper } = await import('/src/papers/index.ts'), { paperCanvas } = await import('/src/render/textures.ts');
      return ids.flatMap(id => ['front', 'back'].map(side => ({ name: id + '-flat-' + side, url: paperCanvas(findPaper(id), side, 0).toDataURL() })));
    }, papers);
    for (const flat of flats) fs.writeFileSync(path.join(out, flat.name + '.png'), Buffer.from(flat.url.split(',')[1], 'base64'));
    for (const paper of papers) for (const design of ['jacket', 'pleats', 'apron', 'clutch']) {
      await load(`design=${design}&paper=${paper}&step=99&view=display`);
      await button('Front').click(); await settle();
      for (let turn = 0; turn < 4; turn++) {
        await page.evaluate(turn => paperCouture.rotatePattern(turn), turn);
        await shot(`${design}-${paper}-${turn}-front`);
      }
      await page.evaluate(() => paperCouture.rotatePattern(0));
      await button('Back').click(); await settle(); await shot(`${design}-${paper}-0-back`);
      console.log('Rendered ' + design + ' / ' + paper);
    }
    for (let turn = 0; turn < 4; turn++) for (const side of ['Front', 'Back']) {
      await load(`design=jacket&paper=ginkgo-pairs&turn=${turn}&step=99&view=display&printX=.125&printY=-.0625`);
      await button(side).click(); await settle(); await shot(`jacket-ginkgo-pairs-${turn}-shift-${side.toLowerCase()}`);
    }
    result.checks.push('All three papers rendered on jacket/pleated skirt/apron/clutch at every quarter-turn, reverse views at zero; shifted Ginkgo front/back rendered at every turn.');
    fs.writeFileSync(path.join(out, 'gallery-results.json'), JSON.stringify({ ...result, passed: true, phase: 'gallery' }, null, 2));
    }

    // Actual reversible folds with a positioned print, and three independent captures.
    await load('design=jacket&paper=ginkgo-pairs');
    await button('Position print').click(); await button('Right').click(); await button('Down').click(); await button('Done').click();
    const fold = async () => {
      const step = await page.evaluate(() => paperCouture.controller.step);
      await page.locator('.dock:not([hidden]) .btn-primary').click();
      if (await page.evaluate(() => paperCouture.controller.moving)) await page.locator('.dock:not([hidden]) .btn-primary').click();
      await page.waitForFunction(step => !paperCouture.controller.moving && paperCouture.controller.step === step + 1, step);
    };
    while (await page.evaluate(() => !paperCouture.controller.finished)) await fold();
    await button('Back').click(); if (await page.evaluate(() => paperCouture.controller.moving)) await button('Back').click(); await settle(); await fold();
    assert.deepEqual(await page.evaluate(() => paperCouture.printPosition), { x: 1 / 32, y: -1 / 32 });
    await button('Display').click(); await settle(); await button('Pinboard').click(); await button('Pin current piece').click();
    const jacket = (await board()).items[0];
    assert(jacket.snapshot.materials.some(m => m.paper?.id === 'ginkgo-pairs' && m.paper.position.x === 1 / 32 && m.paper.position.y === -1 / 32));
    for (let i = 0; i < 12; i++) await button('Move up').click();
    await load('design=pleats&paper=slate-grain&step=99&view=display');
    await button('Pinboard').click(); await button('Pin current piece').click();
    for (let i = 0; i < 10; i++) await button('Move down').click();
    await load('design=clutch&paper=oat-linen&step=99&view=display');
    await button('Pinboard').click(); await button('Pin current piece').click();
    for (let i = 0; i < 12; i++) await button('Move right').click();
    const composed = await board(); assert.equal(composed.items.length, 3);
    assert.deepEqual(composed.items[0].snapshot, jacket.snapshot);
    await button('Remove selected').click(); await button('Undo').click(); assert.deepEqual(await board(), composed);
    await shot('mixed-board-desktop');
    const downloadPromise = page.waitForEvent('download'); await button('Save PNG').click();
    const download = await downloadPromise; await download.saveAs(path.join(out, 'mixed-board-export.png'));
    const png = fs.readFileSync(path.join(out, 'mixed-board-export.png'));
    result.exportPixels = [png.readUInt32BE(16), png.readUInt32BE(20)];
    assert.deepEqual(result.exportPixels, [1800, 2100]);
    await page.reload(); await settle(); await page.getByRole('button', { name: /^View board/ }).click();
    assert.deepEqual(await board(), composed);
    for (const [width, height] of [[390, 844], [320, 568]]) {
      await page.setViewportSize({ width, height }); await shot('mixed-board-' + width);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      await button('Return to piece').click();
      await page.getByRole('radio', { name: 'Ginkgo pairs', exact: true }).click();
      await button('Position print').click(); await button('Right').click(); await shot('print-controls-' + width); await button('Done').click();
      await page.getByRole('radio', { name: 'Oat linen', exact: true }).click();
      await button('Position print').click(); assert.match(await page.locator('.print-dialog').innerText(), /fixed fibres/); await button('Done').click();
      await page.getByRole('button', { name: /^View board/ }).click(); assert.deepEqual(await board(), composed);
    }
    result.checks.push('Real Fold/Back retains positioned Ginkgo; three independent paper captures survive moves/remove/Undo/reload and PNG. Portrait 390/320 swatches/print controls reachable without overflow; existing captures stay exact after paper edits.');
    assert.deepEqual(result.errors, []); result.passed = true;
  } catch (error) { result.failure = String(error); await shot('failure').catch(() => {}); throw error; }
  finally {
    fs.writeFileSync(path.join(out, process.env.FLOW_ONLY ? 'interaction-results.json' : 'results.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2)); await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
