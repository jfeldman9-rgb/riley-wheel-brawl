import test from 'node:test';
import assert from 'node:assert/strict';
import { stage1Simulation, withSeed } from './helpers/stage1-simulation.mjs';
import { stage7Simulation } from './helpers/stage7-harness.mjs';
import { HUD } from '../src/hud.js';
import { Asmodean, ASMODEAN, CHANNEL_BANNER } from '../src/asmodean.js';
import { bindStage7Hud, paintStage7Hud } from '../src/stage7-hud.js';
import { STORY7_SCRIPT, STORY7_PANELS } from '../src/stage7.js';
import { q } from '../src/config.js';

// DOM dispatch order: window capture, document capture, target, document
// bubble, window bubble; listeners on each target run in registration order.
// In particular, Phaser's bubble listener is registered BEFORE Input's.
function browserEvents() {
  const listeners = { window: [], document: [] }, trace = [];
  const add = target => (type, fn, options) => {
    const listener = { type, fn, capture: options === true || !!options?.capture };
    listeners[target].push(listener);
    return () => { listeners[target] = listeners[target].filter(item => item !== listener); };
  };
  const savedAdd = globalThis.addEventListener;
  globalThis.addEventListener = add('window');
  const dispatch = (type, code = 'Escape', repeat = false) => {
    const event = { type, code, repeat, defaultPrevented: false, eventPhase: 0,
      target: { closest: () => null },
      preventDefault() { this.defaultPrevented = true; },
      stopImmediatePropagation() { this.stopped = true; },
    };
    for (const [target, capture, phase] of [
      ['window', true, 1], ['document', true, 1],
      ['document', false, 3], ['window', false, 3],
    ]) {
      event.eventPhase = phase;
      for (const listener of listeners[target].slice()) {
        if (event.stopped) break;
        if (listener.type === type && listener.capture === capture) {
          trace.push([target, capture, type]); listener.fn(event);
        }
      }
    }
    event.eventPhase = 0;
    return event;
  };
  return { addWindow: add('window'), addDocument: add('document'), dispatch, trace,
    restore() { globalThis.addEventListener = savedAdd; } };
}

function scene(stage, fn, debug = false) {
  return withSeed(1, () => {
    const events = browserEvents(), oldDebug = q.get('s7debug');
    if (debug) q.set('s7debug', '1');
    let h;
    try {
      const queued = [];
      // Models Phaser observing the event before Input handles it.
      events.addWindow('keydown', e => { if (!e.defaultPrevented) queued.push(e); });
      h = stage === 7 ? stage7Simulation({ mode: false }) : stage1Simulation({ stage, mode: false });
      h.setController(null);
      const s = h.s;
      s.started = true; s.ended = s.gameOver = false;
      s.enemies = []; s.pending = []; s.locked = true;
      s.riley.inv = 99;
      fn(s, h, events, queued);
    } finally {
      h?.destroy(); events.restore();
      oldDebug === null ? q.delete('s7debug') : q.set('s7debug', oldDebug);
    }
  });
}

function assertOwnedPress(s, h, events, queued, code = 'Escape') {
  let lateDom = 0, lateActions = 0;
  events.addDocument('keydown', () => { lateDom++; });
  events.addWindow('keydown', () => { lateDom++; s.onPress('pause'); });
  // Input.emit uses forEach, so a second action listener can still be invoked
  // after the first listener closes the scene. The scene must reject that edge.
  s.inp.on('press', action => { lateActions++; s.onPress(action); });
  const event = events.dispatch('keydown', code);
  assert.equal(event.defaultPrevented, true);
  assert.equal(s.cutscene, null);
  assert.equal(s.paused, false, 'the initial dispatch only dismisses the dialog');
  assert.equal(s.pauseReasons.has('manual'), false);
  assert.equal(lateDom, 1, 'document ran before Input; later window listeners were stopped');
  assert.equal(lateActions, 1, 'the duplicate action listener ran');
  assert.equal(queued.length, 1, 'Phaser saw the original event before Input consumed it');
  assert.equal(s.inp.peek('pause'), false);
  assert.equal(s.inp.peek('start'), false);
  assert.equal(!!s.inp.held.pause || !!s.inp.held.start, false, 'Input must not resurrect a consumed held action');
  for (let frame = 0; frame < 120; frame++) {
    // Expire the previous 350ms workaround; ownership must last until keyup.
    if (s.kit) s.kit.echo = performance.now() - 1000;
    s.inp.clear();
    events.dispatch('keydown', code, frame % 2 === 0);
    s.onPress('pause'); // delayed scene handler / held-key polling
    s.inp.press('start'); // same gesture, different pause alias
    h.step();
    assert.equal(s.paused, false, `held press cannot pause on frame ${frame}`);
    assert.equal(s.inp.take('pause'), false);
    assert.equal(s.inp.take('start'), false);
  }
  events.dispatch('keyup', code);
  // The duplicate listeners stay installed. A real fresh keyboard edge must
  // toggle once and also bypass the touch-echo time guard.
  if (s.kit) s.kit.echo = performance.now();
  events.dispatch('keydown', code);
  assert.equal(s.paused, true, 'fresh Esc/Enter/P after release pauses immediately');
  events.dispatch('keyup', code);
}

