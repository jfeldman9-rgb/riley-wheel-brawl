'use strict';
// Standalone browser-serializable diagnostic. Never drives the scheduler or renderer.
// Based on ../pose-readiness-instrumentation/readiness-probe.cjs.
function installReadinessProbe(R, now, options = {}) {
  if (!R?.Puppet || !R?.Bake || !R?.perf) throw Error('Readiness probe requires Puppet, Bake and perf');
  const requested = new Map(), names = new Set(), rigs = new Set(), entries = new Map();
  const restores = [], samples = [], markers = [], touchCalls = [], flushCalls = [];
  const installedMs = now();
  let active = true, rafId = null, flushDepth = 0, currentFlushId = null, previousRaf = null;
  const counts = {drawCalls:0, renderedDrawCalls:0, fallbackDrawCalls:0,
    fallbackMissDrawCalls:0, fallbackIncrements:0, unavailableRigDrawCalls:0,
    thrownDrawCalls:0, unobservableDrawCalls:0, visibleImageBlits:0, fallbackImageBlits:0,
    demandPriority0Calls:0, demandWithoutQueuedJobCalls:0,
    enqueueCalls:0, enqueuedJobs:0, queueTouchCalls:0, acceptedTouchEnqueues:0,
    flushTouchesCalls:0, touchEntryCalls:0, successfulTouchCalls:0};
  const overhead = {sampleCalls:0, sampleMs:0, sampleMaxMs:0, wrapperSelfMs:0, wrapperSelfCalls:0};
  function selfTime(start, innerMs) {
    overhead.wrapperSelfMs += Math.max(0, now() - start - innerMs);
    overhead.wrapperSelfCalls++;
  }
  function remember(entry) {
    if (entry && typeof entry === 'object' && !entries.has(entry)) entries.set(entry, entries.size + 1);
    return entries.get(entry) || null;
  }
  function replace(object, key, factory) {
    if (typeof object?.[key] !== 'function') return;
    const descriptor = Object.getOwnPropertyDescriptor(object, key), original = object[key];
    const wrapped = factory(original);
    object[key] = wrapped;
    if (object[key] !== wrapped) throw Error('Cannot instrument ' + key);
    restores.push(() => { if (descriptor) Object.defineProperty(object, key, descriptor); else delete object[key]; });
  }
  // Actual image submissions are observed within Puppet.draw. A miss counter can
  // rise without a fallback surface, so it alone is NOT a fallback draw.
  try {
  replace(R.Puppet, 'draw', original => function(...args) {
    const start = now(), before = R.perf.poseFallbacks || 0, ctx = args[0];
    counts.drawCalls++;
    let innerMs = 0, imageBlits = 0, fallbackBlits = 0, resetImage = null;
    if (ctx && typeof ctx.drawImage === 'function') {
      const imageOriginal = ctx.drawImage, descriptor = Object.getOwnPropertyDescriptor(ctx, 'drawImage');
      const imageWrapper = function(...imageArgs) {
        const at = now(), innerAt = now();
        let innerMs = 0;
        try {
          const result = imageOriginal.apply(this, imageArgs);
          innerMs = now() - innerAt;
          imageBlits++;
          if ((R.perf.poseFallbacks || 0) > before) fallbackBlits++;
          return result;
        } finally { selfTime(at, innerMs || now() - innerAt); }
      };
      ctx.drawImage = imageWrapper;
      if (ctx.drawImage !== imageWrapper) throw Error('Cannot observe output drawImage');
      resetImage = () => { if (descriptor) Object.defineProperty(ctx, 'drawImage', descriptor); else delete ctx.drawImage; };
    } else counts.unobservableDrawCalls++;
    const innerAt = now();
    try {
      const result = original.apply(this, args);
      if (result === false) counts.unavailableRigDrawCalls++;
      return result;
    } catch (error) { counts.thrownDrawCalls++; throw error; }
    finally {
      innerMs = now() - innerAt;
      if (resetImage) resetImage();
      const increment = Math.max(0, (R.perf.poseFallbacks || 0) - before);
      if (increment) counts.fallbackMissDrawCalls++;
      if (imageBlits) counts.renderedDrawCalls++;
      if (fallbackBlits) counts.fallbackDrawCalls++;
      counts.fallbackIncrements += increment;
      counts.visibleImageBlits += imageBlits;
      counts.fallbackImageBlits += fallbackBlits;
      selfTime(start, innerMs);
    }
  });
  replace(R.Puppet, 'wantPose', original => function(kind, key, pri) {
    const start = now(), innerAt = now();
    let innerMs;
    try { return original.apply(this, arguments); }
    finally {
      innerMs = now() - innerAt;
      if (pri === 0) {
        counts.demandPriority0Calls++;
        const job = R.Bake.q.find(j => j.kind === kind && j.key === key);
        if (job) {
          let row = requested.get(job);
          if (!row) {
            row = {attempt:requested.size+1,kind,key,firstDemandMs:start,lastDemandMs:start,
              demandCalls:0,readyMs:null,touchedMs:null,job};
            requested.set(job,row); names.add(JSON.stringify([kind,key]));
          }
          row.lastDemandMs = start; row.demandCalls++;
          if (job.rig) rigs.add(job.rig);
        } else counts.demandWithoutQueuedJobCalls++;
      }
      selfTime(start, innerMs);
    }
  });
  replace(R.Bake, 'enqueue', original => function(...args) {
    const start = now(), before = R.Bake.q.length, innerAt = now();
    try { return original.apply(this,args); }
    finally {
      const innerMs = now()-innerAt;
      counts.enqueueCalls++; counts.enqueuedJobs += Math.max(0,R.Bake.q.length-before);
      selfTime(start,innerMs);
    }
  });
  replace(R.Bake, 'queueTouch', original => function(entry) {
    const start = now(), before = R.Bake.touches?.length || 0;
    remember(entry); const innerAt = now();
    try { return original.apply(this,arguments); }
    finally {
      const innerMs = now()-innerAt;
      counts.queueTouchCalls++;
      counts.acceptedTouchEnqueues += Math.max(0,(R.Bake.touches?.length || 0)-before);
      selfTime(start,innerMs);
    }
  });
  replace(R.Bake, 'flushTouches', original => function(...args) {
    const start = now(), parentFlushId=currentFlushId;
    const id=++counts.flushTouchesCalls, touchBefore=counts.touchEntryCalls, successBefore=counts.successfulTouchCalls;
    const row={id,parentFlushId,atMs:start,limitMs:args[0]??null,result:null,threw:false};
    flushDepth++; currentFlushId=id;
    const innerAt = now(); let innerMs=null;
    try { const result=original.apply(this,args); innerMs=now()-innerAt; row.result=typeof result==='number'?result:null; return result; }
    catch(error) { row.threw=true; throw error; }
    finally {
      row.costMs=innerMs===null?now()-innerAt:innerMs;
      row.touchEntryCalls=counts.touchEntryCalls-touchBefore;
      row.successfulTouchCalls=counts.successfulTouchCalls-successBefore;
      flushCalls.push(row); flushDepth--; currentFlushId=parentFlushId; selfTime(start,row.costMs);
    }
  });
  replace(R.Puppet, 'touchEntry', original => function(entry) {
    const start = now(), id = remember(entry);
    const row = {atMs:start,entryId:id,fromFlushTouches:flushDepth>0,flushCallId:currentFlushId,
      touchedBefore:!!entry?.touched,hasSurface:!!entry?.surface,
      queuedFlagBefore:!!entry?._touchQueued,
      inTouchQueueBefore:!!R.Bake.touches?.includes(entry),result:null,threw:false};
    counts.touchEntryCalls++;
    const innerAt = now();
    let innerMs = null;
    try {
      const result = original.apply(this,arguments);
      innerMs = now()-innerAt;
      row.result = result === true;
      if (result === true) counts.successfulTouchCalls++;
      return result;
    } catch (error) { row.threw=true; throw error; }
    finally {
      row.costMs = innerMs === null ? now()-innerAt : innerMs; row.touchedAfter=!!entry?.touched;
      touchCalls.push(row); selfTime(start,row.costMs);
    }
  });
  } catch (error) {
    for (const reset of restores.reverse()) reset();
    throw error;
  }
  function queueState() {
    const q = R.Bake.q || [], touches = R.Bake.touches || [];
    for (const job of q) if (job.rig) rigs.add(job.rig);
    for (const row of requested.values()) if (row.job.rig) rigs.add(row.job.rig);
    const libraryEntries = new Set(); let libraryKeys=0;
    for (const rig of rigs) if (rig.library) for (const entry of rig.library.values()) {
      libraryKeys++; if (entry) libraryEntries.add(entry); remember(entry);
    }
    for (const entry of touches) remember(entry);
    const pri = {}; for (const job of q) pri[String(job.pri)] = (pri[String(job.pri)]||0)+1;
    return {
      bakeJobs:q.length,bakeJobsByPriority:pri,priority0Jobs:q.filter(j=>j.pri===0).length,
      bakeJobsAlreadyLibraryReady:q.filter(j=>j.rig?.library?.has(j.key)).length,
      bakeJobsAlreadyTouched:q.filter(j=>j.rig?.library?.get(j.key)?.touched).length,
      poseQueueItems:R.perf.poseQueue?.length||0,
      touchQueueItems:touches.length,touchQueueUntouched:touches.filter(e=>e?.surface&&!e.touched).length,
      touchQueueAlreadyTouched:touches.filter(e=>e?.touched).length,
      touchQueueWithoutSurface:touches.filter(e=>!e?.surface).length,
      observedLibraryKeys:libraryKeys,observedLibraryEntries:libraryEntries.size,
      observedLibraryReadyUntouched:[...libraryEntries].filter(e=>e.surface&&!e.touched).length,
      observedLibraryTouched:[...libraryEntries].filter(e=>e.touched).length,
      observedLibraryReadyNotTouchQueued:[...libraryEntries].filter(e=>e.surface&&!e.touched&&!touches.includes(e)).length,
      observedEntries:entries.size
    };
  }
  function sample(rafTime = null, phase = 'manual') {
    if (!active) return;
    const start = now();
    for (const row of requested.values()) {
      // Queue removal/cancellation alone can never satisfy readiness.
      const lib = row.job.rig?.library;
      if (row.readyMs === null && lib?.has(row.key)) row.readyMs = start;
      if (row.touchedMs === null && lib?.get(row.key)?.touched) row.touchedMs = start;
    }
    const state=queueState(), at=now();
    const row={atMs:start,sinceInstallMs:start-installedMs,rafTime,
      rafGapMs:rafTime!==null&&previousRaf!==null?rafTime-previousRaf:null,
      phase,...state,counts:{...counts},
      frameWork:R.perf.work?.length?{...R.perf.work[R.perf.work.length-1]}:null,
      observerCostMs:at-start};
    if (rafTime!==null) previousRaf=rafTime;
    samples.push(row); overhead.sampleCalls++; overhead.sampleMs+=row.observerCostMs;
    overhead.sampleMaxMs=Math.max(overhead.sampleMaxMs,row.observerCostMs);
    return row;
  }
  function mark(label, atMs = now()) { markers.push({label,atMs,sinceInstallMs:atMs-installedMs,counts:{...counts}}); }
  function result() {
    return {
      method:'Priority-0 wantPose demands matched to real queued jobs; actual job.rig.library.has(key) readiness, sampled per RAF. Fallback draws require a counter increment AND an output drawImage submission in the same Puppet.draw call.',
      limitations:'Observer wrappers, output drawImage interposition, timing reads, queue/library scans and result allocation have overhead. Report is instrumented; do not subtract measured overhead from gates. Visible image submissions are not proof of physical display presentation. Library counts cover observed job rigs/entries, not inaccessible global caches. No-job priority-0 calls are counted separately without invented latency. Maps/Sets strongly retain observed jobs, rigs and entries until restore; do not use this run for unqualified GC/cache-lifetime/memory conclusions.',
      installedMs,...counts,
      fallbackDrawFraction:counts.renderedDrawCalls?counts.fallbackDrawCalls/counts.renderedDrawCalls:null,
      fallbackDrawFractionDenominator:'renderedDrawCalls: Puppet.draw calls with at least one successful output drawImage submission',
      fallbackPerCallFraction:counts.drawCalls?counts.fallbackDrawCalls/counts.drawCalls:null,
      uniqueDemandedKeys:names.size,demandAttempts:requested.size,
      demands:[...requested.values()].map(({job,...row})=>({...row,
        latencyMs:row.readyMs===null?null:row.readyMs-row.firstDemandMs,
        touchedLatencyMs:row.touchedMs===null?null:row.touchedMs-row.firstDemandMs,
        currentlyQueued:R.Bake.q.includes(job),
        unavailableWithoutQueuedJob:row.readyMs===null&&!R.Bake.q.includes(job)})),
      queue:queueState(),samples:samples.map(s=>({...s,counts:{...s.counts}})),
      markers:markers.map(m=>({...m,counts:{...m.counts}})),flushTouchesTimings:flushCalls.map(f=>({...f})),touchEntryTimings:touchCalls.map(t=>({...t})),
      observerTiming:{...overhead,scope:'wrapperSelfMs is diagnostic bookkeeping outside wrapped callees plus drawImage wrapper bookkeeping. Nested wrapped calls count only their own envelopes. Timer granularity/allocation and result/restore overhead are not a complete perturbation estimate.'}
    };
  }
  function restore() {
    if (!active) return;
    active=false;
    if (rafId!==null && options.cancelFrame) options.cancelFrame(rafId);
    for (const reset of restores.reverse()) reset();
    requested.clear(); names.clear(); rigs.clear(); entries.clear();
    samples.length=0; markers.length=0; touchCalls.length=0; flushCalls.length=0;
  }
  sample(null,'installed');
  if (options.requestFrame) {
    if (!options.cancelFrame) { restore(); throw Error('cancelFrame is required with requestFrame'); }
    const tick = t => { if (!active) return; sample(t,'raf'); rafId=options.requestFrame(tick); };
    rafId=options.requestFrame(tick);
  }
  return {sample,mark,result,restore};
}
module.exports={installReadinessProbe};
