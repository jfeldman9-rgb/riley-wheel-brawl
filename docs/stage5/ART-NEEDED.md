# Stage 5 painted art

The stage plays today on labeled procedural sheets. Drop painted sheets in `assets/stage5/` and add a row to `assets/stage5/painted.json`. `queuePainted` loads a row only when `present` is true, so an empty list does not 404.

```json
{ "key": "s5agin", "url": "assets/stage5/s5agin.png", "present": true, "frameWidth": 120, "frameHeight": 180 }
```

Single images (portrait, story panels) omit `frameWidth` and `frameHeight`. Sprites use origin `(0.5, 0.96)`, feet on the lane. `flipX` faces left. Do not repaint Riley.

| Key | Frames | Frame size | Scale | What each frame is |
|---|---|---|---|---|
| `s5agin` | 7 | 120×180 | 2.0 | 0 idle, 1 hurt, 2 staff, 3 tether, 4 short-step, 5 staggered, 6 burn and dead |
| `s5balt` | 8 | 110×170 | 2.35 | 0 drop, 1 idle, 2 flail, 3 step, 4 lunge, 5 holding, 6 shoved / hurt / down, 7 vines and dead |
| `s5stalk` | 6 | 96×64 | 1.15 | 0 lurk, 1 stalk, 2 pounce and recover, 3 hurt, 4 down, 5 dead |
| `s5pod` | 5 | 80×80 | 1.1 | 0 emerge, 1 idle, 2 swell and lob, 3 hurt, 4 dead |
| `s5green` | 4 | 120×180 | 2.75 | 0 arrive, 1 seize, 2 fall, 3 oak |
| `aginorPortrait` | 1 | 256×256 | — | dialogue portrait |
| `story5p1` | 1 | 640×360 | — | story panel, the waygate |
| `story5p2` | 1 | 640×360 | — | story panel, into the Blight |
| `story5p3` | 1 | 640×360 | — | story panel, the Eye |

Aginor and Balthamel are the sheets this build is waiting on. The other rows can stay procedural. Procedural `PLACEHOLDER` stamps, including the far plate's `PLACEHOLDER SKY` title, are drawn only with `?debug` (empty or any value except `0`). Boss and Green Man scales above are render scale only; combat hitboxes are unchanged. During a grab, Balthamel's sprite is drawn in front of Riley with a 16px offset toward him.
