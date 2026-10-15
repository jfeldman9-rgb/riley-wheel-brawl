// Antigravity Stage 7 polish: Asmodean telegraphs, hit reactions, stagger
// readability, overlay placement for the 1.8x boss, and contact damage fairness.
import test from "node:test";
import assert from "node:assert/strict";
import { stage7Simulation, withSeed, FULL_STAGE_SEEDS } from "./helpers/stage7-harness.mjs";
import { Asmodean, ASMODEAN, ASMO_FX, bashLane } from "../src/asmodean.js";
import { createStage7View, BASH_TEXTURES } from "../src/stage7-view.js";
import { Stage7Kit } from "../src/stage7.js";
import { q } from "../src/config.js";

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
          if (p === "setBlendMode") t.blend = a[0];
          if (p === "setTint") t.tint = a[0];
          if (p === "setTintMode") t.fill = a[0] === 1;
          if (p === "setTintFill") assert.fail("Phaser 4 removed setTintFill; use setTintMode(FILL)");
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
  assert.equal(b.sprite.tint, ASMO_FX.tell, "a consumed counter cannot advertise a parry");
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
  const lane = live(made, BASH_TEXTURES.lane)[0];
  assert.ok(lane, "lane drawn");
  assert.equal(lane.x, b.x - ASMODEAN.reach, "lane covers the facing side");
  assert.equal(lane.w, ASMODEAN.reach + 40, "lane includes the 40px slack behind him");
  assert.equal(lane.y, b.y - 40);
  const marker = live(made, "s7note")[0];
  assert.ok(marker.y + marker.h < b.y - 280, `marker above head (${marker.y})`);
  b.st = 0.42;
  view.sync(s.kit);
  const ready = live(made, BASH_TEXTURES.lane).find((o) => o.depth === 961);
  assert.ok(ready, "warm get-ready glow before the parry window");
  assert.equal(ready.tint, ASMO_FX.tell);
  b.st = ASMODEAN.bashTell + 0.05;
  view.sync(s.kit);
  assert.equal(live(made, "s7note").length, 0, "marker gone once the bash resolves");
  assert.equal(lane.tint, ASMO_FX.parry, "warm floor at impact; white flash belongs on the actor");
  assert.ok(lane.alpha > 0, "flash is still up just after the hit");
  b.st = ASMODEAN.bashTell + 0.1;
  view.sync(s.kit);
  assert.ok(lane.alpha > 0 && lane.alpha <= ASMO_FX.floorAlpha, "floor wash stays translucent at 10 fps");
  b.st = ASMODEAN.bashTell + ASMODEAN.bashFlash + 0.01;
  view.sync(s.kit);
  assert.equal(lane.alpha, 0, "floor glow ends after its configured duration");
  b.facing = 1;
  b.st = 0.3;
  view.sync(s.kit);
  const right = live(made, BASH_TEXTURES.lane)[0];
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

for (const dt of [0.05, 0.1, 0.35])
  test(`a frame crossing impact shows white, never late parry gold, dt=${dt}`, () => {
    const { s, made } = spriteFixture();
    const view = createStage7View(s);
    const b = new Asmodean(s, 4800, 630);
    s.riley.alive = true;
    s.riley.x = b.x - 400;
    s.enemies = [b]; s.boss = b;
    b.setState("attack");
    b.st = ASMODEAN.bashTell - dt * 0.6;
    b.update(dt);
    assert.ok(b.st >= ASMODEAN.bashTell);
    assert.equal(b.counterUsed, true);
    b.sync(); view.sync(s.kit);
    assert.equal(b.parryCue, undefined);
    assert.equal(b.parryCueSeen, undefined, "vestigial renderer handshake removed");
    assert.equal(b.sprite.tint, ASMO_FX.hit);
    assert.equal(b.sprite.fill, true, "white flash fills the actor silhouette");
    const lane = live(made, BASH_TEXTURES.lane)[0];
    assert.equal(lane.tint, ASMO_FX.parry);
    assert.ok(lane.alpha >= 0 && lane.alpha <= ASMO_FX.floorAlpha);
    const burst = live(made, BASH_TEXTURES.impact)[0];
    assert.ok(burst.alpha > 0.4, `visible impact burst: ${burst.alpha}`);
    assert.equal(burst.blend, "ADD");
    assert.equal(live(made, "s7note").length, 0);
    view.destroy(); b.destroy();
  });

