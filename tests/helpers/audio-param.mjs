// Deterministic subset of AudioParam automation used by production audio.js.
// Unlike a plain { value }, assignment inserts a setValueAtTime at the context's
// current time. The getter evaluates the active ramps, including interrupted ones.
export function audioParam(initial, now) {
  let timeline = [];
  const events = [];
  const schedule = (type, value, time) => {
    events.push([type, value, time]);
    const old = timeline.findIndex(e => e.type === type && e.time === time);
    const event = { type, value, time };
    if (old < 0) timeline.push(event); else timeline[old] = event;
    timeline.sort((a, b) => a.time - b.time);
  };
  const valueAt = time => {
    let value = initial, start = 0;
    for (const event of timeline) {
      if (time < event.time) {
        const u = (time - start) / (event.time - start);
        if (event.type === 'lin') return value + (event.value - value) * u;
        if (event.type === 'exp' && value > 0 && event.value > 0) return value * (event.value / value) ** u;
        return value;
      }
      value = event.value; start = event.time;
    }
    return value;
  };
  return {
    events, valueAt,
    get value() { return valueAt(now()); },
    set value(value) { this.setValueAtTime(value, now()); },
    setValueAtTime(value, time) { schedule('set', value, time); return this; },
    linearRampToValueAtTime(value, time) { schedule('lin', value, time); return this; },
    exponentialRampToValueAtTime(value, time) { schedule('exp', value, time); return this; },
    cancelScheduledValues(time) { events.push(['cancel', time]); timeline = timeline.filter(e => e.time < time); return this; },
  };
}
