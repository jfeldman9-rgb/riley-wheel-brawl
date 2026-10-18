import {stage8Simulation,withSeed} from './helpers/stage8-harness.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {StoneDog,WiseOne} from '../src/shaido8.js';
function fixture(fn){return withSeed(2,()=>{const h=stage8Simulation();try{h.s.zone=h.s.zones[0];return fn(h.s);}finally{h.destroy();}});}
test('buckler blocks three frontal hits and opens at 1.3x; back, throw, runkick and fireball break it',()=>fixture(s=>{
 for(const kind of ['light','throw','runkick','fireball']){const e=new StoneDog(s,500,630);e.facing=-1;
 if(kind==='light'){e.takeHit({dmg:10,kind},{x:400});e.takeHit({dmg:10,kind},{x:400});assert.equal(e.hp,90);e.takeHit({dmg:10,kind},{x:400});assert.equal(e.buckler,false);e.takeHit({dmg:10,kind},{x:400});assert.equal(e.hp,77);}
 else{e.takeHit({dmg:10,kind},{x:400});assert.equal(e.buckler,false);}e.destroy();}
 const back=new StoneDog(s,500,630);back.takeHit({kind:'light',dmg:10},{x:400});assert.equal(back.buckler,false);back.destroy();
}));
test('only one Wise One chants, a hit interrupts, humans yield with positive HP',()=>fixture(s=>{
 const a=new WiseOne(s,500,630),b=new WiseOne(s,550,630);s.enemies=[a,b];a.cool=b.cool=0;a.step(.01);b.step(.01);
 assert.equal([a,b].filter(e=>e.state==='attack').length,1);a.takeHit({dmg:1});assert.equal(a.state,'stagger');
 b.takeHit({dmg:999});assert.equal(b.alive,false);assert.equal(b.state,'yield');assert.equal(b.hp,1);
}));
