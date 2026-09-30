'use strict';
// Real Chromium event plumbing, with emulated viewports/touch and injected standard
// Gamepad objects. This is not physical iPad, iPhone, Xbox or PlayStation testing.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/review/v11');fs.mkdirSync(out,{recursive:true});
const report={method:'Headless Chromium browser, emulated iPad/phone viewports and touch; injected browser-standard Xbox/DualSense Gamepad objects. No physical devices or controllers tested.',status:'running',checks:[],errors:[]};
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.ttf':'font/ttf','.png':'image/png','.jpeg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.ogg':'audio/ogg'};
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(req.url.split('?')[0]),file=path.join(root,pathname==='/'?'index.html':pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.statusCode=404;return res.end();}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
const check=(name,ok,details)=>{report.checks.push({name,ok:!!ok,...(details?{details}:{})});assert(ok,name);console.log('PASS '+name);};
(async()=>{let browser;try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 report.browser=await browser.version();
 const url='http://127.0.0.1:'+server.address().port+'/';
 const open=async(viewport,touch)=>{const context=await browser.newContext({viewport,hasTouch:touch,isMobile:touch,deviceScaleFactor:1});const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});await page.addInitScript(()=>{window.__pads=[];Object.defineProperty(navigator,'getGamepads',{value:()=>window.__pads});});await page.goto(url);await page.waitForFunction(()=>window.RWB?.assets.done&&RWB.game?.scene,null,{timeout:120000});await page.waitForTimeout(600);return{context,page};};
 const tap=async(page,x,y)=>{const box=await page.locator('#game').boundingBox();await page.touchscreen.tap(box.x+x*box.width/640,box.y+y*box.height/360);await page.waitForTimeout(120);};
 const sceneIs=async(page,name)=>page.evaluate(n=>RWB.game.scene instanceof RWB.scenes[n],name);
 const settle=page=>page.waitForTimeout(600);
 const title=async page=>{await page.evaluate(()=>{RWB.game.setSceneNow(new RWB.scenes.Title(RWB.game));RWB.input.clear();});await page.waitForTimeout(80);};
 const chooseTitle=async(page,label,touch)=>{if(touch){const p=await page.evaluate(label=>{const s=RWB.game.scene,l=s.menuLayout();return{x:320,y:l.y+s.items().indexOf(label)*l.step};},label);await tap(page,p.x,p.y);}else{const n=await page.evaluate(label=>RWB.game.scene.items().indexOf(label),label);for(let i=0;i<n;i++){await page.keyboard.press('ArrowDown');await page.waitForTimeout(40);}await page.keyboard.press('Enter');}await settle(page);};
 for(const spec of [{name:'desktop',viewport:{width:1280,height:720},touch:false},{name:'ipad-landscape',viewport:{width:1024,height:768},touch:true},{name:'phone-landscape',viewport:{width:844,height:390},touch:true}]){
  const {context,page}=await open(spec.viewport,spec.touch);
  for(const label of ['OPTIONS','CONTROLS','HOW TO PLAY']){
   await title(page);await chooseTitle(page,label,spec.touch);
   check(spec.name+' opens '+label,await page.evaluate(label=>label==='HOW TO PLAY'?RWB.game.scene.panel instanceof RWB.HowToPlay:RWB.game.scene.panel?.kind===label.toLowerCase(),label));
   if(!spec.touch&&label==='CONTROLS'){await page.keyboard.press('Enter');await page.waitForTimeout(80);check('Native key remap opens',await page.evaluate(()=>RWB.input.capturing==='key'));await page.keyboard.press('Escape');await page.waitForTimeout(80);check('Escape cancels remap without leaving Controls',await page.evaluate(()=>!RWB.input.capturing&&RWB.game.scene.panel?.kind==='controls'));await page.keyboard.press('Enter');await page.waitForTimeout(80);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.waitForTimeout(80);check('Interrupted remap clears capture',await page.evaluate(()=>!RWB.input.capturing));}
   if(spec.touch){await tap(page,510,label==='HOW TO PLAY'?300:290);await tap(page,130,label==='HOW TO PLAY'?300:290);}
   await page.screenshot({path:path.join(out,spec.name+'-'+label.toLowerCase().replaceAll(' ','-')+'.png')});
   if(spec.touch)await tap(page,320,label==='HOW TO PLAY'?300:290);else await page.keyboard.press('Escape');await settle(page);
   check(spec.name+' returns from '+label,await sceneIs(page,'Title'));
  }
  await page.evaluate(()=>{RWB.game.setSceneNow(new RWB.scenes.Play(RWB.game,0,{difficulty:'hard'}));RWB.input.clear();});
  for(let repeat=0;repeat<3;repeat++){
   if(spec.touch){const b=await page.evaluate(()=>RWB.input.touch.buttons.find(b=>b.id==='pause'));await tap(page,b.x,b.y);}else await page.keyboard.press('Escape');
   await page.waitForTimeout(80);check(spec.name+' pause '+repeat,await page.evaluate(()=>RWB.game.scene.paused));
   if(spec.touch){const y=await page.evaluate(()=>RWB.game.scene.pauseMenu.rowY(1));await tap(page,300,y);}else{await page.keyboard.press('ArrowDown');await page.waitForTimeout(40);await page.keyboard.press('Enter');}
   await page.waitForTimeout(80);
   check(spec.name+' nested Options '+repeat,await page.evaluate(()=>!!RWB.game.scene.pauseMenu.panel));
   if(spec.touch)await tap(page,320,290);else await page.keyboard.press('Escape');
   await page.waitForTimeout(80);
   check(spec.name+' Options Back stays paused '+repeat,await page.evaluate(()=>RWB.game.scene.paused&&!RWB.game.scene.pauseMenu.panel));
   if(spec.touch){const y=await page.evaluate(()=>RWB.game.scene.pauseMenu.rowY(0));await tap(page,300,y);}else await page.keyboard.press('Escape');
   await page.waitForTimeout(80);
   check(spec.name+' resume '+repeat,await page.evaluate(()=>!RWB.game.scene.paused));
  }
  if(spec.touch){
   const geometry=await page.evaluate(()=>{const scale=document.getElementById('game').getBoundingClientRect().width/640;return RWB.input.touch.buttons.map(b=>({id:b.id,cssDiameter:b.r*2*scale}));});
   check(spec.name+' all gameplay targets at least 44 CSS pixels',geometry.every(b=>b.cssDiameter>=44),geometry);
   if(spec.name==='phone-landscape'){await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);check('Phone portrait gives non-blocking rotation guidance',await page.locator('#orientation-hint').isVisible());await page.screenshot({path:path.join(out,'phone-portrait-guidance.png')});}
  }
  await context.close();
 }
 const {context,page}=await open({width:1280,height:720},false);
 for(const id of ['Xbox Wireless Controller','Sony DualSense (Vendor: 054c Product: 0ce6)']){
  await title(page);
  await page.evaluate(id=>{window.__pads=[{index:0,connected:true,mapping:'standard',id,axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))}];},id);await page.waitForTimeout(100);
  const padButton=async index=>{await page.evaluate(i=>__pads[0].buttons[i].pressed=true,index);await page.waitForTimeout(100);await page.evaluate(i=>__pads[0].buttons[i].pressed=false,index);await page.waitForTimeout(100);};
  await padButton(0);await settle(page);check(id+' A/Cross starts story',await sceneIs(page,'Reel'));
  await padButton(8);check(id+' Back/Share pauses story',await page.evaluate(()=>RWB.game.scene.paused));
  await padButton(1);check(id+' B/Circle resumes paused story',await page.evaluate(()=>!RWB.game.scene.paused));
  await page.evaluate(()=>RWB.game.setSceneNow(new RWB.scenes.Play(RWB.game,0,{})));await padButton(9);check(id+' Start/Options pauses fight',await page.evaluate(()=>RWB.game.scene.paused));
  await page.evaluate(()=>__pads=[]);await page.waitForTimeout(100);await page.keyboard.press('Escape');await page.waitForTimeout(80);check(id+' keyboard remains usable after disconnect',await page.evaluate(()=>!RWB.game.scene.paused));
 }
 await context.close();
 check('No page errors or failed asset requests',report.errors.length===0,report.errors);report.status='passed';
} catch(error){report.status=report.checks.length?'failed':'blocked';report.blocker=error.message;process.exitCode=1;console.error(error);}finally{if(browser)await browser.close();server.close();fs.writeFileSync(path.join(out,'device-browser.json'),JSON.stringify(report,null,2)+'\n');console.log('RWB_V11_DEVICE_REPORT '+JSON.stringify(report));}})();
