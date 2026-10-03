# Angreal / ter'angreal / Twix art list (Riley Wheel Brawl 2.0, Stage 1)

> **Status (Oct 3 2026): all 18 assets are painted and live (`ready: true`); no placeholders remain.**
> Painted with ChatGPT image generation via the Codex CLI (jfeldman9@gmail.com account, the same pipeline as the
> Stage 1 balefire repaint), with no Grok, Gemini, Seedance/Manus or Claude CLI and no paid usage. Post-processing was
> limited to cropping, downscaling, black-to-alpha keying for the additive FX, and placing frames on the grid.
> Riley's 6 lightning-cast frames are also packed into his atlas as page `riley-1` (anim `riley_lightning`,
> normal maps included) on the shared 960x640 canvas, with feet on y=610. `fx_airwhip.png` is 512x64, not 48 high, so
> the tendril isn't clipped. The original prompts are kept below for reference.

Every file below already exists in `assets/powers/` as a **clearly labelled placeholder** at its final pixel size
and frame layout (made by `tools/make-power-placeholders.py`; they are labelled cards, not art). Replace each one
with the painted file **using the same filename, size and layout**. No code change is needed except where marked
**flip `ready`**.

18 files: 6 pickup icons, 5 HUD icons, 3 effect sheets, 1 Riley lightning-cast sheet (6 frames), 3 cutscene paintings.

## House style (already built into every prompt below)

Hand-painted 2D fighting-game sprite art like the existing Stage 1 cast: clean dark outlines, painterly cel shading
with soft gradients, rich saturated colour, rim light, crisp readable silhouette, side-scrolling beat-'em-up view.
Wheel of Time, Two Rivers on Winternight: snowy thatched village at night, warm orange firelight against cold blue
moonlight. No text, no letters, no logos, no watermark, no UI frame. Sprites/icons on a fully transparent
background (PNG with alpha, no drop shadow baked onto the background, no white halo).

**Riley** (ref `/workspace/riley-refs/riley.jpg`): 16-year-old, very muscular, broad shoulders, big arms, short dark
brown hair, thin blue-framed rectangular glasses, friendly face; sleeveless black Asha'man coat (long, high
collar, split skirt to the shins), black fingerless gloves, black trousers and boots. Same look as the in-game sprite
sheet `assets/chars/riley-0.webp`.

**Trollocs** must match `assets/chars/grunt-0.webp`, `spear-0.webp`, `hound-0.webp` exactly:
- Grunt Trolloc: huge, hunched, ram-like curved tan horns, boar-like snout with tusks, dark brown fur, spiked iron
  shoulder pauldrons, studded leather harness, ragged red loincloth, curved scimitar.
- Spear Trolloc: lean goat-headed Trolloc, long swept-back ridged tan horns, dark grey-brown fur, brown leather
  armour with small spikes, green leaf-patterned loincloth, hoofed legs, long spear.
- Hound Trolloc: wolf-headed Trolloc, shaggy grey-brown mane, tan skin, bone-tooth necklace, leather straps,
  dark fur kilt, two small hand axes.

## 1. Pickup icons (shown in the world at ~67 px, glow drawn under them by the game)

| File | Size | Transparent | Frames |
| --- | --- | --- | --- |
| `pu_angreal.png` | 96×96 | yes | 1 |
| `pu_saangreal.png` | 96×96 | yes | 1 |
| `pu_lightning.png` | 96×96 | yes | 1 |
| `pu_fireshield.png` | 96×96 | yes | 1 |
| `pu_airwhip.png` | 96×96 | yes | 1 |
| `pu_twix.png` | 96×96 | yes | 1 |

Prompts (generate at 1024×1024, then downscale to 96×96 with a 4 px transparent margin):

- **pu_angreal.png**: `Hand-painted fantasy game item icon, a small angreal from the Wheel of Time: a palm-sized carved figurine of an old man holding a staff, carved from warm golden amber stone, softly glowing from inside, gold highlights, dark clean outline, painterly cel shading, centred, bold readable silhouette, fully transparent background, no text, no shadow on background.`
- **pu_saangreal.png**: `Hand-painted fantasy game item icon, a powerful sa'angreal from the Wheel of Time: a tall crystal sword-shaped artifact of clear pale-gold crystal blazing with white-gold light from inside, tiny sparkles around it, clearly grander than a small amber figurine, dark clean outline, painterly cel shading, centred, bold readable silhouette, fully transparent background, no text, no shadow on background.`
- **pu_lightning.png**: `Hand-painted fantasy game item icon, a ter'angreal of lightning from the Wheel of Time: a twisted silver-and-blue metal rod with a cracked sapphire at its tip, small blue-white electric arcs crawling around it, dark clean outline, painterly cel shading, centred, bold readable silhouette, fully transparent background, no text, no shadow on background.`
- **pu_fireshield.png**: `Hand-painted fantasy game item icon, a ter'angreal of fire from the Wheel of Time: a bronze arm ring set with a glowing red-orange gem, a thin ring of small flames circling around it, dark clean outline, painterly cel shading, centred, bold readable silhouette, fully transparent background, no text, no shadow on background.`
- **pu_airwhip.png**: `Hand-painted fantasy game item icon, a ter'angreal of air from the Wheel of Time: a pale silver bracelet of braided wire with a white opal, a coiled translucent pale-cyan ribbon of wind curling around it like a whip, dark clean outline, painterly cel shading, centred, bold readable silhouette, fully transparent background, no text, no shadow on background.`
- **pu_twix.png**: `Hand-painted fantasy game item icon, a single chocolate caramel cookie candy bar in a plain gold wrapper torn open at one end showing two chocolate fingers, glowing faintly as if magical, slightly tilted, no brand name and no letters on the wrapper, dark clean outline, painterly cel shading, centred, bold readable silhouette, fully transparent background, no shadow on background.`

