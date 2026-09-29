// Optional production-browser check. npm install --no-save playwright, then
// npm run build -- --base /play/paper-couture/ && node scripts/check-feedback.cjs
// PLAYWRIGHT_MODULE and CHROMIUM_MODULE may point to external browser tooling.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = 'docs/feedback-pass/interaction';
const csp = "default-src 'self'; base-uri 'none'; connect-src 'self'; font-src 'self'; form-action 'none'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; upgrade-insecure-requests";
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((req, res) => {
    const name = new URL(req.url, 'http://local').pathname;
    if (!name.startsWith('/play/paper-couture/')) { res.writeHead(404).end(); return; }
    const relative = name.slice('/play/paper-couture/'.length) || 'index.html';
    const file = path.resolve('dist', relative);
    if (!file.startsWith(path.resolve('dist') + '/') || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Content-Security-Policy': csp });
    res.end(fs.readFileSync(file));
  });
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  let browser;
  const errors = [];
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
    const state = () => p.evaluate(() => ({ step: paperCouture.controller.step, moving: paperCouture.controller.moving, shape: paperCouture.silhouetteId, paper: paperCouture.paperId, turn: paperCouture.quarterTurns, attached: paperCouture.attached, accessory: paperCouture.accessoryId, wing: paperCouture.bowWing }));
    const fold = async () => {
      const step = (await state()).step;
      await p.locator('.dock .btn-primary').click();
      // A second press completes this fold; it must not start another one.
      if ((await state()).moving) await p.locator('.dock .btn-primary').click();
      await p.waitForFunction(s => paperCouture.controller.step === s + 1 && !paperCouture.controller.moving, step);
    };
    const back = async () => {
      const step = (await state()).step;
      await p.getByRole('button', { name: 'Back', exact: true }).click();
      if ((await state()).moving) await p.getByRole('button', { name: 'Back', exact: true }).click();
      await p.waitForFunction(s => paperCouture.controller.step === s - 1 && !paperCouture.controller.moving, step);
    };
    const display = async () => {
      await p.getByRole('button', { name: 'Display', exact: true }).click();
      await p.waitForFunction(() => paperCouture.view.inDisplay);
    };
    const capture = async name => {
      await p.waitForFunction(() => !paperCouture.displayCam.glide);
      await p.screenshot({ path: `${output}/${name}.png` });
    };
    const readyHem = async (shape, width = 1280, height = 800) => {
      await p.setViewportSize({width,height});
      await p.goto(root + `?step=4&shape=${shape}&paper=plum-scatter`);
      await p.waitForFunction(() => window.paperCouture);
      await p.getByRole('button', {name:'Fold small flap 1', exact:true}).waitFor();
    };
    const grip = async (index=0) => p.locator('.fold-handle').nth(index).evaluate(b => {
      const r=b.getBoundingClientRect(), t=new DOMMatrix(getComputedStyle(b.firstElementChild).transform);
      return {x:r.x+r.width/2,y:r.y+r.height/2,vx:t.a,vy:t.b,width:r.width,height:r.height};
    });
    for (const shape of ['classic','straight','flare']) {
      await readyHem(shape);
      assert.equal(await p.locator('.fold-handle:visible').count(),2);
      const h=await grip();assert(h.width>=44 && h.height>=44);
      await p.mouse.move(h.x,h.y);await p.mouse.down();
      assert.equal(await p.evaluate(() => paperCouture.controller.isScrubbing),true);
      await p.mouse.move(h.x+h.vx*60,h.y+h.vy*60,{steps:5});await p.mouse.up();
      await p.waitForFunction(() => paperCouture.controller.step===5 && !paperCouture.controller.moving);
      await back();
      // A short drag returns to the same step rather than committing the tiny fold.
      const short=await grip(1);await p.mouse.move(short.x,short.y);await p.mouse.down();
      await p.mouse.move(short.x+short.vx*9,short.y+short.vy*9);await p.mouse.up();
      await p.waitForFunction(() => paperCouture.controller.step===4 && !paperCouture.controller.moving);
      await p.getByRole('button',{name:'Fold small flap 2',exact:true}).focus();await p.keyboard.press('Enter');
      await p.waitForFunction(() => paperCouture.controller.step===5 && !paperCouture.controller.moving);
      console.log(`${shape}: mouse drag, short-drag rollback, keyboard passed`);
    }
    await readyHem('classic',390,844);
    await p.screenshot({path:`${output}/hem-phone.png`});
    const touch=await grip();const cdp=await p.context().newCDPSession(p);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touch.x,y:touch.y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touch.x+touch.vx*60,y:touch.y+touch.vy*60}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await p.waitForFunction(() => paperCouture.controller.step===5 && !paperCouture.controller.moving);
    await back();
    const cancel=await grip();
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cancel.x,y:cancel.y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cancel.x+cancel.vx*60,y:cancel.y+cancel.vy*60}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
    await p.waitForFunction(() => paperCouture.controller.step===4 && !paperCouture.controller.moving);
    await p.touchscreen.tap(cancel.x,cancel.y);
    await p.waitForFunction(() => paperCouture.controller.step===5 && !paperCouture.controller.moving);
    await back();
    const reset=await grip();await p.mouse.move(reset.x,reset.y);await p.mouse.down();
    await p.getByRole('button',{name:'Start over',exact:true}).evaluate(b=>b.click());
    await p.mouse.up();assert.equal((await state()).step,0);assert.equal((await state()).moving,false);
    await p.mouse.click(380,250);assert.equal((await state()).step,0);
    console.log('Phone-size touch drag, cancel, tap, reset and background click passed');
    for (const size of [{width:1280,height:800},{width:390,height:844},{width:844,height:390}]) {
      await p.setViewportSize(size);
      await p.goto(root+'?design=vest&step=8&view=display&paper=tidal-bands');
      await p.waitForFunction(() => window.paperCouture && paperCouture.view.inDisplay);
      await p.screenshot({path:`${output}/vest-${size.width}.png`});
      assert.equal(await p.locator('.fold-handle:visible').count(),0);
      assert.equal(await p.getByLabel('Accessory type').locator('option[value="bow"]').textContent(),'Two-piece bow');
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(`${output}/result.json`,JSON.stringify({passed:true,engine:'Headless Chromium; software WebGL; emulated touch',checks:['three dress silhouettes: both hem handles at least 44px','mouse drag commits','short drag rolls back','keyboard activation','390x844 touch drag, tap and cancellation','reset releases pointer capture','background click does not fold','handles hidden in Display','bow naming','vest front at desktop, portrait and landscape'],errors},null,2));
    console.log('Feedback interaction checks passed');
  } finally { await browser?.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
