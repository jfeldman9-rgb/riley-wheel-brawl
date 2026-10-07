// Freeze-guard recovery (restart fix). The Reload card reopens the stage the player was on instead of the title.
// Kept out of the Stage 1 pre-fight sum; tools/audit-stage1.mjs counts it under restartHotfix.

/** The current URL with ?stage=N&autostart=1&resume=1; every other parameter is kept. */
export function resumeUrl(href, stage) {
  const u = new URL(href);
  u.searchParams.set('stage', String(stage));
  u.searchParams.set('autostart', '1');
  u.searchParams.set('resume', '1');
  return u.href;
}

/** Reload into the running stage. On the title (or with no stage to read) this is a plain reload. */
export function resumeGame(root = globalThis, game = root.__game) {
  const s = game?.scene?.getScene?.('stage1'), loc = root.location;
  if (s?.started && s.stageNo >= 1 && loc?.href && typeof loc.replace === 'function') {
    try { loc.replace(resumeUrl(loc.href, s.stageNo)); return 'resume'; } catch (e) { }
  }
  loc?.reload?.();
  return 'reload';
}

/** The frame guard's card. Reload picks up at the stage the player was on. */
export function showStuck(root, error, game) {
  const by = id => root.document?.getElementById?.(id), set = (id, t) => { const el = by(id); if (el) el.textContent = t; };
  const card = by('startup-error'); if (!card) return false;
  set('startup-title', 'The game hit a snag');
  set('startup-description', 'This stage stopped running. Reload game picks up at the start of this stage.');
  set('startup-code', `Code: FRAME_ERROR ${error?.name || ''}`);
  by('startup-retry')?.addEventListener?.('click', () => resumeGame(root, game));
  card.hidden = false;
  return true;
}

/**
 * After a resumed boot has started its stage, drop the one-shot autostart/resume flags so a later return to
 * the title shows the title, and tidy the address bar. ?stage=N stays, so a manual reload preselects the stage.
 */
export function installResumeCleanup(game, q, root = globalThis) {
  if (!q?.has?.('resume') || !game?.events?.on) return false;
  const check = () => {
    if (!game.scene?.getScene?.('stage1')?.started) return;
    game.events.off?.('step', check);
    q.delete('autostart'); q.delete('resume');
    try {
      const u = new URL(root.location.href);
      u.searchParams.delete('autostart'); u.searchParams.delete('resume');
      root.history?.replaceState?.(root.history.state, '', u.href);
    } catch (e) { }
  };
  game.events.on('step', check);
  return true;
}
