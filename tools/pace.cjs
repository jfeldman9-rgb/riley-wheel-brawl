'use strict';
// Real-rAF mid-fight pacing probe. Playwright is intentionally optional, like
// review.cjs; set CHROMIUM_PATH when its bundled browser is unavailable.
const fs=require('fs'),path=require('path'),http=require('http');
let chromium;try{({chromium}=require('playwright'));}catch(e){console.error('pace.cjs requires optional Playwright: npm install playwright');process.exit(2);}
const root=path.resolve(__dirname,'..'),duration=Math.max(10,Number(process.env.RWB_PACE_SECONDS)||10);
const server=http.createServer((req,res)=>{const clean=decodeURIComponent(req.url.split('?')[0]);const file=path.join(root,clean==='/'?'index.html':clean);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.statusCode=404;return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.png')?'image/png':file.endsWith('.jpeg')?'image/jpeg':file.endsWith('.webp')?'image/webp':'application/octet-stream');fs.createReadStream(file).pipe(res);});
const percentile=(a,p)=>[...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor((a.length-1)*p))];
(async()=>{let browser;try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage',...(process.env.RWB_ACCELERATED?['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']:['--disable-gpu','--disable-accelerated-2d-canvas'])]});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>window.RWB?.assets.done&&window.RWB?.scenes?.Play,{timeout:30000});await page.evaluate(()=>RWB.prepareRendering&&RWB.prepareRendering());
 const fade=process.env.RWB_PACE_FADE==='1';
 const cases=[['Stage 1 wave 3',0,3,false,10],['Stage 3 wave 3',2,3,false,10],['Stage 5 wave 3',4,3,false,10],['Stage 4 boss',3,5,false,10],['Stage 1 walking',0,0,true,33],['Stage 2 walking',1,0,true,33],['Stage 3 walking',2,0,true,33],['Stage 4 walking',3,0,true,33],['Stage 5 walking',4,0,true,33]];
 const list=fade?cases.filter(row=>row[3]):cases,rows=[];
 for(const [name,level,wave,scroll,seconds] of list){
  const raw=await page.evaluate(async({level,wave,duration,scroll,fade})=>{
   const R=RWB,s=new R.scenes.Play(R.game,level,{wave,lives:99,callandor:level===4});
   const enterAt=performance.now();
   if(fade)R.game.setScene(s);else{R.game.setSceneNow(s);R.game.fade=0;R.game.fadeDir=0;}
   R.perf.runtimeLite=false;R.perf.lite=false;R.perf.quality=1;R.perf.observe=()=>{};
   if(!fade)await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   const enterMs=performance.now()-enterAt;
   const primed=!fade;
   let n=0,pressed=R.input.pressed,bossAt=0,bossQueue=null;
   R.input.beginFrame=()=>{n++;for(const k in pressed)delete pressed[k];if(!scroll){if(n%24===0)pressed.attack=true;if(n%97===0)pressed.special=true;if(n%181===0)pressed.jump=true;}s.player.hp=s.player.hpMax;if(scroll)for(const e of s.enemies){if(!e.dead){e.dead=true;e.deathTimer=0.75;}}if(scroll&&s.boss&&bossQueue==null){bossQueue=(R.perf.poseQueue||[]).length;bossAt=performance.now();}};
   R.input.axis=()=>{if(scroll)return{x:1,y:0};const e=s.enemies.filter(x=>!x.dead).sort((a,b)=>Math.abs(a.x-s.player.x)-Math.abs(b.x-s.player.x))[0];return e?{x:Math.abs(e.x-s.player.x)>45?Math.sign(e.x-s.player.x):0,y:Math.abs(e.y-s.player.y)>8?Math.sign(e.y-s.player.y)*.7:0}:{x:0,y:0};};
   const costs=[],wrap=key=>{const fn=s[key].bind(s);s[key]=(...a)=>{const t=performance.now(),v=fn(...a);costs.push(performance.now()-t);return v;};};wrap('update');wrap('draw');
   const gaps=[],pumps=[],big=[];let prior=0,start=0,framesAfter=0,clearAt=0;
   await new Promise(resolve=>{const sample=t=>{
    if(!primed){
      // The fade-out has to swap before the walk window exists. Cap the wait
      // so a scene that never becomes current cannot sit in this promise.
      if(R.game.scene!==s){
        if(t>1e14)return;
        if(!sample.born)sample.born=t;
        if(t-sample.born>8000){resolve();return;}
        requestAnimationFrame(sample);return;
      }
      framesAfter++;
      if(framesAfter<2){requestAnimationFrame(sample);return;}
    }
    if(!start){start=t;R.perf.hitches=[];R.perf.slowSteps=[];R.perf.outside=[];}
    if(start){
      if(prior){const gap=t-prior;gaps.push(gap);pumps.push(R.perf.lastPumpMs||0);if(gap>20){const w=(R.perf.work||[])[(R.perf.work||[]).length-1];big.push({gap:+gap.toFixed(2),cam:s.camera&&+s.camera.x.toFixed(1),wave:s.wave,phase:s.phase,updateMs:w&&w.updateMs,drawMs:w&&w.drawMs,pumpMs:w&&w.pumpMs,jobs:w&&w.jobs});}}
      prior=t;
      if(s.phase==='clear'&&!clearAt)clearAt=t;
      const need=scroll?Math.max(duration*1000,clearAt?clearAt-start+2000:120000):duration*1000;
      if(t-start>=need||t-start>=120000){resolve();return;}
    }
    requestAnimationFrame(sample);
   };requestAnimationFrame(sample);});
   const slow=(R.perf.slowSteps||[]).slice(0,40);
   return {gaps,costs,pumps,big:big.slice(0,60),enterMs,poseMs:R.perf.lastPoseMs||0,canvas:[document.getElementById('game').width,document.getElementById('game').height],lite:!!R.perf.runtimeLite,bossQueue,bossAt:bossAt?+(bossAt-(R.perf.stageEnteredAt||bossAt)).toFixed(0):null,emptyAt:R.perf.queueEmptyAt?+(R.perf.queueEmptyAt-(R.perf.stageEnteredAt||R.perf.queueEmptyAt)).toFixed(0):null,queueNow:(R.perf.poseQueue||[]).length,fallbacks:R.perf.poseFallbacks||0,outside:(R.perf.outside||[]).slice(0,20),slow,clearAt:clearAt?+(clearAt-start).toFixed(0):null};
  },{level,wave,duration:seconds,scroll,fade});
  const g=raw.gaps.length?raw.gaps:[0],c=raw.costs.length?raw.costs:[0],p=raw.pumps.length?raw.pumps:[0];
  const row={name,seconds,canvas:raw.canvas,frames:raw.gaps.length,avgFps:+(1000/(g.reduce((a,b)=>a+b,0)/g.length)).toFixed(2),p95Ms:+percentile(g,.95).toFixed(2),p99Ms:+percentile(g,.99).toFixed(2),over20:g.filter(x=>x>20).length,over33:g.filter(x=>x>33).length,over50:g.filter(x=>x>50).length,maxMs:+Math.max(...g).toFixed(2),meanUpdateDrawMs:+(c.reduce((a,b)=>a+b,0)/Math.max(1,raw.gaps.length)).toFixed(2),pumpP99:+percentile(p,.99).toFixed(2),pumpMax:+Math.max(...p).toFixed(2),runtimeLite:raw.lite,enterMs:+raw.enterMs.toFixed(1),poseMs:+raw.poseMs.toFixed(1),bossQueue:raw.bossQueue,bossAt:raw.bossAt,emptyAt:raw.emptyAt,queueNow:raw.queueNow,fallbacks:raw.fallbacks,clearAt:raw.clearAt,slow:raw.slow,outside:raw.outside,framesOver20:raw.big};
  rows.push(row);
  const line=name+' fps '+row.avgFps+' >20 '+row.over20+' >33 '+row.over33+' >50 '+row.over50+' max '+row.maxMs+' pumpMax '+row.pumpMax+' qBoss '+row.bossQueue+' empty '+row.emptyAt+' fallbacks '+row.fallbacks+' clear '+row.clearAt+'\n';
  fs.appendFileSync('/tmp/pace-progress.txt', line);
  console.log(name,'fps',row.avgFps,'>20',row.over20,'>33',row.over33,'>50',row.over50,'max',row.maxMs,'pumpMax',row.pumpMax,'qBoss',row.bossQueue,'empty',row.emptyAt,'fallbacks',row.fallbacks);
  for(const frame of raw.big)console.log('  >20',JSON.stringify(frame));
 }
 const report={method:`Headless Chromium ${process.env.RWB_ACCELERATED?'SwiftShader':'software Canvas'}, real requestAnimationFrame, ${fade?'fade-in walks':'10s fights and walks on all 5 stages'}. Walk window starts 2 frames after enter and runs until the later of 33s or phase clear + 2s. 1280x720, AUTO off, LITE off.`,fade,errors,rows};fs.writeFileSync(path.join(root,'docs/review/pace-after.json'),JSON.stringify(report,null,2)+'\n');console.table(rows.map(({framesOver20,slow,outside,...row})=>row));if(errors.length){console.error(errors);process.exitCode=1;}
 }finally{if(browser)await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
