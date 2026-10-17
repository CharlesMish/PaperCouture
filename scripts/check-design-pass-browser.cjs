// Real Canvas drawings plus actual Three.js texture matrices. Run against Vite.
// Isolated browser context; does not read personal browser storage.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), assert = require('node:assert/strict');
const base = process.env.DEV_URL || 'http://127.0.0.1:5627';
const out = process.env.CAPTURE_DIR || 'docs/october-integration/evidence';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(base); await page.waitForFunction(() => window.paperCouture);
    const result = await page.evaluate(async () => {
      const { PAPERS } = await import('/src/papers/index.ts');
      const { makePaperTextures, paperCanvas } = await import('/src/render/textures.ts');
      const { bloomAt } = await import('/src/papers/creaseBloom.ts');
      const rows = [];
      const canvas = S => { const c = document.createElement('canvas'); c.width = c.height = S; c.getContext('2d', {willReadFrequently:true}); return c; };
      const hash = async c => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', c.getContext('2d').getImageData(0,0,c.width,c.height).data))).map(n=>n.toString(16).padStart(2,'0')).join('');
      // Invalid Canvas arguments can silently omit dots without throwing. Fail
      // on nonfinite radii before the browser has an opportunity to ignore them.
      let circleCalls = 0;
      const originalArc = CanvasRenderingContext2D.prototype.arc;
      CanvasRenderingContext2D.prototype.arc = function(...args) {
        if (!args.slice(0,5).every(Number.isFinite) || args[2] < 0) throw Error('nonfinite Canvas circle');
        circleCalls++; return originalArc.apply(this,args);
      };
      try {
        for (const id of ['riso-proof', 'crease-bloom', 'marbled-endpaper', 'dusk-wash']) {
          const paper = PAPERS.find(p => p.id === id), sideHashes = {}, timings = {};
          for (const side of ['front','back']) {
            const draw=side==='front'?paper.drawFront:paper.drawBack;
            const c=canvas(1024),ctx=c.getContext('2d');
            const t=performance.now();draw(ctx,1024);const cold=performance.now()-t;
            const first=await hash(c);const samples=[];
            for(let i=0;i<3;i++){const warm=performance.now();draw(ctx,1024);samples.push(performance.now()-warm);}
            if(first!==await hash(c))throw Error(id+': redraw changed');
            // Force bounded-cache eviction, then rebuild the production size.
            for(const S of [97,131,173,211,257])draw(canvas(S).getContext('2d'),S);
            draw(ctx,1024);if(first!==await hash(c))throw Error(id+': cache rebuild changed pixels');
            sideHashes[side]=first;timings[side]={firstDrawMs:cold,warmMedianMs:samples.sort((a,b)=>a-b)[1]};
          }
          if(sideHashes.front===sideHashes.back)throw Error(id+': identical sides');
          const turns=[];
          for(let q=0;q<4;q++){
            const t=makePaperTextures(paper,q,1);let points=0,maxMatrixError=0;
            const map=(tex,u,v)=>{const e=tex.matrix.elements;return[e[0]*u+e[3]*v+e[6],e[1]*u+e[4]*v+e[7]]};
            const expected=(u,v)=>q===0?[u,v]:q===1?[1-v,u]:q===2?[1-u,1-v]:[v,1-u];
            for(const [u,v] of [[.13,.27],[.72,.18],[.41,.83],[.03,.94]]){
              const f=map(t.front,u,v),b=map(t.back,u,v),e=expected(u,v);
              const err=Math.max(Math.abs(f[0]-e[0]),Math.abs(f[1]-e[1]),Math.abs(f[0]+b[0]-1),Math.abs(f[1]-b[1]));
              if(err>1e-12)throw Error(id+': actual texture rotation/mirror q='+q);maxMatrixError=Math.max(maxMatrixError,err);points++;
            }
            // Material sampling of the dye, through those actual matrices.
            // Raw artwork excludes the deliberately unrelated stationary grain.
            if(id==='crease-bloom'){
              const front=canvas(512),back=canvas(512);paper.drawFront(front.getContext('2d'),512);paper.drawBack(back.getContext('2d'),512);
              const F=front.getContext('2d').getImageData(0,0,512,512).data,B=back.getContext('2d').getImageData(0,0,512,512).data;
              const at=(arr,uv)=>arr[(Math.max(0,Math.min(511,Math.floor((1-uv[1])*512)))*512+Math.max(0,Math.min(511,Math.floor(uv[0]*512))))*4];
              let maxDyeError=0;
              for(let yi=3;yi<64;yi+=2)for(let xi=3;xi<64;xi+=2){const f=map(t.front,(xi+.37)/64,(yi+.29)/64),b=map(t.back,(xi+.37)/64,(yi+.29)/64);
                const dyeF=(241-at(F,f))/(219*.9),dyeB=(226-at(B,b))/(204*.8);
                maxDyeError=Math.max(maxDyeError,Math.abs(dyeF-dyeB));
              }
              if(maxDyeError>.009)throw Error('dyed-through material registration q='+q+' error='+maxDyeError);
              turns.push({q,points,maxMatrixError,maxDyeError});
            }else turns.push({q,points,maxMatrixError});
            t.dispose();
          }
          rows.push({id,sideHashes,timings,turns});
        }
      }finally{CanvasRenderingContext2D.prototype.arc=originalArc;}
      // Preserve the distinction between crease alignment and exact mirrored
      // dye. This witness rejects the old blanket symmetry claim.
      const a=bloomAt(-.9259015104596886,.43478055217927236),b=bloomAt(-.7990984895403115,.3546494478207276);
      return {rows,circleCalls,bloomReflectionWitness:{a,b,difference:Math.abs(a-b)},limits:'Numerical drawing/texture checks; no physical dye or fold certification.'};
    });
    assert.deepEqual(errors,[]);assert(result.circleCalls>0);
    fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/papers-browser.json',JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify(result));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
