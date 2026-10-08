// Scene actors for the pure Cultist and Draghkar cores. Sprites are optional.
import { LANE_TOP, LANE_BOT, clamp } from './config.js';
import { Cultist } from './cultists.js';
import { Draghkar, DRAGHKAR } from './draghkar.js';
import { cultFrame, dragFrame } from './stage4-art-cast.js';
import { stage4Delta } from './stage4-time.js';
import { lightNear } from './myrddraal.js';
import { croon } from './stage4-voice.js';
import { beginDraghkarStrike, finishDraghkarStrike, finishDraghkarKiss } from './draghkar-impact.js';

const ATK = new Set(['combo1', 'combo2', 'combo3', 'back', 'runkick', 'airkick', 'knee']);

function stub() {
  const o = { x: 0, y: 0, setPosition() { return o; }, setDepth() { return o; }, setAlpha() { return o; }, setScale() { return o; }, destroy() {}, play() { return o; } };
  return o;
}
function body(e, scene, key, shadowW) {
  e.z = e.z || 0; e.vx = e.vx || 0; e.vy = 0; e.team = 1;
  if (e.gone == null) e.gone = false;
  e.def = { shadowW, team: 1 };
  if (!e.id) { scene.koCount = (scene.koCount || 0) + 1; e.id = scene.koCount; }
  const add = scene.add;
  e.shadow = add?.image ? add.image(e.x, e.y, 'shadow') : stub();
  e.sprite = add?.sprite ? add.sprite(e.x, e.y, key) : stub();
  e.shadow.setDepth?.(900);
  e.sprite.setDepth?.(1000 + e.y);
}
function aim(e, dir) { if (dir) { e.facing = dir; if (e.sprite) e.sprite.flipX = dir < 0; } }
// scale is for the painter's cell height (baseH); a painted sheet with taller cells is scaled to the same footprint.
function paint(e, frameOf, scale, baseH) {
  if (!e.sprite) return;
  e.sprite.x = e.x; e.sprite.y = e.y - (e.z || 0);
  e.sprite.setDepth?.(1000 + e.y);
  e.sprite.setOrigin?.(0.5, 0.96);
  e.sprite.setFrame?.(frameOf(e.state, e.st || 0));
  const fh = e.sprite.frame?.height;
  e.sprite.setScale?.(fh > baseH ? scale * baseH / fh : scale);
  e.sprite.setLighting?.(true);
  const ash = e.state === 'defeated' || e.state === 'ash';
  e.sprite.setAlpha?.(ash ? Math.max(0, 1 - (e.st || 0) * 0.65) : 1);
  e.shadow?.setPosition?.(e.x, e.y + 2);
  e.shadow?.setScale?.(e.type === 'draghkar' ? 1.4 : 0.8, 0.35);
  e.shadow?.setAlpha?.(ash ? 0 : 0.55);
}
function slide(e, dt, freeX) {
  dt = stage4Delta(dt);
  if (!dt || e.scene.paused || e.scene.cutscene) return;
  if (e.vx) { e.x += e.vx * dt; e.vx *= Math.pow(0.004, dt); if (Math.abs(e.vx) < 6) e.vx = 0; }
  e.y = clamp(e.y, LANE_TOP, LANE_BOT);
  if (!freeX && e.scene.bounds) e.x = clamp(e.x, e.scene.bounds.l + 40, e.scene.bounds.r - 40);
}
function swing(R) { return !!(R && R.atk && ATK.has(R.state)); }

export class CultistActor extends Cultist {
  constructor(scene, x, y) {
    super(scene, x, y, { summonVent: (at, c) => scene.kit?.summonVent?.(at, c) });
    this.T = { speed: 108, score: 400, boss: false, name: 'CULTIST' };
    body(this, scene, 's4cult', 120);
  }
  face(dir) { aim(this, dir); }
  update(dt) {
    if (this.entering) return;
    const prev = this.state;
    super.update(dt);
    this.scene.kit?.noteCult?.(this, prev);
  }
  physics(dt) { slide(this, dt, this.state === 'flee'); }
  sync() { paint(this, cultFrame, 1.2, 190); }
  destroy() { this.sprite?.destroy?.(); this.shadow?.destroy?.(); this.alive = false; this.state = 'gone'; this.gone = true; }
  die() { this.alive = false; this.gone = true; this.state = 'ko'; }
}

