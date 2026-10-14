import { q } from "./config.js";

export function installDebug7(k) {
  if (q.get("s7debug") !== "1") return;
  const s = k.s;
  let debugTrolloc = null;
  const fmt = (n) => (Number.isFinite(+n) ? +n : 0).toFixed(3);
  const event = (name, time, extra) => {
    const until = extra && extra.until != null ? extra.until : k.damageUntil;
    const parts = [
      `[s7dbg] ${name} t=${fmt(time)}`,
      `combat=${fmt(k.combatClock)}`,
      `until=${fmt(until)}`,
    ];
    if (extra && extra.dur != null) parts.push(`dur=${fmt(extra.dur)}`);
    if (extra && extra.until != null) parts.push(`dmgUntil=${fmt(k.damageUntil)}`);
    console.log(parts.join(" "));
  };
  const watchHp = () => {
    const r = s.riley;
    const descriptor = Object.getOwnPropertyDescriptor(r, 'hp');
    let hp = r.hp;
    Object.defineProperty(r, 'hp', {
      configurable: true, enumerable: true,
      get: () => hp,
      set(value) {
        if (value !== hp) {
          // Covers even a future direct HP writer outside strikeRiley/takeHit.
          const source = k.damageSource || 'direct';
          console.log(`[s7dbg] dmg src=${source} amt=${hp - value} hp=${value} t=${fmt(k.combatClock)} until=${fmt(k.damageUntil)}`);
        }
        hp = value;
      },
    });
    k.cleanups.push(() => Object.defineProperty(r, 'hp', { ...descriptor, value: hp }));
  };
  const jumpBossIntro = () => {
    if (k.destroyed || !s.started || s.ended || s.gameOver ||
        k.strike || !s.riley?.alive || s.boss || k.debugBossPending) return false;
    if (s.cutscene) s.cutscene.skip();
    if (s.paused) return false;
    k.debugBossPending = true;
    s.riley.grabbedBy?.releaseHold?.('break');
    s.riley.held?.release?.();
    s.riley.held = null;
    for (const enemy of s.enemies) enemy.destroy?.();
    s.enemies = []; s.pending = []; k.tasks.length = 0;
    k.clearHazards();
    s.zoneI = k._zone = 3; s.zone = s.zones[3]; s.locked = true;
    s.camX = s.camMax = s.zone.l;
    s.bounds = { l: s.zone.l, r: s.zone.r };
    Object.assign(s.riley, { x: 4680, y: 630, z: 0, vz: 0, vx: 0, vy: 0 });
    s.riley.setState('idle', 'idle');
    delete s.inp.buf.power; delete s.inp.held.power; s.inp.keysDown?.delete('KeyB');
    // Keep the loader, spawn timer, arrival and intro voice on the real path.
    s.startBoss();
    return true;
  };
  const forceChannel = () => {
    const b = s.boss, r = s.riley;
    if (k.destroyed || !s.started || s.paused || s.cutscene || s.ended ||
        s.gameOver || k.strike || !b?.alive || !r?.alive) return false;
    r.held?.release?.();
    r.held = null;
    r.grabbedBy?.releaseHold?.("break");
    k.clearHazards();
    b.phase = 3;
    b.hp = 150;
    b.beat = b.invuln = false;
    b.x = s.bounds.l + 300;
    b.vx = b.vy = b.z = b.vz = 0;
    b.startChannel();
    r.x = b.x + 280;
    r.y = b.y;
    r.z = r.vz = r.vx = 0;
    r.facing = 1;
    r.setState("idle", "idle");
    const trolloc = debugTrolloc?.alive ? debugTrolloc : s.spawn("grunt", "R");
    debugTrolloc = trolloc;
    trolloc.x = r.x + 92;
    trolloc.y = r.y;
    trolloc.z = trolloc.vz = trolloc.vx = 0;
    trolloc.entering = false;
    trolloc.setState("hurt", "hurt");
    trolloc.cool = trolloc.grabOpen = 5;
    s.inp.clear();
    return trolloc;
  };
  k.debug = { forceChannel, jumpBossIntro, event, watchHp };
  const off = s.inp?.on?.("key", (code) => {
    if (code === "KeyT") forceChannel();
    if (code === "KeyB") jumpBossIntro();
    if (code === "KeyY" && forceChannel())
      for (let i = 0; i < 3; i++) s.boss?.takeHit?.({ dmg: 1 }, s.riley);
  });
  k.cleanups.push(() => { off?.(); delete k.debug; });
}
