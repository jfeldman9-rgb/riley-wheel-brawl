import { MUSIC } from "./audio.js";

// Repair only Stage 7 metadata, in place: cached tracks retain this object.
export function guardLoop7(id) {
  const end = id === "stage7" ? 40.25 : id === "boss7" ? 72.977279 : null;
  const m = MUSIC[id];
  if (end === null || !m) return;
  if (!Number.isFinite(m.loopStart) || m.loopStart < 0) m.loopStart = 0.25;
  if (!Number.isFinite(m.loopEnd) || m.loopEnd <= m.loopStart) m.loopEnd = end;
  if (m.loopStart >= m.loopEnd) m.loopStart = 0.25;
}
