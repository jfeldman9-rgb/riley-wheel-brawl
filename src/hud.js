// HUD scene: portrait + health + saidin, enemy/boss bars, combo counter, captions, GO arrow, title/clear cards, perf readout.
import { VW, VH, clamp, q } from './config.js';
import { perf, displayMs } from './perf.js';
import { installPerfPanel } from './perf-panel.js';
import { POWERS, ART } from './powers.js';
import { TWIX_PANELS } from './twix.js';
import { maxStage } from './stages.js';
const F = 'system-ui,-apple-system,Segoe UI,sans-serif', PX = 'PressStart, monospace';
const clamp01 = v => clamp(v, 0, 1);
// Boss phase lines share one plate in the open band left of the burning barn.
// On the locked boss camera the barn overlay starts near x=503 and the roof flames
// sit over the gable (about x=730–1100, y=50–270). This plate stays left of that,
// below the health, power and boss bars, with a solid backing so it stays readable
// on a phone (landscape or upright) and an iPad. Press Start is monospace, so the
// wrapped lines below are what actually fit the plate.
export const BOSS_BANNER = Object.freeze({ x: 244, y: 292, wrap: 400, fontSize: 22, padX: 22, padY: 14, maxWidth: 400, maxHeight: 72 });
export const BOSS_BANNER_TEXT = Object.freeze(new Map([
  ['BYAR IS TORCHING THE BARN!', 'BYAR IS TORCHING\nTHE BARN!'],
  ['JARET BYAR CALLS HIS ARCHERS', 'JARET BYAR CALLS\nHIS ARCHERS'],
  ['THE CHIEFTAIN IS ENRAGED', 'THE CHIEFTAIN\nIS ENRAGED'],
]));
export function bossBannerBox() {
  const b = BOSS_BANNER, w = b.maxWidth + b.padX * 2, h = b.maxHeight + b.padY * 2;
  return Object.freeze({ x: b.x, y: b.y, w, h, left: b.x - w / 2, right: b.x + w / 2, top: b.y - h / 2, bottom: b.y + h / 2 });
}
export const STAGE_NAMES = Object.freeze({ 1: "STAGE 1 · EMOND'S FIELD — WINTERNIGHT", 2: 'STAGE 2 · BAERLON — THE WHITECLOAKS', 3: 'STAGE 3 · CAEMLYN — THE MYRDDRAAL' });
// The perf readout is two 12px lines anchored at VH-8 and is on unless ?hud=0.
// A tag at VH-30 sits inside that block.
export const PLACEHOLDER_TAG_Y = VH - 56;
export const speakerColor = who => /TROLLOC|WHITECLOAK|BYAR|CUTTHROAT|MYRDDRAAL/.test(who) ? '#ffb3a0' : /NARRATOR/.test(who) ? '#ffe2a0' : '#9fd8ff';
export function clearPrompt(stage, touch, next) {
  const verb = touch ? 'TAP KICK' : 'PRESS ATTACK';
  if (next === 3) return `${verb} TO CONTINUE TO STAGE 3`;
  if (stage === 3) return `${verb} TO RETURN TO THE TITLE`;
  return stage === 1 ? `${verb} TO CONTINUE TO STAGE 2` : stage === 2 ? `${verb} TO RETURN TO THE TITLE` : `${verb} TO PLAY AGAIN`;
}

// Mirrors CUTTHROAT.mashNeed in darkfriends.js (pinned equal in tests)
export const MASH_NEED = 6;

export function bossLabel(s, has = () => true) {
  if (s && s.stageNo === 3) {
    const b = s.stageDef?.boss || {};
    return { name: b.name, portrait: has(b.portrait) ? b.portrait : 'bossPortrait' };
  }
  return {
    name: s && s.stageNo === 2 ? 'JARET BYAR, CHILD OF THE LIGHT' : 'TROLLOC CHIEFTAIN',
    portrait: s && s.stageNo === 2 && has('byarPortrait') ? 'byarPortrait' : 'bossPortrait',
  };
}

