// Painted actors keep Fighter physics and the main game's combat contract.
import { Fighter } from './fighter.js';
import { isPainted } from './stage6-paint.js';
import { frame7 } from './stage7-frames.js';
export class Stage7Fighter extends Fighter {
  constructor(scene, key, hp, x, y, score, name, speed, boss = false) {
    scene.metas ||= {};
    scene.metas[key] ||= { scale: 1, baseline: 62, canvas: [64,64], pages: [key], anims: [{ pages: [0], frames: [0] }] };
    super(scene, { key, hp, team: 1, native: 1, scale: 3, shadowW: 130, anchorX: 0.5 }, x, y);
    this.sprite.setLighting?.(false); this.type = key; this.T = { score, name, speed, boss };
    scene.koCount = (scene.koCount || 0) + 1; this.id = 1_000_000_000 + scene.koCount; this.state = 'idle'; this.gone = false; this.entering = false; this.accum = 0;
  }
  get canBeHit() { return this.alive && !this.entering && !(this.silhouette > 0) && !['yield','down'].includes(this.state); }
  face(dir) { if (dir) { this.facing = dir; this.sprite.flipX = dir < 0; } }
  setState(state) { this.state = state; this.st = 0; this.hitIds.clear(); }
  releaseHold() {}
  sync() {
    const frame = this.state === 'yield' || this.state === 'bound' ? 7 : this.state === 'down' ? 6 : this.state === 'hurt' || this.state === 'stagger' ? 5 : this.state === 'channel' ? 4 : this.state === 'attack' || this.state === 'lunge' ? 3 : this.state === 'walk' ? 1 + Math.floor(this.st * 10) % 2 : 0;
    const painted=isPainted(this.scene,this.def.key);
    const state = this.def.key === 's7asmo' && this.state === 'idle' && this.scene.kit?.notes?.pending?.length ? 'play' : this.state;
    const shown=frame7(this.scene,this.def.key,state,this.st,frame);
    this.sprite.setPosition?.(this.x, this.y - this.z); this.sprite.setFrame?.(shown); this.sprite.setOrigin?.(0.5, 0.96);
    this.sprite.setScale?.(painted ? 1 : 3);
    this.sprite.setDepth?.(1000 + this.y);
    this.sprite.setAlpha?.(this.silhouette > 0 ? 0.4 : this.state === 'yield' ? Math.max(0, 1 - this.st / 0.8) : 1);
    this.shadow.setPosition?.(this.x, this.y + 2); this.shadow.setAlpha?.(this.alive ? 0.5 : 0);
  }
  destroy() { super.destroy(); this.alive = false; this.gone = true; }
}