## 2. HUD icons (shown at 36 px beside the power timer, top-left under the health bars)

| File | Size | Transparent | Frames |
| --- | --- | --- | --- |
| `hud_angreal.png` | 48×48 | yes | 1 |
| `hud_saangreal.png` | 48×48 | yes | 1 |
| `hud_lightning.png` | 48×48 | yes | 1 |
| `hud_fireshield.png` | 48×48 | yes | 1 |
| `hud_airwhip.png` | 48×48 | yes | 1 |

Prompts (generate at 512×512, downscale to 48×48; simpler than the pickups so they read at 36 px):

- **hud_angreal.png**: `Simple bold game HUD emblem, a tiny golden amber figurine silhouette inside a round dark-gold medallion, thick dark outline, flat painted shading, high contrast, very simple shapes, fully transparent background, no text.`
- **hud_saangreal.png**: `Simple bold game HUD emblem, a white-gold crystal sword shape blazing with light inside a round pale-gold medallion with small rays, thick dark outline, flat painted shading, high contrast, very simple shapes, fully transparent background, no text.`
- **hud_lightning.png**: `Simple bold game HUD emblem, a jagged blue-white lightning bolt inside a round dark-blue medallion, thick dark outline, flat painted shading, high contrast, very simple shapes, fully transparent background, no text.`
- **hud_fireshield.png**: `Simple bold game HUD emblem, a ring of orange flames circling a small dark figure inside a round dark-red medallion, thick dark outline, flat painted shading, high contrast, very simple shapes, fully transparent background, no text.`
- **hud_airwhip.png**: `Simple bold game HUD emblem, a curling pale-cyan whip of wind with a hooked tip inside a round slate-grey medallion, thick dark outline, flat painted shading, high contrast, very simple shapes, fully transparent background, no text.`

## 3. Power effect sheets (additive blend; drawn procedurally until you **flip `ready`** in `src/powers.js` `ART.fx`)

| File | Size | Transparent | Frames | Layout |
| --- | --- | --- | --- | --- |
| `fx_lightning.png` | 512×192 | yes | 3 | 512×64 each, stacked vertically |
| `fx_fireshield.png` | 384×320 | yes | 2 | 384×160 each, stacked: frame 0 = back half of the ring, frame 1 = front half |
| `fx_airwhip.png` | 512×64 | yes | 1 | single strip (was 512×48; taller so the curl is not clipped) |

