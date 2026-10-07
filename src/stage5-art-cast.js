// Procedural Blight cast. Frame sizes, origins and keys stay as in
// docs/stage5/ART-NEEDED.md. sheet() leaves an existing key alone, so a
// painted row in assets/stage5/painted.json still replaces these.
import { tex, sheet } from './stage4-art.js';

const STALK = { lurk: 0, stalk: 1, attack: 2, recover: 2, hurt: 3, down: 4, dead: 5, gone: 5 };
const POD = { emerge: 0, idle: 1, attack: 2, hurt: 3, dead: 4, gone: 4 };
const AGIN = { idle: 0, hurt: 1, attack: 2, tether: 3, step: 4, staggered: 5, burn: 6, dead: 6 };
const BALT = { drop: 0, idle: 1, attack: 2, step: 3, lunge: 4, holding: 5, shoved: 6, hurt: 6, down: 6, vines: 7, dead: 7 };
export const stalkFrame = s => STALK[s] ?? 1;
export const podFrame = s => POD[s] ?? 1;
export const aginFrame = s => AGIN[s] ?? 0;
export const baltFrame = s => BALT[s] ?? 1;
export const greenFrame = s => ({ arrive: 0, seize: 1, fall: 2, oak: 3 }[s] ?? 0);

const TAU = Math.PI * 2;
const poly = (g, p, c) => {
  g.fillStyle = c; g.beginPath(); g.moveTo(p[0], p[1]);
  for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]);
  g.closePath(); g.fill();
};
const seg = (g, ax, ay, bx, by, w, c) => {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L * w, ny = dx / L * w;
  poly(g, [ax + nx, ay + ny, bx + nx, by + ny, bx - nx, by - ny, ax - nx, ay - ny], c);
};
const limb = (g, x0, y0, x1, y1, x2, y2, w, fill, ink) => {
  seg(g, x0, y0, x1, y1, w + 2.1, ink); seg(g, x0, y0, x1, y1, w, fill);
  seg(g, x1, y1, x2, y2, (w + 1.8) * 0.9, ink); seg(g, x1, y1, x2, y2, w * 0.9, fill);
  g.fillStyle = fill; g.beginPath(); g.arc(x1, y1, w * 0.72, 0, TAU); g.fill();
};
const ell = (g, x, y, rx, ry, c, rot = 0) => {
  g.fillStyle = c; g.beginPath(); g.ellipse(x, y, Math.max(0.8, rx), Math.max(0.8, ry), rot, 0, TAU); g.fill();
};
const glow = (g, x, y, r, a, b) => {
  const d = g.createRadialGradient(x, y, 0.4, x, y, r);
  d.addColorStop(0, a); d.addColorStop(1, b);
  g.fillStyle = d; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
};
const mark = (g, size = 7, y = 8) => {
  g.font = `bold ${size}px sans-serif`; g.lineWidth = 3; g.lineJoin = 'round';
  g.strokeStyle = 'rgba(0,0,0,0.88)'; g.strokeText('PLACEHOLDER', 2, y);
  g.fillStyle = '#ffe7a8'; g.fillText('PLACEHOLDER', 2, y);
};
const man = (g, w, h, fill, name) => {
  g.fillStyle = fill; g.fillRect(w * 0.35, h * 0.34, w * 0.3, h * 0.4);
  g.beginPath(); g.arc(w / 2, h * 0.24, w * 0.12, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.font = 'bold 14px sans-serif'; g.fillText(name, 8, h - 16); g.fillText('PLACEHOLDER', 8, 18);
};

function spines(g, x, y, n, tall, lean, bone, ink) {
  for (let i = 0; i < n; i++) {
    const px = x + i * 8, ph = tall * (0.55 + (i % 3) * 0.22);
    poly(g, [px, y + 2, px + 3 + lean, y - ph, px + 7, y + 1], ink);
    poly(g, [px + 1.4, y + 1, px + 3 + lean, y - ph + 3, px + 5.6, y], bone);
  }
}
function maw(g, x, y, open, bone) {
  ell(g, x, y, 8, 2.2 + open, '#14080a');
  g.fillStyle = bone;
  for (let t = 0; t < 3; t++) {
    g.fillRect(x - 5 + t * 3.2, y - 1, 1.7, 2 + open);
    g.fillRect(x - 5 + t * 3.2, y + 1 + open * 0.4, 1.7, 1.6 + open * 0.3);
  }
}
function eye(g, x, y, lit) {
  if (!lit) return;
  glow(g, x, y, 7, 'rgba(255,246,170,0.95)', 'rgba(255,246,170,0)');
  g.fillStyle = '#1a1408'; g.fillRect(x - 3, y - 1.6, 6, 3);
  g.fillStyle = '#fff6a8'; g.fillRect(x - 2, y - 1, 4, 1.6);
}
function claws(g, x, y, dir, bone) {
  g.fillStyle = bone;
  for (let k = -1; k <= 1; k++) poly(g, [x, y, x + dir * 7, y - 2 + k * 2.4, x + dir * 2, y + 1.2], bone);
}

function stalk(g, w, h, i) {
  const G = h * 0.96, dead = i === 5, down = i >= 4;
  const hide = dead ? '#9a8c84' : '#e09078';
  const shade = dead ? '#6a5c56' : '#8a4034';
  const ink = '#1c0c0a';
  const bone = dead ? '#d8d0c6' : '#fff4e4';
  if (down) {
    ell(g, 50, G - 7, 34, 11, ink, -0.2);
    ell(g, 50, G - 8, 31, 8, hide, -0.18);
    ell(g, 24, G - 12, 11, 7, shade, 0.5);
    spines(g, 34, G - 16, 5, dead ? 6 : 9, 1, bone, ink);
    maw(g, 18, G - 10, dead ? 0 : 2, bone);
    eye(g, 16, G - 15, !dead);
    limb(g, 42, G - 8, 36, G - 2, 30, G - 1, 2.4, shade, ink);
    limb(g, 62, G - 6, 72, G - 4, 80, G - 1, 2.4, shade, ink);
    if (dead) { g.fillStyle = '#efe8dc'; g.fillRect(28, G - 20, 2, 2); g.fillRect(58, G - 14, 2, 2); g.fillRect(70, G - 22, 2, 2); }
    mark(g); return;
  }
  const lurk = i === 0, leap = i === 2, hurt = i === 3;
  const lift = lurk ? 7 : leap ? -7 : hurt ? 2 : 0;
  const by = G - 16 + lift;
  const hx = hurt ? 30 : leap ? 82 : lurk ? 72 : 76;
  const hy = by - (lurk ? 1 : leap ? 10 : 8) + (hurt ? -2 : 0);
  limb(g, hurt ? 70 : 28, by + 2, hurt ? 84 : 14, by - (lurk ? 1 : 10), hurt ? 90 : 8, by - (lurk ? 0 : 2), 3.2, shade, ink);
  ell(g, hurt ? 56 : 40, by + 2, 16, lurk ? 8 : 12, ink, hurt ? 0.45 : 0);
  ell(g, hurt ? 56 : 40, by + 1, 14, lurk ? 6.5 : 10, hide, hurt ? 0.45 : 0);
  ell(g, hurt ? 42 : 62, by + (leap ? -5 : 1), leap ? 16 : 14, lurk ? 7 : 11, ink, leap ? -0.5 : hurt ? 0.55 : -0.12);
  ell(g, hurt ? 42 : 62, by + (leap ? -6 : 0), leap ? 14 : 12, lurk ? 5.5 : 9, hide, leap ? -0.5 : hurt ? 0.55 : -0.12);
  ell(g, (hurt ? 48 : 56), by + 3, 7, 3.2, '#f6c0a4');
  spines(g, hurt ? 38 : 26, by - (lurk ? 4 : 8), lurk ? 5 : 6, lurk ? 9 : leap ? 20 : hurt ? 16 : 15, leap ? -4 : 2, bone, ink);
  ell(g, hx, hy, lurk ? 10 : 12, lurk ? 6 : 8, ink, leap ? -0.55 : hurt ? 0.7 : -0.15);
  ell(g, hx - 0.5, hy, lurk ? 8 : 10, lurk ? 4.6 : 6.4, hide, leap ? -0.55 : hurt ? 0.7 : -0.15);
  const sn = hurt ? -1 : 1;
  poly(g, [hx + sn * 2, hy - 3, hx + sn * 14, hy - 1, hx + sn * 13, hy + 5, hx + sn, hy + 4], ink);
  poly(g, [hx + sn * 3, hy - 1, hx + sn * 12, hy, hx + sn * 11, hy + 4, hx + sn * 2, hy + 3], hide);
  if (!lurk) maw(g, hx + sn * (hurt ? 4 : 10), hy + 2, leap ? 4.5 : hurt ? 2 : 2.4, bone);
  else maw(g, hx + 8, hy + 2, 0.8, bone);
  eye(g, hx - 1, hy - 2, true);
  const leg = (x, a, b) => { limb(g, x, by + 4, x + a, G - 6, x + a + b, G - 1, 2.6, shade, ink); claws(g, x + a + b, G - 1, leap ? 1 : 0.6, bone); };
  if (leap) { leg(50, 14, 8); leg(38, 4, -6); claws(g, hx + 8, hy + 4, 1, bone); }
  else if (hurt) { leg(48, -8, 2); leg(40, 6, 4); }
  else { leg(lurk ? 36 : 34, lurk ? 2 : -4, 4); leg(lurk ? 54 : 58, lurk ? 4 : 12, 5); }
  mark(g);
}

function lobe(g, x, y, rx, ry, fill, ink) {
  ell(g, x, y, rx + 2.2, ry + 2.2, ink);
  ell(g, x, y, rx, ry, fill);
}
function pod(g, w, h, i) {
  const cx = w * 0.5, G = h * 0.96;
  const emerge = i === 0, swell = i === 2, hurt = i === 3, dead = i === 4;
  ell(g, cx, G - 1, 32, 6, '#140e0a');
  ell(g, cx, G - 3, 24, 3.4, '#4a3418');
  if (dead) {
    lobe(g, cx - 8, G - 8, 14, 6, '#a89050', '#1a1008');
    lobe(g, cx + 10, G - 6, 12, 5, '#8a7844', '#1a1008');
    ell(g, cx, G - 8, 6, 4, '#2a140c');
    g.fillStyle = '#fff6d0'; g.fillRect(cx - 16, G - 14, 3, 3); g.fillRect(cx + 12, G - 12, 3, 3);
    mark(g); return;
  }
  const s = emerge ? 0.62 : swell ? 1.12 : hurt ? 0.86 : 1;
  const body = swell ? '#f4ffb0' : hurt ? '#d8c078' : '#e4ee78';
  const ink = '#160e08';
  const cy = G - 28 * s - 4;
  lobe(g, cx, cy + 6, 16 * s, 18 * s, body, ink);
  lobe(g, cx - 12 * s, cy + 2, 10 * s, 12 * s, body, ink);
  lobe(g, cx + 11 * s, cy - 2, 9 * s, 11 * s, body, ink);
  if (!emerge) lobe(g, cx + 1, cy - 14 * s, 8 * s, 7 * s, swell ? '#fbffc8' : body, ink);
  ell(g, cx - 6 * s, cy - 8 * s, 5 * s, 3 * s, 'rgba(255,255,255,0.8)');
  g.strokeStyle = '#5c3010'; g.lineWidth = 2.2; g.lineCap = 'round';
  g.beginPath();
  g.moveTo(cx - 10 * s, cy - 6 * s); g.quadraticCurveTo(cx - 2, cy + 4, cx - 8 * s, cy + 14 * s);
  g.moveTo(cx + 8 * s, cy - 10 * s); g.quadraticCurveTo(cx + 14 * s, cy, cx + 6 * s, cy + 12 * s);
  g.stroke();
  ell(g, cx - 11 * s, cy + 8 * s, 3.2, 2.4, '#b88838');
  ell(g, cx + 9 * s, cy + 4 * s, 2.6, 2, '#c09040');
  const pore = (emerge ? 3.2 : swell ? 8 : hurt ? 6 : 5);
  const px = cx + 2, py = cy + 4;
  ell(g, px, py, pore + 2, pore + 2, ink);
  ell(g, px, py, pore, pore, '#2a140c');
  ell(g, px - 1, py - 1, pore * 0.35, pore * 0.35, swell ? '#fff4c0' : '#6a3818');
  if (swell) {
    glow(g, cx + 20, cy - 8, 13, 'rgba(255,252,214,0.95)', 'rgba(255,252,214,0)');
    lobe(g, cx + 20, cy - 8, 4.4, 4.4, '#fffef4', ink);
  }
  if (hurt) {
    g.strokeStyle = '#3a140c'; g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(cx - 6, cy - 4); g.lineTo(cx + 4, cy + 8); g.lineTo(cx - 1, cy + 16); g.stroke();
    ell(g, cx + 8, cy + 14, 2, 2.6, '#c6a050');
  }
  mark(g);
}

function hood(g, x, y, tilt, burn) {
  poly(g, [x - 18, y + 18, x - 22, y - 6, x - 4, y - 28, x + 18, y - 8, x + 16, y + 16, x + 4, y + 28, x - 12, y + 24], '#100c10');
  poly(g, [x - 14, y + 14, x - 16, y - 2, x - 2, y - 20, x + 13, y - 4, x + 12, y + 14, x + 2, y + 22, x - 8, y + 18], burn ? '#6a3418' : '#241820');
  const skin = burn ? '#ffe8c8' : '#f6d4b4';
  ell(g, x + tilt, y + 2, 8, 10, skin);
  ell(g, x + tilt - 3, y + 4, 2.4, 4, 'rgba(70,36,28,0.55)');
  ell(g, x + tilt + 3.2, y + 4, 2.2, 3.6, 'rgba(70,36,28,0.45)');
  g.fillStyle = '#120c0a'; g.fillRect(x + tilt - 6, y - 1, 5, 3); g.fillRect(x + tilt + 1.6, y - 1, 5, 3);
  glow(g, x + tilt, y, burn ? 16 : 11, burn ? 'rgba(255,230,160,0.9)' : 'rgba(255,210,90,0.7)', 'rgba(255,200,80,0)');
  g.fillStyle = burn ? '#fff8e4' : '#ffe7a0';
  g.fillRect(x + tilt - 5, y - 0.4, 3, 1.8); g.fillRect(x + tilt + 2.4, y - 0.4, 3, 1.8);
  g.strokeStyle = '#5a342c'; g.lineWidth = 1.5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x + tilt - 3, y + 9); g.lineTo(x + tilt + 3.4, y + 8); g.stroke();
  g.strokeStyle = '#efe0cc'; g.lineWidth = 1.8;
  g.beginPath(); g.moveTo(x + tilt, y + 10); g.lineTo(x + tilt + 2, y + 18); g.stroke();
}
function boneStaff(g, x0, y0, x1, y1, hot) {
  seg(g, x0, y0, x1, y1, 5, '#4a3828');
  seg(g, x0, y0, x1, y1, 2.8, '#f7f0e2');
  for (let t = 0.22; t < 0.92; t += 0.28) ell(g, x1 + (x0 - x1) * t, y1 + (y0 - y1) * t, 3.4, 2.3, '#fff6ea');
  ell(g, x0, y0, 6.4, 7.4, '#fffaf2');
  ell(g, x0 - 1, y0 - 1, 2.6, 3, hot ? '#ffe090' : '#e6d4b4');
  if (hot) glow(g, x0, y0, 16 + hot * 4, 'rgba(255,230,160,0.95)', 'rgba(255,140,30,0)');
}
function sleeve(g, x0, y0, x1, y1, fill, ink) {
  seg(g, x0, y0, x1, y1, 6.5, ink);
  seg(g, x0, y0, x1, y1, 4.4, fill);
}
function hand(g, x, y, dir) {
  ell(g, x, y, 3.6, 3, '#f3dcc4');
  g.strokeStyle = '#f7e6d2'; g.lineWidth = 1.6; g.lineCap = 'round';
  g.beginPath();
  for (let k = -1; k <= 1; k++) { g.moveTo(x, y); g.lineTo(x + dir * 7, y - 3 + k * 3); }
  g.stroke();
}

