// Serve the repo first. RWB_URL=http://127.0.0.1:8765 node tools/stage8/browser-hardening.mjs
// RWB_BROWSER=webkit selects the device-oriented profile; default is Chromium.
// Failures are recorded, never converted into a successful device measurement.
import {createRequire} from 'node:module';
import {writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const playwright=require(process.env.PLAYWRIGHT_PATH||'/home/box/.local/lib/node_modules/playwright');
const engine=process.env.RWB_BROWSER||'chromium',base=process.env.RWB_URL||'http://127.0.0.1:8765/';
const out='docs/stage8/evidence';mkdirSync(out,{recursive:true});
const report={engine,status:'running',runs:[],soak:[],errors:[]};let browser;
const textures=()=>{const g=window.__game;return {keys:Object.keys(g.textures.list),bytes:Object.values(g.textures.list).reduce((sum,t)=>sum+['source','dataSource'].reduce((n,key)=>n+(t[key]||[]).reduce((n,s)=>n+s.width*s.height*4,0),0),0)};};
try{
 browser=await playwright[engine].launch(engine==='chromium'?{headless:true,executablePath:process.env.RWB_CHROME||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{headless:true});
 for(let run=0;run<5;run++){
  const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:2,isMobile:true,hasTouch:true});const errors=[],samples=[],shots=new Set();
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(seed=>{let x=seed;Math.random=()=>{x=(1664525*x+1013904223)>>>0;return x/4294967296;};window.__s8FrameMs=[];let last=0;function frame(t){const s=window.__stage,active=s?.stageNo===8&&s.started&&!s.paused&&!s.cutscene&&!s.ended;if(active&&last)window.__s8FrameMs.push(t-last);last=active?t:0;requestAnimationFrame(frame);}requestAnimationFrame(frame);},[1,2,3,4,5][run]);
  await page.goto(base+'?stage=8&s7=1&s8=1&demo=1&story=0&call8=1&rs=1');
  await page.waitForFunction(()=>window.__stage?.stageNo===8&&window.__stage.started,null,{timeout:60000});
  let ended=false;
  for(let second=0;second<900&&!ended;second++){
   const state=await page.evaluate(()=>{const s=window.__stage,k=s.kit;return {zone:s.zoneI,phase:s.boss?.phase,circle:k.circle.phase,beat:k.story.active,ended:s.ended,gameOver:s.gameOver,clock:k.clock};});
   assert.equal(state.gameOver,false,JSON.stringify(state));
   const key=`z${state.zone}-${state.circle}-p${state.phase||0}-${state.beat||'play'}`;
   if(!shots.has(key)){shots.add(key);const memory=await page.evaluate(textures);assert.ok(memory.bytes<=105*1024*1024);samples.push({...state,...memory});if(!run)await page.screenshot({path:`${out}/${key}.png`});
    // Pause/resume and governor changes in every encountered story/gameplay phase.
    const before=await page.evaluate(()=>{const s=window.__stage;s.setPauseReason('hardening',true);s.kit.setQuality(4);return s.kit.clock;});
    await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>window.__stage.kit.clock),before);
    await page.evaluate(()=>{const s=window.__stage;s.kit.setQuality(0);s.setPauseReason('hardening',false);});
   }
   ended=state.ended;if(!ended)await page.waitForTimeout(1000);
  }
  assert.ok(ended,'campaign timeout');const timing=await page.evaluate(()=>{const a=window.__s8FrameMs.slice().sort((a,b)=>a-b);return {frames:a.length,p95ms:a[Math.floor(a.length*.95)]};});
  assert.ok(timing.frames>120);assert.ok(timing.p95ms<=18.5,JSON.stringify(timing));
  await page.evaluate(()=>window.__stage.scene.restart({stage:1,story:false}));await page.waitForFunction(()=>window.__stage.stageNo===1);
  const leaked=(await page.evaluate(textures)).keys.filter(k=>/^(s8|bg8|story8|lanfearPortrait|matPortrait|perrinPortrait|taimPortrait|twinkPortrait)/.test(k));assert.deepEqual(leaked,[]);assert.deepEqual(errors,[]);
  report.runs.push({run,samples,timing,errors,leaked});await page.close();
 }
 // Two 1→8 traversals in the same page/texture manager, recording per-stage
 // stable residency. Gameplay completion is covered above for Stage 8.
 const page=await browser.newPage();await page.goto(base+'?s7=1&s8=1&story=0&demo=1');await page.waitForFunction(()=>window.__stage?.started);
 for(let lap=0;lap<2;lap++)for(let stage=1;stage<=8;stage++){
  await page.evaluate(stage=>window.__stage.scene.restart({stage,autostart:true,story:false}),stage);
  await page.waitForFunction(stage=>window.__stage.stageNo===stage&&window.__stage.started,stage,{timeout:60000});await page.waitForTimeout(2000);
  report.soak.push({lap,stage,...await page.evaluate(textures)});
 }
 for(let i=0;i<8;i++)assert.ok(Math.abs(report.soak[i].bytes-report.soak[i+8].bytes)<=2*1024*1024,'texture growth stage '+(i+1));
 await page.close();report.status='passed';
}catch(e){report.status=report.runs.length?'failed':'blocked';report.errors.push(e.stack||String(e));process.exitCode=1;
}finally{await browser?.close();writeFileSync('docs/stage8/browser-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,runs:report.runs.length,errors:report.errors.map(e=>e.split('\n')[0])}));}
