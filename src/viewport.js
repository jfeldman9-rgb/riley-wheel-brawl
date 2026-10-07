// iOS Safari clips a FIT canvas when the page can scroll or #game is taller than
// the visible viewport. Lock scrolling and size the shell with dvh first.
// visualViewport offsets are applied only when the shell is already clipped,
// and they replace the inline position instead of stacking on it.
import { debugViewportEnabled } from './debug-flag.js';

export const VIEWPORT_SETTLE_MS = 250;

export const VIEWPORT_CSS = `
html, body {
  overflow: hidden;
  overscroll-behavior: none;
}
#game {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
}
#game canvas {
  touch-action: none;
}
`;

export function installViewportCss(doc) {
  if (!doc || typeof doc.getElementById !== 'function' || typeof doc.createElement !== 'function') return;
  if (doc.getElementById('rwb-viewport-css')) return;
  const style = doc.createElement('style');
  style.id = 'rwb-viewport-css';
  style.textContent = VIEWPORT_CSS;
  (doc.head || doc.documentElement || doc.body)?.appendChild(style);
}

export function readVisualFrame(root = globalThis) {
  const vv = root.visualViewport;
  return {
    width: Math.round(vv?.width ?? root.innerWidth ?? 0),
    height: Math.round(vv?.height ?? root.innerHeight ?? 0),
    offsetLeft: Math.round(vv?.offsetLeft || 0),
    offsetTop: Math.round(vv?.offsetTop || 0),
  };
}

/** rect is getBoundingClientRect (origin at the visible viewport). */
export function elementClipped(rect, view, slack = 1) {
  if (!rect || !view) return false;
  return rect.top < -slack || rect.left < -slack || rect.bottom > view.height + slack || rect.right > view.width + slack;
}

export function fitCanvasRect(frame, gameW = 1280, gameH = 720) {
  const width = frame?.width || 0, height = frame?.height || 0;
  const scale = width > 0 && height > 0 ? Math.min(width / gameW, height / gameH) : 0;
  const w = gameW * scale, h = gameH * scale;
  const left = (frame?.offsetLeft || 0) + (width - w) / 2;
  const top = (frame?.offsetTop || 0) + (height - h) / 2;
  return { left, top, right: left + w, bottom: top + h, width: w, height: h, scale };
}

/**
 * Move #game only when its box is outside the visible viewport.
 * A fixed shell whose rect already starts at 0 is not moved, even if
 * visualViewport.offsetTop is nonzero — that would shift it twice.
 * The assigned top/left replaces any previous pin.
 */
export function applyPinFallback(el, frame, rect) {
  if (!el || !frame) return { pinned: false, cleared: false };
  const top = frame.offsetTop || 0, left = frame.offsetLeft || 0;
  const clipped = elementClipped(rect, frame);
  if (!clipped) {
    if (el.dataset?.vvPin === '1' && top === 0 && left === 0) {
      el.style.left = '';
      el.style.top = '';
      el.style.width = '';
      el.style.height = '';
      el.style.right = '';
      el.style.bottom = '';
      if (el.dataset) delete el.dataset.vvPin;
      return { pinned: false, cleared: true };
    }
    return { pinned: el.dataset?.vvPin === '1', cleared: false };
  }
  if (top === 0 && left === 0) return { pinned: false, cleared: false };
  el.style.position = 'fixed';
  el.style.left = left + 'px';
  el.style.top = top + 'px';
  el.style.width = frame.width + 'px';
  el.style.height = frame.height + 'px';
  el.style.right = 'auto';
  el.style.bottom = 'auto';
  if (el.dataset) el.dataset.vvPin = '1';
  return { pinned: true, cleared: false };
}

