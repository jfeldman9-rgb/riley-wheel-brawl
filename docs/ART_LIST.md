# Riley Wheel Brawl — Painted Image Contract

This is the complete proposed list of painted raster files loaded by the finished game. Dimensions are source-pixel targets, not CSS sizes. Use WebP with alpha only where noted. All paths are relative to the repository root and every runtime request must append the same `?v=` cache stamp used by scripts and audio.

Every file is **optional at runtime**. If an image is absent, corrupt, or fails both the first request and retry, the game must draw a deliberately composed procedural placeholder and continue. Missing critical gameplay/title plates must also produce the existing red load-failure banner; missing lazy cutscene stills should be reported in the console without blocking the reel.

## Title, logo, and portraits

| Filename | Size | Alpha | Description |
| --- | ---: | :---: | --- |
| `assets/art/title-riley-hero.webp` | 1280×720 | No | Main key art: Riley in black coat and blue glasses guarding Twinkle Toes from a ring of Shadowspawn, with clear space for the menu. |
| `assets/art/logo-riley-hero.webp` | 1200×420 | Yes | Gold-and-blue arcade logo with a turning-wheel motif and readable title at 640×360. |
| `assets/art/portrait-riley.webp` | 512×512 | Yes | Riley bust for title/victory: short dark hair, thin blue frames, black coat, sword-and-dragon pins. |
| `assets/art/portrait-riley-hud.webp` | 256×256 | Yes | Tight, high-contrast Riley face crop for the round HUD bezel and low-health flash. |
| `assets/art/portrait-moiraine.webp` | 512×512 | Yes | Calm Moiraine dialogue portrait with blue-white channeling light. |
| `assets/art/portrait-twinkle-toes.webp` | 512×512 | Yes | Kenzie, about eight, in blue dancer-inspired clothes, confident and kid-like. |
| `assets/art/portrait-loial.webp` | 512×512 | Yes | Friendly Loial dialogue/call portrait with broad features, bookish warmth, and axe visible. |
| `assets/art/portrait-taim.webp` | 512×512 | Yes | Mazrim Taim portrait, commanding and ominous without horror imagery. |

## Gameplay character atlases

Atlases are painted images too and are listed so the art handoff is exhaustive. `tools/bake_art.py` should generate the final packed files and `js/artdata.js` foot-anchor/frame metadata. Walkers require at least four distinct walk frames: two contacts and two passing positions.

| Filename | Size | Alpha | Description |
| --- | ---: | :---: | --- |
| `assets/art/atlas-riley.webp` | 2048×2048 | Yes | Riley's complete rig: idle, 4+ walk frames, three kicks and winds, jump/kick, grab/throw, fire, super, hurt/down, Callandor, victory. |
| `assets/art/atlas-trolloc.webp` | 2048×1536 | Yes | Several readable Trolloc variants with real walk, melee, hurt, down, and defeat poses. |
| `assets/art/atlas-trolloc-chieftain.webp` | 1536×1536 | Yes | Heavy armored Trolloc chieftain with real walk and slow telegraphed attacks. |
| `assets/art/atlas-darkfriend.webp` | 1536×1536 | Yes | Caemlyn Darkfriend with real walk, feint, strike, hurt, and down poses. |
| `assets/art/atlas-fade.webp` | 2048×1536 | Yes | Myrddraal mini-boss with cloak-aware walk, sword tells, attacks, phases, stagger, and defeat. |
| `assets/art/atlas-mashadar-cultist.webp` | 1536×1536 | Yes | Shadar Logoth ground enemy with real walk, lantern/weapon attacks, hurt, and down poses. |
| `assets/art/atlas-draghkar.webp` | 2048×1536 | Yes | Draghkar boss with a true flight cycle, dive/sonic tells, attacks, stagger, and defeat. |
| `assets/art/atlas-stone-guard.webp` | 1536×1536 | Yes | Hostile Stone guard with real walk, spear attacks, hurt, and down poses. |
| `assets/art/atlas-forsaken.webp` | 2048×1536 | Yes | Stage 4 Forsaken boss with channeling tells, attacks, phases, stagger, and defeat. |
| `assets/art/atlas-turned-ashaman.webp` | 2048×1536 | Yes | Turned Asha'man variants with real walk, guarded stance, fire/lightning attacks, hurt, and down poses. |
| `assets/art/atlas-taim.webp` | 2048×2048 | Yes | Taim's roof-boss poses across all phases, including shields, tells, stagger, and joint-finish reaction. |
| `assets/art/atlas-loial.webp` | 1536×768 | Yes | Loial's entrance, multi-frame axe charge, impact, and exit poses. |
| `assets/art/atlas-twinkle-toes.webp` | 1536×1024 | Yes | Kenzie's idle/dance energy, lightning channel, joint-finish, and victory poses. |
| `assets/art/atlas-props-pickups.webp` | 2048×1024 | Yes | Fantasy breakables, power sparks, Moiraine heal tokens, angreal, Callandor, debris, impact decals, and HUD pickup icons. |

