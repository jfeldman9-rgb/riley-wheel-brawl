#!/usr/bin/env python3
"""Stage 5 Riley lines: ElevenLabs eleven_v4, voice DYLO (Dark Anime Hero).

Re-recorded 2026-10-09, approved by Jason F via Grok Bot. Prompts, generation ids and hashes
are in assets/audio/riley-voice-manifest-stage5.json. Same chain as the live Riley lines
(tools/riley_voice.py on rwb-w2-riley-voice). A re-render is a new take and will not match the hashes.

usage: python3 tools/stage5/render_riley_stage5.py OUT_DIR [line_id ...]
Needs ELEVENLABS_API_KEY. Without it, this exits before writing anything.
"""
import json
import os
import subprocess
import sys
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MAN = json.loads((REPO / 'assets' / 'audio' / 'riley-voice-manifest-stage5.json').read_text())
LINES = {row['id']: row for row in MAN['lines']}

def main():
    if len(sys.argv) < 2:
        sys.exit('usage: render_riley_stage5.py OUT_DIR [line_id ...]')
    ids = sys.argv[2:] or list(LINES)
    bad = [i for i in ids if i not in LINES]
    if bad:
        sys.exit('Unknown Riley line: ' + ', '.join(bad) + '. No voice files were written.')
    if not os.environ.get('ELEVENLABS_API_KEY'):
        sys.exit('Stage 5 Riley not rendered: ELEVENLABS_API_KEY is missing. No voice files were written.')
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    for line_id in ids:
        row = LINES[line_id]
        raw = out / f'_{line_id}.raw.mp3'; mp3 = out / f'{line_id}.mp3'
        req = urllib.request.Request(
            f"https://api.elevenlabs.io/v1/text-to-speech/{row['voice_id']}?output_format=mp3_44100_128",
            data=json.dumps({'text': row['prompt'], 'model_id': row['model']}).encode(),
            headers={'xi-api-key': os.environ['ELEVENLABS_API_KEY'], 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'},
            method='POST')
        with urllib.request.urlopen(req) as res:
            raw.write_bytes(res.read())
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(raw), '-af', MAN['processing']['ffmpeg_af'],
                        *MAN['processing']['ffmpeg_out'], '-b:a', row.get('bitrate', MAN['processing']['default_bitrate']), str(mp3)], check=True)
        raw.unlink()
        if mp3.stat().st_size < 2048:
            mp3.unlink(); sys.exit(f'{line_id} came back under 2 KB. Refusing to keep it.')
        print(line_id, mp3.stat().st_size, flush=True)

if __name__ == '__main__':
    main()
