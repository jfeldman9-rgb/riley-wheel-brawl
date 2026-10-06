// Draghkar and cultist sheets. Frames are visual only; hitboxes stay in the actors.
import { tex, sheet } from './stage4-art.js';

const POSE = ['perch', 'flap', 'glide', 'land', 'claw', 'croon', 'kiss', 'reel', 'down', 'ash'];
const SKIN = '#e7d7c4';
const SHADE = '#b79a84';
const COWL = '#120e14';
const EYE = '#e8ff6a';

export function dragFrame(state, st = 0) {
  const flap = ((st * 7) | 0) % 2;
  if (state === 'perch' || state === 'takeoff' || state === 'intro') return flap;
  if (state === 'swoop_tell') return flap;
  if (state === 'swoop_dive') return 2;
  if (state === 'claw' || state === 'buffet') return 4;
  if (state === 'croon') return 5;
  if (state === 'kiss_tell' || state === 'kiss_lunge' || state === 'kiss_hold') return 6;
  if (state === 'reels' || state === 'kiss_recoil') return 7;
  if (state === 'counter_down' || state === 'down' || state === 'getup') return 8;
  if (state === 'defeated' || state === 'ash') return 9;
  return 3;
}

export function cultFrame(state, st = 0) {
  if (state === 'approach' || state === 'backstep' || state === 'entering') return ((st * 6) | 0) % 2;
  if (state === 'chant') return 2;
  if (state === 'bolt') return 3;
  if (state === 'shove') return 4;
  if (state === 'hurt' || state === 'dazed') return 5;
  if (state === 'down' || state === 'ko' || state === 'getup' || state === 'gone') return 6;
  if (state === 'flee') return 7;
  return 0;
}

function wing(g, sx, sy, dir, lift, spread) {
  const at = (u, v) => [sx + dir * u, sy + v];
  const tips = [
    at(spread * 0.42, -lift * 0.9),
    at(spread * 0.96, -lift * 0.22),
    at(spread * 0.72, lift * 0.12),
    at(spread * 0.4, lift * 0.4),
  ];
  const root = at(8, 58);
  g.fillStyle = '#3c2840';
  g.beginPath();
  g.moveTo(sx, sy - 2);
  const lead = at(spread * 0.16, -lift * 0.5);
  g.quadraticCurveTo(lead[0], lead[1], tips[0][0], tips[0][1]);
  for (let i = 1; i < tips.length; i++) {
    const a = tips[i - 1], b = tips[i];
    g.quadraticCurveTo((a[0] + b[0]) / 2 - dir * 2, (a[1] + b[1]) / 2 + 18, b[0], b[1]);
  }
  g.quadraticCurveTo((tips[3][0] + root[0]) / 2, (tips[3][1] + root[1]) / 2 + 14, root[0], root[1]);
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(120, 68, 96, 0.4)';
  g.beginPath();
  g.moveTo(sx + dir * 8, sy + 2);
  g.lineTo(tips[1][0] - dir * 10, tips[1][1] + 8);
  g.lineTo(tips[2][0] - dir * 8, tips[2][1] + 2);
  g.closePath();
  g.fill();
  g.strokeStyle = '#1c1018';
  g.lineWidth = 2.5;
  g.lineCap = 'round';
  g.beginPath();
  for (const t of tips) { g.moveTo(sx, sy); g.lineTo(t[0], t[1]); }
  g.stroke();
}

function seg(g, x0, y0, x1, y1, w, color) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len * w, ny = dx / len * w;
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x0 + nx, y0 + ny);
  g.lineTo(x1 + nx, y1 + ny);
  g.lineTo(x1 - nx, y1 - ny);
  g.lineTo(x0 - nx, y0 - ny);
  g.closePath();
  g.fill();
}

function limb(g, x0, y0, x1, y1, x2, y2, w, color) {
  seg(g, x0, y0, x1, y1, w, color);
  seg(g, x1, y1, x2, y2, w * 0.82, color);
}

