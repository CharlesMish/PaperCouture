const checkCapacity = require('./board-capacity.cjs');
// Production-compatible October integration check. No source-module imports,
// injected papers, private profile, existing owner saves or external services.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const base = process.env.BASE_URL || 'http://127.0.0.1:5365';
const out = process.env.CAPTURE_DIR || 'docs/october-integration/browser';
const key = 'paper-couture.pinboard.v1';
const papers = [['riso-proof', 'Riso proof'], ['crease-bloom', 'Crease bloom'],
  ['marbled-endpaper', 'Marbled endpaper'], ['dusk-wash', 'Dusk wash']];
const designs = ['swing-coat', 'camp-shirt', 'pleats', 'framed-brooch'];
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
fs.mkdirSync(path.join(out, 'frames'), { recursive: true });

function snapshotBounds(snapshot) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const part of snapshot.parts) {
    const m = part.matrix, vertices = snapshot.geometries[part.geometry].position;
    for (let i = 0; i < vertices.length; i += 3) for (let axis = 0; axis < 3; axis++) {
      const value = m[axis] * vertices[i] + m[axis + 4] * vertices[i + 1] + m[axis + 8] * vertices[i + 2] + m[axis + 12];
      min[axis] = Math.min(min[axis], value); max[axis] = Math.max(max[axis], value);
    }
  }
  return { min, max, size: max.map((v, i) => v - min[i]) };
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const result = { base, checks: [], errors: [], sourceRequests: [], assets: [], captures: [], physicalPhoneTested: false, physicalPaperTested: false };
  const record = text => { result.checks.push(text); console.log(text); };
  const make = async (width = 1180, height = 900) => {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, reducedMotion: 'reduce', acceptDownloads: true });
    const page = await context.newPage(); page.setDefaultTimeout(60000); page.setDefaultNavigationTimeout(90000);
    page.on('pageerror', e => result.errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') result.errors.push(m.text()); });
    page.on('request', r => {
      const u = new URL(r.url());
      if (u.pathname.startsWith('/src/') || u.pathname.includes('/node_modules/')) result.sourceRequests.push(u.pathname);
      if (u.pathname.startsWith('/assets/') && !result.assets.includes(u.pathname)) result.assets.push(u.pathname);
    });
    const btn = name => page.getByRole('button', { name, exact: true });
    const settle = () => page.waitForFunction(() => window.paperCouture && !paperCouture.controller.moving && paperCouture.view.t === paperCouture.view.target && !paperCouture.displayCam.glide);
    const load = async query => { assert((await page.goto(base + '/?' + query)).ok()); await settle(); };
    const state = () => page.evaluate(() => ({ design: paperCouture.garmentId, paper: paperCouture.paperId, turn: paperCouture.quarterTurns, step: paperCouture.controller.step }));
    const geometry = () => page.evaluate(() => JSON.stringify({ facets: paperCouture.timeline.states.at(-1).facets,
      position: Array.from(paperCouture.sheet.front.geometry.attributes.position.array), uv: Array.from(paperCouture.sheet.front.geometry.attributes.uv.array) }));
    const board = () => page.evaluate(() => structuredClone(paperCouture.pinboard.state));
    const open = () => page.getByRole('button', { name: /^View board/ }).click();
    const shot = async (name, frame = false) => {
      const file = path.join(out, frame ? 'frames' : '', name + '.png');
      await page.screenshot({ path: file }); result.captures.push({ name, sha256: sha(fs.readFileSync(file)) });
    };
    const view = async name => { await btn(name).click(); await settle(); };
    const advance = async () => {
      const before = (await state()).step; await page.locator('.dock:not([hidden]) .btn-primary').click();
      if (await page.evaluate(() => paperCouture.controller.moving)) await page.locator('.dock:not([hidden]) .btn-primary').click();
      await settle(); assert.equal((await state()).step, before + 1);
    };
    const back = async () => {
      const before = (await state()).step; await btn('Back').click();
      if (await page.evaluate(() => paperCouture.controller.moving)) await btn('Back').click();
      await settle(); assert.equal((await state()).step, before - 1);
    };
    const exportPNG = async name => {
      const expected = await page.evaluate(() => { const b = paperCouture.pinboard; b.selection.visible = false;
        b.renderer.setSize(1800, 2100, false); b.renderer.render(b.scene, b.camera); return b.canvas.toDataURL('image/png'); });
      const [download] = await Promise.all([page.waitForEvent('download'), btn('Save PNG').click()]);
      const file = path.join(out, name + '.png'); await download.saveAs(file); const bytes = fs.readFileSync(file);
      assert.deepEqual(bytes, Buffer.from(expected.split(',')[1], 'base64'));
      assert.equal(bytes.readUInt32BE(16), 1800); assert.equal(bytes.readUInt32BE(20), 2100);
      return bytes;
    };
    return { context, page, btn, settle, load, state, geometry, board, open, shot, view, advance, back, exportPNG };
  };
  let active;
  try {
    const p = active = await make();
    const { page, btn, settle, load, state, geometry, board, open, shot, view, advance, back } = p;
    await load('design=swing-coat&paper=riso-proof&step=0');
    result.registeredMittens = await page.getByLabel('Garment design').locator('option').evaluateAll(options => options.filter(o => /mitten/i.test(o.textContent)).map(o => ({ id: o.value, name: o.textContent })));
    assert.deepEqual(result.registeredMittens.map(m => m.id).sort(), ['mitten-left', 'mitten-right'], 'Both reviewed mitten directions must be registered');
    await open(); assert(await btn('Pin current piece').isDisabled()); await btn('Return to folding').click();
    // Click the actual control and observe motion in the same event turn.
    assert(await page.locator('.dock:not([hidden]) .btn-primary').evaluate(e => { e.click(); return paperCouture.controller.moving; }));
    await btn('Start over').click(); await settle(); assert.equal((await state()).step, 0);
    const count = await page.evaluate(() => paperCouture.controller.count);
    for (let step = 0; step < count; step++) {
      await page.evaluate(() => { if (!paperCouture.controller.beginScrub()) throw Error('Scrub rejected'); paperCouture.controller.scrubTo(.5); });
      if (step === 0 || step === count - 1) await shot(`motion-${step + 1}`, true);
      await page.evaluate(() => paperCouture.controller.endScrub(false)); await settle(); assert.equal((await state()).step, step);
      await advance();
    }
    for (let step = 0; step < count; step++) await back();
    for (let step = 0; step < count; step++) await advance();
    record(`${count} forward / ${count} Back / ${count} repeated forward real UI operations; every half-fold scrub cancelled; Start over during observed motion; unfinished pin disabled. Scrub uses the diagnostic controller, not a claimed touch gesture.`);

    for (const mitten of result.registeredMittens) {
      await load(`design=${mitten.id}&paper=dusk-wash&step=0`);
      assert(await page.locator('.dock:not([hidden]) .btn-primary').evaluate(e => { e.click(); return paperCouture.controller.moving; }));
      await btn('Start over').click(); await settle(); assert.equal((await state()).step, 0);
      const steps = await page.evaluate(() => paperCouture.controller.count);
      for (let step = 0; step < steps; step++) {
        await page.evaluate(() => { if (!paperCouture.controller.beginScrub()) throw Error('Mitten scrub rejected'); paperCouture.controller.scrubTo(.5); });
        await page.evaluate(() => paperCouture.controller.endScrub(false)); await settle();
        assert.equal((await state()).step, step); await advance();
      }
      for (let step = 0; step < steps; step++) await back();
      for (let step = 0; step < steps; step++) await advance();
      await btn('Display').click(); await settle(); await view('Front'); await shot(mitten.id + '-front');
      await view('Back'); await shot(mitten.id + '-back');
      record(`${mitten.name}: ${steps} real forward/Back/refold operations, each half-fold scrub cancelled, reset during observed motion, actual Front and Back renders. These UI checks do not certify continuous collision freedom or physical folding.`);
    }

    result.gallery = [];
    for (const design of designs) {
      await load(`design=${design}&paper=riso-proof&step=99&view=display`); const frozen = await geometry();
      for (const [id, name] of papers) {
        const radio = page.getByRole('radio', { name, exact: true }); await radio.click(); await settle();
        assert.equal((await state()).paper, id); assert.equal(await radio.getAttribute('aria-checked'), 'true');
        for (let q = 0; q < 4; q++) {
          while ((await state()).turn !== q) await page.getByRole('button', { name: /^Turn paper/ }).click();
          const matrices = await page.evaluate(() => [paperCouture.sheet.front.material.map.matrix.toArray(), paperCouture.sheet.back.material.map.matrix.toArray()]);
          for (const [u, v] of [[.13, .22], [.29, .87], [.75, .41]]) {
            const sample = m => [m[0] * u + m[3] * v + m[6], m[1] * u + m[4] * v + m[7]];
            const a = sample(matrices[0]), b = sample(matrices[1]);
            assert(Math.abs(a[0] + b[0] - 1) < 1e-12); assert(Math.abs(a[1] - b[1]) < 1e-12);
          }
          for (const side of ['Front', 'Back']) {
            await view(side); await shot(`${design}-${id}-${q}-${side.toLowerCase()}`, true);
            assert.equal(await geometry(), frozen, 'Paper/turn/camera changed material or posed geometry');
            result.gallery.push({ design, paper: id, turn: q, side: side.toLowerCase() });
          }
        }
      }
      console.log('Rendered all papers, turns and faces on ' + design);
    }
    assert.equal(result.gallery.length, 128);
    record('128 actual production renders: four registered papers × four turns × Front/Back × coat/shirt/skirt/brooch. Real picker selection and turns retain posed vertices, original UVs and final facets exactly; actual front/back sampling matrices remain paired.');

    // All four new papers and both separately folded mittens in one real board.
    // Five is the product limit: the skirt is exercised in the gallery above.
    const outfit = [['swing-coat', 'crease-bloom', 20, -.77, -.15, 0],
      ['camp-shirt', 'dusk-wash', 18, .76, .65, 0],
      ['framed-brooch', 'marbled-endpaper', 4.5, -.79, 1.28, 2],
      ['mitten-left', 'riso-proof', 6, .44, -.86, 0],
      ['mitten-right', 'riso-proof', 6, 1.04, -.86, 0]];
    result.outfit = [];
    for (const [design, paper, cm, x, y, q] of outfit) {
      await load(`design=${design}&paper=${paper}&turn=${q}&step=99&view=display`); await open();
      await page.getByLabel('Starting square size').selectOption(String(cm));
      const before = await board(); await btn('Pin current piece').click(); const current = await board();
      assert.deepEqual(current.items.slice(0, -1), before.items); const item = current.items.at(-1);
      assert.equal(item.paperSize.sideCm, cm);
      const live = await page.evaluate(() => ({ position: Array.from(paperCouture.sheet.front.geometry.attributes.position.array), uv: Array.from(paperCouture.sheet.front.geometry.attributes.uv.array) }));
      assert.deepEqual(item.snapshot.geometries[0].position, live.position); assert.deepEqual(item.snapshot.geometries[0].uv, live.uv);
      for (const material of item.snapshot.materials.filter(m => m.paper)) {
        assert.equal(material.paper.id, paper); assert.equal(material.paper.turns, q);
      }
      const m = item.snapshot.parts[0].matrix, scales = [0, 4, 8].map(i => Math.hypot(m[i], m[i + 1], m[i + 2]));
      assert(scales.every(scale => Math.abs(scale - cm / 20) < 1e-10), 'Starting square uniformly scales all axes');
      const dimensions = snapshotBounds(item.snapshot).size;
      result.outfit.push({ design, paper, turns: q, squareCm: cm, scaleTo20cm: scales[0], dimensions, normalizedDimensions: dimensions.map(v => v / (cm / 20)) });
      // Repeatable styling coordinates, separate from the real move/drag tests.
      await page.evaluate(({ x, y }) => { const b = paperCouture.pinboard; b.mutate(() => { const item = b.state.items.at(-1); item.x = x; item.y = y; b.position(); b.constrain(item.id); }); }, { x, y });
    }
    let finalBoard = await board(); assert.equal(finalBoard.items.length, 5); await checkCapacity(page);
    for (const item of finalBoard.items) {
      const bounds = snapshotBounds(item.snapshot);
      assert(bounds.min[0] + item.x >= -1.72001 && bounds.max[0] + item.x <= 1.72001);
      assert(bounds.min[1] + item.y >= -2.02001 && bounds.max[1] + item.y <= 2.02001);
    }
    await btn('Remove selected').click(); await btn('Undo').click(); assert.deepEqual(await board(), finalBoard);
    await page.getByLabel('Selected board piece').selectOption(finalBoard.items[0].id); finalBoard = await board();
    await btn('Move right').click(); assert.notDeepEqual(await board(), finalBoard); await btn('Undo').click(); assert.deepEqual(await board(), finalBoard);
    await page.locator('.board-tools').evaluate(e => e.scrollTop = 0); await shot('outfit-desktop');
    const initialPNG = await p.exportPNG('outfit-composite');
    await page.reload(); await settle(); await open(); assert.deepEqual(await board(), JSON.parse(JSON.stringify(finalBoard)));
    const reloadedPNG = await p.exportPNG('outfit-composite-reloaded'); assert.deepEqual(reloadedPNG, initialPNG, 'Reload must reproduce the same exported composite');
    result.export = { width: 1800, height: 2100, sha256: sha(initialPNG), reloadByteIdentical: true };
    fs.writeFileSync(path.join(out, 'outfit.json'), JSON.stringify(finalBoard));
    record('Five explicit captures retain exact posed geometry/UVs and paper recipes: 20cm coat, 18cm shirt, 4.5cm brooch, and both 6cm mitten squares. Scale matrices equal squareCm/20 uniformly; all pieces stay within board bounds. Five-slot cap, move/Undo, remove/Undo, complete reload and byte-identical 1800×2100 exports pass.');

    result.touch = [];
    for (const [width, height] of [[390, 844], [320, 568]]) {
      await page.setViewportSize({ width, height }); await page.locator('.board-tools').evaluate(e => e.scrollTop = 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      const rect = await page.locator('.pinboard-canvas').boundingBox(); const item = (await board()).items[0];
      const x = rect.x + (item.x / 3.6 + .5) * rect.width, y = rect.y + (.5 - item.y / 4.2) * rect.height;
      const cdp = await p.context.newCDPSession(page);
      const durable = await page.evaluate(k => ({ raw: localStorage.getItem(k), history: paperCouture.pinboard.history.length }), key);
      const saved = await board();
      for (const commit of [false, true]) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 18, y: y + 9 }] });
        await page.waitForFunction(() => paperCouture.pinboard.drag?.moved);
        assert.notDeepEqual((await board()).items, saved.items);
        await cdp.send('Input.dispatchTouchEvent', { type: commit ? 'touchEnd' : 'touchCancel', touchPoints: [] });
        await page.waitForFunction(() => !paperCouture.pinboard.drag);
        if (commit) await btn('Undo').click();
        assert.deepEqual((await board()).items, saved.items);
      }
      assert.deepEqual(await page.evaluate(k => ({ raw: localStorage.getItem(k), history: paperCouture.pinboard.history.length }), key), durable);
      await page.locator('.board-tools').evaluate(e => e.scrollTop = 0); await shot('outfit-touch-' + width); await cdp.detach();
      await btn('Return to piece').click(); await settle();
      for (const [id, name] of papers) { await page.getByRole('radio', { name, exact: true }).click(); assert.equal((await state()).paper, id); }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width); await shot('picker-touch-' + width);
      await open(); assert.deepEqual((await board()).items, saved.items); result.touch.push({ width, height, dragCancelUndo: true, picker: true, horizontalOverflow: false });
    }
    record('390×844 and 320×568 touch emulation: canvas drag/cancel restores original positions without a save/history change; committed drag/Undo restores them; all four registered swatches work and no page overflows. Real phone/Safari remains untested.');
    await p.context.close();

    const legacy = active = await make(390, 844);
    const raw = fs.readFileSync(path.join(__dirname, '../docs/board-space/fixtures/longline-long.json'), 'utf8');
    await legacy.context.addInitScript(({ key, raw }) => { if (localStorage.getItem(key) === null) localStorage.setItem(key, raw); }, { key, raw });
    await legacy.load('design=framed-brooch&paper=dusk-wash&step=99&view=display'); await legacy.open();
    assert.deepEqual(await legacy.board(), JSON.parse(raw)); assert.equal(await legacy.page.evaluate(k => localStorage.getItem(k), key), raw);
    await legacy.btn('Pin current piece').click(); const mixed = await legacy.board(); assert.deepEqual(mixed.items.slice(0, -1), JSON.parse(raw).items);
    await legacy.page.reload(); await legacy.settle(); await legacy.open(); assert.deepEqual(await legacy.board(), JSON.parse(JSON.stringify(mixed)));
    await legacy.exportPNG('legacy-plus-dusk-brooch'); await legacy.context.close();
    record('Published v1 fixture keeps its exact original durable bytes on read; adding the new paper preserves all legacy geometry/material/matrix data, and the mixed board reloads and exports.');
    assert.deepEqual(result.sourceRequests, [], 'Run this integration test on a production preview, not Vite dev');
    assert(result.assets.some(asset => asset.endsWith('.js'))); assert.deepEqual(result.errors, []); result.passed = true;
  } catch (error) { result.failure = String(error); if (active) await active.shot('failure').catch(() => {}); throw error; }
  finally { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify({ passed: result.passed, checks: result.checks, failure: result.failure, errors: result.errors }, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
