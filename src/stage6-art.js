// Code-drawn Stone of Tear stand-ins. Small cells, scaled up in the view. No text.
import { tex, sheet } from './stage4-art.js';
import { q } from './config.js';
import { queryFlag } from './debug-flag.js';

export const STAGE6_CANVASES = Object.freeze([
  ['bg6far', 320, 180], ['bg6mid', 160, 96], ['bg6mid2', 160, 96],
  ['bg6mid3', 160, 96], ['bg6mid4', 160, 96],
  ['bg6floor', 64, 32], ['bg6floor2', 64, 32], ['bg6floor3', 64, 32],
  ['s6gray', 192, 48], ['s6fade', 216, 56], ['s6belal', 320, 64], ['s6rand', 192, 48],
  ['randPortrait', 32, 32], ['belalPortrait', 32, 32], ['s6storm', 192, 32],
  ['s6net', 48, 24], ['s6lamp', 72, 28], ['s6oil', 64, 32], ['s6hatch', 64, 28],
  ['s6call', 64, 48], ['s6ray', 16, 64], ['s6ribbon', 16, 16], ['crate', 120, 120],
  ['s6streak', 32, 8], ['s6def', 96, 40], ['s6planks', 32, 8], ['story6p1', 80, 45], ['story6p2', 80, 45], ['story6p3', 80, 45],
]);

function hatch(g, w, h) {
  if (!queryFlag(q, 'debug')) return;
  g.fillStyle = 'rgba(255,255,255,0.45)';
  for (let x = -h; x < w; x += 8) g.fillRect(x, 0, 2, h);
}

function man(g, w, h, skin, coat, helm) {
  g.fillStyle = coat; g.fillRect(w * 0.32, h * 0.28, w * 0.36, h * 0.5);
  g.fillStyle = skin; g.beginPath(); g.arc(w * 0.5, h * 0.18, w * 0.16, 0, 6.3); g.fill();
  g.fillStyle = '#1a120c'; g.fillRect(w * 0.38, h * 0.78, w * 0.1, h * 0.2); g.fillRect(w * 0.52, h * 0.78, w * 0.1, h * 0.2);
  if (helm) { g.fillStyle = helm; g.fillRect(w * 0.34, h * 0.06, w * 0.32, h * 0.12); }
}

