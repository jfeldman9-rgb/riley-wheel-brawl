// DOM-only startup recovery. Keep this independent of Phaser so a graphics or
// module-load failure cannot strand the player behind an endless loading label.
export function createStartupGuard(root = globalThis) {
  const doc = root.document;
  const byId = id => doc?.getElementById(id);
  let failed = false, finished = false;
  const cleanups = [];
  const detach = () => { for (const cleanup of cleanups.splice(0)) cleanup(); };
  const messages = {
    graphics: ['Graphics could not start', 'This browser could not create the WebGL graphics context Riley needs. Try Reload game once. If this returns, open this same preview in a WebGL-capable browser or device.'],
    assets: ['Some game files could not load', 'The game stopped before the title screen because a required file did not load. Check your connection, then reload this same preview.'],
    startup: ['The game could not start', 'A startup error stopped the game before the title screen. Try Reload game. If it happens again, share this preview link and the error code below.'],
  };
  const guard = {
    get failed() { return failed; },
    get finished() { return finished; },
    fail(error, kind) {
      if (failed || finished) return false;
      failed = true;
      const message = typeof error === 'string' ? error : error?.message || '';
      const category = kind === 'assets' ? 'assets' : /webgl|graphics context/i.test(message) ? 'graphics' : 'startup';
      const [title, detail] = messages[category];
      const boot = byId('boot'); if (boot) boot.hidden = true;
      const overlay = byId('startup-error'); if (overlay) overlay.hidden = false;
      const heading = byId('startup-title'); if (heading) heading.textContent = title;
      const description = byId('startup-description'); if (description) description.textContent = detail;
      const code = byId('startup-code'); if (code) code.textContent = `Code: ${category === 'graphics' ? 'WEBGL_UNAVAILABLE' : category === 'assets' ? 'REQUIRED_ASSET_FAILED' : 'STARTUP_FAILED'}`;
      const perf = byId('perf-open'); if (perf) { perf.hidden = true; perf.disabled = true; }
      const touch = byId('touch'); if (touch) touch.hidden = true;
      // Don't leak exception text/URLs into the public UI. Developer console
      // keeps the original error; the player sees a stable, safe diagnosis.
      byId('startup-retry')?.focus?.({ preventScroll: true });
      detach();
      return true;
    },
    ready() {
      if (failed) return false;
      finished = true; detach();
      const retry = byId('startup-retry'); retry?.removeEventListener('click', reload);
      return true;
    },
    watchLoader(loader) {
      if (!loader || failed || finished) return;
      const failure = () => guard.fail(null, 'assets');
      const remove = () => loader.off('loaderror', failure);
      loader.on('loaderror', failure); loader.once('complete', remove);
      cleanups.push(remove);
    },
    destroy() { detach(); byId('startup-retry')?.removeEventListener('click', reload); },
  };
  const reload = () => root.location?.reload();
  byId('startup-retry')?.addEventListener('click', reload);
  // Boot's create hook can run after the module import has resolved. Capture
  // those startup errors too, ignoring unrelated extension-origin errors.
  const onError = event => {
    const origin = root.location?.origin;
    if (origin && event.filename && !event.filename.startsWith(origin + '/')) return;
    guard.fail(event.error || event.message);
  };
  root.addEventListener?.('error', onError);
  cleanups.push(() => root.removeEventListener?.('error', onError));
  return guard;
}
