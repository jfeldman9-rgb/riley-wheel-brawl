# Stage 2: Baerlon and the Whitecloaks

Riley follows the Fade's trail north through the rain to Baerlon. He finds Twinkle Toes' ribbon outside the Stag and
Lion. The Children of the Light see a boy who channels, take him for a Darkfriend, and chase him through the muddy
streets and into a stable that comes down around him. The boss is Jaret Byar, Child of the Light.

The stage is kid-safe. There is no gore. A beaten Whitecloak is either knocked out (dizzy stars, then he fades) or
gets up and runs away, alternating so each is reproducible from the seed. Byar kneels, then turns and walks off.

## How to play and test it

| What | How |
| --- | --- |
| Campaign | Beat the Stage 1 Chieftain, then press attack on the clear card. Stage 2 loads, the story beat plays, then the fight starts. Clearing Stage 2 goes back to Stage 1. |
| Stage select | On the title, Left/Right (or tap the ◀ ▶ arrows) chooses STAGE 1 or STAGE 2. Starting a different stage reloads the scene with that stage's art. |
| Jump straight to Stage 2 | `index.html?stage=2` |
| Skip the story beat | add `&story=0` (or press Start/Esc during it; Attack advances a line) |
| Boss arena | `?stage=2&skip=boss` |
| Demo bot / invulnerable | `&demo=1`, `&god=1` (as in Stage 1) |

Only one stage's backdrop and enemy atlases stay in memory. Switching stages releases the other stage's art, and the
Twix art is Stage 1 only. Riley, the hounds and Loial are shared and stay loaded.

## Layout (4 zones, about 3–3.5 min for the bot)

