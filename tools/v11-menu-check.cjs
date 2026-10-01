'use strict';
// Deterministic menu/save/input coverage. Controller and touch inputs are simulated,
// never represented as physical Xbox, PlayStation, iPad, or phone validation.
const assert = require('assert/strict'), fs = require('fs'), path = require('path'), vm = require('vm');
const { boot } = require('./soak.cjs');
const root = path.resolve(__dirname, '..'), R = boot(root);
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
GlobalFonts.registerFromPath(path.join(root, 'assets/fonts/press-start-2p.ttf'), 'Press Start 2P');
const out = path.join(root, 'docs/review/v11'); fs.mkdirSync(out, { recursive: true });
let passed = 0;
const check = (name, fn) => { fn(); passed++; console.log('PASS ' + name); };
const input = (pressed = {}, pointer = { x: 0, y: 0 }) => ({ pressed, pointer, held: {}, axis: () => ({ x: 0, y: 0 }) });
const menuGame = () => ({ scene: null, nextScene: null, setScene(scene) { this.scene = scene; }, setSceneNow(scene) { this.scene = scene; } });

check('All 30 waves retain stage, wave, Hard mode, Loial use, meter, lives and Callandor through save/Continue', () => {
  for (let stage = 0; stage < 5; stage++) for (let wave = 0; wave < 6; wave++) {
    const play = new R.scenes.Play(R.game, stage, { wave, difficulty: 'hard', score: 12345, saidin: 57, loial: false, lives: 2, callandor: stage === 4 });
    play.saveCheckpoint();
    R.settings.set({ difficulty: 'normal' });
    const saved = R.settings.loadRun(), resumed = R.resumeRun(R.game, saved);
    assert.equal(resumed.levelIndex, stage); assert.equal(resumed.wave, wave);
    assert.equal(resumed.difficulty, 'hard'); assert.equal(resumed.player.score, 12345);
    assert.equal(resumed.player.power, 57); assert.equal(resumed.player.loialReady, false);
    assert.equal(resumed.player.lives, 2); assert.equal(resumed.player.callandor, stage === 4);
  }
});
check('Legacy v2 saves without difficulty continue on Normal in every stage', () => {
  R.settings.set({ difficulty: 'hard' });
  for (let level = 0; level < 5; level++) {
    R.settings.saveRun({ level, wave: 3, score: 750, extra: { lives: 2, loial: false, callandor: level === 4 } });
    const play = R.resumeRun(R.game, R.settings.loadRun());
    assert.equal(play.difficulty, 'normal'); assert.equal(play.wave, 3); assert.equal(play.player.lives, 2);
  }
});
check('Starting a run locks its difficulty before a story-menu option can change the next-run setting', () => {
  R.settings.set({ difficulty: 'hard' });
  const game = menuGame(), title = new R.scenes.Title(game); title.update(.1, input({ start: true }));
  R.settings.set({ difficulty: 'normal' });
  while (game.scene instanceof R.scenes.Reel) { const reel = game.scene; for (let i = 0; i < reel.lines.length; i++) reel.advance(); }
  assert(game.scene instanceof R.scenes.Play); assert.equal(game.scene.difficulty, 'hard');
});
check('Boss checkpoints keep damage and move history in all five stages', () => {
  for (let stage = 0; stage < 5; stage++) {
    const play = new R.scenes.Play(R.game, stage, { wave: 5, difficulty: 'hard', callandor: stage === 4 });
    play.boss.hp = 31; play.boss.usedAttacks.add(play.level.attacks[0]); play.boss.attackIndex = 2;
    play.twinkleFreed = stage === 4; play.rescueReady = stage === 4; play.saveCheckpoint();
    const resumed = R.resumeRun(R.game, R.settings.loadRun());
    assert.equal(resumed.boss.hp, 31); assert.equal(resumed.boss.attackIndex, 2);
    assert(resumed.boss.usedAttacks.has(play.level.attacks[0]));
    if (stage === 4) assert(resumed.twinkleFreed && resumed.rescueReady && !resumed.twinkle.captive);
  }
});
check('Callandor reveal survives interruption and only clears after final acknowledgement', () => {
  const game = menuGame();
  R.settings.saveRun({ level: 4, wave: 0, score: 4000, extra: { pendingReveal: 'callandor', callandor: true, difficulty: 'hard', lives: 2 } });
  let story = R.resumeRun(game, R.settings.loadRun());
  assert(story instanceof R.scenes.Reel); story.advance();
  assert.equal(R.settings.loadRun().extra.pendingReveal, 'callandor');
  story = R.resumeRun(game, R.settings.loadRun());
  for (let i = 0; i < story.lines.length + 3; i++) story.advance();
  assert.equal(R.settings.loadRun().extra.pendingReveal, undefined);
  assert.equal(R.settings.loadRun().extra.difficulty, 'hard');
});
check('Pause, nested Options/Controls/How to Play Back, and repeated resume keep all five fights frozen', () => {
  for (let stage = 0; stage < 5; stage++) {
    const play = new R.scenes.Play(menuGame(), stage, { difficulty: 'hard' });
    for (let repeat = 0; repeat < 3; repeat++) {
      play.update(1 / 60, input({ pause: true })); assert(play.paused);
      const time = play.time, hp = play.player.hp;
      for (const label of ['OPTIONS', 'CONTROLS', 'HOW TO PLAY']) {
        play.pauseMenu.sel = play.pauseMenu.items.findIndex(item => item.label === label);
        play.update(1 / 60, input({ start: true })); assert(play.pauseMenu.panel);
        play.update(2, input()); assert.equal(play.time, time); assert.equal(play.player.hp, hp);
        play.update(1 / 60, input({ pause: true })); assert(play.paused); assert.equal(play.pauseMenu.panel, null);
      }
      play.update(1 / 60, input({ pause: true })); assert(!play.paused);
    }
  }
});
check('Explicit pause clears hit-stop input and opens a clean menu after interruption', () => {
  const play = new R.scenes.Play(menuGame(), 0, {});
  play.latchedPress = { power: true }; play.latchedHeld = { attack: true };
  play.pause(); assert(play.paused); assert.equal(play.pauseMenu.panel, null);
  assert.equal(Object.keys(play.latchedPress).length, 0); assert.equal(Object.keys(play.latchedHeld).length, 0);
});
check('Title Options, Controls and How to Play return on Back; closing remap cancels capture', () => {
  for (const label of ['OPTIONS', 'CONTROLS', 'HOW TO PLAY']) {
    const game = menuGame(), title = new R.scenes.Title(game);
    title.selection = title.items().indexOf(label); title.update(1 / 60, input({ start: true }));
    const scene = game.scene;
    if (label === 'CONTROLS') { scene.panel.activate(); assert(R.input.capturing); scene.exit(); assert.equal(R.input.capturing, null); }
    scene.update(1 / 60, input({ pause: true })); assert(game.scene instanceof R.scenes.Title);
  }
});
check('Every story group pauses without advancing, nested Back stays paused, and credits accept Back', () => {
  for (const lines of Object.values(R.CAPTIONS)) {
    const game = menuGame(), reel = new R.scenes.Reel(game, lines, () => new R.scenes.Title(game));
    reel.update(.1, input()); const timer = reel.timer, index = reel.i;
    reel.update(.1, input({ pause: true })); assert(reel.paused);
    reel.pauseMenu.sel = 1; reel.update(.1, input({ start: true })); assert(reel.pauseMenu.panel);
    reel.update(2, input()); assert.equal(reel.timer, timer); assert.equal(reel.i, index);
    reel.update(.1, input({ pause: true })); assert(reel.paused && !reel.pauseMenu.panel);
    reel.update(.1, input({ pause: true })); assert(!reel.paused); assert.equal(reel.i, index);
  }
  const game = menuGame(), credits = new R.scenes.Victory(game);
  credits.update(2, input({ pause: true })); assert(game.scene instanceof R.scenes.Title);
});
check('Pause also freezes death and stage-clear timers without overwriting next-stage saves', () => {
  for (const phase of ['death', 'clear']) {
    const play = new R.scenes.Play(menuGame(), 3, {}); play.phase = phase;
    play.deathTimer = play.clearTimer = 2;
    R.settings.saveRun({level:4,wave:0,score:500,extra:{pendingReveal:'callandor',callandor:true,difficulty:'hard'}});
    play.update(.1, input({ pause: true })); play.update(3, input());
    assert.equal(play.deathTimer, 2); assert.equal(play.clearTimer, 2);
    assert.equal(R.settings.loadRun().extra.pendingReveal, 'callandor');
  }
});
check('Touch panels expose every setting and a persistent Back target without hit overlap', () => {
  R.input.touchEnabled = true; R.display.pc = false;
  for (const kind of ['options', 'controls']) {
    const panel = new R.OptionsPanel(kind, { full: true }), visited = new Set();
    for (let page = 0; page < panel.pages(); page++) {
      for (let row = 0; row < panel.rows.length - 1; row++) if (panel.visible(row)) {
        assert.equal(panel.rowAt({ x: 200, y: panel.rowY(row) }), row); visited.add(row);
      }
      panel.update(input({ click: true }, { x: 510, y: 290 }), 1 / 60);
    }
    assert.equal(visited.size, panel.rows.length - 1);
    assert.equal(panel.update(input({ click: true }, { x: 320, y: 290 }), 1 / 60), 'back');
  }
});
check('Touch gameplay targets are separated and reach 44 CSS pixels on 844×390 phone landscape and iPad landscape', () => {
  const buttons = R.input.touch.buttons;
  for (const [width, height] of [[844,390],[1024,768],[1180,820]]) {
    const scale = Math.min(width / 640, height / 360);
    for (const b of buttons) assert(b.r * 2 * scale >= 44, b.id + ' target too small');
  }
  for (let i = 0; i < buttons.length; i++) for (let j = i + 1; j < buttons.length; j++) {
    assert(Math.hypot(buttons[i].x - buttons[j].x, buttons[i].y - buttons[j].y) - buttons[i].r - buttons[j].r >= 12);
  }
});
check('Touch Game Over has distinct Continue/Title targets and cannot schedule both on timeout', () => {
  const game = menuGame(), play = new R.scenes.Play(game, 2, { difficulty: 'hard' });
  play.saveCheckpoint();
  const over = new R.scenes.GameOver(game, R.settings.loadRun()); over.time = .001;
  over.update(1 / 60, input({ click: true }, { x: 200, y: 290 }));
  assert(game.scene instanceof R.scenes.Play); assert.equal(game.scene.difficulty, 'hard');
  over.update(1, input({ pause: true })); assert(game.scene instanceof R.scenes.Play);
});

