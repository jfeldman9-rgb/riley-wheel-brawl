#!/usr/bin/env python3
"""Generate villain + narrator voice clips with free Microsoft neural voices (edge-tts).

Riley and Twinkle Toes are NEVER generated: they are real kids and Jason records them
(see assets/audio/voice/RECORDING_LIST.md).

  python3 -m venv .venv && .venv/bin/pip install edge-tts
  node tools/voices-dump.cjs > /tmp/voices.json
  .venv/bin/python tools/make-voices.py /tmp/voices.json   # writes assets/audio/voice/<id>.mp3
Needs ffmpeg. Each clip: TTS -> character effect -> trim silence -> loudnorm -16 LUFS -> mono 24 kHz 48 kbps mp3.
"""
import asyncio, json, os, subprocess, sys, tempfile
import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'audio', 'voice')
FX = {
    'hall': 'aecho=0.8:0.7:60|120:0.16|0.09',
    'menace': 'bass=g=4:f=110,aecho=0.8:0.6:45|95:0.14|0.07',
    'cold': 'highpass=f=110,aecho=0.8:0.75:90|180:0.22|0.12',
    'eerie': 'flanger=delay=2:depth=3:speed=0.35,aecho=0.8:0.8:110:0.28',
    'regal': 'aecho=0.8:0.7:70|140:0.14|0.07',
    'beast': 'asetrate=24000*0.84,aresample=24000,atempo=1.19,bass=g=3:f=120',
    'room': 'aecho=0.8:0.6:30:0.1',
}
TRIM = ('silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,'
        'areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,areverse')


def measure(path):
    out = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af', 'ebur128', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    vals = [l.split()[1] for l in out.splitlines() if l.strip().startswith('I:')]
    return float(vals[-1])


async def synth(text, cfg, path):
    await edge_tts.Communicate(text, cfg['voice'], rate=cfg['rate'], pitch=cfg['pitch']).save(path)


def main():
    table = json.load(open(sys.argv[1]))
    only = set(sys.argv[2:])
    os.makedirs(OUT, exist_ok=True)
    tmp = tempfile.mkdtemp()
    for line in table['lines']:
        if not line['generated'] or (only and line['id'] not in only):
            continue
        cfg = table['tts'][line['who']]
        raw = os.path.join(tmp, line['id'] + '.mp3')
        asyncio.run(synth(line['text'], cfg, raw))
        chain = ','.join(filter(None, [FX.get(cfg.get('fx')), TRIM, 'loudnorm=I=-16:TP=-1.5:LRA=11',
                                       'aresample=24000', 'apad=pad_dur=0.08']))
        dst = os.path.join(OUT, line['file'])
        wav = os.path.join(tmp, line['id'] + '.wav')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', chain, '-ac', '1', '-ar', '24000', wav], check=True)
        # Short clips: single-pass loudnorm lands a few dB off, so measure and trim to -16 LUFS.
        gain = -16.0 - measure(wav)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-af',
                        'volume=%.2fdB,alimiter=limit=0.84:level=false,aresample=24000' % gain,
                        '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '48k', dst], check=True)
        print(line['id'], cfg['voice'], os.path.getsize(dst))


if __name__ == '__main__':
    main()