for (const stage of [1, 2, 3, 4, 5, 6, 7]) {
  test(`Stage ${stage}: story owns Esc through DOM dispatch, action listeners and held frames`, () => scene(stage, (s, h, events, queued) => {
    s.startCutscene(stage === 7 ? STORY7_SCRIPT : [{ who: 'RILEY', text: 'Story line', panel: 0 }],
      stage === 7 ? STORY7_PANELS : [{ key: 'story7p1' }], () => {});
    assertOwnedPress(s, h, events, queued);
  }));
}

for (const code of ['Escape', 'KeyP', 'Enter']) {
  test(`Stage 7: ${code} consumes a video cutscene stub and waits for release`, () => scene(7, (s, h, events, queued) => {
    s.cutscene = { press() { s.cutscene = null; s.setPauseReason('cutscene', false); } };
    s.setPauseReason('cutscene', true);
    assertOwnedPress(s, h, events, queued, code);
  }));
}

test('Stage 7: rendered Asmodean dialog owns Esc until release, including later frames', () => scene(7, (s, h, events, queued) => {
  const node = () => ({ text: '', setText(t) { this.text = t; return this; }, setAlpha(a) { this.alpha = a; return this; } });
  Object.assign(s.hud, { caption: HUD.prototype.caption,
    capWho: node(), capText: node(), capBg: node(), drawCaptionBackground() {} });
  s.caption('ASMODEAN', 'Listen — even the glass sings for me.');
  assert.ok(s.hud.capT > 0);
  assertOwnedPress(s, h, events, queued);
  assert.equal(s.hud.capT, 0);
}));

test('a document capture listener that dismisses the story consumes the event before window Input', () => scene(3, (s, h, events) => {
  s.startCutscene([{ who: 'RILEY', text: 'Story line', panel: 0 }], [{ key: 'story7p1' }]);
  events.addDocument('keydown', () => s.onPress('pause'), true);
  events.dispatch('keydown');
  assert.equal(s.cutscene, null); assert.equal(s.paused, false);
  h.step(); assert.equal(s.paused, false);
}));

for (const debug of [false, true]) {
  test(`${debug ? 'T debug' : 'normal'} channel remains stationary for its full 1.8s and completes with one shockwave`, () => scene(7, (s, h, events) => {
    s.zoneI = 3; s.zone = s.zones[3]; s.camX = s.camMax = 3920;
    s.bounds = { l: 3920, r: 5200 }; s.kit._zone = 3;
    s.kit.notes.next = Infinity;
    const b = s.boss = new Asmodean(s, 4800, 630);
    s.enemies = [b]; b.phase = 3; b.hp = 150;
    b.clock = 80; b.st = 50; // cast starts independently of the previous state age
    if (debug) events.dispatch('keydown', 'KeyT');
    else b.startChannel();
    assert.equal(b.state, 'channel'); assert.equal(b.st, 0);
    const position = [b.x, b.y];
    let waves = 0;
    const wave = s.kit.arena.wave;
    s.kit.arena.wave = function (boss) { waves++; return wave.call(this, boss); };
    for (let i = 0; i < 107; i++) {
      h.step(1 / 60);
      assert.equal(b.state, 'channel', `channel ended early at ${(i + 1) / 60}s`);
      assert.deepEqual([b.x, b.y], position);
      assert.equal(b.channelHits, 0); assert.equal(waves, 0);
    }
    assert.ok(b.st >= ASMODEAN.channel - 1 / 60 - 1e-6);
    h.step(1 / 60);
    if (b.state === 'channel') h.step(1 / 120); // fixed-step floating-point boundary
    assert.equal(b.state, 'idle'); assert.equal(waves, 1);
    for (let i = 0; i < 20; i++) h.step(1 / 60);
    assert.equal(waves, 1);
  }, debug));
}

