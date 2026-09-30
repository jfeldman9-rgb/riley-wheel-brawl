'use strict';
// Strict release gates in real Chromium. No altered frame thresholds or game clocks.
const fs=require('fs'),path=require('path'),http=require('http');
const {chromium}=require('playwright');
const {screenshotLog}=require('./screenshot-log.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/review/release1');fs.mkdirSync(out,{recursive:true});
const types={'.js':'application/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.jpeg':'image/jpeg','.webp':'image/webp','.ttf':'font/ttf','.mp3':'audio/mpeg','.ogg':'audio/ogg'};
const server=http.createServer((req,res)=>{const clean=decodeURIComponent(req.url.split('?')[0]),f=path.join(root,clean==='/'?'index.html':clean);if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.statusCode=404;return res.end();}res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);});
const report={method:'Headless Chromium; software Canvas; 1280×720; full effects; native requestAnimationFrame. Ten-second mid-fight windows; fresh context per cold stage entry, after ordinary game boot only (no extra prepareRendering call). Network/boot asset-ready time is reported separately. Timings are specific to the runner, not a physical-device guarantee.',checks:[],cold:[],fights:[],errors:[]};
const check=(ok,name,details)=>{report.checks.push({ok:!!ok,name,details});console.log((ok?'PASS ':'FAIL ')+name+(details?' '+JSON.stringify(details):''));};
(async()=>{let browser;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/';
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-accelerated-2d-canvas']});
 report.browser=await browser.version();
 const open=async(touch=false)=>{const c=await browser.newContext({viewport:{width:1280,height:720},hasTouch:touch});const p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});await p.goto(url);await p.waitForFunction(()=>window.RWB?.assets.done&&RWB.game?.scene,null,{timeout:120000});return {p,c,assetReadyMs:await p.evaluate(()=>performance.now())};};
 for(let stage=0;stage<5;stage++){
  const {p,c,assetReadyMs}=await open();
  const timing=await p.evaluate(async i=>{const R=RWB,t=performance.now();R.game.setSceneNow(new R.scenes.Play(R.game,i,{difficulty:'normal',callandor:i===4}));R.game.fade=0;R.game.fadeDir=0;const initMs=performance.now()-t;await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));return{initMs,enterMs:performance.now()-t};},stage);
  report.cold.push({stage:stage+1,enterMs:+timing.enterMs.toFixed(2),initMs:+timing.initMs.toFixed(2),assetReadyFromNavigationMs:+assetReadyMs.toFixed(2)});await c.close();
 }
 check(report.cold.every(r=>r.enterMs<400),'All five cold stage enters are under 400ms',report.cold);
 for(const stage of [0,2,4]){
  const {p,c}=await open();
  await p.evaluate(i=>{const R=RWB,s=new R.scenes.Play(R.game,i,{wave:3,lives:99,difficulty:'normal',callandor:i===4});R.game.setSceneNow(s);R.game.fade=0;R.game.fadeDir=0;R.perf.runtimeLite=false;R.perf.lite=false;R.perf.quality=1;R.perf.observe=()=>{};let n=0;R.input.beginFrame=()=>{n++;R.input.pressed={};if(n%24===0)R.input.pressed.attack=true;if(n%97===0)R.input.pressed.special=true;if(n%181===0)R.input.pressed.jump=true;s.player.hp=s.player.hpMax;};R.input.axis=()=>{const e=s.enemies.filter(e=>!e.dead).sort((a,b)=>Math.abs(a.x-s.player.x)-Math.abs(b.x-s.player.x))[0];return e?{x:Math.abs(e.x-s.player.x)>45?Math.sign(e.x-s.player.x):0,y:Math.abs(e.y-s.player.y)>8?Math.sign(e.y-s.player.y)*.7:0}:{x:0,y:0};};},stage);
  const gaps=await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{const gaps=[];let previous=0,start=0;function tick(t){if(!start)start=t;if(previous)gaps.push(t-previous);previous=t;if(t-start>=10000)resolve(gaps);else requestAnimationFrame(tick);}requestAnimationFrame(tick);}))));
  const row={stage:stage+1,wave:3,frames:gaps.length,fps:+(gaps.length*1000/gaps.reduce((a,b)=>a+b,0)).toFixed(2),over33:gaps.filter(t=>t>33).length,maxMs:+Math.max(...gaps).toFixed(2)};report.fights.push(row);check(row.over33===0&&row.fps>=59.5,'Stage '+row.stage+' mid-fight: 60fps and zero frames >33ms',row);await c.close();
 }
 const {p,c}=await open(true);
 const campaignRun=require('./campaign-check.cjs').campaignRun;
 const campaign=await p.evaluate(source=>{const run=(0,eval)('('+source+')');return run(RWB);},campaignRun.toString());
 check(campaign.passed,'Scripted full campaign: title through all stages, Callandor, joint finish, escape and credits (continues counted)',campaign);
 await p.reload();await p.waitForFunction(()=>window.RWB?.assets.done&&RWB.game?.scene,null,{timeout:120000});
 const shot=async(name)=>{const file=path.join(out,name+'.jpeg');await p.screenshot({path:file,type:'jpeg',quality:85});if(process.env.RWB_SCREENSHOT_LOG==='1')for(const line of screenshotLog(name,fs.readFileSync(file)))console.log(line);};
 // Real native inputs through the title and story cards, then pause/repeated resume.
 await p.keyboard.press('Enter');await p.waitForTimeout(600);
 const opening=await p.evaluate(()=>RWB.game.scene instanceof RWB.scenes.Reel);check(opening,'Native Enter opens the story');
 for(let i=0;i<8;i++){if(await p.evaluate(()=>RWB.game.scene instanceof RWB.scenes.Play))break;await p.keyboard.press('Enter');await p.waitForTimeout(450);}
 check(await p.evaluate(()=>RWB.game.scene instanceof RWB.scenes.Play),'Native story advancement reaches Stage 1');
 await p.keyboard.press('Escape');await p.waitForTimeout(100);check(await p.evaluate(()=>RWB.game.scene.paused),'Native Escape pauses');
 await p.keyboard.press('Escape');await p.waitForTimeout(100);check(!(await p.evaluate(()=>RWB.game.scene.paused)),'A second Escape resumes');
 // Runtime review cards. Boss timers/AI are held only for these labelled pictures.
 await p.evaluate(()=>{RWB.game.setSceneNow(new RWB.scenes.Play(RWB.game,1,{wave:5}));RWB.game.fade=0;RWB.game.fadeDir=0;RWB.game.scene.update=()=>{};});await shot('fade-intro');
 await p.evaluate(()=>{RWB.game.setSceneNow(new RWB.scenes.Play(RWB.game,3,{wave:5}));RWB.game.fade=0;RWB.game.fadeDir=0;RWB.game.scene.update=()=>{};});await shot('belal-intro');
 await p.evaluate(async()=>{await RWB.assets.ready(['cut-escape']);const s=new RWB.scenes.Reel(RWB.game,RWB.CAPTIONS.escape,()=>new RWB.scenes.Victory(RWB.game),'ESCAPE FROM THE BLACK TOWER');s.timer=3;RWB.game.setSceneNow(s);RWB.game.fade=0;RWB.game.fadeDir=0;});await shot('escape');
 await p.evaluate(()=>{RWB.game.setSceneNow(new RWB.scenes.Victory(RWB.game));RWB.game.fade=0;RWB.game.fadeDir=0;});await p.waitForTimeout(1100);await shot('family-credits');
 await p.touchscreen.tap(640,660);await p.waitForTimeout(500);check(await p.evaluate(()=>RWB.game.scene instanceof RWB.scenes.Title),'Native touch tap leaves the credits');
 await c.close();check(report.errors.length===0,'No page errors or failed resource requests',report.errors);
}finally{if(browser)await browser.close();server.close();fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(report,null,2)+'\n');console.log('RWB_REPORT '+JSON.stringify(report));if(report.checks.some(x=>!x.ok)||report.errors.length)process.exitCode=1;}})().catch(e=>{console.error(e);process.exitCode=1;});
