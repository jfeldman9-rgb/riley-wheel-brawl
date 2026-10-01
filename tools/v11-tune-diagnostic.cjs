'use strict';
// Explicit tuning experiment only. Final acceptance must run v11-balance.cjs
// against unmodified runtime coefficients, without any override.
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
if (process.argv[2] === '--child') {
  const [mode, stageString, scaleString] = process.argv.slice(3), stage = Number(stageString) - 1, scale = Number(scaleString);
  const { boot, soak } = require('./soak.cjs'), R = boot(root), results = [];
  R.settings.set({ difficulty: mode });
  const coefficient = process.env.RWB_TUNE_BOSS === '1' ? 'bossDamageScale' : 'incomingDamageScale';
  R.TUNE[coefficient][mode][stage] = scale;
  for (let seed = 1001; seed <= 1040; seed++) { results.push({ seed, ...soak(R, seed, stage, { natural: true }) }); if (global.gc) global.gc(); }
  process.stdout.write(JSON.stringify({ mode, stage: stage + 1, coefficient, scale, clears: results.filter(r => r.cleared).length, results }));
} else {
  const [mode, stage, ...scales] = process.argv.slice(2), rows = [];
  for (const scale of scales) {
    const child = cp.spawnSync(process.execPath, ['--expose-gc', __filename, '--child', mode, stage, scale], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    if (child.status !== 0) throw new Error(child.stderr);
    const row = JSON.parse(child.stdout); rows.push(row); console.log(mode + ' S' + stage + ' ' + row.coefficient + ' ' + scale + ': ' + row.clears + '/40 (' + row.clears * 2.5 + '%)');
    fs.writeFileSync(path.join(root, 'docs/review/v11/tune-grid-' + mode + '-s' + stage + '.json'), JSON.stringify({ diagnostic: true, method: 'Same inherited 40-seed unassisted controller with an explicitly reported incoming-damage coefficient override; not final acceptance evidence', rows }, null, 2) + '\n');
  }
}
