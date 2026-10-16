import { sheet, tex } from './stage4-art.js';
// s5flare stays for the ribbon and the glimpse. s5mist is the one soft sky wash (the old floating discs).
// Thorns, tar, spores and the tether are painted sheets when those files loaded.
const blob = (g, w, h, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.4, h * 0.35, 0, 0, 7); g.fill(); };
export function paintFx(scene) {
  sheet(scene, 's5flare', 4, 48, 48, (g, i, w, h) => blob(g, w, h, `rgba(255,220,140,${0.3 + i * 0.2})`));
  tex(scene, 's5mist', 256, 128, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h * 0.28, 8, w / 2, h * 0.4, w * 0.48);
    grd.addColorStop(0, 'rgba(170,110,50,0.5)'); grd.addColorStop(1, 'rgba(40,16,12,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  });
}
