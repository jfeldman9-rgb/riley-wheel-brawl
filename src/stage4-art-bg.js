// Moonlit dead city: sky, two ruin silhouettes, cracked flagstones, story panels.
import { tex } from './stage4-art.js';

function sky(g, w, h) {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#070914');
  grad.addColorStop(0.38, '#121c30');
  grad.addColorStop(0.7, '#16343a');
  grad.addColorStop(1, '#143028');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(230,236,255,0.75)';
  for (let i = 0; i < 70; i++) {
    const x = (i * 97 + 13) % w;
    const y = (i * 53 + 7) % (h * 0.62);
    const s = i % 7 === 0 ? 2 : 1;
    g.globalAlpha = i % 3 === 0 ? 0.9 : 0.45;
    g.fillRect(x, y, s, s);
  }
  g.globalAlpha = 1;
  const mx = w * 0.74, my = h * 0.2;
  const glow = g.createRadialGradient(mx, my, 10, mx, my, w * 0.16);
  glow.addColorStop(0, 'rgba(255,246,220,0.95)');
  glow.addColorStop(0.28, 'rgba(244,228,180,0.28)');
  glow.addColorStop(1, 'rgba(244,228,180,0)');
  g.fillStyle = glow;
  g.beginPath(); g.arc(mx, my, w * 0.16, 0, 6.3); g.fill();
  const moonR = Math.min(36, w * 0.042);
  g.fillStyle = '#f7f0dc';
  g.beginPath(); g.arc(mx, my, moonR, 0, 6.3); g.fill();
  g.fillStyle = 'rgba(168,160,132,0.4)';
  g.beginPath(); g.arc(mx - moonR * 0.28, my - moonR * 0.2, moonR * 0.18, 0, 6.3); g.fill();
  g.beginPath(); g.arc(mx + moonR * 0.32, my + moonR * 0.22, moonR * 0.12, 0, 6.3); g.fill();
  g.beginPath(); g.arc(mx + moonR * 0.05, my + moonR * 0.38, moonR * 0.08, 0, 6.3); g.fill();
  const haze = g.createLinearGradient(0, h * 0.55, 0, h);
  haze.addColorStop(0, 'rgba(40,120,90,0)');
  haze.addColorStop(1, 'rgba(90,190,130,0.22)');
  g.fillStyle = haze;
  g.fillRect(0, h * 0.55, w, h * 0.45);
}

function block(g, x, base, bh, bw, col, ink) {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(x, base);
  g.lineTo(x + bw * 0.08, base - bh);
  const steps = 3 + ((bw / 20) | 0);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const jag = (i % 2 ? 26 : -16) * (bh > 90 ? 1 : 0.35);
    g.lineTo(x + bw * t, base - bh * (1 - t * 0.18) + jag);
  }
  g.lineTo(x + bw, base);
  g.closePath();
  g.fill();
  if (bw > 54 && bh > 70) {
    const ax = x + bw * 0.5, ay = base - bh * 0.42, ar = bw * 0.22;
    g.fillStyle = ink || '#0c1218';
    g.beginPath();
    g.moveTo(ax - ar, base - 8);
    g.lineTo(ax - ar, ay);
    g.arc(ax, ay, ar, Math.PI, 0);
    g.lineTo(ax + ar, base - 8);
    g.fill();
    g.fillStyle = col;
    g.fillRect(ax - 3, ay - ar, 6, ar + 8);
  }
  g.fillStyle = 'rgba(170,255,180,0.22)';
  g.fillRect(x + bw * 0.32, base - bh * 0.55, 4, 8);
  if (bh > 110) g.fillRect(x + bw * 0.58, base - bh * 0.78, 4, 7);
}

function dome(g, x, base, r, col) {
  g.fillStyle = col;
  g.fillRect(x - r * 0.85, base - r * 0.55, r * 1.7, r * 0.55);
  g.beginPath();
  g.arc(x, base - r * 0.5, r, Math.PI, 0);
  g.fill();
  g.fillStyle = '#10161c';
  g.beginPath();
  g.arc(x + r * 0.25, base - r * 0.72, r * 0.28, 0, 6.3);
  g.fill();
  g.fillStyle = col;
  g.beginPath();
  g.arc(x + r * 0.25, base - r * 0.72, r * 0.16, 0, 6.3);
  g.fill();
}

function ruin(g, w, h, salt) {
  const base = h - 6;
  const haze = g.createLinearGradient(0, base - 90, 0, base);
  haze.addColorStop(0, 'rgba(70,150,110,0)');
  haze.addColorStop(1, 'rgba(110,190,130,0.28)');
  g.fillStyle = haze;
  g.fillRect(0, base - 90, w, 96);
  const col = salt ? '#141a20' : '#1c262e';
  const far = salt ? '#10161c' : '#182028';
  const row = salt
    ? [[8, 120, 46], [58, 168, 54], [118, 86, 36], [160, 140, 70], [240, 200, 48], [292, 110, 40], [340, 160, 64], [412, 90, 34], [452, 130, 52]]
    : [[16, 150, 40], [62, 96, 50], [120, 180, 44], [170, 70, 80], [258, 150, 36], [300, 120, 58], [366, 188, 42], [414, 100, 48], [468, 140, 36]];
  for (const [x, bh, bw] of row) block(g, x, base, bh, bw, x % 80 < 40 ? col : far, null);
  if (salt) dome(g, 200, base, 34, col);
  else dome(g, 330, base, 28, far);
  g.fillStyle = '#0e1418';
  g.fillRect(0, base - 2, w, 10);
}

