/* Placeholder first scene while the game content is rebuilt from scratch.
   Proves the engine boots: scaling, input, audio unlock, options menu.
   Content replaces this by defining RWB.scenes.Title (or overriding RWB.game.boot). */
'use strict';

RWB.scenes = RWB.scenes || {};
RWB.scenes.Rebuilding = class Rebuilding {
  constructor(game) { this.game = game; this.t = 0; this.panel = null; }
  update(dt, inp) {
    this.t += dt;
    if (this.panel) { if (this.panel.update(inp, dt) === 'back') this.panel = null; return; }
    if (inp.pressed.start || inp.pressed.click) { RWB.audio.sfx.select(); this.panel = new RWB.OptionsPanel('options', { full: true }); }
  }
  draw(ctx) {
    const W = RWB.W, H = RWB.H;
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#060818'); g.addColorStop(1, '#14183a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    RWB.text.draw(ctx, 'RILEY WHEEL BRAWL', W / 2, 130, { size: 20, align: 'center', color: '#e8f0ff', stroke: '#000', strokeWidth: 5 });
    RWB.text.draw(ctx, 'REBUILDING', W / 2, 170, { size: 10, align: 'center', color: '#7cc8ff' });
    if (Math.floor(this.t * 2) % 2 === 0) RWB.text.draw(ctx, 'ENGINE ONLINE  -  PRESS ENTER FOR OPTIONS', W / 2, 230, { size: 6, align: 'center', color: '#9ab' });
    if (this.panel) this.panel.draw(ctx);
  }
};
