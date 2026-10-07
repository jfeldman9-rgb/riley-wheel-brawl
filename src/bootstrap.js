import { createStartupGuard } from './startup.js';
import { perfBtn, base } from './debug-flag.js';
base(document, location); perfBtn(document, location.search);

const startup = window.__rwbStartup = createStartupGuard(window);
// Dynamic import catches missing modules and synchronous Phaser boot errors.
// The game keeps its pinned Phaser WebGL renderer; this is only recovery UI.
import('./main.js').catch(error => {
  console.error('Riley startup failed:', error);
  startup.fail(error);
});
