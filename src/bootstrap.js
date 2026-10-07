import { createStartupGuard } from './startup.js';
import { applyPerfButton } from './debug-flags.js';
import { installDirectoryBase } from './page-base.js';

// Asset URLs are repo-relative. A project-site URL with no trailing slash would
// resolve them at the domain root, which GitHub Pages does not serve.
installDirectoryBase(document, location);
// Perf report stays hidden unless the page was opened with ?debug or ?perf.
applyPerfButton(document, location.search);

const startup = window.__rwbStartup = createStartupGuard(window);
// Dynamic import catches missing modules and synchronous Phaser boot errors.
// The game keeps its pinned Phaser WebGL renderer; this is only recovery UI.
import('./main.js').catch(error => {
  console.error('Riley startup failed:', error);
  startup.fail(error);
});