1. **Market street** (Stag and Lion): 2 zealots, then archer + zealot. Intro bark: "Halt, Darkfriend!"
2. **Inn yard**: zealot + archer, then zealot, archer, zealot. Twinkle Toes' **ribbon** drops here (collectible, +1000).
   The one new joke happens here: the first zealot beaten in this zone slips in the mud ("My cloak! Do you know how
   hard it is to get mud out of white wool?" Riley: "Try cold water.").
3. **The stable**: hound Trollocs (the Fade left guards behind, so they fit the story), then zealot + archer + hound.
   Beams fall from the rafters with a growing shadow warning first. When the last wave is down, the stable collapses
   behind Riley as he runs out.
4. **Boss, Jaret Byar** in the stable yard.

Drops follow the same table system as Stage 1, re-timed for Baerlon: angreal, air whip, lightning, fire shield, a
random ter'angreal, a second angreal, and the sa'angreal at Byar's phase 2. Balefire, the Loial call and all
pickups work unchanged. The fire shield and balefire also burn arrows out of the air.

## New enemies

**Whitecloak zealot** (shield + charge, 46 HP)
- His raised shield blocks light and medium hits from the front: no damage and no combo. Hit him three times in a
  row, from behind, or with heavy hits, knockdowns or powers to break through. After 3 blocks his guard breaks.
- Shield charge: a 0.5 s wind-up with a glint, then 540 px/s along his lane. If he hits Riley, Riley is knocked
  down. If he misses and hits the wall, he is dazed for 1.8 s and takes ×1.3 damage.

**Whitecloak archer** (30 HP)
- Keeps 420–520 px away and backsteps if Riley gets closer than 230.
- Arrows leave the bow on the release frame and fly along his lane, so change lanes or jump.
- Lobbed arrows (from zone 2) mark the ground with a red ring 1.15 s before they land, so step off the mark.
- Only one archer draws at a time.

## Boss: Jaret Byar (400 HP, 3 phases)

1. **Sword and shield** (100–66%): a two-hit combo, the second a knockdown thrust. **Parry bait:** he raises his
   shield ("PARRY STANCE! DON'T HIT HIS SHIELD. WAIT"). Hitting it from the front triggers a knockdown riposte, and
   fireballs just glance off. Wait it out and he is open for 0.9 s, taking ×1.4 damage.
2. **Archer volleys** (66–33%): "Archers! Cover the yard!" Red lane-band markers warn 1.45 s before arrows rain on
   the marked bands. Riley's band is always marked, sometimes a second band too, but one band is always safe. Change
   lanes to dodge. A hit is a knockdown.
3. **Rage** (33–0%): he torches the barn ("Burn the barn! Smoke the Darkfriend out!"). Flames, embers, smoke and three
   fire lights come up on the barn. He throws torches that leave burning patches, and does a shield rush: a
   crouched wind-up, then a run, then a shield bash with a recovery window.

He takes reduced damage (×0.6) while volleying, raging, throwing, winding up, rushing, riposting or just after
getting up. A riposte or volley never ends in a "kill": at 0 HP he kneels, then retreats.

## Art (all painted with ChatGPT image generation through the Codex CLI on jfeldman9@gmail.com)

No Grok stills, no Gemini needed (it was the fallback only), no Seedance/Manus, no Claude CLI, no paid usage.
Post-processing was limited to background removal (alpha from the tool), slicing, cropping, uniform downscaling,
baseline/anchor registration and atlas packing. Nothing was recoloured, blurred, interpolated or mirrored into a
new pose. The only flips are facing flips (allowed): frames painted facing right were mirrored to face left like
every other sprite (zealot flee 4–7, archer flee 4–7, Byar retreat 7).

| Asset | Sheets (tries) | Used frames / notes |
| --- | --- | --- |
| Zealot master + 4 sheets | zealot-master (1), zealot-a (3), b (3), c (2), d (3) | 32 frames. Rejected zealot-a #8 (head faces right while pointing left). |
| Archer master + 3 sheets | archer-master (2), archer-a/b/c (3 each) | 28 frames |
| Byar master + 6 sheets + portrait | byar-master (2), byar-a..f (3 each), byar-portrait (1) | 47 frames. Rejected byar-b #7 (shield missing) and #8 (hands swapped), and byar-e #4 (torch drawn behind him). byar-f added the 6-frame rush and 2 rage frames. |
| Backdrop | bg-plates: far, Baerlon street + Stag and Lion, stable yard + barn, 2 mud floors | normal maps derived from the paintings for dynamic lighting |
| Props / FX | props-fx: crate (+broken planks), roof beam, arrow, torch, ribbon icon | |
| Story beat | story-panels: 3 painted 1280×720 panels | Riley on-model (16, muscular, short dark hair, thin blue glasses, sleeveless black Asha'man coat); a tiny blue glimpse of Twinkle Toes; the ribbon; Byar and his men in the rain |

Every master was locked before its sheets, and every sheet was generated with the master attached. Every frame was
viewed (contact sheets in the PR / `shots/contact-*.jpg`). Every attack has at least 5 painted frames: zealot
slash 5 and charge sequence 6; archer shoot 6 and lobbed shot 5; Byar combo 6, riposte 5, volley 5, torch 5, rush
sequence 6. This is enforced by `tests/stage2-assets.test.mjs`. Prompts and try counts are in
`docs/stage2/prompts/`.

Lighting: `assets/bg2/lights.json` has 13 lanterns (world-space lights riding the mid plates, at most 4 on screen),
the barn fire, an ambient colour, lightning flashes with thunder every 11–19 s (stopping after the win), and
two layers of rain plus splashes.

## Audio

Music: see `assets/audio/AUDIO_PROVENANCE.md` (four new original loops, plus Jason's 1.1 Stage 1 theme with its
1.1 loop restored). Voices: see `assets/audio/VOICE_PROVENANCE.md` (19 Kokoro lines). Rain ambience is procedural.

## Tests

- `tests/stage2-whitecloaks.test.mjs`: zealot guard/break/charge/daze, archer spacing/release frame/lane/fire
  shield/turn-taking/lobbed mark, Byar phases/parry→riposte/open/fireball glance/volley safe band/rage+torches/kid-safe
  defeat, KO vs flee.
- `tests/stage2-flow.test.mjs`: `?stage=2` (child-process probe), stage art load/release, Stage 1 clear → story →
  Stage 2 → Stage 1, title select, MusicDirector transitions and fades, music during real play, production audio
  backend (loop points, equal-power crossfade, boss restart, at most 2 decoded tracks).
- `tests/stage2-campaign.test.mjs`: the campaign bot clears Stage 2 on all 9 Stage 1 seeds with per-frame invariants,
  all 3 phases, ribbon/mud joke/collapse once, no Twix, and resources settling afterwards.
- `tests/stage2-assets.test.mjs`: atlas geometry, ≥5 frames per attack, voices/music present and sized,
  provenance recorded.
