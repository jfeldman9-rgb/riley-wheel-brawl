// The Waygate uses the stage input module itself. Do not copy KEYS or PAD_MAP.
import { Input, PAD_MAP } from '../src/input.js';

const root = globalThis;
root.WaygateInput = Input;
root.WAYGATE_PAD_MAP = PAD_MAP;

if (typeof document !== 'undefined' && document.getElementById && document.getElementById('stick')) {
  root.__waygateInput = root.__waygateInput || new Input();
}

if (typeof root.bootWaygate === 'function') root.bootWaygate();
