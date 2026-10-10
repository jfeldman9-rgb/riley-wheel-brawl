// Shared Stage 5 clock. Reuses the Stage 4 delta clamp. Boss and hold logic
// substep at 120 Hz so 30, 60 and 120 Hz runs meet. A frame never runs more
// than SUB_CAP steps; leftover time above that cap is dropped.
import { stage4Delta } from './stage4-time.js';

export const HZ = 120;
export const SUB = 1 / HZ;
export const SUB_CAP = 180;

export function substeps(owner, dt, fn) {
  const d = stage4Delta(dt);
  if (!d) return 0;
  owner.accum = (owner.accum || 0) + d;
  let n = Math.floor(owner.accum * HZ + 1e-4);
  if (n > SUB_CAP) { owner.accum -= (n - SUB_CAP) * SUB; n = SUB_CAP; }
  for (let i = 0; i < n; i++) fn(SUB);
  owner.accum -= n * SUB;
  if (owner.accum > SUB_CAP * SUB) owner.accum = SUB_CAP * SUB;
  if (owner.accum < 1e-6) owner.accum = 0;
  return n;
}
