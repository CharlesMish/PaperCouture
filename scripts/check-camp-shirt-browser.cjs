// Isolated local contexts only; never reads the owner's browser/profile/save.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://127.0.0.1:5317';
const out = process.env.CAPTURE_DIR || 'docs/camp-shirt/evidence/browser';
const key = 'paper-couture.pinboard.v1';
(async () => {
 const browser = await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const result = {base,checks:[],errors:[],physicalPaperTested:false,physicalPhoneTested:false};
 fs.mkdirSync(out,{recursive:true});
 const make = async (width=1180,height=900) => {
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',acceptDownloads:true});
  const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>result.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text())});
  const btn=name=>page.getByRole('button',{name,exact:true});
  const settle=()=>page.waitForFunction(()=>window.paperCouture&&!paperCouture.controller.moving&&paperCouture.view.t===paperCouture.view.target&&!paperCouture.displayCam.glide);
  const state=()=>page.evaluate(()=>({design:paperCouture.garmentId,step:paperCouture.controller.step,turn:paperCouture.quarterTurns,position:paperCouture.printPosition}));
  const load=async q=>{const r=await page.goto(base+'/?'+q);assert(r.ok());await settle()};
  const advance=async()=>{const before=(await state()).step;await page.locator('.dock:not([hidden]) .btn-primary').click();if(await page.evaluate(()=>paperCouture.controller.moving))await page.locator('.dock:not([hidden]) .btn-primary').click();await settle();assert.equal((await state()).step,before+1)};
  const back=async()=>{const before=(await state()).step;await btn('Back').click();if(await page.evaluate(()=>paperCouture.controller.moving))await btn('Back').click();await settle();assert.equal((await state()).step,before-1)};
  const open=()=>page.getByRole('button',{name:/^View board/}).click();
  const board=()=>page.evaluate(()=>structuredClone(paperCouture.pinboard.state));
  const shot=name=>page.screenshot({path:path.join(out,name+'.png')});
  const view=async name=>{await btn(name).click();await settle()};
  const exportPNG=async name=>{
   const expected=await page.evaluate(()=>{const b=paperCouture.pinboard;b.selection.visible=false;b.renderer.setSize(1800,2100,false);b.renderer.render(b.scene,b.camera);return b.canvas.toDataURL('image/png')});
   const[d]=await Promise.all([page.waitForEvent('download'),btn('Save PNG').click()]);const file=path.join(out,name+'.png');await d.saveAs(file);
   assert.deepEqual(fs.readFileSync(file),Buffer.from(expected.split(',')[1],'base64'));return file;
  };
  return{context,page,btn,settle,state,load,advance,back,open,board,shot,view,exportPNG};
 };
 let active;
 try{
  const p=active=await make();const{context,page,btn,settle,state,load,advance,back,open,board,shot,view}=p;
  await load('design=camp-shirt&paper=oat-linen&step=0');assert.equal((await state()).design,'camp-shirt');
  await open();assert(await btn('Pin current piece').isDisabled());await btn('Return to folding').click();
  await page.locator('.dock:not([hidden]) .btn-primary').click();await btn('Start over').click();await settle();assert.equal((await state()).step,0);
  for(let step=0;step<14;step++){
   // Exact half-fold evidence and cancel, then real UI advance. Scrubbing is
   // diagnostic; it is not claimed as a mouse/touch drag gesture.
   await page.evaluate(()=>{paperCouture.controller.beginScrub();paperCouture.controller.scrubTo(.5)});await page.waitForTimeout(30);await shot(`motion-${String(step+1).padStart(2,'0')}`);
   await page.evaluate(()=>paperCouture.controller.endScrub(false));await settle();assert.equal((await state()).step,step);await advance();
  }
  for(let i=0;i<14;i++)await back();assert.equal((await state()).step,0);
  for(let i=0;i<14;i++)await advance();
  const geometry=await page.evaluate(()=>JSON.stringify(paperCouture.timeline.states.at(-1).facets));
  result.checks.push('14 real forward folds, 14 Back operations, 14 repeated forward folds; each half-fold rendered and cancelled; Start over during motion; unfinished capture disabled.');console.log(result.checks.at(-1));
  await btn('Display').click();await settle();
  for(const paper of['Oat linen','Slate grain']){
   await page.getByRole('radio',{name:paper,exact:true}).click();
   for(const v of['Front','Angle','Back']){await view(v);await shot(`${paper.toLowerCase().replace(' ','-')}-${v.toLowerCase()}`)}
  }
  await page.getByRole('radio',{name:'Corner bloom',exact:true}).click();
  for(let q=0;q<4;q++){
   while((await state()).turn!==q)await page.getByRole('button',{name:/^Turn paper/}).click();
   await btn('Position print').click();await btn('Reset print').click();await btn('Done').click();assert.deepEqual((await state()).position,{x:0,y:0});
   for(const v of['Front','Back']){await view(v);await shot(`bloom-${q}-original-${v.toLowerCase()}`)}
   await btn('Position print').click();for(let n=0;n<4;n++){await btn('Right').click();await btn('Down').click()}await btn('Done').click();assert.deepEqual((await state()).position,{x:.125,y:-.125});
   for(const v of['Front','Back']){await view(v);await shot(`bloom-${q}-shifted-${v.toLowerCase()}`)}
   assert.equal(await page.evaluate(()=>JSON.stringify(paperCouture.timeline.states.at(-1).facets)),geometry);
  }
  const saved=await state();await page.reload();await settle();assert.deepEqual(await state(),saved);
  // This paper has a separately authored back drawing; examine both faces at
  // all four turns without changing completed material or print coordinates.
  await page.getByRole('radio',{name:'Reverse garden',exact:true}).click();
  for(let q=0;q<4;q++){
   while((await state()).turn!==q)await page.getByRole('button',{name:/^Turn paper/}).click();
   for(const v of['Front','Back']){await view(v);await shot(`garden-${q}-${v.toLowerCase()}`)}
   assert.equal(await page.evaluate(()=>JSON.stringify(paperCouture.timeline.states.at(-1).facets)),geometry);
  }
  await btn('Turntable').click();await page.waitForTimeout(400);await btn('Turntable').click();await view('Angle');await shot('turned-angle');
  await btn('Return to the workshop').click();await settle();await back();assert.equal((await state()).step,13);await advance();
  result.checks.push('Actual front/angle/back; Corner bloom before/after bounded sliding at all four turns on both faces; separate Reverse garden back at four turns; completed material identical; reload, Turntable and Display→Workshop Back/refold.');console.log(result.checks.at(-1));
  // Independent four-piece outfit: shirt + skirt + hat + clutch. Pin
  // controls create every capture. Diagnostic positions make comparisons fair.
  const items=[['camp-shirt','corner-bloom',18,-.28,.60],['skirt','slate-grain',20,-.28,-.57],['hat','oat-linen',8,-.28,1.40],['clutch','corner-bloom',8,1.02,-.30]];
  for(const[id,paper,cm,x,y]of items){
   await load(`design=${id}&paper=${paper}&step=99&view=display&printX=0.125&printY=-0.125`);await open();assert.equal(Number(await page.getByLabel('Starting square size').inputValue()),cm);
   const before=await board();await btn('Pin current piece').click();let b=await board();assert.deepEqual(b.items.slice(0,-1),before.items);assert.equal(b.items.at(-1).paperSize.sideCm,cm);
   const live=await page.evaluate(()=>({position:Array.from(paperCouture.sheet.front.geometry.attributes.position.array),uv:Array.from(paperCouture.sheet.front.geometry.attributes.uv.array)}));
   assert.deepEqual(b.items.at(-1).snapshot.geometries[0].position,live.position);assert.deepEqual(b.items.at(-1).snapshot.geometries[0].uv,live.uv);
   await page.evaluate(({x,y})=>{const b=paperCouture.pinboard;b.mutate(()=>{const i=b.state.items.at(-1);i.x=x;i.y=y;b.position();b.constrain(i.id)})},{x,y});
  }
  const outfit=await board();await page.locator('.board-tools').evaluate(e=>e.scrollTop=0);await shot('outfit-desktop');await p.exportPNG('outfit-composite');
  fs.writeFileSync(path.join(out,'outfit.json'),JSON.stringify(outfit));
  // A second capture of the same source is independent, with an explicit size.
  await load('design=camp-shirt&paper=corner-bloom&step=99&view=display&printX=0.125&printY=-0.125');await open();
  await page.getByLabel('Starting square size').selectOption('14.4');const preRepeat=await board();await btn('Pin current piece').click();const repeated=await board();assert.deepEqual(repeated.items.slice(0,-1),preRepeat.items);assert.equal(repeated.items.at(-1).paperSize.sideCm,14.4);
  assert.equal(JSON.stringify(repeated.items[0].snapshot.geometries),JSON.stringify(repeated.items.at(-1).snapshot.geometries),'JSON round-trip only canonicalizes signed zero');assert.deepEqual(repeated.items[0].snapshot.materials,repeated.items.at(-1).snapshot.materials);
  assert(await btn('Board full · five pieces').isDisabled());await btn('Remove selected').click();await btn('Undo').click();assert.deepEqual(await board(),repeated);await btn('Remove selected').click();
  // Retain outfit while making local UI move/tilt changes and undo them.
  await page.getByLabel('Selected board piece').selectOption(outfit.items[0].id);const arranged=await board();await btn('Move right').click();await btn('Undo').click();assert.deepEqual(await board(),arranged);
  await page.getByLabel('Pinboard tilt').fill('8');await btn('Undo').click();assert.deepEqual(await board(),arranged);
  await page.reload();await settle();await open();assert.deepEqual(await board(),JSON.parse(JSON.stringify(arranged)));
  for(const[width,height]of[[390,844],[320,568],[844,390]]){
   await page.setViewportSize({width,height});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);await page.locator('.board-tools').evaluate(e=>e.scrollTop=0);await shot(`outfit-${width}`);
  }
  await page.setViewportSize({width:1180,height:900});await btn('Return to folding').click();await settle();await btn('Start over').click();await settle();await open();assert.deepEqual(await board(),arranged);
  result.checks.push('18cm shirt with 20cm skirt, 8cm hat and 8cm clutch: actual pin controls; exact posed vertices/UVs; independent 14.4cm repeat capture; five-slot cap; remove/Undo, move/tilt/Undo, reload and reset preserve captures; 390/320/landscape layouts; PNG byte-identical to the visible 1800×2100 composite.');console.log(result.checks.at(-1));
  await context.close();
  // Same exact prior capture fixture in a fresh profile. New reader must not
  // reinterpret or rewrite valid captures when a new design is introduced.
  const legacy=active=await make(390,844),raw=fs.readFileSync(path.join(__dirname,'../docs/board-space/fixtures/longline-long.json'),'utf8');
  await legacy.context.addInitScript(({key,raw})=>{if(!localStorage.getItem(key))localStorage.setItem(key,raw)},{key,raw});
  await legacy.load('design=camp-shirt&paper=oat-linen&step=99&view=display');await legacy.open();assert.deepEqual(await legacy.board(),JSON.parse(raw));assert.equal(await legacy.page.evaluate(k=>localStorage.getItem(k),key),raw);
  await legacy.btn('Pin current piece').click();const mixed=await legacy.board();assert.deepEqual(mixed.items.slice(0,-1),JSON.parse(raw).items);await legacy.page.reload();await legacy.settle();await legacy.open();assert.deepEqual(await legacy.board(),JSON.parse(JSON.stringify(mixed)));
  await legacy.exportPNG('legacy-plus-shirt');await legacy.context.close();
  result.checks.push('Published v1 fixture retains original durable bytes on read; new shirt capture preserves old geometry/material/matrices; mixed board reloads and exports.');
  assert.deepEqual(result.errors,[]);result.passed=true;
 }catch(e){result.failure=String(e);if(active)await active.shot('failure').catch(()=>{});throw e}
 finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
