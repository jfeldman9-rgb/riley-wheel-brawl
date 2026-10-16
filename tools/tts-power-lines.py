# Kokoro-82M v1.0 TTS for the angreal / Twix lines. Riley renders via ElevenLabs (tools/riley_voice.py, DYLO eleven_v4). Trollocs are new TTS casting.
import json, subprocess, sys, hashlib, re
from pathlib import Path
import numpy as np, soundfile as sf, torch
from kokoro import KPipeline
sys.path.insert(0, str(Path(__file__).resolve().parent)); import riley_voice  # Riley: ElevenLabs DYLO, re-recorded 2026-10-09, approved by Jason F via Grok Bot
REV = 'f3ff3571791e39611d31c381e3a41a3af07b4987'
OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
CAST = {
  'riley':    riley_voice.CAST,  # was Kokoro 80% am_puck + 20% am_fenrir
  'grunt':  dict(lang='a', blend={'am_onyx': 0.7, 'am_fenrir': 0.3}, speed=0.92, pitch=0.74),
  'spear':  dict(lang='b', blend={'bm_lewis': 1.0}, speed=0.98, pitch=0.80),
  'hound':  dict(lang='a', blend={'am_fenrir': 0.6, 'am_echo': 0.4}, speed=1.06, pitch=0.84, rasp=True),
}
PRON = {'saidin': 'sIˈdin', 'Ishamael': 'ɪʃˈAmAɛl', 'Lanfear': 'lˈænfɪɹ', 'Aginor': 'ˈæɡɪnɔɹ', 'Myrddraal': 'mˈɜɹdɹɑl', 'Twix': 'twˈɪks', 'Forsaken': 'fɔɹsˈAkən', 'Trollocs': 'tɹˈɑlɑks'}
LINES = [
  ('riley_saangreal_01', 'riley', 'Whoa. That is a LOT of saidin!'),
  ('riley_lightning_01', 'riley', 'Lightning, on my call!'),
  ('riley_fireshield_01', 'riley', 'Try touching me now!'),
  ('riley_airwhip_01', 'riley', 'Come here, you!'),
  ('riley_twix_01', 'riley', 'Wait... is that a Twix?'),
  ('twix_01', 'riley', 'Snack truce. One Twix each, and nobody bites anybody.'),
  ('twix_02', 'grunt', "Mmf. Crunchy. Way better than Ishamael's stew. His stew bites back."),
  ('twix_03', 'spear', 'Lanfear calls us smelly. Every day! I took a bath once. Last spring!'),
  ('twix_04', 'hound', 'Aginor made my snout. Then he laughed at my snout.'),
  ('twix_05', 'grunt', 'And the Myrddraal stare at you with no eyes. How do they stare with NO EYES?'),
  ('twix_06', 'spear', 'No Forsaken ever says thank you. Not one time. Not even on Winternight.'),
  ('twix_07', 'riley', 'Have you guys ever thought about... not working for the Dark One?'),
  ('twix_08', 'all', '...Does the Light have more Twix?'),
  ('twix_09', 'riley', "Ask me after I win. Break's over!"),
]
pipes = {}
def pipe(lang):
  if lang not in pipes: pipes[lang] = KPipeline(lang_code=lang, repo_id='hexgrad/Kokoro-82M')
  return pipes[lang]
def speech_input(text):
  t = text.replace('LOT', 'lot').replace('NO EYES', 'no eyes')
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
    if who == 'riley':
      riley_voice.require_key(); riley_voice.render(id_, mp3); phon = ['(ElevenLabs ' + riley_voice.LINES[id_]['prompt'] + ')']
    else:
      wav = OUT / f'_{id_}.wav'; phon = synth(who, text, wav); process(wav, mp3, CAST[who])
  dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(mp3)], capture_output=True, text=True).stdout)
  manifest.append({'id': id_, 'who': who, 'text': text, 'speech_input': speech_input(text), 'phonemes': phon, 'source': 'elevenlabs' if who == 'riley' else 'kokoro', 'duration_s': round(dur, 3),
                   'sha256': hashlib.sha256(mp3.read_bytes()).hexdigest(), 'asset_path': f'assets/audio/voice/{id_}.mp3'})
  print(id_, round(dur, 2), flush=True)
for f in OUT.glob('_*.wav'): f.unlink()
(OUT / 'manifest.json').write_text(json.dumps({'engine': 'Kokoro 0.9.4 / Kokoro-82M v1.0', 'model_revision_requested': REV, 'cast': CAST, 'pronunciation': PRON, 'lines': manifest}, indent=2, ensure_ascii=False))
