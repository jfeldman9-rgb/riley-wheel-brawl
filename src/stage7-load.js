// Deferred Stage 7 sheets. Painted rows are absent, so this paints the code stand-in on demand.
import { paintStage7Art } from './stage7-art.js';

const LATE = Object.freeze(['s7asmo', 's7moir', 's7lan', 's7earth', 's7shield']);

export function pump(scene) {
  if (!scene?.textures) return;
  const want = [];
  if ((scene.zoneI || 0) >= 2) want.push('s7asmo');
  const call = scene.kit?.call;
  if (call && (call.charges >= 1 || call.calls > 0)) want.push('s7moir', 's7lan', 's7earth', 's7shield');
  if (!want.length) return;
  const missing = want.filter(k => !scene.textures.exists(k));
  if (missing.length) paintStage7Art(scene);
}

export function releaseZoneArt(scene, zoneI) {
  const rm = scene?.textures?.remove;
  if (!rm) return;
  if (zoneI >= 0 && scene.textures.exists('s7portal')) rm.call(scene.textures, 's7portal');
  if (zoneI >= 1 && scene.textures.exists('s7dust')) rm.call(scene.textures, 's7dust');
  void LATE;
}
