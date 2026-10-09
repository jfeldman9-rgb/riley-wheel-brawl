// Rand's strike advances on the scene update while Phaser-owned clocks stay still.
export function freezeStrike(kit) {
  if (kit.freezeState) return;
  const s = kit.s;
  kit.freezeState = { timePaused: s.time?.paused, animScale: s.anims?.globalTimeScale, tweenScale: s.tweens?.timeScale };
  if (s.time) s.time.paused = true;
  if (s.anims) s.anims.globalTimeScale = 0;
  if (s.tweens) s.tweens.timeScale = 0;
  s.inp?.flushPresses?.();
}
export function thawStrike(kit) {
  const f = kit.freezeState, s = kit.s;
  if (!f) return;
  if (s.time) s.time.paused = f.timePaused;
  if (s.anims) s.anims.globalTimeScale = f.animScale;
  if (s.tweens) s.tweens.timeScale = f.tweenScale;
  kit.freezeState = null;
  s.inp?.flushPresses?.();
  kit.flushInp = 1;
}
