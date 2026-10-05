// Optional focused browser check. Supply BASE_URL (built preview), DEV_URL,
// BASELINE_URL (published ce3431b), PLAYWRIGHT_MODULE and CHROMIUM_EXECUTABLE_PATH.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const base=process.env.BASE_URL||'http://127.0.0.1:4187';
const dev=process.env.DEV_URL||'http://127.0.0.1:5187';
const out=process.env.CAPTURE_DIR||'docs/usability/evidence';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1100,height:800},hasTouch:true,acceptDownloads:true});
 const p=await context.newPage(),result={base,baselineSHA:'ce3431b54492cd01553219087fa1a257e720c0c6',checks:[],errors:[]};p.setDefaultTimeout(30000);p.on('pageerror',e=>result.errors.push(String(e)));
 const settle=()=>p.waitForFunction(()=>window.paperCouture&&!paperCouture.controller.moving&&paperCouture.view.t===paperCouture.view.target&&!paperCouture.displayCam.glide);
 const load=async(q='')=>{await p.goto(base+'/?'+q);await settle()};
 const button=n=>p.getByRole('button',{name:n,exact:true});
 const state=()=>p.evaluate(()=>({step:paperCouture.controller.step,paper:paperCouture.paperId,turn:paperCouture.quarterTurns,position:paperCouture.printPosition,accessory:paperCouture.accessoryId,attached:paperCouture.attached,accessoryMode:paperCouture.accessoryMode}));
 const fold=async()=>{await p.locator('.dock:not(.display-dock) .btn-primary').click();if(await p.evaluate(()=>paperCouture.controller.moving))await p.locator('.dock:not(.display-dock) .btn-primary').click();await settle()};
 const finish=async()=>{while(await p.evaluate(()=>!paperCouture.controller.finished))await fold()};
 const shot=n=>p.screenshot({path:path.join(out,n+'.png')});
 const signature=async url=>{
  const page=await context.newPage();await page.goto(url);await page.waitForFunction(()=>window.paperCouture);
  const s=await page.evaluate(async()=>{
   const {PAPERS}=await import('/src/papers/index.ts'),{paperCanvas}=await import('/src/render/textures.ts');
   const {GARMENTS,buildGarment}=await import('/src/fold/garments.ts'),{ACCESSORIES}=await import('/src/fold/accessories.ts');
   const hashes={};for(const paper of PAPERS)for(const side of ['front','back']){
    const c=paperCanvas(paper,side,0),bytes=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    hashes[paper.id+'/'+side]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
   }
   return {hashes,garments:Object.fromEntries(GARMENTS.map(g=>[g.id,buildGarment(g.id).ops])),accessories:Object.fromEntries(ACCESSORIES.map(a=>[a.id,{ops:a.build().ops,pieces:a.pieces,positions:a.positions}]))};
  });await page.close();return s;
 };
 try{
  if(process.env.BASELINE_URL){
   const before=await signature(process.env.BASELINE_URL),after=await signature(dev);assert.deepEqual(after,before);
   const fingerprints=records=>Object.fromEntries(Object.entries(records).map(([id,value])=>[id,createHash('sha256').update(JSON.stringify(value)).digest('hex')]));
   fs.writeFileSync(path.join(out,'baseline-parity.json'),JSON.stringify({baselineSHA:result.baselineSHA,paperHashes:after.hashes,garmentSignatures:fingerprints(after.garments),accessorySignatures:fingerprints(after.accessories)},null,2));
   result.checks.push(`${Object.keys(after.hashes).length} front/back paper rasters, ${Object.keys(after.garments).length} garment sequences and ${Object.keys(after.accessories).length} accessory constructions match the published base exactly`);
  }
  await load();assert.equal((await state()).paper,'stripe-disc');assert.equal((await state()).step,0);
  await p.evaluate(()=>localStorage.setItem('__usability_keep','sentinel'));
  for(const [paper,status] of [['Stripe and disc','Fixed'],['Arc study','Movable'],['Seed dashes','Set shifts']]){
   await p.getByRole('radio',{name:paper,exact:true}).click();assert.equal(await p.locator('.print-capability').innerText(),status);assert(await p.locator('.print-capability').isVisible());
   await button('Position print').click();
   if(status==='Fixed'){assert(await p.getByText('Placement fixed for this paper.',{exact:true}).isVisible());assert.equal(await button('Reset print').count(),0)}
   if(status==='Movable')assert(await button('Right').isVisible());
   if(status==='Set shifts')assert(await button('Half-cell both').isVisible());
   await button('Done').click();
  }
  result.checks.push('Visible Fixed/Movable/Set shifts labels agree with actual editor controls; fixed papers remain inspectable');
  await load('paper=arc-study&shape=flare&step=3');await button('Position print').click();await button('Right').click();await button('Up').click();await button('Done').click();
  await p.getByRole('button',{name:'Turn paper (now 0°)',exact:true}).click();const shifted=await state();await p.reload();await settle();assert.deepEqual(await state(),shifted);
  await fold();assert.equal((await state()).step,4);await button('Back').click();if(await p.evaluate(()=>paperCouture.controller.moving))await button('Back').click();await settle();assert.equal((await state()).step,3);assert.deepEqual((await state()).position,shifted.position);
  await button('Start over').click();await settle();assert.equal((await state()).step,0);assert.deepEqual((await state()).position,shifted.position);
  result.checks.push('Shift/turn/reload plus fold, Back, rapid second press and Start over preserve offsets and step semantics');
  await load('shape=flare&step=4');
  assert.equal(await p.locator('.fold-handle:visible').count(),2);
  const grip=button('Fold this step (handle 1)');const box=await grip.boundingBox();assert(box.width>=44&&box.height>=44);await shot('fold-handles-desktop');
  await grip.focus();await p.keyboard.press('Enter');await settle();assert.equal((await state()).step,5);assert.equal(await p.evaluate(()=>paperCouture.controller.finished),false);assert.equal(await p.locator('.fold-handle:visible').count(),0);
  await button('Back').click();if(await p.evaluate(()=>paperCouture.controller.moving))await button('Back').click();await settle();
  await button('Fold this step (handle 2)').focus();await p.keyboard.press('Enter');await settle();assert.equal((await state()).step,5);
  result.checks.push('Either 44px hem handle completes only the shared current operation; keyboard, Back and numbered handle descriptions work');
  await load('shape=flare&step=4');
  const dragGrip=await p.locator('.fold-handle').first().evaluate(b=>{const r=b.getBoundingClientRect(),m=new DOMMatrix(getComputedStyle(b.firstElementChild).transform);return {x:r.x+r.width/2,y:r.y+r.height/2,vx:m.a,vy:m.b}});
  for(const distance of [9,60]){
   await p.mouse.move(dragGrip.x,dragGrip.y);await p.mouse.down();assert(await p.evaluate(()=>paperCouture.controller.isScrubbing));
   await p.mouse.move(dragGrip.x+dragGrip.vx*distance,dragGrip.y+dragGrip.vy*distance,{steps:5});await p.mouse.up();await settle();assert.equal((await state()).step,distance===9?4:5);
  }
  await p.setViewportSize({width:390,height:844});await load('shape=flare&step=4');
  const touchBox=await button('Fold this step (handle 1)').boundingBox(),cdp=await context.newCDPSession(p),x=touchBox.x+touchBox.width/2,y=touchBox.y+touchBox.height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settle();assert.equal((await state()).step,5);await cdp.detach();
  await p.setViewportSize({width:1100,height:800});
  result.checks.push('Mouse short-drag rollback/full drag and portrait emulated-touch handle tap retain the existing fold semantics');
  await load('paper=arc-study&shape=flare&step=6&view=display&printX=.125&printY=.0625');
  const garment=await state();assert((await p.locator('.accessory-paper-note').innerText()).includes('Tidal bands'));await p.getByLabel('Accessory type').selectOption('bow');await shot('accessory-paper-desktop');
  await button('Fold accessory').click();await settle();assert.equal((await state()).paper,'tidal-bands');assert.equal(await p.locator('.accessory-paper-note').isVisible(),false);
  await p.getByRole('radio',{name:'Plum scatter',exact:true}).click();await button('Position print').click();await button('Up').click();await button('Done').click();
  await finish();await fold();assert.equal(await p.evaluate(()=>paperCouture.bowWing),1);await finish();await fold();assert(await p.evaluate(()=>paperCouture.attached&&!paperCouture.accessoryMode));
  assert.equal((await state()).paper,garment.paper);assert.deepEqual((await state()).position,garment.position);assert((await p.locator('.accessory-paper-note').innerText()).includes('Plum scatter'));
  await button('Edit accessory').click();await settle();assert.equal((await state()).paper,'plum-scatter');assert.deepEqual((await state()).position,{x:0,y:1/32});await button('Back to garment').click();await settle();
  await p.getByLabel('Accessory type').selectOption('pin');assert((await p.locator('.accessory-paper-note').innerText()).includes('Plum scatter'));await button('Fold accessory').click();await settle();assert.equal((await state()).paper,'plum-scatter');await finish();await fold();
  assert(await p.evaluate(()=>paperCouture.attached&&!paperCouture.accessoryMode));
  result.checks.push('Separate default Tidal bands disclosed before Bow; selected Plum scatter and its offset retained across both wings, edit/return and switching to pin; garment paper/offset restored');
  await button('Pinboard').click();const [download]=await Promise.all([p.waitForEvent('download'),button('Save PNG').click()]);const png=path.join(out,'pinboard-export.png');await download.saveAs(png);
  const bytes=fs.readFileSync(png);assert.equal(bytes.readUInt32BE(16),1600);assert.equal(bytes.readUInt32BE(20),1200);await button('Return to piece').click();assert.equal((await state()).paper,garment.paper);assert.deepEqual((await state()).position,garment.position);
  result.checks.push('Actual 1600×1200 Pinboard PNG export succeeds and return preserves garment/attachment state');
  for(const [width,height] of [[1100,800],[390,844],[844,390]]){
   await p.setViewportSize({width,height});await load('paper=arc-study&shape=flare&step=6&view=display&printX=.125&printY=.0625');
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),width);assert(await p.locator('.print-capability').isVisible());assert(await p.locator('.accessory-paper-note').isVisible());
   const bounds=await p.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};return {print:rect('.position-print'),label:rect('.print-capability'),paper:rect('.accessory-paper-note'),studio:rect('.studio-controls'),dock:rect('.display-dock')}});
   assert(bounds.print.width>=44&&bounds.print.height>=44);assert(bounds.label.x>=0&&bounds.label.right<=width);assert(bounds.label.y>=bounds.print.y&&bounds.label.bottom<=bounds.print.bottom);assert(bounds.paper.x>=bounds.studio.x&&bounds.paper.right<=bounds.studio.right&&bounds.paper.bottom<=bounds.studio.bottom);assert(bounds.studio.bottom<bounds.dock.y);result.checks.push(`${width}×${height}: capability readable within its 44px target, separate-paper cue visible without clipping, no toolbar/dock overlap or horizontal page overflow`);
   await shot(`display-${width}`);
   await p.getByRole('radio',{name:'Stripe and disc',exact:true}).click();assert.equal(await p.locator('.print-capability').innerText(),'Fixed');await shot(`fixed-${width}`);
   await p.getByRole('radio',{name:'Seed dashes',exact:true}).click();assert.equal(await p.locator('.print-capability').innerText(),'Set shifts');await shot(`snap-${width}`);
  }
  assert.equal(await p.evaluate(()=>localStorage.getItem('__usability_keep')),'sentinel');assert.deepEqual(result.errors,[]);result.passed=true;
 }catch(e){result.failure=String(e);await shot('failure').catch(()=>{});throw e}
 finally{fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
