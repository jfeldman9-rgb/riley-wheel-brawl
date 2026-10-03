// Audio carried over from 1.2: the recorded music track, the approved Kokoro voice lines for Stage 1,
// and the procedural WebAudio SFX (same synth recipes as 1.2's audio.js, with a few new cues).
let ctx = null, master, music, sfxBus, voiceBus, duckG, comp, noiseBuf;
let muted = false, musicOn = true, musicEl = null, musicSrc = null;
const clips = Object.create(null), gates = Object.create(null), oneShots = new Map();
let voiceSrc = null, voiceRequest = 0, voicePending = false;
export const VOICE = {
  st1_narrator_01: ['NARRATOR', "Emond's Field, on Winternight. The Two Rivers sleeps, but the Shadow is on the road."],
  st1_moiraine_01: ['MOIRAINE', 'Winternight has begun. Stay sharp.'],
  riley_st1_01: ['RILEY', "I'll guard our home."],
  trolloc_intro_01: ['TROLLOC', 'The Shadow is hungry!'],
  trolloc_heavy_intro_01: ['TROLLOC CHIEFTAIN', 'Break the village!'],
  chieftain_mid_01: ['TROLLOC CHIEFTAIN', 'Grrr! Small human kicks hard!'],
  chieftain_defeat_01: ['TROLLOC CHIEFTAIN', 'Retreat! Back to the Blight!'],
  riley_combo_01: ['RILEY', 'Front kick!'], riley_combo_02: ['RILEY', 'Roundhouse!'], riley_combo_03: ['RILEY', 'Spin!'],
  riley_fire_01: ['RILEY', 'Fire!'], riley_grab_01: ['RILEY', 'Not so fast!'], riley_throw_01: ['RILEY', 'Over there!'],
  riley_bighit_01: ['RILEY', 'Oof! That one hurt!'], riley_bighit_02: ['RILEY', "I'm okay! Keep going!"],
  riley_low_01: ['RILEY', 'I need a moment.'], riley_respawn_01: ['RILEY', 'Back on my feet.'],
  riley_victory_01: ['RILEY', 'The way is clear.'],
  st1_clear_moiraine_01: ['MOIRAINE', 'The road is open. The Shadow fled east.'],
  riley_st1_clear_01: ['RILEY', 'Twinkle Toes, I am coming.'],
  // Restored from 1.1 (same approved Kokoro files): balefire and the Loial assist.
  riley_super_01: ['RILEY', 'Balefire!'], riley_call_01: ['RILEY', 'Loial, now!'], riley_call_spent_01: ['RILEY', 'Loial needs a rest.'],
  loial_charge_01: ['LOIAL', 'For my friends!'], loial_done_01: ['LOIAL', 'That should help!'],
};
// Power-up and Twix-cutscene lines. Kept out of VOICE so the start-of-run preload stays the 25 Stage 1 clips;
// these load on demand when a power pickup or the Twix appears (preloadClips). riley_angreal_01 is the approved
// 1.1 Kokoro file; the rest are Kokoro TTS (see VOICE_PROVENANCE.md).
export const EXTRA_VOICE = {
  riley_angreal_01: ['RILEY', 'The fire burns brighter!'],
  riley_saangreal_01: ['RILEY', 'Whoa. That is a LOT of saidin!'],
  riley_lightning_01: ['RILEY', 'Lightning, on my call!'],
  riley_fireshield_01: ['RILEY', 'Try touching me now!'],
  riley_airwhip_01: ['RILEY', 'Come here, you!'],
  riley_twix_01: ['RILEY', 'Wait... is that a Twix?'],
  // The Twix campfire cutscene script (order and panels: src/twix.js). Riley is 16; PG on purpose.
  twix_01: ['RILEY', 'Snack truce. One Twix each, and nobody bites anybody.'],
  twix_02: ['GRUNT TROLLOC', "Mmf. Crunchy. Way better than Ishamael's stew. His stew bites back."],
  twix_03: ['SPEAR TROLLOC', 'Lanfear calls us smelly. Every day! I took a bath once. Last spring!'],
  twix_04: ['HOUND TROLLOC', 'Aginor made my snout. Then he laughed at my snout.'],
  twix_05: ['GRUNT TROLLOC', 'And the Myrddraal stare at you with no eyes. How do they stare with NO EYES?'],
  twix_06: ['SPEAR TROLLOC', 'No Forsaken ever says thank you. Not one time. Not even on Winternight.'],
  twix_07: ['RILEY', 'Have you guys ever thought about... not working for the Dark One?'],
  twix_08: ['ALL TROLLOCS', '...Does the Light have more Twix?'],
  twix_09: ['RILEY', "Ask me after I win. Break's over!"],
};
function init() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ctx.destination);
    duckG = ctx.createGain(); duckG.connect(master);
    music = ctx.createGain(); music.gain.value = 0.34; music.connect(duckG);
    voiceBus = ctx.createGain(); voiceBus.gain.value = 1.0; voiceBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 1.05;
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 4.5; comp.attack.value = 0.002; comp.release.value = 0.14;
    sfxBus.connect(comp); comp.connect(master);
  } catch (e) { ctx = null; }
}
export function unlock() { init(); if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); if (musicWanted) playMusic(); }
const gate = (n, ms) => { if (!ctx || muted) return false; const t = ctx.currentTime * 1000; if (gates[n] !== undefined && t - gates[n] < ms) return false; gates[n] = t; return true; };
const vary = (f, a = 0.05) => f * (1 + (Math.random() * 2 - 1) * a);
function trackSource(source, ...nodes) {
  const cleanup = () => {
    if (!oneShots.delete(source)) return;
    source.onended = null; source.disconnect();
    for (const node of nodes) node.disconnect();
    if (voiceSrc === source) voiceSrc = null;
  };
  oneShots.set(source, cleanup); source.onended = cleanup;
}
function stopSource(source) {
  try { source.stop(); } catch (e) { }
  const cleanup = oneShots.get(source); if (cleanup) cleanup();
}
function resetDuck() {
  if (!ctx) return;
  duckG.gain.cancelScheduledValues(ctx.currentTime); duckG.gain.setValueAtTime(1, ctx.currentTime);
}
/** Cancel scene-owned speech and one-shots; keep cached clips, music and user preferences. */
export function stopSceneAudio() {
  voiceRequest++; voicePending = false;
  for (const source of oneShots.keys()) stopSource(source);
  for (const name of Object.keys(gates)) delete gates[name];
  resetDuck();
}
function tone(o) {
  if (!ctx || muted) return; const t0 = ctx.currentTime + (o.delay || 0), osc = ctx.createOscillator(), g = ctx.createGain(), d = o.dur || 0.1;
  osc.type = o.type || 'square'; osc.frequency.setValueAtTime(o.f0 || 440, t0); if (o.f1 !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t0 + d);
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(o.vol || 0.3, t0 + (o.attack || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  osc.connect(g); g.connect(sfxBus); trackSource(osc, g); osc.start(t0); osc.stop(t0 + d + 0.02);
}
function noise(o) {
  if (!ctx || muted) return;
  if (!noiseBuf) { const n = ctx.sampleRate * 1.5; noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate); const c = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) c[i] = Math.random() * 2 - 1; }
  const t0 = ctx.currentTime + (o.delay || 0), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), d = o.dur || 0.2;
  s.buffer = noiseBuf; f.type = o.filter || 'lowpass'; f.frequency.setValueAtTime(o.f0 || 1000, t0); if (o.f1 !== undefined) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.f1), t0 + d); f.Q.value = o.q || 1;
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(o.vol || 0.3, t0 + (o.attack || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  s.connect(f); f.connect(g); g.connect(sfxBus); trackSource(s, f, g); s.start(t0, Math.random()); s.stop(t0 + d + 0.02);
}
function duck(depth = 0.5, hold = 0.18, rel = 0.45) {
  if (!ctx || muted) return; const t = ctx.currentTime, g = duckG.gain;
  g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(depth, t + 0.025); g.setValueAtTime(depth, t + 0.025 + hold); g.linearRampToValueAtTime(1, t + 0.025 + hold + rel);
}
export const sfx = {
  swing() { if (!gate('swing', 40)) return; noise({ f0: vary(1900), f1: 380, dur: 0.08, vol: 0.13, filter: 'bandpass', q: 0.9 }); },
  whiff() { if (!gate('whiff', 60)) return; noise({ f0: vary(2600), f1: 500, dur: 0.12, vol: 0.12, filter: 'bandpass', q: 1.2 }); },
  hit(heavy) {
    if (!gate(heavy ? 'hitH' : 'hitL', 30)) return;
    tone({ f0: vary(3400), f1: 900, dur: 0.018, vol: heavy ? 0.26 : 0.2 });
    noise({ f0: vary(heavy ? 520 : 950), f1: 120, dur: heavy ? 0.15 : 0.09, vol: heavy ? 0.52 : 0.38 });
    tone({ f0: vary(heavy ? 150 : 230), f1: 55, dur: heavy ? 0.14 : 0.08, vol: 0.38, type: 'triangle' });
    if (heavy) { tone({ f0: 88, f1: 36, dur: 0.2, vol: 0.55, type: 'sine' }); duck(0.55, 0.08, 0.3); }
  },
  blade() { if (!gate('blade', 40)) return; tone({ f0: vary(2200), f1: 1400, dur: 0.12, vol: 0.12, type: 'sawtooth' }); noise({ f0: 4000, f1: 900, dur: 0.1, vol: 0.2, filter: 'highpass' }); },
  hurt() { if (!gate('hurt', 60)) return; tone({ f0: 300, f1: 90, dur: 0.22, vol: 0.35, type: 'sawtooth' }); noise({ f0: 700, f1: 200, dur: 0.15, vol: 0.25 }); },
  thud() { if (!gate('thud', 50)) return; tone({ f0: 120, f1: 40, dur: 0.25, vol: 0.5, type: 'sine' }); noise({ f0: 400, f1: 80, dur: 0.2, vol: 0.4 }); },
  jump() { tone({ f0: 300, f1: 620, dur: 0.12, vol: 0.12, type: 'triangle' }); noise({ f0: 900, f1: 300, dur: 0.1, vol: 0.12 }); },
  land() { if (!gate('land', 80)) return; noise({ f0: 500, f1: 90, dur: 0.12, vol: 0.25 }); },
  step() { if (!gate('step', 120)) return; noise({ f0: vary(1300, 0.2), f1: 300, dur: 0.05, vol: 0.05 }); },
  whoosh() { noise({ f0: 1200, f1: 180, dur: 0.28, vol: 0.28, attack: 0.04 }); },
  fire() { noise({ f0: 300, f1: 2400, dur: 0.25, vol: 0.3, filter: 'bandpass', attack: 0.05 }); tone({ f0: 110, f1: 220, dur: 0.3, vol: 0.2, type: 'sawtooth' }); },
  boom() { if (!gate('boom', 100)) return; tone({ f0: 70, f1: 30, dur: 0.5, vol: 0.6, type: 'sine' }); noise({ f0: 2400, f1: 160, dur: 0.45, vol: 0.5 }); duck(0.35, 0.15, 0.5); },
  smash() { noise({ f0: 2600, f1: 300, dur: 0.25, vol: 0.4, filter: 'bandpass', q: 0.7 }); tone({ f0: 180, f1: 60, dur: 0.18, vol: 0.3, type: 'triangle' }); },
  roar() { if (!gate('roar', 400)) return; for (let i = 0; i < 3; i++) tone({ f0: vary(95 + i * 30), f1: 60, dur: 0.9, vol: 0.18, type: 'sawtooth', delay: i * 0.03 }); noise({ f0: 600, f1: 200, dur: 0.9, vol: 0.25, attack: 0.1 }); duck(0.4, 0.6, 0.6); },
  go() { tone({ f0: 523, f1: 784, dur: 0.09, vol: 0.22 }); tone({ f0: 1046, dur: 0.14, delay: 0.1, vol: 0.2 }); },
  pickup() { tone({ f0: 660, dur: 0.07, vol: 0.2 }); tone({ f0: 880, dur: 0.08, delay: 0.07, vol: 0.2 }); tone({ f0: 1320, dur: 0.12, delay: 0.14, vol: 0.2 }); },
  levelClear() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((n, i) => tone({ f0: n, dur: 0.18, delay: i * 0.11, vol: 0.2 })); },
  gameOver() { [440, 415, 392, 370, 349, 330, 220].forEach((n, i) => tone({ f0: n, dur: 0.3, delay: i * 0.22, vol: 0.22, type: 'triangle' })); },
  // 1.1 recipes
  balefire() { tone({ f0: 180, f1: 880, dur: 0.35, vol: 0.22, type: 'sawtooth' }); noise({ f0: 3000, f1: 400, dur: 0.4, vol: 0.2, filter: 'highpass' }); tone({ f0: 90, f1: 40, dur: 0.4, vol: 0.35, type: 'sine' }); duck(0.3, 0.1, 1.2); },
  loialHorn() { tone({ f0: 220, f1: 330, dur: 0.22, vol: 0.28, type: 'sawtooth' }); tone({ f0: 330, f1: 440, dur: 0.24, delay: 0.18, vol: 0.24, type: 'sawtooth' }); },
  // power-ups
  powerUp() { [784, 988, 1175, 1568].forEach((n, i) => tone({ f0: n, dur: 0.12, delay: i * 0.06, vol: 0.18, type: 'triangle' })); },
  powerDown() { tone({ f0: 660, f1: 220, dur: 0.3, vol: 0.14, type: 'triangle' }); },
  zap() { if (!gate('zap', 60)) return; noise({ f0: 6000, f1: 900, dur: 0.18, vol: 0.32, filter: 'highpass' }); tone({ f0: 1400, f1: 180, dur: 0.16, vol: 0.16, type: 'sawtooth' }); tone({ f0: 70, f1: 40, dur: 0.25, vol: 0.35, type: 'sine' }); },
  fall() { tone({ f0: 1800, f1: 500, dur: 0.7, vol: 0.12, type: 'sine' }); },
  grumble() { if (!gate('grumble', 300)) return; tone({ f0: vary(85, 0.15), f1: 60, dur: 0.45, vol: 0.16, type: 'sawtooth' }); noise({ f0: 380, f1: 160, dur: 0.4, vol: 0.12, attack: 0.06 }); },
  impact() { if (!gate('impact', 120)) return; tone({ f0: 70, f1: 30, dur: 0.5, vol: 0.6, type: 'sine' }); noise({ f0: 2400, f1: 160, dur: 0.35, vol: 0.45 }); duck(0.35, 0.15, 0.5); },
};
let musicWanted = false;
export function playMusic() {
  musicWanted = true; init(); if (!ctx || !musicOn) return;
  if (!musicEl) {
    musicEl = new Audio('assets/audio/music-main.mp3'); musicEl.loop = true; musicEl.crossOrigin = 'anonymous';
    try { musicSrc = ctx.createMediaElementSource(musicEl); musicSrc.connect(music); } catch (e) { musicEl.volume = 0.34; }
  }
  musicEl.muted = muted; // Also covers the HTMLAudio fallback, which bypasses master.
  musicEl.play().catch(() => {});
}
export function toggleMusic() { musicOn = !musicOn; if (musicOn && musicWanted) playMusic(); else if (musicEl) musicEl.pause(); return musicOn; }
export function toggleMute() {
  muted = !muted; if (master) master.gain.value = muted ? 0 : 0.8;
  if (musicEl) musicEl.muted = muted;
  if (muted) stopSceneAudio();
  return muted;
}
function loadClip(id) {
  init(); if (!ctx) return Promise.resolve(null);
  if (clips[id]) return clips[id];
  return (clips[id] = fetch(`assets/audio/voice/${id}.mp3`).then(r => r.ok ? r.arrayBuffer() : null)
    .then(b => b ? new Promise(res => {
      // Some implementations expose both callbacks and a rejecting decode promise.
      const pending = ctx.decodeAudioData(b, res, () => res(null));
      if (pending && pending.catch) pending.catch(() => res(null));
    }) : null).catch(() => null).then(buf => {
      if (!buf) delete clips[id]; // A temporary load/decode failure must not poison the cache.
      return buf;
    }));
}
export function preloadVoices() { Object.keys(VOICE).forEach(loadClip); }
/** on-demand preload for EXTRA_VOICE lines (power pickups and the Twix cutscene) */
export function preloadClips(ids) { for (const id of ids) if (Object.hasOwn(EXTRA_VOICE, id)) loadClip(id); }
/** Returns [speaker, text]; only accepted lines caption. Muted lines still caption without queued playback. */
export function say(id, onCaption, interrupt = true) {
  const cap = Object.hasOwn(VOICE, id) ? VOICE[id] : Object.hasOwn(EXTRA_VOICE, id) ? EXTRA_VOICE[id] : null;
  if (!cap) return;
  if (!interrupt && (voiceSrc || voicePending)) return cap;
  const request = ++voiceRequest, shouldPlay = !muted;
  voicePending = shouldPlay;
  if (voiceSrc) { stopSource(voiceSrc); resetDuck(); }
  if (onCaption) onCaption(cap[0], cap[1]);
  if (!shouldPlay || muted || request !== voiceRequest) return cap;
  loadClip(id).then(buf => {
    if (request !== voiceRequest) return;
    voicePending = false;
    if (!buf || muted || !ctx) return;
    const s = ctx.createBufferSource(); s.buffer = buf; s.connect(voiceBus); trackSource(s); voiceSrc = s; s.start();
    duck(0.45, buf.duration, 0.4);
  });
  return cap;
}
