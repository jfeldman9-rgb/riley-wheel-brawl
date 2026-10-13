import test from 'node:test';
import assert from 'node:assert/strict';
import { stage7Simulation, withSeed } from './helpers/stage7-harness.mjs';
import { Asmodean } from '../src/asmodean.js';
import { Dancer, Veiled } from '../src/shaido.js';
import { PHRASES,createNotes } from '../src/stage7-notes.js';
import { createStreet,bandY } from '../src/stage7-street.js';
import { createStorm } from '../src/stage7-storm.js';
import { createArena7 } from '../src/stage7-arena.js';
import { callEffect } from '../src/moilan-call.js';
function fixture(fn){return withSeed(1,()=>{const h=stage7Simulation({mode:null});try{const s=h.s;s.zoneI=3;s.zone=s.zones[3];s.bounds={l:3920,r:5200};s.camX=3920;s.started=true;s.riley.x=4500;s.riley.y=630;s.riley.inv=0;fn(s,h);}finally{h.destroy();}});}
test('every phrase leaves a free band and uses a full beat tell',()=>{
  for(const p of PHRASES){assert.equal(p.length,4);assert.ok(new Set(p).size<=2);}
  fixture(s=>{const n=createNotes(),b=new Asmodean(s,4800,630);n.step(1/120,s,b);assert.equal(n.notes.length,0);assert.equal(n.tells().length,1);assert.ok(n.pending.every(p=>Math.abs(p.fire-p.at-.625)<1e-9));});
});
test('all damage gates hold across 1000 large hits; helper cannot kill; channel counts three hits or a throw',()=>fixture(s=>{
  for(let i=0;i<1000;i++){const b=new Asmodean(s,4800,630);b.takeHit({dmg:600+i});assert.equal(b.hp,396);assert.equal(b.phase,2);assert.equal(b.takeHit({dmg:999}),false);b.beat=b.invuln=false;b.takeHit({dmg:999});assert.equal(b.hp,198);assert.equal(b.phase,3);b.destroy();}
  const b=new Asmodean(s,4800,630);b.phase=3;b.hp=20;callEffect(b,'duo');assert.equal(b.hp,1);assert.equal(b.alive,true);
  b.hp=100;b.startChannel();b.takeHit({dmg:1});b.takeHit({dmg:1});assert.equal(b.state,'channel');b.takeHit({dmg:1});assert.equal(b.state,'stagger');assert.equal(b.staggerFor,1.4);
  b.startChannel();b.takeHit({dmg:1,throw:true});assert.equal(b.state,'stagger');b.takeHit({dmg:999});assert.equal(b.state,'bound');assert.equal(b.gone,false);
}));
test('gold note reflects once for 24 damage and 0.8 seconds of stagger',()=>fixture(s=>{
  const b=new Asmodean(s,4800,630),n=createNotes();n.next=99;n.notes.push({x:4500,y:630,dir:1,age:0,gold:true,counterUsed:false});s.riley.attackFrame=true;n.step(1/120,s,b);assert.equal(b.hp,576);assert.equal(b.staggerFor,.8);n.step(1/120,s,b);assert.equal(b.hp,576);
}));
test('Shaido circling has no token; two archers share a 0.6 second release window; yield fades',()=>fixture(s=>{
  const d=new Dancer(s,4200,630);s.enemies=[d];d.cool=1;d.update(.05);assert.equal(s.attackTokens(),0);
  const a=new Veiled(s,4000,630),b=new Veiled(s,5100,630);s.enemies=[a,b];a.startAttack();b.startAttack();a.st=b.st=.6;s.kit.clock=1;a.step(.01);b.step(.01);assert.equal(s.kit.arrows.length,1);s.kit.clock=1.59;b.step(.01);assert.equal(s.kit.arrows.length,1);s.kit.clock=1.6;b.step(.01);assert.equal(s.kit.arrows.length,2);
  d.takeHit({dmg:999});assert.equal(d.state,'yield');assert.ok(d.hp>0);d.update(.9);assert.equal(d.gone,true);
}));
test('storm only pushes X, clamps bounds, halves brace push and defers a grabbed gust',()=>fixture(s=>{
  s.zoneI=1;s.zone=s.zones[1];s.bounds=s.zone;s.riley.x=1800;s.riley.y=630;s.enemies=[];const st=createStorm();st.dir=1;st.arm();st.phase='gust';st.t=4;st.step(1,s);assert.equal(s.riley.x,1870);assert.equal(s.riley.y,630);s.riley.state='block';st.step(1,s);assert.equal(s.riley.x,1905);s.riley.x=2510;st.step(1,s);assert.equal(s.riley.x,2480);
  st.phase='tell';st.t=0;s.riley.grabbedBy={};st.step(.1,s);assert.equal(st.phase,'tell');s.riley.grabbedBy=null;st.step(.1,s);assert.equal(st.phase,'gust');st.clear();assert.equal(st.armed,false);
}));
test('street avoids grabbed band, hits Riley once and enemies once; jump evades shockwave',()=>fixture(s=>{
  s.zoneI=2;s.zone=s.zones[2];const e={alive:true,x:4500,y:630,hit:0,takeHit(h){this.hit+=h.dmg;}};s.enemies=[e];const a=createStreet();a.t=0;s.riley.grabbedBy={};a.step(.01,s);assert.notEqual(a.ring.band,1);s.riley.grabbedBy=null;a.clear();a.t=0;a.step(.01,s);s.riley.y=e.y=bandY(a.ring.band);for(let i=0;i<200;i++)a.step(.01,s);assert.equal(e.hit,30);assert.equal(s.riley.hp,91);
  s.riley.inv=0;s.riley.state='idle';s.riley.z=60;const ar=createArena7(),b={alive:true,x:4400,y:630,phase:3};ar.wave(b);for(let i=0;i<50;i++)ar.step(.01,s,b);assert.equal(s.riley.hp,91);
}));