test('channel banner cancels a previous fade, stays visible for the full cast, and HUD binding restores on cleanup', () => scene(7, s => {
  const tweens = [], flash = { alpha: 1 }, flashBg = { alpha: 1 };
  const hud = { flash, flashBg, flashPair: [flashBg, flash],
    tweens: {
      killTweensOf(targets) {
        const nodes = Array.isArray(targets) ? targets : [targets];
        for (let i = tweens.length - 1; i >= 0; i--)
          if (nodes.includes(tweens[i].targets)) tweens.splice(i, 1);
      },
      add(config) { tweens.push(config); },
    },
    flashText(text) { flash.text = text; flash.alpha = 1; this.tweens.add({ targets: flash, alpha: 0, delay: 1400, duration: 600 }); },
  };
  hud.flashText('THE KEY');
  const original = hud.flashText, unbind = bindStage7Hud(hud, s.kit);
  s.boss = { state: 'channel' };
  hud.flashText(CHANNEL_BANNER);
  assert.equal(tweens.length, 0, 'old and default fades are cancelled');
  for (let i = 0; i < 120; i++) paintStage7Hud(hud, s);
  assert.equal(tweens.length, 0, 'no wall-clock fade can hide an active channel');
  s.boss.state = 'idle';
  paintStage7Hud(hud, s); paintStage7Hud(hud, s);
  assert.equal(tweens.length, 1, 'completion starts exactly one fade');
  hud.flashText('CHANNEL BROKEN');
  assert.equal(tweens.length, 1, 'break feedback replaces the channel fade');
  assert.equal(flash.text, 'CHANNEL BROKEN');
  unbind(); assert.equal(hud.flashText, original);
}));

for (const debug of [false, true])
  test(`physical KeyU uses the channel debug call only with s7debug=${+debug}`, () => {
    const savedLog = console.log, logs = [];
    console.log = (...args) => logs.push(args.join(" "));
    try {
      scene(7, (s, h, events) => {
        s.zoneI = s.kit._zone = 3; s.zone = s.zones[3];
        s.camX = s.camMax = 3920; s.bounds = { l: 3920, r: 5200 };
        const b = new Asmodean(s, 4800, 630);
        s.boss = b; s.enemies.push(b);
        s.riley.x = 4400; s.riley.y = 630;
        s.kit.notes.next = Infinity;
        // A fully charged U outside channel is a debug no-op. Without debug it
        // retains its normal assist binding and spends the charge.
        b.bashAt = b.channelAt = Infinity;
        events.dispatch('keydown', 'KeyU'); events.dispatch('keyup', 'KeyU');
        h.step(0.1);
        if (!debug) {
          assert.ok(s.kit.strike); assert.equal(s.kit.stats.calls, 1);
          assert.deepEqual(logs, []); return;
        }
        assert.equal(s.kit.strike, undefined);
        assert.equal(s.kit.call.charges, 1);
        assert.equal(s.kit.stats.calls, 0);
        assert.ok(logs.some(line => line.startsWith('[s7dbg] call no-op state=idle ')));
        b.phase = 3; b.hp = 190; b.startChannel();
        s.kit.call.charges = 0; s.kit.call.calls = 3; s.kit.call.phaseCalls[3] = 1;
        const clock = b.clock, hp = b.hp;
        events.dispatch('keydown', 'KeyU'); events.dispatch('keyup', 'KeyU');
        assert.ok(s.kit.strike, 'fires immediately through the regular call loader');
        assert.equal(s.kit.strike.helper, 'duo');
        assert.equal(s.kit.call.on, true);
        assert.equal(s.kit.stats.calls, 1);
        assert.equal(s.inp.peek('assist'), false, 'U cannot replay through Riley');
        // Busy calls retain the normal safety checks even with the debug bypass.
        events.dispatch('keydown', 'KeyU'); events.dispatch('keyup', 'KeyU');
        assert.equal(s.kit.stats.calls, 1);
        h.step(0.7);
        assert.equal(b.clock, clock, 'normal helper freeze, not a direct debug hit');
        assert.equal(b.hp, hp - 36);
        assert.equal(b.state, 'stagger');
        assert.equal(b.staggerFor, ASMODEAN.stun);
        assert.ok(logs.some(line => line.startsWith('[s7dbg] channel break src=call t=')));
        const calls = s.kit.stats.calls;
        events.dispatch('keydown', 'KeyU'); events.dispatch('keyup', 'KeyU');
        assert.equal(s.kit.stats.calls, calls);
        assert.ok(logs.some(line => line.startsWith('[s7dbg] call no-op state=stagger ')));
      }, debug);
    } finally { console.log = savedLog; }
  });
