import {stage8Simulation,withSeed} from './helpers/stage8-harness.mjs';import test from 'node:test';import assert from 'node:assert/strict';
import {companionPose8} from '../src/stage8-link.js';
test('link changes effects and meter, never input or hurtbox; all hooks restore by identity',()=>withSeed(1,()=>{
 const h=stage8Simulation();try{const s=h.s,k=s.kit,r=s.riley,def=r.def,update=r.update,hit=r.landedHit,cast=s.powers.castCost,spawn=s.spawnFireball;assert.ok(k.link.enable());assert.equal(k.link.enable(),false);assert.equal(s.powers.castCost(),28);assert.equal(r.def,def);assert.equal(r.update,update);
 r.saidin=20;r.landedHit(10);assert.equal(r.saidin,24.5);k.link.step(1);assert.equal(r.saidin,26.5);s.spawnFireball(r);assert.equal(s.fireballs[0].dmg,14*1.3);assert.equal(s.fireballs[0].linked,true);assert.equal(k.link.companion.targetable,false);assert.ok(!s.enemies.includes(k.link.companion));assert.ok(h.resources().lights<=10);
 k.destroy();assert.equal(r.landedHit,hit);assert.equal(s.powers.castCost,cast);assert.equal(s.spawnFireball,spawn);
 }finally{h.destroy();}
}));
test('companion reactions brace and shield without ever becoming a hurt target',()=>{assert.equal(companionPose8('hurt'),'brace');assert.equal(companionPose8('down'),'kneel');assert.equal(companionPose8('grabbed'),'pull');assert.equal(companionPose8('combo3'),'spark');});
