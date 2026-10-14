import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { stage7Simulation, withSeed } from "./helpers/stage7-harness.mjs";
import { Dancer, Veiled } from "../src/shaido.js";
import { Asmodean } from "../src/asmodean.js";
import { callMoilan, stepStrike7 } from "../src/stage7-lifecycle.js";
import { strikeRiley } from "../src/stage6-hurt.js";
import { demand7 } from "../src/stage7-load.js";
import { createStage7View } from "../src/stage7-view.js";
import { STAGE7_PHONE_CSS, placeKnob } from "../src/stage7-phone.js";
import { paintedScale } from "../src/stage7-fighter.js";

function scene(fn) {
  return withSeed(1, () => {
    const h = stage7Simulation({ mode: null }),
      s = h.s;
    h.setController(null);
    s.started = true;
    s.locked = true;
    s.zoneI = 3;
    s.zone = s.zones[3];
    s.bounds = { l: 3920, r: 5200 };
    s.camX = 3920;
    s.riley.x = 4500;
    s.riley.y = 630;
    s.riley.facing = 1;
    s.riley.inv = 0;
    s.riley.alive = true;
    s.enemies = [];
    try {
      return fn(s, h);
    } finally {
      h.destroy();
    }
  });
}

test("stage 7 grab reaches a hit Shaido outside the stage 1 window", () =>
  scene((s) => {
    const e = new Dancer(s, 4650, 630);
    e.cool = 0;
    e.entering = false;
    s.enemies = [e];
    assert.equal(s.grabCandidate(s.riley), null);
    e.takeHit({ dmg: 1 });
    e.cool = 9;
    assert.equal(s.grabCandidate(s.riley), e);
    for (let i = 0; i < 20; i++) e.update(0.05);
    e.cool = 0;
    assert.notEqual(e.state, "hurt");
    assert.ok(e.grabOpen > 0);
    assert.equal(s.grabCandidate(s.riley), e);
  }));

test("Moiraine's call shields Riley and the Trollocs it hits die", () =>
  scene((s) => {
    s.zoneI = 0;
    s.camX = 4000;
    const grunts = [];
    for (let i = 0; i < 3; i++) {
      const e = s.spawn("grunt", "R");
      e.entering = false;
      e.x = 4300 + i * 30;
      e.y = 630;
      e.silhouette = 0;
      e.z = 0;
      grunts.push(e);
    }
    const hp = s.riley.hp;
    assert.equal(callMoilan(s.kit), true);
    assert.equal(s.kit.strike.helper, "moiraine");
    assert.ok(s.riley.inv > 0);
    assert.equal(s.riley.takeHit({ dmg: 30 }, null), false);
    assert.equal(s.riley.hp, hp);
    stepStrike7(s.kit, 0.7);
    assert.ok(grunts.every((e) => e.alive === false));
  }));

test("Asmodean at 0 HP is bound at once and does not keep walking", () =>
  scene((s) => {
    const b = new Asmodean(s, 4800, 630);
    s.enemies = [b];
    b.phase = 3;
    b.hp = 12;
    b.startChannel();
    const x = b.x;
    b.takeHit({ dmg: 40 });
    assert.equal(b.alive, false);
    assert.equal(b.hp, 0);
    assert.equal(b.state, "bound");
    b.step(1.2);
    assert.equal(b.state, "bound");
    assert.equal(b.x, x);
  }));

test("a lethal Stage 7 hazard leaves Riley down for the game-over card", () =>
  scene((s) => {
    s.riley.hp = 10;
    s.riley.state = "idle";
    assert.equal(strikeRiley(s, 40), true);
    assert.equal(s.riley.alive, false);
    assert.equal(s.riley.state, "down");
  }));

test("a second pause or start in the same gesture does not also toggle pause", () =>
  scene((s) => {
    const cut = {
      n: 0,
      press() {
        this.n++;
        s.cutscene = null;
      },
    };
    s.cutscene = cut;
    s.pauseReasons = new Set(["cutscene"]);
    s.onPress("pause");
    s.onPress("start");
    assert.equal(cut.n, 1);
    assert.equal(s.pauseReasons.has("manual"), false);
    s.started = true;
    s.ended = false;
    s.gameOver = false;
    s.kit.echo = performance.now() - 400;
    s.onPress("pause");
    assert.equal(s.pauseReasons.has("manual"), true);
    s.onPress("pause");
    assert.equal(s.pauseReasons.has("manual"), true);
    s.kit.echo = performance.now() - 400;
    s.onPress("pause");
    assert.equal(s.pauseReasons.has("manual"), false);
  }));

test("the first column crack waits 3.2s into phase 2", () =>
  scene((s) => {
    const b = new Asmodean(s, 4800, 630);
    s.boss = b;
    s.enemies = [b];
    s.kit.arena.t = 9;
    s.kit.arena.next = 1;
    b.phase = 1;
    s.kit.onAsmodeanPhase(b, 2);
    assert.equal(s.kit.arena.t, 0);
    assert.equal(s.kit.arena.next, 3.2);
    assert.equal(s.kit.arena.rain, null);
    b.phase = 2;
    b.beat = false;
    b.entering = false;
    for (let i = 0; i < 30; i++) s.kit.arena.step(0.1, s, b);
    assert.equal(s.kit.arena.rain, null);
    s.kit.arena.step(0.25, s, b);
    assert.ok(s.kit.arena.rain);
  }));

