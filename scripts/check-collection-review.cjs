// Independent interaction audit of a production build. Build with the subpath first.
// PLAYWRIGHT_MODULE / CHROMIUM_MODULE support the established external tooling.
// REVIEW_DIST may select an isolated copy while other agents continue building.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.REVIEW_OUTPUT || 'docs/geometry-collection/review';
const dist = path.resolve(process.env.REVIEW_DIST || 'dist');
const csp = "default-src 'self'; base-uri 'none'; connect-src 'self'; font-src 'self'; form-action 'none'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; upgrade-insecure-requests";
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((req, res) => {
    const name = new URL(req.url, 'http://local').pathname;
    if (!name.startsWith('/play/paper-couture/')) { res.writeHead(404).end(); return; }
    const file = path.resolve(dist, name.slice('/play/paper-couture/'.length) || 'index.html');
    if (!file.startsWith(dist + '/') || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Content-Security-Policy': csp });
    res.end(fs.readFileSync(file));
  });
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  let browser;
  const errors = [], checks = [], layouts = [];
  try {
    let launch = { headless: true, args: ['--no-sandbox', '--use-angle=swiftshader'] };
    if (process.env.CHROMIUM_MODULE) {
      const binary = require(process.env.CHROMIUM_MODULE).default;
      launch = { headless: true, executablePath: await binary.executablePath(), args: [...binary.args, '--use-angle=swiftshader'] };
    }
    browser = await chromium.launch(launch);
    const p = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce', hasTouch: true });
    p.setDefaultTimeout(20000);
    p.on('pageerror', e => errors.push(String(e)));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    p.on('requestfailed', r => errors.push(`${r.url()}: ${r.failure()?.errorText}`));
    const root = `http://127.0.0.1:${server.address().port}/play/paper-couture/`;
    const state = () => p.evaluate(() => ({
      step: paperCouture.controller.step, moving: paperCouture.controller.moving,
      total: paperCouture.timeline.ops.length, options: paperCouture.options,
      paper: paperCouture.paperId, turn: paperCouture.quarterTurns,
      accessory: paperCouture.accessoryId, attached: paperCouture.attached,
      accessoryMode: paperCouture.accessoryMode, visibleAccessory: paperCouture.accessoryRoot.visible,
      accessoryPaper: paperCouture.accessoryPaperId, accessoryTurn: paperCouture.accessoryQuarterTurns,
      position: paperCouture.pinPosition, garment: paperCouture.garmentId,
    }));
    const goto = async q => {
      await p.goto(root + q); await p.waitForFunction(() => window.paperCouture);
      await p.waitForFunction(() => !paperCouture.controller.moving);
    };
    const fold = async () => {
      const before = (await state()).step;
      await p.locator('.dock:not([hidden]) .btn-primary').click();
      if ((await state()).moving) await p.locator('.dock:not([hidden]) .btn-primary').click();
      await p.waitForFunction(step => paperCouture.controller.step === step + 1 && !paperCouture.controller.moving, before);
    };
    const finish = async () => {
      for (let i = 0; i < 20; i++) { const s = await state(); if (s.step === s.total) return; await fold(); }
      throw new Error('Unexpectedly long construction');
    };
    const choose = async (decision, value, keyboard = false) => {
      const locator = p.locator(`[data-decision="${decision}"][data-choice="${value}"]`);
      if (keyboard) { await locator.focus(); await p.keyboard.press('Enter'); }
      else await locator.click();
      await p.waitForFunction(({ decision, value }) => paperCouture.options[decision] === value, { decision, value });
      assert.equal(await locator.getAttribute('aria-pressed'), 'true');
    };
    const revisit = async id => {
      await p.getByLabel('Fold to revisit').selectOption(id);
      await p.getByRole('button', { name: 'Revisit fold', exact: true }).click();
      await p.waitForFunction(() => paperCouture.view.inWorkshop && !paperCouture.controller.moving && !paperCouture.accessoryRoot.visible);
    };
    const display = async () => {
      await p.getByRole('button', { name: 'Display', exact: true }).click();
      await p.waitForFunction(() => paperCouture.view.inDisplay && !paperCouture.displayCam.glide);
    };
    const capture = async name => {
      await p.screenshot({ path: `${output}/${name}.png` });
    };
    const checkLayout = async name => {
      const result = await p.evaluate(() => {
        const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom }; };
        const studio = rect('.studio-controls');
        const dock = rect('.dock:not([hidden])');
        const controls = [...document.querySelectorAll('.studio-controls button,.studio-controls select,.dock:not([hidden]) button')]
          .filter(el => el.getClientRects().length && !el.disabled).map(el => {
            const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
            const hit=document.elementFromPoint(x,y);
            const studioClips = el.closest('.studio-controls') && (x<studio.x||x>studio.x+studio.width||y<studio.y||y>studio.bottom);
            return {label:el.getAttribute('aria-label')||el.textContent.trim(),visible:!studioClips&&x>=0&&x<=innerWidth&&y>=0&&y<=innerHeight,hit:!!hit&&(hit===el||el.contains(hit))};
          });
        return {width:innerWidth,height:innerHeight,studio,dock,gap:dock.y-studio.bottom,controls};
      });
      layouts.push({name,...result});
      assert(result.gap > 70, `${name}: usable paper area squeezed to ${result.gap}px`);
      // Horizontal studio scrolling is intentional in landscape; visible controls must be clickable.
      for (const control of result.controls) if (control.visible) assert(control.hit, `${name}: covered control ${control.label}`);
      await capture(name);
    };

    await goto('?step=3&shape=flare&paper=cut-paper-mosaic&turn=1');
    await choose('sleeves','lifted',true);
    let s=await state(); assert.equal(s.step,3); assert.equal(s.options.silhouette,'flare');
    assert.deepEqual([s.paper,s.turn],['cut-paper-mosaic',1]);
    const focus = await p.evaluate(() => ({decision:document.activeElement?.dataset.decision,choice:document.activeElement?.dataset.choice}));
    assert.deepEqual(focus,{decision:'sleeves',choice:'lifted'},'choice focus should survive thumbnail replacement');
    await finish();
    await revisit('sleeves'); assert.equal((await state()).step,3);
    await choose('sleeves','dropped');
    await revisit('silhouette'); s=await state(); assert.equal(s.step,2); assert.equal(s.options.sleeves,'dropped');
    await choose('silhouette','straight'); await fold();
    assert.equal(await p.locator('[data-decision="sleeves"][data-choice="dropped"]').getAttribute('aria-pressed'),'true');
    await finish();
    checks.push('Dress sleeve/side choices use real controls, preserve prior choices/paper/turn, rewind honestly, retain keyboard focus');
    console.log('Dress choices, revisits and keyboard focus passed');

    await p.getByRole('button',{name:'Fold accessory',exact:true}).click();
    await p.getByRole('radio',{name:'Reverse garden',exact:true}).click();
    await p.getByRole('button',{name:/^Turn paper/}).click();
    await finish();
    await p.getByRole('button',{name:'Attach',exact:true}).click();
    await p.waitForFunction(()=>paperCouture.view.inDisplay&&paperCouture.accessoryRoot.visible);
    await p.getByLabel('Accessory position').selectOption('waist-right');
    const attachedBefore=await state(); assert(attachedBefore.attached);
    assert.equal(attachedBefore.accessoryPaper,'reverse-garden'); assert.equal(attachedBefore.accessoryTurn,1);
    await revisit('sleeves');
    s=await state(); assert(s.attached); assert(!s.visibleAccessory); assert.equal(s.step,3);
    await choose('sleeves','lifted'); await finish(); await display();
    s=await state(); assert(s.attached&&s.visibleAccessory);
    assert.deepEqual([s.accessory,s.accessoryPaper,s.accessoryTurn,s.position],[attachedBefore.accessory,attachedBefore.accessoryPaper,attachedBefore.accessoryTurn,attachedBefore.position]);
    assert.deepEqual([s.paper,s.turn],['cut-paper-mosaic',1]);
    await capture('dress-refold-accessory');
    checks.push('Completed accessory, independent paper/rotation and placement survive garment refold; hidden until garment finishes');
    console.log('Independent accessory survives refold');

    await goto('?design=skirt&step=2&paper=reverse-garden&turn=3');
    await choose('wrap','opposite'); assert.equal((await state()).step,2);
    while((await state()).step<7) await fold();
    await choose('band','single'); s=await state(); assert.equal(s.step,7); assert.equal(s.total,8);
    assert.equal(await p.locator('.progress li').count(),8); await finish();
    await revisit('band'); assert.equal((await state()).step,7);
    await choose('band','double'); assert.equal((await state()).total,9);
    assert.equal(await p.locator('.progress li').count(),9); await finish();
    await revisit('wrap'); s=await state(); assert.equal(s.step,2); assert.equal(s.options.band,'double');
    await choose('wrap','original'); assert.deepEqual([(await state()).paper,(await state()).turn],['reverse-garden',3]);
    checks.push('Opposite skirt wrap and one/two-turn band update construction count/progress and revisit separately');
    console.log('Wrap/band choices and dynamic step counts passed');

    for (const [garment,step,decision,value,total] of [['jacket',4,'jacketLength','longer',6],['vest',6,'vestLength','longline',8]]) {
      await goto(`?design=${garment}&step=${step}&paper=tidal-bands`);
      await choose(decision,value); s=await state(); assert.equal(s.step,step); assert.equal(s.total,total);
      await finish(); await display(); await revisit(decision); assert.equal((await state()).step,step);
    }
    checks.push('Jacket and vest length choices preserve their common fold prefix and revisit from Display');
    console.log('Jacket and vest length choices passed');

    for (const [width,height] of [[390,844],[844,390]]) {
      await p.setViewportSize({width,height});
      await goto('?step=3&shape=flare&paper=tidal-bands');
      await choose('sleeves','dropped');
      await checkLayout(`sleeve-choice-${width}`);
      await finish(); await display();
      await checkLayout(`dress-display-${width}`);
      await p.getByRole('button',{name:'Fold accessory',exact:true}).click();
      await finish(); await p.getByRole('button',{name:'Attach',exact:true}).click();
      await p.waitForFunction(()=>paperCouture.view.inDisplay&&paperCouture.accessoryRoot.visible);
      await checkLayout(`accessory-display-${width}`);
      await p.getByLabel('Accessory position').selectOption('waist-left');
      await revisit('silhouette');
      await checkLayout(`side-choice-${width}`);
    }
    checks.push('Portrait/landscape contextual choices, completed garment and attached-accessory controls remain usable');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(`${output}/result.json`,JSON.stringify({passed:true,engine:'Headless Chromium; software WebGL; emulated touch viewport',checks,layouts,errors},null,2));
    console.log(JSON.stringify({passed:true,checks,errors},null,2));
  } finally { await browser?.close(); server.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