export function paintStage6Art(scene) {
  if (!scene?.textures || typeof document === 'undefined') return [];
  const made = [];
  const put = (key, w, h, draw) => {
    if (scene.textures.exists(key)) return;
    tex(scene, key, w, h, (g, W, H) => { draw(g, W, H); hatch(g, W, H); });
    made.push(key);
  };
  put('bg6far', 320, 180, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0c1428'); sky.addColorStop(1, '#1a2744');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#141820'; g.fillRect(40, 40, 70, 110); g.fillRect(120, 28, 90, 122); g.fillRect(220, 50, 60, 100);
    g.fillStyle = '#2a241c'; g.fillRect(0, 150, w, 30);
    g.fillStyle = '#0e1c30'; g.fillRect(0, 158, w, 10);
  });
  put('bg6mid', 160, 96, (g, w, h) => {
    g.fillStyle = '#3a2420'; g.fillRect(0, 20, w, h);
    g.fillStyle = '#5a3028'; for (let x = 8; x < w; x += 28) g.fillRect(x, 10, 10, h - 10);
    g.fillStyle = '#e8c878'; g.fillRect(20, 36, 8, 10); g.fillRect(90, 40, 8, 10);
  });
  put('bg6mid2', 160, 96, (g, w, h) => {
    g.fillStyle = '#4a2824'; g.fillRect(0, 16, w, h);
    g.fillStyle = '#6a3830'; for (let x = 4; x < w; x += 22) g.fillRect(x, 0, 8, h);
    g.fillStyle = '#f0d090'; g.fillRect(40, 30, 6, 8); g.fillRect(110, 28, 6, 8);
  });
  for (const key of ['bg6mid3', 'bg6mid4']) put(key, 160, 96, (g, w, h) => {
    g.fillStyle = '#2a241c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#4a3830'; for (let x = 4; x < w; x += 32) g.fillRect(x, 0, 10, h);
    g.fillStyle = '#e8c878'; g.fillRect(40, 30, 6, 8); g.fillRect(110, 28, 6, 8);
  });
  const floor = (key, wet) => put(key, 64, 32, (g, w, h) => {
    g.fillStyle = wet ? '#3a4038' : '#5a4038'; g.fillRect(0, 0, w, h);
    g.fillStyle = wet ? '#2a3030' : '#3a2820';
    for (let y = 4; y < h; y += 8) g.fillRect(0, y, w, 2);
    if (wet) { g.fillStyle = 'rgba(180,200,220,0.25)'; g.fillRect(0, 6, w, 3); }
  });
  floor('bg6floor', true); floor('bg6floor2', false); floor('bg6floor3', false);
  sheet(scene, 's6gray', 6, 32, 48, (g, i, w, h) => { man(g, w, h, '#c8b8a4', i === 3 ? '#4a4038' : '#6a6058', null); if (i === 2 || i === 3) { g.fillStyle = '#e8eef8'; g.fillRect(w * 0.7, h * 0.4, 6, 2); } hatch(g, w, h); });
  sheet(scene, 's6fade', 6, 36, 56, (g, i, w, h) => { man(g, w, h, '#d8d0c8', '#1a1a1e', '#111'); g.fillStyle = '#cc3344'; g.fillRect(w * 0.3, h * 0.42, w * 0.4, 4); hatch(g, w, h); });
  sheet(scene, 's6belal', 8, 40, 64, (g, i, w, h) => {
    man(g, w, h, '#e0c8b0', '#1c1418', null);
    g.fillStyle = '#14080c'; g.fillRect(w * 0.2, h * 0.22, w * 0.6, h * 0.12);
    g.fillStyle = i === 5 ? '#7cff9a' : '#2a080c'; g.fillRect(w * 0.72, h * 0.3, 3, h * 0.4);
    hatch(g, w, h);
  });
  sheet(scene, 's6rand', 6, 32, 48, (g, i, w, h) => {
    man(g, w, h, '#f0d0b0', '#7a1c22', null);
    g.fillStyle = '#d8a040'; g.fillRect(w * 0.28, h * 0.34, w * 0.44, 2);
    if (i >= 2) { g.fillStyle = '#3ecf6e'; g.fillRect(w * 0.62, h * 0.36, 5, 6); }
    hatch(g, w, h);
  });
  put('randPortrait', 32, 32, (g, w, h) => { g.fillStyle = '#3a1014'; g.fillRect(0, 0, w, h); man(g, w, h * 1.4, '#f0d0b0', '#7a1c22', null); });
  put('belalPortrait', 32, 32, (g, w, h) => { g.fillStyle = '#14080c'; g.fillRect(0, 0, w, h); man(g, w, h * 1.4, '#e0c8b0', '#1c1418', null); });
  sheet(scene, 's6storm', 3, 64, 32, (g, i, w, h) => {
    g.fillStyle = i === 2 ? '#d0e4ff' : '#2a3348'; g.fillRect(0, 0, w, h * 0.45);
    g.fillStyle = '#9ec0ff'; g.fillRect(w * 0.4, h * 0.3, 3, h * 0.7); hatch(g, w, h);
  });
  put('s6net', 48, 24, (g, w, h) => { g.strokeStyle = '#6a5030'; g.lineWidth = 1; for (let x = 0; x < w; x += 6) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
  sheet(scene, 's6lamp', 3, 24, 28, (g, i, w, h) => { g.fillStyle = '#c8a050'; g.fillRect(w * 0.4, 0, 4, h * 0.35); g.fillStyle = '#f0d080'; g.beginPath(); g.arc(w * 0.5 + (i - 1) * 3, h * 0.62, 7, 0, 6.3); g.fill(); });
  sheet(scene, 's6oil', 2, 32, 32, (g, i, w, h) => { g.fillStyle = i ? '#ff7a20' : '#5a2808'; g.beginPath(); g.ellipse(w / 2, h / 2, 14, 8, 0, 0, 6.3); g.fill(); });
  sheet(scene, 's6hatch', 2, 32, 28, (g, i, w, h) => { g.fillStyle = '#4a3828'; g.fillRect(2, 8, w - 4, h - 10); g.fillStyle = '#2a2018'; g.fillRect(i ? 8 : 4, 4, 10, 8); });
  sheet(scene, 's6call', 2, 32, 48, (g, i, w, h) => { g.fillStyle = i ? '#f4f8ff' : '#d8ecff'; g.fillRect(w * 0.42, 4, 5, h - 8); g.fillStyle = '#9fd0ff'; g.fillRect(w * 0.3, 8, w * 0.4, 6); });
  put('s6ray', 16, 64, (g, w, h) => { const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, 'rgba(220,236,255,0.85)'); grd.addColorStop(1, 'rgba(220,236,255,0)'); g.fillStyle = grd; g.fillRect(4, 0, 8, h); });
  put('s6ribbon', 16, 16, (g, w, h) => { g.fillStyle = '#e85a8a'; g.fillRect(2, 4, w - 4, 3); g.fillStyle = '#f7c2d4'; g.fillRect(2, 9, w - 6, 3); });
  // Fallback for the shared painted crate (src/stage6-paint.js CRATE6) when its file failed: drawn at addBarrel's 0.19.
  put('crate', 120, 120, (g, w, h) => { g.fillStyle = '#6a4a28'; g.fillRect(4, 4, w - 8, h - 8); g.strokeStyle = '#3a2814'; g.lineWidth = 8; g.strokeRect(14, 14, w - 28, h - 28); g.beginPath(); g.moveTo(14, 14); g.lineTo(w - 14, h - 14); g.stroke(); });
  sheet(scene, 's6planks', 2, 16, 8, (g, i, w, h) => { g.fillStyle = i ? '#8a6230' : '#5a3e1c'; g.fillRect(0, 1, w, h - 2); });
  put('s6streak', 32, 8, (g, w, h) => { g.fillStyle = '#1a080c'; g.fillRect(0, 2, w, 4); g.fillStyle = '#ff6040'; g.fillRect(4, 3, w - 8, 2); });
  sheet(scene, 's6def', 3, 32, 40, (g, i, w, h) => { man(g, w, h, '#e8d0b8', i === 1 ? '#8a1c1c' : '#6a1418', '#c8c0a8'); });
  const story = (key, sky, stone) => put(key, 80, 45, (g, w, h) => { g.fillStyle = sky; g.fillRect(0, 0, w, h); g.fillStyle = stone; g.fillRect(w * 0.35, h * 0.2, w * 0.3, h * 0.7); });
  story('story6p1', '#101828', '#3a4048'); story('story6p2', '#1a140c', '#5a3828'); story('story6p3', '#140c10', '#7a1c22');
  return made;
}

export function freeStory6(scene) {
  const rm = scene.textures?.remove;
  if (!rm) return;
  for (const k of ['story6p1', 'story6p2', 'story6p3']) if (scene.textures.exists(k)) rm.call(scene.textures, k);
}

export function canvasRgba() {
  return STAGE6_CANVASES.reduce((n, [, w, h]) => n + w * h * 4, 0);
}
