#!/usr/bin/env bash
# Encode Rand call clips into assets/cutscenes/rand/.
# 854x480 H.264 CRF 29, faststart, GOP 24. Each variant trims with -ss/-t.
# Two-shot variants are joined with a hard cut (concat demuxer, then one re-encode).
# Usage: tools/cutscenes/encode_rand.sh SRC_DIR OUT_DIR
# A line is: id  shotA ssA durA  shotB ssB durB
# shotB "-" is a single continuous shot. Missing sources are skipped.
set -euo pipefail
SRC=${1:-/workspace/cutscenes/rand}
OUT=${2:-assets/cutscenes/rand}
mkdir -p "$OUT"
CLIPS="R1 rand_r1a 0 4 rand_r1b 0 4
R2 rand_r2a 0 4 rand_r2b 0 4
R3 rand_r3a 0 3 rand_r3b 0 3
R4 rand_r4 0.2 6 - 0 0
R5 rand_r5 0 10 - 0 0"
echo "$CLIPS" | while read -r id a ssA durA b ssB durB; do
  inA="$SRC/$a.mp4"
  [ -f "$inA" ] || { echo "skip $id (no $inA)"; continue; }
  tmp=$(mktemp -d)
  list="$tmp/list.txt"
  ffmpeg -nostdin -hide_banner -loglevel error -y -ss "$ssA" -t "$durA" -i "$inA" \
    -map 0:v:0 -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p -an "$tmp/a.mp4"
  printf "file '%s'\n" "$tmp/a.mp4" > "$list"
  if [ "$b" != "-" ]; then
    inB="$SRC/$b.mp4"
    if [ ! -f "$inB" ]; then echo "skip $id (no $inB)"; rm -rf "$tmp"; continue; fi
    ffmpeg -nostdin -hide_banner -loglevel error -y -ss "$ssB" -t "$durB" -i "$inB" \
      -map 0:v:0 -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p -an "$tmp/b.mp4"
    printf "file '%s'\n" "$tmp/b.mp4" >> "$list"
  fi
  ffmpeg -nostdin -hide_banner -loglevel error -y -f concat -safe 0 -i "$list" \
    -vf "scale=854:480:flags=lanczos,setsar=1,format=yuv420p" \
    -c:v libx264 -profile:v main -level 3.1 -preset slow -crf 29 -g 24 -movflags +faststart \
    -an "$OUT/$id.mp4"
  ffmpeg -nostdin -hide_banner -loglevel error -y -i "$OUT/$id.mp4" -frames:v 1 \
    -vf "scale=640:360:flags=lanczos" -q:v 5 "$OUT/$id.jpg"
  echo "$id bytes=$(stat -c%s "$OUT/$id.mp4") poster=$(stat -c%s "$OUT/$id.jpg")"
  rm -rf "$tmp"
done
