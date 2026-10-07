// Query flags for local diagnostics. Empty ?debug counts; ?debug=0 does not.
function paramsOf(params) {
  if (params instanceof URLSearchParams) return params;
  const search = params !== undefined ? params : (typeof location !== 'undefined' ? location.search : '');
  return new URLSearchParams(search || '');
}

export function queryFlag(params, key) {
  const q = paramsOf(params);
  return q.has(key) && q.get(key) !== '0';
}

/** Perf report button: ?debug (any value except 0) or ?perf the same way. */
export function perfReportEnabled(params) {
  return queryFlag(params, 'debug') || queryFlag(params, 'perf');
}

/** On-screen viewport numbers. Strict ?debug=1 so a bare ?debug does not cover the HUD. */
export function debugViewportEnabled(params) {
  return paramsOf(params).get('debug') === '1';
}
