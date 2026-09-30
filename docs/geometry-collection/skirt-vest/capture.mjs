import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'vite';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const binary=require(process.env.CHROMIUM_MODULE || '/workspace/scratch/browser-runtime/node_modules/@sparticuz/chromium/build/index.js').default;
const output=fileURLToPath(new URL('./browser/',import.meta.url));mkdirSync(output,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'warn'});await server.listen();
let browser;const errors=[];const captures=[];
try{
 browser=await chromium.launch({headless:true,executablePath:await binary.executablePath(),args:[...binary.args,'--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:640,height:600}});
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/docs/geometry-collection/skirt-vest/study.html`);
 await page.waitForFunction(()=>window.ready);
 const variants=[{wrap:'original',band:'double'},{wrap:'original',band:'single'},{wrap:'opposite',band:'double'},{wrap:'opposite',band:'single'},{garment:'vest',length:'short'},{garment:'vest',length:'longline'}];
 const capture=async options=>{await page.evaluate(o=>window.renderStudy(o),options);const name=Object.entries(options).map(([k,v])=>`${k}-${v}`).join('_')+'.png';await page.screenshot({path:output+name});captures.push({name,...options});};
 for(const v of variants)for(const paper of ['ivory-border','cut-paper-mosaic','reverse-garden'])await capture({...v,paper,view:'front'});
 for(const wrap of ['original','opposite'])for(let turn=0;turn<4;turn++)for(const view of ['front','back'])await capture({wrap,band:'single',paper:'grid',turn,view});
 for(const length of ['short','longline'])for(const view of ['angle','back'])await capture({garment:'vest',length,paper:'ivory-border',view});
 if(errors.length)throw Error(errors.join('\n'));
 writeFileSync(output+'manifest.json',JSON.stringify({errors,captures},null,2));console.log(`Captured ${captures.length} source SheetView renders; no browser errors.`);
}finally{await browser?.close();await server.close();}
