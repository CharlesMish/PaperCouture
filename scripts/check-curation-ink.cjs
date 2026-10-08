const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=process.env.CAPTURE_DIR||'docs/design-curation/evidence';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage();await page.goto(process.env.DEV_URL||'http://127.0.0.1:5183');await page.waitForFunction(()=>window.paperCouture);
  const result=await page.evaluate(async()=>{
   const {findPaper}=await import('/src/papers/index.ts');const {paperCanvas}=await import('/src/render/textures.ts');const {sourceShift}=await import('/src/papers/printPosition.ts');
   const paper=findPaper('arc-study'),size=1024,data=c=>c.getContext('2d').getImageData(0,0,size,size).data;
   const mask=(side,q,offset)=>{const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d'),s=sourceShift(offset,q);ctx.translate((side==='front'?s.x:-s.x)*size,-s.y*size);paper.placement[side](ctx,size);return data(c)};
   const registrations=[];let stationaryPixels=0,changedInk=0;
   for(let q=0;q<4;q++)for(const offset of [{x:0,y:0},{x:.125,y:.0625},{x:-.25,y:.25}]){
    const f=mask('front',q,offset),b=mask('back',q,offset);let mismatch=0,unmatched=0,inkPixels=0;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
     const a=f[(y*size+x)*4+3]>32,c=b[(y*size+size-1-x)*4+3]>32;
     if(a!==c){
      mismatch++;let nearby=false;
      // Rasterizers differ at reflected stroke boundaries. Require every
      // differing ink pixel to find corresponding ink within one pixel.
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
       const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=size||yy>=size)continue;
       if((a?b[(yy*size+size-1-xx)*4+3]:f[(yy*size+xx)*4+3])>32)nearby=true;
      }
      if(!nearby)unmatched++;
     }
     if(a)inkPixels++;
    }
    registrations.push({q,offset,mismatch,unmatched,inkPixels});
   }
   for(const side of ['front','back']){
    const offset={x:.125,y:.0625},a=data(paperCanvas(paper,side,0)),b=data(paperCanvas(paper,side,0,offset)),m=mask(side,0,{x:0,y:0}),n=mask(side,0,offset);
    for(let i=0;i<a.length;i+=4){if(!m[i+3]&&!n[i+3]){if(a.slice(i,i+4).every((v,j)=>v===b[i+j]))stationaryPixels++;else throw Error('grain moved')}else if(a.slice(i,i+4).some((v,j)=>v!==b[i+j]))changedInk++}
   }
   return {registrations,stationaryPixels,changedInk};
  });
  fs.mkdirSync(out,{recursive:true});
  const passed=result.registrations.every(r=>r.unmatched===0&&r.inkPixels>10000)&&result.stationaryPixels>100000&&result.changedInk>10000;
  fs.writeFileSync(path.join(out,'ink-results.json'),JSON.stringify({passed,...result},null,2));
  console.log(JSON.stringify(result));assert(passed,'Paired ink contours must agree within one raster pixel; grain must stay fixed');
  console.log('Arc study: paired material-contour masks at all four turns and three offsets; finite clipping, stationary grain and changed artwork pixels pass.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
