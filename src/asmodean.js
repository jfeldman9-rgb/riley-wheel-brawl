// Asmodean, the gleeman. Bound, not killed. Phrases are the fixed table in stage7-notes.js.
import { clamp, LANE_TOP, LANE_BOT } from './config.js';
import { nextFighterId } from './enemies.js';
import { substeps } from './stage5-clock.js';
import { strikeRiley } from './stage5-hurt.js';
import {
  BEAT, NOTE_SPEED, NOTE_DMG, REFLECT_PX, BASH_TELL, BASH_DMG, PHRASE_GAP, PHRASE_GAP_SLOW,
  PHRASES, bandY, noteAt, tellBands, clampDamage, noteHurt,
} from './stage7-notes.js';

export const ASMODEAN = Object.freeze({
  hp: 600, speed: 88, reach: 150, score: 8000, gates: Object.freeze([0.66, 0.33]),
});

function stub() {
  const o = { setPosition() { return o; }, setDepth() { return o; }, setAlpha() { return o; }, setScale() { return o; }, setOrigin() { return o; }, destroy() {} };
  return o;
}

export class Asmodean {
  constructor(scene, x, y) {
    this.scene = scene; this.type = 'asmodean'; this.x = x; this.y = y; this.z = 0; this.vx = 0;
    this.hp = this.maxHp = ASMODEAN.hp; this.alive = true; this.phase = 1; this.state = 'play'; this.st = 0;
    this.facing = -1; this.team = 1; this.accum = 0; this.gone = false; this.entering = false;
    this.counterUsed = false; this.invuln = false; this.beat = false; this.song = 0; this.pi = -1; this.fired = 0;
    this.notes = []; this.tells = []; this.phrase = PHRASES[0]; this.chanCd = 2.2; this.chits = 0;
    this.def = { shadowW: 170, team: 1 };
    this.T = { speed: ASMODEAN.speed, score: ASMODEAN.score, boss: true, name: 'ASMODEAN' };
    this.id = nextFighterId();
    const add = scene.add;
    this.shadow = add?.image ? add.image(x, y, 'shadow') : stub();
    this.sprite = add?.sprite ? add.sprite(x, y, 's7asmo', 0) : stub();
    this.shadow.setDepth?.(900); this.sprite.setOrigin?.(0.5, 0.96);
    if (scene.enemies && !scene.enemies.includes(this)) scene.enemies.push(this);
  }
  get canBeHit() { return this.alive && !this.entering && !this.invuln && !this.beat && this.state !== 'bound'; }
  face(dir) { if (dir) this.facing = dir; }
  update(dt) {
    if (!this.alive && this.state !== 'bound') return;
    if (this.scene.paused || this.scene.cutscene) return;
    substeps(this, dt, d => this.sub(d));
  }
  sub(dt) {
    if (this.invT > 0) { this.invT -= dt; if (this.invT <= 0) { this.invuln = false; this.beat = false; } }
    if (this.staggerLeft > 0 && this.state !== 'stagger') this.state = 'stagger';
    if (this.state === 'bound') return;
    if (this.state === 'stagger') { this.st += dt; this.staggerLeft = Math.max(0, (this.staggerLeft || 0.8) - dt); if (this.st >= 0.8) this.toPlay(); return; }
    if (this.state === 'stun') { this.st += dt; if (this.st >= 1.4) this.toPlay(); return; }
    if (this.state === 'channel') return this.channel(dt);
    if (this.state === 'bashTell') return this.bashTell(dt);
    if (this.state === 'bash') return this.bash(dt);
    this.play(dt);
  }
  toPlay() { this.state = 'play'; this.st = 0; this.counterUsed = false; }
  phraseLen() { return this.phase === 2 ? PHRASE_GAP_SLOW : PHRASE_GAP; }
  play(dt) {
    this.song += dt;
    const len = this.phraseLen();
    const pi = Math.floor(this.song / len) % PHRASES.length;
    const phraseT = this.song % len;
    if (pi !== this.pi) { this.pi = pi; this.fired = 0; this.bashed = false; }
    this.phrase = PHRASES[pi];
    this.tells = tellBands(this.phrase, phraseT);
    for (let i = 0; i < 4; i++) {
      if (this.fired & (1 << i)) continue;
      if (phraseT < noteAt(i)) continue;
      this.fired |= 1 << i;
      const band = this.phrase.bands[i];
      this.notes.push({ band, gold: this.phrase.gold === i, x: this.x - 24, y: bandY(band), vx: -NOTE_SPEED, hit: false, reflected: false, life: 4.2 });
    }
    if (!this.bashed && this.phase !== 2 && phraseT >= 3.2 && phraseT < 4.4) {
      this.bashed = true; this.state = 'bashTell'; this.st = 0; this.counterUsed = false; return;
    }
    if (this.phase >= 3) {
      this.chanCd -= dt;
      if (this.chanCd <= 0) { this.startChannel(); return; }
    }
    this.stepNotes(dt);
    if (this.state !== 'play') return;
    this.drift(dt);
  }
  drift(dt) {
    const s = this.scene, R = s.riley, b = s.bounds || { l: 3920, r: 5200 };
    const home = b.r - 240;
    const tx = R ? Math.max(home, R.x + 170) : home;
    this.x = clamp(this.x + clamp(tx - this.x, -ASMODEAN.speed * dt, ASMODEAN.speed * dt), b.l + 80, b.r - 70);
    const y = bandY(1);
    if (Math.abs(this.y - y) > 4) this.y = clamp(this.y + Math.sign(y - this.y) * 70 * dt, LANE_TOP, LANE_BOT);
    this.face(Math.sign((R?.x || this.x) - this.x) || -1);
  }
  stepNotes(dt) {
    const R = this.scene.riley;
    for (const n of this.notes) {
      n.x += n.vx * dt; n.life -= dt;
      if (n.gold && !n.reflected && R?.attackFrame && Math.hypot(n.x - R.x, n.y - R.y) < REFLECT_PX && (n.x - R.x) * (R.facing || 1) > -20) {
        n.reflected = true; n.vx = NOTE_SPEED; n.hit = true;
        this.reflect();
      } else if (!n.hit && !n.reflected && R && Math.abs(n.x - R.x) < 26 && Math.abs(n.y - R.y) < 24 && (R.z || 0) < 28) {
        n.hit = true;
        if (strikeRiley(this.scene, NOTE_DMG, { fromX: n.x, kb: 160 })) noteHurt(this.scene, 'note', BEAT);
      }
    }
    this.notes = this.notes.filter(n => n.life > 0 && n.x > -100 && n.x < 5600);
  }
  reflect() {
    const { crossed } = clampDamage(this, Math.round(this.maxHp * 0.04), false);
    this.staggerLeft = 0.8; this.state = 'stagger'; this.st = 0; this.counterUsed = true;
    if (!this._reflected) { this._reflected = true; this.scene.kit?.onReflect?.(); }
    if (this.phase >= 3 && this.hp <= 0) this.bind();
    else if (crossed) this.enter(this.phase + 1);
  }
  bashTell(dt) {
    this.st += dt; this.stepNotes(dt);
    if (this.state !== 'bashTell') return;
    this.drift(dt);
    if (this.st >= BASH_TELL) { this.state = 'bash'; this.st = 0; }
  }
  bash(dt) {
    this.st += dt;
    const R = this.scene.riley;
    if (R) this.x = clamp(this.x + Math.sign(R.x - this.x) * ASMODEAN.speed * dt, (this.scene.bounds?.l || 0) + 80, (this.scene.bounds?.r || 5200) - 70);
    if (!this.counterUsed && R && Math.abs(this.x - R.x) < ASMODEAN.reach && Math.abs(this.y - R.y) < 32 && (R.z || 0) < 24) {
      this.counterUsed = true;
      if (strikeRiley(this.scene, BASH_DMG, { fromX: this.x, kb: 240 })) noteHurt(this.scene, 'bash', BASH_TELL);
    }
    this.stepNotes(dt);
    if (this.state !== 'bash') return;
    if (this.st >= 0.28) this.toPlay();
  }
  startChannel() {
    this.state = 'channel'; this.st = 0; this.chits = 0; this.chanCd = 6; this.counterUsed = false;
  }
  channel(dt) {
    this.st += dt;
    if (this.st >= 1.8) {
      const arena = this.scene.kit?.arena;
      if (arena) arena.shock = { x: this.x, r: 0, t: 0, hit: false };
      this.toPlay();
    }
  }
  takeHit(h) {
    if (!this.alive || this.state === 'bound' || this.invuln || this.beat) return false;
    if (this.state === 'channel') {
      this.chits += 1;
      clampDamage(this, h?.dmg || 0, false);
      this.guard();
      if (this.alive && this.state !== 'bound' && (h?.anim === 'throw' || this.chits >= 3)) { this.state = 'stun'; this.st = 0; this.counterUsed = true; }
      return true;
    }
    clampDamage(this, h?.dmg || 0, false);
    this.guard();
    return true;
  }
  guard() {
    if (!this.alive) return;
    if (this.phase >= 3) { if (this.hp <= 0) this.bind(); return; }
    const floor = Math.floor(this.maxHp * (this.phase <= 1 ? ASMODEAN.gates[0] : ASMODEAN.gates[1]));
    if (this.hp <= floor) { this.hp = floor; this.enter(this.phase + 1); }
  }
  enter(ph) {
    if (!this.alive || ph === this.phase || ph > 3 || ph < 1) return;
    this.phase = ph; this.state = 'play'; this.st = 0; this.invuln = true; this.beat = true; this.invT = 0.65; this.counterUsed = false;
    this.scene.onBossPhase?.(this, ph);
  }
  bind() {
    if (this.state === 'bound') return;
    this.hp = Math.max(0, this.hp); this.alive = false; this.state = 'bound'; this.st = 0; this.notes = []; this.tells = [];
    this.scene.onEnemyDie?.(this);
  }
  die() { this.bind(); }
  releaseHold() {}
  physics() {}
  sync() {
    const f = this.state === 'channel' ? 3 : this.state === 'bash' || this.state === 'bashTell' ? 2 : this.state === 'stagger' || this.state === 'stun' ? 4 : 1;
    this.sprite?.setPosition?.(this.x, this.y - (this.z || 0));
    this.sprite?.setDepth?.(1000 + this.y);
    this.sprite?.setFrame?.(f);
    if (this.sprite) this.sprite.flipX = this.facing < 0;
    this.shadow?.setPosition?.(this.x, this.y);
  }
  destroy() { this.sprite?.destroy?.(); this.shadow?.destroy?.(); this.gone = true; }
}
