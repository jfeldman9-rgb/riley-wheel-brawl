import { Stage7Fighter } from "./stage7-fighter.js";
import { substeps } from "./stage5-clock.js";
import { stage4Delta } from "./stage4-time.js";
import { clamp, LANE_TOP, LANE_BOT, q } from "./config.js";
import { strikeRiley } from "./stage6-hurt.js";
export const ASMODEAN = Object.freeze({
  hp: 600,
  speed: 88,
  reach: 175,
  score: 8000,
  gates: Object.freeze([0.66, 0.33]),
  bashTell: 0.7,
  bashDmg: 12,
  bashBack: 40,
  bashHalfHeight: 40,
  bashFlash: 0.2,
  bashReadyLead: 0.1,
  parry: 0.2,
  shadowW: 190,
  channel: 1.8,
  hits: 3,
  stun: 1.4,
  breakCooldown: 4,
  channelEvery: 6,
});
export const CHANNEL_BANNER = "BREAK THE CHANNEL — THREE HITS OR A THROW OR A CALL";
// Readability tints. The bash tell warms and flickers faster as it nears the
// hit, then holds solid gold for the parry window; stagger reads cool/dazed.
export const ASMO_FX = Object.freeze({
  hitFlash: 0.12,
  breakFlash: 0.22,
  flinch: 7,
  tell: 0xff8a5c,
  parry: 0xffd27a,
  stagger: 0xaab8ff,
  hit: 0xffffff,
});
// Cache the media query. calm7() runs from every boss sync and stun star.
let reducedMedia, reducedMotion;
export function calm7() {
  const media = globalThis.matchMedia;
  if (media !== reducedMedia) {
    reducedMedia = media;
    reducedMotion = typeof media === "function"
      ? media("(prefers-reduced-motion: reduce)")
      : null;
  }
  return q.get("flash") === "0" || !!reducedMotion?.matches;
}
// Shared world-space footprint: both the visible rectangle and damage use it.
export function bashLane(boss) {
  return {
    x: boss.x - (boss.facing < 0 ? ASMODEAN.reach : ASMODEAN.bashBack),
    y: boss.y - ASMODEAN.bashHalfHeight,
    w: ASMODEAN.reach + ASMODEAN.bashBack,
    h: ASMODEAN.bashHalfHeight * 2,
  };
}
export function bashFront(boss, target) {
  return !!target && (target.x - boss.x) * boss.facing > -ASMODEAN.bashBack;
}
export function bashParryOpen(boss) {
  return boss.state === "attack" && !boss.counterUsed &&
    boss.st >= ASMODEAN.bashTell - ASMODEAN.parry && boss.st < ASMODEAN.bashTell;
}
export class Asmodean extends Stage7Fighter {
  constructor(s, x, y) {
    super(s, "s7asmo", 600, x, y, 8000, "ASMODEAN", 88, true);
    this.type = "asmodean";
    // Boss-sized body: hurtbox and shadow follow the larger painted sprite.
    this.def.shadowW = ASMODEAN.shadowW;
    this.shadow?.setScale?.(ASMODEAN.shadowW / 64, ASMODEAN.shadowW * 0.22 / 64);
    this.phase = 1;
    this.counterUsed = false;
    this.invuln = false;
    this.beat = false;
    this.clock = 0;
    this.channelAt = 6;
    this.bashAt = 3;
    this.channelHits = 0;
    this.hitFlash = 0;
    this.breakFlash = 0;
    this.flinchDir = 0;
    this.parryCue = 0;
    this.parryCueSeen = false;
  }
  get canBeHit() {
    return this.alive && !this.entering && !this.invuln && !this.beat;
  }
  get name() {
    return "ASMODEAN";
  }
  setState(state) {
    // Hits, helper effects and idle resets cannot shorten a channel break.
    if (this.alive && this.clock < this.staggerUntil && state !== "bound") return;
    if (this.state === 'channel' && state !== 'channel')
      this.scene.kit?.debug?.event('channel end', this.clock);
    if (this.state === 'stagger' && state !== 'stagger')
      this.scene.kit?.debug?.event('stagger end', this.clock, {
        until: this.staggerUntil,
        dur: this.staggerFor,
      });
    super.setState(state);
    if (state === "attack") {
      this.parryCue = 0;
      this.parryCueSeen = false;
    }
  }
  // Visual flashes keep moving through a helper strike. Gameplay clocks do not.
  decayFlash(dt) {
    const d = stage4Delta(dt);
    this.hitFlash = Math.max(0, (this.hitFlash || 0) - d);
    this.breakFlash = Math.max(0, (this.breakFlash || 0) - d);
    if (this.parryCue === 1 && this.parryCueSeen) this.parryCue = 2;
  }
  physics(dt) {
    if (this.staggerFrame || this.clock < this.staggerUntil) {
      this.vx = this.vy = this.vz = 0;
      return;
    }
    super.physics(dt);
  }
  update(dt) {
    this.decayFlash(dt);
    if (
      this.scene.paused ||
      this.scene.cutscene ||
      this.scene.kit?.strike ||
      this.entering
    )
      return;
    this.staggerFrame = this.clock < this.staggerUntil;
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
    if (this.clock < this.staggerUntil) {
      this.state = "stagger";
      this.vx = this.vy = this.vz = 0;
      return;
    }
    if (this.state === "stagger") {
      this.setState("idle");
      this.staggerUntil = 0;
      return;
    }
    if (this.beat) {
      if (this.st >= 0.55) {
        this.invuln = this.beat = false;
        this.setState("idle");
      }
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
        this.scene.kit?.arena.wave(this, 'asmodean.shockwave');
        this.setState("idle");
      }
      return;
    }
    const R = this.scene.riley;
    if (!R?.alive) return;
    if (this.state === "attack") {
      // A skipped window must never advertise a parry after impact.
      if (
        bashParryOpen(this) &&
        !this.parryCueSeen &&
        this.parryCue !== 2
      )
        this.parryCue = 1;
      if (!this.counterUsed && this.st >= ASMODEAN.bashTell) {
        this.counterUsed = true;
        this.parryCue = 2;
        const lane = bashLane(this);
        if (
          bashFront(this, R) &&
          R.x > lane.x && R.x < lane.x + lane.w &&
          R.y > lane.y && R.y < lane.y + lane.h &&
          (R.z || 0) < 35
        )
          bashRiley(this);
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
        Math.abs(dx) <= ASMODEAN.reach + 10 &&
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
    // Explicit casts (including debug T) can replace ordinary hit stun, but
    // a broken channel always owns its full recovery window.
    if (this.clock < this.channelStaggerUntil) return;
    this.staggerUntil = 0;
    this.setState("channel");
    this.scene.kit?.debug?.event('channel start', this.clock);
    this.channelHits = 0;
    this.counterUsed = false;
    this.channelAt = this.clock + ASMODEAN.channelEvery;
    this.scene.hud?.flashText?.(CHANNEL_BANNER);
  }
  stagger(duration = 1.4) {
    if (!this.alive || this.beat) return;
    const until = Math.max(this.staggerUntil || 0, this.clock + duration);
    const starting = this.state !== "stagger";
    this.setState("stagger");
    this.state = "stagger";
    this.staggerUntil = until;
    this.staggerFor = duration;
    this.counterUsed = true;
    this.vx = this.vy = this.vz = 0;
    if (starting)
      this.scene.kit?.debug?.event("stagger start", this.clock, { until, dur: duration });
  }
  takeHit(h = {}, from) {
    if (!this.canBeHit) return false;
    const channel = this.state === "channel";
    // Only a hit in the last instant of the tell parries the bash; mashing through it does not.
    const counter = bashParryOpen(this) && !h.assist &&
      bashFront(this, this.scene.riley);
    this.hp -= Math.max(0, h.dmg || 0);
    // Visible reaction on every landed hit, without cancelling a bash or channel.
    this.hitFlash = ASMO_FX.hitFlash;
    this.flinchDir = Math.sign(this.x - (from?.x ?? this.x + (this.facing || 1))) || 1;
    this.guard();
    if (counter && this.alive && !this.beat) this.stagger(0.8);
    if (channel && this.alive && !this.beat) {
      const thrown = h.throw || h.kind === "throw" || h.thrown || from?.state === "thrown";
      // A helper strike on a live channel is a break, not one more hit toward three.
      if (h.assist) this.channelHits = ASMODEAN.hits;
      else this.channelHits++;
      if (h.assist || this.channelHits >= ASMODEAN.hits || thrown) {
        // Every channel break grants the same full punish window.
        this.stagger(ASMODEAN.stun);
        this.channelStaggerUntil = this.staggerUntil;
        this.channelAt = Math.max(this.channelAt, this.clock + ASMODEAN.breakCooldown);
        this.breakFlash = ASMO_FX.breakFlash;
        if (this.scene.fx && !calm7())
          this.scene.fx.trauma = Math.max(this.scene.fx.trauma || 0, 0.45);
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
  // Hold the wind-up pose (bash1) for most of the tell, step to bash2 for the
  // parry window, and only show the strike pose (bash3) when the hit resolves.
  frameTime(state) {
    if (state !== "attack") return this.st;
    const t = ASMODEAN.bashTell;
    return this.st < t - ASMODEAN.parry ? 0 : this.st < t ? 1 / 8 : 2 / 8;
  }
  sync() {
    const flinch = !calm7() && this.alive && this.hitFlash > 0 &&
      (this.state === "idle" || this.state === "walk");
    const state = this.state;
    if (flinch) this.state = "hurt";
    try { super.sync(); } finally { this.state = state; }
    const sp = this.sprite;
    if (!sp) return;
    const tell = this.alive && state === "attack" && this.st < ASMODEAN.bashTell;
    const parry = bashParryOpen(this);
    const goldHold = this.alive && parry && this.parryCue === 1;
    // The tell and the parry gold stay readable; a hit during them is only a flinch.
    if (tell || goldHold) {
      const k = Math.min(1, this.st / ASMODEAN.bashTell);
      const on = calm7() || Math.floor(k * k * 12) % 2 === 0;
      sp.setTint?.((parry || goldHold) ? ASMO_FX.parry : on ? ASMO_FX.tell : 0xffffff);
      if (goldHold) this.parryCueSeen = true;
    } else if (this.alive && (this.hitFlash > 0 || this.breakFlash > 0)) {
      sp.setTintFill?.(ASMO_FX.hit);
    } else if (this.alive && state === "stagger") {
      sp.setTint?.(ASMO_FX.stagger);
    } else sp.clearTint?.();
    const dazed = this.alive && state === "stagger" && !calm7();
    sp.setAngle?.(dazed ? Math.sin(this.st * 9) * 3.5 : 0);
    if (!calm7() && (flinch || (this.alive && this.hitFlash > 0))) {
      const off = this.flinchDir * ASMO_FX.flinch * (this.hitFlash / ASMO_FX.hitFlash);
      sp.setPosition?.(this.x + off, this.y - this.z);
    }
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

// The bash goes through Riley's own hit reaction (hurt flinch, knockback, sound),
// under the same damage gates as every Stage 5-7 hazard.
export function bashRiley(boss) {
  return strikeRiley(boss.scene, ASMODEAN.bashDmg,
    { source: 'asmodean.bash', fromX: boss.x, from: boss, hit: { kb: 220 } });
}
