import test from 'node:test';
import assert from 'node:assert/strict';
import {stage8Simulation,withSeed} from './helpers/stage8-harness.mjs';
import {syncArt8} from '../src/stage8-residency.js';
import {releaseKeys8} from '../src/stage8-load.js';
import {cachedCall8Context,call8} from '../src/stage8-lifecycle.js';

test('steady sim reuses residency and checks call context/warm at 4 Hz; state transitions and presses stay fresh',()=>withSeed(3,()=>{
 const h=stage8Simulation();try{const s=h.s,k=s.kit;h.setController(null);s.zone=s.zones[0];s.updateZones=()=>{};s.pending=[];h.step();const resident=k.residentArt;let warms=0;k.video.warm=()=>{warms++;};const contexts=new Set();for(let i=0;i<120;i++){h.step(1/120);contexts.add(k.callContext);assert.equal(k.residentArt,resident);}assert.ok(contexts.size<=5,contexts.size);assert.ok(warms<=5,warms);
 const locked=cachedCall8Context(k);k.matJoined=true;const joined=cachedCall8Context(k);assert.notEqual(joined,locked);assert.equal(joined.joined,true);assert.equal(joined.hittable,false);
 const e=s.spawn('dancer','R');e.entering=false;e.silhouette=0;e.x=s.riley.x+100;e.y=s.riley.y;assert.equal(cachedCall8Context(k).hittable,false);assert.equal(call8(k),true,'actual press must recompute even inside the HUD cache interval');
 }finally{h.destroy();}
}));
test('residency demands only newly needed keys and repairs an explicitly retired resident key',()=>withSeed(2,()=>{
 const h=stage8Simulation();try{const s=h.s,k=s.kit;syncArt8(k);const exists=s.textures.exists,checked=[];s.textures.exists=key=>{checked.push(key);return exists(key);};for(let i=0;i<120;i++)syncArt8(k);assert.deepEqual(checked,[]);
 k.matJoined=true;syncArt8(k);assert.deepEqual(checked,['s8mat']);checked.length=0;releaseKeys8(k,['s8mat']);checked.length=0;syncArt8(k);assert.deepEqual(checked,['s8mat']);assert.ok(k.residentArt.has('s8mat'));
 k.circle.phase='link';syncArt8(k);assert.ok(k.residentArt.has('s8duo'));assert.ok(!k.residentArt.has('s8sister'));k.linked=true;syncArt8(k);assert.ok(k.residentArt.has('s8lanfear'));k.setQuality(4);syncArt8(k);assert.ok(!k.residentArt.has('bg8smoke'));
 }finally{h.destroy();}
}));
test('disabled video warm is a shared no-op promise without resetting the video lifecycle',async()=>{
 const h=stage8Simulation();try{const video=h.s.kit.video,a=video.warm('mat');for(let i=0;i<120;i++)assert.equal(video.warm('mat'),a);assert.equal(await a,false);assert.equal(video.blobCount,0);}finally{h.destroy();}
});
