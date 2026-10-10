// Asset manifest + loading. Characters are packed by stage1/tools/pack2.py into atlas pages, each with a normal map
// (<page>_n) and a "flipped" normal map (<page>_nl, red channel inverted) used when the sprite is mirrored to face the
// other way, so the scene lights still hit the side of the body that faces them.
// CHARS is Stage 1's set (the default page / animation queue); Stage 2 passes its own list (src/stages.js STAGE_CHARS).
// Every character's small anims.json loads at boot (ALL_CHARS); only the current stage's atlas pages are fetched.
export const CHARS = ['riley', 'grunt', 'spear', 'hound', 'chief', 'loial'];
export const ALL_CHARS = [...CHARS, 'zealot', 'archer', 'byar'];
import { normalPageDir } from './texture-pages.js';
const NML = {};
export function queueCharJson(scene) {
  for (const k of ALL_CHARS) scene.load.json(k + '.A', `assets/chars/${k}.anims.json`);
}
export function queueCharPages(scene, keys = CHARS) {
  for (const k of keys) {
    const m = scene.cache.json.get(k + '.A'); if (!m) continue;
    const dir = m.dir || 'assets/chars';
    for (const p of m.pages) {
      const normalDir = normalPageDir(scene, p, dir, m);
      // Textures survive a scene restart. Phaser skips their cached images but
      // would still fetch uncached atlas JSON and create a partial MultiFile.
      if (!scene.textures.exists(p)) scene.load.atlas({ key: p, textureURL: `${dir}/${p}.webp`, normalMap: `${normalDir}/${p}_n.webp`, atlasURL: `${dir}/${p}.json` });
      if (!scene.textures.exists(p + '_nl')) scene.load.image(p + '_nl', `${normalDir}/${p}_nl.webp`);
    }
  }
}
export function makeCharAnims(scene, keys = CHARS) {
  const metas = {};
  for (const k of keys) {
    const m = scene.cache.json.get(k + '.A'); if (!m) continue; metas[k] = m;
    for (const p of m.pages) if (scene.textures.exists(p + '_nl')) NML[p] = scene.textures.get(p + '_nl').source[0];
    for (const a of m.anims) {
      if (scene.anims.exists(a.name)) continue;
      scene.anims.create({ key: a.name, frames: a.frames.map((f, i) => ({ key: m.pages[a.pages[i]], frame: f, duration: a.holds[i] })), repeat: a.loop ? -1 : 0 });
    }
  }
  return metas;
}
/** drop a stage's character atlases and their animations (switching stages on an iPad keeps one stage resident) */
export function releaseChars(scene, keys) {
  for (const k of keys) {
    const m = scene.cache.json.get(k + '.A'); if (!m) continue;
    for (const a of m.anims) if (scene.anims.exists(a.name)) scene.anims.remove(a.name);
    for (const p of m.pages) { for (const t of [p, p + '_nl']) if (scene.textures.exists(t)) scene.textures.remove(t); delete NML[p]; }
  }
}
let patched = false;
/** Phaser 4 rotates normal maps with the sprite but ignores flipX; swap in the mirrored normal map for flipped sprites. */
export function patchFlippedNormals() {
  if (patched) return; patched = true;
  const SQ = Phaser.Renderer && Phaser.Renderer.WebGL && Phaser.Renderer.WebGL.RenderNodes && Phaser.Renderer.WebGL.RenderNodes.SubmitterQuad;
  if (!SQ) { console.warn('SubmitterQuad not found; flipped sprites will be lit from the wrong side'); return; }
  const orig = SQ.prototype.setRenderOptions;
  SQ.prototype.setRenderOptions = function (go, normalMap, rot) {
    if (!normalMap && go.flipX && go.lighting && go.frame) { const n = NML[go.frame.texture.key]; if (n) normalMap = n; }
    return orig.call(this, go, normalMap, rot);
  };
}