## Stage 1 — Emond's Field on Winternight

| Filename | Size | Alpha | Description |
| --- | ---: | :---: | --- |
| `assets/art/stage1-emonds-field-far.webp` | 1920×720 | No | Moonlit Two Rivers hills, clouds, and distant farm lights under a cold blue sky. |
| `assets/art/stage1-emonds-field-mid.webp` | 2560×720 | Yes | Thatched cottages, Winespring Inn silhouettes, bare trees, lanterns, and distant Winternight commotion. |
| `assets/art/stage1-emonds-field-near.webp` | 2560×720 | Yes | Fences, carts, snow/mud edges, barrels, and village props framing the combat lane. |
| `assets/art/stage1-emonds-field-floor.webp` | 1024×720 | No | Seamless moonlit village road and common with readable lane contrast and grounded shadows. |

## Stage 2 — Caemlyn streets

| Filename | Size | Alpha | Description |
| --- | ---: | :---: | --- |
| `assets/art/stage2-caemlyn-far.webp` | 1920×720 | No | Warm sunset skyline of white walls, red roofs, towers, and the distant palace. |
| `assets/art/stage2-caemlyn-mid.webp` | 2560×720 | Yes | Crowded plaster-and-timber street fronts, balconies, banners, arches, and shuttered shops. |
| `assets/art/stage2-caemlyn-near.webp` | 2560×720 | Yes | Carts, fountain edges, lamp posts, awnings, and foreground masonry for depth. |
| `assets/art/stage2-caemlyn-floor.webp` | 1024×720 | No | Seamless sun-warmed cobblestones with clear fight lanes and restrained reflections. |

## Stage 3 — Shadar Logoth

| Filename | Size | Alpha | Description |
| --- | ---: | :---: | --- |
| `assets/art/stage3-shadar-logoth-far.webp` | 1920×720 | No | Starless violet night behind immense ruined domes and leaning towers. |
| `assets/art/stage3-shadar-logoth-mid.webp` | 2560×720 | Yes | Cracked facades, empty windows, arches, and pale creeping Mashadar strands. |
| `assets/art/stage3-shadar-logoth-near.webp` | 2560×720 | Yes | Broken statuary, rubble, dead vines, and framing ruins that do not hide hazard tells. |
| `assets/art/stage3-shadar-logoth-floor.webp` | 1024×720 | No | Seamless fractured stone roadway with strong lane readability under fog overlays. |

## Stage 4 — Stone of Tear

| Filename | Size | Alpha | Description |
| --- | ---: | :---: | --- |
| `assets/art/stage4-stone-of-tear-far.webp` | 1920×720 | No | Dawn over Tear and the river, seen through monumental high windows. |
| `assets/art/stage4-stone-of-tear-mid.webp` | 2560×720 | Yes | Vast fortress halls, polished columns, banners, torchlight, and Callandor's distant glow. |
| `assets/art/stage4-stone-of-tear-near.webp` | 2560×720 | Yes | Foreground pillars, weapon racks, torn hangings, and crystal-lit architectural details. |
| `assets/art/stage4-stone-of-tear-floor.webp` | 1024×720 | No | Seamless polished black-and-gold stone floor with controlled reflections. |

## Stage 5 — Black Tower and roof

