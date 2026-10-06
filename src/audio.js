// Audio carried over from 1.2: the recorded music track, the approved Kokoro voice lines for Stage 1,
// and the procedural WebAudio SFX (same synth recipes as 1.2's audio.js, with a few new cues).
let ctx = null, master, music, sfxBus, voiceBus, duckG, comp, noiseBuf;
let muted = false, musicOn = true, musicEl = null, musicSrc = null;
const clips = Object.create(null), gates = Object.create(null), oneShots = new Map();
let voiceSrc = null, voiceRequest = 0, voicePending = false;
let audioHidden = false, audioEpoch = 0;
const audioTimers = new Set();
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
  // Stage 2: Baerlon and the Whitecloaks (Kokoro TTS; casts in VOICE_PROVENANCE.md). Kid-safe on purpose.
  st2_story_01: ['NARRATOR', "The Fade's trail led north, through the rain, to the walled town of Baerlon."],
  st2_story_02: ['RILEY', 'These hoofprints... a Myrddraal came this way. Hang on, Twinkle Toes.'],
  st2_story_03: ['RILEY', "That's her ribbon! She was here!"],
  st2_story_04: ['JARET BYAR', 'A boy who channels? Darkfriend! Children of the Light, seize him!'],
  st2_story_05: ['RILEY', "Darkfriend? I'm sixteen! I'm just looking for my friend!"],
  st2_story_06: ['WHITECLOAK', "That's exactly what a Darkfriend would say!"],
  zealot_intro_01: ['WHITECLOAK', 'Halt, Darkfriend! In the name of the Light!'],
  riley_st2_stable_01: ['RILEY', 'Hound Trollocs? The Fade left guards behind!'],
  riley_ribbon_01: ['RILEY', "Twinkle Toes' ribbon! I'm getting closer."],
  zealot_mud_01: ['WHITECLOAK', 'My cloak! Do you know how hard it is to get mud out of white wool?!'],
  riley_mud_01: ['RILEY', 'Try cold water!'],
  byar_intro_01: ['JARET BYAR', 'I am Jaret Byar, Child of the Light. Kneel, Darkfriend!'],
  byar_parry_01: ['JARET BYAR', 'Too slow, Darkfriend!'],
  byar_mid_01: ['JARET BYAR', 'Archers! Cover the yard!'],
  byar_volley_01: ['JARET BYAR', 'Loose!'],
  byar_rage_01: ['JARET BYAR', 'Burn the barn! Smoke the Darkfriend out!'],
  byar_defeat_01: ['JARET BYAR', 'This is not over, Darkfriend! The Light will find you!'],
  riley_st2_victory_01: ['RILEY', "I'm NOT a Darkfriend! ...And your barn is on fire!"],
  riley_st2_clear_01: ['RILEY', 'The trail keeps going. Hang on, Twinkle Toes. I am coming.'],
  // Stage 3: Caemlyn and the Myrddraal (Kokoro TTS for Riley/narrator; ElevenLabs eleven_v4 for Gill, cutthroat, Myrddraal)
  st3_story_01: ['NARRATOR', 'The trail led south, to Caemlyn, the great white city of the Queen.'],
  st3_story_02: ['BASEL GILL', 'A man with no eyes, on my rooftops, at dusk. He carried a little bundle. Blue ribbon on it.'],
  st3_story_03: ['RILEY', "Twinkle Toes' ribbon. He's here."],
  st3_story_04: ['BASEL GILL', 'There are Darkfriends in the market too, lad. Watch your back.'],
  st3_story_05: ['RILEY', 'I always do.'],
  st3_story_06: ['NARRATOR', 'As the sun went down over the palace, Riley went up onto the roofs.'],
  cutthroat_intro_01: ['CUTTHROAT', "That's the one the Lady wants. Take him quiet."],
  cutthroat_grab_01: ['CUTTHROAT', 'Gotcha!'],
  riley_escape_01: ['RILEY', 'Off me!'],
  riley_st3_roof_01: ['RILEY', "Roof tiles. Great. Of course it's roof tiles."],
  riley_st3_glimpse_01: ['RILEY', 'There! On the far roof!'],
  fade_intro_01: ['MYRDDRAAL', "The boy who channels. Your sister's trail ends here."],
  fade_mid_01: ['MYRDDRAAL', 'Fear me, boy.'],
  fade_split_01: ['MYRDDRAAL', 'Which shadow is real?'],
  riley_counter_01: ['RILEY', 'That one!'],
  fade_defeat_01: ['MYRDDRAAL', 'The shadow... remembers...'],
  riley_st3_victory_01: ['RILEY', 'Remember this, then.'],
  riley_st3_clear_01: ['RILEY', "Another ribbon. I'm coming, Twinkle Toes."],
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
    if (audioHidden) suspendAudio();
  } catch (e) { ctx = null; }
}
function suspendAudio() {
  // Media elements can keep advancing (or bypass WebAudio in the fallback), so
  // pause them as well as the graph. Do not change the user's music preference.
  for (const T of Object.values(tracks)) if (T.el && T.el.paused !== true) T.el.pause();
  if (ctx && ctx.state !== 'closed' && ctx.state !== 'suspended') {
    ctx.suspend().then(() => { if (!audioHidden && unlocked) resumeAudio(); }).catch(() => {});
  }
}
function resumeAudio() {
  if (audioHidden || !ctx) return;
  // iOS Safari also uses 'interrupted' after backgrounding / audio-route changes.
  if (ctx.state !== 'running' && ctx.state !== 'closed') {
    ctx.resume().then(() => { if (audioHidden) suspendAudio(); }).catch(() => {});
  }
  if (musicWanted && musicOn) resumeMusic();
}
export function unlock() { init(); unlocked = true; resumeAudio(); }
/** One game-wide listener pair; scene restarts must not install extra listeners. */
export function installAudioLifecycle(game) {
  let disposed = false;
  const gestureEvents = ['pointerdown', 'touchend', 'keydown'];
  const gesture = () => { if (!disposed && unlocked) resumeAudio(); };
  const hidden = () => { if (disposed) return; audioHidden = true; suspendAudio(); };
  const visible = () => { if (disposed) return; audioHidden = false; if (unlocked) resumeAudio(); };
  const destroy = () => {
    if (disposed) return;
    disposed = true; disposeAudio();
    game.events.off('hidden', hidden); game.events.off('visible', visible); game.events.off('destroy', destroy);
    for (const event of gestureEvents) window.removeEventListener?.(event, gesture, true);
  };
  game.events.on('hidden', hidden); game.events.on('visible', visible); game.events.on('destroy', destroy);
  // Capture gestures even when a story/pause screen handles input before unlock().
  for (const event of gestureEvents) window.addEventListener?.(event, gesture, { capture: true, passive: true });
  // Phaser may have emitted its first hidden event before audio was installed.
  if (typeof document !== 'undefined' && document.hidden) hidden(); else audioHidden = false;
  return { destroy };
}
/** Terminal teardown, unlike a temporary hidden-tab suspension. */
function disposeAudio() {
  audioHidden = true; audioEpoch++; unlocked = false; musicWanted = false; currentTrack = null;
  stopSceneAudio();
  // Finish old rain/track cleanup immediately, cancelling all wall-clock polling.
  for (const timer of [...audioTimers]) timer.finish();
  if (rainNodes) { disposeRain(rainNodes); rainNodes = null; }
  for (const T of Object.values(tracks)) {
    stopTrack(T, 0); T.gain.disconnect(); T.mediaSrc?.disconnect(); T.buf = null;
    if (T.el) { T.el.removeAttribute?.('src'); T.el.load?.(); }
    delete tracks[T.id];
  }
  for (const cache of [clips, musicBytes]) for (const key of Object.keys(cache)) delete cache[key];
  for (const node of [master, music, sfxBus, voiceBus, duckG, comp]) node?.disconnect();
  const oldContext = ctx; ctx = null;
  master = music = sfxBus = voiceBus = duckG = comp = noiseBuf = musicEl = musicSrc = null;
  wantedTrack = 'stage1';
  if (oldContext && oldContext.state !== 'closed') oldContext.close().catch(() => {});
}
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
  // Stage 2 (Baerlon) cues
  clang() { if (!gate('clang', 70)) return; tone({ f0: vary(1250), f1: 880, dur: 0.11, vol: 0.14, type: 'square' }); tone({ f0: vary(1870), dur: 0.22, vol: 0.09, type: 'triangle' }); noise({ f0: 5200, f1: 2000, dur: 0.08, vol: 0.18, filter: 'highpass' }); },
  glint() { if (!gate('glint', 200)) return; tone({ f0: 2600, f1: 3400, dur: 0.16, vol: 0.06, type: 'sine' }); tone({ f0: 3900, dur: 0.1, delay: 0.06, vol: 0.04, type: 'sine' }); },
  dread() { if (!gate('dread', 350)) return; tone({ f0: 55, f1: 40, dur: 0.18, vol: 0.22, type: 'sine' }); tone({ f0: 82, f1: 48, dur: 0.12, vol: 0.08, type: 'triangle', delay: 0.08 }); },
  shaken() { if (!gate('shaken', 200)) return; tone({ f0: 520, f1: 90, dur: 0.2, vol: 0.28, type: 'sawtooth' }); noise({ f0: 1800, f1: 200, dur: 0.16, vol: 0.2, filter: 'bandpass' }); },
  mash() { if (!gate('mash', 40)) return; tone({ f0: 880, f1: 660, dur: 0.04, vol: 0.08, type: 'square' }); },
  bowDraw() { if (!gate('bow', 150)) return; noise({ f0: 700, f1: 1700, dur: 0.3, vol: 0.07, filter: 'bandpass', q: 3, attack: 0.2 }); },
  twang() { if (!gate('twang', 60)) return; tone({ f0: vary(190), f1: 120, dur: 0.14, vol: 0.16, type: 'triangle' }); noise({ f0: 3200, f1: 900, dur: 0.12, vol: 0.12, filter: 'bandpass', q: 1.5 }); },
  warcry() { if (!gate('warcry', 400)) return; for (let i = 0; i < 2; i++) tone({ f0: vary(200 + i * 70), f1: 150, dur: 0.55, vol: 0.12, type: 'sawtooth', delay: i * 0.04 }); noise({ f0: 900, f1: 400, dur: 0.5, vol: 0.14, attack: 0.08 }); duck(0.5, 0.3, 0.5); },
  thunder() { if (!gate('thunder', 1500)) return; noise({ f0: 260, f1: 50, dur: 2.4, vol: 0.3, attack: 0.04 }); noise({ f0: 1400, f1: 180, dur: 0.5, vol: 0.2 }); tone({ f0: 55, f1: 30, dur: 1.6, vol: 0.25, type: 'sine', delay: 0.05 }); },
  horn() { tone({ f0: 196, f1: 220, dur: 0.5, vol: 0.18, type: 'sawtooth' }); tone({ f0: 294, f1: 330, dur: 0.6, delay: 0.32, vol: 0.16, type: 'sawtooth' }); },
  volleyWhistle() { for (let i = 0; i < 4; i++) tone({ f0: vary(2600, 0.1), f1: 700, dur: 0.38, vol: 0.05, type: 'sine', delay: i * 0.05 }); },
  flame() { if (!gate('flame', 150)) return; noise({ f0: 350, f1: 1900, dur: 0.55, vol: 0.28, filter: 'bandpass', attack: 0.08 }); tone({ f0: 90, f1: 60, dur: 0.4, vol: 0.2, type: 'sine' }); },
  creak() { if (!gate('creak', 400)) return; tone({ f0: vary(140, 0.15), f1: 95, dur: 0.6, vol: 0.1, type: 'sawtooth', attack: 0.15 }); noise({ f0: 600, f1: 300, dur: 0.5, vol: 0.08, filter: 'bandpass', q: 4 }); },
  impact() { if (!gate('impact', 120)) return; tone({ f0: 70, f1: 30, dur: 0.5, vol: 0.6, type: 'sine' }); noise({ f0: 2400, f1: 160, dur: 0.35, vol: 0.45 }); duck(0.35, 0.15, 0.5); },
  // Stage 3 (Caemlyn) cues
  hiss() { if (!gate('hiss', 100)) return; noise({ f0: 4500, f1: 1200, dur: 0.35, vol: 0.15, filter: 'bandpass', q: 2 }); tone({ f0: vary(320), f1: 160, dur: 0.25, vol: 0.08, type: 'sine' }); },
  shadowWhoosh() { if (!gate('shadowWhoosh', 100)) return; noise({ f0: 800, f1: 120, dur: 0.4, vol: 0.22, attack: 0.06 }); tone({ f0: vary(90, 0.1), f1: 45, dur: 0.35, vol: 0.2, type: 'sine' }); },
  tileRattle() { if (!gate('tileRattle', 150)) return; for (let i = 0; i < 3; i++) { tone({ f0: vary(440 + i * 80), f1: 220, dur: 0.08, vol: 0.12, type: 'triangle', delay: i * 0.05 }); noise({ f0: 2200, f1: 800, dur: 0.07, vol: 0.1, delay: i * 0.05 }); } },
  torchIgnite() { if (!gate('torchIgnite', 120)) return; noise({ f0: 280, f1: 1800, dur: 0.45, vol: 0.25, filter: 'bandpass', attack: 0.05 }); tone({ f0: vary(120), f1: 75, dur: 0.3, vol: 0.18, type: 'sine' }); },
};
let musicWanted = false, unlocked = false;
// ---------- music tracks (sources and licences: assets/audio/AUDIO_PROVENANCE.md) ----------
// stage1 is Jason's 1.1 theme, streamed through an <audio> element (too long to hold decoded on an iPad); its
// loop region is [31.103 s, 159.103 s) and the element jumps back exactly 128 s inside the baked crossfade.
// The other tracks are short original loops decoded once and looped sample-accurately with loopStart/loopEnd
// (each file carries 0.25 s of overlap on both sides of its loop). gain: per-track balance against the stage1
// theme, which the SFX mix was tuned to (track loudness: title -17, boss1/boss2/boss3 -15.2, stage2/stage3 -16 LUFS vs stage1 -15.7).
export const MUSIC = {
  stage1: { url: 'assets/audio/music-main.mp3', stream: true, loopStart: 31.103, loopEnd: 159.103, gain: 1 },
  title: { url: 'assets/audio/music-title.mp3', loopStart: 0.25, loopEnd: 45.964286, gain: 1 },
  boss1: { url: 'assets/audio/music-boss1.mp3', loopStart: 0.25, loopEnd: 38.65, gain: 0.94 },
  stage2: { url: 'assets/audio/music-stage2.mp3', loopStart: 0.25, loopEnd: 64.865374, gain: 1 },
  boss2: { url: 'assets/audio/music-boss2.mp3', loopStart: 0.25, loopEnd: 55.902177, gain: 0.94 },
  stage3: { url: 'assets/audio/music-stage3.mp3', loopStart: 0.25, loopEnd: 64.865374, gain: 1 },
  boss3: { url: 'assets/audio/music-boss3.mp3', loopStart: 0.25, loopEnd: 53.583333, gain: 0.94 },
};
const tracks = Object.create(null), musicBytes = Object.create(null);
let currentTrack = null, wantedTrack = 'stage1';
/** equal-power fade on a GainNode, built from short linear ramps (works on every WebAudio implementation) */
function fadeGain(param, to, secs) {
  const t = ctx.currentTime, from = param.value; param.cancelScheduledValues(t); param.setValueAtTime(from, t);
  if (!(secs > 0)) { param.setValueAtTime(to, t); return; }
  const steps = 8, up = to > from;
  for (let i = 1; i <= steps; i++) {
    const u = i / steps, v = up ? from + (to - from) * Math.sin(u * Math.PI / 2) : to + (from - to) * Math.cos(u * Math.PI / 2);
    param.linearRampToValueAtTime(v, t + secs * u);
  }
  // Do not assign .value here: that schedules a new value at NOW and replaces
  // the fade start, making the curve jump before it reaches the first ramp.
}
function trackNode(id) {
  let T = tracks[id]; if (T) return T;
  const M = MUSIC[id]; T = tracks[id] = { id, M, gain: ctx.createGain(), el: null, src: null, buf: null, t0: 0, pos: M.loopStart || 0, playing: false, fallback: false, stopTimer: null };
  T.gain.gain.value = 0; T.gain.connect(music);
  return T;
}
function streamEl(T) {
  if (T.el) return T.el;
  const el = T.el = new Audio(T.M.url); el.loop = true; el.crossOrigin = 'anonymous';
  // seamless loop region: jump back one loop length while inside the baked crossfade at the end of the file
  const L = T.M.loopEnd - T.M.loopStart;
  el.ontimeupdate = () => { if (el.currentTime >= T.M.loopEnd - 0.35 && el.currentTime < T.M.loopEnd + 1) el.currentTime -= L; };
  try { const src = ctx.createMediaElementSource(el); src.connect(T.gain); T.mediaSrc = src; } catch (e) { T.fallback = true; el.volume = 0.34 * T.M.gain; }
  if (T.id === 'stage1') { musicEl = el; musicSrc = T.mediaSrc || null; }
  return el;
}
function loadMusicBuffer(T) {
  if (T.buf) return Promise.resolve(T.buf);
  if (T.loading) return T.loading;
  const audioContext = ctx, epoch = audioEpoch;
  return (T.loading = (musicBytes[T.id] || (musicBytes[T.id] = fetch(T.M.url).then(r => r.ok ? r.arrayBuffer() : null).catch(() => null)))
    .then(b => b ? new Promise(res => { const p = audioContext.decodeAudioData(b.slice ? b.slice(0) : b, res, () => res(null)); if (p && p.catch) p.catch(() => res(null)); }) : null)
    .catch(() => null).then(buf => { T.loading = null; if (epoch !== audioEpoch) return null; if (!buf) delete musicBytes[T.id]; T.buf = buf; return buf; }));
}
function startBuffer(T, fade) {
  if (!T.buf || T.playing || !ctx) return;
  const s = ctx.createBufferSource(); s.buffer = T.buf; s.loop = true; s.loopStart = T.M.loopStart; s.loopEnd = T.M.loopEnd; s.connect(T.gain);
  const off = Math.min(Math.max(T.pos, T.M.loopStart), T.M.loopEnd - 0.01);
  s.start(0, off); T.src = s; T.t0 = ctx.currentTime - off; T.playing = true;
  fadeGain(T.gain.gain, T.M.gain, fade);
}
function trackPos(T) {
  if (T.el) return T.el.currentTime || T.M.loopStart;
  if (!T.playing) return T.pos;
  const L = T.M.loopEnd - T.M.loopStart, t = ctx.currentTime - T.t0;
  return t < T.M.loopEnd ? t : T.M.loopStart + ((t - T.M.loopStart) % L);
}
// Cleanup must use the same clock as the gain ramp: a background tab freezes
// AudioContext.currentTime, but ordinary setTimeout callbacks can still run.
function afterAudioTime(secs, fn) {
  const deadline = ctx.currentTime + secs;
  const timer = {
    id: null, cancelled: false,
    cancel() { this.cancelled = true; clearTimeout(this.id); audioTimers.delete(this); },
    finish() { if (!this.cancelled) { this.cancel(); fn(); } },
  };
  audioTimers.add(timer);
  const check = () => {
    if (timer.cancelled) return;
    const remaining = deadline - ctx.currentTime;
    if (remaining > 0) timer.id = setTimeout(check, remaining * 1000 + 60);
    else timer.finish();
  };
  timer.id = setTimeout(check, secs * 1000 + 60);
  return timer;
}
function stopTrack(T, fade) {
  if (!T) return;
  if (T.stopTimer) T.stopTimer.cancel();
  T.pos = trackPos(T);
  const halt = () => {
    T.stopTimer = null; if (currentTrack === T.id) return;
    if (T.el) T.el.pause();
    if (T.src) { try { T.src.stop(); } catch (e) { } T.src.disconnect(); T.src = null; }
    T.playing = false;
    // keep at most the current and one previous decoded track resident (about 20 MB each on an iPad)
    for (const k in tracks) if (k !== currentTrack && k !== T.id && tracks[k].buf && !tracks[k].playing) tracks[k].buf = null;
  };
  if (T.fallback || !(fade > 0)) { if (!T.fallback) fadeGain(T.gain.gain, 0, 0); halt(); return; }
  fadeGain(T.gain.gain, 0, fade);
  T.stopTimer = afterAudioTime(fade, halt);
}
/** Crossfade to a music track. opts.fade seconds (default 1.5); opts.restart starts the new track from its top. */
export function playTrack(id, opts = {}) {
  if (id !== null && !MUSIC[id]) return;
  musicWanted = true; wantedTrack = id; init(); if (!ctx || !musicOn) return;
  const fade = opts.fade === undefined ? 1.5 : opts.fade, prev = currentTrack;
  if (prev && prev !== id) stopTrack(tracks[prev], fade);
  currentTrack = id; if (id === null) return;
  const T = trackNode(id);
  if (T.stopTimer) { T.stopTimer.cancel(); T.stopTimer = null; }
  if (opts.restart) {
    if (T.src) { try { T.src.stop(); } catch (e) { } T.src.disconnect(); T.src = null; }
    T.playing = false; T.pos = T.M.loopStart || 0;
    if (T.el) T.el.currentTime = 0;
  }
  if (T.M.stream) {
    const el = streamEl(T); el.muted = muted;
    if (T.fallback) { el.volume = 0.34 * T.M.gain; } else fadeGain(T.gain.gain, T.M.gain, prev && prev !== id ? fade : 0);
    if (!audioHidden && (el.paused !== false || !T.playing)) el.play().catch(() => {});
    T.playing = true;
    return;
  }
  if (T.playing) { fadeGain(T.gain.gain, T.M.gain, fade); return; }
  loadMusicBuffer(T).then(buf => { if (buf && tracks[id] === T && currentTrack === id && musicOn) startBuffer(T, prev ? fade : 0.4); });
}
/** what the backend is playing (or will play once decoded): for tests and the perf panel */
export function musicState() { return { current: currentTrack, wanted: wantedTrack, on: musicOn, decoded: Object.keys(tracks).filter(k => tracks[k].buf) }; }
/** after a user gesture: retry a stream element the browser refused to autoplay */
function resumeMusic() {
  if (audioHidden) return;
  // Include an outgoing streamed track if a crossfade was in progress at hide.
  for (const T of Object.values(tracks)) if (T.playing && T.el && T.el.paused !== false) T.el.play().catch(() => {});
  // A failed fetch/decode leaves the selection intact; retry it on recovery.
  const T = tracks[currentTrack];
  if (T && !T.M.stream && !T.playing && !T.loading) playTrack(T.id, { fade: 0.4 });
  if (!currentTrack && wantedTrack !== null) playMusic();
}
export function audioUnlocked() { return unlocked; }
export function playMusic() { playTrack(wantedTrack === undefined ? 'stage1' : wantedTrack, { fade: 0 }); }
export function toggleMusic() {
  musicOn = !musicOn;
  if (musicOn && musicWanted) { const id = wantedTrack; currentTrack = null; playTrack(id, { fade: 0.6 }); }
  else if (!musicOn) for (const k in tracks) { const T = tracks[k]; T.pos = trackPos(T); if (T.el) T.el.pause(); if (T.src) { try { T.src.stop(); } catch (e) { } T.src.disconnect(); T.src = null; } T.playing = false; }
  return musicOn;
}
export function toggleMute() {
  muted = !muted; if (master) master.gain.value = muted ? 0 : 0.8;
  for (const k in tracks) if (tracks[k].el) tracks[k].el.muted = muted;
  if (muted) stopSceneAudio();
  return muted;
}
// ---------- rain ambience (Stage 2): two looping filtered-noise beds, no file ----------
let rainNodes = null;
function disposeRain(R) {
  for (const [s, fl, v] of R.parts) { try { s.stop(); } catch (e) { } s.disconnect(); fl.disconnect(); v.disconnect(); }
  R.g.disconnect();
}
export function setRain(on, level = 1) {
  init(); if (!ctx) return;
  if (on && !rainNodes) {
    const n = ctx.sampleRate * 2, buf = ctx.createBuffer(1, n, ctx.sampleRate), c = buf.getChannelData(0);
    let b = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; b = 0.97 * b + 0.03 * w; c[i] = w * 0.6 + b * 2.2; }
    const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
    const mk = (type, f, q, vol) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const v = ctx.createGain(); v.gain.value = vol; s.connect(fl); fl.connect(v); v.connect(g); s.start(0, Math.random() * 1.5); return [s, fl, v]; };
    rainNodes = { g, parts: [mk('highpass', 2600, 0.5, 0.055), mk('bandpass', 900, 0.7, 0.07)] };
    fadeGain(g.gain, level, 2.5);
  } else if (!on && rainNodes) {
    const R = rainNodes; rainNodes = null; fadeGain(R.g.gain, 0, 1.2);
    afterAudioTime(1.4, () => disposeRain(R));
  }
}
function loadClip(id) {
  init(); if (!ctx) return Promise.resolve(null);
  if (clips[id]) return clips[id];
  const audioContext = ctx, epoch = audioEpoch;
  return (clips[id] = fetch(`assets/audio/voice/${id}.mp3`).then(r => r.ok ? r.arrayBuffer() : null)
    .then(b => b ? new Promise(res => {
      // Some implementations expose both callbacks and a rejecting decode promise.
      const pending = audioContext.decodeAudioData(b, res, () => res(null));
      if (pending && pending.catch) pending.catch(() => res(null));
    }) : null).catch(() => null).then(buf => {
      if (epoch !== audioEpoch) return null;
      if (!buf) delete clips[id]; // A temporary load/decode failure must not poison the cache.
      return buf;
    }));
}
export function preloadVoices() { Object.keys(VOICE).forEach(loadClip); }
/** on-demand preload for EXTRA_VOICE lines (power pickups and the Twix cutscene) */
export function preloadClips(ids) { for (const id of ids) if (Object.hasOwn(EXTRA_VOICE, id)) loadClip(id); }
/** Drop decoded lines the next stage does not play. Shared VOICE clips stay cached. */
export function releaseClips(ids) { if (ids) for (const id of ids) delete clips[id]; }
export function residentClipIds() { return Object.keys(clips); }
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
