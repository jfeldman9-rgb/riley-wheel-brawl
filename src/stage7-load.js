// Deferred painted sheets. Code-drawn canvases are resident from build, so the
// stage is playable before any file lands; a painted file replaces its canvas.
import { queueStage7Painted, isPainted } from './stage7-paint.js';
import { PAINTED7 } from './stage7-painted.js';

export const BOSS_SHEETS = Object.freeze(['s7asmo']);
export const CALL_SHEETS = Object.freeze(['s7moir', 's7lan', 's7earth', 's7shield']);

export function pumpDeferred(scene, keys) {
  if (!scene?.textures) return;
  const rows = PAINTED7.filter(r => keys.includes(r.key) && r.present);
  for (const row of rows) {
    if (scene.textures.exists(row.key) && !isPainted(scene, row.key)) scene.textures.remove(row.key);
  }
  if (rows.length) queueStage7Painted(scene, rows);
}

export function releaseSheet(scene, key) {
  if (!scene?.textures?.exists?.(key)) return;
  if (isPainted(scene, key)) scene.textures.remove(key);
}
