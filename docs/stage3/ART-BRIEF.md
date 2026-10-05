# Stage 3 art brief: Caemlyn and the Myrddraal

*Art director's brief for the painter (ChatGPT images). Oct 5 2026. Sources: `docs/stage3/PLAN.md` §1 and §4,
BUILD-T3-T6 / T7-T11 / T12-T16, HARDENING.md, `assets/stage3/ART_STATUS.json`, `docs/stage3/prompts/*.json`,
`assets/stage3/chars/*.anims.json`, `assets/bg3/{plates,lights}.json`, `assets/powers/ART_LIST.md`.
Anything marked **(inferred)** is my judgement, not something the repo says.*

The ready-to-paste prompt for every item is in `docs/stage3/prompts/<id>.json` (`prompts[0]`, with its `attach` list).
This brief doesn't replace those prompts. It adds the rules, priorities, lighting, tells and QA around them.

## 1. Summary

**Stage 3 is Caemlyn.** It's a 5200 px stage in 4 zones and the light runs from golden afternoon to torchlit night:
- **Zone 0:** New City market under the white walls.
- **Zone 1:** the Queen's Blessing inn yard.
- **Zone 2:** the rooftops at sunset. Roof tiles sweep the lanes and cutthroats drop in from above. The Fade is glimpsed
  leaping the far roofs with a bundle tied in a blue ribbon.
- **Zone 3:** the Royal Palace garden at night, where the Myrddraal boss fights in three phases: shadow blink, fear
  aura, then shadow copies.

The new enemy is the **Darkfriend cutthroat**, a grabber. Twinkle Toes is never shown, only the ribbon and the bundle.
The game is kid-safe: no blood, cutthroats are KO'd with stars or run away, and the Fade melts into shadow.

**Pipeline constraints (from the repo):**
- **Style lock:** hand-drawn HD 2D fighting-game art in the spirit of Streets of Rage 4.
  - Near-black outlines, thick outside and thin inside.
  - 2–3-step cel shading with subtle painterly gradients.
  - Key light from the upper left, cool rim on the right.
  - Never pixel art, 3D, photo-real or chibi.
- **Character sheets:** one 1536×1024 PNG with **real alpha**. 8 cells in 2 rows of 4, each 384×512.
  - Boot baseline at y=490 (top row) and y=1000 (bottom row), same scale in every cell.
  - Read cells left to right, top row first.
- **Masters:** 1024×1536 PNG, transparent, one full-body figure. They are source-only and never shipped.
- **Packing (done by the director, not the painter):** `spike-art/tools/pack.py` slices, registers on the baseline and
  scales each sheet into an atlas page `.webp` + `.json` in `assets/stage3/chars/`.
  - `spike-art/tools/nmap.py` **derives** the normal maps algorithmically: `_n` and `_nl` for characters, `_n` for the
    mid and floor plates. **The painter never paints normal maps.**
- **Facing.** The engine flips sprites horizontally to face the other way, and that is the only flip allowed. Record
  every facing flip in `ART_STATUS.json` `facingFlips` (empty today).
  - Enemies are drawn facing **LEFT**. Riley is drawn facing **RIGHT**.
  - A mirrored or copied cell is never a "new" frame. T13 test 9 hashes every frame against flipped hashes and fails
    on a mirror.
- **No fake art.** No recolouring, tinting, blurring, stretching or interpolating. No grey cards left in a sheet.
  Source is ChatGPT (preferred) or Gemini, free tier only. Never Grok, Seedance or Manus.
- **Paths:** PLAN §4.1 says `assets/chars|props|ui`. The **real** paths are `assets/stage3/chars`,
  `assets/stage3/props` and `assets/stage3/ui` (T2 decision). Plates are in `assets/bg3/`, panels in `assets/story/`.

## 2. Asset table

**Every Stage 3 item below is a placeholder today.** Every `ART_STATUS.json` entry has `placeholder: true`, and the
bg3 `_n` files are 38-byte flat cards.

**Priority key:**
- **P0** = the art carries a gameplay tell or hit state that the player must read for the fight to be fair.
  Placeholders keep the stage technically playable, but grey cards hide every tell.
- **P1** = the stage looks finished.
- **P2** = story and flavour.

