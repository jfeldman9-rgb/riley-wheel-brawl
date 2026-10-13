// Short synthesised cues; no buffers, loops or wall-clock gameplay dependencies.
export function playStage7Sfx(ctx, bus, name) {
  const pitches = { harp: 440, gold: 660, hum: 180, glass: 1180, wind: 90, shout: 135, shout2: 160, earth: 65, slash: 860, shield: 520 };
  const osc = ctx.createOscillator(), gain = ctx.createGain(), t = ctx.currentTime;
  const hz = pitches[name] || 330, duration = name === 'wind' ? 2.5 : name === 'hum' ? 1 : 0.28;
  osc.type = ['wind', 'earth', 'slash'].includes(name) ? 'sawtooth' : 'triangle';
  osc.frequency.setValueAtTime(hz, t); osc.frequency.exponentialRampToValueAtTime(hz * 0.5, t + duration);
  gain.gain.setValueAtTime(0.001, t); gain.gain.linearRampToValueAtTime(0.07, t + 0.02); gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain); gain.connect(bus); osc.start(t); osc.stop(t + duration);
  osc.onended = () => { osc.disconnect(); gain.disconnect(); };
}
