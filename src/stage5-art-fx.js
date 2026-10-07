import { tex, sheet } from './stage4-art.js';
const blob = (g, w, h, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.4, h * 0.35, 0, 0, 7); g.fill(); };
export function paintFx(scene) {
  tex(scene, 's5lash', 64, 160, (g, w, h) => { g.strokeStyle = '#6a3018'; g.lineWidth = 8; g.beginPath(); g.moveTo(w / 2, 0); g.quadraticCurveTo(w, h * 0.6, w / 2, h); g.stroke(); });
  tex(scene, 's5thorn', 48, 32, (g, w, h) => { g.fillStyle = '#8a1820'; g.fillRect(0, h / 2, w, 4); for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(8 + i * 10, h); g.lineTo(12 + i * 10, 2); g.lineTo(16 + i * 10, h); g.fill(); } });
  tex(scene, 's5seep', 96, 48, (g, w, h) => blob(g, w, h, '#1a120c'));
  sheet(scene, 's5gout', 4, 64, 64, (g, i, w, h) => blob(g, w, h, `rgba(40,20,8,${0.4 + i * 0.15})`));
  sheet(scene, 's5spore', 3, 32, 32, (g, i, w, h) => blob(g, w, h, i === 2 ? '#6a8a30' : '#c6e060'));
  tex(scene, 's5ring', 64, 64, (g, w, h) => { g.strokeStyle = '#d8ff6a'; g.lineWidth = 4; g.beginPath(); g.arc(w / 2, h / 2, 24, 0, 6.2); g.stroke(); });
  tex(scene, 's5tether', 32, 8, (g, w, h) => { g.fillStyle = '#8a9a60'; g.fillRect(0, 2, w, 4); });
  sheet(scene, 's5hand', 4, 48, 32, (g, i, w, h) => { g.fillStyle = '#e8d8c0'; g.fillRect(4, 8 + i, w - 8, 8); });
  sheet(scene, 's5oak', 2, 80, 120, (g, i, w, h) => { g.fillStyle = i ? '#3a6a30' : '#6a5030'; g.fillRect(w / 2 - 8, 20, 16, h - 10); g.beginPath(); g.arc(w / 2, 28, 22, 0, 7); g.fill(); });
  sheet(scene, 's5flare', 4, 48, 48, (g, i, w, h) => blob(g, w, h, `rgba(255,220,140,${0.3 + i * 0.2})`));
  sheet(scene, 's5ash', 6, 32, 32, (g, i, w, h) => blob(g, w, h, `rgba(180,180,180,${1 - i / 6})`));
  tex(scene, 's5tree', 96, 160, (g, w, h) => { g.fillStyle = '#3a2418'; g.fillRect(w / 2 - 8, 40, 16, h - 20); g.fillStyle = '#1a140c'; g.beginPath(); g.arc(w / 2, 36, 30, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '10px sans-serif'; g.fillText('TREE', 30, 20); });
}