function talon(g, x, y, dir) {
  g.strokeStyle = '#f3e6d2';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x - 7, y); g.lineTo(x + dir * 12, y);
  g.moveTo(x + dir * 4, y); g.lineTo(x + dir * 12, y - 5);
  g.moveTo(x + dir * 2, y); g.lineTo(x + dir * 9, y + 4);
  g.stroke();
}

function face(g, x, y, tilt) {
  g.fillStyle = COWL;
  g.beginPath();
  g.moveTo(x - 16, y + 16);
  g.quadraticCurveTo(x - 22, y - 18, x + tilt * 0.2, y - 36);
  g.quadraticCurveTo(x + 20, y - 16, x + 15, y + 12);
  g.quadraticCurveTo(x + 4, y + 32, x - 14, y + 22);
  g.fill();
  g.fillStyle = SKIN;
  g.beginPath();
  g.moveTo(x - 7, y - 14);
  g.quadraticCurveTo(x - 10, y + 6, x - 1, y + 20);
  g.quadraticCurveTo(x + 6, y + 22, x + 8, y + 4);
  g.quadraticCurveTo(x + 9, y - 12, x + 2, y - 16);
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(120, 80, 90, 0.35)';
  g.beginPath();
  g.ellipse(x + 3, y + 4, 4, 10, 0, 0, 6.3);
  g.fill();
  g.fillStyle = '#1a1420';
  g.fillRect(x - 6, y - 5, 6, 5);
  g.fillRect(x + 2, y - 5, 6, 5);
  const glow = g.createRadialGradient(x, y - 2, 1, x, y - 2, 14);
  glow.addColorStop(0, 'rgba(230,255,140,0.7)');
  glow.addColorStop(1, 'rgba(230,255,140,0)');
  g.fillStyle = glow;
  g.beginPath(); g.arc(x, y - 2, 14, 0, 6.3); g.fill();
  g.fillStyle = EYE;
  g.fillRect(x - 5, y - 4, 4, 2);
  g.fillRect(x + 3, y - 4, 4, 2);
  g.fillStyle = '#6a3830';
  g.beginPath(); g.ellipse(x + 1, y + 8, 2.5, 1.6, 0.2, 0, 6.3); g.fill();
}

function armTo(g, sx, sy, ex, ey, claws) {
  const mx = (sx + ex) / 2 - 6, my = (sy + ey) / 2;
  limb(g, sx, sy, mx, my, ex, ey, 4.2, SHADE);
  seg(g, sx, sy, mx, my, 2.2, SKIN);
  if (!claws) return;
  g.strokeStyle = '#f4eadc';
  g.lineWidth = 1.7;
  g.lineCap = 'round';
  g.beginPath();
  for (let i = -1; i <= 1; i++) { g.moveTo(ex, ey); g.lineTo(ex + claws, ey - 5 + i * 5); }
  g.stroke();
}

