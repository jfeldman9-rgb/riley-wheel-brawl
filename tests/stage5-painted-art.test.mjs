// Painted Blight sheets: budgets, frame numbers, per-zone residency, and the code fallback.
import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dimensions } from '../tools/audit-stage1.mjs';
import { PAINTED5, SCALE5 } from '../src/stage5-painted.js';
import { sheetKeys, bootPaintRows, queueStage5Painted, isPainted, s5Scale, syncSheets } from '../src/stage5-paint.js';
import { STAGE5, STAGE5_TEXTURES } from '../src/stage5-def.js';
import { createStage5View, gardenPlateRect, GARDEN_BLEND } from '../src/stage5-view.js';
import { residentKeys, STREAMS, plateRect } from '../src/zone-stream.js';
import { WORLD_W, LANE_TOP } from '../src/config.js';

const tool = readFileSync('tools/stage5/process_art.py', 'utf8');
const BUDGET = Object.fromEntries([...tool.match(/BUDGET_MIB = \{([\s\S]*?)\n\}/)[1].matchAll(/'([\w]+)': ([\d.]+)/g)].map(m => [m[1], +m[2]]));
const ZONE_MIB = +tool.match(/ZONE_MIB = ([\d.]+)/)[1];
const zoneBlock = tool.match(/ZONES = \{([\s\S]*?)\n\}/)[1];
const TOOL_ZONES = Object.fromEntries([...zoneBlock.matchAll(/'(z\d+)': \[([\s\S]*?)\]/g)].map(m => [m[1], [...m[2].matchAll(/'((?:bg5|s5|story5)\w+)'/g)].map(x => x[1])]));
const SHEETS = { s5tree: 3, s5thorn: 3, s5seep: 3, s5cloud: 2, s5hand: 2 };
const mib = f => { const [w, h] = dimensions(readFileSync(f)); return w * h * 4 / 1048576; };
const present = PAINTED5.filter(r => r.present);
const runtimeZone = z => {
  const plates = residentKeys({ zoneI: z, stageDef: STAGE5 }, STREAMS[5]);
  return [...new Set([...plates, ...sheetKeys(z)])].sort();
};

test('the painted manifest matches the files and every key is released with Stage 5', () => {
  for (const r of PAINTED5) {
    assert.equal(r.present, existsSync(r.url) && (!r.atlas || existsSync(r.atlas)), r.key);
    assert.ok(BUDGET[r.key] > 0, `${r.key} has a budget`);
    assert.ok(STAGE5_TEXTURES.includes(r.key), `${r.key} is released with Stage 5`);
  }
  const boot = new Set(bootPaintRows().map(r => r.key));
  for (const k of ['bg5far', 'bg5mid', 'bg5mid2', 'bg5floor', 's5stalk', 's5pod', 's5tree']) assert.ok(boot.has(k), k);
  for (const k of ['s5green', 's5garden', 'bg5mid4', 'story5p1', 'story5p2', 'story5p3']) assert.ok(!boot.has(k), `${k} stays deferred`);
});

test('each painted sheet fits its budget and each resident zone fits the art-set cap', () => {
  for (const r of present) assert.ok(mib(r.url) <= BUDGET[r.key] + 1e-9, `${r.key} ${mib(r.url).toFixed(3)} > ${BUDGET[r.key]}`);
  for (let z = 0; z < 4; z++) {
    const keys = runtimeZone(z);
    assert.deepEqual(keys, [...TOOL_ZONES['z' + z]].sort(), 'zone ' + z);
    const total = present.filter(r => keys.includes(r.key)).reduce((n, r) => n + mib(r.url), 0);
    assert.ok(total <= ZONE_MIB, `zone ${z} painted ${total.toFixed(3)} MiB > ${ZONE_MIB}`);
  }
  for (const r of present.filter(r => r.key.startsWith('story'))) assert.deepEqual(dimensions(readFileSync(r.url)), [1280, 720]);
  for (const r of present.filter(r => r.key.startsWith('bg5floor'))) assert.deepEqual(dimensions(readFileSync(r.url)), [1080, 360]);
});

