#!/usr/bin/env python3
"""Riley's voice: ElevenLabs takes, re-recorded 2026-10-09, approved by Jason F via Grok Bot.

Every Riley line is an ElevenLabs `eleven_v4` take. All lines use DYLO (Dark Anime Hero) except
riley_super_01 ("Balefire!"), which keeps Jason's pick from the audition (Michael Dalton).
The prompt, voice, generation id and hash for each line live in
assets/audio/riley-voice-manifest.json. The Stage TTS scripts import this module, so a
re-render uses the same voice and prompt instead of Kokoro.

usage: python3 tools/riley_voice.py OUT_DIR [line_id ...]
Needs ELEVENLABS_API_KEY. Without it, this exits before writing anything.
"""
import hashlib
import json
import os
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / 'assets' / 'audio' / 'riley-voice-manifest.json'
MANIFEST = json.loads(MANIFEST_PATH.read_text())
MODEL = MANIFEST['model']
VOICE_ID = MANIFEST['voice_id']
VOICE_NAME = MANIFEST['voice_name']
# The cast entry every voice manifest records for Riley.
CAST = MANIFEST['cast']
LINES = {row['id']: row for row in MANIFEST['lines']}
# Trim silence, 70 Hz high-pass, loudness matched to the other voices (about -18 LUFS
# measured), limiter, mono 24 kHz 64 kbps. Each line records its bitrate: the 10 longest
# Stage 1/2 lines use 56 kbps so the 25 MB pre-fight budget still passes.
FILTER = MANIFEST['processing']['ffmpeg_af']
ENCODE = MANIFEST['processing']['ffmpeg_out']

def require_key():
    if not os.environ.get('ELEVENLABS_API_KEY'):
        sys.exit('Riley voice not rendered: ELEVENLABS_API_KEY is missing. No voice files were written.')

def synth_raw(line_id, raw_mp3):
    row = LINES[line_id]
    body = json.dumps({'text': row['prompt'], 'model_id': row['model']}).encode()
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{row['voice_id']}?output_format=mp3_44100_128",
        data=body,
        headers={'xi-api-key': os.environ['ELEVENLABS_API_KEY'], 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'},
        method='POST')
    with urllib.request.urlopen(req) as res:
        Path(raw_mp3).write_bytes(res.read())

def process(raw_mp3, mp3, bitrate=None):
    bitrate = bitrate or MANIFEST['processing']['default_bitrate']
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(raw_mp3), '-af', FILTER, *ENCODE, '-b:a', bitrate, str(mp3)], check=True)

def render(line_id, mp3):
    """Render one Riley line into mp3. Returns its duration in seconds."""
    mp3 = Path(mp3)
    raw = mp3.with_name(f'_{line_id}.raw.mp3')
    synth_raw(line_id, raw)
    process(raw, mp3, LINES[line_id].get('bitrate'))
    raw.unlink()
    if mp3.stat().st_size < 2048:
        mp3.unlink()
        sys.exit(f'{line_id} came back under 2 KB. Refusing to keep it.')
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(mp3)],
                         capture_output=True, text=True).stdout
    return round(float(out), 3)

def main():
    if len(sys.argv) < 2:
        sys.exit('usage: riley_voice.py OUT_DIR [line_id ...]')
    out = Path(sys.argv[1])
    ids = sys.argv[2:] or list(LINES)
    unknown = [i for i in ids if i not in LINES]
    if unknown:
        sys.exit('Unknown Riley line: ' + ', '.join(unknown) + '. No voice files were written.')
    require_key()
    out.mkdir(parents=True, exist_ok=True)
    for line_id in ids:
        mp3 = out / f'{line_id}.mp3'
        dur = render(line_id, mp3)
        print(line_id, dur, hashlib.sha256(mp3.read_bytes()).hexdigest()[:12], flush=True)

if __name__ == '__main__':
    main()
