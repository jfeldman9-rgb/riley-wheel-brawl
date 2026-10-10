// Stage-owned audio exits. A Rand video restores the fight from 'cutscene' without restarting its intro.
import { stopSceneAudio } from './audio.js';

export function quietStage6(scene, state = 'silent') {
  stopSceneAudio();
  const m = scene?.music;
  if (!m) return;
  const from = m.state, hadTrack = m.track;
  m.state = state; m.track = null;
  if (typeof m.backend !== 'function') return;
  // Always reach the backend: a victory/game-over fade leaves track null while the old loop is still fading out.
  const opts = { fade: 0, restart: false };
  if (hadTrack !== null) m.log?.push?.({ from, to: state, track: null, ...opts });
  m.backend(null, opts);
}
