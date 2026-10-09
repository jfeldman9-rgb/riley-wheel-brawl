// Stage 6 lines. A missing mp3 stays a caption. setVoiceFiles tells say() not to fetch it.
import { say, registerLines, withSfx, setVoiceFiles } from './audio.js';
import { playStage6Sfx } from './stage6-sfx.js';

export const LINES = {
  st6_story_01: ['NARRATOR', "Tarwin's Gap held. But the Fade's trail ran south, to the greatest fortress in the world."],
  st6_story_02: ['RILEY', "The Stone of Tear. She's in there."],
  st6_story_03: ['NARRATOR', 'That night, the barges at the Maule were not carrying grain.'],
  st6_story_04: ['RAND', "You're the one hunting the Half-man. Then we hunt together."],
  st6_story_05: ['RILEY', "Just don't steal my kills."],
  st6_clear_01: ['RAND', "The Stone is ours. Your sister's trail goes east, into the Waste."],
  st6_clear_02: ['RILEY', 'Rhuidean.'],
  st6_clear_03: ['RAND', "Call, and I'll come."],
  riley_st6_call_01: ['RILEY', 'Rand! Now!'],
  riley_st6_call_02: ['RILEY', 'Dragon! Little help!'],
  riley_st6_rand_wait_01: ['RILEY', 'Rand needs a breather.'],
  rand_call_01: ['RAND', 'Down, Riley!'],
  rand_call_02: ['RAND', 'Burn, Shadowspawn.'],
  rand_call_03: ['RAND', 'The Dragon is here.'],
  rand_call_04: ['RAND', 'Stay behind me.'],
  rand_call_05: ['RAND', "Light, there's always more of them."],
  belal_intro_01: ['BELAL', 'Another boy who thinks the Power makes him a man.'],
  belal_net_01: ['BELAL', 'Every thread is mine.'],
  belal_mid_01: ['BELAL', 'Callandor is not for you.'],
  belal_defeat_01: ['BELAL', '...'],
  st6_moiraine_01: ['MOIRAINE', 'Not today, Netweaver.'],
  grayman_01: ['GRAY MAN', '...'],
  defender_01: ['DEFENDER', 'For the Stone! For the Dragon!'],
  riley_st6_gray_01: ['RILEY', "Where'd he go?"],
  riley_st6_victory_01: ['RILEY', "Stone's clear."],
};
registerLines(LINES);
export const STAGE6_VOICES = Object.freeze(Object.keys(LINES));
const keep = ids => (Array.isArray(ids) ? ids : []).filter(id => Object.prototype.hasOwnProperty.call(LINES, id));
async function presentIds() {
  const url = new URL('../assets/audio/stage6-voice-manifest.json', import.meta.url);
  try {
    const fs = globalThis.process?.getBuiltinModule?.('node:fs');
    const pathFor = globalThis.process?.getBuiltinModule?.('node:url');
    if (fs?.readFileSync && pathFor?.fileURLToPath) return keep(JSON.parse(fs.readFileSync(pathFor.fileURLToPath(url), 'utf8')).present);
  } catch { /* a bad manifest stays captions */ }
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    return keep((await res.json()).present);
  } catch { return []; }
}
export const VOICE_FILES = await presentIds();
setVoiceFiles(STAGE6_VOICES, VOICE_FILES);
export function stage6Say(id, cap, interrupt = true) {
  const line = LINES[id];
  if (!VOICE_FILES.includes(id)) { if (line && typeof cap === 'function') cap(line[0], line[1]); return line; }
  return say(id, cap, interrupt);
}
const BARKS = ['rand_call_01', 'rand_call_02', 'rand_call_03', 'rand_call_04', 'rand_call_05'];
let barkI = -1;
export function randBark(cap) {
  let i = (barkI + 1) % BARKS.length;
  if (BARKS[i] && i === barkI) i = (i + 1) % BARKS.length;
  barkI = i;
  return stage6Say(BARKS[i], cap, false);
}
export function sfxCue(name) { withSfx((ctx, bus) => playStage6Sfx(ctx, bus, name)); }
