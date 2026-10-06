import test from 'node:test';
import assert from 'node:assert/strict';
import { harness, settle } from './helpers/cycle2-audio-harness.mjs';

for (const track of ['title', 'stage3', 'boss3']) {
  test(`${track} retries a failed fetch on the next unlocked gesture`, async () => {
    const h = harness(); h.api.installAudioLifecycle(h.game); h.api.unlock();
    const id = 'music-' + track;
    h.failures.add(id); h.api.playTrack(track); await settle();
    assert.equal(h.api.musicState().current, track);
    h.failures.delete(id);
    h.gestures.emit('pointerdown'); await settle();
    assert.equal(h.fetches.filter(k => k === id).length, 2);
    // Gestures while decoding must not attach more starts or fetches.
    for (let i = 0; i < 5; i++) h.gestures.emit('keydown');
    await h.decode(id, 70);
    const sources = h.transients().filter(n => n.buffer?.id === id);
    assert.equal(sources.length, 1);
    assert.equal(sources[0].starts.length, 1);
  });
}

test('returning to a visible tab retries a Stage 3 decode failure', async () => {
  const h = harness({ decodeReturnsPromise: true }); h.api.installAudioLifecycle(h.game); h.api.unlock();
  h.api.playTrack('stage3'); await h.failDecode('music-stage3');
  h.game.events.emit('hidden'); await settle();
  h.gestures.emit('keydown'); await settle();
  assert.equal(h.fetches.filter(k => k === 'music-stage3').length, 1);
  h.game.events.emit('visible'); await settle();
  assert.equal(h.fetches.filter(k => k === 'music-stage3').length, 2);
  await h.decode('music-stage3', 70);
  assert.equal(h.transients().filter(n => n.buffer?.id === 'music-stage3').length, 1);
});

test('Stage 3 retry respects music off and a newer track selection', async () => {
  const h = harness(); h.api.installAudioLifecycle(h.game); h.api.unlock();
  h.failures.add('music-stage3'); h.api.playTrack('stage3'); await settle();
  h.api.toggleMusic(); h.failures.delete('music-stage3');
  h.gestures.emit('keydown'); h.game.events.emit('visible'); await settle();
  assert.equal(h.fetches.filter(k => k === 'music-stage3').length, 1);
  h.api.playTrack('boss3');
  h.api.toggleMusic(); await h.decode('music-boss3', 60);
  h.gestures.emit('keydown'); await settle();
  assert.equal(h.api.musicState().current, 'boss3');
  assert.equal(h.fetches.filter(k => k === 'music-stage3').length, 1);
});
