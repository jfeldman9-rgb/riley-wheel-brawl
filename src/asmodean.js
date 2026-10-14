import { Stage7Fighter } from "./stage7-fighter.js";
import { substeps } from "./stage5-clock.js";
import { clamp, LANE_TOP, LANE_BOT } from "./config.js";
import { strikeRiley } from "./stage6-hurt.js";
export const ASMODEAN = Object.freeze({
  hp: 600,
  speed: 88,
  reach: 150,
  score: 8000,
  gates: Object.freeze([0.66, 0.33]),
  bashTell: 0.55,
  bashDmg: 8,
  channel: 1.8,
  hits: 3,
  stun: 1.4,
  breakCooldown: 4,
  channelEvery: 6,
});
export class Asmodean extends Stage7Fighter {
  constructor(s, x, y) {
    super(s, "s7asmo", 600, x, y, 8000, "ASMODEAN", 88, true);
    this.type = "asmodean";
    this.phase = 1;
    this.counterUsed = false;
    this.invuln = false;
    this.beat = false;
    this.clock = 0;
    this.channelAt = 6;
    this.bashAt = 3;
    this.channelHits = 0;
  }
  get canBeHit() {
    return this.alive && !this.entering && !this.invuln && !this.beat;
  }
  get name() {
    return "ASMODEAN";
  }
  update(dt) {
    if (
      this.scene.paused ||
      this.scene.cutscene ||
      this.scene.kit?.strike ||
      this.entering
    )
      return;
    substeps(this, dt, (d) => this.step(d));
  }
  step(dt) {
    this.st += dt;
    if (this.phase >= 3 && this.hp <= 0) this.die();
    if (!this.alive || this.state === "bound") {
      this.vx = this.vy = 0;
      return;
    }
    this.clock += dt;
    if (this.beat) {
      if (this.st >= 0.55) {
        this.invuln = this.beat = false;
        this.setState("idle");
      }
      return;
    }
    if (this.state === "stagger") {
      if (this.st >= this.staggerFor) this.setState("idle");
      return;
    }
    if (this.state === "hurt" || this.state === "down") {
      if (this.st >= (this.state === "down" ? 0.8 : 0.24))
        this.setState("idle");
      return;
    }
    if (this.state === "channel") {
      if (this.st >= ASMODEAN.channel) {
        this.counterUsed = true;
        this.scene.kit?.arena.wave(this);
        this.setState("idle");
      }
      return;
    }
    const R = this.scene.riley;
    if (!R?.alive) return;
    if (this.state === "attack") {
      if (!this.counterUsed && this.st >= ASMODEAN.bashTell) {
        this.counterUsed = true;
        if (
          Math.abs(R.x - this.x) < 150 &&
          Math.abs(R.y - this.y) < 34 &&
          R.z < 35
        )
          strikeRiley(this.scene, 8, { fromX: this.x });
      }
      if (this.st >= 1.1) {
        this.setState("idle");
        this.bashAt = this.clock + 3.5;
      }
      return;
    }
    if (this.phase === 3 && this.clock >= this.channelAt) {
      this.startChannel();
      return;
    }
    const dx = R.x - this.x;
    this.face(Math.sign(dx) || -1);
    if (this.clock >= this.bashAt && (this.scene.attackTokens?.() || 0) < 2) {
      if (
        Math.abs(dx) <= 160 &&
        Math.abs(R.y - this.y) < 26 &&
        !this.scene.kit?.notes.pending.length
      ) {
        this.setState("attack");
        this.counterUsed = false;
        return;
      }
      this.state = "walk";
      this.x += Math.sign(dx) * 88 * dt;
      this.y +=
        Math.sign(R.y - this.y) * Math.min(Math.abs(R.y - this.y), 70 * dt);
    } else {
      const home = (this.scene.zone?.r || 5200) - 200;
      if (Math.abs(this.x - home) > 8) {
        this.x += Math.sign(home - this.x) * 88 * dt;
        this.state = "walk";
      } else this.state = "idle";
    }
    if (this.scene.bounds)
      this.x = clamp(
        this.x,
        this.scene.bounds.l + 60,
        this.scene.bounds.r - 60,
      );
    this.y = clamp(this.y, LANE_TOP, LANE_BOT);
  }
  startChannel() {
    this.setState("channel");
    this.channelHits = 0;
    this.counterUsed = false;
    this.channelAt = this.clock + 6;
    this.scene.hud?.flashText?.("BREAK THE CHANNEL — THREE HITS OR A THROW");
  }
  stagger(duration = 1.4) {
    if (!this.alive || this.beat) return;
    this.setState("stagger");
    this.staggerFor = duration;
    this.counterUsed = true;
  }
  takeHit(h = {}, from) {
    if (!this.canBeHit) return false;
    const channel = this.state === "channel";
    const counter = this.state === "attack" && !this.counterUsed && !h.assist;
    this.hp -= Math.max(0, h.dmg || 0);
    this.guard();
    if (counter && this.alive && !this.beat) this.stagger(0.8);
    if (channel && this.alive && !this.beat && !h.assist) {
      this.channelHits++;
      if (
        this.channelHits >= 3 ||
        h.throw ||
        h.kind === "throw" ||
        h.thrown ||
        from?.state === "thrown"
      ) {
        this.stagger(ASMODEAN.stun);
        this.channelAt = Math.max(this.channelAt, this.clock + ASMODEAN.breakCooldown);
        this.scene.hud?.flashText?.("CHANNEL BROKEN");
      }
    }
    if (this.hp <= this.maxHp * 0.1 && this.scene.fx)
      this.scene.fx.trauma = Math.max(this.scene.fx.trauma || 0, 0.3);
    return true;
  }
  guard() {
    if (!this.alive) return;
    if (this.phase < 3) {
      const floor = Math.floor(this.maxHp * ASMODEAN.gates[this.phase - 1]);
      if (this.hp <= floor) {
        this.hp = floor;
        this.phase++;
        this.beat = this.invuln = true;
        this.setState("idle");
        this.counterUsed = true;
        this.channelAt = this.clock + 2;
        this.scene.onBossPhase?.(this, this.phase);
      }
    } else if (this.hp <= 0) this.die();
  }
  die() {
    if (!this.alive) return;
    // Every lethal route, including throws/powers, must respect both phase gates.
    if (this.phase < 3) {
      this.hp = 0;
      this.guard();
      return;
    }
    this.hp = 0;
    this.alive = false;
    this.invuln = true;
    this.vx = this.vy = this.vz = 0;
    this.setState("bound");
    this.sprite?.anims?.stop?.();
    this.sync?.();
    this.scene.onEnemyDie?.(this);
  }
}
