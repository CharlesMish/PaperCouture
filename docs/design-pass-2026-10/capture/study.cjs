// node study.cjs outdir name=query ...
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const out=process.argv[2];require('fs').mkdirSync(out,{recursive:true});
const b=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await b.newPage({viewport:{width:600,height:720}});page.on('pageerror',e=>console.error('ERR',String(e)));
for(const a of process.argv.slice(3)){const i=a.indexOf('='),n=a.slice(0,i),q=a.slice(i+1);
await page.goto('http://127.0.0.1:5627/docs/design-pass-2026-10/origami/study.html?'+q.replace(/,/g,'&'));
await page.waitForFunction(()=>window.studyReady,null,{timeout:60000});await page.screenshot({path:out+'/'+n+'.png'});console.log('ok',n);}
await b.close();})().catch(e=>{console.error(e);process.exit(1)});
