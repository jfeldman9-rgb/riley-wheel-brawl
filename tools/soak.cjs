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
    console: { ...console, info(...args) { if (!String(args[0]).startsWith('[RWB]')) console.info(...args); } },
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
    fetch: url => { const clean=String(url).split('?')[0],file=path.join(root,clean); if (!clean.endsWith('.json') || !fs.existsSync(file)) return Promise.resolve({ok:false}); return Promise.resolve({ok:true,json:()=>Promise.resolve(JSON.parse(fs.readFileSync(file,'utf8')))}); },
    document: { getElementById: () => canvas, createElement: () => createCanvas(1, 1), addEventListener() {}, fonts: { load: () => Promise.resolve() } },
    Image: class { constructor() { this.crossOrigin = ''; } set src(value) { sandbox.__assetRequests += 1; sandbox.__assetUrls.push(value); if (this.onerror) this.onerror(); } }
  };
  sandbox.__assetRequests = 0; sandbox.__assetUrls = [];
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  const scripts = [...fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="js\/([\w-]+)\.js/g)].map(match => match[1]);
  for (const script of scripts) vm.runInContext(fs.readFileSync(path.join(root, 'js', script + '.js'), 'utf8'), sandbox, { filename: script + '.js' });
  sandbox.RWB.__assetRequests = () => sandbox.__assetRequests;
  sandbox.RWB.__assetUrls = () => sandbox.__assetUrls.slice();
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
function soak(RWB, seedValue, levelIndex = 0, options = {}) {
  seeded(RWB, seedValue);
  const oldRandom = RWB.__random;
  RWB.__setRandom(oldRandom);
  const scene = new RWB.scenes.Play(RWB.game, levelIndex, { lives: options.natural ? 3 : 99, callandor: levelIndex === 4 });
  scene.enter();
  RWB.game.scene = scene;
  const player = scene.player;
  let seconds = 0;
  let frame = 0;
  let lastHp = player.hp;
  let measuredDamage = 0;
  let measuredHits = 0;
  const waveDamage = [0, 0, 0, 0, 0, 0];
  const input = { pressed: {}, held: {}, axis() {
    const enemy = scene.enemies.filter(item => !item.dead).sort((a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x))[0];
    if (!enemy) return scene.marching ? { x: 1, y: 0 } : { x: 0, y: 0 };
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    return { x: Math.abs(dx) > 39 ? Math.sign(dx) : 0, y: Math.abs(dy) > 8 ? Math.sign(dy) * 0.75 : 0 };
  } };
  const nativeRandom = Math.random;
  Math.random = oldRandom;
  while (seconds < 360 && scene.phase !== 'clear') {
    seconds += 1 / 60;
    frame += 1;
    input.pressed = {};
    input.held = {};
    if (!scene.marching && frame % 10 === 0) input.pressed.attack = true;
    if (!scene.marching && frame % 173 === 0) input.pressed.jump = true;
    if (!scene.marching && frame % 173 === 1) input.pressed.attack = true;
    if (!scene.marching && frame % 211 === 0) {
      input.pressed.attack = true;
      input.held.down = true;
    }
    if (!scene.marching && frame % 89 === 0) input.pressed.special = true;
    if (frame % 401 === 0) input.pressed.assist = true;
    if (player.power >= player.powerMax && frame % 31 === 0) input.pressed.power = true;
    scene.update(1 / 60, input);
    if (player.hp < lastHp) {
      const dealt = lastHp - player.hp;
      measuredDamage += dealt;
      measuredHits += 1;
      const wave = scene.wave | 0;
      waveDamage[wave] = (waveDamage[wave] || 0) + dealt;
    }
    if (options.natural && player.lives <= 0) break;
    if (!options.natural && player.hp < 28 && scene.phase === 'play') player.hp = player.hpMax;
    lastHp = player.hp;
  }
  Math.random = nativeRandom;
  return {
    stage: levelIndex + 1,
    cleared: scene.phase === 'clear',
    jointHit: !!(scene.joint && scene.joint.hit),
    receivedMoves: scene.boss && scene.boss.receivedMoves ? [...scene.boss.receivedMoves] : [],
    seconds: Number(seconds.toFixed(1)),
    damage: measuredDamage,
    waveDamage: waveDamage.slice(),
    hits: measuredHits,
    deaths: scene.deaths,
    pickups: scene.pickupsTaken,
    moves: [...scene.movesUsed].sort(),
    attacks: scene.boss ? [...scene.boss.usedAttacks].sort() : []
  };
}
if (require.main === module) {
  const root = process.argv.slice(2).find(arg => !arg.startsWith('--')) || path.resolve(__dirname, '..');
  const RWB = boot(root);
  const selected = process.argv.find(arg => arg.startsWith('--stage='));
  const seedArg = process.argv.find(arg => arg.startsWith('--seeds='));
  const seedCount = seedArg ? Number(seedArg.split('=')[1]) : 10;
  if (!Number.isInteger(seedCount) || seedCount < 1 || seedCount > 1000) throw new Error('Use --seeds=1 through --seeds=1000');
  const stages = selected ? [Number(selected.split('=')[1]) - 1] : [0,1,2,3,4];
  if (stages.some(stage => !RWB.LEVELS[stage])) throw new Error('Use --stage=1 through --stage=5');
  const rows = [];
  for (const stage of stages) for (let seed = 1; seed <= seedCount; seed++) rows.push({ seed, result: soak(RWB, seed, stage, { natural: process.argv.includes('--natural') }) });
  console.log('STAGE | SEED | CLEAR | SECONDS | DAMAGE | HITS | DEATHS | WAVES | ATTACKS');
  for (const {seed, result:r} of rows) console.log([r.stage,seed,r.cleared?'YES':'NO',r.seconds,r.damage,r.hits,r.deaths,(r.waveDamage||[]).map(n=>Math.round(n)).join('/'),r.attacks.join(', ')].join(' | '));
  console.log('\nSTAGE | CLEARS | TIME RANGE | MEDIAN DAMAGE | ALL ATTACKS / SEED | MEDIAN WAVE DAMAGE');
  for (const stage of stages) {
    const set = rows.filter(row=>row.result.stage === stage+1).map(row=>row.result);
    const damages = set.map(r=>r.damage).sort((a,b)=>a-b);
    const middle = values => { const n=values.length; return n%2 ? values[n>>1] : (values[n/2-1]+values[n/2])/2; };
    const waveMed = [0,1,2,3,4,5].map(w => {
      const vals = set.map(r => (r.waveDamage && r.waveDamage[w]) || 0).sort((a,b)=>a-b);
      return Math.round(middle(vals));
    }).join('/');
    console.log([stage+1, set.filter(r=>r.cleared).length+'/'+seedCount, Math.min(...set.map(r=>r.seconds))+'-'+Math.max(...set.map(r=>r.seconds)), middle(damages), set.filter(r=>RWB.LEVELS[stage].attacks.every(a=>r.attacks.includes(a))).length+'/'+seedCount, waveMed].join(' | '));
  }
  const natural=process.argv.includes('--natural');
  const bands=[[.90,1],[.72,.90],[.62,.82],[.50,.70],[.35,.60]];
  const balanceFailed=natural&&stages.some(stage=>{const set=rows.filter(row=>row.result.stage===stage+1);const rate=set.filter(row=>row.result.cleared).length/set.length;return rate<bands[stage][0]||rate>bands[stage][1];});
  const failed = natural ? balanceFailed : rows.some(({result:r}) => !r.cleared || r.damage <= 0 || !RWB.LEVELS[r.stage-1].attacks.every(a=>r.attacks.includes(a)) || (r.stage===5 && !r.jointHit) || (r.stage===3 && r.receivedMoves.some(m=>!['jump','fireball'].includes(m))));
  const identical = stages.some(stage=>new Set(rows.filter(row=>row.result.stage===stage+1).map(({result:r})=>[r.seconds,r.damage,r.hits].join('/'))).size===1);
  if (failed || identical) process.exitCode = 1;
}
module.exports = { boot, soak };
