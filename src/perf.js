// Active Stage1 frame cadence, measured with performance.now(), never Phaser's smoothed delta.
// This is not GPU execution time. Explicit lifecycle boundaries exclude background/pause gaps;
// every positive active interval, including a multi-second stall, remains eligible for sampling.
export const FRAME_BUDGET_MS = 16.7;
export const SLOW_FRAME_MS = 33.4;
export const SAMPLE_LIMITS = Object.freeze({ all: 1800, fight: 7200, history: 256 });

// Preserve the original conservative rank: min(N-1, floor(N * percentile)).
// In particular, p95 uses sample 96 of 100. Keep full precision for the strict gate and JSON.
export function frameStats(values) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const recent = values.slice(-120), recentSum = recent.reduce((a, b) => a + b, 0);
  const percentile = p => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  const over33_4 = values.filter(v => v > SLOW_FRAME_MS).length;
  return {
    fps: 1000 * recent.length / recentSum, avgFps: 1000 * values.length / sum,
    p50: percentile(0.5), p95: percentile(0.95), p99: percentile(0.99),
    max: sorted[sorted.length - 1], durationMs: sum, frames: values.length,
    over33_4, over33: over33_4, // Legacy alias; the threshold has always been >33.4 ms.
    over20: values.filter(v => v > 20).length,
  };
}

export function fightGate(stats) {
  return {
    status: !stats ? 'NO_SAMPLES' : stats.p95 <= FRAME_BUDGET_MS ? 'PASS' : 'FAIL',
    metric: 'fight.p95', comparator: '<=', thresholdMs: FRAME_BUDGET_MS,
    measuredMs: stats ? stats.p95 : null, frames: stats ? stats.frames : 0,
  };
}

// Round upward for display so 16.70001 can never appear to meet the 16.7 ms gate.
// JSON and gate comparisons use the original unrounded values.
export function displayMs(value) {
  return Number.isFinite(value) ? (Math.ceil(value * 1000) / 1000).toFixed(3) : '—';
}

export function deviceMetadata(root = globalThis) {
  const game = root.__game, doc = root.document, nav = root.navigator;
  const path = root.location?.pathname || '';
  const immutableCommit = path.match(/(?:^|\/)([a-f\d]{40})(?:\/|$)/i)?.[1] || null;
  const flags = {};
  const query = new URLSearchParams(root.location?.search || '');
  for (const key of ['demo', 'autostart', 'god', 'skip', 'bloom', 'lit', 'rs', 'ml', 'q', 'hud', 'vig', 'debug']) {
    if (query.has(key)) flags[key] = query.get(key);
  }
  return {
    build: { label: doc?.querySelector('meta[name="rwb-build"]')?.content || 'stage1-unidentified', commit: immutableCommit,
      url: root.location ? `${root.location.origin || ''}${path}${Object.keys(flags).length ? '?' + new URLSearchParams(flags) : ''}` : null },
    renderer: root.__perf?.renderer || null, softwareRenderer: root.__perf?.software ?? null,
    quality: root.__perf?.quality ?? 0, renderScale: game?.rs ?? null, dpr: root.devicePixelRatio || 1,
    viewport: { width: root.innerWidth ?? null, height: root.innerHeight ?? null,
      visualWidth: root.visualViewport?.width ?? null, visualHeight: root.visualViewport?.height ?? null },
    canvas: { width: game?.canvas?.width ?? null, height: game?.canvas?.height ?? null },
    device: { userAgent: nav?.userAgent || null, platform: nav?.platform || null,
      maxTouchPoints: nav?.maxTouchPoints ?? null, screenWidth: root.screen?.width ?? null, screenHeight: root.screen?.height ?? null },
    flags,
  };
}

