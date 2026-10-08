// Real app fold progression and print-position evidence. Isolated browser storage only.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.BASE_URL||'http://127.0.0.1:5202';
const out=process.env.CAPTURE_DIR||'docs/outfit-folds/evidence/progression';
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
 for(const id of ['boat-top','wrap-top','hat']){
  await page.goto(`${base}/?design=${id}&paper=running-stitch&step=0`);await settle();let step=0;
  while(await page.evaluate(()=>!paperCouture.controller.finished)){
   await page.evaluate(()=>{paperCouture.controller.beginScrub();paperCouture.controller.scrubTo(.5)});
   await page.waitForTimeout(50);await shot(`${id}-mid-${++step}`);
   await page.evaluate(()=>paperCouture.controller.endScrub(false));await settle();await advance();
  }
  await button('Back').click();if(await page.evaluate(()=>paperCouture.controller.moving))await button('Back').click();await settle();assert.equal(await page.evaluate(()=>paperCouture.controller.step),step-1);await advance();
  await button('Display').click();await settle();
  for(const view of ['Front','Back']){await button(view).click();await settle();await shot(`${id}-stitch-${view.toLowerCase()}`)}
  await page.getByRole('radio',{name:'Corner bloom',exact:true}).click();await button('Position print').click();await button('Right').click();await button('Up').click();await button('Done').click();
  const before=await page.evaluate(()=>({step:paperCouture.controller.step,position:paperCouture.printPosition,turn:paperCouture.quarterTurns}));
  assert.notDeepEqual(before.position,{x:0,y:0});
  for(let q=0;q<4;q++)await page.getByRole('button',{name:/^Turn paper \(now /}).click();
  assert.deepEqual(await page.evaluate(()=>({step:paperCouture.controller.step,position:paperCouture.printPosition,turn:paperCouture.quarterTurns})),before);
  for(const view of ['Front','Back']){await button(view).click();await settle();await shot(`${id}-bloom-positioned-${view.toLowerCase()}`)}
  await page.reload();await settle();assert.deepEqual(await page.evaluate(()=>({step:paperCouture.controller.step,position:paperCouture.printPosition,turn:paperCouture.quarterTurns})),before);
  result.designs.push({id,steps:step,halfFoldViews:step,realFoldBack:true,quietFrontBack:true,positionedBloomFrontBack:true,fourTurns:true,reload:true});
  console.log(id+' fold/progression/print pass');
 }
 assert.deepEqual(result.errors,[]);result.passed=true;
 }catch(error){result.failure=String(error);throw error}
 finally{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
