'use strict';
const assert = require('node:assert/strict');
const { boot } = require('./soak.cjs');
const R = boot(require('node:path').resolve(__dirname, '..'));
let passed = 0;
const check = (condition, name) => { assert.ok(condition, name); passed++; console.log('PASS ' + name); };
const actualVoice = R.voice, calls = [];
R.voice = (id, opts) => { calls.push({ id, opts }); return true; };
function scene(stage = 0) {
  const s = new R.scenes.Play(R.game, stage, {});
  s.enemies = []; s.subtitleQueue = []; s.subtitle = null;
  R.game.scene = s; calls.length = 0;
  return s;
}
const count = id => calls.filter(c => c.id === id).length;
function hit(s, name, landed = true) {
  const p = s.player;
  p.beginMove(name); p.stateT = R.MOVES[name].active[0];
  s.enemies = [{ dead: false, hurtbox: () => R.collide.front(p, 20, 0, 32, 2, 26) }];
  s.damageEnemy = () => landed;
  p.updateAttack(0);
}
for (const [move, id] of [['front', 'riley_combo_01'], ['round', 'riley_combo_02'], ['back', 'riley_combo_03']]) {
  const s = scene(); hit(s, move, false);
  check(count(id) === 0, move + ' whiff/rejected damage does not announce a tutorial success');
  s.time = 10; hit(s, move); s.time = 20; hit(s, move);
  check(count(id) === 1, move + ' successful tutorial hit speaks once per Stage 1 context');
  const later = scene(1); hit(later, move);
  check(count(id) === 0, move + ' tutorial stays out of later stages');
}
{
  const s = scene(), p = s.player;
  p.utilityVoice('riley_combo_01'); p.utilityVoice('riley_combo_02');
  check(calls.length === 1 && calls[0].opts.flavor === true, 'Utility events share a six-second drop-only spacing gate');
  s.time = 6; p.utilityVoice('riley_combo_02');
  check(calls.length === 2, 'A later fresh eligible event can speak after the spacing gate');
  s.time = 12; s.subtitleQueue.push({}); p.utilityVoice('riley_combo_03');
  check(calls.length === 2, 'Queued story subtitles suppress utility chatter');
  s.subtitleQueue = []; s.subtitle = {}; p.utilityVoice('riley_combo_03');
  check(calls.length === 2, 'Visible story subtitles suppress utility chatter');
  s.subtitle = null; s.paused = true; p.utilityVoice('riley_combo_03');
  check(calls.length === 2, 'Pause cannot emit a utility line');
  s.paused = false; p.dead = true; p.utilityVoice('riley_combo_03');
  check(calls.length === 2, 'Death cannot emit a utility line');
}
{
  const s = scene(), p = s.player;
  p.hp = 26; p.onHurt(1, {}); check(count('riley_low_01') === 0, 'Low-health warning does not fire above 25 HP');
  p.hp = 25; p.onHurt(1, {}); s.time = 20; p.onHurt(1, {});
  check(count('riley_low_01') === 1, 'Low-health crossing warns once without nagging on subsequent hits');
  p.hp = 40; p.updateTaint(0); p.hp = 24; p.onHurt(1, {});
  check(count('riley_low_01') === 1, 'Healing only to 40 HP does not rearm the warning');
  p.hp = 41; p.updateTaint(0); p.hp = 24; p.onHurt(1, {});
  check(count('riley_low_01') === 2, 'Recovery above 40 HP rearms a later low-health crossing');
  p.hp = 0; s.time = 40; p.onHurt(1, {});
  check(count('riley_low_01') === 2, 'Fatal damage does not play a living low-health line');
}
{
  const s = scene(), p = s.player;
  p.power = 99; p.updateTaint(0); check(count('riley_saidin_full_01') === 0, 'Saidin callout waits for an actually full meter');
  p.power = 100; p.updateTaint(0); s.time = 10; p.updateTaint(0);
  p.power = 0; p.updateTaint(0); p.power = 100; p.updateTaint(0);
  check(count('riley_saidin_full_01') === 1, 'First full meter speaks once per stage, not every full-meter frame/cycle');
  const s2 = scene(), p2 = s2.player;
  s2.subtitle = {}; p2.power = 100; p2.updateTaint(0); s2.subtitle = null; s2.time = 10; p2.updateTaint(0);
  check(count('riley_saidin_full_01') === 0, 'Suppressed full-meter event is dropped rather than replayed late');
}
{
  const s = scene(), p = s.player;
  const pickup = new R.Pickup(s, p.x, p.y, 'angreal'); pickup.collect(p); pickup.collect(p);
  s.time = 10; new R.Pickup(s, p.x, p.y, 'angreal').collect(p);
  check(count('riley_angreal_01') === 1 && p.angreal === R.TUNE.angrealSeconds, 'Actual angreal collection announces once without changing its effect');
  const t = scene(); t.phase = 'clear'; t.player.loialReady = false; t.callLoial();
  check(count('riley_call_spent_01') === 0, 'Invalid non-combat ally input stays silent');
  t.phase = 'play'; t.player.loialReady = true; check(t.callLoial(), 'Ready Loial call still succeeds');
  t.time = 10; check(!t.callLoial(), 'Spent Loial call still rejects without spawning another ally');
  t.time = 20; t.callLoial();
  check(count('riley_call_spent_01') === 1 && t.allies.length === 1, 'First spent Loial attempt explains the limit only once');
}
{
  const s = scene(); let randomCalls = 0;
  const rand = R.util.rand;
  R.util.rand = (...args) => { randomCalls++; return rand(...args); };
  R.__setRandom(() => { randomCalls++; return 0.5; });
  s.player.utilityVoice('riley_angreal_01');
  s.time = 10; s.player.utilityVoice('riley_call_spent_01');
  check(randomCalls === 0, 'New contextual voice selection consumes no gameplay or global RNG draws');
  R.util.rand = rand; R.__setRandom(Math.random);
}
check(!!R.VOICE_RETIRED.riley_juggle_01, 'Nonexistent launcher callout is explicitly retired, not attached to an unrelated move');
check(!R.VOICE_TRIGGERS.combat.includes('riley_juggle_01'), 'Retired launcher clip is not preloaded for combat');
(async () => {
  R.voice = actualVoice;
  const realAudio = R.audio, plays = [];
  let resolveLoad;
  R.audio = { voicePlaying: 'other', voicePending: false, hasClip: () => false,
    playClip: id => { plays.push(id); return false; }, now: () => 0,
    loadClip: () => new Promise(resolve => { resolveLoad = resolve; }), sfx: {} };
  check(R.voice('riley_angreal_01', { flavor: true }) === false && plays.length === 0, 'Flavor cannot interrupt an ordinary recorded voice');
  R.audio.voicePlaying = null;
  R.voice('riley_angreal_01', { flavor: true });
  const before = plays.length; R.audio.voicePlaying = 'moiraine_heal_01'; resolveLoad({ duration: 2 });
  await Promise.resolve(); await Promise.resolve();
  check(plays.length === before, 'Late flavor download cannot cut a voice that began while it loaded');
  R.audio.voicePlaying = null;
  R.voice('riley_angreal_01', { flavor: true });
  const deathBefore = plays.length; R.game.scene.phase = 'death'; resolveLoad({ duration: 2 });
  await Promise.resolve(); await Promise.resolve();
  check(plays.length === deathBefore, 'A delayed utility clip is discarded if its gameplay context ends');
  R.audio = realAudio;
  console.log(passed + ' utility-voice checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
