const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');const fs=require('fs'),assert=require('assert/strict');
(async()=>{const out='docs/october-integration/mitten/evidence',errors=[];const b=await chromium.launch({executablePath:'/workspace/scratch/16f45a242997/browser-runtime/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const ctx=await b.newContext({viewport:{width:1180,height:900},reducedMotion:'reduce',acceptDownloads:true});const page=await ctx.newPage();page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(60000);
await page.goto('http://127.0.0.1:5631/docs/october-integration/mitten/board.html');await page.waitForFunction(()=>window.mittenBoard);
const coords=[[0,0],[-1.16,.25],[-.7,.25],[.75,.25],[1.21,.25]];
for(let i=0;i<5;i++){
 await page.getByLabel('Piece to pin',{exact:true}).selectOption(String(i));
 assert.equal(Number(await page.getByLabel('Starting square size').inputValue()),i?6:20);
 await page.getByRole('button',{name:'Pin current piece',exact:true}).click();
 await page.evaluate(({i,coords})=>{const b=mittenBoard.board;b.mutate(()=>{const item=b.state.items.at(-1);if(!item)throw Error('No new capture');item.x=coords[i][0];item.y=coords[i][1];b.position();b.constrain(item.id);});},{i,coords});
}
await page.screenshot({path:out+'/board-desktop.png'});
const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Save PNG',exact:true}).click()]);await download.saveAs(out+'/board-export.png');
const state=await page.evaluate(()=>{const b=mittenBoard.board;return b.state.items.map(i=>({title:i.title,x:i.x,y:i.y,paperSize:i.paperSize}));});
await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/board-phone.png'});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
await page.reload();await page.waitForFunction(()=>window.mittenBoard);assert.equal(await page.evaluate(()=>mittenBoard.board.state.items.length),5);
assert.equal(overflow,false);assert.deepEqual(errors,[]);fs.writeFileSync(out+'/board-results.json',JSON.stringify({items:state,phoneWidth:390,documentOverflow:overflow,restoredPieces:5,errors},null,2));await b.close();console.log('Actual pinboard: five captures, 6 cm mittens / 20 cm coat, export + mobile no overflow + reload PASS');})();
