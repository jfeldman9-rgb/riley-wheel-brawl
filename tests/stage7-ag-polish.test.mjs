// Antigravity Stage 7 polish: Asmodean telegraphs, hit reactions, stagger
// readability, overlay placement for the 1.8x boss, and contact damage fairness.
import test from "node:test";
import assert from "node:assert/strict";
import { stage7Simulation, withSeed, FULL_STAGE_SEEDS } from "./helpers/stage7-harness.mjs";
import { Asmodean, ASMODEAN, ASMO_FX } from "../src/asmodean.js";
import { createStage7View } from "../src/stage7-view.js";
import { Stage7Kit } from "../src/stage7.js";

function spriteFixture() {
  const made = [];
  function visual(x, y, key) {
    const o = { x, y, key, frame: 0, dead: false, tint: null, fill: false, angle: 0, alpha: 1 };
    const api = new Proxy(o, {
      get(t, p) {
        if (p in t && typeof t[p] !== "undefined" && !["setTint", "clearTint"].includes(p)) return t[p];
        return (...a) => {
          if (p === "setPosition") { t.x = a[0]; t.y = a[1]; }
          if (p === "setDisplaySize") { t.w = a[0]; t.h = a[1]; }
          if (p === "setFrame") t.frame = a[0];
          if (p === "setScale") t.scale = a[0];
          if (p === "setDepth") t.depth = a[0];
          if (p === "setAlpha") t.alpha = a[0];
          if (p === "setAngle") t.angle = a[0];
          if (p === "setTint") { t.tint = a[0]; t.fill = false; }
          if (p === "setTintFill") { t.tint = a[0]; t.fill = true; }
          if (p === "clearTint") { t.tint = null; t.fill = false; }
          if (p === "destroy") t.dead = true;
          return api;
        };
      },
    });
    made.push(o);
    return api;
  }
  const s = {
    textures: { exists: () => true, get: () => ({ source: [{ isCanvas: false }] }) },
    add: { image: visual, sprite: visual, tileSprite: visual },
    metas: {}, zoneI: 3, wave: 1, enemies: [], camX: 3920,
    bounds: { l: 3920, r: 5200 }, riley: { x: 4600, y: 630 },
  };
  s.kit = new Stage7Kit(s);
  return { s, made };
}
const live = (made, key, id) => made.filter((o) => o.key === key && !o.dead && (!id || o.id === id));

test("bash wind-up holds bash1, shows bash2 in the parry window and bash3 only on the strike", () => {
  const { s } = spriteFixture();
  const b = new Asmodean(s, 4800, 630);
  b.setState("attack");
  for (const [st, frame] of [[0, 9], [0.25, 9], [0.49, 9], [0.55, 10], [0.69, 10], [0.7, 11], [1, 11]]) {
    b.st = st;
    b.sync();
    assert.equal(b.sprite.frame, frame, `st=${st}`);
  }
  b.destroy();
});

test("bash tell tints and flickers, holds gold for the parry window, and clears after", () => {
  const { s } = spriteFixture();
  const b = new Asmodean(s, 4800, 630);
  b.setState("attack");
  const tints = new Set();
  for (let st = 0; st < ASMODEAN.bashTell - ASMODEAN.parry; st += 0.02) {
    b.st = st;
    b.sync();
    tints.add(b.sprite.tint);
  }
  assert.ok(tints.has(ASMO_FX.tell), "warm tell tint shows");
  assert.ok(tints.has(0xffffff), "tell flickers");
  b.st = ASMODEAN.bashTell - 0.05;
  b.sync();
  assert.equal(b.sprite.tint, ASMO_FX.parry);
  b.st = ASMODEAN.bashTell + 0.1;
  b.sync();
  assert.equal(b.sprite.tint, null);
  b.destroy();
});

