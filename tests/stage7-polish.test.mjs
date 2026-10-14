import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { stage7Simulation, withSeed } from "./helpers/stage7-harness.mjs";
import { stage1Simulation } from "./helpers/stage1-simulation.mjs";
import { Dancer, Veiled } from "../src/shaido.js";
import { Asmodean } from "../src/asmodean.js";
import { createNotes } from "../src/stage7-notes.js";
import { callMoilan, stepStrike7, endStrike7 } from "../src/stage7-lifecycle.js";
import { STAGE7_PHONE_CSS, syncStage7Phone, releaseStage7Phone, placeKnob } from "../src/stage7-phone.js";
import { installStage7Quality } from "../src/stage7-quality.js";
import { installGovernor } from "../src/quality-governor.js";
import { strikeRiley } from "../src/stage6-hurt.js";
import { q } from "../src/config.js";
import { paintStage7Hud } from "../src/stage7-hud.js";
import { createStage7View } from "../src/stage7-view.js";

function setup(zone = 3) {
  const h = stage7Simulation({ mode: false }), s = h.s;
  h.setController(null);
  s.started = s.locked = true;
  s.zoneI = zone;
  s.zone = s.zones[zone];
  s.bounds = { l: s.zone.l, r: s.zone.r };
  s.camX = s.camMax = s.zone.l;
  s.kit._zone = zone;
  s.enemies = [];
  s.riley.x = s.zone.l + 500;
  s.riley.y = 630;
  s.riley.inv = 0;
  s.riley.setState("idle", "idle");
  return h;
}
function scene(fn, zone = 3) {
  return withSeed(1, () => {
    const h = setup(zone);
    try { return fn(h.s, h); } finally { h.destroy(); }
  });
}
function boss(s) {
  const b = s.boss = new Asmodean(s, s.zone.r - 200, 630);
  b.bashAt = b.channelAt = 9999;
  s.enemies = [b];
  s.kit.notes.next = 9999;
  return b;
}

function phoneDocument() {
  const classes = new Set(), nodes = new Map();
  return {
    classes,
    body: { classList: {
      toggle(k, on) { on ? classes.add(k) : classes.delete(k); },
      remove(...keys) { keys.forEach(k => classes.delete(k)); },
    } },
    head: { appendChild(n) { nodes.set(n.id, n); } },
    getElementById: k => nodes.get(k),
    createElement: () => ({}),
    nodes,
  };
}

