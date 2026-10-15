import test from "node:test";
import assert from "node:assert/strict";
import {
  stage7Simulation,
  withSeed,
  FULL_STAGE_SEEDS,
} from "./helpers/stage7-harness.mjs";
import { q } from "../src/config.js";
import { Asmodean } from "../src/asmodean.js";

function run(seed, options = {}) {
  return withSeed(seed, () => {
    const h = stage7Simulation({
        calls: !!options.calls,
        lag: options.lag || 0,
      }),
      s = h.s,
      helpers = new Set();
    if (options.everywhere) {
      q.set("call7", "all");
    }
    try {
      for (let i = 0; i < 60 * 420 && !s.ended && !s.gameOver; i++) {
        h.step();
        if (s.kit.strike) helpers.add(s.kit.strike.helper);
        if (i % 60 === 0) assert.ok(s.attackTokens() <= 2);
      }
      assert.equal(s.gameOver, false, JSON.stringify({ seed, ...h.summary() }));
      assert.equal(s.ended, true, JSON.stringify({ seed, ...h.summary() }));
      const text = h.observations.hud
        .flatMap((e) => e.args)
        .filter((a) => typeof a === "string");
      assert.deepEqual(
        text.filter((t) => /\b(?:Loial|Rand|PLACEHOLDER)\b/i.test(t)),
        [],
      );
      return { seed, helpers: [...helpers], seconds: s.kit.clock };
    } finally {
      h.destroy();
    }
  });
}

test("250 ms reaction lag clears exactly 9/9 seeds, with no earlier call-in or debug labels", () => {
  const rows = FULL_STAGE_SEEDS.map((seed) => run(seed, { lag: 0.25 }));
  assert.equal(rows.length, 9);
  console.log(JSON.stringify({ strictLag: rows }));
});

test("live bot helper policy exercises Moiraine and Lan outside the boss and clears 9/9", () => {
  const rows = FULL_STAGE_SEEDS.map((seed) =>
    run(seed, { calls: true, everywhere: true }),
  );
  const used = new Set(rows.flatMap((r) => r.helpers));
  assert.ok(used.has("moiraine"));
  assert.ok(used.has("lan"));
  console.log(JSON.stringify({ allHelpers: rows }));
});

// Each sample freezes the production view state half a second before a real note contact.
// Canvas/GL pixel appearance still needs the physical-device visual review.
test("all nine seeds: ten note contacts have a visible warning 0.5 seconds earlier", () => {
  const results = [];
  for (const seed of FULL_STAGE_SEEDS)
    withSeed(seed, () => {
      const h = stage7Simulation({ mode: false }),
        s = h.s,
        k = s.kit,
        drawn = new Set();
      try {
        s.enemies = [];
        s.zoneI = 3;
        s.zone = s.zones[3];
        s.bounds = { l: 3920, r: 5200 };
        s.camX = s.camMax = 3920;
        s.locked = true;
        k._zone = 3;
        s.riley.x = 4400;
        s.riley.y = 630;
        s.riley.hp = s.riley.maxHp = 10000;
        const b = (s.boss = new Asmodean(s, 5000, 630));
        b.bashAt = b.channelAt = 9999;
        s.enemies = [b];
        const image = s.add.image;
        s.add.image = (...args) => {
          const o = image(...args),
            destroy = o.destroy;
          o.destroy = () => {
            drawn.delete(o);
            destroy.call(o);
          };
          drawn.add(o);
          return o;
        };
        const history = [];
        let contacts = 0;
        for (let i = 0; i < 60 * 220 && contacts < 10; i++) {
          const before = k.notes.notes.slice();
          s.riley.inv = 0;
          h.step();
          const frame = {
            at: k.clock,
            notes: new Set(k.notes.notes),
            warning: [...drawn].some((o) => o.key === "s7note" && o.alpha > 0),
          };
          history.push(frame);
          while (history.length > 100) history.shift();
          for (const n of before)
            if (n.counterUsed && !n.reflected) {
              const target = k.clock - 0.5;
              const frozen = history.find(
                (f) => f.at >= target - 1 / 60 && f.at <= target + 1 / 60,
              );
              assert.ok(frozen, `seed ${seed}: history available`);
              assert.ok(
                frozen.notes.has(n) && frozen.warning,
                `seed ${seed}: contact ${contacts + 1} had a visible note 0.5 s earlier`,
              );
              contacts++;
            }
        }
        assert.equal(contacts, 10, `seed ${seed}`);
        results.push({ seed, contacts });
      } finally {
        h.destroy();
      }
    });
  console.log(JSON.stringify({ tellSamples: results }));
});
