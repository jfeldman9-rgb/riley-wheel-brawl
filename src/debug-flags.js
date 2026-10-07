// The Perf report is a debug tool. Normal play keeps the button out of the HUD.

/** True when the page was opened with ?debug or ?perf (either may be empty). */
export function perfReportEnabled(search = '') {
  const q = new URLSearchParams(typeof search === 'string' ? search : '');
  return q.has('debug') || q.has('perf');
}

export function applyPerfButton(doc, search) {
  const button = doc?.getElementById?.('perf-open');
  if (!button) return false;
  const on = perfReportEnabled(search);
  button.hidden = !on;
  if (!on) button.setAttribute('aria-hidden', 'true');
  else button.removeAttribute('aria-hidden');
  return on;
}
