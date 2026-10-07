// Boot art for the Blight. Painted sheets in assets/stage5/ win when present.
import { canPaint, tex, sheet } from './stage4-art.js';
import { paintBackdrop } from './stage5-art-bg.js';
import { paintFx } from './stage5-art-fx.js';
import { paintCast } from './stage5-art-cast.js';
export { canPaint, tex, sheet };
export { stalkFrame, podFrame, aginFrame, baltFrame, greenFrame } from './stage5-art-cast.js';

// Keep this list matched to assets/stage5/painted.json. present:true loads the file.
export const PAINTED = [];

export function queuePainted(scene) {
  const rows = scene.cache?.json?.get?.('painted5')?.sheets || PAINTED;
  const L = scene.load;
  for (const row of rows) {
    if (!row?.present || !row.key || !row.url || scene.textures.exists(row.key)) continue;
    if (row.frameWidth) L.spritesheet(row.key, row.url, { frameWidth: row.frameWidth, frameHeight: row.frameHeight });
    else L.image(row.key, row.url);
  }
}
export function paintStage5Art(scene) {
  if (!canPaint(scene)) return;
  paintBackdrop(scene); paintFx(scene); paintCast(scene);
}