| id | Ships as | Status | Frames: cells → anims (packed frame size) | Pri |
|---|---|---|---|---|
| cutthroat-master | source only, `art-in/` | missing | 1 figure, 1024×1536 | P0 |
| cutthroat-a | `assets/stage3/chars/cutthroat-0.*` + `cutthroat.anims.json` | placeholder | 1–6 walk, 7–8 hurt (558×372; canvas 900×600, base 570, ×0.62) | P0 |
| cutthroat-b | ″ | placeholder | 1–5 slash (active = cell 3), 6–8 knockdown | P0 |
| cutthroat-c | ″ | placeholder | 1–5 lunge (cell 1 = 450 ms telegraph), 6–7 getup, 8 dazed | P0 |
| cutthroat-d | ″ | placeholder | 1–4 hold (loop), 5–6 grabthrow, 7–8 shoved | P0 |
| cutthroat-e | ″ | placeholder | 1–4 stalk (loop), 5–8 flee (runs RIGHT, back to the left) | P0 |
| riley-s3a | `assets/stage3/chars/riley3-0.*` + `riley3.anims.json` | placeholder | 1–4 grabbed (loop), 5–8 escape (hit = cell 6) (816×544; canvas 960×640, base 610, ×0.85) | P0 |
| fade-master | source only | missing | 1 figure, 1024×1536 | P0 |
| fade-a | `fade-0.*` / `fade-1.*` + `fade.anims.json` | placeholder | 1–4 walk, 5–8 intro (660×420; canvas 1100×700, base 670, ×0.6) | P0 |
| fade-b | ″ | placeholder | 1–6 slash (active = cells 3 and 5, see §3), 7–8 hurt | P0 |
| fade-c | ″ | placeholder | 1–5 lunge (cell 1 = 380 ms telegraph), 6–8 knockdown | P0 |
| fade-d | ″ | placeholder | 1–4 blinkout, 5–8 blinkin (**counter window = cells 7–8**) | P0 |
| fade-e | ″ (page `fade-1`) | placeholder | 1–5 fear (**aura goes live on cell 4**), 6–8 stagger | P0 |
| fade-f | ″ | placeholder | 1–5 split, 6–7 getup, 8 point | P0 |
| fade-g | ″ | placeholder | 1–4 idle (loop), 5–8 defeated melt | P0 |
| fx-shadowpool | `assets/stage3/props/fx-shadowpool.webp` | placeholder | 4 × 256² on 1024×256; ground decal; 0.6 s blink telegraph | P0 |
| fx-shadowburst | `assets/stage3/props/fx-shadowburst.webp` | placeholder | 6 × 256² on 1536×256; normal blend (not additive) | P1 |
| prop-rooftiles | `assets/stage3/props/prop-rooftiles.webp` | placeholder | 4 × 256² on 1024×256; drawn at 0.5 | P1 |
| bg3-far-day | `assets/bg3/bg3-far-day.jpg` | placeholder | 2172×724, opaque, horizon y≈340 | P1 |
| bg3-far-night | `assets/bg3/bg3-far-night.jpg` | placeholder | 2172×724, opaque, same composition as day | P1 |
| bg3-mid | `assets/bg3/bg3-mid.webp` + `_n` | placeholder | 2172×724, transparent sky (zones 0–1) | P1 |
| bg3-mid2 | `assets/bg3/bg3-mid2.webp` + `_n` | placeholder | 2172×724, transparent sky (zones 2–3) | P1 |
| bg3-floor | `assets/bg3/bg3-floor.jpg` + `_n` | placeholder | 2172×724, opaque, tiles horizontally (world x 0–2540) (inferred mapping) | P1 |
| bg3-floor2 | `assets/bg3/bg3-floor2.jpg` + `_n` | placeholder | ″ rooftop lead walkway (x 2540–3880) | P1 |
| bg3-floor3 | `assets/bg3/bg3-floor3.jpg` + `_n` | placeholder | ″ night garden gravel (x 3880–5200) | P1 |
| fade-portrait | `assets/stage3/ui/fade-portrait.webp` | placeholder | painted 1024², shipped 256×256 (boss bar) | P1 |
| fx-fade-far | `assets/stage3/props/fx-fade-far.webp` | placeholder | 4 × 256² on 1024×256; far parallax 0.3, plays once | P2 |
| story3-1 / -2 / -3 | `assets/story/story3_panel_{1,2,3}.jpg` | placeholder | 1280×720 each, opaque | P2 |

**Totals:** 104 character frames (cutthroat 40, Fade 56, Riley 8), 2 masters, 7 plates, 4 strips (18 frames),
1 portrait and 3 panels.

**Reused unchanged (do not repaint):** `riley-0`/`riley-1` (hash-locked by T13), `loial`, `zealot`, `archer`,
`hound`, `prop-crate`, `planks` and `item-ribbon`.

**No art needed** for these, because the engine draws them:
- the cutthroat drop-in marker (existing `shadow`);
- the tile lane markers (`lanemark`);
- the copy wisps (`smoke` particles);
- the mash ring;
- the magenta fear arc;
- the vignette;
- the KO stars.

