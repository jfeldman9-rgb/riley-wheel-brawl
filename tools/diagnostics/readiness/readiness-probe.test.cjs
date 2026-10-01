'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {installReadinessProbe}=require('./readiness-probe.cjs');
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
function harness(){
  let t=0;
  const events=[],rigs=new Map(),callbacks=new Map();let next=0;
  const contextPrototype={drawImage(...args){events.push(['drawImage',...args]);return 'image-result';}};
  const ctx=Object.create(contextPrototype);
  ctx.save=()=>events.push(['save']);ctx.restore=()=>events.push(['restore']);
  const R={perf:{poseFallbacks:0,poseQueue:[],work:[]},Bake:{q:[],touches:[],seq:0},Puppet:{}};
  const makeRig=kind=>{const rig={kind,library:new Map()};rigs.set(kind,rig);return rig;};
  R.Bake.enqueue=function(pri,name,run,data){assert.equal(this,R.Bake);let job=this.q.find(j=>j.name===name);if(job){job.pri=Math.min(job.pri,pri);return job;}job={pri,name,run,...data,seq:this.seq++};this.q.push(job);return job;};
  R.Bake.queueTouch=function(entry){assert.equal(this,R.Bake);if(!entry||entry.touched||entry._touchQueued)return;entry._touchQueued=true;this.touches.push(entry);return 'queued';};
  R.Bake.flushTouches=function(limit){assert.equal(this,R.Bake);let n=0;while(this.touches.length&&n<limit){const entry=this.touches.shift();entry._touchQueued=false;if(R.Puppet.touchEntry(entry))n++;}return n;};
  R.Puppet.wantPose=function(kind,key,pri){assert.equal(this,R.Puppet);const rig=rigs.get(kind);if(rig?.library.has(key)){R.Bake.queueTouch(rig.library.get(key));return 'already-ready';}return R.Bake.enqueue(pri,kind+':'+key,null,{kind,key,rig});};
  R.Puppet.touchEntry=function(entry){assert.equal(this,R.Puppet);if(!entry?.surface||entry.touched)return false;t+=7;ctx.drawImage(entry.surface,'touch');entry.touched=true;return true;};
  R.Puppet.draw=function(output,actor,cam,kind){
    assert.equal(this,R.Puppet);assert.equal(cam,0);
    if(actor.throw)throw new Error('draw failed');
    const rig=rigs.get(kind);if(!rig){this.wantPose(kind,'idle',0);return false;}
    output.save();let entry=rig.library.get(actor.key);
    if(!entry){R.perf.poseFallbacks++;this.wantPose(kind,actor.key,0);entry=rig.library.get('idle');}
    if(entry){output.drawImage(entry.surface,'visible',actor.key);entry.touched=true;if(actor.flash)output.drawImage(entry.surface,'flash');}
    output.restore();return true;
  };
  return {R,ctx,events,rigs,makeRig,now:()=>t,setTime:v=>{t=v;},
    raf:{requestFrame:fn=>{callbacks.set(++next,fn);return next;},cancelFrame:id=>callbacks.delete(id)},
    frame(time){t=time;const batch=[...callbacks.values()];callbacks.clear();for(const cb of batch)cb(time);},callbacks};
}
function serializedFunction(){return vm.runInNewContext('('+installReadinessProbe.toString()+')');}

