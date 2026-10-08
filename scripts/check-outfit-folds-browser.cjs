const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://127.0.0.1:5202';
const out = process.env.CAPTURE_DIR || 'docs/outfit-folds/evidence';
const ids = (process.env.DESIGNS || 'boat-top,wrap-top,hat').split(',');
(async()=>{
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:900,height:760},reducedMotion:'reduce'}),page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
const settle=()=>page.waitForFunction(()=>window.paperCouture&&!paperCouture.controller.moving&&paperCouture.view.t===paperCouture.view.target&&!paperCouture.displayCam.glide);
for(const id of ids){
await page.goto(`${base}/?design=${id}&paper=pinstripe-lining&step=99&view=display`);await settle();
for(const view of ['Front','Angle','Back']){await page.getByRole('button',{name:view,exact:true}).click();await settle();await page.screenshot({path:path.join(out,`${id}-${view.toLowerCase()}.png`),timeout:60000});}
}
assert.deepEqual(errors,[]);console.log('Rendered '+ids.join(', ')+' front/angle/back; no page errors.');await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
