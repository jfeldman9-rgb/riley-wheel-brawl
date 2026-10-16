import test from 'node:test';
import assert from 'node:assert/strict';
import { installGraphicsNotice } from '../src/graphics-notice.js';
test('graphics-loss notice preserves report access and restores focus only when needed', () => {
  const classes = new Set(), notice = { hidden: true }, button = new EventTarget();
  let focusCalls = 0, reloads = 0;
  const canvas = { setAttribute() {}, focus() { focusCalls++; } };
  const document = { body: { classList: { add: c => classes.add(c), remove: c => classes.delete(c) } },
    getElementById: id => id === 'graphics-notice' ? notice : id === 'graphics-retry' ? button : null,
    querySelector: () => canvas, activeElement: null };
  const ui = installGraphicsNotice({ document, location: { reload: () => reloads++ } });
  ui.lost(); assert.equal(notice.hidden, false); assert.ok(classes.has('graphics-lost'));
  assert.equal(focusCalls, 0, 'an open report retains its focus');
  button.dispatchEvent(new Event('click')); assert.equal(reloads, 1);
  ui.restored(); assert.equal(notice.hidden, true); assert.equal(focusCalls, 0);
  document.activeElement = button; ui.lost(); ui.restored();
  assert.equal(focusCalls, 1); assert.equal(classes.has('graphics-lost'), false);
  ui.destroy(); button.dispatchEvent(new Event('click')); assert.equal(reloads, 1);
});
test('a missing graphics notice is safe in non-DOM regression harnesses', () => {
  const ui = installGraphicsNotice({}); ui.lost(); ui.restored(); ui.destroy();
});
