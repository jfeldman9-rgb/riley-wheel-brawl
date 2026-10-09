// Rand call clips. One prefetch, a shuffle bag, and a strike that does not wait on the video.
import { CutscenePlayer, cutscenesEnabled } from './cutscene.js';
import { q } from './config.js';

export const RAND_IDS = Object.freeze(['R1', 'R2', 'R3', 'R4', 'R5']);
export const BAG_KEY = 'rwb-rand-bag';
export const RAND_BASE = 'assets/cutscenes/rand/';
const START = 1500, STALL = 1500, MAX = 11000, GUARD = 900;

let bag = null, blobUrl = null, blobId = null, held = 0, player = null, handle = null, ducked = null;
let prefetchVersion = 0, offShutdown = null, unpauseGame = null;

export function blobCount() { return held; }
export function resetRandCall(storage, rng) {
  abortRandCall(); bag = createBag(storage, rng);
}

function shuffle(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

export function createBag(storage, rng = Math.random, ids) {
  const pool = Array.isArray(ids) && ids.length ? ids.slice() : RAND_IDS.slice();
  let saved = {};
  try { saved = JSON.parse(storage?.getItem?.(BAG_KEY) || '{}') || {}; } catch { saved = {}; }
  let last = pool.includes(saved.last) ? saved.last : '';
  let rest = Array.isArray(saved.rest) ? saved.rest.filter(id => pool.includes(id)) : [];
  const save = () => { try { storage?.setItem?.(BAG_KEY, JSON.stringify({ last, rest })); } catch { /* private mode */ } };
  const refill = () => {
    rest = shuffle(pool, rng);
    if (rest.length > 1 && rest[0] === last) { const j = 1 + Math.floor(rng() * (rest.length - 1)); const t = rest[0]; rest[0] = rest[j]; rest[j] = t; }
  };
  return {
    next() { if (!rest.length) refill(); const id = rest.shift(); last = id; save(); return id; },
    peek() { if (!rest.length) refill(); return rest[0]; },
    get last() { return last; },
  };
}

function bagOf(storage) { if (!bag) bag = createBag(storage); return bag; }
function storageOf(root) { try { return root.sessionStorage; } catch { return undefined; } }

export function warmRand(scene) {
  const root = scene?.cutRoot || globalThis;
  if ((scene?.kit?.quality | 0) >= 4 || (scene?.fx?.quality | 0) >= 4) { dropBlob(); return Promise.resolve(false); }
  const id = bagOf(storageOf(root)).peek();
  return prefetchRand(id, root.fetch || globalThis.fetch);
}

export function dropBlob() {
  prefetchVersion++;
  if (blobUrl) { try { URL.revokeObjectURL(blobUrl); } catch { /* already gone */ } }
  blobUrl = null; blobId = null; held = 0;
}

export function prefetchRand(id, fetcher = globalThis.fetch) {
  dropBlob();
  const version = prefetchVersion;
  if (!id || !fetcher) return Promise.resolve(false);
  return Promise.resolve().then(() => fetcher(RAND_BASE + id + '.mp4')).then(res => {
    if (!res || !res.ok || !res.blob) return false;
    return res.blob();
  }).then(b => {
    if (version !== prefetchVersion || !b || !URL.createObjectURL) return false;
    blobUrl = URL.createObjectURL(b); blobId = id; held = 1; return true;
  }).catch(() => false);
}

function flushInp(scene) {
  try { scene?.inp?.flushPresses?.(); } catch { /* already clear */ }
  if (scene?.kit) scene.kit.flushInp = 1;
}

let unbless = null;
/** Capture listener so the second player is allowed sound before CALL is taken inside the Phaser step. */
export function installRandBless(scene) {
  removeRandBless();
  const root = scene?.cutRoot || globalThis;
  const doc = root.document;
  if (!doc?.addEventListener || !doc.createElement) return;
  const fire = () => {
    try {
      if (!player || player.root !== root) player = new CutscenePlayer(root, { base: RAND_BASE, startMs: START, stallMs: STALL, maxMs: MAX, guardMs: GUARD });
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
export function removeRandBless() { if (unbless) unbless(); }

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

export function abortRandCall(scene) {
  const h = handle; handle = null;
  try { h?.abort?.(); } catch { /* overlay already gone */ }
  offShutdown?.(); offShutdown = null;
  unpauseGame?.(); unpauseGame = null;
  try { player?.video?.pause(); } catch { /* detached element */ }
  flushInp(scene);
  dropBlob(); unduck(scene); player = null;
  if (scene) { scene.cutscene = null; scene.setPauseReason?.('cutscene', false); }
}

/** false when cutscenes are off: the caller runs the strike immediately. then() fires once. */
export function playCall(scene, then) {
  const root = scene?.cutRoot || globalThis;
  if (!cutscenesEnabled(q, root.navigator) || handle?.active || scene.cutscene) return false;
  const id = bagOf(storageOf(root)).next();
  let once = false;
  const finish = how => {
    if (once) return;
    once = true;
    handle = null;
    // Game.step did not poll pads under the video. Consume held edges while the
    // cutscene still owns onPress, before a Start edge can toggle manual pause.
    try { scene.inp?.pollPad?.(); } catch { /* disconnected pad */ }
    offShutdown?.(); offShutdown = null;
    unpauseGame?.(); unpauseGame = null;
    flushInp(scene);
    scene.cutscene = null;
    scene.setPauseReason?.('cutscene', false);
    unduck(scene);
    const next = bagOf(storageOf(root)).peek();
    if ((scene.kit?.quality | 0) >= 4 || (scene.fx?.quality | 0) >= 4) dropBlob();
    else { dropBlob(); prefetchRand(next, root.fetch || globalThis.fetch); }
    try { then(how); } catch (e) { root.console?.error?.(e); }
  };
  const m = scene.music;
  if (m) { ducked = { state: m.state, track: m.track, gainMul: m.gainMul ?? 1 }; m.gainMul = 0.35; }
  scene.setPauseReason?.('cutscene', true);
  const game = scene.game, ownsPause = !!game && !game.isPaused && typeof game.pause === 'function';
  unpauseGame = () => { if (ownsPause && game.isPaused && !game.pendingDestroy) game.resume?.(); };
  if (ownsPause) game.pause();
  scene.cutscene = {
    rand: true, i: 0, line: null,
    press(a) { handle?.skip?.(a || 'press', a === 'pause' || a === 'start'); },
    next(why) { handle?.next?.(why || 'watchdog'); },
  };
  try {
    if (!player || player.root !== root) player = new CutscenePlayer(root, { base: RAND_BASE, startMs: START, stallMs: STALL, maxMs: MAX, guardMs: GUARD });
    const activePlayer = player;
    const off = () => abortRandCall(scene);
    scene.events?.once?.('shutdown', off);
    offShutdown = () => scene.events?.off?.('shutdown', off);
    const url = blobId === id ? blobUrl : null;
    player.srcOf = key => url && key === id ? { src: url, poster: RAND_BASE + key + '.jpg' } : null;
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
    abortRandCall(scene);
    return false;
  }
}
