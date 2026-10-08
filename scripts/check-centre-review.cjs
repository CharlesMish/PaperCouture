// Independent integrated accessory audit. Uses a private copy of dist so later
// parallel builds cannot change the files during this run.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = 'docs/geometry-collection/centre-review';
(async () => {
 fs.mkdirSync(output,{recursive:true});
 const snapshot=fs.mkdtempSync(path.join(os.tmpdir(),'paper-centre-build-'));
 fs.cpSync(process.env.BUILD_DIR||'dist',snapshot,{recursive:true});
 const html=fs.readFileSync(path.join(snapshot,'index.html'),'utf8');
 fs.writeFileSync(`${output}/build.json`,JSON.stringify({entry:html.match(/src="([^"]+\.js)"/)?.[1]},null,2));
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://local').pathname;
  if(!url.startsWith('/play/paper-couture/')){res.writeHead(404).end();return;}
  const file=path.resolve(snapshot,url.slice('/play/paper-couture/'.length)||'index.html');
  if(!file.startsWith(snapshot+'/')||!fs.existsSync(file)){res.writeHead(404).end();return;}
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream';
  res.writeHead(200,{'Content-Type':mime,'Content-Security-Policy':"default-src 'self'; base-uri 'none'; connect-src 'self'; font-src 'self'; form-action 'none'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; upgrade-insecure-requests"});res.end(fs.readFileSync(file));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;const errors=[],checks=[],layouts=[];
 try{
  let launch={headless:true,args:['--no-sandbox','--use-angle=swiftshader']};
  if(process.env.CHROMIUM_MODULE){const binary=require(process.env.CHROMIUM_MODULE).default;launch={headless:true,executablePath:await binary.executablePath(),args:[...binary.args,'--use-angle=swiftshader']};}
  browser=await chromium.launch(launch);
  const p=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce',hasTouch:true});
  p.setDefaultTimeout(30000);
  p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});p.on('requestfailed',r=>errors.push(`${r.url()}: ${r.failure()?.errorText}`));
  const state=()=>p.evaluate(()=>({step:paperCouture.controller.step,total:paperCouture.timeline.ops.length,moving:paperCouture.controller.moving,mode:paperCouture.accessoryMode,editing:paperCouture.editingCentre,centre:paperCouture.centreAttached,complete:paperCouture.centreComplete,attached:paperCouture.attached,visible:paperCouture.accessoryRoot.visible,centreVisible:paperCouture.accessoryRoot.children[2].visible,wing:paperCouture.bowWing,paper:paperCouture.paperId,turn:paperCouture.quarterTurns,wingPaper:paperCouture.accessoryPaperId,wingTurn:paperCouture.accessoryQuarterTurns,centrePaper:paperCouture.centrePaperId,centreTurn:paperCouture.centreQuarterTurns,options:paperCouture.options}));
  const button=name=>p.getByRole('button',{name,exact:true});
  const fold=async()=>{const before=(await state()).step;await p.locator('.dock:not([hidden]) .btn-primary').click();if((await state()).moving)await p.locator('.dock:not([hidden]) .btn-primary').click();await p.waitForFunction(s=>paperCouture.controller.step===s+1&&!paperCouture.controller.moving,before)};
  const back=async()=>{const before=(await state()).step;await button('Back').click();if((await state()).moving)await button('Back').click();await p.waitForFunction(s=>paperCouture.controller.step===s-1&&!paperCouture.controller.moving,before)};
  const finish=async()=>{for(let i=0;i<20;i++){const s=await state();if(s.step===s.total)return;await fold()}throw new Error('unexpected step count')};
  const displayed=async()=>p.waitForFunction(()=>paperCouture.view.inDisplay&&!paperCouture.displayCam.glide);
  const checkpoint=async name=>{const s=await state();checks.push({name,state:s});console.log(name,JSON.stringify(s));return s};
  const capture=async name=>{await p.waitForTimeout(350);await p.screenshot({path:`${output}/${name}.png`})};
  const paper=async name=>p.getByRole('radio',{name,exact:true}).click();
  const rotate=async()=>p.getByRole('button',{name:/^Turn paper \(now/}).click();
  await p.goto(`http://127.0.0.1:${server.address().port}/play/paper-couture/?step=6&paper=tidal-bands&view=display`);await p.waitForFunction(()=>window.paperCouture);await displayed();
  await p.getByLabel('Accessory type',{exact:true}).selectOption('bow');await button('Fold accessory').click();
  await paper('Cut-paper mosaic');await rotate();await rotate();
  await finish();await button('Second wing').click();await finish();await button('Attach').click();await displayed();
  let s=await checkpoint('two completed wings');assert(s.attached&&s.visible&&!s.centre&&s.wing===1);assert.equal(s.paper,'tidal-bands');assert.equal(s.wingPaper,'cut-paper-mosaic');assert.equal(s.wingTurn,2);
  await button('Fold centre').click();s=await state();assert(s.editing);assert.equal(s.total,5);assert.equal(s.centrePaper,'ink-reverse');
  await paper('Midnight orchard');await rotate();await fold();await fold();await back();
  await button('Back to garment').click();await displayed();s=await checkpoint('partial centre returned; wings retained');assert(s.attached&&s.visible&&!s.centre&&!s.complete);assert.equal(s.wing,1);
  await button('Fold centre').click();s=await state();assert.equal(s.step,1);assert.equal(s.paper,'midnight-orchard');assert.equal(s.turn,1);
  await p.locator('.dock:not([hidden]) .btn-primary').click();assert((await state()).moving);await button('Start over').click();s=await state();assert.equal(s.step,0);assert(!s.moving);
  await button('Back to garment').click();await displayed();s=await checkpoint('centre reset cancelled; wings retained');assert(s.attached&&s.visible&&!s.centre);
  await button('Fold centre').click();assert.equal((await state()).step,0);await finish();await button('Attach centre').click();await displayed();
  s=await checkpoint('three-piece bow attached');assert(s.attached&&s.visible&&s.centre&&s.complete&&s.centreVisible);assert.equal(s.paper,'tidal-bands');assert.equal(s.turn,0);assert.equal(s.wingPaper,'cut-paper-mosaic');assert.equal(s.wingTurn,2);assert.equal(s.centrePaper,'midnight-orchard');assert.equal(s.centreTurn,1);await capture('assembled-desktop');
  await button('Show folded centre').click();await p.waitForFunction(()=>!paperCouture.accessoryRoot.children[2].visible);s=await state();assert(!s.centre&&s.attached&&s.complete);await button('Show folded centre').click();await p.waitForFunction(()=>paperCouture.accessoryRoot.children[2].visible);
  await p.getByLabel('Fold to revisit').selectOption('silhouette');await button('Revisit fold').click();await p.waitForFunction(()=>paperCouture.view.inWorkshop&&!paperCouture.controller.moving);assert.equal((await state()).step,2);await p.locator('[data-decision="silhouette"][data-choice="flare"]').click();await finish();await button('Display').click();await displayed();
  s=await checkpoint('changed garment fold restored complete assembly');assert(s.attached&&s.visible&&s.centre&&s.complete&&s.centreVisible);assert.equal(s.options.silhouette,'flare');assert.equal(s.wingPaper,'cut-paper-mosaic');assert.equal(s.wingTurn,2);assert.equal(s.centrePaper,'midnight-orchard');assert.equal(s.centreTurn,1);assert.equal(s.paper,'tidal-bands');
  await button('Edit centre').click();assert.equal((await state()).step,5);await back();await back();await button('Back to garment').click();await displayed();s=await checkpoint('unfolded centre returned; wings retained');assert(s.attached&&s.visible&&!s.centre&&!s.complete);await button('Fold centre').click();assert.equal((await state()).step,3);await finish();await button('Attach centre').click();await displayed();
  for(const [width,height]of[[390,844],[844,390]]){
   await p.setViewportSize({width,height});await displayed();
   // Use normal clicks: Playwright scrolls the horizontal control strip only
   // as a user could, and still checks visibility and pointer interception.
   await button('Show folded centre').click();await button('Show folded centre').click();await button('Edit centre').click();assert((await state()).editing);await capture(`centre-edit-${width}`);await button('Back to garment').click();await displayed();
   const layout=await p.evaluate(()=>{const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}};return{width:innerWidth,height:innerHeight,studio:rect('.studio-controls'),dock:rect('.display-dock'),overflow:document.documentElement.scrollWidth>innerWidth}});layouts.push(layout);assert(!layout.overflow,'horizontal page overflow');await button('Show folded centre').scrollIntoViewIfNeeded();await capture(`assembled-${width}`);
   await checkpoint(`centre controls reachable at ${width}×${height}`);
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(`${output}/result.json`,JSON.stringify({checks,layouts,errors,scope:'production build via real UI; headless Chromium touch-enabled emulation, not real phone or Safari'},null,2));console.log('centre review passed');
 }catch(error){fs.writeFileSync(`${output}/failure.json`,JSON.stringify({error:String(error),checks,layouts,errors},null,2));throw error}
 finally{await browser?.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(snapshot,{recursive:true,force:true})}
})().catch(error=>{console.error(error);process.exit(1)});
