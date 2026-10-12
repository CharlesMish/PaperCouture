const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage();
p.on('pageerror',e=>console.error('ERR',String(e)));p.on('console',m=>{if(m.type()==='error')console.error(m.text())});
await p.goto('http://127.0.0.1:5627/');await p.waitForFunction(()=>window.paperCouture);
const r=await p.evaluate(async(ids)=>{const {PAPERS}=await import('/src/papers/index.ts');const {paperCanvas}=await import('/src/render/textures.ts');const out=[];
for(const id of ids){const paper=PAPERS.find(x=>x.id===id);for(const side of ['front','back']){const t0=performance.now();const c=paperCanvas(paper,side,0);const ms=performance.now()-t0;out.push({name:id+'-'+side,ms,data:c.toDataURL('image/png')});}}return out;},process.argv.slice(3));
for(const f of r){fs.writeFileSync(process.argv[2]+'/'+f.name+'.png',Buffer.from(f.data.split(',')[1],'base64'));console.log(f.name,Math.round(f.ms)+'ms');}
await b.close();})();
