// Fresh contexts only. No personal profiles or existing saves.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://127.0.0.1:5196', out = process.env.CAPTURE_DIR || '.board-qa';
fs.mkdirSync(out, { recursive: true });
const key = 'paper-couture.pinboard.v1';
(async () => {
 const browser = await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context = await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce',hasTouch:true,acceptDownloads:true});
 const page = await context.newPage(), result = {base,checks:[],errors:[]};
 result.checks.push=(...items)=>{console.log(...items);return Array.prototype.push.apply(result.checks,items)};
 page.setDefaultTimeout(45000); page.on('pageerror',e=>result.errors.push(String(e)));
 const btn = name => page.getByRole('button',{name,exact:true});
 const settle = () => page.waitForFunction(()=>window.paperCouture&&!paperCouture.controller.moving&&paperCouture.view.t===paperCouture.view.target&&!paperCouture.displayCam.glide);
 const load = async q => { await page.goto(base+'/?'+q); await settle(); };
 const board = () => page.evaluate(()=>structuredClone(paperCouture.pinboard.state));
 const fold = async () => { await page.locator('.dock:not(.display-dock) .btn-primary').click(); if(await page.evaluate(()=>paperCouture.controller.moving)) await page.locator('.dock:not(.display-dock) .btn-primary').click(); await settle(); };
 const finish = async () => { while(!await page.evaluate(()=>paperCouture.controller.finished)) await fold(); };
 const open = () => page.getByRole('button',{name:/^View board/}).click();
 const shot = name => page.screenshot({path:path.join(out,name+'.png')});
 const nudge = async (name,n) => {for(let i=0;i<n;i++)await btn(name).click();};
 const exportPng = async name => { const [d]=await Promise.all([page.waitForEvent('download'),btn('Save PNG').click()]);const file=path.join(out,name+'.png');await d.saveAs(file);const bytes=fs.readFileSync(file);assert.equal(bytes.readUInt32BE(16),1600);assert.equal(bytes.readUInt32BE(20),1200);return file; };
 try {
  await load('design=jacket&paper=corner-bloom&printX=0.125&printY=0.0625');
  await page.evaluate(()=>localStorage.setItem('__board_legacy_keep','untouched'));
  await open();assert(await btn('Pin current piece').isDisabled());await page.keyboard.press('Escape');
  await finish();await fold();await btn('Pinboard').click();assert.equal((await board()).items.length,0);
  await page.keyboard.press('Escape');await btn('Pinboard').click();assert.equal((await board()).items.length,0);
  await btn('Pin current piece').click();const top=(await board()).items[0];assert.equal(top.snapshot.materials.find(m=>m.paper).paper.position.x,.125);
  const actual = await page.evaluate(()=>({positions:Array.from(paperCouture.sheet.front.geometry.attributes.position.array),uv:Array.from(paperCouture.sheet.front.geometry.attributes.uv.array)}));
  assert.deepEqual(top.snapshot.geometries[0].position,actual.positions);assert.deepEqual(top.snapshot.geometries[0].uv,actual.uv);
  await nudge('Move up',7);await btn('Return to folding').click();await settle();
  await page.getByLabel('Garment design').selectOption('skirt');await settle();
  await page.getByRole('radio',{name:'Plum scatter',exact:true}).click();await page.locator('.rotate').first().click();
  await open();assert.deepEqual((await board()).items[0].snapshot,top.snapshot);assert(await btn('Pin current piece').isDisabled());await btn('Return to folding').click();
  await finish();await fold();await btn('Pinboard').click();await btn('Pin current piece').click();
  assert.equal((await board()).items.length,2);await nudge('Move down',5);await nudge('Move left',2);
  await page.getByLabel('Pinboard tilt').fill('-3');await page.getByLabel('Pinboard background').selectOption('Rose');
  await shot('desktop-top-bottom');const styled=await board();await exportPng('composite-rose');
  await btn('Return to folding').click();await settle();await btn('Start over').click();await settle();
  await open();assert.deepEqual(await board(),styled);await btn('Return to folding').click();await page.reload();await settle();
  assert.equal(await page.evaluate(()=>paperCouture.controller.step),0);await open();assert.deepEqual(await board(),JSON.parse(JSON.stringify(styled)));
  assert.equal(await page.evaluate(()=>localStorage.getItem('__board_legacy_keep')),'untouched');
  result.checks.push('Buttons: top folds → explicit pin → return → new paper/turn → bottom folds → pin → style → return/reset → reload. Exact posed vertices/UVs and prior capture unchanged; unrelated storage and URL workshop step preserved.');
  // Export is exactly the visible scene, excluding the selection outline.
  const expected = await page.evaluate(()=>{const b=paperCouture.pinboard;b.selection.visible=false;b.renderer.setSize(1600,1200,false);b.renderer.render(b.scene,b.camera);return b.canvas.toDataURL('image/png')});
  const exported=await exportPng('composite-reloaded');assert.deepEqual(fs.readFileSync(exported),Buffer.from(expected.split(',')[1],'base64'));
  const s=await board();await btn('Remove selected').click();assert.equal((await board()).items.length,1);await btn('Undo').click();assert.deepEqual(await board(),s);
  // Overlap the two pieces and check both depth separation and visible picking.
  await btn('Reset selected').click();await page.getByLabel('Selected board piece').selectOption(top.id);await btn('Reset selected').click();
  const depth = await page.evaluate(async()=>{const THREE=await import('/node_modules/.vite/deps/three.js'),b=paperCouture.pinboard;return b.state.items.map(i=>{const box=new THREE.Box3().setFromObject(b.groups.get(i.id),true);return {min:box.min.z,max:box.max.z}})});
  assert(depth[1].min>depth[0].max);
  const rectangle=await page.locator('.pinboard-canvas').boundingBox();await page.mouse.click(rectangle.x+rectangle.width/2,rectangle.y+rectangle.height/2);
  assert.equal((await board()).selected,styled.items[1].id);
  await exportPng('overlap-skirt-front');await btn('Send backward').click();assert.equal((await board()).items[0].id,styled.items[1].id);await exportPng('overlap-jacket-front');
  const occlusion=await page.evaluate(()=>{
    const b=paperCouture.pinboard,front=b.groups.get(b.state.items.at(-1).id),back=b.groups.get(b.state.items[0].id);
    const pixel=()=>{b.selection.visible=false;b.renderer.render(b.scene,b.camera);const c=document.createElement('canvas');c.width=c.height=1;const g=c.getContext('2d');g.drawImage(b.canvas,b.canvas.width/2,b.canvas.height/2,1,1,0,0,1,1);return [...g.getImageData(0,0,1,1).data]};
    const both=pixel();back.visible=false;const frontOnly=pixel();back.visible=true;front.visible=false;const backOnly=pixel();front.visible=true;b.render();return {both,frontOnly,backOnly};
  });assert.deepEqual(occlusion.both,occlusion.frontOnly);assert.notDeepEqual(occlusion.both,occlusion.backOnly);result.occlusion=occlusion;
  await btn('Undo').click(); // layer
  // Restore styled positions with real controls for phone evidence.
  await page.getByLabel('Selected board piece').selectOption(top.id);await nudge('Move up',7);
  await page.getByLabel('Selected board piece').selectOption(styled.items[1].id);await nudge('Move down',7);
  for(const [width,height] of [[390,844],[844,390]]) {
    await page.setViewportSize({width,height});await page.locator('.board-tools').evaluate(e=>e.scrollTop=0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
    const r=await page.locator('.pinboard-canvas').boundingBox(),cdp=await context.newCDPSession(page);
    const before=await board();
    // Empty board does not drag a previously selected item.
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+8,y:r.y+8}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+30,y:r.y+25}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.deepEqual(await board(),before);
    // Touch the top piece near its centre; cancel restores its position, tap only selects.
    const x=r.x+r.width/2,y=r.y+r.height*(.5-.56/2.7);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+22,y:y+8}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
    assert.deepEqual((await board()).items,before.items);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+22,y:y+8}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.notDeepEqual((await board()).items,before.items);await btn('Undo').click();assert.deepEqual((await board()).items,before.items);
    await page.locator('.board-tools').evaluate(e=>e.scrollTop=0);await shot('phone-'+width);await cdp.detach();
  }
  await page.setViewportSize({width:1280,height:900});
  result.checks.push('Composite PNG is byte-identical to the visible 1600×1200 scene without selection outline. Real overlap occlusion/picking/layer reversal; portrait and landscape touch empty-space, drag, cancel, Undo, no page overflow.');
  // Fresh completed source, add limit, repeat/remove/Undo and GPU lifetime.
  await btn('Return to folding').click();await load('design=clutch&paper=seed-dashes&step=99&view=display');await open();
  await btn('Pin current piece').click();await btn('Pin current piece').click();assert.equal((await board()).items.length,4);assert(await btn('Board full · four pieces').isDisabled());
  const memory=[];for(let i=0;i<4;i++){await btn('Remove selected').click();await btn('Undo').click();memory.push(await page.evaluate(()=>({...paperCouture.pinboard.renderer.info.memory})));await btn('Return to piece').click();await open()}
  assert.deepEqual(memory.slice(1),Array(3).fill(memory[1]));result.memory=memory;
  const bytes=await page.evaluate(()=>localStorage.getItem('paper-couture.pinboard.v1').length);result.saveCharacters=bytes;assert(bytes<2000000);
  await page.reload();await settle();await open();assert.equal((await board()).items.length,4);
  result.checks.push('Four-piece limit is explicit; repeated remove/Undo/open/close has stable GPU counts, and all four reload.');
  // Failure and retry leave the previous durable save untouched.
  const durable=await page.evaluate(k=>localStorage.getItem(k),key);
  await page.evaluate(()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='paper-couture.pinboard.v1')throw new DOMException('Quota exceeded','QuotaExceededError');return window.originalSet.call(this,k,v)}});
  await btn('Move left').click();assert((await page.locator('.board-storage').innerText()).includes('only in this tab'));
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),durable);
  await btn('Return to folding').click();assert((await page.getByRole('button',{name:/^View board/}).innerText()).includes('unsaved'));await open();
  await page.evaluate(()=>Storage.prototype.setItem=window.originalSet);await btn('Retry saving board').click();assert((await page.locator('.board-storage').innerText()).includes('Board saved'));
  const conflict=await context.newPage();await conflict.goto(base);await conflict.waitForFunction(()=>window.paperCouture);
  await conflict.getByRole('button',{name:/^View board/}).click();await conflict.getByRole('button',{name:'Move left',exact:true}).click();const newer=await conflict.evaluate(k=>localStorage.getItem(k),key);
  await btn('Move right').click();assert((await page.locator('.board-storage').innerText()).includes('another tab'));assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),newer);await conflict.close();
  result.checks.push('Quota failure retains prior save and flags unsaved outside the board; Retry recovers. A second tab cannot silently overwrite newer board work.');
  // Separate context: unsupported save preserved, never replace an unknown version.
  const bad=await browser.newContext();await bad.addInitScript(k=>localStorage.setItem(k,'{"version":99,"keep":"future"}'),key);const bp=await bad.newPage();await bp.goto(base+'/?step=99&view=display');await bp.waitForFunction(()=>window.paperCouture);await bp.getByRole('button',{name:/^View board/}).click();await bp.getByRole('button',{name:'Pin current piece',exact:true}).click();assert.equal(await bp.evaluate(k=>localStorage.getItem(k),key),'{"version":99,"keep":"future"}');await bad.close();
  assert.deepEqual(result.errors,[]);result.passed=true;
 } catch(e) {result.failure=String(e);await shot('failure').catch(()=>{});throw e}
 finally {fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
