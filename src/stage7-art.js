// Code-drawn Rhuidean stand-ins. Small cells, scaled up in the view. No text.
import { tex, sheet } from './stage4-art.js';
import { q } from './config.js';
import { queryFlag } from './debug-flag.js';

export const STAGE7_CANVASES = Object.freeze([
  ['bg7far', 320, 180], ['bg7mid', 160, 96], ['bg7mid2', 160, 96],
  ['bg7mid3', 160, 96], ['bg7mid4', 160, 96],
  ['bg7floor', 64, 32], ['bg7floor2', 64, 32], ['bg7floor3', 64, 32],
  ['s7dancer', 256, 48], ['s7veiled', 224, 48], ['s6fade', 216, 56], ['s7asmo', 320, 64],
  ['s7moir', 96, 48], ['s7lan', 128, 48],
  ['moiPortrait', 32, 32], ['lanPortrait', 32, 32], ['asmoPortrait', 32, 32],
  ['s7note', 96, 16], ['s7column', 96, 112], ['s7shard', 128, 16], ['s7earth', 96, 16],
  ['s7shield', 128, 64], ['s6streak', 32, 8], ['s7dust', 128, 64], ['s7ring', 144, 36],
  ['s7portal', 128, 64], ['s7crate', 32, 32], ['s7planks', 64, 16],
  ['story7p1', 80, 45], ['story7p2', 80, 45], ['story7p3', 80, 45],
]);

function hatch(g, w, h) {
  if (!queryFlag(q, 'debug')) return;
  g.fillStyle = 'rgba(255,255,255,0.45)';
  for (let x = -h; x < w; x += 8) g.fillRect(x, 0, 2, h);
}

function man(g, w, h, skin, coat, band) {
  g.fillStyle = coat; g.fillRect(w * 0.32, h * 0.28, w * 0.36, h * 0.5);
  g.fillStyle = skin; g.beginPath(); g.arc(w * 0.5, h * 0.18, w * 0.16, 0, 6.3); g.fill();
  g.fillStyle = '#1a120c'; g.fillRect(w * 0.38, h * 0.78, w * 0.1, h * 0.2); g.fillRect(w * 0.52, h * 0.78, w * 0.1, h * 0.2);
  if (band) { g.fillStyle = band; g.fillRect(w * 0.3, h * 0.3, w * 0.4, 3); }
}

