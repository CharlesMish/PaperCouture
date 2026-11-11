// Against a served build: BASE_URL=http://127.0.0.1:4173 node scripts/check-guest-papers.cjs
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function run() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1060, height: 800 }, reducedMotion: 'reduce' });
    context.setDefaultTimeout(50000);
    const page = await context.newPage();
    const base = process.env.BASE_URL || 'http://127.0.0.1:4173/';
    const boardKey = 'paper-couture.pinboard.v1';
    const storedBoard = p => p.evaluate(key => localStorage.getItem(key), boardKey);
    const errors = [];
    context.on('weberror', error => errors.push(error.error().message));
    await page.goto(base + '?design=dress&step=99&view=display');
    await page.getByRole('button', { name: 'Pinboard', exact: true }).click();
    await page.getByRole('button', { name: 'Pin current piece', exact: true }).click();
    const saved = await storedBoard(page);
    assert.equal(JSON.parse(saved).items.length, 1);
    await page.goto(base + '?design=jacket&paper=oat-linen&step=2&gallery=guests');
    const gallery = page.getByRole('dialog', { name: 'Guest papers' });
    await gallery.waitFor();
    const cards = gallery.locator('article');
    assert.equal(await cards.count(), 4);
    await gallery.locator('img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
    for (const text of ['Fable 5.2', 'Gemini Argon', 'Astra', 'Grok 4.7']) {
      assert.equal(await gallery.getByText(text, { exact: true }).count(), 1);
    }
    await page.keyboard.press('Escape');
    await gallery.waitFor({ state: 'hidden' });
    // Native dialog.close() hides the element before dispatching its close event.
    // Wait for the handler to return keyboard focus to the workshop.
    await page.waitForFunction(() => document.activeElement === document.querySelector('.guest-trigger'));
    const trigger = page.getByRole('button', { name: 'Guest papers', exact: true });
    await trigger.click();
    const links = gallery.getByRole('link');
    const recipes = [
      ['sensu', 'twice-folded', 2, 20], ['kimono', 'twice-folded', 0, 24],
      ['gown', 'kintsugi-celadon', 0, 24], ['coat-dress', 'kintsugi-celadon', 2, 24],
      ['camp-shirt', 'sardine-run', 0, 21.6], ['pleats', 'sardine-run', 1, 24],
      ['swing-coat', 'afternoon-fig', 0, 24], ['capelet', 'afternoon-fig', 0, 18],
    ];
    assert.equal(await links.count(), recipes.length);
    for (const [i, [design, paper, turn, size]] of recipes.entries()) {
      const [look] = await Promise.all([context.waitForEvent('page'), links.nth(i).click()]);
      await look.waitForFunction(() => window.paperCouture?.controller.finished && paperCouture.view.inDisplay);
      assert.deepEqual(await look.evaluate(() => [paperCouture.garmentId, paperCouture.paperId, paperCouture.quarterTurns]), [design, paper, turn]);
      if (design === 'kimono') assert.equal(new URL(look.url()).searchParams.get('kimono'), 'reverse');
      if (design === 'pleats') assert.equal(new URL(look.url()).searchParams.get('pleats'), 'deep');
      await look.getByRole('button', { name: 'Pinboard', exact: true }).click();
      assert.equal(await look.getByLabel('Starting square size').inputValue(), String(size));
      assert.equal(await storedBoard(look), saved);
      await look.getByRole('button', { name: 'Return to folding', exact: true }).click();
      await look.getByRole('radio', { name: 'Oat linen', exact: true }).click();
      assert.equal(await look.evaluate(() => paperCouture.paperId), 'oat-linen');
      await look.close();
      console.log(`Opened ${design} in ${paper} at ${size} cm and edited a copy.`);
    }
    assert.deepEqual(await page.evaluate(() => [paperCouture.garmentId, paperCouture.paperId, paperCouture.controller.step]), ['jacket', 'oat-linen', 2]);
    assert.equal(await storedBoard(page), saved);
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 780 });
      assert(await gallery.evaluate(dialog => dialog.scrollWidth <= dialog.clientWidth));
      await links.last().scrollIntoViewIfNeeded();
      assert(await links.last().isVisible());
    }
    assert.deepEqual(errors, []);
    console.log('Guest papers: eight editable finished looks, authored sizes, original work and pinboard retained, narrow gallery and keyboard return passed.');
  } finally {
    await browser.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
