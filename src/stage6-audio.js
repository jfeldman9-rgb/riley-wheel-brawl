// Stage-owned audio exits. A Rand video restores the fight from 'cutscene' without restarting its intro.
import { stopSceneAudio } from './audio.js';

export function quietStage6(scene, state = 'silent') {
  stopSceneAudio();
  const m = scene?.music;
  if (!m) return;
  const from = m.state, hadTrack = m.track;
  m.state = state; m.track = null;
  if (hadTrack !== null && typeof m.backend === 'function') {
    const opts = { fade: 0, restart: false };
    m.log?.push?.({ from, to: state, track: null, ...opts });
    m.backend(null, opts);
  }
}
