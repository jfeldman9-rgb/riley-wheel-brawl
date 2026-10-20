import {stage8Simulation,withSeed,FULL_STAGE_SEEDS} from './helpers/stage8-harness.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {STAGE8,STAGE8_CHARS,STAGE8_TEXTURES} from '../src/stage8-def.js';
import {Stage8Kit,queueStage8,releaseStage8} from '../src/stage8.js';
import {STREAMS} from '../src/zone-stream.js';
test('Stage 8 main campaign registry, Riley-only atlas, release and governor before build',()=>{
 assert.deepEqual(STAGE8_CHARS,['riley']);assert.equal(STAGE8.kit,Stage8Kit);assert.equal(STAGE8.queue,queueStage8);
 assert.equal(STREAMS[8].zones.length,4);assert.deepEqual(STAGE8.next(),{stage:1,campaignComplete:true});
 const keys=new Set(STAGE8_TEXTURES),s={textures:{exists:k=>keys.has(k),remove:k=>keys.delete(k)}};
 releaseStage8(s,1);assert.equal(keys.size,0);
 const k=new Stage8Kit({});k.setQuality(4);assert.equal(k.quality,4);k.destroy();
});
test('Stage 8 skeleton boots and its enemies yield in the real combat loop',()=>withSeed(1,()=>{
 const h=stage8Simulation();try{assert.equal(h.s.stageNo,8);for(let i=0;i<2400;i++)h.step();assert.ok(h.observations.spawns.length>0);assert.ok(h.observations.deaths.length>0);}finally{h.destroy();}
}));
