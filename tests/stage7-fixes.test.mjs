import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import {
  stage7Simulation,
  withSeed,
  FULL_STAGE_SEEDS,
} from "./helpers/stage7-harness.mjs";
import { Dancer, Veiled } from "../src/shaido.js";
import { Asmodean } from "../src/asmodean.js";
import { reflectNote } from "../src/stage7-notes.js";
import {
  callMoilan,
  stepStrike7,
  call7Context,
} from "../src/stage7-lifecycle.js";
import { callEffect, allocateStrikes } from "../src/moilan-call.js";
import { demand7, HELPERS7 } from "../src/stage7-load.js";
import { createStorm } from "../src/stage7-storm.js";
import {
  bindStage7Hud,
  paintStage7Hud,
  installStage7Hud,
} from "../src/stage7-hud.js";
import { createCall7Video } from "../src/call7-cutscene.js";
import { MUSIC } from "../src/audio.js";
import { q, LANE_TOP, LANE_BOT } from "../src/config.js";
import { videoEnv } from "./stage6-hardening-fixtures.mjs";
import { paintStage7Art } from "../src/stage7-paint.js";
import { releaseStage7 } from "../src/stage7.js";
import { memory7 } from "../tools/stage7/memory.mjs";
import { HUD } from "../src/hud.js";

function scene(fn, seed = 1) {
  return withSeed(seed, () => {
    const h = stage7Simulation({ mode: null }),
      s = h.s;
    h.setController(null);
    s.locked = true;
    s.camMax = 3920;
    s.enemies = [];
    s.zoneI = 3;
    s.zone = s.zones[3];
    s.bounds = { l: 3920, r: 5200 };
    s.camX = 3920;
    s.riley.x = 4500;
    s.riley.y = 630;
    s.riley.facing = 1;
    s.riley.inv = 0;
    s.riley.setState("idle", "idle");
    s.kit._zone = 3;
    try {
      return fn(s, h);
    } finally {
      h.destroy();
    }
  });
}
function boss(s) {
  const b = (s.boss = new Asmodean(s, 4800, 630));
  s.enemies.push(b);
  return b;
}
function note(x = 4560) {
  return { x, y: 630, dir: -1, age: 0, gold: true, counterUsed: false };
}

for (const path of ["melee", "attackFrame", "fireball"])
  test(`${path}: reflections count three channel hits and share stats and captions`, () =>
    scene((s) => {
      const b = boss(s),
        k = s.kit;
      b.phase = 3;
      b.hp = 180;
      b.startChannel();
      k.notes.next = 99;
      const captions = [];
      s.caption = (who, text) => captions.push({ who, text });
      for (let i = 0; i < 3; i++) {
        const n = note();
        k.notes.notes = [n];
        if (path === "melee")
          s.resolveAttack(s.riley, { dmg: 0, x0: 0, x1: 0, z0: 0, z1: 0 });
        if (path === "attackFrame") {
          s.riley.attackFrame = true;
          k.notes.step(1 / 120, s, b);
        }
        if (path === "fireball") {
          s.fireballs = [{ x: 4540, gy: 630, dir: 1 }];
          k.step(1 / 120);
        }
        assert.equal(n.counterUsed, true);
        assert.equal(k.stats.reflects, i + 1);
        assert.equal(b.channelHits, i + 1);
        assert.equal(b.state, i < 2 ? "channel" : "stagger");
        if (i < 2) assert.equal(b.staggerFor, undefined);
      }
      assert.equal(b.hp, 108);
      assert.equal(b.staggerFor, 1.4);
      assert.equal(captions.filter((c) => c.who === "ASMODEAN").length, 1);
      assert.ok(
        k.tasks.some((t) => t.at === k.clock + 1 || Math.abs(t.at - 1) < 0.1),
      );
    }));

test("reflection respects facing and invulnerability, uses max HP, and consumes once", () =>
  scene((s) => {
    const b = boss(s),
      n = note(),
      k = s.kit;
    b.maxHp = 1000;
    b.hp = 1000;
    s.riley.facing = -1;
    assert.equal(reflectNote(k.notes, n, s, b), false);
    s.riley.facing = 1;
    b.invuln = true;
    assert.equal(reflectNote(k.notes, n, s, b), false);
    assert.equal(n.counterUsed, false);
    assert.equal(b.state, "idle");
    b.invuln = false;
    assert.equal(reflectNote(k.notes, n, s, b), true);
    assert.equal(b.hp, 960);
    assert.equal(b.staggerFor, 0.8);
    assert.equal(reflectNote(k.notes, n, s, b), false);
    assert.equal(b.hp, 960);
  }));

