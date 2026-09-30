'use strict';
// Real decoded audio regression: protected speech, the exact joint/defeat/win
// sequence, first Callandor super, asynchronous load order, and explicit skips.
// No changes to game clocks, damage, RNG, or existing acceptance thresholds.
// CHROMIUM_PATH=/usr/bin/chromium node tools/voice-sequence-check.cjs
const assert = require('assert/strict'), fs = require('fs'), path = require('path');
const http = require('http'), cp = require('child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
let passed = 0;
const check = (ok, name) => { assert.ok(ok, name); passed++; console.log('PASS ' + name); };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(req.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.statusCode = 404; return res.end(); }
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg', '.png': 'image/png', '.json': 'application/json' };
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
function completeSequence(trace, ids) {
  const starts = trace.filter(t => t.name.startsWith('clip:'));
  assert.deepEqual(starts.map(t => t.name.slice(5)), ids);
  for (let i = 0; i < starts.length; i++) {
    const clip = starts[i], end = trace.find(t => t.name === 'clip-end:' + ids[i]);
    assert.ok(end, ids[i] + ' naturally ended');
    assert.ok(end.t - clip.t >= clip.duration - 0.025, ids[i] + ' played its decoded duration');
    if (i) assert.ok(clip.t >= starts[i - 1].t + starts[i - 1].duration - 0.025, ids[i] + ' follows the entire preceding clip');
  }
  assert.ok(!trace.some(t => t.name.startsWith('clip-stop:')), 'No line was interrupted');
  console.log('TRACE ' + JSON.stringify(starts.map(t => ({ id: t.name.slice(5), at: +(t.t - starts[0].t).toFixed(3), duration: +t.duration.toFixed(4) }))));
}
(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'] });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Keep the real WebAudio clock while stepping only the relevant game methods.
    // Rendering and AI are covered by the unmodified campaign/balance checks.
    await page.addInitScript(() => {
      window.requestAnimationFrame = () => 0;
      const NativeAudioContext = window.AudioContext || window.webkitAudioContext;
      window.voiceTestContexts = [];
      if (NativeAudioContext) window.AudioContext = class extends NativeAudioContext {
        constructor(...args) { super(...args); window.voiceTestContexts.push(this); }
      };
    });
    await page.goto('http://127.0.0.1:' + server.address().port + '/');
    await page.waitForFunction(() => window.RWB && RWB.game && RWB.scenes, null, { polling: 25 });
    await page.evaluate(async () => {
      const R = RWB, A = R.audio;
      A.unlock(); A.setMusicLevel(0); A.stopMusic();
      window.voiceTestSleep = ms => new Promise(resolve => setTimeout(resolve, ms));
      window.voiceTestIdle = async () => {
        const until = performance.now() + 20000;
        while (A.voiceBusy && performance.now() < until) await voiceTestSleep(20);
        if (A.voiceBusy) throw new Error('Speech queue failed to drain');
      };
      window.voiceTestScene = level => {
        R.voiceReset();
        const game = { nextScene: null, advancedAt: null, setScene(scene) { this.nextScene = scene; this.advancedAt = A.now(); } };
        const scene = new R.scenes.Play(game, level, { wave: 5, callandor: level >= 3 });
        R.game.scene = scene;
        scene.boss.introTimer = 0; scene.boss.invuln = 0;
        scene.subtitle = null; scene.subtitleQueue.length = 0;
        A.trace.length = 0;
        return scene;
      };
      const ids = ['taim_phase_01', 'st5_riley_02', 'st5_kenzie_02', 'taim_defeat_01', 'riley_bosswin_05', 'chieftain_defeat_01', 'riley_victory_01', 'riley_super_01', 'riley_callandor_01', 'riley_fire_01'];
      const buffers = await Promise.all(ids.map(id => A.loadClip(id, R.voiceUrl(id), { minDuration: 0.25 })));
      if (buffers.some(buf => !buf)) throw new Error('A required shipped voice failed to decode');
    });
    const entrance = await page.evaluate(() => {
      const R = RWB, A = R.audio, s = new R.scenes.Play({ setScene() {} }, 4, { wave: 5 });
      R.game.scene = s;
      const queuedBeforeEnter = s.subtitleQueue.some(item => item.line.id === 'taim_phase_01');
      s.enter(); const silentUntilUpdate = !A.voicePlaying;
      s.updateDialogue(1 / 60); const spoken = A.voicePlaying;
      s.exit();
      return { queuedBeforeEnter, silentUntilUpdate, spoken, pendingAfterExit: A.voicePending };
    });
    check(entrance.queuedBeforeEnter && entrance.silentUntilUpdate && entrance.spoken === 'taim_phase_01' && !entrance.pendingAfterExit,
      'Play constructor queues the boss entrance; enter reset preserves it; the first dialogue update speaks it');
    const joint = await page.evaluate(async () => {
      const R = RWB, A = R.audio, s = voiceTestScene(4);
      s.boss.takeHit(99999, s.player.x, { move: 'super' });
      s.rescueReady = true; s.player.power = 100; s.player.setState('idle'); s.player.attackMove = null;
      const started = s.startJoint(), limit = performance.now() + 20000;
      let hitAt = null, frames = 0;
      while (!s.game.nextScene && performance.now() < limit) {
        if (s.phase !== 'clear') {
          s.updateDialogue(1 / 60); s.updateJoint(1 / 60); s.finishWave(1 / 60);
          if (s.joint.hit && hitAt === null) hitAt = s.joint.age;
        } else s.update(1 / 60, { pressed: {}, held: {}, axis: () => ({ x: 0, y: 0 }) });
        // A frequent, loaded combat bark must neither interrupt nor queue.
        if (frames++ % 6 === 0 && A.voiceBusy) R.voice('riley_fire_01');
        await voiceTestSleep(1000 / 60);
      }
      return { started, hitAt, bossDead: s.boss.dead, advancedAt: s.game.advancedAt, escape: s.game.nextScene && s.game.nextScene.lines === R.CAPTIONS.escape, trace: A.trace.filter(t => t.name.startsWith('clip')) };
    });
    completeSequence(joint.trace, ['st5_riley_02', 'st5_kenzie_02', 'taim_defeat_01', 'riley_bosswin_05']);
    check(joint.started && joint.bossDead && Math.abs(joint.hitAt - 1.25) < 1e-8, 'Joint collision still defeats Taim at exactly 1.25 gameplay seconds');
    check(joint.escape && joint.advancedAt >= joint.trace.at(-1).t, 'Together → Twinkle Toes → Taim defeat → Riley win all finish before escape');
    const chieftain = await page.evaluate(async () => {
      const R = RWB, A = R.audio, s = voiceTestScene(0), limit = performance.now() + 15000;
      s.boss.takeHit(99999, s.player.x, { move: 'super' }); s.finishWave(1 / 60);
      while (!s.game.nextScene && performance.now() < limit) {
        s.update(1 / 60, { pressed: {}, held: {}, axis: () => ({ x: 0, y: 0 }) });
        await voiceTestSleep(1000 / 60);
      }
      return { advancedAt: s.game.advancedAt, trace: A.trace.filter(t => t.name.startsWith('clip')) };
    });
    completeSequence(chieftain.trace, ['chieftain_defeat_01', 'riley_victory_01']);
    check(chieftain.advancedAt >= chieftain.trace.at(-1).t, 'The 3+ second Chieftain defeat finishes before Riley and the stage transition');
    const callandor = await page.evaluate(async () => {
      const R = RWB, A = R.audio, s = voiceTestScene(3);
      s.player.power = 100; const started = s.activateBalefire();
      await voiceTestSleep(200); s.updateDialogue(1 / 60);
      R.voice('riley_fire_01');
      await voiceTestIdle();
      return { started, spoken: s.player.spokenCallandor, trace: A.trace.filter(t => t.name.startsWith('clip')) };
    });
    completeSequence(callandor.trace, ['riley_super_01', 'riley_callandor_01']);
    check(callandor.started && callandor.spoken, 'The first Callandor super and its answer both play in full, in trigger order');
    await page.route('**/*sequence-test=slow*', async route => { await new Promise(resolve => setTimeout(resolve, 350)); await route.continue(); });
    const loading = await page.evaluate(async () => {
      const R = RWB, A = R.audio; R.voiceReset(); A.trace.length = 0;
      A.queueVoice('slow-fixture', R.voiceUrl('riley_super_01') + '&sequence-test=slow');
      A.queueVoice('fast-fixture', R.voiceUrl('riley_callandor_01'));
      await voiceTestIdle(); return A.trace.filter(t => t.name.startsWith('clip'));
    });
    completeSequence(loading, ['slow-fixture', 'fast-fixture']);
    check(true, 'Cold clips retain request order when the second download finishes first');
    const missing = await page.evaluate(async () => {
      const R = RWB, A = R.audio; R.voiceReset(); A.trace.length = 0;
      let fallback = 0;
      A.queueVoice('missing-fixture', R.voiceUrl('riley_super_01'), { minDuration: 999, onMissing: () => fallback++ });
      A.queueVoice('riley_super_01', R.voiceUrl('riley_super_01'));
      await voiceTestIdle(); return { fallback, trace: A.trace.filter(t => t.name.startsWith('clip')) };
    });
    completeSequence(missing.trace, ['riley_super_01']);
    check(missing.fallback === 1, 'Missing/placeholder speech falls back once and does not block the next line');
    const cancelled = await page.evaluate(async () => {
      const R = RWB, A = R.audio; R.voiceReset(); A.trace.length = 0;
      let fallback = 0;
      A.queueVoice('cancelled-fixture', R.voiceUrl('riley_super_01') + '&sequence-test=slow-cancel', { onMissing: () => fallback++ });
      R.voiceReset(); await voiceTestSleep(700);
      return { fallback, busy: A.voiceBusy, played: A.trace.some(t => t.name.startsWith('clip:')) };
    });
    check(!cancelled.played && !cancelled.busy && cancelled.fallback === 0, 'Scene reset cancels delayed speech and its fallback without a stale callback');
    const skip = await page.evaluate(() => {
      const R = RWB, A = R.audio; R.voiceReset();
      const reel = new R.scenes.Reel({ setScene() {} }, [R.VOICE_LINES.riley_super_01, R.VOICE_LINES.riley_callandor_01], () => null);
      R.game.scene = reel;
      const input = { pressed: {} };
      reel.update(1 / 60, input); const first = A.voicePlaying;
      reel.advance(); reel.update(1 / 60, input); const second = A.voicePlaying;
      R.voiceReset();
      A.setMuted(true); R.voice('riley_super_01', { sequence: true }); const mutedBusy = A.voiceBusy; A.setMuted(false);
      return { first, second, mutedBusy };
    });
    check(skip.first === 'riley_super_01' && skip.second === 'riley_callandor_01', 'Explicit Reel NEXT can skip a protected line and immediately speak the next caption');
    check(!skip.mutedBusy && errors.length === 0, 'Muted speech never holds a transition; no browser script errors');
    const recovery = await page.evaluate(async () => {
      const R = RWB, A = R.audio, context = voiceTestContexts[0];
      const prepareClear = () => {
        const s = voiceTestScene(0); s.phase = 'clear'; s.clearTimer = 0;
        R.voice('chieftain_defeat_01', { sequence: true });
        return s;
      };
      const clear = s => {
        s.update(1 / 60, { pressed: {}, held: {}, axis: () => ({ x: 0, y: 0 }) });
        const advanced = !!s.game.nextScene;
        s.exit();
        return advanced && !A.voicePending;
      };
      const suspendedScene = prepareClear();
      await context.suspend();
      const protectedWhileSuspended = A.voicePending && !A.voiceBusy;
      const before = A.trace.filter(t => t.name.startsWith('clip:')).length;
      for (let i = 0; i < 50; i++) R.voice('riley_fire_01');
      const barksDropped = before === A.trace.filter(t => t.name.startsWith('clip:')).length;
      const suspendedClears = clear(suspendedScene);
      await context.resume();
      R.voice('riley_super_01', { sequence: true });
      const resumed = A.voiceBusy && A.voicePlaying === 'riley_super_01';
      R.voiceReset();
      const mutedScene = prepareClear(); A.setMuted(true);
      const mutedClears = !A.voiceBusy && clear(mutedScene); A.setMuted(false);
      const zeroScene = prepareClear(); A.setVolume(0); A.setMuted(false);
      const zeroClears = !A.voiceBusy && clear(zeroScene); A.setVolume(1);
      R.voiceReset(); R.voice('riley_super_01', { sequence: true });
      const restored = A.voiceBusy && A.voicePlaying === 'riley_super_01';
      R.voiceReset();
      return { protectedWhileSuspended, barksDropped, suspendedClears, resumed, mutedClears, zeroClears, restored };
    });
    check(recovery.protectedWhileSuspended && recovery.barksDropped && recovery.suspendedClears && recovery.resumed,
      'Suspended audio drops incidental barks, allows clear, and resumes cleanly after scene reset');
    check(recovery.mutedClears && recovery.zeroClears && recovery.restored,
      'Mute or zero volume during protected speech cannot trap clear; restoring audio speaks normally');
    const silentR = require('./soak.cjs').boot(root);
    let silentAdvanced = false;
    const silentScene = new silentR.scenes.Play({ setScene() { silentAdvanced = true; } }, 0, { wave: 5 });
    silentR.game.scene = silentScene; silentScene.phase = 'clear'; silentScene.clearTimer = 0;
    silentR.voice('chieftain_defeat_01', { sequence: true });
    silentScene.update(1 / 60, { pressed: {}, held: {}, axis: () => ({ x: 0, y: 0 }) });
    check(silentAdvanced && !silentR.audio.voicePending && !silentR.audio.voiceBusy,
      'No AudioContext: subtitle/fallback path cannot trap the clear screen');
    // Exercise the legacy generator with the actual mixed Edge/Kokoro dump,
    // replacing synthesis/ffmpeg only. No network call or approved asset write.
    const dump = cp.execFileSync(process.execPath, [path.join(__dirname, 'voices-dump.cjs')], { encoding: 'utf8' });
    const generator = cp.spawnSync('python3', ['-c', `
import contextlib, io, json, os, pathlib, runpy, sys, tempfile, types
sys.modules['edge_tts'] = types.SimpleNamespace()
table = json.load(sys.stdin)
ns = runpy.run_path(sys.argv[1]); g = ns['main'].__globals__
expected = {line['id'] for line in table['lines'] if line['generated'] and line['who'] in table['tts'] and line['who'] not in table.get('localCast', {})}
# Even an accidental future overlapping configuration must not touch local cast.
table['tts']['riley'] = table['tts']['narrator']
with tempfile.TemporaryDirectory() as tmp:
    source = pathlib.Path(tmp) / 'voices.json'; source.write_text(json.dumps(table))
    g['OUT'] = str(pathlib.Path(tmp) / 'out'); g['measure'] = lambda path: -16.0
    async def synth(text, cfg, path): pathlib.Path(path).write_bytes(b'fixture')
    g['synth'] = synth
    g['subprocess'].run = lambda args, **kwargs: pathlib.Path(args[-1]).write_bytes(b'fixture')
    sys.argv = [sys.argv[1], str(source)]
    with contextlib.redirect_stdout(io.StringIO()) as output: ns['main']()
    actual = {row.split()[0] for row in output.getvalue().splitlines()}
    assert actual == expected, (actual - expected, expected - actual)
    sys.argv.append('st1_moiraine_01')
    with contextlib.redirect_stdout(io.StringIO()) as local_output: ns['main']()
    assert local_output.getvalue() == ''
print('Legacy Edge generator selected only its configured non-local speakers')
`, path.join(__dirname, 'make-voices.py')], { input: dump, encoding: 'utf8' });
    check(generator.status === 0, 'Legacy Edge generation skips every approved Kokoro voice, including overlapping config: ' + (generator.stderr || generator.stdout).trim());
    console.log(passed + ' voice sequencing checks passed.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
