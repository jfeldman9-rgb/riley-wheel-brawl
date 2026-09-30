#!/usr/bin/env python3
"""Decode and measure EVERY shipped voice. This is not an auditory listening test.

Requires only Python, NumPy, ffmpeg and ffprobe. Writes deterministic JSON plus
an HTML audition inventory. Never overwrites or synthesizes an audio asset.
"""
import argparse, concurrent.futures, hashlib, html, json, math, pathlib, subprocess
import numpy as np
ROOT = pathlib.Path(__file__).resolve().parents[2]
NAMES = ["Riley", "Twinkle Toes", "Winternight", "Emond's Field", "Caemlyn", "Andor", "Shadar Logoth", "Mashadar", "Tear", "Callandor", "Loial", "Saidin", "Asha'man", "M'Hael", "Balefire"]

def command(args):
    return subprocess.run(args, check=True, capture_output=True)

def audit(line):
    path = ROOT / 'assets/audio/voice' / line['file']
    raw = path.read_bytes()
    probe = json.loads(command(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)]).stdout)
    stream = next(s for s in probe['streams'] if s['codec_type'] == 'audio')
    pcm = np.frombuffer(command(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'f32le', '-ac', '1', '-ar', '24000', '-']).stdout, dtype='<f4')
    measure = command(['ffmpeg', '-hide_banner', '-i', str(path), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-']).stderr.decode()
    loud, _ = json.JSONDecoder().raw_decode(measure[measure.rfind('{'):])
    peak = float(np.max(np.abs(pcm))) if len(pcm) else 0
    db = lambda x: round(20 * math.log10(max(float(x), 1e-12)), 3)
    signal = np.flatnonzero(np.abs(pcm) > 10 ** (-45 / 20))
    lead = int(signal[0]) / 24 if len(signal) else len(pcm) / 24
    tail = (len(pcm) - 1 - int(signal[-1])) / 24 if len(signal) else len(pcm) / 24
    lufs, true_peak = float(loud['input_i']), float(loud['input_tp'])
    flags = []
    if len(pcm) / 24000 <= .25: flags.append('below-placeholder-cutoff')
    if true_peak > -1: flags.append('true-peak-headroom')
    # Preserve raw measurements; the runtime targets -17 LUFS without re-encoding.
    gain_db = round(-17 - lufs, 2)
    if true_peak + gain_db > -1: flags.append('normalized-true-peak-headroom')
    if np.count_nonzero(np.abs(pcm) >= .999): flags.append('digital-clipping')
    if lead > 300: flags.append('long-leading-silence')
    if tail > 600: flags.append('long-trailing-silence')
    return {**{k:line[k] for k in ['id','who','name','text','file']}, 'asset_path':str(path.relative_to(ROOT)),
        'sha256':hashlib.sha256(raw).hexdigest(), 'bytes':len(raw), 'codec':stream['codec_name'],
        'sample_rate_hz':int(stream['sample_rate']), 'channels':stream['channels'],
        'duration_s':round(len(pcm)/24000,4), 'integrated_lufs':lufs, 'true_peak_dbtp':true_peak,
        'playback_gain_db':gain_db, 'effective_integrated_lufs':round(lufs+gain_db,2),
        'effective_true_peak_dbtp':round(true_peak+gain_db,2), 'sample_peak_dbfs':db(peak), 'rms_dbfs':db(np.sqrt(np.mean(pcm.astype(float)**2))),
        'clipped_sample_count':int(np.count_nonzero(np.abs(pcm)>=.999)),
        'leading_silence_ms':round(lead,2),'trailing_silence_ms':round(tail,2),
        'objective_flags':flags,'pronunciation_review_terms':[n for n in NAMES if n.lower() in line['text'].lower()],
        'auditory_review':'not-performed-audio-input-unavailable'}

def audition_html(report):
    rows=[]
    for i,line in enumerate(report['lines'],1):
        terms=', '.join(line['pronunciation_review_terms']) or 'None flagged by text scan'
        flags=', '.join(line['objective_flags']) or 'Measured signal checks pass'
        src='../../../'+line['asset_path']
        rows.append(f'''<article id="{html.escape(line['id'])}"><h2>{i:02d}. {html.escape(line['name'])} · {html.escape(line['id'])}</h2>
<p>{html.escape(line['text'])}</p><audio controls preload="none" src="{html.escape(src)}"></audio>
<p class="meta">{line['duration_s']:.2f} s · {line['integrated_lufs']:.2f} LUFS · {line['true_peak_dbtp']:.2f} dBTP<br>Game trim {line['playback_gain_db']:+.2f} dB → {line['effective_integrated_lufs']:.2f} LUFS (audition plays the original file)<br>{html.escape(flags)}<br>Listen for: naturalness, complete word endings, and {html.escape(terms)}</p>
<label>Listener verdict <select data-id="{html.escape(line['id'])}"><option value="pending">Not listened</option><option value="pass">Listened: pass</option><option value="revise">Listened: needs revision</option></select></label>
<label>Notes <input data-note="{html.escape(line['id'])}" placeholder="Pronunciation, performance, timing"></label></article>''')
    return '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Riley 1.1 · Complete voice auditions</title>
<style>body{font:17px/1.5 system-ui;background:#101826;color:#eff5ff;max-width:900px;margin:40px auto;padding:0 20px}h1{line-height:1.15}a{color:#97dcff}article{background:#1b2940;padding:20px;margin:18px 0;border-radius:12px}h2{font-size:18px;margin-top:0}.meta{font-size:14px;color:#c3cfe1}audio{width:100%}label{display:block;margin-top:10px}select,input,button{font:inherit;padding:6px;border-radius:4px}input{box-sizing:border-box;width:100%}button{cursor:pointer;margin-right:10px}strong{color:#ffe291}</style>
<h1>Riley 1.1 · Complete voice auditions</h1>
<p><strong>Auditory review is pending for all 80 clips.</strong> This environment cannot receive audio input. Waveform/loudness checks are objective evidence only; they cannot certify pronunciation or naturalness. No performance is marked approved by these measurements.</p>
<p>All original cast/audio files are retained unchanged. Each clip below uses the shipped asset directly; only one audition can play at a time. Review all words, especially the named terms. Existing Kokoro casting was approved in the 1.0 release; this inventory does not revoke that approval.</p>
<p>Serve the repository root with <code>python3 -m http.server 8000</code>, then open <code>/docs/review/audio-v11/auditions.html</code>. Verdicts are saved only in this browser. Export after listening to preserve a review record.</p>
<button id="export">Export listening notes</button><button id="stop">Stop playback</button><p id="progress" aria-live="polite"></p>
'''+'\n'.join(rows)+'''
<script>
'use strict';
const key='rwb-v11-voice-auditions', verdicts={};
try { Object.assign(verdicts, JSON.parse(localStorage.getItem(key)||'{}')); } catch (_) {}
const update=()=>{try{localStorage.setItem(key,JSON.stringify(verdicts));}catch(_){} const entries=Object.values(verdicts);document.getElementById('progress').textContent=entries.filter(v=>v.verdict&&v.verdict!=='pending').length+' / 80 listened';};
for(const audio of document.querySelectorAll('audio'))audio.addEventListener('play',()=>{for(const other of document.querySelectorAll('audio'))if(other!==audio)other.pause();});
for(const select of document.querySelectorAll('select')){const id=select.dataset.id;select.value=verdicts[id]?.verdict||'pending';select.addEventListener('change',()=>{verdicts[id]={...verdicts[id],verdict:select.value};update();});}
for(const input of document.querySelectorAll('input')){const id=input.dataset.note;input.value=verdicts[id]?.note||'';input.addEventListener('input',()=>{verdicts[id]={...verdicts[id],note:input.value};update();});}
document.getElementById('stop').onclick=()=>{for(const a of document.querySelectorAll('audio'))a.pause();};
document.getElementById('export').onclick=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify({reviewedAt:new Date().toISOString(),verdicts},null,2)],{type:'application/json'}));a.href=url;a.download='riley-v11-listening-notes.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};update();
</script></html>'''

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=pathlib.Path,default=ROOT/'docs/review/audio-v11')
    args=parser.parse_args()
    table=json.loads(command(['node',str(ROOT/'tools/voices-dump.cjs')]).stdout)
    lines=sorted(table['lines'],key=lambda l:(l['who'],l['id']))
    assert len({l['file'] for l in lines})==len(lines),'Duplicate filenames'
    catalog={l['file'] for l in lines}
    actual={p.name for p in (ROOT/'assets/audio/voice').glob('*.mp3')}
    assert actual==catalog,{'uncatalogued':sorted(actual-catalog),'missing':sorted(catalog-actual)}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: audited=list(pool.map(audit,lines))
    report={'scope':'Every shipped MP3 voice; independent decode of current bytes',
      'baseline_commit':'816eb1e9dc209b00a6da4f8eeb58ea2ead69bdbc',
      'method':'FFmpeg loudnorm input measurement (ITU-R BS.1770), decoded PCM sample inspection',
      'auditory_review':'NOT PERFORMED: audio input is unsupported by this model/tool environment',
      'regeneration':'None. No audible performance defect can be responsibly inferred from numeric checks.',
      'count':len(audited),'total_bytes':sum(l['bytes'] for l in audited),
      'objective_flagged_count':sum(bool(l['objective_flags']) for l in audited),
      'integrated_lufs_range':[min(l['integrated_lufs'] for l in audited),max(l['integrated_lufs'] for l in audited)],
      'max_true_peak_dbtp':max(l['true_peak_dbtp'] for l in audited),
      'runtime_target_lufs':-17, 'max_effective_true_peak_dbtp':max(l['effective_true_peak_dbtp'] for l in audited), 'lines':audited}
    args.output.mkdir(parents=True,exist_ok=True)
    (args.output/'voice-audit.json').write_text(json.dumps(report,indent=2)+'\n')
    (args.output/'auditions.html').write_text(audition_html(report))
    print(json.dumps({k:v for k,v in report.items() if k!='lines'},indent=2))
    for line in audited:
        if line['objective_flags']: print(line['id'],line['objective_flags'])

if __name__=='__main__':main()