## 3. Pose, lighting and tell notes

**All characters**
- Paint neutral studio lighting only: warm-neutral key from the upper left and a cool right rim.
- **Never bake in torchlight, sunset or night colour.** The engine relights sprites through the derived normals as
  `ambient` runs from `0x8a7a62` (afternoon) to `0x262c48` (night), with torches `0xff9a48`. Baked light would fight
  that (inferred from the lit pipeline).
- No ground shadows: the engine draws them, and only the *real* Fade has one.
- Every frame is drawn fresh.

**Cutthroat: telegraphs must never be confused with each other**
- **Slash wind (b, cells 1–2; cell 2 holds 220 ms):** the cosh is raised **high behind the head**. Cell 3 is the smear
  and the only active frame.
- **Grab telegraph (c, cell 1; holds 450 ms):** a deep, low, wide cat-coil, with **both hands open and spread
  forward** and the cosh tucked in the belt.
  - The silhouette has to say "grab" even at 0.62 scale on a busy market plate: empty hands, low and wide.
  - The engine adds the glint and the `hiss` sound. Don't paint a starburst.
- **Hold (d, cells 1–4):** the head peeks past the far shoulder. There is no second person in any cell.
  - Riley is drawn in front of him in game, so his clasped hands must sit at Riley's chest height.
- **Shoved (d, cells 7–8):** wide open and windmilling. This is the player's reward window (×1.3 damage).
- **Stalk vs walk:** stalk rocks in place, walk travels. Keep them distinct, because the stalk is what he does while
  he looks for your back.

**Riley (riley-s3a)**
- Upper arms are pinned and forearms strain, with the glasses visible in all 4 grabbed cells.
- Cell 6 is the hit frame: an elbow smear backwards at stomach height.
- Cell 8 must return to his existing fighting stance from `assets/chars/riley-0.webp`.

**Fade, general**
- Pale grey face and hands are the only light values. Sword edge is cold blue-white, armour is black with cold blue
  highlights.
- It fights in a **dark night garden**. Keep a clear blue-grey rim around the silhouette so it never dissolves into
  the background (inferred).
- The cloak hangs **dead still** in walk, idle, intro, slash and lunge. It moves *only* in these cells:
  - knockdown cell 6;
  - fear cells 3–4;
  - stagger;
  - split;
  - the melt.

**Fade, tells**
- **Slash (fade-b): fix the timing.** The engine's holds are 120/**240**/100/140/100/260 ms with active frames
  [2, 4] (0-based), which is **cells 3 and 5**. The prompt puts the smears on cells 2 and 4, which doesn't line up.
  - **Paint the cells in this order:**
    1. anticipation;
    2. held coil, sword high, the tell;
    3. first cut SMEAR;
    4. wrist turn-over;
    5. second cut SMEAR, longest reach;
    6. recovery.
  - This needs no code change. Record the amended wording as an extra prompt, and keep `prompts[0]` unchanged.
- **Lunge telegraph (c, cell 1; holds 380 ms):** a low snake coil with the point aimed forward.
  - Keep the painted tip highlight **modest**. Copies reuse these exact frames, and the PLAN's "real one glints white"
    tell has to come from the engine's `glint()`, not from paint. A big painted flare would make the copies glint too
    (inferred).
- **Blink (d):**
  - Cells 1–4 sink into a painted inky pool.
  - Cells 5–6 are mostly smoke.
  - **Cells 7–8 are the counter window.** The body is solid, arms up, torso exposed: it must read "hit me now".