test('painted atlases keep the code frame numbers, origin and the scale that restores screen height', () => {
  const want = { s5stalk: 9, s5pod: 7, s5green: 6 };
  for (const [key, n] of Object.entries(want)) {
    const r = present.find(x => x.key === key), a = JSON.parse(readFileSync(r.atlas, 'utf8'));
    assert.deepEqual(Object.keys(a.frames).sort((x, y) => x - y), [...Array(n).keys()].map(String), key);
    assert.deepEqual(a.meta.origin, [0.5, 0.96]);
    assert.equal(a.meta.drawScale, SCALE5[key][1]);
    const [w, h] = dimensions(readFileSync(r.url));
    assert.deepEqual([a.meta.size.w, a.meta.size.h], [w, h], key);
  }
  for (const [key, n] of Object.entries(SHEETS)) {
    const r = present.find(x => x.key === key), [w, h] = dimensions(readFileSync(r.url));
    assert.deepEqual([w, h], [r.frameWidth * n, r.frameHeight], key);
  }
  assert.deepEqual(dimensions(readFileSync(present.find(r => r.key === 's5spore').url)), [64, 64]);
  assert.deepEqual(dimensions(readFileSync(present.find(r => r.key === 's5tether').url)), [512, 48]);
  assert.deepEqual(dimensions(readFileSync(present.find(r => r.key === 's5ring').url)), [256, 96]);
  for (const [key, names] of [['s5deco', ['bones', 'banner', 'stones', 'lurk', 'thornbush', 'boulder', 'log', 'cauldron']], ['s5garden', ['arch', 'bloom']]]) {
    const a = JSON.parse(readFileSync(present.find(r => r.key === key).atlas, 'utf8'));
    assert.deepEqual(Object.keys(a.frames).sort(), [...names].sort(), key);
  }
});

test('ART_STATUS hashes the new sheets and leaves the boss entries on process_bosses.py', () => {
  const status = JSON.parse(readFileSync('assets/stage5/ART_STATUS.json', 'utf8'));
  for (const r of present) {
    const e = status.entries.find(x => x.key === r.key);
    assert.ok(e, r.key);
    assert.equal(e.placeholder, false);
    assert.equal(e.art.tool, 'tools/stage5/process_art.py');
    for (const f of [r.url, r.atlas].filter(Boolean)) assert.equal(e.sha256[f], createHash('sha256').update(readFileSync(f)).digest('hex'), f);
  }
  for (const key of ['s5agin', 's5balt', 'aginorPortrait']) {
    const e = status.entries.find(x => x.key === key);
    assert.equal(e.art.tool, 'tools/stage5/process_bosses.py');
    assert.equal(e.art.approvedBy, 'approved by Jason F via Grok Bot 2026-10-09 pending review');
  }
});

function fakeLoad() {
  const calls = [], handlers = {};
  return { calls, handlers,
    atlas: (k, u, a) => calls.push(['atlas', k, u, a]),
    spritesheet: (k, u, o) => calls.push(['sheet', k, u, o]),
    image: (k, u) => calls.push(['image', k, u]),
    on: (e, f) => { (handlers[e] = handlers[e] || []).push(f); },
    once: (e, f) => { handlers['once:' + e] = f; },
    off: (e) => { delete handlers[e]; },
    isLoading: () => false, start() {} };
}
test('the queue loads present rows, and a failed file is marked so the painter can fill it', () => {
  const have = new Set(['bg5far']);
  const scene = { load: fakeLoad(), textures: { exists: k => have.has(k), remove: k => have.delete(k) }, events: { once() {}, off() {} } };
  const rows = bootPaintRows();
  const wanted = queueStage5Painted(scene, rows);
  assert.ok(!wanted.has('bg5far'));
  assert.ok(wanted.has('s5stalk') && wanted.has('s5thorn'));
  assert.equal(scene.load.calls.find(c => c[1] === 's5stalk')[0], 'atlas');
  assert.deepEqual(scene.load.calls.find(c => c[1] === 's5thorn')[3], { frameWidth: 256, frameHeight: 96 });
  assert.equal(scene.load.calls.find(c => c[1] === 's5spore')[0], 'image');
  have.add('s5pod');
  scene.load.handlers.loaderror.forEach(f => f({ key: 's5pod' }));
  assert.ok(scene._s5miss.has('s5pod'));
  assert.ok(!have.has('s5pod'));
  const cold = { zoneI: 3, load: fakeLoad(), textures: { exists: k => k === 's5green', remove(k) { this._gone = k; } }, events: { once() {}, off() {} } };
  syncSheets(cold);
  assert.equal(cold.textures._gone, undefined, 'a resident sheet stays');
  assert.ok(cold.load.calls.some(c => c[1] === 's5garden'));
  assert.ok(!cold.load.calls.some(c => c[1] === 's5tree'), 'zone 3 does not queue the blight trees');
});

test('a stalker still on screen keeps its sheet when the boss zone would otherwise drop it', () => {
  const have = new Set(['s5stalk', 's5pod']);
  const stalk = { scene: {}, texture: { key: 's5stalk' } };
  const scene = {
    zoneI: 3, children: { list: [stalk] }, load: fakeLoad(),
    textures: { exists: k => have.has(k), remove: k => have.delete(k) },
    events: { once() {}, off() {} },
  };
  syncSheets(scene);
  assert.equal(have.has('s5stalk'), true);
  assert.equal(have.has('s5pod'), false);
  stalk.scene = null;
  syncSheets(scene);
  assert.equal(have.has('s5stalk'), false);
});

