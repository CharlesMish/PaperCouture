const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const base='http://127.0.0.1:5627',out=process.argv[2];fs.mkdirSync(out,{recursive:true});
const boards={
 'board-petrol':[['swing-coat','crease-bloom',20,-.78,.1],['camp-shirt','copper-fleck',18,.75,.72],['skirt','marbled-endpaper',20,.75,-.55],['hat','crease-bloom',8,-.78,1.34]],
 'board-proof':[['camp-shirt','riso-proof',18,-.55,.6],['pleats','slate-grain',20,-.55,-.75],['framed-brooch','riso-proof',4.5,.7,.9],['necktie','marbled-endpaper',7,.7,.1],['clutch','riso-proof',8,.7,-.8]],
};
(async()=>{const b=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const errors=[];const log=[];
for(const [name,items] of Object.entries(boards)){
 const ctx=await b.newContext({viewport:{width:1180,height:900},reducedMotion:'reduce',acceptDownloads:true});const page=await ctx.newPage();page.setDefaultTimeout(60000);
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 const btn=n=>page.getByRole('button',{name:n,exact:true});
 const settle=()=>page.waitForFunction(()=>window.paperCouture&&!paperCouture.controller.moving&&paperCouture.view.t===paperCouture.view.target&&!paperCouture.displayCam.glide);
 for(const [id,paper,cm,x,y] of items){
  await page.goto(`${base}/?design=${id}&paper=${paper}&step=99&view=display`);await settle();
  await page.getByRole('button',{name:/^View board/}).click();
  assert.equal(Number(await page.getByLabel('Starting square size').inputValue()),cm,id);
  await btn('Pin current piece').click();
  await page.evaluate(({x,y})=>{const b=paperCouture.pinboard;b.mutate(()=>{const i=b.state.items.at(-1);i.x=x;i.y=y;b.position();b.constrain(i.id)})},{x,y});
  log.push(`${name}: pinned ${id}/${paper} at ${cm} cm`);
 }
 await page.locator('.board-tools').evaluate(e=>e.scrollTop=0);await page.screenshot({path:path.join(out,name+'-desktop.png')});
 const [d]=await Promise.all([page.waitForEvent('download'),btn('Save PNG').click()]);await d.saveAs(path.join(out,name+'.png'));
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(400);await page.screenshot({path:path.join(out,name+'-390.png')});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);log.push(`${name}: 390px document overflow ${overflow}`);
 await ctx.close();
}
// phone-width workshop with a new paper selected
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});const page=await ctx.newPage();page.on('pageerror',e=>errors.push(String(e)));
for(const p of ['riso-proof','crease-bloom','marbled-endpaper']){await page.goto(`${base}/?design=swing-coat&paper=${p}&step=99&view=display`);await page.waitForFunction(()=>window.paperCouture&&!paperCouture.controller.moving);await page.waitForTimeout(500);await page.screenshot({path:path.join(out,'phone-'+p+'.png')});
 log.push(`phone 390: ${p} overflow ${await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)}`);}
await b.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({log,errors},null,2));console.log(JSON.stringify({log,errors},null,2));})().catch(e=>{console.error(e);process.exit(1)});
