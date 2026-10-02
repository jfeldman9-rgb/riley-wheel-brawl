// HUD scene: portrait + health + saidin, enemy/boss bars, combo counter, captions, GO arrow, title/clear cards, perf readout.
import { VW, VH } from './config.js';
import { perf } from './perf.js';
const F = 'system-ui,-apple-system,Segoe UI,sans-serif', PX = 'PressStart, monospace';
export class HUD extends Phaser.Scene {
  constructor() { super('hud'); }
  preload() { this.load.image('portrait', 'assets/ui/riley-portrait.webp'); this.load.image('bossPortrait', 'assets/ui/chief-portrait.webp'); }
  create() {
    const cam = this.cameras.main; cam.setOrigin(0, 0); cam.setZoom(this.game.rs);
    const g = this.g = this.add.graphics();
    this.portrait = this.add.image(58, 58, 'portrait').setDisplaySize(84, 84);
    const ring = this.add.graphics(); ring.lineStyle(3, 0xd8c08a, 1); ring.strokeCircle(58, 58, 44); ring.lineStyle(1, 0x000000, 0.8); ring.strokeCircle(58, 58, 46);
    const mask = this.make.graphics({}, false); mask.fillCircle(58, 58, 42); this.portrait.setMask && 0;
    this.name = this.add.text(112, 18, 'RILEY', { fontFamily: PX, fontSize: '14px', color: '#f3e6c8', stroke: '#000', strokeThickness: 4 });
    this.lives = this.add.text(112, 76, '', { fontFamily: PX, fontSize: '11px', color: '#f3e6c8', stroke: '#000', strokeThickness: 3 });
    this.score = this.add.text(VW - 20, 18, '', { fontFamily: PX, fontSize: '14px', color: '#f3e6c8', stroke: '#000', strokeThickness: 4 }).setOrigin(1, 0);
    this.comboT = this.add.text(VW - 26, 150, '', { fontFamily: F, fontStyle: '900 italic', fontSize: '44px', color: '#ffd27a', stroke: '#2a1200', strokeThickness: 7 }).setOrigin(1, 0.5).setAlpha(0);
    this.enemyName = this.add.text(112, 106, '', { fontFamily: PX, fontSize: '10px', color: '#ffb3a0', stroke: '#000', strokeThickness: 3 });
    this.capBg = this.add.graphics().setAlpha(0);
    this.capWho = this.add.text(VW / 2, VH - 92, '', { fontFamily: PX, fontSize: '11px', color: '#ffd27a', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
    this.capText = this.add.text(VW / 2, VH - 64, '', { fontFamily: F, fontStyle: '600', fontSize: '22px', color: '#ffffff', stroke: '#000', strokeThickness: 5, align: 'center', wordWrap: { width: 900 } }).setOrigin(0.5, 0);
    this.goT = this.add.text(VW - 60, VH / 2 - 40, 'GO ▶', { fontFamily: PX, fontSize: '26px', color: '#ffe9a8', stroke: '#000', strokeThickness: 6 }).setOrigin(1, 0.5).setAlpha(0);
    this.flash = this.add.text(VW / 2, 200, '', { fontFamily: PX, fontSize: '20px', color: '#ff9a7a', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setAlpha(0);
    this.perfT = this.add.text(VW - 10, VH - 8, '', { fontFamily: 'ui-monospace,Menlo,monospace', fontSize: '12px', color: '#bcd0ff', backgroundColor: 'rgba(0,0,0,0.35)', padding: { x: 4, y: 2 } }).setOrigin(1, 1);
    this.showPerf = new URLSearchParams(location.search).get('hud') !== '0';
    this.card = this.add.container(VW / 2, VH / 2).setDepth(100);
    this.titleCard();
    this.enemyRef = null; this.enemyT = 0; this.capT = 0; this.boss = null;
  }
  titleCard() {
    const c = this.card; c.removeAll(true);
    const bg = this.add.graphics(); bg.fillStyle(0x000000, 0.45); bg.fillRect(-VW / 2, -VH / 2, VW, VH);
    const t1 = this.add.text(0, -120, 'RILEY WHEEL BRAWL', { fontFamily: PX, fontSize: '40px', color: '#ffe2a0', stroke: '#2a1000', strokeThickness: 10 }).setOrigin(0.5);
    const t2 = this.add.text(0, -62, '2.0  ·  STAGE 1 VERTICAL SLICE', { fontFamily: PX, fontSize: '14px', color: '#cfe0ff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
    const t3 = this.add.text(0, 10, "EMOND'S FIELD — WINTERNIGHT", { fontFamily: F, fontStyle: '800', fontSize: '30px', color: '#ffffff', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
    const touch = this.game.inp.isTouch;
    const t4 = this.add.text(0, 110, touch ? 'TAP TO START' : 'PRESS ANY KEY', { fontFamily: PX, fontSize: '18px', color: '#ffe9a8', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5);
    const t5 = this.add.text(0, 170, touch ? 'Stick: move (push far to run)   KICK: attack   JUMP   FIRE: fireball' : 'WASD/Arrows move · Shift or double-tap: run · J/Z attack · K/Space jump · L/Q fireball · walk into a dazed foe to grab\nAttack + back = back kick · Jump + attack = flying kick · M music · N mute · H perf readout',
      { fontFamily: F, fontSize: '15px', color: '#cbd6ee', align: 'center', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 0);
    c.add([bg, t1, t2, t3, t4, t5]);
    this.tweens.add({ targets: t4, alpha: 0.35, yoyo: true, repeat: -1, duration: 700 });
    this.input.on('pointerdown', () => { this.game.inp.press('start'); });
  }
  hideTitle() { this.tweens.add({ targets: this.card, alpha: 0, duration: 400, onComplete: () => { this.card.removeAll(true); this.card.setAlpha(1); } }); }
  caption(who, text) {
    this.capWho.setText(who); this.capText.setText(text); this.capT = Math.max(2.2, text.length * 0.065);
    const w = Math.min(960, this.capText.width + 60), h = this.capText.height + 50;
    this.capBg.clear(); this.capBg.fillStyle(0x000000, 0.5); this.capBg.fillRoundedRect(VW / 2 - w / 2, VH - 106, w, h, 10);
  }
  target(e) { this.enemyRef = e; this.enemyT = 2.5; }
  combo(n) { if (n < 2) return; this.comboT.setText(`${n} HITS`).setAlpha(1).setScale(1.25); this.tweens.add({ targets: this.comboT, scale: 1, duration: 120 }); this.comboHold = 1.4; }
  go() { this.goT.setAlpha(1); this.tweens.add({ targets: this.goT, x: VW - 40, yoyo: true, repeat: 5, duration: 300, onComplete: () => this.goT.setAlpha(0).setX(VW - 60) }); }
  flashText(t) { this.flash.setText(t).setAlpha(1); this.tweens.add({ targets: this.flash, alpha: 0, delay: 1400, duration: 600 }); }
  bossBar(c) { this.boss = c; this.bossShown = 0; }
  togglePerf() { this.showPerf = !this.showPerf; }
  gameOver() {
    const c = this.card; c.removeAll(true);
    const bg = this.add.graphics(); bg.fillStyle(0x000000, 0.55); bg.fillRect(-VW / 2, -VH / 2, VW, VH);
    c.add([bg, this.add.text(0, -30, 'GAME OVER', { fontFamily: PX, fontSize: '40px', color: '#ff9a7a', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5),
      this.add.text(0, 40, this.game.inp.isTouch ? 'TAP KICK TO CONTINUE' : 'PRESS ATTACK TO CONTINUE', { fontFamily: PX, fontSize: '16px', color: '#ffe9a8', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5)]);
  }
  hideGameOver() { this.card.removeAll(true); }
  stageClear(s) {
    const c = this.card; c.removeAll(true);
    const bg = this.add.graphics(); bg.fillStyle(0x000000, 0.5); bg.fillRect(-VW / 2, -VH / 2, VW, VH);
    const m = Math.floor(s.time / 60), sec = Math.floor(s.time % 60);
    c.add([bg, this.add.text(0, -120, 'STAGE CLEAR', { fontFamily: PX, fontSize: '44px', color: '#ffe2a0', stroke: '#2a1000', strokeThickness: 10 }).setOrigin(0.5),
      this.add.text(0, -30, `SCORE ${s.score}\nBEST COMBO ${s.combo} HITS\nTIME ${m}:${String(sec).padStart(2, '0')}`, { fontFamily: PX, fontSize: '18px', color: '#ffffff', stroke: '#000', strokeThickness: 5, align: 'center', lineSpacing: 14 }).setOrigin(0.5, 0),
      this.add.text(0, 150, this.game.inp.isTouch ? 'TAP KICK TO PLAY AGAIN' : 'PRESS ATTACK TO PLAY AGAIN', { fontFamily: PX, fontSize: '14px', color: '#ffe9a8', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5)]);
  }
  bar(x, y, w, h, f, col, back = 0x1a1010) {
    const g = this.g; g.fillStyle(0x000000, 0.75); g.fillRect(x - 3, y - 3, w + 6, h + 6); g.fillStyle(back, 1); g.fillRect(x, y, w, h);
    g.fillStyle(col, 1); g.fillRect(x, y, Math.max(0, w * f), h); g.fillStyle(0xffffff, 0.18); g.fillRect(x, y, Math.max(0, w * f), h * 0.35);
  }
  update(time, delta) {
    const dt = delta / 1000, s = this.stage; if (!s || !s.riley) return;
    const R = s.riley, g = this.g; g.clear();
    this.rHp = this.rHp === undefined ? R.hp : this.rHp + (R.hp - this.rHp) * Math.min(1, dt * 6);
    this.bar(112, 42, 300, 18, this.rHp / R.maxHp, R.hp > 35 ? 0x54d27a : 0xe0503c);
    this.bar(112, 64, 220, 8, R.saidin / 100, R.saidin >= 34 ? 0x6fd2ff : 0x3a6e90, 0x0c1420);
    this.lives.setText('×' + Math.max(0, R.lives)); this.score.setText(String(R.score).padStart(7, '0'));
    if (this.enemyRef && this.enemyT > 0 && !this.enemyRef.T.boss) { this.enemyT -= dt; const e = this.enemyRef; this.enemyName.setText(e.name).setAlpha(1); this.bar(112, 122, 200, 8, Math.max(0, e.hp) / e.maxHp, 0xe07a3c); }
    else this.enemyName.setAlpha(0);
    if (this.boss) {
      const b = this.boss; this.bossShown = Math.min(1, this.bossShown + dt * 1.5); const w = 640 * this.bossShown;
      this.bar(VW / 2 - w / 2, VH - 150, w, 16, Math.max(0, b.hp) / b.maxHp, b.phase >= 3 ? 0xff4a2a : b.phase === 2 ? 0xff8a2a : 0xd8452f);
      for (const f of [1 / 3, 2 / 3]) { g.fillStyle(0x000000, 0.8); g.fillRect(VW / 2 - w / 2 + w * f - 1, VH - 150, 3, 16); }
      if (!this.bossName) this.bossName = this.add.text(VW / 2, VH - 170, 'TROLLOC CHIEFTAIN', { fontFamily: PX, fontSize: '12px', color: '#ffd0b0', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
      if (!b.alive && b.state === 'dead') { this.bossName.setAlpha(Math.max(0, this.bossName.alpha - dt)); }
    }
    if (this.comboHold > 0) { this.comboHold -= dt; if (this.comboHold <= 0) this.tweens.add({ targets: this.comboT, alpha: 0, duration: 300 }); }
    if (this.capT > 0) { this.capT -= dt; const a = Math.min(1, this.capT * 3); this.capWho.setAlpha(a); this.capText.setAlpha(a); this.capBg.setAlpha(a); }
    if ((this.pt = (this.pt || 0) + 1) % 20 === 0) {
      const p = perf.update();
      if (this.showPerf && p) { const f = p.fight; this.perfT.setText(`${p.fps} fps  p95 ${p.p95}ms  >33ms ${p.over33}/${p.frames}` + (f ? `  | fight: ${f.avgFps} fps, >33ms ${f.over33}/${f.frames}` : '') + `  | RS ${this.game.rs} q${s.fx.quality}`).setAlpha(1); }
      else this.perfT.setAlpha(0);
    }
  }
}
