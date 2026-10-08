const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.BASE_URL||'http://127.0.0.1:5173/',out=process.env.OUT||path.join(__dirname,'browser');fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const c=await b.newContext({viewport:{width:1100,height:800},hasTouch:true,reducedMotion:'reduce'}),p=await c.newPage();p.setDefaultTimeout(45000);const r={base,errors:[],badResponses:[],checks:[]};p.on('pageerror',e=>r.errors.push(String(e)));p.on('response',x=>{if(x.status()>=400)r.badResponses.push([x.url(),x.status()])});
const settle=()=>p.waitForFunction(()=>window.paperCouture&&!paperCouture.controller.moving&&paperCouture.view.t===paperCouture.view.target&&!paperCouture.displayCam.glide);
const shot=n=>p.screenshot({path:path.join(out,n+'.png')});const btn=n=>p.getByRole('button',{name:n,exact:true});
const fold=async()=>{const s=await p.evaluate(()=>paperCouture.controller.step);await p.locator('.dock:not([hidden]) .btn-primary').click();if(process.env.SMOKE_ONLY&&await p.evaluate(()=>paperCouture.controller.moving))await p.locator('.dock:not([hidden]) .btn-primary').click();await p.waitForFunction(s=>paperCouture.controller.step===s+1&&!paperCouture.controller.moving,s)};
const finish=async()=>{while(await p.evaluate(()=>!paperCouture.controller.finished))await fold()};
try{
await p.goto(base);await settle();await p.evaluate(()=>localStorage.setItem('__astra_synthetic_save','keep'));
assert.deepEqual(await p.getByLabel('Garment design').locator('option').evaluateAll(xs=>xs.map(x=>x.value)),['dress','jacket','skirt','vest','pleats','clutch','apron','tunic','tabard']);
for(const id of ['apron','clutch','tunic']){
 await p.getByLabel('Garment design').selectOption(id);await settle();assert.match(await p.locator('.experiment-note').innerText(),/One square/);await p.getByRole('radio',{name:'Border print',exact:true}).click();
 const count=await p.evaluate(()=>paperCouture.timeline.ops.length);
 for(let i=0;i<count;i++){
  if(!process.env.SMOKE_ONLY){await p.evaluate(()=>paperCouture.controller.beginScrub());for(const t of [.25,.5,.75]){await p.evaluate(t=>paperCouture.controller.scrubTo(t),t);await p.waitForTimeout(100);await shot(`${id}-step${i+1}-${t}`)}await p.evaluate(()=>paperCouture.controller.endScrub(false));await settle()}
  await fold();
 }
 assert.equal(await p.getByLabel('Accessory type').isVisible(),false);
 await btn('Display').click();await settle();
 for(let q=0;q<(process.env.SMOKE_ONLY?1:4);q++){
  for(const view of ['Front','Angle','Back']){await btn(view).click();await settle();await shot(`${id}-turn${q}-${view}`)}
  await p.getByRole('button',{name:/^Turn paper \(now /}).click();await settle();
 }
 await btn('Reset view').click();await settle();
 if(!process.env.SMOKE_ONLY){const names=await p.getByRole('radio').evaluateAll(xs=>xs.map(x=>x.getAttribute('aria-label')));for(const name of names){await p.getByRole('radio',{name,exact:true}).click();await p.waitForTimeout(40);assert.equal(await p.getByRole('radio',{name,exact:true}).getAttribute('aria-checked'),'true')}r.checks.push(id+': '+names.length+' visible papers rendered')}
 await btn('Return to the workshop').click();await settle();await btn('Back').click();await settle();assert.equal(await p.evaluate(()=>paperCouture.controller.step),count-1);await fold();
 r.checks.push(id+': real Fold/Back, Front/Angle/Back; experimental label and no unreviewed accessory anchors'+(process.env.SMOKE_ONLY?'':'; all sampled operations and four paper turns'));
}
// Switching keeps completed designs; reset applies to just the selected design.
await p.getByLabel('Garment design').selectOption('apron');await settle();assert(await p.evaluate(()=>paperCouture.controller.finished));await btn('Start over').click();await settle();assert.equal(await p.evaluate(()=>paperCouture.controller.step),0);await fold();
await p.getByLabel('Garment design').selectOption('clutch');await settle();assert(await p.evaluate(()=>paperCouture.controller.finished));await p.getByLabel('Garment design').selectOption('apron');await settle();assert.equal(await p.evaluate(()=>paperCouture.controller.step),1);
// Saved accessory survives an excursion into an unsupported silhouette.
await p.getByLabel('Garment design').selectOption('jacket');await settle();await finish();await p.getByLabel('Accessory type').selectOption('kerchief');await btn('Fold accessory').click();await settle();await finish();await btn('Attach').click();await settle();assert(await p.evaluate(()=>paperCouture.attached));await p.getByLabel('Garment design').selectOption('tunic');await settle();assert.match(await p.locator('.experiment-note').textContent(),/kept aside/);await p.getByLabel('Garment design').selectOption('jacket');await settle();assert(await p.evaluate(()=>paperCouture.attached&&paperCouture.controller.finished));assert.equal(await p.getByLabel('Accessory type').inputValue(),'kerchief');assert(await btn('Edit accessory').isVisible());r.checks.push('Per-design progress/reset and completed neckerchief round trip retained');
for(const size of [{width:390,height:844},{width:844,height:390}]){
 await p.setViewportSize(size);
 for(const id of ['apron','clutch','tunic']){
  await p.getByLabel('Garment design').selectOption(id);await settle();await finish();await p.getByRole('radio',{name:'Pinstripe and lining',exact:true}).click();await btn('Display').click();await settle();await btn('Front').click();await settle();await shot(`${id}-${size.width}-front`);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),size.width);assert(await p.locator('.experiment-note').isVisible());
  const free=await p.evaluate(()=>{const a=document.querySelector('.studio-controls').getBoundingClientRect(),b=document.querySelector('.display-dock').getBoundingClientRect();return b.top-a.bottom});assert(free>80,`no usable display area: ${free}`);
  await btn('Back').click();await settle();await shot(`${id}-${size.width}-back`);
 }
 r.checks.push(size.width+'x'+size.height+': design selection, complete folds, front/back, visible caveat, free display area and no page overflow');
}
// Current design/options/paper/turn/progress survive a normal reload through URL state.
await p.goto(base+'?design=skirt&skirtLength=long&band=single&wrap=opposite&paper=border-print&turn=2');await settle();await finish();await btn('Display').click();await settle();await p.reload();await settle();assert(await p.evaluate(()=>paperCouture.garmentId==='skirt'&&paperCouture.options.skirtLength==='long'&&paperCouture.options.band==='single'&&paperCouture.options.wrap==='opposite'&&paperCouture.paperId==='border-print'&&paperCouture.quarterTurns===2&&paperCouture.controller.finished&&paperCouture.view.inDisplay));
await p.getByLabel('Garment design').selectOption('tunic');await settle();await fold();await p.reload();await settle();assert.equal(await p.evaluate(()=>paperCouture.garmentId),'tunic');assert.equal(await p.evaluate(()=>paperCouture.controller.step),1);assert.equal(await p.evaluate(()=>localStorage.getItem('__astra_synthetic_save')),'keep');
await p.goto(base+'?design=unknown&paper=unknown&turn=0&shape=invalid&step=NaN');await settle();assert.equal(await p.evaluate(()=>paperCouture.garmentId),'dress');assert.equal(await p.evaluate(()=>paperCouture.controller.step),0);r.checks.push('Reload retains current URL selections and progress; invalid choices recover; synthetic browser storage untouched');
assert.deepEqual(r.errors,[]);assert.deepEqual(r.badResponses,[]);r.passed=true;
}catch(e){r.failure=String(e);await shot('failure').catch(()=>{});throw e}finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(r,null,2));await b.close();console.log(JSON.stringify(r,null,2))}})().catch(e=>{console.error(e);process.exitCode=1});
