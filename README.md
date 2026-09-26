# Riley Wheel Brawl

A kid-friendly fantasy beat-'em-up: Riley, a young Asha'man who fights with Tae
Kwon Do kicks and fireballs, crosses five stages to rescue his sister Twinkle Toes
from Mazrim Taim.

**Status: rebuilding from scratch.** This branch (`rwb-fresh`) contains only the
engine. See `docs/ENGINE.md` (engine APIs), `docs/BRIEF.md` (design),
`docs/VOICE_LINES.md`, `docs/ART_LIST.md`, `docs/TASKS.md`, and `docs/STATUS.md`.

## Run locally

```
python3 -m http.server 8000
# open http://localhost:8000/
```

No build step. Plain HTML5 canvas + JavaScript. `node tools/soak.cjs` runs the
offline bot harness once gameplay exists.
