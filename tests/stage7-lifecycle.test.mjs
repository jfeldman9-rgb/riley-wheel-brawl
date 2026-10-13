import test from 'node:test';
import assert from 'node:assert/strict';
import { stage7Simulation,withSeed } from './helpers/stage7-harness.mjs';
import { STAGE7,STAGE7_TEXTURES } from '../src/stage7-def.js';
import { Stage7Kit,releaseStage7,queueStage7 } from '../src/stage7.js';
import { callMoilan,stepStrike7 } from '../src/stage7-lifecycle.js';
import { stageFromQuery,maxStage,STAGES } from '../src/stages.js';
import { callInFor } from '../src/rand-call.js';
import { usesCompactNormals } from '../src/texture-pages.js';
import { plateRect,STREAMS } from '../src/zone-stream.js';
import { freeStory7 } from '../src/stage7-paint.js';
test('gated registry, Stage 6 onward wiring, providers and exact Stage 6 plate geometry',()=>{
  assert.equal(stageFromQuery(new URLSearchParams('stage=7')),1);assert.equal(stageFromQuery(new URLSearchParams('stage=7&s7=1')),7);assert.equal(maxStage(new URLSearchParams('s7=1')),7);
  assert.deepEqual(STAGES[6].next(new URLSearchParams('s7=1')),{stage:7});assert.deepEqual(STAGES[6].next(),{stage:1});assert.deepEqual(STAGE7.chars,['riley','grunt','spear']);assert.equal(usesCompactNormals(7),true);
  for(let i=1;i<=9;i++)assert.equal(callInFor(i),i<6?'loial':i===6?'rand':'moilan');
  for(let i=0;i<4;i++){const z=STAGES[6].zones,l=z[i].l,r=i===3?5200:z[i+1].l,bl=i===0?128:i===2?0:48,br=i===3?128:i+1===2?0:48,x=(i?l:0)-bl;assert.deepEqual(plateRect(i,z),{x,w:r+br-x});}
  assert.deepEqual(STREAMS[7].bleed,[128,48,48,48,128]);
});
test('exit releases all Stage 7 textures, preserves shared Fade on Stage 6, and story panels release early',()=>{
  const keys=new Set(STAGE7_TEXTURES),s={textures:{exists:k=>keys.has(k),remove:k=>keys.delete(k)}};freeStory7(s);assert.ok(![...keys].some(k=>k.startsWith('story7')));releaseStage7(s,6);assert.deepEqual([...keys],['s6fade']);releaseStage7(s,1);assert.equal(keys.size,0);
});
test('strike freezes the world, resolves once, grants invulnerability, and all own hooks restore',()=>withSeed(2,()=>{
  const h=stage7Simulation({mode:null}),s=h.s,k=s.kit;
  try{s.zoneI=0;s.zone=s.zones[0];s.bounds=s.zone;s.riley.x=400;s.riley.y=630;s.started=true;const e=s.spawn('dancer','R');e.entering=false;e.x=500;e.y=630;
    assert.equal(callMoilan(k),true);assert.equal(k.strike.helper,'lan');assert.equal(k.freezesWorld(),true);const x=s.riley.x,time=s.time.paused;stepStrike7(k,.46);assert.equal(e.state,'down');assert.equal(e.hp,60);assert.equal(s.riley.x,x);assert.equal(time,true);stepStrike7(k,.5);assert.equal(k.strike,null);assert.ok(s.riley.inv>=2);
    k.destroy();const original=s.callLoial,update=s.update;k.build();assert.notEqual(s.callLoial,original);k.destroyed=false;k.destroy();assert.equal(s.callLoial,original);assert.equal(s.update,update);
  }finally{h.destroy();}
}));
test('governor before build and destroy are safe, and Stage 7 queue requests no fourth atlas',()=>{
  const k=new Stage7Kit({});k.setQuality(4);k.destroy();k.destroy();
  const urls=[],s={textures:{exists:()=>false},cache:{json:{get:()=>null}},load:{image:(k,u)=>urls.push(u),atlas:(k,u)=>urls.push(u),spritesheet:(k,u)=>urls.push(u),json:()=>{}}};queueStage7(s);assert.ok(urls.includes('assets/stage6/chars/s6fade.webp'));assert.ok(!urls.some(u=>/hound|rand\/|stage7.*mp4/.test(String(u))));
});
test('death/continue/destroy during a call thaw clocks, abort video and release holds',()=>withSeed(8,()=>{
  const h=stage7Simulation({mode:null}),s=h.s,k=s.kit;
  try{
    s.zoneI=0;s.zone=s.zones[0];s.bounds=s.zone;s.riley.x=400;s.started=true;
    const e=s.spawn('dancer','R');e.x=500;e.y=s.riley.y;e.entering=false;
    let breaks=0,aborts=0;e.releaseHold=()=>breaks++;
    k.video.destroy();k.video={play(){},abort(){aborts++;},destroy(){aborts++;},active:true};
    assert.equal(callMoilan(k),true);assert.equal(s.time.paused,true);
    s.rileyDied();assert.equal(k.strike,null);assert.equal(!!s.time.paused,false);assert.ok(breaks>0);assert.ok(aborts>0);
    s.continueGame();assert.equal(k.freezesWorld(),false);k.destroy();assert.equal(k.call.on,false);
  }finally{h.destroy();}
}));
test('strike damage timing is identical for missing, playing and stalled clips',()=>{
  for(const state of ['missing','playing','stalled'])withSeed(1,()=>{
    const h=stage7Simulation({mode:null}),s=h.s,k=s.kit;
    try{
      s.zoneI=0;s.zone=s.zones[0];s.bounds=s.zone;s.riley.x=400;s.started=true;
      const e=s.spawn('dancer','R');e.x=500;e.y=s.riley.y;e.entering=false;
      k.video.destroy();k.video={play(){return state!=='missing';},active:state!=='missing',destroy(){this.active=false;}};
      assert.equal(callMoilan(k),true);stepStrike7(k,.44);assert.notEqual(e.state,'down');stepStrike7(k,.02);assert.equal(e.state,'down');
      stepStrike7(k,.5);assert.equal(!!k.strike,state!=='missing');k.video.active=false;stepStrike7(k,.01);assert.equal(k.strike,null);assert.ok(s.riley.inv>=2);
    }finally{h.destroy();}
  });
});
test('Stages 1–6 never queue Stage 7 media',()=>{
  const urls=[],note=(...args)=>{for(const v of args.flat(2))if(typeof v==='string')urls.push(v);};
  const s={textures:{exists:()=>false},cache:{json:{get:()=>null}},anims:{exists:()=>false},load:new Proxy({}, {get:(o,k)=>k==='optionalAssetKeys'?undefined:note})};
  for(let n=1;n<=6;n++)STAGES[n].queue?.(s);
  assert.deepEqual(urls.filter(u=>/assets\/(stage7|bg7|cutscenes\/call7)|st7_|music-(?:stage|boss)7/.test(u)),[]);
});
