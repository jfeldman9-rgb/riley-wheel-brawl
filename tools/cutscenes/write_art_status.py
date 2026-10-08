#!/usr/bin/env python3
"""Write assets/cutscenes/ART_STATUS.json (provenance for the shipped video cutscenes)."""
import hashlib, json, os, subprocess, sys
SRC = sys.argv[1] if len(sys.argv) > 1 else '/workspace/cutscenes'
OUT = 'assets/cutscenes'
CLIPS = [  # id, source file, trim start, where it plays, what it shows
    ('twinkletoes', 'twinkletoes_v1.mp4', 3.625, 'intro 1/3 (after the first title tap)', 'Twinkle Toes snatched mid-recital by a farting Trolloc (comedic). The first 3.625 s wide shot is cut: a second Trolloc materialises there (generation glitch).'),
    ('moiraine', 'moiraine_v1.mp4', 0, 'intro 2/3', 'Moiraine on the Winternight green, light gathering in her hand.'),
    ('intro', 'intro_v2.mp4', 0, 'intro 3/3, then Stage 1', 'Riley (only ever seen from behind, black coat) faces charging Trollocs with fire in his hands.'),
    ('intro_battle', 'battle_edit_v1.mp4', 0, 'intro 4/4, right after intro_v2, then Stage 1', 'Battle edit: Riley (from behind) fights the Trolloc pack with fire; ends on Riley\'s "TWINKLE TOES!" yell.'),
    ('stage1', 'stage1_v1.mp4', 0, 'Stage 1, before the Trolloc Chieftain fight', 'The Trolloc Chieftain roaring in the burning village.'),
    ('stage2', 'stage2_v2.mp4', 0, 'Stage 2 start, before the story panels', 'Whitecloaks and the burning barn; Riley from behind.'),
    ('stage3', 'stage3_v1.mp4', 0, 'Stage 3 start, before the story panels', 'The Myrddraal on moonlit rooftops, cutthroats creeping.'),
    ('stage4', 'stage4_v2.mp4', 0, 'Stage 4 start, before the story panels', 'Shadar Logoth: cultists, the Draghkar lands and spreads its wings.'),
]
def sha(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()
def dur(p):
    return round(float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]).decode()), 3)
entries = []
for cid, src, ss, where, desc in CLIPS:
    files = [f'{OUT}/{cid}.mp4', f'{OUT}/{cid}.jpg']
    s = os.path.join(SRC, src)
    entries.append({
        'id': cid, 'files': files, 'sha256': {f: sha(f) for f in files}, 'bytes': {f: os.path.getsize(f) for f in files},
        'durationSeconds': dur(files[0]), 'placeholder': False, 'source': 'grok-imagine', 'plays': where, 'shows': desc,
        'art': {
            'status': 'photoreal generated video (Grok Imagine), 1280x720 15 s with audio, re-encoded for the web',
            'sourceFile': src, 'sourceSha256': sha(s) if os.path.exists(s) else None, 'trimStartSeconds': ss,
            'encode': 'tools/cutscenes/encode_cutscenes.sh (H.264 main 960x540 CRF 27/29, yuv420p, +faststart, AAC 96k, loudness toward -20 LUFS)',
            'likeness': 'Riley appears only from behind; no real person\'s face is depicted.',
            'approvedBy': 'Jason F (owner) via Grok Bot, 2026-10-07',
        },
    })
    if cid == 'intro_battle':
        entries[-1]['art']['status'] = 'photoreal generated video (Grok Imagine), three shots s1/s2b/s3b edited to 18.1 s at 1280x720, re-encoded for the web'
        entries[-1]['art']['shots'] = ['s1', 's2b', 's3b']
        entries[-1]['voice'] = {'line': 'TWINKLE TOES!', 'speaker': 'Riley', 'tool': 'ElevenLabs', 'voice': 'DYLO', 'model': 'eleven_v3', 'mixedIntoSource': True}
json.dump({'version': 1, 'note': 'Video cutscenes stream on demand (src/cutscene.js); not part of the 25 MB pre-fight sum. Stage 5 (stage5_v1) is encoded but not shipped until Stage 5 goes live.', 'entries': entries},
          open(f'{OUT}/ART_STATUS.json', 'w'), indent=1)
print(len(entries), 'entries')
