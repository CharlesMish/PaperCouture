const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.CAPTURE_DIR || '.fit-flare-qa',out=path.join(root,'browser');fs.mkdirSync(out,{recursive:true});
const key='paper-couture.pinboard.v1',base=process.env.BASE_URL || 'http://127.0.0.1:4470',baseline=process.env.BASELINE_URL || 'http://127.0.0.1:4472';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const report={checkedAt:new Date().toISOString(),errors:[],visuals:[],checks:[],physicalPhoneTested:false};let p;
 const context=await browser.newContext({viewport:{width:1180,height:900},hasTouch:true,acceptDownloads:true});p=await context.newPage();p.setDefaultTimeout(25000);p.on('pageerror',e=>report.errors.push(String(e)));
 const btn=n=>p.getByRole('button',{name:n,exact:true}),frames=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const settle=()=>p.waitForFunction(()=>window.paperCouture&&!paperCouture.controller.moving&&paperCouture.view.t===paperCouture.view.target&&!paperCouture.displayCam.glide&&paperCouture.sheet.front.geometry.attributes.position?.count>0&&paperCouture.sheet.front.geometry.attributes.uv?.count>0);
 const load=async q=>{await p.goto(base+'/?'+q);await settle();};
 const geometry=()=>p.evaluate(()=>Array.from(paperCouture.sheet.front.geometry.attributes.position.array));
 const board=()=>p.evaluate(()=>JSON.parse(JSON.stringify(paperCouture.pinboard.state))),raw=()=>p.evaluate(k=>localStorage.getItem(k),key);
 const shot=async name=>{await frames();await p.screenshot({path:path.join(out,name+'.png')});report.visuals.push(name);};
 const png=async name=>{const[d]=await Promise.all([p.waitForEvent('download'),btn('Save PNG').click()]);const dest=path.join(out,name+'.png');await d.saveAs(dest);await p.waitForFunction(()=>!paperCouture.pinboard.exporting);return fs.readFileSync(dest)};
 try{
  await load('design=fit-flare&paper=botanical&step=0');
  const designs=p.getByLabel('Garment design'),accessories=p.getByLabel('Accessory type');
  assert.equal(await designs.locator('optgroup').count(),0);assert.equal(await accessories.locator('optgroup').count(),0);
  const ids=await designs.locator('option').evaluateAll(xs=>xs.map(x=>x.value));
  assert.equal(ids.length,19);assert.equal(new Set(ids).size,19);
  assert.deepEqual(await accessories.locator('option').evaluateAll(xs=>xs.map(x=>x.value)),['pin','bow','kerchief','pocket','tulip','sash']);
  assert.match(await p.locator('.studio-note').innerText(),/no armholes or neck opening/);
  assert(!/Experimental/.test(await p.locator('.studio-note').innerText()));
  assert.deepEqual(await p.locator('.paper-group-label').allTextContents(),['Curated','Experiments']);
  report.checks.push('One garment list and one accessory list retain every choice; specific construction limits remain visible; paper categories unchanged');
  // Native rendering, normal workshop camera, frozen only through supported scrub controller.
  for(const[op,t]of[[4,.25],[4,.455],[4,.60],[4,.75],[5,.34]]){
   await load('design=fit-flare&paper=botanical&step='+op);
   await p.evaluate(({t})=>{const c=paperCouture.controller;c.beginScrub();c.scrubTo(t)},{t});await shot('motion-'+op+'-'+t);
   const disabled=await p.getByRole('button',{name:/^View board/}).isEnabled();assert(disabled); // board remains available, capture must not be.
   await p.getByRole('button',{name:/^View board/}).click();assert(await btn('Pin current piece').isDisabled());
  }
  report.checks.push('Capture disabled during waist and shoulder scrub');
  // Actual control flows, repeated interruption and reversal of waist collapse.
  await load('design=fit-flare&paper=plum-scatter&step=4');
  for(let k=0;k<3;k++){
   await btn('Fold').click();await p.waitForTimeout(220);await btn('Back').click();await settle();assert.equal(await p.evaluate(()=>paperCouture.controller.step),4);
   await btn('Fold').click();await p.waitForTimeout(200);await btn('Start over').click();await settle();assert.equal(await p.evaluate(()=>paperCouture.controller.step),0);
   await p.evaluate(()=>paperCouture.controller.jumpTo(4));
  }
  await btn('Fold').click();await p.waitForTimeout(180);await p.getByRole('radio',{name:'Corner bloom',exact:true}).click();await p.getByRole('button',{name:/^Turn paper/}).click();await settle();assert.equal(await p.evaluate(()=>paperCouture.controller.step),5);
  await btn('Fold').click();await settle();const final=await geometry();
  for(let k=0;k<3;k++){await btn('Back').click();await settle();await btn('Fold').click();await settle();assert.deepEqual(await geometry(),final);}
  await load('design=fit-flare&paper=corner-bloom&step=99&view=display');assert.deepEqual(await geometry(),final);
  report.checks.push('Three interrupted/reversed/reset collapses; paper/turn during collapse; three shoulder unfold/refold cycles; exact final geometry');
  // Front/reverse material visibility and authored versus shifted floral positions.
  for(const design of ['dress','fit-flare'])for(const paper of ['sunray-pleats','plum-scatter']){
   await load(`design=${design}&paper=${paper}&step=99&view=display`);
   const before=await geometry();await shot(design+'-'+paper+'-front');await btn('Back').click();await settle();await shot(design+'-'+paper+'-back');
   await btn('Front').click();await settle();
   if(paper==='plum-scatter'){
    await btn('Position print').click();for(let i=0;i<4;i++)await p.getByRole('dialog').getByRole('button',{name:'Right',exact:true}).click();for(let i=0;i<3;i++)await p.getByRole('dialog').getByRole('button',{name:'Up',exact:true}).click();await btn('Done').click();
    assert.deepEqual(await p.evaluate(()=>paperCouture.printPosition),{x:.125,y:.09375});assert.deepEqual(await geometry(),before);await shot(design+'-'+paper+'-shifted-front');await btn('Back').click();await settle();await shot(design+'-'+paper+'-shifted-back');
    const u=p.url();await p.reload();await settle();assert.deepEqual(await p.evaluate(()=>paperCouture.printPosition),{x:.125,y:.09375});assert.equal(p.url(),u);
   }
   for(let q=1;q<=4;q++){await p.getByRole('button',{name:/^Turn paper/}).click();assert.deepEqual(await geometry(),before);}
  }
  report.checks.push('Classic and fit-flare Sunray/floral front/back; floral shifts and URL reload; all four paper rotations preserve material geometry');
  for(const[w,h]of[[390,844],[320,568],[844,390]]){
   await p.setViewportSize({width:w,height:h});await load('design=fit-flare&paper=sunray-pleats&step=4');await shot('workshop-sunray-'+w);
   report.checks.push(await p.evaluate(()=>{const r=document.querySelector('.swatches').getBoundingClientRect(),s=document.querySelector('[role=radio][aria-checked=true]').getBoundingClientRect();return{viewport:[innerWidth,innerHeight],swatchVisible:s.left>=r.left-1&&s.right<=r.right+1&&s.top>=r.top-1&&s.bottom<=r.bottom+1,pageOverflow:document.documentElement.scrollWidth>innerWidth}}));
  }
  // A finished floral dress plus existing hat/clutch/brooch: captured independently.
  await p.setViewportSize({width:1180,height:900});
  for(const[id,paper,cm,x,y]of[['fit-flare','plum-scatter',20,0,.1],['hat','slate-grain',8,0,1.27],['clutch','slate-grain',8,.93,-.65],['framed-brooch','plum-seed',4.5,.15,.46]]){
   await load(`design=${id}&paper=${paper}&step=99&view=display${id==='fit-flare'?'&printX=.125&printY=.09375&turn=1':''}`);
   await p.getByRole('button',{name:/^View board/}).click();await p.getByLabel('Starting square size').selectOption(String(cm));await btn('Pin current piece').click();
   await p.evaluate(({x,y})=>{const b=paperCouture.pinboard;b.mutate(()=>{const i=b.state.items.at(-1);i.x=x;i.y=y;b.position();b.constrain(i.id)})},{x,y});
  }
  const saved=await board();assert.equal(saved.items.length,4);
  const fixture=await raw();fs.writeFileSync(path.join(out,'fit-flare-floral-board.json'),fixture);
  for(const[w,h]of[[1180,900],[390,844],[320,568]]){await p.setViewportSize({width:w,height:h});await p.waitForTimeout(180);await shot('fit-flare-board-'+w);assert(!(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));}
  const exportBefore=await png('fit-flare-composite');
  await p.getByLabel('Selected board piece').selectOption(saved.items[0].id);
  const selected=await board();for(let k=0;k<4;k++){await btn('Remove selected').click();await btn('Undo').click();assert.deepEqual(await board(),selected);}
  const point=await p.evaluate(()=>{const b=paperCouture.pinboard,r=b.canvas.getBoundingClientRect(),i=b.state.items[0];return{x:r.x+(i.x+1.8)*r.width/3.6,y:r.y+(2.1-i.y)*r.height/4.2}}),cdp=await context.newCDPSession(p);
  const touch=(type,dx=0,dy=0)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:['touchEnd','touchCancel'].includes(type)?[]:[{x:point.x+dx,y:point.y+dy,id:1}]});
  const durableBefore=await p.evaluate(()=>({saved:localStorage.getItem('paper-couture.pinboard.v1'),history:paperCouture.pinboard.history.length}));
  await touch('touchStart');await touch('touchMove',20,15);await p.waitForFunction(()=>paperCouture.pinboard.drag?.moved);assert.notDeepEqual((await board()).items,selected.items);
  await touch('touchCancel');await p.waitForFunction(()=>!paperCouture.pinboard.drag);assert.deepEqual(await board(),selected);
  assert.deepEqual(await p.evaluate(()=>({saved:localStorage.getItem('paper-couture.pinboard.v1'),history:paperCouture.pinboard.history.length})),durableBefore);
  for(let k=0;k<3;k++){await touch('touchStart');await touch('touchMove',18,10);await touch('touchEnd');await p.waitForFunction(()=>!paperCouture.pinboard.drag);assert.notDeepEqual((await board()).items,selected.items);await btn('Undo').click();assert.deepEqual(await board(),selected);}
  await p.reload();await settle();await p.getByRole('button',{name:/^View board/}).click();assert.deepEqual((await board()).items,saved.items);assert.deepEqual(await png('fit-flare-reloaded'),exportBefore);
  const old=await browser.newContext({viewport:{width:1180,height:900},acceptDownloads:true});await old.addInitScript(({key,seed})=>localStorage.setItem(key,seed),{key,seed:fixture});const op=await old.newPage();await op.goto(baseline);await op.waitForFunction(()=>window.paperCouture&&paperCouture.sheet.front.geometry.attributes.position?.count>0);await op.getByRole('button',{name:/^View board/}).click();assert.equal(await op.evaluate(k=>localStorage.getItem(k),key),fixture);assert.deepEqual(await op.evaluate(()=>JSON.parse(JSON.stringify(paperCouture.pinboard.state))),saved);const[d]=await Promise.all([op.waitForEvent('download'),op.getByRole('button',{name:'Save PNG',exact:true}).click()]);const dest=path.join(out,'fit-flare-read-by-published.png');await d.saveAs(dest);assert.deepEqual(fs.readFileSync(dest),exportBefore);await old.close();
  report.checks.push('Fit-flare floral board: 4 captures; 320/390/desktop framing; four remove/Undo cycles; touch cancel and three move/Undo cycles; reload and PNG exact; old published source reads new garment snapshot exactly');
  assert.deepEqual(report.errors,[]);report.passed=true;
 }catch(e){report.failure=String(e.stack||e);await p.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});throw e}
 finally{fs.writeFileSync(path.join(root,'browser-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,failure:report.failure,checks:report.checks}));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
