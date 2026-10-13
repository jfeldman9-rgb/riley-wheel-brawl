#!/usr/bin/env python3
"""Stage 7 paint jobs. Sources are optional. A missing file leaves present:false.

Does not invent pixels. Run only after the sheets in docs/STAGE7-ASSETS-NEEDED.md exist.
"""
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[2]
JOBS = [
    {"key": "bg7far", "src": "art/bg7/bg7far.png", "out": "assets/bg7/bg7far.jpg"},
    {"key": "bg7mid", "src": "art/bg7/bg7mid.png", "out": "assets/bg7/bg7mid.webp"},
    {"key": "bg7mid2", "src": "art/bg7/bg7mid2.png", "out": "assets/bg7/bg7mid2.webp"},
    {"key": "bg7mid3", "src": "art/bg7/bg7mid3.png", "out": "assets/bg7/bg7mid3.webp"},
    {"key": "bg7mid4", "src": "art/bg7/bg7mid4.png", "out": "assets/bg7/bg7mid4.webp"},
    {"key": "bg7floor", "src": "art/bg7/bg7floor.png", "out": "assets/bg7/bg7floor.jpg"},
    {"key": "bg7floor2", "src": "art/bg7/bg7floor2.png", "out": "assets/bg7/bg7floor2.jpg"},
    {"key": "bg7floor3", "src": "art/bg7/bg7floor3.png", "out": "assets/bg7/bg7floor3.jpg"},
    {"key": "s7dancer", "src": "art/stage7/s7dancer.png", "out": "assets/stage7/chars/s7dancer.webp"},
    {"key": "s7veiled", "src": "art/stage7/s7veiled.png", "out": "assets/stage7/chars/s7veiled.webp"},
    {"key": "s7asmo", "src": "art/stage7/s7asmo.png", "out": "assets/stage7/chars/s7asmo.webp"},
    {"key": "s7moir", "src": "art/stage7/s7moir.png", "out": "assets/stage7/chars/s7moir.webp"},
    {"key": "s7lan", "src": "art/stage7/s7lan.png", "out": "assets/stage7/chars/s7lan.webp"},
    {"key": "s7earth", "src": "art/stage7/s7earth.png", "out": "assets/stage7/props/s7earth.webp"},
    {"key": "s7shield", "src": "art/stage7/s7shield.png", "out": "assets/stage7/props/s7shield.webp"},
    {"key": "s7column", "src": "art/stage7/s7column.png", "out": "assets/stage7/props/s7column.webp"},
    {"key": "s7veil", "src": "art/stage7/s7veil.png", "out": "assets/stage7/props/s7veil.webp"},
    {"key": "s7portal", "src": "art/stage7/s7portal.png", "out": "assets/stage7/props/s7portal.webp"},
    {"key": "s7dust", "src": "art/stage7/s7dust.png", "out": "assets/stage7/props/s7dust.webp"},
    {"key": "s7crate", "src": "art/stage7/s7crate.png", "out": "assets/stage7/props/s7crate.webp"},
    {"key": "s7planks", "src": "art/stage7/s7planks.png", "out": "assets/stage7/props/s7planks.webp"},
    {"key": "asmoPortrait", "src": "art/stage7/asmoPortrait.png", "out": "assets/stage7/ui/asmoPortrait.webp"},
    {"key": "s7moiPort", "src": "art/stage7/s7moiPort.png", "out": "assets/stage7/ui/s7moiPort.webp"},
    {"key": "s7lanPort", "src": "art/stage7/s7lanPort.png", "out": "assets/stage7/ui/s7lanPort.webp"},
    {"key": "story7p1", "src": "art/stage7/story7p1.png", "out": "assets/stage7/story/story7p1.jpg"},
    {"key": "story7p2", "src": "art/stage7/story7p2.png", "out": "assets/stage7/story/story7p2.jpg"},
    {"key": "story7p3", "src": "art/stage7/story7p3.png", "out": "assets/stage7/story/story7p3.jpg"},
]

def main():
    missing = [j["key"] for j in JOBS if not (ROOT / j["src"]).is_file()]
    print(json.dumps({"jobs": len(JOBS), "missing": missing, "present": False}))
    return 0 if missing else 0

if __name__ == "__main__":
    sys.exit(main())