test("a landed hit flashes white and flinches away from Riley without cancelling the bash", () => {
  const { s } = spriteFixture();
  const b = new Asmodean(s, 4800, 630);
  b.face(-1);
  assert.equal(b.takeHit({ dmg: 10 }, { x: 4700 }), true);
  b.sync();
  assert.equal(b.sprite.fill, true);
  assert.equal(b.sprite.tint, ASMO_FX.hit);
  assert.equal(b.sprite.frame, 14, "hurt pose while idle");
  assert.ok(b.sprite.x > b.x, "flinches away from the hit");
  assert.equal(b.state, "idle", "logical state is unchanged");
  b.update(0.2);
  b.sync();
  assert.equal(b.sprite.fill, false);
  assert.equal(b.sprite.x, b.x);
  b.setState("attack");
  b.st = 0.2;
  b.takeHit({ dmg: 10 }, { x: 4700 });
  b.sync();
  assert.equal(b.state, "attack");
  assert.equal(b.sprite.frame, 9, "wind-up pose survives the hit");
  assert.equal(b.sprite.fill, false, "the tell keeps priority over the white flash");
  assert.equal(b.sprite.tint, ASMO_FX.tell);
  assert.notEqual(b.sprite.x, b.x, "the hit still flinches");
  b.counterUsed = true;
  b.st = 0.6;
  b.takeHit({ dmg: 4 }, { x: 4700 });
  b.sync();
  assert.equal(b.state, "attack");
  assert.equal(b.sprite.tint, ASMO_FX.parry);
  assert.equal(b.sprite.fill, false);
  b.destroy();
});

test("view: bash shows a danger lane over the real reach and a marker above his head", () => {
  const { s, made } = spriteFixture();
  const view = createStage7View(s);
  const b = { id: 7, type: "asmodean", alive: true, entering: false, state: "attack", st: 0.3,
    x: 4800, y: 630, facing: -1, hp: 500, maxHp: 600 };
  s.enemies = [b];
  s.boss = b;
  view.sync(s.kit);
  const lane = live(made, "s7streak").find((o) => o.h === 80);
  assert.ok(lane, "lane drawn");
  assert.equal(lane.x, b.x - ASMODEAN.reach, "lane covers the facing side");
  assert.equal(lane.w, ASMODEAN.reach + 40, "lane includes the 40px slack behind him");
  assert.equal(lane.y, b.y - 40);
  const marker = live(made, "s7note")[0];
  assert.ok(marker.y + marker.h < b.y - 280, `marker above head (${marker.y})`);
  b.st = 0.42;
  view.sync(s.kit);
  const ready = live(made, "s7streak").find((o) => o.h === 92);
  assert.ok(ready, "get-ready outline before the parry window");
  assert.equal(ready.tint, 0xffd27a);
  b.st = ASMODEAN.bashTell + 0.05;
  view.sync(s.kit);
  assert.equal(live(made, "s7note").length, 0, "marker gone once the bash resolves");
  assert.equal(lane.tint, 0xffffff, "strike flash");
  assert.ok(lane.alpha > 0, "flash is still up just after the hit");
  b.st = ASMODEAN.bashTell + 0.1;
  view.sync(s.kit);
  assert.equal(lane.alpha, 0, "white flash ends just after st=0.7");
  b.facing = 1;
  b.st = 0.3;
  view.sync(s.kit);
  const right = live(made, "s7streak").find((o) => o.h === 80);
  assert.equal(right.x, b.x - 40, "facing right starts at x0-40*facing");
  assert.equal(right.w, ASMODEAN.reach + 40);
  view.destroy();
});

test("view: stagger shows orbiting stun stars above the boss; cast bar and outro shield clear his head", () => {
  const { s, made } = spriteFixture();
  const view = createStage7View(s);
  const b = { id: 7, type: "asmodean", alive: true, state: "stagger", st: 0.4,
    x: 4800, y: 630, facing: -1, hp: 500, maxHp: 600 };
  s.boss = b;
  view.sync(s.kit);
  const stars = live(made, "flake");
  assert.equal(stars.length, 4);
  for (const st of stars) assert.ok(st.y < b.y - 250, `star y=${st.y}`);
  b.state = "idle";
  view.sync(s.kit);
  assert.equal(live(made, "flake").length, 0);
  b.state = "channel";
  b.st = 0.5;
  view.sync(s.kit);
  for (const bar of live(made, "s7streak")) assert.ok(bar.y <= b.y - 300, `cast bar y=${bar.y}`);
  view.destroy();
});

test("a skipped parry window still paints gold for one rendered frame", () => {
  const { s, made } = spriteFixture();
  const view = createStage7View(s);
  const b = new Asmodean(s, 4800, 630);
  s.riley.alive = true;
  s.riley.x = b.x - 400;
  s.enemies = [b];
  s.boss = b;
  b.setState("attack");
  b.update(0.8);
  assert.ok(b.st >= ASMODEAN.bashTell);
  assert.equal(b.parryCue, 1);
  b.sync();
  view.sync(s.kit);
  assert.equal(b.sprite.tint, ASMO_FX.parry);
  assert.equal(b.sprite.fill, false);
  const lane = live(made, "s7streak").find((o) => o.h === 80);
  assert.equal(lane.tint, 0xffd27a);
  b.update(0.05);
  b.sync();
  view.sync(s.kit);
  assert.notEqual(b.sprite.tint, ASMO_FX.parry);
  view.destroy();
  b.destroy();
});