function drawDrag(g, cx, foot, s) {
  const hip = foot - 88 + s.crouch;
  const shY = foot - 162 + s.crouch;
  const shX = cx + s.lean * 0.35;
  wing(g, shX, shY + 8, -1, s.lift, s.spread);
  wing(g, shX, shY + 8, 1, s.lift, s.spread * (s.arm === 'glide' ? 1 : 0.92));
  const k = s.knee;
  limb(g, cx - 6, hip, cx - 16 - k * 0.3, hip + 40, cx - 10, foot, 7, '#8d7264');
  limb(g, cx + 4 + s.lean * 0.2, hip, cx + 14 + k * 0.15, hip + 36, cx + 16 + s.lean * 0.15, foot, 8, SHADE);
  talon(g, cx - 10, foot, -1);
  talon(g, cx + 16 + s.lean * 0.15, foot, 1);
  g.fillStyle = SHADE;
  g.beginPath();
  g.moveTo(cx - 14, hip);
  g.lineTo(shX - 12, shY + 18);
  g.lineTo(shX - 6, shY);
  g.lineTo(shX + 12, shY + 4);
  g.lineTo(cx + 12 + s.lean * 0.2, hip);
  g.closePath();
  g.fill();
  g.fillStyle = SKIN;
  g.fillRect(shX - 4, shY + 10, 9, hip - shY - 18);
  g.strokeStyle = 'rgba(90,60,70,0.45)';
  g.lineWidth = 1;
  g.beginPath();
  for (let i = 0; i < 3; i++) {
    const y = shY + 22 + i * 14;
    g.moveTo(shX - 6, y); g.quadraticCurveTo(shX + 2, y + 3, shX + 8, y);
  }
  g.stroke();
  const arms = {
    perch: [[shX - 8, shY + 16, cx - 20, hip + 10, -8], [shX + 8, shY + 16, cx + 18, hip + 6, 8]],
    up: [[shX - 6, shY + 8, cx - 28, shY - 36, -6], [shX + 8, shY + 8, cx + 30, shY - 30, 6]],
    glide: [[shX, shY + 12, cx - 36, shY + 8, -8], [shX + 6, shY + 14, cx + 40 + s.lean, shY + 20, 10]],
    hang: [[shX - 8, shY + 16, cx - 18, hip + 16, -9], [shX + 8, shY + 16, cx + 16, hip + 20, 10]],
    claw: [[shX - 8, shY + 16, cx - 16, hip + 8, -8], [shX + 8, shY + 12, cx + 46 + s.lean, shY + 28, 14]],
    open: [[shX - 10, shY + 14, cx - 32, shY + 8, -8], [shX + 8, shY + 14, cx + 34, shY + 6, 8]],
    reach: [[shX - 4, shY + 18, cx + 10, shY + 36, 8], [shX + 8, shY + 14, cx + 52, shY + 24, 16]],
    reel: [[shX - 6, shY + 10, cx - 30, shY - 10, -8], [shX + 4, shY + 16, cx + 8, hip + 10, 6]],
  };
  for (const a of arms[s.arm] || arms.hang) armTo(g, a[0], a[1], a[2], a[3], a[4]);
  face(g, shX + s.head * 0.4, shY - 6 + s.head * 0.15, s.head);
  if (s.arm === 'open') {
    g.strokeStyle = 'rgba(232,255,106,0.9)'; g.lineWidth = 2;
    g.beginPath(); g.arc(shX, shY - 4, 26, 0, 6.3); g.stroke();
    g.strokeStyle = 'rgba(240,210,120,0.75)';
    g.beginPath(); g.arc(shX, shY - 4, 40, 0.4, 2.4); g.stroke();
  }
}

function ash(g, cx, foot) {
  for (let i = 0; i < 28; i++) {
    const y = foot - (i * 17) % 200;
    const x = cx - 36 + (i * 23) % 72;
    g.fillStyle = i % 3 === 0 ? 'rgba(210,220,190,0.85)' : 'rgba(120,130,110,0.7)';
    g.fillRect(x, y, i % 4 === 0 ? 4 : 2, i % 4 === 0 ? 3 : 2);
  }
}

function downed(g, cx, foot) {
  wing(g, cx - 6, foot - 30, -1, 14, 36);
  wing(g, cx + 8, foot - 26, 1, 8, 48);
  g.fillStyle = SHADE;
  g.beginPath();
  g.ellipse(cx + 4, foot - 16, 46, 13, -0.2, 0, 6.3);
  g.fill();
  g.fillStyle = SKIN;
  g.fillRect(cx - 18, foot - 22, 34, 9);
  face(g, cx - 40, foot - 28, -10);
  talon(g, cx + 36, foot - 6, 1);
}

