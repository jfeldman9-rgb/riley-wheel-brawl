// Stage 5 lines. Missing mp3s stay silent: say() already treats a failed fetch
// as no audio, and preload skips ids that are not on disk when the manifest says so.
import { say, playLoop, stopLoop, registerLines, withSfx } from './audio.js';
import { playStage5Sfx } from './stage5-sfx.js';

export const LINES = {
  st5_story_01: ['NARRATOR', "Loial led him through the Ways. In the dark, a wind whispered Riley's name."],
  st5_story_02: ['RILEY', 'The trail runs north. Into the Blight.'],
  st5_story_03: ['LOIAL', 'Nothing grows right here, Riley. Not even the trees.'],
  st5_story_04: ['NARRATOR', 'Past the hills, something old was waiting.'],
  st5_story_05: ['RILEY', "Good. I'm in a mood."],
  st5_clear_01: ['RILEY', "She's not here. The Fade went south."],
  st5_clear_02: ['LOIAL', "South is Tarwin's Gap. Every Trolloc in the Blight is going there."],
  st5_clear_03: ['RILEY', 'Then so am I.'],
  riley_st5_stalk_01: ['RILEY', "Something's in the grass."],
  riley_st5_tree_01: ['RILEY', 'The trees are moving!'],
  riley_st5_ring_01: ['RILEY', 'Jump it!'],
  riley_st5_free_01: ['RILEY', 'Get your hands off me, corpse.'],
  riley_st5_greenman_01: ['RILEY', 'No! Not him!'],
  riley_st5_victory_01: ['RILEY', 'Burn, then.'],
  aginor_intro_01: ['AGINOR', 'A channeler. Untrained. Delicious.'],
  aginor_drain_01: ['AGINOR', 'Your strength is wasted on you.'],
  aginor_surge_01: ['AGINOR', 'The Eye... so much... more!'],
  aginor_burn_01: ['AGINOR', '(scream)'],
  balthamel_laugh_01: ['BALTHAMEL', '(dry laugh)'],
  greenman_arrive_01: ['GREEN MAN', 'You will not touch my garden.'],
  greenman_fall_01: ['GREEN MAN', 'Grow... again...'],
};
registerLines(LINES);
export const STAGE5_VOICES = Object.freeze(Object.keys(LINES));
// Ids whose mp3 is on disk. Empty until the rendered lines land, so nothing 404s.
export const VOICE_FILES = [];
export function stage5Say(id, cap, interrupt = true) {
  const line = LINES[id];
  if (!VOICE_FILES.includes(id)) { if (line && typeof cap === 'function') cap(line[0], line[1]); return line; }
  return say(id, cap, interrupt);
}

const GAP = 8000;
export function bark(scene, type, id, interrupt = false) {
  const now = scene.time?.now || 0;
  const at = scene._s5bark || (scene._s5bark = {});
  if (now - (at[type] ?? -1e9) < GAP) return;
  at[type] = now;
  stage5Say(id, scene.caption, interrupt);
}
export function drainHum(on) { if (on && VOICE_FILES.includes('aginor_drain_01')) playLoop('aginor_drain_01'); else if (!on) stopLoop(); }
export function sfxCue(name) { withSfx((ctx, bus) => playStage5Sfx(ctx, bus, name)); }
