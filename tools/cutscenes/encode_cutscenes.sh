#!/usr/bin/env bash
# Encode the Grok Imagine cutscene sources (1280x720, 15 s, AAC) into the shipped web clips.
# H.264 main@3.1 960x540 CRF 27 yuv420p +faststart, AAC 96k stereo, loudness evened toward -20 LUFS
# (gain capped at +15 dB so the near-silent ambience clips are not pumped into hiss), true-peak limited.
# Usage: tools/cutscenes/encode_cutscenes.sh SRC_DIR OUT_DIR   (sources are kept outside the repo)
set -euo pipefail
SRC=${1:-/workspace/cutscenes}; OUT=${2:-assets/cutscenes}
mkdir -p "$OUT"
# id  source  trim-start-seconds  crf (stage1 is busy fire + embers, so it gets 29 to stay near 3 MB)
CLIPS="twinkletoes twinkletoes_v1 3.625 27
moiraine moiraine_v1 0 27
intro intro_v2 0 27
intro_battle battle_edit_v2 0 27
stage1 stage1_v1 0 29
stage2 stage2_v2 0 27
stage3 stage3_v1 0 27
stage4 stage4_v2 0 27
stage5 stage5_v1 0 27"
echo "$CLIPS" | while read -r id src ss crf; do
  in="$SRC/$src.mp4"; [ -f "$in" ] || { echo "skip $id (no $in)"; continue; }
  lufs=$(ffmpeg -nostdin -hide_banner -nostats -ss "$ss" -i "$in" -map 0:a:0 -af ebur128=framelog=quiet -f null - 2>&1 | awk '/Integrated loudness/{f=1} f&&/I:/{print $2; exit}')
  gain=$(awk -v l="$lufs" 'BEGIN{g=-20-l; if(g>15)g=15; printf "%.1f", g}')
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$in")
  len=$(awk -v d="$dur" -v s="$ss" 'BEGIN{printf "%.3f", d-s}')
  fo=$(awk -v l="$len" 'BEGIN{printf "%.3f", l-0.35}')
  ffmpeg -nostdin -hide_banner -loglevel error -y -i "$in" -ss "$ss" -map 0:v:0 -map 0:a:0 -map_metadata -1 \
    -vf "scale=960:540:flags=lanczos,format=yuv420p" -c:v libx264 -profile:v main -level 3.1 -preset slow -crf "$crf" -g 48 \
    -af "volume=${gain}dB,alimiter=limit=0.84:level=false,afade=t=in:d=0.08,afade=t=out:st=${fo}:d=0.35" \
    -c:a aac -b:a 96k -ac 2 -ar 48000 -movflags +faststart "$OUT/$id.mp4"
  ffmpeg -nostdin -hide_banner -loglevel error -y -i "$OUT/$id.mp4" -frames:v 1 -vf "scale=640:360:flags=lanczos" -q:v 5 "$OUT/$id.jpg"
  echo "$id src=$src ss=$ss crf=$crf lufs=$lufs gain=${gain}dB bytes=$(stat -c%s "$OUT/$id.mp4") poster=$(stat -c%s "$OUT/$id.jpg")"
done
