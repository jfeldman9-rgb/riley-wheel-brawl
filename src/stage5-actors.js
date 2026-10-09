// Scene actors for the Blight spawn and the two Forsaken.
import { LANE_TOP, LANE_BOT, clamp } from './config.js';
import { Stalker, Sporepod } from './blightspawn.js';
import { Aginor } from './aginor.js';
import { Balthamel } from './balthamel.js';
import { stage4Delta } from './stage4-time.js';
import { stalkFrame, podFrame, aginFrame, baltFrame } from './stage5-art-cast.js';
import { scaleFor, PAINTED } from './stage5-art.js';
const BASE_H = Object.fromEntries(PAINTED.map(r => [r.key, r.baseH]));
import { LAYOUT5 } from './stage5-def.js';
import { safeStage5Spot } from './stage5-spawn.js';

function stub() { const o = { x: 0, y: 0, setPosition() { return o; }, setDepth() { return o; }, setAlpha() { return o; }, setScale() { return o; }, setFrame() { return o; }, setOrigin() { return o; }, setFlipX() {}, setLighting() {}, destroy() {} }; return o; }
function body(e, scene, key, shadowW) {
  e.z = e.z || 0; e.vx = e.vx || 0; e.team = 1;
  e.def = e.def || { shadowW, team: 1 };
  const add = scene.add;
  e.shadow = add?.image ? add.image(e.x, e.y, 'shadow') : stub();
  e.sprite = add?.sprite ? add.sprite(e.x, e.y, key, 0) : stub();
  e.shadow.setDepth?.(900); e.sprite.setDepth?.(1000 + e.y);
}
function paint(e, frame, scale, baseH) {
  if (!e.sprite) return;
  e.sprite.x = e.x; e.sprite.y = e.y - (e.z || 0); e.sprite.setDepth?.(1000 + e.y);
  e.sprite.setOrigin?.(0.5, 0.96); e.sprite.setFrame?.(frame(e.state));
  e.sprite.setScale?.(scaleFor(e.sprite.frame, scale, baseH));
  e.sprite.flipX = e.facing < 0; e.sprite.setLighting?.(true);
  const ash = e.state === 'dead' || e.state === 'burn';
  e.sprite.setAlpha?.(ash ? Math.max(0, 1 - (e.st || 0)) : 1);
  e.shadow?.setPosition?.(e.x, e.y + 2); e.shadow?.setAlpha?.(ash ? 0 : 0.55);
}
function spots(scene, key) { return scene.kit?.lay?.[key] || LAYOUT5[key] || []; }
// Render scale only. Riley's walk frame is about 260px tall; these drawn bodies land near 1.27× that.
const AGIN_SCALE = 2;
const BALT_SCALE = 2.35;

export class StalkerActor extends Stalker {
  constructor(scene, x, y) {
    super(scene, x, y);
    const zone = scene.zoneI < 0 ? 0 : scene.zoneI;
    const used = new Set((scene.enemies || []).filter(e => e !== this && e.type === 'stalker').map(e => e.homeX));
    const spot = spots(scene, 'lurks').find(s => s.zone === zone && !used.has(s.x)) || spots(scene, 'lurks').find(s => s.zone === zone);
    this.place(safeStage5Spot(scene, spot, 'lurks')); this.homeX = this.x; this.entering = false;
    body(this, scene, 's5stalk', 130);
  }
  update(dt) { this.entering = false; const prev = this.state; super.update(dt); this.scene.kit?.noteStalk?.(this, prev); }
  sync() { paint(this, stalkFrame, 1.15); }
  destroy() { super.destroy(); this.sprite?.destroy?.(); this.shadow?.destroy?.(); }
  die() { this.finish(); this.gone = true; }
}
export class SporepodActor extends Sporepod {
  constructor(scene, x, y) { super(scene, x, y); body(this, scene, 's5pod', 120); }
  dropIn() {
    super.dropIn();
    const zone = this.scene.zoneI < 0 ? 0 : this.scene.zoneI;
    const used = new Set((this.scene.enemies || []).filter(e => e !== this && e.type === 'sporepod').map(e => e.x));
    const spot = spots(this.scene, 'pods').find(s => s.zone === zone && !used.has(s.x)) || { x: this.x, y: this.y };
    this.place(safeStage5Spot(this.scene, spot, 'pods'));
  }
  update(dt) { const prev = this.state; super.update(dt); this.scene.kit?.notePod?.(this, prev); }
  sync() { paint(this, podFrame, 1.1); }
  destroy() { super.destroy(); this.sprite?.destroy?.(); this.shadow?.destroy?.(); }
  die() { this.alive = false; this.gone = true; this.state = 'dead'; }
}

