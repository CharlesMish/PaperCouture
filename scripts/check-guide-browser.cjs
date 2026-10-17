// Focused production checks for independently movable dressing guides. All
// board mutations use real controls, pointer/touch gestures, or keyboard input.
// Diagnostic reads inspect saved data and rendered bounds; no source imports.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const base = process.env.BASE_URL || 'http://127.0.0.1:5657';
const out = process.env.CAPTURE_DIR || '.october-qa/guides';
const key = 'paper-couture.pinboard.v1';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 },
    hasTouch: true, reducedMotion: 'reduce', acceptDownloads: true });
  const page = await context.newPage(); page.setDefaultTimeout(60000);
  const result = { checks: [], exports: {}, mobile: [], errors: [], sourceRequests: [], physicalPhoneTested: false };
  page.on('pageerror', error => result.errors.push(String(error)));
  page.on('request', request => {
    if (/\/(src|node_modules|@vite)\//.test(new URL(request.url()).pathname)) result.sourceRequests.push(request.url());
  });
  const btn = name => page.getByRole('button', { name, exact: true });
  const control = name => page.getByLabel(name, { exact: true });
  const state = () => page.evaluate(() => structuredClone(paperCouture.pinboard.state));
  const raw = () => page.evaluate(k => localStorage.getItem(k), key);
  const settle = () => page.waitForFunction(() => window.paperCouture && !paperCouture.controller.moving
    && paperCouture.view.t === paperCouture.view.target && !paperCouture.displayCam.glide);
  const open = () => page.getByRole('button', { name: /^View board/ }).click();
  const details = async summary => {
    const element = page.locator('summary').filter({ hasText: new RegExp(`^${summary}$`) });
    if (!await element.evaluate(e => e.parentElement.open)) await element.click();
  };
  const tools = async () => { await details('Finish & photograph'); await details('Adjust guides'); };
  const scaleTo = async value => { await control('Guide size').fill(String(value)); await control('Guide size').dispatchEvent('change'); };
  const mode = async enabled => {
    if (enabled && await btn('Move guide').isVisible()) await btn('Move guide').click();
    if (!enabled && await btn('Done moving guide').isVisible()) await btn('Done moving guide').click();
  };
  const png = async (name, photograph = false) => {
    const [download] = await Promise.all([page.waitForEvent('download'), btn(photograph ? 'Save photograph' : 'Save PNG').click()]);
    const file = path.join(out, name + '.png'); await download.saveAs(file);
    const bytes = fs.readFileSync(file), data = { sha256: sha(bytes), width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
    result.exports[name] = data; return data;
  };
  const guideBounds = () => page.evaluate(() => {
    const b = paperCouture.pinboard, guide = b.decor.root.children.find(child => child.userData.decor === 'figure-guides');
    if (!guide) return [];
    guide.updateMatrixWorld(true);
    return guide.children.map(child => {
      const box = b.selection.box.clone().setFromObject(child, true);
      return { min: box.min.toArray(), max: box.max.toArray() };
    });
  });
  const bounded = async () => {
    const current = await state(), halfWidth = current.format === 'roomy' ? 2.4 : 1.8, halfHeight = current.format === 'roomy' ? 2.8 : 2.1;
    const bounds = await guideBounds();
    for (const box of bounds) {
      assert(box.min[0] >= -halfWidth - 1e-5 && box.max[0] <= halfWidth + 1e-5
        && box.min[1] >= -halfHeight - 1e-5 && box.max[1] <= halfHeight + 1e-5,
      `Guide must remain inside the board: ${JSON.stringify({ format: current.format, box })}`);
    }
    return bounds;
  };
  const sameItems = async expected => assert.deepEqual((await state()).items, expected, 'Guide changes must leave every garment record exact');
  const readable = async locator => {
    await locator.scrollIntoViewIfNeeded();
    const value = await locator.evaluate(element => {
      const r = element.getBoundingClientRect();
      return { fit: r.x >= -1 && r.right <= innerWidth + 1 && r.y >= -1 && r.bottom <= innerHeight + 1,
        hit: element.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)),
        disabled: element.disabled, box: [r.x, r.y, r.width, r.height] };
    });
    assert(value.fit && value.hit && !value.disabled, `Guide control is reachable: ${JSON.stringify(value)}`); return value;
  };
  try {
    const legacy = fs.readFileSync(path.join(__dirname, '../docs/companion-studies/fixtures/pr24-five-piece.json'), 'utf8');
    await page.goto(base + '/?step=99&view=display'); await settle();
    await page.evaluate(({ key, legacy }) => localStorage.setItem(key, legacy), { key, legacy });
    await page.reload(); await settle(); await open(); assert.equal(await raw(), legacy);
    const items = (await state()).items;
    await details('Finish & photograph');
    await control('Board surface').selectOption('natural'); await control('Pin style').selectOption('brass');
    await control('Figure guide').selectOption('two'); await control('Board lighting').selectOption('soft');
    await control('Include guide in photograph').check();
    assert.equal((await state()).appearance.guideTransforms, undefined, 'Default guides must not invent saved poses');
    const defaults = await state(), defaultBounds = await bounded(), defaultPNG = await png('default-two-guides');
    if (process.env.CHECK_606_GUIDE_BASELINE === '1') {
      // Frozen 606c420 local Chromium/SwiftShader result, not a cross-GPU target.
      const expected = '6388bd984eb309afdc1fde429db32dce07e9c72a32eeac95eaa5fb8f6613be40';
      assert.equal(defaultPNG.sha256, expected, 'Existing default guides must render identically to 606c420 in the retained local runtime');
      result.previousDefaultComparison = { commit: '606c420', sha256: expected, matched: true };
    } else result.previousDefaultComparison = 'Not requested; set CHECK_606_GUIDE_BASELINE=1 only in the matching retained local browser runtime.';
    const defaultRaw = await raw(); await page.reload(); await settle(); await open();
    assert.equal(await raw(), defaultRaw); assert.deepEqual(await state(), defaults);
    result.checks.push('Old records open without a write; default guide poses remain implicit and survive reload without schema migration.');

    await tools(); await control('Guide to adjust').selectOption('left');
    await btn('Guide right').click(); await btn('Guide up').click(); await scaleTo(90);
    const leftOnly = await state(), leftPose = leftOnly.appearance.guideTransforms.left;
    assert(leftPose && leftPose.scale === .9); assert.equal(leftOnly.appearance.guideTransforms.right, undefined);
    assert.deepEqual((await bounded())[1], defaultBounds[1]); await sameItems(items);
    await control('Guide to adjust').selectOption('right');
    await btn('Guide left').click(); await btn('Guide down').click(); await scaleTo(110);
    const independent = await state(); assert.deepEqual(independent.appearance.guideTransforms.left, leftPose);
    assert.equal(independent.appearance.guideTransforms.right.scale, 1.1); await bounded(); await sameItems(items);
    await control('Figure guide').selectOption('one');
    assert.equal(await control('Guide to adjust').inputValue(), 'one');
    await btn('Guide up').click(); await scaleTo(85);
    const oneAndTwo = await state(); assert.equal(oneAndTwo.appearance.guideTransforms.one.scale, .85);
    assert.deepEqual(oneAndTwo.appearance.guideTransforms.left, independent.appearance.guideTransforms.left);
    assert.deepEqual(oneAndTwo.appearance.guideTransforms.right, independent.appearance.guideTransforms.right);
    await control('Figure guide').selectOption('none'); assert.deepEqual((await state()).appearance.guideTransforms, oneAndTwo.appearance.guideTransforms);
    await control('Figure guide').selectOption('two'); assert.deepEqual((await state()).appearance.guideTransforms, oneAndTwo.appearance.guideTransforms);
    await control('Guide to adjust').selectOption('left'); const beforeReset = await state();
    await btn('Reset guide').click(); assert.deepEqual((await bounded())[0], defaultBounds[0]);
    assert.deepEqual((await state()).appearance.guideTransforms.right, beforeReset.appearance.guideTransforms.right);
    await btn('Undo').click(); assert.deepEqual(await state(), beforeReset); await sameItems(items);
    result.checks.push('Left, right and single guides move/scale independently; Off retains poses; Reset and Undo preserve the other guide and every garment record.');

    await control('Include guide in photograph').uncheck();
    const excluded = await png('guides-excluded'); await btn('Guide right').click(); await scaleTo(95);
    assert.deepEqual(await png('moved-guides-excluded'), excluded, 'Excluded guides must not affect exported pixels');
    await control('Include guide in photograph').check();
    await control('Pin style').selectOption('white'); const white = await png('white-pins');
    await control('Pin style').selectOption('black'); const black = await png('black-pins');
    assert.notEqual(white.sha256, black.sha256, 'White and black pins are visibly distinct'); await sameItems(items);
    const kept = await state(), keptPNG = black, keptRaw = await raw();
    await page.reload(); await settle(); await open(); assert.equal(await raw(), keptRaw); assert.deepEqual(await state(), kept);
    assert.deepEqual(await png('custom-guides-reloaded'), keptPNG);
    await tools(); await btn('Photograph').click();
    assert(!await control('Guide to adjust').isVisible() && !await control('Guide size').isVisible(), 'Photograph hides guide-editing controls');
    assert.deepEqual(await state(), kept); assert.deepEqual(await png('custom-guides-photograph', true), keptPNG);
    await page.screenshot({ path: path.join(out, 'guides-photograph.png') });
    await btn('Back to arranging').click(); assert.deepEqual(await state(), kept);
    result.checks.push('Excluded guides leave exports unchanged; white/black pins differ; custom guides persist and photograph/export content matches exactly.');

    await tools(); await control('Board size').selectOption('roomy');
    await control('Guide to adjust').selectOption('left'); await scaleTo(150); await mode(true);
    let canvas = await page.locator('.pinboard-canvas').boundingBox();
    await page.mouse.move(canvas.x + canvas.width * .12, canvas.y + canvas.height * .12); await page.mouse.down();
    await page.mouse.move(canvas.x + canvas.width * .9, canvas.y + canvas.height * .9, { steps: 5 }); await page.mouse.up();
    await bounded(); await mode(false);
    const roomyPoses = (await state()).appearance.guideTransforms;
    await control('Board size').selectOption('standard');
    assert.deepEqual((await state()).appearance.guideTransforms, roomyPoses, 'Board-size rendering clamps must not rewrite saved guide poses');
    result.standardClampedBounds = await bounded(); await sameItems(items);
    await btn('Undo').click(); assert.equal((await state()).format, 'roomy');
    assert.deepEqual((await state()).appearance.guideTransforms, roomyPoses);
    await control('Guide to adjust').selectOption('left'); await btn('Reset guide').click(); await scaleTo(80);
    result.checks.push('A 150% guide and large pointer movement remain within Roomy; Standard clamps the rendered pose without rewriting it; Undo restores the larger-board view.');

    for (const [width, height] of [[390, 844], [320, 568]]) {
      await page.setViewportSize({ width, height }); await tools(); await control('Guide to adjust').selectOption('left'); await scaleTo(80);
      const controls = [];
      for (const name of ['Guide to adjust', 'Guide size']) controls.push(await readable(control(name)));
      for (const name of ['Guide left', 'Guide right', 'Guide up', 'Guide down', 'Reset guide']) controls.push(await readable(btn(name)));
      await mode(true); canvas = await page.locator('.pinboard-canvas').boundingBox();
      // Deliberately start away from guide strokes: moving mode provides the
      // whole board as a large target instead of requiring a thin-line hit.
      const x = canvas.x + canvas.width * .1, y = canvas.y + canvas.height * .12;
      const cdp = await context.newCDPSession(page);
      const touch = (type, dx = 0, dy = 0) => cdp.send('Input.dispatchTouchEvent', { type,
        touchPoints: ['touchEnd', 'touchCancel'].includes(type) ? [] : [{ x: x + dx, y: y + dy, id: 1 }] });
      const before = await state(), saved = await raw();
      const history = await page.evaluate(() => paperCouture.pinboard.history.length);
      await touch('touchStart'); await touch('touchMove', 20, 12);
      await page.waitForFunction(before => JSON.stringify(paperCouture.pinboard.state) !== before, JSON.stringify(before));
      await touch('touchCancel');
      await page.waitForFunction(before => JSON.stringify(paperCouture.pinboard.state) === before, JSON.stringify(before));
      assert.equal(await raw(), saved); assert.equal(await page.evaluate(() => paperCouture.pinboard.history.length), history);
      await touch('touchStart'); await touch('touchMove', 20, 12); await touch('touchEnd');
      await page.waitForFunction(({ key, saved }) => localStorage.getItem(key) !== saved, { key, saved });
      assert.notDeepEqual((await state()).appearance.guideTransforms.left, before.appearance.guideTransforms.left);
      assert.deepEqual((await state()).appearance.guideTransforms.right, before.appearance.guideTransforms.right);
      await sameItems(items); await bounded();
      await btn('Undo').click(); assert.deepEqual(await state(), before);
      await mode(true); const keyboardBefore = await state(); await page.locator('.pinboard-canvas').focus(); await page.keyboard.press('ArrowRight');
      assert.notDeepEqual((await state()).appearance.guideTransforms.left, keyboardBefore.appearance.guideTransforms.left);
      await sameItems(items); await bounded(); await btn('Undo').click(); assert.deepEqual(await state(), keyboardBefore);
      await mode(false);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      await page.screenshot({ path: path.join(out, `guide-controls-${width}.png`) });
      result.mobile.push({ width, height, controls, touchCancel: true, touchCommit: true, keyboardNudge: true }); await cdp.detach();
    }
    result.checks.push('390/320px: full-board touch target moves only the selected guide; cancellation leaves save/history exact, commit and Undo work, keyboard nudges are an alternative, and controls are reachable.');
    await sameItems(items); assert.deepEqual(result.errors, []); assert.deepEqual(result.sourceRequests, []); result.passed = true;
  } catch (error) {
    result.failure = String(error); await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {}); throw error;
  } finally {
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2)); await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
