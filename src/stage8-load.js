import { PAINTED8 } from './stage8-painted.js';
import { paintStage8Art } from './stage8-paint.js';
import { queueStage6Painted } from './stage6-paint.js';
export function queueStage8Painted(s, keys, rows = PAINTED8) {
  s._s8q ||= new Set();s._s8generation ||= new Map();
  const versions=new Map(keys.map(key=>[key,s._s8generation.get(key)||0]));
  // Guard at the cache boundary as well as queue time: a timeout fallback or
  // restarted scene may populate the key while the file is still processing.
  const guardFile = file => {
    const target = file?.multiFile || file;
    if (!target || target._s8cacheGuard || typeof target.addToCache !== "function") return;
    target._s8cacheGuard = true;
    const add = target.addToCache;
    target.addToCache = function (...args) {
      if ((s._s8generation.get(file.key)||0)!==versions.get(file.key)||s.textures?.exists?.(this.key || file.key)) {
        this.complete = true;
        return;
      }
      return add.apply(this, args);
    };
  };
  const fresh = rows.filter(
    (r) => keys.includes(r.key) && !s._s8q.has(r.key),
  );
  const wanted = queueStage6Painted(s, fresh);
  for (const collection of [s.load?.list, s.load?.inflight, s.load?.queue])
    collection?.forEach?.(file => { if (wanted.has(file.key)) guardFile(file); });
  if (wanted.size) {
    const forget = () => {
      for (const key of wanted) s._s8q.delete(key);
      s.load?.off?.("complete", forget);
      s.events?.off?.("shutdown", forget);
    };
    s.load?.once?.("complete", forget);
    s.events?.once?.("shutdown", forget);
  }
  for (const key of wanted) s._s8q.add(key);
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
export function demand8(kit, keys, done) {
  if (!kit || kit.destroyed) return;
  if(keys.every(key=>kit.s.textures?.exists?.(key)&&!kit.pendingArt?.has(key))){done?.();return;}
  const pending = (kit.pendingArt ||= new Map());
  const versions=new Map(keys.map(key=>[key,kit.s._s8generation?.get(key)||0]));
  const s = kit.s,
    root = kit.artRoot || globalThis;
  const missing = keys.filter(
    (key) => !s.textures?.exists?.(key) && !pending.has(key),
  );
  const waiting = keys.map((key) => pending.get(key)).filter(Boolean);
  const wanted = s.load && missing.length
    ? queueStage8Painted(s, missing, kit.artRows)
    : new Set();
  paintStage8Art(
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
        paintStage8Art(
          s,
          [...wanted].filter((key) => (s._s8generation?.get(key)||0)===versions.get(key)&&!s.textures?.exists?.(key)),
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

// Drop display references before the GPU texture and invalidate late loader work.
export function releaseKeys8(k,keys){const s=k.s;s._s8generation ||= new Map();
 for(const key of keys){if(k.residentArt?.delete(key))k.artSignature=null;k.view?.dropKey?.(key);s._s8generation.set(key,(s._s8generation.get(key)||0)+1);silenceLoader(s.load,key);s._s8q?.delete(key);k.pendingArt?.delete(key);if(s.textures?.exists?.(key))s.textures.remove?.(key);}
}
