// Browser frames are capped at 50 ms by Stage1. Direct cores still accept the
// longest single call the kiss lockout uses (9.9 s) and no more: 60 s is 7200
// substeps at 120 Hz. A second call is the same clamp, not a unit conversion.
export const STAGE4_DT_MAX = 10;
export function stage4Delta(dt) {
  return Number.isFinite(dt) && dt > 0 ? Math.min(dt, STAGE4_DT_MAX) : 0;
}
