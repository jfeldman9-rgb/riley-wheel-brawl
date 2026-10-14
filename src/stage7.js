import { q, clamp, VW } from "./config.js";
import { STAGE7, STAGE7_TEXTURES } from "./stage7-def.js";
import { STAGE_TEXTURES, VOLLEY_BANDS } from "./stages.js";
import { queuePowerArt } from "./powers.js";
import { MUSIC, releaseClips, preloadClips } from "./audio.js";
import { stage4Delta } from "./stage4-time.js";
import { substeps } from "./stage5-clock.js";
import { strikeRiley } from "./stage6-hurt.js";
import { createStorm } from "./stage7-storm.js";
import { createStreet } from "./stage7-street.js";
import { createNotes, reflectNote } from "./stage7-notes.js";
import { createArena7 } from "./stage7-arena.js";
import { createStage7View } from "./stage7-view.js";
import { paintStage7Art, freeStory7 } from "./stage7-paint.js";
import { queueStage7Painted, demand7, HELPERS7 } from "./stage7-load.js";
import { STREAMS, residentKeys, createPlateStream } from "./zone-stream.js";
import { createCall7, tickCall7, pickHelper, canCall } from "./moilan-call.js";
import { createCall7Video } from "./call7-cutscene.js";
import {
  installStage7Hooks,
  restoreStage7Hooks,
  call7Context,
} from "./stage7-lifecycle.js";
import { installStage7Hud, bindStage7Hud } from "./stage7-hud.js";
import { releaseStage7Phone, syncStage7Phone } from "./stage7-phone.js";
import {
  LINES,
  STAGE7_VOICES,
  VOICE_FILES,
  stage7Say,
  sfx7,
} from "./stage7-voice.js";
// Stream existing music until the commissioned 96 BPM loops arrive.
MUSIC.stage7 = { ...MUSIC.stage5, url: "assets/audio/music-stage5.mp3" };
// Stage 6 may not have executed yet in the circular stage registry.
MUSIC.boss7 = {
  url: "assets/audio/music-boss6.mp3",
  loopStart: 0.25,
  loopEnd: 72.977279,
  gain: 0.94,
};
export const STORY7_PANELS = Object.freeze(
  [1, 2, 3].map((n) => Object.freeze({ key: "story7p" + n })),
);
export const STORY7_SCRIPT = Object.freeze(
  [
    "st7_story_01",
    "st7_story_02",
    "riley_st7_story_01",
    "st7_story_03",
    "st7_story_04",
  ].map((id, i) =>
    Object.freeze({
      id,
      who: LINES[id][0],
      text: LINES[id][1],
      panel: Math.min(2, Math.floor(i / 2)),
    }),
  ),
);
const DEFERRED = new Set([
  "s7asmo",
  ...HELPERS7,
  "s7dust",
  "s7ring",
  "s7column",
  "s7shard",
]);
export function queueStage7(s) {
  queuePowerArt(s, { twix: false });
  const early = residentKeys({ zoneI: 0 }, STREAMS[7]);
  queueStage7Painted(
    s,
    STAGE7_TEXTURES.filter(
      (k) =>
        !DEFERRED.has(k) &&
        (!k.startsWith("bg7") || early.has(k)) &&
        (!k.startsWith("story7") || q.get("story") !== "0"),
    ),
  );
}
export class Stage7Kit {
  constructor(s) {
    this.s = s;
    this.quality = 0;
    this.clock = 0;
    this.accum = 0;
    this.ribbons = 0;
    this.ribbonDropped = false;
    this.call = createCall7();
    this.cleanups = [];
    this.tasks = [];
    this.cleared = new Set();
    this.stats = { calls: 0, reflects: 0, ribbon: 0 };
    this.storm = createStorm();
    this.street = createStreet();
    this.notes = createNotes();
    this.arena = createArena7();
    this.arrows = [];
    this.arrowAt = 0;
    this.bossTime = 0;
    this.outroT = 0;
    this.destroyed = false;
    this._zone = -2;
  }
  get ambient() {
    return this.s.zoneI >= 2 ? 0x859db6 : 0xd3a474;
  }
  get ambientUnlit() {
    return 0x727b8d;
  }
  freezesRiley() {
    return !!(this.strike || this.s.cutscene);
  }
  freezesWorld() {
    return this.freezesRiley();
  }
  setQuality(n) {
    this.quality = n | 0;
    if (this.view) this.view.quality = n;
    if (this.s.fx) this.s.fx.quality = n;
    if (n >= 4) this.video?.drop();
  }
  build() {
    if (typeof globalThis.Phaser !== "undefined") installStage7Hud();
    installStage7Hooks(this);
    this.s.fires = [];
    this.s.bands = VOLLEY_BANDS;
    const keep = residentKeys(this.s, STREAMS[7]);
    paintStage7Art(
      this.s,
      STAGE7_TEXTURES.filter(
        (k) =>
          !DEFERRED.has(k) &&
          (!k.startsWith("bg7") || keep.has(k)) &&
          (!k.startsWith("story7") ||
            (q.get("story") !== "0" && this.s.stageData?.story !== false)),
      ),
    );
    syncStage7Phone(this.s);
    this.cleanups.push(() => releaseStage7Phone());
    this.view = createStage7View(this.s);
    this.view.quality = this.quality;
    this.view.build();
    this.backdrops = createPlateStream(
      this.s,
      7,
      { layoutPlates: () => this.view.layout() },
      () => false,
    );
    this.backdrops.sync();
    this.video = createCall7Video(this.s);
  }
  start() {
    preloadClips(VOICE_FILES);
    this.s.music?.set("stage");
  }
  later(delay, fn) {
    this.tasks.push({ at: this.clock + delay, fn });
  }
  update(dt) {
    dt = stage4Delta(dt);
    const s = this.s;
    if (
      !dt ||
      s.paused ||
      s.cutscene ||
      this.strike ||
      this.destroyed ||
      !s.started ||
      s.gameOver
    )
      return;
    if (s.hud && !s.hud._s7bind) this.cleanups.push(bindStage7Hud(s.hud, this));
    substeps(this, dt, (d) => this.step(d));
    if (s.riley) s.riley.loialReady = canCall(this.call, call7Context(this));
    if (this.call.on && s.riley)
      s.riley.inv = Math.max(s.riley.inv || 0, 0.4);
    if (this.call.charges && s.riley?.alive) {
      if (!this.helpersRequested) {
        this.helpersRequested = true;
        demand7(this, HELPERS7);
      }
      this.video?.warm(pickHelper(call7Context(this)));
    }
    this.syncBackdrops();
    this.view?.sync(this);
    this.applyLightBudget();
  }
  syncBackdrops() {
    const zone = Math.max(0, this.s.zoneI || 0),
      pending = this.pendingArt?.size || 0;
    if (zone === this.backdropZone && pending === this.backdropPending) return;
    this.backdropZone = zone;
    this.backdropPending = pending;
    this.backdrops?.sync();
  }
  step(dt) {
    const s = this.s;
    this.clock += dt;
    for (const task of this.tasks.slice())
      if (task.at <= this.clock) {
        this.tasks.splice(this.tasks.indexOf(task), 1);
        task.fn();
      }
    if (this.outro) {
      this.outroT += dt;
      return;
    }
    if (s.zoneI !== this._zone) {
      this._zone = s.zoneI;
      this.enterZone(s.zoneI);
    }
    tickCall7(this.call, dt);
    if (s.zoneI === 1 && !this.cleared.has(1) && s.wave >= 1) this.storm.arm();
    if (s.zoneI === 0 && s.wave >= 1 && !this.portalCleared) {
      this.portalCleared = true;
      this.view?.clearZone(0);
    }
    this.storm.step(dt, s);
    this.street.step(dt, s);
    for (const e of s.enemies || []) {
      if (e.silhouette > 0) {
        e.silhouette = Math.max(0, e.silhouette - dt);
        e.sprite?.setAlpha?.(e.silhouette > 0 ? 0.4 : 1);
      }
      if (e.grabOpen > 0) e.grabOpen = Math.max(0, e.grabOpen - dt);
      if (e.alive && (e.randDown > 0 || e.daze > 0)) {
        e._s7down = true;
        if (e.state !== "down") {
          if (e.setState)
            e.setState("down", e.type === "fadelt" ? undefined : "knockdown");
          else {
            e.state = "down";
            e.st = 0;
          }
        }
        e.st = 0;
        e.randDown = Math.max(0, (e.randDown || 0) - dt);
        e.daze = Math.max(0, (e.daze || 0) - dt);
      } else if (e._s7down) {
        e._s7down = false;
        if (e.type === "fadelt") {
          e.state = "idle";
          e.st = 0;
        } else e.setState?.("approach", "walk");
      }
    }
    if (s.boss?.alive && !s.boss.entering) {
      this.bossTime += dt;
      this.notes.step(dt, s, s.boss);
      this.arena.step(dt, s, s.boss);
    }
    for (const a of this.arrows) {
      a.x += a.dir * 460 * dt;
      a.t += dt;
      const R = s.riley;
      if (
        !a.hit &&
        R?.z < 30 &&
        Math.abs(R.x - a.x) < 30 &&
        Math.abs(R.y - a.y) < 22
      ) {
        a.hit = true;
        strikeRiley(s, 7, { fromX: a.x });
      }
    }
    this.arrows = this.arrows.filter((a) => !a.hit && a.t < 4);
    // Projectile spells reflect gold notes too; consume each note once.
    for (const n of this.notes.notes)
      if (n.gold && !n.counterUsed)
        for (const f of s.fireballs || [])
          if (Math.abs(f.x - n.x) < 90 && Math.abs((f.gy ?? f.y) - n.y) < 34) {
            if (reflectNote(this.notes, n, s, s.boss, f)) break;
          }
  }
  enterZone(i) {
    if (i === 1) demand7(this, ["s7dust"]);
    if (i === 2) {
      demand7(this, ["s7ring", "s7shard"]);
      stage7Say("st7_veil_01", this.s.caption);
    }
    if (i === 3) demand7(this, ["s7asmo", "s7column", "s7note", "s7shard"]);
  }
  stormTell(st) {
    sfx7("wind");
    const brace = this.s.inp?.isTouch
      ? "HOLD STICK CENTRED TO BRACE"
      : "HOLD RUN WHILE STILL TO BRACE";
    this.s.hud?.flashText?.((st.dir > 0 ? "WIND → " : "← WIND — ") + brace);
    const id = st.gusts ? "riley_st7_storm_01" : "st7_storm_01";
    this.saidLines ||= new Set();
    if (!this.saidLines.has(id)) {
      this.saidLines.add(id);
      stage7Say(id, this.s.caption);
    }
  }
  streetTell() {
    sfx7("glass");
    if (!this.streetSaid) {
      this.streetSaid = true;
      stage7Say("riley_st7_street_01", this.s.caption);
    }
    this.s.hud?.flashText?.("THE STREET WAKES — JUMP OR MOVE");
  }
  fireArrow(e) {
    this.arrows.push({ x: e.x, y: e.y, dir: e.facing, t: 0, hit: false });
  }
  onAsmodeanPhase(b, phase) {
    this.notes.pending.length = 0;
    this.notes.next = this.notes.clock + 0.625;
    this.arena.clear();
    if (phase === 2) {
      this.arena.t = 0;
      this.arena.next = 3.2;
      this.arena.index = 0;
      this.s.spawn("dancer", "L");
      this.s.spawn("grunt", "R");
      this.later(5, () => {
        if (b === this.s.boss && b.alive && b.phase === 2 && !this.outro) {
          this.s.spawn("veiled", "R");
          this.s.spawn("dancer", "L");
        }
      });
    }
    if (phase === 3) {
      const open = (this.s.enemies || []).some(
        (e) => e !== b && e.alive && e.grabbable && e.type !== "asmodean",
      );
      if (!open && !this.outro) this.s.spawn("dancer", "L");
    }
  }
  onZoneClear(i) {
    this.cleared.add(i);
    this.view?.clearZone(i);
    if (i === 1) this.storm.clear();
    if (i === 2) {
      this.street.clear();
      this.arrows.length = 0;
      demand7(this, ["s7asmo", "s7column", "s7note", "s7shard"]);
    }
  }
  clearHazards() {
    this.storm.clear();
    this.street.clear();
    this.notes.clear();
    this.arena.clear();
    this.arrows.length = 0;
  }
  beginOutro() {
    this.outro = true;
    this.outroT = 0;
    this.tasks.length = 0;
    this.clearHazards();
    const s = this.s,
      cam = s.camX || 0;
    if (s.boss) {
      s.boss.x = Math.min(Math.max(s.boss.x, cam + 640), cam + VW - 300);
      s.boss.vx = 0;
    }
    if (s.riley) {
      s.riley.x = Math.min(Math.max(s.riley.x, cam + 220), cam + VW - 380);
      s.riley.vx = 0;
    }
    demand7(this, HELPERS7);
  }
  threats() {
    return {
      storm: this.storm,
      ring: this.street.ring,
      notes: this.notes.notes,
      bands: this.notes.tells(),
      rain: this.arena.rain,
      shock: this.arena.shock,
      arrows: this.arrows,
    };
  }
  dropRibbon() {
    if (this.ribbonDropped) return;
    this.ribbonDropped = true;
    const s = this.s,
      x = (s.riley?.x || 1800) + 30,
      y = s.riley?.y || 630;
    const g = s.add?.image?.(x, y - 30, "glow"),
      c = s.add?.image?.(x, y - 30, "s7ribbon");
    const L = s.lights?.addLight?.(x, y - 40, 100, 0xef81a2, 0.5, 20) || {};
    (s.pickups ||= []).push({ x, y, kind: "ribbon", g, c, L, t: 0 });
  }
  collectRibbon() {
    this.ribbons++;
    this.stats.ribbon++;
    this.s.riley.score += 1000;
    this.s.hud?.flashText?.("TWINKLE TOES' RIBBON!");
  }
  applyLightBudget() {
    const s = this.s;
    s.ambient = s.backdropIsLit === false ? this.ambientUnlit : this.ambient;
    if (s.lightsOn !== false) s.lights?.setAmbientColor?.(s.ambient);
  }
  koStars() {}
  telegraph() {}
  glint() {}
  hint(text) {
    this.s.hud?.flashText?.(text);
  }
  onPause() {}
  onFadelt() {}
  onFadeltDown() {}
  onCounter() {}
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.tasks.length = 0;
    this.clearHazards();
    restoreStage7Hooks(this);
    this.view?.destroy();
    for (const p of (this.s.pickups || []).slice())
      if (p.kind === "ribbon") this.s.removePickup?.(p);
    if (this.s.riley) {
      this.s.riley.loialReady = true;
      this.s.riley.fogSlow = 0;
    }
    releaseClips(STAGE7_VOICES);
  }
}
STAGE7.kit = Stage7Kit;
STAGE7.queue = queueStage7;
STAGE7.start = (s) => {
  s.kit?.start();
  if (q.get("story") === "0" || s.stageData?.story === false) {
    freeStory7(s);
    return;
  }
  const begun = s.startCutscene(STORY7_SCRIPT, STORY7_PANELS, (how) => {
    s.storyResult = how;
    s.music?.set("stage");
    freeStory7(s);
  });
  if (begun === false) freeStory7(s);
};
if (typeof globalThis.Phaser !== "undefined") installStage7Hud();
export function releaseStage7(s, to) {
  const keep = new Set(STAGE_TEXTURES[to] || []);
  for (const k of STAGE7_TEXTURES)
    if (
      s.textures?.exists?.(k) &&
      (!keep.has(k) ||
        (k === "s6fade" &&
          to === 6 &&
          s.textures.get?.(k)?.source?.[0]?.isCanvas === true))
    )
      s.textures.remove?.(k);
  if (to !== 7) releaseClips(STAGE7_VOICES);
}
queueMicrotask(() => {
  if (typeof globalThis.Phaser === "undefined") return;
  import("./stage1.js").then(({ Stage1 }) => {
    const p = Stage1?.prototype;
    if (!p || p._s7rel) return;
    const old = p.releaseStage;
    p.releaseStage = function (to) {
      const out = old.apply(this, arguments);
      if (to !== 7) releaseStage7(this, to);
      return out;
    };
    p._s7rel = true;
  });
});
