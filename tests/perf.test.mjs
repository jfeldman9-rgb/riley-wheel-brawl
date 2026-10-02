import test from 'node:test';
import assert from 'node:assert/strict';
import { createPerf, frameStats, fightGate, displayMs, deviceMetadata, bindPerfLifecycle, SAMPLE_LIMITS } from '../src/perf.js';

function fixture() {
  let time = 0, revision = 'first', quality = 0;
  const meter = createPerf({ now: () => time, dateNow: () => `date-${time}`,
    metadata: () => ({ build: revision, quality, renderer: 'test GPU', renderScale: 1, dpr: 2 }) });
  return { meter, at: value => { time = value; }, revision: value => { revision = value; }, quality: value => { quality = value; } };
}

test('percentiles preserve the legacy conservative rank, preserve order and include all positive samples', () => {
  const values = Array.from({ length: 100 }, (_, i) => 100 - i), copy = values.slice();
  const stats = frameStats(values);
  assert.equal(stats.p50, 51); assert.equal(stats.p95, 96); assert.equal(stats.p99, 100);
  assert.equal(stats.avgFps, 1000 / 50.5); assert.equal(stats.frames, 100);
  assert.equal(stats.over33_4, 67); assert.deepEqual(values, copy);
  assert.equal(frameStats([]), null);
  assert.equal(frameStats([7]).p95, 7);
  assert.equal(frameStats([1, 100]).p50, 100);
});

test('fight gate never passes by rounding and the display never rounds an over-budget value down', () => {
  assert.equal(fightGate(null).status, 'NO_SAMPLES');
  assert.equal(fightGate(frameStats([16.7])).status, 'PASS');
  assert.equal(fightGate(frameStats([16.70001])).status, 'FAIL');
  assert.equal(fightGate(frameStats([16.74])).measuredMs, 16.74);
  assert.equal(displayMs(16.70001), '16.701');
  assert.equal(displayMs(16.7), '16.700');
  // Exactly 100 samples retain the old stricter rank; the 96th sample must not be hidden.
  const boundary = [...Array(95).fill(16), ...Array(5).fill(17)];
  assert.equal(frameStats(boundary).p95, 17); assert.equal(fightGate(frameStats(boundary)).status, 'FAIL');
});

test('>33.4 ms is strict, explicit, and retains only the legacy alias for compatibility', () => {
  const s = frameStats([20, 20.01, 33, 33.4, 33.40001]);
  assert.equal(s.over33_4, 1); assert.equal(s.over33, 1); assert.equal(s.over20, 4);
});

test('zero is a valid baseline and multi-second active stalls are never silently dropped', () => {
  const { meter } = fixture();
  assert.equal(meter.tick(0, { inFight: true }), null);
  assert.equal(meter.tick(16, { inFight: true }), 16);
  assert.equal(meter.tick(1016, { inFight: true }), 1000);
  assert.equal(meter.tick(3016, { inFight: true }), 2000);
  assert.deepEqual(meter.all, [16, 1000, 2000]); assert.deepEqual(meter.fightFrames, meter.all);
  assert.equal(meter.update().gate.status, 'FAIL');
});

test('active/inactive boundaries exclude title, ended and paused intervals without guessing by duration', () => {
  const { meter } = fixture();
  meter.tick(0, { active: false }); meter.tick(100, { active: true, inFight: true });
  meter.tick(116, { active: true, inFight: true }); meter.tick(132, { active: false });
  assert.equal(meter.lastSampleMs, null);
  meter.tick(5000, { active: false }); meter.tick(9000, { active: true, inFight: true });
  assert.equal(meter.lastSampleMs, null);
  meter.tick(9017, { active: true, inFight: true });
  assert.deepEqual(meter.all, [16, 17]);
});

