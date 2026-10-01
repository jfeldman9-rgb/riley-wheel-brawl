'use strict';
// Browser-serializable, additive diagnostic. It never drives or flushes rendering.
function installStartupProbe(world, options = {}) {
  const now = () => world.performance.now();
  const maxEvents = Number.isInteger(options.maxEvents) && options.maxEvents > 0 ? options.maxEvents : 12000;
  const slowMs = 1; // Diagnostic detail selection only; never an acceptance gate.
  const events = [], restores = [], features = {}, failures = [];
  const paints = new WeakMap();
  const jobs = new WeakSet(), responses = new WeakMap(), bytes = new WeakMap(), buffers = new WeakMap();
  const then = world.Promise.prototype.then;
  let active = true, overflow = false, droppedEvents = 0, sequence = 0, entity = 0;
  let currentStep = null, attached = null, wrappedJobs = 0, observerFaults = 0;
  const installedAtMs = now();
  features.performanceMark = typeof world.performance.mark === 'function';
  function valid() { return active && !overflow; }
  function basename(value) {
    if (typeof value !== 'string') return null;
    if (/^(data|blob):/.test(value)) return '[' + value.split(':')[0] + ']';
    return value.split(/[?#]/)[0].split(/[\\/]/).pop().slice(0, 160) || null;
  }
  function phase(job) { return job && job.state ? job.state.phase || null : null; }
  function safe(fn) {
    try { return fn(); } catch (_) { observerFaults++; return undefined; }
  }
  function emit(type, data) {
    if (!active) return;
    if (overflow || events.length >= maxEvents) { overflow = true; droppedEvents++; return; }
    events.push(Object.assign({seq: ++sequence, type, atMs: now()}, data));
  }
  function scope() { return currentStep ? {stepId: currentStep.id, job: currentStep.job.name || null, phase: phase(currentStep.job)} : {}; }
  function replace(object, key, factory, label) {
    if (!object || typeof object[key] !== 'function') { features[label || key] = false; return; }
    const original = object[key], descriptor = Object.getOwnPropertyDescriptor(object, key);
    const wrapped = factory(original);
    try {
      Object.defineProperty(object, key, descriptor ? Object.assign({}, descriptor, {value: wrapped}) : {value: wrapped, configurable: true, writable: true});
      restores.push(() => {
        if (object[key] !== wrapped) return; // Do not overwrite a later application replacement.
        if (descriptor) Object.defineProperty(object, key, descriptor); else delete object[key];
      });
      features[label || key] = true;
    } catch (error) { features[label || key] = false; failures.push('Cannot wrap ' + (label || key)); }
  }
  // Observe the original Promise without replacing it or inserting await/then into
  // the application's chain. Side observers still add microtasks: timing is diagnostic.
  function observe(promise, fulfilled, rejected) {
    if (!promise || typeof promise.then !== 'function') return;
    safe(() => then.call(promise, value => { if (active) safe(() => fulfilled(value)); }, error => { if (active) safe(() => rejected && rejected(error)); }));
  }
  function imageInfo(image) {
    if (!image || typeof image !== 'object') return {};
    return {source: basename(image.currentSrc || image.src), width: image.width || null, height: image.height || null};
  }
  function bufferInfo(buffer) {
    if (!buffer) return {};
    return {decodeId: buffers.get(buffer) || null, duration: buffer.duration, length: buffer.length,
      sampleRate: buffer.sampleRate, channels: buffer.numberOfChannels};
  }
  replace(world, 'createImageBitmap', original => function(...args) {
    if (!valid()) return original.apply(this, args);
    const id = ++entity, start = now(), owner = scope();
    safe(() => emit('bitmap-call', Object.assign({id, source: imageInfo(args[0]), resize: args.length === 2 ? {
      width: args[1]?.resizeWidth, height: args[1]?.resizeHeight, quality: args[1]?.resizeQuality} : null}, owner)));
    let promise;
    const nativeStart = now();
    try { promise = original.apply(this, args); }
    catch (error) { emit('bitmap-throw', {id, syncMs: now() - nativeStart}); throw error; }
    emit('bitmap-return', {id, syncMs: now() - nativeStart});
    observe(promise, image => emit('bitmap-settled', {id, ok: true, elapsedMs: now() - start, width: image.width, height: image.height}),
      () => emit('bitmap-settled', {id, ok: false, elapsedMs: now() - start}));
    return promise;
  }, 'createImageBitmap');
  replace(world, 'fetch', original => function(...args) {
    if (!valid()) return original.apply(this, args);
    const id = ++entity, source = basename(typeof args[0] === 'string' ? args[0] : args[0]?.url), start = now();
    emit('fetch-call', Object.assign({id, source}, scope()));
    let promise;
    const nativeStart = now();
    try { promise = original.apply(this, args); }
    catch (error) { emit('fetch-throw', {id, syncMs: now() - nativeStart}); throw error; }
    emit('fetch-return', {id, syncMs: now() - nativeStart});
    observe(promise, response => { responses.set(response, {id, source}); emit('fetch-settled', {id, source, ok: response.ok, status: response.status, elapsedMs: now() - start}); },
      () => emit('fetch-settled', {id, source, ok: false, elapsedMs: now() - start}));
    return promise;
  }, 'fetch');
  replace(world.Response?.prototype, 'arrayBuffer', original => function(...args) {
    if (!valid()) return original.apply(this, args);
    const id = ++entity, origin = responses.get(this) || {source: basename(this.url)}, start = now();
    emit('bytes-call', {id, fetchId: origin.id || null, source: origin.source});
    let promise;
    const nativeStart = now();
    try { promise = original.apply(this, args); }
    catch (error) { emit('bytes-throw', {id, syncMs: now() - nativeStart}); throw error; }
    emit('bytes-return', {id, syncMs: now() - nativeStart});
    observe(promise, data => { bytes.set(data, {id, source: origin.source}); emit('bytes-settled', {id, ok: true, byteLength: data.byteLength, elapsedMs: now() - start}); },
      () => emit('bytes-settled', {id, ok: false, elapsedMs: now() - start}));
    return promise;
  }, 'Response.arrayBuffer');
  // BaseAudioContext owns decodeAudioData in Chromium; use AudioContext as fallback.
  const audioProto = world.BaseAudioContext?.prototype || world.AudioContext?.prototype || world.webkitAudioContext?.prototype;
  replace(audioProto, 'decodeAudioData', original => function(...args) {
    if (!valid()) return original.apply(this, args);
    const id = ++entity, start = now(), origin = bytes.get(args[0]) || {}, inputLength = args[0]?.byteLength;
    emit('audio-decode-call', {id, bytesId: origin.id || null, source: origin.source || null, byteLength: inputLength, audioTime: this.currentTime});
    for (const index of [1, 2]) if (typeof args[index] === 'function') {
      const callback = args[index];
      args[index] = function(...callbackArgs) {
        if (active) safe(() => {
          if (index === 1 && callbackArgs[0]) buffers.set(callbackArgs[0], id);
          emit('audio-decode-callback', {id, ok: index === 1, elapsedMs: now() - start});
        });
        const callbackStart = now();
        try { return callback.apply(this, callbackArgs); }
        finally { if (active) safe(() => emit('audio-decode-callback-return', {id, ok: index === 1, callbackMs: now() - callbackStart})); }
      };
    }
    let promise;
    const nativeStart = now();
    try { promise = original.apply(this, args); }
    catch (error) { emit('audio-decode-throw', {id, syncMs: now() - nativeStart}); throw error; }
    emit('audio-decode-return', {id, syncMs: now() - nativeStart});
    observe(promise, buffer => { if (buffer) buffers.set(buffer, id); emit('audio-decode-settled', Object.assign({id, ok: true, elapsedMs: now() - start}, bufferInfo(buffer))); },
      () => emit('audio-decode-settled', {id, ok: false, elapsedMs: now() - start}));
    return promise;
  }, 'decodeAudioData');
  replace(world.AudioBufferSourceNode?.prototype, 'start', original => function(...args) {
    if (!valid()) return original.apply(this, args);
    const start = now(), id = ++entity;
    safe(() => emit('audio-source-start', Object.assign({id, audioTime: this.context?.currentTime, scheduledAt: args[0], offset: args[1], loop: !!this.loop}, bufferInfo(this.buffer))));
    const nativeStart = now();
    try { return original.apply(this, args); }
    finally { emit('audio-source-start-return', {id, syncMs: now() - nativeStart}); }
  }, 'AudioBufferSourceNode.start');
  replace(world.HTMLCanvasElement?.prototype, 'getContext', original => function(...args) {
    if (!valid() || !currentStep || args[0] !== '2d') return original.apply(this, args);
    const start = now();
    try { return original.apply(this, args); }
    finally { safe(() => emit('canvas-context', Object.assign({width: this.width, height: this.height,
      willReadFrequently: !!args[1]?.willReadFrequently, syncMs: now() - start}, scope()))); }
  }, 'canvas.getContext');
  function atom(ctx, operation, args, job) {
    const stage = phase(job);
    if (stage === 'flat') return 'pose-flat:' + operation;
    if (stage === 'rast') return 'pose-raster:' + operation;
    if (stage !== 'rig') return String(stage) + ':' + operation;
    if (operation === 'fillRect' && ctx.globalCompositeOperation === 'source-atop') return 'rig-shade:fillRect';
    if (ctx.canvas?.width === 64 && ctx.canvas?.height === 96) return 'rig-alpha:' + operation;
    if (operation === 'getImageData') {
      if (args[2] === 1) return 'rig-' + (paints.get(ctx) || 'unknown') + ':strip-readback';
      return 'rig-pixels:getImageData';
    }
    return 'rig:' + operation;
  }
  function detail(ctx, operation, args) {
    const row = {operation, phase: phase(currentStep.job), width: ctx.canvas?.width, height: ctx.canvas?.height};
    if (operation === 'drawImage') { row.source = imageInfo(args[0]); row.rect = args.slice(1).filter(n => typeof n === 'number'); }
    else row.rect = args.filter(n => typeof n === 'number');
    if (operation === 'fillRect') row.composite = ctx.globalCompositeOperation;
    return row;
  }
  for (const operation of ['drawImage', 'getImageData', 'fillRect', 'putImageData']) {
    replace(world.CanvasRenderingContext2D?.prototype, operation, original => function(...args) {
      if (!valid() || !currentStep) return original.apply(this, args);
      const step = currentStep, key = safe(() => atom(this, operation, args, currentStep.job)) || operation, start = now();
      try { return original.apply(this, args); }
      finally {
        const ms = now() - start;
        safe(() => {
          if (operation === 'drawImage') paints.set(this, 'copy');
          else if (operation === 'fillRect') paints.set(this, this.globalCompositeOperation === 'source-atop' ? 'shade' : 'fill');
          const row = step.ops[key] || (step.ops[key] = {calls: 0, totalMs: 0, maxMs: 0});
          row.calls++; row.totalMs += ms; row.maxMs = Math.max(row.maxMs, ms);
          if (ms >= slowMs) {
            step.slowOpCount++;
            if (step.firstSlowOps.length < 8) step.firstSlowOps.push(Object.assign({atMs: start, ms, atom: key}, detail(this, operation, args)));
          }
        });
      }
    }, 'canvas.' + operation);
  }
  function wrapJob(job) {
    if (!job || jobs.has(job) || typeof job.run !== 'function' || !valid()) return;
    if (wrappedJobs >= 1024) { overflow = true; droppedEvents++; return; }
    jobs.add(job); wrappedJobs++;
    replace(job, 'run', original => function(...args) {
      if (!valid()) return original.apply(this, args);
      const parent = currentStep, start = now(), id = ++entity;
      const step = {id, job, ops: {}, firstSlowOps: [], slowOpCount: 0};
      const before = phase(job), readyBefore = typeof job.ready === 'function', deadline = args[1];
      currentStep = step;
      let result, threw = true;
      try { result = original.apply(this, args); threw = false; return result; }
      finally {
        const end = now(); currentStep = parent;
        safe(() => emit('job-step', {id, parentStepId: parent?.id || null, job: job.name || null,
          priority: job.pri, phaseBefore: before, phaseAfter: phase(job), hasRig: !!job.rig,
          readyPredicateBefore: readyBefore, readyPredicateAfter: typeof job.ready === 'function',
          startMs: start, endMs: end, syncMs: end - start,
          deadlineMs: Number.isFinite(deadline) ? deadline : null, done: !threw && result !== false, threw,
          canvas: step.ops, slowOpCount: step.slowOpCount, firstSlowOps: step.firstSlowOps}));
      }
    }, 'job.run');
  }
  function attachR(R) {
    if (attached === R) return;
    if (attached) throw Error('Startup probe already attached to another runtime');
    if (!R?.Bake || !R?.audio) throw Error('Startup probe requires Bake and audio');
    attached = R;
    for (const job of R.Bake.q || []) wrapJob(job);
    replace(R.Bake, 'enqueue', original => function(...args) {
      const result = original.apply(this, args);
      safe(() => wrapJob(result));
      return result;
    }, 'Bake.enqueue');
    for (const method of ['playMusic', 'markFirstVisibleFrame', 'loadTrack', 'loadClip']) {
      replace(R.audio, method, original => function(...args) {
        if (!valid()) return original.apply(this, args);
        const id = ++entity, start = now();
        emit('audio-api-call', {id, method, name: typeof args[0] === 'string' ? args[0] : null});
        try { return original.apply(this, args); }
        finally { emit('audio-api-return', {id, method, syncMs: now() - start}); }
      }, 'audio.' + method);
    }
    if (Array.isArray(R.audio.trace)) replace(R.audio.trace, 'push', original => function(...args) {
      const result = original.apply(this, args);
      if (valid()) safe(() => { for (const row of args) emit('audio-trace', {name: typeof row?.name === 'string' ? row.name : null, audioTime: row?.t}); });
      return result;
    }, 'audio.trace.push');
    emit('runtime-attached', {existingJobs: R.Bake.q?.length || 0});
  }
  function mark(label, extra = {}) {
    if (!valid()) return;
    label = String(label).slice(0, 160);
    const data = {};
    for (const [key, value] of Object.entries(extra)) if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) data[key] = value;
    emit('marker', {label, detail: data});
    if (valid() && features.performanceMark) safe(() => world.performance.mark('rwb-s4:' + label));
  }
  function snapshot() {
    const audio = attached?.audio;
    return {schemaVersion: 1, installedAtMs, snapshotAtMs: now(), timebase: 'performance.now() milliseconds; audioTime is AudioContext seconds',
      active, complete: !overflow && !observerFaults && !failures.length, overflow, droppedEvents, observerFaults,
      maxEvents, wrappedJobs, features: {...features}, failures: failures.slice(), events: JSON.parse(JSON.stringify(events)),
      audio: audio ? {song: audio.song, musicLevel: audio.musicLevel, playing: audio.playing,
        track: audio.track ? {name: audio.track.name, loaded: audio.track.loaded, playing: audio.track.playing, source: basename(audio.track.url)} : null,
        trace: (audio.trace || []).slice(-64).map(row => ({name: row.name, audioTime: row.t}))} : null,
      limitations: ['Instrumented diagnostic only; native wrappers, timing reads, bounded records and Promise side observers perturb timing.',
        'Native return values, thrown values, receiver, arguments and returned Promise identity are preserved. Callback wrappers preserve application callback order but add timing work and change callback identity.',
        'job.state.phase cannot expose private advanceRig state. Bitmap/native Canvas atoms and composite/rect details discriminate texture copy, shade/readback and pose raster.',
        'No new readbacks, flushes, RAF callbacks, scheduler changes, drains or pixel access are performed by the probe.',
        'API elapsed time does not prove CPU usage or worker/compositor causality. Deferred raster/host attribution requires the bounded CDP trace.',
        'The probe retains wrapped jobs until restore; do not infer uninstrumented GC or memory behavior.',
        'Missing features are reported separately. Overflow, observer faults or installation failures invalidate completeness; do not treat truncated capture as absence of work.']};
  }
  function restore() {
    if (!active) return;
    active = false;
    for (let i = restores.length - 1; i >= 0; i--) safe(restores[i]);
    restores.length = 0; currentStep = null;
  }
  return {attachR, mark, snapshot, restore};
}
module.exports = {installStartupProbe};