export function createViewportScheduler(apply, deps = globalThis) {
  const raf = deps.requestAnimationFrame?.bind(deps) || globalThis.requestAnimationFrame || (fn => setTimeout(fn, 16));
  const setT = deps.setTimeout?.bind(deps) || setTimeout;
  const clearT = deps.clearTimeout?.bind(deps) || clearTimeout;
  let pending = false, timer = 0;
  return () => {
    if (!pending) {
      pending = true;
      raf(() => { pending = false; apply(false); });
    }
    if (timer) clearT(timer);
    timer = setT(() => { timer = 0; apply(true); }, VIEWPORT_SETTLE_MS);
  };
}

function shellSize(el, frame) {
  const w = Math.round(el?.clientWidth || frame.width || 0);
  const h = Math.round(el?.clientHeight || frame.height || 0);
  return { w, h };
}

function refreshScale(scale, width, height, pinned) {
  if (!scale) return;
  if (pinned && typeof scale.setParentSize === 'function') scale.setParentSize(width, height);
  else {
    scale.getParentBounds?.();
    scale.refresh?.();
  }
}

const fmt = r => r ? `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)}` : '?';

function updateViewportLogger(root, game, frame, pin) {
  const doc = root.document;
  if (!doc?.getElementById || !doc.createElement) return;
  let box = doc.getElementById('rwb-viewport-log');
  if (!box) {
    box = doc.createElement('div');
    box.id = 'rwb-viewport-log';
    box.setAttribute('aria-hidden', 'true');
    box.style.cssText = 'position:fixed;z-index:80;left:8px;top:8px;max-width:52vw;padding:6px 8px;background:#05070de6;color:#d6ffe8;font:11px/1.35 ui-monospace,monospace;pointer-events:none;white-space:pre;';
    (doc.body || doc.documentElement)?.appendChild(box);
  }
  const el = doc.getElementById('game');
  const ds = game?.scale?.displaySize;
  box.textContent = [
    `inner ${root.innerWidth || 0}×${root.innerHeight || 0}`,
    `vv ${frame.width}×${frame.height} off ${frame.offsetLeft},${frame.offsetTop}`,
    `game ${fmt(el?.getBoundingClientRect?.())}`,
    `canvas ${fmt(game?.canvas?.getBoundingClientRect?.())}`,
    `display ${ds ? Math.round(ds.width) + '×' + Math.round(ds.height) : '?'}`,
    `pin ${pin?.pinned ? 'on' : 'off'}`,
  ].join('\n');
}

export function syncGameViewport(game, root = globalThis, opts = {}) {
  const doc = root.document;
  if (doc) installViewportCss(doc);
  if ((root.scrollX || 0) !== 0 || (root.scrollY || 0) !== 0) root.scrollTo?.(0, 0);
  const el = game?.canvas?.parentElement || doc?.getElementById?.('game') || null;
  const frame = readVisualFrame(root);
  const rect = el?.getBoundingClientRect?.() || null;
  const pin = el ? applyPinFallback(el, frame, rect) : { pinned: false, cleared: false };
  const box = shellSize(el, frame);
  const key = `${box.w}x${box.h}:${pin.pinned ? 1 : 0}:${pin.cleared ? 1 : 0}`;
  const force = opts.force === true;
  let refreshed = false;
  if (game?.scale && (force || game.__vvKey !== key)) {
    game.__vvKey = key;
    refreshScale(game.scale, pin.pinned ? frame.width : box.w, pin.pinned ? frame.height : box.h, pin.pinned);
    refreshed = true;
  }
  if (debugViewportEnabled(root.location?.search)) updateViewportLogger(root, game, frame, pin);
  return { frame, pin, width: box.w, height: box.h, refreshed };
}

export function installViewportFit(game, root = globalThis) {
  if (root.document) installViewportCss(root.document);
  const schedule = createViewportScheduler(force => syncGameViewport(game, root, { force }), root);
  const opts = { passive: true };
  root.addEventListener?.('resize', schedule, opts);
  root.addEventListener?.('orientationchange', schedule, opts);
  root.visualViewport?.addEventListener?.('resize', schedule, opts);
  root.visualViewport?.addEventListener?.('scroll', schedule, opts);
  if (game) game.refitViewport = schedule;
  schedule();
  return schedule;
}
