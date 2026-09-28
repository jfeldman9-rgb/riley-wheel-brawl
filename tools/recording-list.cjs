'use strict';
// Writes assets/audio/voice/RECORDING_LIST.md: every Riley / Twinkle Toes line,
// the file name the game looks for, and a suggested read.  node tools/recording-list.cjs
const fs = require('fs'), path = require('path');
const { boot } = require('./soak.cjs');
const root = path.resolve(__dirname, '..');
const R = boot(root);
const js = fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js') && f !== 'campaign.js')
  .map(f => fs.readFileSync(path.join(root, 'js', f), 'utf8')).join('\n');
const inReel = new Set([].concat(...Object.values(R.CAPTIONS)).map(l => l.id));
const T = R.VOICE_TRIGGERS, triggered = new Set([].concat(T.bigHit, T.bossWin, T.combat));
const wired = id => inReel.has(id) || triggered.has(id) || js.includes("'" + id + "'");
const READS = {
  op_riley_01: 'Quiet, determined. A promise, not a shout.',
  op_kenzie_01: 'Sassy and brave, hands-on-hips. A little laugh is fine.',
  st1_riley_01: 'Calm and steady, like a guardian taking his post.',
  st2_riley_01: 'Quick and confident, already running.',
  st3_riley_01: 'A bit nervous, then brave. Slight grin on "fast".',
  st4_riley_01: 'Firm and short. Two words, full stop.',
  st4_kenzie_01: 'Amazed and excited, pointing at the sky.',
  st4_kenzie_02: 'Concentrating, then proud: "Got it!" bright.',
  st5_riley_01: 'Cool comeback to Taim. Low and sure.',
  st5_kenzie_01: 'Fired up, cheering her big brother on.',
  st5_riley_02: 'Big heroic call. Shout it!',
  st5_kenzie_02: 'Her superhero move. Loud, joyful battle cry.',
  st5_kenzie_03: 'Relieved and happy. Almost a laugh.',
  end_riley_01: 'Warm and tired-happy. The adventure is over.',
  end_kenzie_01: 'Playful and silly. Giggle at the end is perfect.',
  st1_clear_riley_01: 'Looking into the distance. Determined.',
  riley_super_01: 'Full-power shout, like a special move in a fighting game.',
  riley_fire_01: 'Short, sharp shout as he throws the fireball.',
  riley_grab_01: 'Quick, a little cocky.',
  riley_throw_01: 'Effort grunt into the words, like tossing something heavy.',
  riley_respawn_01: 'Shaking it off, getting back up.',
  riley_callandor_01: 'Awed, then powerful. The sword is glowing.',
  riley_call_01: 'Calling to a friend across the battlefield.',
  riley_victory_01: 'Relieved, confident. Catching his breath.',
  riley_victory_02: 'Soft and serious. He means it.',
  riley_bighit_01: 'Knocked down. "Oof!" as a real grunt, then a wince.',
  riley_bighit_02: 'Popping back up, tough and upbeat.',
  riley_bosswin_05: 'Pure joy. Celebrate!',
  riley_combo_01: 'Punchy callout, in rhythm with a kick.',
  riley_combo_02: 'Punchy callout, second kick.',
  riley_combo_03: 'Biggest of the three. Spin!',
  riley_juggle_01: 'Playful.',
  riley_low_01: 'Out of breath, a little worried.',
  riley_saidin_full_01: 'Power-up excitement.',
  riley_angreal_01: 'Excited, feeling the power.',
  riley_call_spent_01: 'Sheepish, a little disappointed.'
};
const rows = Object.values(R.VOICE_LINES).filter(l => R.VOICE_RECORDED[l.who]);
rows.sort((a, b) => (wired(b.id) - wired(a.id)) || (a.who === b.who ? 0 : a.who === 'riley' ? -1 : 1));
const table = list => ['| # | Speaker | Line | File to drop in | Suggested read | Plays |', '| --- | --- | --- | --- | --- | --- |']
  .concat(list.map((l, i) => `| ${i + 1} | ${l.who === 'kenzie' ? 'Twinkle Toes' : 'Riley'} | “${l.text}” | \`${R.voiceFile(l.id)}\` | ${READS[l.id] || 'Natural, energetic.'} | ${wired(l.id) ? 'now' : 'catalogued (not wired yet)'} |`)).join('\n');
const md = `# Recording list — Riley and Twinkle Toes

Riley and Twinkle Toes are real kids. Their voices are **never** generated or cloned. Record them yourself and drop the files into this folder (\`assets/audio/voice/\`), replacing the placeholder with the same name. Each name below already exists as a tiny silent placeholder (216 bytes) so the game never hits a missing file. The game loads each file when a stage or story card starts and plays any clip 0.25 s or longer in place of the chirp. The subtitle or speech bubble still shows. Commit and push the new files and they play on the site; nothing else to edit.

How to record:

- Phone voice memo is fine. Quiet room, phone about a hand-width from the mouth, a little to the side.
- One line per file, named exactly as below (lower case). MP3 preferred (m4a/wav can be converted with \`ffmpeg -i in.m4a -ac 1 -ar 44100 -b:a 64k out.mp3\`).
- Trim silence at the start and end. Keep lines short and loud-ish; the game ducks the music under them.
- A couple of takes each is great; pick the most fun one.

Speaker ids in the code: Riley = \`riley\` (files \`riley_*.mp3\`), Twinkle Toes = \`kenzie\` (files \`tt_*.mp3\`).

${rows.length} lines (${rows.filter(l => wired(l.id)).length} play now, the rest are catalogued in docs/VOICE_LINES.md for later).

${table(rows)}

Regenerate this list with \`node tools/recording-list.cjs\`.
`;
fs.writeFileSync(path.join(root, 'assets/audio/voice/RECORDING_LIST.md'), md);
// A 216-byte silent MP3 stands in for every line not recorded yet (the game ignores clips under 0.25 s).
const PLACEHOLDER = Buffer.from(fs.readFileSync(path.join(__dirname, 'voice-placeholder.b64'), 'utf8').trim(), 'base64');
let made = 0;
for (const l of rows) { const f = path.join(root, 'assets/audio/voice', R.voiceFile(l.id)); if (!fs.existsSync(f)) { fs.writeFileSync(f, PLACEHOLDER); made++; } }
console.log('placeholders created:', made);
console.log('wrote', rows.length, 'lines');
