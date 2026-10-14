// Fresh production browser only. Fixtures are isolated test data; interactions
// use real board controls and pointer input, without importing source modules.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const base = process.env.BASE_URL || 'http://127.0.0.1:5647';
const out = process.env.CAPTURE_DIR || '.october-qa/presentation';
const key = 'paper-couture.pinboard.v1';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 },
    hasTouch: true, reducedMotion: 'reduce', acceptDownloads: true });
  const page = await context.newPage(); page.setDefaultTimeout(60000);
  const result = { checks: [], exports: {}, layouts: [], errors: [], sourceRequests: [], physicalPhoneTested: false };
  page.on('pageerror', e => result.errors.push(String(e)));
  page.on('request', r => { if (/\/(src|node_modules|@vite)\//.test(new URL(r.url()).pathname)) result.sourceRequests.push(r.url()); });
  const btn = name => page.getByRole('button', { name, exact: true });
  const control = name => page.getByLabel(name, { exact: true });
  const settle = () => page.waitForFunction(() => window.paperCouture && !paperCouture.controller.moving
    && paperCouture.view.t === paperCouture.view.target && !paperCouture.displayCam.glide);
  const state = () => page.evaluate(() => structuredClone(paperCouture.pinboard.state));
  const raw = () => page.evaluate(k => localStorage.getItem(k), key);
  const open = () => page.getByRole('button', { name: /^View board/ }).click();
  const garmentBounds = () => page.evaluate(() => {
    const b = paperCouture.pinboard;
    return b.state.items.map(item => {
      const group = b.groups.get(item.id), box = b.selection.box.clone().setFromObject(group, true), decor = [];
      group.traverse(object => { if (object.userData.decor) decor.push(object.userData.decor); });
      return { id: item.id, min: box.min.toArray(), max: box.max.toArray(), decor };
    });
  });
  const finishTools = async () => {
    const details = page.locator('details').filter({ has: control('Board surface') });
    if (await details.count() && !await details.evaluate(e => e.open)) await details.locator('summary').click();
  };
  const exported = async (name, photograph = false) => {
    const [download] = await Promise.all([page.waitForEvent('download'), btn(photograph ? 'Save photograph' : 'Save PNG').click()]);
    const file = path.join(out, name + '.png'); await download.saveAs(file);
    const bytes = fs.readFileSync(file);
    const data = { sha256: sha(bytes), width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
    result.exports[name] = data; return data;
  };
  const installFixture = async fixture => {
    await page.goto(base + '/?design=mitten-left&paper=oat-linen&step=99&view=display'); await settle();
    await page.evaluate(({ key, fixture }) => localStorage.setItem(key, fixture), { key, fixture });
    await page.reload(); await settle(); await open();
  };
  // Select a large triangle of the topmost captured piece. Its centroid is
  // on real paper, unlike a box centre that may land in a brooch/neck opening.
  const paperPoint = () => page.evaluate(() => {
    const b = paperCouture.pinboard, item = b.state.items.at(-1), group = b.groups.get(item.id);
    const r = b.canvas.getBoundingClientRect(), candidates = [];
    group.updateMatrixWorld(true); b.camera.updateMatrixWorld(true);
    group.traverse(object => {
      if (!object.isMesh || !object.visible) return;
      const attribute = object.geometry.getAttribute('position'); if (!attribute) return;
      for (let n = 0; n + 2 < attribute.count; n += 3) {
        const points = [0, 1, 2].map(offset => object.localToWorld(group.position.clone()
          .fromBufferAttribute(attribute, n + offset)).project(b.camera));
        const [a, c, d] = points;
        const area = Math.abs((c.x - a.x) * (d.y - a.y) - (c.y - a.y) * (d.x - a.x));
        const x = (a.x + c.x + d.x) / 3, y = (a.y + c.y + d.y) / 3;
        if (Math.abs(x) < .95 && Math.abs(y) < .95 && area > 1e-6)
          candidates.push({ area, x: r.x + (x + 1) / 2 * r.width, y: r.y + (1 - y) / 2 * r.height });
      }
    });
    candidates.sort((a, b) => b.area - a.area);
    return { id: item.id, point: candidates[0] };
  });
  const accessibleControl = async locator => {
    await locator.scrollIntoViewIfNeeded();
    const found = await locator.evaluate(e => {
      const r = e.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { label: e.getAttribute('aria-label') || e.textContent.trim(),
        box: [r.x, r.y, r.width, r.height], fit: r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1,
        centre: e.contains(hit), disabled: e.disabled };
    });
    assert(found.fit && found.centre && !found.disabled, `Unreachable control: ${JSON.stringify(found)}`);
    return found;
  };
  try {
    const legacy = fs.readFileSync(path.join(__dirname, '../docs/companion-studies/fixtures/pr24-five-piece.json'), 'utf8');
    await installFixture(legacy);
    assert.equal(await raw(), legacy, 'Opening an existing record must not migrate or save it');
    assert.deepEqual(await state(), JSON.parse(legacy));
    const legacyPNG = await exported('legacy');
    const legacyBounds = await garmentBounds();
    await finishTools();
    await control('Board surface').selectOption('natural');
    assert.deepEqual((await state()).items, JSON.parse(legacy).items);
    assert.deepEqual(await garmentBounds(), legacyBounds, 'Visible pins must not enter garment bounds or depth intervals');
    assert(legacyBounds.every(piece => piece.decor.length === 0));
    const corkPNG = await exported('cork'); assert.notEqual(corkPNG.sha256, legacyPNG.sha256);
    await btn('Undo').click();
    assert.deepEqual(await state(), JSON.parse(legacy));
    assert.deepEqual(await exported('legacy-after-appearance-undo'), legacyPNG);
    // Previously Undo read the stale DOM select, rendering the wrong backing.
    const originalBackground = JSON.parse(legacy).background;
    await control('Pinboard background').selectOption(originalBackground === 'Rose' ? 'Slate' : 'Rose');
    assert.notEqual((await exported('legacy-other-background')).sha256, legacyPNG.sha256);
    await btn('Undo').click(); assert.equal((await state()).background, originalBackground);
    assert.deepEqual(await exported('legacy-after-background-undo'), legacyPNG);
    result.checks.push('Legacy fixture opens without a write; surface and background Undo restore exact legacy state and 1800×2100 PNG.');

    const beforePlacementUndo = await state();
    await finishTools(); await control('Board surface').selectOption('natural');
    await btn('Place pin').click();
    assert(await page.evaluate(() => paperCouture.pinboard.placingPin));
    await btn('Undo').click();
    assert.deepEqual(await state(), beforePlacementUndo);
    assert.equal(await page.evaluate(() => paperCouture.pinboard.placingPin), false, 'Undoing cork must exit pin placement');
    assert.equal(await page.locator('.pinboard-canvas').evaluate(e => e.classList.contains('placing-pin')), false);
    assert(await btn('Place pin').isDisabled(), 'Legacy board cannot retain a live pin-placement mode');
    await control('Board surface').selectOption('natural');
    result.checks.push('Undoing the cork change while placing a pin restores original state and exits the placement interaction.');
    await control('Pin style').selectOption('brass');
    await control('Figure guide').selectOption('two');
    await control('Board lighting').selectOption('soft');
    await control('Include guide in photograph').uncheck();
    const withGuides = await state(), withoutGuidesPNG = await exported('styled-with-guide-excluded');
    await control('Figure guide').selectOption('none');
    assert.deepEqual(await exported('styled-no-guide'), withoutGuidesPNG, 'Excluded guide must not enter the export');
    await btn('Undo').click(); assert.deepEqual(await state(), withGuides);
    await control('Include guide in photograph').check();
    const includedPNG = await exported('styled-guide-included');
    assert.notEqual(includedPNG.sha256, withoutGuidesPNG.sha256, 'Included figure guides should be visible');
    // An automatic pin must retain its material location when a piece is
    // tilted after pin generation and later restored from a saved record.
    await control('Selected board piece').selectOption((await state()).items.at(-1).id);
    await control('Pinboard tilt').fill('12'); await control('Pinboard tilt').dispatchEvent('change');
    const tiltedPNG = await exported('styled-tilted');
    const styled = await state(), saved = await raw();
    await page.reload(); await settle(); await open(); assert.equal(await raw(), saved); assert.deepEqual(await state(), styled);
    assert.deepEqual(await exported('styled-reloaded'), tiltedPNG);
    result.checks.push('Cork, brass pins, lighting and guides preserve captured pieces; explicit guide inclusion works; tilted automatic pins and styled PNG survive reload exactly.');

    await finishTools();
    const candidate = await paperPoint(); assert(candidate.point, 'Topmost paper has a triangle for pointer placement');
    await control('Selected board piece').selectOption(candidate.id);
    const beforePin = await state();
    await btn('Place pin').click(); await btn('Cancel pin placement').click();
    assert.deepEqual(await state(), beforePin, 'Cancelling pin placement must not change a saved piece');
    await btn('Place pin').click(); await page.mouse.click(candidate.point.x, candidate.point.y);
    const relocated = await state(), relocatedItem = relocated.items.find(i => i.id === candidate.id);
    assert(relocatedItem.pin && Number.isFinite(relocatedItem.pin.x) && Number.isFinite(relocatedItem.pin.y), 'Actual paper click stores an anchor');
    assert.deepEqual(relocated.items.map(i => i.snapshot), beforePin.items.map(i => i.snapshot));
    await btn('Undo').click(); assert.deepEqual(await state(), beforePin);
    await btn('Place pin').click(); await page.mouse.click(candidate.point.x, candidate.point.y);
    await btn('Reset pin').click(); assert.equal((await state()).items.find(i => i.id === candidate.id).pin, undefined);
    await btn('Undo').click(); assert.deepEqual(await state(), relocated);
    result.pinAnchor = relocatedItem.pin;
    result.checks.push('Pin placement uses an actual paper triangle; cancel, place, reset and Undo preserve immutable captured geometry/materials.');

    const beforePhoto = await state(), photoPNG = await exported('arranging-photo-output');
    await btn('Photograph').click();
    assert.deepEqual(await state(), beforePhoto, 'Photo mode is transient');
    assert(!await control('Selected board piece').isVisible(), 'Photo mode removes editing tools');
    assert.deepEqual(await exported('photograph-output', true), photoPNG, 'Arrange export and photograph export have the same content');
    assert(await btn('Save photograph').evaluate(e => e === document.activeElement), 'Photograph export returns keyboard focus to its save button');
    // Read the actual photo scene at export resolution, then restore the live
    // viewport. This checks preview/export parity, not just repeated downloads.
    const visiblePhotoHash = await page.evaluate(() => {
      const b = paperCouture.pinboard, roomy = b.state.format === 'roomy';
      const width = roomy ? 2400 : 1800, height = roomy ? 2800 : 2100;
      b.renderer.setSize(width, height, false); b.renderer.render(b.scene, b.camera);
      const png = b.canvas.toDataURL('image/png'); b.render(); return png.split(',')[1];
    });
    assert.equal(sha(Buffer.from(visiblePhotoHash, 'base64')), photoPNG.sha256, 'Photograph view is the exported scene');
    await page.screenshot({ path: path.join(out, 'photograph-desktop.png') });
    await page.keyboard.press('Escape'); assert.deepEqual(await state(), beforePhoto);
    assert(await page.evaluate(() => paperCouture.pinboard.dialog.open && !paperCouture.pinboard.photoMode), 'Escape returns to arranging without closing the board');
    result.checks.push('Photograph is a transient clean view matching exported pixels; saving restores keyboard focus, and Escape returns to arranging without changing state.');

    // Exercise the full twelve-piece surface, using the retained two-outfit
    // fixture when supplied. Otherwise add seven actual mitten captures to the
    // five-piece legacy fixture; the result is a stress fixture, not curation.
    const fixturePath = process.env.BOARD_FIXTURE || path.join(__dirname, '../.october-qa/roomy/twelve-piece.json');
    if (fs.existsSync(fixturePath)) {
      await installFixture(fs.readFileSync(fixturePath, 'utf8')); result.fullBoardFixture = path.relative(process.cwd(), fixturePath);
    } else {
      await page.goto(base + '/?design=mitten-left&paper=oat-linen&step=99&view=display'); await settle(); await open();
      while ((await state()).items.length < 12) await btn('Pin current piece').click();
      result.fullBoardFixture = 'five retained pieces plus seven actual mitten captures (stress fixture)';
    }
    assert.equal((await state()).items.length, 12); assert(await btn('Board full · 12 pieces').isDisabled());
    await control('Board size').selectOption('roomy'); await finishTools();
    await control('Board surface').selectOption('natural'); await control('Pin style').selectOption('pearl');
    await control('Figure guide').selectOption('two'); await control('Board lighting').selectOption('soft');
    await control('Include guide in photograph').check();
    const full = await state(), fullPNG = await exported('twelve-piece-presentation');
    assert.equal(fullPNG.width, 2400); assert.equal(fullPNG.height, 2800);
    await page.reload(); await settle(); await open(); assert.deepEqual(await state(), full);
    assert.deepEqual(await exported('twelve-piece-reloaded'), fullPNG);
    result.checks.push('Twelve-piece Roomy presentation retains all captures and reloads to an identical 2400×2800 PNG.');

    await finishTools(); const resources = [];
    for (let cycle = 0; cycle < 4; cycle++) {
      await control('Board surface').selectOption('rose'); await control('Pin style').selectOption('red');
      await control('Figure guide').selectOption('one');
      await control('Board surface').selectOption('natural'); await control('Pin style').selectOption('pearl');
      await control('Figure guide').selectOption('two');
      resources.push(await page.evaluate(() => ({ ...paperCouture.pinboard.renderer.info.memory })));
    }
    assert.deepEqual(resources.slice(1), Array(3).fill(resources[1])); assert.deepEqual(await state(), full);
    result.resources = resources;
    result.checks.push('Repeated cork, pin and guide replacement reaches stable GPU geometry/texture counts; captured pieces and final presentation state stay exact.');

    for (const [width, height] of [[390, 844], [320, 568]]) {
      await page.setViewportSize({ width, height });
      await page.locator('.board-tools').evaluate(e => e.scrollTop = 0);
      const initial = await page.evaluate(() => {
        const tools = document.querySelector('.board-tools').getBoundingClientRect();
        const size = document.querySelector('[aria-label="Starting square size"]').getBoundingClientRect();
        return { overflow: document.documentElement.scrollWidth > innerWidth,
          sizeVisible: size.top >= tools.top && size.bottom <= tools.bottom + 1 && size.height >= 44 };
      });
      assert(!initial.overflow && initial.sizeVisible, `Essential capture controls remain reachable at ${width}px`);
      await finishTools(); const controls = [];
      for (const name of ['Board surface', 'Pin style', 'Figure guide', 'Board lighting', 'Include guide in photograph'])
        controls.push(await accessibleControl(control(name)));
      await accessibleControl(btn('Photograph')); const preserved = await state(); await btn('Photograph').tap();
      await accessibleControl(btn('Save photograph')); await accessibleControl(btn('Back to arranging'));
      assert(!await control('Selected board piece').isVisible());
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      await page.screenshot({ path: path.join(out, `photograph-${width}.png`) });
      await btn('Back to arranging').tap(); assert.deepEqual(await state(), preserved);
      result.layouts.push({ width, height, initial, controls });
    }
    result.checks.push('390/320px: essential size control stays initially visible; finishing controls and clean-photo actions fit and have unobscured centres. Browser auto-scroll establishes reachability, not natural touch discovery.');
    assert.deepEqual(result.errors, []); assert.deepEqual(result.sourceRequests, []); result.passed = true;
  } catch (error) {
    result.failure = String(error); await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {}); throw error;
  } finally {
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2)); await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
