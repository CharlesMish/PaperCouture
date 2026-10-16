// Zori, folding fan and the four classic papers in the real app, by their actual
// controls: the design list, each colour choice at the first fold, every step
// forward and back, a revisit of the choice from the finished piece, Display
// presets, board captures at the suggested sizes (a pair of zori and a fan, with
// pieces that overlap nothing resting on the board), the four papers in the
// curated group, and phone widths. Isolated local contexts only; never reads the
// owner's browser profile or saved board.
//
//   BASE_URL=http://127.0.0.1:4173 CAPTURE_DIR=docs/kimono-companions/evidence/browser node scripts/check-zori-sensu-browser.cjs
//
// Browser checks use Chromium with software WebGL and emulated touch: they are
// not a real phone, mobile Safari or physical paper.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://127.0.0.1:4173';
const out = process.env.CAPTURE_DIR || 'docs/kimono-companions/evidence/browser';
const PIECES = [
  { id: 'zori', note: /thong of the other colour/, print: 'Printed sole', reverse: 'Reverse-colour sole', key: 'zori', option: 'zoriSide', steps: { print: 8, reverse: 9 }, cm: 8 },
  { id: 'sensu', note: /eleven panels/, print: 'Printed fan', reverse: 'Reverse-colour fan', key: 'sensu', option: 'sensuSide', steps: { print: 7, reverse: 7 }, cm: 7.5 },
];
const PAPERS = ['Seigaiha waves', 'Asanoha', 'Polka dot', 'Houndstooth'];
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const result = { base, checks: [], errors: [], physicalPaperTested: false, physicalPhoneTested: false };
  fs.mkdirSync(out, { recursive: true });
  const make = async (width = 1180, height = 900, touch = false) => {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', hasTouch: touch, isMobile: touch });
    const page = await context.newPage(); page.setDefaultTimeout(30000);
    page.on('pageerror', (e) => result.errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') result.errors.push(m.text()); });
    const btn = (name) => page.getByRole('button', { name, exact: true });
    const settle = () => page.waitForFunction(() => window.paperCouture && !paperCouture.controller.moving && paperCouture.view.t === paperCouture.view.target && !paperCouture.displayCam.glide);
    const state = () => page.evaluate(() => ({ design: paperCouture.garmentId, step: paperCouture.controller.step, total: paperCouture.timeline.ops.length }));
    const load = async (q) => { const r = await page.goto(base + '/?' + q); assert(r.ok()); await settle(); };
    const primary = () => page.locator('.dock:not([hidden]) .btn-primary');
    const advance = async () => { const before = (await state()).step; await primary().click(); if (await page.evaluate(() => paperCouture.controller.moving)) await primary().click(); await settle(); assert.equal((await state()).step, before + 1); };
    const back = async () => { const before = (await state()).step; await btn('Back').click(); if (await page.evaluate(() => paperCouture.controller.moving)) await btn('Back').click(); await settle(); assert.equal((await state()).step, before - 1); };
    const shot = (name) => page.screenshot({ path: path.join(out, name + '.png') });
    return { context, page, btn, settle, state, load, advance, back, shot };
  };
  try {
    const { context, page, btn, settle, state, load, advance, back, shot } = await make();
    for (const p of PIECES) {
      await load(`design=${p.id}&paper=seigaiha&step=0`);
      const ids = await page.getByLabel('Garment design').locator('option').evaluateAll((xs) => xs.map((x) => x.value));
      assert.deepEqual(ids.slice(ids.indexOf('boot-right'), ids.indexOf('boot-right') + 3), ['boot-right', 'zori', 'sensu']);
      assert.equal(await page.getByLabel('Garment design').inputValue(), p.id);
      assert.match(await page.locator('.studio-note').innerText(), p.note);
      assert.equal(await page.locator('.shape-choices').isVisible(), true, `${p.id}: colour choice at the first fold`);
      assert.equal(await btn(p.print).getAttribute('aria-pressed'), 'true', `${p.id}: printed is the default`);
      assert.equal((await state()).total, p.steps.print);
      await btn(p.reverse).click(); await settle();
      assert.equal((await state()).step, 0);
      assert.equal((await state()).total, p.steps.reverse);
      assert.match(page.url(), new RegExp(`${p.key}=reverse`));
      await shot(`${p.id}-choice`);
      for (let i = 0; i < p.steps.reverse; i++) await advance();
      await shot(`${p.id}-reverse-finished`);
      await back(); await advance();
      await page.getByLabel('Fold to revisit').selectOption(p.option);
      await btn('Revisit fold').click(); await settle();
      assert.equal((await state()).step, 0);
      await btn(p.print).click(); await settle();
      assert.equal((await state()).total, p.steps.print);
      for (let i = 0; i < p.steps.print; i++) { await advance(); await shot(`${p.id}-print-step-${i + 1}`); }
      assert(!new RegExp(`${p.key}=reverse`).test(page.url()), `${p.id}: the default choice is not written to the URL`);
      if (await btn('Display').isVisible()) { await btn('Display').click(); await settle(); }
      for (const v of ['Front', 'Angle', 'Back']) { await btn(v).click(); await settle(); await shot(`${p.id}-display-${v.toLowerCase()}`); }
      result.checks.push(`${p.id}: design list, colour choice at the first fold (aria-pressed, URL), every step forward and back by the buttons, revisit from the finished piece, both colourways finished, Display front/angle/back.`);
    }
    // the papers: in the curated group, each drawn on the fan
    await load('design=sensu&paper=stripe-disc&step=99&view=display');
    // the swatch row is flat: a 'Curated' marker, its swatches, then an 'Experiments' marker
    const curatedNames = await page.evaluate(() => { const names = []; let on = false; for (const el of document.querySelector('.swatches').children) { if (el.classList.contains('paper-group-label')) on = el.textContent === 'Curated'; else if (on) names.push(el.getAttribute('aria-label')); } return names; });
    const group = { names: curatedNames };
    assert(group.names.length > 0, 'a curated group');
    for (const name of PAPERS) {
      assert(group.names.includes(name), `${name} is curated`);
      await page.getByRole('radio', { name, exact: true }).click(); await settle();
      assert.equal(await page.getByRole('radio', { name, exact: true }).getAttribute('aria-checked'), 'true');
      await shot(`paper-${name.toLowerCase().replace(/ /g, '-')}`);
    }
    result.checks.push(`The four papers (${PAPERS.join(', ')}) are in the curated group and draw on the finished fan.`);
    await context.close();
    // the board: a pair of zori and a fan at their suggested sizes; none overlaps another, so all rest on the board
    {
      const b = await make();
      const place = (x, y) => b.page.evaluate(({ x, y }) => { const p = paperCouture.pinboard; p.mutate(() => { const i = p.state.items.at(-1); i.x = x; i.y = y; p.position(); p.constrain(i.id); }); }, { x, y });
      for (const [q, cm, x, y] of [['design=zori&paper=asanoha', 8, -0.5, -0.6], ['design=zori&paper=asanoha', 8, -0.15, -0.6], ['design=sensu&paper=seigaiha', 7.5, 0.5, 0.4]]) {
        await b.load(`${q}&step=99&view=display`);
        await b.page.getByRole('button', { name: /^View board/ }).click();
        assert.equal(Number(await b.page.getByLabel('Starting square size').inputValue()), cm, `${q}: suggested size`);
        await b.btn('Pin current piece').click(); await place(x, y);
      }
      const depth = await b.page.evaluate(() => { const p = paperCouture.pinboard; return p.state.items.map((i) => { const box = p.selection.box.setFromObject(p.groups.get(i.id), true); return { min: box.min.z, max: box.max.z, size: i.paperSize.sideCm }; }); });
      assert.deepEqual(depth.map((d) => d.size), [8, 8, 7.5]);
      for (const d of depth) assert(Math.abs(d.min - depth[0].min) < 1e-6, 'pieces that overlap nothing rest on the board');
      // overlapping pieces still occupy disjoint depths
      await b.page.evaluate(() => { const p = paperCouture.pinboard; p.mutate(() => { const [a, c] = [p.state.items[0], p.state.items[2]]; c.x = a.x; c.y = a.y; p.position(); }); });
      const over = await b.page.evaluate(() => { const p = paperCouture.pinboard; return p.state.items.map((i) => { const box = p.selection.box.setFromObject(p.groups.get(i.id), true); return { min: box.min.z, max: box.max.z }; }); });
      assert(over[2].min > over[0].max, 'an overlapping later piece sits above');
      await b.shot('board');
      result.checks.push('Board: zori (8 cm) twice and the fan (7.5 cm) at their suggested sizes; pieces that overlap nothing rest at the same depth, and a piece moved over another sits above it.');
      await b.context.close();
    }
    // phone widths, by tapping
    for (const [w, h] of [[390, 844], [320, 568]]) {
      for (const p of PIECES) {
        const ph = await make(w, h, true);
        await ph.load(`design=${p.id}&paper=polka-dot&step=0`);
        for (let i = 0; i < p.steps.print; i++) {
          const before = (await ph.state()).step;
          await ph.page.locator('.dock:not([hidden]) .btn-primary').tap();
          if (await ph.page.evaluate(() => paperCouture.controller.moving)) await ph.page.locator('.dock:not([hidden]) .btn-primary').tap();
          await ph.settle(); assert.equal((await ph.state()).step, before + 1);
        }
        assert.equal(await ph.page.evaluate(() => document.documentElement.scrollWidth), w, 'no horizontal page scroll');
        await ph.shot(`phone-${w}-${p.id}`);
        await ph.context.close();
      }
    }
    result.checks.push('Phone-sized 390 x 844 and 320 x 568 with emulated touch: the zori and the fan fold by tapping; no horizontal page scroll.');
    assert.deepEqual(result.errors, []);
  } catch (e) {
    result.errors.push(String(e && e.stack || e));
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
    if (result.errors.length) process.exit(1);
  }
})();
