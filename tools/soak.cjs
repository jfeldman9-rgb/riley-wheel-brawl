'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');
let createCanvas;
try {
  ({ createCanvas } = require('@napi-rs/canvas'));
} catch (_) {
  const gradient = { addColorStop() {} };
  const context = new Proxy({ measureText: value => ({ width: String(value).length * 8 }), createLinearGradient: () => gradient, createRadialGradient: () => gradient, createPattern: () => null, getImageData: () => ({ data: new Uint8ClampedArray(4) }), setLineDash() {} }, { get: (object, key) => key in object ? object[key] : () => {}, set: (object, key, value) => ((object[key] = value), true) });
  createCanvas = (width, height) => ({ width, height, style: {}, classList: { toggle() {} }, getContext: () => context, addEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width, height }) });
}
function boot(root) {
  const canvas = createCanvas(640, 360);
  canvas.style = {};
  canvas.classList = { toggle() {} };
  canvas.addEventListener = () => {};
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1280, height: 720 });
  const memory = new Map();
  const sandbox = {
    console,
    Math: Object.create(Math),
    Promise,
    performance: { now: () => 0 },
    setTimeout: callback => { callback(); return 0; },
    clearTimeout() {},
    setInterval: () => 0,
    clearInterval() {},
    innerWidth: 1280,
    innerHeight: 720,
    devicePixelRatio: 1,
    matchMedia: query => ({ matches: query.includes('fine'), addEventListener() {}, removeEventListener() {} }),
    addEventListener() {},
    navigator: { maxTouchPoints: 0, getGamepads: () => [] },
    localStorage: { getItem: key => memory.has(key) ? memory.get(key) : null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) },
    location: { hash: '' },
    requestAnimationFrame() {},
    fetch: () => Promise.resolve({ ok: false }),
    document: { getElementById: () => canvas, createElement: () => createCanvas(1, 1), addEventListener() {}, fonts: { load: () => Promise.resolve() } },
    Image: class { set src(value) { sandbox.__assetRequests += 1; if (this.onerror) this.onerror(); } }
  };
  sandbox.__assetRequests = 0;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  const scripts = [...fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="js\/([\w-]+)\.js/g)].map(match => match[1]);
  for (const script of scripts) vm.runInContext(fs.readFileSync(path.join(root, 'js', script + '.js'), 'utf8'), sandbox, { filename: script + '.js' });
  sandbox.RWB.__assetRequests = () => sandbox.__assetRequests;
  sandbox.RWB.__setRandom = value => { sandbox.Math.random = value; };
  return sandbox.RWB;
}
function seeded(RWB, seedValue) {
  let seed = seedValue;
  RWB.util.rand = (min, max) => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return min + (seed / 4294967296) * (max - min);
  };
  RWB.__random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function soak(RWB, seedValue) {
  seeded(RWB, seedValue);
  const oldRandom = RWB.__random;
  RWB.__setRandom(oldRandom);
  const scene = new RWB.scenes.Play(RWB.game, 0, { lives: 99 });
  scene.enter();
  RWB.game.scene = scene;
  const player = scene.player;
  let seconds = 0;
  let frame = 0;
  let lastHp = player.hp;
  let measuredDamage = 0;
  let measuredHits = 0;
  const input = { pressed: {}, held: {}, axis() {
    const enemy = scene.enemies.filter(item => !item.dead).sort((a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x))[0];
    if (!enemy) return { x: 0, y: 0 };
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    return { x: Math.abs(dx) > 39 ? Math.sign(dx) : 0, y: Math.abs(dy) > 8 ? Math.sign(dy) * 0.75 : 0 };
  } };
  const nativeRandom = Math.random;
  Math.random = oldRandom;
  while (seconds < 240 && scene.phase !== 'clear') {
    seconds += 1 / 60;
    frame += 1;
    input.pressed = {};
    input.held = {};
    if (frame % 10 === 0) input.pressed.attack = true;
    if (frame % 173 === 0) input.pressed.jump = true;
    if (frame % 173 === 1) input.pressed.attack = true;
    if (frame % 211 === 0) {
      input.pressed.attack = true;
      input.held.down = true;
    }
    if (frame % 89 === 0) input.pressed.special = true;
    if (frame % 401 === 0) input.pressed.assist = true;
    if (player.power >= player.powerMax && frame % 31 === 0) input.pressed.power = true;
    scene.update(1 / 60, input);
    if (player.hp < lastHp) {
      measuredDamage += lastHp - player.hp;
      measuredHits += 1;
    }
    if (player.hp < 28 && scene.phase === 'play') player.hp = player.hpMax;
    lastHp = player.hp;
  }
  Math.random = nativeRandom;
  return {
    cleared: scene.phase === 'clear',
    seconds: Number(seconds.toFixed(1)),
    damage: measuredDamage,
    hits: measuredHits,
    deaths: scene.deaths,
    pickups: scene.pickupsTaken,
    moves: [...scene.movesUsed].sort(),
    attacks: scene.boss ? [...scene.boss.usedAttacks].sort() : []
  };
}
if (require.main === module) {
  const root = process.argv[2] || path.resolve(__dirname, '..');
  const RWB = boot(root);
  const rows = [];
  for (let seed = 1; seed <= 10; seed += 1) rows.push({ seed, result: soak(RWB, seed) });
  console.log('SEED | CLEARED | SECONDS | DAMAGE | HITS | DEATHS | PICKUPS | MOVES');
  for (const row of rows) console.log(String(row.seed).padStart(4) + ' | ' + (row.result.cleared ? 'YES' : 'NO ').padEnd(7) + ' | ' + String(row.result.seconds).padStart(7) + ' | ' + String(row.result.damage).padStart(6) + ' | ' + String(row.result.hits).padStart(4) + ' | ' + String(row.result.deaths).padStart(6) + ' | ' + String(row.result.pickups).padStart(7) + ' | ' + row.result.moves.join(','));
  const damages = rows.map(row => row.result.damage).sort((a, b) => a - b);
  const median = (damages[4] + damages[5]) / 2;
  console.log('MEDIAN DAMAGE: ' + median);
  for (const row of rows) console.log('SEED ' + row.seed + ' CHIEFTAIN ATTACKS: ' + row.result.attacks.join(', '));
  const signatures = new Set(rows.map(row => [row.result.seconds, row.result.damage, row.result.hits, row.result.pickups].join('/')));
  const failed = rows.some(row => !row.result.cleared || row.result.damage <= 0 || row.result.attacks.length < 3) || signatures.size === 1;
  if (failed) process.exitCode = 1;
}
module.exports = { boot, soak };
