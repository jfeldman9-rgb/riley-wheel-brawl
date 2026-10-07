import { createStartupGuard } from './startup.js';
import { applyPerfButton } from './debug-flags.js';
import { installDirectoryBase } from './page-base.js';
installDirectoryBase(document, location);
applyPerfButton(document, location.search);

const startup = window.__rwbStartup = createStartupGuard(window);
// Dynamic import catches missing modules and synchronous Phaser boot errors.
// The game keeps its pinned Phaser WebGL renderer; this is only recovery UI.
import('./main.js').catch(error => {
  console.error('Riley startup failed:', error);
  startup.fail(error);
});
