// Moiraine / Lan call clips. The strike never waits on the video.
// Riley, when a clip exists, is only ever framed from behind.
import { q } from './config.js';
import { cutscenesEnabled } from './cutscene.js';

export const CALL7_CLIPS = Object.freeze({
  moiraine: Object.freeze(['M1', 'M2']),
  lan: Object.freeze(['L1', 'L2']),
  duo: Object.freeze(['D1', 'D2']),
});
export const CALL7_BASE = 'assets/cutscenes/call7/';
const BAG = { moiraine: 'rwb-call7-bag-moiraine', lan: 'rwb-call7-bag-lan', duo: 'rwb-call7-bag-duo' };
export const CALL_TIMING = Object.freeze({ startMs: 1500, stallMs: 1500, maxMs: 11000, guard: 900 });

let blob = null, spin = 1;
function rng() { spin = (Math.imul(1664525, spin) + 1013904223) >>> 0; return spin / 4294967296; }

export function blobCount() { return blob ? 1 : 0; }
export function dropBlob() { blob = null; }

function bagKey(helper) { return BAG[helper] || BAG.moiraine; }

export function createBag(storage, helper, random = rng) {
  const pool = (CALL7_CLIPS[helper] || CALL7_CLIPS.moiraine).slice();
  const key = bagKey(helper);
  let saved = {};
  try { saved = JSON.parse(storage?.getItem?.(key) || '{}') || {}; } catch { saved = {}; }
  let rest = Array.isArray(saved.rest) ? saved.rest.filter(id => pool.includes(id)) : [];
  let last = pool.includes(saved.last) ? saved.last : '';
  const save = () => { try { storage?.setItem?.(key, JSON.stringify({ last, rest })); } catch { /* private mode */ } };
  const refill = () => {
    rest = pool.slice();
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); const t = rest[i]; rest[i] = rest[j]; rest[j] = t; }
    if (rest.length > 1 && rest[0] === last) { const t = rest[0]; rest[0] = rest[1]; rest[1] = t; }
  };
  return {
    next() { if (!rest.length) refill(); const id = rest.shift(); last = id; save(); return id; },
    peek() { if (!rest.length) refill(); return rest[0]; },
  };
}

const bags = new Map();
function bagOf(helper, storage) {
  if (!bags.has(helper)) bags.set(helper, createBag(storage, helper));
  return bags.get(helper);
}
function storageOf(root) { try { return root?.sessionStorage; } catch { return undefined; } }

export function prefetch(helper, fetcher) {
  if ((blob && blob.helper === helper) || !helper) return blob;
  dropBlob();
  const id = CALL7_CLIPS[helper]?.[0];
  blob = { helper, id, url: CALL7_BASE + id + '.mp4' };
  if (typeof fetcher === 'function') { try { fetcher(blob.url); } catch { /* missing clip stays an overlay miss */ } }
  return blob;
}

export function warmCall(scene, helper) {
  if ((scene?.kit?.quality | 0) >= 4 || (scene?.fx?.quality | 0) >= 4) { dropBlob(); return; }
  const root = scene?.cutRoot || globalThis;
  const id = bagOf(helper, storageOf(root)).peek();
  if (blob && blob.helper === helper && blob.id === id) return;
  dropBlob();
  blob = { helper, id, url: CALL7_BASE + id + '.mp4' };
}

/** then() runs now. A clip is a best-effort overlay and cannot delay the strike. */
export function playCall7(scene, helper, then) {
  const root = scene?.cutRoot || globalThis;
  const storage = storageOf(root);
  const id = bagOf(helper || 'moiraine', storage).next();
  const enabled = cutscenesEnabled(q, root.navigator);
  try { then?.(); } catch (err) { root.console?.error?.(err); }
  if (!enabled) return false;
  scene.kit && (scene.kit.lastClip = { helper, id, waited: false, timing: CALL_TIMING });
  return true;
}

export function abortCall7(scene) {
  dropBlob();
  if (scene?.kit) scene.kit.lastClip = null;
}

export function resetCall7Bags() { bags.clear(); dropBlob(); }
