// Real authored folds and app rendering in a fresh browser context. Test data
// only: diagnostic arrangement positions do not touch a personal saved board.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.BASE_URL||'http://127.0.0.1:5304',out=process.env.CAPTURE_DIR||'docs/companion-accent/evidence';
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1100,height:800},hasTouch:true,reducedMotion:'reduce',acceptDownloads:true}),page=await context.newPage();page.setDefaultTimeout(60000);
 const result={base,checks:[],errors:[],physicalPhoneTested:false};page.on('pageerror',e=>result.errors.push(String(e)));
 const btn=name=>page.getByRole('button',{name,exact:true});
 const settle=()=>page.waitForFunction(()=>window.paperCouture&&!paperCouture.controller.moving&&paperCouture.view.t===paperCouture.view.target&&!paperCouture.displayCam.glide);
 const load=async query=>{await page.goto(base+'/?'+query);await settle()};
 const shot=name=>page.screenshot({path:path.join(out,name+'.png')});
 const fold=async()=>{await page.locator('.dock:not(.display-dock) .btn-primary').click();if(await page.evaluate(()=>paperCouture.controller.moving))await page.locator('.dock:not(.display-dock) .btn-primary').click();await settle()};
 const open=()=>page.getByRole('button',{name:/^View board/}).click();
 const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify(paperCouture.pinboard.state)));
 const frontRed=()=>page.evaluate(()=>{const a=paperCouture;a.stage.renderer.render(a.stage.scene,a.stage.camera);const c=document.createElement('canvas');c.width=a.stage.renderer.domElement.width;c.height=a.stage.renderer.domElement.height;const ctx=c.getContext('2d');ctx.drawImage(a.stage.renderer.domElement,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data;let red=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]>100&&pixels[i]>pixels[i+1]*1.4&&pixels[i]>pixels[i+2]*1.4)red++;return red});
 try{
  await load('design=framed-brooch&paper=corner-bloom&printX=.19921875&printY=.16015625');
  for(let i=0;i<4;i++){await fold();assert.equal(await page.evaluate(()=>paperCouture.controller.step),i+1);await shot('fold-'+(i+1))}
  for(let i=4;i>0;i--){await btn('Back').click();if(await page.evaluate(()=>paperCouture.controller.moving))await btn('Back').click();await settle();assert.equal(await page.evaluate(()=>paperCouture.controller.step),i-1)}
  for(let i=0;i<4;i++)await fold();await btn('Display').click();await settle();
  for(const view of ['Front','Angle','Back']){await btn(view).click();await settle();await shot('bloom-centred-'+view.toLowerCase())}
  result.checks.push('Four actual fold buttons and all four Back buttons; refold and Front/Angle/Back views of the true4fold construction.');
  result.flowerPixels={};
  for(const[name,x,y]of [['unshifted',0,0],['centred',.19921875,.16015625],['hidden',-.25,-.25]]){
   await load(`design=framed-brooch&paper=corner-bloom&printX=${x}&printY=${y}&step=99&view=display`);await btn('Front').click();await settle();await shot('bloom-'+name+'-front');result.flowerPixels[name]=await frontRed();
  }
  // The unshifted flower is partly clipped, not mostly hidden. Demand a clear
  // improvement while separately checking the deliberately occluded placement.
  assert(result.flowerPixels.centred>result.flowerPixels.unshifted*1.2);assert(result.flowerPixels.hidden<result.flowerPixels.centred*.01);
  for(const[paper,turn]of [['oat-linen',0],['slate-grain',0],['ginkgo-pairs',0],['corner-bloom',1],['corner-bloom',2],['corner-bloom',3]]){
   await load(`design=framed-brooch&paper=${paper}&turn=${turn}&printX=.19921875&printY=.16015625&step=99&view=display`);
   for(const view of ['Front','Back']){await btn(view).click();await settle();await shot(`${paper}-${turn}-${view.toLowerCase()}`)}
  }
  result.checks.push('Actual front/back renders in Oat linen, Slate grain, Ginkgo pairs and Corner bloom at all4quarter-turns; centred bloom exposes more red ink and deliberatelybad offset hides it.');
  // Five real captures: existing outfit plus one standalone paper accent.
  for(const[design,paper,cm,x,y]of [['jacket','slate-grain',20,0,.5],['skirt','oat-linen',20,0,-.95],['clutch','running-stitch',8,1.18,-.9],['hat','slate-grain',8,0,1.6],['framed-brooch','corner-bloom',6,.25,.63]]){
   await load(`design=${design}&paper=${paper}&printX=.19921875&printY=.16015625&step=99&view=display`);await open();assert.equal(Number(await page.getByLabel('Starting square size').inputValue()),cm);const before=await state();await btn('Pin current piece').click();assert.deepEqual((await state()).items.slice(0,-1),before.items);
   await page.evaluate(({x,y})=>{const b=paperCouture.pinboard;b.mutate(()=>{const i=b.state.items.at(-1);i.x=x;i.y=y;b.position();b.constrain(i.id)})},{x,y});
  }
  let board=await state();const accent=board.items.at(-1);assert.equal(accent.paperSize.sideCm,6);assert.deepEqual(accent.snapshot.materials.find(m=>m.paper).paper.position,{x:.19921875,y:.16015625});
  const live=await page.evaluate(()=>({position:JSON.parse(JSON.stringify(Array.from(paperCouture.sheet.front.geometry.attributes.position.array))),uv:Array.from(paperCouture.sheet.front.geometry.attributes.uv.array)}));assert.deepEqual(accent.snapshot.geometries[0].position,live.position);assert.deepEqual(accent.snapshot.geometries[0].uv,live.uv);
  result.boardMeasurements=[];
  for(const sideCm of [6,7.2]){
   if(sideCm!==6){await btn('Remove selected').click();await page.getByLabel('Starting square size').selectOption(String(sideCm));await btn('Pin current piece').click();await page.evaluate(()=>{const b=paperCouture.pinboard;b.mutate(()=>{const i=b.state.items.at(-1);i.x=.25;i.y=.63;b.position();b.constrain(i.id)})});board=await state();}
  for(const[width,height]of [[1100,800],[390,844],[320,568]]){
   await page.setViewportSize({width,height});await page.locator('.board-tools').evaluate(e=>e.scrollTop=0);await shot(`outfit-${sideCm}cm-${width}`);
   const m=await page.evaluate(()=>{const b=paperCouture.pinboard,box=b.selection.box.setFromObject(b.groups.get(b.state.items.at(-1).id),true),r=b.canvas.getBoundingClientRect();return{sideCm:b.state.items.at(-1).paperSize.sideCm,viewport:[innerWidth,innerHeight],boardCanvas:[r.width,r.height],accentSize:[box.max.x-box.min.x,box.max.y-box.min.y],accentPixels:(box.max.x-box.min.x)*r.width/3.6,overflow:document.documentElement.scrollWidth>innerWidth}});assert(!m.overflow);assert(Math.abs(m.accentSize[0]-sideCm/20*1.5)<1e-6);result.boardMeasurements.push(m);
  }
  }
  await btn('Move right').click();await btn('Undo').click();assert.deepEqual(await state(),board);await btn('Remove selected').click();await btn('Undo').click();assert.deepEqual(await state(),board);
  await page.reload();await settle();await open();assert.deepEqual(await state(),board);
  const expected=await page.evaluate(()=>{const b=paperCouture.pinboard;b.selection.visible=false;b.renderer.setSize(1800,2100,false);b.renderer.render(b.scene,b.camera);return b.canvas.toDataURL('image/png')});
  const[d]=await Promise.all([page.waitForEvent('download'),btn('Save PNG').click()]);const file=path.join(out,'outfit-export.png');await d.saveAs(file);assert.deepEqual(fs.readFileSync(file),Buffer.from(expected.split(',')[1],'base64'));
  fs.writeFileSync(path.join(out,'outfit-v1.json'),JSON.stringify(board));
  result.checks.push('6and7.2cm standalone captures among existingjacket/skirt/clutch/hat; exactgeometry/UV/paper offset and priorcapture preservation; desktop390/320 nooverflow; move/removeUndo,reload,exact1800×2100PNG.');
  assert.deepEqual(result.errors,[]);result.passed=true;
 }catch(e){result.failure=String(e);await shot('failure').catch(()=>{});throw e}finally{fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
