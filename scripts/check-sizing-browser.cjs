// Fresh browser contexts only. Real capture controls, uniform bounds, old saves,
// explicit size choices, accessories, print recipes, Undo, touch and exact PNG.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://127.0.0.1:5297', out = process.env.CAPTURE_DIR || '.sizing-qa';
const key = 'paper-couture.pinboard.v1'; fs.mkdirSync(out, {recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const result={base,checks:[],measurements:[],errors:[],physicalPhoneTested:false};
 const make=async viewport=>{
  const context=await browser.newContext({viewport,reducedMotion:'reduce',hasTouch:true,acceptDownloads:true}),page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>result.errors.push(String(e)));
  const btn=name=>page.getByRole('button',{name,exact:true});
  const settle=()=>page.waitForFunction(()=>window.paperCouture&&!paperCouture.controller.moving&&paperCouture.view.t===paperCouture.view.target&&!paperCouture.displayCam.glide);
  const load=async query=>{await page.goto(base+'/?'+query);await settle()};
  const open=()=>page.getByRole('button',{name:/^View board/}).click();
  const state=()=>page.evaluate(()=>structuredClone(paperCouture.pinboard.state));
  const bounds=()=>page.evaluate(async()=>{const THREE=await import('/node_modules/.vite/deps/three.js'),b=paperCouture.pinboard;return b.state.items.map(i=>{const box=new THREE.Box3().setFromObject(b.groups.get(i.id),true);return {title:i.title,size:box.getSize(new THREE.Vector3()).toArray(),bounds:[box.min.x,box.max.x,box.min.y,box.max.y]}})});
  const exportPNG=async name=>{const expected=await page.evaluate(()=>{const b=paperCouture.pinboard;b.selection.visible=false;b.renderer.setSize(1800,2100,false);b.renderer.render(b.scene,b.camera);return b.canvas.toDataURL('image/png')});const[d]=await Promise.all([page.waitForEvent('download'),btn('Save PNG').click()]);const file=path.join(out,name+'.png');await d.saveAs(file);assert.deepEqual(fs.readFileSync(file),Buffer.from(expected.split(',')[1],'base64'));};
  return {context,page,btn,settle,load,open,state,bounds,exportPNG};
 };
 try {
  for(const width of [1280,390,320]) for(const version of ['same-square','suggested']) {
   const p=await make({width,height:width===320?568:width===390?844:900});const {context,page,btn,load,open,state,bounds,exportPNG}=p;
   for(const[id,x,y]of [['jacket',-.72,.72],['skirt',-.72,-.64],['apron',.84,.72],['clutch',.92,-.75]]){
    await load(`design=${id}&paper=${id==='clutch'?'plum-scatter':'corner-bloom'}&printX=0.125&printY=0.0625&step=99&view=display`);await open();
    const expectedCm=id==='clutch'?8:id==='apron'?14:20;assert.equal(Number(await page.getByLabel('Starting square size').inputValue()),expectedCm);
    if(version==='same-square')await page.getByLabel('Starting square size').selectOption('20');
    const old=await state();await btn('Pin current piece').click();let s=await state();assert.deepEqual(s.items.slice(0,-1),old.items);
    const item=s.items.at(-1);assert.equal(item.paperSize.sideCm,version==='same-square'?20:expectedCm);
    assert.equal(item.snapshot.materials.find(m=>m.paper).paper.position.x,.125);
    const live=await page.evaluate(()=>({position:Array.from(paperCouture.sheet.front.geometry.attributes.position.array),uv:Array.from(paperCouture.sheet.front.geometry.attributes.uv.array)}));
    assert.deepEqual(item.snapshot.geometries[0].position,live.position);assert.deepEqual(item.snapshot.geometries[0].uv,live.uv);
    // Fixed diagnostic positions make the comparison repeatable; separate
    // interaction checks below and check-board-browser use actual move controls.
    await page.evaluate(({x,y})=>{const b=paperCouture.pinboard;b.mutate(()=>{const i=b.state.items.at(-1);i.x=x;i.y=y;b.position();b.constrain(i.id)})},{x,y});
   }
   const before=await state();await page.getByLabel('Starting square size').selectOption('20');assert.deepEqual(await state(),before,'Changing a future capture choice must not resize kept pieces');
   await page.getByLabel('Starting square size').selectOption(String(before.items.at(-1).paperSize.sideCm));
   const measured=await bounds();result.measurements.push({width,version,items:measured});
   for(const m of measured){const[l,r,b,t]=m.bounds;assert(l>=-1.72001&&r<=1.72001&&b>=-2.02001&&t<=2.02001)}
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
   await page.locator('.board-tools').evaluate(e=>e.scrollTop=0);await page.screenshot({path:path.join(out,`${version}-${width}.png`)});
   if(width===1280||width===320&&version==='suggested')await exportPNG(`${version}-${width}-composite`);
   await btn('Remove selected').click();await btn('Undo').click();assert.deepEqual(await state(),before);
   await page.reload();await p.settle();await open();assert.deepEqual(await state(),JSON.parse(JSON.stringify(before)));await context.close();
  }
  result.checks.push('Four actual assembled designs at desktop/390/320: suggested vs same20cm square comparisons; exact live vertices/UV/offsets captured; old captures unchanged; bounds/portrait/reload/removeUndo/exact1800×2100PNG.');
  // Existing v1 arrays and durable bytes are never silently reinterpreted.
  const p=await make({width:390,height:844}),{context,page,btn,load,open,state,bounds}=p;
  const raw=fs.readFileSync(path.join(__dirname,'../docs/board-space/fixtures/longline-long.json'),'utf8');
  await context.addInitScript(({key,raw})=>{if(localStorage.getItem(key)===null)localStorage.setItem(key,raw)},{key,raw});
  await load('design=clutch&paper=plum-scatter&step=99&view=display');await open();assert.deepEqual(await state(),JSON.parse(raw));assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),raw);
  await page.getByLabel('Starting square size').selectOption('6.4');await btn('Pin current piece').click();let s=await state();assert.deepEqual(s.items.slice(0,2),JSON.parse(raw).items);assert.equal(s.items[2].paperSize.sideCm,6.4);
  const m=(await bounds())[2];assert(Math.abs(m.size[0]-.416)<1e-6);assert(Math.abs(m.size[1]-.3264)<1e-6);
  await page.getByLabel('Pinboard tilt').fill('12');await btn('Move right').evaluate(e=>{for(let i=0;i<25;i++)e.click()});await btn('Move down').evaluate(e=>{for(let i=0;i<25;i++)e.click()});
  s=await state();const durable=await page.evaluate(key=>localStorage.getItem(key),key);
  await page.evaluate(()=>{window.savedSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='paper-couture.pinboard.v1')throw new Error('Quota');return window.savedSet.call(this,k,v)}});
  await btn('Move left').click();assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),durable);assert((await page.locator('.board-storage').innerText()).includes('only in this tab'));
  await page.evaluate(()=>Storage.prototype.setItem=window.savedSet);await btn('Undo').click();assert.deepEqual(await state(),s);
  await page.reload();await p.settle();await open();assert.deepEqual(await state(),JSON.parse(JSON.stringify(s)));await context.close();
  result.checks.push('Published v1 fixture loads without metadata or storage rewrite;6.4cm custom capture beside old pieces;±bounds repeat; quota failure preserves durable record and Undo/reload retains size.');
  // Standalone accessory sheet has its real small-square scale, whether pinned
  // in its own workshop or from the assembled garment source.
  const a=await make({width:1280,height:900});await a.load('design=jacket&paper=corner-bloom&step=99&view=display');
  await a.btn('Fold accessory').click();await a.settle();
  while(!await a.page.evaluate(()=>paperCouture.controller.finished)){await a.page.locator('.dock:not(.display-dock) .btn-primary').click();if(await a.page.evaluate(()=>paperCouture.controller.moving))await a.page.locator('.dock:not(.display-dock) .btn-primary').click();await a.settle()}
  await a.open();assert.equal(Number(await a.page.getByLabel('Starting square size').inputValue()),3.2);await a.btn('Pin current piece').click();const alone=(await a.bounds())[0];
  await a.btn('Return to piece').click();await a.btn('Attach').click();await a.settle();await a.open();
  await a.page.getByLabel('Piece to pin').selectOption('1');assert.equal(Number(await a.page.getByLabel('Starting square size').inputValue()),3.2);await a.btn('Pin current piece').click();const attached=(await a.bounds())[1];
  for(let n=0;n<3;n++)assert(Math.abs(alone.size[n]-attached.size[n])<1e-6,'Separate and attached accessorized sources retain same real paper scale');
  await a.page.getByLabel('Piece to pin').selectOption('0');await a.page.getByLabel('Starting square size').selectOption('16');await a.btn('Pin current piece').click();
  const sized=(await a.state()).items[2];assert.deepEqual(sized.paperSize,{sideCm:16,companionCm:[2.56]});
  await a.exportPNG('accessory-source-parity');await a.context.close();
  result.checks.push('Diamond pin folded with real buttons:3.2cm standalone workshop capture equals assembled accessory-only capture in all3dimensions;16cm garment scales pin to2.56cm uniformly and exports.');
  assert.deepEqual(result.errors,[]);result.passed=true;
 }catch(e){result.failure=String(e);throw e}finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
