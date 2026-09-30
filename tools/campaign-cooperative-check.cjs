'use strict';
// A real event-loop regression for the browser harness, not a game/audio mock pass.
const assert=require('node:assert/strict'),path=require('node:path');
const {boot}=require('./soak.cjs'),{campaignRun}=require('./campaign-check.cjs');
(async()=>{
 const R=boot(path.resolve(__dirname,'..')),original=Object.getOwnPropertyDescriptor(R.audio,'voiceBusy');
 const rand=R.util.rand,globalRandom=Math.random;
 let pending=new Set(),finished=new Set(),callbacks=0;
 Object.defineProperty(R.audio,'voiceBusy',{configurable:true,get(){
  const scene=R.game.scene;if(!scene?.isGameplay||scene.phase!=='clear')return false;
  if(!pending.has(scene)&&!finished.has(scene)){pending.add(scene);setTimeout(()=>{pending.delete(scene);finished.add(scene);callbacks++;},5);}
  return pending.has(scene);
 }});
 try{
  const sync=campaignRun(R);
  assert.equal(sync.passed,false);assert.equal(sync.terminal.phase,'clear');assert.equal(sync.terminal.voiceBusy,true);assert.equal(callbacks,0);
  console.log('PASS synchronous control reproduces Stage1 clear starvation: queued event-loop callback cannot run');
  await new Promise(resolve=>setTimeout(resolve,10));pending=new Set();finished=new Set();callbacks=0;
  const cooperative=await campaignRun(R,1001,{cooperative:true});
  assert.equal(cooperative.passed,true);assert.ok(cooperative.eventLoopYields>0);assert.equal(callbacks,5);
  assert.equal(R.util.rand,rand);assert.equal(Math.random,globalRandom);
  console.log('PASS cooperative controller completes all5 stages with all5 callbacks and original completion assertions; RNG hooks restored');
  console.log('RWB_COOPERATIVE_TEST '+JSON.stringify({frames:cooperative.frames,continues:cooperative.continues,eventLoopYields:cooperative.eventLoopYields,callbacks,finished:cooperative.finished}));
 }finally{Object.defineProperty(R.audio,'voiceBusy',original);}
})().catch(error=>{console.error(error);process.exitCode=1;});