export class DraghkarActor extends Draghkar {
  constructor(scene, x, y) {
    const b = scene.bounds || { l: 0, r: 1280 };
    super(scene, x, y, {
      lightNear,
      left: b.l - 80, right: b.r + 80, midX: (b.l + b.r) / 2,
      bandY: clamp(scene.riley?.y || 630, LANE_TOP, LANE_BOT),
      onBossDefeat(boss) {
        if (scene.victoryPending || scene.ended) return;
        scene.riley.score += boss.T?.score || 8000;
        scene.bossDown(boss);
      },
      onBossPhase: (boss, ph) => scene.onBossPhase?.(boss, ph),
      spawnCultists(n) { for (let i = 0; i < n; i++) scene.spawn?.('cultist', i ? 'L' : 'R'); },
      onRileyGrabbed: (_b, R) => R.enterGrabbed?.(_b),
    });
    this.T = { speed: 140, score: 8000, boss: true, name: 'THE DRAGHKAR' };
    body(this, scene, 's4drag', 180);
  }
  get mashN() { return this.mashCount || 0; }
  get mashNeed() { return 8; }
  get canBeHit() { return this.alive && !['ash', 'defeated', 'perch'].includes(this.state); }
  face(dir) { aim(this, dir); }
  startKiss() {
    if (this.scene.attackTokens?.() > 0) return false;
    return super.startKiss();
  }
  startSwoop(band, dir) {
    const b = this.scene.bounds || { l: 0, r: 1280 };
    this.deps.left = b.l - 80; this.deps.right = b.r + 80; this.deps.midX = (b.l + b.r) / 2;
    const y = this.scene.riley?.y;
    this.deps.bandY = y == null ? 630 : clamp(y, LANE_TOP, LANE_BOT);
    return super.startSwoop(band, dir);
  }
  takeHit(h = {}, from) {
    if (this.state === 'swoop_dive' && from !== this.target && (h.down || h.kind === 'heavy' || h.power)) {
      const kind = h.power && h.kind !== 'heavy' ? 'lightning' : 'fireball';
      return super.takeHit({ ...h, kind }, from);
    }
    return super.takeHit(h, from);
  }
  mash() {
    const ok = super.mash();
    if (ok) {
      if (this.target) this.target.lastGrabber = this;
      this.target?.leaveGrabbed?.('escape');
      if (this.scene.kit) this.scene.kit.stats.kissEscapes++;
    }
    return ok;
  }
  cancelCroon() {
    const ok = super.cancelCroon();
    if (ok) croon(false);
    if (ok && this.scene.kit) this.scene.kit.stats.croonCancels++;
    return ok;
  }
  releaseHold() {
    if (this.state === 'kiss_hold') this.takeHit({ hazard: true, dmg: 0 });
    else this.releaseGrab();
  }
  substep(dt) {
    const R = this.target;
    if (this.state === 'kiss_lunge' && R && R.z > 0) {
      this.st += dt; this.x += this.lungeDir * DRAGHKAR.kissSpeed * dt;
      if (this.st >= DRAGHKAR.kissMaxDuration) { this.state = 'grounded'; this.st = 0; this.setKissCooldown(); }
      return;
    }
    const strike = beginDraghkarStrike(this);
    const kissing = this.state === 'kiss_hold';
    super.substep(dt);
    finishDraghkarStrike(this, strike);
    if (kissing) finishDraghkarKiss(this);
  }
  update(dt) {
    dt = stage4Delta(dt);
    if (!dt || this.scene.paused || this.scene.cutscene) return;
    const powers = this.scene.powers;
    this.scene.fireShieldActive = !!(powers && powers.active && powers.active('fireshield'));
    if (this.entering) return;
    const R = this.scene.riley, prev = this.state;
    if (R && this.state === 'swoop_dive' && swing(R) && Math.sign(this.x - R.x) === (R.facing || 1)) R.attackFrame = true;
    super.update(dt);
    this.z = ['perch', 'swoop_tell', 'swoop_dive'].includes(this.state) ? 120 : (this.z === 120 ? 0 : this.z || 0);
    this.scene.kit?.noteBoss?.(this, prev);
  }
  physics(dt) { slide(this, dt, this.state === 'swoop_tell' || this.state === 'swoop_dive'); }
  sync() { paint(this, dragFrame, 1.62, 250); }
  dispose() { croon(false); super.dispose(); }
  destroy() { this.sprite?.destroy?.(); this.shadow?.destroy?.(); this.dispose(); }
  die() { if (this.alive) this.defeat(); this.gone = true; }
}

export const STAGE4_ACTORS = Object.freeze({ cultist: CultistActor, draghkar: DraghkarActor });