test("a travelling note keeps moving through a phase gate while new emission waits", () =>
  scene((s) => {
    const b = boss(s),
      k = s.kit,
      n = note(4100);
    k.notes.notes = [n];
    k.notes.next = 99;
    b.takeHit({ dmg: 999 });
    assert.equal(b.beat, true);
    assert.equal(k.notes.notes.length, 1);
    const x = n.x;
    k.notes.step(0.1, s, b);
    assert.equal(n.x, x - 36);
    assert.equal(n.age, 0.1);
    assert.equal(k.notes.pending.length, 0);
  }));

for (const type of ["dancer", "veiled"])
  test(`${type}: Riley's animated grab and throw interrupts a channel with a real body`, () =>
    scene((s, h) => {
      const b = boss(s);
      b.x = 4220;
      b.phase = 3;
      b.hp = 150;
      b.channelAt = 99;
      b.startChannel();
      const e =
        type === "dancer" ? new Dancer(s, 4592, 630) : new Veiled(s, 4592, 630);
      e.cool = 99;
      s.enemies.push(e);
      s.kit.notes.next = 99;
      assert.equal(s.grabCandidate(s.riley), e);
      s.riley.startGrab(e);
      for (let i = 0; i < 12; i++) h.step();
      assert.equal(e.state, "held");
      assert.equal(s.riley.state, "hold");
      s.inp.press("jump");
      let thrown = false;
      for (let i = 0; i < 50 && b.state !== "stagger"; i++) {
        h.step();
        thrown ||= e.state === "thrown";
      }
      assert.equal(thrown, true);
      assert.equal(b.state, "stagger");
      assert.equal(b.channelHits, 1);
      assert.equal(b.staggerFor, 1.4);
      assert.equal(b.hp, 140);
      for (let i = 0; i < 100; i++) h.step();
      assert.ok(e.hp > 0);
      assert.equal(e.state !== "thrown", true);
    }));

test("a call releases a Shaido held by Riley", () =>
  scene((s) => {
    s.zoneI = 0;
    s.bounds = s.zone = s.zones[0];
    s.camX = 0;
    s.riley.x = 400;
    const e = new Dancer(s, 492, 630);
    s.enemies = [e];
    s.riley.startGrab(e);
    assert.equal(callMoilan(s.kit), true);
    assert.equal(s.riley.held, null);
    assert.equal(e.heldBy, null);
  }));

test("Fade death stuns Trollocs that arrived after it and recovers after 1.5 seconds", () =>
  scene((s, h) => {
    const f = s.spawn("fadelt", "R");
    const a = s.spawn("grunt", "L"),
      b = s.spawn("spear", "L");
    for (const e of [f, a, b]) {
      e.entering = false;
      e.x = 4700;
      e.y = 650;
    }
    assert.equal(a.linkedTo, f);
    assert.equal(b.linkedTo, f);
    f.die();
    const hp = s.riley.hp;
    for (let i = 0; i < 70; i++) {
      h.step();
      assert.equal(a.state, "down");
      assert.equal(b.state, "down");
    }
    assert.equal(s.riley.hp, hp);
    for (let i = 0; i < 50; i++) h.step();
    assert.equal(a._s7down, false);
    assert.equal(b._s7down, false);
  }));

test("Lan refuses a charge with no targets in his lane", () =>
  scene((s) => {
    s.zoneI = 0;
    s.zone = s.bounds = s.zones[0];
    s.camX = 0;
    s.riley.x = 400;
    s.riley.y = LANE_TOP;
    const e = new Dancer(s, 500, LANE_BOT);
    s.enemies = [e];
    assert.equal(call7Context(s.kit).hittable, false);
    assert.equal(callMoilan(s.kit), false);
    assert.equal(s.kit.call.charges, 1);
    assert.equal(s.kit.call.calls, 0);
    s.riley.y = e.y;
    assert.equal(callMoilan(s.kit), true);
    stepStrike7(s.kit, 0.5);
    assert.equal(e.state, "down");
  }));

