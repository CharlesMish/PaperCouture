// Companion collection regression against a separately served frozen PR24 build.
// Fresh, sequential browser contexts only; never a user's profile or storage.
// Uses the running app's diagnostic objects and real controls, with no source imports.
// BASE_URL / BASELINE_URL must serve compiled builds unless REQUIRE_PRODUCTION=0.
process.env.DEBUG = [process.env.DEBUG, 'pw:browser'].filter(Boolean).join(',');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const base = (process.env.BASE_URL || 'http://127.0.0.1:4301').replace(/\/$/, '') + '/';
const baseline = (process.env.BASELINE_URL || 'http://127.0.0.1:4201').replace(/\/$/, '') + '/';
const out = process.env.CAPTURE_DIR || '.companion-browser-qa';
const key = 'paper-couture.pinboard.v1';
const fixturePath = process.env.LEGACY_FIXTURE || path.join(__dirname, '../docs/companion-studies/fixtures/pr24-five-piece.json');
const fixture = fs.readFileSync(fixturePath, 'utf8');
const requiredIds = (process.env.NEW_DESIGN_IDS || 'capelet,boot-left,boot-right,framed-brooch').split(',').filter(Boolean);
const paperId = process.env.NEW_PAPER_ID || 'plum-seed', paperName = process.env.NEW_PAPER_NAME || 'Plum seed';
const capeletCm = Number(process.env.CAPELET_CM || 18);
const production = process.env.REQUIRE_PRODUCTION !== '0';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
fs.mkdirSync(out, { recursive: true });

async function bundle(url) {
  const response = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
  assert.equal(response.status, 200, `Build must be served at ${url}`);
  const html = await response.text(), compiled = !html.includes('/@vite/client') && !html.includes('/src/main.ts');
  if (production) assert(compiled, `Expected compiled build at ${url}`);
  const assets = [];
  for (const match of html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)) {
    const asset = new URL(match[1], url); assert.equal(asset.origin, new URL(url).origin);
    const r = await fetch(asset, { headers: { 'Cache-Control': 'no-cache' } }); assert.equal(r.status, 200);
    const bytes = Buffer.from(await r.arrayBuffer()); assets.push({ path: asset.pathname, bytes: bytes.length, sha256: sha(bytes) });
  }
  if (compiled) assert(assets.some(a => a.path.endsWith('.js')) && assets.some(a => a.path.endsWith('.css')));
  return { htmlSha256: sha(html), compiled, assets };
}