export class AginorActor extends Aginor {
  constructor(scene, x, y) {
    const b = scene.bounds || { l: 3920, r: 5200 };
    super(scene, x, y, {
      bands: scene.kit?.bands, frozen: () => !!scene.kit?.arena?.frozen,
      oakBlocks: R => scene.kit?.arena?.insideOak?.(R),
      lightCross: (boss, R) => !!scene.kit?.lightAt?.((boss.x + R.x) / 2, 40),
      balthDown: () => scene.enemies?.some(e => e.type === 'balthamel' && e._down),
      onBeat: boss => scene.kit?.startBeat?.(boss),
      onPhase: (boss, ph) => { if (ph === 2) scene.spawn?.('balthamel', 'R'); scene.kit?.onPhase?.(boss, ph); },
      onBurn: boss => scene.kit?.onBurn?.(boss),
      onDefeat(boss) {
        if (scene.victoryPending || scene.ended) return;
        scene.riley.score += boss.T?.score || 9000;
        scene.bossDown?.(boss);
      },
    });
    this.deps.left = b.l; this.deps.right = b.r;
    body(this, scene, 's5agin', 170);
  }
  update(dt) {
    this.entering = false;
    dt = stage4Delta(dt); if (!dt) return;
    const prev = this.state;
    super.update(dt);
    this.y = clamp(this.y, LANE_TOP, LANE_BOT);
    this.scene.kit?.noteBoss?.(this, prev);
  }
  sync() { paint(this, aginFrame, AGIN_SCALE, BASE_H.s5agin); this.shadow?.setScale?.(1.55, 0.42); }
  destroy() { super.destroy(); this.sprite?.destroy?.(); this.shadow?.destroy?.(); }
  die() { if (this.state !== 'dead') this.burn(); this.gone = true; }
}
export class BalthamelActor extends Balthamel {
  constructor(scene, x, y) {
    super(scene, x, y, { frozen: () => !!scene.kit?.arena?.frozen });
    this.z = 220; this.vz = 0; this.entering = false;
    body(this, scene, 's5balt', 150);
  }
  update(dt) {
    dt = stage4Delta(dt);
    if (!dt || this.scene.paused || this.scene.cutscene || this.deps.frozen?.()) return;
    this.entering = false;
    const prev = this.state; super.update(dt);
    if ((this.z || 0) > 0 || this.vz) { this.z = Math.max(0, (this.z || 0) + (this.vz || 0) * dt - 1300 * dt * dt); this.vz = this.z ? (this.vz || 0) - 2600 * dt : 0; }
    this.scene.kit?.noteBalth?.(this, prev);
  }
  sync() {
    paint(this, baltFrame, BALT_SCALE, BASE_H.s5balt);
    this.shadow?.setScale?.(1.45, 0.4);
    if (this.state !== 'holding' || !this.sprite) return;
    const face = this.facing < 0 ? -1 : 1;
    this.sprite.x = this.x + face * 16;
    const y = Math.max(this.y, this.target?.y || 0);
    this.sprite.setDepth?.(1000 + y + 8);
  }
  destroy() { super.destroy(); this.sprite?.destroy?.(); this.shadow?.destroy?.(); }
  die() { this.fall(); this.gone = true; this.alive = false; }
}
export const STAGE5_ACTORS = Object.freeze({ stalker: StalkerActor, sporepod: SporepodActor, aginor: AginorActor, balthamel: BalthamelActor });
