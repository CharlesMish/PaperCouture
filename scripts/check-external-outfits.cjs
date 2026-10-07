// Local integration and visual review. Only fresh isolated browser contexts.
// Requires compiled candidate, optional studies and frozen PR25 servers.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.BASE_URL||'http://127.0.0.1:4451',studies=process.env.STUDIES_URL||'http://127.0.0.1:4452',baseline=process.env.BASELINE_URL||'http://127.0.0.1:4400';
const out=process.env.CAPTURE_DIR||'.external-outfits',key='paper-couture.pinboard.v1';
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const report={checkedAt:new Date().toISOString(),errors:[],legacy:[],outfits:[],physicalPhoneTested:false,physicalPaperTested:false};let current;
 async function open(url,seed){
  const context=await browser.newContext({viewport:{width:1180,height:900},hasTouch:true,reducedMotion:'reduce',acceptDownloads:true});
  if(seed!==undefined)await context.addInitScript(({key,seed})=>{if(localStorage.getItem(key)===null)localStorage.setItem(key,seed)},{key,seed});
  const p=current=await context.newPage();p.setDefaultTimeout(90000);p.on('pageerror',e=>report.errors.push(String(e)));
  const btn=name=>p.getByRole('button',{name,exact:true});
  const settle=()=>p.waitForFunction(()=>window.paperCouture&&!paperCouture.controller.moving&&paperCouture.view.t===paperCouture.view.target&&!paperCouture.displayCam.glide&&paperCouture.sheet.front.geometry.attributes.position?.count>0&&paperCouture.sheet.front.geometry.attributes.uv?.count>0);
  const load=async q=>{const r=await p.goto(url+'/?'+q);assert(r.ok());await settle()};
  // Durable boards are JSON: -0 becomes 0 without a geometric change.
  const board=()=>p.evaluate(()=>JSON.parse(JSON.stringify(paperCouture.pinboard.state)));
  const raw=()=>p.evaluate(k=>localStorage.getItem(k),key);
  const enter=()=>p.getByRole('button',{name:/^View board/}).click();
  const png=async name=>{
   const expected=await p.evaluate(()=>{const b=paperCouture.pinboard;b.selection.visible=false;b.renderer.setSize(1800,2100,false);b.renderer.render(b.scene,b.camera);return b.canvas.toDataURL('image/png')});
   const[d]=await Promise.all([p.waitForEvent('download'),btn('Save PNG').click()]);const file=path.join(out,name+'.png');await d.saveAs(file);const bytes=fs.readFileSync(file);assert.deepEqual(bytes,Buffer.from(expected.split(',')[1],'base64'));await p.waitForFunction(()=>!paperCouture.pinboard.exporting);return bytes;
  };
  return{context,p,btn,settle,load,board,raw,enter,png};
 }
 try{
  for(const name of ['pr25-companions','pr25-layered']){
   const seed=fs.readFileSync(path.join(__dirname,'../docs/capelet-brooch/fixtures',name+'.json'),'utf8');let before;
   for(const[url,label]of[[baseline,'baseline'],[base,'candidate']]){const a=await open(url,seed);await a.load('');await a.enter();assert.equal(await a.raw(),seed);assert.deepEqual(await a.board(),JSON.parse(seed));const bytes=await a.png(name+'-'+label);if(before)assert.deepEqual(bytes,before);else before=bytes;await a.context.close()}
   report.legacy.push({fixture:name,unchangedBytes:true,identicalPNG:true});
  }
  const cases=[
   {name:'capelet-wrap',id:'wrap-top',cm:18,h:1.2101735015772872,layer:'capelet'},
   {name:'bolero-wrap',id:'wrap-top',cm:18,h:1.2101735015772872,layer:'bolero-study',study:true},
   {name:'notch-18',id:'notch-crop',cm:18,h:1.422,study:true},
   {name:'notch-14_4',id:'notch-crop',cm:14.4,h:1.1376,study:true},
   {name:'camp-shirt',id:'camp-shirt',cm:18,h:1.089},
   {name:'camp-necktie',id:'camp-shirt',cm:18,h:1.089,tie:true},
   {name:'wrap-necktie',id:'wrap-top',cm:18,h:1.2101735015772872,tie:true},
  ].filter(c=>!(process.env.SKIP_PARKED_STUDIES==='1'&&c.study));
  for(const c of cases){
   const a=await open(c.study?studies:base);const neck=.055+c.h;
   const pieces=[['skirt','slate-grain',20,-.16,-.57],[c.id,'oat-linen',c.cm,-.16,.055+c.h/2]];
   if(c.layer)pieces.push([c.layer,'oat-linen',c.layer==='capelet'?18:16,-.16,1.04]);
   pieces.push(['hat','slate-grain',8,-.16,c.layer?1.72:neck+.26]);
   if(c.tie)pieces.push(['necktie','corner-bloom',7,-.16,neck-.41],['clutch','slate-grain',8,1.04,-.42]);
   else pieces.push(['framed-brooch','corner-bloom',4.5,.15,c.layer?1.12:neck-.3]);
   for(const[id,paper,cm,x,y]of pieces){
    await a.load(`design=${id}&paper=${paper}&step=99&view=display${id==='necktie'?'&printX=0.1875&printY=0.15625':''}`);
    assert.equal(await a.p.evaluate(()=>paperCouture.garmentId),id);
    const live=await a.p.evaluate(()=>JSON.parse(JSON.stringify({position:Array.from(paperCouture.sheet.front.geometry.attributes.position.array),uv:Array.from(paperCouture.sheet.front.geometry.attributes.uv.array)})));
    await a.enter();const before=await a.board();await a.p.getByLabel('Starting square size').selectOption(String(cm));await a.btn('Pin current piece').click();
    const state=await a.board(),item=state.items.at(-1);assert.deepEqual(state.items.slice(0,-1),before.items);assert.equal(item.paperSize.sideCm,cm);assert.deepEqual(item.snapshot.geometries[0].position,live.position);assert.deepEqual(item.snapshot.geometries[0].uv,live.uv);
    await a.p.evaluate(({x,y})=>{const b=paperCouture.pinboard;b.mutate(()=>{const i=b.state.items.at(-1);i.x=x;i.y=y;b.position();b.constrain(i.id)})},{x,y});
   }
   const measurements=[];
   for(const[w,h]of[[1180,900],[390,844],[320,568]]){
    await a.p.setViewportSize({width:w,height:h});await a.p.locator('.board-tools').evaluate(e=>e.scrollTop=0);await a.p.waitForTimeout(180);
    const m=await a.p.evaluate(()=>{const b=paperCouture.pinboard,r=b.canvas.getBoundingClientRect();return{viewport:[innerWidth,innerHeight],canvas:[r.width,r.height],overflow:document.documentElement.scrollWidth>innerWidth,camera:[b.camera.left,b.camera.right,b.camera.bottom,b.camera.top],items:b.state.items.map(i=>{const box=b.selection.box.clone().setFromObject(b.groups.get(i.id),true);return{title:i.title,cm:i.paperSize.sideCm,bounds:[box.min.x,box.max.x,box.min.y,box.max.y],pixels:[(box.max.x-box.min.x)*r.width/3.6,(box.max.y-box.min.y)*r.height/4.2]}})}});
    assert(!m.overflow);assert.deepEqual(m.camera,[-1.8,1.8,-2.1,2.1]);for(const i of m.items){const[l,r,b,t]=i.bounds;assert(l>=-1.72001&&r<=1.72001&&b>=-2.02001&&t<=2.02001)}
    measurements.push(m);await a.p.screenshot({path:path.join(out,c.name+'-'+w+'.png')});
   }
   const bytes=await a.png(c.name+'-composite');let touch;
   if(c.tie){
    await a.p.getByLabel('Selected board piece').selectOption((await a.board()).items[3].id);
    const point=await a.p.evaluate(()=>{const b=paperCouture.pinboard,r=b.canvas.getBoundingClientRect(),i=b.state.items[3];return{x:r.x+(i.x+1.8)*r.width/3.6,y:r.y+(2.1-i.y)*r.height/4.2}}),before=await a.board();const client=await a.context.newCDPSession(a.p);
    const send=(type,dx=0,dy=0)=>client.send('Input.dispatchTouchEvent',{type,touchPoints:['touchEnd','touchCancel'].includes(type)?[]:[{x:point.x+dx,y:point.y+dy,id:1}]});
    await send('touchStart');await send('touchMove',18,8);await send('touchCancel');assert.deepEqual(await a.board(),before,'touch cancellation restores original board');
    await send('touchStart');await send('touchMove',18,8);await send('touchEnd');assert.notDeepEqual((await a.board()).items,before.items,'real touch moves tie');await a.btn('Undo').click();assert.deepEqual(await a.board(),before);touch={viewport:[320,568],cancelRestores:true,commitAndUndo:true};
   }
   const selected=await a.board();await a.btn('Remove selected').click();await a.btn('Undo').click();assert.deepEqual(await a.board(),selected);
   const seed=await a.raw();fs.writeFileSync(path.join(out,c.name+'-board.json'),seed);await a.p.reload();await a.settle();await a.enter();assert.equal(await a.raw(),seed);assert.deepEqual(await a.board(),selected);assert.deepEqual(await a.png(c.name+'-reloaded'),bytes);await a.context.close();
   const old=await open(baseline,seed);await old.load('');await old.enter();assert.equal(await old.raw(),seed);assert.deepEqual(await old.board(),selected);assert.deepEqual(await old.png(c.name+'-read-by-pr25'),bytes);await old.context.close();
   report.outfits.push({name:c.name,studyOnly:!!c.study,measurements,touch,exactExport:true,reloadAndRemoveUndo:true,readByPR25:true});console.log('Completed '+c.name);
  }
  assert.deepEqual(report.errors,[]);report.passed=true;
 }catch(e){report.failure=String(e.stack||e);if(current&&!current.isClosed())await current.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});throw e}
 finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,failure:report.failure,outfits:report.outfits.length}));await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
