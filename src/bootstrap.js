import { createStartupGuard } from './startup.js';

const startup = window.__rwbStartup = createStartupGuard(window);
// Dynamic import catches missing modules and synchronous Phaser boot errors.
// The game stays WebGL2; this is recovery UI, not a different renderer.
import('./main.js').catch(error => {
  console.error('Riley startup failed:', error);
  startup.fail(error);
});
