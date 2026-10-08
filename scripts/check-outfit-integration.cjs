// Fresh browser contexts only: actual compositions, compatibility and controls.
// No user profiles or existing browser storage are opened or cleared.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://127.0.0.1:5201';
const before = process.env.BASELINE_URL;
const out = process.env.CAPTURE_DIR || '.outfit-qa';
const key = 'paper-couture.pinboard.v1';
const fixture = fs.readFileSync(path.join(__dirname, '../docs/outfit-collection/fixtures/pr23-proportions.json'), 'utf8');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const report = { base, before, baselineHead: 'feb9cc80f5ca0da7ef2e49619665458c2f923c5a', physicalPhoneTested: false,
    checks: [], measurements: [], errors: [] };
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', hasTouch: true, acceptDownloads: true });
  const page = await context.newPage(); page.setDefaultTimeout(60000);
  page.on('pageerror', e => report.errors.push(String(e)));
  const btn = name => page.getByRole('button', { name, exact: true });
  const settle = () => page.waitForFunction(() => window.paperCouture && !paperCouture.controller.moving
    && paperCouture.view.t === paperCouture.view.target && !paperCouture.displayCam.glide);
  const load = async query => { const response = await page.goto(base + '/?' + query); assert(response.ok()); await settle(); };
  const open = () => page.getByRole('button', { name: /^View board/ }).click();
  const state = () => page.evaluate(() => structuredClone(paperCouture.pinboard.state));
  const shot = async name => { await page.locator('.board-tools').evaluate(e => e.scrollTop = 0); await page.screenshot({ path: path.join(out, name + '.png') }); };
  const nudge = async (name, count) => { await btn(name).evaluate((e, count) => { for (let n = 0; n < count; n++) e.click(); }, count); };
  const moveTo = async (x, y) => { await btn('Reset selected').click(); await nudge(x < 0 ? 'Move left' : 'Move right', Math.round(Math.abs(x) / .08)); await nudge(y < 0 ? 'Move down' : 'Move up', Math.round(Math.abs(y) / .08)); };
  const exportPNG = async name => {
    const expected = await page.evaluate(() => { const b = paperCouture.pinboard; b.selection.visible = false; b.renderer.setSize(1800, 2100, false); b.renderer.render(b.scene, b.camera); return b.canvas.toDataURL('image/png'); });
    const [download] = await Promise.all([page.waitForEvent('download'), btn('Save PNG').click()]);
    const filename = path.join(out, name + '.png'); await download.saveAs(filename); const bytes = fs.readFileSync(filename);
    assert.equal(bytes.readUInt32BE(16), 1800); assert.equal(bytes.readUInt32BE(20), 2100);
    assert.deepEqual(bytes, Buffer.from(expected.split(',')[1], 'base64'), 'Export must equal the rendered scene without selection');
    return bytes;
  };
  const metrics = () => page.evaluate(async () => {
    const T = await import('/node_modules/.vite/deps/three.js'), b = paperCouture.pinboard, r = b.canvas.getBoundingClientRect(), d = b.dialog.getBoundingClientRect();
    return { viewport: [innerWidth, innerHeight], canvas: [r.width, r.height], camera: [b.camera.left, b.camera.right, b.camera.bottom, b.camera.top],
      contained: r.left >= d.left && r.right <= d.right && r.top >= d.top && r.bottom <= d.bottom,
      overflow: document.documentElement.scrollWidth > innerWidth, toolHeight: document.querySelector('.board-tools').clientHeight,
      pieces: b.state.items.map(i => { const box = new T.Box3().setFromObject(b.groups.get(i.id), true); return { title: i.title, paperSize: i.paperSize,
        bounds: [box.min.x, box.max.x, box.min.y, box.max.y], size: [box.max.x - box.min.x, box.max.y - box.min.y], pixels: [(box.max.x - box.min.x) * r.width / 3.6, (box.max.y - box.min.y) * r.height / 4.2] }; }),
      saveCharacters: localStorage.getItem('paper-couture.pinboard.v1')?.length, memory: { ...b.renderer.info.memory } };
  });
  const assertBoard = m => {
    assert(!m.overflow); assert(m.contained); assert(m.toolHeight >= 144);
    assert.deepEqual(m.camera, [-1.8, 1.8, -2.1, 2.1]);
    assert(Math.abs(m.canvas[0] / m.canvas[1] - 3.6 / 4.2) < .005);
    for (const p of m.pieces) { const [l, r, b, t] = p.bounds; assert(l >= -1.72001 && r <= 1.72001 && b >= -2.02001 && t <= 2.02001, 'Actual paper remains inside the board margin'); }
    assert(m.saveCharacters < 2_000_000);
  };
  const clearByRemoval = async () => { while ((await state()).items.length) await btn('Remove selected').click(); };
  try {
    // Frozen legacy captures are the authority for old boards; metadata/defaults must not reinterpret them.
    await context.addInitScript(({ key, fixture }) => { if (localStorage.getItem(key) === null) localStorage.setItem(key, fixture); }, { key, fixture });
    await load(''); await open(); assert.deepEqual(await state(), JSON.parse(fixture));
    assert.equal(await page.evaluate(k => localStorage.getItem(k), key), fixture);
    const legacyPNG = await exportPNG('legacy-preserved');
    assert(await page.getByLabel('Starting square size').isDisabled(), 'Export must keep an unfinished source disabled');
    await page.evaluate(() => { window.outfitOriginalBlob = HTMLCanvasElement.prototype.toBlob; HTMLCanvasElement.prototype.toBlob = function(callback) { callback(null); }; });
    await btn('Save PNG').click(); await page.waitForFunction(() => !paperCouture.pinboard.exporting);
    assert(await page.getByLabel('Starting square size').isDisabled(), 'Failed export must also restore the disabled size state');
    await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = window.outfitOriginalBlob; });
    assert.equal(await page.evaluate(k => localStorage.getItem(k), key), fixture);
    if (before) {
      const oldContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', acceptDownloads: true });
      await oldContext.addInitScript(({ key, fixture }) => localStorage.setItem(key, fixture), { key, fixture });
      const oldPage = await oldContext.newPage(); await oldPage.goto(before); await oldPage.waitForFunction(() => window.paperCouture);
      await oldPage.getByRole('button', { name: /^View board/ }).click();
      const oldPNG = await oldPage.evaluate(() => { const b = paperCouture.pinboard; b.selection.visible = false; b.renderer.setSize(1800, 2100, false); b.renderer.render(b.scene, b.camera); return b.canvas.toDataURL('image/png'); });
      assert.deepEqual(legacyPNG, Buffer.from(oldPNG.split(',')[1], 'base64'), 'Old captures render pixel-identically to PR23');
      await oldContext.close();
    }
    const legacy = await state(); await btn('Remove selected').click(); await btn('Undo').click(); assert.deepEqual(await state(), legacy);
    await page.reload(); await settle(); await open(); assert.deepEqual(await state(), legacy);
    report.checks.push('Published four-piece board loads without rewriting storage, retains exact snapshots/positions/papers, and survives remove/Undo/reload; optional PR23 comparison is pixel-identical.');
    await btn('Return to folding').click(); await load('design=clutch&paper=plum-scatter&step=99&view=display'); await open(); await btn('Pin current piece').click();
    const mixedLegacy = await state(); assert.equal(mixedLegacy.items.length, 5); assert.deepEqual(mixedLegacy.items.slice(0, 4), legacy.items); assert.equal(mixedLegacy.items[4].paperSize.sideCm, 8);
    await page.reload(); await settle(); await open(); assert.deepEqual(await state(), JSON.parse(JSON.stringify(mixedLegacy)));
    report.checks.push('A fifth, explicitly sized new capture saves and reloads beside four untouched legacy captures.');
    await clearByRemoval();

    // Same legacy designs, newly captured at explicit suggested starting-square sizes.
    for (const [id, paper, x, y] of [['jacket', 'corner-bloom', -.72, .96], ['skirt', 'plum-scatter', -.64, -.8], ['apron', 'running-stitch', .96, .32], ['clutch', 'seed-dashes', 1.12, -1.36]]) {
      await btn('Return to folding').click(); await load(`design=${id}&paper=${paper}&step=99&view=display`); await open(); await btn('Pin current piece').click(); await moveTo(x, y);
    }
    const dimensions = await metrics(); assertBoard(dimensions);
    assert(dimensions.pieces[3].size[0] / dimensions.pieces[1].size[0] < .4, 'Clutch reads as a hand accessory');
    assert(dimensions.pieces[2].size[0] < dimensions.pieces[1].size[0], 'Apron fits the outfit scale');
    report.measurements.push({ name: 'corrected-existing-designs', ...dimensions });
    await exportPNG('proportions-after');
    for (const [width, height] of [[1280, 900], [390, 844], [320, 568]]) { await page.setViewportSize({ width, height }); await shot(`proportions-${width}`); const m = await metrics(); assertBoard(m); report.measurements.push({ name: 'corrected-portrait', ...m }); }
    report.checks.push('New clutch is under40% of skirt width and apron narrower than skirt; actual four-piece board fits desktop/390/320 without shrinking the board camera.');
    await page.setViewportSize({ width: 1280, height: 900 }); await clearByRemoval();
    // Each accepted new construction is completed through its actual controls.
    for (const [id, paper] of [['boat-top', 'ginkgo-pairs'], ['wrap-top', 'slate-grain'], ['hat', 'oat-linen']]) {
      await btn('Return to folding').click(); await load(`design=${id}&paper=${paper}`);
      assert.equal(await page.getByLabel('Garment design').inputValue(), id);
      assert.match(await page.locator('.studio-note').innerText(), /One square/);
      const count = await page.evaluate(() => paperCouture.timeline.ops.length);
      const fold = async () => { const step = await page.evaluate(() => paperCouture.controller.step); await page.locator('.dock:not(.display-dock) .btn-primary').click(); if (await page.evaluate(() => paperCouture.controller.moving)) await page.locator('.dock:not(.display-dock) .btn-primary').click(); await settle(); assert.equal(await page.evaluate(() => paperCouture.controller.step), step + 1); };
      while (!await page.evaluate(() => paperCouture.controller.finished)) await fold();
      assert.equal(await page.evaluate(() => paperCouture.controller.step), count);
      await btn('Back').click(); if (await page.evaluate(() => paperCouture.controller.moving)) await btn('Back').click(); await settle();
      assert.equal(await page.evaluate(() => paperCouture.controller.step), count - 1); await fold();
      await btn('Display').click(); await settle();
      for (const view of ['Front', 'Back']) { await btn(view).click(); await settle(); await page.screenshot({ path: path.join(out, `${id}-${view.toLowerCase()}.png`) }); }
      if (id === 'boat-top') {
        await btn('Position print').click(); await btn('Right').click(); await btn('Up').click(); await btn('Done').click();
        assert.deepEqual(await page.evaluate(() => paperCouture.printPosition), { x: 1 / 32, y: 1 / 32 });
      }
      await open(); await btn('Pin current piece').click();
      const captured = (await state()).items.at(-1);
      const live = await page.evaluate(() => ({ position: Array.from(paperCouture.sheet.front.geometry.attributes.position.array), uv: Array.from(paperCouture.sheet.front.geometry.attributes.uv.array) }));
      assert.deepEqual(captured.snapshot.geometries[0].position, live.position); assert.deepEqual(captured.snapshot.geometries[0].uv, live.uv);
      assert.equal(captured.paperSize.sideCm, id === 'boat-top' ? 16 : id === 'wrap-top' ? 18 : 8);
      if (id === 'boat-top') assert(captured.snapshot.materials.filter(m => m.paper).every(m => m.paper.position.x === 1 / 32 && m.paper.position.y === 1 / 32));
    }
    report.checks.push('Boat-neck top, Cross-wrap top and Folded hat: actual Fold/Back/Display controls, front/back renders, explicit experimental labels and starting-square sizes; shifted Ginkgo recipe and exact posed vertices/UVs captured.');
    await clearByRemoval();

    const outfit = [
      ['boat-top', 'ginkgo-pairs', -.64, .64], ['pleats', 'slate-grain', -.64, -.8],
      ['jacket', 'oat-linen', .88, .48], ['hat', 'slate-grain', -.64, 1.44], ['clutch', 'ginkgo-pairs', .88, -1.12],
    ];
    for (const [id, paper, x, y] of outfit) {
      await btn('Return to folding').click(); await load(`design=${id}&paper=${paper}&printX=.0625&printY=.0625&turn=${id === 'clutch' ? 1 : 0}&step=99&view=display`);
      await open(); const previous = await state(); await btn('Pin current piece').click();
      assert.deepEqual((await state()).items.slice(0, -1), previous.items); await moveTo(x, y);
    }
    assert.equal((await state()).items.length, 5); assert(await btn('Board full · five pieces').isDisabled());
    const full = await state(); const m = await metrics(); assertBoard(m); report.measurements.push({ name: 'five-piece-outfit', ...m });
    await exportPNG('five-piece-outfit');
    const durable = await page.evaluate(k => localStorage.getItem(k), key);
    fs.writeFileSync(path.join(out, 'five-piece-outfit.json'), durable);
    for (const [width, height] of [[1280, 900], [390, 844], [320, 568], [844, 390]]) {
      await page.setViewportSize({ width, height }); await shot(`five-piece-${width}`); const measured = await metrics(); assertBoard(measured); report.measurements.push({ name: 'five-piece-viewport', ...measured });
      // Every piece is reachable through the explicit selection control at phone sizes.
      for (const item of full.items) { await page.getByLabel('Selected board piece').selectOption(item.id); assert.equal((await state()).selected, item.id); }
      if (width === 390 || width === 320) {
        // Target the small clutch's central paper surface; cancel must restore all positions.
        await page.locator('.board-tools').evaluate(e => e.scrollTop = 0);
        const r = await page.locator('.pinboard-canvas').boundingBox(), clutch = (await state()).items.at(-1);
        const x = r.x + r.width * (.5 + clutch.x / 3.6), y = r.y + r.height * (.5 - clutch.y / 4.2);
        const cdp = await context.newCDPSession(page), initial = await state();
        const durableBefore = await page.evaluate(() => ({ saved: localStorage.getItem('paper-couture.pinboard.v1'), history: paperCouture.pinboard.history.length }));
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 18, y: y - 12 }] });
        await page.waitForFunction(() => paperCouture.pinboard.drag?.moved);
        assert.notDeepEqual((await state()).items, initial.items);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
        await page.waitForFunction(() => !paperCouture.pinboard.drag);
        assert.deepEqual((await state()).items, initial.items);
        assert.deepEqual(await page.evaluate(() => ({ saved: localStorage.getItem('paper-couture.pinboard.v1'), history: paperCouture.pinboard.history.length })), durableBefore);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 18, y: y - 12 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForFunction(() => !paperCouture.pinboard.drag);
        assert.notDeepEqual((await state()).items, initial.items); await btn('Undo').click(); assert.deepEqual((await state()).items, initial.items);
        await cdp.detach();
      }
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    const beforeLayer = await state(); await btn('Send backward').click(); assert.equal((await state()).items[3].id, beforeLayer.items[4].id); await btn('Undo').click(); assert.deepEqual(await state(), beforeLayer);
    const memory = [];
    for (let n = 0; n < 5; n++) { await btn('Remove selected').click(); assert.equal((await state()).items.length, 4); await btn('Undo').click(); assert.deepEqual(await state(), beforeLayer); memory.push((await metrics()).memory); }
    assert.deepEqual(memory.slice(1), Array(4).fill(memory[1])); report.memory = memory;
    await page.getByLabel('Pinboard tilt').fill('12'); await nudge('Move right', 40); await nudge('Move down', 40); assertBoard(await metrics());
    await btn('Undo').click(); // A complete nudge history is deliberately bounded to20; restore with actual Reset/move controls below.
    await moveTo(.88, -1.12); const retained = await state();
    await page.reload(); await settle(); await open(); assert.deepEqual(await state(), JSON.parse(JSON.stringify(retained)));
    await exportPNG('five-piece-reloaded');
    report.checks.push('Five real independent captures compose a top/skirt/jacket/hat/clutch outfit.390/320/landscape selection, small-clutch touch cancel/commit/Undo, repeated bounds moves, layer/removeUndo/reload and exact PNG pass; GPU counts stay stable.');

    // Substitute the second new top without changing the other four captures.
    const oldTop = (await state()).items[0]; await page.getByLabel('Selected board piece').selectOption(oldTop.id); await btn('Remove selected').click();
    const companions = (await state()).items; await btn('Return to folding').click(); await load('design=wrap-top&paper=oat-linen&step=99&view=display');
    await open(); await btn('Pin current piece').click(); await moveTo(-.64, .64);
    assert.deepEqual((await state()).items.slice(0, 4), companions); assertBoard(await metrics()); await exportPNG('cross-wrap-outfit');
    report.checks.push('Cross-wrap top substitutes into the same outfit while the other four frozen captures remain exact.');
    assert.deepEqual(report.errors, []); report.passed = true;
  } catch (error) { report.failure = String(error); await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {}); throw error; }
  finally { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
