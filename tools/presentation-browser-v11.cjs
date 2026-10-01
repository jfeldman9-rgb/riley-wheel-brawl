'use strict';
// Browser-rendered review tableaux are intentionally staged for inspection.
// This checks actual delivered art/decoding, not a human playthrough.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/review/v11/browser-presentation');fs.mkdirSync(out,{recursive:true});
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpeg':'image/jpeg','.webp':'image/webp','.json':'application/json','.mp3':'audio/mpeg','.ogg':'audio/ogg','.ttf':'font/ttf'};
const server=http.createServer((req,res)=>{const f=path.join(root,decodeURIComponent(req.url.split('?')[0])==='/'?'index.html':decodeURIComponent(req.url.split('?')[0]));const file=req.url==='/'?path.join(root,'index.html'):f;if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.statusCode=404;return res.end();}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
const report={method:'Chromium staged runtime screenshots at 1280x720. Real art decode, five distinct outcome pairs and seven enemy cards. No physical device or human gameplay claim.',checks:[],errors:[],screenshots:[]};
const check=(name,value,detail)=>{report.checks.push({name,ok:!!value,detail});console.log((value?'PASS ':'FAIL ')+name);assert.ok(value,name);};
(async()=>{let browser;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-accelerated-2d-canvas']});
 const p=await browser.newPage({viewport:{width:1280,height:720}}),outcomeRequests=[];
 p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});p.on('request',r=>{if(r.url().includes('/outcomes-v11/'))outcomeRequests.push(r.url());});
 await p.goto('http://127.0.0.1:'+server.address().port+'/');await p.waitForFunction(()=>window.RWB?.assets.done&&RWB.game?.scene,null,{timeout:120000});
 check('No future outcome master is downloaded on the title',outcomeRequests.length===0,outcomeRequests);
 const shot=async name=>{const file=path.join(out,name+'.png');await p.screenshot({path:file});report.screenshots.push(path.relative(root,file));};
 for(let level=0;level<5;level++){
  const details=await p.evaluate(async level=>{const R=RWB,s=new R.scenes.Play(R.game,level,{wave:5,callandor:level===4});R.game.setSceneNow(s);await R.assets.ready(R.presentationV11.keys(level));s.phase='clear';s.tutorial=null;s.warningTimer=0;if(level===4){s.twinkleFreed=true;s.rescueReady=true;if(s.twinkle)s.twinkle.captive=false;}s.boss.dead=true;s.boss.remove=true;s.player.x=s.camera.x+195;s.player.y=283;s.player.facing=1;s.boss.x=s.camera.x+442;s.boss.y=290;s.clearTimer=99;s.bossCard=0;s.subtitle=null;s.bark=null;s.update=()=>{};R.game.fade=0;R.game.fadeDir=0;return{keys:R.presentationV11.keys(level),loaded:R.presentationV11.keys(level).map(key=>({key,loaded:R.assets.has(key),width:R.assets.get(key)?.naturalWidth})),resident:R.presentationV11.kinds.flatMap((_,i)=>R.presentationV11.keys(i)).filter(key=>R.assets.has(key))};},level);
  check('Stage '+(level+1)+' has its real decoded pair',details.loaded.every(x=>x.loaded&&x.width>0),details);
  check('Only the current outcome pair retains masters',details.resident.length===2,details.resident);
  await p.waitForTimeout(100);await shot('stage-'+(level+1)+'-painted-outcome');
 }
 for(const type of ['axe','hound','spear','darkfriend','cultist','guard','ashaman']){
  await p.evaluate(type=>{const R=RWB,s=new R.scenes.Play(R.game,type==='ashaman'?4:type==='guard'?3:0,{});R.game.setSceneNow(s);s.enemyCards=[{type,remaining:5}];s.boss=null;s.bossCard=0;s.player.angreal=0;s.player.healPortrait=0;s.update=()=>{};R.game.fade=0;R.game.fadeDir=0;},type);await p.waitForTimeout(100);await shot('enemy-'+type);
 }
 check('Ten different outcome files fetched exactly once',outcomeRequests.length===10&&new Set(outcomeRequests).size===10,outcomeRequests);
 check('No missing resources or script errors',report.errors.length===0,report.errors);
}finally{if(browser)await browser.close();server.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log('RWB_PRESENTATION_REPORT '+JSON.stringify(report));}})().catch(e=>{console.error(e);process.exitCode=1;});
