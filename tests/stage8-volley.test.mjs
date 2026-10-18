import {stage8Simulation,withSeed} from './helpers/stage8-harness.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {safeLane8,volleyDamage8,volleyBlocked8,VOLLEY8} from '../src/stage8-volley.js';
test('10,000 volleys have an adjacent clear lane, no triple repeat and at most 14 damage',()=>withSeed(97,()=>{
 const h=[];for(let i=0;i<10000;i++){const lane=i%3,safe=safeLane8(lane,h);assert.ok(Math.abs(lane-safe)<=1);assert.notEqual(safe,null);if(h.length>1)assert.ok(!(h[h.length-1]===safe&&h[h.length-2]===safe));h.push(safe);let damage=volleyDamage8('earth',0,false);for(let j=0;j<3;j++)damage+=volleyDamage8('fire',0,false,damage);assert.ok(damage<=14);}
}));
test('jump clears earth; Fire Shield blocks only fire; blocked volleys skip after four seconds',()=>withSeed(1,()=>{
 assert.equal(volleyDamage8('earth',70,false),0);assert.equal(volleyDamage8('earth',0,true),10);assert.equal(volleyDamage8('fire',0,true),0);
 const h=stage8Simulation();try{const k=h.s.kit;k.volley.arm();k.volley.next=0;h.s.riley.state='grabbed';assert.equal(volleyBlocked8(k),true);for(let i=0;i<500;i++)k.volley.step(.01);assert.equal(k.volley.active,null);assert.equal(k.volley.skips,1);assert.equal(VOLLEY8.inBoss,true);}finally{h.destroy();}
}));
