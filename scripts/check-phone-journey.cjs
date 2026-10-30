// Production UI journey at phone width from an unfolded sheet. Touch gestures,
// not controller jumps or auto-scrolled swatch clicks, drive the mobile path.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const base = process.env.BASE_URL || 'http://127.0.0.1:5365';
const out = process.env.CAPTURE_DIR || '.phone-qa';
fs.mkdirSync(out, { recursive: true });
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const result = { checks: [], journeys: [], latency: [], errors: [], sourceRequests: [],
  physicalPhoneTested: false, physicalPaperTested: false };
const pause = ms => new Promise(r => setTimeout(r, ms));

async function readable(page, selector) {
  const issues = await page.locator(selector).evaluateAll(elements => {
    const visible = elements.filter(e => e.getBoundingClientRect().width && !e.closest('[hidden]'));
    const issues = [];
    for (const [i, e] of visible.entries()) {
      const r = e.getBoundingClientRect(), name = e.textContent.trim();
      if (r.left < 0 || r.right > innerWidth || r.top < 0 || r.bottom > innerHeight) issues.push(`${name}: outside viewport`);
      if (!e.disabled && !e.contains(document.elementFromPoint(r.x+r.width/2, r.y+r.height/2))) issues.push(`${name}: centre obscured`);
      const range = document.createRange(); range.selectNodeContents(e);
      for (const t of range.getClientRects()) if (t.left < r.left-1 || t.right > r.right+1 || t.top < r.top-1 || t.bottom > r.bottom+1) issues.push(`${name}: text outside button`);
      for (const other of visible.slice(i+1)) {
        const q = other.getBoundingClientRect();
        if (Math.min(r.right,q.right)-Math.max(r.left,q.left)>1 && Math.min(r.bottom,q.bottom)-Math.max(r.top,q.top)>1) issues.push(`${name}: overlaps ${other.textContent}`);
      }
    }
    return issues;
  });
  assert.deepEqual(issues, [], 'Visible controls must fit, remain unobscured, and not overlap');
}