(async () => {
  const report = { base, baseline, baselineHead: '574b2b10cc2894586f2ee3f8c9496035365e6408', checkedAt: new Date().toISOString(),
    fixtureSha256: sha(fixture), physicalPhoneTested: false, renderer: 'Chromium software WebGL / SwiftShader', checks: [], folds: [], measurements: [], exports: [], errors: [], failedResources: [], sourceRequests: [] };
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  let currentPage;

  // Closing each context before opening the next avoids simultaneous app renderers
  // and makes candidate/baseline pixel comparisons use the same browser serially.
  async function visit(url, seed, work) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', hasTouch: true, acceptDownloads: true });
    await context.tracing.start({ screenshots: false, snapshots: false, sources: false });
    let traceStopped = false;
    const pendingRequests = new Map(), lifecycle = [], consoleMessages = [], failedRequests = [], responses = [], completedRequests = [];
    context.setDefaultNavigationTimeout(90000);
    if (seed !== undefined) await context.addInitScript(({ key, seed }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, seed);
    }, { key, seed });
    const page = currentPage = await context.newPage(); page.setDefaultTimeout(60000); page.setDefaultNavigationTimeout(90000);
    page.on('request', r => pendingRequests.set(r, { url: r.url(), type: r.resourceType(), started: Date.now() }));
    page.on('requestfinished', r => { completedRequests.push({ url: r.url(), type: r.resourceType(), timing: r.timing(), time: Date.now() }); pendingRequests.delete(r); });
    page.on('response', r => responses.push({ url: r.url(), status: r.status(), type: r.request().resourceType(), timing: r.request().timing(), time: Date.now() }));
    page.on('requestfailed', r => { failedRequests.push({ url: r.url(), error: r.failure() }); pendingRequests.delete(r); });
    page.on('console', m => { if (['warning', 'error'].includes(m.type())) { consoleMessages.push({ type: m.type(), text: m.text().slice(0, 2000) }); if (consoleMessages.length > 50) consoleMessages.shift(); } });
    for (const event of ['domcontentloaded', 'load', 'crash']) page.on(event, () => lifecycle.push({ event, url: page.url(), time: Date.now() }));
    page.on('framenavigated', f => { if (f === page.mainFrame()) lifecycle.push({ event: 'navigated', url: f.url(), time: Date.now() }); });
    page.on('pageerror', e => report.errors.push({ base: url, error: String(e) }));
    page.on('response', r => { if (r.status() >= 400 && ['document', 'script', 'stylesheet'].includes(r.request().resourceType())) report.failedResources.push({ url: r.url(), status: r.status() }); });
    page.on('request', r => { if (/\/(src|node_modules|@vite)\//.test(new URL(r.url()).pathname)) report.sourceRequests.push(r.url()); });
    const btn = name => page.getByRole('button', { name, exact: true });
    const settle = () => page.waitForFunction(() => window.paperCouture && !paperCouture.controller.moving && paperCouture.view.t === paperCouture.view.target && !paperCouture.displayCam.glide && paperCouture.sheet.front.geometry.attributes.position?.count > 0 && paperCouture.sheet.front.geometry.attributes.uv?.count > 0);
    const load = async query => { const r = await page.goto(url + '?' + query); assert(r.ok()); await settle(); };
    const open = () => page.getByRole('button', { name: /^View board/ }).click();
    const state = () => page.evaluate(() => JSON.parse(JSON.stringify(paperCouture.pinboard.state)));
    const raw = () => page.evaluate(k => localStorage.getItem(k), key);
    // Exercise each move as a browser input action, allowing normal frame/input
    // processing between presses instead of a synchronous burst of 40 renders.
    const nudge = async (name, count) => { for (let n = 0; n < count; n++) await btn(name).click(); };
    const moveTo = async (x, y) => { await btn('Reset selected').click(); await nudge(x < 0 ? 'Move left' : 'Move right', Math.round(Math.abs(x) / .08)); await nudge(y < 0 ? 'Move down' : 'Move up', Math.round(Math.abs(y) / .08)); };
    const fold = async () => {
      const previous = await page.evaluate(() => paperCouture.controller.step);
      await page.locator('.dock:not(.display-dock) .btn-primary').click();
      if (await page.evaluate(() => paperCouture.controller.moving)) await page.locator('.dock:not(.display-dock) .btn-primary').click();
      await settle(); assert.equal(await page.evaluate(() => paperCouture.controller.step), previous + 1);
    };
    const finish = async () => { let n = 0; while (!await page.evaluate(() => paperCouture.controller.finished)) { assert(n++ < 32, 'Bounded authored sequence'); await fold(); } return n; };
    const display = async () => { if (await btn('Display').isVisible()) await btn('Display').click(); await settle(); };
    const positionPrint = async () => {
      const before = await page.evaluate(() => ({ turns: paperCouture.quarterTurns, step: paperCouture.controller.step }));
      await page.getByRole('button', { name: /^Turn paper \(now/ }).click();
      await btn('Position print').click(); await btn('Right').click(); await btn('Up').click(); await btn('Done').click();
      const recipe = await page.evaluate(() => ({ id: paperCouture.paperId, turns: paperCouture.quarterTurns, position: paperCouture.printPosition, step: paperCouture.controller.step }));
      assert.equal(recipe.turns, (before.turns + 1) % 4); assert.equal(recipe.step, before.step);
      assert.deepEqual(recipe.position, { x: 1 / 32, y: 1 / 32 }); return recipe;
    };
    const capture = async (cm, recipe) => {
      const live = await page.evaluate(() => JSON.parse(JSON.stringify({ position: Array.from(paperCouture.sheet.front.geometry.attributes.position.array), uv: Array.from(paperCouture.sheet.front.geometry.attributes.uv.array) })));
      await open(); const previous = await state(); await page.getByLabel('Starting square size').selectOption(String(cm)); await btn('Pin current piece').click();
      const next = await state(), piece = next.items.at(-1);
      assert.equal(next.items.length, previous.items.length + 1); assert.deepEqual(next.items.slice(0, -1), previous.items);
      assert.equal(piece.paperSize.sideCm, cm); assert.deepEqual(piece.snapshot.geometries[0].position, live.position); assert.deepEqual(piece.snapshot.geometries[0].uv, live.uv);
      if (recipe) {
        const surfaces = piece.snapshot.materials.filter(m => m.paper); assert(surfaces.length >= 2);
        assert(surfaces.some(m => m.paper.side === 'front') && surfaces.some(m => m.paper.side === 'back'));
        for (const m of surfaces) { assert.equal(m.paper.id, recipe.id); assert.equal(m.paper.turns, recipe.turns); assert.deepEqual(m.paper.position, recipe.position); }
      }
      return piece;
    };
    const shot = async name => { if (await page.locator('.pinboard-dialog').evaluate(e => e.open)) await page.locator('.board-tools').evaluate(e => { e.scrollTop = 0; }); await page.screenshot({ path: path.join(out, name + '.png') }); };
    const exportPNG = async name => {
      const expected = await page.evaluate(() => { const b = paperCouture.pinboard; b.selection.visible = false; b.renderer.setSize(1800, 2100, false); b.renderer.render(b.scene, b.camera); return b.canvas.toDataURL('image/png'); });
      const [download] = await Promise.all([page.waitForEvent('download'), btn('Save PNG').click()]);
      const file = path.join(out, name + '.png'); await download.saveAs(file); const bytes = fs.readFileSync(file);
      assert.equal(bytes.readUInt32BE(16), 1800); assert.equal(bytes.readUInt32BE(20), 2100);
      assert.deepEqual(bytes, Buffer.from(expected.split(',')[1], 'base64'), 'PNG must equal the actual scene without selection');
      await page.waitForFunction(() => !paperCouture.pinboard.exporting);
      report.exports.push({ file: path.basename(file), bytes: bytes.length, sha256: sha(bytes), dimensions: [1800, 2100], matchesScene: true }); return bytes;
    };
    const metrics = () => page.evaluate(() => {
      const b = paperCouture.pinboard, r = b.canvas.getBoundingClientRect(), d = b.dialog.getBoundingClientRect(), tools = document.querySelector('.board-tools').getBoundingClientRect(), size = document.querySelector('[aria-label="Starting square size"]').getBoundingClientRect();
      return { viewport: [innerWidth, innerHeight], canvas: [r.width, r.height], camera: [b.camera.left, b.camera.right, b.camera.bottom, b.camera.top],
        contained: r.left >= d.left && r.right <= d.right && r.top >= d.top && r.bottom <= d.bottom,
        overflow: document.documentElement.scrollWidth > innerWidth, toolHeight: tools.height, sizeControl: { height: size.height, initiallyVisible: size.top >= tools.top && size.bottom <= tools.bottom + 1 },
        pieces: b.state.items.map(i => { const box = b.selection.box.clone().setFromObject(b.groups.get(i.id), true); return { id: i.id, title: i.title, paperSize: i.paperSize,
          bounds: [box.min.x, box.max.x, box.min.y, box.max.y], size: [box.max.x - box.min.x, box.max.y - box.min.y], pixels: [(box.max.x - box.min.x) * r.width / 3.6, (box.max.y - box.min.y) * r.height / 4.2] }; }),
        saveCharacters: localStorage.getItem('paper-couture.pinboard.v1')?.length, memory: { ...b.renderer.info.memory } };
    });
    try { return await work({ page, context, btn, settle, load, open, state, raw, nudge, moveTo, fold, finish, display, positionPrint, capture, shot, exportPNG, metrics }); }
    catch (error) {
      report.navigationDiagnostics = { url: page.url(), pendingRequests: [...pendingRequests.values()].map(r => ({ ...r, elapsedMs: Date.now() - r.started })), failedRequests, consoleMessages, lifecycle, responses, completedRequests };
      await context.tracing.stop({ path: path.join(out, 'failure-trace.zip') }).catch(e => { report.traceFailure = String(e); }); traceStopped = true;
      await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {}); throw error;
    }
    finally { if (!traceStopped) await context.tracing.stop().catch(e => { report.traceFailure = String(e); }); await context.close(); currentPage = undefined; }
  }
  const assertBoard = m => {
    assert(!m.overflow); assert(m.contained); assert(m.toolHeight >= 144);
    assert.deepEqual(m.camera, [-1.8, 1.8, -2.1, 2.1]); assert(Math.abs(m.canvas[0] / m.canvas[1] - 3.6 / 4.2) < .005);
    for (const p of m.pieces) { const [l, r, b, t] = p.bounds; assert(l >= -1.72001 && r <= 1.72001 && b >= -2.02001 && t <= 2.02001, `Actual paper inside board margin: ${p.title}`); }
    assert(m.saveCharacters > 0 && m.saveCharacters <= 2_000_000);
  };
  try {
    report.candidateBundle = await bundle(base); report.baselineBundle = await bundle(baseline);
    let accentId, accentCm, legacyPNG, oldPaperSave, oldPaperPNG, newPaperSave;
    await visit(baseline, fixture, async a => {
      await a.load(''); await a.open(); assert.deepEqual(await a.state(), JSON.parse(fixture)); assert.equal(await a.raw(), fixture);
      legacyPNG = await a.exportPNG('pr24-legacy');
    });
    await visit(base, fixture, async a => {
      await a.load(''); await a.open(); assert.deepEqual(await a.state(), JSON.parse(fixture)); assert.equal(await a.raw(), fixture);
      assert.deepEqual(await a.exportPNG('candidate-legacy'), legacyPNG, 'Frozen PR24 board must render pixel-identically');
      assert(await a.page.getByLabel('Starting square size').isDisabled());
      const saved = await a.state(); await a.btn('Remove selected').click(); await a.btn('Undo').click(); assert.deepEqual(await a.state(), saved);
      const durable = await a.raw(); await a.page.reload(); await a.settle(); await a.open(); assert.deepEqual(await a.state(), saved); assert.equal(await a.raw(), durable);
      await a.btn('Return to folding').click();
      const ids = await a.page.getByLabel('Garment design').locator('option').evaluateAll(xs => xs.map(x => x.value));
      for (const id of requiredIds) assert(ids.includes(id), `New design registered: ${id}`);
      accentId = process.env.ACCENT_ID || 'framed-brooch'; assert(ids.includes(accentId), `Composition accent registered: ${accentId}`);
      accentCm = Number(process.env.ACCENT_CM || (accentId === 'framed-brooch' ? 4.5 : 8)); report.accent = { id: accentId, cm: accentCm };
      assert.equal(await a.page.getByRole('radio', { name: paperName, exact: true }).count(), 1);
    });
    report.checks.push('Frozen PR24 five-piece fixture loads byte-exact without initial write, renders identical PNG, and survives remove/Undo/reload without reinterpretation.');

    // New garment IDs never enter the saved schema. Prove old paper + new frozen
    // shapes can be opened by PR24; the recipes, geometry and matrices are exact.
    await visit(base, undefined, async a => {
      const ids = [...new Set([...requiredIds, ...(accentId === 'clutch' ? [] : [accentId])])];
      assert(ids.length <= 5, 'New-design test captures must respect the real five-piece cap');
      for (const [index, id] of ids.entries()) {
        await a.load(`design=${id}&paper=${index % 2 ? 'plum-scatter' : 'corner-bloom'}&step=0&view=workshop`);
        assert.equal(await a.page.getByLabel('Garment design').inputValue(), id); assert.match(await a.page.locator('.studio-note').innerText(), /(One square|Small intact square)/);
        const option = a.page.getByLabel('Garment design').locator(`option[value="${id}"]`); assert.equal(await option.evaluate(e => e.parentElement.tagName), 'SELECT');
        const recipe = await a.positionPrint(), count = await a.page.evaluate(() => paperCouture.timeline.ops.length);
        const folds = await a.finish(); assert.equal(folds, count);
        await a.btn('Back').click(); if (await a.page.evaluate(() => paperCouture.controller.moving)) await a.btn('Back').click(); await a.settle();
        assert.equal(await a.page.evaluate(() => paperCouture.controller.step), count - 1); await a.fold(); await a.display();
        for (const view of ['Front', 'Back']) { await a.btn(view).click(); await a.settle(); await a.shot(`${id}-${view.toLowerCase()}`); }
        await a.btn('Front').click(); await a.settle();
        const cm = id === 'capelet' ? capeletCm : id === accentId ? accentCm : 8;
        await a.capture(cm, recipe); await a.moveTo(index % 2 ? .8 : -.8, index < 2 ? .8 : -.8);
        report.folds.push({ id, count, backAndRefold: true, cm, recipe });
      }
      oldPaperSave = await a.raw(); oldPaperPNG = await a.exportPNG('new-shapes-old-papers');
      fs.writeFileSync(path.join(out, 'new-shapes-old-papers.json'), oldPaperSave);
    });
    await visit(baseline, oldPaperSave, async a => {
      await a.load(''); await a.open(); assert.deepEqual(await a.state(), JSON.parse(oldPaperSave)); assert.equal(await a.raw(), oldPaperSave);
      assert.deepEqual(await a.exportPNG('pr24-new-shapes-old-papers'), oldPaperPNG, 'Old reader renders new frozen shapes identically when papers are known');
    });
    report.checks.push('Every new design uses actual Fold/Back/refold/Front/Back controls and shifted/turned old blossom paper; capture preserves vertices, UVs, both-face recipes and size. PR24 reloads and renders those new shapes exactly.');

    // Focused boundary: experiments have no accessory anchors, while a completed
    // existing sash, its print placement and pose remain recoverable on the jacket.
    await visit(base, undefined, async a => {
      await a.load('design=jacket&paper=oat-linen&step=99&view=display');
      await a.page.getByLabel('Accessory type').selectOption('sash'); await a.btn('Fold accessory').click(); await a.settle();
      await a.page.getByRole('radio', { name: 'Corner bloom', exact: true }).click(); await a.positionPrint(); await a.finish(); await a.btn('Attach').click(); await a.settle(); await a.display();
      const signature = () => a.page.evaluate(() => {
        const p = paperCouture; p.accessoryRoot.updateMatrixWorld(true);
        return JSON.parse(JSON.stringify({ id: p.accessoryId, attached: p.attached, visible: p.accessoryRoot.visible, paper: p.accessoryPaperId, turns: p.accessoryQuarterTurns,
          offset: p.pinPrintPosition, anchor: p.pinPosition, pose: Array.from(p.pinSheet.front.geometry.attributes.position.array),
          matrices: [p.accessoryRoot.matrix.toArray(), ...p.accessoryRoot.children.map(c => c.matrix.toArray())] }));
      });
      const before = await signature(); assert(before.attached && before.visible);
      await a.page.getByLabel('Garment design').selectOption(requiredIds[0]); await a.settle(); await a.finish(); await a.display();
      assert(await a.page.getByLabel('Accessory type').isHidden()); assert.match(await a.page.locator('.studio-note').innerText(), /kept aside/);
      assert.equal(await a.page.evaluate(() => paperCouture.accessoryRoot.visible), false);
      await a.page.getByLabel('Garment design').selectOption('jacket'); await a.settle(); await a.finish(); await a.display();
      assert.deepEqual(await signature(), before, 'Experimental-design round trip must retain the completed sash, independent paper and pose');
    });
    report.checks.push('Completed jacket sash survives an unsupported new-design round trip with exact paper/turn/offset, attachment, vertices and local matrices; experiments expose no accessory controls.');

    await visit(base, undefined, async a => {
      const composition = [
        { id: 'capelet', cm: capeletCm, paper: paperId, x: -.32, y: 1.12 },
        { id: 'skirt', cm: 20, paper: 'oat-linen', x: -.32, y: -.24 },
        { id: 'boot-left', cm: 8, paper: 'slate-grain', x: -.72, y: -1.52 },
        { id: 'boot-right', cm: 8, paper: 'slate-grain', x: .08, y: -1.52 },
        { id: accentId, cm: accentCm, paper: 'corner-bloom', x: 1.04, y: .72 },
      ];
      if (process.env.COMPOSITION_JSON) composition.splice(0, composition.length, ...JSON.parse(process.env.COMPOSITION_JSON));
      assert.equal(composition.length, 5);
      for (const piece of composition) {
        await a.load(`design=${piece.id}&paper=${piece.paper}&step=99&view=display`);
        if (piece.paper === paperId) await a.page.getByRole('radio', { name: paperName, exact: true }).click();
        assert.equal(await a.page.evaluate(() => paperCouture.garmentId), piece.id); assert.equal(await a.page.evaluate(() => paperCouture.paperId), piece.paper);
        await a.capture(piece.cm); await a.moveTo(piece.x, piece.y);
      }
      const full = await a.state(), durable = await a.raw(); assert.equal(full.items.length, 5); assert(await a.btn('Board full · five pieces').isDisabled());
      await a.btn('Board full · five pieces').evaluate(e => e.click()); assert.deepEqual(await a.state(), full); assert.equal(await a.raw(), durable);
      assert(full.items.some(i => i.snapshot.materials.some(m => m.paper?.id === paperId)), 'New-paper rollback test must contain the new paper');
      for (const [width, height] of [[1280, 900], [390, 844], [320, 568]]) {
        await a.page.setViewportSize({ width, height }); await a.page.locator('.board-tools').evaluate(e => { e.scrollTop = 0; });
        const m = await a.metrics(); assertBoard(m); assert(m.sizeControl.height >= 44 && m.sizeControl.initiallyVisible);
        // These are minimum visible extents, not a claim of physical-phone feel.
        for (const [i, p] of m.pieces.entries()) { assert(p.pixels[0] >= (i < 2 ? 70 : i === 4 ? 22 : 28), `Readable width at ${width}: ${p.title}`); assert(p.pixels[1] >= (i < 2 ? 35 : 18)); }
        report.measurements.push({ name: 'five-piece-companions', ...m }); await a.shot(`five-piece-${width}`); await a.exportPNG(`composite-${width}`);
        const selectedSize = await a.page.getByLabel('Starting square size').inputValue();
        const anotherSize = await a.page.getByLabel('Starting square size').locator('option').evaluateAll((xs, selected) => xs.find(x => x.value !== selected).value, selectedSize);
        await a.page.getByLabel('Starting square size').selectOption(anotherSize); assert.deepEqual(await a.state(), full, 'Next capture size cannot reinterpret pinned pieces');
        await a.page.getByLabel('Starting square size').selectOption(selectedSize);
        for (const i of full.items) { await a.page.getByLabel('Selected board piece').selectOption(i.id); assert.equal((await a.state()).selected, i.id); }
        if (width < 400) {
          await a.page.locator('.board-tools').evaluate(e => { e.scrollTop = 0; });
          const r = await a.page.locator('.pinboard-canvas').boundingBox(), item = (await a.state()).items.at(-1);
          const x = r.x + r.width * (.5 + item.x / 3.6), y = r.y + r.height * (.5 - item.y / 4.2), initial = await a.state();
          const cdp = await a.context.newCDPSession(a.page);
          const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
          try {
            const durableBefore = await a.page.evaluate(() => ({ saved: localStorage.getItem('paper-couture.pinboard.v1'), history: paperCouture.pinboard.history.length }));
            await touch('touchStart', [{ x, y }]); await touch('touchMove', [{ x: x - 18, y: y - 12 }]);
            await a.page.waitForFunction(() => paperCouture.pinboard.drag?.moved);
            assert.notDeepEqual((await a.state()).items, initial.items);
            await touch('touchCancel', []); await a.page.waitForFunction(() => !paperCouture.pinboard.drag);
            assert.deepEqual((await a.state()).items, initial.items);
            assert.deepEqual(await a.page.evaluate(() => ({ saved: localStorage.getItem('paper-couture.pinboard.v1'), history: paperCouture.pinboard.history.length })), durableBefore);
            await touch('touchStart', [{ x, y }]); await touch('touchMove', [{ x: x - 18, y: y - 12 }]); await touch('touchEnd', []);
            await a.page.waitForFunction(() => !paperCouture.pinboard.drag);
            assert.notDeepEqual((await a.state()).items, initial.items, 'Actual small accent paper must be touch-draggable'); await a.btn('Undo').click(); assert.deepEqual((await a.state()).items, initial.items);
            // Four pixels from the corner is outside the 0.08-world-unit paper margin.
            await touch('touchStart', [{ x: r.x + 4, y: r.y + 4 }]); await touch('touchMove', [{ x: r.x + 12, y: r.y + 12 }]); await touch('touchEnd', []);
            assert.deepEqual((await a.state()).items, initial.items, 'Empty board space must not pan or move a piece');
          } finally { await cdp.detach(); }
        }
      }
      await a.page.setViewportSize({ width: 1280, height: 900 });
      const before = await a.state(); await a.btn('Send backward').click(); assert.notDeepEqual((await a.state()).items.map(i => i.id), before.items.map(i => i.id)); await a.btn('Undo').click(); assert.deepEqual(await a.state(), before);
      const memory = [];
      for (let n = 0; n < 5; n++) { await a.btn('Remove selected').click(); assert.equal((await a.state()).items.length, 4); await a.btn('Undo').click(); assert.deepEqual(await a.state(), before); memory.push((await a.metrics()).memory); }
      assert.deepEqual(memory.slice(1), Array(4).fill(memory[1]), 'Repeated remove/Undo must release replaced GPU resources'); report.memory = memory;
      for (const [index, item] of full.items.entries()) {
        await a.page.getByLabel('Selected board piece').selectOption(item.id);
        for (const tilt of ['12', '-12']) {
          await a.page.getByLabel('Pinboard tilt').fill(tilt);
          for (const direction of ['Move right', 'Move up', 'Move left', 'Move down']) { await a.nudge(direction, 40); assertBoard(await a.metrics()); }
        }
        await a.moveTo(composition[index].x, composition[index].y);
      }
      assert.deepEqual((await a.state()).items, full.items, 'Repeated clamped moves and tilt never alter frozen snapshots; explicit placement restores the composition');
      const retained = await a.state(); newPaperSave = await a.raw(); fs.writeFileSync(path.join(out, 'five-piece-companions.json'), newPaperSave);
      report.beforeReload = await a.page.evaluate(() => ({ url: location.href, readyState: document.readyState, unsaved: paperCouture.pinboard.unsaved,
        durableMatchesState: localStorage.getItem('paper-couture.pinboard.v1') === JSON.stringify(paperCouture.pinboard.state),
        boardMemory: { ...paperCouture.pinboard.renderer.info.memory }, time: Date.now() }));
      const reloadProbe = setTimeout(() => { void (async () => {
        const started = Date.now();
        try {
          const response = await fetch(report.beforeReload.url, { signal: AbortSignal.timeout(5000), headers: { 'Cache-Control': 'no-cache' } });
          const html = await response.text();
          report.reloadHTTPProbe = { status: response.status, elapsedMs: Date.now() - started, htmlSha256: sha(html), matchesCandidateHTML: sha(html) === report.candidateBundle.htmlSha256 };
        } catch (error) { report.reloadHTTPProbe = { elapsedMs: Date.now() - started, error: String(error) }; }
      })(); }, 15000);
      try { await a.page.reload(); } finally { clearTimeout(reloadProbe); }
      await a.settle(); await a.open(); assert.deepEqual(await a.state(), retained); assert.equal(await a.raw(), newPaperSave);
      await a.exportPNG('five-piece-reloaded');
      // One new-collection quota check uses only this disposable context's Storage
      // method. An old durable save stays intact and Retry writes the kept new state.
      await a.page.evaluate(k => { window.companionOriginalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { if (key === k) throw new DOMException('Injected test quota', 'QuotaExceededError'); return window.companionOriginalSetItem.call(this, key, value); }; }, key);
      await a.btn('Move left').click(); const unsaved = await a.state(); assert.equal(await a.raw(), newPaperSave); assert.match(await a.page.locator('.board-storage').innerText(), /only in this tab/);
      await a.page.evaluate(() => { Storage.prototype.setItem = window.companionOriginalSetItem; }); await a.btn('Retry saving board').click();
      assert.deepEqual(JSON.parse(await a.raw()), unsaved); await a.btn('Undo').click(); assert.deepEqual(await a.state(), retained);
    });
    report.checks.push('Five actual captures compose capelet/skirt/two independent boots/accent; desktop/390/320 full-board camera, measurable readable extents, 44px size choice, selection and exact scene PNG. Small-accent touch cancel/commit/Undo and empty-space behavior pass.');
    report.checks.push('Sixth pin is blocked; all five pieces survive repeated all-edge movement at both tilt limits, layer/removeUndo, stable GPU counts, exact reload and injected quota/retry without losing the durable board.');

    // A separate five-slot composition proves the capelet's shoulder-layer role
    // over a top, rather than relying on the capelet/skirt arrangement alone.
    await visit(base, undefined, async a => {
      const layers = [
        { id: 'wrap-top', cm: 18, paper: paperId, x: 0, y: .72 },
        { id: 'skirt', cm: 20, paper: 'slate-grain', x: 0, y: -.56 },
        { id: 'capelet', cm: capeletCm, paper: 'oat-linen', x: 0, y: 1.04 },
        { id: 'boot-left', cm: 8, paper: 'slate-grain', x: -.4, y: -1.52 },
        { id: 'boot-right', cm: 8, paper: 'slate-grain', x: .4, y: -1.52 },
      ];
      for (const piece of layers) {
        await a.load(`design=${piece.id}&paper=${piece.paper}&step=99&view=display`);
        assert.equal(await a.page.evaluate(() => paperCouture.garmentId), piece.id);
        await a.capture(piece.cm); await a.moveTo(piece.x, piece.y);
      }
      const full = await a.state(); assert.equal(full.items.length, 5); assert(await a.btn('Board full · five pieces').isDisabled());
      for (const [width, height] of [[1280, 900], [390, 844], [320, 568]]) {
        await a.page.setViewportSize({ width, height }); await a.page.locator('.board-tools').evaluate(e => { e.scrollTop = 0; });
        const m = await a.metrics(); assertBoard(m);
        const top = m.pieces[0], cape = m.pieces[2], [tl, tr, tb, tt] = top.bounds, [cl, cr, cb, ct] = cape.bounds;
        const overlapWidth = Math.min(tr, cr) - Math.max(tl, cl), overlapHeight = Math.min(tt, ct) - Math.max(tb, cb);
        const topHeightBelowCape = Math.min(cb, tt) - tb, exposedHeightPixels = topHeightBelowCape * m.canvas[1] / 4.2;
        assert(ct > tt && overlapWidth > top.size[0] * .5, 'Capelet spans the top shoulders');
        assert(overlapHeight >= top.size[1] * .4, 'Capelet overlaps at least 40% of the top vertical extent');
        assert(topHeightBelowCape > .3 && exposedHeightPixels > 20, 'A readable lower portion of the top remains below the capelet');
        for (const [i, p] of m.pieces.entries()) assert(p.pixels[0] >= (i < 3 ? 65 : 28) && p.pixels[1] >= 18, `Readable layered piece at ${width}: ${p.title}`);
        report.measurements.push({ name: 'capelet-over-wrap-top', overlapWidth, overlapHeight, topHeightBelowCape, exposedHeightPixels, ...m });
        await a.shot(`layered-${width}`); await a.exportPNG(`layered-composite-${width}`);
      }
      await a.page.getByLabel('Selected board piece').selectOption(full.items[2].id);
      const selected = await a.state(); await a.btn('Remove selected').click();
      assert.deepEqual((await a.state()).items, full.items.filter((_, i) => i !== 2));
      await a.exportPNG('layered-before-capelet'); await a.btn('Undo').click(); assert.deepEqual(await a.state(), selected);
      const durable = await a.raw(); fs.writeFileSync(path.join(out, 'five-piece-layered.json'), durable);
      await a.page.reload(); await a.settle(); await a.open(); assert.deepEqual(await a.state(), selected); assert.equal(await a.raw(), durable);
      await a.exportPNG('layered-reloaded');
    });
    report.checks.push('Second real five-piece composition layers capelet over Cross-wrap top plus skirt and two boots. Actual bounds verify shoulder overlap, at least 40% vertical overlap and over 0.3 board units of exposed top; desktop/390/320 readable pixels, before/after PNG, remove/Undo and exact reload pass.');

    await visit(baseline, newPaperSave, async a => {
      await a.load('design=dress&step=99&view=display'); await a.open(); assert.equal((await a.state()).items.length, 0); assert.equal(await a.raw(), newPaperSave);
      assert.match(await a.page.locator('.board-storage').innerText(), /could not be read/);
      await a.btn('Pin current piece').click(); assert.equal((await a.state()).items.length, 1); assert.equal(await a.raw(), newPaperSave);
      await a.btn('Move left').click(); await a.btn('Retry saving board').click(); assert.equal(await a.raw(), newPaperSave);
      assert.match(await a.page.locator('.board-storage').innerText(), /could not be read; it has not been replaced/);
      // Dismissing only this fresh context's beforeunload prompt authorizes navigation;
      // no storage-clear or fallback migration is used.
      a.page.on('dialog', dialog => dialog.accept()); await a.page.reload(); await a.settle(); await a.open();
      assert.equal((await a.state()).items.length, 0); assert.equal(await a.raw(), newPaperSave);
    });
    report.checks.push('PR24 rejects the new paper ID atomically; original five-piece bytes survive pin/move/retry/reload attempts and the UI explains that the existing board has not been replaced. No migration is invented.');
    assert.equal(fs.readFileSync(fixturePath, 'utf8'), fixture, 'Committed legacy fixture must remain byte-exact');
    assert.deepEqual(await bundle(base), report.candidateBundle, 'Candidate build must stay unchanged during the test');
    assert.deepEqual(await bundle(baseline), report.baselineBundle, 'Frozen baseline build must stay unchanged during the test');
    if (production) assert.deepEqual(report.sourceRequests, [], 'Compiled-bundle checks must not request source modules');
    assert.deepEqual(report.errors, []); assert.deepEqual(report.failedResources, []); report.passed = true;
  } catch (error) { report.failure = String(error); if (currentPage) await currentPage.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {}); throw error; }
  finally { fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
