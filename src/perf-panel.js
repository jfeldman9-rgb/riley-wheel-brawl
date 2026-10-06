// A local-only, keyboard/touch-accessible capture UI. It never uploads reports.
import { perf, displayMs } from './perf.js';
import { stageLightLine } from './stage3-lights.js';

const SHIELDED_EVENTS = ['pointerdown', 'pointerup', 'pointermove', 'mousedown', 'mouseup',
  'touchstart', 'touchmove', 'touchend', 'touchcancel', 'click', 'dblclick', 'keyup'];

// Stop the game's window-level Input handlers without cancelling native button/scroll/copy behavior.
export function shieldPerfControls(element, onKeyDown = () => {}) {
  const stop = event => event.stopPropagation();
  const key = event => { event.stopPropagation(); onKeyDown(event); };
  for (const type of SHIELDED_EVENTS) element.addEventListener(type, stop);
  element.addEventListener('keydown', key);
  return () => {
    for (const type of SHIELDED_EVENTS) element.removeEventListener(type, stop);
    element.removeEventListener('keydown', key);
  };
}

export function reportSummary(report) {
  const f = report.fight, m = report.metadata;
  const outcome = !f ? 'NO FIGHT SAMPLES YET' : report.gate.status === 'PASS' ? 'SAMPLED p95 MEETS TARGET' : 'SAMPLED p95 OVER TARGET';
  const rows = [outcome, 'Strict target: fight p95 ≤ 16.7 ms'];
  if (f) rows.push(`Fight p95: ${displayMs(f.p95)} ms · ${f.frames} frames · ${(f.durationMs / 1000).toFixed(1)} s sampled`,
    `Fight average: ${f.avgFps.toFixed(1)} fps · p99: ${displayMs(f.p99)} ms`,
    `Fight frames >33.4 ms: ${f.over33_4}/${f.frames} · longest: ${displayMs(f.max)} ms`);
  else rows.push('Close this report, then play a fight before checking again.');
  if (report.all) rows.push(`All active p95: ${displayMs(report.all.p95)} ms · ${report.all.frames} frames`,
    `All active frames >33.4 ms: ${report.all.over33_4}/${report.all.frames}`);
  rows.push(`Quality: ${m.quality} · render scale: ${m.renderScale ?? '?'} · DPR: ${m.dpr}`,
    `Viewport: ${m.viewport.width} × ${m.viewport.height} · mode: ${report.context.mode || 'not sampled'}`,
    `Renderer: ${m.renderer || 'not available yet'}`,
    m.softwareRenderer ? 'SOFTWARE RENDERER: not physical-device acceptance evidence.' : 'Physical-device acceptance remains unverified; capture both required devices.',
    'Timing displays round upward to 0.001 ms. JSON retains exact values.');
  if (report.lights) rows.push(report.lights);
  return rows.join('\n');
}

function clearGameplayInput(game) {
  const inp = game.inp;
  if (!inp) return;
  if (typeof inp.clear === 'function') { inp.clear(); return; }
  inp.held = {}; inp.buf = {}; inp.touchHeld = {}; inp.touchAxis = { x: 0, y: 0 };
  inp.runLatch = false; inp.lastTap = { left: -9, right: -9 }; inp.x = 0; inp.y = 0; inp.run = false;
  for (const el of document.querySelectorAll('.tb.on')) el.classList.remove('on');
  const knob = document.getElementById('knob'); if (knob) knob.style.transform = '';
}

