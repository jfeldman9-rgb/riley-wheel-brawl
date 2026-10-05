#!/usr/bin/env python3
# Kokoro-82M v1.0 TTS for Stage 3 (Caemlyn) lines. Riley and narrator reuse the approved Stage 2 casts.
import json, subprocess, sys, hashlib, re
from pathlib import Path
import numpy as np, soundfile as sf, torch
from kokoro import KPipeline

REV = 'f3ff3571791e39611d31c381e3a41a3af07b4987'
OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
CAST = {
  'riley':    dict(lang='a', blend={'am_puck': 0.8, 'am_fenrir': 0.2}, speed=1.04, pitch=1.02),
  'narrator': dict(lang='b', blend={'bm_fable': 1.0}, speed=0.95, pitch=0.97),
}
PRON = {
  'saidin': 'sIˈdin',
  'Myrddraal': 'mˈɜɹdɹɑl',
  'Baerlon': 'bˈɛɹlɑn',
  'Caemlyn': 'kˈeɪmlɪn',
  'Darkfriend': 'dˈɑɹkfɹɛnd'
}
LINES = [
  ('st3_story_01', 'narrator', "The trail led south, to Caemlyn, the great white city of the Queen."),
  ('st3_story_03', 'riley', "Twinkle Toes' ribbon. He's here."),
  ('st3_story_05', 'riley', "I always do."),
  ('st3_story_06', 'narrator', "As the sun went down over the palace, Riley went up onto the roofs."),
  ('riley_escape_01', 'riley', "Off me!"),
  ('riley_st3_roof_01', 'riley', "Roof tiles. Great. Of course it's roof tiles."),
  ('riley_st3_glimpse_01', 'riley', "There! On the far roof!"),
  ('riley_counter_01', 'riley', "That one!"),
  ('riley_st3_victory_01', 'riley', "Remember this, then."),
  ('riley_st3_clear_01', 'riley', "Another ribbon. I'm coming, Twinkle Toes."),
]
pipes = {}
def pipe(lang):
  if lang not in pipes: pipes[lang] = KPipeline(lang_code=lang, repo_id='hexgrad/Kokoro-82M')
  return pipes[lang]
def speech_input(text):
  t = text.replace('NOT', 'not')
  for w, ph in PRON.items(): t = re.sub(r"\b%s\b" % re.escape(w), f'[{w}](/{ph}/)', t)
  return t
def synth(who, text, wav):
  c = CAST[who]; p = pipe(c['lang'])
  voice = sum(w * p.load_voice(v) for v, w in c['blend'].items())
  chunks, phon = [], []
  for gs, ps, audio in p(speech_input(text), voice=voice, speed=c['speed']):
    chunks.append(audio.numpy() if hasattr(audio, 'numpy') else np.asarray(audio)); phon.append(ps)
  sf.write(wav, np.concatenate(chunks), 24000); return phon
def process(wav, mp3, c):
  pre = 'vibrato=f=28:d=0.12,' if c.get('rasp') else ''
  af = (f"{pre}rubberband=pitch={c['pitch']}:formant=shifted,highpass=f=70,"
        "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,"
        "loudnorm=I=-16:TP=-2:LRA=7,alimiter=limit=0.75:level=0")
  subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav), '-af', af, '-ac', '1', '-ar', '24000', '-b:a', '96k', str(mp3)], check=True)
manifest = []
for id_, who, text in LINES:
  mp3 = OUT / f'{id_}.mp3'
  wav = OUT / f'_{id_}.wav'; phon = synth(who, text, wav); process(wav, mp3, CAST[who])
  dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(mp3)], capture_output=True, text=True).stdout)
  manifest.append({'id': id_, 'who': who, 'text': text, 'speech_input': speech_input(text), 'phonemes': phon, 'duration_s': round(dur, 3),
                   'sha256': hashlib.sha256(mp3.read_bytes()).hexdigest(), 'asset_path': f'assets/audio/voice/{id_}.mp3', 'source': 'kokoro'})
  print(id_, round(dur, 2), flush=True)
for f in OUT.glob('_*.wav'): f.unlink()
(OUT / 'manifest.json').write_text(json.dumps({'engine': 'Kokoro 0.9.4 / Kokoro-82M v1.0', 'model_revision_requested': REV, 'cast': CAST, 'pronunciation': PRON, 'lines': manifest}, indent=2, ensure_ascii=False))
