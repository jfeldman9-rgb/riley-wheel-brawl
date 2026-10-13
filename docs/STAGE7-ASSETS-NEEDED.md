# Stage 7 assets still needed

Stage 7 runs on code-drawn stand-ins and reused Stage 6 files. Nothing below is generated in this pass. Riley, in any future cutscene, is only ever framed from behind: black long coat, short dark hair, fingerless gloves. Never a face, never past profile.

## Reused now

| Need | Stand-in |
|---|---|
| Stage and boss music | `assets/audio/music-stage6.mp3`, `assets/audio/music-boss6.mp3` (registered as `stage7` / `boss7`) |
| Myrddraal lieutenant | `s6fade` |
| Call streak | `s6streak` |
| Fighters | existing `riley`, `grunt`, `spear` atlases with compact normals |

## Painted art

`tools/stage7/process_art.py` lists the jobs. Every row in `src/stage7-painted.js` is `present: false`. Drop sources under `art/` and re-run the tool. Until then the game paints small canvases (dusk `#d9822b`, sand `#c8a26b`, glass `#8fe3ff`, fog `#6f8fb0`, cadin'sor `#8a7a5e`, veil `#a33a2a`).

- Backgrounds: `bg7far`, `bg7mid`, `bg7mid2`, `bg7mid3`, `bg7mid4`, `bg7floor`, `bg7floor2`, `bg7floor3` (`assets/bg7/`)
- Cast: `s7dancer`, `s7veiled`, `s7asmo`, `s7moir`, `s7lan`
- Props: `s7earth`, `s7shield`, `s7column`, `s7veil`, `s7portal`, `s7dust`, `s7crate`, `s7planks`
- UI: `asmoPortrait`, `s7moiPort`, `s7lanPort`
- Story panels: `story7p1`, `story7p2`, `story7p3`

Decoded budget: painted resident ≤ 12 MiB, boss-peak source ≤ 105 MiB. Disk budget: `assets/stage7` + `assets/bg7` ≤ 6,000,000 bytes.

## Voices

26 caption ids are registered. `assets/audio/stage7-voice-manifest.json` is `{"present":[]}`. Each file ≤ 200 KB. The audit line is 24 × 200 KB = 4,915,200. If that cap binds, leave `st7_moi_call_02` and `st7_lan_call_02` as captions.

Ids: `st7_story_01`, `st7_story_02`, `riley_st7_story_01`, `st7_story_03`, `st7_story_04`, `st7_storm_01`, `riley_st7_storm_01`, `st7_veil_01`, `riley_st7_street_01`, `st7_asmo_intro_01`, `st7_asmo_p2_01`, `st7_asmo_p3_01`, `st7_asmo_hurt_01`, `riley_st7_reflect_01`, `riley_st7_call_01`, `riley_st7_call_02`, `riley_st7_call_03`, `st7_moi_call_01`, `st7_moi_call_02`, `st7_lan_call_01`, `st7_lan_call_02`, `st7_duo_call_01`, `st7_clear_01`, `st7_clear_02`, `st7_clear_03`, `riley_st7_victory_01`.

Do not add these to `assets/audio/riley-voice-manifest.json` or the Jason narrator line list until the renders exist. Names must start with `st7_` or `riley_st7_` so they stay off the pre-fight voice sum.

## Music

Real 96 BPM loops: `assets/audio/music-stage7.mp3` and `assets/audio/music-boss7.mp3`, each ≤ 1.2 MB. The audit counts them only when the files exist. The current stand-in does not copy the Stage 6 files.

## Cutscenes

`tools/cutscenes/encode_callins.sh` encodes `M1` `M2` `L1` `L2` `D1` `D2` into `assets/cutscenes/call7/` and optional `S7` into `assets/cutscenes/stage7/`. 854×480, CRF 29. Budgets: call-ins ≤ 9,000,000 bytes, intro ≤ 2,000,000.

`STAGE_CLIPS` does not list `stage7` yet. `tests/cutscene.test.mjs` requires every registered intro clip to be a shipped H.264 file. `wrapStart(7, 7)` is already installed, so the only later edit in `src/cutscene.js` is `7: Object.freeze(['stage7'])` once `assets/cutscenes/stage7.mp4` exists at the top of `assets/cutscenes/` (that folder's listing is not recursive). Call clips are a separate audit line and do not go in `STAGE_CLIPS`.

The strike never waits on a clip. A missing file still runs Moiraine, Lan, or the duo.
