import test from "node:test";
import assert from "node:assert/strict";
import { stage7Simulation, withSeed } from "./helpers/stage7-harness.mjs";
import { q } from "../src/config.js";
import { HUD } from "../src/hud.js";
import { LINES } from "../src/stage7-voice.js";
import { bashRiley } from "../src/asmodean.js";
import { strikeRiley } from "../src/stage6-hurt.js";
import { installStage7Hooks } from "../src/stage7-lifecycle.js";
import { STORY7_SCRIPT, STORY7_PANELS } from "../src/stage7.js";

function fixture(fn, debug = false) {
  return withSeed(1, () => {
    const saved = q.get("s7debug");
    debug ? q.set("s7debug", "1") : q.delete("s7debug");
    const h = stage7Simulation({ mode: false }),
      s = h.s;
    h.setController(null);
    s.pending = [];
    s.enemies = [];
    const node = () => ({
      text: "",
      alpha: 0,
      setText(t) {
        this.text = t;
        return this;
      },
      setAlpha(a) {
        this.alpha = a;
        return this;
      },
    });
    Object.assign(s.hud, {
      caption: HUD.prototype.caption,
      capWho: node(),
      capText: node(),
      capBg: node(),
      drawCaptionBackground() {},
    });
    try {
      return fn(s, h);
    } finally {
      h.destroy();
      saved === null ? q.delete("s7debug") : q.set("s7debug", saved);
    }
  });
}
function liveBoss(s, h) {
  s.zoneI = s.kit._zone = 3;
  s.zone = s.zones[3];
  s.locked = true;
  s.camX = s.camMax = 3920;
  s.bounds = { l: 3920, r: 5200 };
  s.riley.x = 4900;
  s.riley.inv = 0;
  s.startBoss();
  for (let i = 0; i < 50 && !s.boss; i++) h.step(0.1);
  assert.ok(s.boss, "normal startBoss spawned Asmodean");
  assert.equal(s.hud.capWho.text, "ASMODEAN");
  const b = s.boss;
  b.entering = false;
  b.x = 4800;
  b.y = 630;
  return b;
}

for (const phase of [1, 2, 3])
  test(`100ms: live phase ${phase}, notes active, 3s contact costs at most 72 HP`, () =>
    fixture((s, h) => {
      const b = liveBoss(s, h),
        r = s.riley;
      for (let p = 1; p < phase; p++) {
        b.takeHit({ dmg: 1000 });
        b.beat = b.invuln = false;
      }
      b.clock = 10;
      b.bashAt = 0;
      b.channelAt = phase === 3 ? 10.8 : Infinity;
      s.kit.notes.clock = 0;
      s.kit.notes.next = 0;
      s.kit.arena.t = phase === 2 ? 3.1 : 0;
      let damage = 0,
        oldHp = r.hp,
        notesActive = false;
      const lives = r.lives;
      for (let i = 0; i < 30; i++) {
        r.x = b.x - 62;
        r.y = b.y;
        r.z = r.vz = 0;
        h.step(0.1);
        notesActive ||=
          s.kit.notes.pending.length > 0 || s.kit.notes.notes.length > 0;
        damage += Math.max(0, oldHp - r.hp);
        oldHp = r.hp;
      }
      assert.equal(s.god, false);
      assert.ok(notesActive);
      assert.ok(damage > 0 && damage <= 72, JSON.stringify({ phase, damage }));
      assert.equal(r.lives, lives);
    }));

test("100ms: bash, contact, notes, glass and channel share a 12 HP / 0.5s cap even after inv resets", () =>
  fixture((s, h) => {
    const b = liveBoss(s, h),
      r = s.riley,
      hits = [];
    b.bashAt = b.channelAt = Infinity;
    s.kit.notes.next = Infinity;
    for (let i = 0; i < 30; i++) {
      // Keep standing in range, including after hit reactions; no god mode.
      r.x = b.x - 62;
      r.y = b.y;
      r.z = r.vz = 0;
      r.setState("idle", "idle");
      r.inv = 0;
      const before = r.hp;
      // Shockwave used to deal 16; direct boss hits must also clamp oversized hits.
      strikeRiley(s, 16, { source: "asmodean.shockwave", fromX: b.x });
      bashRiley(b);
      r.takeHit({ dmg: 100 }, b);
      s.kit.notes.notes.push({ x: r.x + 3, y: r.y, dir: -1, age: 0 });
      s.kit.notes.step(1 / 120, s, b);
      strikeRiley(s, 12, { source: "asmodean.glass", fromX: b.x });
      if (r.hp !== before)
        hits.push({ t: s.kit.combatClock, amount: before - r.hp });
      h.step(0.1);
    }
    assert.equal(hits.length, 6);
    assert.equal(r.hp, 28);
    for (let i = 0; i < hits.length; i++) {
      assert.ok(hits[i].amount <= 12);
      if (i) assert.ok(hits[i].t - hits[i - 1].t >= 0.5 - 1e-8);
    }
  }));

test("100ms: an oversized direct Asmodean hit clamps to 12 and blocks the next bash", () =>
  fixture((s, h) => {
    const b = liveBoss(s, h);
    assert.equal(s.riley.takeHit({ dmg: 100 }, b), true);
    assert.equal(s.riley.hp, 88);
    s.riley.inv = 0;
    assert.equal(bashRiley(b), false);
    assert.equal(s.riley.hp, 88);
  }));

