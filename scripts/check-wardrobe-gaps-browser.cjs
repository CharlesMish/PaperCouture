// Trousers, cloche, shell top, kinchaku pouch, the retired designs and the four
// newly curated papers in the real app, by their actual controls: the design list
// and the chooser, each colour choice at the first fold, every step forward and
// back, a revisit of the choice from the finished piece, Display presets, a board
// outfit at the suggested sizes, the papers in the curated group, and phone widths.
// Isolated local contexts only; never reads the owner's browser profile or saved
// board.
//
//   BASE_URL=http://127.0.0.1:4173 CAPTURE_DIR=docs/wardrobe-gaps/evidence/browser node scripts/check-wardrobe-gaps-browser.cjs
//
// Browser checks use Chromium with software WebGL and emulated touch: they are
// not a real phone, mobile Safari or physical paper.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://127.0.0.1:4173';
const out = process.env.CAPTURE_DIR || 'docs/wardrobe-gaps/evidence/browser';
const PIECES = [
  { id: 'trousers', name: 'Trousers', note: /hips joined to the crotch/, print: 'Printed trousers', reverse: 'Reverse-colour trousers', key: 'trousers', option: 'trousersSide', steps: { print: 9, reverse: 9 }, cm: 20 },
  { id: 'cloche', name: 'Cloche', note: /bell-shaped hat/, print: 'Printed cloche', reverse: 'Reverse-colour cloche', key: 'cloche', option: 'clocheSide', steps: { print: 8, reverse: 9 }, cm: 10 },
  { id: 'shell-top', name: 'Shell top', note: /sleeveless shell/, print: 'Printed top', reverse: 'Reverse-colour top', key: 'shell-top', option: 'shellSide', steps: { print: 7, reverse: 6 }, cm: 10 },
  { id: 'kinchaku', name: 'Kinchaku pouch', note: /gathered neck/, steps: { print: 9 }, cm: 10 },
];
const RETIRED = ['tunic', 'tabard', 'hat', 'boat-top', 'apron'];
const PAPERS = ['Kami vermilion', 'Kami indigo', 'Marbled endpaper', 'Woven checks'];
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
    // the chooser: the new pieces are browsable, the retired ones are not
    await load('design=dress&paper=kami-vermilion&step=0');
    await btn('Browse pieces').click();
    const dialog = page.getByRole('dialog', { name: 'Choose a piece to fold' });
    const cards = await dialog.locator('.design-card').evaluateAll((cs) => cs.map((c) => c.dataset.design));
    for (const p of PIECES) assert(cards.includes(p.id), `${p.id} is in the chooser`);
    for (const id of RETIRED) assert(!cards.includes(id), `${id} is retired from the chooser`);
    await shot('chooser');
    await dialog.getByRole('button', { name: 'Trousers', exact: true }).click(); await settle();
    assert.equal((await state()).design, 'trousers');
    // the name selector keeps every design; retired ones are hidden options, and a link still opens them
    const options = await page.getByLabel('Garment design').locator('option').evaluateAll((xs) => xs.map((x) => ({ id: x.value, hidden: x.hidden })));
    assert.equal(new Set(options.map((o) => o.id)).size, 31);
    assert.deepEqual(options.filter((o) => o.hidden).map((o) => o.id).sort(), [...RETIRED].sort());
    for (const id of RETIRED) {
      await load(`design=${id}&paper=oat-linen&step=99&view=display`);
      assert.equal((await state()).design, id, `${id} still opens by link`);
    }
    await shot('retired-hat-by-link');
    result.checks.push(`Chooser lists the four new pieces and none of the retired (${RETIRED.join(', ')}); the name selector keeps all 31 with the retired hidden; each retired design still opens by link.`);

    for (const p of PIECES) {
      await load(`design=${p.id}&paper=kami-indigo&step=0`);
      assert.equal(await page.getByLabel('Garment design').inputValue(), p.id);
      assert.match(await page.locator('.studio-note').innerText(), p.note);
      if (p.print) {
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
      } else {
        assert.equal(await page.locator('.shape-choices').isVisible(), false, `${p.id}: no choice`);
      }
      assert.equal((await state()).total, p.steps.print);
      for (let i = 0; i < p.steps.print; i++) { await advance(); await shot(`${p.id}-step-${i + 1}`); }
      for (let i = 0; i < 2; i++) await back();
      for (let i = 0; i < 2; i++) await advance();
      if (p.key) assert(!new RegExp(`${p.key}=reverse`).test(page.url()), `${p.id}: the default choice is not written to the URL`);
      if (await btn('Display').isVisible()) { await btn('Display').click(); await settle(); }
      for (const v of ['Front', 'Angle', 'Back']) { await btn(v).click(); await settle(); await shot(`${p.id}-display-${v.toLowerCase()}`); }
      result.checks.push(`${p.id}: design list and note, ${p.print ? 'colour choice at the first fold (aria-pressed, URL), both colourways finished, revisit from the finished piece, ' : 'no colour choice, '}every step forward and back by the buttons, Display front/angle/back.`);
    }
    // the papers: in the curated group, each drawn on the finished shell top
    await load('design=shell-top&paper=oat-linen&step=99&view=display');
    const curatedNames = await page.evaluate(() => { const names = []; let on = false; for (const el of document.querySelector('.swatches').children) { if (el.classList.contains('paper-group-label')) on = el.textContent === 'Curated'; else if (on) names.push(el.getAttribute('aria-label') || el.title || el.textContent); } return names; });
    const labels = await page.locator('.paper-group-label').allTextContents();
    assert.deepEqual(labels, ['Curated', 'Experiments'], 'one curated group and one experiments group');
    for (const name of PAPERS) {
      assert(curatedNames.some((n) => n && n.includes(name)), `${name} is curated (${curatedNames.join(', ')})`);
      await page.getByRole('radio', { name, exact: true }).click(); await settle();
      assert.equal(await page.getByRole('radio', { name, exact: true }).getAttribute('aria-checked'), 'true');
      await shot(`paper-${name.toLowerCase().replace(/ /g, '-')}`);
    }
    result.checks.push(`The four papers (${PAPERS.join(', ')}) are in the curated group and draw on the finished shell top.`);
    await context.close();
    // the board: an outfit at the suggested sizes
    {
      const b = await make();
      const place = (x, y) => b.page.evaluate(({ x, y }) => { const p = paperCouture.pinboard; p.mutate(() => { const i = p.state.items.at(-1); i.x = x; i.y = y; p.position(); p.constrain(i.id); }); }, { x, y });
      // one-square trousers come out about a third of their square, so the rest of
      // this outfit is folded small: the shell top at its suggested 10 cm, the
      // cloche and the pouch at the smallest offered size, 8 cm
      for (const [q, suggested, cm, x, y] of [['design=trousers&paper=kami-indigo', 20, 20, -0.3, -0.42], ['design=shell-top&paper=kami-vermilion', 10, 10, -0.3, 0.12], ['design=cloche&paper=asanoha', 10, 8, -0.3, 0.5], ['design=kinchaku&paper=marbled-endpaper', 10, 8, 0.3, -0.3]]) {
        await b.load(`${q}&step=99&view=display`);
        await b.page.getByRole('button', { name: /^View board/ }).click();
        const size = b.page.getByLabel('Starting square size');
        assert.equal(Number(await size.inputValue()), suggested, `${q}: suggested size`);
        if (cm !== suggested) await size.selectOption(String(cm));
        await b.btn('Pin current piece').click(); await place(x, y);
      }
      const sizes = await b.page.evaluate(() => paperCouture.pinboard.state.items.map((i) => i.paperSize.sideCm));
      assert.deepEqual(sizes, [20, 10, 8, 8]);
      await b.shot('board-outfit');
      result.checks.push('Board: suggested sizes trousers 20 cm, shell top 10 cm, cloche and kinchaku 10 cm; an outfit pinned with the cloche and pouch at 8 cm.');
      await b.context.close();
    }
    // phone widths, by tapping
    for (const [w, h] of [[390, 844], [320, 568]]) {
      for (const p of PIECES) {
        const ph = await make(w, h, true);
        await ph.load(`design=${p.id}&paper=kami-vermilion&step=0`);
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
    result.checks.push('Phone-sized 390 x 844 and 320 x 568 with emulated touch: all four pieces fold by tapping; no horizontal page scroll.');
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
