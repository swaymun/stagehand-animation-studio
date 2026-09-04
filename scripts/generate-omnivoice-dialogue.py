#!/usr/bin/env python3
"""Generate the bundled demo dialogue with the official k2-fsa OmniVoice model.

Run this script from an OmniVoice environment. It never needs or stores a
personal reference recording; the demo characters use voice-design prompts.
"""

from __future__ import annotations

import argparse
import subprocess
import tempfile
from pathlib import Path

import soundfile as sf
import torch
from omnivoice import OmniVoice


FPS = 12
VOICES = {
    "Mina": "female, young adult, high pitch, American accent",
    "Gus": "male, young adult, low pitch, American accent",
    "Mr. Timestamp": "male, middle-aged, very low pitch, American accent",
    "Coil": "male, young adult, low pitch, American accent",
    "Stub": "male, young adult, high pitch, American accent",
    "Dev": "male, young adult, moderate pitch, American accent",
    "Raya": "female, young adult, low pitch, American accent",
}

# demo id, caption id, speaker, frame duration, text
LINES = [
    ("brick-breakout", "brick-wakeup-line-1", "Mina", 30, "Three hours? That is at least twelve brick-hours."),
    ("brick-breakout", "brick-build-line-1", "Mina", 30, "Frames. Lip sync. Local voice. Sensible scope."),
    ("brick-breakout", "brick-build-line-2", "Mina", 20, "Why is the sensible scope taller than me?"),
    ("brick-breakout", "brick-boss-line-1", "Gus", 18, "Type error: ambition is not assignable to deadline."),
    ("brick-breakout", "brick-boss-line-2", "Mina", 19, "Then I will cast it to shipped."),
    ("brick-breakout", "brick-ship-line-1", "Mina", 24, "It is not perfect. It is alive. Launch!"),
    ("brick-breakout", "brick-ship-line-2", "Mina", 18, "Okay. Now polish the landing page."),
    ("deadline-show", "shift-brief-line-1", "Mr. Timestamp", 20, "Build an animation studio. You have three hours."),
    ("deadline-show", "shift-brief-line-2", "Stub", 21, "That is basically forever in demo time."),
    ("deadline-show", "shift-rig-line-1", "Coil", 15, "Skeleton validation passed."),
    ("deadline-show", "shift-rig-line-2", "Stub", 25, "The skeleton has chosen independence."),
    ("deadline-show", "shift-scope-line-1", "Coil", 26, "Why do we have a tool for editing a bone that fell off?"),
    ("deadline-show", "shift-scope-line-2", "Stub", 24, "Counterproposal: drawings that stay where we put them."),
    ("deadline-show", "shift-pivot-line-1", "Coil", 25, "Duplicate the drawing. Change the pose. Hold it."),
    ("deadline-show", "shift-pivot-line-2", "Stub", 23, "It is suspiciously understandable."),
    ("deadline-show", "shift-ship-line-1", "Mr. Timestamp", 16, "You removed half the system."),
    ("deadline-show", "shift-ship-line-2", "Coil", 23, "Yes. Now the other half works."),
    ("no-clams-no-patty", "patty-wakeup-line-1", "Dev", 28, "Why am I breathing soup?"),
    ("no-clams-no-patty", "patty-town-line-1", "Dev", 27, "Good news: the ocean has a walkable downtown."),
    ("no-clams-no-patty", "patty-town-line-2", "Dev", 20, "Better news: somebody is grilling."),
    ("no-clams-no-patty", "patty-order-line-1", "Dev", 21, "One Krabby Patty, please. Extra normal."),
    ("no-clams-no-patty", "patty-order-line-2", "Raya", 13, "Eight. Sand. Dollars."),
    ("no-clams-no-patty", "patty-order-line-3", "Dev", 20, "I only have regular dollars."),
    ("no-clams-no-patty", "patty-barter-line-1", "Dev", 17, "What if I animate your lunch menu?"),
    ("no-clams-no-patty", "patty-barter-line-2", "Raya", 20, "Add one tasteful bubble transition."),
    ("no-clams-no-patty", "patty-barter-line-3", "Dev", 14, "I can synthesize that."),
    ("no-clams-no-patty", "patty-payoff-line-1", "Dev", 21, "Can I pay in exposure?"),
    ("no-clams-no-patty", "patty-payoff-line-2", "Raya", 19, "You can eat in exposure."),
]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-root", type=Path, required=True)
    parser.add_argument("--model", default="k2-fsa/OmniVoice")
    parser.add_argument("--device", default="mps")
    parser.add_argument("--steps", type=int, default=20)
    parser.add_argument("--only-demo", choices=sorted({line[0] for line in LINES}))
    parser.add_argument("--only-caption", action="append", default=[])
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--natural-fit", action="store_true", help="Generate naturally, then time-fit with ffmpeg atempo.")
    parser.add_argument("--auto-voice", action="store_true", help="Use OmniVoice automatic speaker selection for retries.")
    args = parser.parse_args()

    model = OmniVoice.from_pretrained(args.model, device_map=args.device, dtype=torch.float16)
    for index, (demo_id, caption_id, speaker, frame_duration, text) in enumerate(LINES, start=1):
        if args.only_demo and demo_id != args.only_demo:
            continue
        if args.only_caption and caption_id not in args.only_caption:
            continue
        output = args.output_root / demo_id / f"{caption_id}.wav"
        output.parent.mkdir(parents=True, exist_ok=True)
        if not args.force and output.exists() and output.stat().st_size > 1024:
            print(f"[{index}/{len(LINES)}] keep {output}", flush=True)
            continue
        duration = max(0.85, frame_duration / FPS - 0.04)
        print(f"[{index}/{len(LINES)}] {speaker}: {text}", flush=True)
        audio = model.generate(
            text=text,
            instruct=None if args.auto_voice else VOICES[speaker],
            language="English",
            duration=None if args.natural_fit else duration,
            num_step=args.steps,
            guidance_scale=2.0,
            speed=1.0,
        )[0]
        if args.natural_fit:
            with tempfile.NamedTemporaryFile(suffix=".wav") as temporary:
                sf.write(temporary.name, audio, model.sampling_rate)
                generated_duration = len(audio) / model.sampling_rate
                tempo = max(0.5, min(100.0, generated_duration / duration))
                subprocess.run(
                    [
                        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                        "-i", temporary.name, "-filter:a", f"atempo={tempo:.6f}",
                        "-ar", str(model.sampling_rate), "-ac", "1", str(output),
                    ],
                    check=True,
                )
        else:
            sf.write(output, audio, model.sampling_rate)


if __name__ == "__main__":
    main()
