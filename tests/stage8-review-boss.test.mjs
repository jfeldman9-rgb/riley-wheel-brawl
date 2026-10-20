import test from 'node:test';
import assert from 'node:assert/strict';
import {stage8Simulation,withSeed} from './helpers/stage8-harness.mjs';
import {Lanfear} from '../src/lanfear.js';
import {bandY8} from '../src/stage8-allies.js';
function bossSim(){const h=stage8Simulation();h.setController(null);const s=h.s,k=s.kit;for(const e of s.enemies)e.destroy();s.enemies=[];s.pending=[];s.zoneI=3;s.zone=s.zones[3];s.bounds={l:3920,r:5200};s.camX=3920;s.updateZones=()=>{};k.bossIntro=true;k.zone=3;k.link.enable();k.volley.next=Infinity;const b=new Lanfear(s,4660,630);s.boss=b;s.enemies=[b];s.riley.x=4240;s.riley.y=630;s.riley.z=0;s.riley.inv=0;s.riley.facing=1;b.phase=3;b.hp=200;b.nextGreat=0;b.nextStep=Infinity;b.cool=99;return h;}
for(const timing of ['tell-start','launched'])test('linked cast at '+timing+' starts a real P3 clash without normal boss damage',()=>withSeed(2,()=>{
 const h=bossSim();try{const s=h.s,k=s.kit,b=s.boss;h.step();assert.ok(k.arena.tells.some(t=>t.kind==='great'));assert.ok(h.observations.hud.some(r=>r.method==='flashText'&&r.args[0].includes('MEET IT HEAD-ON')));
 if(timing==='launched'){for(let i=0;i<97;i++)h.step();assert.ok(k.arena.balls.some(b=>b.kind==='great'));}
 const hp=b.hp;s.spawnFireball(s.riley);for(let i=0;i<90&&!k.clash;i++)h.step();assert.ok(k.clash);assert.equal(k.clash.final,false);assert.equal(b.hp,hp);assert.equal(k.arena.tells.length+k.arena.balls.length,0);
 const anchor=b.anchorX,x=b.x,rhp=s.riley.hp;for(let i=0;i<250&&k.clash;i++)h.step();assert.equal(k.clash,null);assert.equal(s.riley.hp,rhp-14);assert.equal(s.riley.state,'down');assert.equal(b.anchorX,anchor);assert.equal(b.x,x);assert.equal(k.clashLog.at(-1).won,false);
 }finally{h.destroy();}
}));
test('winning an intercepted P3 great pushes and stuns Lanfear',()=>withSeed(2,()=>{
 const h=bossSim();try{const s=h.s,k=s.kit,b=s.boss;h.step();s.spawnFireball(s.riley);for(let i=0;i<90&&!k.clash;i++)h.step();assert.ok(k.clash);const x=b.anchorX,hp=b.hp;s.inp.held.special=true;for(let i=0;i<130&&k.clash;i++)h.step();assert.equal(k.clashLog.at(-1).won,true);assert.equal(b.anchorX,x+120);assert.equal(b.hp,hp-b.maxHp*.06);assert.equal(b.state,'stagger');assert.equal(b.assistDown,2);}finally{h.destroy();}
}));
for(const dodge of [false,true])test('falling stars '+(dodge?'leave an adjacent cell reachable before impact':'hit a stationary Riley after the tell'),()=>withSeed(3,()=>{
 const h=bossSim();try{const s=h.s,k=s.kit,b=s.boss;b.nextGreat=Infinity;b.phase=2;b.hp=400;b.nextGrab=Infinity;b.nextStar=0;const hp=s.riley.hp;h.step();assert.equal(k.arena.stars.length,3);assert.ok(k.arena.stars.some(t=>Math.abs(t.x-s.riley.x)<70&&Math.abs(t.y-s.riley.y)<30));
 if(dodge)s.inp.held.right=true;for(let i=0;i<50;i++)h.step();s.inp.held.right=false;assert.equal(s.riley.hp,hp);for(let i=0;i<10;i++)h.step();assert.equal(s.riley.hp,hp-(dodge?0:10));
 }finally{h.destroy();}
}));
test('star cells at either arena edge and in every band retain an adjacent safe cell',()=>withSeed(3,()=>{
 const h=bossSim();try{const s=h.s,k=s.kit;for(const x of [s.bounds.l+30,4240,s.bounds.r-30])for(const band of [0,1,2]){s.riley.x=x;s.riley.y=bandY8(band);s.riley.inv=0;k.combatClock+=1;k.arena.star(s.boss);const hp=s.riley.hp;k.arena.step(.89);assert.equal(s.riley.hp,hp);k.arena.step(.02);assert.equal(s.riley.hp,hp-10);
 s.riley.hp=100;s.riley.inv=0;k.combatClock+=1;k.arena.star(s.boss);s.riley.x=x+(x>4600?-130:130);k.arena.step(.91);assert.equal(s.riley.hp,100);}
 }finally{h.destroy();}
}));
