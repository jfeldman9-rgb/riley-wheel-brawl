import {stage8Simulation,withSeed} from './helpers/stage8-harness.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {Sister} from '../src/blackajah.js';import {crackPip8} from '../src/stage8-circle.js';
test('six pips crack only on their beats; timeout completes C4, C5 and C6 once',()=>withSeed(1,()=>{
 const h=stage8Simulation();try{const k=h.s.kit;k.story={say(){},play(n,fn){fn?.();},destroy(){},active:null};
 for(const b of ['z0','volley','z1']){assert.equal(crackPip8(k,b),true);assert.equal(crackPip8(k,b),false);}
 k.circle.start();assert.equal(k.circle.sisters.length,6);k.circle.step(75);k.circle.step(2);assert.equal(k.circle.done,true);assert.equal(k.pips.size,6);assert.equal(k.randFree,true);assert.equal(k.linked,true);assert.equal(k.graceUntil,k.clock+2);
 }finally{h.destroy();}
}));
test('sister bubble absorbs spells, opens on three melee hits, and bind breaks by wiggling',()=>withSeed(2,()=>{
 const h=stage8Simulation();try{const s=h.s,e=new Sister(s,500,630);s.enemies=[e];e.takeHit({kind:'fireball',dmg:50});assert.equal(e.hp,70);for(let i=0;i<3;i++)e.takeHit({kind:'light',dmg:5});assert.equal(e.bubble,false);e.aimY=s.riley.y;e.bind();assert.equal(s.riley.grabbedBy,e);e.mash();e.mash();e.mash();assert.equal(s.riley.grabbedBy,null);e.bind();h.s.kit.destroy();assert.equal(s.riley.grabbedBy,null);}finally{h.destroy();}
}));
