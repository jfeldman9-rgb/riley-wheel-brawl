'use strict';
// Rejection tests do not run any playthroughs: validation must reject before
// launching expensive simulations or reporting a misleading acceptance pass.
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), cp = require('node:child_process'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), script = path.join(__dirname, 'v11-balance.cjs');
const original = JSON.parse(fs.readFileSync(path.join(root, 'docs/review/v11/live-normal-40.json'), 'utf8'));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rwb-evidence-'));
let count = 0;
function reject(label, mutate, env = {}) {
  const candidate = JSON.parse(JSON.stringify(original)); if (mutate) mutate(candidate);
  const baseline = path.join(dir, 'baseline.json'); fs.writeFileSync(baseline, JSON.stringify(candidate));
  const run = cp.spawnSync(process.execPath, [script], { env: { ...process.env, RWB_BALANCE_MODE: 'normal', RWB_BASELINE_REPORT: baseline, ...env }, encoding: 'utf8', timeout: 3000 });
  assert.ok(run.status !== 0 && !run.error, label + ' must reject before running a simulation');
  count++; console.log('PASS rejects ' + label);
}
try {
  reject('partial stage acceptance', null, { RWB_BALANCE_STAGES: '2' });
  reject('duplicate stages', null, { RWB_BALANCE_STAGES: '1,2,3,4,4' });
  reject('invalid stage', null, { RWB_BALANCE_STAGES: '1,2,3,4,NaN' });
  reject('missing baseline', null, { RWB_BASELINE_REPORT: path.join(dir, 'missing.json') });
  reject('wrong baseline mode', b => { b.mode = 'hard'; });
  reject('unverified baseline commit', b => { b.revision = '0000000'; });
  reject('missing baseline stage', b => { b.rows.pop(); });
  reject('duplicate baseline stage', b => { b.rows[4] = b.rows[3]; });
  reject('missing result', b => { b.rows[0].results.pop(); });
  reject('duplicate seed', b => { b.rows[0].results[1].seed = 1001; });
  reject('wrong result stage', b => { b.rows[0].results[1].stage = 2; });
  reject('non-finite result', b => { b.rows[0].results[0].seconds = null; });
  reject('missing wave evidence', b => { delete b.rows[0].results[0].waveDamage; });
  reject('fabricated clear count', b => { b.rows[0].clears--; });
  reject('fabricated clear rate', b => { b.rows[0].rate--; });
  console.log('v1.1 evidence checks passed: ' + count);
} finally { fs.rmSync(dir, { recursive: true }); }