function agin(g, w, h, i, quiet) {
  const G = h * 0.96, cx = 54, burn = i === 6;
  const pose = [
    { lean: 10, crouch: 0, tip: [32, -2], foot: 14, grip: 0.48, hot: 0, step: 0 },
    { lean: -28, crouch: -6, tip: [-28, -8], foot: -6, grip: 0.35, hot: 0, step: -4 },
    { lean: 26, crouch: 4, tip: [58, -34], foot: -22, grip: 0.58, hot: 1, step: 16 },
    { lean: 2, crouch: 0, tip: [8, -36], foot: 6, grip: 0.62, hot: 2, step: 0 },
    { lean: 32, crouch: 2, tip: [40, 8], foot: 10, grip: 0.4, hot: 0, step: 26 },
    { lean: -8, crouch: 36, tip: [18, 16], foot: 20, grip: 0.3, hot: 0, step: 4 },
    { lean: 6, crouch: 14, tip: [16, 6], foot: 8, grip: 0.36, hot: 3, step: 2 },
  ][i];
  const top = G - 150 + pose.crouch;
  const hx = cx + pose.lean * 0.55;
  const robe = burn ? '#8a4024' : '#6a3844';
  const ink = '#140c10';
  if (burn) glow(g, hx + 4, top + 46, 62, 'rgba(255,200,90,0.75)', 'rgba(255,60,10,0)');
  const x0 = hx + pose.tip[0], y0 = Math.max(12, top + pose.tip[1]);
  const x1 = cx + pose.foot, y1 = G - 1;
  const gx = x1 + (x0 - x1) * pose.grip, gy = y1 + (y0 - y1) * pose.grip;
  const hem = G - 1, yS = top + 22;
  poly(g, [
    hx - 26, yS + 6, hx - 12, yS - 6, hx + 10, yS - 4, hx + 26, yS + 8,
    hx + 24, yS + 40, hx + 14, hem - 24, hx + 28, hem, hx + 8, hem - 8,
    hx - 6, hem, hx - 18, hem - 8, hx - 30, hem - 1, hx - 24, yS + 36,
  ], ink);
  poly(g, [
    hx - 20, yS + 8, hx - 8, yS - 1, hx + 8, yS + 1, hx + 20, yS + 12,
    hx + 18, yS + 38, hx + 10, hem - 20, hx + 22, hem - 5, hx + 6, hem - 12,
    hx - 6, hem - 4, hx - 14, hem - 12, hx - 24, hem - 5, hx - 18, yS + 34,
  ], robe);
  poly(g, [hx - 2, yS + 16, hx + 4, hem - 24, hx + 12, hem - 16, hx + 2, yS + 22], burn ? '#c86830' : '#3a1824');
  g.strokeStyle = burn ? '#ffd0a0' : '#efc2a4'; g.lineWidth = 2.2; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(hx - 22, hem - 6); g.lineTo(hx - 8, hem); g.lineTo(hx + 2, hem - 12); g.lineTo(hx + 20, hem - 3); g.stroke();
  ell(g, hx - 4, top + 26, 9, 5, burn ? 'rgba(255,220,160,0.75)' : 'rgba(255,214,180,0.35)');
  sleeve(g, hx + 8, top + 28, gx, gy, robe, ink);
  hand(g, gx, gy, pose.lean < 0 ? -1 : 1);
  hood(g, hx - 2, yS - 10, pose.lean * 0.08, burn);
  boneStaff(g, x0, y0, x1, y1, pose.hot);
  g.fillStyle = ink;
  g.fillRect(cx - 18 - pose.step * 0.35, G - 5, 11, 5);
  g.fillRect(cx + 4 + pose.step * 0.55, G - 5, 11, 5);
  if (burn) {
    g.fillStyle = '#fff6e4';
    for (let k = 0; k < 10; k++) g.fillRect(hx - 26 + (k * 11) % 56, top + 6 + (k * 15) % 120, 2, 2);
    glow(g, hx, top + 30, 18, 'rgba(255,246,220,0.95)', 'rgba(255,150,30,0)');
  }
  if (pose.hot === 2) {
    g.strokeStyle = 'rgba(236,255,180,0.95)'; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(Math.min(w - 8, x0 + 18), y0 + 4); g.lineTo(Math.min(w - 6, x0 + 30), y0 - 4); g.stroke();
    glow(g, Math.min(w - 10, x0 + 30), y0 - 4, 8, 'rgba(244,255,210,0.95)', 'rgba(244,255,210,0)');
  }
  if (!quiet) mark(g);
}

