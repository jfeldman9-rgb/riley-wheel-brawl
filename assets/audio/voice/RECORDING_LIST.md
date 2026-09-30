# Recording list — Riley and Twinkle Toes

Riley and Twinkle Toes now use the user-approved original stock character voices documented in `../VOICE_PROVENANCE.md`. These are not cloned from real people. The filenames remain drop-in compatible with family recordings: replace a file with the same name, and it plays automatically. Clips shorter than 0.25 seconds are treated as silent placeholders; subtitles and fallback cues remain available. The generator never overwrites a delivered clip.

How to record:

- Phone voice memo is fine. Quiet room, phone about a hand-width from the mouth, a little to the side.
- One line per file, named exactly as below (lower case). MP3 preferred (m4a/wav can be converted with `ffmpeg -i in.m4a -ac 1 -ar 44100 -b:a 64k out.mp3`).
- Trim silence at the start and end. Keep lines short and loud-ish; the game ducks the music under them.
- A couple of takes each is great; pick the most fun one.

Speaker ids in the code: Riley = `riley` (files `riley_*.mp3`), Twinkle Toes = `kenzie` (files `tt_*.mp3`).

38 lines (37 have context-gated triggers; 1 retired trigger retains its approved clip).

| # | Speaker | Line | File to drop in | Suggested read | Plays |
| --- | --- | --- | --- | --- | --- |
| 1 | Riley | “Then we bring her home.” | `riley_op_01.mp3` | Quiet, determined. A promise, not a shout. | now (context gated) |
| 2 | Riley | “I'll guard our home.” | `riley_st1_01.mp3` | Calm and steady, like a guardian taking his post. | now (context gated) |
| 3 | Riley | “It won't lose me.” | `riley_st2_01.mp3` | Quick and confident, already running. | now (context gated) |
| 4 | Riley | “Then I'll move fast.” | `riley_st3_01.mp3` | A bit nervous, then brave. Slight grin on "fast". | now (context gated) |
| 5 | Riley | “Not today.” | `riley_st4_01.mp3` | Firm and short. Two words, full stop. | now (context gated) |
| 6 | Riley | “Twinkle Toes is not.” | `riley_st5_01.mp3` | Cool comeback to Taim. Low and sure. | now (context gated) |
| 7 | Riley | “Together!” | `riley_st5_02.mp3` | Big heroic call. Shout it! | now (context gated) |
| 8 | Riley | “I've got you. Let's go!” | `riley_escape_01.mp3` | Natural, energetic. | now (context gated) |
| 9 | Riley | “Let's go home.” | `riley_end_01.mp3` | Warm and tired-happy. The adventure is over. | now (context gated) |
| 10 | Riley | “Balefire!” | `riley_super_01.mp3` | Full-power shout, like a special move in a fighting game. | now (context gated) |
| 11 | Riley | “Fire!” | `riley_fire_01.mp3` | Short, sharp shout as he throws the fireball. | now (context gated) |
| 12 | Riley | “Front kick!” | `riley_combo_01.mp3` | Punchy callout, in rhythm with a kick. | now (context gated) |
| 13 | Riley | “Roundhouse!” | `riley_combo_02.mp3` | Punchy callout, second kick. | now (context gated) |
| 14 | Riley | “Spin!” | `riley_combo_03.mp3` | Biggest of the three. Spin! | now (context gated) |
| 15 | Riley | “Not so fast!” | `riley_grab_01.mp3` | Quick, a little cocky. | now (context gated) |
| 16 | Riley | “Over there!” | `riley_throw_01.mp3` | Effort grunt into the words, like tossing something heavy. | now (context gated) |
| 17 | Riley | “I need a moment.” | `riley_low_01.mp3` | Out of breath, a little worried. | now (context gated) |
| 18 | Riley | “Back on my feet.” | `riley_respawn_01.mp3` | Shaking it off, getting back up. | now (context gated) |
| 19 | Riley | “Saidin is full!” | `riley_saidin_full_01.mp3` | Power-up excitement. | now (context gated) |
| 20 | Riley | “The fire burns brighter!” | `riley_angreal_01.mp3` | Excited, feeling the power. | now (context gated) |
| 21 | Riley | “Loial, now!” | `riley_call_01.mp3` | Calling to a friend across the battlefield. | now (context gated) |
| 22 | Riley | “Loial needs a rest.” | `riley_call_spent_01.mp3` | Sheepish, a little disappointed. | now (context gated) |
| 23 | Riley | “Callandor answers!” | `riley_callandor_01.mp3` | Awed, then powerful. The sword is glowing. | now (context gated) |
| 24 | Riley | “The way is clear.” | `riley_victory_01.mp3` | Relieved, confident. Catching his breath. | now (context gated) |
| 25 | Riley | “Twinkle Toes, I'm coming.” | `riley_victory_02.mp3` | Soft and serious. He means it. | now (context gated) |
| 26 | Riley | “Twinkle Toes, I am coming.” | `riley_st1_clear_01.mp3` | Looking into the distance. Determined. | now (context gated) |
| 27 | Riley | “Oof! That one hurt!” | `riley_bighit_01.mp3` | Knocked down. "Oof!" as a real grunt, then a wince. | now (context gated) |
| 28 | Riley | “I'm okay! Keep going!” | `riley_bighit_02.mp3` | Popping back up, tough and upbeat. | now (context gated) |
| 29 | Riley | “We did it!” | `riley_bosswin_05.mp3` | Pure joy. Celebrate! | now (context gated) |
| 30 | Twinkle Toes | “You picked the wrong dancer!” | `tt_op_01.mp3` | Sassy and brave, hands-on-hips. A little laugh is fine. | now (context gated) |
| 31 | Twinkle Toes | “Riley! I can see the lightning!” | `tt_st4_01.mp3` | Amazed and excited, pointing at the sky. | now (context gated) |
| 32 | Twinkle Toes | “Like a dance step. Got it!” | `tt_st4_02.mp3` | Concentrating, then proud: "Got it!" bright. | now (context gated) |
| 33 | Twinkle Toes | “Ready when you are, big brother!” | `tt_st5_01.mp3` | Fired up, cheering her big brother on. | now (context gated) |
| 34 | Twinkle Toes | “Twinkle Toes thunder!” | `tt_st5_02.mp3` | Her superhero move. Loud, joyful battle cry. | now (context gated) |
| 35 | Twinkle Toes | “Right behind you!” | `tt_escape_01.mp3` | Natural, energetic. | now (context gated) |
| 36 | Twinkle Toes | “After one victory dance!” | `tt_end_01.mp3` | Playful and silly. Giggle at the end is perfect. | now (context gated) |
| 37 | Twinkle Toes | “Riley! You came for me!” | `tt_st5_03.mp3` | Relieved and happy. Almost a laugh. | now (context gated) |
| 38 | Riley | “Up you go!” | `riley_juggle_01.mp3` | Playful. | retired trigger (clip retained) |

Regenerate this list with `node tools/recording-list.cjs`.