function stones(g, w, h) {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#241e1c');
  grad.addColorStop(1, '#3a322c');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  const cuts = [0, 0.1, 0.24, 0.42, 0.66, 1];
  for (let r = 0; r < cuts.length - 1; r++) {
    const y0 = cuts[r] * h;
    const y1 = cuts[r + 1] * h;
    const bw = 34 + r * 14;
    let x = (r % 2) * (bw * 0.45) - 8;
    while (x < w + 8) {
      const inset = (4 - r) * 3;
      g.fillStyle = ((x + r * 5) % 7 === 0) ? '#4a4038' : '#342e28';
      g.beginPath();
      g.moveTo(x + inset, y0 + 2);
      g.lineTo(x + bw - inset, y0 + 2);
      g.lineTo(x + bw + 4, y1 - 2);
      g.lineTo(x - 4, y1 - 2);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(12,10,8,0.85)';
      g.lineWidth = 2;
      g.stroke();
      if ((x + r) % 5 === 0) {
        g.strokeStyle = 'rgba(20,16,12,0.7)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x + bw * 0.3, y0 + 6);
        g.lineTo(x + bw * 0.55, (y0 + y1) / 2);
        g.lineTo(x + bw * 0.4, y1 - 6);
        g.stroke();
      }
      x += bw;
    }
  }
  const fog = g.createRadialGradient(w * 0.35, h * 0.7, 4, w * 0.4, h * 0.75, w * 0.45);
  fog.addColorStop(0, 'rgba(130,210,120,0.28)');
  fog.addColorStop(1, 'rgba(80,140,70,0)');
  g.fillStyle = fog;
  g.fillRect(0, 0, w, h);
}

function figure(g, x, y, kind) {
  if (kind === 'riley') {
    g.fillStyle = '#1a120c';
    g.fillRect(x - 8, y - 36, 18, 22);
    g.fillRect(x - 5, y - 16, 6, 16);
    g.fillRect(x + 4, y - 16, 6, 16);
    g.fillStyle = '#c8b8a0';
    g.fillRect(x - 4, y - 48, 10, 8);
    g.fillRect(x - 14, y - 34, 6, 8);
  } else if (kind === 'cult') {
    g.fillStyle = '#140e12';
    g.beginPath();
    g.moveTo(x - 12, y);
    g.lineTo(x - 8, y - 28);
    g.quadraticCurveTo(x, y - 44, x + 10, y - 26);
    g.lineTo(x + 14, y);
    g.fill();
    g.fillStyle = '#d8ff6a';
    g.fillRect(x - 1, y - 18, 3, 3);
  } else {
    g.fillStyle = '#100c14';
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x - 8, y - 40);
    g.quadraticCurveTo(x - 46, y - 70, x - 54, y - 28);
    g.quadraticCurveTo(x - 20, y - 10, x, y - 8);
    g.quadraticCurveTo(x + 24, y - 16, x + 58, y - 24);
    g.quadraticCurveTo(x + 40, y - 64, x + 6, y - 36);
    g.fill();
    g.fillStyle = '#e8ff6a';
    g.fillRect(x - 2, y - 34, 3, 2);
    g.fillRect(x + 4, y - 34, 3, 2);
  }
}

function panel(g, w, h, which) {
  sky(g, w, h);
  g.fillStyle = 'rgba(6,10,14,0.2)';
  g.fillRect(0, 0, w, h);
  ruin(g, w, h * 0.78, which === 1);
  if (which === 0) {
    figure(g, w * 0.22, h * 0.8, 'riley');
    g.fillStyle = 'rgba(140,220,130,0.18)';
    g.beginPath(); g.ellipse(w * 0.55, h * 0.84, w * 0.28, 16, 0, 0, 6.3); g.fill();
  } else if (which === 1) {
    figure(g, w * 0.68, h * 0.8, 'cult');
    g.fillStyle = 'rgba(180,255,160,0.12)';
    g.beginPath(); g.ellipse(w * 0.68, h * 0.86, 50, 12, 0, 0, 6.3); g.fill();
  } else {
    figure(g, w * 0.5, h * 0.78, 'drag');
    g.fillStyle = 'rgba(170,240,150,0.16)';
    g.beginPath(); g.ellipse(w * 0.5, h * 0.86, w * 0.32, 20, 0, 0, 6.3); g.fill();
  }
  const vig = g.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.72);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.5)');
  g.fillStyle = vig;
  g.fillRect(0, 0, w, h);
}

function shaft(g, w, h) {
  const beam = g.createLinearGradient(w / 2, 0, w / 2, h);
  beam.addColorStop(0, 'rgba(255,244,210,0.02)');
  beam.addColorStop(0.15, 'rgba(255,236,190,0.55)');
  beam.addColorStop(0.7, 'rgba(255,230,170,0.18)');
  beam.addColorStop(1, 'rgba(255,230,160,0)');
  g.fillStyle = beam;
  g.beginPath();
  g.moveTo(w * 0.38, 0); g.lineTo(w * 0.62, 0); g.lineTo(w * 0.92, h); g.lineTo(w * 0.08, h);
  g.fill();
}

export function paintBackdrop(scene) {
  tex(scene, 'bg4far', 960, 540, sky);
  tex(scene, 'bg4mid', 520, 300, (g, w, h) => ruin(g, w, h, 0));
  tex(scene, 'bg4mid2', 520, 300, (g, w, h) => ruin(g, w, h, 1));
  tex(scene, 'bg4floor', 256, 188, stones);
  tex(scene, 'bg4floor2', 256, 188, stones);
  tex(scene, 'bg4floor3', 256, 188, stones);
  tex(scene, 's4shaft', 64, 220, shaft);
  tex(scene, 'story4p1', 640, 360, (g, w, h) => panel(g, w, h, 0));
  tex(scene, 'story4p2', 640, 360, (g, w, h) => panel(g, w, h, 1));
  tex(scene, 'story4p3', 640, 360, (g, w, h) => panel(g, w, h, 2));
}