The game stretches each strip between two points (Riley's hand → enemy, enemy → enemy), so paint them
**horizontal, left-to-right, edge to edge**, centred vertically, on pure transparency (or pure black if your tool
cannot do alpha; they are drawn with additive blending).

- **fx_lightning.png**: `Three variations of a horizontal forked lightning bolt for a 2D fighting game effect, each running edge to edge left to right in a long thin 8:1 strip, bright white-hot core with electric blue glow and small side forks, painted style matching hand-painted fantasy sprites, stacked in three rows, fully transparent background, no text.`
- **fx_fireshield.png**: `Game effect sprite of a flat ellipse ring of magical fire seen from a low side-on angle, as if lying on the ground around a fighter's waist, orange and yellow flames with ember sparks, painted fantasy style; top row only the far (back) half of the ring, bottom row only the near (front) half, both rows aligned to the same ellipse, fully transparent background, no figure, no text.`
- **fx_airwhip.png**: `Horizontal game effect strip of a lash of wind, a translucent pale-cyan and white twisting ribbon of air with faint swirl lines, thin at the left, thicker and curling into a hook at the right end, running edge to edge in a long 10:1 strip, painted fantasy style, fully transparent background, no text.`

## 4. Riley lightning-cast frames (used once you **flip `ready`** in `src/powers.js` `ART.rileyLightning`; until then Riley uses his fireball cast)

| File | Size | Transparent | Frames | Layout |
| --- | --- | --- | --- | --- |
| `riley_lightning.png` | 2880×1280 | yes | 6 | 3 columns × 2 rows of 960×640 frames, left-to-right then top-to-bottom |

Same canvas as Riley's atlas frames (`assets/chars/riley.anims.json`: canvas 960×640): **feet on y = 610**, body
anchor at **x = 432** (45 %), facing **right**, same scale as the existing sprite (Riley ≈ 450 px tall). The bolt
leaves his hand on **frame 3**. Holds: 80, 90, 110, 160, 130, 90 ms. (Optional: if the atlas packer is used, pack
these as `riley_lightning_00..05` into the Riley atlas with normal maps and add the anim to `riley.anims.json`.)

Frames: 0 wind-up (weight back, left hand forward, right hand drawn back by the hip), 1 crackle (sparks gather in the
right palm, glasses catch blue light), 2 rising (right arm sweeps up and forward, coat skirt swings), 3 release (arm
fully extended forward, open palm, small blue-white burst at the fingers), 4 follow-through (arm still out, sparks
fading, slight recoil), 5 recover (back to fighting stance).

Prompt (generate each frame with the same seed/character reference, then place on the grid):
`Hand-painted 2D fighting-game sprite, full body side view facing right, Riley: a 16-year-old very muscular young man with broad shoulders and big arms, short dark brown hair, thin blue-framed rectangular glasses, sleeveless long black Asha'man coat with a high collar and split skirt, black fingerless gloves, black trousers and boots, channeling lightning: [FRAME POSE FROM THE LIST ABOVE], blue-white electric sparks around his right hand lighting his face and coat with cool blue rim light, clean dark outline, painterly cel shading, same proportions and style as an existing beat-'em-up sprite sheet, feet on a flat ground line, fully transparent background, no text.`

## 5. Twix campfire cutscene paintings (full screen behind the dialogue box; the bottom 200 px sits under the box)

| File | Size | Transparent | Frames |
| --- | --- | --- | --- |
| `twix_panel_1.jpg` | 1280×720 | no | 1 |
| `twix_panel_2.jpg` | 1280×720 | no | 1 |
| `twix_panel_3.jpg` | 1280×720 | no | 1 |

Panel 1 plays under line 1, panel 2 under lines 2–6, panel 3 under lines 7–9 (script in `src/audio.js` `EXTRA_VOICE`).
Keep faces and the campfire in the upper two thirds.

- **twix_panel_1.jpg**: `Hand-painted 2D game cutscene illustration, wide shot, snowy Two Rivers village street on Winternight, a small campfire in the middle of the snowy road, Riley (16-year-old very muscular young man, short dark brown hair, thin blue-framed glasses, sleeveless long black Asha'man coat, black fingerless gloves) sitting on a barrel holding up a chocolate candy bar in a plain gold wrapper with a big grin, three Trollocs sitting around the fire on logs looking at it hungrily: a huge ram-horned boar-snouted Trolloc with spiked shoulder pauldrons and red loincloth, a lean goat-headed Trolloc with long swept-back horns holding a spear, and a wolf-headed Trolloc with a shaggy mane and two small axes, warm orange firelight on faces against cold blue moonlight, thatched cottages with snow behind, gentle funny mood, painterly cel shading with clean outlines matching a hand-painted fantasy beat-'em-up, no text, no logos.`
- **twix_panel_2.jpg**: `Hand-painted 2D game cutscene illustration, close-up of three Trollocs around a campfire in the snow, all munching chocolate candy bars in plain gold wrappers, grumbling and complaining with comic expressions: a huge ram-horned boar-snouted Trolloc with spiked pauldrons pointing angrily at nothing, a lean goat-headed Trolloc with long swept-back horns looking offended and sniffing his own armpit, a wolf-headed Trolloc with a shaggy mane sadly touching his own snout, Riley in a sleeveless black coat and blue-framed glasses at the edge of the frame trying not to laugh, warm firelight against blue moonlit snow, painterly cel shading with clean outlines, kid-friendly comedy, no text, no logos.`
- **twix_panel_3.jpg**: `Hand-painted 2D game cutscene illustration, wide shot, Riley (16-year-old very muscular young man, short dark brown hair, thin blue-framed glasses, sleeveless long black Asha'man coat) standing up from the campfire, stretching and cracking his knuckles with a confident smile, three Trollocs (ram-horned boar-snouted brute, lean goat-headed spear Trolloc, wolf-headed Trolloc) still sitting with empty gold candy wrappers, looking up at him hopefully as if asking for more, snowy thatched village at night, campfire glow and blue moonlight, painterly cel shading with clean outlines, funny warm mood, no text, no logos.`

## Not on this list (on purpose)

- The angreal/sa'angreal aura around Riley, ember trails and impact sparks reuse the game's procedural glow/ember
  effects. No sprites needed.
- No separate Trolloc or Riley campfire sprites: the cutscene uses the three paintings.
- Voices are TTS (`assets/audio/voice/riley_*`, `twix_*`); see `assets/audio/VOICE_PROVENANCE.md`.
