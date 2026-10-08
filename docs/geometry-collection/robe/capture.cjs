const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
 const {createServer}=await import('vite');const server=await createServer({server:{host:'127.0.0.1',port:0}});await server.listen();
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH ? {executablePath:process.env.CHROMIUM_EXECUTABLE_PATH} : {}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const port=server.httpServer.address().port;
 const page=await browser.newPage({viewport:{width:600,height:720}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 try{for(const paper of ['plain','cut-paper-mosaic','reverse-garden','botanical'])for(const view of ['front','angle','back']){
  await page.goto(`http://127.0.0.1:${port}/docs/geometry-collection/robe/study.html?paper=${paper}&view=${view}`);await page.waitForFunction(()=>window.studyReady);await page.screenshot({path:`docs/geometry-collection/robe/${paper}-${view}.png`});console.log(paper,view);
 }fs.writeFileSync('docs/geometry-collection/robe/browser-errors.json',JSON.stringify(errors));if(errors.length)throw Error(errors.join('\n'));}finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
