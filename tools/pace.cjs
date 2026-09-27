'use strict';
// Real-rAF mid-fight pacing probe. Playwright is intentionally optional, like
// review.cjs; set CHROMIUM_PATH when its bundled browser is unavailable.
const fs=require('fs'),path=require('path'),http=require('http');
let chromium;try{({chromium}=require('playwright'));}catch(e){console.error('pace.cjs requires optional Playwright: npm install playwright');process.exit(2);}
const root=path.resolve(__dirname,'..'),duration=Math.max(10,Number(process.env.RWB_PACE_SECONDS)||10);
const server=http.createServer((req,res)=>{const clean=decodeURIComponent(req.url.split('?')[0]);const file=path.join(root,clean==='/'?'index.html':clean);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.statusCode=404;return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.png')?'image/png':file.endsWith('.jpeg')?'image/jpeg':'application/octet-stream');fs.createReadStream(file).pipe(res);});
const percentile=(a,p)=>[...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor((a.length-1)*p))];
(async()=>{let browser;try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage',...(process.env.RWB_ACCELERATED?['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']:['--disable-gpu','--disable-accelerated-2d-canvas'])]});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>window.RWB?.assets.done&&window.RWB?.scenes?.Play,{timeout:30000});await page.evaluate(()=>RWB.prepareRendering&&RWB.prepareRendering());
 const cases=[['Stage 1 wave 3',0,3,false],['Stage 3 wave 3',2,3,false],['Stage 5 wave 3',4,3,false],['Stage 4 boss',3,5,false],['Stage 1 scrolling',0,0,true]],rows=[];
 for(const [name,level,wave,scroll] of cases){
  const raw=await page.evaluate(async({level,wave,duration,scroll})=>{
   const R=RWB,s=new R.scenes.Play(R.game,level,{wave,lives:99,callandor:level===4});const enterAt=performance.now();R.game.setSceneNow(s);R.game.fade=0;R.game.fadeDir=0;R.perf.runtimeLite=false;R.perf.lite=false;R.perf.quality=1;R.perf.observe=()=>{};await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));const enterMs=performance.now()-enterAt;
   let n=0,pressed=R.input.pressed;R.input.beginFrame=()=>{n++;for(const k in pressed)delete pressed[k];if(!scroll){if(n%24===0)pressed.attack=true;if(n%97===0)pressed.special=true;if(n%181===0)pressed.jump=true;}s.player.hp=s.player.hpMax;if(scroll)for(const e of s.enemies){if(!e.dead){e.dead=true;e.deathTimer=0.75;}}};R.input.axis=()=>{if(scroll)return{x:1,y:0};const e=s.enemies.filter(x=>!x.dead).sort((a,b)=>Math.abs(a.x-s.player.x)-Math.abs(b.x-s.player.x))[0];return e?{x:Math.abs(e.x-s.player.x)>45?Math.sign(e.x-s.player.x):0,y:Math.abs(e.y-s.player.y)>8?Math.sign(e.y-s.player.y)*.7:0}:{x:0,y:0};};
   const costs=[],wrap=key=>{const fn=s[key].bind(s);s[key]=(...a)=>{const t=performance.now(),v=fn(...a);costs.push(performance.now()-t);return v;};};wrap('update');wrap('draw');
   const gaps=[];let prior=0,start=0;await new Promise(resolve=>{const sample=t=>{if(!start)start=t;if(prior)gaps.push(t-prior);prior=t;if(t-start>=duration*1000)resolve();else requestAnimationFrame(sample);};requestAnimationFrame(sample);});
   return {gaps,costs,enterMs,poseMs:R.perf.lastPoseMs||0,canvas:[document.getElementById('game').width,document.getElementById('game').height],lite:!!R.perf.runtimeLite};
  },{level,wave,duration,scroll});
  const g=raw.gaps,c=raw.costs;rows.push({name,seconds:duration,canvas:raw.canvas,frames:g.length,avgFps:+(1000/(g.reduce((a,b)=>a+b,0)/g.length)).toFixed(2),p95Ms:+percentile(g,.95).toFixed(2),p99Ms:+percentile(g,.99).toFixed(2),over33:g.filter(x=>x>33).length,over50:g.filter(x=>x>50).length,meanUpdateDrawMs:+(c.reduce((a,b)=>a+b,0)/g.length).toFixed(2),runtimeLite:raw.lite,enterMs:+raw.enterMs.toFixed(1),poseMs:+raw.poseMs.toFixed(1)});
 }
 const report={method:`Headless Chromium ${process.env.RWB_ACCELERATED?'SwiftShader':'software Canvas'}, real requestAnimationFrame, ${duration}s per case, 1280x720 viewport, AUTO adaptation disabled and LITE forced off. The clock starts after stage enter and two frames, so pose-atlas upload is not inside the mid-fight sample.`,errors,rows};fs.writeFileSync(path.join(root,'docs/review/pace-after.json'),JSON.stringify(report,null,2)+'\n');console.table(rows);if(errors.length){console.error(errors);process.exitCode=1;}
 }finally{if(browser)await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