test("rendered portrait CSS places every combat control below the canvas and hides chrome during a call", { timeout: 30_000 }, async t => {
  const chrome = [process.env.RWB_CHROME, "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find(p => p && existsSync(p));
  if (!chrome) { t.skip("Chrome/Chromium is not installed"); return; }
  const dir = mkdtempSync(join(tmpdir(), "rwb-s7-layout-"));
  // Render the shipped shared CSS with the Stage 7 override. No game renderer
  // or Playwright dependency is needed to measure the DOM control geometry.
  const sharedCss = readFileSync(new URL("../index.html", import.meta.url), "utf8").split("<style>")[1].split("</style>")[0];
  const script = `
    const sizes = [[390,844],[320,568],[360,640]];
    const rows = await Promise.all(sizes.map(([width,height]) => new Promise(resolve => {
      const frame = document.createElement('iframe');
      frame.style.cssText = 'border:0;width:'+width+'px;height:'+height+'px';
      frame.onload = () => {
        const d = frame.contentDocument, w = frame.contentWindow;
        const bottom = d.querySelector('canvas').getBoundingClientRect().bottom;
        const controls = ['stick','tbA','tbS','tbJ','tbB','tbL'].map(id => {
          const r = d.getElementById(id).getBoundingClientRect();
          return {id,top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width};
        });
        d.body.classList.add('s7-call');
        const hidden = w.getComputedStyle(d.getElementById('touch')).visibility;
        d.body.classList.remove('s7-call','stage-7');
        const restored = w.getComputedStyle(d.getElementById('touch')).visibility;
        resolve({width,height,bottom,controls,hidden,restored});
      };
      const canvasHeight = width * 720 / 1280, top = (height-canvasHeight)/2;
      frame.srcdoc = '<style>'+${JSON.stringify(sharedCss + STAGE7_PHONE_CSS)}+'</style>'+
        '<body class="touch stage-7"><div id="game"><canvas style="position:absolute;top:'+top+'px;width:'+width+'px;height:'+canvasHeight+'px"></canvas></div>'+
        '<div id="touch"><div id="stick"></div>'+['A','S','J','B','L','P'].map(id=>'<div id="tb'+id+'" class="tb"></div>').join('')+'</div></body>';
      document.body.appendChild(frame);
    })));
    document.getElementById('result').textContent = JSON.stringify(rows);
  `;
  const page = join(dir, "layout.html");
  writeFileSync(page, '<pre id="result"></pre><script type="module">'+script+'</script>');
  try {
    const { stdout } = await promisify(execFile)(chrome, ["--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--no-first-run", "--user-data-dir="+join(dir,"profile"), "--virtual-time-budget=2000", "--dump-dom", pathToFileURL(page).href], { timeout: 25_000, maxBuffer: 2 * 1024 * 1024 });
    const rows = JSON.parse(stdout.match(/<pre id="result">(.*?)<\/pre>/s)?.[1] || "null");
    assert.equal(rows?.length, 3, "browser rendered all portrait fixtures");
    for (const row of rows) {
      for (const c of row.controls) {
        assert.ok(c.top >= row.bottom, `${row.width}x${row.height}: ${c.id} clears canvas`);
        assert.ok(c.width >= 44 && c.left >= 0 && c.right <= row.width && c.bottom <= row.height, `${c.id} stays reachable`);
      }
      assert.equal(row.hidden, "hidden");
      assert.equal(row.restored, "visible");
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("phone chrome hides at actual call start and restores on completion, cancellation and stage exit", () => scene(s => {
  const old = globalThis.document, doc = phoneDocument();
  globalThis.document = doc;
  try {
    const e = new Dancer(s, s.riley.x + 80, 630);
    s.enemies = [e];
    syncStage7Phone(s);
    assert.equal(doc.classes.has("stage-7"), true);
    assert.equal(doc.classes.has("s7-call"), false);
    assert.ok(doc.nodes.get("rwb-stage7-phone"));
    assert.equal(callMoilan(s.kit), true);
    assert.equal(doc.classes.has("s7-call"), true);
    stepStrike7(s.kit, 0.91);
    assert.equal(s.kit.strike, null);
    assert.equal(doc.classes.has("s7-call"), false);
    s.kit.call.charges = 1;
    e.setState("idle");
    assert.equal(callMoilan(s.kit), true);
    endStrike7(s.kit, false);
    assert.equal(doc.classes.has("s7-call"), false);
    s.cutscene = {};
    syncStage7Phone(s);
    assert.equal(doc.classes.has("s7-story"), true);
    syncStage7Phone({ stageNo: 1 });
    assert.equal(doc.classes.size, 0);
    releaseStage7Phone();
    assert.equal(doc.classes.size, 0);
  } finally { globalThis.document = old; }
}, 0));

function governorFixture(sample, initial = "") {
  const meter = { lastSampleMs: sample }, calls = [];
  const s = {
    stageNo: 7, started: true, runId: 1, fx: { quality: 0 },
    setBloom: v => calls.push(["bloom", v]),
    setBackdropLit: v => calls.push(["backdrop", v]),
  };
  const game = s.game = {
    rs: 2, scale: { resize() {} }, scene: { getScene: () => s },
    renderer: { gl: { getExtension: () => null, getParameter: () => "hardware GPU" } },
  };
  const k = s.kit = { s, quality: 0, cleanups: [], setQuality(n) { this.quality = n; } };
  const control = installGovernor(game, { q: new Map(initial ? [["q", initial]] : []), rs0: 2, vw: 1280, vh: 720, meter, log() {} });
  const original = game.governor;
  installStage7Quality(k, meter);
  return { meter, s, k, game, control, original, calls };
}

test("Stage 7 sheds FX first and holds lighting/scale at 40 ms while preserving raw metrics", () => {
  const e = governorFixture(40);
  for (let i = 0; i < 1000; i++) e.game.governor();
  assert.equal(e.control.level, 2);
  assert.equal(e.k.quality, 2);
  assert.equal(e.game.rs, 2);
  assert.deepEqual(e.calls, [["bloom", false]]);
  assert.equal(e.meter.lastSampleMs, 40);
});

test("sustained 100 ms frames still shed scale/lighting, with a slower Stage 7 ratchet", () => {
  const e = governorFixture(100);
  for (let i = 0; i < 40; i++) e.game.governor();
  assert.equal(e.control.level, 2);
  for (let i = 0; i < 47; i++) e.game.governor();
  assert.equal(e.control.level, 2);
  e.game.governor();
  assert.equal(e.control.level, 3);
  for (let i = 0; i < 96; i++) e.game.governor();
  assert.equal(e.control.level, 5);
  assert.equal(e.k.quality, 5);
  assert.equal(e.game.rs, 1);
  assert.equal(e.meter.lastSampleMs, 100);
});

test("earlier stages retain the shared quality cadence after Stage 7 teardown", () => {
  const e = governorFixture(40);
  for (const clean of e.k.cleanups.reverse()) clean();
  assert.equal(e.game.governor, e.original);
  e.s.stageNo = 1;
  for (let i = 0; i < 250; i++) e.game.governor();
  assert.equal(e.control.level, 5);
});

test("Stage 7 quality honors explicit pins and does not ratchet during pauses or calls", () => {
  for (const pin of ["fixed", "5"]) {
    const e = governorFixture(100, pin);
    for (let i = 0; i < 300; i++) e.game.governor();
    assert.equal(e.control.level, pin === "fixed" ? 0 : 5);
  }
  for (const flag of ["paused", "cutscene", "strike"]) {
    const e = governorFixture(100);
    if (flag === "strike") e.k.strike = {}; else e.s[flag] = true;
    for (let i = 0; i < 300; i++) e.game.governor();
    assert.equal(e.control.level, 0);
  }
});

for (const zone of [1, 2])
  test(`zone ${zone}: a left-edge archer moves into reach, including after continue and scrolling`, () => scene((s, h) => {
    const e = new Veiled(s, s.bounds.l + 40, 630);
    s.enemies = [e];
    s.riley.x = s.bounds.l + 280;
    e.startAttack();
    e.st = 2;
    for (let i = 0; i < 60; i++) h.step();
    assert.ok(e.x >= s.bounds.l + 159);
    assert.equal(s.kit.arrows.length, 0, "does not fire while moving inward");
    s.gameOver = true;
    s.continueGame();
    s.riley.x = s.bounds.l + 280;
    for (let i = 0; i < 60; i++) h.step();
    assert.ok(e.x >= s.bounds.l + 159);
    s.bounds.l += 100;
    s.camX = s.camMax = s.bounds.l;
    for (let i = 0; i < 60; i++) { e.update(1 / 60); e.physics(1 / 60); }
    assert.ok(e.x >= s.bounds.l + 159);
    s.riley.x = e.x + 110;
    s.riley.facing = -1;
    e.takeHit({ dmg: 1 });
    assert.equal(s.grabCandidate(s.riley), e, "edge archer can be jabbed and grabbed");
  }, zone));

for (const zone of [1, 2, 3])
  test(`zone ${zone}: archers use the intended tell, spacing and recovery`, () => scene(s => {
    const a = new Veiled(s, s.bounds.l + 200, 630), b = new Veiled(s, s.bounds.r - 200, 630);
    s.enemies = [a, b];
    a.startAttack(); b.startAttack();
    a.st = b.st = 0.61;
    s.kit.clock = 1;
    a.step(0.01);
    assert.equal(s.kit.arrows.length, zone < 3 ? 0 : 1);
    a.st = b.st = 0.81;
    a.step(0.01); b.step(0.01);
    assert.equal(s.kit.arrows.length, 1);
    assert.equal(a.cool, zone < 3 ? 4.8 : 3.79);
    const spacing = zone < 3 ? 0.9 : 0.6;
    s.kit.clock = 1 + spacing - 0.001;
    b.step(0.01);
    assert.equal(s.kit.arrows.length, 1);
    s.kit.clock = 1 + spacing;
    b.step(0.01);
    assert.equal(s.kit.arrows.length, 2);
  }, zone));

for (const kind of ["note", "arrow"])
  test(`${kind}: a real rising jump can be hit above the old airborne cutoff`, () => scene((s, h) => {
    const b = boss(s);
    s.inp.press("jump");
    for (let i = 0; i < 12; i++) h.step();
    assert.ok(s.riley.z > 35 && s.riley.z < 95, String(s.riley.z));
    const hp = s.riley.hp;
    if (kind === "note") {
      s.kit.notes.notes.push({ x: s.riley.x + 3, y: 630, dir: -1, age: 0, gold: false });
      s.kit.notes.step(1 / 120, s, b);
    } else {
      s.kit.arrows.push({ x: s.riley.x + 3, y: 630, dir: -1, t: 0 });
      s.kit.step(1 / 120);
    }
    assert.equal(s.riley.hp, hp - 7);
  }));

for (const kind of ["note", "arrow"])
  test(`${kind}: jump apex and a different depth lane still evade projectiles`, () => scene((s, h) => {
    const b = boss(s);
    s.inp.press("jump");
    for (let i = 0; i < 20; i++) h.step();
    assert.ok(s.riley.z > 115);
    const hp = s.riley.hp;
    for (const y of [630, 580]) {
      s.kit.notes.notes.length = 0;
      s.kit.arrows.length = 0;
      if (y === 580) s.riley.z = 0;
      if (kind === "note") {
        s.kit.notes.notes.push({ x: s.riley.x + 3, y, dir: -1, age: 0, gold: false });
        s.kit.notes.step(1 / 120, s, b);
      } else {
        s.kit.arrows.push({ x: s.riley.x + 3, y, dir: -1, t: 0 });
        s.kit.step(1 / 120);
      }
      assert.equal(s.riley.hp, hp);
    }
  }));

for (const state of ["stagger", "channel"])
  test(`${state}: queued harp notes pause while existing notes move, and resume with a full remaining tell`, () => scene(s => {
    const b = boss(s), n = createNotes();
    b.setState(state);
    n.next = 9;
    n.pending.push({ band: 0, at: 0, fire: 0.625, gold: false });
    n.notes.push({ x: b.x, y: 580, dir: -1, age: 0, gold: false });
    n.step(0.7, s, b);
    assert.equal(n.clock, 0);
    assert.equal(n.notes.length, 1);
    assert.equal(n.notes[0].x, b.x - 252);
    assert.equal(n.pending.length, 1);
    b.setState("idle");
    n.step(0.5, s, b);
    assert.equal(n.pending.length, 1);
    n.step(0.126, s, b);
    assert.equal(n.pending.length, 0);
    assert.equal(n.notes.length, 2);
    b.setState(state);
    n.next = n.clock;
    n.step(1, s, b);
    assert.equal(n.pending.length, 0, "cannot schedule a new phrase while interrupted");
  }));

test("boss CALL resolves phase-2 adds and the boss in the same strike without bypassing phase gates", () => scene(s => {
  const b = boss(s);
  b.phase = 2; b.hp = 220;
  const grunt = s.spawn("grunt", "R");
  grunt.entering = false; grunt.x = s.riley.x + 80; grunt.y = 630;
  const a = new Dancer(s, s.riley.x + 200, 630);
  s.enemies.push(a);
  assert.equal(callMoilan(s.kit), true);
  assert.equal(s.kit.strike.helper, "duo");
  stepStrike7(s.kit, 0.64);
  assert.equal(grunt.alive, true);
  stepStrike7(s.kit, 0.02);
  assert.equal(grunt.alive, false);
  assert.equal(a.state, "down");
  assert.ok(a.assistDown > 0);
  assert.equal(b.hp, 198);
  assert.equal(b.phase, 3);
  assert.equal(b.alive, true);
}));

test("assisted demo uses its phase-3 call during a channel even when Riley is jumping", () => scene((s, h) => {
  const b = boss(s);
  b.phase = 3; b.hp = 198;
  b.startChannel();
  h.setController("1");
  s.bot.useCall = true;
  s.riley.setState("air");
  s.riley.z = 100;
  assert.equal(s.riley.busy, true);
  s.bot.update(1 / 60);
  s.riley.update(1 / 60, s.inp);
  assert.equal(s.kit.call.calls, 1);
  assert.equal(s.kit.strike.helper, "duo");
}));

test("outro holds Riley inside the clear composition while held directions and attack mash cannot stop its clock", () => scene((s, h) => {
  const b = boss(s);
  b.phase = 3; b.hp = 1;
  s.riley.x = s.bounds.r - 45;
  s.riley.z = 140; s.riley.vz = 300;
  b.takeHit({ dmg: 2 });
  assert.equal(s.kit.outro, true);
  const x = s.riley.x;
  s.inp.held.right = true;
  for (let i = 0; i < 1000 && !s.ended; i++) {
    if (i % 5 === 0) s.inp.press("attack");
    h.step();
    assert.equal(s.riley.x, x);
  }
  assert.equal(s.ended, true);
  assert.ok(s.riley.x - s.camX <= 900);
  assert.equal(s.riley.z, 0);
  assert.equal(s.riley.state, "idle");
  for (let i = 0; i < 60 && !s.clearShown; i++) h.step();
  assert.equal(s.clearShown, true);
  s.onPress("attack");
  assert.deepEqual(h.observations.restartData.at(-1), { stage: 1, stage7Return: true });
}));

test("Stage 7 and its return title hide gameplay HUD nodes, restore on Start, and leave other titles alone", () => {
  const node = (visible = true) => ({ visible, setVisible(v) { this.visible = v; } });
  const card = node(), portrait = node(), bars = node(), call = node(), unused = node(false);
  const hud = { card, children: { list: [card, portrait, bars, call, unused] } };
  for (const s of [{ stageNo: 7 }, { stageNo: 1, stageData: { stage7Return: true } }]) {
    paintStage7Hud(hud, s);
    assert.equal(card.visible, true);
    assert.equal(portrait.visible, false);
    assert.equal(bars.visible, false);
    assert.equal(call.visible, false);
    paintStage7Hud(hud, s);
    paintStage7Hud(hud, { ...s, started: true });
    assert.equal(portrait.visible, true);
    assert.equal(bars.visible, true);
    assert.equal(call.visible, true);
    assert.equal(unused.visible, false);
  }
  paintStage7Hud(hud, { stageNo: 1 });
  assert.equal(portrait.visible, true);
});

test("failed column sheets retain the fallback frame for tell/strike/flicker; painted sheets retain glow cells", () => scene(s => {
  boss(s);
  const made = [], image = s.add.image;
  s.add.image = (...args) => {
    const o = image(...args);
    if (args[2] === "s7column") {
      o.setFrame = frame => { o.frame = frame; return o; };
      made.push(o);
    }
    return o;
  };
  let frames = 1;
  s.textures.get = () => ({ has: n => n < frames });
  const view = createStage7View(s);
  try {
    for (const phase of ["tell", "strike"]) {
      s.kit.arena.rain = { x: 5050, phase };
      view.sync(s.kit);
      assert.equal(made.at(-1).frame, 0);
      frames = 3;
      view.sync(s.kit);
      assert.equal(made.at(-1).frame, phase === "tell" ? 1 : 2);
      frames = 1;
    }
    s.kit.arena.rain = null;
    s.boss.hp = 50;
    view.sync(s.kit);
    assert.ok(made.every(o => o.frame === 0));
  } finally { view.destroy(); }
}));

test("columns created before demand-loaded art arrive rebind their real texture and size before selecting a glow", () => scene(s => {
  boss(s);
  let ready = false;
  const made = [], image = s.add.image;
  s.textures.exists = key => key === "s7column" && ready;
  s.textures.get = () => ({ has: n => ready || n === 0 });
  s.add.image = (...args) => {
    const o = image(...args);
    if (args[2] === "s7column") {
      o.texture = { key: "__MISSING" };
      o.sizes = 0;
      o.setTexture = key => { o.texture.key = key; return o; };
      o.setDisplaySize = () => { o.sizes++; return o; };
      o.setFrame = frame => {
        assert.ok(o.texture.key !== "__MISSING" || frame === 0);
        o.frame = frame; return o;
      };
      made.push(o);
    }
    return o;
  };
  const view = createStage7View(s);
  try {
    s.kit.arena.rain = { x: 5050, phase: "strike" };
    view.sync(s.kit);
    assert.equal(made.at(-1).texture.key, "__MISSING");
    ready = true;
    view.sync(s.kit);
    assert.equal(made.length, 5, "reuse the five effects after the art arrives");
    assert.ok(made.every(o => o.texture.key === "s7column" && o.sizes === 2));
    assert.equal(made.at(-1).frame, 2);
  } finally { view.destroy(); }
}));

test("three aligned animated melee hits break the real channel; attacks in a different depth lane whiff", () => scene((s, h) => {
  const b = boss(s);
  b.phase = 3; b.hp = 198;
  b.startChannel();
  s.riley.x = b.x - 100;
  s.riley.facing = 1;
  s.riley.y = b.y - 50;
  s.inp.press("attack");
  for (let i = 0; i < 25; i++) h.step();
  assert.equal(b.channelHits, 0);
  s.riley.setState("idle", "idle");
  s.riley.y = b.y;
  b.startChannel();
  for (let i = 0; i < 100 && b.state === "channel"; i++) {
    if (i % 10 === 0) s.inp.press("attack");
    h.step();
  }
  assert.equal(b.channelHits, 3);
  assert.equal(b.state, "stagger");
}));

test("Escape skips Stage 7 story and boss dialogue, then pauses combat after dismissal", () => scene((s, h) => {
  const begun = s.startCutscene([{ who: "ASMODEAN", text: "Test line", panel: 0 }], [{ key: "story7p1" }], () => {});
  assert.notEqual(begun, false);
  s.onPress("pause");
  assert.equal(s.cutscene, null);
  assert.equal(s.pauseReasons.has("manual"), false);
  s.kit.echo = performance.now() - 400;
  s.startBoss();
  for (let i = 0; i < 60; i++) h.step();
  assert.ok(s.boss);
  assert.equal(s.cutscene, null, "boss introduction is a caption over live combat");
  s.onPress("pause");
  assert.equal(s.pauseReasons.has("manual"), false);
  assert.equal(s.kit.bossCaptionUntil, 0);
  s.onPress("pause");
  assert.equal(s.pauseReasons.has("manual"), false);
  s.kit.echo = performance.now() - 351;
  s.onPress("pause");
  assert.equal(s.pauseReasons.has("manual"), true);
}));

test("Moiraine protects the complete asynchronous art load and strike and kills Trollocs within the hit window", async () => {
  const h = setup(0), s = h.s, k = s.kit;
  try {
    const grunts = Array.from({ length: 3 }, (_, i) => {
      const e = s.spawn("grunt", "R");
      e.entering = false; e.x = s.riley.x + 100 + i * 80; e.y = 630;
      return e;
    });
    const ready = new Set(), load = new EventEmitter(), timers = new Map();
    Object.assign(load, { atlas() {}, image() {}, spritesheet() {}, start() {}, isLoading: () => false });
    s.load = load;
    s.textures = { exists: key => ready.has(key) };
    k.artRows = ["s7moir", "s7lan", "s7earth", "s7shield"].map(key => ({ key, present: true, url: "fixture.webp" }));
    k.artRoot = { setTimeout(fn, ms) { timers.set(1, { fn, ms }); return 1; }, clearTimeout(id) { timers.delete(id); } };
    assert.equal(callMoilan(k), true);
    assert.equal(k.strike, undefined);
    assert.equal([...timers.values()][0].ms, 1500);
    const hp = s.riley.hp;
    for (let i = 0; i < 90; i++) {
      s.riley.update(1 / 60, s.inp);
      k.update(1 / 60);
      assert.equal(s.riley.takeHit({ dmg: 30 }, grunts[0]), false);
      assert.equal(strikeRiley(s, 30), false);
    }
    for (const key of ["s7moir", "s7lan", "s7earth", "s7shield"]) ready.add(key);
    load.emit("complete");
    await Promise.resolve(); await Promise.resolve();
    assert.equal(k.strike.helper, "moiraine");
    assert.equal(s.time.paused, true);
    stepStrike7(k, 0.64);
    assert.ok(grunts.every(e => e.alive));
    stepStrike7(k, 0.02);
    assert.ok(grunts.every(e => !e.alive));
    stepStrike7(k, 0.95);
    assert.equal(k.strike, null);
    assert.equal(s.riley.hp, hp);
    assert.ok(s.riley.inv >= 2);
    assert.equal(!!s.time.paused, false);
  } finally { h.destroy(); }
});

test("the Stage 7 demo starts from the title without Enter through the production timer", () => {
  const saved = new Map(["demo", "story", "s7"].map(key => [key, q.get(key)]));
  q.set("demo", "1"); q.set("story", "0"); q.set("s7", "1");
  const h = stage1Simulation({ stage: 7, mode: "1" });
  try {
    // The harness presses Start on create; remove that request so only the
    // production demo timer can start this run.
    h.s.startRequested = false;
    h.s.inp.flushPresses();
    assert.equal(h.s.started, false);
    for (let i = 0; i < 10; i++) h.step();
    assert.equal(h.s.started, false);
    for (let i = 0; i < 30; i++) h.step();
    assert.equal(h.s.started, true);
  } finally {
    h.destroy();
    for (const [key, value] of saved) value === null ? q.delete(key) : q.set(key, value);
  }
});

test("joystick placement changes the visual position and input axis together", () => {
  const knob = { style: {}, offsetWidth: 42, offsetHeight: 42 };
  const stick = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 100 }) };
  const middle = placeKnob(stick, knob, 50, 50);
  const right = placeKnob(stick, knob, 100, 50);
  assert.ok(right.left > middle.left);
  assert.equal(knob.style.left, right.left + "px");
  assert.equal(right.axis.x, 1);
});
