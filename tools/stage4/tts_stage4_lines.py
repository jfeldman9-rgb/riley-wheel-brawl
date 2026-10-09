#!/usr/bin/env python3
"""Stage 4 TTS. Reads tools/stage4/audio-manifest.json and writes MP3s.

Riley and Loial use Kokoro, the same shape as tools/tts-stage2-lines.py.
The Draghkar, cultists, the narrator and Mordeth use ElevenLabs (Q3).

If Kokoro or ELEVENLABS_API_KEY is missing, this exits before writing any audio.
It will not invent a silent or stand-in voice file.

usage: python3 tools/stage4/tts_stage4_lines.py OUT_DIR
"""
import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = json.loads((ROOT / 'tools' / 'stage4' / 'audio-manifest.json').read_text())
KOKORO = {
    'riley': dict(lang='a', blend={'am_puck': 0.8, 'am_fenrir': 0.2}, speed=1.04, pitch=1.02),
    'loial': dict(lang='b', blend={'bm_george': 1.0}, speed=0.90, pitch=0.86),
}
ELEVEN_VOICES = {
    'draghkar': os.environ.get('ELEVENLABS_VOICE_DRAGHKAR', ''),
    'cultist': os.environ.get('ELEVENLABS_VOICE_CULTIST', ''),
    'narrator': os.environ.get('ELEVENLABS_VOICE_NARRATOR', ''),
    'mordeth': os.environ.get('ELEVENLABS_VOICE_MORDETH', ''),
}
PRON = {
    'Aridhol': 'ˈɛɹɪdˌɔl', 'Moiraine': 'mwɑˈreɪn', 'Caemlyn': 'ˈkeɪmlɪn',
    'Mashadar': 'ˈmæʃədɑɹ', 'Waygate': 'ˈweɪɡeɪt', 'Loial': 'ˈlɔɪæl',
}

def speech_input(text):
    out = text
    for word, phon in PRON.items():
        out = re.sub(r'\b%s\b' % re.escape(word), f'[{word}](/{phon}/)', out)
    return out

def require_engines(lines):
    missing = []
    if any(row['engine'] == 'kokoro' for row in lines):
        try:
            import kokoro  # noqa: F401
        except ImportError:
            missing.append('kokoro (pip package, same as Stage 2)')
    if any(row['engine'] == 'elevenlabs' for row in lines):
        if not os.environ.get('ELEVENLABS_API_KEY'):
            missing.append('ELEVENLABS_API_KEY')
        for who in {row['who'] for row in lines if row['engine'] == 'elevenlabs'}:
            if not ELEVEN_VOICES.get(who):
                missing.append(f'ELEVENLABS_VOICE_{who.upper()}')
    if missing:
        sys.exit('Stage 4 TTS not rendered: ' + ', '.join(missing) + '. No voice files were written.')

def kokoro_synth(who, text, wav):
    import numpy as np
    import soundfile as sf
    from kokoro import KPipeline
    cast = KOKORO[who]
    if not hasattr(kokoro_synth, 'pipes'):
        kokoro_synth.pipes = {}
    pipes = kokoro_synth.pipes
    if cast['lang'] not in pipes:
        pipes[cast['lang']] = KPipeline(lang_code=cast['lang'], repo_id='hexgrad/Kokoro-82M')
    pipe = pipes[cast['lang']]
    voice = sum(w * pipe.load_voice(v) for v, w in cast['blend'].items())
    chunks = []
    for _gs, _ps, audio in pipe(speech_input(text), voice=voice, speed=cast['speed']):
        chunks.append(audio.numpy() if hasattr(audio, 'numpy') else np.asarray(audio))
    sf.write(wav, np.concatenate(chunks), 24000)

def eleven_synth(who, text, mp3):
    import urllib.request
    voice = ELEVEN_VOICES[who]
    body = json.dumps({'text': text, 'model_id': 'eleven_multilingual_v2'}).encode()
    req = urllib.request.Request(
        f'https://api.elevenlabs.io/v1/text-to-speech/{voice}',
        data=body,
        headers={'xi-api-key': os.environ['ELEVENLABS_API_KEY'], 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'},
        method='POST')
    with urllib.request.urlopen(req) as res:
        mp3.write_bytes(res.read())

def to_mp3(wav, mp3, pitch):
    af = (f"rubberband=pitch={pitch}:formant=shifted,highpass=f=70,"
          "loudnorm=I=-16:TP=-2:LRA=7,alimiter=limit=0.75:level=0")
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav), '-af', af, '-ac', '1', '-ar', '24000', '-b:a', '96k', str(mp3)], check=True)

def main():
    if len(sys.argv) != 2:
        sys.exit('usage: tts_stage4_lines.py OUT_DIR')
    out = Path(sys.argv[1])
    lines = MANIFEST['lines']
    require_engines(lines)
    out.mkdir(parents=True, exist_ok=True)
    written = []
    for row in lines:
        mp3 = out / f"{row['id']}.mp3"
        text = row['text']
        if row['engine'] == 'kokoro':
            wav = out / f"_{row['id']}.wav"
            kokoro_synth(row['who'], text, wav)
            to_mp3(wav, mp3, KOKORO[row['who']]['pitch'])
            wav.unlink()
        else:
            eleven_synth(row['who'], text, mp3)
        if mp3.stat().st_size < 2048:
            mp3.unlink()
            sys.exit(f"{row['id']} came back under 2 KB. Refusing to keep it.")
        written.append({
            'id': row['id'], 'speaker': row['speaker'], 'engine': row['engine'], 'text': text,
            'file': row['file'], 'sha256': hashlib.sha256(mp3.read_bytes()).hexdigest(),
            'bytes': mp3.stat().st_size,
        })
        print(row['id'], flush=True)
    (out / 'stage4-voice-manifest.json').write_text(json.dumps({'lines': written}, indent=2))

if __name__ == '__main__':
    main()
