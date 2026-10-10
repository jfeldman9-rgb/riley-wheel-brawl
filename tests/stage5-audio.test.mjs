import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const { LINES, STAGE5_VOICES, VOICE_FILES, bark } = await import('../src/stage5-voice.js');
const { STAGE5_CUES } = await import('../src/stage5-sfx.js');

test('Stage 5 ships the plan line list and stays silent when the mp3s are absent', () => {
  assert.equal(STAGE5_VOICES.length, 21);
  assert.equal(Object.keys(LINES).length, 21);
  for (const id of ['st5_story_01', 'st5_story_05', 'st5_clear_03', 'riley_st5_victory_01', 'aginor_burn_01', 'balthamel_laugh_01', 'greenman_fall_01']) {
    assert.ok(LINES[id], id);
  }
  assert.ok(VOICE_FILES.every(id => STAGE5_VOICES.includes(id)));
  for (const id of STAGE5_VOICES) {
    assert.equal(LINES[id].length, 2, id);
    const file = new URL(`../assets/audio/voice/${id}.mp3`, import.meta.url);
    assert.equal(existsSync(file), VOICE_FILES.includes(id), id);
  }
  const scene = { time: { now: 0 }, caption: () => {} };
  assert.doesNotThrow(() => bark(scene, 'stalk', 'riley_st5_stalk_01'));
  assert.doesNotThrow(() => bark(scene, 'stalk', 'riley_st5_stalk_01'));
});

test('painted rows load only when their files ship, and the cue table is named', async () => {
  const { PAINTED } = await import('../src/stage5-art.js');
  assert.deepEqual(PAINTED.map(r => r.key), ['s5agin', 's5balt', 'aginorPortrait']);
  for (const row of PAINTED) {
    for (const f of [row.url, row.atlas].filter(Boolean)) {
      assert.equal(existsSync(new URL(`../${f}`, import.meta.url)), row.present, `${row.key}: present matches ${f} on disk`);
    }
  }
  assert.ok(!existsSync(new URL('../assets/stage5/painted.json', import.meta.url)), 'no JSON manifest racing the queue');
  assert.ok(STAGE5_CUES.stalkHiss);
  assert.ok(STAGE5_CUES.embraceCue);
});
