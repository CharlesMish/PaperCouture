// Real app review, isolated browser context. No user storage or external inputs.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.BASE_URL||'http://127.0.0.1:5302';
const out=process.env.CAPTURE_DIR||'docs/companion-folds/evidence/browser';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const result={base,designs:[],errors:[],physicalPaperTested:false,physicalPhoneTested:false};
 try{
 fs.mkdirSync(out,{recursive:true});
 const context=await browser.newContext({viewport:{width:900,height:760},reducedMotion:'reduce'}),page=await context.newPage();
 page.setDefaultTimeout(60000);page.on('pageerror',e=>result.errors.push(String(e)));
 const button=name=>page.getByRole('button',{name,exact:true});
 const settle=()=>page.waitForFunction(()=>window.paperCouture&&!paperCouture.controller.moving&&paperCouture.view.t===paperCouture.view.target&&!paperCouture.displayCam.glide);
 const shot=name=>page.screenshot({path:path.join(out,name+'.png'),timeout:60000});
 const advance=async()=>{const before=await page.evaluate(()=>paperCouture.controller.step);await page.locator('.dock:not([hidden]) .btn-primary').click();if(await page.evaluate(()=>paperCouture.controller.moving))await page.locator('.dock:not([hidden]) .btn-primary').click();await page.waitForFunction(n=>!paperCouture.controller.moving&&paperCouture.controller.step===n+1,before)};
 const state=()=>page.evaluate(()=>({design:paperCouture.garmentId,step:paperCouture.controller.step,position:paperCouture.printPosition,turn:paperCouture.quarterTurns}));
 for(const id of ['capelet','boot-left','boot-right']){
  const response=await page.goto(`${base}/?design=${id}&paper=oat-linen&step=0`);assert(response?.ok());await settle();assert.equal((await state()).design,id);let step=0;
  while(await page.evaluate(()=>!paperCouture.controller.finished)){
   const fractions=id.startsWith('boot-')&&[3,4].includes(step)?[.25,.5,.75]:[.5];
   for(const fraction of fractions){
    await page.evaluate(t=>{paperCouture.controller.beginScrub();paperCouture.controller.scrubTo(t)},fraction);
    await page.waitForTimeout(50);await shot(`${id}-step-${step+1}-${fraction*100}`);
    await page.evaluate(()=>paperCouture.controller.endScrub(false));await settle();
   }
   await advance();step++;
  }
  await button('Back').click();if(await page.evaluate(()=>paperCouture.controller.moving))await button('Back').click();await settle();assert.equal((await state()).step,step-1);await advance();
  const geometry=await page.evaluate(()=>JSON.stringify(paperCouture.timeline.states.at(-1).facets));
  await button('Display').click();await settle();
  for(const view of ['Front','Angle','Back']){await button(view).click();await settle();await shot(`${id}-oat-${view.toLowerCase()}`)}
  console.log(id+' real folds and quiet front/angle/back pass');
  await page.getByRole('radio',{name:'Corner bloom',exact:true}).click();
  const turns=id==='boot-left'?[0]:[0,1,2,3];
  for(const q of turns){
   while((await state()).turn!==q)await page.getByRole('button',{name:/^Turn paper/}).click();
   await button('Position print').click();await button('Reset print').click();await button('Done').click();assert.deepEqual((await state()).position,{x:0,y:0});
   for(const view of ['Front','Back']){await button(view).click();await settle();await shot(`${id}-bloom-${q}-original-${view.toLowerCase()}`)}
   await button('Position print').click();for(let n=0;n<4;n++){await button('Right').click();await button('Up').click()}await button('Done').click();
   assert.deepEqual((await state()).position,{x:.125,y:.125});
   for(const view of ['Front','Back']){await button(view).click();await settle();await shot(`${id}-bloom-${q}-shifted-${view.toLowerCase()}`)}
   assert.equal(await page.evaluate(()=>JSON.stringify(paperCouture.timeline.states.at(-1).facets)),geometry,'ink changes must not rebuild or change completed material');
  }
  const before=await state();await page.reload();await settle();assert.deepEqual(await state(),before);
  result.designs.push({id,steps:step,realFoldBack:true,halfFoldViews:step,extraAnkleToeQuarterViews:id.startsWith('boot-')?4:0,quietFrontAngleBack:true,bloomBeforeAfterFrontBackTurns:turns.map(q=>q*90),shift:{x:.125,y:.125},unchangedCompletedMaterial:true,reload:true});
  console.log(id+' rendered print-position and reload pass');
 }
 assert.deepEqual(result.errors,[]);result.passed=true;
 }catch(error){result.failure=String(error);throw error}
 finally{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
