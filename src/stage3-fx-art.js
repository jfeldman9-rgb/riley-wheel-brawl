// Code-drawn stand-ins for the four Stage 3 prop/FX sheets that are still labelled cards
// (assets/stage3/props/*.webp carry "PLACEHOLDER <id> frame N" text). Same keys and 256x256 frame grid,
// so stage3-hazards/stage3-lights need no change. The labelled cards load only under ?debug.
// Deterministic (no Math.random); a few ms once per Stage 3 entry.
export const STAGE3_FX = Object.freeze({ rooftiles: 'prop-rooftiles', shadowpool: 'fx-shadowpool', shadowburst: 'fx-shadowburst', fade_far: 'fx-fade-far' });
const N = { rooftiles: 4, shadowpool: 4, shadowburst: 6, fade_far: 4 }, F = 256;

function blob(g, x, y, rx, ry, inner, outer) {
  const r = g.createRadialGradient(x, y, 0, x, y, rx);
  r.addColorStop(0, inner); r.addColorStop(1, outer);
  g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y);
  g.fillStyle = r; g.beginPath(); g.arc(x, y, rx, 0, Math.PI * 2); g.fill(); g.restore();
}

// red clay tiles tumbling left (flipX for right); frame i rotates the cluster
function tiles(g, i) {
  const spin = i * 0.55;
  for (let k = 0; k < 6; k++) {
    const a = spin + k * 1.1, x = 70 + k * 24 + Math.sin(a) * 8, y = 128 + Math.cos(a * 1.3) * 26;
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = k % 2 ? '#8e3b22' : '#a94a2a'; g.strokeStyle = '#3a160c'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-24, -9); g.quadraticCurveTo(0, -20, 24, -9); g.lineTo(22, 9); g.quadraticCurveTo(0, -1, -22, 9); g.closePath();
    g.fill(); g.stroke();
    g.strokeStyle = 'rgba(255,190,140,0.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-16, -9); g.quadraticCurveTo(0, -16, 16, -9); g.stroke();
    g.restore();
  }
  g.fillStyle = 'rgba(120,70,50,0.35)';
  for (let k = 0; k < 5; k++) g.fillRect(200 + k * 9, 110 + ((k * 37 + i * 11) % 40), 18 - k * 3, 3);
}

// inky pool, a flat ellipse; frame i = rising warning
function pool(g, i) {
  const u = (i + 1) / 4;
  blob(g, 128, 200, 120, 30, `rgba(8,4,14,${0.75 + 0.2 * u})`, 'rgba(20,6,30,0)');
  blob(g, 128, 200, 70, 16, `rgba(70,30,110,${0.25 * u})`, 'rgba(40,10,60,0)');
  g.strokeStyle = `rgba(170,110,240,${0.35 + 0.4 * u})`; g.lineWidth = 3;
  g.beginPath(); g.ellipse(128, 200, 50 + 50 * u, 12 + 12 * u, 0, 0, Math.PI * 2); g.stroke();
}

// smoke pop: violet core, then billowing puffs that thin out
function burst(g, i) {
  const u = i / 5, a = 1 - u * 0.85;
  blob(g, 128, 150, 30 + 90 * u, 30 + 90 * u, `rgba(10,6,18,${a})`, 'rgba(10,6,18,0)');
  for (let k = 0; k < 7; k++) {
    const t = k / 7 * Math.PI * 2 + i * 0.2, d = 20 + 85 * u;
    blob(g, 128 + Math.cos(t) * d, 150 + Math.sin(t) * d * 0.8, 18 + 26 * u, 18 + 26 * u, `rgba(22,14,34,${a * 0.9})`, 'rgba(22,14,34,0)');
  }
  if (i < 3) blob(g, 128, 150, 26 - 7 * i, 26 - 7 * i, `rgba(190,140,255,${0.9 - 0.3 * i})`, 'rgba(120,60,200,0)');
}

// small far Myrddraal, black cloak streaming, mid-leap to the right; frame i = leap phase
function fade(g, i) {
  const y = 132 - Math.sin(i / 4 * Math.PI) * 26, x = 128;
  g.fillStyle = '#07080c';
  g.beginPath(); g.moveTo(x + 6, y - 46); g.quadraticCurveTo(x + 20, y - 20, x + 12, y + 22);
  g.lineTo(x - 52 - i * 4, y + 18 + (i % 2) * 6); g.quadraticCurveTo(x - 30, y - 10, x - 6, y - 44); g.closePath(); g.fill();
  g.beginPath(); g.arc(x + 4, y - 52, 9, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#c9ccd2'; g.beginPath(); g.ellipse(x + 9, y - 51, 3.5, 5, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#07080c'; g.lineWidth = 6; g.lineCap = 'round';
  const s = i % 2 ? 1 : -1;
  g.beginPath(); g.moveTo(x + 4, y + 18); g.lineTo(x + 22 * s, y + 46); g.moveTo(x - 2, y + 18); g.lineTo(x - 18 * s, y + 44); g.stroke();
  g.strokeStyle = 'rgba(200,210,230,0.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 14, y - 20); g.lineTo(x + 44, y - 34); g.stroke();
}

const DRAW = { rooftiles: tiles, shadowpool: pool, shadowburst: burst, fade_far: fade };

/** Paint every missing stand-in. Returns the keys painted ([] without a DOM canvas). */
export function paintStage3Fx(scene) {
  const done = [];
  if (!scene?.textures?.addCanvas || typeof document === 'undefined' || !document.createElement) return done;
  for (const key of Object.keys(DRAW)) {
    if (scene.textures.exists(key)) continue;
    try {
      const c = document.createElement('canvas'), n = N[key];
      c.width = F * n; c.height = F;
      const g = c.getContext('2d');
      if (!g) continue;
      for (let i = 0; i < n; i++) { g.save(); g.translate(i * F, 0); g.beginPath(); g.rect(0, 0, F, F); g.clip(); DRAW[key](g, i); g.restore(); }
      const t = scene.textures.addCanvas(key, c);
      if (t?.add) for (let i = 0; i < n; i++) t.add(i, 0, i * F, 0, F, F);
      done.push(key);
    } catch (e) { console.warn('Stage 3 FX stand-in skipped', key, e); }
  }
  return done;
}
