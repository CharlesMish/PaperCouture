// Fresh production context; capture/move/format/Undo/export use real controls.
// Only the documented outfit styling coordinates use the read/write diagnostic hook.
const { chromium, openBoard } = require('./lib/legacy-playwright.cjs');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const base = process.env.BASE_URL || 'http://127.0.0.1:5637', out = process.env.CAPTURE_DIR || '.october-qa/roomy';
const key = 'paper-couture.pinboard.v1';
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
fs.mkdirSync(out, { recursive: true });
(async () => {
 const browser = await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context = await browser.newContext({viewport:{width:1280,height:900},hasTouch:true,acceptDownloads:true,reducedMotion:'reduce'});
 const page = await context.newPage(); page.setDefaultTimeout(60000);
 const result = {checks:[],layouts:[],errors:[],sourceRequests:[],physicalPhoneTested:false};
 page.on('pageerror',e=>result.errors.push(String(e)));
 page.on('request',r=>{if(/\/(src|node_modules|@vite)\//.test(new URL(r.url()).pathname))result.sourceRequests.push(r.url())});
 const btn = name => page.getByRole('button',{name,exact:true});
 const settle = () => page.waitForFunction(()=>window.paperCouture&&!paperCouture.controller.moving&&!paperCouture.cameraSettling&&paperCouture.view.t===paperCouture.view.target&&!paperCouture.displayCam.glide);
 const state = () => page.evaluate(()=>structuredClone(paperCouture.pinboard.state));
 const raw = () => page.evaluate(k=>localStorage.getItem(k),key);
 const open = () => openBoard(page);
 const load = async q => {await page.goto(base+'/?'+q);await settle();await open()};
 const shot = async name => {await page.locator('.board-tools').evaluate(e=>e.scrollTop=0);await page.screenshot({path:path.join(out,name+'.png')})};
 const png = async name => {
  const [d] = await Promise.all([page.waitForEvent('download'),btn('Save PNG').click()]);
  const file = path.join(out,name+'.png');await d.saveAs(file);const bytes=fs.readFileSync(file);
  return {sha256:sha(bytes),width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
 };
 const metrics = () => page.evaluate(()=>{
  const b=paperCouture.pinboard, r=b.canvas.getBoundingClientRect(), tools=document.querySelector('.board-tools').getBoundingClientRect();
  const size=document.querySelector('[aria-label="Starting square size"]').getBoundingClientRect();
  const pieces=b.state.items.map(i=>{
   const g=b.groups.get(i.id), box=b.selection.box.clone().setFromObject(g,true);
   return {title:i.title,bounds:[box.min.x,box.max.x,box.min.y,box.max.y],pixels:[(box.max.x-box.min.x)/(b.camera.right-b.camera.left)*r.width,(box.max.y-box.min.y)/(b.camera.top-b.camera.bottom)*r.height]};
  });
  return {viewport:[innerWidth,innerHeight],canvas:[r.x,r.y,r.width,r.height],camera:[b.camera.left,b.camera.right,b.camera.bottom,b.camera.top],backing:[b.backing.geometry.parameters.width,b.backing.geometry.parameters.height],sizeVisible:size.top>=tools.top&&size.bottom<=tools.bottom+1&&size.height>=44,overflow:document.documentElement.scrollWidth>innerWidth,pieces};
 });
 try {
  // Existing record must load without writing or inventing a board format.
  const legacy=fs.readFileSync(path.join(__dirname,'../docs/companion-studies/fixtures/pr24-five-piece.json'),'utf8');
  await page.goto(base);await settle();await page.evaluate(({key,legacy})=>localStorage.setItem(key,legacy),{key,legacy});await page.reload();await settle();await open();
  assert.equal(await raw(),legacy);assert.deepEqual(await state(),JSON.parse(legacy));
  const oldPNG=await png('legacy-standard');
  await page.getByLabel('Board size',{exact:true}).selectOption('roomy');
  assert.deepEqual((await state()).items,JSON.parse(legacy).items);
  await btn('Undo').click();assert.equal(await raw(),JSON.stringify(JSON.parse(legacy)));assert.deepEqual(await png('legacy-after-undo'),oldPNG);
  result.checks.push('Legacy five-piece record opens byte-exact; enlargement leaves captures and coordinates exact; Undo restores identical 1800×2100 PNG.');
  // Clear this isolated fixture only, then build the candidate outfit via actual Pin controls.
  await page.evaluate(k=>localStorage.removeItem(k),key);
  const outfit=[
   ['swing-coat','dusk-wash',20,1,.7],['camp-shirt','riso-proof',18,-.95,.7],
   ['framed-brooch','marbled-endpaper',4.5,0,1.7],['mitten-left','oat-linen',6,-1.3,-1.6],['mitten-right','oat-linen',6,-.65,-1.6],
   ['pleats','slate-grain',20,1,-.85],['hat','oat-linen',8,1,2.25],['clutch','dusk-wash',8,0,-.7],
   ['skirt','slate-grain',20,-.95,-.6],['hat','dusk-wash',8,-.95,1.9],
   ['boot-left','slate-grain',8,.65,-2.15],['boot-right','slate-grain',8,1.35,-2.15],
  ];
  for(const [index,[design,paper,cm,x,y]] of outfit.entries()) {
   await load(`design=${design}&paper=${paper}&step=99&view=display`);
   assert.equal(await page.evaluate(()=>paperCouture.garmentId),design);
   await page.getByLabel('Starting square size').selectOption(String(cm));
   const before=await state();await btn('Pin current piece').click();const after=await state();
   assert.equal(after.items.length,index+1);assert.deepEqual(after.items.slice(0,-1),before.items);
   assert.equal(after.items.at(-1).paperSize.sideCm,cm);
   await page.evaluate(({x,y})=>{const b=paperCouture.pinboard;b.mutate(()=>{const i=b.state.items.at(-1);i.x=x;i.y=y;b.position();b.constrain(i.id)})},{x,y});
   if(index===4){
    const standard=await state();await shot('standard-five-desktop');result.standard=await metrics();
    await page.getByLabel('Board size',{exact:true}).selectOption('roomy');assert.deepEqual((await state()).items,standard.items);
    await shot('roomy-five-desktop');
   }
  }
  assert(await btn('Board full · 12 pieces').isDisabled());const full=await state(), durable=await raw();
  await btn('Board full · 12 pieces').evaluate(e=>e.click());assert.equal(await raw(),durable);
  await page.getByLabel('Board size',{exact:true}).selectOption('standard');assert.deepEqual(await state(),full);assert.equal(await raw(),durable);
  assert((await page.getByRole('status').allTextContents()).some(s=>s.includes('Move the outer pieces')));
  await btn('Remove selected').click();await btn('Undo').click();assert.deepEqual(await state(),full);
  const fullPNG=await png('roomy-twelve-export');assert.equal(fullPNG.width,2400);assert.equal(fullPNG.height,2800);
  fs.writeFileSync(path.join(out,'twelve-piece.json'),durable);result.export=fullPNG;result.saveCharacters=durable.length;assert(durable.length<2000000);
  await page.reload();await settle();await open();assert.deepEqual(await state(),JSON.parse(durable));assert.equal(await raw(),durable);assert.deepEqual(await png('roomy-twelve-reloaded'),fullPNG);
  result.checks.push('Twelve actual captures; thirteenth blocked; no-loss refusal to shrink around outlying pieces; remove/Undo, exact reload and identical 2400×2800 PNG.');
  // Movement bounds use the larger area, including a tilt, and Undo is exact.
  const item=full.items[4];await page.getByLabel('Selected board piece').selectOption(item.id);
  const beforeMove=await state();await page.getByLabel('Pinboard tilt').fill('12');
  await page.getByLabel('Pinboard tilt').dispatchEvent('change');
  for(let n=0;n<38;n++)await btn('Move right').click();
  const moved=(await metrics()).pieces[4];assert(Math.abs(moved.bounds[1]-2.32)<1e-5);assert((await state()).items[4].x>1.8);
  // Reset the evidence composition with deliberate UI moves; avoid relying on >20 Undo entries.
  await btn('Reset selected').click();for(let n=0;n<8;n++)await btn('Move left').click();for(let n=0;n<20;n++)await btn('Move down').click();
  assert.deepEqual((await state()).items.map(i=>i.snapshot),beforeMove.items.map(i=>i.snapshot));
  result.checks.push('A tilted mitten reaches the added right edge at 2.32 units without changing any capture; all-edge bounds inspected at each viewport.');
  // Restore the already-verified saved arrangement only for matched evidence.
  await page.evaluate(({key,durable})=>localStorage.setItem(key,durable),{key,durable});await page.reload();await settle();await open();
  for(const [width,height] of [[1280,900],[390,844],[320,568]]){
   await page.setViewportSize({width,height});await page.locator('.board-tools').evaluate(e=>e.scrollTop=0);
   const m=await metrics();assert(!m.overflow);assert(m.sizeVisible,`Starting square immediately reachable at ${width}`);
   assert.deepEqual(m.camera,[-2.4,2.4,-2.8,2.8]);assert.deepEqual(m.backing,[4.8,5.6]);assert(Math.abs(m.canvas[2]/m.canvas[3]-4.8/5.6)<.005);
   for(const p of m.pieces){const [l,r,b,t]=p.bounds;assert(l>=-2.32001&&r<=2.32001&&b>=-2.72001&&t<=2.72001)}
   result.layouts.push(m);await shot(`roomy-twelve-${width}`);
   if(width<720){
    const cdp=await context.newCDPSession(page), glove=m.pieces[4], [l,r,b,t]=glove.bounds;
    const [cx,cy,cw,ch]=m.canvas,x=cx+((l+r)/2+2.4)/4.8*cw,y=cy+(2.8-(b+t)/2)/5.6*ch;
    const touch=(type,dx=0)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:['touchEnd','touchCancel'].includes(type)?[]:[{x:x+dx,y,id:1}]});
    const before=await state(), saved=await raw();
    await touch('touchStart');await touch('touchMove',18);await page.waitForFunction(()=>paperCouture.pinboard.drag?.moved);await touch('touchCancel');await page.waitForFunction(()=>!paperCouture.pinboard.drag);
    assert.deepEqual((await state()).items,before.items);assert.equal(await raw(),saved);
    await touch('touchStart');await touch('touchMove',18);await touch('touchEnd');await page.waitForFunction(()=>!paperCouture.pinboard.drag);assert.notDeepEqual((await state()).items,before.items);
    await btn('Undo').click();assert.deepEqual((await state()).items,before.items);await cdp.detach();
   }
  }
  result.checks.push('1280/390/320 px: board aspect, camera/backing/bounds parity, initially reachable 44px size control; real touch cancel/commit/Undo on a mitten at both phone widths.');
  assert.deepEqual(result.errors,[]);assert.deepEqual(result.sourceRequests,[]);result.passed=true;
 }catch(e){result.failure=String(e);await shot('failure').catch(()=>{});throw e}
 finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
