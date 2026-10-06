// Smoke the served production bundle, never Vite source modules or a personal
// browser profile. Diagnostic layout places the five real UI captures; fold,
// capture, size, movement, remove/Undo, reload and export use their actual UI.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const base = (process.env.BASE_URL || 'http://127.0.0.1:4201').replace(/\/$/, '') + '/';
const out = process.env.CAPTURE_DIR || '.outfit-production-qa';
fs.mkdirSync(out, { recursive: true });
const key = 'paper-couture.pinboard.v1';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const pieces = [
  { id: 'boat-top', paper: 'oat-linen', paperName: 'Oat linen', cm: 16, x: -.48, y: .4, steps: 7 },
  { id: 'skirt', paper: 'slate-grain', paperName: 'Slate grain', cm: 20, x: -.48, y: -.88 },
  { id: 'wrap-top', paper: 'ginkgo-pairs', paperName: 'Ginkgo pairs', cm: 18, x: .8, y: .24, steps: 8 },
  { id: 'hat', paper: 'oat-linen', paperName: 'Oat linen', cm: 8, x: -.48, y: 1.28, steps: 7 },
  { id: 'clutch', paper: 'slate-grain', paperName: 'Slate grain', cm: 8, x: .88, y: -.88 },
];
async function bundle() {
  const response = await fetch(base, { headers: { 'Cache-Control': 'no-cache' } });
  assert.equal(response.status, 200, 'Production HTML must be served successfully');
  const html = await response.text();
  assert(!html.includes('/@vite/client') && !html.includes('/src/main.ts'), 'Must test a compiled build');
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)].map(m => m[1]);
  const styles = [...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+\.css(?:\?[^"']*)?)["']/g)].map(m => m[1]);
  assert(scripts.length && styles.length, 'Compiled JS and CSS must both be referenced');
  const assets = [];
  for (const href of [...scripts, ...styles]) {
    const url = new URL(href, base);
    assert(/\/assets\/[^/]+-[\w-]+\.(js|css)$/.test(url.pathname), `Expected hashed production asset: ${url.pathname}`);
    assert.equal(url.origin, new URL(base).origin);
    const r = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } }); assert.equal(r.status, 200);
    const bytes = Buffer.from(await r.arrayBuffer()); assert(bytes.length > 100);
    assets.push({ path: url.pathname, bytes: bytes.length, sha256: sha(bytes), contentType: r.headers.get('content-type') });
  }
  return { htmlSha256: sha(html), assets };
}
(async () => {
  const result = { base, checkedAt: new Date().toISOString(), productionBundle: await bundle(), checks: [], viewports: [], pageErrors: [], failedResources: [], physicalPhoneTested: false };
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  let context, page;
  try {
    context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', hasTouch: true, acceptDownloads: true });
    page = await context.newPage(); page.setDefaultTimeout(60000);
    const sourceRequests = [];
    page.on('request', request => { if (/\/(src|node_modules|@vite)\//.test(new URL(request.url()).pathname)) sourceRequests.push(request.url()); });
    page.on('pageerror', e => result.pageErrors.push(String(e)));
    page.on('response', r => { if (r.status() >= 400 && ['document', 'script', 'stylesheet'].includes(r.request().resourceType())) result.failedResources.push({ url: r.url(), status: r.status() }); });
    const btn = name => page.getByRole('button', { name, exact: true });
    const settle = () => page.waitForFunction(() => window.paperCouture && !paperCouture.controller.moving && paperCouture.view.t === paperCouture.view.target && !paperCouture.displayCam.glide);
    const load = async query => { const response = await page.goto(base + '?' + query); assert.equal(response.status(), 200); await settle(); };
    const open = () => page.getByRole('button', { name: /^View board/ }).click();
    const state = () => page.evaluate(() => JSON.parse(JSON.stringify(paperCouture.pinboard.state)));
    const measure = () => page.evaluate(() => {
      const b = paperCouture.pinboard;
      return b.state.items.map(i => { const box = b.selection.box.setFromObject(b.groups.get(i.id), true); return { title: i.title, paperSize: i.paperSize, bounds: [box.min.x, box.max.x, box.min.y, box.max.y], depth: box.max.z - box.min.z }; });
    });
    const exportPNG = async name => {
      const expected = await page.evaluate(() => { const b = paperCouture.pinboard; b.selection.visible = false; b.renderer.setSize(1800, 2100, false); b.renderer.render(b.scene, b.camera); return b.canvas.toDataURL('image/png'); });
      const [download] = await Promise.all([page.waitForEvent('download'), btn('Save PNG').click()]);
      const file = path.join(out, name + '.png'); await download.saveAs(file); const bytes = fs.readFileSync(file);
      assert.equal(bytes.readUInt32BE(16), 1800); assert.equal(bytes.readUInt32BE(20), 2100);
      assert.deepEqual(bytes, Buffer.from(expected.split(',')[1], 'base64'), 'Export must match the visible rendered scene without selection');
      return { file: path.basename(file), width: 1800, height: 2100, bytes: bytes.length, sha256: sha(bytes), matchesScene: true };
    };
    for (const [index, piece] of pieces.entries()) {
      await load(`design=${piece.id}&step=${index ? 99 : 0}&view=${index ? 'display' : 'workshop'}`);
      if (!index) {
        for (const id of ['boat-top', 'wrap-top', 'hat']) {
          const option = page.getByLabel('Garment design').locator(`option[value="${id}"]`);
          assert.equal(await option.count(), 1); assert((await option.locator('..').getAttribute('label')).includes('Experiments'));
        }
        for (const name of ['Oat linen', 'Slate grain', 'Ginkgo pairs']) assert.equal(await page.getByRole('radio', { name, exact: true }).count(), 1);
      }
      await page.getByRole('radio', { name: piece.paperName, exact: true }).click();
      assert.equal(await page.evaluate(() => paperCouture.paperId), piece.paper);
      if (!index) {
        let folds = 0;
        while (!await page.evaluate(() => paperCouture.controller.finished)) {
          const previous = await page.evaluate(() => paperCouture.controller.step);
          await page.locator('.dock:not(.display-dock) .btn-primary').click();
          if (await page.evaluate(() => paperCouture.controller.moving)) await page.locator('.dock:not(.display-dock) .btn-primary').click();
          await settle(); assert.equal(await page.evaluate(() => paperCouture.controller.step), previous + 1);
          assert(++folds <= 12, 'Bounded authored fold sequence');
        }
        assert.equal(folds, piece.steps); result.actualButtonFolds = { design: piece.id, steps: folds };
        await btn('Display').click(); await settle();
      }
      assert.equal(await page.evaluate(() => paperCouture.garmentId), piece.id);
      if (piece.steps) assert.equal(await page.evaluate(() => paperCouture.controller.step), piece.steps);
      await open(); const previous = await state();
      assert.equal(Number(await page.getByLabel('Starting square size').inputValue()), piece.cm);
      await btn('Pin current piece').click(); const pinned = await state();
      assert.equal(pinned.items.length, index + 1); assert.deepEqual(pinned.items.slice(0, -1), previous.items);
      const capture = pinned.items.at(-1); assert.equal(capture.paperSize.sideCm, piece.cm);
      assert(capture.snapshot.materials.some(m => m.paper?.id === piece.paper));
      // Evidence-only placement: the five captures come from the real Pin UI.
      await page.evaluate(({ x, y }) => { const b = paperCouture.pinboard; b.mutate(() => { const i = b.state.items.at(-1); i.x = x; i.y = y; b.position(); b.constrain(i.id); }); }, piece);
    }
    assert(await btn('Board full · five pieces').isDisabled()); assert.equal((await state()).items.length, 5);
    result.measurements = await measure();
    for (const { bounds: [left, right, bottom, top] } of result.measurements) assert(left >= -1.72001 && right <= 1.72001 && bottom >= -2.02001 && top <= 2.02001, 'Every real capture fits the board');
    const initial = await state();
    await btn('Move left').click(); assert.notDeepEqual(await state(), initial); await btn('Undo').click(); assert.deepEqual(await state(), initial);
    await btn('Send backward').click(); assert.notDeepEqual((await state()).items.map(i => i.id), initial.items.map(i => i.id)); await btn('Undo').click(); assert.deepEqual(await state(), initial);
    await btn('Remove selected').click(); assert.equal((await state()).items.length, 4); assert(!await btn('Pin current piece').isDisabled());
    await btn('Undo').click(); assert.deepEqual(await state(), initial);
    const durable = await page.evaluate(key => localStorage.getItem(key), key);
    await page.reload(); await settle(); await open(); assert.deepEqual(await state(), initial);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), durable, 'Reload/open must not rewrite the save');
    result.checks.push('Served compiled JS/CSS; three new experimental design IDs and three new papers registered; Boat-neck top completed with seven actual fold controls.',
      'Five actual Pin captures with16/20/18/8/8cm defaults; old captures survive every added piece; full button disables sixth; movement/layer/removeUndo and exact five-piece reload.');
    for (const [width, height] of [[1280, 900], [390, 844], [320, 568]]) {
      await page.setViewportSize({ width, height }); await page.locator('.board-tools').evaluate(e => { e.scrollTop = 0; });
      const layout = await page.evaluate(() => {
        const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right }; };
        const b = paperCouture.pinboard;
        return { viewport: [innerWidth, innerHeight], canvas: rect(b.canvas), tools: rect(document.querySelector('.board-tools')), size: rect(document.querySelector('[aria-label="Starting square size"]')), overflow: document.documentElement.scrollWidth > innerWidth, camera: [b.camera.left, b.camera.right, b.camera.bottom, b.camera.top] };
      });
      assert(!layout.overflow); assert(layout.size.height >= 44); assert(layout.size.y >= layout.tools.y && layout.size.bottom <= layout.tools.bottom + 1, `Size choice initially reachable at${width}`);
      assert(Math.abs(layout.canvas.width / layout.canvas.height - 3.6 / 4.2) < .005);
      await page.getByLabel('Starting square size').selectOption('6.4'); assert.deepEqual(await state(), initial, 'Next capture size cannot resize kept pieces');
      await page.getByLabel('Starting square size').selectOption('8');
      await page.locator('.board-tools').evaluate(e => { e.scrollTop = 0; });
      await page.screenshot({ path: path.join(out, `board-${width}.png`) });
      layout.export = await exportPNG(`composite-${width}`); result.viewports.push(layout);
    }
    result.checks.push('Desktop/390/320 no overflow, full44px starting-square control initially visible, correct board aspect; size changes leave pinned snapshots unchanged; each PNG is1800×2100 and byte-identical to rendered scene.');
    assert.deepEqual(sourceRequests, [], 'Production checks may not load source modules');
    assert.deepEqual(result.pageErrors, []); assert.deepEqual(result.failedResources, []);
    assert.deepEqual(await bundle(), result.productionBundle, 'Served build must not change during smoke test');
    result.saveCharacters = durable.length; result.passed = true;
  } catch (error) {
    result.failure = String(error); if (page) await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {}); throw error;
  } finally {
    fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
