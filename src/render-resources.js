/**
 * Drop released filter/framebuffer targets after an explicit graphics transition.
 * Call between render passes, never from a render callback or on every frame.
 *
 * Phaser 4.2.1's DrawingContextPool.clear() destroys only its released contexts:
 * checked-out contexts are removed by get(), and locked contexts cannot release.
 * This leaves asset textures and active render targets alone. A cache hit can
 * otherwise retain obsolete larger targets indefinitely despite the pool maxAge.
 *
 * Returns whether the pool was cleared, not a measured number of bytes freed.
 */
export function releaseIdleRenderTargets(game) {
  const renderer = game?.renderer, pool = renderer?.drawingContextPool;
  if (!renderer?.gl || renderer.contextLost || typeof pool?.clear !== 'function') return false;
  if (typeof renderer.gl.isContextLost === 'function' && renderer.gl.isContextLost()) return false;
  pool.clear();
  return true;
}
