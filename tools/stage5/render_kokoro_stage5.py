import importlib.util, json, sys, hashlib
from pathlib import Path
REPO = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('tts4', REPO/'tools/stage4/tts_stage4_lines.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
m.PRON = {'Loial':'ˈlɔɪɑl','Trolloc':'tɹˈɑlɑk','Tarwin':'tˈɑɹwɪn','Blight':'blˈaɪt','Riley':'ɹˈaɪli'}
man = json.load(open(REPO/'tools/stage5/audio-manifest.json'))
OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
only = set(sys.argv[2:])
rows=[]
for row in man['lines']:
    if row['engine']!='kokoro' or (only and row['id'] not in only): continue
    wav = OUT/f"_{row['id']}.wav"; mp3 = OUT/f"{row['id']}.mp3"
    m.kokoro_synth(row['who'], row['text'], wav)
    m.to_mp3(wav, mp3, m.KOKORO[row['who']]['pitch']); wav.unlink()
    rows.append({'id':row['id'],'who':row['who'],'text':row['text'],'speech_input':m.speech_input(row['text']),'bytes':mp3.stat().st_size})
    print(row['id'], m.speech_input(row['text']), flush=True)
json.dump(rows,open(OUT/'kokoro-lines.json','w'),indent=2,ensure_ascii=False)
