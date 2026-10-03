import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createStartupGuard } from '../src/startup.js';

class Element extends EventTarget {
  constructor() { super(); this.hidden = false; this.textContent = ''; this.disabled = false; }
  focus() { this.focused = true; }
}
function environment() {
  const ids = ['boot', 'startup-error', 'startup-title', 'startup-description', 'startup-code', 'startup-retry', 'perf-open', 'touch'];
  const elements = Object.fromEntries(ids.map(id => [id, new Element()]));
  elements['startup-error'].hidden = true;
  const root = new EventTarget(); let reloads = 0;
  root.document = { getElementById: id => elements[id] || null };
  root.location = { origin: 'https://example.test', reload: () => reloads++ };
  const guard = createStartupGuard(root);
  return { root, elements, guard, reloads: () => reloads };
}
test('WebGL boot failure replaces endless loading with a focused recovery action', () => {
  const { guard, elements: e, reloads } = environment();
  assert.equal(guard.fail(new Error('Cannot create WebGL context, aborting.')), true);
  assert.equal(guard.failed, true); assert.equal(guard.finished, false);
  assert.equal(e.boot.hidden, true); assert.equal(e['startup-error'].hidden, false);
  assert.equal(e['startup-title'].textContent, 'Graphics could not start');
  assert.match(e['startup-description'].textContent, /WebGL2/);
  assert.match(e['startup-code'].textContent, /WEBGL_UNAVAILABLE/);
  assert.equal(e['startup-retry'].focused, true);
  assert.equal(e['perf-open'].hidden, true); assert.equal(e['perf-open'].disabled, true);
  assert.equal(e.touch.hidden, true);
  e['startup-retry'].dispatchEvent(new Event('click'));
  assert.equal(reloads(), 1, 'recovery reloads the existing immutable URL');
});
test('required asset errors abort startup and remove the loader error listener', () => {
  const { guard, elements: e } = environment(), loader = new EventEmitter();
  guard.watchLoader(loader); assert.equal(loader.listenerCount('loaderror'), 1);
  loader.emit('loaderror', { key: 'riley.A' });
  assert.equal(guard.failed, true); assert.equal(guard.ready(), false);
  assert.match(e['startup-code'].textContent, /REQUIRED_ASSET_FAILED/);
  assert.equal(loader.listenerCount('loaderror'), 0);
});
test('successful loader completion detaches its failure handler', () => {
  const { guard } = environment(), loader = new EventEmitter();
  guard.watchLoader(loader); loader.emit('complete');
  assert.equal(loader.listenerCount('loaderror'), 0); assert.equal(guard.failed, false);
});
test('successful start does not later replace gameplay with startup recovery', () => {
  const { root, guard, elements: e, reloads } = environment();
  assert.equal(guard.ready(), true); assert.equal(guard.finished, true);
  assert.equal(guard.fail(new Error('runtime failure')), false);
  const event = new Event('error'); event.message = 'later error'; root.dispatchEvent(event);
  assert.equal(e['startup-error'].hidden, true);
  e['startup-retry'].dispatchEvent(new Event('click')); assert.equal(reloads(), 0);
});
test('only same-origin startup errors display recovery; unrelated extensions are ignored', () => {
  const { root, guard } = environment();
  const extension = new Event('error'); extension.filename = 'chrome-extension://example/content.js'; extension.message = 'metadata failed';
  root.dispatchEvent(extension); assert.equal(guard.failed, false);
  const own = new Event('error'); own.filename = 'https://example.test/src/main.js'; own.message = 'Cannot create WebGL context';
  root.dispatchEvent(own); assert.equal(guard.failed, true);
});
test('a failing startup reports once and never inserts exception details into DOM', () => {
  const { guard, elements: e } = environment();
  guard.fail(new Error('<script>private diagnostic URL</script>'));
  assert.match(e['startup-code'].textContent, /STARTUP_FAILED/);
  assert.equal(guard.fail(new Error('WebGL failed')), false);
  assert.match(e['startup-code'].textContent, /STARTUP_FAILED/);
  assert.ok(Object.values(e).every(el => !el.textContent.includes('private diagnostic')));
});
test('destroy removes error and retry handlers without forcing reload', () => {
  const { root, guard, elements: e, reloads } = environment();
  guard.destroy();
  const event = new Event('error'); event.message = 'startup error'; root.dispatchEvent(event);
  e['startup-retry'].dispatchEvent(new Event('click'));
  assert.equal(guard.failed, false); assert.equal(reloads(), 0);
});