function mask(g, x, y) {
  g.fillStyle = '#ecc8a4'; g.fillRect(x - 4, y + 12, 8, 14);
  g.strokeStyle = '#8a6048'; g.lineWidth = 1.3; g.beginPath();
  g.moveTo(x - 1, y + 13); g.lineTo(x - 1, y + 24); g.moveTo(x + 2, y + 13); g.lineTo(x + 2, y + 24); g.stroke();
  ell(g, x, y, 14, 16, '#05050a');
  ell(g, x, y + 1, 12, 14, '#14141c');
  ell(g, x - 6, y - 1, 2.2, 6, '#3a3a48');
  g.fillStyle = '#07070c'; g.fillRect(x - 13, y + 5, 26, 3);
  glow(g, x, y - 1, 14, 'rgba(255,236,220,0.9)', 'rgba(255,70,40,0)');
  g.fillStyle = '#12080a'; g.fillRect(x - 9, y - 3, 7, 3.2); g.fillRect(x + 2, y - 3, 7, 3.2);
  g.fillStyle = '#fff6f2'; g.fillRect(x - 8, y - 2.4, 5, 2); g.fillRect(x + 3, y - 2.4, 5, 2);
  g.fillStyle = '#c8aa88';
  for (let n = 0; n < 5; n++) g.fillRect(x - 7 + n * 3.2, y + 8, 1.3, 3.2);
}
function mitt(g, x, y) {
  ell(g, x, y, 7, 5, '#0c0c12');
  ell(g, x - 1, y - 1, 4, 2.4, '#2a2a36');
}
function balt(g, w, h, i) {
  const G = h * 0.96, cx = 52;
  const leather = '#5c5c6c', shade = '#32323e', ink = '#101018', glove = '#1a1a22';
  if (i === 7) {
    poly(g, [cx - 16, G - 120, cx + 18, G - 112, cx + 14, G - 20, cx - 14, G - 16], ink);
    poly(g, [cx - 12, G - 114, cx + 14, G - 108, cx + 10, G - 24, cx - 10, G - 20], leather);
    mask(g, cx, G - 124);
    g.strokeStyle = '#d6ff84'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx - 30, G); g.quadraticCurveTo(cx - 16, G - 48, cx + 2, G - 86); g.quadraticCurveTo(cx + 8, G - 110, cx - 6, G - 132);
    g.moveTo(cx + 28, G - 2); g.quadraticCurveTo(cx + 4, G - 40, cx - 8, G - 78); g.quadraticCurveTo(cx - 12, G - 108, cx + 10, G - 128);
    g.moveTo(cx - 8, G); g.quadraticCurveTo(cx + 10, G - 30, cx + 4, G - 70);
    g.stroke();
    ell(g, cx - 16, G - 40, 4, 2.6, '#f0ffc0');
    ell(g, cx + 12, G - 72, 3.4, 2.2, '#f0ffc0');
    mark(g); return;
  }
  if (i === 6) {
    ell(g, cx + 6, G - 16, 42, 13, ink, -0.3);
    ell(g, cx + 6, G - 17, 38, 10, leather, -0.3);
    mask(g, cx - 32, G - 24);
    limb(g, cx - 6, G - 18, cx - 22, G - 8, cx - 34, G - 2, 5, glove, ink);
    mitt(g, cx - 36, G - 2);
    limb(g, cx + 18, G - 14, cx + 34, G - 26, cx + 46, G - 34, 5, glove, ink);
    mitt(g, cx + 48, G - 36);
    mark(g); return;
  }
  const pose = [
    { lean: 0, crouch: 40, ax: 36, ay: -22, bx: -34, by: -12, spread: 2 },
    { lean: 8, crouch: 6, ax: 32, ay: -2, bx: -18, by: 8, spread: 8 },
    { lean: 16, crouch: 4, ax: 52, ay: -36, bx: -12, by: 2, spread: 10 },
    { lean: -22, crouch: 4, ax: 14, ay: -4, bx: -32, by: 6, spread: 22 },
    { lean: 34, crouch: 32, ax: 54, ay: 6, bx: 16, by: 8, spread: 24 },
    { lean: 8, crouch: 8, ax: 26, ay: 14, bx: -26, by: 12, spread: 6, hold: 1 },
  ][i];
  const top = G - 136 + pose.crouch;
  const hx = cx + pose.lean * 0.65;
  const hip = top + 58;
  limb(g, hx - 6, hip, hx - 10, hip + 28, hx - 18 - pose.spread * 0.2, G - 2, 7.4, shade, ink);
  limb(g, hx + 7, hip, hx + 14 + pose.spread * 0.2, hip + 26, hx + 16 + pose.spread * 0.65, G - 2, 7.4, shade, ink);
  ell(g, hx - 18 - pose.spread * 0.2, G - 3, 9, 4, ink);
  ell(g, hx + 16 + pose.spread * 0.65, G - 3, 9, 4, ink);
  poly(g, [hx - 18, top + 16, hx + 20, top + 20, hx + 18, hip + 4, hx + 6, hip + 10, hx - 8, hip + 8, hx - 16, hip], ink);
  poly(g, [hx - 14, top + 20, hx + 16, top + 24, hx + 14, hip, hx + 4, hip + 6, hx - 6, hip + 4, hx - 12, hip - 2], leather);
  ell(g, hx - 6, top + 28, 8, 4, 'rgba(220,220,232,0.4)');
  mask(g, hx, top + 2);
  if (pose.hold) {
    limb(g, hx - 8, top + 32, hx - 28, top + 40, hx - 10, top + 58, 5.4, glove, ink);
    limb(g, hx + 10, top + 32, hx + 30, top + 38, hx + 12, top + 60, 5.4, glove, ink);
    mitt(g, hx - 10, top + 60); mitt(g, hx + 12, top + 62);
    g.strokeStyle = '#0a0a10'; g.lineWidth = 4;
    g.beginPath(); g.ellipse(hx + 2, top + 48, 18, 14, 0.05, 0.2, TAU - 0.4); g.stroke();
  } else {
    limb(g, hx - 10, top + 30, hx + pose.bx * 0.45, top + 42, hx + pose.bx, top + 50 + pose.by, 5.2, glove, ink);
    limb(g, hx + 10, top + 28, hx + pose.ax * 0.5, top + 24 + pose.ay * 0.35, hx + pose.ax, top + 36 + pose.ay, 5.4, glove, ink);
    mitt(g, hx + pose.ax, top + 36 + pose.ay);
    mitt(g, hx + pose.bx, top + 50 + pose.by);
  }
  mark(g);
}

