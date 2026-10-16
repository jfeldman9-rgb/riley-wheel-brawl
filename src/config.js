// Shared constants for Riley Wheel Brawl 2.0 (Stage 1 vertical slice).
export const VW = 1280, VH = 720;
export const LANE_TOP = 572, LANE_BOT = 690;      // walkable depth band (screen y of feet)
export const WORLD_W = 5200;
export const q = new URLSearchParams(location.search);
export const DPR = window.devicePixelRatio || 1;
export const HITSTOP = { light: 4, medium: 6, heavy: 9, finisher: 14 };   // frames @60
export const SHAKE = { light: 0.16, medium: 0.28, heavy: 0.5, finisher: 0.75 };
export const DEBUG = !!q.get('debug');
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];

/** iPhone, iPad, or a coarse primary pointer. ?touch=1 / ?touch=0 forces it for the texture dump. */
export function coarsePointer(root = globalThis, search = q) {
  if (search?.get?.('touch') === '1') return true;
  if (search?.get?.('touch') === '0') return false;
  try {
    if (root.matchMedia?.('(pointer: coarse)')?.matches) return true;
  } catch (e) { /* matchMedia can throw in locked-down webviews */ }
  const nav = root.navigator;
  const ua = nav?.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua)) return true;
  if ((nav?.maxTouchPoints || 0) > 1 && /Mac/.test(nav?.platform || '')) return true;
  return false;
}

/**
 * Starting render scale. ?rs= always wins (desktop screenshots and the dump tool).
 * Touch / iOS uses the fitted 16:9 CSS height, in quarter steps, and never starts above 1.5.
 * A desktop pointer keeps the old min(2, devicePixelRatio) scale.
 */
export function chooseRenderScale({ dpr = 1, coarse = false, cssHeight = 0, rsQuery = null, gameHeight = VH } = {}) {
  const asked = rsQuery == null || rsQuery === '' ? NaN : +rsQuery;
  if (Number.isFinite(asked) && asked > 0) return Math.max(1, Math.min(asked, 2));
  if (coarse) {
    if (cssHeight > 0 && dpr > 0 && gameHeight > 0) {
      const fitted = Math.round((cssHeight * dpr / gameHeight) * 4) / 4;
      return Math.max(1, Math.min(fitted, 1.5));
    }
    return 1.5;
  }
  const device = Math.min(2, dpr || 1);
  return Math.max(1, Math.min(device, 2));
}

function fittedCssHeight() {
  const vv = window.visualViewport;
  const w = vv?.width || window.innerWidth || 0;
  const h = vv?.height || window.innerHeight || 0;
  if (!(w > 0) || !(h > 0)) return 0;
  return Math.min(h, w * VH / VW);
}

// Desktop retina still starts at 2. Touch / iOS starts at 1.5 or the fitted canvas size, whichever is lower.
export const RS0 = chooseRenderScale({
  dpr: DPR,
  coarse: coarsePointer(),
  cssHeight: fittedCssHeight(),
  rsQuery: q.get('rs'),
});

/** Bloom is on for a mouse, off on touch / iOS, unless ?bloom=0 or ?bloom=1 says otherwise. */
export function bloomOnByDefault(search = q, coarse = coarsePointer()) {
  if (search?.get?.('bloom') === '0') return false;
  if (search?.get?.('bloom') === '1') return true;
  return !coarse;
}