test("storm captions are said once", () =>
  scene((s) => {
    const st = { dir: 1, gusts: 1 };
    s.kit.stormTell(st);
    s.kit.stormTell(st);
    s.kit.stormTell({ dir: -1, gusts: 4 });
    assert.equal(s.kit.saidLines.size, 1);
  }));

test("Shaido name the enemy plate and stand nearer Riley's height", () =>
  scene((s) => {
    const d = new Dancer(s, 100, 630);
    const v = new Veiled(s, 140, 630);
    assert.equal(d.name, "SHAIDO SPEAR-DANCER");
    assert.equal(v.name, "SHAIDO ARCHER");
    assert.ok(paintedScale("s7dancer") > 1);
    assert.ok(paintedScale("s7asmo") > 1);
    assert.ok(paintedScale("s7veiled") >= 1);
  }));

test("the clear lineup keeps Riley and the helpers inside the camera", () =>
  scene((s) => {
    s.boss = { x: 5150, y: 630, vx: 40, alive: false };
    s.riley.x = 5120;
    s.kit.beginOutro();
    assert.ok(s.riley.x <= s.camX + 1280 - 380);
    assert.ok(s.boss.x <= s.camX + 1280 - 300);
    assert.ok(s.riley.x >= s.camX + 220);
  }));

test("phone CSS centers the canvas, hides touch during story, and the knob moves", () => {
  assert.match(STAGE7_PHONE_CSS, /margin-top:\s*0 !important/);
  assert.match(STAGE7_PHONE_CSS, /s7-story #touch/);
  assert.match(STAGE7_PHONE_CSS, /orientation:\s*portrait/);
  const knob = { offsetWidth: 40, offsetHeight: 40, style: {} };
  const stick = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
  };
  const mid = placeKnob(stick, knob, 50, 50);
  const right = placeKnob(stick, knob, 90, 50);
  assert.ok(right.left > mid.left);
  assert.match(knob.style.left, /px/);
  assert.equal(knob.style.transform, "none");
});

test("columns keep their aspect, glow on a tell, and dust drops out at quality 2", () => {
  const made = [];
  const visual = (x, y, key) => {
    const o = { key, frame: 0, dead: false, x, y };
    const api = new Proxy(o, {
      get(t, p) {
        if (p in t) return t[p];
        return (...args) => {
          if (p === "setDisplaySize") {
            t.w = args[0];
            t.h = args[1];
          }
          if (p === "setFrame") t.frame = args[0];
          if (p === "setPosition") {
            t.x = args[0];
            t.y = args[1];
          }
          return api;
        };
      },
    });
    made.push(o);
    return api;
  };
  const s = {
    textures: { exists: () => false },
    add: { image: visual, tileSprite: visual },
    zoneI: 3,
    enemies: [],
    camX: 3920,
    boss: { alive: true, hp: 500, maxHp: 600, x: 4800, y: 630, state: "idle" },
  };
  const view = createStage7View(s);
  const k = {
    quality: 0,
    clock: 1,
    cleared: new Set(),
    storm: { phase: "idle" },
    street: {},
    notes: { notes: [{ x: 4500, y: 630, gold: true, age: 0 }], tells: () => [] },
    arrows: [],
    arena: { rain: { x: 4050, phase: "tell" } },
    outro: false,
  };
  view.sync(k);
  const col = made.find((o) => o.key === "s7column");
  assert.ok(col && col.h > 0);
  assert.ok(Math.abs(col.w / col.h - 128 / 448) < 0.02, `${col.w}x${col.h}`);
  assert.equal(col.frame, 1);
  const note = made.find((o) => o.key === "s7note");
  assert.equal(note.frame, 2);
  s.zoneI = 1;
  k.storm.phase = "gust";
  k.quality = 2;
  view.sync(k);
  assert.equal(
    made.some((o) => o.key === "s7dust" && !o.dead),
    false,
  );
  view.destroy();
});

test("helper art is not queued twice", () => {
  const queued = [];
  const s = { textures: { exists: () => false } };
  const load = new EventEmitter();
  Object.assign(load, {
    atlas: (key) => queued.push(key),
    image: (key) => queued.push(key),
    spritesheet: (key) => queued.push(key),
    json() {},
    isLoading: () => true,
    start() {},
    list: new Set(),
    inflight: new Set(),
    queue: new Set(),
  });
  s.load = load;
  const k = {
    s,
    destroyed: false,
    cleanups: [],
    pendingArt: new Map(),
    artRoot: { setTimeout: () => 1, clearTimeout() {} },
  };
  demand7(k, ["s7moir", "s7lan", "s7earth", "s7shield"]);
  demand7(k, ["s7moir", "s7lan", "s7earth", "s7shield"]);
  k.pendingArt.clear();
  demand7(k, ["s7moir", "s7lan", "s7earth", "s7shield"]);
  assert.deepEqual(queued, ["s7moir", "s7lan", "s7earth", "s7shield"]);
  for (const fn of k.cleanups) fn();
});
