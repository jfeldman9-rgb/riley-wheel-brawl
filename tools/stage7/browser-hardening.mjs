// Run after serving the repo: RWB_URL=http://127.0.0.1:8765 node tools/stage7/browser-hardening.mjs
// Requires Playwright + WebKit. Captures measured source texture residency and zone screenshots.
import {createRequire} from 'node:module';
import {writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const {webkit}=createRequire(import.meta.url)('playwright');
const browser=await webkit.launch({headless:true}),rows=[];
const base=process.env.RWB_URL||'http://127.0.0.1:8765/';
mkdirSync('docs/stage7/evidence',{recursive:true});
try{for(let run=0;run<5;run++){
  const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:2,isMobile:true,hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    window.__s7FrameMs=[];let last=0;
    const frame=t=>{const s=window.__stage,active=s?.stageNo===7&&s.started&&!s.paused&&!s.cutscene&&!s.ended;
      if(active&&last)window.__s7FrameMs.push(t-last);last=active?t:0;requestAnimationFrame(frame);};
    requestAnimationFrame(frame);
  });
  await page.goto(base+'?stage=7&s7=1&story=0&demo=1&call7=1&debug=1&rs=1');
  await page.waitForFunction(()=>window.__stage?.stageNo===7&&window.__stage.started,null,{timeout:60000});
  const samples=[];
  for(let zone=0;zone<4;zone++){
    await page.waitForFunction(zone=>window.__stage.zoneI>=zone||window.__stage.gameOver,zone,{timeout:300000});
    const info=await page.evaluate(()=>{const s=window.__stage,g=window.__game;return {zone:s.zoneI,gameOver:s.gameOver,keys:Object.keys(g.textures.list),bytes:Object.values(g.textures.list).reduce((n,t)=>n+['source','dataSource'].reduce((n,k)=>n+t[k].reduce((n,v)=>n+v.width*v.height*4,0),0),0)};});
    assert.equal(info.gameOver,false);assert.ok(info.bytes<=105*1024*1024);assert.ok(!info.keys.some(k=>k.startsWith('story7')));samples.push(info);
    if(!run)await page.screenshot({path:`docs/stage7/evidence/zone${zone}.png`});
  }
  await page.evaluate(()=>{const s=window.__stage;s.setPauseReason('manual',true);s.kit.setQuality(4);s.setPauseReason('manual',false);});
  await page.waitForFunction(()=>window.__stage.ended||window.__stage.gameOver,null,{timeout:300000});
  assert.equal(await page.evaluate(()=>window.__stage.gameOver),false);
  const timing=await page.evaluate(()=>{const a=window.__s7FrameMs.slice().sort((a,b)=>a-b);return {frames:a.length,p95ms:a[Math.floor(a.length*.95)]};});
  assert.ok(timing.frames>120);assert.ok(timing.p95ms<=18.5,JSON.stringify(timing));
  await page.evaluate(()=>window.__stage.scene.restart({stage:1,autostart:true,story:false}));
  await page.waitForFunction(()=>window.__stage.stageNo===1&&window.__stage.started);
  const leaked=await page.evaluate(()=>Object.keys(window.__game.textures.list).filter(k=>/^(s7|bg7|story7|moiPortrait|lanPortrait|asmoPortrait)/.test(k)));
  assert.deepEqual(leaked,[]);assert.deepEqual(errors,[]);rows.push({run,samples,timing,errors,leaked});await page.close();
}}finally{await browser.close();writeFileSync('docs/stage7/browser-results.json',JSON.stringify(rows,null,2)+'\n');}
