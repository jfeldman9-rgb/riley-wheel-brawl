import test from 'node:test';
import assert from 'node:assert/strict';
import { harness, settle } from './helpers/cycle2-audio-harness.mjs';

for (const track of ['stage3', 'boss3']) {
  test(`explicit ${track} restart replaces a playing loop while ordinary resume preserves it`, async () => {
    const h = harness(); h.api.unlock(); h.api.playTrack(track);
    const id = 'music-' + track;
    await h.decode(id, 70);
    const old = h.transients().find(n => n.buffer?.id === id);
    h.contexts[0].currentTime = 12;
    h.api.playTrack(track, { restart: false }); await settle();
    assert.equal(old.stops.length, 0);
    assert.equal(h.transients().filter(n => n.buffer?.id === id).length, 1);
    h.api.playTrack(track, { restart: true }); await settle();
    assert.equal(old.stops.length, 1);
    assert.equal(old.disconnects, 1);
    const replacement = h.transients().filter(n => n.buffer?.id === id).at(-1);
    assert.notEqual(replacement, old);
    assert.deepEqual(replacement.starts[0], [0, 0.25]);
    assert.equal(h.fetches.filter(k => k === id).length, 1, 'restart reuses the decoded buffer');
    h.api.playTrack(track, { restart: false }); await settle();
    assert.equal(replacement.stops.length, 0);
  });
}

test('restarting boss3 during its outgoing fade cancels cleanup and replaces its source', async () => {
  const h = harness(); h.api.unlock(); h.api.playTrack('boss3'); await h.decode('music-boss3', 60);
  const old = h.transients().find(n => n.buffer?.id === 'music-boss3');
  h.contexts[0].currentTime = 10;
  h.api.playTrack('stage3', { fade: 1.2 }); await h.decode('music-stage3', 70);
  const staleCleanup = h.timers[0].fn;
  h.contexts[0].currentTime = 10.3;
  h.api.playTrack('boss3', { fade: 1.2, restart: true }); await settle();
  assert.equal(old.stops.length, 1);
  assert.equal(old.disconnects, 1);
  const replacement = h.transients().filter(n => n.buffer?.id === 'music-boss3').at(-1);
  assert.notEqual(replacement, old);
  assert.deepEqual(replacement.starts[0], [0, 0.25]);
  h.contexts[0].currentTime = 12;
  staleCleanup();
  assert.equal(replacement.stops.length, 0);
  assert.equal(h.api.musicState().current, 'boss3');
  assert.equal(old.disconnects, 1);
});

test('explicit restart also resets the selected streamed track', () => {
  const h = harness(); h.api.unlock(); h.api.playTrack('stage1');
  const el = h.media[0]; el.currentTime = 70;
  h.api.playTrack('stage1', { restart: true });
  assert.equal(el.currentTime, 0);
  assert.equal(el.paused, false);
  assert.equal(h.media.length, 1);
});
