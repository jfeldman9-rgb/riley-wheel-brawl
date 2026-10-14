import { PAINTED7 } from "./stage7-painted.js";
import { paintStage7Art } from "./stage7-paint.js";
import { queueStage6Painted } from "./stage6-paint.js";
export const HELPERS7 = Object.freeze([
  "s7moir",
  "s7lan",
  "s7earth",
  "s7shield",
]);
export function queueStage7Painted(s, keys, rows = PAINTED7) {
  return queueStage6Painted(
    s,
    rows.filter((r) => keys.includes(r.key)),
  );
}

// Coalesce requests by key. The deadline uses wall time because strikes pause Phaser's clock.
export function demand7(kit, keys, done) {
  if (!kit || kit.destroyed) return;
  const pending = (kit.pendingArt ||= new Map());
  const s = kit.s,
    root = kit.artRoot || globalThis;
  const missing = keys.filter(
    (key) => !s.textures?.exists?.(key) && !pending.has(key),
  );
  const waiting = keys.map((key) => pending.get(key)).filter(Boolean);
  const wanted = s.load
    ? queueStage7Painted(s, missing, kit.artRows)
    : new Set();
  paintStage7Art(
    s,
    missing.filter((key) => !wanted.has(key)),
  );
  if (wanted.size) {
    let settle;
    const promise = new Promise((resolve) => {
      settle = resolve;
    });
    waiting.push(promise);
    for (const key of wanted) pending.set(key, promise);
    let finished = false,
      timeout;
    const finish = () => {
      if (finished) return;
      finished = true;
      root.clearTimeout(timeout);
      s.load.off?.("complete", finish);
      for (const key of wanted) pending.delete(key);
      if (!kit.destroyed) paintStage7Art(s, [...wanted]);
      settle();
    };
    timeout = root.setTimeout(finish, 1500);
    s.load.once?.("complete", finish);
    kit.cleanups.push(() => {
      root.clearTimeout(timeout);
      s.load.off?.("complete", finish);
      finished = true;
      for (const key of wanted) pending.delete(key);
      settle();
    });
    if (!s.load.isLoading?.()) s.load.start?.();
  }
  if (waiting.length)
    Promise.all(waiting).then(() => {
      if (!kit.destroyed) done?.();
    });
  else done?.();
}
