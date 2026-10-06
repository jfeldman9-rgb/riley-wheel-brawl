// Phaser still steps scenes on background frames. Freeze their clocks as well
// as combat dt, and keep window focus independent from visibility/manual pause.
export function installStage3Suspension(s) {
  const events = s.game?.events;
  if (!events) return;
  const bind = (event, reason, value) => {
    const fn = () => s.setPauseReason(reason, value);
    events.on(event, fn); return [event, fn];
  };
  const listeners = [bind('hidden', 'tab-hidden', true), bind('visible', 'tab-hidden', false),
    bind('blur', 'window-blur', true), bind('focus', 'window-blur', false)];
  if (globalThis.document?.hidden) s.setPauseReason('tab-hidden', true);
  if (s.game.hasFocus === false) s.setPauseReason('window-blur', true);
  return () => { for (const [event, fn] of listeners) events.off(event, fn); };
}
