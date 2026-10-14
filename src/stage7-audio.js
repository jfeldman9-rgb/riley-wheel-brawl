// Stage-owned audio exits. A call video restores the fight without restarting its intro.
import { stopSceneAudio } from './audio.js';

export function quietStage7(scene, state = 'silent') {
  stopSceneAudio();
  const m = scene?.music;
  if (!m) return;
  const from = m.state, hadTrack = m.track;
  m.state = state; m.track = null;
  if (typeof m.backend !== 'function') return;
  const opts = { fade: 0, restart: false };
  if (hadTrack !== null) m.log?.push?.({ from, to: state, track: null, ...opts });
  m.backend(null, opts);
}
