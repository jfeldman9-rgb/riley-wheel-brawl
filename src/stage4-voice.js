// Stage 4 lines. Registered here so src/audio.js stays a lookup, and so a stripped
// audio.js eval still treats unknown ids as silence.
import { say, playLoop, stopLoop, registerLines, withSfx } from './audio.js';
import { playStage4Sfx } from './stage4-sfx.js';

export const LINES = {
  st4_story_01: ['NARRATOR', 'The Fade fled Caemlyn by night. Its trail ran east, to a city no map still names.'],
  st4_story_02: ['RILEY', 'Aridhol. Moiraine said never go in.'],
  st4_story_03: ['RILEY', 'He went in.'],
  st4_story_04: ['MORDETH', 'Stay... and be welcome... forever.'],
  st4_story_05: ['NARRATOR', 'Riley walked in.'],
  st4_clear_01: ['RILEY', 'The trail goes underground. A Waygate.'],
  st4_clear_02: ['LOIAL', 'Riley, the Ways are dark. Nobody goes into the Ways.'],
  st4_clear_03: ['RILEY', 'Then show me how.'],
  riley_fog_01: ['RILEY', "Don't touch the fog."],
  riley_fog_off_01: ['RILEY', 'Off me!'],
  riley_fog_off_02: ['RILEY', 'Not today!'],
  riley_tower_01: ['RILEY', "That tower's coming down!"],
  riley_bridge_01: ['RILEY', 'There, on the bridge!'],
  riley_light_01: ['RILEY', 'Light it up.'],
  riley_st4_victory_01: ['RILEY', 'Sing to the ash.'],
  draghkar_come_01: ['DRAGHKAR', 'Come... rest...'],
  draghkar_soul_01: ['DRAGHKAR', 'Such a bright soul. Give it to me.'],
  draghkar_garden_01: ['DRAGHKAR', 'The fog is my garden.'],
  draghkar_croon_01: ['DRAGHKAR', '(wordless hum, 3 second loop)'],
  draghkar_shriek_01: ['DRAGHKAR', '(defeat shriek)'],
  cultist_call_01: ['CULTIST', 'The fog answers us!'],
  cultist_feed_01: ['CULTIST', 'Mashadar, feed!'],
  cultist_burn_01: ['CULTIST', 'He burns... it burns!'],
};
registerLines(LINES);
export const STAGE4_VOICES = Object.freeze(Object.keys(LINES));

const GAP = 8000;
let fogOff = 0;
export function fogOffId() { return fogOff++ % 2 ? 'riley_fog_off_02' : 'riley_fog_off_01'; }
export function bark(scene, type, id, interrupt = false) {
  const now = scene.time?.now || 0;
  const at = scene._s4bark || (scene._s4bark = {});
  if (now - (at[type] ?? -1e9) < GAP) return;
  at[type] = now;
  say(id, scene.caption, interrupt);
}
export function croon(on) { if (on) playLoop('draghkar_croon_01'); else stopLoop(); }
export function sfxCue(name) { withSfx((ctx, bus) => playStage4Sfx(ctx, bus, name)); }