| Filename | Size | Alpha | Description |
| --- | ---: | :---: | --- |
| `assets/art/stage5-black-tower-far.webp` | 1920×720 | No | Storm clouds and distant training grounds surrounding the stark Black Tower complex. |
| `assets/art/stage5-black-tower-mid.webp` | 2560×720 | Yes | Severe stone corridors, practice yards, black banners, and channeling-scorched walls. |
| `assets/art/stage5-black-tower-near.webp` | 2560×720 | Yes | Racks, broken masonry, foreground arches, and wind-tossed cloth for combat depth. |
| `assets/art/stage5-black-tower-floor.webp` | 1024×720 | No | Seamless dark flagstone lane with rain sheen and high-contrast character grounding. |
| `assets/art/stage5-taim-roof-far.webp` | 1920×720 | No | Lightning storm panorama beyond the tower roof for the final battle. |
| `assets/art/stage5-taim-roof-mid.webp` | 1920×720 | Yes | Battlements, roofline, whipping banners, and distant lightning rods behind Taim. |
| `assets/art/stage5-taim-roof-floor.webp` | 1024×720 | No | Seamless rain-dark roof stone with safe reflection levels beneath boss tells. |

## Cutscene stills

The opening is a four-beat reel. Each stage has one story sequence; a sequence may pan between the listed stills without requiring additional painted files. The final Black Tower sequence includes the resolution, so no separate ending-image family is required.

| Filename | Size | Description |
| --- | ---: | --- |
| `assets/cutscenes/opening-01-winters-night.webp` | 1280×720 | Kenzie finishes a blue-costumed dance step as an unnatural storm gathers beyond the window. |
| `assets/cutscenes/opening-02-capture.webp` | 1280×720 | Shadowy Forsaken agents surround Kenzie; she stands defiant, with no restraints or frightening violence shown. |
| `assets/cutscenes/opening-03-taim-order.webp` | 1280×720 | Taim in the Black Tower orders that the brave young channeler be brought to him. |
| `assets/cutscenes/opening-04-riley-vow.webp` | 1280×720 | Moiraine warns Riley; he fastens his black coat and vows to bring his sister home. |
| `assets/cutscenes/stage1-emonds-field.webp` | 1280×720 | Riley and Moiraine overlook Emond's Field as Trollocs crash into Winternight celebrations. |
| `assets/cutscenes/stage2-caemlyn.webp` | 1280×720 | A Fade turns beneath a Caemlyn arch while Riley spots its trail through the crowd. |
| `assets/cutscenes/stage3-shadar-logoth.webp` | 1280×720 | Riley crosses ruined streets as silver Mashadar curls behind him and a Draghkar circles above. |
| `assets/cutscenes/stage4-callandor-reveal.webp` | 1280×720 | Callandor blazes in Riley's hand while Twinkle Toes answers with a small, brilliant lightning arc. |
| `assets/cutscenes/stage5-black-tower-finale.webp` | 1280×720 | On the stormy roof, Riley and Twinkle Toes combine balefire and lightning against Taim. |
| `assets/cutscenes/stage5-homecoming.webp` | 1280×720 | Safe after the battle, Riley, Kenzie, Moiraine, and Loial share Kenzie's victory dance. |

## Placeholder and loading requirements

- **Title:** fallback uses the procedural Stage 1 background, procedural Riley, and text-rendered logo/menu.
- **Portraits:** fallback uses the speaker medallion/initial system and procedural Riley HUD face.
- **Character atlases:** fallback uses code-drawn bodies for every required state; no invisible actor is acceptable.
- **Stage layers:** fallback draws each location from cached Canvas primitives with equivalent floor bounds, contrast, and hazard readability.
- **Cutscenes:** fallback composes location colors, silhouettes, speaker medallions, name cards, captions, and ambient effects; dialogue must carry the whole plot.
- **Retry:** painted images retry once with a cache-busting retry parameter. Failed critical files appear in the red load-failure banner; lazy story failures log but never stall longer than the cutscene wait cap.
- **Versioning:** image and audio sources are formed as `relative/path.ext?v=<release>`; a retry may append `&r=<timestamp>`. Script tags retain `?v=<release>` as well.
