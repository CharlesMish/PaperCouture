// Start this beside a Vite server on 5639. Captures use application render and pinboard code.
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const fs=require('fs'),assert=require('assert/strict');
(async()=>{
 const out=process.env.THUMB_CAPTURE_DIR||'/tmp/thumb-followup/captures';fs.mkdirSync(out,{recursive:true});
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await b.newContext({viewport:{width:400,height:470},reducedMotion:'reduce',acceptDownloads:true});const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(60000);
 for(const paper of ['oat-linen','marbled-endpaper'])for(const hand of ['left','right'])for(const view of ['front','back'])for(const variant of ['baseline','proposed']) {
  await page.goto(`http://127.0.0.1:5639/docs/october-integration/thumb-followup/study.html?${new URLSearchParams({paper,hand,view,variant})}`);await page.waitForFunction(()=>window.studyReady);await page.screenshot({path:`${out}/${paper}-${hand}-${view}-${variant}.png`});
 }
 await page.setViewportSize({width:1180,height:900});await page.goto('http://127.0.0.1:5639/docs/october-integration/thumb-followup/board.html');await page.waitForFunction(()=>window.mittenBoard);
 const coords=[[0,0],[-1.16,.25],[-.7,.25],[.75,.25],[1.21,.25]];
 for(let i=0;i<5;i++){
  await page.getByLabel('Piece to pin',{exact:true}).selectOption(String(i));assert.equal(Number(await page.getByLabel('Starting square size').inputValue()),i?6:20);
  await page.getByRole('button',{name:'Pin current piece',exact:true}).click();
  await page.evaluate(({i,coords})=>{const b=mittenBoard.board;b.mutate(()=>{const item=b.state.items.at(-1);item.x=coords[i][0];item.y=coords[i][1];b.position();b.constrain(item.id);});},{i,coords});
 }
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Save PNG',exact:true}).click()]);await download.saveAs(out+'/board-export.png');
 const items=await page.evaluate(()=>mittenBoard.board.state.items.map(i=>({title:i.title,paperSize:i.paperSize})));
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/browser.json',JSON.stringify({renders:16,items,errors},null,2));await b.close();console.log('16 matched front/back/both-hand paper renders and actual five-capture board passed.');
})().catch(e=>{console.error(e);process.exit(1)});