test("parry uses only the live window, and the soft lane uses shared geometry", () => {
  const { s, made } = spriteFixture();
  const view = createStage7View(s);
  const b = new Asmodean(s, 4800, 630);
  s.enemies = [b]; s.boss = b;
  b.setState("attack"); b.st = ASMODEAN.bashTell - ASMODEAN.parry / 2;
  for (const facing of [-1, 1]) {
    b.face(facing); view.sync(s.kit);
    const lane = live(made, BASH_TEXTURES.lane)[0], rect = bashLane(b);
    assert.deepEqual({x:lane.x,y:lane.y,w:lane.w,h:lane.h}, rect);
    assert.equal(lane.tint, ASMO_FX.parry);
    assert.ok(lane.alpha > 0 && lane.alpha <= ASMO_FX.floorAlpha);
  }
  assert.equal(b.parryCueSeen, undefined, "view has no gameplay cue state");
  b.sync();
  assert.equal(b.parryCueSeen, undefined);
  assert.equal(b.sprite.tint, ASMO_FX.parry);
  b.counterUsed = true;
  b.sync(); view.sync(s.kit);
  assert.notEqual(b.sprite.tint, ASMO_FX.parry);
  assert.equal(live(made, "s7note").length, 0, "consumed counter cannot show a parry marker");
  view.destroy(); b.destroy();
});

