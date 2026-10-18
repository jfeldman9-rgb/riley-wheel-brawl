# Riley Wheel Brawl — Stage 8 (FINAL LEVEL) brief

Date: 2026-10-18. Owner: Jason F. Planning only: no code, no art/music/video generation in this pass.

Repo: jfeldman9-rgb/riley-wheel-brawl. Live branch `rwb-w2` (GitHub Pages: https://jfeldman9-rgb.github.io/riley-wheel-brawl/). Phaser game, Wheel of Time theme, Stages 1–7 exist. Plan branch: `rwb-2-stage8-plan` (off origin/rwb-w2 @ 23ccf14). Deliverable: `docs/STAGE8-PLAN.md`.

## Jason's request (verbatim)

> Level 8 will be the final level. It will be at Dumais Wells. Instead of trollocs we will have Shaido. The battle will occur alongside the Ashaman and Perrin and loial and everyone else fighting. Every 60 seconds we will have mazrim taim yell ashaman kill! And Riley will have to avoid rolling earth and fire. Have your best artwork yet. Including rand in the box. Opening scene must have rand in the box 'talking' to lews therin trying to break the saidar shield. Must have taim yelling ashaman kill. Base the background track on my prior ashaman kill song. Use suno and have some nordic style vocals. Have it turn out the big and final boss is Lanfear. She heard twinkletoes was crowned the queen of love and beauty at medieval times and got jealous. Twinkle toes is also guarded by Black Ajah in a circle. Have Riley defeat the circle in a cutscene using callendor. Twinkletoes is able to channel and they link and battle Lanfear together both in the cutscene and the game (you'll need artwork for the combined Riley and Twinkletoes). For the final scene after an intense one power battle with fireballs Lanfear screams 'I am the queen of love and beauty!' Twinkletoes and Riley launch a huge fireball pushing Lanfear through a door/portal like the one she went through with moraine. Lanfear screams 'Not again! Not the snake people! Ahhhhhhh!' Twinkletoes does a sassy walk dance and says 'Bubby you saved me! But what took you so long?' Riley replies 'Too many snack breaks.'

## Decisions this request makes (supersedes docs/CAMPAIGN-ARC-PLAN.md where they conflict)

- Stage 8 is the FINAL level and is at Dumai's Wells. (CAMPAIGN-ARC-PLAN.md had Stage 8 = Cairhien siege, Stage 9 = Dumai's Wells finale with "TDOG"; Jason's new request replaces that: there is no Stage 9, Lanfear is the final boss.)
- Shaido replace Trollocs as the rank-and-file enemies.
- Allies fight alongside: Asha'man, Perrin, Loial, "and everyone else" (e.g. Two Rivers men, Maidens, Wise Ones, Aiel) in background/foreground.
- Every 60 s Mazrim Taim yells "Asha'man, kill!" and a wave of rolling earth and fire sweeps the field; Riley must dodge it.
- Opening scene: Rand shielded, in the box (the chest), "talking" to Lews Therin while trying to break the saidar shield.
- Black Ajah circle guards Twinkle Toes; Riley breaks it in a cutscene using Callandor.
- Twinkle Toes channels; Riley and Twinkle Toes link and fight Lanfear together in cutscene AND gameplay (needs combined Riley+Twinkle Toes art).
- Final boss Lanfear (jealous because Twinkle Toes was crowned Queen of Love and Beauty at Medieval Times). Intense One Power fireball duel.
- Finale lines (exact): Lanfear "I am the queen of love and beauty!" → linked huge fireball pushes her through a redstone doorway/portal (like the one she fell through with Moiraine) → Lanfear "Not again! Not the snake people! Ahhhhhhh!" → Twinkle Toes sassy walk dance: "Bubby you saved me! But what took you so long?" → Riley: "Too many snack breaks."
- Best artwork in the game.
- Music: Suno, based on Jason's prior "Asha'man Kill" song, with Nordic-style vocals.

## Context rules

- Riley is Jason's real 16-year-old son: muscular, short dark hair, blue glasses, sleeveless black Asha'man coat, fingerless gloves, black pants and boots. In VIDEO he is ALWAYS shown from behind; his face is never visible.
- Twinkle Toes is Riley's little sister (kidnapped by the Fade from a dance recital in Stage 1; revealed to channel lightning at the Stone in Stage 6). Keep her depiction consistent with the repo. CAMPAIGN-ARC-PLAN decision A3: her face is not shown in video (from behind / silhouette) unless Jason says yes.
- Riley's voice (ElevenLabs, see assets/audio/riley-voice-manifest*.json) and the narrator setup already exist — reuse them.
- Google Flow refuses named characters / prominent people: video prompts must describe characters without names.
- Hard rules from earlier stages (src/input.js, lib/, index.html must not change; control parity) still apply.

## Music source note (found by the executor before planning)

No file or commit in the repo, Drive, or Gmail is titled "Asha'man Kill". Jason's only Suno track in the repo is `assets/audio/music-main.mp3` (Stage 1 / main theme; AUDIO_PROVENANCE.md: "Jason's Suno track", 2:45.92 source). Its Suno metadata identifies it as "Hero's Quest" by jfeldman9 (suno.com/song/976469fd-9d52-4188-ad49-486482e28a9b; tags arcade, fantasy, retro; instrumental). The "Asha'man Kill" song is therefore probably in Jason's Suno library but not in the repo — confirm with Jason (open question).
