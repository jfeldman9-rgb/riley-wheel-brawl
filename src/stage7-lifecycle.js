import { stage4Delta } from "./stage4-time.js";
import { freezeStrike, thawStrike } from "./stage7-freeze.js";
import {
  eligibleTargets,
  helperContext,
  pickHelper,
  takeCall,
  callEffect,
  allocateStrikes,
  noteRileyKo,
  CALL7,
} from "./moilan-call.js";
import { stage7Say, sfx7 } from "./stage7-voice.js";
import { demand7, HELPERS7 } from "./stage7-load.js";
import { linkTrollocs } from "./fadelt.js";
import { reflectNote } from "./stage7-notes.js";
import { syncStage7Phone } from "./stage7-phone.js";
import { guardLoop7 } from "./stage7-audio.js";
import { installDebug7 } from "./stage7-debug.js";
import { stopSceneAudio } from "./audio.js";
import { consumePress, pressConsumed, freshKeyboardPress } from "./press-ownership.js";
export function hook7(kit, object, key, wrap) {
  const original = object?.[key];
  if (typeof original !== "function") return;
  const own = Object.prototype.hasOwnProperty.call(object, key),
    replacement = wrap(original);
  object[key] = replacement;
  kit.cleanups.push(() => {
    if (object[key] !== replacement) return;
    if (own) object[key] = original;
    else delete object[key];
  });
}
export function call7Context(k) {
  const s = k.s,
    b = s.boss,
    list = eligibleTargets(s.enemies, s.camX || 0);
  const context = { ...helperContext(list, s.zoneI === 3), helper: k.helperChoice };
  return {
    ...context,
    paused: !!s.paused,
    cutscene: !!s.cutscene,
    victory: !!(s.victoryPending || s.ended || s.gameOver),
    dead: s.riley?.alive === false,
    strike: !!k.strike,
    balefire: !!s.beam,
    hittable:
      allocateStrikes(list, pickHelper(context), s.riley?.y || 0).length > 0,
    bossInvuln: !!(b?.alive && b.invuln),
    bossBeat: !!(b?.alive && b.beat),
    bossPhase: b?.alive ? b.phase : 0,
  };
}
export function releaseHolds7(s) {
  s.riley?.grabbedBy?.releaseHold?.("break");
  for (const e of s.enemies || []) e.releaseHold?.("break");
}
export function callMoilan(k) {
  const s = k.s;
  if (!s.started) return false;
  const spent = takeCall(k.call, call7Context(k));
  if (!spent.ok) return false;
  releaseHolds7(s);
  const helper = spent.helper;
  stage7Say(
    "riley_st7_call_0" + (helper === "moiraine" ? 1 : helper === "lan" ? 2 : 3),
    s.caption,
  );
  // Cover the load gap. Enemy melee checks Riley's i-frames, not the later strike flag.
  if (s.riley) s.riley.inv = Math.max(s.riley.inv || 0, CALL7.inv);
  const list = eligibleTargets(s.enemies, s.camX || 0);
  const request = (k.callRequest = (k.callRequest || 0) + 1);
  demand7(k, HELPERS7, () => {
    if (
      request !== k.callRequest ||
      !k.call.on ||
      !s.riley.alive ||
      s.gameOver ||
      s.ended
    )
      return;
    k.strike = {
      helper,
      t: 0,
      duration: helper === "moiraine" ? 1.6 : helper === "lan" ? 0.9 : 1.8,
      targets: allocateStrikes(list, helper, s.riley.y),
      resolved: false,
    };
    freezeStrike(k);
    syncStage7Phone(s);
    k.video?.play(helper);
    k.stats.calls++;
  });
  return true;
}
export function endStrike7(k, grant = true) {
  if (!k.strike) return;
  k.video?.abort?.();
  if (grant && k.s.riley)
    k.s.riley.inv = Math.max(k.s.riley.inv || 0, CALL7.inv);
  k.call.on = false;
  k.strike = null;
  syncStage7Phone(k.s);
  thawStrike(k);
  k.view?.sync(k);
}
export function stepStrike7(k, dt) {
  const st = k.strike;
  if (!st) return;
  st.t += dt;
  if (!st.resolved && st.t >= (st.helper === "lan" ? 0.45 : 0.65)) {
    st.resolved = true;
    const live = allocateStrikes(
      eligibleTargets(k.s.enemies, k.s.camX || 0),
      st.helper,
      k.s.riley?.y || 0,
    );
    if (live.length) st.targets = live;
    if (st.helper === "duo") {
      k.notes.clear();
      k.arena.clear();
      k.arrows.length = 0;
      // Moiraine clears the Shadowspawn adds; Lan puts the Shaido down while
      // the existing duo effect still respects Asmodean's phase gates.
      for (const e of allocateStrikes(
        eligibleTargets(k.s.enemies, k.s.camX || 0), "moiraine", k.s.riley?.y || 0,
      ))
        if (e.type !== "asmodean")
          callEffect(e, e.type === "dancer" || e.type === "veiled" ? "lan" : "moiraine");
    }
    for (const e of st.targets) callEffect(e, st.helper);
    sfx7(
      st.helper === "moiraine"
        ? "earth"
        : st.helper === "lan"
          ? "slash"
          : "shield",
    );
    if (!k.video?.active)
      stage7Say(
        st.helper === "duo"
          ? "st7_duo_call_01"
          : st.helper === "lan"
            ? "st7_lan_call_0" + (1 + (k.call.calls % 2))
            : "st7_moi_call_0" + (1 + (k.call.calls % 2)),
        k.s.caption,
        false,
      );
  }
  k.view?.sync(k);
  if (st.t >= st.duration) endStrike7(k);
}
function silhouette(e) {
  e.silhouette = 0.6;
  let p = e,
    desc;
  while (p && !desc) {
    desc = Object.getOwnPropertyDescriptor(p, "canBeHit");
    p = Object.getPrototypeOf(p);
  }
  const getter = desc?.get,
    value = desc?.value;
  Object.defineProperty(e, "canBeHit", {
    configurable: true,
    get() {
      return (
        !(this.silhouette > 0) && (getter ? getter.call(this) : value !== false)
      );
    },
  });
  const update = e.update;
  e.update = function (dt) {
    if (this._s7arrival && !this.entering) {
      this._s7arrival = false;
      this.silhouette = 0.6;
    }
    if (this.silhouette > 0 || this.randDown > 0 || this.daze > 0) return;
    return update.call(this, dt);
  };
}
export function installStage7Hooks(k) {
  const s = k.s;
  hook7(k, s.music, "backend", (original) => function (id, options) {
    guardLoop7(id);
    return original.call(this, id, options);
  });
  const keyOff = s.inp?.on?.("key", (code) => {
    if (code === "KeyO") cycleHelper7(k);
  });
  if (keyOff) k.cleanups.push(keyOff);
  installDebug7(k);
  hook7(
    k,
    s,
    "spawn",
    (original) =>
      function (type, side) {
        const e = original.call(this, type, side);
        for (const fade of this.enemies || [])
          if (fade.alive && fade.type === "fadelt")
            linkTrollocs(fade, this.enemies);
        if (e && side === "T") {
          e.x = Math.min(
            this.bounds.r - 90,
            Math.max(this.bounds.l + 90, this.riley.x + 200),
          );
          e.z = 200;
          e.vz = 0;
          e.entering = false;
        }
        if (e) {
          silhouette(e);
          e.silhouette = 0;
          if (!e._s7grab && typeof e.takeHit === "function") {
            e._s7grab = true;
            const take = e.takeHit;
            e.takeHit = function (h, from) {
              const ok = take.call(this, h, from);
              if (ok && this.alive !== false && this.type !== "asmodean")
                this.grabOpen = Math.max(this.grabOpen || 0, 1.05);
              return ok;
            };
          }
          if (k.storm.phase === "gust") {
            if (e.entering) e._s7arrival = true;
            else e.silhouette = 0.6;
          }
        }
        return e;
      },
  );
  hook7(k, s, "callLoial", () => () => callMoilan(k));
  hook7(
    k,
    s,
    "startBoss",
    (original) =>
      function () {
        demand7(k, ["s7asmo", "s7column", "s7note", "s7shard"], () => {
          if (!k.destroyed && !this.gameOver && !this.ended)
            original.call(this);
        });
      },
  );
  hook7(
    k,
    s,
    "onEnemyDie",
    (original) =>
      function (e) {
        if (e && !e.assistKill && !e.T?.boss) noteRileyKo(k.call);
        return original.call(this, e);
      },
  );
  // Wider than Stages 1–6, and open for a moment after a hit so a jab-then-walk connects.
  hook7(k, s, "grabCandidate", (original) => function (R) {
    let best = null,
      bestDx = 1e9;
    for (const e of this.enemies || []) {
      if (!e?.grabbable || (e.z || 0) > 0) continue;
      if (e.type === "asmodean" || e.T?.boss) continue;
      const dy = Math.abs(e.y - R.y);
      const dx = (e.x - R.x) * (R.facing || 1);
      if (!(dy < 36 && dx > 20 && dx < 168)) continue;
      const open =
        e.state === "hurt" ||
        e.state === "stagger" ||
        (e.cool || 0) > 0.2 ||
        (e.grabOpen || 0) > 0;
      if (!open) continue;
      if (dx < bestDx) {
        best = e;
        bestDx = dx;
      }
    }
    return best || original.call(this, R);
  });
  // One gesture can hit both the II button and the story SKIP. The second pause/start
  // would skip and then toggle manual pause, or resume and immediately pause again.
  hook7(k, s, "onPress", (original) => function (action) {
    if (pressConsumed(this.inp, action)) return;
    const bossCaption = this.hud?.capWho
      ? this.hud.capT > 0 && this.hud.capWho.text === "ASMODEAN"
      : k.bossCaptionUntil > k.clock;
    if (action === "pause" && !this.cutscene && !this.paused &&
        bossCaption) {
      consumePress(this.inp, action);
      k.echo = performance.now();
      k.bossCaptionUntil = 0;
      if (this.hud) {
        this.hud.capT = 0;
        this.hud.pendingCap = null;
        for (const node of [this.hud.capWho, this.hud.capText, this.hud.capBg])
          node?.setAlpha?.(0);
      }
      stopSceneAudio();
      this.inp?.clear?.();
      return;
    }
    const now = performance.now();
    const key = action === "pause" || action === "start";
    if (key && !freshKeyboardPress(this.inp) && k.echo && now - k.echo < 350) {
      this.inp?.clear?.();
      return;
    }
    const cut = !!this.cutscene;
    const manual = !!this.pauseReasons?.has?.("manual");
    const out = original.call(this, action);
    if (
      key &&
      (cut ||
        manual ||
        this.cutscene ||
        this.pauseReasons?.has?.("manual"))
    )
      k.echo = now;
    return out;
  });
  hook7(
    k,
    s,
    "update",
    (original) =>
      function (time, delta) {
        if (k.flushInp) {
          k.flushInp = 0;
          this.inp?.flushPresses?.();
        }
        if (!k.strike) {
          const out = original.call(this, time, delta);
          if (
            this.inp?.isTouch &&
            this.locked &&
            this.zone &&
            this.riley &&
            this.started &&
            !this.cutscene &&
            !this.gameOver &&
            !this.ended &&
            !k.outro
          ) {
            const limit = this.zone.r - 300;
            if (this.riley.x > limit) this.riley.x = limit;
          }
          return out;
        }
        if (
          this.paused ||
          this.cutscene ||
          !Number.isFinite(delta) ||
          delta <= 0
        )
          return;
        stepStrike7(k, stage4Delta(Math.min(delta, 50) / 1000));
        this.riley?.sync?.();
        for (const e of this.enemies || []) e.sync?.();
      },
  );
  hook7(
    k,
    s,
    "rileyDied",
    (original) =>
      function () {
        const R = this.riley;
        if (R && R.alive === false && R.state !== "down" && R.state !== "dead") {
          R.vx = 0;
          R.vz = 0;
          if (R.setState) R.setState("down", "knockdown");
          else R.state = "down";
        }
        k.video?.abort();
        endStrike7(k, false);
        k.call.on = false;
        releaseHolds7(this);
        k.notes.clear();
        k.arena.clear();
        k.street.clear();
        k.arrows.length = 0;
        return original.call(this);
      },
  );
  hook7(
    k,
    s,
    "continueGame",
    (original) =>
      function () {
        k.video?.abort();
        endStrike7(k, false);
        k.call.on = false;
        releaseHolds7(this);
        return original.call(this);
      },
  );
  // Any player attack (including a projectile/throw) can return a nearby gold note.
  hook7(
    k,
    s,
    "resolveAttack",
    (original) =>
      function (att, a) {
        if (att === this.riley)
          for (const n of k.notes.notes)
            if (Math.abs(n.x - att.x) < 90 && Math.abs(n.y - att.y) < 34)
              reflectNote(k.notes, n, this, this.boss, att);
        return original.call(this, att, a);
      },
  );
}
export function cycleHelper7(k) {
  const s = k.s;
  if (!s.started || s.paused || s.cutscene || s.gameOver || s.ended ||
      k.outro || k.strike || k.call.on) return false;
  const choices = [undefined, "moiraine", "lan"];
  k.helperChoice = choices[(choices.indexOf(k.helperChoice) + 1) % choices.length];
  s.hud?.flashText?.("CALL: " + (k.helperChoice?.toUpperCase() || "AUTO") + " — O / TAP PORTRAIT TO CHANGE");
  return true;
}
export function installBossCaption7(k) {
  if (k.captionBound) return;
  k.captionBound = true;
  // Stage1 creates its caption callback after kit.build, before kit.start.
  hook7(k, k.s, "caption", (original) => function (who, text) {
    k.bossCaptionUntil = who === "ASMODEAN"
      ? k.clock + Math.max(2.2, text.length * 0.065) : 0;
    return original.call(this, who, text);
  });
  hook7(k, k.s.riley, "sync", (original) => function () {
    const out = original.apply(this, arguments);
    if (k.outro) {
      // Existing atlas pivot is viewed from behind; idle shows Riley's face.
      this.sprite?.anims?.stop?.();
      this.sprite?.setTexture?.("riley-0", "riley_combo3_01");
      this.sprite?.setAlpha?.(1);
    }
    return out;
  });
}
export function restoreStage7Hooks(k) {
  releaseHolds7(k.s);
  k.video?.destroy();
  endStrike7(k, false);
  k.call.on = false;
  for (const f of k.cleanups.splice(0).reverse()) f();
}