export function paintStage7Art(scene, skip) {
  if (!scene?.textures || typeof document === 'undefined') return [];
  const made = [];
  const put = (key, w, h, draw) => {
    if (skip?.has?.(key)) return;
    if (q.get('story') === '0' && String(key).startsWith('story7')) return;
    if (scene.textures.exists(key)) return;
    tex(scene, key, w, h, (g, W, H) => { draw(g, W, H); hatch(g, W, H); });
    made.push(key);
  };
  put('bg7far', 320, 180, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#2a1c30'); sky.addColorStop(0.55, '#d9822b'); sky.addColorStop(1, '#c8a26b');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#6a4a30'; g.fillRect(0, 118, 90, 32); g.fillRect(200, 108, 120, 42);
    g.fillStyle = '#4a3220'; g.fillRect(0, 150, w, 30);
  });
  put('bg7mid', 160, 96, (g, w, h) => {
    g.fillStyle = '#5a4230'; g.fillRect(0, 24, w, h);
    g.fillStyle = '#8a6a48'; g.fillRect(18, 8, 18, h - 8);
    g.fillStyle = '#8fe3ff'; g.fillRect(24, 18, 6, 26);
  });
  put('bg7mid2', 160, 96, (g, w, h) => {
    g.fillStyle = '#4a3828'; g.fillRect(0, 18, w, h);
    g.fillStyle = '#2a2018'; g.fillRect(10, 30, 40, 30); g.fillRect(96, 26, 46, 34);
    g.fillStyle = '#c8a26b'; g.fillRect(0, h - 10, w, 10);
  });
  put('bg7mid3', 160, 96, (g, w, h) => {
    g.fillStyle = '#3a4250'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#6f8fb0'; g.fillRect(0, 0, 26, h);
    g.fillStyle = '#5a6678'; for (let x = 36; x < w; x += 34) g.fillRect(x, 6, 12, h - 6);
    g.fillStyle = '#8fe3ff'; g.fillRect(70, 30, 5, 7);
  });
  put('bg7mid4', 160, 96, (g, w, h) => {
    g.fillStyle = '#141c2c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a5a6a'; for (let x = 10; x < w; x += 30) g.fillRect(x, 4, 8, h - 4);
    g.fillStyle = '#8fe3ff'; for (let x = 12; x < w; x += 30) g.fillRect(x, 4, 3, h - 4);
    g.fillStyle = '#3a6a34'; g.beginPath(); g.arc(120, 26, 16, 0, 6.3); g.fill();
  });
  const floor = (key, base, line) => put(key, 64, 32, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.fillStyle = line;
    for (let y = 4; y < h; y += 8) g.fillRect(0, y, w, 2);
  });
  floor('bg7floor', '#9a7a4e', '#6a5230'); floor('bg7floor2', '#6a7282', '#3f4756'); floor('bg7floor3', '#3a4a5e', '#8fe3ff');
  sheet(scene, 's7dancer', 8, 32, 48, (g, i, w, h) => {
    man(g, w, h, '#c89870', '#8a7a5e', '#a33a2a');
    g.fillStyle = '#e8eef8'; g.fillRect(w * 0.68, i === 2 ? h * 0.2 : h * 0.36, 7, 2);
    if (i === 6 || i === 7) { g.fillStyle = '#f0ead8'; g.fillRect(w * 0.3, h * 0.5, w * 0.4, h * 0.36); }
    hatch(g, w, h);
  });
  if (!skip?.has?.('s7dancer') && scene.textures.exists('s7dancer')) made.push('s7dancer');
  sheet(scene, 's7veiled', 7, 32, 48, (g, i, w, h) => {
    man(g, w, h, '#c89870', '#7a6a4e', '#a33a2a');
    g.strokeStyle = '#4a3820'; g.lineWidth = 2; g.beginPath(); g.arc(w * 0.66, h * 0.46, 9, -1.2, 1.2); g.stroke();
    if (i === 6) { g.fillStyle = '#f0ead8'; g.fillRect(w * 0.3, h * 0.5, w * 0.4, h * 0.36); }
    hatch(g, w, h);
  });
  if (!skip?.has?.('s7veiled') && scene.textures.exists('s7veiled')) made.push('s7veiled');
  sheet(scene, 's6fade', 6, 36, 56, (g, i, w, h) => { man(g, w, h, '#d8d0c8', '#1a1a1e', null); g.fillStyle = '#cc3344'; g.fillRect(w * 0.3, h * 0.42, w * 0.4, 4); hatch(g, w, h); });
  if (!skip?.has?.('s6fade') && scene.textures.exists('s6fade')) made.push('s6fade');
  sheet(scene, 's7asmo', 8, 40, 64, (g, i, w, h) => {
    man(g, w, h, '#e8cba8', '#3a2c4a', null);
    g.fillStyle = '#c8a050'; g.fillRect(w * 0.6, h * 0.34, 8, h * 0.34);
    g.fillStyle = i === 5 ? '#8fe3ff' : '#5a4a20'; g.fillRect(w * 0.62, h * 0.3, 5, 5);
    hatch(g, w, h);
  });
  if (!skip?.has?.('s7asmo') && scene.textures.exists('s7asmo')) made.push('s7asmo');
  sheet(scene, 's7moir', 3, 32, 48, (g, i, w, h) => {
    man(g, w, h, '#e8d0b8', '#24407a', null);
    g.fillStyle = '#7db2ff'; g.fillRect(w * 0.44, h * 0.1, 4, 4);
    if (i >= 1) { g.fillStyle = '#9fd0ff'; g.fillRect(w * 0.62, h * 0.3, 6, 5); }
    hatch(g, w, h);
  });
  if (!skip?.has?.('s7moir') && scene.textures.exists('s7moir')) made.push('s7moir');
  sheet(scene, 's7lan', 4, 32, 48, (g, i, w, h) => {
    man(g, w, h, '#d8b898', '#4a4a3c', '#3a2c18');
    g.fillStyle = '#dfe8f2'; g.fillRect(w * 0.66, h * 0.36, 8, 2);
    hatch(g, w, h);
  });
  if (!skip?.has?.('s7lan') && scene.textures.exists('s7lan')) made.push('s7lan');
  put('moiPortrait', 32, 32, (g, w, h) => { g.fillStyle = '#16264a'; g.fillRect(0, 0, w, h); man(g, w, h * 1.4, '#e8d0b8', '#24407a', null); });
  put('lanPortrait', 32, 32, (g, w, h) => { g.fillStyle = '#2c2c22'; g.fillRect(0, 0, w, h); man(g, w, h * 1.4, '#d8b898', '#4a4a3c', '#3a2c18'); });
  put('asmoPortrait', 32, 32, (g, w, h) => { g.fillStyle = '#241a30'; g.fillRect(0, 0, w, h); man(g, w, h * 1.4, '#e8cba8', '#3a2c4a', null); });
  sheet(scene, 's7note', 6, 16, 16, (g, i, w, h) => {
    g.fillStyle = i >= 4 ? '#ffffff' : i >= 2 ? '#f2c94c' : '#8fe3ff';
    g.beginPath(); g.arc(w * 0.4, h * 0.7, 4, 0, 6.3); g.fill();
    g.fillRect(w * 0.55, h * 0.15, 2, h * 0.55); g.fillRect(w * 0.55, h * 0.15, 5, 3);
    hatch(g, w, h);
  });
  sheet(scene, 's7column', 3, 32, 112, (g, i, w, h) => {
    g.fillStyle = ['rgba(90,160,190,0.35)', 'rgba(143,227,255,0.7)', 'rgba(255,255,255,0.9)'][i];
    g.fillRect(8, 2, 16, h - 4);
    hatch(g, w, h);
  });
  sheet(scene, 's7shard', 4, 32, 16, (g, i, w, h) => {
    g.fillStyle = '#bfeaff'; g.beginPath(); g.moveTo(4, h - 2); g.lineTo(w * 0.5, 2); g.lineTo(w - 4, h - 2); g.closePath(); g.fill();
    hatch(g, w, h);
  });
  put('s7earth', 96, 16, (g, w, h) => {
    g.fillStyle = '#6a4a28'; g.fillRect(0, 8, w, 8);
    g.fillStyle = '#ff8a30'; g.fillRect(0, 4, w, 5);
  });
  sheet(scene, 's7shield', 2, 64, 64, (g, i, w, h) => {
    g.strokeStyle = i ? '#bfe0ff' : '#5a9fe8'; g.lineWidth = 3;
    g.beginPath(); g.arc(w / 2, h / 2, 26, 0, 6.3); g.stroke();
    hatch(g, w, h);
  });
  put('s6streak', 32, 8, (g, w, h) => { g.fillStyle = '#1a080c'; g.fillRect(0, 2, w, 4); g.fillStyle = '#ff6040'; g.fillRect(4, 3, w - 8, 2); });
  put('s7dust', 128, 64, (g, w, h) => {
    g.fillStyle = 'rgba(200,162,107,0.5)'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(154,122,78,0.5)';
    for (let y = 6; y < h; y += 12) g.fillRect(0, y, w, 3);
  });
  sheet(scene, 's7ring', 2, 72, 36, (g, i, w, h) => {
    g.strokeStyle = i ? '#ffffff' : '#8fe3ff'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(w / 2, h / 2, 32, 12, 0, 0, 6.3); g.stroke();
    hatch(g, w, h);
  });
  sheet(scene, 's7portal', 2, 64, 64, (g, i, w, h) => {
    g.fillStyle = '#6a6a72'; g.fillRect(w * 0.32, 8, w * 0.36, h - 10);
    g.fillStyle = i ? '#ffe9a8' : '#8fe3ff'; g.fillRect(w * 0.44, 14, 7, 22);
    hatch(g, w, h);
  });
  put('s7crate', 32, 32, (g, w, h) => {
    g.fillStyle = '#a8874e'; g.fillRect(3, 8, w - 6, h - 11);
    g.strokeStyle = '#5a4420'; g.lineWidth = 2; g.strokeRect(5, 10, w - 10, h - 15);
    g.beginPath(); g.moveTo(5, 10); g.lineTo(w - 5, h - 5); g.stroke();
  });
  sheet(scene, 's7planks', 2, 32, 16, (g, i, w, h) => { g.fillStyle = i ? '#b89a5e' : '#7a6230'; g.fillRect(0, 3, w, h - 6); });
  const story = (key, sky, land) => put(key, 80, 45, (g, w, h) => { g.fillStyle = sky; g.fillRect(0, 0, w, h); g.fillStyle = land; g.fillRect(0, h * 0.62, w, h * 0.38); });
  story('story7p1', '#d9822b', '#6a4a30'); story('story7p2', '#c8a26b', '#8a6a48'); story('story7p3', '#6f8fb0', '#3a4a5e');
  return made;
}

export function freeStory7(scene) {
  const rm = scene.textures?.remove;
  if (!rm) return;
  for (const k of ['story7p1', 'story7p2', 'story7p3']) if (scene.textures.exists(k)) rm.call(scene.textures, k);
}

export function canvasRgba() {
  return STAGE7_CANVASES.reduce((n, [, w, h]) => n + w * h * 4, 0);
}
