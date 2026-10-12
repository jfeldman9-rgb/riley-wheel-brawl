import { tex } from './stage4-art.js';
// Blight backdrop, code-drawn until painted plates exist. No text in any frame (tests/no-placeholder.test.mjs).
// bg5far is a plain gradient and a sun disc stretched to VW x (LANE_TOP + 20) by the view, so it is drawn at half
// size: 640x210 is 0.51 MiB of RGBA instead of 2.05 MiB at 1280x420, same aspect, same look.
export const BG5FAR_SIZE = Object.freeze([640, 210]);
const MID_TINT = { bg5mid: '#2a1410', bg5mid2: '#1c100c', bg5mid3: '#24140e', bg5mid4: '#14301c' };
const FLOOR_TINT = { bg5floor: '#3a4a28', bg5floor2: '#2a221c', bg5floor3: '#241610' };
export function paintBackdrop(scene, only) {
  const on = key => !only || only.has(key);
  const [fw, fh] = BG5FAR_SIZE;
  if (on('bg5far')) tex(scene, 'bg5far', fw, fh, (g, w, h) => { const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#4a180e'); sky.addColorStop(1, '#1a0c0a'); g.fillStyle = sky; g.fillRect(0, 0, w, h); g.fillStyle = '#ffb060'; g.beginPath(); g.arc(w * 0.8125, h * 0.19, h * 0.086, 0, 7); g.fill(); });
  const ridge = (g, w, h, color) => { g.clearRect(0, 0, w, h); g.fillStyle = color; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 40) g.lineTo(x, h - 40 - (x % 80)); g.lineTo(w, h); g.fill(); g.fillStyle = '#140804'; g.fillRect(0, h - 30, w, 30); };
  for (const [key, color] of Object.entries(MID_TINT)) if (on(key)) tex(scene, key, 640, 280, (g, w, h) => ridge(g, w, h, color));
  const floor = (g, w, h, tint) => { g.fillStyle = tint; g.fillRect(0, 0, w, h); g.strokeStyle = '#0008'; for (let x = 0; x < w; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 10, h); g.stroke(); } };
  for (const [key, tint] of Object.entries(FLOOR_TINT)) if (on(key)) tex(scene, key, 256, 128, (g, w, h) => floor(g, w, h, tint));
}
