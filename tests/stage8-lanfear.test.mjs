import {stage8Simulation,withSeed} from './helpers/stage8-harness.mjs';import test from 'node:test';import assert from 'node:assert/strict';
import {Lanfear,Mirror8,floor8} from '../src/lanfear.js';import {bandY8} from '../src/stage8-allies.js';
test('1000 hits from every source cannot skip 66/33/1 HP gates',()=>withSeed(5,()=>{const h=stage8Simulation();try{const s=h.s,b=new Lanfear(s,800,630);s.boss=b;s.enemies=[b];s.zone=s.zones[3];s.zoneI=3;for(let i=0;i<1000;i++){b.takeHit({dmg:i*59+1,kind:['throw','power','volley','wolf'][i%4]});assert.ok(b.hp>=floor8(b));if(i===20||i===50){b.gate();b.beat=0;}}assert.equal(b.hp,1);assert.equal(b.alive,true);}finally{h.destroy();}}));
test('real fan waits for its tells, fires three balls into two bands, and leaves a safe lane',()=>withSeed(3,()=>{
 const h=stage8Simulation();try{const s=h.s,k=s.kit,b=new Lanfear(s,800,630);s.boss=b;s.enemies=[b];s.riley.x=550;s.riley.inv=0;k.arena.fan(b);
 const safe=[0,1,2].find(i=>!k.arena.tells.some(t=>t.band===i));assert.notEqual(safe,undefined);s.riley.y=bandY8(safe);const hp=s.riley.hp;
 k.arena.step(.54);assert.equal(k.arena.balls.length,0);k.arena.step(.02);assert.equal(k.arena.balls.length,1);k.arena.step(.3);assert.equal(k.arena.balls.length,3);assert.equal(new Set(k.arena.balls.map(b=>b.y)).size,2);
 for(let i=0;i<100;i++)k.arena.step(.02);assert.equal(s.riley.hp,hp);
 k.arena.clear();k.arena.fan(b);s.riley.y=bandY8(k.arena.tells[0].band);for(let i=0;i<100;i++)k.arena.step(.02);assert.equal(s.riley.hp,hp-8);
 }finally{h.destroy();}
}));
test('crown grab holds its tell then lunges for damage, while a lane dodge opens the tantrum',()=>withSeed(3,()=>{
 const h=stage8Simulation();try{const s=h.s,k=s.kit,b=new Lanfear(s,800,630);s.boss=b;s.enemies=[b];s.bounds={l:0,r:1280};s.riley.x=550;s.riley.y=630;s.riley.inv=0;b.phase=2;b.nextGrab=0;b.cool=99;b.update(.01);assert.equal(b.state,'grab_tell');const hp=s.riley.hp;b.update(.58);assert.equal(b.state,'grab_tell');assert.equal(s.riley.hp,hp);for(let i=0;i<80;i++)b.update(.01);assert.equal(s.riley.hp,hp-12);
 b.x=800;b.setState('idle');b.nextGrab=0;b.update(.01);s.riley.y=690;for(let i=0;i<140;i++)b.update(.01);assert.equal(b.state,'tantrum');assert.equal(s.riley.hp,hp-12);
 }finally{h.destroy();}
}));
test('copies deal zero damage and volley hold suppresses attacks',()=>withSeed(1,()=>{const h=stage8Simulation();try{const s=h.s,k=s.kit,b=new Lanfear(s,800,630),copy=new Mirror8(s,500,630);s.boss=b;s.enemies=[b,copy];assert.equal(copy.damage,0);b.volleyHold=true;b.cool=0;for(let i=0;i<100;i++)b.step(.1);assert.equal(k.arena.tells.length,0);assert.equal(b.state,'shield');b.volleyHold=false;b.phase=2;b.setState('lunge');b.grabDir=1;b.grabY=572;s.riley.y=690;b.st=.74;b.step(.02);assert.equal(b.state,'tantrum');}finally{h.destroy();}}));
