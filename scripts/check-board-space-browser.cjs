// Real frozen captures and movement controls; fresh contexts, never a personal profile.
// BASELINE_URL optionally regenerates v1 fixtures and before evidence from b47b980.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://127.0.0.1:5197';
const out = process.env.CAPTURE_DIR || '.board-space-qa';
const fixtures = path.join(__dirname, '../docs/board-space/fixtures');
const pairs = [
  ['jacket-wrap', 'design=jacket&jacketLength=longer', 'design=skirt'],
  ['vest-pleats', 'design=vest', 'design=pleats'],
  ['longline-long', 'design=vest&vestLength=longline', 'design=skirt&skirtLength=long'],
];
const key = 'paper-couture.pinboard.v1';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const result = { checks: [], measurements: [], errors: [] };
  try {
    for (const [name, top, bottom] of pairs) {
      for (const [version, url] of [['before', process.env.BASELINE_URL], ['after', base]]) {
        if (!url) continue;
        const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', hasTouch: true });
        const page = await context.newPage(); page.setDefaultTimeout(60000);
        page.on('pageerror', e => result.errors.push(String(e)));
        const btn = name => page.getByRole('button', { name, exact: true });
        const open = () => page.getByRole('button', { name: /^View board/ }).click();
        const load = async query => { await page.goto(url + '/?' + query); await page.waitForFunction(() => window.paperCouture && paperCouture.view.t === paperCouture.view.target); };
        const state = () => page.evaluate(() => structuredClone(paperCouture.pinboard.state));
        const file = path.join(fixtures, name + '.json');
        if (version === 'before') {
          await load(top + '&paper=corner-bloom&printX=0.125&printY=0.0625&step=99&view=display');
          await open(); await btn('Pin current piece').click(); await btn('Return to folding').click();
          await load(bottom + '&paper=plum-scatter&printX=-0.0625&turn=1&step=99&view=display');
          await open(); await btn('Pin current piece').click();
          fs.mkdirSync(fixtures, { recursive: true }); fs.writeFileSync(file, JSON.stringify(await state()));
        } else {
          const raw = fs.readFileSync(file, 'utf8');
          await context.addInitScript(({key,raw}) => { if (localStorage.getItem(key) === null) localStorage.setItem(key,raw); }, {key,raw});
          await load(''); await open();
          assert.deepEqual(await state(), JSON.parse(raw), 'Published v1 poses/papers/offsets/order must load unchanged');
          assert.equal(await page.evaluate(key => localStorage.getItem(key), key), raw, 'Opening must not rewrite a legacy save');
        }
        const initial = await state();
        for (const tilt of [0, 12]) {
          for (const [index, item] of initial.items.entries()) {
            await page.getByLabel('Selected board piece').selectOption(item.id);
            await page.getByLabel('Pinboard tilt').fill(String(index ? -tilt : tilt));
            // Repeated activation of the actual movement button reaches and tests the clamp.
            await btn(index ? 'Move down' : 'Move up').evaluate(e => { for(let n=0;n<40;n++)e.click(); });
          }
          for (const [width,height] of [[1280,900],[1440,1200],[390,844],[320,568]]) {
            await page.setViewportSize({width,height});
            await page.locator('.board-tools').evaluate(e => e.scrollTop=0);
            await page.screenshot({path:path.join(out,`${name}-${version}-${tilt}-${width}.png`)});
            const m = await page.evaluate(async () => {
              const THREE = await import('/node_modules/.vite/deps/three.js'), b = paperCouture.pinboard;
              const boxes = b.state.items.map(i => new THREE.Box3().setFromObject(b.groups.get(i.id),true));
              const r = b.canvas.getBoundingClientRect(), c = b.camera, d = b.dialog.getBoundingClientRect();
              return { width:r.width, height:r.height, camera:[c.left,c.right,c.bottom,c.top],
                contained:r.top>=d.top&&r.bottom<=d.bottom&&r.left>=d.left&&r.right<=d.right,
                backing:b.backing.geometry.parameters, gap:boxes[0].min.y-boxes[1].max.y,
                pixels:boxes.map(box => [(box.max.x-box.min.x)*r.width/(c.right-c.left),(box.max.y-box.min.y)*r.height/(c.top-c.bottom)]),
                bounds:boxes.map(box=>[box.min.x,box.max.x,box.min.y,box.max.y]),
                toolHeight:document.querySelector('.board-tools').clientHeight, overflow:document.documentElement.scrollWidth>innerWidth };
            });
            assert(!m.overflow); assert(m.contained, 'Full board stays inside its dialog'); assert(m.toolHeight>=144, `Usable tools at ${width}`);
            assert(Math.abs(m.width/m.height-(m.camera[1]-m.camera[0])/(m.camera[3]-m.camera[2]))<.005, 'Preview must not stretch the camera');
            assert.equal(m.backing.width,m.camera[1]-m.camera[0]);assert.equal(m.backing.height,m.camera[3]-m.camera[2]);
            for(const [left,right,bottom,top] of m.bounds) {
              assert(left>=m.camera[0]+.0799&&right<=m.camera[1]-.0799&&bottom>=m.camera[2]+.0799&&top<=m.camera[3]-.0799,'No paper clipping');
            }
            if(version==='after') assert(m.gap>.15, `${name}/${tilt}: top and bottom need visible separation`);
            if(version==='before'&&tilt===0) assert(m.gap<0, 'Fixture must reproduce original overlap');
            result.measurements.push({name,version,tilt,viewport:[width,height],...m});
          }
        }
        const moved=await state();
        assert.deepEqual(moved.items.map(i=>i.snapshot),initial.items.map(i=>i.snapshot), 'Moves and tilts must not edit captures');
        await btn('Remove selected').click(); await btn('Undo').click(); assert.deepEqual(await state(),moved);
        await page.reload(); await page.waitForFunction(()=>window.paperCouture);await open();assert.deepEqual(await state(),JSON.parse(JSON.stringify(moved)));
        if(version==='after') {
          const [download]=await Promise.all([page.waitForEvent('download'),btn('Save PNG').click()]);
          const png=path.join(out,name+'-composite.png');await download.saveAs(png);const bytes=fs.readFileSync(png);
          assert.equal(bytes.readUInt32BE(16),1800);assert.equal(bytes.readUInt32BE(20),2100);
          // Screen and export use identical world-space framing, independent of viewport.
          const expected=await page.evaluate(()=>{const b=paperCouture.pinboard;b.selection.visible=false;b.renderer.setSize(1800,2100,false);b.renderer.render(b.scene,b.camera);return b.canvas.toDataURL('image/png')});
          assert.deepEqual(bytes,Buffer.from(expected.split(',')[1],'base64'));
        }
        await context.close();console.log(name,version,'passed');
      }
    }
    for(const after of result.measurements.filter(m=>m.version==='after'&&m.viewport[0]<720)) {
      const before=result.measurements.find(m=>m.version==='before'&&m.name===after.name&&m.tilt===after.tilt&&m.viewport[0]===after.viewport[0]);
      if(before)assert(Math.abs(after.pixels[0][0]-before.pixels[0][0])<1,'Phone paper width is preserved, not zoomed out');
    }
    assert.deepEqual(result.errors,[]);
    result.checks.push('Three published top/bottom v1 captures load byte-for-byte without rewriting storage; exact snapshots survive movement/tilt/removal/Undo/reload.',
      'Actual button limits at 0 and ±12 degrees: desktop, 390 portrait and 320 short portrait; positive gap, paper margin, matching backing/camera/canvas, no overflow, usable tool area.',
      'Portrait composite PNG matches the rendered scene byte-for-byte; optional baseline comparison preserves phone paper width.');
    result.passed=true;
  } catch(e) { result.failure=String(e);throw e; }
  finally { fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
