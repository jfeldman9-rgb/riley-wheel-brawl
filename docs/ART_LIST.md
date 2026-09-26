# Riley Wheel Brawl - Painted Image Contract (w2)

These are the runtime filenames. They supersede the earlier descriptive WebP names. All delivered images are registered; procedural artwork is retained for missing files.

Add each delivered file's relative path to `RWB.ART_MANIFEST` in `js/artmanifest.js`. `RWB.ART_FILES` maps every logical key below to its path. Registration is automatic in `js/campaign.js`; the loader appends `?v=20260926-w2`. Unlisted files generate zero requests. Listed files that fail retry once, then keep their procedural fallback. Failed gameplay assets show a red banner; lazy story failures do not block scene advancement.

## Stage layers

Far and floor files are opaque JPEG. Mid and near files are PNG with real alpha. For mid layers, keep the sky transparent; for near layers, keep the top and center transparent and paint only the bottom edge. The foreground must not hide attacks or lane warnings. Suggested source size: 1920x1080 or wider; floor textures should tile horizontally.

| Stage | Far | Floor | Mid | Near |
| --- | --- | --- | --- | --- |
| 1. Emond's Field | `assets/art/stage1-far.jpeg` | `assets/art/floor1.jpeg` | `assets/art/stage1-mid.png` | `assets/art/stage1-near.png` |
| 2. Caemlyn | `assets/art/stage2-far.jpeg` | `assets/art/floor2.jpeg` | `assets/art/stage2-mid.png` | `assets/art/stage2-near.png` |
| 3. Shadar Logoth | `assets/art/stage3-far.jpeg` | `assets/art/floor3.jpeg` | `assets/art/stage3-mid.png` | `assets/art/stage3-near.png` |
| 4. Stone of Tear | `assets/art/stage4-far.jpeg` | `assets/art/floor4.jpeg` | `assets/art/stage4-mid.png` | `assets/art/stage4-near.png` |
| 5. Black Tower roof | `assets/art/stage5-far.jpeg` | `assets/art/floor5.jpeg` | `assets/art/stage5-mid.png` | `assets/art/stage5-near.png` |

## Character cutouts, portraits and logo

PNG with real alpha. Character figures use a centered foot anchor and fit completely inside the canvas. The `cg-*` cutouts feed the articulated rigs in `puppets.js`; they are no longer drawn as static walking poses. Missing sources retain code-drawn fallbacks. Portraits are square. The logo is wide and reads “RILEY WHEEL BRAWL”. Be'lal is the Stage 4 `forsaken` figure; Taim is a human in a black coat with dragon-trimmed sleeves. `portrait-twinkle.png` maps to the dialogue speaker `kenzie`.

| Logical key | Filename |
| --- | --- |
| `portrait-riley` | `assets/art/portrait-riley.png` |
| `portrait-twinkle` | `assets/art/portrait-twinkle.png` |
| `portrait-moiraine` | `assets/art/portrait-moiraine.png` |
| `portrait-loial` | `assets/art/portrait-loial.png` |
| `portrait-taim` | `assets/art/portrait-taim.png` |
| `portrait-fade` | `assets/art/portrait-fade.png` |
| `portrait-draghkar` | `assets/art/portrait-draghkar.png` |
| `portrait-forsaken` | `assets/art/portrait-forsaken.png` |
| `cg-riley` | `assets/art/cg-riley.png` |
| `cg-twinkle` | `assets/art/cg-twinkle.png` |
| `cg-trolloc` | `assets/art/cg-trolloc.png` |
| `cg-trolloc-chieftain` | `assets/art/cg-trolloc-chieftain.png` |
| `cg-darkfriend` | `assets/art/cg-darkfriend.png` |
| `cg-fade` | `assets/art/cg-fade.png` |
| `cg-cultist` | `assets/art/cg-cultist.png` |
| `cg-draghkar` | `assets/art/cg-draghkar.png` |
| `cg-stone-guard` | `assets/art/cg-stone-guard.png` |
| `cg-forsaken` | `assets/art/cg-forsaken.png` |
| `cg-turned-ashaman` | `assets/art/cg-turned-ashaman.png` |
| `cg-taim` | `assets/art/cg-taim.png` |
| `cg-loial` | `assets/art/cg-loial.png` |
| `logo` | `assets/art/logo.png` |

## Story stills

Opaque 16:9 JPEG, suggested size 1920x1080. The Reel system pans no external camera; it draws the full still with caption and speaker medallion. Missing stills use the stage scenery and procedural characters. No image load can prevent NEXT from advancing exactly once.

| Logical key | Filename |
| --- | --- |
| `cut-opening-01` | `assets/cutscenes/cut-opening-01.jpeg` |
| `cut-opening-02-v2` | `assets/cutscenes/cut-opening-02-v2.jpeg` |
| `cut-opening-03-v2` | `assets/cutscenes/cut-opening-03-v2.jpeg` |
| `cut-opening-04` | `assets/cutscenes/cut-opening-04.jpeg` |
| `cut-stage1` | `assets/cutscenes/cut-stage1.jpeg` |
| `cut-stage2` | `assets/cutscenes/cut-stage2.jpeg` |
| `cut-stage3` | `assets/cutscenes/cut-stage3.jpeg` |
| `cut-stage4` | `assets/cutscenes/cut-stage4.jpeg` |
| `cut-stage5-finale` | `assets/cutscenes/cut-stage5-finale.jpeg` |
| `cut-homecoming` | `assets/cutscenes/cut-homecoming.jpeg` |

`cut-stage4.jpeg` is the Callandor/lightning reveal. `cut-stage5-finale.jpeg` is the joint finish; gameplay still requires live beam collisions before Taim dies. `cut-homecoming.jpeg` is the ending celebration. The opening uses the corrected `-v2` capture and Taim-order images.

Every layer, actor, portrait, and still has a visible code-drawn fallback. Recorded audio is not bundled; exact subtitles and synthesized cues remain available.

## Additional delivered and derived assets

- `title-key.jpeg` is the title background; `logo.png` is rendered above it.
- `stage5-roof-far.jpeg` and `floor-roof.jpeg` replace the tower background/floor
  for the boss arena. `stage5-far.jpeg` and `floor5.jpeg` remain used in waves 1-5.
- `riley-sheet.jpeg` and `twinkle-sheet.jpeg` are the authoritative model sheets.
  `tools/prepare-rigs.py` derives clean-alpha `rig-riley.png` and `rig-twinkle.png`.
- Bosses without dedicated portraits use a face crop of their `cg-*` source.
- All ten `cut-*` stills retain their existing caption/reel routing.
- The supplied `cg-forsaken.png` depicts a red-robed sorceress; this pass uses that
  supplied asset for the Be'lal encounter as requested. It does not redraw the source.
