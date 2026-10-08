const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.BASE_URL||'http://127.0.0.1:5317',out=process.env.CAPTURE_DIR||'docs/camp-shirt/evidence/outfits';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});fs.mkdirSync(out,{recursive:true});
 const result={errors:[],comparisons:[],physicalPhoneTested:false};
 try{
 for(const[top,cm,height]of[['boat-top',16,.736],['wrap-top',18,1.2101735015772872],['camp-shirt',18,1.089]]){
  const context=await browser.newContext({viewport:{width:1180,height:900},reducedMotion:'reduce',acceptDownloads:true}),p=await context.newPage();
  p.on('pageerror',e=>result.errors.push(String(e)));const btn=name=>p.getByRole('button',{name,exact:true});const settle=()=>p.waitForFunction(()=>window.paperCouture&&!paperCouture.controller.moving&&paperCouture.view.t===paperCouture.view.target&&!paperCouture.displayCam.glide);
  for(const[id,paper,size,x,y]of[[top,'oat-linen',cm,-.28,.055+height/2],['skirt','slate-grain',20,-.28,-.57],['hat','oat-linen',8,-.28,.055+height+.26],['clutch','corner-bloom',8,1.02,-.30]]){
   await p.goto(`${base}/?design=${id}&paper=${paper}&step=99&view=display&printX=0.125&printY=-0.125`);await settle();
   await p.getByRole('button',{name:/^View board/}).click();assert.equal(Number(await p.getByLabel('Starting square size').inputValue()),size);await btn('Pin current piece').click();
   await p.evaluate(({x,y})=>{const b=paperCouture.pinboard;b.mutate(()=>{const i=b.state.items.at(-1);i.x=x;i.y=y;b.position();b.constrain(i.id)})},{x,y});
  }
  await p.locator('.board-tools').evaluate(e=>e.scrollTop=0);await p.screenshot({path:path.join(out,top+'-ui.png')});
  const[d]=await Promise.all([p.waitForEvent('download'),btn('Save PNG').click()]);await d.saveAs(path.join(out,top+'-outfit.png'));
  const board=await p.evaluate(()=>structuredClone(paperCouture.pinboard.state));fs.writeFileSync(path.join(out,top+'-board.json'),JSON.stringify(board));
  result.comparisons.push({top,startingSquareCm:cm,topHeightBoardUnits:height,commonWaistY:.055,items:board.items.map(i=>({title:i.title,size:i.paperSize,x:i.x,y:i.y}))});await context.close();
 }
 if(!process.env.SKIP_CONTROLS){
 // Actual small-flap pointer and keyboard controls at a phone-sized viewport.
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',hasTouch:true}),p=await context.newPage();p.on('pageerror',e=>result.errors.push(String(e)));
 const settle=()=>p.waitForFunction(()=>window.paperCouture&&!paperCouture.controller.moving&&paperCouture.view.t===paperCouture.view.target&&!paperCouture.displayCam.glide);
 let pointerChecks=0,keyboardChecks=0;
 for(const step of[0,5,7,10]){
  await p.goto(`${base}/?design=camp-shirt&paper=oat-linen&step=${step}`);await settle();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),390);
  const handle=p.getByRole('button',{name:'Fold small flap 1',exact:true});await handle.waitFor({state:'visible'});const rect=await handle.boundingBox();assert(rect.width>=44&&rect.height>=44);assert(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=390&&rect.y+rect.height<=844);
  await p.screenshot({path:path.join(out,`phone-step-${step}.png`)});
  await handle.click();await settle();assert.equal(await p.evaluate(()=>paperCouture.controller.step),step+1);pointerChecks++;
  await p.getByRole('button',{name:'Back',exact:true}).click();await settle();await handle.focus();await p.keyboard.press('Enter');await settle();assert.equal(await p.evaluate(()=>paperCouture.controller.step),step+1);keyboardChecks++;
 }
 await p.goto(`${base}/?design=camp-shirt&paper=corner-bloom&step=14&view=display&printX=0.125&printY=-0.125`);await settle();await p.screenshot({path:path.join(out,'phone-display.png')});
 await p.getByRole('button',{name:'Position print',exact:true}).click();const preview=p.getByLabel('Flat printed side of the current paper. Drag to slide its artwork.');await preview.focus();await p.keyboard.press('ArrowRight');
 assert.equal(await p.evaluate(()=>paperCouture.printPosition.x),.15625);await p.getByRole('button',{name:'Done',exact:true}).click();await context.close();
 result.smallFlapControls={pointerChecks,keyboardChecks,hitTargetMinPx:44,viewport:[390,844],printKeyboard:true};}
 assert.deepEqual(result.errors,[]);result.passed=true;
 }catch(e){result.failure=String(e);throw e}finally{fs.writeFileSync(path.join(out,process.env.SKIP_CONTROLS?'comparison-results.json':'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