test("Moiraine includes the Fade in a crowded call, rounds HP and resets hit latches", () =>
  scene((s) => {
    const f = s.spawn("fadelt", "R");
    f.entering = false;
    f.hp = 101;
    f.x = 4600;
    f.y = 630;
    const list = [
      f,
      ...Array.from({ length: 8 }, () => ({ type: "grunt", y: 630 })),
    ];
    const selected = allocateStrikes(list, "moiraine", 630);
    assert.ok(selected.includes(f));
    assert.equal(selected.length, 7);
    callEffect(f, "moiraine");
    assert.equal(f.hp, 25);
    assert.equal(f.randDown, 2);
    const e = new Dancer(s, 4600, 630);
    e.hp = 59;
    e.hitIds.add("old");
    callEffect(e, "moiraine");
    assert.equal(e.hp, 24);
    assert.equal(e.hitIds.size, 0);
    assert.equal(e.state, "down");
  }));

for (const clip of ["playing", "stalled"])
  test(`${clip}: actual video is aborted on the fixed strike deadline`, async () => {
    const e = videoEnv();
    q.set("cutscenes", "1");
    const h = stage7Simulation({ mode: null }),
      s = h.s,
      k = s.kit;
    try {
      s.enemies = [];
      s.zoneI = 0;
      s.zone = s.bounds = s.zones[0];
      s.riley.x = 400;
      const foe = new Dancer(s, 500, s.riley.y);
      s.enemies.push(foe);
      k.video.destroy();
      k.video = createCall7Video(s, e.root, {
        moiraine: ["M1"],
        lan: ["L1"],
        duo: ["D1"],
      });
      assert.equal(callMoilan(k), true);
      assert.equal(k.video.active, true);
      e.clock = clip === "playing";
      if (clip === "playing") {
        e.advance(200);
        e.videos[0].fire("playing");
      }
      stepStrike7(k, 0.44);
      assert.notEqual(foe.state, "down");
      stepStrike7(k, 0.02);
      assert.equal(foe.state, "down");
      stepStrike7(k, 0.45);
      assert.equal(k.strike, null);
      assert.equal(k.video.active, false);
      assert.equal(e.timers.size, 0);
      assert.equal(e.root.document.body.children.length, 0);
      assert.equal(!!s.time.paused, false);
      assert.ok(s.riley.inv >= 2);
    } finally {
      h.destroy();
      q.delete("cutscenes");
    }
  });

test("the real video player recovers from a stall without manually toggling active", () => {
  const e = videoEnv();
  e.clock = false;
  q.set("cutscenes", "1");
  const v = createCall7Video(e.scene, e.root, {
    moiraine: ["M1"],
    lan: [],
    duo: [],
  });
  try {
    assert.equal(v.play("moiraine"), true);
    assert.equal(v.active, true);
    e.advance(2000);
    assert.equal(v.active, false);
    assert.equal(e.timers.size, 0);
    assert.equal(e.root.document.body.children.length, 0);
  } finally {
    v.destroy();
    q.delete("cutscenes");
  }
});