function portrait(g, w, h) {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#3a1612'); sky.addColorStop(1, '#10080a');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  g.save(); g.translate(16, -36); g.scale(1.9, 1.9); agin(g, 120, 180, 3, true); g.restore();
  mark(g, 16, 28);
}

export function paintCast(scene) {
  sheet(scene, 's5stalk', 6, 96, 64, (g, i) => stalk(g, 96, 64, i));
  sheet(scene, 's5pod', 5, 80, 80, (g, i) => pod(g, 80, 80, i));
  sheet(scene, 's5agin', 7, 120, 180, (g, i) => agin(g, 120, 180, i));
  sheet(scene, 's5balt', 8, 110, 170, (g, i) => balt(g, 110, 170, i));
  sheet(scene, 's5green', 4, 120, 180, (g, i, w, h) => man(g, w, h, '#2a6a30', 'GREEN'));
  tex(scene, 'aginorPortrait', 256, 256, portrait);
  const panel = (g, w, h, title) => { g.fillStyle = '#140c0a'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffb070'; g.font = 'bold 32px sans-serif'; g.fillText(title, 40, 80); g.fillStyle = '#fff'; g.font = '16px sans-serif'; g.fillText('PLACEHOLDER ART', 40, 120); };
  tex(scene, 'story5p1', 640, 360, (g, w, h) => panel(g, w, h, 'THE WAYGATE'));
  tex(scene, 'story5p2', 640, 360, (g, w, h) => panel(g, w, h, 'INTO THE BLIGHT'));
  tex(scene, 'story5p3', 640, 360, (g, w, h) => panel(g, w, h, 'THE EYE'));
}
