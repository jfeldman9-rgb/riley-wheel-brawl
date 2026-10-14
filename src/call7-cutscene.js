// Moiraine/Lan call clips. One prefetch for the predicted helper, per-helper bags,
// and a strike that does not wait forever on the video. Riley only from behind (shooting rule).
import { CutscenePlayer, cutscenesEnabled } from './cutscene.js';
import { q } from './config.js';
import { quietStage7 } from './stage7-audio.js';

export const CALL7_POOLS = Object.freeze({
  moiraine: Object.freeze(['M1', 'M2']),
  lan: Object.freeze(['L1', 'L2']),
  duo: Object.freeze(['D1', 'D2']),
});
export const CALL7_BASE = 'assets/cutscenes/call7/';
export function bagKey(helper) { return 'rwb-call7-bag-' + (CALL7_POOLS[helper] ? helper : 'moiraine'); }
const START = 1500, STALL = 1500, MAX = 11000, GUARD = 900;

let bags = {}, blobUrl = null, blobId = null, blobHelper = null, held = 0;
let player = null, handle = null, ducked = null, prefetchVersion = 0, offShutdown = null, unpauseGame = null;

export function blobCount7() { return held; }
export function resetCall7(storage, rng) {
  abortCall7();
  bags = {};
  for (const h of Object.keys(CALL7_POOLS)) bags[h] = createBag7(storage, rng, CALL7_POOLS[h], bagKey(h));
}