function drag(g, w, h, pose) {
  const cx = w * 0.48, foot = h - 8;
  if (pose === 'ash') { ash(g, cx, foot); return; }
  if (pose === 'down') { downed(g, cx, foot); return; }
  const spec = {
    perch: { lean: 10, knee: 26, spread: 48, lift: 58, arm: 'perch', head: 6, crouch: 30 },
    flap: { lean: 2, knee: 8, spread: 72, lift: 68, arm: 'up', head: -4, crouch: 0 },
    glide: { lean: 22, knee: 4, spread: 74, lift: 18, arm: 'glide', head: 8, crouch: 0 },
    land: { lean: 0, knee: 0, spread: 44, lift: 64, arm: 'hang', head: 0, crouch: 0 },
    claw: { lean: 16, knee: 10, spread: 54, lift: 36, arm: 'claw', head: 6, crouch: 0 },
    croon: { lean: -10, knee: 0, spread: 58, lift: 28, arm: 'open', head: -14, crouch: 0 },
    kiss: { lean: 24, knee: 14, spread: 70, lift: 32, arm: 'reach', head: 12, crouch: 6 },
    reel: { lean: -20, knee: 4, spread: 34, lift: 18, arm: 'reel', head: -18, crouch: 0 },
  }[pose];
  drawDrag(g, cx, foot, spec);
}

function robe(g, cx, foot, top, lean) {
  g.fillStyle = '#5c2834';
  g.beginPath();
  g.moveTo(cx - 24 + lean, foot - 2);
  g.lineTo(cx - 30, foot - 14);
  g.lineTo(cx - 16, foot - 4);
  g.lineTo(cx - 4, foot - 16);
  g.lineTo(cx + 10, foot - 3);
  g.lineTo(cx + 24, foot - 14);
  g.lineTo(cx + 32 + lean * 0.2, foot - 2);
  g.lineTo(cx + 18, top + 22);
  g.quadraticCurveTo(cx + lean, top + 4, cx - 16, top + 20);
  g.closePath();
  g.fill();
  g.fillStyle = '#3a1c26';
  g.beginPath();
  g.moveTo(cx - 2, top + 24);
  g.lineTo(cx + 2, foot - 12);
  g.lineTo(cx + 12, foot - 8);
  g.lineTo(cx + 6, top + 26);
  g.fill();
  g.strokeStyle = '#7a6a66';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(cx - 26, foot - 8); g.lineTo(cx - 8, foot - 2); g.lineTo(cx + 14, foot - 10); g.lineTo(cx + 28, foot - 4);
  g.stroke();
}

function hood(g, cx, top) {
  g.fillStyle = '#24161c';
  g.beginPath();
  g.moveTo(cx - 16, top + 22);
  g.quadraticCurveTo(cx - 2, top - 18, cx + 18, top + 16);
  g.lineTo(cx + 12, top + 34);
  g.lineTo(cx - 12, top + 34);
  g.fill();
  g.fillStyle = '#07060a';
  g.beginPath(); g.ellipse(cx + 1, top + 16, 8, 10, 0, 0, 6.3); g.fill();
  g.fillStyle = '#b6ff6a';
  g.fillRect(cx - 4, top + 14, 3, 2);
  g.fillRect(cx + 3, top + 14, 3, 2);
}

