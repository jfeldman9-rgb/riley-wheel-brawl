// Asset manifest + loading. Characters are packed by stage1/tools/pack2.py into atlas pages, each with a normal map
// (<page>_n) and a "flipped" normal map (<page>_nl, red channel inverted) used when the sprite is mirrored to face the
// other way, so the scene lights still hit the side of the body that faces them.
export const CHARS = ['riley', 'grunt', 'spear', 'hound', 'chief'];
const NML = {};
export function queueCharJson(scene) {
  for (const k of CHARS) scene.load.json(k + '.A', `assets/chars/${k}.anims.json`);
}
export function queueCharPages(scene) {
  for (const k of CHARS) {
    const m = scene.cache.json.get(k + '.A'); if (!m) continue;
    for (const p of m.pages) {
      scene.load.atlas({ key: p, textureURL: `assets/chars/${p}.webp`, normalMap: `assets/chars/${p}_n.webp`, atlasURL: `assets/chars/${p}.json` });
      scene.load.image(p + '_nl', `assets/chars/${p}_nl.webp`);
    }
  }
}
export function makeCharAnims(scene) {
  const metas = {};
  for (const k of CHARS) {
    const m = scene.cache.json.get(k + '.A'); if (!m) continue; metas[k] = m;
    for (const p of m.pages) if (scene.textures.exists(p + '_nl')) NML[p] = scene.textures.get(p + '_nl').source[0];
    for (const a of m.anims) {
      if (scene.anims.exists(a.name)) continue;
      scene.anims.create({ key: a.name, frames: a.frames.map((f, i) => ({ key: m.pages[a.pages[i]], frame: f, duration: a.holds[i] })), repeat: a.loop ? -1 : 0 });
    }
  }
  return metas;
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
