// Exact prior-paper preservation, registered material sampling, real folded views
// and a disposable mixed board. No external input image or drawing is published.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const base = process.env.DEV_URL || process.env.BASE_URL || 'http://127.0.0.1:5303';
const baseline = process.env.BASELINE_URL || 'http://127.0.0.1:5313';
const out = process.env.CAPTURE_DIR || '.plum-seed-qa';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1100, height: 800 }, hasTouch: true, reducedMotion: 'reduce', acceptDownloads: true });
  context.setDefaultTimeout(45000); context.setDefaultNavigationTimeout(90000);
  const page = await context.newPage();
  const result = { baselineSHA: '574b2b10cc2894586f2ee3f8c9496035365e6408', checks: [], errors: [], captures: 0 };
  page.on('pageerror', e => result.errors.push(String(e)));
  const button = name => page.getByRole('button', { name, exact: true });
  const ready = () => page.waitForFunction(() => window.paperCouture && !paperCouture.controller.moving && paperCouture.view.t === paperCouture.view.target && !paperCouture.displayCam.glide);
  const load = async query => { const response = await page.goto(base + '/?' + query); assert(response.ok()); await ready(); };
  const shot = async name => { await page.screenshot({ path: path.join(out, name + '.png') }); result.captures++; };
  const board = () => page.evaluate(() => JSON.parse(JSON.stringify(paperCouture.pinboard.state)));
  try {
    result.motifs = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', path.join(__dirname, 'check-plum-seed.ts')], { encoding: 'utf8' }));
    const signature = () => page.evaluate(async () => {
      const { PAPERS } = await import('/src/papers/index.ts'), { paperCanvas } = await import('/src/render/textures.ts');
      const { normalizePosition } = await import('/src/papers/printPosition.ts');
      const hash = async canvas => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data))).map(n => n.toString(16).padStart(2, '0')).join('');
      const faces = {}, placements = {};
      for (const paper of PAPERS) {
        for (const side of ['front', 'back']) faces[paper.id + '/' + side] = await hash(paperCanvas(paper, side, 0));
        if (!paper.placement) continue;
        const positions = paper.placement.kind === 'snap' ? paper.placement.positions : [
          { x: paper.placement.limit, y: -paper.placement.limit },
          { x: -paper.placement.limit / 2, y: paper.placement.limit / 2 },
        ];
        for (let q = 0; q < 4; q++) for (const input of positions) for (const side of ['front', 'back']) {
          const p = normalizePosition(paper, input);
          placements[[paper.id, side, q, p.x, p.y].join('/')] = await hash(paperCanvas(paper, side, q, p));
        }
      }
      return { faces, placements, registry: PAPERS.map(p => ({ id: p.id, name: p.name, hidden: !!p.hidden, curation: p.curation })) };
    });
    // One active WebGL app at a time: a second live renderer needlessly competes
    // with cold Vite startup and hashing on a small CI worker.
    await load(''); const current = await signature();
    const response = await page.goto(baseline); assert(response.ok()); await ready(); const old = await signature();
    assert.equal(old.registry.length, 26); assert.equal(Object.keys(old.faces).length, 52);
    for (const group of ['faces', 'placements']) for (const [key, hash] of Object.entries(old[group])) assert.equal(current[group][key], hash, group + ': ' + key);
    assert.deepEqual(current.registry.filter(p => p.id !== 'plum-seed'), old.registry);
    result.parity = { papers: old.registry.length, faces: Object.keys(old.faces).length, positionedFaces: Object.keys(old.placements).length };
    fs.writeFileSync(path.join(out, 'prior-paper-hashes.json'), JSON.stringify(old, null, 2));
    result.checks.push('Every prior PR24 paper face, visible/hidden metadata and order remains exact; sampled supported offset rasters match at all four turns.');
    console.log('Prior-paper parity:', JSON.stringify(result.parity)); await load('paper=plum-seed');

    result.registration = await page.evaluate(async () => {
      const { plumSeed } = await import('/src/papers/plumSeed.ts');
      const { paperCanvas, makePaperTextures } = await import('/src/render/textures.ts');
      const THREE = await import('/node_modules/.vite/deps/three.js');
      const size = 1024;
      const inkMask = side => {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
        const real = canvas.getContext('2d');
        // Use the real drawing path, omitting only its ground rectangle/colours.
        const maskContext = new Proxy(real, {
          get(target, key) { if (key === 'fillRect') return () => {}; const v = Reflect.get(target, key); return typeof v === 'function' ? v.bind(target) : v; },
          set(target, key, value) { if (key === 'fillStyle') { target.fillStyle = '#fff'; return true; } return Reflect.set(target, key, value); },
        });
        plumSeed[side === 'front' ? 'drawFront' : 'drawBack'](maskContext, size);
        return real.getImageData(0, 0, size, size).data;
      };
      const f = inkMask('front'), b = inkMask('back');
      const at = (data, x, y) => x >= 0 && y >= 0 && x < size && y < size && data[(y * size + x) * 4 + 3] > 32;
      const samples = [];
      for (let q = 0; q < 4; q++) {
        const textures = makePaperTextures(plumSeed, q, 1); let unmatched = 0, printedSamples = 0, reverseSamples = 0;
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
          const materialUV = new THREE.Vector2((x + .5) / size, (y + .5) / size);
          const a = materialUV.clone().applyMatrix3(textures.front.matrix), c = materialUV.clone().applyMatrix3(textures.back.matrix);
          if (Math.abs(a.x + c.x - 1) > 1e-12 || Math.abs(a.y - c.y) > 1e-12) throw Error('Actual texture material registration differs');
          const ax = Math.floor(a.x * size), ay = Math.floor((1 - a.y) * size), cx = Math.floor(c.x * size), cy = Math.floor((1 - c.y) * size);
          const front = at(f, ax, ay), back = at(b, cx, cy);
          if (front) printedSamples++; if (back) reverseSamples++;
          if (front === back) continue;
          let nearby = false;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (front ? at(b, cx + dx, cy + dy) : at(f, ax + dx, ay + dy)) nearby = true;
          if (!nearby) unmatched++;
        }
        textures.dispose(); samples.push({ turn: q, unmatched, printedSamples, reverseSamples });
      }
      const data = canvas => canvas.getContext('2d').getImageData(0, 0, size, size).data;
      const offsetIdentical = [];
      for (let q = 0; q < 4; q++) for (const side of ['front', 'back']) {
        const a = data(paperCanvas(plumSeed, side, q)), b = data(paperCanvas(plumSeed, side, q, { x: .2, y: -.2 }));
        offsetIdentical.push(a.every((value, i) => value === b[i]));
      }
      return { samples, offsetIdentical };
    });
    assert(result.registration.samples.every(s => s.unmatched === 0 && s.printedSamples > 10000 && s.reverseSamples > 10000));
    assert(result.registration.offsetIdentical.every(Boolean));
    result.checks.push('Actual texture matrices sample matching seed contours on both faces at every quarter-turn; unsupported offsets leave both faces pixel-identical.');
    console.log('Material-surface registration passed at all four turns.');

    const flats = await page.evaluate(async () => {
      const { findPaper } = await import('/src/papers/index.ts'), { paperCanvas } = await import('/src/render/textures.ts');
      return ['plum-seed', 'seed-dashes', 'oat-linen'].flatMap(id => ['front', 'back'].map(side => ({ name: id + '-flat-' + side, url: paperCanvas(findPaper(id), side, 0).toDataURL() })));
    });
    for (const flat of flats) fs.writeFileSync(path.join(out, flat.name + '.png'), Buffer.from(flat.url.split(',')[1], 'base64'));
    for (const design of ['jacket', 'pleats', 'clutch', 'boat-top']) {
      for (const paper of ['plum-seed', 'seed-dashes', 'oat-linen']) {
        await load(`design=${design}&paper=${paper}&step=99&view=display`);
        for (let q = 0; q < (paper === 'plum-seed' ? 4 : 1); q++) {
          await page.evaluate(q => paperCouture.rotatePattern(q), q);
          for (const side of ['Front', 'Back']) { await button(side).click(); await ready(); await shot(`${design}-${paper}-${q}-${side.toLowerCase()}`); }
        }
        console.log('Rendered ' + design + ' / ' + paper);
      }
    }
    result.checks.push('Plum seed actual folded front/back on jacket/skirt/clutch/boat-neck at four turns; matched cameras compare existing Seed dashes and Oat linen.');

    await load('design=boat-top&paper=plum-seed&printX=.125&printY=-.125');
    assert.deepEqual(await page.evaluate(() => paperCouture.printPosition), { x: 0, y: 0 });
    await button('Position print').click(); assert.match(await page.locator('.print-dialog').innerText(), /fixed placement/); await shot('fixed-placement'); await button('Done').click();
    const fold = async () => { const before = await page.evaluate(() => paperCouture.controller.step); await page.locator('.dock:not([hidden]) .btn-primary').click(); if (await page.evaluate(() => paperCouture.controller.moving)) await page.locator('.dock:not([hidden]) .btn-primary').click(); await page.waitForFunction(before => !paperCouture.controller.moving && paperCouture.controller.step === before + 1, before); };
    await shot('boat-before-folds');
    while (await page.evaluate(() => !paperCouture.controller.finished)) await fold();
    await button('Back').click(); if (await page.evaluate(() => paperCouture.controller.moving)) await button('Back').click(); await ready(); await fold();
    await button('Display').click(); await ready(); await button('Front').click(); await ready(); await shot('boat-after-folds');
    await button('Pinboard').click(); await button('Pin current piece').click();
    const capture = (await board()).items[0]; assert(capture.snapshot.materials.some(m => m.paper?.id === 'plum-seed'));
    for (let i = 0; i < 11; i++) await button('Move up').click();
    await load('design=pleats&paper=plum-scatter&step=99&view=display&printX=.125&printY=.0625');
    await button('Pinboard').click(); await button('Pin current piece').click();
    for (let i = 0; i < 9; i++) await button('Move down').click();
    await load('design=clutch&paper=plum-seed&step=99&view=display');
    await button('Pinboard').click(); await button('Pin current piece').click();
    for (let i = 0; i < 14; i++) await button('Move right').click();
    const state = await board(); assert.equal(state.items.length, 3); assert.deepEqual(state.items[0].snapshot, capture.snapshot);
    assert(state.items[1].snapshot.materials.some(m => m.paper?.id === 'plum-scatter' && m.paper.position.x === .125 && m.paper.position.y === .0625));
    await button('Remove selected').click(); await button('Undo').click(); assert.deepEqual(await board(), state);
    await shot('mixed-board-desktop');
    const download = page.waitForEvent('download'); await button('Save PNG').click(); await (await download).saveAs(path.join(out, 'mixed-board-export.png'));
    const png = fs.readFileSync(path.join(out, 'mixed-board-export.png')); result.exportPixels = [png.readUInt32BE(16), png.readUInt32BE(20)]; assert.deepEqual(result.exportPixels, [1800, 2100]);
    await page.reload(); await ready(); await page.getByRole('button', { name: /^View board/ }).click(); assert.deepEqual(await board(), state);
    for (const [width, height] of [[390, 844], [320, 568]]) {
      await page.setViewportSize({ width, height }); await shot('mixed-board-' + width); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      await button('Return to piece').click(); await button('Position print').click(); await shot('fixed-placement-' + width); await button('Done').click();
      await page.getByRole('button', { name: /^View board/ }).click(); assert.deepEqual(await board(), state);
    }
    result.checks.push('Real folds/Back, honest fixed-placement UI, small clutch and mixed printed outfit, old blossom offset, immutable capture/remove/Undo/reload, 1800×2100 PNG and 390/320 portrait controls pass.');
    assert.deepEqual(result.errors, []); result.passed = true;
  } catch (error) { result.failure = String(error); await shot('failure').catch(() => {}); throw error; }
  finally { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