async function paperVisible(page) {
  const bounds=await page.evaluate(()=>{
    const {stage,sheet}=paperCouture; stage.render();
    const world=sheet.front.matrixWorld.elements, view=stage.camera.matrixWorldInverse.elements;
    const points=sheet.front.geometry.attributes.position.array;
    let farthest=-Infinity;
    for(let i=0;i<points.length;i+=3){
      const x=points[i],y=points[i+1],z=points[i+2];
      const wx=world[0]*x+world[4]*y+world[8]*z+world[12];
      const wy=world[1]*x+world[5]*y+world[9]*z+world[13];
      const wz=world[2]*x+world[6]*y+world[10]*z+world[14];
      farthest=Math.max(farthest,-(view[2]*wx+view[6]*wy+view[10]*wz+view[14]));
    }
    return {farthest, fogNear:stage.scene.fog.near, clipFar:stage.camera.far};
  });
  assert(bounds.farthest<bounds.fogNear && bounds.farthest<bounds.clipFar,`Paper stays in front of fog and clipping planes: ${JSON.stringify(bounds)}`);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const [width,height] of (process.env.LATENCY_ONLY ? [] : [[320,568],[390,844]])) {
      const context = await browser.newContext({ viewport:{width,height}, hasTouch:true, isMobile:true, deviceScaleFactor:1, acceptDownloads:true });
      const page = await context.newPage(); page.setDefaultTimeout(30000);
      page.on('pageerror', e => result.errors.push(String(e)));
      page.on('request', r => { if (/\/(src|node_modules)\//.test(new URL(r.url()).pathname)) result.sourceRequests.push(r.url()); });
      const cdp = await context.newCDPSession(page);
      const settle = () => page.waitForFunction(() => window.paperCouture && !paperCouture.controller.moving && paperCouture.view.t === paperCouture.view.target && !paperCouture.displayCam.glide);
      const step = () => page.evaluate(() => paperCouture.controller.step);
      const tap = async name => { await page.getByRole('button',{name,exact:true}).tap(); await settle(); };
      const touch = async (type,x,y) => cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x,y,id:1}]});
      const swipe = async (x,y,dx,dy,cancel=false) => {
        await touch('touchStart',x,y);
        for(let n=1;n<=8;n++){ await touch('touchMove',x+dx*n/8,y+dy*n/8); await pause(24); }
        await touch(cancel?'touchCancel':'touchEnd'); await pause(100);
      };
      const selectPaper = async name => {
        let swipes=0;
        while(true) {
          const info=await page.getByRole('radio',{name,exact:true}).evaluate(e=>{
            const r=e.getBoundingClientRect(), q=e.parentElement.getBoundingClientRect();
            return {visible:r.left>=q.left-.5&&r.right<=q.right+.5,x:r.x+r.width/2,y:r.y+r.height/2,
              sx:q.right-12,sy:q.y+q.height/2,dx:-(q.width-24),left:e.parentElement.scrollLeft,max:e.parentElement.scrollWidth-e.parentElement.clientWidth};
          });
          if(info.visible){ await page.touchscreen.tap(info.x,info.y); await settle(); break; }
          assert(swipes++<40,`Could not reach ${name} with horizontal swipes`);
          assert(info.left<info.max-1,`${name} clipped at end of swatch list`);
          await swipe(info.sx,info.sy,info.dx,0);
        }
        return swipes;
      };
      await page.goto(base); await settle();
      const journey={width,height,swipes:0,hands:[],exports:[]};
      for(const hand of ['left','right']) {
        await page.getByLabel('Garment design').selectOption('mitten-'+hand); await settle(); assert.equal(await step(),0);
        if(hand==='left') journey.swipes=await selectPaper('Riso proof');
        else await selectPaper('Dusk wash');
        const count=await page.evaluate(()=>paperCouture.controller.count);
        const handResult={hand,steps:count,thumbHandle:false};
        for(let i=0;i<count;i++) {
          await readable(page,'.dock:not([hidden]) button');
          await paperVisible(page);
          if(i===4 && await page.locator('.fold-handle').first().isVisible()) {
            const handle=page.locator('.fold-handle').first();
            const box=await handle.boundingBox(); assert(box.width>=44&&box.height>=44,'Small thumb has a 44px touch target');
            const arrow=await handle.locator('span').evaluate(e=>{const m=new DOMMatrixReadOnly(getComputedStyle(e).transform);return {x:m.a,y:m.b};});
            const x=box.x+box.width/2,y=box.y+box.height/2;
            assert(await handle.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'Thumb grip is unobscured');
            await page.screenshot({path:path.join(out,`thumb-${hand}-${width}.png`)});
            await swipe(x,y,arrow.x*20,arrow.y*20,true); await settle(); assert.equal(await step(),i,'Cancelled real touch drag restores step');
            await handle.tap(); await settle(); assert.equal(await step(),i+1,'Thumb grip tap completes fold');
            handResult.thumbHandle=true;
          } else if(i===4) {
            // The workshop now frames the paper the step involves, so on a phone the
            // thumb is big enough to drag by its own paper: no separate grip is made.
            const t=await page.evaluate(i=>{
              const P=paperCouture,cam=P.stage.camera,V=cam.position.constructor,c=P.stage.renderer.domElement,m=P.stage.modelRoot.matrixWorld;
              const op=P.timeline.ops[i],moving=new Set(op.pieces.filter(p=>p.spec>=0).map(p=>p.index));
              const pos=P.sheet.front.geometry.getAttribute('position'),vp=P.sheet.vPiece,sx=v=>(v.x+1)/2*c.clientWidth,sy=v=>(1-v.y)/2*c.clientHeight;
              let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,cx=0,cy=0,n=0;
              for(let k=0;k<pos.count;k++){if(!moving.has(vp[k]))continue;const v=new V(pos.getX(k),pos.getY(k),pos.getZ(k)).applyMatrix4(m).project(cam);const x=sx(v),y=sy(v);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);cx+=x;cy+=y;n++;}
              const a=op.arrows[0],p0=new V(a.from.x,a.from.y,0).applyMatrix4(m).project(cam),p1=new V(a.to.x,a.to.y,0).applyMatrix4(m).project(cam);
              const dx=sx(p1)-sx(p0),dy=sy(p1)-sy(p0),L=Math.hypot(dx,dy)||1;
              return {w:x1-x0,h:y1-y0,x:cx/n,y:cy/n,ux:dx/L,uy:dy/L,hit:document.elementFromPoint(cx/n,cy/n)===c};
            },i);
            assert(Math.min(t.w,t.h)>=28&&t.hit,`Thumb paper large enough to grab directly: ${JSON.stringify(t)}`);
            await page.screenshot({path:path.join(out,`thumb-${hand}-${width}.png`)});
            await swipe(t.x,t.y,t.ux*20,t.uy*20,true); await settle(); assert.equal(await step(),i,'Cancelled real touch drag restores step');
            await swipe(t.x,t.y,t.ux*140,t.uy*140,false); await settle(); assert.equal(await step(),i+1,'Dragging the thumb paper completes the fold');
            handResult.thumbDirect={w:Math.round(t.w),h:Math.round(t.h)};
          } else { await page.locator('.dock:not([hidden]) .btn-primary').tap(); await settle(); assert.equal(await step(),i+1); }
        }
        await tap('Back'); assert.equal(await step(),count-1);
        await page.locator('.dock:not([hidden]) .btn-primary').tap(); await settle(); assert.equal(await step(),count);
        await tap('Display'); await readable(page,'.display-dock button'); await paperVisible(page);
        for(const name of ['Back','Angle','Front','Turntable','Turntable','Reset view']) { await tap(name); await paperVisible(page); }
        await page.screenshot({path:path.join(out,`display-${hand}-${width}.png`)});
        await tap('Pinboard');
        const capture=page.getByLabel('Piece to pin');
        const name=await capture.locator('option:checked').textContent();
        assert(name.startsWith(hand==='left'?'Left mitten':'Right mitten'),'Hand identity precedes paper name');
        const fits=await capture.evaluate(e=>{const c=document.createElement('canvas').getContext('2d');c.font=getComputedStyle(e).font;return {text:c.measureText(e.selectedOptions[0].text).width,space:e.clientWidth-36};});
        assert(fits.text<=fits.space,`Capture title fits: ${JSON.stringify(fits)}`);
        const size=page.getByLabel('Starting square size'); assert.equal(await size.inputValue(),'6');
        await page.screenshot({path:path.join(out,`capture-${hand}-${width}.png`)});
        await tap('Pin current piece');
        assert.equal(await page.evaluate(()=>paperCouture.pinboard.state.items.length),hand==='left'?1:2);
        if(width===320) assert(handResult.thumbHandle||handResult.thumbDirect,'The 320px thumb must have a usable grip, or be big enough to drag directly');
        journey.hands.push(handResult); console.log(`${width}px: ${hand} hand folded and pinned`);
        await tap('Return to folding');
      }
      // narrow screens keep Pinboard under More while in the workshop
      const more=page.getByRole('button',{name:'More',exact:true});if(await more.isVisible())await more.tap();
      await page.getByRole('button',{name:/^(Pinboard|View board) \(/}).tap();
      const before=await page.evaluate(()=>JSON.stringify(paperCouture.pinboard.state.items));
      const exportPNG=async suffix=>{const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Save PNG',exact:true}).tap()]);const f=path.join(out,`pair-${width}-${suffix}.png`);await download.saveAs(f);return sha(fs.readFileSync(f));};
      journey.exports.push(await exportPNG('before'));
      await page.reload(); await settle(); if(await more.isVisible())await more.tap(); await page.getByRole('button',{name:/^(Pinboard|View board) \(/}).tap();
      assert.equal(await page.evaluate(()=>JSON.stringify(paperCouture.pinboard.state.items)),before);
      journey.exports.push(await exportPNG('after'));assert.equal(...journey.exports);
      result.journeys.push(journey); console.log(JSON.stringify(journey));await context.close();
    }
    // Separate benchmark: fresh app contexts, real selection event to next two
    // animation frames. CPU slowdown is a sensitivity test, not a phone model.
    for(const rate of [1,4]) for(const paper of ['Crease bloom','Marbled endpaper']) {
      const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
      const page=await context.newPage();await page.goto(base);await page.waitForFunction(()=>window.paperCouture);
      const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate});
      const radio=page.getByRole('radio',{name:paper,exact:true});await radio.scrollIntoViewIfNeeded();
      for(const warm of [false,true]) {
        if(warm){await page.getByRole('radio',{name:'Oat linen',exact:true}).click();await radio.scrollIntoViewIfNeeded();}
        await radio.evaluate(e=>{window.selectionMs=null;e.addEventListener('click',()=>{const start=performance.now();requestAnimationFrame(()=>requestAnimationFrame(()=>{window.selectionMs=performance.now()-start;}));},{capture:true,once:true});});
        await radio.tap();await page.waitForFunction(()=>window.selectionMs!==null);
        result.latency.push({paper,cpuSlowdown:rate,warm,eventToTwoFramesMs:await page.evaluate(()=>window.selectionMs)});
      }
      await context.close();
    }
    assert.deepEqual(result.errors,[]);assert.deepEqual(result.sourceRequests,[]);
    if(!process.env.LATENCY_ONLY) result.checks.push('Both 320/390 journeys start unfolded: touch-scroll papers, fold both hands, Back/refold, display controls, distinct full capture titles, pin, reload and identical PNG exports. At 320px both small thumbs require a 44px grip: cancel a real touch drag, then tap it to fold. Larger flaps at 390px use the normal Fold button.');
    result.checks.push('Control rectangles, text ranges and centre hit targets checked; production assets only. Latency is a single-sample desktop sensitivity check, not real-phone performance.');
  } catch(error) {
    result.failure=String(error);
    for(const context of browser.contexts()) for(const page of context.pages()) await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});
    throw error;
  } finally { fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2)+'\n');await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1);});
