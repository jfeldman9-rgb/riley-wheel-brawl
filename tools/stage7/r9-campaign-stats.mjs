// Run with node tools/stage7/r9-campaign-stats.mjs output.json.
import {
  stage7Simulation,
  withSeed,
  FULL_STAGE_SEEDS,
} from "../../tests/helpers/stage7-harness.mjs";
import { writeFileSync } from "node:fs";
const rows = [];
for (const [name, opts] of [
  ["base", {}],
  ["assisted", { calls: true }],
  ["lag", { lag: 0.25 }],
])
  for (const seed of FULL_STAGE_SEEDS)
    withSeed(seed, () => {
      const h = stage7Simulation(opts),
        s = h.s;
      let deaths = 0,
        damage = 0,
        minHp = 100,
        hp = s.riley.hp,
        lives = s.riley.lives;
      try {
        for (let f = 0; f < 60 * 420 && !s.ended && !s.gameOver; f++) {
          h.step();
          const r = s.riley;
          if (r.hp < hp) damage += hp - r.hp;
          if (r.lives < lives) deaths += lives - r.lives;
          minHp = Math.min(minHp, r.hp);
          hp = r.hp;
          lives = r.lives;
        }
        rows.push({
          name,
          seed,
          ended: s.ended,
          gameOver: s.gameOver,
          deaths,
          hp,
          damage,
          minHp,
          seconds: s.kit.clock,
          boss: s.kit.bossTime,
        });
      } finally {
        h.destroy();
      }
    });
writeFileSync(process.argv[2], JSON.stringify(rows, null, 2));
console.log(JSON.stringify(rows));
