import test from 'node:test';
import assert from 'node:assert/strict';
import { stage1Simulation, withSeed } from './helpers/stage1-simulation.mjs';
import { stage7Simulation } from './helpers/stage7-harness.mjs';
import { videoEnv } from './stage6-hardening-fixtures.mjs';
import { q } from '../src/config.js';
import { CutscenePlayer, GUARD_MS, START_MS, EVENT_CLIPS } from '../src/cutscene.js';
import { isMuted, toggleMute } from '../src/audio.js';
import { TWIX_SCRIPT } from '../src/twix.js';
import { scheduleTwixDebug } from '../src/twix-video.js';
import { Asmodean } from '../src/asmodean.js';
import { STAGE7 } from '../src/stage7-def.js';

function query(params, run) {
  const old = [...q];
  for (const key of [...q.keys()]) q.delete(key);
  for (const [key, value] of new URLSearchParams(params)) q.set(key, value);
  const restore = () => { for (const key of [...q.keys()]) q.delete(key); for (const [key, value] of old) q.set(key, value); };
  try { const result = run(); if (result?.then) return result.finally(restore); restore(); return result; }
  catch (e) { restore(); throw e; }
}
const steps = (h, count) => { for (let i = 0; i < count; i++) h.step(); };
const world = s => JSON.stringify({ now: s.time.now,
  r: [s.riley.x, s.riley.y, s.riley.z, s.riley.hp, s.riley.state, s.riley.fi, s.riley.saidin],
  e: s.enemies.map(e => [e.id, e.x, e.y, e.z, e.hp, e.state, e.fi, e.cool]),
  wave: [s.zoneI, s.wave, s.pending.map(p => p.t)], powers: [s.powers.boost, s.powers.ter],
  pickups: s.pickups.map(p => [p.kind, p.t]) });
function video(s) {
  const e = videoEnv(); s.cutRoot = e.root;
  // Production installCutscenes owns this gesture-blessed element.
  const player = new CutscenePlayer(e.root); e.root.__rwbCutscenes = { player };
  Object.assign(s.game, { isPaused: false, pause() { this.isPaused = true; }, resume() { this.isPaused = false; } });
  e.player = player;
  e.overlay = () => e.root.document.body.children.find(c => c.id === 'rwb-cutscene');
  return e;
}
function finish(e, s, how) {
  e.advance(GUARD_MS + 50);
  if (how === 'end') e.player.video.fire('ended');
  else if (how === 'error') e.player.video.fire('error');
  else if (how === 'timeout') { e.clock = false; e.advance(START_MS + 500); }
  else if (how === 'tap') e.overlay().fire('click');
  else s.inp.press(how);
}
function cleaned(e, s) {
  assert.equal(e.overlay(), undefined); assert.equal(e.player.video.src, '');
  assert.equal(e.player.active, false); assert.equal(e.timers.size, 0);
  assert.equal(s.game.isPaused, false); assert.equal(s.pauseReasons.has('cutscene'), false);
}

for (const how of ['end', 'attack', 'pause', 'tap', 'error', 'timeout']) {
  test(`T-Rex follows Asmodean's complete victory sequence, then continues on ${how}`, () => query('s7=1&cutscenes=1', () => withSeed(1, () => {
    const h = stage7Simulation({ mode: false }), s = h.s;
    q.set('story', '1'); // harness normally suppresses videos/story for campaigns
    const e = video(s);
    try {
      s.zoneI = 3; s.zone = s.zones[3]; s.kit._zone = 3;
      s.bounds = { l: 3920, r: 5200 }; s.camX = s.camMax = 3920;
      s.riley.x = 4500; s.riley.y = 630;
      const b = s.boss = new Asmodean(s, 5000, 630);
      b.phase = 3; b.hp = 1; s.enemies = [b];
      assert.equal(e.overlay(), undefined);
      b.takeHit({ dmg: 2 });
      assert.equal(s.victoryPending, true); assert.equal(s.kit.outro, true);
      assert.equal(s.cutscene, null, 'no bonus at the defeat/bind beat');
      const clock = s.kit.clock;
      assert.deepEqual(s.kit.tasks.map(t => +(t.at - clock).toFixed(1)), [.7, 5.8, 9, 11.4, 13.4]);
      steps(h, 60 * 13);
      assert.equal(e.overlay(), undefined, 'the entire dialogue runs before the bonus');
      for (let i = 0; i < 180 && !s.cutscene; i++) h.step();
      assert.equal(s.cutscene?.video, 'trex', JSON.stringify({ clock: s.kit.clock, tasks: s.kit.tasks.map(t => t.at), q: [...q], bot: !!s.bot, ended: s.ended, gameOver: s.gameOver, paused: s.paused, stageData: s.stageData }));
      assert.equal(e.player.video.src, 'assets/cutscenes/trex.mp4');
      assert.equal(e.player.video.poster, 'assets/cutscenes/trex.jpg');
      assert.equal(s.ended, false); assert.equal(s.clearShown, false);
      assert.equal(h.observations.hud.filter(x => x.method === 'stageClear').length, 0);
      assert.equal(s.music.state, 'silent'); assert.equal(s.game.isPaused, true);
      // 32 s bonus must not be truncated by the player's old 30 s default.
      if (how === 'end') { e.advance(31_750); assert.ok(e.overlay()); }
      finish(e, s, how);
      cleaned(e, s);
      assert.equal(s.ended, true); assert.equal(s.music.state, 'clear');
      assert.equal(h.observations.hud.filter(x => x.method === 'stageClear').length, 1);
      assert.equal(s.clearShown, false); steps(h, 60);
      assert.equal(s.clearShown, true);
      assert.deepEqual(s.stageDef.next(q), { stage: 8, fromStage7: true, autostart: true });
      e.player.video.fire('ended');
      assert.equal(h.observations.hud.filter(x => x.method === 'stageClear').length, 1);
    } finally { h.destroy(); }
  })));
}

