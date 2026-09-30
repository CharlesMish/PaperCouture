// Optional isolated facet study, not an application interaction test.
// Uses established external Playwright/Chromium tooling; adds no dependency.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
(async()=>{
 const {createServer}=await import('vite');
 const server=await createServer({server:{host:'127.0.0.1',port:0}});await server.listen();
 let browser;const errors=[];
 try {
  let launch={headless:true,args:['--no-sandbox','--use-angle=swiftshader']};
  if(process.env.CHROMIUM_MODULE){const binary=require(process.env.CHROMIUM_MODULE).default;launch={headless:true,executablePath:await binary.executablePath(),args:[...binary.args,'--use-angle=swiftshader']};}
  browser=await chromium.launch(launch);
  const page=await browser.newPage({viewport:{width:700,height:600}});
  page.on('pageerror',error=>errors.push(String(error)));
  const root=`http://127.0.0.1:${server.httpServer.address().port}/docs/geometry-collection/trousers-centre/render.html`;
  const captures=[
   ['centre-front',''],['centre-angle','?view=angle'],['centre-back','?view=back'],
   ['centre-midfold','?op=3&t=.5&view=angle'],['bow-plain','?mode=bow'],
   ['bow-mosaic','?mode=bow&paper=cut-paper-mosaic'],['bow-garden','?mode=bow&paper=reverse-garden&view=angle'],
   ['trousers-parked','?mode=trousers'],
   ...[0,1,2,3].map(q=>[`bow-rotation-${q}`,`?mode=bow&paper=grid&q=${q}`]),
  ];
  for(const [name,query] of captures){await page.goto(root+query);await page.waitForFunction(()=>window.studyReady);await page.screenshot({path:`docs/geometry-collection/trousers-centre/${name}.png`});console.log(name);}
  if(errors.length)throw new Error(errors.join('\n'));
  fs.writeFileSync('docs/geometry-collection/trousers-centre/browser-result.json',JSON.stringify({errors,captures:captures.map(c=>c[0]),kind:'isolated real facet render, not integrated app interaction',browser:'headless Chromium software WebGL'},null,2));
 }finally{await browser?.close();await server.close();}
})().catch(error=>{console.error(error);process.exit(1)});
