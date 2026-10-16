#!/usr/bin/env python3
"""Run faster-whisper small.en on the 18 Stage 3 voice lines, matching against the expected text.
Outputs docs/stage3/voice-stt-check.json.
"""
import sys, os, json, re, difflib, subprocess
from pathlib import Path
import numpy as np
from faster_whisper import WhisperModel

LINES = [
    ("st3_story_01", "The trail led south, to Caemlyn, the great white city of the Queen."),
    ("st3_story_02", "A man with no eyes, on my rooftops, at dusk. He carried a little bundle. Blue ribbon on it."),
    ("st3_story_03", "Twinkle Toes' ribbon. He's here."),
    ("st3_story_04", "There are Darkfriends in the market too, lad. Watch your back."),
    ("st3_story_05", "I always do."),
    ("st3_story_06", "As the sun went down over the palace, Riley went up onto the roofs."),
    ("cutthroat_intro_01", "That's the one the Lady wants. Take him quiet."),
    ("cutthroat_grab_01", "Gotcha!"),
    ("riley_escape_01", "Off me!"),
    ("riley_st3_roof_01", "Roof tiles. Great. Of course it's roof tiles."),
    ("riley_st3_glimpse_01", "There! On the far roof!"),
    ("fade_intro_01", "The boy who channels. Your sister's trail ends here."),
    ("fade_mid_01", "Fear me, boy."),
    ("fade_split_01", "Which shadow is real?"),
    ("riley_counter_01", "That one!"),
    ("fade_defeat_01", "The shadow... remembers..."),
    ("riley_st3_victory_01", "Remember this, then."),
    ("riley_st3_clear_01", "Another ribbon. I'm coming, Twinkle Toes."),
]

def load_audio(path):
    cmd = ['ffmpeg', '-nostdin', '-threads', '0', '-i', str(path), '-f', 's16le', '-ac', '1', '-acodec', 'pcm_s16le', '-ar', '16000', '-']
    out = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(out, np.int16).flatten().astype(np.float32) / 32768.0

def words(s):
    return re.findall(r"[a-z0-9]+", s.lower().replace("'", ""))

def compute_ratio(text, heard):
    w_text = words(text)
    w_heard = words(heard)
    return round(difflib.SequenceMatcher(None, w_text, w_heard).ratio(), 3)

def main():
    voice_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("assets/audio/voice")
    out_json = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("docs/stage3/voice-stt-check.json")
    out_json.parent.mkdir(parents=True, exist_ok=True)

    print("Loading faster-whisper small.en model on CPU...")
    model = WhisperModel("small.en", device="cpu", compute_type="int8")

    results = []
    all_ok = True
    print(f"\nEvaluating {len(LINES)} lines from {voice_dir}...\n")
    for id_, text in LINES:
        audio_path = voice_dir / f"{id_}.mp3"
        if not audio_path.exists():
            print(f"ERROR: missing {audio_path}")
            sys.exit(1)
        audio = load_audio(audio_path)
        segments, _ = model.transcribe(audio, beam_size=5, condition_on_previous_text=False)
        heard = " ".join(s.text.strip() for s in segments).strip()
        ratio = compute_ratio(text, heard)
        results.append({
            "id": id_,
            "text": text,
            "heard": heard,
            "word_match": ratio
        })
        status = "OK" if ratio >= 0.8 else "FAIL"
        if ratio < 0.8:
            all_ok = False
        print(f"[{status}] {id_:20s} match: {ratio:.3f}\n   expected: {text}\n   heard:    {heard}")

    out_json.write_text(json.dumps(results, indent=2, ensure_ascii=False) + "\n")
    print(f"\nSaved STT results to {out_json}")
    if not all_ok:
        print("\nWARNING: Some lines scored < 0.8!")
    return 0 if all_ok else 1

if __name__ == "__main__":
    sys.exit(main())
