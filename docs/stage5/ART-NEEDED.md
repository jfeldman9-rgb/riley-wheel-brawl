# Stage 5 painted art

The stage plays today on code-drawn sheets with no text in any frame. Painted Aginor and Balthamel ship as trimmed
Phaser JSON-hash atlases built by `tools/stage5/process_bosses.py`. The load list is hard-coded in `PAINTED`
(`src/stage5-art.js`), the same way Stage 4 does it. There is no `painted.json`: a JSON list queued and read in the
same preload pass was never read in time. `queuePainted` loads a row only when its `present` is true, so a missing
file never 404s. `tests/stage5-audio.test.mjs` checks that every `present` flag matches the files on disk.

```js
Object.freeze({ key: 's5agin', url: 'assets/stage5/s5agin.webp', atlas: 'assets/stage5/s5agin.json', baseH: 180, present: false })
```

To ship the art:

1. Save the two ChatGPT collages as `art-in/stage5/aginor-sheet.src.png` and `art-in/stage5/balthamel-sheet.src.png`
   (flat magenta, 4 over 3 and 5 over 4 poses in frame order). An optional `aginor-portrait.src.png` is used as the
   portrait. Without it, the portrait is cut from the idle head.
2. Run `python3 tools/stage5/process_bosses.py --debug /tmp/s5dbg`. It writes `assets/stage5/s5agin.webp|json`,
   `s5balt.webp|json` and `aginor-portrait.webp`, and prints a JSON report (scale, bounds, per-pose anchor, sha256).
   The same input always gives byte-identical output.
3. Check `/tmp/s5dbg/*-registration.png` (every pose stacked on one baseline) and `*-cells.png`.
4. Flip `present` to `true` on the three rows and run the tests.

Painted frames are trimmed. `sourceSize` is the full cell, so origin `(0.5, 0.96)` still puts the feet on the lane.
`scaleFor` divides the render scale by `realHeight / baseH`, so a 360 px Aginor cell is drawn at the same on-screen
size as the 180 px code-drawn frame. Frame 3 of `s5agin` carries `palm: [dx, dy]` (from the origin, x forward, y up,
in cell pixels). The tether line starts there when the painted sheet is loaded. The code-drawn sheet keeps the old
start at `y - 90`. `flipX` faces left. Do not repaint Riley.

| Key | Frames | Frame size | Scale | What each frame is |
|---|---|---|---|---|
| `s5agin` | 7 | 120×180 (painted cell 240×360) | 2.0 | 0 idle, 1 hurt, 2 staff, 3 tether, 4 short-step, 5 staggered, 6 burn and dead |
| `s5balt` | 9 | 110×170 (painted cell 280×340) | 2.35 | 0 drop, 1 idle, 2 flail, 3 step, 4 lunge, 5 holding, 6 down, 7 vines and dead, 8 recoil (shoved, hurt) |
| `s5stalk` | 6 | 96×64 | 1.15 | 0 lurk, 1 stalk, 2 pounce and recover, 3 hurt, 4 down, 5 dead |
| `s5pod` | 5 | 80×80 | 1.1 | 0 emerge, 1 idle, 2 swell and lob, 3 hurt, 4 dead |
| `s5green` | 4 | 120×180 | 2.75 | 0 arrive, 1 seize, 2 fall, 3 oak |
| `aginorPortrait` | 1 | 256×256 (painted 136×136) | — | dialogue portrait |
| `story5p1` | 1 | 640×360 | — | story panel, the waygate |
| `story5p2` | 1 | 640×360 | — | story panel, into the Blight |
| `story5p3` | 1 | 640×360 | — | story panel, the Eye |
| `bg5far` | 1 | 640×210 | — | far sky (was 1280×420; the camera never shows it sharper) |

Aginor and Balthamel are the sheets this build is waiting on. The other rows can stay code-drawn. The story panels are
freed as soon as the story ends or is skipped. The never-used textures `s5lash s5thorn s5seep s5gout s5spore s5ring
s5tether s5hand s5oak s5ash s5tree` are gone. Boss and Green Man scales above are render scale only; combat hitboxes
are unchanged. During a grab, Balthamel's sprite is drawn in front of Riley with a 16px offset toward him.
