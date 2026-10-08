// Draws the real Canvas papers and checks every two-sided quarter-turn/slide.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const base=process.env.DEV_URL||'http://127.0.0.1:5627';
const out=process.env.CAPTURE_DIR||'docs/swing-coat/evidence/papers';
(async()=>{const b=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{const p=await b.newPage();await p.goto(base);await p.waitForFunction(()=>window.paperCouture);const result=await p.evaluate(async()=>{
const {reedStudy,brokenTwill,copperFleck}=await import('/src/papers/reedSuite.ts');
const {paperCanvas}=await import('/src/render/textures.ts');const {makePaperTextures}=await import('/src/render/textures.ts');
const results=[];const files=[];
for(const paper of [reedStudy,brokenTwill,copperFleck]){
const pixels={};for(const side of ['front','back']){const c=paperCanvas(paper,side,0);const uri=c.toDataURL();if(uri!==paperCanvas(paper,side,0).toDataURL())throw Error('non-deterministic '+paper.id);files.push({name:paper.id+'-'+side+'.png',data:uri});pixels[side]=uri;}
if(pixels.front===pixels.back)throw Error('no reverse difference');results.push({paper:paper.id,deterministic:true,distinctSides:true});
}
// Compare corresponding material pixels through actual texture matrices. The
// front and reverse ink palettes differ, so compare ink presence, not colour.
const samples=[];for(let q=0;q<4;q++)for(const position of [{x:0,y:0},{x:.125,y:-.125},{x:-.25,y:.25}]){
const t=makePaperTextures(reedStudy,q,1,position);const F=t.front.image.getContext('2d').getImageData(0,0,1024,1024).data;const B=t.back.image.getContext('2d').getImageData(0,0,1024,1024).data;
let compared=0,mismatch=0,frontInk=0;for(let y=8;y<1016;y+=7)for(let x=8;x<1016;x+=7){
const sampleUV=texture=>{const e=texture.matrix.elements,u=(x+.5)/1024,v=1-(y+.5)/1024;
return {x:e[0]*u+e[3]*v+e[6],y:e[1]*u+e[4]*v+e[7]};};
const f=sampleUV(t.front),b=sampleUV(t.back);
if(Math.abs(f.x+b.x-1)>1e-12||Math.abs(f.y-b.y)>1e-12)throw Error('front/back material transform mismatch');
const pixel=uv=>{const px=Math.max(0,Math.min(1023,Math.floor(uv.x*1024)));const py=Math.max(0,Math.min(1023,Math.floor((1-uv.y)*1024)));return(py*1024+px)*4;};
const a=pixel(f),c=pixel(b);
const fi=F[a]<180;const bi=B[c]>105; // both drawings have the same silhouette, independent palettes
if(fi)frontInk++;if(fi!==bi)mismatch++;compared++;}
if(frontInk<75||mismatch/compared>.005)throw Error('two-sided registration '+q+' '+JSON.stringify(position)+' '+mismatch+'/'+compared);
samples.push({q,position,inkSamples:frontInk,compared,mismatch});t.dispose();}
return{results,samples,files};});fs.mkdirSync(out,{recursive:true});for(const f of result.files)fs.writeFileSync(out+'/'+f.name,Buffer.from(f.data.split(',')[1],'base64'));delete result.files;fs.writeFileSync(out+'/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));assert.equal(result.samples.length,12)}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
