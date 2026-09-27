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
      { label: 'CONTROLS', act: () => { this.panel = new RWB.OptionsPanel('controls'); } }]
      .concat(opts.extra || [])
      .concat([{ label: opts.quitLabel || 'QUIT TO TITLE', act: () => { if (opts.onQuit) opts.onQuit(); return 'quit'; } }]);
  }
  open() { this.sel = 0; this.panel = null; RWB.audio.duck(0.4, 0.2, 0.2); }
  update(inp, dt) {
    if (this.panel) { if (this.panel.update(inp, dt) === 'back') this.panel = null; return null; }
    if (inp.pressed.pause) { RWB.audio.sfx.blip(); return 'resume'; }
    const n = this.items.length;
    if (inp.pressed.down) { this.sel = (this.sel + 1) % n; RWB.audio.sfx.blip(); }
    if (inp.pressed.up) { this.sel = (this.sel + n - 1) % n; RWB.audio.sfx.blip(); }
    if (inp.pressed.click && inp.pointer) {
      const i = Math.floor((inp.pointer.y - PauseMenu.Y0 + 4) / PauseMenu.STEP);
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
    RWB.text.draw(ctx, 'PAUSED', W / 2, 56, { size: 16, align: 'center', color: '#fff', stroke: '#000', strokeWidth: 4 });
    this.items.forEach((it, i) => {
      const sel = i === this.sel;
      RWB.text.draw(ctx, (sel ? '> ' : '  ') + it.label, W / 2 - 80, PauseMenu.Y0 + i * PauseMenu.STEP, { size: 9, color: sel ? '#ffe14a' : '#ddd' });
    });
    RWB.text.draw(ctx, RWB.input.legend(), W / 2, H - 24, { size: 5, align: 'center', color: '#9ab' });
  }
};
RWB.PauseMenu.Y0 = 100; RWB.PauseMenu.STEP = 20;