test('fight sampling attributes the interval to its starting context, including the final fighting interval', () => {
  const { meter } = fixture();
  meter.tick(0, { inFight: false, context: { zone: 0 } });
  meter.tick(16, { inFight: true, context: { zone: 1 } });
  meter.tick(39, { inFight: false, context: { zone: 2 } });
  meter.tick(56, { inFight: false, context: { zone: 2 } });
  assert.deepEqual(meter.all, [16, 23, 17]); assert.deepEqual(meter.fightFrames, [23]);
  assert.deepEqual(meter.history.map(h => h.context), [{ zone: 0, inFight: false }, { zone: 1, inFight: true }, { zone: 2, inFight: false }]);
});

test('explicit pause excludes gaps even when no ticks occur while paused', () => {
  const f = fixture(), p = f.meter;
  p.tick(0, { inFight: true }); p.tick(16, { inFight: true });
  f.at(20); p.setSuspended('manual', true);
  f.at(9000); p.setSuspended('manual', false);
  p.tick(9000, { inFight: true }); p.tick(9016, { inFight: true });
  assert.deepEqual(p.all, [16, 16]);
  assert.equal(p.report().sampling.excludedByReason.manual.durationMs, 8980);
});

test('overlapping pause reasons cannot resume sampling prematurely', () => {
  const f = fixture(), p = f.meter;
  p.tick(0, { inFight: true }); p.tick(16, { inFight: true });
  f.at(16); p.setSuspended('manual', true); p.setSuspended('report', true);
  f.at(40); p.setSuspended('report', false); p.tick(40, { inFight: true });
  assert.equal(p.last, null); assert.deepEqual(p.suspended, ['manual']);
  f.at(80); p.setSuspended('manual', false); p.tick(80, { inFight: true }); p.tick(96, { inFight: true });
  assert.deepEqual(p.all, [16, 16]);
  assert.equal(p.report().sampling.excludedByReason.report.durationMs, 24);
});

test('lifecycle bindings exclude hidden tabs, lost focus and page navigation, and unbind cleanly', () => {
  const f = fixture(), p = f.meter, doc = new EventTarget(), root = new EventTarget();
  root.document = doc; doc.hidden = false;
  const off = bindPerfLifecycle(p, root);
  p.tick(0, { inFight: true }); p.tick(16, { inFight: true });
  f.at(20); doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange'));
  root.dispatchEvent(new Event('blur'));
  f.at(5000); doc.hidden = false; doc.dispatchEvent(new Event('visibilitychange'));
  p.tick(5000, { inFight: true }); assert.equal(p.last, null);
  root.dispatchEvent(new Event('focus')); p.tick(5001, { inFight: true }); p.tick(5017, { inFight: true });
  f.at(6000); root.dispatchEvent(new Event('pagehide'));
  f.at(9000); root.dispatchEvent(new Event('pageshow')); p.tick(9000, { inFight: true }); p.tick(9016, { inFight: true });
  assert.deepEqual(p.all, [16, 16, 16]);
  off(); root.dispatchEvent(new Event('blur')); assert.deepEqual(p.suspended, []);
});

test('reset clears samples, summaries, baseline, prior context, histories and capture metadata', () => {
  const f = fixture(), p = f.meter;
  p.tick(0, { inFight: true, context: { zone: 4 } }); p.tick(18, { inFight: true }); p.update();
  f.at(100); p.reset();
  assert.equal(p.last, null); assert.equal(p.lastSampleMs, null); assert.equal(p.summary, null); assert.equal(p.fight, null);
  assert.equal(p.inFight, false); assert.deepEqual(p.context, {}); assert.deepEqual(p.history, []);
  assert.deepEqual(p.excluded, {}); assert.equal(p.captureMetadata, null); assert.equal(p.totalFrames, 0);
  assert.deepEqual(p.all, []); assert.deepEqual(p.fightFrames, []);
  assert.equal(p.report().gate.status, 'NO_SAMPLES'); assert.equal(p.report().startedAt, 'date-100');
  f.revision('second'); f.quality(4);
  p.tick(4000, { inFight: true }); p.tick(4016, { inFight: true });
  assert.deepEqual(p.all, [16]); assert.equal(p.captureMetadata.build, 'second'); assert.equal(p.captureMetadata.quality, 4);
  assert.equal(p.history.length, 1); assert.equal(p.history[0].firstFrame, 1);
});