test('browser serialization has no hidden module dependencies',()=>{
  const h=harness(),probe=serializedFunction()(h.R,h.now);assert.equal(probe.result().drawCalls,0);probe.restore();
});
test('install and restore preserve all original descriptors, inherited output method, and pending RAF',()=>{
  const h=harness(),objects=[h.R.Puppet,h.R.Bake],before=objects.map(Object.getOwnPropertyDescriptors);
  const probe=installReadinessProbe(h.R,h.now,h.raf);assert.equal(h.callbacks.size,1);
  const rig=h.makeRig('loial');rig.library.set('idle',{surface:'idle'});
  assert.equal(h.R.Puppet.draw(h.ctx,{key:'idle'},0,'loial'),true);
  assert.equal(Object.hasOwn(h.ctx,'drawImage'),false);
  const result=probe.result();probe.restore();probe.restore();
  assert.equal(h.callbacks.size,0);assert.equal(result.drawCalls,1);
  objects.forEach((o,i)=>assert.deepEqual(Object.getOwnPropertyDescriptors(o),before[i]));
});
test('partial installation failure rolls back prior wrappers',()=>{
  const h=harness(),draw=h.R.Puppet.draw;
  Object.defineProperty(h.R.Puppet,'wantPose',{value:h.R.Puppet.wantPose,writable:false,configurable:true});
  assert.throws(()=>installReadinessProbe(h.R,h.now),TypeError);assert.equal(h.R.Puppet.draw,draw);
});
test('priority and repeated demand calls remain distinct from unique keys and attempts',()=>{
  const h=harness(),rig=h.makeRig('loial');rig.library.set('idle',{surface:'idle'});
  const probe=installReadinessProbe(h.R,h.now);
  const job=h.R.Puppet.wantPose('loial','w0',3);assert.equal(job.pri,3);assert.equal(probe.result().uniqueDemandedKeys,0);
  h.R.Puppet.draw(h.ctx,{key:'w0'},0,'loial');h.setTime(10);h.R.Puppet.draw(h.ctx,{key:'w0',flash:true},0,'loial');
  let r=probe.result();assert.equal(job.pri,0);assert.equal(r.uniqueDemandedKeys,1);assert.equal(r.demandAttempts,1);assert.equal(r.demands[0].demandCalls,2);
  assert.equal(r.fallbackDrawCalls,2);assert.equal(r.fallbackImageBlits,3);
  h.R.Bake.q.length=0;h.setTime(15);probe.sample();r=probe.result();
  assert.equal(r.demands[0].readyMs,null,'cancellation is not readiness');assert.equal(r.demands[0].unavailableWithoutQueuedJob,true);
  const replacement=h.makeRig('loial');replacement.library.set('idle',{surface:'new-idle'});
  h.R.Puppet.draw(h.ctx,{key:'w0'},0,'loial');h.setTime(20);replacement.library.set('w0',{surface:'w0'});probe.sample();
  r=probe.result();assert.equal(r.uniqueDemandedKeys,1);assert.equal(r.demandAttempts,2);assert.equal(r.demands[0].readyMs,null);assert.equal(r.demands[1].latencyMs,5);
  assert.equal(r.demands[0].job,undefined);probe.restore();
});
test('actual fallback draw fraction excludes misses without a blit and unavailable rigs',()=>{
  const h=harness(),rig=h.makeRig('loial'),probe=installReadinessProbe(h.R,h.now);
  assert.equal(h.R.Puppet.draw(h.ctx,{key:'w0'},0,'loial'),true); // no fallback entry
  assert.equal(h.R.Puppet.draw(h.ctx,{key:'idle'},0,'missing'),false);
  rig.library.set('idle',{surface:'idle'});
  h.R.Puppet.draw(h.ctx,{key:'w0',flash:true},0,'loial');
  rig.library.set('w0',{surface:'walk'});h.R.Puppet.draw(h.ctx,{key:'w0'},0,'loial');
  const r=probe.result();assert.deepEqual([r.drawCalls,r.renderedDrawCalls,r.fallbackDrawCalls,r.fallbackMissDrawCalls,r.unavailableRigDrawCalls],[4,2,1,2,1]);
  assert.equal(r.fallbackDrawFraction,.5);assert.equal(r.fallbackPerCallFraction,.25);assert.equal(r.fallbackImageBlits,2);probe.restore();
});
test('real library readiness and touched readiness are different per-RAF observations',()=>{
  const h=harness(),rig=h.makeRig('loial');rig.library.set('idle',{surface:'idle',touched:true});
  const probe=installReadinessProbe(h.R,h.now,h.raf);probe.mark('scene-enter-start');
  h.R.Puppet.draw(h.ctx,{key:'w0'},0,'loial');h.frame(16);
  const entry={surface:'walk'};rig.library.set('w0',entry);h.R.Bake.q.length=0;h.R.Bake.queueTouch(entry);h.frame(32);
  let r=probe.result();assert.equal(r.demands[0].readyMs,32);assert.equal(r.demands[0].touchedMs,null);
  assert.equal(r.queue.touchQueueUntouched,1);assert.equal(r.queue.observedLibraryReadyUntouched,1);
  h.R.Puppet.draw(h.ctx,{key:'w0'},0,'loial');h.frame(48);r=probe.result();
  assert.equal(r.demands[0].touchedMs,48);assert.equal(r.queue.touchQueueAlreadyTouched,1);assert.equal(r.queue.touchQueueUntouched,0);
  assert.deepEqual(r.samples.filter(s=>s.phase==='raf').map(s=>s.rafTime),[16,32,48]);
  assert.deepEqual(r.samples.filter(s=>s.phase==='raf').map(s=>s.rafGapMs),[null,16,16]);
  assert.equal(r.samples[1].sinceInstallMs,16);probe.restore();
});
test('touchEntry original cost, no-op touches, queue counts and flush context are explicit',()=>{
  const h=harness(),rig=h.makeRig('loial'),entry={surface:'warm'};
  rig.library.set('idle',entry);const probe=installReadinessProbe(h.R,h.now);
  h.R.Puppet.wantPose('loial','w0',3);h.R.Bake.queueTouch(entry);h.R.Bake.queueTouch(entry);
  assert.equal(h.R.Bake.flushTouches(1),1);assert.equal(h.R.Puppet.touchEntry(entry),false);
  h.R.Puppet.wantPose('loial','idle',0); // ready, no queued job: no invented latency
  const r=probe.result();assert.equal(r.enqueueCalls,1);assert.equal(r.enqueuedJobs,1);
  assert.equal(r.queueTouchCalls,3);assert.equal(r.acceptedTouchEnqueues,1);
  assert.equal(r.touchEntryCalls,2);assert.equal(r.successfulTouchCalls,1);
  assert.equal(r.flushTouchesTimings[0].successfulTouchCalls,1);assert.equal(r.flushTouchesTimings[0].touchEntryCalls,1);assert.equal(r.touchEntryTimings[0].flushCallId,r.flushTouchesTimings[0].id);
  assert.equal(r.touchEntryTimings[0].costMs,7);assert.equal(r.touchEntryTimings[0].fromFlushTouches,true);
  assert.equal(r.touchEntryTimings[0].inTouchQueueBefore,false,'flush shifts before calling touchEntry');
  assert.equal(r.touchEntryTimings[1].touchedBefore,true);assert.equal(r.touchEntryTimings[1].costMs,0);
  assert.equal(r.demandWithoutQueuedJobCalls,1);assert.equal(r.demandAttempts,0);probe.restore();
});
test('visible draw commands, outputs, scheduler state, priorities and returns are identical',()=>{
  function run(instrumented){const h=harness(),rig=h.makeRig('loial');rig.library.set('idle',{surface:'idle'});let probe;
    if(instrumented)probe=installReadinessProbe(h.R,h.now);
    const returns=[];returns.push(h.R.Puppet.draw(h.ctx,{key:'w0',flash:true},0,'loial'));
    returns.push(h.R.Puppet.draw(h.ctx,{key:'idle'},0,'loial'));
    returns.push(h.R.Puppet.draw(h.ctx,{key:'idle'},0,'missing'));
    returns.push(h.R.Puppet.wantPose('loial','idle',0));
    probe?.restore();return {events:h.events,returns,queue:h.R.Bake.q.map(j=>({name:j.name,pri:j.pri,seq:j.seq})),fallbacks:h.R.perf.poseFallbacks,touched:rig.library.get('idle').touched};}
  assert.deepEqual(run(true),run(false));
});
test('thrown renderer calls propagate unchanged and restore output method',()=>{
  const h=harness(),probe=installReadinessProbe(h.R,h.now);
  assert.throws(()=>h.R.Puppet.draw(h.ctx,{throw:true},0,'loial'),/draw failed/);
  assert.equal(Object.hasOwn(h.ctx,'drawImage'),false);assert.equal(probe.result().thrownDrawCalls,1);probe.restore();
});
test('copied profiler preserves strict gates, two-RAF immediate boundary and raw timing arrays',()=>{
  const s=fs.readFileSync(path.join(__dirname,'performance-readiness-v11.cjs'),'utf8');
  for(const text of ['r.enterMs<400','r.fps>=59.5&&r.over33===0','if(immediate)await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));','t-start>=10000','gaps,rafTimes,frameWork,costs','await p.waitForTimeout(2000)'])assert.ok(s.includes(text),text);
  assert.ok(s.indexOf('window.__rwbReadiness=window.__rwbInstallReadinessProbe')<s.indexOf('s=new R.scenes.Play'));
  assert.ok(s.includes('probe?.restore();delete window.__rwbReadiness;'));
});
console.log(JSON.stringify({status:'pass',controlledTests:passed,browserRuns:0,nativeVerification:'unrun'}));
