import { clamp, rand } from "./config.js";
export const STORM = Object.freeze({
  cycle: 14,
  delay: 2,
  tell: 2.5,
  gust: 4,
  push: 70,
  silhouette: 0.6,
});
export function createStorm() {
  return {
    phase: "idle",
    t: 0,
    armed: false,
    dir: rand(0, 1) < 0.5 ? -1 : 1,
    gusts: 0,
    arm() {
      if (!this.armed) {
        this.armed = true;
        this.t = STORM.delay;
      }
    },
    step(dt, s) {
      if (
        !(dt > 0) ||
        s.paused ||
        s.cutscene ||
        s.kit?.strike ||
        s.zoneI !== 1 ||
        !this.armed
      )
        return;
      if (this.phase === "gust") {
        const b = s.zone || s.bounds;
        for (const e of [s.riley, ...(s.enemies || [])])
          if (e?.alive && !e.entering) {
            const inp = s.inp;
            const touchBrace =
              inp?.isTouch &&
              Object.prototype.hasOwnProperty.call(
                inp.touchAxis || {},
                "run",
              ) &&
              !inp.x &&
              !inp.y;
            const block =
              e === s.riley &&
              (touchBrace ||
                e.state === "block" ||
                inp?.held?.block ||
                inp?.demo?.block ||
                (inp?.run && !inp?.x && !inp?.y));
            e.x = clamp(
              e.x + this.dir * STORM.push * dt * (block ? 0.5 : 1),
              b.l + 40,
              b.r - 40,
            );
          }
      }
      this.t -= dt;
      if (this.t > 0) return;
      if (this.phase === "idle") {
        this.phase = "tell";
        this.t = STORM.tell;
        s.kit?.stormTell?.(this);
      } else if (this.phase === "tell") {
        if (
          s.riley?.grabbedBy ||
          s.riley?.state === "grabbed" ||
          s.kit?.call?.on
        ) {
          this.t = 0;
          return;
        }
        this.phase = "gust";
        this.t = STORM.gust;
        this.gusts++;
      } else {
        this.phase = "idle";
        this.t = STORM.cycle - STORM.tell - STORM.gust;
        this.dir *= -1;
      }
    },
    clear() {
      this.phase = "idle";
      this.armed = false;
      this.t = 0;
    },
  };
}
