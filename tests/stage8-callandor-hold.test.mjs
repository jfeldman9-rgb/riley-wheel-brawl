import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {stage8Simulation,withSeed} from './helpers/stage8-harness.mjs';
import {CALLANDOR_HOLD8} from '../src/stage8-circle.js';
function quiet(h){h.setController(null);const s=h.s;s.updateZones=()=>{};s.pending=[];s.zone=s.zones[0];for(const e of s.enemies)e.destroy();s.enemies=[];s.riley.inv=0;s.bot={update(){}};return s;}
test("Rand's Callandor line outlasts its recording before the break and Riley's reply",()=>{
 const r=JSON.parse(readFileSync('tools/stage8/voice-render.json','utf8')).lines.find(l=>l.id==='st8_rand_callandor_01');
 assert.ok(CALLANDOR_HOLD8>=r.duration_s+.2,`hold ${CALLANDOR_HOLD8}s vs line ${r.duration_s}s`);
});
for(const near of [true,false])test(`circle break waits for Rand's line (Riley ${near?'already at the wagon':'away'})`,()=>withSeed(4,()=>{
 const h=stage8Simulation();try{const s=quiet(h),k=s.kit;k.circle.start();if(near)s.riley.x=3360;k.circle.prompt();
  let t=0;while(k.circle.phase==='prompt'&&t<10){if(near)s.riley.x=3360;h.step();t+=1/60;}
  assert.notEqual(k.circle.phase,'prompt');assert.ok(t>=CALLANDOR_HOLD8-.02,`broke after ${t.toFixed(2)}s`);assert.ok(t<=CALLANDOR_HOLD8+.5);
 }finally{h.destroy?.();}}));
