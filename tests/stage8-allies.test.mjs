import {stage8Simulation,withSeed} from './helpers/stage8-harness.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {allyVisible8,band8,wolfHit8} from '../src/stage8-allies.js';
test('allies remain decorative and quality removes vignettes; wolves avoid Riley and cannot kill humans',()=>withSeed(4,()=>{
 const h=stage8Simulation();try{const k=h.s.kit;k.allies.enter(1);assert.equal(k.allies.vignettes.length,2);assert.ok(k.allies.vignettes.every(a=>!h.s.enemies.includes(a)));
 assert.equal(allyVisible8({x:0},200,0),false);assert.equal(allyVisible8({x:0},400,2),false);
 k.allies.charge('test');assert.notEqual(k.allies.wolf.lane,band8(h.s.riley.y));assert.equal(k.allies.charge('test'),false);
 const e={alive:true,hp:10,x:200,T:{},setState(){},yield(){this.alive=false;}};wolfHit8(e,600);assert.equal(e.hp,1);assert.equal(e.assistKill,true);assert.equal(e.x,320);
 assert.ok(h.resources().lights<=10);
 }finally{h.destroy();}
}));
