import { sheet } from './stage4-art.js';
// The only Stage 5 FX texture anything samples: s5flare (haze, the glimpse and ribbon fallbacks; drawn whole).
// Every other tell (ring, hands, tether, oak, seeps, thorns, spores) is vector graphics in stage5-effects.js and
// stage5-hud.js, so the old s5lash/s5thorn/s5seep/s5gout/s5spore/s5ring/s5tether/s5hand/s5oak/s5ash/s5tree
// canvases were made and never drawn. They are gone.
const blob = (g, w, h, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.4, h * 0.35, 0, 0, 7); g.fill(); };
export function paintFx(scene) {
  sheet(scene, 's5flare', 4, 48, 48, (g, i, w, h) => blob(g, w, h, `rgba(255,220,140,${0.3 + i * 0.2})`));
}