export function installPerfPanel({ game, getStage }) {
  const opener = document.getElementById('perf-open'), overlay = document.getElementById('perf-overlay');
  if (!opener || !overlay) return { destroy() {} };
  const dialog = document.getElementById('perf-dialog'), summary = document.getElementById('perf-summary');
  const output = document.getElementById('perf-json'), status = document.getElementById('perf-status');
  const closeButton = document.getElementById('perf-close'), resetButton = document.getElementById('perf-reset');
  const copyButton = document.getElementById('perf-copy'), saveButton = document.getElementById('perf-save');
  const listeners = [], unshield = [], savedAttributes = [];
  let opened = false, previousFocus = null, pausedStage = null, fallbackWasPaused = false, currentReport = null;
  const on = (el, type, fn, options) => { el.addEventListener(type, fn, options); listeners.push(() => el.removeEventListener(type, fn, options)); };
  const render = () => {
    currentReport = perf.report();
    const stage = getStage();
    const coverage = stage?.bot?.coverage;
    const lights = stageLightLine(stage);
    if (lights) currentReport.lights = lights;
    currentReport.observations = { bossCoverage: coverage ? JSON.parse(JSON.stringify(coverage)) : null };
    output.value = JSON.stringify(currentReport, null, 2);
    summary.textContent = reportSummary(currentReport);
    summary.dataset.result = currentReport.gate.status;
  };
  const close = () => {
    if (!opened) return;
    opened = false; overlay.hidden = true; opener.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('perf-open');
    for (const { el, inert, ariaHidden } of savedAttributes.splice(0)) {
      el.inert = inert;
      if (ariaHidden === null) el.removeAttribute('aria-hidden'); else el.setAttribute('aria-hidden', ariaHidden);
    }
    clearGameplayInput(game);
    if (pausedStage?.setPauseReason) pausedStage.setPauseReason('report', false);
    else if (pausedStage && !fallbackWasPaused) pausedStage.scene.resume();
    perf.setSuspended('report', false); pausedStage = null;
    // Focus the canvas after an opener click, so the opener's input shield cannot swallow play keys.
    if (game.canvas?.isConnected && (!previousFocus || previousFocus === opener || previousFocus === document.body)) {
      game.canvas.setAttribute('tabindex', '-1'); game.canvas.focus({ preventScroll: true });
    } else if (previousFocus?.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus({ preventScroll: true });
    else opener.blur();
  };
  const open = () => {
    if (opened) return;
    opened = true; previousFocus = document.activeElement; pausedStage = getStage();
    perf.setSuspended('report', true); clearGameplayInput(game);
    if (pausedStage?.setPauseReason) pausedStage.setPauseReason('report', true);
    else if (pausedStage) {
      fallbackWasPaused = game.scene.isPaused('stage1');
      if (!fallbackWasPaused) pausedStage.scene.pause();
    }
    overlay.hidden = false; opener.setAttribute('aria-expanded', 'true'); status.textContent = '';
    document.documentElement.classList.add('perf-open');
    closeButton.focus({ preventScroll: true });
    for (const el of [document.getElementById('game'), document.getElementById('touch'), document.getElementById('graphics-notice'), opener]) if (el) {
      savedAttributes.push({ el, inert: el.inert, ariaHidden: el.getAttribute('aria-hidden') });
      el.inert = true; el.setAttribute('aria-hidden', 'true');
    }
    render(); closeButton.focus({ preventScroll: true });
  };
  unshield.push(shieldPerfControls(opener), shieldPerfControls(overlay, event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key === 'Tab') {
      const focusable = [...dialog.querySelectorAll('button, textarea, a[href]')].filter(el => !el.disabled && !el.hidden);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }));
  // A keyboard user cannot reach the game underneath, even on Safari versions without inert.
  on(document, 'focusin', event => { if (opened && !dialog.contains(event.target)) closeButton.focus({ preventScroll: true }); });
  on(document, 'keydown', event => {
    if (opened && !overlay.contains(event.target)) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (event.key === 'Escape') close(); else closeButton.focus({ preventScroll: true });
    }
  }, true);
  on(opener, 'click', open); on(closeButton, 'click', close);
  on(resetButton, 'click', () => { perf.reset(); render(); status.textContent = 'Capture reset. Close this report and play a fight to record a fresh sample.'; });
  on(copyButton, 'click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(output.value);
      if (opened) status.textContent = 'Report copied. Nothing was uploaded.';
    } catch {
      if (!opened) return;
      output.focus(); output.select(); output.setSelectionRange(0, output.value.length);
      status.textContent = 'Clipboard unavailable. The JSON is selected below; use your device’s Copy command or Save JSON.';
    }
  });
  on(saveButton, 'click', () => {
    const blob = new Blob([output.value], { type: 'application/json' });
    const url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = `riley-stage1-perf-${currentReport.generatedAt.replace(/[:.]/g, '-')}.json`;
    anchor.hidden = true; dialog.append(anchor); anchor.click(); anchor.remove();
    // Safari may consume the URL asynchronously. This URL is local and never sent to a server.
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    status.textContent = 'JSON download requested. On iPad, use the browser’s Downloads or Share → Save to Files. Nothing was uploaded.';
  });
  return { open, close, destroy() { close(); for (const fn of listeners) fn(); for (const fn of unshield) fn(); } };
}
