import { VW, VH, LANE_TOP, clamp } from "./config.js";
import { STREAMS, residentKeys, plateRect } from "./zone-stream.js";
import { STAGE7 } from "./stage7-def.js";
import { demand7 } from "./stage7-load.js";
import { COLUMNS } from "./stage7-arena.js";
import { bandY } from "./stage7-street.js";
import { frame7, earthFrame7 } from "./stage7-frames.js";
import { isPainted } from "./stage6-paint.js";
import { paintedScale } from "./stage7-fighter.js";
import { ASMODEAN, ASMO_FX, bashLane, bashParryOpen, calm7 } from "./asmodean.js";
const CELL = {
  s7column: [128, 448],
  s7shield: [128, 256],
  s7earth: [128, 128],
  s7note: [64, 64],
  s7moir: [184, 245],
  s7lan: [254, 236],
};
// Asmodean's painted idle is ~145px tall at 1.8x; overlays sit above his head.
const BOSS_TOP = 280;
// Small white masks, tinted by the view. TextureManager owns these across scene
// restarts: never generate a second texture under an existing key.
export const BASH_TEXTURES = Object.freeze({ lane: "s7bashFloorSoft", impact: "s7bashImpact" });
function bashTextures(s) {
  if (!s.textures?.exists?.(BASH_TEXTURES.lane)) {
    const tex = s.textures?.createCanvas?.(BASH_TEXTURES.lane, 128, 48);
    if (tex) {
      const ctx = tex.getContext(), pixels = ctx.createImageData(128, 48);
      for (let y = 0; y < 48; y++) for (let x = 0; x < 128; x++) {
        const edge = Math.min(1, (x + 0.5) / 12, (127.5 - x) / 12,
          (y + 0.5) / 8, (47.5 - y) / 8);
        const feather = Math.sin(edge * Math.PI / 2) ** 2;
        const pigment = 0.84 + 0.1 * Math.cos(y / 47 * Math.PI * 2) +
          0.06 * Math.sin(x * 0.31 + y * 0.7);
        const i = (y * 128 + x) * 4;
        pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
        pixels.data[i + 3] = Math.max(1, Math.round(255 * feather * pigment));
      }
      ctx.putImageData(pixels, 0, 0);
      tex.refresh();
    }
  }
  if (!s.textures?.exists?.(BASH_TEXTURES.impact)) {
    const tex = s.textures?.createCanvas?.(BASH_TEXTURES.impact, 128, 128);
    if (tex) {
      const ctx = tex.getContext(), glow = ctx.createRadialGradient(64, 64, 0, 64, 64, 62);
      glow.addColorStop(0, "rgba(255,255,255,1)");
      glow.addColorStop(0.2, "rgba(255,255,255,0.8)");
      glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow; ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 2;
      ctx.lineCap = "round";
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6, end = i % 2 ? 44 : 60;
        ctx.beginPath();
        ctx.moveTo(64 + Math.cos(a) * 23, 64 + Math.sin(a) * 23);
        ctx.lineTo(64 + Math.cos(a) * end, 64 + Math.sin(a) * end);
        ctx.stroke();
      }
      tex.refresh();
    }
  }
}
export function createStage7View(s) {
  bashTextures(s);
  const nodes = new Map(),
    fx = new Map();
  let portalLight = null,
    moonLight = null;
  function image(key, x, y, w, h, depth) {
    const o = s.add?.image?.(x, y, key);
    o?.setOrigin?.(0, 0);
    o?.setDisplaySize?.(w, h);
    o?.setDepth?.(depth);
    return o;
  }
  function effect(id, key, x, y, w, h, alpha = 1, depth = 1700, tint, fit) {
    let o = fx.get(id);
    if (!o) {
      o = s.add?.image?.(x, y, key);
      o?.setDepth?.(depth);
      if (o) fx.set(id, o);
    }
    // A demand-loaded effect may have been created with __MISSING. Rebind
    // after the texture arrives and recalculate sizing against its real cells.
    if (o?.texture?.key !== key && s.textures?.exists?.(key)) {
      o?.setTexture?.(key);
      if (o) { delete o._dw; delete o._dh; }
    }
    o?.setPosition?.(x, y);
    o?.setAlpha?.(alpha);
    o?.setDepth?.(depth);
    if (tint != null) o?.setTint?.(tint);
    else o?.clearTint?.();
    if (fit === "actor") {
      o?.setOrigin?.(0.5, 0.96);
      o?.setScale?.(isPainted(s, key) ? paintedScale(key) : 3);
    } else if (fit === "native") {
      const cell = CELL[key] || [w, h];
      const sc = Math.min(w / cell[0], h / cell[1]);
      const dw = cell[0] * sc,
        dh = cell[1] * sc;
      o?.setOrigin?.(0.5, 0);
      if (o && (o._dw !== dw || o._dh !== dh)) {
        o._dw = dw;
        o._dh = dh;
        o.setDisplaySize?.(dw, dh);
      }
    } else {
      o?.setOrigin?.(0, 0);
      if (o && (o._dw !== w || o._dh !== h)) {
        o._dw = w;
        o._dh = h;
        o.setDisplaySize?.(w, h);
      }
    }
    return o;
  }
  const api = {
    quality: 0,
    build() {
      api.layout();
      portalLight = s.lights?.addLight?.(290, 440, 240, 0x8fe3ff, 0.7, 40);
    },
    layout() {
      const keep = residentKeys(s, STREAMS[7]);
      demand7(s.kit, [...keep]);
      for (const [key, o] of nodes)
        if (!keep.has(key)) {
          o?.destroy?.();
          nodes.delete(key);
        }
      if (s.textures?.exists?.("bg7far") && !nodes.has("bg7far")) {
        const o = image("bg7far", 0, 0, VW, LANE_TOP, -100);
        o?.setScrollFactor?.(0);
        nodes.set("bg7far", o);
      }
      const z = STAGE7.zones;
      for (let i = 0; i < 4; i++) {
        const slot = STREAMS[7].zones[i];
        if (
          keep.has(slot.plate) &&
          s.textures?.exists?.(slot.plate) &&
          !nodes.has(slot.plate)
        ) {
          const r = plateRect(i, z, STREAMS[7].bleed);
          nodes.set(slot.plate, image(slot.plate, r.x, 180, r.w, 400, -60));
        }
      }
      for (const key of ["bg7floor", "bg7floor2", "bg7floor3"])
        if (keep.has(key) && s.textures?.exists?.(key) && !nodes.has(key)) {
          const i = key === "bg7floor" ? 0 : key === "bg7floor2" ? 2 : 3,
            l = z[i].l,
            r = i === 0 ? 2560 : i === 2 ? 3920 : 5200;
          const o = s.add?.tileSprite?.(
            l,
            LANE_TOP - 4,
            r - l + 48,
            VH - LANE_TOP + 4,
            key,
          );
          o?.setOrigin?.(0, 0);
          o?.setDepth?.(-40);
          nodes.set(key, o);
        }
    },
    sync(k) {
      const active = new Set(),
        show = (id, ...args) => {
          active.add(id);
          return effect(id, ...args);
        };
      if (s.zoneI <= 0 && s.wave < 1 && !k.cleared.has(0))
        show("portal", "s7portal", 250, 380, 100, 180, 0.65, -20);
      if (portalLight) {
        portalLight.intensity =
          s.zoneI <= 0 && s.wave < 1 && k.quality < 3 ? 0.7 : 0;
      }
      if (s.zoneI === 1 && k.storm.phase !== "idle" && (k.quality | 0) < 2) {
        const gust = k.storm.phase === "gust";
        show(
          "dust",
          "s7dust",
          s.camX || 0,
          0,
          VW,
          VH,
          gust ? 0.35 : 0.18,
          4200,
        );
      }
      if (s.zoneI <= 2 && !k.cleared.has(2))
        show(
          "veil",
          "s7veil",
          2500,
          100,
          180,
          550,
          clamp(1 - ((s.camX || 0) - 2480) / 420, 0, 0.7),
          1800,
        );
      const ring = k.street.ring;
      if (ring) {
        show(
          "ring",
          "s7ring",
          ring.x - 72,
          ring.y - 18,
          144,
          36,
          ring.phase === "tell" ? 0.8 : 1,
          950,
        );
        if (ring.phase === "strike")
          for (let i = 0; i < 3; i++)
            show(
              "shard" + i,
              "s7shard",
              ring.x - 64 + i * 42,
              ring.y - 80,
              38,
              84,
            );
      }
      for (const [i, n] of k.notes.notes.entries())
        show(
          "note" + i,
          "s7note",
          n.x,
          n.y - 65,
          48,
          48,
          1,
          1750,
          null,
          "native",
        )?.setFrame?.(n.reflected ? 4 : n.gold ? 2 + (Math.floor(n.age * 8) % 2) : Math.floor(n.age * 8) % 2);
      for (const [i, n] of k.notes.tells().entries())
        show(
          "band" + i,
          "s7streak",
          s.zone?.l || 3920,
          bandY(n.band) - 6,
          1280,
          12,
          0.55,
          960,
          n.gold ? 0xffcc44 : 0x8fe3ff,
        );
      for (const [i, a] of k.arrows.entries())
        show("arrow" + i, "s7arrow", a.x, a.y - 46, 64, 8, 1);
      for (const e of s.enemies || [])
        if (
          e.alive &&
          !e.entering &&
          ["attack", "aim"].includes(e.state) &&
          (e.type === "veiled" || e.type === "dancer" || e.type === "asmodean")
        ) {
          if (e.type === "veiled")
            show(
              "bow" + e.id,
              "s7streak",
              s.bounds.l,
              e.y - 4,
              s.bounds.r - s.bounds.l,
              8,
              0.5,
              960,
            );
          else if (e.type === "asmodean") {
            const tell = ASMODEAN.bashTell,
              k = clamp(e.st / tell, 0, 1),
              struck = e.st >= tell || e.counterUsed,
              parry = bashParryOpen(e),
              lane = bashLane(e),
              alpha = struck ? ASMO_FX.floorAlpha * clamp(1 - (e.st - tell) / ASMODEAN.bashFlash, 0, 1)
                : 0.15 + (ASMO_FX.floorAlpha - 0.15) * k,
              tint = struck || parry ? ASMO_FX.parry : ASMO_FX.tell;
            // The feathered mask has exactly the shared hit rectangle's extent.
            show("tellBase" + e.id, BASH_TEXTURES.lane, lane.x, lane.y, lane.w, lane.h, alpha, 960, tint);
            if (!struck && e.st >= tell - ASMODEAN.parry - ASMODEAN.bashReadyLead && !parry)
              show("tellReady" + e.id, BASH_TEXTURES.lane,
                lane.x, lane.y, lane.w, lane.h, 0.1, 961, ASMO_FX.tell);
            if (!struck) {
              const size = 40 + 16 * k;
              show(
                "tell" + e.id,
                "s7note",
                e.x,
                e.y - BOSS_TOP - 20 - size,
                size,
                size,
                parry ? 1 : 0.6 + 0.4 * k,
                1760,
                parry ? ASMO_FX.parry : ASMO_FX.tell,
                "native",
              );
            }
          } else
            show(
              "tell" + e.id,
              "s7note",
              e.x + e.facing * 45,
              e.y - 150,
              18,
              24,
              1,
            );
        }
      const sb = s.boss;
      if (sb?.alive && sb.bashStrikeFlash > 0 && sb.bashImpact) {
        const calm = calm7(),
          progress = 1 - sb.bashStrikeFlash / ASMODEAN.bashFlash,
          size = calm ? 86 : 110 + 35 * progress;
        show("bashImpact", BASH_TEXTURES.impact,
          sb.bashImpact.x - size / 2, sb.bashImpact.y - size / 2,
          size, size, calm ? 0.32 : 0.95, 1001 + sb.y, ASMO_FX.parry)
          ?.setBlendMode?.(calm ? "NORMAL" : "ADD");
      }
      if (sb?.alive && sb.state === "stagger" && s.textures?.exists?.("flake")) {
        // Stun stars: four glints orbiting above his head for the whole stagger.
        const calm = calm7();
        for (let i = 0; i < 4; i++) {
          const a = (calm ? 0 : (sb.st || 0) * 5) + (i * Math.PI) / 2,
            size = 22 + (calm ? 0 : 6 * Math.max(0, Math.sin(a)));
          show(
            "stun" + i,
            "flake",
            sb.x + Math.cos(a) * 58 - size / 2,
            sb.y - BOSS_TOP + Math.sin(a) * 14 - size / 2,
            size,
            size,
            0.95,
            Math.sin(a) > 0 ? 1000 + sb.y + 1 : 1000 + sb.y - 1,
            0xffe066,
          );
        }
      }
      if (s.zoneI >= 3) {
        if (!moonLight)
          moonLight = s.lights?.addLight?.(4560, 260, 700, 0xbcd8ff, 0.45, 30);
        if (moonLight) moonLight.intensity = k.quality >= 3 ? 0 : 0.45;
        COLUMNS.forEach((x, i) => {
          let alpha = 0.25;
          let glow = 0;
          if (k.arena.rain?.x === x)
            glow = k.arena.rain.phase === "tell" ? 1 : 2;
          else if (s.boss?.alive && s.boss.hp <= s.boss.maxHp * 0.1)
            glow = 1 + (Math.floor(k.clock * 8 + i) % 2);
          if (k.arena.rain?.x === x)
            alpha = k.arena.rain.phase === "tell" ? 1 : 0.6;
          if (s.boss?.alive && s.boss.hp <= s.boss.maxHp * 0.1)
            alpha *= 0.35 + 0.65 * Math.abs(Math.sin(k.clock * 18 + i));
          if (k.outro) alpha *= clamp(1 - (k.outroT - i * 0.5) / 0.5, 0, 1);
          // A timed-out/failed sheet has a single code-drawn frame. Asking it
          // for glow cells 1/2 renders a missing frame instead of the column.
          const frame = s.textures?.get?.("s7column")?.has?.(glow) === false ? 0 : glow;
          show("col" + i, "s7column", x, 230, 200, 400, alpha, -15, null, "native")?.setFrame?.(frame);
        });
        const a = k.arena.rain;
        if (a) {
          show(
            "rainBand",
            "s7streak",
            a.x - 160,
            LANE_TOP,
            320,
            16,
            a.phase === "tell" ? 0.3 : 0.6,
            940,
          );
          if (a.phase === "strike" && (k.quality | 0) < 3)
            for (let i = 0; i < 7; i++)
              show(
                "rain" + i,
                "s7shard",
                a.x - 105 + i * 30,
                420 + (i % 3) * 50,
                24,
                130,
                0.9,
              );
        }
        const shock = k.arena.shock;
        if (shock)
          show(
            "shock",
            "s7shield",
            shock.x,
            shock.y - shock.radius,
            Math.max(8, shock.radius * 4),
            Math.max(8, shock.radius * 2),
            0.8,
            980,
            null,
            "native",
          );
        const b = s.boss;
        if (b?.state === "channel") {
          show("castBack", "s7streak", b.x - 80, b.y - BOSS_TOP - 40, 160, 12, 0.3);
          show(
            "cast",
            "s7streak",
            b.x - 80,
            b.y - BOSS_TOP - 40,
            160 * clamp(b.st / ASMODEAN.channel, 0, 1),
            12,
            1,
            1750,
            0xffcc55,
          );
        }
      }
      if (k.strike) {
        const st = k.strike,
          x = (s.camX || 0) + 100;
        if (st.helper !== "lan")
          show("moi", "s7moir", x + 80, 630, 0, 0, 1, 1800, null, "actor")?.setFrame?.(
            frame7(s, "s7moir", st.t < 0.25 ? "idle" : st.t < 0.65 ? "raise" : "attack", st.t < 0.65 ? Math.max(0, st.t - 0.25) : st.t - 0.65, 4),
          );
        if (st.helper !== "moiraine")
          show(
            "lan",
            "s7lan",
            x + 180 + Math.min(st.t / 0.45, 1) * 420,
            630,
            0,
            0,
            1,
            1800,
            null,
            "actor",
          )?.setFrame?.(
            frame7(s, "s7lan", st.t < 0.3 ? "run" : st.t < 0.45 ? "draw" : "attack", st.t < 0.45 ? st.t : st.t - 0.45, 3),
          );
        for (const [i, e] of st.targets.entries()) {
          const fxKey =
            st.helper === "moiraine"
              ? "s7earth"
              : st.helper === "duo"
                ? "s7shield"
                : "s7streak";
          const wide = fxKey === "s7streak",
            tall = fxKey === "s7shield" && e.type === "asmodean",
            top = tall ? BOSS_TOP + 30 : 150;
          show(
            "callfx" + i,
            fxKey,
            wide ? e.x - 80 : e.x,
            e.y - (wide ? 80 : top),
            wide ? 160 : fxKey === "s7shield" ? (tall ? 180 : 140) : 150,
            wide ? 16 : fxKey === "s7shield" ? (tall ? 360 : 280) : 150,
            0.85,
            1800,
            null,
            wide ? undefined : "native",
          )?.setFrame?.(st.helper === "moiraine" ? earthFrame7(s, st.t, st.duration) : 0);
        }
      }
      if (k.outro && s.boss) {
        const b = s.boss,
          cam = s.camX || 0;
        show("bound", "s7shield", Math.min(b.x, cam + VW - 280), b.y - BOSS_TOP - 30, 160, 320, 0.8, 1700, null, "native");
        show("lanEnd", "s7lan", cam + 460, b.y, 0, 0, 1, 1800, null, "actor")?.setFrame?.(
          frame7(s, "s7lan", "point", 0, 3),
        );
        show("moiEnd", "s7moir", cam + 250, b.y, 0, 0, 1, 1800, null, "actor")?.setFrame?.(
          frame7(s, "s7moir", "idle", 0, 4),
        );
      }
      for (const [id, o] of fx)
        if (!active.has(id)) {
          o?.destroy?.();
          fx.delete(id);
        }
    },
    clearZone(i) {
      for (const [id, key] of [
        ["portal", "s7portal"],
        ["dust", "s7dust"],
      ])
        if ((i === 0 && id === "portal") || (i === 1 && id === "dust")) {
          fx.get(id)?.destroy?.();
          fx.delete(id);
          if (s.textures?.exists?.(key)) s.textures.remove?.(key);
        }
      if (i === 0 && portalLight) {
        s.lights?.removeLight?.(portalLight);
        portalLight = null;
      }
    },
    destroy() {
      for (const o of [...nodes.values(), ...fx.values()]) o?.destroy?.();
      nodes.clear();
      fx.clear();
      if (portalLight) s.lights?.removeLight?.(portalLight);
      if (moonLight) s.lights?.removeLight?.(moonLight);
      portalLight = moonLight = null;
    },
  };
  return api;
}
