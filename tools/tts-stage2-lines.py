# Kokoro-82M v1.0 TTS for the Stage 2 (Baerlon) lines. Riley uses the approved cast; narrator, Jaret Byar and the Whitecloak are new TTS casting.
import json, subprocess, sys, hashlib, re
from pathlib import Path
import numpy as np, soundfile as sf, torch
from kokoro import KPipeline
REV = 'f3ff3571791e39611d31c381e3a41a3af07b4987'
OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
CAST = {
  'riley':    dict(lang='a', blend={'am_puck': 0.8, 'am_fenrir': 0.2}, speed=1.04, pitch=1.02),
  'narrator': dict(lang='b', blend={'bm_fable': 1.0}, speed=0.95, pitch=0.97),
  'byar':     dict(lang='b', blend={'bm_daniel': 0.7, 'bm_lewis': 0.3}, speed=0.94, pitch=0.90),
  'zealot':   dict(lang='a', blend={'am_eric': 0.7, 'am_liam': 0.3}, speed=1.02, pitch=0.93),
}
PRON = {'saidin': 'sIˈdin', 'Myrddraal': 'mˈɜɹdɹɑl', 'Baerlon': 'bˈɛɹlɑn', 'Darkfriend': 'dˈɑɹkfɹɛnd'}
LINES = [
  ('st2_story_01', 'narrator', "The Fade's trail led north, through the rain, to the walled town of Baerlon."),
  ('st2_story_02', 'riley', 'These hoofprints... a Myrddraal came this way. Hang on, Twinkle Toes.'),
  ('st2_story_03', 'riley', "That's her ribbon! She was here!"),
  ('st2_story_04', 'byar', 'A boy who channels? Darkfriend! Children of the Light, seize him!'),
  ('st2_story_05', 'riley', "Darkfriend? I'm sixteen! I'm just looking for my friend!"),
  ('st2_story_06', 'zealot', "That's exactly what a Darkfriend would say!"),
  ('zealot_intro_01', 'zealot', 'Halt, Darkfriend! In the name of the Light!'),
  ('riley_st2_stable_01', 'riley', 'Hound Trollocs? The Fade left guards behind!'),
  ('riley_ribbon_01', 'riley', "Twinkle Toes' ribbon! I'm getting closer."),
  ('zealot_mud_01', 'zealot', 'My cloak! Do you know how hard it is to get mud out of white wool?!'),
  ('riley_mud_01', 'riley', 'Try cold water!'),
  ('byar_intro_01', 'byar', 'I am Jaret Byar, Child of the Light. Kneel, Darkfriend!'),
  ('byar_parry_01', 'byar', 'Too slow, Darkfriend!'),
  ('byar_mid_01', 'byar', 'Archers! Cover the yard!'),
  ('byar_volley_01', 'byar', 'Loose!'),
  ('byar_rage_01', 'byar', 'Burn the barn! Smoke the Darkfriend out!'),
  ('byar_defeat_01', 'byar', 'This is not over, Darkfriend! The Light will find you!'),
  ('riley_st2_victory_01', 'riley', "I'm NOT a Darkfriend! ...And your barn is on fire!"),
  ('riley_st2_clear_01', 'riley', 'The trail keeps going. Hang on, Twinkle Toes. I am coming.'),
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
  if who == 'all':
    parts = []
    for i, w in enumerate(['grunt', 'spear', 'hound']):
      wav = OUT / f'_{id_}_{w}.wav'; synth(w, text, wav); proc = OUT / f'_{id_}_{w}.p.wav'
      c = CAST[w]; pre = 'vibrato=f=28:d=0.12,' if c.get('rasp') else ''
      subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav), '-af', f"{pre}rubberband=pitch={c['pitch']}:formant=shifted,adelay={i*70}", str(proc)], check=True)
      parts.append(proc)
    mix = OUT / f'_{id_}.wav'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *sum([['-i', str(p)] for p in parts], []), '-filter_complex', 'amix=inputs=3:normalize=0', str(mix)], check=True)
    process(mix, mp3, {'pitch': 1.0}); phon = ['(3-voice chorus: grunt + spear + hound)']
  else:
    wav = OUT / f'_{id_}.wav'; phon = synth(who, text, wav); process(wav, mp3, CAST[who])
  dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(mp3)], capture_output=True, text=True).stdout)
  manifest.append({'id': id_, 'who': who, 'text': text, 'speech_input': speech_input(text), 'phonemes': phon, 'duration_s': round(dur, 3),
                   'sha256': hashlib.sha256(mp3.read_bytes()).hexdigest(), 'asset_path': f'assets/audio/voice/{id_}.mp3'})
  print(id_, round(dur, 2), flush=True)
for f in OUT.glob('_*.wav'): f.unlink()
(OUT / 'manifest.json').write_text(json.dumps({'engine': 'Kokoro 0.9.4 / Kokoro-82M v1.0', 'model_revision_requested': REV, 'cast': CAST, 'pronunciation': PRON, 'lines': manifest}, indent=2, ensure_ascii=False))
