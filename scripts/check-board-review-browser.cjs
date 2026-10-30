// Production regression and matched captures for the independent 6284b4e review.
// REVIEW_BASELINE=1 records the earlier candidate without requiring the repairs.
// All interactions are real controls; diagnostic reads inspect actual geometry.
const { chromium, openBoard } = require('./lib/legacy-playwright.cjs');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const base = process.env.BASE_URL || 'http://127.0.0.1:5678';
const out = process.env.CAPTURE_DIR || '.october-qa/board-review/after';
const baseline = process.env.REVIEW_BASELINE === '1';
const key = 'paper-couture.pinboard.v1';
fs.mkdirSync(out, { recursive: true });
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/companion-studies/fixtures/pr24-five-piece.json'), 'utf8'));
const result = { baseline, browser: '', primary: [], selection: [], strokes: [], phones: [], errors: [], bundles: [], sourceRequests: [], physicalPhoneTested: false };

(async () => {
 const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
 result.browser = browser.version();
 async function create(viewport, mobile = false) {
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, acceptDownloads: true, reducedMotion: 'reduce' });
  const page = await context.newPage(); page.setDefaultTimeout(60000);
  page.on('pageerror', error => result.errors.push(String(error)));
  page.on('request', request => {
   const pathname = new URL(request.url()).pathname;
   if (/\/(src|node_modules|@vite)\//.test(pathname)) result.sourceRequests.push(pathname);
   if (/\/assets\/.*\.js$/.test(pathname) && !result.bundles.includes(pathname)) result.bundles.push(pathname);
  });
  const button = name => page.getByRole('button', { name, exact: true });
  const control = name => page.getByLabel(name, { exact: true });
  const summary = name => page.locator('summary').filter({ hasText: new RegExp(`^${name}$`) });
  const details = async (name, open = true) => {
   const s = summary(name);
   if (await s.evaluate(e => e.parentElement.open) !== open) {
    await s.click();
    // Native details toggles dispatch their event asynchronously; inspect the
    // rendered selection after that event and a paint, not during the click.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
   }
  };
  const state = () => page.evaluate(() => structuredClone(paperCouture.pinboard.state));
  const settle = () => page.waitForFunction(() => window.paperCouture && !paperCouture.controller.moving&&!paperCouture.cameraSettling && paperCouture.view.t === paperCouture.view.target && !paperCouture.displayCam.glide);
  const load = async value => {
   await page.goto(base + '/?step=99&view=display'); await settle();
   await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key, value });
   await page.reload(); await settle(); await openBoard(page);
  };
  const scale = async amount => { await control('Guide size').fill(String(amount)); await control('Guide size').dispatchEvent('change'); };
  const styles = locator => locator.evaluate(e => {
   const color = document.createElement('span'); color.style.background = 'var(--accent)'; e.append(color);
   const accent = getComputedStyle(color).backgroundColor; color.remove();
   return { label: e.textContent, disabled: e.disabled, hovered: e.matches(':hover'), background: getComputedStyle(e).backgroundColor, accent };
  });
  const selection = () => page.evaluate(() => {
   const b = paperCouture.pinboard;
   const bounds = object => { const box = b.selection.box.clone().setFromObject(object, true); return [...box.min.toArray(), ...box.max.toArray()]; };
   const guide = b.decor.guideInfo(b.guideTarget.value);
   return { visible: b.selection.visible, selected: [...b.selection.box.min.toArray(), ...b.selection.box.max.toArray()],
    guide: guide ? bounds(guide.object) : null, paper: b.state.selected ? bounds(b.groups.get(b.state.selected)) : null,
    guideOpen: b.guideAdjust.open, moving: b.movingGuide };
  });
  const png = async name => {
   const [download] = await Promise.all([page.waitForEvent('download'), button('Save PNG').click()]);
   const filename = path.join(out, name + '.png'); await download.saveAs(filename);
   return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
  };
  const paperPoint = () => page.evaluate(() => {
   const b = paperCouture.pinboard, group = b.groups.get(b.state.selected); group.updateMatrixWorld(true);
   let mesh; group.traverse(object => { if (!mesh && object.isMesh && object.geometry.attributes.position.count >= 3) mesh = object; });
   const a = group.position.clone().fromBufferAttribute(mesh.geometry.attributes.position, 0);
   const c = group.position.clone().fromBufferAttribute(mesh.geometry.attributes.position, 1);
   const d = group.position.clone().fromBufferAttribute(mesh.geometry.attributes.position, 2);
   const point = a.add(c).add(d).multiplyScalar(1/3).applyMatrix4(mesh.matrixWorld).project(b.camera);
   const rect = b.canvas.getBoundingClientRect();
   return { x: rect.x + (point.x+1)/2*rect.width, y: rect.y + (1-point.y)/2*rect.height };
  });
  return { context, page, button, control, details, state, load, scale, styles, selection, png, paperPoint };
 }
 try {
  const d = await create({ width: 1280, height: 900 }); const { page, button, control, details } = d;
  await d.load(fixture); const originalItems = (await d.state()).items;
  await details('Finish & photograph'); await control('Board surface').selectOption('natural');
  for (const name of ['Pin current piece', 'Save PNG']) {
   const b = button(name); await b.scrollIntoViewIfNeeded(); await page.mouse.move(2, 2);
   await b.screenshot({ path: path.join(out, name.replaceAll(' ', '-').toLowerCase() + '-rest.png') });
   await b.hover(); await page.waitForTimeout(200); const observation = await d.styles(b); result.primary.push({ viewport: 'desktop', ...observation });
   await b.screenshot({ path: path.join(out, name.replaceAll(' ', '-').toLowerCase() + '-hover.png') });
   if (!baseline) assert.equal(observation.background, observation.accent, `${name} retains accent on hover`);
  }
  await control('Figure guide').selectOption('two'); await details('Adjust guides');
  await control('Guide to adjust').selectOption('right'); await button('Guide right').click(); await d.scale(74);
  let selected = await d.selection(); result.selection.push({ operation: 'guide-controls-without-move-mode', ...selected });
  if (!baseline) { assert.equal(selected.moving, false); assert.equal(selected.visible, true); assert.deepEqual(selected.selected, selected.guide); }
  await page.locator('.pinboard-canvas').screenshot({ path: path.join(out, 'guide-selection-desktop.png') });
  const exportOpen = await d.png('guide-tools-open'); await details('Adjust guides', false);
  selected = await d.selection(); result.selection.push({ operation: 'closed-guide-drawer', ...selected });
  if (!baseline) assert.deepEqual(selected.selected, selected.paper);
  assert.equal(await d.png('guide-tools-closed'), exportOpen, 'Selection overlays stay out of exports');
  await details('Adjust guides');
  const ids = await control('Selected board piece').locator('option').evaluateAll(options => options.map(o => o.value).filter(Boolean));
  await control('Selected board piece').selectOption(ids.find(id => id !== fixture.selected) || ids[0]);
  selected = await d.selection(); result.selection.push({ operation: 'paper-selected-from-list', ...selected });
  if (!baseline) { assert.equal(selected.guideOpen, false); assert.deepEqual(selected.selected, selected.paper); }
  await details('Adjust guides'); const paperPoint = await d.paperPoint(); await page.mouse.click(paperPoint.x, paperPoint.y);
  selected = await d.selection(); result.selection.push({ operation: 'paper-selected-on-canvas', ...selected });
  if (!baseline) { assert.equal(selected.guideOpen, false); assert.deepEqual(selected.selected, selected.paper); }
  await details('Adjust guides'); await details('Finish & photograph', false);
  selected = await d.selection(); result.selection.push({ operation: 'outer-finishing-drawer-closed', ...selected });
  if (!baseline) assert.deepEqual(selected.selected, selected.paper);
  assert.deepEqual((await d.state()).items, originalItems);
  await details('Finish & photograph'); await button('Photograph').click(); await button('Save photograph').hover(); await page.waitForTimeout(200);
  const photographStyle = await d.styles(button('Save photograph')); result.primary.push({ viewport: 'desktop', ...photographStyle });
  if (!baseline) assert.equal(photographStyle.background, photographStyle.accent);
  await button('Back to arranging').click();
  await details('Finish & photograph'); await control('Board size').selectOption('roomy'); await control('Figure guide').selectOption('one'); await details('Adjust guides');
  for (const amount of [50, 100, 150]) {
   await d.scale(amount);
   const stroke = await page.evaluate(() => {
    const b = paperCouture.pinboard, info = b.decor.guideInfo('one'), group = info.object;
    group.updateMatrixWorld(true); const mesh = group.children.find(child => child.isMesh), attribute = mesh.geometry.attributes.position;
    const a = group.position.clone().fromBufferAttribute(attribute, 0).applyMatrix4(mesh.matrixWorld);
    const c = group.position.clone().fromBufferAttribute(attribute, 1).applyMatrix4(mesh.matrixWorld);
    return { scale: info.pose.scale, worldWidth: a.distanceTo(c), figureBounds: b.selection.box.clone().setFromObject(group, true).getSize(group.position.clone()).toArray() };
   });
   result.strokes.push({ requestedPercent: amount, ...stroke });
  }
  if (!baseline) for (const stroke of result.strokes) assert(Math.abs(stroke.worldWidth - result.strokes[1].worldWidth) < 1e-6, 'Guide stroke remains constant in board units at 50/100/150%');
  await d.context.close();
  for (const [width, height] of [[390, 844], [320, 568]]) {
   const m = await create({ width, height }, true);
   // An empty board isolates the small guide from overlapping paper for legibility.
   await m.load({ ...fixture, items: [], selected: null, format: 'standard' });
   await m.details('Finish & photograph'); await m.control('Board surface').selectOption('natural');
   await m.control('Figure guide').selectOption('one'); await m.details('Adjust guides');
   for (const amount of [50, 100]) {
    await m.scale(amount); await m.details('Adjust guides', false);
    await m.page.locator('.pinboard-canvas').screenshot({ path: path.join(out, `natural-guide-${amount}-${width}.png`) });
    await m.details('Adjust guides');
   }
   await m.load(fixture); await m.details('Finish & photograph'); await m.control('Board surface').selectOption('natural');
   await m.control('Figure guide').selectOption('two'); await m.details('Adjust guides');
   await m.control('Guide to adjust').selectOption('right'); await m.button('Guide right').tap(); await m.scale(74);
   const selectedPhone = await m.selection(); result.selection.push({ operation: `guide-controls-${width}-without-move`, ...selectedPhone });
   if (!baseline) assert.deepEqual(selectedPhone.selected, selectedPhone.guide);
   await m.page.locator('.pinboard-canvas').screenshot({ path: path.join(out, `guide-selection-${width}.png`) });
   const paperTouch = await m.paperPoint(); await m.page.touchscreen.tap(paperTouch.x, paperTouch.y);
   const paperSelected = await m.selection(); result.selection.push({ operation: `paper-selected-by-touch-${width}`, ...paperSelected });
   if (!baseline) { assert.equal(paperSelected.guideOpen, false); assert.deepEqual(paperSelected.selected, paperSelected.paper); }
   assert.deepEqual((await m.state()).items, fixture.items);
   // Record whether touch leaves the revealed Save action hovered; either way,
   // the newly available action must keep its filled background.
   await m.details('Adjust guides', false); await m.button('Photograph').tap(); await m.page.waitForTimeout(200);
   const observation = await m.styles(m.button('Save photograph')); result.primary.push({ viewport: width, ...observation });
   await m.page.screenshot({ path: path.join(out, `phone-photograph-${width}.png`) });
   if (!baseline) assert.equal(observation.background, observation.accent, 'Save photograph stays filled after the phone tap');
   result.phones.push({ width, height, isMobile: true, deviceScaleFactor: 2, emulatedTouch: true });
   await m.context.close();
  }
  assert.deepEqual(result.errors, []); assert.deepEqual(result.sourceRequests, []); result.passed = true;
 } catch (error) { result.failure = String(error); throw error; }
 finally { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
