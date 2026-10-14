import { VW, VH, LANE_TOP, clamp } from "./config.js";
import { STREAMS, residentKeys, plateRect } from "./zone-stream.js";
import { STAGE7 } from "./stage7-def.js";
import { demand7 } from "./stage7-load.js";
import { COLUMNS } from "./stage7-arena.js";
import { bandY } from "./stage7-street.js";
export function createStage7View(s) {
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
  function effect(id, key, x, y, w, h, alpha = 1, depth = 1700, tint) {
    let o = fx.get(id);
    if (!o) {
      o = image(key, x, y, w, h, depth);
      if (o) fx.set(id, o);
    }
    o?.setPosition?.(x, y);
    o?.setDisplaySize?.(w, h);
    o?.setAlpha?.(alpha);
    if (tint) o?.setTint?.(tint);
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
      if (s.zoneI === 1 && k.storm.phase !== "idle") {
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
          n.x - 20,
          n.y - 65,
          40,
          40,
          1,
          1750,
          n.gold ? 0xffcc44 : 0x8fe3ff,
        );
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
          else
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
      if (s.zoneI >= 3) {
        if (!moonLight)
          moonLight = s.lights?.addLight?.(4560, 260, 700, 0xbcd8ff, 0.45, 30);
        if (moonLight) moonLight.intensity = k.quality >= 3 ? 0 : 0.45;
        COLUMNS.forEach((x, i) => {
          let alpha = 0.25;
          if (k.arena.rain?.x === x)
            alpha = k.arena.rain.phase === "tell" ? 1 : 0.6;
          if (s.boss?.alive && s.boss.hp <= s.boss.maxHp * 0.1)
            alpha *= 0.35 + 0.65 * Math.abs(Math.sin(k.clock * 18 + i));
          if (k.outro) alpha *= clamp(1 - (k.outroT - i * 0.5) / 0.5, 0, 1);
          show("col" + i, "s7column", x - 32, 230, 64, 345, alpha, -15);
        });
        const a = k.arena.rain;
        if (a) {
          show(
            "rainBand",
            "s7shield",
            a.x - 110,
            LANE_TOP,
            220,
            120,
            a.phase === "tell" ? 0.3 : 0.6,
            940,
          );
          if (a.phase === "strike")
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
            shock.x - shock.radius,
            shock.y - shock.radius,
            shock.radius * 2,
            shock.radius * 2,
            0.8,
            980,
          );
        const b = s.boss;
        if (b?.state === "channel") {
          show("castBack", "s7streak", b.x - 80, b.y - 230, 160, 12, 0.3);
          show(
            "cast",
            "s7streak",
            b.x - 80,
            b.y - 230,
            160 * clamp(b.st / 1.8, 0, 1),
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
          show("moi", "s7moir", x, 390, 192, 192, 1, 1800)?.setFrame?.(4);
        if (st.helper !== "moiraine")
          show(
            "lan",
            "s7lan",
            x + 100 + Math.min(st.t / 0.45, 1) * 500,
            410,
            192,
            192,
            1,
            1800,
          )?.setFrame?.(3);
        for (const [i, e] of st.targets.entries())
          show(
            "callfx" + i,
            st.helper === "moiraine"
              ? "s7earth"
              : st.helper === "duo"
                ? "s7shield"
                : "s7streak",
            e.x - 90,
            e.y - 100,
            180,
            100,
            0.85,
            1800,
          );
      }
      if (k.outro && s.boss) {
        const b = s.boss;
        show("bound", "s7shield", b.x - 75, b.y - 160, 150, 160, 0.8);
        show("lanEnd", "s7lan", b.x - 220, b.y - 185, 192, 192, 1)?.setFrame?.(
          3,
        );
        show("moiEnd", "s7moir", b.x - 380, b.y - 185, 192, 192, 1)?.setFrame?.(
          4,
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