test("100ms: held D crosses veil zone entry at full 205px/s and caption dismisses within 3s", () =>
  fixture((s, h) => {
    s.zoneI = 1;
    s.zone = null;
    s.locked = false;
    s.kit._zone = 1;
    s.camX = s.camMax = 2560;
    s.bounds = { l: 2560, r: 3840 };
    s.riley.x = 2790;
    s.inp.keysDown.add("KeyD");
    s.inp.held.right = true;
    h.step(0.1);
    assert.equal(s.zoneI, 2);
    // Keep this movement probe free of enemies/body separation and later waves.
    s.pending = [];
    s.waveGap = 100;
    h.step(0.1);
    assert.equal(s.hud.capText.text, LINES.st7_veil_01[1]);
    const start = s.riley.x;
    let dismissed = null;
    for (let i = 1; i <= 20; i++) {
      h.step(0.1);
      assert.equal(s.paused, false);
      assert.equal(s.cutscene, null);
      assert.equal(s.kit.freezesRiley(), false);
      assert.equal(s.inp.held.right, true);
      assert.ok(Math.abs(s.riley.x - start - i * 20.5) < 1e-6);
      if (dismissed === null && s.hud.capT <= 0) dismissed = i * 0.1;
    }
    assert.ok(dismissed !== null && dismissed <= 3);
    assert.equal(s.hud.capText.alpha, 0);
  }));

test("Stage 7 disables Phaser startup smoothing and restores the earlier-stage clock on cleanup", () => {
  const loop = { smoothStep: true },
    k = { s: { stageNo: 7, game: { loop } }, cleanups: [] };
  installStage7Hooks(k);
  assert.equal(loop.smoothStep, false);
  for (const cleanup of k.cleanups.reverse()) cleanup();
  assert.equal(loop.smoothStep, true);
});

for (const debug of [false, true])
  test(`100ms: KeyB and every HP/state log are ${debug ? "enabled" : "absent"} with s7debug=${debug ? 1 : 0}`, () => {
    const savedLog = console.log,
      logs = [];
    console.log = (...args) => logs.push(args.join(" "));
    try {
      fixture((s, h) => {
        let starts = 0;
        const startBoss = s.startBoss;
        s.startBoss = function () {
          starts++;
          return startBoss.call(this);
        };
        s.inp.buf.power = s.inp.t;
        s.inp.emit("key", "KeyB");
        assert.equal(starts, debug ? 1 : 0);
        if (debug) {
          for (let i = 0; i < 50 && !s.boss; i++) h.step(0.1);
          assert.equal(s.hud.capWho.text, "ASMODEAN");
          assert.equal(s.inp.buf.power, undefined);
        } else liveBoss(s, h);
        const b = s.boss,
          r = s.riley;
        b.entering = false;
        b.x = r.x + 100;
        b.y = r.y;
        b.bashAt = b.channelAt = Infinity;
        s.kit.notes.next = Infinity;
        bashRiley(b);
        r.hp -= 1;
        r.respawn();
        r.hp = 90;
        b.startChannel();
        for (let i = 0; i < 3; i++) b.takeHit({ dmg: 1 });
        for (let i = 0; i < 15; i++) h.step(0.1);
        b.startChannel();
        for (let i = 0; i < 20; i++) h.step(0.1);
        if (debug) {
          assert.ok(
            logs.includes("[s7dbg] dmg src=asmodean.bash amt=12 hp=88"),
          );
          assert.ok(logs.includes("[s7dbg] dmg src=direct amt=1 hp=87"));
          assert.ok(logs.includes("[s7dbg] dmg src=respawn amt=-13 hp=100"));
          for (const name of [
            "channel start",
            "channel end",
            "stagger start",
            "stagger end",
          ])
            assert.ok(
              logs.some((line) => line.startsWith(`[s7dbg] ${name} t=`)),
              name,
            );
          assert.equal(
            logs.filter((line) => line.startsWith("[s7dbg] stagger start"))
              .length,
            1,
          );
          assert.equal(
            logs.filter((line) => line.startsWith("[s7dbg] stagger end"))
              .length,
            1,
          );
        } else {
          assert.equal(s.kit.debug, undefined);
          assert.deepEqual(logs, []);
        }
      }, debug);
    } finally {
      console.log = savedLog;
    }
  });

test("debug KeyB skips the story through its normal completion before startBoss", () =>
  fixture((s, h) => {
    s.startCutscene(STORY7_SCRIPT, STORY7_PANELS, () => {});
    assert.ok(s.cutscene);
    s.inp.emit("key", "KeyB");
    assert.equal(s.cutscene, null);
    assert.equal(s.paused, false);
    for (let i = 0; i < 50 && !s.boss; i++) h.step(0.1);
    assert.equal(s.hud.capWho.text, "ASMODEAN");
  }, true));

test('100ms: a completed live channel owns a 12 HP shockwave', () => fixture((s, h) => {
  const b = liveBoss(s, h), r = s.riley;
  b.phase = 3; b.hp = 190; b.bashAt = Infinity;
  s.kit.notes.next = Infinity;
  b.startChannel();
  // Keep standing next to the caster throughout the full visible channel.
  for (let i = 0; i < 20; i++) {
    r.x = b.x - 62; r.y = b.y; r.z = r.vz = 0;
    h.step(.1);
  }
  assert.equal(r.hp, 88);
  assert.ok(s.kit.arena.shock?.source === 'asmodean.shockwave');
  assert.equal(s.kit.arena.shock.counterUsed, true);
}));