export function createPerf({ now = () => globalThis.performance.now(), dateNow = () => new Date().toISOString(), metadata = () => deviceMetadata() } = {}) {
  const suspended = new Map();
  let baselineFight = false, baselineContext = {}, segmentKey = null;
  const meter = {
    last: null, lastSampleMs: null, all: [], fightFrames: [], inFight: false,
    summary: null, fight: null, context: {}, history: [], excluded: {},
    totalFrames: 0, totalFightFrames: 0, droppedHistorySegments: 0, captureMetadata: null,
    startedAt: dateNow(), startedAtMs: now(),
    stats: frameStats,
    setSuspended(reason, value) {
      const isSuspended = suspended.has(reason);
      if (!!value === isSuspended) return;
      const at = now();
      const record = this.excluded[reason] ||= { boundaries: 0, durationMs: 0 };
      record.boundaries++;
      if (value) suspended.set(reason, at);
      else { record.durationMs += Math.max(0, at - suspended.get(reason)); suspended.delete(reason); }
      this.last = null; this.lastSampleMs = null;
    },
    get suspended() { return [...suspended.keys()]; },
    tick(at, options = {}) {
      const active = options.active ?? true;
      const inFight = !!(options.inFight ?? this.inFight);
      const context = options.context ?? this.context;
      this.inFight = inFight; this.context = { ...context }; this.lastSampleMs = null;
      if (!Number.isFinite(at) || !active || suspended.size) { this.last = null; return null; }
      if (this.last !== null) {
        const delta = at - this.last;
        if (delta > 0 && Number.isFinite(delta)) {
          const currentMetadata = metadata();
          this.captureMetadata ||= currentMetadata;
          const sampleContext = { ...baselineContext, inFight: baselineFight };
          const key = JSON.stringify([sampleContext, currentMetadata]);
          if (key !== segmentKey) {
            this.history.push({ firstFrame: this.totalFrames + 1, offsetMs: Math.max(0, this.last - this.startedAtMs),
              context: sampleContext, metadata: currentMetadata });
            if (this.history.length > SAMPLE_LIMITS.history) { this.history.shift(); this.droppedHistorySegments++; }
            segmentKey = key;
          }
          this.all.push(delta); if (this.all.length > SAMPLE_LIMITS.all) this.all.shift();
          this.totalFrames++;
          if (baselineFight) {
            this.fightFrames.push(delta); if (this.fightFrames.length > SAMPLE_LIMITS.fight) this.fightFrames.shift();
            this.totalFightFrames++;
          }
          this.lastSampleMs = delta;
        }
      }
      // The interval belongs to the active/fight context at its starting boundary.
      this.last = at; baselineFight = inFight; baselineContext = { ...context };
      return this.lastSampleMs;
    },
    update() {
      this.summary = frameStats(this.all); this.fight = frameStats(this.fightFrames);
      if (this.summary) {
        const current = metadata();
        Object.assign(this.summary, { fight: this.fight, gate: fightGate(this.fight),
          renderer: this.renderer ?? current.renderer, quality: this.quality ?? current.quality,
          rs: current.renderScale, dpr: current.dpr });
      }
      return this.summary;
    },
    report() {
      this.update();
      const at = now(), excluded = {};
      for (const [reason, record] of Object.entries(this.excluded)) excluded[reason] = { ...record,
        durationMs: record.durationMs + (suspended.has(reason) ? Math.max(0, at - suspended.get(reason)) : 0) };
      return {
        schemaVersion: 1, generatedAt: dateNow(), startedAt: this.startedAt,
        elapsedWallMs: Math.max(0, at - this.startedAtMs),
        metadata: metadata(), captureStartMetadata: this.captureMetadata,
        sampling: {
          clock: 'performance.now between active Stage1 update calls; frame cadence, not GPU execution time',
          percentileMethod: 'legacy conservative rank min(N-1,floor(N*p)), unrounded',
          displayRounding: 'upward to 0.001 ms; exported metrics are unrounded',
          activeOnly: true, fightDefinition: 'interval starts while an alive, non-entering enemy is engaged',
          includesHitStopAndActiveLongStalls: true, slowFrameThresholdMs: SLOW_FRAME_MS,
          capacities: { all: SAMPLE_LIMITS.all, fight: SAMPLE_LIMITS.fight },
          totalFrames: this.totalFrames, totalFightFrames: this.totalFightFrames,
          omittedFrames: this.totalFrames - this.all.length, omittedFightFrames: this.totalFightFrames - this.fightFrames.length,
          excludedByReason: excluded, suspendedReasons: [...suspended.keys()],
          exclusionNote: 'Reason durations may overlap; reset/visibility/focus/pause boundaries never bridge samples.',
        },
        all: this.summary ? { ...this.summary } : null, fight: this.fight ? { ...this.fight } : null,
        gate: fightGate(this.fight), context: { ...this.context },
        contextHistory: this.history.map(entry => JSON.parse(JSON.stringify(entry))),
        droppedHistorySegments: this.droppedHistorySegments,
        samplesMs: { all: this.all.slice(), fight: this.fightFrames.slice() },
        validationNote: 'This capture alone does not establish the Stage 1 guardrail on both required physical devices. No data is uploaded automatically.',
      };
    },
    reset() {
      this.last = null; this.lastSampleMs = null; this.all = []; this.fightFrames = [];
      this.inFight = false; baselineFight = false; baselineContext = {}; this.context = {};
      this.summary = null; this.fight = null; this.history = []; segmentKey = null;
      this.totalFrames = 0; this.totalFightFrames = 0; this.droppedHistorySegments = 0;
      this.captureMetadata = null; this.startedAt = dateNow(); this.startedAtMs = now(); this.excluded = {};
      // Preserve real lifecycle state, but start its accounting afresh for this capture.
      for (const reason of suspended.keys()) {
        suspended.set(reason, this.startedAtMs); this.excluded[reason] = { boundaries: 0, durationMs: 0 };
      }
    },
  };
  return meter;
}

export function bindPerfLifecycle(meter, root = globalThis) {
  const doc = root.document;
  if (!doc || !root.addEventListener) return () => {};
  const visibility = () => meter.setSuspended('hidden', doc.hidden);
  const blur = () => meter.setSuspended('unfocused', true);
  const focus = () => meter.setSuspended('unfocused', false);
  const pagehide = () => meter.setSuspended('page-hidden', true);
  const pageshow = () => { meter.setSuspended('page-hidden', false); visibility(); };
  doc.addEventListener('visibilitychange', visibility);
  root.addEventListener('blur', blur); root.addEventListener('focus', focus);
  root.addEventListener('pagehide', pagehide); root.addEventListener('pageshow', pageshow);
  visibility();
  return () => {
    doc.removeEventListener('visibilitychange', visibility);
    root.removeEventListener('blur', blur); root.removeEventListener('focus', focus);
    root.removeEventListener('pagehide', pagehide); root.removeEventListener('pageshow', pageshow);
  };
}

export const perf = createPerf();
if (typeof window !== 'undefined') { window.__perf = perf; bindPerfLifecycle(perf, window); }
