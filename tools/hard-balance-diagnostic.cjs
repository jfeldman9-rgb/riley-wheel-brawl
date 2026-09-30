'use strict';
// Diagnostic only: the unchanged Normal controller, seeds and three-life rules.
// There is deliberately no invented Hard clear-rate acceptance target.
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
if (process.argv.includes('--stage-child')) {
  const stage = Number(process.argv[process.argv.indexOf('--stage-child') + 1]);
  const { boot, soak } = require('./soak.cjs'), R = boot(root), results = [];
  R.settings.set({ difficulty: 'hard' });
  for (let seed = 1001; seed <= 1040; seed++) {
    results.push({ seed, ...soak(R, seed, stage, { natural: true }) });
    if (global.gc) global.gc();
  }
  const clears = results.filter(r => r.cleared).length;
  process.stdout.write(JSON.stringify({ stage: stage + 1, clears, rate: clears * 2.5, results }));
} else {
  const rows = [];
  for (let stage = 0; stage < 5; stage++) {
    const r = cp.spawnSync(process.execPath, ['--expose-gc', __filename, '--stage-child', String(stage)], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    if (r.status !== 0) throw new Error('Stage ' + (stage + 1) + ': ' + r.stderr);
    const row = JSON.parse(r.stdout); rows.push(row);
    console.log('DIAGNOSTIC Hard stage ' + row.stage + ': ' + row.clears + '/40 (' + row.rate + '%)');
  }
  const output = process.env.RWB_HARD_BALANCE_OUT || path.join(root, 'docs/review/release2/hard-40.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify({ method: 'Hard; seeds 1001–1040; three lives; unassisted; existing Normal soak input unchanged; diagnostic with no acceptance target', rows }, null, 2) + '\n');
}
