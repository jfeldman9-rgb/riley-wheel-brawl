#!/usr/bin/env bash
# Encode Moiraine/Lan call clips (and the optional Stage 7 intro) from Grok Imagine takes.
# 854x480 H.264 CRF 29, faststart, GOP 24, same recipe as encode_rand.sh.
# Usage: tools/cutscenes/encode_callins.sh SRC_DIR [OUT_DIR] [CLIPSET]
#   CLIPSET=call7  -> M1 M2 L1 L2 D1 D2 into assets/cutscenes/call7/
#   CLIPSET=stage7 -> stage7 (intro) into assets/cutscenes/stage7/
# Source takes are named <id-lowercase>.mp4 in SRC_DIR (e.g. m1.mp4, stage7.mp4).
# Missing sources are skipped. Riley must only ever be seen from behind:
# frame-review every output at 4 fps before it ships (docs/STAGE7-PLAN.md section 4).
set -euo pipefail
SRC=${1:?usage: encode_callins.sh SRC_DIR [OUT_DIR] [CLIPSET]}
SET=${3:-call7}
case "$SET" in
  call7) IDS="M1 M2 L1 L2 D1 D2"; OUT=${2:-assets/cutscenes/call7} ;;
  stage7) IDS="stage7"; OUT=${2:-assets/cutscenes/stage7} ;;
  *) echo "unknown CLIPSET $SET (call7|stage7)" >&2; exit 2 ;;
esac
mkdir -p "$OUT"
for id in $IDS; do
  lower=$(printf '%s' "$id" | tr 'A-Z' 'a-z')
  in="$SRC/$lower.mp4"
  [ -f "$in" ] || { echo "skip $id (no $in)"; continue; }
  ffmpeg -nostdin -hide_banner -loglevel error -y -i "$in" \
    -vf "scale=854:480:flags=lanczos,setsar=1,format=yuv420p" \
    -c:v libx264 -profile:v main -level 3.1 -preset slow -crf 29 -g 24 -movflags +faststart \
    -c:a aac -b:a 64k -ar 44100 "$OUT/$id.mp4"
  ffmpeg -nostdin -hide_banner -loglevel error -y -i "$OUT/$id.mp4" -frames:v 1 \
    -vf "scale=640:360:flags=lanczos" -q:v 5 "$OUT/$id.jpg"
  echo "$id bytes=$(stat -c%s "$OUT/$id.mp4" 2>/dev/null || stat -f%z "$OUT/$id.mp4") poster=$(stat -c%s "$OUT/$id.jpg" 2>/dev/null || stat -f%z "$OUT/$id.jpg")"
done
