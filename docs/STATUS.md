# Current Repository Status — `rwb-fresh`

## DONE (verified)

- The complete title-to-ending flow, five arenas, five enemy families, five
  bosses, stage reels, HUD, pause integration, Continue data, and victory scene
  are implemented in `js/content.js`. `node tools/soak.cjs` clears every arena
  over twelve seeds.
- Riley has procedural multi-pose movement, idle breathing, jumping, a
  three-kick chain, jump kick, fireballs, SAIDIN/Balefire, taint, and the
  once-per-arena Loial call. Automated checks cover meter combat and clearing.
- Every boss records three named attacks. Draghkar flight and dive behavior,
  Taim's live stagger and beam connection, and Reduced Shake finale scaling are
  asserted by `node tools/check.cjs`.
- Story captions use the catalog ids and exact text. The checker parses
  `docs/VOICE_LINES.md` and compares every runtime caption.
- All optional image names are registered while `RWB.ART_MANIFEST` remains
  empty. The checker observes zero image requests and procedural drawing keeps
  every screen playable.
- The cache version is `20260926-f1` on all external URLs and in
  `RWB.ASSET_VER`.

## NOT DONE / PARTIAL

- Optional painted WebP artwork and recorded dialogue are not included; the
  intended procedural fallbacks and synthesized cues are active.
- The procedural actor art is deliberately compact and does not provide the
  detail of the proposed painted atlases. Grab/throw is optional and is not
  implemented.
- Touch, remapped controllers, high-DPI modes, browser audio, and long-session
  performance have not been tested on physical devices in this session.
- Automated tuning uses the deterministic masher and is not a substitute for
  child playtesting or accessibility review by players.
