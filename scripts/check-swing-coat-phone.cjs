const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const out=process.env.CAPTURE_DIR||'docs/swing-coat/evidence/browser';
(async()=>{const b=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const results=[];try{for(const width of [390,320]){
const c=await b.newContext({viewport:{width,height:width===390?844:568},isMobile:true,hasTouch:true,deviceScaleFactor:1,reducedMotion:'reduce'});const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(String(e)));const btn=name=>p.getByRole('button',{name,exact:true});const settle=()=>p.waitForFunction(()=>window.paperCouture&&!paperCouture.controller.moving&&paperCouture.view.t===paperCouture.view.target&&!paperCouture.displayCam.glide);
await p.goto((process.env.BASE_URL||'http://127.0.0.1:5637')+'/?design=swing-coat&paper=reed-study&step=0');await settle();await p.screenshot({path:out+`/phone-${width}-workshop.png`});
for(let i=0;i<10;i++){await p.locator('.dock:not([hidden]) .btn-primary').tap();if(await p.evaluate(()=>paperCouture.controller.moving))await p.locator('.dock:not([hidden]) .btn-primary').tap();await settle();assert.equal(await p.evaluate(()=>paperCouture.controller.step),i+1)}
await btn('Display').tap();await settle();await btn('Front').tap();await settle();await p.screenshot({path:out+`/phone-${width}-front.png`});
await btn('Position print').tap();await btn('Right').tap();await btn('Done').tap();assert.equal(await p.evaluate(()=>paperCouture.printPosition.x),.03125);
await btn('Back').tap();await settle();await p.screenshot({path:out+`/phone-${width}-back.png`});
await btn('Return to the workshop').tap();await settle();await btn('Back').tap();if(await p.evaluate(()=>paperCouture.controller.moving))await btn('Back').tap();await settle();assert.equal(await p.evaluate(()=>paperCouture.controller.step),9);
assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),width);assert.deepEqual(errors,[]);results.push({width,forwardTaps:10,back:true,positionPrint:true,noOverflow:true,errors});await c.close();}
fs.writeFileSync(out+'/phone-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
