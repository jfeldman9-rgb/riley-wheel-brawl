# riley16-v2 — painted Asha'man coat set (candidate frames, not yet wired)

Painted with ChatGPT image generation (built-in `image_gen`, gpt-image, via Codex on Jason's account), 2026-09-29, from Riley's reference photo + the current riley16 sprites as style/scale reference. Transparent PNGs; source sheets were 2172×724; each figure was cut by its alpha connected component (no redraw), alpha cleaned (≥200→255, <16→0 haze), and Lanczos-downscaled to the riley16 atlas scale (standing ≈227–235 px tall). Nothing is duplicated, stamped or mirrored.

Frames (19): walk1–walk8 (8 distinct poses: R contact, R down, R pass, R up, L contact, L down, L pass, L up), idle, punch, kick, fireball (power cast, flame painted in), hurt, jump, roundhouse, knee, channel, lying, getup.

`frames-draft.json`: `[w, h, ax, ay]` per frame in the same format as `RILEY16.frames` (ay = foot baseline = bottom row, ax = head/upper-torso centre, computed automatically — verify/adjust). `_contact-sheet.png`: all new frames on a common baseline with the old rwb-w2 atlas row for scale.
