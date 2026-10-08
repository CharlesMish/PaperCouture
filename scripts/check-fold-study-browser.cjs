const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const out=process.env.CAPTURE_DIR||'.experiment-qa';fs.mkdirSync(out,{recursive:true});
(async()=>{let server,base=process.env.BASE_URL;
if(!base){const root=path.resolve('dist-experiment');server=http.createServer((req,res)=>{let f=path.join(root,decodeURI(new URL(req.url,'http://local').pathname));if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!fs.existsSync(f)){res.writeHead(404);res.end('Missing');return}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));});await new Promise(ok=>server.listen(0,'127.0.0.1',ok));base=`http://127.0.0.1:${server.address().port}/experiments/fold-study/`;}
const b=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'}),p=await ctx.newPage();p.setDefaultTimeout(45000);const r={base,errors:[],badResponses:[],checks:[]};p.on('pageerror',e=>r.errors.push(String(e)));p.on('response',x=>{if(x.status()>=400)r.badResponses.push([x.url(),x.status()])});
const settle=()=>p.waitForFunction(()=>window.foldStudy&&!foldStudy.controller.moving&&foldStudy.view.t===foldStudy.view.target&&!foldStudy.displayCam.glide);
const shot=async n=>p.screenshot({path:path.join(out,n+'.png')});
const step=()=>p.evaluate(()=>foldStudy.controller.step);
const advance=async()=>{const n=await step();await p.locator('.dock:not([hidden]) .btn-primary').click();await p.waitForFunction(n=>foldStudy.controller.step===n+1&&!foldStudy.controller.moving,n)};
const finish=async()=>{while(await p.evaluate(()=>!foldStudy.controller.finished))await advance()};
const button=async n=>{await p.getByRole('button',{name:n,exact:true}).click();await settle()};
try{
await p.goto(base);await settle();if(process.env.EXPECTED_SHA)assert.equal(await p.locator('meta[name="papercouture-source-sha"]').getAttribute('content'),process.env.EXPECTED_SHA);
assert.deepEqual(await p.locator('select option').evaluateAll(a=>a.map(x=>x.value)),['clutch','apron']);
for(const item of ['clutch','apron']){
 console.log('Checking rendered sequence:',item);
 await p.getByLabel('Fold study',{exact:true}).selectOption(item);await settle();await shot(item+'-square');
 await p.locator('.dock:not([hidden]) .btn-primary').click();await p.waitForFunction(()=>foldStudy.controller.moving&&foldStudy.controller.pose().t>.2&&foldStudy.controller.pose().t<.85);await shot(item+'-moving');
 await p.getByRole('button',{name:'Back',exact:true}).click();await settle();assert.equal(await step(),0);r.checks.push(item+': mid-fold Back returns to square');
 await p.locator('.dock:not([hidden]) .btn-primary').click();await p.waitForFunction(()=>foldStudy.controller.moving);await button('Start over');assert.equal(await step(),0);r.checks.push(item+': reset during motion');
 await finish();const count=await step();await shot(item+'-finished-workshop');
 for(let n=count;n>0;n--){await button('Back');assert.equal(await step(),n-1)}
 await finish();await button('Display');assert(await p.evaluate(()=>foldStudy.view.inDisplay));
 const entryDistance=await p.evaluate(()=>foldStudy.stage.camera.position.distanceTo(foldStudy.displayCam.target));
 for(const name of ['Front','Angle','Back']){await button(name);await shot(item+'-'+name.toLowerCase())}
 await button('Reset view');assert(Math.abs((await p.evaluate(()=>foldStudy.stage.camera.position.distanceTo(foldStudy.displayCam.target)))-entryDistance)<1e-5);
 await p.getByRole('radio',{name:'Starlit lining',exact:true}).click();await settle();for(let q=0;q<4;q++){await p.getByRole('button',{name:`Turn paper (now ${q*90}°)`,exact:true}).click();await settle()}
 assert.equal(await p.evaluate(()=>foldStudy.turns),0);assert.equal(await step(),count);await shot(item+'-starlit');
 await button('Turntable');assert(await p.evaluate(()=>foldStudy.displayCam.turntable));await button('Turntable');
 await p.getByRole('button',{name:'Return to the workshop',exact:true}).click();await settle();assert.equal(await step(),count);
 await button('Start over');assert.equal(await step(),0);r.checks.push(item+': complete forward/back/reset, Display angles, Reset view, paper/4 turns, turntable and Workshop');
}
// Each candidate session retains its own progress/paper while switching.
await p.getByLabel('Fold study',{exact:true}).selectOption('clutch');await settle();await p.getByRole('radio',{name:'Border print',exact:true}).click();await advance();await advance();
await p.getByLabel('Fold study',{exact:true}).selectOption('apron');await settle();await advance();await p.getByLabel('Fold study',{exact:true}).selectOption('clutch');await settle();assert.equal(await step(),2);assert.equal(await p.evaluate(()=>foldStudy.paperId),'border-print');r.checks.push('candidate round trip retains fold progress and paper');
for(const viewport of [{width:390,height:844},{width:844,height:390}]){
 console.log('Checking viewport:',viewport);
 await p.setViewportSize(viewport);await p.goto(base+'?item=clutch&paper=pinstripe-lining');await settle();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),viewport.width);
 const handle=p.getByRole('button',{name:'Fold small flap 1',exact:true});await handle.waitFor();const hb=await handle.boundingBox();assert(hb.width>=44&&hb.height>=44);
 const direction=await handle.locator('span').evaluate(e=>Number(e.style.transform.match(/rotate\((.+)rad\)/)[1]));
 const gesture=async distance=>{await p.mouse.move(hb.x+hb.width/2,hb.y+hb.height/2);await p.mouse.down();await p.mouse.move(hb.x+hb.width/2+Math.cos(direction)*distance,hb.y+hb.height/2+Math.sin(direction)*distance,{steps:5});await p.mouse.up();await settle()};
 await gesture(15);assert.equal(await step(),0);await gesture(120);assert.equal(await step(),1);await button('Start over');await handle.click();await settle();assert.equal(await step(),1);await finish();await button('Display');await shot('clutch-display-'+viewport.width);
 await p.getByLabel('Fold study',{exact:true}).selectOption('apron');await settle();await finish();await button('Display');await shot('apron-display-'+viewport.width);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),viewport.width);
 r.checks.push(`${viewport.width}x${viewport.height}: both candidates rendered; 44px tip grip tap, drag cancel and drag commit; no horizontal overflow`);
}
assert.deepEqual(r.errors,[]);assert.deepEqual(r.badResponses,[]);r.passed=true;
}catch(e){r.failure=String(e);await shot('failure').catch(()=>{});throw e}finally{fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(r,null,2));await b.close();server?.close();console.log(JSON.stringify(r,null,2))}
})().catch(e=>{console.error(e);process.exitCode=1});
