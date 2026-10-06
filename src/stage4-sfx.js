// Stage 4 synth cues. Same oscillator / filtered-noise shape as src/audio.js tone() and noise().
// Not registered on the Stage 1-3 sfx object. T11 plays these through the existing sfx bus.

export const STAGE4_CUES = {
  fogGurgle: [
    { kind: 'noise', f0: 220, f1: 80, dur: 0.62, vol: 0.18, filter: 'lowpass', attack: 0.12 },
    { kind: 'tone', f0: 74, f1: 52, dur: 0.58, vol: 0.1, type: 'sine', attack: 0.08 },
    { kind: 'noise', f0: 140, f1: 90, dur: 0.28, vol: 0.08, filter: 'bandpass', q: 2, delay: 0.22, attack: 0.06 },
  ],
  towerCrack: [
    { kind: 'noise', f0: 2800, f1: 140, dur: 0.32, vol: 0.42, filter: 'bandpass', q: 0.7 },
    { kind: 'tone', f0: 110, f1: 36, dur: 0.48, vol: 0.4, type: 'sine' },
    { kind: 'noise', f0: 600, f1: 180, dur: 0.4, vol: 0.16, filter: 'lowpass', delay: 0.04 },
  ],
  screech: [
    { kind: 'tone', f0: 720, f1: 1680, dur: 0.42, vol: 0.14, type: 'sawtooth' },
    { kind: 'tone', f0: 1440, f1: 540, dur: 0.48, vol: 0.07, type: 'triangle', delay: 0.06 },
    { kind: 'noise', f0: 3200, f1: 900, dur: 0.2, vol: 0.08, filter: 'highpass' },
  ],
  croonChord: [
    { kind: 'tone', f0: 196, dur: 0.9, vol: 0.1, type: 'sine' },
    { kind: 'tone', f0: 247, dur: 0.9, vol: 0.08, type: 'sine' },
    { kind: 'tone', f0: 294, dur: 0.9, vol: 0.07, type: 'triangle' },
    { kind: 'tone', f0: 392, dur: 0.7, vol: 0.04, type: 'sine', delay: 0.12 },
  ],
};

const buffers = new WeakMap();

function noiseBuffer(ctx) {
  let buf = buffers.get(ctx);
  if (buf) return buf;
  const rate = ctx.sampleRate || 22050;
  const n = rate;
  buf = ctx.createBuffer(1, n, rate);
  const data = buf.getChannelData(0);
  let seed = 0x5a17;
  for (let i = 0; i < n; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i] = (seed / 0xffffffff) * 2 - 1;
  }
  buffers.set(ctx, buf);
  return buf;
}

function tone(ctx, bus, o) {
  const t0 = ctx.currentTime + (o.delay || 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const dur = o.dur || 0.1;
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.f0 || 440, t0);
  if (o.f1 !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(o.vol || 0.2, t0 + (o.attack || 0.005));
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(bus);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(ctx, bus, o) {
  const t0 = ctx.currentTime + (o.delay || 0);
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  const dur = o.dur || 0.2;
  source.buffer = noiseBuffer(ctx);
  filter.type = o.filter || 'lowpass';
  filter.frequency.setValueAtTime(o.f0 || 1000, t0);
  if (o.f1 !== undefined) filter.frequency.exponentialRampToValueAtTime(Math.max(30, o.f1), t0 + dur);
  filter.Q.value = o.q || 1;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(o.vol || 0.2, t0 + (o.attack || 0.005));
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(bus);
  source.start(t0);
  source.stop(t0 + dur + 0.02);
}

/** Play one Stage 4 cue into bus. Returns false when the name is unknown or there is no context. */
export function playStage4Sfx(ctx, bus, name) {
  const cue = STAGE4_CUES[name];
  if (!ctx || !bus || !cue) return false;
  for (const part of cue) (part.kind === 'noise' ? noise : tone)(ctx, bus, part);
  return true;
}