for (const how of ['end', 'attack', 'pause', 'tap', 'error', 'timeout']) {
  test(`Twix uses video, preserves the world, and resumes identically on ${how}`, () => query('cutscenes=1', () => withSeed(2, () => {
    const h = stage1Simulation({ mode: null }), s = h.s; steps(h, 30);
    const e = video(s);
    try {
      s.music.set('boss'); // resumeFight must preserve the previous fight track
      const before = world(s), resources = h.resources();
      s.collectPower('twix');
      assert.equal(s.cutscene.video, 'twix');
      assert.equal(e.player.video.src, 'assets/cutscenes/twix.mp4');
      assert.equal(e.player.video.poster, 'assets/cutscenes/twix.jpg');
      assert.equal(h.observations.hud.filter(x => x.method === 'showCutscene').length, 0);
      assert.equal(s.music.state, 'silent'); assert.equal(s.game.isPaused, true);
      steps(h, 120); assert.equal(world(s), before);
      finish(e, s, how);
      if (how === 'error' || how === 'timeout') {
        assert.equal(e.overlay(), undefined); assert.equal(s.paused, true);
        assert.equal(s.cutscene.line.id, TWIX_SCRIPT[0].id);
        assert.equal(s.music.state, 'cutscene'); assert.equal(s.game.isPaused, false);
        assert.equal(h.observations.hud.filter(x => x.method === 'showCutscene').length, 1);
        assert.equal(world(s), before);
        if (how === 'error') {
          const ids = [s.cutscene.line.id];
          while (s.cutscene) { s.cutscene.t = 1; s.inp.press('attack'); if (s.cutscene) ids.push(s.cutscene.line.id); }
          assert.deepEqual(ids, TWIX_SCRIPT.map(l => l.id), 'unchanged panel script');
        } else s.inp.press('pause');
      }
      cleaned(e, s);
      assert.equal(s.cutscene, null); assert.equal(s.paused, false); assert.equal(s.music.state, 'boss');
      assert.equal(s.cutsceneResult, how === 'end' || how === 'error' ? 'end' : 'skip');
      assert.equal(world(s), before); assert.deepEqual(h.resources(), resources);
      assert.equal(h.observations.hud.filter(x => x.method === 'hideCutscene').length, 1);
      steps(h, 1); assert.ok(s.time.now > JSON.parse(before).now);
      assert.equal(s.pauseReasons.has('manual'), false); assert.deepEqual(s.inp.buf, {});
    } finally { h.destroy(); }
  })));
}

for (const key of ['trex', 'twix']) {
  test(`${key}: shutdown aborts and never continues or opens fallback panels`, () => query('cutscenes=1', () => {
    const h = stage1Simulation({ mode: null }), s = h.s; steps(h, 30);
    const e = video(s);
    if (key === 'twix') s.startTwixCutscene();
    else {
      // Use the same victory callback as the real Stage 7 registry.
      s.stageNo = 7; s.kit = { beginOutro() {}, destroy() {}, later(t, fn) { if (t === 13.4) fn(); } };
      s.victoryPending = true;
    }
    if (key === 'trex') STAGE7.bossDown(s);
    h.destroy(); cleaned(e, s);
    e.player.video.fire('error'); e.player.video.fire('ended');
    assert.equal(s.ended, false);
    assert.equal(h.observations.hud.filter(x => ['stageClear', 'showCutscene'].includes(x.method)).length, 0);
  }));
}