test('reset while report is open preserves exclusion state but restarts its accounting', () => {
  const f = fixture(), p = f.meter;
  f.at(10); p.setSuspended('report', true);
  f.at(50); p.reset(); f.at(80);
  assert.deepEqual(p.suspended, ['report']); assert.equal(p.report().sampling.excludedByReason.report.durationMs, 30);
  p.tick(80, { inFight: true }); assert.equal(p.last, null);
  p.setSuspended('report', false); p.tick(100, { inFight: true }); p.tick(116, { inFight: true });
  assert.deepEqual(p.fightFrames, [16]);
});

test('invalid/nonpositive timing resets the baseline without producing bogus samples', () => {
  const { meter: p } = fixture();
  p.tick(0); p.tick(0); p.tick(-1); p.tick(NaN); p.tick(100); p.tick(116);
  assert.deepEqual(p.all, [16]);
});

test('rolling windows keep bounded raw samples and report what aged out', () => {
  const f = fixture(), p = f.meter;
  for (let i = 0; i <= 7210; i++) p.tick(i * 17, { inFight: true });
  assert.equal(p.all.length, SAMPLE_LIMITS.all); assert.equal(p.fightFrames.length, SAMPLE_LIMITS.fight);
  const report = p.report();
  assert.equal(report.sampling.totalFrames, 7210); assert.equal(report.sampling.totalFightFrames, 7210);
  assert.equal(report.sampling.omittedFrames, 5410); assert.equal(report.sampling.omittedFightFrames, 10);
  report.samplesMs.all[0] = -100; report.contextHistory[0].context.inFight = false;
  assert.equal(p.all[0], 17); assert.equal(p.history[0].context.inFight, true);
});

test('capture history records quality changes, is bounded and resets its truncation count', () => {
  const f = fixture(), p = f.meter;
  p.tick(0, { inFight: true });
  for (let i = 1; i <= 300; i++) { f.quality(i); p.tick(i * 16, { inFight: true }); }
  assert.equal(p.history.length, SAMPLE_LIMITS.history); assert.equal(p.droppedHistorySegments, 44);
  assert.equal(p.history.at(-1).metadata.quality, 300);
  p.reset(); assert.equal(p.droppedHistorySegments, 0);
});

test('device export identifies immutable builds and excludes unrelated URL query data', () => {
  const commit = 'abcdef1234'.repeat(4);
  const root = {
    location: { origin: 'https://raw.githack.com', pathname: `/owner/repo/${commit}/index.html`, search: '?demo=1&rs=1&token=secret&god=1' },
    document: { querySelector: () => ({ content: 'stage1-evidence-v1' }) },
    __game: { rs: 1.5, canvas: { width: 1920, height: 1080 } }, __perf: { renderer: 'GPU', quality: 3, software: false },
    navigator: { userAgent: 'Test Safari', platform: 'MacIntel', maxTouchPoints: 5 },
    innerWidth: 1024, innerHeight: 768, devicePixelRatio: 2, screen: { width: 1024, height: 768 },
    visualViewport: { width: 1024, height: 768 },
  };
  const m = deviceMetadata(root);
  assert.equal(m.build.commit, commit); assert.equal(m.build.label, 'stage1-evidence-v1');
  assert.deepEqual(Object.fromEntries(new URL(m.build.url).searchParams), { demo: '1', god: '1', rs: '1' }); assert.doesNotMatch(JSON.stringify(m), /secret|token/);
  assert.equal(m.renderer, 'GPU'); assert.equal(m.quality, 3); assert.equal(m.renderScale, 1.5);
  assert.equal(m.device.userAgent, 'Test Safari'); assert.equal(m.device.maxTouchPoints, 5); assert.equal(m.viewport.width, 1024);
});
