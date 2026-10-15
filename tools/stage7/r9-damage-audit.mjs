// Run with node tools/stage7/r9-damage-audit.mjs [output.json].
// Every HP write is observed, including direct writes outside the damage helpers.
import {
  stage7Simulation,
  withSeed,
  FULL_STAGE_SEEDS,
} from "../../tests/helpers/stage7-harness.mjs";
import { writeFileSync } from "node:fs";
const rows = [];
for (const seed of FULL_STAGE_SEEDS)
  for (const phase of [1, 2, 3])
    withSeed(seed, () => {
      const h = stage7Simulation({ mode: false }),
        s = h.s;
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
      // Use real phase gates, including the phase-two adds and their attacks.
      for (let p = 1; p < phase; p++) {
        b.takeHit({ dmg: 1000 });
        b.beat = b.invuln = false;
      }
      b.clock = 10;
      b.bashAt = 0;
      b.channelAt = phase === 3 ? 10.8 : Infinity;
      s.kit.notes.next = 0;
      s.kit.notes.clock = 0;
      s.kit.notes.clear();
      s.kit.arena.t = phase === 2 ? 3.1 : 0;
      const start = s.kit.combatClock,
        events = [];
      let hp = s.riley.hp,
        meleeSource;
      const takeHit = s.riley.takeHit;
      s.riley.takeHit = function (hit, from) {
        meleeSource = `${from?.type || "environment"}.melee`;
        try {
          return takeHit.call(this, hit, from);
        } finally {
          meleeSource = undefined;
        }
      };
      Object.defineProperty(s.riley, "hp", {
        configurable: true,
        get: () => hp,
        set(value) {
          if (value !== hp) {
            const stack = new Error().stack;
            const source =
              s.kit.damageSource ||
              (stack.includes("bashRiley")
                ? "asmodean.bash"
                : stack.includes("stage7-notes")
                  ? "asmodean.note"
                  : stack.includes("stage7-arena")
                    ? s.kit.arena.shock?.counterUsed
                      ? "asmodean.shockwave"
                      : "asmodean.glass"
                    : meleeSource ||
                      (stack.includes("respawn") ? "respawn" : "direct"));
            events.push({
              t: +(s.kit.combatClock - start).toFixed(3),
              source,
              amount: hp - value,
              hp: value,
              stack: stack
                .split("\n")
                .slice(1)
                .map((line) => line.replace(/file:\/\/[^ ]*\/src\//, "src/")),
            });
          }
          hp = value;
        },
      });
      try {
        for (let i = 0; i < 30; i++) {
          s.riley.x = b.x - 62;
          s.riley.y = b.y;
          s.riley.z = s.riley.vz = 0;
          h.step(0.1);
        }
        rows.push({
          seed,
          phase,
          dt: 0.1,
          seconds: 3,
          god: s.god,
          damage: events.reduce((sum, e) => sum + Math.max(0, e.amount), 0),
          events,
        });
      } finally {
        h.destroy();
      }
    });
if (process.argv[2])
  writeFileSync(process.argv[2], JSON.stringify(rows, null, 2) + "\n");
console.log(JSON.stringify(rows));
