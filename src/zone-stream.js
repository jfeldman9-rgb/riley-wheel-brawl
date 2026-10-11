// Live backdrop: Riley's zone plus the next (prefetched while the camera is locked,
// and in view while it is not). The previous plate and its floor leave once the
// camera locks on. Floors shared by two zones stay until both are gone.
import { WORLD_W } from './config.js';

export const STREAMS = {
  5: {
    far: 'bg5far',
    zones: [
      { plate: 'bg5mid', floor: 'bg5floor' },
      { plate: 'bg5mid2', floor: 'bg5floor' },
      { plate: 'bg5mid3', floor: 'bg5floor2' },
      { plate: 'bg5mid4', floor: 'bg5floor3' },
    ],
  },
  6: {
    far: 'bg6far',
    zones: [
      { plate: 'bg6mid', floor: 'bg6floor' },
      { plate: 'bg6mid2', floor: 'bg6floor' },
      { plate: 'bg6mid3', floor: 'bg6floor2' },
      { plate: 'bg6mid4', floor: 'bg6floor3' },
    ],
  },
};

// Plate i sits on its zone. Neighbours share a 96 px feather, except the sea-gate
// and the Great Hall, which meet on the zone edge so the hall cannot show through.
export function plateRect(i, zones) {
  const l = zones[i].l;
  const last = i + 1 >= zones.length;
  const r = last ? WORLD_W : zones[i + 1].l;
  const bleedL = i === 0 ? 128 : (i === 2 ? 0 : 48);
  const bleedR = last ? 128 : (i + 1 === 2 ? 0 : 48);
  const x = (i ? l : 0) - bleedL;
  return { x, w: r + bleedR - x };
}

export function residentZones(scene) {
  const n = scene?.stageDef?.zones?.length || scene?.zones?.length || 4;
  let z = scene?.zoneI;
  if (typeof z !== 'number' || z < 0) z = 0;
  const out = [z];
  if (z + 1 < n) out.push(z + 1);
  return out;
}

export function residentKeys(scene, plan) {
  const keys = new Set();
  if (plan.far) keys.add(plan.far);
  for (const i of residentZones(scene)) {
    const slot = plan.zones[i];
    if (!slot) continue;
    keys.add(slot.plate);
    keys.add(slot.floor);
  }
  return keys;
}

export function plateKeyList(plan) {
  const keys = [];
  if (plan.far) keys.push(plan.far);
  for (const slot of plan.zones) {
    if (!keys.includes(slot.plate)) keys.push(slot.plate);
    if (!keys.includes(slot.floor)) keys.push(slot.floor);
  }
  return keys;
}

// Boot keeps zone 0, zone 1 and the far plate. Later zones load as Riley arrives.
export function deferredPlateKeys(plan) {
  const early = residentKeys({ zoneI: 0, stageDef: { zones: plan.zones } }, plan);
  return plateKeyList(plan).filter(key => !early.has(key));
}

export function createPlateStream(scene, stageNo, view, load) {
  const plan = STREAMS[stageNo];
  const wait = new Set();
  const api = {
    sync() {
      const keep = residentKeys(scene, plan);
      const T = scene.textures;
      if (view?.layoutPlates) view.layoutPlates(keep);
      else view?.dropBackdrop?.(keep);
      if (T?.exists && T.remove) {
        for (const key of plateKeyList(plan)) if (!keep.has(key) && T.exists(key)) T.remove(key);
      }
      if (view?.layoutPlates) return;
      for (const key of keep) {
        if (T?.exists?.(key)) { view?.showBackdrop?.(key); continue; }
        if (wait.has(key)) continue;
        const queued = load?.(key, ok => {
          wait.delete(key);
          if (!ok) view?.paintBackdrop?.(key);
          api.sync();
        });
        if (queued) { wait.add(key); continue; }
        view?.paintBackdrop?.(key);
        view?.showBackdrop?.(key);
      }
    },
  };
  return api;
}
