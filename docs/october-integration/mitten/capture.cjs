const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
(async()=>{const out='docs/october-integration/mitten/evidence';require('fs').mkdirSync(out,{recursive:true});
const b=await chromium.launch({executablePath:'/workspace/scratch/16f45a242997/browser-runtime/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await b.newPage({viewport:{width:480,height:600}});page.on('pageerror',e=>console.error('ERR',String(e)));
const defaults = [
 'original=design=original,paper=oat-linen,label=Claude original',
 'selected-left=design=selected,paper=oat-linen,label=Recovered left',
 'selected-right=design=selected,hand=right,paper=oat-linen,label=Recovered right',
 'selected-back=design=selected,view=back,paper=grid,label=Material grid — back',
 'selected-grid=design=selected,paper=grid,label=Material grid — front',
 'selected-angle=design=selected,view=angle,paper=oat-linen,label=Recovered angle',
 'selected-marble=design=selected,paper=marbled-endpaper,label=Recovered marble',
 'sequence0=design=selected,step=0,progress=0,view=table,paper=grid,label=One intact square',
 'sequence1=design=selected,step=0,progress=1,view=table,paper=grid,label=1 Cuff turned',
 'sequence2=design=selected,step=2,progress=1,view=table,paper=grid,label=3 Retained top turn',
 'sequence3=design=selected,step=3,progress=1,view=table,paper=grid,label=4 Thumb-side gate',
 'sequence4=design=selected,step=4,progress=.5,view=table,paper=grid,label=5 Thumb in motion',
 'sequence5=design=selected,step=4,progress=1,view=table,paper=grid,label=5 Thumb resting',
 'sequence6=design=selected,step=6,progress=.5,view=table,paper=grid,label=7 Fingertip in motion',
 'sequence7=design=selected,step=8,progress=1,view=front,paper=grid,label=9 Finished face'
];
for(const a of process.argv.length>2?process.argv.slice(2):defaults){const i=a.indexOf('='),n=a.slice(0,i),q=a.slice(i+1);
await page.goto('http://127.0.0.1:5631/docs/october-integration/mitten/study.html?'+q.replace(/,/g,'&'));
await page.waitForFunction(()=>window.studyReady,null,{timeout:60000});await page.screenshot({path:out+'/'+n+'.png'});console.log('ok',n);}
await b.close();})().catch(e=>{console.error(e);process.exit(1)});
