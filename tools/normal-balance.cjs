'use strict';
// The release Normal curve: 40 seeds, exactly three lives, no HP refill.
// Isolate stages so large Canvas caches from one campaign cannot exhaust CI RAM.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.resolve(process.env.RWB_TEST_ROOT || path.join(__dirname, '..'));
const output = process.env.RWB_BALANCE_OUT || path.join(root, 'docs/review/normal-40.json');
if (process.argv.includes('--stage-child')) {
  const stage = Number(process.argv[process.argv.indexOf('--stage-child') + 1]);
  const { boot, soak } = require(path.join(root, 'tools/soak.cjs'));
  const R = boot(root), results = [];
  if (R.settings.data.difficulty !== 'normal' && R.settings.data.difficulty != null) throw new Error('Normal is not the default');
  for (let seed = 1001; seed <= 1040; seed++) {
    results.push({ seed, ...soak(R, seed, stage, { natural: true }) });
    if (global.gc) global.gc();
  }
  process.stdout.write(JSON.stringify({ stage: stage + 1, clears: results.filter(r => r.cleared).length, rate: results.filter(r => r.cleared).length * 2.5, results }));
} else {
  const targets = [100, 72.5, 70, 65, 50], rows = [];
  for (let stage = 0; stage < 5; stage++) {
    const r = cp.spawnSync(process.execPath, ['--expose-gc', __filename, '--stage-child', String(stage)], { env: process.env, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    if (r.status !== 0) throw new Error('Stage ' + (stage + 1) + ': ' + r.stderr);
    const row = JSON.parse(r.stdout); row.target = targets[stage]; row.delta = row.rate - row.target; row.passed = Math.abs(row.delta) <= 7.5;
    rows.push(row); console.log((row.passed ? 'PASS' : 'FAIL') + ' Normal stage ' + row.stage + ': ' + row.clears + '/40 (' + row.rate + '%), target ' + row.target + '%, delta ' + row.delta + ' points');
  }
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify({ method: 'Seeds 1001–1040; three lives; unassisted; existing soak input unchanged', rows }, null, 2) + '\n');
  if (rows.some(r => !r.passed)) process.exitCode = 1;
}
