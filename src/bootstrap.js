import { createStartupGuard } from './startup.js';
import { perfReportEnabled } from './debug-flag.js';

const perfOpen = document.getElementById('perf-open');
if (perfOpen && !perfReportEnabled()) {
  perfOpen.hidden = true;
  perfOpen.setAttribute('aria-hidden', 'true');
  perfOpen.tabIndex = -1;
}

const startup = window.__rwbStartup = createStartupGuard(window);
// Dynamic import catches missing modules and synchronous Phaser boot errors.
// The game keeps its pinned Phaser WebGL renderer; this is only recovery UI.
import('./main.js').catch(error => {
  console.error('Riley startup failed:', error);
  startup.fail(error);
});
