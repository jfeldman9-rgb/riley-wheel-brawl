import { tex } from './stage4-art.js';
const label = (g, w, h, text, fill) => { g.fillStyle = fill; g.fillRect(0, 0, w, h); g.fillStyle = '#000'; g.font = 'bold 28px sans-serif'; g.fillText(text, 16, 40); };
export function paintBackdrop(scene) {
  tex(scene, 'bg5far', 1280, 420, (g, w, h) => { const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#4a180e'); sky.addColorStop(1, '#1a0c0a'); g.fillStyle = sky; g.fillRect(0, 0, w, h); g.fillStyle = '#ffb060'; g.beginPath(); g.arc(1040, 80, 36, 0, 7); g.fill(); label(g, w, 50, 'PLACEHOLDER SKY', 'transparent'); });
  const ridge = (g, w, h, color) => { g.clearRect(0, 0, w, h); g.fillStyle = color; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 40) g.lineTo(x, h - 40 - (x % 80)); g.lineTo(w, h); g.fill(); g.fillStyle = '#140804'; g.fillRect(0, h - 30, w, 30); };
  tex(scene, 'bg5mid', 640, 280, (g, w, h) => ridge(g, w, h, '#2a1410'));
  tex(scene, 'bg5mid2', 640, 280, (g, w, h) => ridge(g, w, h, '#1c100c'));
  const floor = (g, w, h, tint) => { g.fillStyle = tint; g.fillRect(0, 0, w, h); g.strokeStyle = '#0008'; for (let x = 0; x < w; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 10, h); g.stroke(); } };
  tex(scene, 'bg5floor', 256, 128, (g, w, h) => floor(g, w, h, '#3a4a28'));
  tex(scene, 'bg5floor2', 256, 128, (g, w, h) => floor(g, w, h, '#2a221c'));
  tex(scene, 'bg5floor3', 256, 128, (g, w, h) => floor(g, w, h, '#241610'));
}
