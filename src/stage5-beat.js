// Freeze Phaser clocks as well as combat. The beat has its own scene-update clock.
export function freezeBeat(arena, scene) {
  if (!scene || arena.freezeState) return;
  arena.freezeState = { scene, timePaused: scene.time?.paused, animScale: scene.anims?.globalTimeScale, tweenScale: scene.tweens?.timeScale };
  if (scene.time) scene.time.paused = true;
  if (scene.anims) scene.anims.globalTimeScale = 0;
  if (scene.tweens) scene.tweens.timeScale = 0;
  scene.inp?.clear?.();
}
export function thawBeat(arena) {
  const f = arena?.freezeState;
  if (!f) return;
  const s = f.scene;
  if (s.time) s.time.paused = f.timePaused;
  if (s.anims) s.anims.globalTimeScale = f.animScale;
  if (s.tweens) s.tweens.timeScale = f.tweenScale;
  arena.freezeState = null;
}
// Death must not wait out the cinematic before a respawn timer can run. Leave the
// animation and tween scales frozen until thawBeat; only the scene clock resumes.
export function releaseBeatClock(arena) {
  const f = arena?.freezeState;
  if (f?.scene?.time) f.scene.time.paused = f.timePaused;
}
