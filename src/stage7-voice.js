// Stage 7 lines. A missing mp3 stays a caption. setVoiceFiles tells say() not to fetch it.
import { say, registerLines, withSfx, setVoiceFiles } from './audio.js';
import { playStage7Sfx } from './stage7-sfx.js';

export const LINES = {
  st7_story_01: ['NARRATOR', 'The Portal Stone took them in a heartbeat — and spat them out on a mountain at the edge of the world.'],
  st7_story_02: ['NARRATOR', 'Below Chaendaer lay the Three-fold Land. And under a dome of fog, a city no outsider was meant to see.'],
  riley_st7_story_01: ['RILEY', 'She came through here. I can feel it.'],
  st7_story_03: ['MOIRAINE', 'Rhuidean. Step carefully. Something in that city is awake.'],
  st7_story_04: ['LAN', 'Shadowspawn tracks. Fresh. Stay on my left.'],
  st7_storm_01: ['LAN', 'Down! Brace against it!'],
  riley_st7_storm_01: ['RILEY', "Can't see a thing in this!"],
  st7_veil_01: ['MOIRAINE', 'The veil. Whatever you see in there, keep moving.'],
  riley_st7_street_01: ['RILEY', "The ground's moving!"],
  st7_asmo_intro_01: ['ASMODEAN', "A boy with a borrowed sword, chasing a girl he'll never find. Shall I play you a dirge?"],
  st7_asmo_p2_01: ['ASMODEAN', 'Listen — even the glass sings for me.'],
  st7_asmo_p3_01: ['ASMODEAN', "Do you know what this is? Of course you don't."],
  st7_asmo_hurt_01: ['ASMODEAN', 'You — you dare?!'],
  riley_st7_reflect_01: ['RILEY', 'Off-key.'],
  riley_st7_call_01: ['RILEY', 'Moiraine!'],
  riley_st7_call_02: ['RILEY', 'Lan — now!'],
  riley_st7_call_03: ['RILEY', 'I need you!'],
  st7_moi_call_01: ['MOIRAINE', 'Stand aside.'],
  st7_moi_call_02: ['MOIRAINE', 'The Light shield you.'],
  st7_lan_call_01: ['LAN', 'Behind me.'],
  st7_lan_call_02: ['LAN', 'Now, sheepherder— now!'],
  st7_duo_call_01: ['MOIRAINE', 'Lan!'],
  st7_clear_01: ['ASMODEAN', 'Enough! Enough… I yield. The Fades sold the girl to women in shawls — a Tower embassy, riding for Cairhien.'],
  st7_clear_02: ['MOIRAINE', 'He will keep. A shielded Forsaken is still worth more than a dead one.'],
  st7_clear_03: ['LAN', 'Cairhien, then. We ride at dawn.'],
  riley_st7_victory_01: ['RILEY', "Hold on. I'm coming."],
};
registerLines(LINES);
export const STAGE7_VOICES = Object.freeze(Object.keys(LINES));
const keep = ids => (Array.isArray(ids) ? ids : []).filter(id => Object.prototype.hasOwnProperty.call(LINES, id));
async function presentIds() {
  const url = new URL('../assets/audio/stage7-voice-manifest.json', import.meta.url);
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
setVoiceFiles(STAGE7_VOICES, VOICE_FILES);
export function stage7Say(id, cap, interrupt = true) {
  const line = LINES[id];
  if (!VOICE_FILES.includes(id)) { if (line && typeof cap === 'function') cap(line[0], line[1]); return line; }
  return say(id, cap, interrupt);
}
export function sfxCue(name) { withSfx((ctx, bus) => playStage7Sfx(ctx, bus, name)); }