function canvas() {
  const ctx = new Proxy(
    {},
    {
      get: (t, k) =>
        k.startsWith("create") ? () => ({ addColorStop() {} }) : () => {},
      set: (t, k, v) => {
        t[k] = v;
        return true;
      },
    },
  );
  return { width: 0, height: 0, getContext: () => ctx };
}
function artFixture() {
  const made = new Map(),
    load = new EventEmitter(),
    timers = new Map();
  let id = 0,
    starts = 0;
  Object.assign(load, {
    atlas() {},
    image() {},
    spritesheet() {},
    isLoading: () => false,
    start() {
      starts++;
    },
  });
  const s = {
    load,
    events: new EventEmitter(),
    time: { paused: true },
    textures: {
      exists: (k) => made.has(k),
      addCanvas(k, c) {
        made.set(k, c);
        return { add() {} };
      },
    },
  };
  const root = {
    setTimeout(fn, ms) {
      timers.set(++id, { fn, ms });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
  };
  const k = {
    s,
    cleanups: [],
    artRoot: root,
    artRows: HELPERS7.map((key) => ({
      key,
      url: "fixture.webp",
      present: true,
    })),
  };
  return {
    s,
    k,
    load,
    made,
    timers,
    get starts() {
      return starts;
    },
  };
}

test("overlapping art requests wait for the same keys; stalled load paints at 1500 ms with Phaser paused", async () => {
  const e = artFixture(),
    old = document.createElement;
  document.createElement = canvas;
  try {
    let first = 0,
      second = 0;
    demand7(e.k, HELPERS7, () => first++);
    demand7(e.k, HELPERS7, () => second++);
    assert.equal(e.starts, 1);
    assert.equal(first + second, 0);
    assert.equal(e.timers.size, 1);
    const timer = [...e.timers.values()][0];
    assert.equal(timer.ms, 1500);
    timer.fn();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(first, 1);
    assert.equal(second, 1);
    assert.equal(e.made.size, 4);
    assert.equal(e.k.pendingArt.size, 0);
    assert.equal(e.s.time.paused, true);
    e.load.emit("complete");
    assert.equal(first, 1);
  } finally {
    if (old) document.createElement = old;
    else delete document.createElement;
  }
});

test("destroy during art loading cancels callbacks, deadline and listeners", async () => {
  const e = artFixture();
  let done = 0;
  demand7(e.k, HELPERS7, () => done++);
  e.k.destroyed = true;
  for (const cleanup of e.k.cleanups) cleanup();
  e.load.emit("complete");
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(done, 0);
  assert.equal(e.timers.size, 0);
  assert.equal(e.k.pendingArt.size, 0);
  assert.equal(e.made.size, 0);
});

test("helper art is requested when charge is ready; boss intro waits for coalesced art", async () => {
  const h = stage7Simulation({ mode: null }),
    s = h.s,
    k = s.kit,
    old = document.createElement;
  document.createElement = canvas;
  try {
    const e = artFixture();
    Object.assign(s, { load: e.load, textures: e.s.textures });
    k.artRoot = e.k.artRoot;
    k.artRows = [
      ...e.k.artRows,
      { key: "s7asmo", url: "fixture.webp", present: true },
    ];
    k.helpersRequested = false;
    k.call.charges = 0;
    k.start();
    assert.equal(e.starts, 0);
    k.update(0.01);
    assert.equal(e.starts, 0);
    k.call.charges = 1;
    k.update(0.01);
    assert.equal(e.starts, 1);
    s.startBoss();
    assert.equal(s.boss, null);
    assert.equal(e.starts, 2);
    e.load.emit("complete");
    await Promise.resolve();
    await Promise.resolve();
    assert.ok(s.textures.exists("s7asmo"));
    assert.equal(s.boss, null);
    for (let i = 0; i < 50 && !s.boss; i++) h.step();
    assert.ok(s.boss);
  } finally {
    h.destroy();
    if (old) document.createElement = old;
    else delete document.createElement;
  }
});

test("touch brace uses the real Input centre-stick path, stops on release and respects Y movement", () =>
  scene((s) => {
    s.zoneI = 1;
    s.zone = s.bounds = s.zones[1];
    s.enemies = [];
    s.riley.x = 1800;
    const inp = s.inp,
      st = createStorm();
    inp.isTouch = true;
    inp.touchAxis = { x: 0, y: 0, run: false };
    inp.update(0.01);
    st.arm();
    st.phase = "gust";
    st.t = 4;
    st.dir = 1;
    st.step(1, s);
    assert.equal(s.riley.x, 1835);
    inp.touchAxis = { x: 0, y: 0 };
    inp.update(0.01);
    st.step(1, s);
    assert.equal(s.riley.x, 1905);
    inp.held.run = true;
    inp.held.up = true;
    inp.update(0.01);
    st.step(1, s);
    assert.equal(s.riley.x, 1975);
    inp.held.up = false;
    inp.update(0.01);
    st.step(0.5, s);
    assert.equal(s.riley.x, 1992.5);
  }));

test("phase-2 delayed adds spawn in phase 2 and are cancelled in phase 3", () => {
  for (const phase of [2, 3])
    scene((s) => {
      const b = boss(s);
      b.phase = 2;
      s.kit.onAsmodeanPhase(b, 2);
      assert.equal(s.enemies.length, 3);
      b.phase = phase;
      s.kit.notes.next = 99;
      s.kit.step(5.01);
      assert.equal(s.enemies.length, phase === 2 ? 5 : 3);
    });
});

test("harp bash waits for a phrase gap and Asmodean uses a walk pose", () =>
  scene((s) => {
    const b = boss(s);
    b.x = 4600;
    b.clock = 4;
    b.bashAt = 0;
    s.kit.notes.pending = [{ fire: 99 }];
    b.step(0.01);
    assert.equal(b.state, "walk");
    s.kit.notes.pending = [];
    b.step(0.01);
    assert.equal(b.state, "attack");
    b.setState("down");
    b.step(0.81);
    assert.equal(b.state, "idle");
  }));

test("a waiting archer releases its token; dancer retains its token through the lunge", () =>
  scene((s) => {
    const a = new Veiled(s, 4200, 630),
      b = new Veiled(s, 5000, 630),
      d = new Dancer(s, 4800, 630);
    s.enemies = [a, b, d];
    a.startAttack();
    b.startAttack();
    a.st = b.st = 0.6;
    s.kit.clock = 1;
    a.step(0.01);
    b.step(0.01);
    assert.equal(b.state, "aim");
    assert.equal(s.attackTokens(), 0);
    d.startAttack();
    d.st = 0.45;
    d.step(0.01);
    assert.equal(d.state, "lunge");
    assert.equal(s.attackTokens(), 1);
    s.kit.clock = 1.6;
    b.step(0.01);
    assert.equal(s.kit.arrows.length, 2);
  }));

test("storm arrivals enter the arena before the full 0.6-second no-hitbox silhouette", () =>
  scene((s, h) => {
    s.zoneI = 1;
    s.zone = s.zones[1];
    s.bounds = { l: 1240, r: 2520 };
    s.camX = s.camMax = 1240;
    s.riley.x = 1800;
    s.kit._zone = 1;
    s.kit.storm.arm();
    s.kit.storm.phase = "gust";
    s.kit.storm.t = 4;
    const e = s.spawn("dancer", "L");
    const start = e.x;
    h.step();
    assert.ok(e.x > start);
    assert.equal(e.silhouette, 0);
    for (let i = 0; i < 120 && e.entering; i++) h.step();
    assert.equal(e.entering, false);
    h.step();
    assert.ok(e.silhouette > 0.55);
    assert.equal(e.canBeHit, false);
    for (let i = 0; i < 32; i++) {
      h.step();
      assert.equal(e.canBeHit, false);
    }
    for (let i = 0; i < 10; i++) h.step();
    assert.equal(e.silhouette, 0);
    assert.equal(e.canBeHit, true);
  }));

test("engine clamps production Shaido updates and ter? produces a valid pickup", () =>
  scene((s, h) => {
    const a = new Veiled(s, 3961, LANE_TOP),
      d = new Dancer(s, 5159, LANE_BOT);
    s.enemies = [a, d];
    s.riley.x = 4005;
    s.riley.y = LANE_BOT;
    d.setState("lunge");
    d.facing = 1;
    d.fromX = d.x;
    for (let i = 0; i < 120; i++) {
      h.step();
      for (const e of s.enemies) {
        assert.ok(e.x >= 3960 && e.x <= 5160);
        assert.ok(e.y >= LANE_TOP && e.y <= LANE_BOT);
      }
    }
    s.powerDrops = [{ kind: "ter?", t: 0 }];
    s.updatePowerDrops(0.01);
    assert.ok(
      s.pickups.some((p) =>
        ["lightning", "fireshield", "airwhip"].includes(p.kind),
      ),
    );
  }));

test("engine schedules and collects the ribbon, and kit destruction releases an uncollected light", () =>
  scene((s) => {
    s.powerDrops = [{ kind: "ribbon", t: 0 }];
    s.updatePowerDrops(0.01);
    const p = s.pickups.find((p) => p.kind === "ribbon");
    assert.ok(p);
    const score = s.riley.score;
    s.riley.x = p.x;
    s.riley.y = p.y;
    s.updatePickups(0.01);
    assert.equal(s.kit.ribbons, 1);
    assert.equal(s.riley.score, score + 1000);
    assert.equal(s.pickups.includes(p), false);
    s.kit.ribbonDropped = false;
    s.kit.dropRibbon();
    const rest = s.pickups.find((p) => p.kind === "ribbon");
    s.kit.destroy();
    assert.equal(s.pickups.includes(rest), false);
    assert.equal(rest.c.dead, true);
  }));

function label(text = "") {
  return {
    text,
    sets: 0,
    texture: { key: "loialPortrait" },
    setText(t) {
      this.text = t;
      this.sets++;
      return this;
    },
    setColor(c) {
      this.color = c;
      return this;
    },
    setTexture(k) {
      this.texture.key = k;
      this.sets++;
      return this;
    },
    setDisplaySize() {
      this.sets++;
      return this;
    },
    setAlpha() {
      return this;
    },
  };
}

test("HUD preserves charged/blocked and timer states, caches setters, and restores earlier-stage help", () =>
  scene((s) => {
    const hud = {
      loialT: label(),
      loialPic: label(),
      bossName: label(),
      bossPic: label(),
      titleStageT: label(),
      card: { list: [label("R calls Loial")] },
    };
    const unbind = bindStage7Hud(hud, s.kit);
    hud.updateLoialLabel(s, s.riley);
    assert.match(hud.loialT.text, /CHARGED/);
    assert.doesNotMatch(hud.loialT.text, /0\/10/);
    s.kit.call.charges = 0;
    s.kit.call.kos = 10;
    s.kit.call.since = 30;
    s.kit.clock += 1;
    hud.updateLoialLabel(s, s.riley);
    assert.match(hud.loialT.text, /WAIT 15s/);
    paintStage7Hud(hud, s);
    const sets = hud.bossPic.sets;
    for (let i = 0; i < 120; i++) paintStage7Hud(hud, s);
    assert.equal(hud.bossPic.sets, sets);
    assert.equal(hud.card.list[0].text, "R calls Moiraine / Lan");
    paintStage7Hud(hud, { stageNo: 1, titleSel: 1 });
    assert.equal(hud.card.list[0].text, "R calls Loial");
    unbind();
  }));

test("clear-card wrapper reports the actual 6→7 and 7→1 destinations", async () => {
  await installStage7Hud();
  for (const [stage, next] of [
    [6, 7],
    [7, 1],
  ])
    for (const touch of [false, true]) {
      const hud = Object.create(HUD.prototype);
      hud.stage = { stageDef: { next: () => ({ stage: next }) } };
      hud.game = { inp: { isTouch: touch } };
      const nodes = [];
      hud.card = {
        list: nodes,
        removeAll() {
          nodes.length = 0;
        },
        add(items) {
          nodes.push(...(Array.isArray(items) ? items : [items]));
        },
      };
      hud.add = {
        graphics: () => ({ fillStyle() {}, fillRect() {} }),
        text: (x, y, t) =>
          Object.assign(label(t), {
            setOrigin() {
              return this;
            },
          }),
      };
      hud.stageClear({ stage, score: 0, combo: 0, time: 0 });
      const verb = touch ? "TAP KICK" : "PRESS ATTACK";
      const line =
        stage === 7
          ? `${verb} TO RETURN TO THE TITLE`
          : `${verb} TO CONTINUE TO STAGE ${next}`;
      assert.ok(nodes.some((n) => n.text === line));
    }
});

test("columns flicker at 10% HP, moon light respects quality and all view lights release", () =>
  scene((s, h) => {
    const b = boss(s);
    b.hp = 60;
    b.phase = 3;
    const images = [];
    const old = s.add.image;
    s.add.image = (...args) => {
      const o = old(...args);
      images.push(o);
      return o;
    };
    s.kit.view.sync(s.kit);
    const cols = images.filter((o) => o.key === "s7column");
    assert.equal(cols.length, 5);
    const alpha = cols[0].alpha;
    s.kit.clock += 0.08;
    s.kit.view.sync(s.kit);
    assert.notEqual(cols[0].alpha, alpha);
    const before = h.resources().lights;
    s.kit.view.destroy();
    assert.ok(h.resources().lights < before);
  }));

test("portal cleanup happens once, not 120 times per second", () =>
  scene((s) => {
    s.zoneI = 0;
    s.kit._zone = 0;
    s.wave = 1;
    let clears = 0;
    s.kit.view.clearZone = () => clears++;
    for (let i = 0; i < 240; i++) s.kit.step(1 / 120);
    assert.equal(clears, 1);
  }));

test("fallback painting draws no text and Stage 7 decoded caps include final painted assets", () => {
  const old = document.createElement,
    text = [];
  document.createElement = () => {
    const c = canvas(),
      get = c.getContext;
    c.getContext = () => {
      const g = get();
      g.fillText = g.strokeText = (t) => text.push(t);
      return g;
    };
    return c;
  };
  try {
    const e = artFixture();
    paintStage7Art(e.s);
    assert.ok(e.made.size > 30);
    assert.deepEqual(text, []);
  } finally {
    if (old) document.createElement = old;
    else delete document.createElement;
  }
  const m = memory7();
  assert.ok(m.paintedBytes > 8 * 1024 * 1024);
  assert.ok(m.paintedBytes < m.paintedGateBytes);
  assert.ok(m.projectedPaintedPeakBytes < m.sourceGateBytes);
});

test("Stage 7 music has finite loop metadata regardless of registry evaluation order", () => {
  for (const id of ["stage7", "boss7"]) {
    assert.ok(Number.isFinite(MUSIC[id].loopStart));
    assert.ok(Number.isFinite(MUSIC[id].loopEnd));
    assert.ok(MUSIC[id].loopEnd > MUSIC[id].loopStart);
  }
});

test("shockwave is dodged by a real input jump begun 150 ms before contact", () => {
  for (const jump of [false, true])
    scene((s, h) => {
      const b = boss(s);
      b.x = 4680;
      b.bashAt = b.channelAt = 99;
      s.kit.notes.next = 99;
      s.kit.arena.wave(b);
      for (let i = 0; i < 9; i++) h.step();
      if (jump) s.inp.press("jump");
      let airborne = false;
      for (let i = 0; i < 25; i++) {
        h.step();
        airborne ||= s.riley.z > 30;
      }
      assert.equal(s.riley.hp, jump ? 100 : 84);
      if (jump) assert.equal(airborne, true);
      else assert.equal(s.riley.state, "down");
    });
});

test("six Shaido contend for two tokens and preserve shared arrow spacing in a running scene", () =>
  scene((s, h) => {
    s.enemies = [
      new Dancer(s, 4300, 630),
      new Dancer(s, 4700, 630),
      ...Array.from(
        { length: 4 },
        (_, i) => new Veiled(s, 4000 + i * 300, 630),
      ),
    ];
    for (const e of s.enemies) e.cool = 0;
    const times = [],
      fire = s.kit.fireArrow.bind(s.kit);
    s.kit.fireArrow = (e) => {
      times.push(s.kit.clock);
      fire(e);
    };
    for (let i = 0; i < 360; i++) {
      h.step();
      assert.ok(s.attackTokens() <= 2);
    }
    assert.ok(times.length >= 2);
    for (let i = 1; i < times.length; i++)
      assert.ok(times[i] - times[i - 1] >= 0.6 - 1e-9);
  }));

test("a fallback Fade is released before Stage 6 can load its painted sheet", () => {
  let removed = 0;
  const s = {
    textures: {
      exists: (key) => key === "s6fade",
      get: () => ({ source: [{ isCanvas: true }] }),
      remove() {
        removed++;
      },
    },
  };
  releaseStage7(s, 6);
  assert.equal(removed, 1);
  s.textures.get = () => ({ source: [{ isCanvas: false }] });
  releaseStage7(s, 6);
  assert.equal(removed, 1);
});

test("backdrop layout only runs on residency or pending-load changes", () =>
  scene((s) => {
    const k = s.kit;
    let layouts = 0;
    k.backdrops = {
      sync() {
        layouts++;
      },
    };
    for (let i = 0; i < 120; i++) k.update(1 / 120);
    assert.equal(layouts, 1);
    k.pendingArt = new Map([["s7asmo", {}]]);
    k.update(1 / 120);
    assert.equal(layouts, 2);
    k.pendingArt.clear();
    k.update(1 / 120);
    assert.equal(layouts, 3);
    s.zoneI = 2;
    k.update(1 / 120);
    assert.equal(layouts, 4);
  }));