test('painted keys use the restored scale; a code canvas keeps the code scale', () => {
  const tex = keys => ({ exists: k => keys.has(k), get: () => ({ source: [{ isCanvas: false }] }) });
  const painted = { textures: tex(new Set(['s5stalk', 's5green'])) };
  assert.equal(isPainted(painted, 's5stalk'), true);
  assert.equal(isPainted(painted, 's5pod'), false);
  assert.equal(s5Scale(painted, 's5stalk', 1.15), SCALE5.s5stalk[1]);
  assert.equal(s5Scale(painted, 's5pod', 1.1), 1.1);
  assert.ok(Math.abs(s5Scale(painted, 's5green', 2.75) - SCALE5.s5green[1]) < 1e-9);
  assert.equal(s5Scale({}, 's5green', 2.75), 2.75);
});

function viewScene(painted) {
  const made = [];
  const make = (x, y, a, b, c) => {
    const key = typeof a === 'string' ? a : c;
    const o = { x, y, key, w: typeof a === 'number' ? a : undefined, h: typeof b === 'number' ? b : undefined,
      frame: typeof a === 'string' ? b : 0, depth: 0, sf: 1, scale: 1, alpha: 1, visible: true, destroy() {} };
    o.setOrigin = (ox, oy) => { o.origin = [ox, oy]; return o; };
    o.setDepth = d => { o.depth = d; return o; };
    o.setScale = v => { o.scale = v; return o; };
    o.setScrollFactor = v => { o.sf = v; return o; };
    o.setAlpha = v => { o.alpha = v; return o; };
    o.setFrame = f => { o.frame = f; return o; };
    o.setDisplaySize = (w, h) => { o.dw = w; o.dh = h; return o; };
    for (const k of ['setLighting', 'setVisible', 'setFlipX', 'setPosition']) o[k] = () => o;
    made.push(o); return o;
  };
  const keys = painted instanceof Set ? painted : new Set(painted);
  const s = {
    zoneI: 0, enemies: [], spores: [], clouds: [],
    textures: { exists: k => keys.has(k), get: k => ({ source: [{ isCanvas: !keys.has(k) }], getSourceImage: () => ({ width: k.startsWith('bg5floor') ? 1080 : 1024 }) }) },
    add: { image: (x, y, k) => make(x, y, k), sprite: (x, y, k, f) => make(x, y, k, f), tileSprite: (x, y, w, h, k) => make(x, y, w, h, k) },
  };
  return { s, made, keys };
}
test('painted plates are world-locked and a plate that arrives later is placed', () => {
  const boot = viewScene(['bg5mid', 'bg5mid2']);
  const view = createStage5View(boot.s);
  const keep = residentKeys({ zoneI: 0, stageDef: STAGE5 }, STREAMS[5]);
  view.layoutPlates(keep);
  for (const key of ['bg5mid', 'bg5mid2']) {
    const o = boot.made.filter(m => m.key === key && m.sf === 1);
    assert.equal(o.length, 1, key);
    const r = plateRect(['bg5mid', 'bg5mid2', 'bg5mid3', 'bg5mid4'].indexOf(key), STAGE5.zones);
    assert.equal(o[0].x, r.x); assert.equal(o[0].y, LANE_TOP + 8); assert.equal(o[0].scale, r.w / 1024);
    assert.deepEqual(o[0].origin, [0, 1]);
  }
  assert.ok(!boot.made.some(m => m.sf === 0.35));
  const late = viewScene([]);
  const lateView = createStage5View(late.s);
  lateView.layoutPlates(keep);
  assert.ok(!late.made.some(m => m.key === 'bg5mid'), 'a painted file still in flight is not replaced by a canvas tile');
  late.keys.add('bg5mid'); late.keys.add('bg5mid2');
  lateView.layoutPlates(keep);
  assert.equal(late.made.filter(m => m.key === 'bg5mid' && m.sf === 1).length, 1);
  const boss = viewScene(['bg5mid4']);
  createStage5View(boss.s).layoutPlates(new Set(['bg5mid4']));
  const g = boss.made.find(m => m.key === 'bg5mid4');
  const rect = gardenPlateRect(STAGE5.zones);
  assert.equal(g.x, rect.x);
  assert.equal(g.scale, rect.w / 1024);
  assert.ok(g.x + GARDEN_BLEND <= STAGE5.zones[3].l, 'the blend finishes at the boss zone');
  assert.ok(g.x + g.scale * 1024 >= WORLD_W, 'the plate reaches the end of the world');
});

