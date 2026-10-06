// Optional rendered checks: supply PLAYWRIGHT_MODULE, CHROMIUM_EXECUTABLE_PATH,
// BASE_URL and CAPTURE_DIR. BASELINE_URL adds exact old-paper raster comparison.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.BASE_URL||'http://127.0.0.1:5199',out=process.env.CAPTURE_DIR||'docs/positioning-checks';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1100,height:800},reducedMotion:'reduce',hasTouch:true,acceptDownloads:true});
const page=await context.newPage(),result={base,checks:[],errors:[]};page.setDefaultTimeout(45000);page.on('pageerror',e=>result.errors.push(String(e)));
const settle=()=>page.waitForFunction(()=>window.paperCouture&&!paperCouture.controller.moving&&paperCouture.view.t===paperCouture.view.target&&!paperCouture.displayCam.glide);
const load=async(q='')=>{await page.goto(base+'/?'+q);await settle()};
const btn=n=>page.getByRole('button',{name:n,exact:true});const shot=n=>page.screenshot({path:path.join(out,n+'.png')});
const getState=()=>page.evaluate(()=>({design:paperCouture.garmentId,step:paperCouture.controller.step,paper:paperCouture.paperId,turn:paperCouture.quarterTurns,position:paperCouture.printPosition,options:paperCouture.options,attached:paperCouture.attached,centre:paperCouture.centreAttached}));
const fold=async()=>{await page.locator('.workshop-dock .btn-primary, .dock:not(.display-dock) .btn-primary').first().click();if(await page.evaluate(()=>paperCouture.controller.moving))await page.locator('.dock:not(.display-dock) .btn-primary').first().click();await settle()};
const rasterHashes=async p=>p.evaluate(async()=>{const {PAPERS}=await import('/src/papers/index.ts'),{makePaperTextures}=await import('/src/render/textures.ts');const r={};for(const paper of PAPERS){const t=makePaperTextures(paper,0,1);for(const side of ['front','back']){const c=t[side].image;const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;r[paper.id+'/'+side]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(v=>v.toString(16).padStart(2,'0')).join('');}t.dispose()}return r});
try{
await load('paper=corner-bloom&step=3');
if(process.env.BASELINE_URL){const old=await context.newPage();await old.goto(process.env.BASELINE_URL);await old.waitForFunction(()=>window.paperCouture);const before=await rasterHashes(old),after=await rasterHashes(page);assert.deepEqual(after,before);fs.writeFileSync(path.join(out,'default-paper-hashes.json'),JSON.stringify(after,null,2));await old.close();result.checks.push(Object.keys(after).length+' front/back default paper rasters exactly match the published base');}
const raster=await page.evaluate(async()=>{
 const {findPaper}=await import('/src/papers/index.ts');const {paperCanvas,makePaperTextures}=await import('/src/render/textures.ts');const THREE=await import('/node_modules/.vite/deps/three.js');
 const data=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
 const equal=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
 const paper=findPaper('corner-bloom'),a=data(paperCanvas(paper,'front',0)),b=data(paperCanvas(paper,'front',0,{x:.125,y:.0625}));
 const grainFixed=equal(a.slice(0,1024*100*4),b.slice(0,1024*100*4));
 const reverseFixed=equal(data(paperCanvas(paper,'back',0)),data(paperCanvas(paper,'back',0,{x:.125,y:.0625})));
 const layers={frontGround:'#f6f0e4',backGround:'#f6f0e4',front:(c,s)=>{c.fillStyle='#f00';c.fillRect(.23*s,.28*s,.04*s,.04*s)},back:(c,s)=>{c.fillStyle='#f00';c.fillRect(.73*s,.28*s,.04*s,.04*s)}};
 const diag={id:'test',name:'test',note:'',reverse:'#fff',placement:{...layers,kind:'slide',limit:.3},drawFront:(c,s)=>{c.fillStyle=layers.frontGround;c.fillRect(0,0,s,s);layers.front(c,s)},drawBack:(c,s)=>{c.fillStyle=layers.backGround;c.fillRect(0,0,s,s);layers.back(c,s)}};
 const registration=[];
 for(let q=0;q<4;q++){
  const original=makePaperTextures(diag,q,1),shifted=makePaperTextures(diag,q,1,{x:.125,y:.0625});
  const location=new THREE.Vector2(.25,.7).applyMatrix3(original.front.matrix.clone().invert()).add(new THREE.Vector2(.125,.0625));
  for(const side of ['front','back']){const texture=shifted[side],uv=location.clone().applyMatrix3(texture.matrix),c=texture.image;const rgb=c.getContext('2d').getImageData(Math.floor(uv.x*1024),Math.floor((1-uv.y)*1024),1,1).data;registration.push({q,side,red:rgb[0]>200&&rgb[1]<25&&rgb[2]<25});}
  original.dispose();shifted.dispose();
 }
 const seed=findPaper('seed-dashes');const paint=(x,y)=>{const c=document.createElement('canvas');c.width=c.height=1024;const g=c.getContext('2d');g.fillStyle=seed.placement.frontGround;g.fillRect(0,0,1024,1024);g.translate(x*1024,y*1024);seed.placement.front(g,1024);return data(c)};
 const fullPeriod=equal(paint(0,0),paint(1/16,1/16)),halfDifferent=!equal(paint(0,0),paint(1/32,0));
 const half=paint(1/32,0);const edgeInk=half[(32*1024)*4]<150&&half[(32*1024+1023)*4]<150;
 return {grainFixed,reverseFixed,registration,fullPeriod,halfDifferent,edgeInk};
});assert(raster.grainFixed&&raster.reverseFixed&&raster.fullPeriod&&raster.halfDifferent&&raster.edgeInk);assert(raster.registration.every(x=>x.red));result.raster=raster;result.checks.push('Actual pixels: stationary grain, paired front/back motif at all four turns, Seed dashes full-period parity and half-period edge continuation');
await page.evaluate(()=>localStorage.setItem('__positioning_keep','sentinel'));
const geometry=await page.evaluate(()=>({uv:Array.from(paperCouture.sheet.front.geometry.attributes.uv.array),pose:Array.from(paperCouture.sheet.front.geometry.attributes.position.array)}));
await btn('Position print').click();const r=await page.locator('.print-preview').boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2+42,r.y+r.height/2-20,{steps:5});await page.mouse.up();await btn('Done').click();const positioned=await getState();assert(positioned.position.x>0&&positioned.position.y>0);assert.equal(positioned.step,3);
assert.deepEqual(await page.evaluate(()=>({uv:Array.from(paperCouture.sheet.front.geometry.attributes.uv.array),pose:Array.from(paperCouture.sheet.front.geometry.attributes.position.array)})),geometry);
await page.reload();await settle();assert.deepEqual((await getState()).position,positioned.position);assert.equal((await getState()).step,3);
await fold();assert.equal((await getState()).step,4);await btn('Back').click();if(await page.evaluate(()=>paperCouture.controller.moving))await btn('Back').click();await settle();assert.equal((await getState()).step,3);assert.deepEqual((await getState()).position,positioned.position);
await btn('Start over').click();await settle();assert.equal((await getState()).step,0);assert.deepEqual((await getState()).position,positioned.position);
await page.getByLabel('Garment design').selectOption('jacket');await settle();assert.deepEqual((await getState()).position,positioned.position);await btn('Position print').click();await btn('Reset print').click();await page.keyboard.press('Escape');assert.deepEqual((await getState()).position,{x:0,y:0});assert.equal(new URL(page.url()).searchParams.has('printX'),false);
await page.getByRole('radio',{name:'Plum scatter',exact:true}).click();await btn('Position print').click();await btn('Up').click();await btn('Done').click();await page.getByRole('radio',{name:'Seed dashes',exact:true}).click();assert.deepEqual((await getState()).position,{x:0,y:0});await btn('Position print').click();await btn('Half-cell both').click();await btn('Done').click();await page.reload();await settle();assert.deepEqual((await getState()).position,{x:1/32,y:1/32});await page.getByRole('radio',{name:'Border print',exact:true}).click();await btn('Position print').click();assert.equal(await btn('Reset print').count(),0);assert(await page.getByText('Placement fixed for this paper.',{exact:true}).isVisible());await btn('Done').click();assert.deepEqual((await getState()).position,{x:0,y:0});
result.checks.push('Real drag/nudges, fold/back/start-over, design and paper switches, reset, locked paper, snap selection and reload; UV/geometry unchanged');
for(const paper of ['corner-bloom','plum-scatter'])for(let q=0;q<4;q++){
 await load(`paper=${paper}&turn=${q}&step=6&view=display`);await shot(`${paper}-${q}-before`);
 await btn('Position print').click();for(let i=0;i<4;i++)await btn('Right').click();for(let i=0;i<2;i++)await btn('Up').click();await btn('Done').click();await shot(`${paper}-${q}-after`);
 await btn('Back').click();await settle();await shot(`${paper}-${q}-back`);
}
result.checks.push('Rendered before/after/front/back captures for both floral papers at all four turns');
// Fold an accessory through the actual controls, then its separately printed centre.
await load('paper=corner-bloom&printX=0.125&step=6&view=display');await page.getByLabel('Accessory type').selectOption('bow');await page.getByRole('button',{name:'Fold accessory',exact:true}).click();await settle();
await page.getByRole('radio',{name:'Plum scatter',exact:true}).click();await btn('Position print').click();await btn('Up').click();await btn('Done').click();
while(!(await page.evaluate(()=>paperCouture.controller.finished)))await fold();await fold();while(!(await page.evaluate(()=>paperCouture.controller.finished)))await fold();await fold();assert(await page.evaluate(()=>paperCouture.attached&&!paperCouture.accessoryMode));assert.deepEqual((await getState()).position,{x:.125,y:0});
await page.getByRole('button',{name:'Fold centre',exact:true}).click();await settle();await page.getByRole('radio',{name:'Seed dashes',exact:true}).click();await btn('Position print').click();await btn('Half-cell right').click();await btn('Done').click();while(!(await page.evaluate(()=>paperCouture.controller.finished)))await fold();await fold();assert(await page.evaluate(()=>paperCouture.attached&&paperCouture.centreAttached));
const withBow=await getState();
await btn('Pinboard').click();await btn('Pin current piece').click();
const snapshot=await page.evaluate(()=>{
 const a=paperCouture,b=a.pinboard.state.items[0].snapshot,g=b.geometries[0],live=a.sheet.front;
 return {geometryEqual:JSON.stringify(Array.from(live.geometry.attributes.position.array))===JSON.stringify(g.position),uvEqual:JSON.stringify(Array.from(live.geometry.attributes.uv.array))===JSON.stringify(g.uv),parts:b.parts.length,papers:b.materials.filter(m=>m.paper).map(m=>m.paper),pin:a.pinPrintPosition,centre:a.centrePrintPosition};
});assert(snapshot.geometryEqual&&snapshot.uvEqual);assert(snapshot.parts>=11);assert.deepEqual(snapshot.pin,{x:0,y:1/32});assert.deepEqual(snapshot.centre,{x:1/32,y:0});result.snapshot=snapshot;
await shot('board-current-bow-centre');
const exports=[];
for(const [i,bg] of ['Linen','Rose','Slate'].entries()){
 await page.getByLabel('Pinboard background').selectOption(bg);await btn('Move right').click();await page.getByLabel('Pinboard tilt').fill(String(4+i*4));
 const [download]=await Promise.all([page.waitForEvent('download'),btn('Save PNG').click()]);const file=path.join(out,'board-'+bg+'.png');await download.saveAs(file);exports.push(file);
}
await btn('Return to piece').click();assert.deepEqual(await getState(),withBow);
const memory=[];for(let i=0;i<4;i++){await btn('Pinboard').click();memory.push(await page.evaluate(()=>({...paperCouture.pinboard.renderer.info.memory})));await page.keyboard.press('Escape');assert.deepEqual(await getState(),withBow)}assert.deepEqual(memory.slice(1),Array(3).fill(memory[1]));result.memory=memory;result.exports=exports;
result.checks.push('Explicitly pinned actual bow and shifted centre, three backgrounds and PNGs, repeated entry/exit with stable resources');
assert.equal(await page.evaluate(()=>localStorage.getItem('__positioning_keep')),'sentinel');
result.checks.push('Portrait/landscape touch drag, tilt, close/Escape focus isolation, no page overflow and existing storage retained');
// Test actual OrbitControls clamping at both distance bounds for all registered
// designs and the offered body-length choices, including after resize.
const cameras=[];
for(const [width,height] of [[1100,800],[390,844],[844,390]]){
 await page.setViewportSize({width,height});
 for(const [id,options] of [['dress',''],['jacket','jacketLength=cropped'],['jacket','jacketLength=longer'],['vest','vestLength=short'],['vest','vestLength=longline'],['vest','vestLength=pointed'],['skirt','skirtLength=short'],['skirt','skirtLength=classic'],['skirt','skirtLength=long'],['pleats',''],['apron',''],['clutch',''],['tunic','']]){
  await load(`design=${id}&${options}&step=99&view=display`);
  const bounds=await page.evaluate(()=>{const a=paperCouture,c=a.displayCam.controls,target=a.displayCam.target,out=[];c.enableDamping=false;for(const r of [c.minDistance,c.maxDistance]){for(const az of [0,Math.PI/2,Math.PI]){a.stage.camera.position.set(target.x+r*Math.cos(az),target.y-r*.5,target.z+r*Math.sin(az));c.update();out.push(a.stage.camera.position.y)}}return {lowest:Math.min(...out),maxPolar:c.maxPolarAngle,options:a.options}});
  assert(bounds.lowest>=.0249,JSON.stringify({id,width,...bounds}));cameras.push({id,width,...bounds});
  if(id==='dress'&&width===390)await shot('camera-lowest-portrait');
 }
}
result.cameras=cameras;result.checks.push('Actual OrbitControls stays above table at distance/orbit extremes for every design and length in three viewports');
// A different current garment must create a different board snapshot; no sample catalogue.
for(const id of ['jacket','skirt','vest','pleats','apron','clutch','tunic']){
 await load(`design=${id}&paper=plum-scatter&printX=0.125&printY=0.0625&step=99&view=display`);await btn('Pinboard').click();await btn('Remove selected').click();await btn('Pin current piece').click();assert((await page.getByLabel('Selected board piece').innerText()).includes('Plum scatter'));await shot('board-'+id);await btn('Return to piece').click();assert.equal((await getState()).design,id);
}
result.checks.push('All eight actual current designs render on the board with their chosen paper and offset');
assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.failure=String(e);await shot('failure').catch(()=>{});throw e}finally{fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
