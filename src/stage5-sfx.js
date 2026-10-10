// Stage 5 synth cues. Same oscillator shape as Stage 4. Not on the Stage 1 sfx object.
export const STAGE5_CUES = {
  stalkHiss: [{ kind: 'noise', f0: 2400, f1: 700, dur: 0.22, vol: 0.12, filter: 'bandpass', q: 2 }, { kind: 'tone', f0: 180, f1: 90, dur: 0.18, vol: 0.06, type: 'sawtooth' }],
  stalkLeap: [{ kind: 'noise', f0: 900, f1: 200, dur: 0.16, vol: 0.16, filter: 'bandpass' }, { kind: 'tone', f0: 140, f1: 60, dur: 0.14, vol: 0.1, type: 'sine' }],
  podSwell: [{ kind: 'tone', f0: 90, f1: 160, dur: 0.4, vol: 0.08, type: 'sine' }, { kind: 'noise', f0: 400, f1: 180, dur: 0.35, vol: 0.08, filter: 'lowpass' }],
  sporeSplat: [{ kind: 'noise', f0: 600, f1: 120, dur: 0.18, vol: 0.2, filter: 'lowpass' }, { kind: 'tone', f0: 70, f1: 40, dur: 0.2, vol: 0.12, type: 'sine' }],
  treeCreak: [{ kind: 'tone', f0: 120, f1: 70, dur: 0.55, vol: 0.1, type: 'sawtooth', attack: 0.12 }, { kind: 'noise', f0: 500, f1: 200, dur: 0.4, vol: 0.06, filter: 'bandpass' }],
  lashCrack: [{ kind: 'noise', f0: 1800, f1: 200, dur: 0.16, vol: 0.22, filter: 'bandpass' }, { kind: 'tone', f0: 80, f1: 40, dur: 0.2, vol: 0.14, type: 'sine' }],
  thornPulse: [{ kind: 'tone', f0: 220, f1: 180, dur: 0.08, vol: 0.04, type: 'triangle' }],
  tarHiss: [{ kind: 'noise', f0: 300, f1: 90, dur: 0.45, vol: 0.12, filter: 'lowpass', attack: 0.1 }],
  goutBurst: [{ kind: 'noise', f0: 200, f1: 60, dur: 0.35, vol: 0.28, filter: 'lowpass' }, { kind: 'tone', f0: 55, f1: 30, dur: 0.4, vol: 0.2, type: 'sine' }],
  ringCrack: [{ kind: 'noise', f0: 1600, f1: 300, dur: 0.28, vol: 0.16, filter: 'bandpass' }, { kind: 'tone', f0: 90, f1: 50, dur: 0.35, vol: 0.1, type: 'sine' }],
  handsBurst: [{ kind: 'noise', f0: 900, f1: 150, dur: 0.22, vol: 0.18, filter: 'lowpass' }, { kind: 'tone', f0: 70, f1: 40, dur: 0.2, vol: 0.1, type: 'triangle' }],
  drainHum: [{ kind: 'tone', f0: 110, dur: 0.6, vol: 0.06, type: 'sine' }, { kind: 'tone', f0: 164, dur: 0.6, vol: 0.04, type: 'triangle' }],
  embraceCue: [{ kind: 'noise', f0: 500, f1: 120, dur: 0.25, vol: 0.1, filter: 'bandpass' }, { kind: 'tone', f0: 200, f1: 80, dur: 0.3, vol: 0.08, type: 'sawtooth' }],
  eyeFlare: [{ kind: 'tone', f0: 240, f1: 480, dur: 0.45, vol: 0.1, type: 'sine' }, { kind: 'noise', f0: 2000, f1: 400, dur: 0.3, vol: 0.08, filter: 'highpass' }],
  oakGroan: [{ kind: 'tone', f0: 70, f1: 45, dur: 0.7, vol: 0.12, type: 'sine', attack: 0.1 }, { kind: 'noise', f0: 200, f1: 80, dur: 0.5, vol: 0.08, filter: 'lowpass' }],
  burnRoar: [{ kind: 'noise', f0: 400, f1: 80, dur: 0.8, vol: 0.3, filter: 'lowpass' }, { kind: 'tone', f0: 140, f1: 40, dur: 0.9, vol: 0.2, type: 'sawtooth' }],
};

const buffers = new WeakMap();
function noiseBuffer(ctx) {
  let buf = buffers.get(ctx);
  if (buf) return buf;
  const rate = ctx.sampleRate || 22050, n = rate;
  buf = ctx.createBuffer(1, n, rate);
  const data = buf.getChannelData(0);
  let seed = 0x5a17;
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
  const t0 = ctx.currentTime + (o.delay || 0), source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain(), dur = o.dur || 0.2;
  source.buffer = noiseBuffer(ctx);
  filter.type = o.filter || 'lowpass';
  filter.frequency.setValueAtTime(o.f0 || 1000, t0);
  if (o.f1 !== undefined) filter.frequency.exponentialRampToValueAtTime(Math.max(30, o.f1), t0 + dur);
  filter.Q.value = o.q || 1;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(o.vol || 0.2, t0 + (o.attack || 0.005));
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  source.connect(filter); filter.connect(gain); gain.connect(bus); source.start(t0); source.stop(t0 + dur + 0.02);
}
export function playStage5Sfx(ctx, bus, name) {
  const cue = STAGE5_CUES[name];
  if (!ctx || !bus || !cue) return false;
  for (const part of cue) (part.kind === 'noise' ? noise : tone)(ctx, bus, part);
  return true;
}
