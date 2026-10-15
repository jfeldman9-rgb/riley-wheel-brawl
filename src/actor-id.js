// Actor identity is independent of per-scene KO/parity counters.
let next = 1;
export function actorId() { return next++; }