// Capture the actual registered input event handlers with a tiny DOM adapter.
function inputHarness() {
  const events = {}, canvasEvents = {}, memory = new Map();
  const canvas = { addEventListener: (name, fn) => canvasEvents[name] = fn, setPointerCapture() {} };
  const RWB = { W: 640, H: 360, display: { pc: false }, game: { scene: { isGameplay: true, paused: false, phase: 'play' } } };
  const context = { RWB, console, setTimeout: fn => fn(), navigator: { maxTouchPoints: 1, getGamepads: () => context.pads }, pads: [],
    localStorage: { getItem: k => memory.get(k), setItem: (k,v) => memory.set(k,v), removeItem: k => memory.delete(k) },
    addEventListener: (name, fn) => events[name] = fn, document: { addEventListener: (name, fn) => events[name] = fn },
    matchMedia: () => ({ matches: true }) };
  context.window = context; vm.createContext(context);
  for (const file of ['settings.js', 'input.js']) vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), context);
  const I = RWB.input; I.attach(canvas, (x,y) => ({x,y}));
  const point = (event, x, y, id = 1, pointerType = 'touch') => canvasEvents[event]({ clientX:x, clientY:y, pointerId:id, pointerType, currentTarget:canvas });
  const key = (type, name) => events[type]({key:name, code:name, preventDefault(){}, repeat:false});
  const pad = (id = 'Xbox Wireless Controller') => ({ index:0, connected:true, mapping:'standard', id, axes:[0,0], buttons:Array.from({length:17},()=>({pressed:false,value:0})) });
  return { RWB, I, context, events, point, key, pad };
}
check('Touch slides cannot switch attack into Loial/power; cancellation and multi-touch release are safe', () => {
  const { I, point } = inputHarness(), attack = I.touch.buttons.find(b=>b.id==='attack'), assist=I.touch.buttons.find(b=>b.id==='assist');
  point('pointerdown', attack.x, attack.y); I.beginFrame(); assert(I.pressed.attack);
  point('pointermove', assist.x, assist.y); I.beginFrame(); assert(!I.pressed.assist && !I.held.attack && !I.held.assist);
  point('pointercancel', assist.x, assist.y); assert.equal(I.touch.pointers.size, 0);
  point('pointerdown', attack.x, attack.y, 2); point('pointerdown', attack.x, attack.y, 3);
  point('pointerup', attack.x, attack.y, 2); assert(I.held.attack);
  point('lostpointercapture', attack.x, attack.y, 3); assert(!I.held.attack);
});
check('Menus never activate hidden gameplay targets or joystick movement', () => {
  const { RWB, I, point } = inputHarness(); RWB.game.scene.paused = true;
  const assist = I.touch.buttons.find(b=>b.id==='assist');
  point('pointerdown', assist.x, assist.y); I.beginFrame(); assert(I.pressed.click); assert(!I.held.assist);
  point('pointerdown', 50, 250); assert(!I.touch.joy.active); assert.equal(I.touch.pointers.size, 0);
});
check('Held keyboard aliases survive another alias release and blur clears them', () => {
  const { I, key, events } = inputHarness(); key('keydown','e'); key('keydown','j'); key('keyup','e'); assert(I.held.attack);
  events.blur(); assert(!I.held.attack); key('keyup','j'); assert(!I.held.attack);
});
check('Xbox and PlayStation standard maps confirm/back/pause correctly, including held sticks and reconnects', () => {
  for (const id of ['Xbox Wireless Controller', 'Sony DualSense (Vendor: 054c Product: 0ce6)']) {
    const { RWB, I, context, pad } = inputHarness(), p = pad(id); context.pads = [p];
    RWB.game.scene = {}; I.beginFrame();
    p.buttons[0].pressed = true; I.beginFrame(); assert(I.pressed.start);
    p.buttons[0].pressed = false; I.beginFrame(); p.buttons[1].pressed = true; I.beginFrame(); assert(I.pressed.pause);
    p.buttons[1].pressed = false; I.beginFrame(); p.axes[1] = 1; I.beginFrame(); assert(I.pressed.down);
    for (let i=0;i<30;i++) { I.beginFrame(); assert(!I.pressed.down); }
    p.axes[1]=0; I.beginFrame(); p.axes[1]=1; I.beginFrame(); assert(I.pressed.down);
    p.axes[1]=0; RWB.game.scene={isGameplay:true,paused:false}; p.buttons[9].pressed=true; I.beginFrame(); assert(I.pressed.pause);
    I.clear(); I.beginFrame(); assert(!I.pressed.start && !I.pressed.pause);
    p.buttons[9].pressed=false; I.beginFrame(); p.buttons[9].pressed=true; I.beginFrame(); assert(I.pressed.pause);
    context.pads=[]; I.beginFrame(); assert(!I.gamepad.connected && !I.held.pause);
    context.pads=[p]; p.buttons[9].pressed=false; I.beginFrame(); assert(I.gamepad.connected);
    assert.equal(RWB.settings.padLabel(0), id.startsWith('Sony') ? 'CROSS' : 'A');
  }
});
check('Fixed A/Cross confirm and B/Circle Back override conflicting menu remaps while gameplay keeps them', () => {
  const { RWB, I, context, pad } = inputHarness(), p = pad(); context.pads = [p];
  assert(RWB.settings.setPad('pause', 0).ok); assert(RWB.settings.setPad('attack', 1).ok);
  RWB.game.scene = {}; I.beginFrame();
  p.buttons[0].pressed = true; I.beginFrame(); assert(I.pressed.start && !I.pressed.pause);
  p.buttons[0].pressed = false; I.beginFrame(); p.buttons[1].pressed = true; I.beginFrame();
  assert(I.pressed.pause && !I.pressed.attack && !I.pressed.start);
  p.buttons[1].pressed = false; I.beginFrame(); RWB.game.scene = { isGameplay: true, paused: false };
  p.buttons[0].pressed = true; I.beginFrame(); assert(I.pressed.pause && !I.pressed.start);
  p.buttons[0].pressed = false; I.beginFrame(); p.buttons[1].pressed = true; I.beginFrame(); assert(I.pressed.attack);
});
check('Remap capture is cleared by interruption; fixed escape/arrows and bounded pad bindings cannot be lost', () => {
  const { RWB, I, events } = inputHarness(); I.beginCapture('key', () => {}); events.blur(); assert.equal(I.capturing, null);
  assert(!RWB.settings.setKey('attack', 'Escape').ok); assert(!RWB.settings.setKey('power', 'ArrowDown').ok);
  assert(!RWB.settings.setPad('attack', -1).ok); assert(!RWB.settings.setPad('attack', 99).ok);
});
check('Unavailable Gamepad API and rejected vibration do not throw', () => {
  const { context, I } = inputHarness(); context.navigator.getGamepads = () => { throw new Error('unavailable'); };
  I.beginFrame(); I.rumble(); assert(!I.gamepad.connected);
});

// Offline Canvas renders are visual review evidence, not browser/device screenshots.
const canvas = createCanvas(1280,720), ctx = canvas.getContext('2d'); ctx.scale(2,2);
const render = (name, obj) => { ctx.fillStyle='#081122';ctx.fillRect(0,0,640,360);obj.draw(ctx);fs.writeFileSync(path.join(out,name+'.png'),canvas.toBuffer('image/png')); };
R.input.touchEnabled=true; R.display.pc=false;
render('menu-touch-options',new R.OptionsPanel('options',{full:true}));
render('menu-touch-controls',new R.OptionsPanel('controls'));
render('menu-how-to-play',new R.HowToPlay());
const pause=new R.PauseMenu({extra:[{label:'RESTART STAGE',act:()=>{}}]});pause.open();render('menu-touch-pause',pause);
render('menu-touch-title',new R.scenes.Title(menuGame()));
console.log(passed+' v1.1 menu/save/input checks passed. Physical devices/controllers untested.');
