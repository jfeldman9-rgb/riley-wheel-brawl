// Stage 6 synth cues. Not on the Stage 1 sfx object.
export const STAGE6_CUES = {
  randThunder: [{ kind: 'noise', f0: 200, f1: 40, dur: 0.7, vol: 0.34, filter: 'lowpass' }, { kind: 'tone', f0: 70, f1: 32, dur: 0.8, vol: 0.28, type: 'sine' }],
  randCrack: [{ kind: 'noise', f0: 2800, f1: 400, dur: 0.12, vol: 0.2, filter: 'highpass' }, { kind: 'tone', f0: 880, f1: 220, dur: 0.1, vol: 0.1, type: 'sawtooth' }],
  randWhoosh: [{ kind: 'noise', f0: 900, f1: 180, dur: 0.28, vol: 0.16, filter: 'bandpass' }, { kind: 'tone', f0: 240, f1: 90, dur: 0.3, vol: 0.08, type: 'triangle' }],
  craneCreak: [{ kind: 'tone', f0: 140, f1: 70, dur: 0.55, vol: 0.1, type: 'sawtooth', attack: 0.08 }, { kind: 'noise', f0: 500, f1: 160, dur: 0.4, vol: 0.06, filter: 'bandpass' }],
  chainRattle: [{ kind: 'noise', f0: 1600, f1: 400, dur: 0.35, vol: 0.14, filter: 'bandpass' }, { kind: 'tone', f0: 320, f1: 180, dur: 0.2, vol: 0.06, type: 'square' }],
  knifeGlint: [{ kind: 'tone', f0: 1400, f1: 2200, dur: 0.08, vol: 0.05, type: 'sine' }],
};
const buffers = new WeakMap();
function noiseBuffer(ctx) {
  let buf = buffers.get(ctx);
  if (buf) return buf;
  const rate = ctx.sampleRate || 22050, n = rate;
  buf = ctx.createBuffer(1, n, rate);
  const data = buf.getChannelData(0);
  let seed = 0x6e11;
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
export function playStage6Sfx(ctx, bus, name) {
  if (!ctx || !bus) return;
  if (name === 'randCrack') {
    const now = ctx.currentTime || 0;
    if (now - crackAt > 0.4) { cracks = 0; crackAt = now; }
    if (cracks >= 3) return;
    cracks++;
  }
  for (const o of STAGE6_CUES[name] || []) (o.kind === 'tone' ? tone : noise)(ctx, bus, o);
}
