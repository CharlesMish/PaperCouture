const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=process.env.CAPTURE_DIR||'.external-study-browser';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1000,height:800},reducedMotion:'reduce'});page.setDefaultTimeout(60000);const report={views:[],print:[],errors:[]};page.on('pageerror',e=>report.errors.push(String(e)));
const settle=()=>page.waitForFunction(()=>window.paperCouture&&!paperCouture.controller.moving&&paperCouture.view.t===paperCouture.view.target&&!paperCouture.displayCam.glide&&paperCouture.sheet.front.geometry.attributes.position?.count>0);
const btn=name=>page.getByRole('button',{name,exact:true});
try{
for(const id of ['notch-crop','bolero-study','capelet','camp-shirt','necktie']){
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:4452')+'/?design='+id+'&paper=oat-linen&step=99&view=display');await settle();assert.equal(await page.evaluate(()=>paperCouture.garmentId),id);
 for(const view of ['Front','Angle','Back']){await btn(view).click();await settle();const name=id+'-'+view.toLowerCase();await page.screenshot({path:path.join(out,name+'.png')});report.views.push(name)}
}
for(const id of ['notch-crop','bolero-study']){
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:4452')+'/?design='+id+'&paper=corner-bloom&step=0');await settle();
 const steps=await page.evaluate(()=>paperCouture.timeline.ops.length);
 for(let n=0;n<steps;n++){await page.evaluate(()=>{paperCouture.controller.beginScrub();paperCouture.controller.scrubTo(.5)});await page.waitForTimeout(50);await page.screenshot({path:path.join(out,id+'-fold-'+(n+1)+'.png')});await page.evaluate(()=>paperCouture.controller.endScrub(false));await settle();await page.locator('.dock:not(.display-dock) .btn-primary').click();if(await page.evaluate(()=>paperCouture.controller.moving))await page.locator('.dock:not(.display-dock) .btn-primary').click();await settle()}
 await btn('Display').click();await settle();
 for(let q=0;q<4;q++){
  while(await page.evaluate(()=>paperCouture.quarterTurns)!==q)await page.getByRole('button',{name:/^Turn paper/}).click();
  for(const shift of [0,-.0625]){
   await btn('Position print').click();await btn('Reset print').click();if(shift)for(let n=0;n<2;n++){await btn('Left').click();await btn('Down').click()}await btn('Done').click();
   for(const view of ['Front','Back']){await btn(view).click();await settle();await page.screenshot({path:path.join(out,`${id}-bloom-${q}-${shift?'shift':'original'}-${view.toLowerCase()}.png`)});if(view==='Front'){const red=await page.evaluate(()=>{const a=paperCouture;a.stage.renderer.render(a.stage.scene,a.stage.camera);const c=document.createElement('canvas');c.width=a.stage.renderer.domElement.width;c.height=a.stage.renderer.domElement.height;const ctx=c.getContext('2d');ctx.drawImage(a.stage.renderer.domElement,0,0);const d=ctx.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]>100&&d[i]>d[i+1]*1.4&&d[i]>d[i+2]*1.4)n++;return n});report.print.push({id,turn:q,shift,redPixels:red})}}
  }
 }
}
assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=String(e);throw e}finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
