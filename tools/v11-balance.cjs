'use strict';
// v1.1 acceptance layer. The inherited controller, seeds and tests are untouched.
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process'), crypto = require('node:crypto');
const diagnostic = process.argv.includes('--diagnostic');
const LIVE_REVISION = '816eb1e9dc209b00a6da4f8eeb58ea2ead69bdbc';
function validateRow(row) {
  if (!row || !Number.isInteger(row.stage) || row.stage < 1 || row.stage > 5 || !Array.isArray(row.results) || row.results.length !== 40) throw new Error('Expected one valid stage with exactly 40 results');
  const seeds = new Set();
  for (const r of row.results) {
    if (!Number.isInteger(r.seed) || r.seed < 1001 || r.seed > 1040 || seeds.has(r.seed) || r.stage !== row.stage || typeof r.cleared !== 'boolean') throw new Error('Invalid, missing or duplicate seed/stage/clear result');
    seeds.add(r.seed);
    for (const key of ['seconds', 'damage', 'hits', 'deaths', 'pickups', 'maxOffscreenSeconds']) if (!Number.isFinite(r[key]) || r[key] < 0) throw new Error('Non-finite/missing result field: ' + key);
    if (!Array.isArray(r.offscreenViolations) || !Array.isArray(r.waveDamage) || r.waveDamage.length !== 6 || r.waveDamage.some(x => !Number.isFinite(x) || x < 0)) throw new Error('Missing or invalid offscreen/wave evidence');
  }
  const clears = row.results.filter(r => r.cleared).length;
  if (row.clears !== clears || row.rate !== clears * 2.5) throw new Error('Reported rate/count does not match the 40 seeds');
}
function validateBaseline(report) {
  if (!report || report.mode !== 'normal' || report.revision !== LIVE_REVISION || !Array.isArray(report.rows) || report.rows.length !== 5 || new Set(report.rows.map(r => r.stage)).size !== 5) throw new Error('Normal baseline must cover five unique stages at verified live revision ' + LIVE_REVISION);
  report.rows.forEach(validateRow);
}
const root = path.resolve(process.env.RWB_TEST_ROOT || path.join(__dirname, '..'));
const mode = process.env.RWB_BALANCE_MODE || 'normal';
const output = process.env.RWB_BALANCE_OUT || path.join(__dirname, '..', 'docs/review/v11', mode + '-40.json');
if (!['normal', 'hard'].includes(mode)) throw new Error('RWB_BALANCE_MODE must be normal or hard');
if (process.argv.includes('--stage-child')) {
  const stage = Number(process.argv[process.argv.indexOf('--stage-child') + 1]);
  const runtimeHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'index.html')));
  for (const file of fs.readdirSync(path.join(root,'js')).filter(f=>f.endsWith('.js')).sort()) runtimeHash.update(file).update(fs.readFileSync(path.join(root,'js',file)));
  const sourceHash = runtimeHash.digest('hex');
  const { boot, soak } = require(path.join(root, 'tools/soak.cjs')), R = boot(root), results = [];
  R.settings.set({ difficulty: mode });
  const original = R.scenes.Play.prototype.update;
  const { OffscreenWatch } = require('./v11-offscreen-watch.cjs');
  let watch;
  R.scenes.Play.prototype.update = function(dt, input) {
    const result = original.call(this, dt, input);
    watch.observe(this, dt);
    return result;
  };
  for (let seed = 1001; seed <= 1040; seed++) {
    watch = new OffscreenWatch(R.W);
    results.push({ seed, ...soak(R, seed, stage, { natural: true }), maxOffscreenSeconds: +watch.maxSeconds.toFixed(3), offscreenViolations: watch.violations });
    if (global.gc) global.gc();
  }
  const clears = results.filter(r => r.cleared).length;
  process.stdout.write(JSON.stringify({ stage: stage + 1, clears, rate: clears * 2.5, sourceHash, incomingDamageScale: R.TUNE.incomingDamageScale ? R.TUNE.incomingDamageScale[mode][stage] : 1, bossDamageScale: R.TUNE.bossDamageScale ? R.TUNE.bossDamageScale[mode][stage] : 1, results }));
} else {
  const baseCommit=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  const workingTreeDirty=!!cp.execFileSync('git',['status','--porcelain','--','index.html','js'],{cwd:root,encoding:'utf8'}).trim();
  const provenance={baseCommit,workingTreeDirty,revision:workingTreeDirty?null:baseCommit,revisionLabel:workingTreeDirty?'uncommitted runtime snapshot based on '+baseCommit:baseCommit};
  const stages = process.env.RWB_BALANCE_STAGES ? process.env.RWB_BALANCE_STAGES.split(',').map(n => Number(n) - 1) : [0, 1, 2, 3, 4];
  if (stages.some(s => !Number.isInteger(s) || s < 0 || s > 4) || new Set(stages).size !== stages.length) throw new Error('Stages must be unique integers 1–5');
  if (!diagnostic && (stages.length !== 5 || new Set(stages).size !== 5)) throw new Error('Acceptance requires all five stages; subsets are diagnostic only');
  const baselineFile = process.env.RWB_BASELINE_REPORT || path.join(__dirname, '..', 'docs/review/v11/live-normal-40.json');
  const baseline = mode === 'normal' && !diagnostic ? JSON.parse(fs.readFileSync(baselineFile, 'utf8')) : null;
  if (baseline) validateBaseline(baseline);
  const rows = [];
  for (const stage of stages) {
    const run = cp.spawnSync(process.execPath, ['--expose-gc', __filename, '--stage-child', String(stage)], { env: process.env, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    if (run.status !== 0) throw new Error('Stage ' + (stage + 1) + ': ' + run.stderr);
    const row = JSON.parse(run.stdout);
    validateRow(row);
    if (row.stage !== stage + 1) throw new Error('Child stage mismatch');
    if (!diagnostic && rows.length && row.sourceHash !== rows[0].sourceHash) throw new Error('Runtime changed during acceptance: rerun a frozen build');
    row.offscreenPassed = row.results.every(r => r.offscreenViolations.length === 0);
    if (mode === 'normal' && baseline) {
      row.liveBaseline = baseline.rows.find(r => r.stage === row.stage).rate;
      row.delta = row.rate - row.liveBaseline;
      row.inheritedTarget = [100,72.5,70,65,50][stage];
      row.balancePassed = Math.abs(row.delta) <= 5 && Math.abs(row.rate - row.inheritedTarget) <= 7.5;
    }
    if (mode === 'hard' && stage >= 2) { row.target = [null, null, 50, 35, 25][stage]; row.delta = row.rate - row.target; row.balancePassed = Math.abs(row.delta) <= 5; }
    rows.push(row);
    console.log(mode.toUpperCase() + ' stage ' + row.stage + ': ' + row.clears + '/40 (' + row.rate + '%), max offscreen ' + Math.max(...row.results.map(r => r.maxOffscreenSeconds)) + 's' + (row.delta == null ? '' : ', delta ' + row.delta + ' points') + ', offscreen ' + (row.offscreenPassed ? 'PASS' : 'FAIL'));
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify({ diagnostic, complete: rows.length === 5, method: 'Seeds 1001–1040; three lives; no HP refill, injected damage or extra lives; exact inherited tools/soak.cjs controller; automated simulation, not human play', mode, sourceRoot: root, ...provenance, rows }, null, 2) + '\n');
  }
  if (!diagnostic && rows.some(row => !row.offscreenPassed || row.balancePassed === false)) process.exitCode = 1;
}
