// usage: node shoot.cjs jobs.json outdir ; job = {name, q, views:['Front','Back','Angle']}
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),path=require('path');
const base=process.env.DEV_URL||'http://127.0.0.1:5627';
(async()=>{
 const jobs=JSON.parse(fs.readFileSync(process.argv[2]));const out=process.argv[3];fs.mkdirSync(out,{recursive:true});
 const b=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await b.newContext({viewport:{width:1180,height:900},reducedMotion:'reduce'});
 const page=await ctx.newPage();page.on('pageerror',e=>console.error('ERR',String(e)));
 const settle=()=>page.waitForFunction(()=>window.paperCouture&&!paperCouture.controller.moving&&paperCouture.view.t===paperCouture.view.target&&!paperCouture.displayCam.glide,null,{timeout:30000});
 for(const j of jobs){
  await page.goto(base+'/?'+j.q+'&step=99&view=display');await settle();
  const n=await page.evaluate(()=>paperCouture.timeline.ops.length);
  if(!(await page.evaluate(()=>paperCouture.controller.finished))){await page.goto(base+'/?'+j.q+'&step='+n+'&view=display');await settle();}
  for(const v of (j.views||['Front'])){
   await page.getByRole('button',{name:v,exact:true}).click();await settle();await page.waitForTimeout(150);
   await page.locator('#stage').screenshot({path:path.join(out,`${j.name}-${v.toLowerCase()}.png`)});
  }
  console.log('ok',j.name);
 }
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