- **Fear (e):**
  - Cells 1–3 are a slow, readable hand-raise and build.
  - **Cell 4 is the frame where the aura switches on** (`auraFrame: 3`), so the tendril ring is at its widest there.
  - The real aura radius is now **220 px** (commit `190d87b`; the PLAN's 300 is stale). Keep the tendrils inside the
    cell and don't imply a bigger area.
- **Stagger (e, cells 6–8) and the ×1.5 counter:** wide open, sword flung up, then dragging on the ground.
- **Split (f):** smoke streams fan out to both cell edges. There is still only one Myrddraal per cell.

**Shadow FX** (pool, burst, smoke in d / f / g)
- *Painted* inky purple-black smoke with clean outlines and 2–3 tones. **Never airbrush or blur.**
- The pool is an unlit ground decal on dark night gravel, so its **violet rim** is what makes the 0.6 s telegraph
  readable. Make the rim bright enough to see at night.

**Plates** (sun at screen 180,40 upper left; moon glow upper right on far-night only)
- **far-day:** honey-gold afternoon.
- **far-night:** the same composition in indigo, with the palace lit warm from below.
- **mid:** golden afternoon.
- **mid2:** the left half is a deep orange-pink sunset from the left; the right half is blue moonlit night.
- **floor / floor2 / floor3:** afternoon, sunset and night, matching their segments. Keep floor3's "torch-glow
  patches" faint, because real torches light it (inferred).
- **Light fixtures stay UNLIT.** The game lights them at these plate-pixel positions from `lights.json`:
  - **bg3-mid:** lanterns at x 1700 and 2050, y≈560.
  - **bg3-mid2:** chimney lanterns at x 150, 520 and 860 (y≈520); garden torch posts at x 1250, 1560 and 1880 (y≈560).
  - If the painted fixtures land elsewhere, report their pixel positions so `lights.json` can be updated. Don't
    repaint for this.

**Small items**
- **fx-fade-far:** a tiny figure with its own baked dusk light and orange sunset rim. This is fine because the strip
  is unlit. The bundle shows the blue ribbon only, with no child, face or limbs.
- **prop-rooftiles:** keep the tile size constant across cells. The game draws it at 0.5 scale, so keep the shapes
  chunky.

## 4. On-model rules

**Riley (every frame and every panel)**
- Check against the reference photo `/workspace/riley-refs/riley.jpg` (outside the repo), the master
  `spike-art/masters/riley-master-side.png` and the in-game `assets/chars/riley-0.webp`.
- Age and build: 16 and very muscular, with huge bare biceps and shoulders, about 7.5 heads tall.
- Face and hair: friendly, clean-shaven, youthful face with light olive skin. Short dark-brown hair with a short
  straight fringe.
- **Thin blue-framed rectangular glasses, always on and visible.**
- Coat: **sleeveless black Asha'man coat** with a high standing collar, a small silver sword pin, a fitted torso and
  split skirts.
- The rest: black fingerless gloves, black trousers, black boots, no weapon, and no other colour on the outfit.
- Same face and same build in every frame. Lay all 8 cells side by side and compare the faces.
- Coat length conflict: ART_LIST says the skirt reaches the shins, the Stage 3 prompts say knees. Match `riley-0.webp`.

**Cutthroat (one man, every cell)**
- About 30, wiry, a little shorter and much leaner than Riley.
- Narrow sly face, stubble, short messy black hair, dark-brown hood pushed back.
- Charcoal short cloak, brown leather jerkin, oxblood shirt, grey trousers, cord-wrapped boots.
- Belt with pouches and a **sheathed knife that is never drawn**. A black leather cosh.
- In flee cells the hood falls back and the cosh is dropped.

**Myrddraal**
- A head taller than Riley and unnaturally thin.
- **Eyeless:** smooth skin where the eyes should be, no sockets, no gore. Thin bloodless lips. Close-cropped black hair.
- Black snake-scale plate from neck to knee. Black gloves and boots.
- A long black cloak that **does not move with wind** (exceptions in §3).
- A curved black blade with a plain black hilt and a cold blue-white edge.
- It's spooky but never gory. It melts into smoke and ash; it is never wounded.

**Others**
- **Basel Gill (story3-2):** stout and balding, about 55, with a grey fringe, a round worried face and a white apron
  over a brown vest.
- **Loial:** reused unchanged in Stage 3. If he is ever painted, he wears **boots, never hooves** (Jason's rule).
- Trollocs keep their Stage 1 designs. Hooves are correct for *Trollocs* only.

**Common mistakes to reject on sight**
- **Riley:**
  - looks like a child, chibi or a stubbly grown man;
  - glasses missing, wrong colour or thick-framed;
  - sleeves added, coloured trim, or a weapon;
  - long or light hair;
  - his face changes between cells.
- **Anatomy:** extra or missing fingers or limbs.
- **Grabs:** a second person drawn into a grab cell.
- **Duplicates:** cells that are copies or mirrors of each other. The barn-fire precedent rejected a cell for being
  "too similar".
- **Clipping and baseline:** a sword, cloak or smear clipped by the cell edge; feet off the baseline; scale drifting
  between cells.
- **Transparency:** a baked checkerboard instead of real alpha, a white halo or fringe, a floor or drop shadow, a
  copied reference background.
- **Text:** any text, frame numbers, letters on signs or banners, or watermarks.
- **Fade:** eyes or sockets painted; the cloak billowing in a walk or idle; blood.
- **Story panels:** figures oversized for the panel (the Stage 2 panel 1 rejection); Twinkle Toes shown.

## 5. Delivery checklist (per batch) and director QA

**The painter delivers:**
- **Filenames:** exactly the `output` name in the prompt JSON, e.g. `cutthroat-c.png` or `story3_panel_2.png`. One
  file per prompt.
- **Formats:**
  - Sheets: PNG RGBA at 1536×1024.
  - Masters: 1024×1536.
  - Strips: 1024×256 or 1536×256 RGBA.
  - Plates: 2172×724. Mid plates have real alpha in the sky; far plates and floors are opaque.
  - Portrait: 1024² opaque.
  - Panels: 1280×720 opaque.
- **Content:** every figure faces the stated way and is whole inside its cell, with feet on the baseline (y=490 /
  1000).
- **Floors** tile seamlessly left to right.
- **Notes with each delivery:** the attempt count, and any cell you know is weak.

**The director does, per accepted file (T14):**
1. **Jason approves the master first.** Then generate the sheets with the master attached.
2. Write the contact sheet with `spike-art/tools/contact.py` to `docs/stage3/shots/contact-<key>.jpg`.
3. **Character sheets:** commit them to `art-in/<id>/<id>.png` until the character's **last** sheet is approved.
   - The atlas is shared, so pack the whole character at once: `pack.py` at the §2 canvas, baseline and scale, with the
     same page, frame and anim names. Then run `nmap.py` for `_n` and `_nl`, and check that both are the same size as
     the colour page (≤ 4096).
4. **Non-character files:** replace one-for-one (same path, size, format and layout). For the mid and floor plates,
   derive `_n` with `nmap.py`. The portrait is downscaled to 256×256 WebP.
5. **Update `ART_STATUS.json`:**
   - `placeholder: false`, with `source`, `tries`, `contactSheet` and `rejections`;
   - any `facingFlips`.
   - Set `anims.json` / `plates.json` to `placeholder: false` only when all of that character's sheets, or all 7
     plates, are real.
6. Re-run `tools/stage3/frame-hashes.py`, then the full `node --test tests/*.test.mjs`. **T2 and T13 stay green.**

**QA the director runs before anything goes to Jason:**
- [ ] Riley's face and build match `riley.jpg` and the master in every cell, with the glasses visible (side-by-side
  check).
- [ ] Cell count and order match §2, every pose matches its cell description, and none is a copy or mirror.
- [ ] Alpha is real: checked on both a black and a white background, with no halo, floor or shadow.
- [ ] Baseline and scale are consistent. The contact sheet shows no bobbing feet or size drift.
- [ ] **Tells read in game at play scale** (`?stage=3&s3=1`, boss with `&skip=boss`):
  - cutthroat coil vs slash wind;
  - Fade lunge coil;
  - blinkin cells 7–8 exposed;
  - fear cell 4 at its peak;
  - the pool visible at night.
- [ ] The Fade is eyeless and its cloak is still in walk, idle, slash and lunge. It still reads against the night
  garden.
- [ ] Kid-safe: no blood, no drawn knife, no child in the bundle. No text anywhere.
- [ ] Plates: the light direction is right, fixtures are unlit and at the `lights.json` positions, floors tile, and
  the mid-plate sky is transparent.
- [ ] The tests are green, and the `PLACEHOLDER ART` tag only disappears when everything is real.

## 6. Painting order

Order rule: masters first, then whole characters (so an atlas can be packed and go live), and gameplay before scenery.

| Batch | Items | Why this order |
|---|---|---|
| 1 | `cutthroat-master`, `fade-master` → Jason approves | Every sheet attaches its master. Nothing else can start before this. |
| 2 | `riley-s3a` | Its own single-sheet atlas, so it ships alone. The grab is the stage's new mechanic. |
| 3 | `cutthroat-c`, `-d`, `-b`, `-a`, `-e` (then pack) | The tell sheets come first. Packing waits for the 5th sheet. The cutthroat appears in zones 0–2. |
| 4 | `fade-d`, `-e`, `-c`, `-b`, `-f`, `-a`, `-g` (then pack), plus `fx-shadowpool` and `fx-shadowburst` | All boss tells, plus the pool and burst they depend on. |
| 5 | `bg3-far-day` → `bg3-far-night` and `bg3-mid` → `bg3-mid2`, then the 3 floors | This follows the attach chain: night and mid attach day; mid2 attaches night. |
| 6 | `prop-rooftiles`, `fade-portrait`, `fx-fade-far` | The zone 2 hazard and HUD polish. The lane markers already carry the tile tell. |
| 7 | `story3-1`, `-2`, `-3` | They attach far-day, mid and mid2, so they come last. |

After batch 4, every gameplay tell is real. After batch 5, the stage looks finished.
