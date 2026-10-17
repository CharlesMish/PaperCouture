const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path');
const out=process.env.CAPTURE_DIR||'docs/october-integration/tiles/papers';
(async()=>{fs.mkdirSync(out,{recursive:true});const b=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
const p=await b.newPage({viewport:{width:1180,height:900},reducedMotion:'reduce'});const errors=[];p.on('pageerror',e=>errors.push(String(e)));
for(const [label,url]of[['submitted',process.env.BASELINE_URL||'http://127.0.0.1:5628'],['corrected',process.env.DEV_URL||'http://127.0.0.1:5627']]){
for(const design of ['camp-shirt','pleats','framed-brooch']){
 await p.goto(url+'/?design='+design+'&paper=riso-proof&step=99&view=display');
 await p.waitForFunction(()=>window.paperCouture&&paperCouture.controller.finished&&paperCouture.view.t===paperCouture.view.target&&!paperCouture.displayCam.glide);
 await p.getByRole('button',{name:'Front',exact:true}).click();await p.waitForFunction(()=>!paperCouture.displayCam.glide);
 await p.screenshot({path:path.join(out,label+'-'+design+'.png')});
}
const uri=await p.evaluate(async()=>{const {risoProof}=await import('/src/papers/risoProof.ts');const c=document.createElement('canvas');c.width=c.height=1024;risoProof.drawFront(c.getContext('2d'),1024);return c.toDataURL()});fs.writeFileSync(path.join(out,label+'-flat.png'),Buffer.from(uri.split(',')[1],'base64'));
}
if(errors.length)throw Error(errors.join('\n'));console.log('Riso before/after: flat, shirt, pleats, brooch; no page exceptions.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
