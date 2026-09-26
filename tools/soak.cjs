// Engine soak harness: boots every <script src="js/..."> from index.html inside a
// Node vm with a stub DOM/canvas (or @napi-rs/canvas when installed), seeds
// Math.random, and drives a steady button-masher bot through each stage.
// Usage: node tools/soak.cjs [repoRoot] [seed]
// Contract the content must meet for the bot to run (fresh rebuild implements it):
//   new RWB.scenes.Play(RWB.game, levelIndex, carry) with .enter(), .update(dt, input),
//   .player { x, y, hp, power, powerMax, state }, .enemies [{ x, y, dead }],
//   .phase ('play' | 'clear' | 'bossdead'), .kills; RWB.LEVELS array.
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
let createCanvas;
try { ({ createCanvas } = require('@napi-rs/canvas')); }
catch (_) {
  const gradient = { addColorStop() {} };
  const context = new Proxy({ measureText: s => ({ width: String(s).length * 8 }), createLinearGradient: () => gradient, createRadialGradient: () => gradient, createPattern: () => null, getImageData: () => ({ data: new Uint8ClampedArray(4) }), setLineDash() {} },
    { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => ((o[k] = v), true) });
  createCanvas = (w, h) => ({ width: w, height: h, style: {}, classList: { toggle() {} }, getContext: () => context, addEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: w, height: h }) });
}

function boot(root) {
  const canvas = createCanvas(640, 360); canvas.style = {}; canvas.classList = { toggle() {} }; canvas.addEventListener = () => {};
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1280, height: 720 });
  const m = new Map();
  const ctx = {
    console, Math, Promise, performance: { now: () => 0 }, setTimeout: f => { f(); return 0; }, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
    matchMedia: q => ({ matches: q.includes('fine'), addEventListener() {}, removeEventListener() {} }), addEventListener() {}, navigator: { maxTouchPoints: 0, getGamepads: () => [] },
    localStorage: { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k) }, location: { hash: '' }, requestAnimationFrame() {},
    fetch: () => Promise.resolve({ ok: false }),
    document: { getElementById: () => canvas, createElement: () => createCanvas(1, 1), addEventListener() {}, fonts: { load: () => Promise.resolve() } },
    Image: class { set src(s) { this.onerror && this.onerror(); } }
  };
  ctx.window = ctx; vm.createContext(ctx);
  const files = [...fs.readFileSync(root + '/index.html', 'utf8').matchAll(/<script src="js\/([\w-]+)\.js/g)].map(x => x[1]);
  for (const f of files) vm.runInContext(fs.readFileSync(root + '/js/' + f + '.js', 'utf8'), ctx, { filename: f + '.js' });
  return ctx.RWB;
}

function soak(RWB, seedVal) {
  let seed = seedVal; Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const results = [];
  for (let lvl = 0; lvl < RWB.LEVELS.length; lvl++) {
    const s = new RWB.scenes.Play(RWB.game, lvl, { score: 0, lives: 99 }); s.enter && s.enter(); RWB.game.scene = s;
    let dmg = 0, hits = 0, t = 0, frame = 0; const p = s.player; let lastHp = p.hp;
    const inp = { pressed: {}, held: {}, axis: () => {
      const e = s.enemies.filter(e => !e.dead).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
      if (!e) return { x: 1, y: 0 };
      const dx = e.x - p.x, dy = e.y - p.y;
      return { x: Math.abs(dx) > 40 ? Math.sign(dx) : 0, y: Math.abs(dy) > 6 ? Math.sign(dy) * 0.8 : 0 };
    } };
    for (; t < 300 && s.phase !== 'clear' && s.phase !== 'bossdead'; frame++) {
      const dt = 1 / 60; t += dt; inp.pressed = {};
      if (frame % 9 === 0) inp.pressed.attack = true;
      if (p.power >= p.powerMax && frame % 60 === 0) inp.pressed.power = true;
      s.update(dt, inp);
      if (p.hp < lastHp) { dmg += lastHp - p.hp; hits++; }
      if (p.state === 'idle' && p.hp < 40) p.hp = p.hpMax || 100;
      lastHp = p.hp;
    }
    results.push({ stage: lvl + 1, seconds: +t.toFixed(0), cleared: s.phase, kills: s.kills, dmgTaken: dmg, timesHit: hits });
  }
  return results;
}

if (require.main === module) {
  const root = process.argv[2] || path.resolve(__dirname, '..');
  const RWB = boot(root);
  if (!RWB.scenes || !RWB.scenes.Play || !RWB.LEVELS) {
    console.log('soak: engine booted OK; no RWB.scenes.Play / RWB.LEVELS yet (content not built). Nothing to soak.');
    process.exit(0);
  }
  console.log(JSON.stringify(soak(RWB, +(process.argv[3] || 12345))));
}
module.exports = { boot, soak };
