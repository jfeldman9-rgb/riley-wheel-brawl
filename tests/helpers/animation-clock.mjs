// Minimal clock for the shipped forward-playing animations, contract-tested
// against the pinned Phaser Animation/AnimationState methods. No rendering.
export function createFrameClock() {
  return {
    isPlaying: false, currentFrame: { index: 1 }, currentAnim: { frames: [] }, timeScale: 1, paused: false,
    pause() { if (!this.paused) { this.paused = true; this.wasPlaying = this.isPlaying; this.isPlaying = false; } },
    resume() { if (this.paused) { this.paused = false; this.isPlaying = this.wasPlaying; } },
    setCurrentFrame(frame) { this.currentFrame = frame; this.index = frame.index - 1; },
  };
}

export function startFrameClock(clock, data) {
  Object.assign(clock, { data, index: 0, elapsed: 0, nextTick: data.holds[0],
    currentAnim: { frames: data.frames.map((_, i) => ({ index: i + 1 })) }, isPlaying: true, paused: false, wasPlaying: true });
  clock.currentFrame = clock.currentAnim.frames[0];
}

export function advanceFrameClock(clock, seconds, globalTimeScale = 1) {
  if (!clock.isPlaying || clock.paused) return;
  clock.elapsed += seconds * 1000 * clock.timeScale * globalTimeScale;
  const advance = () => {
    if (clock.index === clock.data.frames.length - 1 && !clock.data.loop) { clock.isPlaying = false; return; }
    clock.index = (clock.index + 1) % clock.data.frames.length;
    clock.currentFrame = clock.currentAnim.frames[clock.index];
    clock.elapsed -= clock.nextTick;
    clock.nextTick = clock.data.holds[clock.index];
  };
  if (clock.elapsed >= clock.nextTick) {
    advance();
    // Pinned AnimationState uses strict > for subsequent skipped frames and
    // caps that additional loop at 60. The first advance uses >=.
    if (clock.isPlaying && clock.elapsed > clock.nextTick) {
      let skipped = 0;
      do { advance(); skipped++; } while (clock.isPlaying && clock.elapsed > clock.nextTick && skipped < 60);
    }
  }
}