test("reduced motion freezes stun stars and caches the media query", () => {
  const { s, made } = spriteFixture();
  const saved = globalThis.matchMedia;
  let queries = 0;
  globalThis.matchMedia = (query) => {
    queries++;
    return { matches: true, media: query };
  };
  try {
    const view = createStage7View(s);
    const b = { id: 7, type: "asmodean", alive: true, state: "stagger", st: 0.2,
      x: 4800, y: 630, facing: -1, hp: 500, maxHp: 600 };
    s.boss = b;
    view.sync(s.kit);
    const first = live(made, "flake").map((o) => [o.x, o.y, o.w]);
    assert.equal(first.length, 4);
    assert.equal(queries, 1);
    b.st = 1.7;
    view.sync(s.kit);
    const second = live(made, "flake").map((o) => [o.x, o.y, o.w]);
    assert.deepEqual(second, first);
    assert.equal(queries, 1, "matchMedia stays cached");
    view.destroy();
  } finally {
    globalThis.matchMedia = saved;
  }
});

function liveBoss(seed, fn) {
  return withSeed(seed, () => {
    const h = stage7Simulation({ mode: false }), s = h.s;
    try {
      h.setController(null);
      s.pending = [];
      s.enemies = [];
      s.zoneI = s.kit._zone = 3;
      s.zone = s.zones[3];
      s.locked = true;
      s.camX = s.camMax = 3920;
      s.bounds = { l: 3920, r: 5200 };
      s.riley.x = 4900;
      s.riley.inv = 0;
      s.startBoss();
      for (let i = 0; i < 50 && !s.boss; i++) h.step(0.1);
      const b = s.boss;
      b.entering = false;
      b.x = 4800;
      b.y = 630;
      return fn(s, h, b);
    } finally {
      h.destroy();
    }
  });
}

for (const dt of [0.05, 0.1, 0.35])
  test(`live: a 3-hit channel break staggers for the full 1.4 s at dt=${dt}`, () =>
    liveBoss(1, (s, h, b) => {
      b.phase = 3; b.hp = 190; b.bashAt = Infinity;
      s.kit.notes.next = Infinity;
      s.riley.x = 4300;
      b.startChannel();
      for (let i = 0; i < 3; i++) b.takeHit({ dmg: 1 }, s.riley);
      assert.equal(b.state, "stagger");
      assert.ok(b.breakFlash > 0);
      let t = 0;
      while (b.state === "stagger" && t < 3) { h.step(dt); t += dt; }
      assert.ok(t >= ASMODEAN.stun - 0.06 && t <= ASMODEAN.stun + dt + 0.05, `stagger lasted ${t}`);
      assert.equal(b.sprite.angle ?? 0, 0, "wobble resets after stagger");
    }));

test("fairness: 3 s standing next to Asmodean costs a noticeable but survivable amount (all seeds, all phases)", () => {
  for (const seed of FULL_STAGE_SEEDS)
    for (const phase of [1, 2, 3])
      liveBoss(seed, (s, h, b) => {
        const r = s.riley;
        for (let p = 1; p < phase; p++) { b.takeHit({ dmg: 1000 }); b.beat = b.invuln = false; }
        b.clock = 10;
        b.bashAt = 0;
        b.channelAt = phase === 3 ? 10.8 : Infinity;
        s.kit.notes.next = 0;
        s.kit.notes.clock = 0;
        s.kit.arena.t = phase === 2 ? 3.1 : 0;
        const lives = r.lives, start = r.hp;
        let last = r.hp, lastAt = -1;
        for (let i = 0; i < 30; i++) {
          r.x = b.x - 62; r.y = b.y; r.z = r.vz = 0;
          h.step(0.1);
          if (r.hp < last) {
            assert.ok(last - r.hp <= 12, `seed ${seed} phase ${phase}: hit ${last - r.hp}`);
            if (lastAt >= 0) assert.ok(s.kit.combatClock - lastAt >= 0.5 - 1e-6);
            lastAt = s.kit.combatClock;
          }
          last = r.hp;
        }
        const lost = start - r.hp;
        assert.ok(lost >= 12 && lost <= 40, `seed ${seed} phase ${phase}: lost ${lost}`);
        assert.equal(r.lives, lives);
        assert.ok(r.alive);
      });
});
