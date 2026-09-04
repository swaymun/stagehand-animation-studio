#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

SCREEN_PATH="$ROOT_DIR/output/demo-recordings/stagehand-native-three-demos.webm"
BRICK_PATH="$ROOT_DIR/output/demo-recordings/brick-minifigure.webm"
WORKPLACE_PATH="$ROOT_DIR/output/demo-recordings/workplace-parody.webm"
UNDERSEA_PATH="$ROOT_DIR/output/demo-recordings/undersea-cutout.webm"
NARRATION_PATH="$ROOT_DIR/output/demo-recordings/stagehand-narration.wav"
OUTPUT_PATH="$ROOT_DIR/output/demo-recordings/stagehand-submission-demo.mp4"
FONT_PATH="${FONT_FILE:-}"

usage() {
  cat <<'USAGE'
Usage: scripts/assemble-submission-demo.sh [options]

Build a 1440x900 H.264 submission video, capped at 175 seconds.

Options:
  --screen PATH       71-second Stagehand screen recording
  --brick PATH        Rendered brick-minifigure WebM
  --workplace PATH    Rendered workplace-parody WebM
  --undersea PATH     Rendered undersea-cutout WebM
  --narration PATH    Final narration WAV
  --output PATH       Destination MP4
  --font PATH         TrueType/OpenType font for title cards
  -h, --help          Show this help

All five inputs must exist. The script will not create a partial video.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --screen)
      SCREEN_PATH="${2:?--screen requires a path}"
      shift 2
      ;;
    --brick)
      BRICK_PATH="${2:?--brick requires a path}"
      shift 2
      ;;
    --workplace)
      WORKPLACE_PATH="${2:?--workplace requires a path}"
      shift 2
      ;;
    --undersea)
      UNDERSEA_PATH="${2:?--undersea requires a path}"
      shift 2
      ;;
    --narration)
      NARRATION_PATH="${2:?--narration requires a path}"
      shift 2
      ;;
    --output)
      OUTPUT_PATH="${2:?--output requires a path}"
      shift 2
      ;;
    --font)
      FONT_PATH="${2:?--font requires a path}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown option: %s\n\n' "$1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

for command_name in ffmpeg ffprobe awk magick; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$command_name" >&2
    exit 2
  fi
done

declare -a missing_inputs=()
for input_spec in \
  "screen recording|$SCREEN_PATH" \
  "brick demo|$BRICK_PATH" \
  "workplace demo|$WORKPLACE_PATH" \
  "undersea demo|$UNDERSEA_PATH" \
  "narration|$NARRATION_PATH"; do
  input_label="${input_spec%%|*}"
  input_path="${input_spec#*|}"
  if [[ ! -f "$input_path" ]]; then
    missing_inputs+=("$input_label: $input_path")
  fi
done

