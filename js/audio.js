/* Engine audio: procedural WebAudio buses (master / music+duck / sfx+compressor),
   synth primitives (tone, noise, formant, brass), a tiny 16-step sequencer,
   an optional sample player for recorded files, and a cue trace for tests.
   No audio files required. Content registers its own cues, songs, stingers
   and voices with defineSfx / defineSong / defineStinger / defineVoice. */
'use strict';

RWB.audio = (function () {
  let ctx = null, master = null, musicGain = null, duckGain = null, sfxGain = null, comp = null, voiceGain = null, trackGain = null, speechDuckGain = null;
  let muted = false;
  let unlocked = false;
  let volume = 1; // 0..1, multiplied into the master gain
  let musicLevel = 1; // 0..1, the music bus only
  const MUSIC_BASE = 0.32;
  const TRACK_BASE = 0.35;
  let lastMusicOn = 1; // level M restores
  let duckUntil = 0, duckDepth = 1;

  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8 * volume; master.connect(ctx.destination);
      // Music: level -> duck -> master. The duck stage dips under big hits and barks.
      speechDuckGain = ctx.createGain(); speechDuckGain.gain.value = 1; speechDuckGain.connect(master);
      duckGain = ctx.createGain(); duckGain.gain.value = 1; duckGain.connect(speechDuckGain);
      musicGain = ctx.createGain(); musicGain.gain.value = MUSIC_BASE * musicLevel; musicGain.connect(duckGain);
      // Recorded music track: its own level (TRACK_BASE, about 0.35) into the same duck stage.
      trackGain = ctx.createGain(); trackGain.gain.value = TRACK_BASE * musicLevel; trackGain.connect(duckGain);
      // Voice clips skip the SFX compressor so hits don't pump the speech.
      voiceGain = ctx.createGain(); voiceGain.gain.value = 1; voiceGain.connect(master);
      // SFX get a fast compressor so stacked hits punch instead of clipping.
      sfxGain = ctx.createGain(); sfxGain.gain.value = 1.05;
      if (ctx.createDynamicsCompressor) {
        comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 4.5;
        comp.attack.value = 0.002; comp.release.value = 0.14;
        sfxGain.connect(comp); comp.connect(master);
      } else sfxGain.connect(master);
    } catch (e) { ctx = null; }
  }

  /** Dip the music bus: depth is the gain to fall to (0..1). */
  function duck(depth, hold, release) {
    if (!ctx || !duckGain) return;
    const now = ctx.currentTime;
    depth = Math.max(0.05, Math.min(1, depth == null ? 0.5 : depth));
    hold = hold == null ? 0.18 : hold;
    release = release == null ? 0.45 : release;
    // A shallower duck never cuts a deeper one short.
    if (now < duckUntil && depth > duckDepth) return;
    const g = duckGain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(depth, now + 0.025);
    g.setValueAtTime(depth, now + 0.025 + hold);
    g.linearRampToValueAtTime(1, now + 0.025 + hold + release);
    duckUntil = now + 0.025 + hold; duckDepth = depth;
  }
  // Speech has its own duck stage. A short impact/stinger must never replace the
  // long speech envelope and bring music back up in the middle of a sentence.
  function duckSpeech(duration) {
    if (!ctx || !speechDuckGain) return;
    const now = ctx.currentTime, g = speechDuckGain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0.42, now + 0.025);
    g.setValueAtTime(0.42, now + Math.max(0.025, duration));
    g.linearRampToValueAtTime(1, now + Math.max(0.025, duration) + 0.45);
  }
  function releaseSpeechDuck() {
    if (!ctx || !speechDuckGain) return;
    const now = ctx.currentTime, g = speechDuckGain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(1, now + 0.12);
  }
  function setMusicLevel(v) {
    const was = musicLevel;
    musicLevel = v < 0 ? 0 : v > 1 ? 1 : v;
    if (musicLevel > 0) lastMusicOn = musicLevel;
    if (musicGain) musicGain.gain.value = MUSIC_BASE * musicLevel;
    if (trackGain) trackGain.gain.value = TRACK_BASE * musicLevel;
    // Off stops the track (no silent decoding); on picks it back up where it was.
    if (musicLevel <= 0 && was > 0) pauseTrack();
    else if (musicLevel > 0 && was <= 0 && requested) playMusic(requested);
    return musicLevel;
  }
  const MUSIC_STEPS = [1, 0.7, 0.4, 0];
  function cycleMusic(dir) {
    let i = 0, best = 99;
    MUSIC_STEPS.forEach((s, n) => { const d = Math.abs(s - musicLevel); if (d < best) { best = d; i = n; } });
    i = (i + (dir || 1) + MUSIC_STEPS.length) % MUSIC_STEPS.length;
    return setMusicLevel(MUSIC_STEPS[i]);
  }
  /** M key: music on/off, keeping the chosen level for when it comes back. */
  function toggleMusic() { return setMusicLevel(musicLevel > 0 ? 0 : (lastMusicOn || 1)); }
  function musicLabel() { return musicLevel <= 0 ? 'OFF' : Math.round(musicLevel * 100) + '%'; }

  // The same cue fired twice inside one frame just stacks volume; drop it.
  const lastFired = {};
  function gate(name, ms) {
    if (!ctx) return false;
    const now = ctx.currentTime * 1000;
    if (lastFired[name] != null && now - lastFired[name] < (ms || 28)) return false;
    lastFired[name] = now;
    return true;
  }
  const vary = (f, amt) => f * (1 + (Math.random() * 2 - 1) * (amt || 0.05));

  function unlock() {
    init();
    if (!ctx) return;
    if (ctx.state === 'suspended') { const p = ctx.resume(); if (p && p.then) p.then(() => { if (requested) playMusic(requested); }, () => {}); }
    unlocked = true;
  }

  function applyMaster() {
    if (master) master.gain.value = muted || volume <= 0 ? 0 : 0.8 * volume;
  }
  function setMuted(m) {
    muted = m;
    applyMaster();
  }
  function toggleMute() { setMuted(!muted); return muted; }
  function setVolume(v) {
    volume = v < 0 ? 0 : v > 1 ? 1 : v;
    if (volume <= 0) muted = true;
    else if (muted && volume > 0) muted = false;
    applyMaster();
    return volume;
  }
  const VOLUME_STEPS = [1, 0.65, 0.35, 0];
  function cycleVolume(dir) {
    let i = 0, best = 99;
    VOLUME_STEPS.forEach((s, n) => { const d = Math.abs(s - (muted ? 0 : volume)); if (d < best) { best = d; i = n; } });
    i = (i + (dir || 1) + VOLUME_STEPS.length) % VOLUME_STEPS.length;
    setVolume(VOLUME_STEPS[i]);
    return VOLUME_STEPS[i];
  }
  function volumeLabel() {
    if (muted || volume <= 0) return 'OFF';
    return Math.round(volume * 100) + '%';
  }

  /* ---------- SFX primitives ---------- */
  function tone(opts) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + (opts.delay || 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = opts.type || 'square';
    o.frequency.setValueAtTime(opts.f0 || 440, t0);
    if (opts.f1 !== undefined) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.f1), t0 + (opts.dur || 0.1));
    const v = opts.vol || 0.3;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(v, t0 + (opts.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (opts.dur || 0.1));
    o.connect(g); g.connect(opts.dest || sfxGain);
    o.start(t0); o.stop(t0 + (opts.dur || 0.1) + 0.02);
  }

  let noiseBuf = null;
  function getNoise() {
    if (noiseBuf) return noiseBuf;
    const len = ctx.sampleRate * 1.5;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }
  function noise(opts) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + (opts.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = getNoise();
    const filt = ctx.createBiquadFilter();
    filt.type = opts.filter || 'lowpass';
    filt.frequency.setValueAtTime(opts.f0 || 1000, t0);
    if (opts.f1 !== undefined) filt.frequency.exponentialRampToValueAtTime(Math.max(30, opts.f1), t0 + (opts.dur || 0.2));
    filt.Q.value = opts.q || 1;
    const g = ctx.createGain();
    const v = opts.vol || 0.3;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(v, t0 + (opts.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (opts.dur || 0.2));
    src.connect(filt); filt.connect(g); g.connect(opts.dest || sfxGain);
    src.start(t0); src.stop(t0 + (opts.dur || 0.2) + 0.02);
  }

  /* Generic UI / combat cues. Content adds more with defineSfx(name, fn). */
  const sfx = {
    blip() { tone({ f0: 880, f1: 1200, dur: 0.06, vol: 0.2 }); },
    go() { tone({ f0: 523, f1: 784, dur: 0.09, vol: 0.22 }); tone({ f0: 1046, dur: 0.14, delay: 0.1, vol: 0.2 }); },
    select() { tone({ f0: 660, f1: 990, dur: 0.08, vol: 0.25 }); tone({ f0: 990, f1: 1320, dur: 0.1, delay: 0.07, vol: 0.25 }); },
    swing() { if (!gate('swing', 40)) return; noise({ f0: vary(1900), f1: 380, dur: 0.08, vol: 0.13, filter: 'bandpass', q: 0.9 }); },
    hit(heavy) {
      if (!gate(heavy ? 'hitH' : 'hitL', 30)) return;
      tone({ f0: vary(3400), f1: 900, dur: 0.018, vol: heavy ? 0.26 : 0.2, type: 'square' });
      noise({ f0: vary(heavy ? 520 : 950), f1: 120, dur: heavy ? 0.15 : 0.09, vol: heavy ? 0.52 : 0.38 });
      tone({ f0: vary(heavy ? 150 : 230), f1: 55, dur: heavy ? 0.14 : 0.08, vol: 0.38, type: 'triangle' });
      if (heavy) tone({ f0: 88, f1: 36, dur: 0.2, vol: 0.55, type: 'sine' });
    },
    hurt() { if (!gate('hurt', 60)) return; tone({ f0: 300, f1: 90, dur: 0.22, vol: 0.35, type: 'sawtooth' }); noise({ f0: 700, f1: 200, dur: 0.15, vol: 0.25 }); },
    thud() { if (!gate('thud', 50)) return; tone({ f0: 120, f1: 40, dur: 0.25, vol: 0.5, type: 'sine' }); noise({ f0: 400, f1: 80, dur: 0.2, vol: 0.4 }); },
    jump() { tone({ f0: 300, f1: 700, dur: 0.15, vol: 0.2, type: 'square' }); },
    pickup() { tone({ f0: 660, f1: 660, dur: 0.07, vol: 0.2 }); tone({ f0: 880, dur: 0.08, delay: 0.07, vol: 0.2 }); tone({ f0: 1320, dur: 0.12, delay: 0.14, vol: 0.2 }); },
    whoosh() { noise({ f0: 1200, f1: 180, dur: 0.28, vol: 0.28, filter: 'lowpass', attack: 0.04 }); },
    lastCall() { if (!gate('lastCall', 90)) return; tone({ f0: 2600, f1: 2000, dur: 0.03, vol: 0.22, type: 'square' }); },
    levelClear() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((n, i) => tone({ f0: n, dur: 0.18, delay: i * 0.11, vol: 0.22, type: 'square' })); },
    gameOver() { [440, 415, 392, 370, 349, 330, 220].forEach((n, i) => tone({ f0: n, dur: 0.3, delay: i * 0.22, vol: 0.25, type: 'triangle' })); },
    impact() {
      if (!gate('impact', 120)) return;
      tone({ f0: 70, f1: 30, dur: 0.5, vol: 0.6, type: 'sine' });
      noise({ f0: 2400, f1: 160, dur: 0.35, vol: 0.45 });
      duck(0.35, 0.15, 0.5);
    },
    wipe() { noise({ f0: 400, f1: 3200, dur: 0.32, vol: 0.2, filter: 'bandpass', q: 0.8, attack: 0.08 }); },
    stinger(kind) {
      const k = STINGERS[kind] || STINGERS.default;
      k();
      duck(0.45, 0.35, 0.8);
    },
    /** Speech babble for one syllable of a typed caption, in a registered voice. */
    babble(who) {
      if (!gate('babble', 52)) return;
      const v = VOICES[who] || VOICES.narrator;
      if (v.tick) { noise({ f0: 5200, f1: 2600, dur: 0.018, vol: 0.05, filter: 'highpass' }); return; }
      formant(vary(v.f0, 0.12), v.formant, 0.065, v.vol, v.type);
    },
    /** Line-start chirp in the speaker's register (used when no recorded line exists). */
    voLine(who) {
      const v = VOICES[who] || VOICES.narrator;
      if (v.tick) { tone({ f0: 1568, dur: 0.05, vol: 0.06, type: 'triangle' }); return; }
      (v.grunt || [[v.f0, v.f0 * 0.8, 0.16, 0]]).forEach(([f0, f1, d, at]) => formant(f0, v.formant, d, v.vol * 1.4, v.type, f1, at));
      duck(0.7, 0.3, 0.4);
    }
  };

  /* A band-passed buzz reads as a voice more than a bare oscillator does. */
  function formant(f0, center, dur, vol, type, f1, delay) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = type || 'sawtooth';
    o.frequency.setValueAtTime(f0, t0);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    bp.type = 'bandpass'; bp.frequency.value = center; bp.Q.value = 2.2;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(bp); bp.connect(g); g.connect(sfxGain);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  /* Detuned saws through an opening low-pass: a synth-brass stab. */
  function brass(freqs, dur, vol, delay) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + (delay || 0);
    const lp = ctx.createBiquadFilter(), g = ctx.createGain();
    lp.type = 'lowpass'; lp.Q.value = 1.5;
    lp.frequency.setValueAtTime(500, t0); lp.frequency.exponentialRampToValueAtTime(3200, t0 + 0.06); lp.frequency.exponentialRampToValueAtTime(900, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.02); g.gain.setValueAtTime(vol, t0 + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    lp.connect(g); g.connect(sfxGain);
    for (const f of freqs) for (const d of [-6, 6]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = d;
      o.connect(lp); o.start(t0); o.stop(t0 + dur + 0.05);
    }
  }
  /* Registries filled by content. voice: { f0, formant, vol, type, grunt?: [[f0,f1,dur,delay]] } or { tick: true }. */
  const VOICES = { narrator: { tick: true } };
  const STINGERS = {
    default() { noise({ f0: 300, f1: 2800, dur: 0.3, vol: 0.2, filter: 'bandpass', attack: 0.1 }); brass([147, 220, 294], 0.5, 0.17, 0.26); }
  };

  /* Every cue is traced (name + context time) so a test can tell a silent story from a scored one. */
  const trace = [];
  function wrap(name, fn) {
    return function () {
      trace.push({ name: name === 'stinger' ? 'stinger:' + arguments[0] : name, t: ctx ? ctx.currentTime : 0 });
      if (trace.length > 400) trace.splice(0, 100);
      return fn.apply(this, arguments);
    };
  }
  for (const name of Object.keys(sfx)) sfx[name] = wrap(name, sfx[name]);
  function defineSfx(name, fn) { sfx[name] = wrap(name, fn); }
  function defineStinger(name, fn) { STINGERS[name] = fn; }
  function defineVoice(name, v) { VOICES[name] = v; }

  /* Optional recorded clips (e.g. voice lines). Only URLs the caller knows exist
     should be passed; a failed fetch resolves to null and is remembered. */
  const clips = {}, pending = {}, clipGains = {};
  // Per-asset loudness trims are derived from decoded delivered bytes. This
  // preserves the approved recording rather than adding another lossy encode.
  function defineClipGain(key, gain) {
    if (Number.isFinite(gain) && gain > 0 && gain <= 2) clipGains[key] = gain;
  }
  function clipGain(key) { return clipGains[key] || 1; }
  function decode(b) {
    return new Promise(res => {
      try { const p = ctx.decodeAudioData(b, res, () => res(null)); if (p && p.catch) p.catch(() => res(null)); }
      catch (e) { res(null); }
    });
  }
  /** opts.minDuration: shorter clips count as missing (silent placeholders). */
  function loadClip(key, url, opts) {
    const min = (opts && opts.minDuration) || 0;
    init();
    if (!ctx || typeof fetch !== 'function') return Promise.resolve(null);
    if (key in clips) return Promise.resolve(clips[key]);
    if (pending[key]) return pending[key];
    return (pending[key] = fetch(url).then(r => (r && r.ok && r.arrayBuffer ? r.arrayBuffer() : null))
      .then(b => (b ? decode(b) : null))
      .catch(() => null).then(buf => { delete pending[key]; return (clips[key] = buf && buf.duration >= min ? buf : null); }));
  }
  let voiceSrc = null, voiceOut = null, voiceKey = null, voiceProtected = false, voiceStartedAt = 0;
  const voiceQueue = [];
  let voiceGeneration = 0;
  function stopVoice() {
    if (!voiceSrc) return;
    const src = voiceSrc, key = voiceKey;
    voiceSrc = null; voiceKey = null; voiceProtected = false;
    src.onended = null;
    try { src.stop(); } catch (e) { /* already ended */ }
    src.disconnect();
    if (voiceOut) { voiceOut.disconnect(); voiceOut = null; }
    releaseSpeechDuck();
    trace.push({ name: 'clip-stop:' + key, t: ctx.currentTime, elapsed: ctx.currentTime - voiceStartedAt });
  }
  /** Explicit story skip / scene change: also discard clips still being fetched. */
  function clearVoices() {
    voiceGeneration++;
    for (const entry of voiceQueue) if (entry.timer != null) clearTimeout(entry.timer);
    voiceQueue.length = 0;
    stopVoice();
  }
  function startClip(key, opts) {
    const buf = clips[key];
    if (!ctx || muted || !buf) return false;
    const voice = !!(opts && opts.voice);
    if (voice) stopVoice();
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = (opts && opts.vol != null ? opts.vol : 1) * (voice ? clipGain(key) : 1);
    src.connect(g); g.connect(voice && voiceGain ? voiceGain : sfxGain); src.start();
    if (voice) {
      voiceSrc = src; voiceOut = g; voiceKey = key; voiceProtected = !!opts.protected; voiceStartedAt = ctx.currentTime;
      src.onended = () => {
        if (voiceSrc !== src) return;
        voiceSrc = null; voiceOut = null; voiceKey = null; voiceProtected = false;
        src.disconnect(); g.disconnect();
        trace.push({ name: 'clip-end:' + key, t: ctx.currentTime });
        pumpVoiceQueue();
      };
    }
    if (!opts || opts.duck !== false) {
      if (voice) duckSpeech(buf.duration);
      else duck(0.5, buf.duration, 0.45);
    }
    trace.push({ name: 'clip:' + key, t: ctx.currentTime, duration: buf.duration });
    if (opts && opts.onStart) opts.onStart();
    return true;
  }
  /** Ordinary barks can replace other barks, but cannot interrupt story speech. */
  function playClip(key, opts) {
    if (opts && opts.voice && (voiceProtected || voiceQueue.length)) return false;
    return startClip(key, opts);
  }
  function pumpVoiceQueue() {
    if (voiceSrc) return;
    while (voiceQueue.length && voiceQueue[0].ready) {
      const entry = voiceQueue.shift();
      if (entry.available && startClip(entry.key, Object.assign({}, entry.opts, { voice: true, protected: true }))) return;
      if (!muted && entry.opts.onMissing) entry.opts.onMissing();
    }
  }
  /** Reserve the line's position before loading. Natural AudioBufferSource endings,
      not guessed caption durations, advance important dialogue in request order. */
  function queueVoice(key, url, opts) {
    init();
    if (!ctx || muted || volume <= 0) return false;
    opts = opts || {};
    const generation = voiceGeneration;
    const entry = { key, opts, ready: key in clips, available: !!clips[key], timer: null };
    voiceQueue.push(entry);
    if (!voiceProtected) stopVoice(); // important dialogue may replace an incidental bark
    if (!entry.ready) {
      const ready = buf => {
        if (entry.ready || generation !== voiceGeneration) return;
        entry.ready = true; entry.available = !!buf;
        if (entry.timer != null) clearTimeout(entry.timer);
        pumpVoiceQueue();
      };
      // A failed or stalled download must never trap the victory screen.
      entry.timer = setTimeout(() => ready(null), 8000);
      loadClip(key, url, opts).then(ready);
    }
    pumpVoiceQueue();
    return true;
  }
  const hasClip = key => !!clips[key];
  let meter = null, meterBuf = null;
  /** Peak level on the master bus right now (0..1), after mute/volume. */
  function level() {
    if (!ctx || !master) return 0;
    if (!meter) { meter = ctx.createAnalyser(); meter.fftSize = 1024; master.connect(meter); meterBuf = new Float32Array(meter.fftSize); }
    meter.getFloatTimeDomainData(meterBuf);
    let p = 0;
    for (let i = 0; i < meterBuf.length; i++) { const v = Math.abs(meterBuf[i]); if (v > p) p = v; }
    return p;
  }

  /* ---------- Music: step sequencer ---------- */
  // Songs: { bpm, bass: [midi or 0 x16], lead: [x16], kick: [x16], snare: [x16] }. Registered by content.
  const SONGS = {};
  function defineSong(name, def) { SONGS[name] = def; }

  let song = null, songName = null, step = 0, nextTime = 0, timer = null, requested = null;
  let musicFrameReady = false;
  const midi = m => 440 * Math.pow(2, (m - 69) / 12);

  function scheduleStep(t) {
    const s = song;
    const stepDur = 60 / s.bpm / 4;
    const b = s.bass[step % 16];
    if (b) tone({ f0: midi(b), dur: stepDur * 0.9, vol: 0.25, type: 'triangle', delay: t - ctx.currentTime, dest: musicGain });
    const l = s.lead[step % 16];
    if (l) tone({ f0: midi(l), dur: stepDur * 0.8, vol: 0.09, type: 'square', delay: t - ctx.currentTime, dest: musicGain });
    if (s.kick[step % 16]) tone({ f0: 150, f1: 40, dur: 0.12, vol: 0.4, type: 'sine', delay: t - ctx.currentTime, dest: musicGain });
    if (s.snare[step % 16]) noise({ f0: 1800, f1: 900, dur: 0.09, vol: 0.18, filter: 'bandpass', delay: t - ctx.currentTime, dest: musicGain });
    // hats
    if (step % 2 === 1) noise({ f0: 8000, f1: 6000, dur: 0.03, vol: 0.05, filter: 'highpass', delay: t - ctx.currentTime, dest: musicGain });
  }

  function tick() {
    if (!song || !ctx) return;
    const stepDur = 60 / song.bpm / 4;
    while (nextTime < ctx.currentTime + 0.15) {
      scheduleStep(nextTime);
      nextTime += stepDur;
      step++;
    }
  }

  /* ---------- Music: recorded tracks ----------
     defineTrack(name, { urls: [ogg, mp3], loopStart, loopEnd }). The file is fetched
     and decoded lazily (first request, off the main thread), then loops sample-exactly
     between loopStart and loopEnd through trackGain -> duck -> master.
     aliasTrack(['title', 'stage1', ...], name) sends those scene songs to the track. */
  const TRACKS = {}, ALIAS = {};
  let trackName = null, trackSrc = null, trackStartedAt = 0, trackOffset = 0, trackWant = null;
  function defineTrack(name, def) { TRACKS[name] = Object.assign({ buffer: null, loading: null, failed: false }, def); }
  function aliasTrack(names, name) { for (const n of names) ALIAS[n] = name; }
  function pickUrl(urls) {
    try {
      const probe = typeof Audio === 'function' ? new Audio() : null;
      if (probe && probe.canPlayType) for (const u of urls) {
        const type = /\.ogg(\?|$)/.test(u) ? 'audio/ogg; codecs="vorbis"' : /\.mp3(\?|$)/.test(u) ? 'audio/mpeg' : '';
        if (type && probe.canPlayType(type)) return u;
      }
    } catch (e) { /* fall through */ }
    return urls[urls.length - 1];
  }
  function loadTrack(name) {
    if (!musicFrameReady) return Promise.resolve(null);
    init();
    const t = TRACKS[name];
    if (!t || !ctx || typeof fetch !== 'function') return Promise.resolve(null);
    if (t.buffer || t.failed) return Promise.resolve(t.buffer);
    if (t.loading) return t.loading;
    const url = pickUrl(t.urls);
    t.url = url;
    return (t.loading = fetch(url).then(r => (r && r.ok ? r.arrayBuffer() : null)).then(b => (b ? decode(b) : null)).catch(() => null)
      .then(buf => { t.loading = null; t.buffer = buf; t.failed = !buf; if (buf) trace.push({ name: 'track-loaded:' + name, t: ctx.currentTime }); return buf; }));
  }
  function trackPosition() {
    const t = TRACKS[trackName];
    if (!trackSrc || !t) return trackOffset;
    let p = trackOffset + (ctx.currentTime - trackStartedAt);
    const a = t.loopStart || 0, b = t.loopEnd || t.buffer.duration;
    if (p >= b) p = a + ((p - a) % (b - a));
    return p;
  }
  function startTrack(name) {
    if (!musicFrameReady) return;
    const t = TRACKS[name];
    trackWant = name;
    if (trackName === name && trackSrc) return;
    if (trackName && trackName !== name) { stopTrack(); trackOffset = 0; }
    if (musicLevel <= 0) { trackName = name; return; }
    if (!t.buffer) {
      trackName = name;
      // Before the first click/key the context is locked: fetch a little later, in the background.
      const go = () => loadTrack(name).then(buf => {
        if (buf) { if (trackWant === name && !trackSrc && musicLevel > 0) startTrack(name); }
        else if (trackWant === name) { trackName = null; trackWant = null; if (requested) playMusic(requested); }
      });
      if (ctx.state === 'running' || t.loading) go(); else setTimeout(go, 1500);
      return;
    }
    if (ctx.state !== 'running') { trackName = name; return; } // autoplay rule: unlock() restarts it
    const src = ctx.createBufferSource();
    src.buffer = t.buffer; src.loop = true;
    src.loopStart = t.loopStart || 0; src.loopEnd = t.loopEnd || t.buffer.duration;
    src.connect(trackGain);
    const at = trackName === name ? Math.min(trackOffset, src.loopEnd - 0.05) : 0;
    // Short fade-in so a resume never clicks.
    const now = ctx.currentTime;
    trackGain.gain.cancelScheduledValues(now);
    trackGain.gain.setValueAtTime(0.0001, now);
    trackGain.gain.linearRampToValueAtTime(TRACK_BASE * musicLevel, now + 0.4);
    src.start(now, at);
    trackSrc = src; trackName = name; trackOffset = at; trackStartedAt = now;
    trace.push({ name: 'track:' + name, t: now });
  }
  function pauseTrack() {
    if (!trackSrc) return;
    trackOffset = trackPosition();
    try { trackSrc.stop(); } catch (e) { /* ended */ }
    trackSrc.disconnect(); trackSrc = null;
  }
  function stopTrack() { pauseTrack(); trackName = null; trackWant = null; trackOffset = 0; }

  // Called by main only after the matching scene has painted. Ignore callbacks
  // from a scene that was replaced before its post-paint work could run.
  function markFirstVisibleFrame(name) {
    if (name !== requested || musicFrameReady) return false;
    musicFrameReady = true;
    trace.push({ name: 'music-frame-ready:' + name, t: ctx ? ctx.currentTime : 0 });
    playMusic(name);
    return true;
  }
  function playMusic(name) {
    if (requested !== name) musicFrameReady = false;
    requested = name;
    // An already-playing shared track is intentionally continuous across scenes;
    // all new music work waits for this scene's first visible frame.
    if (!musicFrameReady) return;
    init();
    if (!ctx) return;
    const tname = ALIAS[name] || (TRACKS[name] ? name : null);
    if (tname && !TRACKS[tname].failed) {
      if (timer) { clearInterval(timer); timer = null; song = null; songName = null; }
      startTrack(tname);
      return;
    }
    if (trackName) stopTrack();
    if (songName === name && timer) return;
    stopMusic();
    requested = name; musicFrameReady = true;
    if (!SONGS[name]) return;
    song = SONGS[name]; songName = name; step = 0;
    nextTime = ctx.currentTime + 0.05;
    timer = setInterval(tick, 50);
  }
  function stopMusic() {
    if (timer) clearInterval(timer);
    timer = null; song = null; songName = null; requested = null; musicFrameReady = false;
    if (trackName) stopTrack();
  }

  return {
    init, unlock, sfx, playMusic, stopMusic, markFirstVisibleFrame, toggleMute, setMuted, setVolume, cycleVolume, volumeLabel,
    duck, setMusicLevel, cycleMusic, toggleMusic, musicLabel, level, trace,
    tone, noise, formant, brass, defineSfx, defineSong, defineStinger, defineVoice, defineClipGain, clipGain, loadClip, playClip, hasClip, queueVoice, clearVoices,
    defineTrack, aliasTrack, loadTrack,
    /** Audio clock in seconds (0 without WebAudio). */
    now() { return ctx ? ctx.currentTime : 0; },
    /** Recorded-track state for tests: { name, loaded, playing, position, loopStart, loopEnd, url }. */
    get track() {
      const t = TRACKS[trackName || trackWant];
      return t ? { name: trackName || trackWant, loaded: !!t.buffer, playing: !!trackSrc, position: ctx ? trackPosition() : 0, loopStart: t.loopStart, loopEnd: t.loopEnd, duration: t.buffer ? t.buffer.duration : 0, url: t.url || null } : null;
    },
    get voicePlaying() { return voiceKey; },
    /** Pending speech still blocks incidental barks while audio is suspended. */
    get voicePending() { return voiceProtected || voiceQueue.length > 0; },
    /** Silent/unavailable audio must never trap a post-combat visual transition. */
    get voiceBusy() { return !!(ctx && ctx.state === 'running' && !muted && volume > 0 && (voiceProtected || voiceQueue.length > 0)); },
    get muted() { return muted; }, get unlocked() { return unlocked; }, get volume() { return volume; },
    get musicLevel() { return musicLevel; },
    /** Read-only mix state for real-clock regressions; gains multiply. */
    get mix() { return { musicFrameReady, speechDuck: speechDuckGain ? speechDuckGain.gain.value : 1,
      effectsDuck: duckGain ? duckGain.gain.value : 1 }; },
    /** The song the game asked for (set even when WebAudio is unavailable). */
    get song() { return requested; },
    get playing() { return (!!timer && !!song) || !!trackSrc; }
  };
})();
