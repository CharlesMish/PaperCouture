// Preserve five-piece styling fixtures while exercising the current 12-slot cap.
const assert = require('node:assert/strict');
module.exports = async function checkCapacity(page) {
  const btn = name => page.getByRole('button', { name, exact: true });
  const state = () => page.evaluate(() => structuredClone(paperCouture.pinboard.state));
  const before = await state();
  for (let n = before.items.length; n < 12; n++) {
    assert(await btn('Pin current piece').isEnabled());
    await btn('Pin current piece').click();
    assert.equal((await state()).items.length, n + 1);
    assert.deepEqual((await state()).items.slice(0, before.items.length), before.items);
  }
  const full = await state();
  const raw = await page.evaluate(() => localStorage.getItem('paper-couture.pinboard.v1'));
  assert(await btn('Board full · 12 pieces').isDisabled());
  await btn('Board full · 12 pieces').evaluate(e => e.click());
  assert.deepEqual(await state(), full);
  assert.equal(await page.evaluate(() => localStorage.getItem('paper-couture.pinboard.v1')), raw);
  for (let n = before.items.length; n < 12; n++) await btn('Undo').click();
  assert.deepEqual(await state(), before);
};