test('event videos honor mute without a gesture unmuting it, and reuse the stage player', () => query('cutscenes=1', () => {
  const h = stage1Simulation({ mode: null }), s = h.s; steps(h, 30);
  const e = video(s); if (!isMuted()) toggleMute();
  try {
    s.startTwixCutscene(); assert.equal(e.player.video.muted, true);
    e.player.bless(); assert.equal(e.player.video.muted, true);
    assert.equal(e.videos.length, 1);
    finish(e, s, 'end'); assert.equal(s.paused, false);
  } finally { h.destroy(); if (isMuted()) toggleMute(); }
}));

test('debug URL triggers Twix shortly after Stage 1 start; plain twix flag and other stages do not', () => {
  query('stage=1&debug=1&twix=1&autostart=1', () => {
    const h = stage1Simulation({ mode: null }), s = h.s, e = video(s);
    try {
      steps(h, 120);
      assert.equal(s.cutscene?.video, 'twix');
      assert.equal(e.player.video.src, 'assets/cutscenes/twix.mp4');
      finish(e, s, 'end'); steps(h, 120); assert.equal(s.cutscene, null, 'one debug replay per start');
    } finally { h.destroy(); }
  });
  for (const params of ['twix=1', 'debug=0&twix=1', 'debug=1&twix=0', 'debug=1&twix=1']) query(params, () => {
    const calls = [];
    scheduleTwixDebug({ stageNo: params === 'debug=1&twix=1' ? 2 : 1, time: { delayedCall: (...a) => calls.push(a) } });
    assert.deepEqual(calls, []);
  });
});

test('event registry stays separate from stage-entry playback', () => {
  assert.deepEqual(EVENT_CLIPS, { trex: ['trex'], twix: ['twix'] });
});

for (const mode of ['demo=1', 'story=0', 'autostart=1', 'nocutscenes=1&cutscenes=1', 'cutscenes=0', 'webdriver', 'bot', 'scene-story-off']) {
  test(`T-Rex cannot stall the victory flow in ${mode}`, () => query(mode, () => {
    const h = stage1Simulation({ mode: null }), s = h.s; steps(h, 30);
    const e = video(s);
    if (mode === 'webdriver') e.root.navigator.webdriver = true;
    if (mode === 'bot') s.bot = { destroy() {} };
    if (mode === 'scene-story-off') s.stageData.story = false;
    s.stageNo = 7;
    s.kit = { beginOutro() {}, destroy() {}, later(t, fn) { if (t === 13.4 || t === .9) fn(); } };
    s.victoryPending = true;
    try {
      STAGE7.bossDown(s);
      assert.equal(s.ended, true); assert.equal(s.clearShown, true);
      assert.equal(s.paused, false); assert.equal(e.videos.length, 0);
      assert.equal(h.observations.hud.filter(x => x.method === 'stageClear').length, 1);
    } finally { h.destroy(); }
  }));
}

test('Twix falls back on rejected play() and a DOM setup failure, without stranded pauses', async () => {
  for (const mode of ['refused', 'DOM']) await query('cutscenes=1', async () => {
    const h = stage1Simulation({ mode: null }), s = h.s; steps(h, 30);
    const e = video(s);
    if (mode === 'refused') e.refused = Object.assign(new Error('codec'), { name: 'NotSupportedError' });
    else e.root.document.body.appendChild = () => { throw new Error('detached DOM'); };
    try {
      s.startTwixCutscene();
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(s.cutscene.line.id, TWIX_SCRIPT[0].id);
      assert.equal(s.game.isPaused, false); assert.equal(s.paused, true);
      assert.equal(e.player.active, false); assert.equal(e.timers.size, 0);
      s.inp.press('pause'); cleaned(e, s);
      assert.equal(s.paused, false); assert.equal(s.music.state, 'stage');
    } finally { h.destroy(); }
  });
});

test('an existing game pause stays owned by its caller after Twix', () => query('cutscenes=1', () => {
  const h = stage1Simulation({ mode: null }), s = h.s; steps(h, 30);
  const e = video(s); s.game.isPaused = true;
  try {
    s.startTwixCutscene(); finish(e, s, 'end');
    assert.equal(s.cutscene, null); assert.equal(s.game.isPaused, true);
    assert.equal(s.paused, false);
  } finally { h.destroy(); }
}));