function shuffle(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

export function createBag7(storage, rng, ids, key) {
  const pool = Array.isArray(ids) && ids.length ? ids.slice() : ['M1'];
  const storeKey = key || bagKey('moiraine');
  let saved = {};
  try { saved = JSON.parse(storage?.getItem?.(storeKey) || '{}') || {}; } catch { saved = {}; }
  let last = pool.includes(saved.last) ? saved.last : '';
  let rest = Array.isArray(saved.rest) ? saved.rest.filter(id => pool.includes(id)) : [];
  const save = () => { try { storage?.setItem?.(storeKey, JSON.stringify({ last, rest })); } catch { /* private mode */ } };
  const refill = () => {
    rest = shuffle(pool, rng || (() => 0.5));
    if (rest.length > 1 && rest[0] === last) { const t = rest[0]; rest[0] = rest[1]; rest[1] = t; }
  };
  return {
    next() { if (!rest.length) refill(); const id = rest.shift(); last = id; save(); return id; },
    peek() { if (!rest.length) refill(); return rest[0]; },
    get last() { return last; },
  };
}

function bagOf(helper, storage) {
  const h = CALL7_POOLS[helper] ? helper : 'moiraine';
  if (!bags[h]) bags[h] = createBag7(storage, undefined, CALL7_POOLS[h], bagKey(h));
  return bags[h];
}
function storageOf(root) { try { return root.sessionStorage; } catch { return undefined; } }

export function warmCall7(scene, helper) {
  const root = scene?.cutRoot || globalThis;
  if ((scene?.kit?.quality | 0) >= 4 || (scene?.fx?.quality | 0) >= 4) { dropBlob7(); return Promise.resolve(false); }
  const id = bagOf(helper, storageOf(root)).peek();
  return prefetchCall7(helper, id, root.fetch || globalThis.fetch);
}

export function dropBlob7() {
  prefetchVersion++;
  if (blobUrl) { try { URL.revokeObjectURL(blobUrl); } catch { /* already gone */ } }
  blobUrl = null; blobId = null; blobHelper = null; held = 0;
}

export function prefetchCall7(helper, id, fetcher = globalThis.fetch) {
  dropBlob7();
  const version = prefetchVersion;
  if (!id || !fetcher) return Promise.resolve(false);
  return Promise.resolve().then(() => fetcher(CALL7_BASE + id + '.mp4')).then(res => {
    if (!res || !res.ok || !res.blob) return false;
    return res.blob();
  }).then(b => {
    if (version !== prefetchVersion || !b || !URL.createObjectURL) return false;
    blobUrl = URL.createObjectURL(b); blobId = id; blobHelper = helper; held = 1; return true;
  }).catch(() => false);
}

function flushInp(scene) {
  try { scene?.inp?.flushPresses?.(); } catch { /* already clear */ }
  if (scene?.kit) scene.kit.flushInp = 1;
}

let unbless = null;
export function installCall7Bless(scene) {
  removeCall7Bless();
  const root = scene?.cutRoot || globalThis;
  const doc = root.document;
  if (!doc?.addEventListener || !doc.createElement) return;
  const fire = () => {
    try {
      if (!player || player.root !== root) player = new CutscenePlayer(root, { base: CALL7_BASE, startMs: START, stallMs: STALL, maxMs: MAX, guardMs: GUARD });
      player.bless();
    } catch { /* the element is not available yet */ }
  };
  doc.addEventListener('pointerdown', fire, true);
  doc.addEventListener('touchend', fire, true);
  unbless = () => {
    doc.removeEventListener('pointerdown', fire, true);
    doc.removeEventListener('touchend', fire, true);
    unbless = null;
  };
}
export function removeCall7Bless() { if (unbless) unbless(); }

function unduck(scene) {
  const m = scene?.music;
  if (m && ducked) { m.gainMul = ducked.gainMul ?? 1; if (m.state !== ducked.state && m.set) m.set(ducked.state); }
  ducked = null;
}

function whyOf(log, id, how) {
  const tag = [...(log || [])].reverse().find(l => typeof l === 'string' && l.startsWith(id + ':'));
  const raw = tag ? tag.slice(id.length + 1) : how;
  if (raw === 'ended' || raw === 'end') return 'end';
  if (raw === 'skipped' || raw === 'skip') return 'skip';
  if (raw === 'timeout') return 'timeout';
  if (raw === 'stall') return 'stall';
  if (raw === 'error' || raw === 'refused') return 'error';
  return how || 'end';
}

export function abortCall7(scene) {
  const h = handle; handle = null;
  try { h?.abort?.(); } catch { /* overlay already gone */ }
  offShutdown?.(); offShutdown = null;
  unpauseGame?.(); unpauseGame = null;
  try { player?.video?.pause(); } catch { /* detached element */ }
  flushInp(scene);
  dropBlob7(); unduck(scene); player = null;
  if (scene) { scene.cutscene = null; scene.setPauseReason?.('cutscene', false); }
}

export function playCall7(scene, helper, then) {
  const root = scene?.cutRoot || globalThis;
  if (!cutscenesEnabled(q, root.navigator) || handle?.active || scene.cutscene) return false;
  const id = bagOf(helper, storageOf(root)).next();
  let once = false;
  const finish = how => {
    if (once) return;
    once = true;
    handle = null;
    try { scene.inp?.pollPad?.(); } catch { /* disconnected pad */ }
    offShutdown?.(); offShutdown = null;
    unpauseGame?.(); unpauseGame = null;
    flushInp(scene);
    scene.cutscene = null;
    scene.setPauseReason?.('cutscene', false);
    unduck(scene);
    const nextHelper = scene.kit?.predicted || helper;
    const next = bagOf(nextHelper, storageOf(root)).peek();
    if ((scene.kit?.quality | 0) >= 4 || (scene.fx?.quality | 0) >= 4) dropBlob7();
    else { dropBlob7(); prefetchCall7(nextHelper, next, root.fetch || globalThis.fetch); }
    try { then(how); } catch (e) { root.console?.error?.(e); }
  };
  const m = scene.music;
  if (m) { ducked = { state: m.state, track: m.track, gainMul: m.gainMul ?? 1 }; m.gainMul = 0.35; }
  quietStage7(scene, 'cutscene');
  scene.setPauseReason?.('cutscene', true);
  const game = scene.game, ownsPause = !!game && !game.isPaused && typeof game.pause === 'function';
  unpauseGame = () => { if (ownsPause && game.isPaused && !game.pendingDestroy) game.resume?.(); };
  if (ownsPause) game.pause();
  scene.cutscene = {
    call7: true, i: 0, line: null,
    press(a) { handle?.skip?.(a || 'press', a === 'pause' || a === 'start'); },
    next(why) { handle?.next?.(why || 'watchdog'); },
  };
  try {
    if (!player || player.root !== root) player = new CutscenePlayer(root, { base: CALL7_BASE, startMs: START, stallMs: STALL, maxMs: MAX, guardMs: GUARD });
    const activePlayer = player;
    const off = () => abortCall7(scene);
    scene.events?.once?.('shutdown', off);
    offShutdown = () => scene.events?.off?.('shutdown', off);
    const url = blobId === id && blobHelper === helper ? blobUrl : null;
    player.srcOf = key => url && key === id ? { src: url, poster: CALL7_BASE + key + '.jpg' } : null;
    const nextHandle = player.play([id], {
      done: how => finish(whyOf(activePlayer.log, id, how)),
      touch: !!scene.game?.inp?.isTouch,
      progress: n => {
        if (scene.cutscene) scene.cutscene.i = n;
        if ((+player?.video?.currentTime || 0) >= 11) handle?.next?.('timeout');
      },
    });
    if (!once) handle = nextHandle;
    return true;
  } catch {
    abortCall7(scene);
    return false;
  }
}
