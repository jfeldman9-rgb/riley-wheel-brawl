# Recording list — Riley and Twinkle Toes

Riley and Twinkle Toes are real kids. Their voices are **never** generated or cloned. Record them yourself and drop the files into this folder (`assets/audio/voice/`), replacing the placeholder with the same name. Each name below already exists as a tiny silent placeholder (216 bytes) so the game never hits a missing file. The game loads each file when a stage or story card starts and plays any clip 0.25 s or longer in place of the chirp. The subtitle or speech bubble still shows. Commit and push the new files and they play on the site; nothing else to edit.

How to record:

- Phone voice memo is fine. Quiet room, phone about a hand-width from the mouth, a little to the side.
- One line per file, named exactly as below (lower case). MP3 preferred (m4a/wav can be converted with `ffmpeg -i in.m4a -ac 1 -ar 44100 -b:a 64k out.mp3`).
- Trim silence at the start and end. Keep lines short and loud-ish; the game ducks the music under them.
- A couple of takes each is great; pick the most fun one.

Speaker ids in the code: Riley = `riley` (files `riley_*.mp3`), Twinkle Toes = `kenzie` (files `tt_*.mp3`).

36 lines (28 play now, the rest are catalogued in docs/VOICE_LINES.md for later).

| # | Speaker | Line | File to drop in | Suggested read | Plays |
| --- | --- | --- | --- | --- | --- |
| 1 | Riley | “Then we bring her home.” | `riley_op_01.mp3` | Quiet, determined. A promise, not a shout. | now |
| 2 | Riley | “I'll guard our home.” | `riley_st1_01.mp3` | Calm and steady, like a guardian taking his post. | now |
| 3 | Riley | “It won't lose me.” | `riley_st2_01.mp3` | Quick and confident, already running. | now |
| 4 | Riley | “Then I'll move fast.” | `riley_st3_01.mp3` | A bit nervous, then brave. Slight grin on "fast". | now |
| 5 | Riley | “Not today.” | `riley_st4_01.mp3` | Firm and short. Two words, full stop. | now |
| 6 | Riley | “Twinkle Toes is not.” | `riley_st5_01.mp3` | Cool comeback to Taim. Low and sure. | now |
| 7 | Riley | “Together!” | `riley_st5_02.mp3` | Big heroic call. Shout it! | now |
| 8 | Riley | “Let's go home.” | `riley_end_01.mp3` | Warm and tired-happy. The adventure is over. | now |
| 9 | Riley | “Balefire!” | `riley_super_01.mp3` | Full-power shout, like a special move in a fighting game. | now |
| 10 | Riley | “Fire!” | `riley_fire_01.mp3` | Short, sharp shout as he throws the fireball. | now |
| 11 | Riley | “Not so fast!” | `riley_grab_01.mp3` | Quick, a little cocky. | now |
| 12 | Riley | “Over there!” | `riley_throw_01.mp3` | Effort grunt into the words, like tossing something heavy. | now |
| 13 | Riley | “Back on my feet.” | `riley_respawn_01.mp3` | Shaking it off, getting back up. | now |
| 14 | Riley | “Loial, now!” | `riley_call_01.mp3` | Calling to a friend across the battlefield. | now |
| 15 | Riley | “Callandor answers!” | `riley_callandor_01.mp3` | Awed, then powerful. The sword is glowing. | now |
| 16 | Riley | “The way is clear.” | `riley_victory_01.mp3` | Relieved, confident. Catching his breath. | now |
| 17 | Riley | “Twinkle Toes, I'm coming.” | `riley_victory_02.mp3` | Soft and serious. He means it. | now |
| 18 | Riley | “Twinkle Toes, I am coming.” | `riley_st1_clear_01.mp3` | Looking into the distance. Determined. | now |
| 19 | Riley | “Oof! That one hurt!” | `riley_bighit_01.mp3` | Knocked down. "Oof!" as a real grunt, then a wince. | now |
| 20 | Riley | “I'm okay! Keep going!” | `riley_bighit_02.mp3` | Popping back up, tough and upbeat. | now |
| 21 | Riley | “We did it!” | `riley_bosswin_05.mp3` | Pure joy. Celebrate! | now |
| 22 | Twinkle Toes | “You picked the wrong dancer!” | `tt_op_01.mp3` | Sassy and brave, hands-on-hips. A little laugh is fine. | now |
| 23 | Twinkle Toes | “Riley! I can see the lightning!” | `tt_st4_01.mp3` | Amazed and excited, pointing at the sky. | now |
| 24 | Twinkle Toes | “Like a dance step. Got it!” | `tt_st4_02.mp3` | Concentrating, then proud: "Got it!" bright. | now |
| 25 | Twinkle Toes | “Ready when you are, big brother!” | `tt_st5_01.mp3` | Fired up, cheering her big brother on. | now |
| 26 | Twinkle Toes | “Twinkle Toes thunder!” | `tt_st5_02.mp3` | Her superhero move. Loud, joyful battle cry. | now |
| 27 | Twinkle Toes | “After one victory dance!” | `tt_end_01.mp3` | Playful and silly. Giggle at the end is perfect. | now |
| 28 | Twinkle Toes | “Riley! You came for me!” | `tt_st5_03.mp3` | Relieved and happy. Almost a laugh. | now |
| 29 | Riley | “Front kick!” | `riley_combo_01.mp3` | Punchy callout, in rhythm with a kick. | catalogued (not wired yet) |
| 30 | Riley | “Roundhouse!” | `riley_combo_02.mp3` | Punchy callout, second kick. | catalogued (not wired yet) |
| 31 | Riley | “Spin!” | `riley_combo_03.mp3` | Biggest of the three. Spin! | catalogued (not wired yet) |
| 32 | Riley | “Up you go!” | `riley_juggle_01.mp3` | Playful. | catalogued (not wired yet) |
| 33 | Riley | “I need a moment.” | `riley_low_01.mp3` | Out of breath, a little worried. | catalogued (not wired yet) |
| 34 | Riley | “Saidin is full!” | `riley_saidin_full_01.mp3` | Power-up excitement. | catalogued (not wired yet) |
| 35 | Riley | “The fire burns brighter!” | `riley_angreal_01.mp3` | Excited, feeling the power. | catalogued (not wired yet) |
| 36 | Riley | “Loial needs a rest.” | `riley_call_spent_01.mp3` | Sheepish, a little disappointed. | catalogued (not wired yet) |

Regenerate this list with `node tools/recording-list.cjs`.
