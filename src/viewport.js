// Pin the Phaser parent to the visual viewport. iOS Safari's layout viewport
// (and a position:fixed inset:0 parent) can stay taller than the visible
// area. Phaser FIT then letterboxes a 16:9 canvas in that tall box and the
// phone crops the top, which is where the HUD and health bars are drawn.
import { VW, VH } from './config.js';

const finite = n => typeof n === 'number' && Number.isFinite(n) ? n : null;

/** Visible box. visualViewport wins over the layout viewport when both exist. */
export function visualBox(vv, fallback = {}) {
  const width = finite(vv?.width) ?? finite(fallback.width) ?? 0;
  const height = finite(vv?.height) ?? finite(fallback.height) ?? 0;
  return {
    width: width > 0 ? width : 0,
    height: height > 0 ? height : 0,
    offsetTop: finite(vv?.offsetTop) ?? 0,
    offsetLeft: finite(vv?.offsetLeft) ?? 0,
  };
}

/**
 * Phaser Scale.FIT + CENTER_BOTH inside a visual-viewport box.
 * The returned canvas rect is the CSS box of the game canvas. World y=0
 * (the HUD) is canvas.top, which stays inside the visual viewport.
 */
export function fitGame(box, designW = VW, designH = VH) {
  const width = Math.max(0, finite(box?.width) ?? 0);
  const height = Math.max(0, finite(box?.height) ?? 0);
  const offsetTop = finite(box?.offsetTop) ?? 0;
  const offsetLeft = finite(box?.offsetLeft) ?? 0;
  const aspect = designW / designH;
  let canvasW = width, canvasH = height;
  if (width > 0 && height > 0) {
    if (width / height > aspect) { canvasH = height; canvasW = height * aspect; }
    else { canvasW = width; canvasH = width / aspect; }
  }
  return {
    parent: { top: offsetTop, left: offsetLeft, width, height },
    canvas: {
      width: canvasW,
      height: canvasH,
      top: offsetTop + (height - canvasH) / 2,
      left: offsetLeft + (width - canvasW) / 2,
    },
  };
}

/** Screen y of a HUD point (design pixels, origin top-left) after FIT. */
export function hudScreenY(fit, worldY, designH = VH) {
  if (!fit?.canvas || !designH) return fit?.canvas?.top ?? 0;
  return fit.canvas.top + (worldY / designH) * fit.canvas.height;
}

/** True when the whole canvas, including the top HUD, sits in the visual viewport. */
export function canvasInsideVisual(fit) {
  const viewTop = fit.parent.top, viewBottom = fit.parent.top + fit.parent.height;
  const viewLeft = fit.parent.left, viewRight = fit.parent.left + fit.parent.width;
  const c = fit.canvas;
  const slop = 0.51;
  return c.top >= viewTop - slop && c.top + c.height <= viewBottom + slop
    && c.left >= viewLeft - slop && c.left + c.width <= viewRight + slop
    && Math.abs(c.width / c.height - VW / VH) < 0.02;
}

export function readVisualViewport(root = globalThis) {
  return visualBox(root.visualViewport, { width: root.innerWidth, height: root.innerHeight });
}

export function applyGameFrame(el, fit) {
  if (!el?.style || !fit?.parent) return;
  const p = fit.parent;
  el.style.top = p.top + 'px';
  el.style.left = p.left + 'px';
  el.style.width = p.width + 'px';
  el.style.height = p.height + 'px';
  el.style.right = 'auto';
  el.style.bottom = 'auto';
}

/**
 * Keep #game equal to the visual viewport and tell Phaser that parent size
 * directly. getBoundingClientRect on iOS reports the layout box, which is
 * what made FIT crop the HUD, so the scale parent is set from visualViewport.
 */
export function syncGameViewport(game, root = globalThis) {
  const doc = root.document;
  const el = doc?.getElementById?.('game');
  const fit = fitGame(readVisualViewport(root));
  if (el) {
    applyGameFrame(el, fit);
    // Flush layout before Phaser reads the parent. Otherwise getParentBounds
    // still sees the previous tall box and the next scale poll fits that.
    void el.offsetHeight;
  }
  const scale = game?.scale;
  if (fit.parent.width > 0 && fit.parent.height > 0 && typeof scale?.setParentSize === 'function') {
    scale.setParentSize(fit.parent.width, fit.parent.height);
  } else scale?.refresh?.();
  return fit;
}

export function installVisualViewport(game, root = globalThis) {
  let last = '';
  const sync = () => {
    const box = readVisualViewport(root);
    const key = [box.width, box.height, box.offsetTop, box.offsetLeft].join(',');
    const fit = key === last && root.__rwbViewportFit ? root.__rwbViewportFit : syncGameViewport(game, root);
    last = key;
    root.__rwbViewportFit = fit;
    try { if ((box.offsetTop || 0) !== 0 || (root.scrollY || 0) !== 0) root.scrollTo?.(0, 0); } catch { /* overflow hidden */ }
    return fit;
  };
  sync();
  const vv = root.visualViewport;
  root.addEventListener?.('resize', sync);
  root.addEventListener?.('orientationchange', sync);
  root.addEventListener?.('focus', sync);
  vv?.addEventListener?.('resize', sync);
  vv?.addEventListener?.('scroll', sync);
  // Safari can change visualViewport without a window resize when the chrome
  // collapses mid-stage (the barn fire is the usual moment). Phaser only polls
  // the layout parent, so a parent that has drifted taller than the visual
  // box is pulled back even when the viewport numbers themselves are unchanged.
  const timer = root.setInterval?.(() => {
    const box = readVisualViewport(root);
    const key = [box.width, box.height, box.offsetTop, box.offsetLeft].join(',');
    const el = root.document?.getElementById?.('game');
    const drifted = !!el && box.height > 0 && (Math.abs((el.offsetHeight || 0) - box.height) > 2 || Math.abs((el.offsetTop || 0) - box.offsetTop) > 2);
    if (key !== last || drifted) sync();
  }, 250);
  // Node tests import the game boot. A live interval would keep those
  // processes from exiting. Browsers ignore unref.
  timer?.unref?.();
  return () => {
    root.removeEventListener?.('resize', sync);
    root.removeEventListener?.('orientationchange', sync);
    root.removeEventListener?.('focus', sync);
    vv?.removeEventListener?.('resize', sync);
    vv?.removeEventListener?.('scroll', sync);
    if (timer) root.clearInterval?.(timer);
  };
}