function cult(g, w, h, pose) {
  const cx = w * 0.46;
  const foot = h - 6;
  if (pose === 6) {
    g.fillStyle = '#4a2430';
    g.beginPath(); g.ellipse(cx + 6, foot - 14, 40, 14, -0.2, 0, 6.3); g.fill();
    g.fillStyle = '#24161c';
    g.beginPath(); g.arc(cx - 30, foot - 18, 12, 0, 6.3); g.fill();
    g.fillStyle = '#b6ff6a';
    g.fillRect(cx - 34, foot - 20, 3, 2);
    return;
  }
  const kneel = pose === 2;
  const flee = pose === 7;
  const bob = pose === 1 ? -5 : 0;
  const lean = flee ? -22 : pose === 5 ? 20 : pose === 4 ? 10 : pose === 1 ? 6 : 0;
  const top = foot - (kneel ? 92 : 132) + bob;
  g.strokeStyle = '#6e5a42';
  g.lineWidth = 4;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(cx + 22, foot - 2);
  g.lineTo(cx + 14 + lean * 0.2, top - 6);
  g.stroke();
  g.fillStyle = '#8a704c';
  g.beginPath(); g.arc(cx + 14 + lean * 0.2, top - 8, 4, 0, 6.3); g.fill();
  robe(g, cx + lean * 0.3, foot, top, lean);
  hood(g, cx + lean * 0.2, top);
  if (!kneel) {
    const hy = top + 36;
    g.fillStyle = pose === 3 ? '#d8ff8a' : '#cbb8a4';
    g.fillRect(cx - 18 + lean, hy, 6, 9);
    g.fillRect(cx + 14 + lean * 0.4, hy - 2, 6, 9);
  }
  const charm = g.createRadialGradient(cx + 2, top + 40, 1, cx + 2, top + 40, 12);
  charm.addColorStop(0, 'rgba(230,255,170,0.95)');
  charm.addColorStop(1, 'rgba(140,220,70,0)');
  g.fillStyle = charm;
  g.beginPath(); g.arc(cx + 2, top + 40, 12, 0, 6.3); g.fill();
  g.fillStyle = '#c6ff6a';
  g.beginPath();
  g.moveTo(cx + 2, top + 34); g.lineTo(cx + 7, top + 40); g.lineTo(cx + 2, top + 46); g.lineTo(cx - 3, top + 40);
  g.fill();
  if (kneel) {
    g.strokeStyle = 'rgba(180,255,120,0.9)';
    g.lineWidth = 2;
    g.beginPath(); g.ellipse(cx, foot - 6, 28, 9, 0, 0, 6.3); g.stroke();
    g.beginPath(); g.ellipse(cx, foot - 6, 16, 5, 0, 0, 6.3); g.stroke();
  }
  if (pose === 3) {
    const orb = g.createRadialGradient(cx + 34, top + 28, 1, cx + 34, top + 28, 10);
    orb.addColorStop(0, 'rgba(240,255,200,1)');
    orb.addColorStop(1, 'rgba(120,255,60,0)');
    g.fillStyle = orb;
    g.beginPath(); g.arc(cx + 34, top + 28, 10, 0, 6.3); g.fill();
  }
  if (pose === 4) {
    g.strokeStyle = '#ead8c4';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(cx + 16, top + 34); g.lineTo(cx + 40, top + 22); g.stroke();
  }
  if (pose === 5) {
    g.strokeStyle = '#ead8c4';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(cx - 8, top + 30); g.lineTo(cx + 6, top - 2); g.stroke();
  }
  g.fillStyle = '#241610';
  if (pose === 0) g.fillRect(cx + 6, foot - 7, 12, 6);
  else if (pose === 1 || flee) g.fillRect(cx - 18, foot - 7, 12, 6);
  else if (!kneel) { g.fillRect(cx - 10, foot - 6, 8, 5); g.fillRect(cx + 6, foot - 6, 8, 5); }
}

function portrait(g, w, h) {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#12182a');
  sky.addColorStop(1, '#1a3030');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  wing(g, w * 0.5, h * 0.62, -1, 18, 28);
  wing(g, w * 0.5, h * 0.62, 1, 18, 28);
  g.fillStyle = SHADE;
  g.fillRect(w * 0.5 - 7, h * 0.55, 14, 22);
  face(g, w * 0.5, h * 0.42, 0);
}

export function paintCast(scene) {
  sheet(scene, 's4drag', POSE.length, 180, 250, (g, i, w, h) => drag(g, w, h, POSE[i]));
  sheet(scene, 's4cult', 8, 120, 190, (g, i, w, h) => cult(g, w, h, i));
  tex(scene, 'draghkarPortrait', 68, 68, portrait);
}