export function mashRing(R) {
  if (!R || R.state !== 'grabbed' || !R.grabbedBy) return null;
  return { fill: clamp01(R.grabbedBy.mashN / MASH_NEED) };
}

export function fearArc(s) {
  if (!s || s.stageNo !== 3 || !s.boss || !s.boss.alive || s.boss.state === 'defeated' || s.boss.phase < 2 || !s.boss.auraOn) return null;
  return { fill: clamp01(s.boss.fear || 0) };
}

const stage3Plates = s => s?.stageNo && s.stageNo !== 3 ? null : s?.cache?.json?.get?.('plates3');
export const placeholderArt = (s, plates = stage3Plates(s)) => Object.values(s?.metas || {}).some(m => m && m.placeholder === true) || plates?.placeholder === true;

export function drawStage3Meters(s, g) {
  if (!s || !s.riley || !g) return;
  const R = s.riley;
  const mr = mashRing(R);
  if (mr) {
    const mx = R.x - (s.camX || 0);
    const my = R.y - (R.z || 0) - 300;
    const rad = 22;
    g.lineStyle?.(3, 0x141018, 0.85);
    g.strokeCircle?.(mx, my, rad);
    if (mr.fill > 0) {
      g.lineStyle?.(3, 0xffe2a0, 0.95);
      g.beginPath?.();
      g.arc?.(mx, my, rad, -Math.PI / 2, -Math.PI / 2 + mr.fill * Math.PI * 2, false);
      g.strokePath?.();
    }
  }
  const fa = fearArc(s);
  if (fa) {
    const fx = R.x - (s.camX || 0);
    const fy = R.y + 8;
    const rad = 28;
    g.lineStyle?.(2, 0x280c38, 0.5);
    g.strokeCircle?.(fx, fy, rad);
    if (fa.fill > 0) {
      g.lineStyle?.(2, 0x5a1878, 0.9);
      g.beginPath?.();
      g.arc?.(fx, fy, rad, -Math.PI / 2, -Math.PI / 2 + fa.fill * Math.PI * 2, false);
      g.strokePath?.();
    }
  }
}
export class HUD extends Phaser.Scene {
  constructor() { super('hud'); }
  create() {
    // Phaser restarts scene instances; display objects from the prior run are destroyed.
    this.boss = null; this.bossName = null; this.bossPic = null; this.bossRing = null;
    this.rHp = undefined; this.comboHold = 0; this.pt = 0;
    this.perfPanel = installPerfPanel({ game: this.game, getStage: () => this.stage || this.game.scene.getScene('stage1') });
    this.events.once('shutdown', () => {
      this.perfPanel.destroy();
      if (this.stage) this.stage.hudReady = false;
      this.card = null; this.capWho = null; this.capText = null; this.capBg = null; this.cut = null; this.slots = null;
    });
    const cam = this.cameras.main; cam.setOrigin(0, 0); cam.setZoom(this.game.rs);
    const g = this.g = this.add.graphics();
    this.portrait = this.add.image(58, 58, 'portrait').setDisplaySize(84, 84);
    const ring = this.add.graphics(); ring.lineStyle(3, 0xd8c08a, 1); ring.strokeCircle(58, 58, 44); ring.lineStyle(1, 0x000000, 0.8); ring.strokeCircle(58, 58, 46);
    const mask = this.make.graphics({}, false); mask.fillCircle(58, 58, 42); this.portrait.setMask && 0;
    this.name = this.add.text(112, 18, 'RILEY', { fontFamily: PX, fontSize: '14px', color: '#f3e6c8', stroke: '#000', strokeThickness: 4 });
    this.lives = this.add.text(112, 76, '', { fontFamily: PX, fontSize: '11px', color: '#f3e6c8', stroke: '#000', strokeThickness: 3 });
    this.score = this.add.text(VW - 20, 18, '', { fontFamily: PX, fontSize: '14px', color: '#f3e6c8', stroke: '#000', strokeThickness: 4 }).setOrigin(1, 0);
    this.comboT = this.add.text(VW - 26, 150, '', { fontFamily: F, fontStyle: '900 italic', fontSize: '44px', color: '#ffd27a', stroke: '#2a1200', strokeThickness: 7 }).setOrigin(1, 0.5).setAlpha(0);
    // Restored 1.1 readiness: balefire on a full saidin meter, Loial once per stage.
    this.baleT = this.add.text(342, 59, 'BALEFIRE READY', { fontFamily: PX, fontSize: '10px', color: '#e8f6ff', stroke: '#000', strokeThickness: 3 }).setAlpha(0);
    this.loialPic = this.textures.exists('loialPortrait') ? this.add.image(214, 83, 'loialPortrait').setDisplaySize(30, 30) : null;
    this.loialT = this.add.text(234, 77, 'LOIAL READY', { fontFamily: PX, fontSize: '10px', color: '#8cf0ae', stroke: '#000', strokeThickness: 3 });
    this.touchState = ''; this.loialState = 'ready';
    this.makePowerSlots();
    this.ribbonPic = null; this.ribbonT = null;
    this.cut = null;
    this.enemyName = this.add.text(112, 106, '', { fontFamily: PX, fontSize: '10px', color: '#ffb3a0', stroke: '#000', strokeThickness: 3 });
    this.capBg = this.add.graphics().setAlpha(0);
    // on touch devices the thumb controls sit at the bottom corners, so captions move to the top
    this.capY = this.game.inp.isTouch ? 84 : VH - 106;
    this.capWho = this.add.text(VW / 2, this.capY + 14, '', { fontFamily: PX, fontSize: '11px', color: '#ffd27a', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
    this.capText = this.add.text(VW / 2, this.capY + 42, '', { fontFamily: F, fontStyle: '600', fontSize: '22px', color: '#ffffff', stroke: '#000', strokeThickness: 5, align: 'center', wordWrap: { width: 900 } }).setOrigin(0.5, 0);
    const removeTouch = this.game.inp.on('touch', () => this.positionCaptions());
    this.events.once('shutdown', removeTouch);
    this.goT = this.add.text(VW - 60, VH / 2 - 40, 'GO ▶', { fontFamily: PX, fontSize: '26px', color: '#ffe9a8', stroke: '#000', strokeThickness: 6 }).setOrigin(1, 0.5).setAlpha(0);
    this.flashBg = this.add.graphics().setAlpha(0);
    this.flash = this.add.text(VW / 2, 200, '', { fontFamily: PX, fontSize: '20px', color: '#ffe7c8', stroke: '#000', strokeThickness: 6, align: 'center' }).setOrigin(0.5).setAlpha(0);
    this.flashPair = [this.flashBg, this.flash];
    this.perfT = this.add.text(VW - 10, VH - 8, '', { fontFamily: 'ui-monospace,Menlo,monospace', fontSize: '12px', color: '#bcd0ff', backgroundColor: 'rgba(0,0,0,0.35)', padding: { x: 4, y: 2 } }).setOrigin(1, 1);
    this.phTag = this.add.text(VW - 10, PLACEHOLDER_TAG_Y, 'PLACEHOLDER ART', { fontFamily: PX, fontSize: '10px', color: '#ffcc66', stroke: '#000', strokeThickness: 3 }).setOrigin(1, 1).setVisible(false);
    this.phShown = false; this.phReady = false; this.phMetas = undefined; this.phPlates = undefined;
    this.showPerf = new URLSearchParams(location.search).get('hud') !== '0';
    this.pauseLabel = this.add.text(VW / 2, VH / 2, 'PAUSED\nP / Esc / Enter / Start or II to resume', { fontFamily: F, fontStyle: '700', fontSize: '28px', color: '#ffffff', backgroundColor: '#0b1428', padding: { x: 24, y: 18 }, align: 'center' }).setOrigin(0.5).setDepth(200).setVisible(false);
    this.card = this.add.container(VW / 2, VH / 2).setDepth(100);
    this.titleCard();
    this.enemyRef = null; this.enemyT = 0; this.capT = 0;
    if (this.pendingCap) { this.caption(...this.pendingCap); this.pendingCap = null; }
    this.readyForPlay();
  }
  readyForPlay() {
    const stage = this.stage || this.game.scene.getScene('stage1');
    if (!stage) return;
    this.stage = stage; stage.hudReady = true;
    if (stage.startRequested) stage.start();
    else if (stage.started) this.hideTitle();
    window.__rwbStartup?.ready();
  }
  titleCard() {
    const c = this.card; c.removeAll(true);
    const bg = this.add.graphics(); bg.fillStyle(0x000000, 0.45); bg.fillRect(-VW / 2, -VH / 2, VW, VH);
    const t1 = this.add.text(0, -120, 'RILEY WHEEL BRAWL', { fontFamily: PX, fontSize: '40px', color: '#ffe2a0', stroke: '#2a1000', strokeThickness: 10 }).setOrigin(0.5);
    const t2 = this.add.text(0, -62, '2.0  ·  CHOOSE YOUR STAGE', { fontFamily: PX, fontSize: '14px', color: '#cfe0ff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
    const sel = (this.stage && (this.stage.titleSel || this.stage.stageNo)) || 1;
    const t3 = this.titleStageT = this.add.text(0, 10, STAGE_NAMES[sel], { fontFamily: F, fontStyle: '800', fontSize: '30px', color: '#ffffff', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
    // ◀ ▶ pick the stage: keys / d-pad / stick left-right, or tap the arrows
    const arrow = (x, dir) => {
      const a = this.add.text(x, 10, dir < 0 ? '◀' : '▶', { fontFamily: F, fontStyle: '900', fontSize: '34px', color: '#ffe9a8', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
      // Text hit areas use untransformed top-left coordinates, even with a centred origin.
      // Keep the visible glyph small but make the entire 120×100 target tappable.
      a.setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Rectangle((a.width - 120) / 2, (a.height - 100) / 2, 120, 100), hitAreaCallback: Phaser.Geom.Rectangle.Contains });
      a.isStageArrow = true; a.on('pointerdown', () => this.stage && this.stage.selectStage && this.stage.selectStage(dir)); return a;
    };
    const al = this.titleArrowL = arrow(-430, -1), ar = this.titleArrowR = arrow(430, 1);
    this.titleSelect(sel);
    const touch = this.game.inp.isTouch;
    const t4 = this.add.text(0, 110, touch ? 'TAP TO START' : 'PRESS ENTER OR ATTACK', { fontFamily: PX, fontSize: '18px', color: '#ffe9a8', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5);
    const t5 = this.add.text(0, 170, touch ? 'Stick: move (push far to run)   KICK: attack   JUMP   FIRE: fireball   BALE: balefire   CALL: Loial' : 'WASD/Arrows move · Shift or double-tap: run · J/Z attack · K/Space jump · L/Q fireball · F balefire (full saidin) · R call Loial · walk into a dazed foe to grab\nAttack + back = back kick · Jump + attack = flying kick · M music · N mute · H perf readout',
      { fontFamily: F, fontSize: '15px', color: '#cbd6ee', align: 'center', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 0);
    c.add([bg, t1, t2, t3, al, ar, t4, t5]);
    this.tweens.add({ targets: t4, alpha: 0.35, yoyo: true, repeat: -1, duration: 700 });
    // A title tap starts play. Don't turn later battlefield taps into Start:
    // controller Start also pauses an active fight.
    this.input.on('pointerdown', (ptr, over) => { if (over && over.some(o => o.isStageArrow)) return; this.onTitlePointer(); });
  }
  titleSelect(n) {
    if (this.titleStageT && this.titleStageT.active !== false) this.titleStageT.setText(STAGE_NAMES[n] || STAGE_NAMES[1]);
    if (this.titleArrowL) this.titleArrowL.setAlpha(n > 1 ? 1 : 0.25);
    if (this.titleArrowR) this.titleArrowR.setAlpha(n < maxStage(q) ? 1 : 0.25);
  }
  onTitlePointer() { if (this.stage && !this.stage.started && !this.stage.ended) this.game.inp.press('start'); }
  hideTitle() { if (!this.card) return; this.tweens.add({ targets: this.card, alpha: 0, duration: 400, onComplete: () => { this.card.removeAll(true); this.card.setAlpha(1); } }); }
  caption(who, text) {
    if (!this.capWho) { this.pendingCap = [who, text]; return; }   // HUD not created yet (slow network on first load)
    this.capWho.setText(who); this.capText.setText(text); this.capT = Math.max(2.2, text.length * 0.065);
    this.drawCaptionBackground();
  }
  positionCaptions() {
    this.capY = this.game.inp.isTouch ? 84 : VH - 106;
    if (!this.capWho || !this.capText) return;
    this.capWho.y = this.capY + 14; this.capText.y = this.capY + 42;
    this.drawCaptionBackground();
  }
  drawCaptionBackground() {
    if (!this.capText || !this.capBg) return;
    const w = Math.min(960, this.capText.width + 60), h = this.capText.height + 50;
    this.capBg.clear(); this.capBg.fillStyle(0x000000, 0.5); this.capBg.fillRoundedRect(VW / 2 - w / 2, this.capY, w, h, 10);
  }
  target(e) { this.enemyRef = e; this.enemyT = 2.5; }
  combo(n) { if (n < 2 || !this.comboT) return; this.comboT.setText(`${n} HITS`).setAlpha(1).setScale(1.25); this.tweens.add({ targets: this.comboT, scale: 1, duration: 120 }); this.comboHold = 1.4; }
  go() { if (!this.goT) return; this.goT.setAlpha(1); this.tweens.add({ targets: this.goT, x: VW - 40, yoyo: true, repeat: 5, duration: 300, onComplete: () => this.goT.setAlpha(0).setX(VW - 60) }); }
  flashText(t) {
    if (!this.flash) return;
    const shown = BOSS_BANNER_TEXT.get(t);
    const boss = shown != null, b = BOSS_BANNER;
    this.flash.setStyle({ fontFamily: PX, fontSize: (boss ? b.fontSize : 20) + 'px', color: boss ? '#ffe7c8' : '#ff9a7a', stroke: '#000', strokeThickness: 6, align: 'center', lineSpacing: boss ? 6 : 0 });
    if (this.flash.setWordWrapWidth) this.flash.setWordWrapWidth(boss ? b.wrap : 1100, false);
    this.flash.setText(shown || t).setPosition(boss ? b.x : VW / 2, boss ? b.y : 200).setOrigin(0.5).setAlpha(1);
    if (this.flashBg) {
      this.flashBg.clear();
      if (boss) {
        // Fixed plate, not the measured text size, so a late font metric can't spill onto the barn.
        const w = b.maxWidth + b.padX * 2, h = b.maxHeight + b.padY * 2;
        this.flashBg.fillStyle(0x140804, 0.9);
        this.flashBg.fillRoundedRect(b.x - w / 2, b.y - h / 2, w, h, 8);
        this.flashBg.lineStyle(3, 0xffc080, 0.95);
        this.flashBg.strokeRoundedRect(b.x - w / 2, b.y - h / 2, w, h, 8);
        this.flashBg.setAlpha(1);
      } else this.flashBg.setAlpha(0);
    }
    this.tweens.add({ targets: boss && this.flashBg ? this.flashPair : this.flash, alpha: 0, delay: 1400, duration: 600 });
  }
  bossBar(c) { this.boss = c; this.bossShown = 0; }
  /** Twinkle Toes' ribbon (Stage 2 collectible) */
  ribbon(n) {
    if (!this.ribbonPic && this.textures.exists('ribbon')) { this.ribbonPic = this.add.image(392, 83, 'ribbon').setDisplaySize(30, 30); this.ribbonT = this.add.text(410, 77, '', { fontFamily: PX, fontSize: '10px', color: '#9fd0ff', stroke: '#000', strokeThickness: 3 }); }
    if (this.ribbonT) this.ribbonT.setText('×' + n);
  }
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
      this.add.text(0, 150, clearPrompt(s.stage, this.game.inp.isTouch, (this.stage?.stageDef || s?.stageDef)?.next?.(q)?.stage), { fontFamily: PX, fontSize: '14px', color: '#ffe9a8', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5)]);
    if (s.stage >= 2 && s.ribbons) c.add(this.add.text(0, 100, "TWINKLE TOES' RIBBON FOUND", { fontFamily: PX, fontSize: '12px', color: '#9fd0ff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5));
  }
  bar(x, y, w, h, f, col, back = 0x1a1010) {
    const g = this.g; g.fillStyle(0x000000, 0.75); g.fillRect(x - 3, y - 3, w + 6, h + 6); g.fillStyle(back, 1); g.fillRect(x, y, w, h);
    g.fillStyle(col, 1); g.fillRect(x, y, Math.max(0, w * f), h); g.fillStyle(0xffffff, 0.18); g.fillRect(x, y, Math.max(0, w * f), h * 0.35);
  }
  /** LOIAL READY / LOIAL! / LOIAL SPENT. Text.setColor always redraws and re-uploads the text texture, so only
   *  touch the label (and portrait) when the state actually changes, not every frame. */
  updateLoialLabel(s, R) {
    const ls = s.loial ? 'on' : R.loialReady ? 'ready' : 'spent';
    if (ls === this.loialState) return;
    this.loialState = ls;
    this.loialT.setText(ls === 'on' ? 'LOIAL!' : ls === 'ready' ? 'LOIAL READY' : 'LOIAL SPENT').setColor(ls === 'spent' ? '#87909a' : '#8cf0ae');
    if (this.loialPic) this.loialPic.setAlpha(ls === 'spent' ? 0.35 : 1);
  }
  // ---------- power slots: icon + name + countdown bar for the boost and the ter'angreal ----------
  makePowerSlots() {
    this.slots = ['boost', 'ter'].map((slot, i) => {
      const y = 158 + i * 44;
      const icon = this.add.image(38, y, ART.hud.angreal.key).setDisplaySize(36, 36).setVisible(false);
      const label = this.add.text(62, y - 16, '', { fontFamily: PX, fontSize: '10px', color: '#ffffff', stroke: '#000', strokeThickness: 3 }).setVisible(false);
      const secs = this.add.text(296, y - 16, '', { fontFamily: PX, fontSize: '10px', color: '#ffffff', stroke: '#000', strokeThickness: 3 }).setOrigin(1, 0).setVisible(false);
      return { slot, y, icon, label, secs, kind: null, shown: null };
    });
  }
  /** Text.setText/setColor re-render the text texture, so names change only with the slot and seconds once a second. */
  updatePowerSlots(s, time = 0) {
    if (!this.slots || !s.powers) return;
    const touch = this.game && this.game.inp && this.game.inp.isTouch;
    for (const sl of this.slots) {
      const p = s.powers[sl.slot], kind = p ? p.kind : null;
      if (kind !== sl.kind) {
        sl.kind = kind; sl.shown = null;
        for (const o of [sl.icon, sl.label, sl.secs]) o.setVisible(!!kind);
        if (kind) {
          const P = POWERS[kind];
          sl.icon.setTexture(ART.hud[kind].key).setDisplaySize(36, 36);
          sl.label.setText(P.cast ? `${P.name} [${touch ? 'FIRE' : 'L/Q'}]` : P.name).setColor(P.css); sl.secs.setColor(P.css);
        }
      }
      if (!kind) continue;
      const left = Math.max(0, p.t), whole = Math.ceil(left);
      if (whole !== sl.shown) { sl.shown = whole; sl.secs.setText(whole + 's'); }
      sl.icon.setAlpha(left < 3 && Math.floor(time / 120) % 2 ? 0.35 : 1);
      this.bar(62, sl.y + 2, 234, 6, left / p.total, POWERS[kind].color, 0x101018);
    }
  }
  // ---------- the Twix campfire cutscene (logic in src/twix.js, ticked from update while Stage1 is paused) ----------
  showCutscene(cs, panels = ART.panels) {
    this.hideCutscene();
    const c = this.add.container(0, 0).setDepth(300);
    const bg = this.add.rectangle(VW / 2, VH / 2, VW, VH, 0x05070d, 1).setInteractive();
    const panel = this.add.image(VW / 2, VH / 2, panels[0].key).setDisplaySize(VW, VH);
    const box = this.add.graphics(); box.fillStyle(0x000000, 0.72); box.fillRoundedRect(110, VH - 196, VW - 220, 156, 14); box.lineStyle(2, 0xd8c08a, 0.9); box.strokeRoundedRect(110, VH - 196, VW - 220, 156, 14);
    const who = this.add.text(140, VH - 182, '', { fontFamily: PX, fontSize: '14px', color: '#ffd27a', stroke: '#000', strokeThickness: 4 });
    const text = this.add.text(140, VH - 150, '', { fontFamily: F, fontStyle: '600', fontSize: '26px', color: '#ffffff', stroke: '#000', strokeThickness: 5, wordWrap: { width: VW - 290 } });
    const touch = this.game.inp.isTouch;
    const hint = this.add.text(VW - 130, VH - 58, touch ? 'TAP: NEXT' : 'ATTACK: NEXT   START/ESC: SKIP', { fontFamily: PX, fontSize: '10px', color: '#cbd6ee', stroke: '#000', strokeThickness: 3 }).setOrigin(1, 0.5);
    const skip = this.add.text(VW - 28, 28, 'SKIP ▶▶', { fontFamily: PX, fontSize: '14px', color: '#ffe9a8', backgroundColor: 'rgba(0,0,0,0.55)', padding: { x: 12, y: 8 } }).setOrigin(1, 0).setInteractive();
    c.add([bg, panel, box, who, text, hint, skip]);
    // Taps: SKIP skips, anywhere else advances. Routed through Input so the stage handles them like keys and pads.
    skip.on('pointerdown', (ptr, x, y, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); this.game.inp.press('start'); });
    bg.on('pointerdown', () => this.game.inp.press('attack'));
    this.cut = { c, panel, who, text, panelI: 0, panels };
    if (cs && cs.line) this.cutsceneLine(cs.line);
  }
  cutsceneLine(line) {
    const u = this.cut; if (!u || !line) return;
    const panels = u.panels || ART.panels, i = Math.max(0, Math.min(panels.length - 1, line.panel | 0));
    if (i !== u.panelI) { u.panelI = i; u.panel.setTexture(panels[i].key).setDisplaySize(VW, VH); }
    u.who.setText(line.who).setColor(speakerColor(line.who)); u.text.setText(line.text);
  }
  hideCutscene() { if (this.cut) { this.cut.c.destroy(true); this.cut = null; } }
  update(time, delta) {
    const dt = delta / 1000, s = this.stage; if (!s || !s.riley) return;
    // The HUD keeps updating while Stage1 is paused: it drives the cutscene clock.
    if (s.tickCutscene) s.tickCutscene(Math.min(dt, 0.05));
    this.pauseLabel.setVisible(s.showPauseLabel ? s.showPauseLabel() : !!s.paused);
    const R = s.riley, g = this.g; g.clear();
    this.rHp = this.rHp === undefined ? R.hp : this.rHp + (R.hp - this.rHp) * Math.min(1, dt * 6);
    this.bar(112, 42, 300, 18, this.rHp / R.maxHp, R.hp > 35 ? 0x54d27a : 0xe0503c);
    const baleReady = R.saidin >= 100;
    this.bar(112, 64, 220, 8, R.saidin / 100, baleReady ? (Math.floor(time / 180) % 2 ? 0xffffff : 0xbfe8ff) : R.saidin >= 34 ? 0x6fd2ff : 0x3a6e90, 0x0c1420);
    this.baleT.setAlpha(baleReady ? 0.75 + 0.25 * Math.sin(time / 120) : 0);
    const loialReady = R.loialReady && !s.loial;
    this.updateLoialLabel(s, R);
    this.updatePowerSlots(s, time);
    const ts = (baleReady ? 'b' : '') + (loialReady ? 'l' : '');
    if (ts !== this.touchState && typeof document !== 'undefined') {
      this.touchState = ts; const b = document.getElementById('tbB'), l = document.getElementById('tbL');
      if (b) { b.classList.toggle('off', !baleReady); b.classList.toggle('ready', baleReady); }
      if (l) l.classList.toggle('off', !loialReady);
    }
    this.lives.setText('×' + Math.max(0, R.lives)); this.score.setText(String(R.score).padStart(7, '0'));
    if (this.enemyRef && this.enemyT > 0 && !this.enemyRef.T.boss) { this.enemyT -= dt; const e = this.enemyRef; this.enemyName.setText(e.name).setAlpha(1); this.bar(112, 122, 200, 8, Math.max(0, e.hp) / e.maxHp, 0xe07a3c); }
    else this.enemyName.setAlpha(0);
    if (this.boss) {
      // boss bar sits top-centre-right so it never covers the fighters' feet or the caption box
      const b = this.boss; this.bossShown = Math.min(1, this.bossShown + dt * 1.5); const W = 500, w = W * this.bossShown, x0 = 560, y0 = 44;
      if (!this.bossName) {
        const L = bossLabel(s, k => this.textures.exists(k));
        this.bossName = this.add.text(x0, y0 - 20, L.name, { fontFamily: PX, fontSize: '12px', color: '#ffd0b0', stroke: '#000', strokeThickness: 4 }).setOrigin(0, 0.5);
        this.bossPic = this.add.image(x0 - 44, y0 + 2, L.portrait).setDisplaySize(68, 68);
        this.bossRing = this.add.graphics(); this.bossRing.lineStyle(3, 0xb0503a, 1); this.bossRing.strokeCircle(x0 - 44, y0 + 2, 35); this.bossRing.lineStyle(1, 0x000000, 0.8); this.bossRing.strokeCircle(x0 - 44, y0 + 2, 37);
      }
      const fade = !b.alive && (b.state === 'dead' || b.state === 'defeated' || b.state === 'retreat');
      const a = fade ? Math.max(0, this.bossName.alpha - dt * 0.8) : 1;
      this.bossName.setAlpha(a); this.bossPic.setAlpha(a); this.bossRing.setAlpha(a);
      if (a > 0) {
        g.setAlpha(1);
        this.bar(x0, y0, w, 16, Math.max(0, b.hp) / b.maxHp, b.phase >= 3 ? 0xff4a2a : b.phase === 2 ? 0xff8a2a : 0xd8452f);
        for (const f of [1 / 3, 2 / 3]) { g.fillStyle(0x000000, 0.8); g.fillRect(x0 + w * f - 1, y0, 3, 16); }
      } else this.boss = null;
    }
    this.drawStage3Meters(s, g);
    this.updateWatermark(s);
    if (this.comboHold > 0) { this.comboHold -= dt; if (this.comboHold <= 0) this.tweens.add({ targets: this.comboT, alpha: 0, duration: 300 }); }
    if (this.capT > 0) { this.capT -= dt; const a = Math.min(1, this.capT * 3); this.capWho.setAlpha(a); this.capText.setAlpha(a); this.capBg.setAlpha(a); }
    if ((this.pt = (this.pt || 0) + 1) % 20 === 0) {
      const p = perf.update();
      if (this.showPerf && p) { const f = p.fight; this.perfT.setText(`${p.fps.toFixed(1)} fps  p95 ${displayMs(p.p95)}ms  >33.4ms ${p.over33_4}/${p.frames}` + (f ? `\nFight p95 ${displayMs(f.p95)}ms ${p.gate.status === 'PASS' ? '≤16.7' : '>16.7'} · >33.4ms ${f.over33_4}/${f.frames}` : '\nFight: no samples') + `  | RS ${this.game.rs} q${s.fx.quality}`).setAlpha(1); }
      else this.perfT.setAlpha(0);
    }
  }
  drawStage3Meters(s, g) { drawStage3Meters(s, g); }
  updateWatermark(s) {
    if (!this.phTag || !s) return;
    const plates = stage3Plates(s);
    if (this.phReady && this.phMetas === s.metas && this.phPlates === plates) return;
    this.phReady = true; this.phMetas = s.metas; this.phPlates = plates;
    const on = placeholderArt(s, plates);
    if (on === this.phShown) return;
    this.phShown = on;
    this.phTag.setVisible(on);
  }
}