if (( ${#missing_inputs[@]} > 0 )); then
  printf 'Submission assets are not ready; nothing was rendered. Missing:\n' >&2
  printf '  - %s\n' "${missing_inputs[@]}" >&2
  exit 2
fi

if [[ -z "$FONT_PATH" ]]; then
  for font_candidate in \
    "/System/Library/Fonts/Supplemental/Arial.ttf" \
    "/Library/Fonts/Arial.ttf" \
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"; do
    if [[ -f "$font_candidate" ]]; then
      FONT_PATH="$font_candidate"
      break
    fi
  done
fi

if [[ -z "$FONT_PATH" || ! -f "$FONT_PATH" ]]; then
  printf 'No usable title-card font found. Pass --font PATH.\n' >&2
  exit 2
fi

probe_duration() {
  local duration
  duration="$(ffprobe -v error -show_entries format=duration \
    -of default=noprint_wrappers=1:nokey=1 "$1")"
  if [[ "$duration" == "N/A" || -z "$duration" ]]; then
    duration="$(ffprobe -v error -select_streams v:0 -show_packets \
      -show_entries packet=pts_time,duration_time -of csv=p=0 "$1" | \
      awk -F, 'BEGIN { max = 0 } { end = $1 + $2; if (end > max) max = end } END { printf "%.3f", max }')"
  fi
  printf '%s\n' "$duration"
}

SCREEN_SECONDS="$(probe_duration "$SCREEN_PATH")"
BRICK_SECONDS="$(probe_duration "$BRICK_PATH")"
WORKPLACE_SECONDS="$(probe_duration "$WORKPLACE_PATH")"
UNDERSEA_SECONDS="$(probe_duration "$UNDERSEA_PATH")"
NARRATION_SECONDS="$(probe_duration "$NARRATION_PATH")"

for duration_spec in \
  "screen recording|$SCREEN_SECONDS" \
  "brick demo|$BRICK_SECONDS" \
  "workplace demo|$WORKPLACE_SECONDS" \
  "undersea demo|$UNDERSEA_SECONDS" \
  "narration|$NARRATION_SECONDS"; do
  duration_label="${duration_spec%%|*}"
  duration_value="${duration_spec#*|}"
  if ! awk -v value="$duration_value" 'BEGIN { exit !(value + 0 > 0) }'; then
    printf 'Could not read a positive duration for %s.\n' "$duration_label" >&2
    exit 2
  fi
done

TITLE_SECONDS="6"
END_SECONDS="7"
SCREEN_HEAD_SECONDS="$(awk -v duration="$SCREEN_SECONDS" \
  'BEGIN { if (duration > 58) value = 58; else value = duration * 0.75; printf "%.3f", value }')"
SCREEN_TAIL_SECONDS="$(awk -v duration="$SCREEN_SECONDS" -v head="$SCREEN_HEAD_SECONDS" \
  'BEGIN { printf "%.3f", duration - head }')"
BRICK_SLOT_SECONDS="$(awk -v duration="$BRICK_SECONDS" \
  'BEGIN { if (duration > 10) value = duration; else value = 10; printf "%.3f", value }')"
WORKPLACE_SLOT_SECONDS="$(awk -v duration="$WORKPLACE_SECONDS" \
  'BEGIN { if (duration > 12) value = duration; else value = 12; printf "%.3f", value }')"
UNDERSEA_SLOT_SECONDS="$(awk -v duration="$UNDERSEA_SECONDS" \
  'BEGIN { if (duration > 12) value = duration; else value = 12; printf "%.3f", value }')"
TARGET_SECONDS="$(awk -v duration="$NARRATION_SECONDS" \
  'BEGIN { if (duration > 175) value = 175; else value = duration; printf "%.3f", value }')"
MINIMUM_SECONDS="$(awk \
  -v title="$TITLE_SECONDS" \
  -v screen="$SCREEN_SECONDS" \
  -v brick="$BRICK_SLOT_SECONDS" \
  -v workplace="$WORKPLACE_SLOT_SECONDS" \
  -v undersea="$UNDERSEA_SLOT_SECONDS" \
  -v end="$END_SECONDS" \
  'BEGIN { printf "%.3f", title + screen + brick + workplace + undersea + end }')"

if ! awk -v target="$TARGET_SECONDS" -v minimum="$MINIMUM_SECONDS" \
  'BEGIN { exit !(target >= minimum) }'; then
  printf 'Narration is %.3fs, but the full montage needs at least %.3fs.\n' \
    "$TARGET_SECONDS" "$MINIMUM_SECONDS" >&2
  printf 'Shorten the demo slots or provide a longer narration; nothing was rendered.\n' >&2
  exit 2
fi

FILL_SECONDS="$(awk -v target="$TARGET_SECONDS" -v minimum="$MINIMUM_SECONDS" \
  'BEGIN { printf "%.3f", target - minimum }')"
BRICK_PAD_SECONDS="$(awk -v slot="$BRICK_SLOT_SECONDS" -v duration="$BRICK_SECONDS" \
  'BEGIN { printf "%.3f", slot - duration }')"
WORKPLACE_PAD_SECONDS="$(awk -v slot="$WORKPLACE_SLOT_SECONDS" -v duration="$WORKPLACE_SECONDS" \
  'BEGIN { printf "%.3f", slot - duration }')"
UNDERSEA_PAD_SECONDS="$(awk -v slot="$UNDERSEA_SLOT_SECONDS" -v duration="$UNDERSEA_SECONDS" \
  'BEGIN { printf "%.3f", slot - duration }')"
AUDIO_FADE_START="$(awk -v target="$TARGET_SECONDS" \
  'BEGIN { value = target - 0.8; if (value < 0) value = 0; printf "%.3f", value }')"
BRICK_AUDIO_DELAY_MS="$(awk -v title="$TITLE_SECONDS" -v head="$SCREEN_HEAD_SECONDS" 'BEGIN { printf "%d", (title + head) * 1000 }')"
WORKPLACE_AUDIO_DELAY_MS="$(awk -v title="$TITLE_SECONDS" -v head="$SCREEN_HEAD_SECONDS" -v brick="$BRICK_SLOT_SECONDS" 'BEGIN { printf "%d", (title + head + brick) * 1000 }')"
UNDERSEA_AUDIO_DELAY_MS="$(awk -v title="$TITLE_SECONDS" -v head="$SCREEN_HEAD_SECONDS" -v brick="$BRICK_SLOT_SECONDS" -v workplace="$WORKPLACE_SLOT_SECONDS" 'BEGIN { printf "%d", (title + head + brick + workplace) * 1000 }')"

mkdir -p "$(dirname "$OUTPUT_PATH")"
TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/stagehand-submission.XXXXXX")"
TEMP_OUTPUT="$TEMP_DIR/stagehand-submission-demo.mp4"
trap 'rm -rf "$TEMP_DIR"' EXIT

magick -size 1440x900 'xc:#111719' \
  -font "$FONT_PATH" -gravity center \
  -fill '#F5E9D4' -pointsize 88 -annotate +0-120 'STAGEHAND' \
  -fill '#8DD9D0' -pointsize 34 -annotate +0+0 'Frame-by-frame animation with WebMCP' \
  -fill '#C1CACB' -pointsize 27 -annotate +0+70 'Saimun Shahee  |  ex-Meta wearables' \
  "$TEMP_DIR/title.png"

magick -size 1440x900 'xc:#111719' \
  -font "$FONT_PATH" -gravity center \
  -fill '#F5E9D4' -pointsize 56 -annotate +0-90 'Built by Saimun Shahee' \
  -fill '#8DD9D0' -pointsize 35 -annotate +0+0 'Stagehand' \
  -fill '#C1CACB' -pointsize 31 -annotate +0+70 'X  @saimunshahee' \
  "$TEMP_DIR/end.png"

VIDEO_NORMALIZE="fps=30,scale=1440:900:force_original_aspect_ratio=decrease,pad=1440:900:(ow-iw)/2:(oh-ih)/2:color=0x111719,setsar=1"

FILTER_COMPLEX="
[6:v]${VIDEO_NORMALIZE},trim=duration=${TITLE_SECONDS},setpts=PTS-STARTPTS,
fade=t=in:st=0:d=0.4,fade=t=out:st=5.5:d=0.5[title];
[0:v]${VIDEO_NORMALIZE},split=2[screen_head_source][screen_tail_source];
[screen_head_source]trim=start=0:end=${SCREEN_HEAD_SECONDS},setpts=PTS-STARTPTS[screen_head];
[screen_tail_source]trim=start=${SCREEN_HEAD_SECONDS}:duration=${SCREEN_TAIL_SECONDS},setpts=PTS-STARTPTS[screen_tail];
[1:v]${VIDEO_NORMALIZE},tpad=stop_mode=clone:stop_duration=${BRICK_PAD_SECONDS},trim=duration=${BRICK_SLOT_SECONDS},setpts=PTS-STARTPTS[brick];
[2:v]${VIDEO_NORMALIZE},tpad=stop_mode=clone:stop_duration=${WORKPLACE_PAD_SECONDS},trim=duration=${WORKPLACE_SLOT_SECONDS},setpts=PTS-STARTPTS[workplace];
[3:v]${VIDEO_NORMALIZE},tpad=stop_mode=clone:stop_duration=${UNDERSEA_PAD_SECONDS},trim=duration=${UNDERSEA_SLOT_SECONDS},setpts=PTS-STARTPTS[undersea];
[5:v]${VIDEO_NORMALIZE},trim=duration=${FILL_SECONDS},setpts=PTS-STARTPTS[screen_fill];
[7:v]${VIDEO_NORMALIZE},trim=duration=${END_SECONDS},setpts=PTS-STARTPTS,
fade=t=in:st=0:d=0.5,fade=t=out:st=6.4:d=0.6[end];
[title][screen_head][brick][workplace][undersea][screen_tail][screen_fill][end]
concat=n=8:v=1:a=0,format=yuv420p[video];
[4:a]aresample=48000,
highpass=f=70,
apad,
atrim=duration=${TARGET_SECONDS},
volume=1.0[narration];
[1:a]aresample=48000,volume=0.22,adelay=${BRICK_AUDIO_DELAY_MS}|${BRICK_AUDIO_DELAY_MS}[brick_audio];
[2:a]aresample=48000,volume=0.22,adelay=${WORKPLACE_AUDIO_DELAY_MS}|${WORKPLACE_AUDIO_DELAY_MS}[workplace_audio];
[3:a]aresample=48000,volume=0.22,adelay=${UNDERSEA_AUDIO_DELAY_MS}|${UNDERSEA_AUDIO_DELAY_MS}[undersea_audio];
[narration][brick_audio][workplace_audio][undersea_audio]amix=inputs=4:duration=longest:normalize=0,
loudnorm=I=-16:TP=-1.5:LRA=11,
atrim=duration=${TARGET_SECONDS},
afade=t=in:st=0:d=0.2,
afade=t=out:st=${AUDIO_FADE_START}:d=0.8[audio]
"

printf 'Rendering %.3fs submission video to:\n  %s\n' "$TARGET_SECONDS" "$OUTPUT_PATH"

ffmpeg -hide_banner -y \
  -i "$SCREEN_PATH" \
  -i "$BRICK_PATH" \
  -i "$WORKPLACE_PATH" \
  -i "$UNDERSEA_PATH" \
  -i "$NARRATION_PATH" \
  -stream_loop -1 -i "$SCREEN_PATH" \
  -loop 1 -framerate 30 -t "$TITLE_SECONDS" -i "$TEMP_DIR/title.png" \
  -loop 1 -framerate 30 -t "$END_SECONDS" -i "$TEMP_DIR/end.png" \
  -filter_complex "$FILTER_COMPLEX" \
  -map '[video]' \
  -map '[audio]' \
  -t "$TARGET_SECONDS" \
  -c:v libx264 \
  -preset medium \
  -crf 18 \
  -pix_fmt yuv420p \
  -c:a aac \
  -b:a 192k \
  -ar 48000 \
  -ac 2 \
  -movflags +faststart \
  "$TEMP_OUTPUT"

ACTUAL_SECONDS="$(probe_duration "$TEMP_OUTPUT")"
if ! awk -v duration="$ACTUAL_SECONDS" 'BEGIN { exit !(duration <= 175.05) }'; then
  printf 'Rendered file is unexpectedly longer than 175 seconds: %.3fs\n' \
    "$ACTUAL_SECONDS" >&2
  exit 1
fi

mv -f "$TEMP_OUTPUT" "$OUTPUT_PATH"
printf 'Done: %.3fs, 1440x900 H.264/AAC MP4.\n' "$ACTUAL_SECONDS"
