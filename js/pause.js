/* Engine pause menu: RESUME / OPTIONS / CONTROLS / (extra items) / QUIT.
   Uses RWB.OptionsPanel for settings (incl. Screen Shake: Reduced) and remaps.
   Usage in a gameplay scene:
     this.pauseMenu = new RWB.PauseMenu({ onQuit: () => game.boot(), extra: [{ label: 'RESTART STAGE', act: () => ... }] });
     update: if (!this.paused && input.pressed.pause) { this.pause(); return; }
             if (this.paused) { if (this.pauseMenu.update(input, dt) === 'resume') this.paused = false; return; }
     draw:   if (this.paused) this.pauseMenu.draw(ctx); */
'use strict';

RWB.PauseMenu = class PauseMenu {
  constructor(opts = {}) {
    this.opts = opts; this.sel = 0; this.panel = null;
    this.items = [{ label: 'RESUME', act: () => 'resume' }, { label: 'OPTIONS', act: () => { this.panel = new RWB.OptionsPanel('options', { full: true }); } },
      { label: 'CONTROLS', act: () => { this.panel = new RWB.OptionsPanel('controls'); } },
      { label: 'HOW TO PLAY', act: () => { this.panel = new RWB.HowToPlay(); } }]
      .concat(opts.extra || [])
      .concat([{ label: opts.quitLabel || 'QUIT TO TITLE', act: () => { if (opts.onQuit) opts.onQuit(); return 'quit'; } }]);
  }
  open() { this.close(); this.sel = 0; this.touch = RWB.input.touchEnabled; RWB.audio.duck(0.4, 0.2, 0.2); }
  close() { if (this.panel && this.panel.close) this.panel.close(); this.panel = null; }
  rowY(i) { return this.touch ? 64 + i * 44 : PauseMenu.Y0 + i * PauseMenu.STEP; }
  rowAt(p) {
    if (!p || p.x < 160 || p.x > 480) return -1;
    for (let i = 0; i < this.items.length; i++) if (p.y >= this.rowY(i) - 8 && p.y < this.rowY(i) - 8 + (this.touch ? 44 : PauseMenu.STEP)) return i;
    return -1;
  }
  update(inp, dt) {
    if (this.panel) { if (this.panel.update(inp, dt) === 'back') this.close(); return null; }
    if (inp.pressed.pause) { RWB.audio.sfx.blip(); return 'resume'; }
    const n = this.items.length;
    if (inp.pressed.down) { this.sel = (this.sel + 1) % n; RWB.audio.sfx.blip(); }
    if (inp.pressed.up) { this.sel = (this.sel + n - 1) % n; RWB.audio.sfx.blip(); }
    if (inp.pressed.click && inp.pointer) {
      const i = this.rowAt(inp.pointer);
      if (i >= 0 && i < n) this.sel = i; else return null;
      RWB.audio.sfx.select(); return this.items[this.sel].act() || null;
    }
    if (inp.pressed.start || inp.pressed.attack) { RWB.audio.sfx.select(); return this.items[this.sel].act() || null; }
    return null;
  }
  draw(ctx) {
    const W = RWB.W, H = RWB.H;
    ctx.save(); ctx.fillStyle = 'rgba(0,0,10,0.62)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    if (this.panel) { this.panel.draw(ctx); return; }
    RWB.text.draw(ctx, 'PAUSED', W / 2, this.touch ? 25 : 56, { size: 16, align: 'center', color: '#fff', stroke: '#000', strokeWidth: 4 });
    this.items.forEach((it, i) => {
      const sel = i === this.sel;
      if (this.touch) RWB.draw.fillRRect(ctx, 160, this.rowY(i) - 8, 320, 40, 4, sel ? '#203852' : '#102036', sel ? '#ffe14a' : '#405976');
      RWB.text.draw(ctx, (sel ? '> ' : '  ') + it.label, W / 2 - 80, this.rowY(i), { size: 9, color: sel ? '#ffe14a' : '#ddd' });
    });
    RWB.text.draw(ctx, RWB.input.legend(), W / 2, H - 24, { size: 5, align: 'center', color: '#9ab' });
  }
};
RWB.PauseMenu.Y0 = 100; RWB.PauseMenu.STEP = 20;


/* Short, input-aware instructions are available without leaving the run. */
RWB.HowToPlay = class HowToPlay {
  constructor() { this.page = 0; }
  close() {}
  update(input) {
    if (input.pressed.pause) return 'back';
    if (input.pressed.click && input.pointer) {
      const p = input.pointer;
      if (p.y < 278 || p.y > 328) return null;
      if (p.x >= 230 && p.x <= 410) return 'back';
      if (p.x >= 40 && p.x <= 220) this.page = (this.page + 2) % 3;
      if (p.x >= 420 && p.x <= 600) this.page = (this.page + 1) % 3;
      return null;
    }
    if (input.pressed.left || input.pressed.up) this.page = (this.page + 2) % 3;
    if (input.pressed.right || input.pressed.down || input.pressed.start || input.pressed.attack) this.page = (this.page + 1) % 3;
    return null;
  }
  draw(ctx) {
    const R = RWB, hint = action => R.input.hint(action, 1);
    const pages = [
      ['THE BASICS',
        'MOVE: ' + (R.input.touchEnabled ? 'DRAG THE LEFT SIDE' : R.input.moveHint()),
        hint('attack') + ': KICK. TAP AGAIN FOR A 3-HIT CHAIN.',
        hint('jump') + ': JUMP. KICK IN THE AIR TO FLY-KICK.',
        'DOWN + KICK: SPIN ALL AROUND YOU.',
        hint('special') + ': FIREBALL. WAIT FOR IT TO RECHARGE.'],
      ['YOUR TEAM AND POWER',
        hint('assist') + ': CALL LOIAL ONCE EACH STAGE.',
        'FILL THE SAIDIN METER BY FIGHTING.',
        hint('power') + ': SPEND A FULL METER FOR BALEFIRE.',
        'USE FULL POWER BEFORE THE TAINT WARNING.',
        'HURT A TROLLOC, WALK INTO IT, KICK OR THROW.'],
      ['FINISH THE ADVENTURE',
        'CHANGE LANES TO DODGE ENEMIES AND FOG.',
        'JUMP-KICK OR FIRE AT THE FLYING DRAGHKAR.',
        'CLAIM CALLANDOR. FREE TWINKLE TOES.',
        'FILL SAIDIN FOR THE TEAM FINISH ON TAIM.',
        'CONTINUE SAVES YOUR STAGE, WAVE AND MODE.']
    ];
    R.draw.fillRRect(ctx, 28, 22, 584, 316, 6, 'rgba(4,6,22,.96)', '#ffe14a');
    R.text.draw(ctx, 'HOW TO PLAY', 320, 36, { size: 14, align: 'center', color: '#ffe14a' });
    R.text.draw(ctx, pages[this.page][0], 320, 75, { size: 10, align: 'center', color: '#8bd5ff' });
    pages[this.page].slice(1).forEach((line, i) => R.text.draw(ctx, line, 56, 112 + i * 29, { size: 8, color: '#fff' }));
    for (const [label, x, w] of [['PREV', 40, 180], ['BACK', 230, 180], ['NEXT', 420, 180]]) {
      R.draw.fillRRect(ctx, x, 278, w, 50, 5, '#172840', '#6389a9');
      R.text.draw(ctx, label, x + w / 2, 295, { size: 10, align: 'center', color: '#ffe14a' });
    }
    R.text.draw(ctx, (this.page + 1) + ' / 3', 320, 256, { size: 7, align: 'center', color: '#bcd' });
  }
};
