// Local follow-up against the frozen reviewed PR25 build. Fresh contexts only.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const base = process.env.BASE_URL || 'http://127.0.0.1:4401';
const baseline = process.env.BASELINE_URL || 'http://127.0.0.1:4400';
const out = process.env.CAPTURE_DIR || '.capelet-brooch-qa';
const key = 'paper-couture.pinboard.v1', sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const result = { base, baseline, baselineHead: '21e0fdbd67b8c9c0e2ff7c6b8fb2baf7a851657f', errors: [], checks: [], outfits: [], exports: [], physicalPhoneTested: false, physicalPaperTested: false };
  async function visit(url, seed, work) {
    const context = await browser.newContext({ viewport: { width: 1100, height: 800 }, reducedMotion: 'reduce', hasTouch: true, acceptDownloads: true });
    if (seed) await context.addInitScript(({ key, seed }) => { if (localStorage.getItem(key) === null) localStorage.setItem(key, seed); }, { key, seed });
    const page = await context.newPage(); page.setDefaultTimeout(60000); page.on('pageerror', e => result.errors.push(String(e)));
    const btn = name => page.getByRole('button', { name, exact: true });
    const settle = () => page.waitForFunction(() => window.paperCouture && !paperCouture.controller.moving && paperCouture.view.t === paperCouture.view.target && !paperCouture.displayCam.glide && paperCouture.sheet.front.geometry.attributes.position?.count > 0 && paperCouture.sheet.front.geometry.attributes.uv?.count > 0);
    const load = async query => { assert((await page.goto(url + '/?' + query)).ok()); await settle(); };
    const state = () => page.evaluate(() => JSON.parse(JSON.stringify(paperCouture.pinboard.state)));
    const raw = () => page.evaluate(k => localStorage.getItem(k), key);
    const open = () => page.getByRole('button', { name: /^View board/ }).click();
    const shot = name => page.screenshot({ path: path.join(out, name + '.png') });
    const fold = async () => { await page.locator('.dock:not(.display-dock) .btn-primary').click(); if (await page.evaluate(() => paperCouture.controller.moving)) await page.locator('.dock:not(.display-dock) .btn-primary').click(); await settle(); };
    const finish = async () => { while (!await page.evaluate(() => paperCouture.controller.finished)) await fold(); };
    const capture = async (cm, x, y) => {
      await open(); const before = await state(); await page.getByLabel('Starting square size').selectOption(String(cm)); await btn('Pin current piece').click();
      const current = await state(); assert.deepEqual(current.items.slice(0, -1), before.items); assert.equal(current.items.at(-1).paperSize.sideCm, cm);
      await page.evaluate(({ x, y }) => { const b = paperCouture.pinboard; b.mutate(() => { const i = b.state.items.at(-1); i.x = x; i.y = y; b.position(); b.constrain(i.id); }); }, { x, y });
    };
    const exportPNG = async name => {
      const expected = await page.evaluate(() => { const b = paperCouture.pinboard; b.selection.visible = false; b.renderer.setSize(1800, 2100, false); b.renderer.render(b.scene, b.camera); return b.canvas.toDataURL('image/png'); });
      const [download] = await Promise.all([page.waitForEvent('download'), btn('Save PNG').click()]); const target = path.join(out, name + '.png'); await download.saveAs(target);
      const bytes = fs.readFileSync(target); assert.deepEqual(bytes, Buffer.from(expected.split(',')[1], 'base64')); await page.waitForFunction(() => !paperCouture.pinboard.exporting);
      result.exports.push({ name, sha256: sha(bytes), dimensions: [bytes.readUInt32BE(16), bytes.readUInt32BE(20)], matchesScene: true }); return bytes;
    };
    const recipe = () => page.evaluate(() => ({ paper: paperCouture.paperId, turn: paperCouture.quarterTurns, position: paperCouture.printPosition }));
    try { return await work({ page, btn, settle, load, state, raw, open, shot, fold, finish, capture, exportPNG, recipe }); }
    catch (e) { await shot('failure').catch(() => {}); throw e; }
    finally { await context.close(); }
  }
  try {
    for (const fixture of ['companions', 'layered']) {
      const source = path.join(__dirname, '../docs/capelet-brooch/fixtures/pr25-' + fixture + '.json'), raw = fs.readFileSync(source, 'utf8'); let oldPNG;
      for (const [name, url] of [['before', baseline], ['after', base]]) await visit(url, raw, async a => {
        await a.load(''); await a.open(); assert.deepEqual(await a.state(), JSON.parse(raw)); assert.equal(await a.raw(), raw);
        const bytes = await a.exportPNG('legacy-' + fixture + '-' + name); if (name === 'before') oldPNG = bytes; else assert.deepEqual(bytes, oldPNG, 'PR25 saved capture must stay pixel-identical');
        const before = await a.state(); await a.btn('Remove selected').click(); await a.btn('Undo').click(); assert.deepEqual(await a.state(), before);
        await a.page.reload(); await a.settle(); await a.open(); assert.deepEqual(await a.state(), before);
      });
      assert.equal(fs.readFileSync(source, 'utf8'), raw);
    }
    result.checks.push('Both frozen PR25 five-piece boards retain exact saved geometry, materials, sizes, offsets and layer order; baseline/candidate PNGs are byte-identical; remove/Undo and reload pass.');
    console.log('PR25 capture preservation passed');

    for (const [id, shape] of [['capelet', 'square'], ['framed-brooch', 'square'], ['framed-brooch', 'rectangle']]) await visit(base, undefined, async a => {
      const tag = id === 'capelet' ? id : id + '-' + shape;
      await a.load(`design=${id}&broochShape=${shape}&paper=corner-bloom&step=0`);
      const count = await a.page.evaluate(() => paperCouture.timeline.ops.length);
      for (let i = 0; i < count; i++) {
        for (const f of (id === 'capelet' && [1, 2].includes(i) ? [.25, .5, .75] : [.5])) {
          await a.page.evaluate(t => { paperCouture.controller.beginScrub(); paperCouture.controller.scrubTo(t); }, f); await a.page.waitForTimeout(50); await a.shot(`${tag}-fold-${i + 1}-${f * 100}`);
          await a.page.evaluate(() => paperCouture.controller.endScrub(false)); await a.settle();
        }
        await a.fold();
      }
      for (let i = count; i > 0; i--) { await a.btn('Back').click(); if (await a.page.evaluate(() => paperCouture.controller.moving)) await a.btn('Back').click(); await a.settle(); assert.equal(await a.page.evaluate(() => paperCouture.controller.step), i - 1); }
      await a.finish(); await a.btn('Display').click(); await a.settle();
      const geometry = await a.page.evaluate(() => JSON.stringify(paperCouture.timeline.states.at(-1).facets));
      for (let turn = 0; turn < 4; turn++) {
        while ((await a.recipe()).turn !== turn) await a.page.getByRole('button', { name: /^Turn paper/ }).click();
        for (const offset of ['original', 'shifted']) {
          await a.btn('Position print').click(); await a.btn('Reset print').click();
          if (offset === 'shifted') for (let n = 0; n < 4; n++) { await a.btn('Right').click(); await a.btn('Up').click(); }
          await a.btn('Done').click(); assert.deepEqual((await a.recipe()).position, offset === 'shifted' ? { x: .125, y: .125 } : { x: 0, y: 0 });
          for (const view of ['Front', 'Back']) { await a.btn(view).click(); await a.settle(); await a.shot(`${tag}-bloom-${turn}-${offset}-${view.toLowerCase()}`); }
          assert.equal(await a.page.evaluate(() => JSON.stringify(paperCouture.timeline.states.at(-1).facets)), geometry);
        }
      }
      const before = await a.recipe(); await a.page.reload(); await a.settle(); assert.deepEqual(await a.recipe(), before);
      result.checks.push(`${tag}: actual forward/all Back/refold, sampled visible fold poses, all four print turns before/after offset in Front/Back; fixed finished material and URL reload.`);
      console.log(tag + ' fold and print review passed');
    });

    let newSave, newPNG;
    for (const [version, url] of [['before', baseline], ['after', base]]) await visit(url, undefined, async a => {
      for (const [id, paper, cm, x, y] of [
        ['wrap-top', 'plum-seed', 18, 0, .65], ['skirt', 'slate-grain', 20, 0, -.6],
        ['hat', 'slate-grain', 8, 0, 1.65], ['capelet', 'oat-linen', version === 'before' ? 14 : 18, 0, 1.04],
      ]) { await a.load(`design=${id}&paper=${paper}&step=99&view=display`); await a.capture(cm, x, y); }
      const retained = (await a.state()).items;
      await a.load('design=framed-brooch&paper=corner-bloom&printX=.19921875&printY=.16015625&step=99&view=display');
      for (const shape of (version === 'before' ? ['square'] : ['square', 'rectangle'])) {
        if (shape === 'rectangle') {
          await a.btn('Return to piece').click(); const before = await a.recipe(); await a.btn('Revisit fold').click(); await a.settle(); assert.equal(await a.page.evaluate(() => paperCouture.controller.step), 0);
          await a.btn('Rectangle').click(); assert.equal(await a.page.evaluate(() => paperCouture.options.broochShape), shape); assert.deepEqual(await a.recipe(), before);
          await a.finish(); await a.btn('Display').click(); await a.settle();
        }
        for (const cm of (version === 'before' ? [6] : [3.6, 4.5, 5.4])) {
          if (await a.page.locator('.pinboard-dialog').evaluate(e => e.open)) await a.btn('Return to piece').click();
          await a.capture(cm, .32, 1.08); assert.deepEqual((await a.state()).items.slice(0, -1), retained);
          for (const [width, height] of [[1100, 800], [390, 844], [320, 568]]) {
            await a.page.setViewportSize({ width, height }); await a.page.locator('.board-tools').evaluate(e => { e.scrollTop = 0; });
            const m = await a.page.evaluate(() => {
              const b = paperCouture.pinboard, r = b.canvas.getBoundingClientRect();
              return { viewport: [innerWidth, innerHeight], board: [r.width, r.height], overflow: document.documentElement.scrollWidth > innerWidth,
                pieces: b.state.items.map(i => { const box = b.selection.box.clone().setFromObject(b.groups.get(i.id), true); return { title: i.title, cm: i.paperSize.sideCm, bounds: [box.min.x, box.max.x, box.min.y, box.max.y], pixels: [(box.max.x - box.min.x) * r.width / 3.6, (box.max.y - box.min.y) * r.height / 4.2] }; }) };
            });
            assert(!m.overflow); for (const p of m.pieces) assert(p.bounds[0] >= -1.72 && p.bounds[1] <= 1.72 && p.bounds[2] >= -2.02 && p.bounds[3] <= 2.02);
            if (version === 'after' && cm === 4.5) { assert(m.pieces[4].pixels[0] >= 24 && m.pieces[4].pixels[1] >= 21); assert(m.pieces[4].pixels[0] / m.pieces[2].pixels[0] < .46, 'Brooch is under half the hat width'); }
            result.outfits.push({ version, shape, cm, ...m }); await a.shot(`outfit-${version}-${shape}-${cm}-${width}`);
          }
          if (cm === 4.5 || version === 'before') {
            await a.exportPNG(`outfit-${version}-${shape}-${cm}`);
            if (shape === 'rectangle') { newSave = await a.raw(); fs.writeFileSync(path.join(out, 'new-rectangle-outfit.json'), newSave); newPNG = await a.exportPNG('new-rectangle-outfit'); }
          }
          await a.btn('Remove selected').click(); assert.deepEqual((await a.state()).items, retained);
        }
      }
    });
    await visit(baseline, newSave, async a => { await a.load(''); await a.open(); assert.equal(await a.raw(), newSave); assert.deepEqual(await a.state(), JSON.parse(newSave)); assert.deepEqual(await a.exportPNG('pr25-reads-new-rectangle-outfit'), newPNG); });
    result.checks.push('Complete top/skirt/hat/capelet/brooch outfit: before 6cm, candidate 3.6/4.5/5.4cm squares and rectangles at desktop/390/320. Existing four captures stay exact through size and real Revisit shape changes. Default 4.5cm accents remain >=24×21px at 320; <46% of hat width. PR25 reads new rectangle outfit pixel-identically.');
    assert.deepEqual(result.errors, []); result.passed = true;
  } catch (e) { result.failure = String(e); throw e; }
  finally { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2)); await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
