import { perf } from "./perf.js";
import { SLOW_AVG_MS, MAX_SAMPLE_MS } from "./quality-governor.js";
import { hook7 } from "./stage7-lifecycle.js";

// Shed bloom/particles on the shared cadence first. After that, Stage 7 allows
// 50 ms frames over ~4.8 s before sacrificing scale/backdrop lighting. The raw
// performance capture stays intact, and teardown restores the shared governor.
export function installStage7Quality(k, meter = perf) {
  hook7(k, k.s.game, "governor", (original) => function (...args) {
    if (k.s.stageNo !== 7) return original.apply(this, args);
    if (k.s.started && (k.s.paused || k.s.cutscene || k.strike)) return;
    const sample = meter.lastSampleMs;
    if (k.s.fx?.quality >= 2 && Number.isFinite(sample))
      meter.lastSampleMs = Math.min(sample, MAX_SAMPLE_MS) * SLOW_AVG_MS / 50;
    try {
      return original.apply(this, args);
    } finally {
      meter.lastSampleMs = sample;
      if (k.quality !== (k.s.fx?.quality || 0)) k.setQuality(k.s.fx?.quality || 0);
    }
  });
}
