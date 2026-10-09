// Boot art for the Blight. Painted sheets in assets/stage5/ win when present.
import { canPaint, tex, sheet } from './stage4-art.js';
import { paintBackdrop } from './stage5-art-bg.js';
import { paintFx } from './stage5-art-fx.js';
import { paintCast } from './stage5-art-cast.js';
export { canPaint, tex, sheet };
export { stalkFrame, podFrame, aginFrame, baltFrame, greenFrame } from './stage5-art-cast.js';

// Painted sheets, hard-coded like Stage 4's queue (a JSON manifest queued in the same pass was still empty when it
// was read, so painted rows never loaded). Built by tools/stage5/process_bosses.py: trimmed atlases, frames "0".."n"
// in aginFrame/baltFrame order, sourceSize = the cell, feet at 0.96. baseH is the painted cell height in code-drawn
// pixels (cell height / PX, the tool prints it); a painted cell is drawn at scale * baseH / its height (scaleFor).
// A file that fails mid-session drops its key so the painter fills it, the same rule as Stage 4. A cold start
// still treats any load error as fatal through the shared startup guard.
export const PAINTED = Object.freeze([
  Object.freeze({ key: 's5agin', url: 'assets/stage5/s5agin.webp', atlas: 'assets/stage5/s5agin.json', baseH: 224, present: true }),
  Object.freeze({ key: 's5balt', url: 'assets/stage5/s5balt.webp', atlas: 'assets/stage5/s5balt.json', baseH: 176, present: true }),
  Object.freeze({ key: 'aginorPortrait', url: 'assets/stage5/aginor-portrait.webp', present: true }),
]);

function failedKey(file) { return file?.multiFile?.key || file?.key; }
export function queuePainted(scene, rows = PAINTED) {
  const L = scene.load;
  const wanted = new Set();
  for (const row of rows) {
    if (!row?.present || !row.key || !row.url || scene.textures.exists(row.key)) continue;
    wanted.add(row.key);
    if (row.atlas) L.atlas(row.key, row.url, row.atlas);
    else if (row.frameWidth) L.spritesheet(row.key, row.url, { frameWidth: row.frameWidth, frameHeight: row.frameHeight });
    else L.image(row.key, row.url);
  }
  if (!wanted.size || typeof L.on !== 'function') return;
  const drop = file => {
    const key = failedKey(file);
    if (wanted.has(key) && scene.textures?.exists?.(key)) scene.textures.remove(key);
  };
  const cleanup = () => {
    L.off?.('loaderror', drop); L.off?.('complete', cleanup);
    scene.events?.off?.('shutdown', cleanup);
  };
  L.on('loaderror', drop);
  L.once?.('complete', cleanup);
  scene.events?.once?.('shutdown', cleanup);
}
// Stage 4's rule (paint() in stage4-actors.js): a cell taller than the painter's is drawn at scale * baseH / height,
// so a painted figure keeps the procedural figure's world size and the hitboxes never move. Trimmed atlas frames
// report the untrimmed cell as realHeight.
export function scaleFor(frame, scale, baseH) {
  const fh = frame?.realHeight || frame?.height || 0;
  return baseH && fh > baseH ? scale * baseH / fh : scale;
}
export function paintStage5Art(scene) {
  if (!canPaint(scene)) return;
  paintBackdrop(scene); paintFx(scene); paintCast(scene);
}
// The three 640x360 story canvases (2.6 MiB) are only read by the HUD cutscene. STAGE5.start frees them once it is
// over, or at once when the story is skipped. A call that lands while a cutscene is still up retries from the
// scene update once that cutscene is gone. The next build() repaints them (tex() fills missing keys) if needed.
export function freeStory5(scene) {
  const T = scene?.textures;
  if (!T?.exists || !T.remove) return 0;
  if (scene.cutscene) {
    scene._s5freeStory = () => { scene._s5freeStory = null; freeStory5(scene); };
    return 0;
  }
  scene._s5freeStory = null;
  let n = 0;
  for (const key of ['story5p1', 'story5p2', 'story5p3']) if (T.exists(key)) { T.remove(key); n++; }
  return n;
}