test('painted floors meet at the shared edges and the left floor fades across the seam', () => {
  const p = viewScene(['bg5floor', 'bg5floor2', 'bg5floor3']);
  const edges = [0, STAGE5.zones[2].l, STAGE5.zones[3].l, WORLD_W];
  createStage5View(p.s).layoutPlates(new Set(['bg5floor', 'bg5floor2', 'bg5floor3']));
  const floors = p.made.filter(m => /^bg5floor/.test(m.key) && m.depth === -40);
  assert.deepEqual(floors.map(m => [m.key, m.x, m.w]), [
    ['bg5floor', edges[0], edges[1] - edges[0]],
    ['bg5floor2', edges[1], edges[2] - edges[1]],
    ['bg5floor3', edges[2], edges[3] - edges[2]],
  ]);
  for (const [left, x0, edge] of [['bg5floor', edges[0], edges[1]], ['bg5floor2', edges[1], edges[2]]]) {
    const strips = p.made.filter(m => m.key === left && m.depth > -40).sort((a, b) => a.x - b.x);
    assert.equal(strips.length, 12, left);
    assert.equal(strips[0].x, edge);
    assert.equal(strips.at(-1).x + strips.at(-1).w, edge + 96);
    for (const t of strips) assert.equal(t.tilePositionX, t.x - x0);
    const a = strips.map(t => t.alpha);
    assert.ok(a.every((v, i) => !i || v < a[i - 1]) && a[0] > 0.9 && a.at(-1) < 0.1);
  }
  const edge = viewScene(['bg5floor', 'bg5floor2', 'bg5floor3']);
  createStage5View(edge.s).layoutPlates(new Set(['bg5floor2', 'bg5floor3']));
  assert.ok(!edge.made.some(m => m.key === 'bg5floor'), 'a seam does not keep a floor the stream is about to drop');
  assert.ok(edge.made.some(m => m.key === 'bg5floor2' && m.depth > -40));
  const canvases = viewScene([]);
  canvases.s.textures.exists = () => true;
  canvases.s.textures.get = () => ({ source: [{ isCanvas: true }], getSourceImage: () => ({ width: 256 }) });
  createStage5View(canvases.s).layoutPlates(new Set(['bg5floor', 'bg5floor2', 'bg5mid', 'bg5mid2']));
  assert.ok(!canvases.made.some(m => /^bg5floor/.test(m.key) && m.depth > -40), 'code floors have no seam strips');
  assert.ok(canvases.made.some(m => m.key === 'bg5mid' && m.sf === 0.35));
});

test('set dressing and the Green Man wait for their sheets, then use the painted scale and frames', () => {
  const { s, made, keys } = viewScene(['s5tree', 's5deco']);
  const lay = {
    trees: [{ x: 760, y: 630, show: true }, { x: 1680, y: 620, ribbon: true }],
    lurks: [{ x: 480, y: 640 }],
    deco: [{ x: 160, y: 650, frame: 'bones' }],
    garden: [{ x: 4300, y: 620, frame: 'arch' }],
  };
  const view = createStage5View(s);
  const kit = { s, lay, ribbonDropped: false };
  view.sync(kit);
  assert.equal(made.filter(m => m.key === 's5tree').length, 2);
  assert.equal(made.find(m => m.key === 's5deco' && m.frame === 'lurk').x, 480);
  assert.equal(made.find(m => m.frame === 'bones').x, 160);
  assert.ok(!made.some(m => m.key === 's5garden'));
  keys.add('s5garden'); keys.add('s5green');
  kit.arena = { green: { state: 'seize' }, frozen: true, centre: 4500 };
  s.riley = { x: 4400 };
  view.sync(kit);
  const arch = made.find(m => m.key === 's5garden');
  assert.equal(arch.frame, 'arch'); assert.equal(arch.x, 4300); assert.deepEqual(arch.origin, [0.5, 1]);
  assert.equal(arch.y, LANE_TOP + 8, 'garden props sit on the far edge of the floor');
  assert.ok(arch.depth < 1000 + LANE_TOP, 'a floor prop stays behind every fighter');
  assert.equal(made.find(m => m.key === 's5tree').y, LANE_TOP + 8);
  const green = made.find(m => m.key === 's5green');
  assert.equal(green.frame, 1); assert.ok(Math.abs(green.scale - SCALE5.s5green[1]) < 1e-9);
  kit.ribbonDropped = true;
  view.sync(kit);
  assert.equal(made.find(m => m.x === 1680).frame, 2);
  assert.equal(made.find(m => m.x === 760).frame, 0);
});
