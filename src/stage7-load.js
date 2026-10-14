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
  s._s7q ||= new Set();
  const fresh = rows.filter(
    (r) => keys.includes(r.key) && !s._s7q.has(r.key),
  );
  const wanted = queueStage6Painted(s, fresh);
  for (const key of wanted) s._s7q.add(key);
  return wanted;
}

// A timed-out demand paints a stand-in under the real key. Pull the file out of
// the loader first so a late complete cannot log "Texture key already in use"
// or a late error cannot delete that stand-in.
export function silenceLoader(load, key) {
  if (!load) return;
  for (const set of [load.list, load.inflight, load.queue]) {
    if (!set || typeof set.forEach !== "function" || typeof set.delete !== "function")
      continue;
    const drop = [];
    set.forEach((file) => {
      if (file && file.key === key) drop.push(file);
    });
    for (const file of drop) {
      set.delete(file);
      try {
        file.xhr?.abort?.();
      } catch (e) {
        /* already finished */
      }
      file.onProcess = () => {};
      file.onError = () => {};
      file.onLoad = () => {};
    }
  }
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
    const finish = (timedOut) => {
      if (finished) return;
      finished = true;
      root.clearTimeout(timeout);
      s.load.off?.("complete", onComplete);
      for (const key of wanted) pending.delete(key);
      if (timedOut) for (const key of wanted) silenceLoader(s.load, key);
      if (!kit.destroyed)
        paintStage7Art(
          s,
          [...wanted].filter((key) => !s.textures?.exists?.(key)),
        );
      settle();
    };
    const onComplete = () => finish(false);
    timeout = root.setTimeout(() => finish(true), 1500);
    s.load.once?.("complete", onComplete);
    kit.cleanups.push(() => {
      root.clearTimeout(timeout);
      s.load.off?.("complete", onComplete);
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
