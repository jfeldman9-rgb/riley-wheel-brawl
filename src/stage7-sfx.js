// Stage 7 synth cues. No new audio files.
export const STAGE7_CUES = {
  harp: [{ kind: 'tone', f0: 520, f1: 360, dur: 0.18, vol: 0.08, type: 'triangle' }],
  gold: [{ kind: 'tone', f0: 740, f1: 980, dur: 0.16, vol: 0.07, type: 'sine' }],
  hum: [{ kind: 'tone', f0: 280, f1: 420, dur: 0.45, vol: 0.06, type: 'sine' }],
  crack: [{ kind: 'noise', f0: 1800, f1: 300, dur: 0.12, vol: 0.12, filter: 'highpass' }],
  wind: [{ kind: 'noise', f0: 400, f1: 180, dur: 0.6, vol: 0.1, filter: 'lowpass' }],
  shout: [{ kind: 'tone', f0: 240, f1: 140, dur: 0.22, vol: 0.07, type: 'sawtooth' }],
  heave: [{ kind: 'noise', f0: 120, f1: 40, dur: 0.4, vol: 0.16, filter: 'lowpass' }],
  slash: [{ kind: 'noise', f0: 2200, f1: 500, dur: 0.1, vol: 0.12, filter: 'highpass' }],
  flare: [{ kind: 'tone', f0: 660, f1: 880, dur: 0.28, vol: 0.08, type: 'sine' }],
};
const buffers = new WeakMap();
function noiseBuffer(ctx) {
  let buf = buffers.get(ctx);
  if (buf) return buf;
  const rate = ctx.sampleRate || 22050, n = rate;
  buf = ctx.createBuffer(1, n, rate);
  const data = buf.getChannelData(0);
  let seed = 0x7a11;
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
  gain.gain.linearRampToValueAtTime(o.vol || 0.1, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain); gain.connect(bus); osc.start(t0); osc.stop(t0 + dur + 0.02);
}
function noise(ctx, bus, o) {
  const t0 = ctx.currentTime, src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain(), dur = o.dur || 0.2;
  src.buffer = noiseBuffer(ctx);
  filter.type = o.filter || 'lowpass'; filter.frequency.setValueAtTime(o.f0 || 800, t0);
  if (o.f1) filter.frequency.exponentialRampToValueAtTime(Math.max(40, o.f1), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(o.vol || 0.1, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter); filter.connect(gain); gain.connect(bus); src.start(t0); src.stop(t0 + dur + 0.02);
}
export function playStage7Sfx(ctx, bus, name) {
  if (!ctx || !bus) return;
  for (const o of STAGE7_CUES[name] || []) { if (o.kind === 'noise') noise(ctx, bus, o); else tone(ctx, bus, o); }
}
