import { q } from "./config.js";

export function installDebug7(k) {
  if (q.get("s7debug") !== "1") return;
  const s = k.s;
  let debugTrolloc = null;
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
  k.debug = { forceChannel };
  const off = s.inp?.on?.("key", (code) => {
    if (code === "KeyT") forceChannel();
  });
  k.cleanups.push(() => { off?.(); delete k.debug; });
}
