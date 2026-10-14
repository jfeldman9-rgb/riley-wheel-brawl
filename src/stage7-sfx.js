// Stage 7 synth cues. Not on the Stage 1 sfx object.
export const STAGE7_CUES = {
  harpPluck: [{ kind: 'tone', f0: 880, f1: 870, dur: 0.35, vol: 0.14, type: 'sine' }, { kind: 'tone', f0: 1760, f1: 1740, dur: 0.2, vol: 0.06, type: 'sine' }],
  harpGold: [{ kind: 'tone', f0: 1318, f1: 1300, dur: 0.45, vol: 0.16, type: 'sine' }, { kind: 'tone', f0: 2637, f1: 2600, dur: 0.3, vol: 0.07, type: 'sine' }],
  glassHum: [{ kind: 'tone', f0: 1560, f1: 1580, dur: 0.9, vol: 0.06, type: 'sine', attack: 0.2 }],
  shardCrack: [{ kind: 'noise', f0: 3200, f1: 900, dur: 0.14, vol: 0.16, filter: 'highpass' }, { kind: 'tone', f0: 2100, f1: 900, dur: 0.1, vol: 0.08, type: 'sine' }],
  windGust: [{ kind: 'noise', f0: 500, f1: 240, dur: 1.2, vol: 0.14, filter: 'bandpass', attack: 0.3 }],
  shaidoShout: [{ kind: 'tone', f0: 300, f1: 180, dur: 0.18, vol: 0.1, type: 'sawtooth' }],
  shaidoCry: [{ kind: 'tone', f0: 420, f1: 240, dur: 0.22, vol: 0.09, type: 'sawtooth' }],
  earthHeave: [{ kind: 'noise', f0: 180, f1: 50, dur: 0.7, vol: 0.26, filter: 'lowpass' }, { kind: 'tone', f0: 64, f1: 34, dur: 0.8, vol: 0.22, type: 'sine' }],
  lanSlash: [{ kind: 'noise', f0: 2400, f1: 500, dur: 0.14, vol: 0.16, filter: 'highpass' }, { kind: 'tone', f0: 1200, f1: 300, dur: 0.12, vol: 0.08, type: 'sawtooth' }],
  shieldFlare: [{ kind: 'tone', f0: 660, f1: 990, dur: 0.5, vol: 0.12, type: 'sine' }, { kind: 'noise', f0: 1400, f1: 700, dur: 0.4, vol: 0.08, filter: 'bandpass' }],
  shockRing: [{ kind: 'noise', f0: 300, f1: 70, dur: 0.55, vol: 0.22, filter: 'lowpass' }, { kind: 'tone', f0: 90, f1: 40, dur: 0.6, vol: 0.2, type: 'sine' }],
  portalGlow: [{ kind: 'tone', f0: 520, f1: 780, dur: 0.8, vol: 0.07, type: 'sine', attack: 0.2 }],
};
const buffers = new WeakMap();
function noiseBuffer(ctx) {
  let buf = buffers.get(ctx);
  if (buf) return buf;
  const rate = ctx.sampleRate || 22050, n = rate;
  buf = ctx.createBuffer(1, n, rate);
  const data = buf.getChannelData(0);
  let seed = 0x7e21;
  for (let i = 0; i < n; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; data[i] = (seed / 0xffffffff) * 2 - 1; }
  buffers.set(ctx, buf);
  return buf;
}
function tone(ctx, bus, o) {
  const t0 = ctx.currentTime + (o.delay || 0), osc = ctx.createOscillator(), gain = ctx.createGain(), dur = o.dur || 0.1;
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.f0 || 440, t0);
  if (o.f1 !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(o.vol || 0.2, t0 + (o.attack || 0.005));
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain); gain.connect(bus); osc.start(t0); osc.stop(t0 + dur + 0.02);
}
function noise(ctx, bus, o) {
  const t0 = ctx.currentTime, src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain(), dur = o.dur || 0.2;
  src.buffer = noiseBuffer(ctx);
  filter.type = o.filter || 'lowpass'; filter.frequency.setValueAtTime(o.f0 || 800, t0);
  if (o.f1) filter.frequency.exponentialRampToValueAtTime(Math.max(40, o.f1), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(o.vol || 0.2, t0 + (o.attack || 0.01));
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter); filter.connect(gain); gain.connect(bus); src.start(t0); src.stop(t0 + dur + 0.02);
}
let cracks = 0, crackAt = 0;
export function playStage7Sfx(ctx, bus, name) {
  if (!ctx || !bus) return;
  if (name === 'shardCrack') {
    const now = ctx.currentTime || 0;
    if (now - crackAt > 0.4) { cracks = 0; crackAt = now; }
    if (cracks >= 3) return;
    cracks++;
  }
  for (const o of STAGE7_CUES[name] || []) (o.kind === 'tone' ? tone : noise)(ctx, bus, o);
}
