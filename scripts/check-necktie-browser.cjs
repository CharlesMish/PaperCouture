// Folded necktie: real-app evidence on a compiled build, fresh browser contexts
// only (never a user's profile or storage). Optional BASELINE_URL serves the
// frozen PR25 build to prove it reads a board containing the new capture.
//   BASE_URL=http://127.0.0.1:4301 BASELINE_URL=http://127.0.0.1:4201 \
//   CAPTURE_DIR=docs/necktie/evidence node scripts/check-necktie-browser.cjs
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const base = (process.env.BASE_URL || 'http://127.0.0.1:4301').replace(/\/$/, '') + '/';
const baseline = process.env.BASELINE_URL ? process.env.BASELINE_URL.replace(/\/$/, '') + '/' : null;
const out = process.env.CAPTURE_DIR || '.necktie-browser-qa';
const geometry = JSON.parse(fs.readFileSync(process.env.GEOMETRY_REPORT || path.join(__dirname, '../docs/necktie/geometry-report.json'), 'utf8'));
const key = 'paper-couture.pinboard.v1', sha = b => crypto.createHash('sha256').update(b).digest('hex');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const report = { base, baseline, checkedAt: new Date().toISOString(), renderer: 'Chromium software WebGL / SwiftShader', physicalPhoneTested: false, physicalPaperTested: false,
    checks: [], folds: [], print: [], measurements: [], exports: [], errors: [] };
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  let currentPage;
  async function visit(url, seed, viewport, work) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce', hasTouch: true, acceptDownloads: true });
    if (seed !== undefined) await context.addInitScript(({ key, seed }) => { if (localStorage.getItem(key) === null) localStorage.setItem(key, seed); }, { key, seed });
    const page = currentPage = await context.newPage(); page.setDefaultTimeout(90000); page.setDefaultNavigationTimeout(90000);
    page.on('pageerror', e => report.errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') report.errors.push(m.text()); });
    const btn = name => page.getByRole('button', { name, exact: true });
    const settle = () => page.waitForFunction(() => window.paperCouture && !paperCouture.controller.moving && paperCouture.view.t === paperCouture.view.target && !paperCouture.displayCam.glide);
    const load = async q => { const r = await page.goto(url + '?' + q); assert(r.ok()); await settle(); };
    const shot = name => page.screenshot({ path: path.join(out, name + '.png') });
    const step = () => page.evaluate(() => paperCouture.controller.step);
    const primary = () => page.locator('.dock:not(.display-dock):not([hidden]) .btn-primary');
    const fold = async () => { const n = await step(); await primary().click(); if (await page.evaluate(() => paperCouture.controller.moving)) await primary().click(); await settle(); assert.equal(await step(), n + 1); };
    const back = async () => { const n = await step(); await btn('Back').click(); if (await page.evaluate(() => paperCouture.controller.moving)) await btn('Back').click(); await settle(); assert.equal(await step(), n - 1); };
    const finish = async () => { while (!await page.evaluate(() => paperCouture.controller.finished)) await fold(); };
    const display = async () => { if (await btn('Display').isVisible()) await btn('Display').click(); await settle(); };
    const facets = () => page.evaluate(() => JSON.stringify(paperCouture.timeline.states.at(-1).facets));
    const state = () => page.evaluate(() => JSON.parse(JSON.stringify(paperCouture.pinboard.state)));
    const raw = () => page.evaluate(k => localStorage.getItem(k), key);
    const nudge = (name, count) => btn(name).evaluate((e, count) => { for (let n = 0; n < count; n++) e.click(); }, count);
    const moveTo = async (x, y) => { await btn('Reset selected').click(); await nudge(x < 0 ? 'Move left' : 'Move right', Math.round(Math.abs(x) / .08)); await nudge(y < 0 ? 'Move down' : 'Move up', Math.round(Math.abs(y) / .08)); };
    const setPrint = async (turn, offset) => {
      while ((await page.evaluate(() => paperCouture.quarterTurns)) !== turn) await page.getByRole('button', { name: /^Turn paper/ }).click();
      await btn('Position print').click(); await btn('Reset print').click();
      for (const [name, n] of [[offset.x < 0 ? 'Left' : 'Right', Math.abs(offset.x * 32)], [offset.y < 0 ? 'Down' : 'Up', Math.abs(offset.y * 32)]]) for (let i = 0; i < n; i++) await btn(name).click();
      await btn('Done').click();
      assert.deepEqual(await page.evaluate(() => paperCouture.printPosition), { x: offset.x, y: offset.y });
    };
    const capture = async (cm, expectPaper) => {
      const live = await page.evaluate(() => JSON.parse(JSON.stringify({ position: Array.from(paperCouture.sheet.front.geometry.attributes.position.array), uv: Array.from(paperCouture.sheet.front.geometry.attributes.uv.array) })));
      await page.getByRole('button', { name: /^View board/ }).click(); const previous = await state();
      await page.getByLabel('Starting square size').selectOption(String(cm)); await btn('Pin current piece').click();
      const next = await state(), piece = next.items.at(-1);
      assert.equal(next.items.length, previous.items.length + 1); assert.deepEqual(next.items.slice(0, -1), previous.items, 'earlier pieces are untouched');
      assert.equal(piece.paperSize.sideCm, cm); assert.deepEqual(piece.snapshot.geometries[0].position, live.position, 'captured vertices'); assert.deepEqual(piece.snapshot.geometries[0].uv, live.uv, 'captured permanent UVs');
      if (expectPaper) for (const m of piece.snapshot.materials.filter(m => m.paper)) { assert.equal(m.paper.id, expectPaper.id); assert.equal(m.paper.turns, expectPaper.turns); assert.deepEqual(m.paper.position, expectPaper.position); }
      return piece;
    };
    const exportPNG = async name => {
      const expected = await page.evaluate(() => { const b = paperCouture.pinboard; b.selection.visible = false; b.renderer.setSize(1800, 2100, false); b.renderer.render(b.scene, b.camera); return b.canvas.toDataURL('image/png'); });
      const [download] = await Promise.all([page.waitForEvent('download'), btn('Save PNG').click()]);
      const file = path.join(out, name + '.png'); await download.saveAs(file); const bytes = fs.readFileSync(file);
      assert.equal(bytes.readUInt32BE(16), 1800); assert.equal(bytes.readUInt32BE(20), 2100);
      assert.deepEqual(bytes, Buffer.from(expected.split(',')[1], 'base64'), 'composite PNG equals the rendered board without selection');
      await page.waitForFunction(() => !paperCouture.pinboard.exporting);
      report.exports.push({ file: path.basename(file), bytes: bytes.length, sha256: sha(bytes) }); return bytes;
    };
    const metrics = () => page.evaluate(() => {
      const b = paperCouture.pinboard, r = b.canvas.getBoundingClientRect(), d = b.dialog.getBoundingClientRect();
      return { viewport: [innerWidth, innerHeight], canvas: [r.width, r.height], contained: r.left >= d.left - .5 && r.right <= d.right + .5 && r.top >= d.top - .5 && r.bottom <= d.bottom + .5,
        overflow: document.documentElement.scrollWidth > innerWidth,
        pieces: b.state.items.map(i => { const box = b.selection.box.clone().setFromObject(b.groups.get(i.id), true); return { title: i.title, sideCm: i.paperSize?.sideCm, bounds: [box.min.x, box.max.x, box.min.y, box.max.y].map(v => +v.toFixed(4)), size: [box.max.x - box.min.x, box.max.y - box.min.y].map(v => +v.toFixed(4)), pixels: [(box.max.x - box.min.x) * r.width / 3.6, (box.max.y - box.min.y) * r.height / 4.2].map(v => +v.toFixed(1)) }; }),
        saveCharacters: localStorage.getItem('paper-couture.pinboard.v1')?.length };
    });
    try { return await work({ page, context, btn, settle, load, shot, step, fold, back, finish, display, facets, state, raw, nudge, moveTo, setPrint, capture, exportPNG, metrics }); }
    catch (e) { await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {}); throw e; }
    finally { await context.close(); currentPage = undefined; }
  }

  try {
    // 1. Neutral paper: every real fold, half-way poses, Back/refold, Start over, Display views.
    await visit(base, undefined, { width: 900, height: 760 }, async a => {
      await a.load('design=necktie&paper=oat-linen&step=0');
      assert.equal(await a.page.getByLabel('Garment design').inputValue(), 'necktie');
      assert.match(await a.page.locator('.studio-note').innerText(), /Small intact square.*no neck loop/);
      const titles = await a.page.evaluate(() => paperCouture.timeline.ops.map(o => o.op.title));
      assert.equal(titles.length, geometry.steps); await a.shot('neutral-step-0');
      for (let i = 0; i < titles.length; i++) {
        await a.page.evaluate(() => { paperCouture.controller.beginScrub(); paperCouture.controller.scrubTo(.5); }); await a.page.waitForTimeout(80);
        await a.shot(`neutral-step-${i + 1}-half`); await a.page.evaluate(() => paperCouture.controller.endScrub(false)); await a.settle();
        assert.equal(await a.step(), i, 'released scrub returns to the start of the step');
        await a.fold(); await a.shot(`neutral-step-${i + 1}`);
        report.folds.push({ step: i + 1, title: titles[i] });
      }
      const finished = await a.facets();
      await a.back(); await a.back(); await a.fold(); await a.fold(); assert.equal(await a.facets(), finished, 'Back and refold reproduce the same material');
      await a.btn('Start over').click(); await a.settle(); assert.equal(await a.step(), 0); await a.finish();
      await a.display();
      for (const v of ['Front', 'Angle', 'Back']) { await a.btn(v).click(); await a.settle(); await a.shot(`neutral-${v.toLowerCase()}`); }
      const before = await a.page.evaluate(() => ({ design: paperCouture.garmentId, step: paperCouture.controller.step, paper: paperCouture.paperId }));
      await a.page.reload(); await a.settle(); assert.deepEqual(await a.page.evaluate(() => ({ design: paperCouture.garmentId, step: paperCouture.controller.step, paper: paperCouture.paperId })), before, 'reload restores design, step and paper');
    });
    report.checks.push('Actual Fold controls for all eight steps with half-way scrub poses; Back x2/refold reproduces identical material; Start over and refold; Display Front/Angle/Back; reload restores design, step and paper. Oat linen neutral paper.');

    // 2. Corner bloom at four quarter-turns: original and deliberately aligned.
    await visit(base, undefined, { width: 900, height: 760 }, async a => {
      await a.load('design=necktie&paper=corner-bloom&step=99&view=display');
      const finished = await a.facets();
      for (const row of geometry.cornerBloomAlignment.alignment) {
        const q = row.quarterTurns;
        await a.setPrint(q, { x: 0, y: 0 });
        await a.btn('Front').click(); await a.settle(); await a.shot(`bloom-${row.degrees}-original-front`);
        await a.setPrint(q, row.offset);
        for (const v of ['Front', 'Back']) { await a.btn(v).click(); await a.settle(); await a.shot(`bloom-${row.degrees}-aligned-${v.toLowerCase()}`); }
        assert.equal(await a.facets(), finished, 'turning or moving the print does not rebuild material');
        report.print.push({ degrees: row.degrees, offset: row.offset, nudges: row.nudges, engineUnshiftedFrontShare: row.unshiftedFrontShare, engineAlignedFrontShare: row.alignedFrontShare });
      }
      await a.btn('Angle').click(); await a.settle(); await a.shot('bloom-270-aligned-angle');
    });
    report.checks.push('Corner bloom (existing positionable paper) at 0/90/180/270 degrees: original and engine-computed aligned offsets via the real Position print nudges (1/32 steps, inside the 0.3 slide limit); Front/Back renders; completed material unchanged.');

    // 3. Wardrobe scale: existing top, bottom, hat and small accessory beside the tie.
    const bloom0 = geometry.cornerBloomAlignment.alignment[0];
    const outfit = [
      { id: 'skirt', cm: 20, paper: 'slate-grain', x: 0, y: -.64 },
      { id: 'wrap-top', cm: 18, paper: 'oat-linen', x: 0, y: .64 },
      { id: 'necktie', cm: 7, paper: 'corner-bloom', turn: 0, offset: bloom0.offset, x: 0, y: .82 },
      { id: 'hat', cm: 8, paper: 'plum-seed', x: 0, y: 1.56 },
      { id: 'clutch', cm: 8, paper: 'slate-grain', x: 1.1, y: -.72 },
    ];
    let saved, savedState, candidatePNG;
    await visit(base, undefined, { width: 1280, height: 900 }, async a => {
      for (const p of outfit) {
        await a.load(`design=${p.id}&paper=${p.paper}&step=99&view=display`);
        assert.equal(await a.page.evaluate(() => paperCouture.garmentId), p.id);
        let recipe;
        if (p.offset) { await a.setPrint(p.turn, p.offset); recipe = { id: p.paper, turns: p.turn, position: p.offset }; }
        await a.capture(p.cm, recipe); await a.moveTo(p.x, p.y);
      }
      const full = await a.state(); assert.equal(full.items.length, 5); assert(await a.btn('Board full · five pieces').isDisabled());
      for (const [w, h] of [[1280, 900], [390, 844], [320, 568]]) {
        await a.page.setViewportSize({ width: w, height: h }); await a.page.locator('.board-tools').evaluate(e => { e.scrollTop = 0; }); await a.page.waitForTimeout(200);
        const m = await a.metrics(); assert(!m.overflow, `no horizontal overflow at ${w}`); assert(m.contained, `board canvas inside its dialog at ${w}`);
        for (const p of m.pieces) { const [l, r, b, t] = p.bounds; assert(l >= -1.72 && r <= 1.72 && b >= -2.02 && t <= 2.02, `${p.title} inside the board margin`); }
        const tie = m.pieces[2], top = m.pieces[1];
        assert(tie.bounds[0] > top.bounds[0] && tie.bounds[1] < top.bounds[1] && tie.bounds[3] <= top.bounds[3] + .02, 'the tie lies within the top it is worn over');
        assert(tie.pixels[0] >= 20 && tie.pixels[1] >= 45, `tie readable at ${w}`);
        report.measurements.push({ name: `outfit-${w}`, ...m }); await a.shot(`outfit-${w}`); const png = await a.exportPNG(`outfit-composite-${w}`);
        if (w === 1280) candidatePNG = png; else assert.deepEqual(png, candidatePNG, 'export is independent of the viewport');
      }
      await a.page.setViewportSize({ width: 1280, height: 900 });
      await a.page.getByLabel('Selected board piece').selectOption(full.items[2].id);
      const selected = await a.state();
      await a.btn('Remove selected').click(); assert.deepEqual((await a.state()).items, full.items.filter((_, i) => i !== 2)); await a.exportPNG('outfit-without-tie');
      await a.btn('Undo').click(); assert.deepEqual(await a.state(), selected, 'Undo restores the tie exactly');
      await a.btn('Send backward').click(); assert.notDeepEqual((await a.state()).items.map(i => i.id), selected.items.map(i => i.id)); await a.exportPNG('outfit-tie-under-top');
      await a.btn('Undo').click(); assert.deepEqual(await a.state(), selected);
      saved = await a.raw(); savedState = await a.state(); fs.writeFileSync(path.join(out, 'outfit-board.json'), saved);
      await a.page.reload(); await a.settle(); await a.page.getByRole('button', { name: /^View board/ }).click();
      assert.deepEqual(await a.state(), savedState, 'reload restores the saved board'); assert.equal(await a.raw(), saved, 'reload does not rewrite the save');
      assert.deepEqual(await a.exportPNG('outfit-reloaded'), candidatePNG, 'reloaded board renders identically');
    });
    report.checks.push('Five real captures: Wrap skirt 20 cm, Cross-wrap top 18 cm, Folded necktie 7 cm (aligned Corner bloom), Folded hat 8 cm, Envelope clutch 8 cm. Desktop/390/320 board views without overflow; pieces inside margins; tie inside the top; exact composite PNG; remove/Undo, layer order/Undo, exact reload.');

    if (baseline) {
      await visit(baseline, saved, { width: 1280, height: 900 }, async a => {
        await a.load(''); await a.page.getByRole('button', { name: /^View board/ }).click();
        assert.deepEqual(await a.state(), savedState); assert.equal(await a.raw(), saved);
        assert.deepEqual(await a.exportPNG('pr25-reads-outfit'), candidatePNG, 'frozen PR25 renders the necktie board pixel-identically');
      });
      report.checks.push('Frozen PR25 production build loads the saved board containing the necktie without rewriting it and renders a byte-identical PNG (the capture stores frozen geometry and known paper recipes, no design id).');
    }
    assert.deepEqual(report.errors, []); report.passed = true;
  } catch (e) { report.failure = String(e && e.stack || e); if (currentPage) await currentPage.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {}); throw e; }
  finally { fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify({ passed: report.passed, failure: report.failure, checks: report.checks.length, errors: report.errors }, null, 2)); await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
