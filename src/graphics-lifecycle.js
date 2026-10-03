import { perf } from './perf.js';

export const GRAPHICS_CONTEXT_REASON = 'graphics-context';

/**
 * Pause safely around Phaser's renderer recovery without changing its handlers,
 * renderer, quality, assets, or restoration policy. UI callbacks receive
 * { game, renderer, reason }; they must not reload or restart the game implicitly.
 * Call refresh() if a custom boot flow supplies its scene after boot/ready.
 * destroy() is teardown only: it detaches listeners without resuming a lost game.
 */
export function installGraphicsLifecycle({ game, getStage = () => game?.scene?.getScene?.('stage1'), meter = perf,
  onLost = () => {}, onRestored = () => {} } = {}) {
  let renderer = null, watchedStage = null, disposed = false, lost = false, ownsGamePause = false;
  const clearInput = () => game?.inp?.clear?.();
  const initialized = stage => stage?.pauseReasons && typeof stage.setPauseReason === 'function';
  const notify = callback => {
    // Phaser calls native preventDefault() after emitting losewebgl. A DOM-only
    // callback must not throw through that event and prevent automatic recovery.
    try { callback({ game, renderer, reason: GRAPHICS_CONTEXT_REASON }); }
    catch (error) { console.warn('Graphics recovery UI update failed:', error); }
  };
  const syncStage = () => {
    if (disposed || !lost) return;
    const stage = getStage();
    if (initialized(stage) && !stage.pauseReasons.has(GRAPHICS_CONTEXT_REASON)) stage.setPauseReason(GRAPHICS_CONTEXT_REASON, true);
    // A scene restart may reset its capture; the global graphics state persists.
    meter.setSuspended(GRAPHICS_CONTEXT_REASON, true);
  };
  const lose = () => {
    if (disposed || lost) return;
    lost = true;
    meter.setSuspended(GRAPHICS_CONTEXT_REASON, true);
    clearInput();
    // Game.step otherwise keeps running scene timers and combat while its
    // renderer is disabled. Keep existing global and scene pauses independent.
    ownsGamePause = !game?.isPaused && typeof game?.pause === 'function';
    if (ownsGamePause) game.pause();
    syncStage();
    notify(onLost);
  };
  const restore = () => {
    if (disposed || !lost || renderer?.contextLost) return;
    if (typeof renderer?.gl?.isContextLost === 'function' && renderer.gl.isContextLost()) return;
    // restorewebgl is emitted after Phaser rebuilds its resource wrappers.
    lost = false;
    const stage = getStage();
    if (initialized(stage) && stage.pauseReasons.has(GRAPHICS_CONTEXT_REASON)) stage.setPauseReason(GRAPHICS_CONTEXT_REASON, false);
    meter.setSuspended(GRAPHICS_CONTEXT_REASON, false);
    clearInput();
    const resume = ownsGamePause; ownsGamePause = false;
    if (resume && !game?.pendingDestroy) game?.resume?.();
    notify(onRestored);
  };
  const unwatchRenderer = () => {
    renderer?.off?.('losewebgl', lose);
    renderer?.off?.('restorewebgl', restore);
  };
  function refresh() {
    if (disposed) return;
    const next = game?.renderer;
    if (next !== renderer && typeof next?.on === 'function') {
      unwatchRenderer(); renderer = next;
      renderer.on('losewebgl', lose); renderer.on('restorewebgl', restore);
    }
    const stage = getStage();
    if (stage !== watchedStage) {
      watchedStage?.events?.off?.('create', syncStage);
      watchedStage = stage;
      watchedStage?.events?.on?.('create', syncStage);
    }
    if (renderer?.contextLost) lose();
    syncStage();
  }
  function destroy() {
    if (disposed) return;
    disposed = true;
    unwatchRenderer(); watchedStage?.events?.off?.('create', syncStage);
    for (const event of ['boot', 'ready']) game?.events?.off?.(event, refresh);
    game?.events?.off?.('destroy', destroy);
    if (lost) meter.setSuspended(GRAPHICS_CONTEXT_REASON, false);
    renderer = null; watchedStage = null; ownsGamePause = false; lost = false;
  }
  for (const event of ['boot', 'ready']) game?.events?.on?.(event, refresh);
  game?.events?.on?.('destroy', destroy);
  refresh();
  return { get lost() { return lost; }, refresh, destroy };
}
