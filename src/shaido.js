import { Stage7Fighter } from "./stage7-fighter.js";
import { clamp, LANE_TOP, LANE_BOT } from "./config.js";
import { substeps } from "./stage5-clock.js";
import { strikeRiley } from "./stage6-hurt.js";
import { sfx7 } from "./stage7-voice.js";
export const SHAIDO = Object.freeze({
  dancer: Object.freeze({
    hp: 60,
    speed: 150,
    tell: 0.45,
    lunge: 300,
    score: 450,
  }),
  veiled: Object.freeze({
    hp: 40,
    speed: 120,
    tell: 0.6,
    spacing: 0.6,
    score: 350,
  }),
});
export class Shaido extends Stage7Fighter {
  constructor(scene, x, y, type = "dancer") {
    const t = SHAIDO[type];
    super(
      scene,
      type === "dancer" ? "s7dancer" : "s7veiled",
      t.hp,
      x,
      y,
      t.score,
      "SHAIDO " + (type === "dancer" ? "SPEAR-DANCER" : "ARCHER"),
      t.speed,
    );
    this.type = type;
    this.cool = 0.7;
    this.counterUsed = false;
    this.flank = scene.koCount % 2 ? -1 : 1;
  }
  update(dt) {
    if (
      this.scene.paused ||
      this.scene.cutscene ||
      this.scene.kit?.strike ||
      this.entering ||
      this.silhouette > 0
    )
      return;
    substeps(this, dt, (d) => this.step(d));
  }
  get grabbable() {
    return (
      this.canBeHit &&
      this.z <= 0 &&
      ["idle", "walk", "hurt"].includes(this.state)
    );
  }
  grabbed(by) {
    this.heldBy = by;
    this.vx = this.vz = 0;
    this.setState("held");
  }
  release() {
    if (this.state === "held") {
      this.heldBy = null;
      this.setState("idle");
      this.cool = 0.8;
    }
  }
  releaseHold() {
    if (this.heldBy?.held === this) this.heldBy.held = null;
    this.release();
  }
  throwFrom(by, dir) {
    this.heldBy = null;
    this.thrownBy = by;
    this.setState("thrown");
    this.face(-dir);
    this.vx = dir * 560;
    this.vz = 560;
    this.z = Math.max(this.z, 60);
  }
  onLand() {
    if (this.state !== "thrown") return;
    this.hp = Math.max(1, this.hp - 12);
    this.setState("down");
    this.scene.fx?.thump?.(this.x, this.y, true);
  }
  step(dt) {
    this.st += dt;
    this.cool = Math.max(0, this.cool - dt);
    if (!this.alive) {
      if (this.st >= 0.8) this.gone = true;
      return;
    }
    if (this.state === "held") return;
    if (this.state === "thrown") {
      for (const e of this.scene.enemies || [])
        if (
          e !== this &&
          e.canBeHit &&
          !this.hitIds.has(e.id) &&
          Math.abs(e.x - this.x) < 90 &&
          Math.abs(e.y - this.y) < 30
        ) {
          this.hitIds.add(e.id);
          this.scene.hitTarget(
            this.thrownBy,
            e,
            {
              dmg: 10,
              kind: "heavy",
              kb: Math.sign(this.vx) * 420,
              down: true,
            },
            this,
          );
        }
      return;
    }
    if (this.assistDown > 0) {
      this.assistDown = Math.max(0, this.assistDown - dt);
      this.state = "down";
      this.st = 0;
      return;
    }
    if (this.state === "down" || this.state === "hurt") {
      if (this.st >= (this.state === "down" ? 0.8 : 0.85))
        this.setState("idle");
      return;
    }
    const R = this.scene.riley;
    if (!R?.alive) return;
    const early = this.scene.zoneI < 3;
    // Street archers must stay reachable when Riley advances the scroll edge.
    // Re-enter the playable band before aiming, including after a continue.
    if (this.type === "veiled" && early && this.scene.bounds) {
      const b = this.scene.bounds;
      const inside = clamp(this.x, b.l + 160, b.r - 160);
      if (inside !== this.x) {
        this.setState("walk");
        this.x += Math.sign(inside - this.x) * Math.min(Math.abs(inside - this.x), 120 * dt);
        this.cool = Math.max(this.cool, 0.8);
        this.face(Math.sign(R.x - this.x));
        return;
      }
    }
    if (this.state === "attack" || this.state === "aim") {
      const tell = this.type === "veiled" && early ? 0.8 : SHAIDO[this.type].tell;
      if (this.state === "attack" && this.st < tell) return;
      if (this.type === "veiled") {
        const k = this.scene.kit;
        if (
          (k?.clock || 0) < (k?.arrowAt || 0) ||
          (this.state === "aim" && this.scene.attackTokens() >= 2)
        ) {
          this.setState("aim");
          return;
        }
        if (k) {
          k.arrowAt = k.clock + (early ? 0.9 : 0.6);
          k.fireArrow?.(this);
        }
        this.setState("idle");
        this.cool = early ? 4.8 : 3.8;
      } else {
        this.setState("lunge");
        this.fromX = this.x;
      }
      return;
    }
    if (this.state === "lunge") {
      this.x += this.facing * 1000 * dt;
      if (
        !this.counterUsed &&
        Math.abs(R.x - this.x) < 70 &&
        Math.abs(R.y - this.y) < 32
      ) {
        this.counterUsed = true;
        if (R.z < 30) strikeRiley(this.scene, 6, { source: this.type + '.melee', fromX: this.x });
      }
      if (this.st >= 0.3 || Math.abs(this.x - this.fromX) >= 300) {
        this.setState("idle");
        this.cool = 3.1;
      }
      return;
    }
    const dx = R.x - this.x,
      dy = R.y - this.y,
      tokens = this.scene.attackTokens?.() || 0;
    this.face(Math.sign(dx) || this.facing);
    if (this.type === "veiled") {
      const move =
        Math.abs(dx) < 420
          ? -Math.sign(dx)
          : Math.abs(dx) > 620
            ? Math.sign(dx)
            : 0;
      this.x += move * 120 * dt;
      if (early && this.scene.bounds)
        this.x = clamp(this.x, this.scene.bounds.l + 160, this.scene.bounds.r - 160);
      this.y = clamp(
        this.y + Math.sign(dy) * Math.min(Math.abs(dy), 70 * dt),
        LANE_TOP,
        LANE_BOT,
      );
      if (
        !this.cool &&
        Math.abs(dy) < 25 &&
        tokens < 2 &&
        (this.scene.kit?.clock || 0) >= (this.scene.kit?.arrowAt || 0)
      )
        this.startAttack();
    } else {
      // Circling has no token. Pick the side without a committed attacker.
      const attackers = (this.scene.enemies || []).filter(
        (e) => e !== this && e.alive && ["attack", "lunge"].includes(e.state),
      );
      if (attackers.length)
        this.flank = -Math.sign(attackers[0].x - R.x) || this.flank;
      const goal = R.x + this.flank * 180;
      this.x +=
        Math.sign(goal - this.x) *
        Math.min(Math.abs(goal - this.x), SHAIDO.dancer.speed * dt);
      this.y += Math.sign(dy) * Math.min(Math.abs(dy), 100 * dt);
      this.state = "walk";
      if (!this.cool && Math.abs(dx) < 330 && Math.abs(dy) < 22 && tokens < 2)
        this.startAttack();
    }
  }
  startAttack() {
    this.setState("attack");
    this.counterUsed = false;
    sfx7(this.type === "dancer" ? "shout" : "shout2");
  }
  takeHit(h = {}) {
    if (!this.canBeHit) return false;
    this.hp -= Math.max(0, h.dmg || 0);
    if (this.alive) this.grabOpen = Math.max(this.grabOpen || 0, 1.05);
    if (this.hp <= 0) this.yield();
    else {
      this.setState(h.down ? "down" : "hurt");
      this.vx = h.kb || 0;
    }
    return true;
  }
  yield() {
    if (!this.alive) return;
    this.hp = Math.max(1, this.hp);
    this.alive = false;
    this.setState("yield");
    this.vx = 0;
    this.scene.onEnemyDie?.(this);
  }
  die() {
    this.yield();
  }
}
export class Dancer extends Shaido {
  constructor(s, x, y) {
    super(s, x, y, "dancer");
  }
}
export class Veiled extends Shaido {
  constructor(s, x, y) {
    super(s, x, y, "veiled");
  }
}
