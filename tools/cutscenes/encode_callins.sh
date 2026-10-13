#!/usr/bin/env bash
# Encode Moiraine / Lan call clips. Riley, in every source, is framed from behind
# (black long coat, short dark hair, fingerless gloves; never a face, never past profile).
# 854x480 H.264 CRF 29, faststart. Missing sources are skipped.
# Usage: tools/cutscenes/encode_callins.sh SRC_DIR [OUT_DIR]
# Looks for M1 M2 L1 L2 D1 D2 and optional S7 as <id>.mp4 in SRC_DIR.
set -euo pipefail
SRC=${1:-}
OUT=${2:-assets/cutscenes/call7}
if [ -z "$SRC" ]; then echo "usage: encode_callins.sh SRC_DIR [OUT_DIR]" >&2; exit 2; fi
mkdir -p "$OUT"
for id in M1 M2 L1 L2 D1 D2 S7; do
  in="$SRC/$id.mp4"
  if [ ! -f "$in" ]; then echo "skip $id (no $in)"; continue; fi
  dest="$OUT"
  if [ "$id" = "S7" ]; then dest="assets/cutscenes/stage7"; mkdir -p "$dest"; fi
  ffmpeg -nostdin -hide_banner -loglevel error -y -i "$in" \
    -vf "scale=854:480:flags=lanczos,setsar=1,format=yuv420p" \
    -c:v libx264 -profile:v main -level 3.1 -preset slow -crf 29 -g 24 -movflags +faststart \
    -an "$dest/$id.mp4"
  ffmpeg -nostdin -hide_banner -loglevel error -y -i "$dest/$id.mp4" -frames:v 1 \
    -vf "scale=640:360:flags=lanczos" -q:v 5 "$dest/$id.jpg"
  echo "$id bytes=$(stat -c%s "$dest/$id.mp4")"
done
