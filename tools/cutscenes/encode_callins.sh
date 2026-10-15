#!/usr/bin/env bash
# Encode reviewed call-ins into a caller-supplied Stage 7 folder. Originals stay untouched.
set -euo pipefail
src=${1:?Usage: encode_callins.sh SOURCE_FOLDER OUTPUT_FOLDER}
out=${2:?Usage: encode_callins.sh SOURCE_FOLDER OUTPUT_FOLDER}
mkdir -p "$out"
for id in M1 M2 L1 L2 D1 D2 S7; do
  input="$src/$id.mp4"
  test -f "$input" || continue
  ffmpeg -nostdin -hide_banner -loglevel error -y -i "$input" -t 10 \
    -vf 'scale=854:480:force_original_aspect_ratio=increase,crop=854:480,setsar=1,format=yuv420p' \
    -c:v libx264 -profile:v main -level 3.1 -preset slow -crf 29 -maxrate 1100k -bufsize 2200k \
    -c:a aac -b:a 64k -movflags +faststart "$out/$id.mp4"
  ffmpeg -nostdin -hide_banner -loglevel error -y -i "$out/$id.mp4" -frames:v 1 -q:v 5 "$out/$id.jpg"
  python3 - "$out/$id.mp4" <<'PY'
import json, os, subprocess, sys
p=sys.argv[1]
d=float(json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-of','json',p]))['format']['duration'])
assert 5 <= d <= 10.1, (p,d)
assert os.path.getsize(p)/d <= 160000, p
PY
done
