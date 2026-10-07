import { tex, sheet } from './stage4-art.js';
const man = (g, w, h, fill, name) => {
  g.fillStyle = fill; g.fillRect(w * 0.35, h * 0.34, w * 0.3, h * 0.4);
  g.beginPath(); g.arc(w / 2, h * 0.24, w * 0.12, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.font = 'bold 14px sans-serif'; g.fillText(name, 8, h - 16); g.fillText('PLACEHOLDER', 8, 18);
};
const STALK = { lurk: 0, stalk: 1, attack: 2, recover: 2, hurt: 3, down: 4, dead: 5, gone: 5 };
const POD = { emerge: 0, idle: 1, attack: 2, hurt: 3, dead: 4, gone: 4 };
const AGIN = { idle: 0, hurt: 1, attack: 2, tether: 3, step: 4, staggered: 5, burn: 6, dead: 6 };
const BALT = { drop: 0, idle: 1, attack: 2, step: 3, lunge: 4, holding: 5, shoved: 6, hurt: 6, down: 6, vines: 7, dead: 7 };
export const stalkFrame = s => STALK[s] ?? 1;
export const podFrame = s => POD[s] ?? 1;
export const aginFrame = s => AGIN[s] ?? 0;
export const baltFrame = s => BALT[s] ?? 1;
export const greenFrame = s => ({ arrive: 0, seize: 1, fall: 2, oak: 3 }[s] ?? 0);

export function paintCast(scene) {
  sheet(scene, 's5stalk', 6, 96, 64, (g, i, w, h) => man(g, w, h, '#6a3030', 'STALK ' + i));
  sheet(scene, 's5pod', 5, 80, 80, (g, i, w, h) => { g.fillStyle = '#6a8a28'; g.beginPath(); g.arc(w / 2, h / 2, 18 + i, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '10px sans-serif'; g.fillText('POD', 8, 14); });
  sheet(scene, 's5agin', 7, 120, 180, (g, i, w, h) => man(g, w, h, i === 6 ? '#ffd0a0' : '#c8b090', 'AGINOR'));
  sheet(scene, 's5balt', 8, 110, 170, (g, i, w, h) => man(g, w, h, '#202028', 'BALTH'));
  sheet(scene, 's5green', 4, 120, 180, (g, i, w, h) => man(g, w, h, '#2a6a30', 'GREEN'));
  tex(scene, 'aginorPortrait', 256, 256, (g, w, h) => { g.fillStyle = '#1a100c'; g.fillRect(0, 0, w, h); man(g, w, h, '#c8b090', 'AGINOR'); });
  const panel = (g, w, h, title) => { g.fillStyle = '#140c0a'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffb070'; g.font = 'bold 32px sans-serif'; g.fillText(title, 40, 80); g.fillStyle = '#fff'; g.font = '16px sans-serif'; g.fillText('PLACEHOLDER ART', 40, 120); };
  tex(scene, 'story5p1', 640, 360, (g, w, h) => panel(g, w, h, 'THE WAYGATE'));
  tex(scene, 'story5p2', 640, 360, (g, w, h) => panel(g, w, h, 'INTO THE BLIGHT'));
  tex(scene, 'story5p3', 640, 360, (g, w, h) => panel(g, w, h, 'THE EYE'));
}
