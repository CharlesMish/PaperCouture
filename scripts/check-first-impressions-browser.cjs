// The first five minutes, in the real app (docs/first-impressions/NOTES.md):
// - Browse pieces: Easy, Medium and Advanced, easiest first, the Dress marked
//   Start here, experimental pieces tagged, mirror pairs on one card, and where each
//   started piece has got to; the design list grouped the same way;
// - a visit with a bare address returns to the piece, paper and step this device
//   left off at; Start over can be undone until the paper moves again;
// - labels: Rotate print, Change <choice> buttons, Pinboard (n/12), no developer
//   notes in the toolbar, and one toolbar row on a 1280 px screen when finished;
// - instructions show their measurements in cm and say which square;
// - Pin to pinboard on a finished piece pins it in one press (not twice), the board
//   opens with it, its arranging tools appear only once something is pinned, and no
//   paper size above 21.6 cm (8.5 in) is offered.
// Isolated local contexts only. Chromium with software WebGL: not a real phone.
//
//   BASE_URL=http://127.0.0.1:4173 CAPTURE_DIR=.first-impressions-qa node scripts/check-first-impressions-browser.cjs
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://127.0.0.1:4173';
const out = process.env.CAPTURE_DIR || '.first-impressions-qa';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const result = { base, checks: [], errors: [], physicalPhoneTested: false };
  fs.mkdirSync(out, { recursive: true });
  try {
    for (const [width, height, touch] of [[1280, 800, false], [390, 844, true]]) {
      const key = `${width}x${height}`;
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, reducedMotion: 'reduce' });
      const page = await context.newPage(); page.setDefaultTimeout(Number(process.env.CHECK_TIMEOUT_MS) || 60000);
      page.on('pageerror', (e) => result.errors.push(`${key}: ${e}`));
      const settle = () => page.waitForFunction(() => window.paperCouture && !paperCouture.controller.moving&&!paperCouture.cameraSettling && paperCouture.view.t === paperCouture.view.target);
      const load = async (q) => { assert((await page.goto(base + (q === undefined ? '/' : '/?' + q))).ok()); await settle(); };
      const btn = (name) => page.getByRole('button', { name, exact: true });
      const press = (l) => touch ? l.tap() : l.click();
      const state = () => page.evaluate(() => ({ id: paperCouture.garmentId, step: paperCouture.controller.step, paper: paperCouture.paperId }));
      const more = async () => { if (width < 720 && await btn('More').isVisible() && await page.locator('.more-toggle').getAttribute('aria-expanded') !== 'true') await press(btn('More')); };
      const shot = (name) => page.screenshot({ path: path.join(out, `${key}-${name}.png`) });

      // Browse pieces: tiers, Start here, Experimental, pairs, progress
      await load('design=kimono&paper=oat-linen&step=3');
      await load('design=mitten-left&step=2');
      await press(btn('Browse pieces'));
      const dialog = page.getByRole('dialog', { name: 'Choose a piece to fold' });
      await page.waitForFunction(() => document.querySelectorAll('.design-thumbnail svg').length === 25);
      assert.deepEqual(await dialog.locator('.design-tier h3').allInnerTexts(), ['Easy', 'Medium', 'Advanced']);
      const order = await dialog.locator('[data-design]').evaluateAll((els) => els.map((e) => e.dataset.design));
      assert.equal(order.length, 27, 'every design can be chosen');
      assert.deepEqual(order.slice(0, 3), ['dress', 'jacket', 'pleats'], 'easiest first, the Dress leading');
      assert.equal(order.at(-1), 'camp-shirt');
      const dress = dialog.locator('[data-design="dress"]');
      assert.match(await dress.innerText(), /Start here/);
      assert.match(await dress.innerText(), /6 steps · 20 cm square/);
      assert.match(await dialog.locator('[data-design="apron"]').innerText(), /Experimental/);
      assert.doesNotMatch(await dialog.locator('[data-design="kimono"]').innerText(), /Experimental/);
      assert.match(await dialog.locator('[data-design="kimono"]').innerText(), /3 of 8 steps done/, 'a started piece shows how far it got');
      const mittens = dialog.locator('.design-pair', { hasText: 'Mittens' });
      assert.equal(await mittens.locator('button').count(), 2, 'one card, a button for each hand');
      assert.match(await mittens.innerText(), /Left hand: 2 of 9 steps done/);
      assert.equal(await mittens.locator('[data-design="mitten-left"]').getAttribute('aria-pressed'), 'true');
      assert(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth), 'no sideways scroll');
      await shot('gallery');
      await press(mittens.getByRole('button', { name: 'Right mitten', exact: true })); await settle();
      assert.equal((await state()).id, 'mitten-right');
      assert.deepEqual(await page.getByLabel('Garment design', { exact: true }).locator('optgroup').evaluateAll((gs) => gs.map((g) => g.label)), ['Easy', 'Medium', 'Advanced']);
      result.checks.push(`${key}: Browse pieces in Easy/Medium/Advanced, Dress first with Start here, experimental tags, pairs on one card, progress shown; design list grouped the same way.`);

      // a bare address returns to where this device left off (piece, paper, step)
      await load('design=kimono&paper=oat-linen&step=3');
      await load();
      assert.deepEqual(await state(), { id: 'kimono', step: 3, paper: 'oat-linen' }, 'a bare visit resumes');
      await page.getByLabel('Garment design', { exact: true }).selectOption('dress'); await settle();
      assert.equal((await state()).step, 0);
      await page.getByLabel('Garment design', { exact: true }).selectOption('kimono'); await settle();
      assert.equal((await state()).step, 3, 'switching back resumes the design');
      result.checks.push(`${key}: a visit with no address state resumes the piece, paper and step; each design resumes where it was.`);

      // Start over, then Undo start over; the undo goes once the paper moves
      await press(btn('Start over'));
      assert.equal((await state()).step, 0);
      assert.equal(await btn('Undo start over').isVisible(), true);
      await shot('undo');
      await press(btn('Undo start over')); await settle();
      assert.equal((await state()).step, 3, 'Undo puts the folds back');
      assert.equal(await btn('Undo start over').isVisible(), false);
      await press(btn('Start over')); await press(page.locator('.dock:not(.display-dock) .btn-primary')); await settle();
      assert.equal((await state()).step, 1);
      assert.equal(await btn('Undo start over').isVisible(), false, 'folding again ends the undo');
      result.checks.push(`${key}: Start over offers Undo start over, which restores the step; folding again removes the offer.`);

      // labels and measurements
      assert.equal(await page.getByRole('button', { name: /^(?:Rotate print|Turn paper) \(now / }).count(), 1);
      await load('design=dress&step=0');
      assert.match(await page.locator('.step-no').innerText(), /Step 1 of 6 · on a 20 cm square/);
      assert.match(await page.locator('#step-hint').evaluate((e) => e.textContent), /by 2 cm/);
      if (width >= 1280) assert.equal(await page.locator('#step-hint').isVisible(), true, 'a short instruction shows in full');
      // a long instruction (a collapse, here): the title is the cue, the sequence opens with Instructions
      await load('design=coat-dress&step=1');
      assert.equal(await page.locator('.dock.long-hint').count(), 1);
      assert.equal(await page.locator('#step-hint').isVisible(), false, 'a long instruction starts behind Instructions');
      assert.match(await page.locator('.dock:not(.display-dock) .step-title').innerText(), /Collapse both shoulders/);
      await press(btn('Instructions'));
      assert.equal(await page.locator('#step-hint').isVisible(), true);
      await press(btn('Instructions'));
      await load('design=dress&step=6');
      await more();
      assert.equal(await btn('Change side folds').isVisible(), true);
      assert.equal(await btn('Change sleeves').isVisible(), true);
      assert.equal(await page.getByRole('button', { name: /^Pinboard \(0\/12\)$/ }).isVisible(), true);
      const toolbar = await page.locator('.studio-controls').innerText();
      assert.doesNotMatch(toolbar, /Fold first|Accessory optional|left\/right as viewed/);
      if (width >= 1280) {
        const tops = await page.locator('.studio-controls').evaluate((e) => [...e.children].filter((c) => c.getBoundingClientRect().height > 0).map((c) => c.getBoundingClientRect().top + c.getBoundingClientRect().height / 2));
        assert(Math.max(...tops) - Math.min(...tops) < 12, `the finished toolbar is one row at 1280 px ${JSON.stringify(tops)}`);
      }
      await shot('finished');
      await press(btn('Change side folds')); await settle();
      assert.equal((await state()).step, 2, 'Change side folds goes back to that choice');
      result.checks.push(`${key}: Rotate print; measurements in cm with the square named; a long (collapse) instruction behind Instructions with its title as the cue; Change buttons; Pinboard (n/12); no developer notes in the toolbar${width >= 1280 ? '; one toolbar row when finished' : ''}.`);

      // Pin to pinboard, once; arranging tools only once something is pinned; sizes capped
      if (await page.locator('.more-toggle').getAttribute('aria-expanded') === 'true') await page.keyboard.press('Escape');
      await load('design=jacket&step=0');
      await more();
      await press(page.getByRole('button', { name: /^(Pinboard|View board) \(/ }));
      const board = page.getByRole('dialog', { name: /Your pinboard/ });
      assert.equal(await board.getByLabel('Selected board piece').isVisible(), false, 'no arranging tools on an empty board');
      assert.equal(await board.getByRole('button', { name: 'Move left', exact: true }).isVisible(), false);
      await board.getByRole('button', { name: 'Return to piece', exact: true }).click();
      await load('design=dress&step=6');
      await press(btn('Pin to pinboard'));
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('paper-couture.pinboard.v1') || '{"items":[]}').items.length === 1);
      assert.equal(await board.isVisible(), true, 'the board opens with the pinned piece');
      assert.equal(await board.getByLabel('Selected board piece').isVisible(), true, 'arranging tools once pinned');
      const sizes = await board.getByLabel('Starting square size').locator('option').evaluateAll((os) => os.map((o) => [Number(o.value), o.textContent]));
      assert.deepEqual(sizes.map(([v]) => v), [16, 20, 21.6]);
      assert.match(sizes[2][1], /21\.6 cm square \(8\.5 in\)/);
      await shot('pinned');
      assert.match(await board.locator('[role=status]').allInnerTexts().then((t) => t.join(' ')), /Pinned from a 20 cm square, the suggested size/);
      await board.getByRole('button', { name: 'Return to piece', exact: true }).click();
      const items = () => page.evaluate(() => JSON.parse(localStorage.getItem('paper-couture.pinboard.v1')).items.length);
      // as clear a choice as Display: a full-size button beside it
      const [pinBox, displayBox] = [await btn('View on pinboard').boundingBox(), await btn('Display').boundingBox()];
      assert(pinBox.height >= 44 && displayBox.height >= 44, 'Pin and Display are both full-size buttons');
      await press(btn('View on pinboard'));
      assert.equal(await items(), 1, 'pressing again opens the board, without pinning twice');
      // Undo takes the piece off the board: the shortcut offers to pin it again (Astra's review)
      await board.getByRole('button', { name: 'Undo', exact: true }).click();
      assert.equal(await items(), 0);
      await board.getByRole('button', { name: 'Return to piece', exact: true }).click();
      // (the board's close event, which refreshes the dock, is dispatched just after the click)
      await btn('Pin to pinboard').waitFor({ state: 'visible', timeout: 5000 }).catch(() => assert.fail('after Undo the shortcut offers to pin again'));
      // a size chosen earlier for this piece is used, and the message names it (Astra's review)
      await press(btn('Pin to pinboard'));
      await board.getByRole('button', { name: 'Undo', exact: true }).click();
      await board.getByLabel('Starting square size').selectOption('16');
      await board.getByRole('button', { name: 'Return to piece', exact: true }).click();
      await press(btn('Pin to pinboard'));
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('paper-couture.pinboard.v1')).items.length === 1);
      const status = (await board.locator('[role=status]').allInnerTexts()).join(' ');
      assert.match(status, /Pinned from a 16 cm square\./, 'the message names the size used');
      assert.doesNotMatch(status, /suggested/);
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('paper-couture.pinboard.v1')).items[0].paperSize.sideCm), 16);
      await board.getByRole('button', { name: 'Return to piece', exact: true }).click();
      result.checks.push(`${key}: Pin to pinboard, a full-size button beside Display, pins once and opens the board; after Undo it offers to pin again; a size chosen earlier is used and named; arranging tools appear once pinned; paper sizes 16, 20, 21.6 cm (8.5 in), none larger.`);
      await context.close();
    }
    assert.deepEqual(result.errors, []);
    result.passed = true;
    console.log(result.checks.join('\n'));
  } finally {
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2));
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
