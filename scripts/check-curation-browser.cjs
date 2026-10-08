// Local Chromium rendering/interaction evidence. Supply PLAYWRIGHT_MODULE and
// CHROMIUM_EXECUTABLE_PATH. The baseline must be exact PR17 candidate f3f735c.
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://127.0.0.1:4183';
const dev = process.env.DEV_URL || 'http://127.0.0.1:5183';
const baseline = process.env.BASELINE_URL || 'http://127.0.0.1:5184';
const out = process.env.CAPTURE_DIR || 'docs/design-curation/evidence';
fs.mkdirSync(out, {recursive:true});
(async () => {
 const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,
   args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context = await browser.newContext({viewport:{width:1100,height:800},hasTouch:true,reducedMotion:'reduce',acceptDownloads:true});
 const page = await context.newPage(); page.setDefaultTimeout(45000);
 const result = {base, baselineSHA:'f3f735cd68d784ca3850dafdefa8030124d3088f', checks:[], errors:[], captures:0};
 page.on('pageerror',e=>result.errors.push(String(e)));
 const settle = () => page.waitForFunction(()=>window.paperCouture && !paperCouture.controller.moving && paperCouture.view.t===paperCouture.view.target && !paperCouture.displayCam.glide);
 const load = async q => {await page.goto(base+'/?'+q); await settle()};
 const button = name => page.getByRole('button',{name,exact:true});
 const shot = async name => {await page.screenshot({path:path.join(out,name+'.png')});result.captures++};
 const fold = async () => {const s=await page.evaluate(()=>paperCouture.controller.step);await page.locator('.dock:not([hidden]) .btn-primary').click();if(await page.evaluate(()=>paperCouture.controller.moving))await page.locator('.dock:not([hidden]) .btn-primary').click();await page.waitForFunction(s=>!paperCouture.controller.moving && paperCouture.controller.step===s+1,s)};
 const finish = async () => {while(await page.evaluate(()=>!paperCouture.controller.finished))await fold()};
 const state = () => page.evaluate(()=>({design:paperCouture.garmentId,step:paperCouture.controller.step,paper:paperCouture.paperId,turn:paperCouture.quarterTurns,position:paperCouture.printPosition,attached:paperCouture.attached,accessory:paperCouture.accessoryId,options:paperCouture.options}));
 try {
  if(!process.env.FLOW_ONLY){
  // Exact before/after drawing and authored-operation parity, not screenshots
  // of merely similar-looking geometry. IDs are not part of material state.
  const signature = async url => {const p=await context.newPage();await p.goto(url);await p.waitForFunction(()=>window.paperCouture);const r=await p.evaluate(async()=>{
    const {PAPERS}=await import('/src/papers/index.ts'),{paperCanvas}=await import('/src/render/textures.ts');
    const {GARMENTS,buildGarment}=await import('/src/fold/garments.ts');const {ACCESSORIES}=await import('/src/fold/accessories.ts');
    const hashes={};for(const paper of PAPERS)for(const side of ['front','back']){const c=paperCanvas(paper,side,0);hashes[paper.id+'/'+side]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',c.getContext('2d').getImageData(0,0,c.width,c.height).data))).map(v=>v.toString(16).padStart(2,'0')).join('')}
    return {hashes,visiblePapers:PAPERS.filter(p=>!p.hidden).map(p=>p.name),garments:Object.fromEntries(GARMENTS.map(g=>[g.id,buildGarment(g.id).ops])),accessories:Object.fromEntries(ACCESSORIES.map(a=>[a.id,{ops:a.build().ops,pieces:a.pieces,positions:a.positions}]))};
  });await p.close();return r};
  const old=await signature(baseline),current=await signature(dev);
  for(const [key,value]of Object.entries(old.hashes))assert.equal(current.hashes[key],value,key+' raster changed');
  for(const [key,value]of Object.entries(old.garments))assert.deepEqual(current.garments[key],value,key+' geometry changed');
  for(const [key,value]of Object.entries(old.accessories))assert.deepEqual(current.accessories[key],value,key+' accessory changed');
  result.checks.push(Object.keys(old.hashes).length+' old front/back rasters, eight old garment constructions and five old accessory constructions/transforms exactly match PR17');
  fs.writeFileSync(path.join(out,'baseline-parity.json'),JSON.stringify({baseline:result.baselineSHA,oldHashes:old.hashes},null,2));
  await load('');assert.deepEqual(await state(),{design:'dress',step:0,paper:'stripe-disc',turn:0,position:{x:0,y:0},attached:false,accessory:'pin',options:await page.evaluate(()=>paperCouture.options)});
  await page.evaluate(()=>localStorage.setItem('__curation_keep','sentinel'));
  const names=await page.getByRole('radio').evaluateAll(xs=>xs.map(x=>x.getAttribute('aria-label')));
  const visibleNames=current.visiblePapers;
  assert.deepEqual(names,visibleNames);assert.equal(new Set(names).size,visibleNames.length);
  assert.deepEqual(await page.locator('.paper-group-label').allTextContents(),['Curated','Experiments']);
  assert.deepEqual(names.slice(0,4),['Stripe and disc','Running stitch','Pinstripe and lining','Plum scatter']);
  await shot('curated-scroll-desktop');
  // A real reversible fold flow with intermediate posed render evidence.
  await page.getByLabel('Garment design').selectOption('tabard');await settle();
  await page.getByRole('radio',{name:'Running stitch',exact:true}).click();
  for(let i=0;i<7;i++){
    await page.evaluate(()=>{paperCouture.controller.beginScrub();paperCouture.controller.scrubTo(.5)});
    await page.waitForTimeout(80);await shot('tabard-mid-'+(i+1));
    await page.evaluate(()=>paperCouture.controller.endScrub(false));await settle();await fold();
  }
  await button('Back').click();if(await page.evaluate(()=>paperCouture.controller.moving))await button('Back').click();await settle();assert.equal((await state()).step,6);await fold();
  await button('Display').click();await settle();assert.equal(await page.getByLabel('Accessory type').isVisible(),false);
  for(const view of ['Front','Angle','Back']){await button(view).click();await settle();await shot('tabard-stitch-'+view.toLowerCase())}
  await page.reload();await settle();assert.equal((await state()).design,'tabard');assert.equal((await state()).step,7);
  result.checks.push('Tabard real Fold/Back and reload, seven half-fold views, Front/Angle/Back; accessory kept aside');
  // Each new paper on varied garment allocations, at all four quarter turns.
  for(const paper of ['running-stitch','arc-study'])for(const design of ['dress','jacket','clutch','tabard'])for(let q=0;q<4;q++){
    await load(`design=${design}&paper=${paper}&turn=${q}&step=99&view=display`);
    await button('Front').click();await settle();await shot(`${design}-${paper}-${q}-front`);
    if(q===0){await button('Back').click();await settle();await shot(`${design}-${paper}-${q}-back`)}
  }
  result.checks.push('Both new papers rendered on dress/jacket/clutch/tabard at all four turns, with Back evidence at authored turn');
  for(let q=0;q<4;q++){
    await load(`design=tabard&paper=arc-study&turn=${q}&step=99&view=display&printX=.125&printY=.0625`);
    await button('Front').click();await settle();await shot(`tabard-arcs-shift-${q}-front`);
    await button('Back').click();await settle();await shot(`tabard-arcs-shift-${q}-back`);
    const s=await state();await page.reload();await settle();assert.deepEqual(await state(),s);
  }
  assert.deepEqual(result.errors,[]);fs.writeFileSync(path.join(out,'gallery-results.json'),JSON.stringify({...result,passed:true,phase:'gallery'},null,2));
  }
  await load('');await page.evaluate(()=>localStorage.setItem('__curation_keep','sentinel'));
  // Real separate sheet, independent ink/offset, restricted placement and board.
  await load('design=jacket&paper=running-stitch&step=99&view=display');
  await page.getByLabel('Accessory type').selectOption('sash');await button('Fold accessory').click();await settle();
  await page.getByRole('radio',{name:'Arc study',exact:true}).click();await button('Position print').click();
  await button('Right').click();await button('Up').click();await button('Done').click();
  for(let i=0;i<5;i++){await page.evaluate(()=>{paperCouture.controller.beginScrub();paperCouture.controller.scrubTo(.5)});await page.waitForTimeout(80);await shot('sash-mid-'+(i+1));await page.evaluate(()=>paperCouture.controller.endScrub(false));await settle();await fold()}
  await shot('sash-finished-separate');await button('Attach').click();await settle();
  assert.equal((await state()).paper,'running-stitch');assert((await state()).attached);
  assert.deepEqual(await page.getByLabel('Accessory position').locator('option').evaluateAll(xs=>xs.map(x=>x.value)),['waist']);
  if(await button('Display').isVisible())await button('Display').click();await settle();await button('Front').click();await settle();await shot('jacket-sash-front');
  await button('Angle').click();await settle();await shot('jacket-sash-angle');
  await button('Back').click();await settle();await shot('jacket-sash-back');
  await page.getByLabel('Garment design').selectOption('tabard');await settle();assert.match(await page.locator('.studio-note').innerText(),/kept aside/);
  await page.getByLabel('Garment design').selectOption('jacket');await settle();if(await button('Display').isVisible())await button('Display').click();await settle();assert((await state()).attached);assert.equal(await page.getByLabel('Accessory type').inputValue(),'sash');
  await button('Pinboard').click();await button('Pin current piece').click();await shot('pinboard-sash');
  const downloadPromise=page.waitForEvent('download');await button('Save PNG').click();const download=await downloadPromise;await download.saveAs(path.join(out,'pinboard-sash-export.png'));
  await button('Return to piece').click();await button('Edit accessory').click();await settle();await button('Position print').click();
  assert.match(await page.locator('.print-dialog').innerText(),/Arc study/);await button('Done').click();await button('Back to garment').click();await settle();
  result.checks.push('Sash five real folds, independent sliding paper, central waist-only placement, original garment paper retained, unsupported-design round trip, edit and actual pinboard PNG export');
  // Touch viewport and full same-scroll reachability. Keyboard on focused radio
  // uses normal button activation; scrollIntoView is the test harness only.
  for(const [width,height]of [[390,844],[844,390]]){
    await page.setViewportSize({width,height});
    await page.getByLabel('Garment design').selectOption('tabard');await settle();await page.getByRole('radio',{name:'Arc study',exact:true}).click();await finish();if(await button('Display').isVisible())await button('Display').click();await settle();await shot(`tabard-mobile-${width}`);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
    await page.getByRole('radio',{name:'Wide frame',exact:true}).click();await shot(`old-last-paper-${width}`);
    assert.equal((await state()).paper,'wide-frame');
    await page.getByRole('radio',{name:'Arc study',exact:true}).click();await button('Position print').click();await shot(`position-mobile-${width}`);await button('Done').click();
    await button('Pinboard').click();await shot(`pinboard-mobile-${width}`);await button('Return to piece').click();
    await page.getByLabel('Garment design').selectOption('jacket');await settle();if(await button('Display').isVisible())await button('Display').click();await settle();await shot(`sash-mobile-${width}`);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
  }
  const cameras=[];
  for(const [width,height]of [[1100,800],[390,844],[844,390]]){
    await page.setViewportSize({width,height});await load('design=tabard&step=99&view=display');
    const lowest=await page.evaluate(()=>{const a=paperCouture,c=a.displayCam.controls,t=a.displayCam.target,ys=[];c.enableDamping=false;for(const r of [c.minDistance,c.maxDistance])for(const az of [0,Math.PI/2,Math.PI]){a.stage.camera.position.set(t.x+r*Math.cos(az),t.y-r*.5,t.z+r*Math.sin(az));c.update();ys.push(a.stage.camera.position.y)}return Math.min(...ys)});assert(lowest>=.0249);cameras.push({width,height,lowest});
  }
  result.cameras=cameras;result.checks.push('New tabard OrbitControls at both zoom bounds and three azimuths stays above the table in all three viewports');
  assert.equal(await page.evaluate(()=>localStorage.getItem('__curation_keep')),'sentinel');
  result.checks.push('390×844 and 844×390: same paper scroll reaches old final paper, tabard/display/position/pinboard/sash, no horizontal overflow; synthetic old storage untouched');
  assert.deepEqual(result.errors,[]);result.passed=true;
 } catch(e) {result.failure=String(e);await shot('failure').catch(()=>{});throw e}
 finally {fs.writeFileSync(path.join(out,process.env.FLOW_ONLY?'interaction-results.json':'browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
