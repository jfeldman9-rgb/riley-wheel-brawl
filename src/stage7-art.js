// Code-drawn Rhuidean stand-ins. Small cells. No text.
import { tex, sheet } from './stage4-art.js';
import { q } from './config.js';

const DUSK = '#d9822b', SAND = '#c8a26b', GLASS = '#8fe3ff', FOG = '#6f8fb0', CADIN = '#8a7a5e', VEIL = '#a33a2a';

function hatch(g, w, h) {
  if (q.get('debug') !== '1') return;
  g.fillStyle = 'rgba(255,255,255,0.35)';
  for (let x = -h; x < w; x += 8) g.fillRect(x, 0, 2, h);
}
function man(g, w, h, coat, skin) {
  g.fillStyle = coat; g.fillRect(w * 0.3, h * 0.28, w * 0.4, h * 0.48);
  g.fillStyle = skin; g.beginPath(); g.arc(w * 0.5, h * 0.18, w * 0.14, 0, 6.3); g.fill();
  g.fillStyle = '#2a2018'; g.fillRect(w * 0.38, h * 0.76, w * 0.08, h * 0.2); g.fillRect(w * 0.54, h * 0.76, w * 0.08, h * 0.2);
}

export function paintStage7Art(scene, skip) {
  if (!scene?.textures || typeof document === 'undefined') return [];
  const made = [];
  const put = (key, w, h, draw) => {
    if (skip?.has?.(key) || scene.textures.exists(key)) return;
    if (q.get('story') === '0' && String(key).startsWith('story7')) return;
    tex(scene, key, w, h, (g, W, H) => { draw(g, W, H); hatch(g, W, H); });
    made.push(key);
  };
  put('bg7far', 160, 90, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#3a2418'); sky.addColorStop(0.5, DUSK); sky.addColorStop(1, SAND);
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#6a4a32'; g.fillRect(0, h * 0.62, w, h * 0.38);
  });
  const mid = (key, top) => put(key, 80, 48, (g, w, h) => {
    g.fillStyle = top; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5a4632'; for (let x = 4; x < w; x += 18) g.fillRect(x, h * 0.2, 6, h);
    g.fillStyle = GLASS; g.fillRect(w * 0.4, h * 0.15, 3, h * 0.5);
  });
  mid('bg7mid', '#8a5a32'); mid('bg7mid2', '#a07040'); mid('bg7mid3', '#3a4a58'); mid('bg7mid4', '#1c2838');
  const floor = (key, col) => put(key, 32, 16, (g, w, h) => { g.fillStyle = col; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 2; y < h; y += 5) g.fillRect(0, y, w, 1); });
  floor('bg7floor', SAND); floor('bg7floor2', '#b09060'); floor('bg7floor3', '#2a3848');
  sheet(scene, 's7dancer', 6, 24, 40, (g, i, w, h) => { man(g, w, h, CADIN, '#e0c8a8'); g.fillStyle = VEIL; g.fillRect(w * 0.32, h * 0.16, w * 0.36, 4); if (i === 3) { g.fillStyle = '#eee'; g.fillRect(w * 0.7, h * 0.4, 6, 2); } hatch(g, w, h); });
  sheet(scene, 's7veiled', 5, 24, 40, (g, i, w, h) => { man(g, w, h, CADIN, '#d8c0a0'); g.fillStyle = VEIL; g.fillRect(w * 0.3, h * 0.14, w * 0.4, 6); if (i === 2) { g.strokeStyle = '#ddd'; g.strokeRect(w * 0.62, h * 0.32, 8, 3); } hatch(g, w, h); });
  sheet(scene, 's7asmo', 5, 28, 48, (g, i, w, h) => { man(g, w, h, '#6a2030', '#f0d8c0'); g.fillStyle = i === 3 ? GLASS : '#c0a060'; g.fillRect(w * 0.15, h * 0.42, w * 0.3, 3); hatch(g, w, h); });
  sheet(scene, 's7moir', 4, 24, 44, (g, i, w, h) => { man(g, w, h, '#1a3058', '#f0d8c8'); g.fillStyle = '#4aa0ff'; g.beginPath(); g.arc(w * 0.5, h * 0.1, 3, 0, 6.3); g.fill(); hatch(g, w, h); });
  sheet(scene, 's7lan', 4, 24, 44, (g, i, w, h) => { man(g, w, h, '#2a2e28', '#d8c8b0'); g.fillStyle = '#c8c8c0'; g.fillRect(w * 0.62, h * 0.3, 2, h * 0.4); hatch(g, w, h); });
  put('s7earth', 48, 16, (g, w, h) => { g.fillStyle = '#6a5030'; g.fillRect(0, h * 0.4, w, h * 0.5); g.fillStyle = '#e07030'; g.fillRect(8, 2, 10, h * 0.6); });
  put('s7shield', 32, 32, (g, w, h) => { g.strokeStyle = '#4aa0ff'; g.lineWidth = 3; g.beginPath(); g.arc(w / 2, h / 2, 12, 0, 6.3); g.stroke(); });
  put('s7column', 16, 48, (g, w, h) => { g.fillStyle = GLASS; g.globalAlpha = 0.85; g.fillRect(w * 0.35, 0, w * 0.3, h); });
  put('s7veil', 16, 48, (g, w, h) => { g.fillStyle = FOG; g.globalAlpha = 0.55; g.fillRect(0, 0, w, h); });
  put('s7portal', 24, 36, (g, w, h) => { g.fillStyle = '#4a4038'; g.fillRect(w * 0.35, 4, w * 0.3, h - 4); g.fillStyle = DUSK; g.fillRect(w * 0.42, 10, w * 0.16, h * 0.4); });
  put('s7dust', 32, 32, (g, w, h) => { g.fillStyle = SAND; g.globalAlpha = 0.8; g.fillRect(0, 0, w, h); });
  put('s7crate', 32, 32, (g, w, h) => { g.fillStyle = CADIN; g.fillRect(2, 2, w - 4, h - 4); g.strokeStyle = '#5a4a30'; g.strokeRect(6, 6, w - 12, h - 12); });
  sheet(scene, 's7planks', 2, 16, 8, (g, i, w, h) => { g.fillStyle = i ? '#a09070' : '#6a5a40'; g.fillRect(0, 1, w, h - 2); });
  put('asmoPortrait', 32, 32, (g, w, h) => { g.fillStyle = '#301018'; g.fillRect(0, 0, w, h); man(g, w, h * 1.3, '#6a2030', '#f0d8c0'); });
  put('s7moiPort', 32, 32, (g, w, h) => { g.fillStyle = '#101828'; g.fillRect(0, 0, w, h); man(g, w, h * 1.3, '#1a3058', '#f0d8c8'); });
  put('s7lanPort', 32, 32, (g, w, h) => { g.fillStyle = '#161816'; g.fillRect(0, 0, w, h); man(g, w, h * 1.3, '#2a2e28', '#d8c8b0'); });
  const story = (key, sky) => put(key, 64, 36, (g, w, h) => { g.fillStyle = sky; g.fillRect(0, 0, w, h); g.fillStyle = '#5a4636'; g.fillRect(8, h * 0.45, w - 16, h * 0.4); g.fillStyle = DUSK; g.fillRect(w * 0.45, h * 0.2, 6, h * 0.35); });
  story('story7p1', '#3a2418'); story('story7p2', '#6a5038'); story('story7p3', '#243040');
  if (!scene.textures.exists('s6fade')) sheet(scene, 's6fade', 4, 24, 40, (g, i, w, h) => { man(g, w, h, '#141418', '#ddd'); hatch(g, w, h); });
  if (!scene.textures.exists('s6streak')) put('s6streak', 32, 8, (g, w, h) => { g.fillStyle = '#f4f4f4'; g.fillRect(0, 2, w, 4); });
  return made;
}

export function freeStory7(scene) {
  scene.kit && (scene.kit.storyFreed = true);
  const rm = scene.textures?.remove;
  if (!rm) return;
  for (const k of ['story7p1', 'story7p2', 'story7p3']) if (scene.textures.exists(k)) rm.call(scene.textures, k);
}

export function paintKey(scene, key) {
  if (!key || scene.textures?.exists?.(key)) return false;
  paintStage7Art(scene, new Set([...scene.textures ? [] : []]));
  return !!scene.textures?.exists?.(key);
}