test("10 fps: impact flash survives the next 100 ms rendered frame", () => {
  const { s, made } = spriteFixture();
  const view = createStage7View(s);
  const b = new Asmodean(s, 4800, 630);
  s.riley.alive = true; s.riley.x = b.x - 400;
  s.enemies = [b]; s.boss = b;
  b.setState("attack"); b.st = ASMODEAN.bashTell - 0.09;
  for (let i = 0; i < 2; i++) {
    b.update(0.1); b.sync(); view.sync(s.kit);
    assert.equal(b.sprite.tint, ASMO_FX.hit);
    assert.equal(b.sprite.fill, true);
    const burst = live(made, BASH_TEXTURES.impact)[0];
    assert.ok(burst.alpha > 0.4);
    assert.equal(burst.blend, "ADD");
  }
  b.update(0.1); b.sync(); view.sync(s.kit);
  assert.equal(live(made, BASH_TEXTURES.impact).length, 0);
  assert.equal(b.sprite.fill, false);
  assert.equal(live(made, BASH_TEXTURES.lane)[0].alpha, 0);
  view.destroy(); b.destroy();
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

for (const mode of ['normal', 'media', 'flash=0'])
  test(`channel break shake and hit flinch respect calm7: ${mode}`, () => {
    const { s } = spriteFixture();
    const savedMedia = globalThis.matchMedia, savedFlash = q.get('flash');
    globalThis.matchMedia = () => ({ matches: mode === 'media' });
    q.set('flash', mode === 'flash=0' ? '0' : '1');
    const b = new Asmodean(s, 4800, 630);
    s.fx = { trauma: 0 };
    try {
      b.sync();
      const idleFrame = b.sprite.frame;
      b.takeHit({ dmg: 1 }, { x: b.x - 100 }); b.sync();
      if (mode === 'normal') assert.notEqual(b.sprite.frame, idleFrame);
      else assert.equal(b.sprite.frame, idleFrame, 'calm mode also skips the hurt pose flinch');
      b.phase = 3; b.hp = 190; b.startChannel();
      for (let i = 0; i < ASMODEAN.hits; i++) b.takeHit({ dmg: 1 }, { x: b.x - 100 });
      b.sync();
      assert.equal(b.state, 'stagger');
      assert.equal(b.breakFlash, ASMO_FX.breakFlash, 'static feedback remains');
      assert.equal(s.fx.trauma, mode === 'normal' ? 0.45 : 0);
      assert.equal(b.sprite.x, mode === 'normal' ? b.x + ASMO_FX.flinch : b.x);
    } finally {
      b.destroy(); globalThis.matchMedia = savedMedia;
      savedFlash === null ? q.delete('flash') : q.set('flash', savedFlash);
    }
  });

// The phone scales the same 1280x720 play area. Clipping the unreachable
// underside must neither enlarge nor shrink the damage set on Riley's floor.
test("phone and desktop: soft lane stays inside canvas and equals damage everywhere Riley can stand", () =>
  liveBoss(1, (s, h, b) => {
    const { made, s: renderScene } = spriteFixture();
    renderScene.enemies = [b]; renderScene.boss = b;
    const view = createStage7View(renderScene), r = s.riley;
    Object.assign(r, { x: s.bounds.l - 100, y: 0 }); r.physics(0);
    assert.equal(r.x, s.bounds.l + 40); assert.equal(r.y, 572);
    Object.assign(r, { x: s.bounds.r + 100, y: 1000 }); r.physics(0);
    assert.equal(r.x, s.bounds.r - 40); assert.equal(r.y, 690);
    for (const bossY of [572, 600, 630, 680, 690]) for (const facing of [-1, 1]) {
      b.y = bossY; b.face(facing); b.setState("attack");
      const rect = bashLane(b);
      view.sync(renderScene.kit);
      const lane = live(made, BASH_TEXTURES.lane)[0];
      assert.deepEqual({ x: lane.x, y: lane.y, w: lane.w, h: lane.h }, rect);
      for (const width of [390, 1280]) {
        const scale = width / 1280;
        assert.ok(lane.y * scale >= 0);
        assert.ok((lane.y + lane.h) * scale <= (720 - ASMO_FX.floorInset) * scale);
      }
      for (let y = 572; y <= 690; y++) {
        for (const x of [rect.x - 1, rect.x, rect.x + 1, b.x,
          rect.x + rect.w - 1, rect.x + rect.w, rect.x + rect.w + 1]) {
          b.setState("attack"); b.counterUsed = false;
          Object.assign(r, { x, y, z: 0, inv: 0, hp: 100 });
          r.setState("idle", "idle"); s.kit.damageUntil = 0;
          b.step(ASMODEAN.bashTell);
          const inOriginal = x > rect.x && x < rect.x + rect.w && Math.abs(y - bossY) < 40;
          const inDrawn = x > lane.x && x < lane.x + lane.w && y > lane.y && y < lane.y + lane.h;
          assert.equal(inDrawn, inOriginal, `reachable footprint ${JSON.stringify({ bossY, facing, x, y })}`);
          assert.equal(r.hp, inDrawn ? 100 - ASMODEAN.bashDmg : 100);
        }
      }
    }
    view.destroy();
  }));

test("floor and burst masks are generated once, feathered inside their full extents, and reused on restart", () => {
  const { s } = spriteFixture(), textures = new Map();
  let rays = 0, stops = 0;
  s.textures = {
    exists: key => textures.has(key),
    createCanvas(key, w, h) {
      assert.equal(textures.has(key), false, "never reuse an occupied texture key");
      const ctx = {
        createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
        putImageData(pixels) { this.pixels = pixels; },
        createRadialGradient: () => ({ addColorStop() { stops++; } }),
        fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() { rays++; },
      };
      const tex = { w, h, ctx, refreshes: 0, getContext: () => ctx, refresh() { this.refreshes++; } };
      textures.set(key, tex); return tex;
    },
  };
  const first = createStage7View(s);
  assert.equal(textures.size, 2);
  const floor = textures.get(BASH_TEXTURES.lane), pixels = floor.ctx.pixels.data;
  const alpha = (x, y) => pixels[(y * 128 + x) * 4 + 3];
  assert.ok(alpha(64, 24) > 150);
  for (const [x, y] of [[0, 24], [127, 24], [64, 0], [64, 47], [0, 0], [127, 47]]) {
    assert.ok(alpha(x, y) > 0, "mask covers the full rectangle");
    assert.ok(alpha(x, y) < alpha(64, 24) / 4, "feathered edges and corners");
  }
  assert.equal(rays, 12); assert.equal(stops, 3);
  first.destroy();
  const second = createStage7View(s);
  assert.equal(textures.size, 2);
  assert.equal(textures.get(BASH_TEXTURES.lane), floor);
  assert.equal(floor.refreshes, 1); assert.equal(rays, 12);
  second.destroy();
});

for (const mode of ["normal", "media", "flash=0"])
  test(`10 fps: bash actor flash and impact last two frames; low HP shake respects ${mode}`, () => {
    const { s, made } = spriteFixture(), savedMedia = globalThis.matchMedia, savedFlash = q.get("flash");
    globalThis.matchMedia = () => ({ matches: mode === "media" });
    q.set("flash", mode === "flash=0" ? "0" : "1");
    const b = new Asmodean(s, 4800, 690), view = createStage7View(s), calm = mode !== "normal";
    s.enemies = [b]; s.boss = b; s.riley.alive = true; s.riley.x = b.x - 400;
    try {
      b.setState("attack"); b.st = ASMODEAN.bashTell - 0.09;
      const positions = [];
      for (let i = 0; i < 2; i++) {
        b.update(0.1); b.sync(); view.sync(s.kit);
        assert.equal(b.sprite.fill, !calm);
        assert.equal(b.sprite.tint, calm ? ASMO_FX.parry : ASMO_FX.hit);
        const burst = live(made, BASH_TEXTURES.impact)[0];
        assert.ok(burst.alpha > 0 && burst.alpha <= (calm ? 0.35 : 1));
        assert.equal(burst.blend, calm ? "NORMAL" : "ADD");
        assert.equal(burst.x + burst.w / 2, b.bashImpact.x);
        assert.equal(burst.y + burst.h / 2, b.bashImpact.y);
        positions.push([burst.x, burst.y, burst.w]);
      }
      if (calm) assert.deepEqual(positions[0], positions[1], "calm burst stays static");
      b.update(0.1); b.sync(); view.sync(s.kit);
      assert.equal(live(made, BASH_TEXTURES.impact).length, 0);
      assert.equal(b.sprite.fill, false);
      s.fx = { trauma: 0 }; b.phase = 3; b.hp = 60; b.setState("idle");
      b.takeHit({ dmg: 1 });
      assert.equal(s.fx.trauma, calm ? 0 : 0.3, "low HP shake is also gated");
    } finally {
      view.destroy(); b.destroy(); globalThis.matchMedia = savedMedia;
      savedFlash === null ? q.delete("flash") : q.set("flash", savedFlash);
    }
  });

for (const lead of [0.025, 0.075])
  test(`10 fps scene update: impact across either 50ms slice lasts two rendered frames, lead=${lead}`, () =>
    liveBoss(1, (s, h, b) => {
      const { s: renderScene, made } = spriteFixture(), originalSprite = b.sprite;
      b.sprite = renderScene.add.sprite(b.x, b.y, 's7asmo');
      renderScene.enemies = [b]; renderScene.boss = b;
      const view = createStage7View(renderScene);
      try {
        s.riley.x = 4300; s.kit.notes.next = Infinity;
        b.setState('attack'); b.counterUsed = false; b.st = ASMODEAN.bashTell - lead;
        for (let frame = 0; frame < 2; frame++) {
          h.step(0.1); view.sync(renderScene.kit);
          assert.ok(b.bashStrikeFlash > 0);
          assert.equal(b.sprite.tint, ASMO_FX.hit);
          assert.equal(b.sprite.fill, true);
          assert.ok(live(made, BASH_TEXTURES.impact)[0].alpha > 0.4);
        }
        h.step(0.1); view.sync(renderScene.kit);
        assert.equal(b.bashStrikeFlash, 0);
        assert.equal(b.sprite.fill, false);
        assert.equal(live(made, BASH_TEXTURES.impact).length, 0);
      } finally { view.destroy(); b.sprite.destroy(); b.sprite = originalSprite; }
    }));

test("lane also stays inside either arena edge without changing any reachable horizontal hit", () =>
  liveBoss(1, (s, h, b) => {
    const { s: renderScene, made } = spriteFixture(), r = s.riley;
    renderScene.enemies = [b]; renderScene.boss = b;
    const view = createStage7View(renderScene);
    for (const bossX of [s.bounds.l + 60, s.bounds.r - 60]) for (const facing of [-1, 1]) {
      b.x = bossX; b.face(facing); b.setState('attack');
      view.sync(renderScene.kit);
      const lane = live(made, BASH_TEXTURES.lane)[0];
      assert.deepEqual({ x: lane.x, y: lane.y, w: lane.w, h: lane.h }, bashLane(b));
      assert.ok(lane.x >= s.camX + ASMO_FX.floorInset);
      assert.ok(lane.x + lane.w <= s.camX + 1280 - ASMO_FX.floorInset);
      for (let x = s.bounds.l + 40; x <= s.bounds.r - 40; x++) {
        b.setState('attack'); b.counterUsed = false;
        Object.assign(r, { x, y: b.y, z: 0, inv: 0, hp: 100 });
        r.setState('idle', 'idle'); s.kit.damageUntil = 0;
        b.step(ASMODEAN.bashTell);
        const dx = (x - bossX) * facing;
        assert.equal(r.hp, dx > -ASMODEAN.bashBack && dx < ASMODEAN.reach ? 100 - ASMODEAN.bashDmg : 100);
      }
    }
    view.destroy();
  }));
