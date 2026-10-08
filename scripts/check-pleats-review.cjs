// Targeted independent final-build check of the integrated Pleated skirt.
const fs=require('node:fs'), path=require('node:path'), http=require('node:http'), assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const dist=path.resolve(process.env.REVIEW_DIST||'dist');
const bundle=fs.readFileSync(path.join(dist,'index.html'),'utf8').match(/src="[^"]*\/([^/" ]+\.js)"/)?.[1]||'unknown';
const output='docs/geometry-collection/review';
const csp="default-src 'self'; base-uri 'none'; connect-src 'self'; font-src 'self'; form-action 'none'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; upgrade-insecure-requests";
(async()=>{
  fs.mkdirSync(output,{recursive:true});
  const server=http.createServer((req,res)=>{
    const name=new URL(req.url,'http://local').pathname;
    if(!name.startsWith('/play/paper-couture/')){res.writeHead(404).end();return;}
    const file=path.resolve(dist,name.slice('/play/paper-couture/'.length)||'index.html');
    if(!file.startsWith(dist+'/')||!fs.existsSync(file)){res.writeHead(404).end();return;}
    res.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css'}[path.extname(file)]||'application/octet-stream','Content-Security-Policy':csp});
    res.end(fs.readFileSync(file));
  });
  await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
  let browser;const errors=[],checks=[];
  try{
    let launch={headless:true,args:['--no-sandbox','--use-angle=swiftshader']};
    if(process.env.CHROMIUM_MODULE){const binary=require(process.env.CHROMIUM_MODULE).default;launch={headless:true,executablePath:await binary.executablePath(),args:[...binary.args,'--use-angle=swiftshader']};}
    browser=await chromium.launch(launch);
    const p=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce',hasTouch:true});
    p.setDefaultTimeout(20000);
    p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('requestfailed',r=>errors.push(`${r.url()}: ${r.failure()?.errorText}`));
    await p.goto(`http://127.0.0.1:${server.address().port}/play/paper-couture/`);
    await p.waitForFunction(()=>window.paperCouture);
    await p.getByLabel('Garment design').selectOption('pleats');
    await p.getByRole('radio',{name:'Ink reverse',exact:true}).click();
    assert.equal(await p.evaluate(()=>paperCouture.timeline.ops.length),7);
    const state=()=>p.evaluate(()=>({step:paperCouture.controller.step,moving:paperCouture.controller.moving,total:paperCouture.timeline.ops.length,turn:paperCouture.quarterTurns,position:paperCouture.pinPosition,paper:paperCouture.paperId}));
    const move=async forward=>{
      const before=(await state()).step;
      const b=forward?p.locator('.dock:not([hidden]) .btn-primary'):p.getByRole('button',{name:'Back',exact:true});
      await b.click();if((await state()).moving)await b.click();
      await p.waitForFunction(({step,forward})=>paperCouture.controller.step===step+(forward?1:-1)&&!paperCouture.controller.moving,{step:before,forward});
    };
    for(let i=0;i<7;i++)await move(true);
    for(let i=0;i<7;i++)await move(false);
    assert.equal((await state()).step,0);
    for(let i=0;i<7;i++)await move(true);
    checks.push('Pleated skirt selected through garment UI; seven steps forward, seven back, seven forward');
    console.log(checks.at(-1));
    await p.getByRole('button',{name:'Display',exact:true}).click();
    await p.waitForFunction(()=>paperCouture.view.inDisplay&&!paperCouture.displayCam.glide);
    await p.screenshot({path:`${output}/pleats-front-final.png`});
    const camera=await p.evaluate(()=>paperCouture.stage.camera.position.toArray());
    await p.getByRole('button',{name:/^Turn paper/}).click();
    assert.equal((await state()).step,7);assert.equal((await state()).turn,1);
    assert.deepEqual(await p.evaluate(()=>paperCouture.stage.camera.position.toArray()),camera);
    assert.equal(await p.evaluate(()=>paperCouture.view.inDisplay),true);
    checks.push('Turn paper in Display retains final step and camera');
    await p.getByRole('button',{name:'Fold accessory',exact:true}).click();
    await p.getByRole('radio',{name:'Tidal bands',exact:true}).click();
    for(let i=0;i<5;i++)await move(true);
    await p.getByRole('button',{name:'Attach',exact:true}).click();
    await p.waitForFunction(()=>paperCouture.view.inDisplay&&paperCouture.accessoryRoot.visible);
    await p.getByLabel('Accessory position').selectOption('waist-right');
    assert.equal(await p.evaluate(()=>paperCouture.accessoryPaperId),'tidal-bands');
    assert.deepEqual([(await state()).step,(await state()).paper,(await state()).turn],[7,'ink-reverse',1]);
    assert.equal(await p.getByLabel('Accessory position').locator('option').count(),3);
    await p.setViewportSize({width:390,height:844});
    await p.waitForFunction(()=>!paperCouture.displayCam.glide);
    await p.screenshot({path:`${output}/pleats-pin-390-final.png`});
    await p.getByRole('button',{name:'Remove accessory',exact:true}).click();
    await p.waitForFunction(()=>!paperCouture.accessoryRoot.visible);
    assert.equal((await state()).step,7);
    await p.getByRole('button',{name:'Return to the workshop',exact:true}).click();
    await p.waitForFunction(()=>paperCouture.view.inWorkshop);
    await p.getByRole('button',{name:'Start over',exact:true}).click();
    assert.equal((await state()).step,0);
    assert.equal(await p.evaluate(()=>paperCouture.garmentId),'pleats');
    checks.push('Independent pin paper, three waistband positions, portrait Display, removal and Start over');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(`${output}/pleats-result.json`,JSON.stringify({passed:true,bundle,engine:'Headless Chromium; software WebGL; emulated portrait viewport',checks,errors},null,2));
    console.log(JSON.stringify({passed:true,checks,errors},null,2));
  }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
