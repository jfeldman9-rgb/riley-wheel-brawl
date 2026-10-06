// Browser frames are capped at 50 ms by Stage1. Bound direct core calls too, so
// a corrupt delta or a resumed tab cannot poison clocks or run unbounded substeps.
export function stage4Delta(dt) {
  return Number.isFinite(dt) && dt > 0 ? Math.min(dt, 60) : 0;
}
