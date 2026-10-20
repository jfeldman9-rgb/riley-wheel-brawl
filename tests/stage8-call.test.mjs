import {stage8Simulation,withSeed} from './helpers/stage8-harness.mjs';import test from 'node:test';import assert from 'node:assert/strict';
import {call8,stepCall8} from '../src/stage8-lifecycle.js';
import {bag8} from '../src/call8-cutscene.js';
test('call hooks restore by identity; strike resolves without waiting for video',()=>withSeed(1,()=>{
 const h=stage8Simulation();try{const s=h.s,k=s.kit;k.matJoined=true;s.zone=s.zones[0];const e=s.spawn('stonedog','R');e.entering=false;e.x=s.riley.x+100;e.y=s.riley.y;k.video={play:()=>false,abort(){},destroy(){},drop(){}};assert.equal(call8(k),true);stepCall8(k,.5);assert.equal(e.buckler,false);stepCall8(k,.61);assert.equal(k.strike,null);assert.equal(k.call.on,false);const current=s.callLoial;k.destroy();assert.notEqual(s.callLoial,current);}finally{h.destroy();}
}));
test('provider bags persist and avoid immediate repeat',()=>{const data=new Map(),s={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};const bag=bag8(s,'mat',['M1','M2','M3'],()=>.5);const first=bag.next();const next=bag8(s,'mat',['M1','M2','M3'],()=>.5).next();assert.notEqual(first,next);});
