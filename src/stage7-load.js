import { PAINTED7 } from './stage7-painted.js';
import { paintStage7Art } from './stage7-paint.js';
import { queueStage6Painted } from './stage6-paint.js';
export const HELPERS7 = Object.freeze(['s7moir','s7lan','s7earth','s7shield']);
export function queueStage7Painted(s, keys) { return queueStage6Painted(s, PAINTED7.filter(r => keys.includes(r.key))); }
// The fallback is immediately available. Optional painted replacements are only loaded before first use.
export function demand7(kit, keys, done) {
  if(!kit || kit.destroyed) return;
  const pending=kit.pendingArt||(kit.pendingArt=new Set());
  const s=kit.s, missing=keys.filter(k=>!s.textures?.exists?.(k)&&!pending.has(k));
  const wanted=s.load ? queueStage7Painted(s,missing) : new Set();
  if(!wanted.size){paintStage7Art(s,missing);done?.();return;}
  for(const key of missing)pending.add(key);
  let finished=false;
  const finish=()=>{if(finished)return;finished=true;for(const key of missing)pending.delete(key);s.load.off?.('complete',finish);timeout?.remove?.();if(!kit.destroyed){paintStage7Art(s,missing);done?.();}else for(const k of missing)if(s.textures?.exists?.(k))s.textures.remove?.(k);};
  const timeout=s.time?.delayedCall?.(1500,finish);
  s.load.once?.('complete',finish);kit.cleanups.push(()=>{finished=true;timeout?.remove?.();s.load.off?.('complete',finish);});
  if(!s.load.isLoading?.())s.load.start?.();
}
