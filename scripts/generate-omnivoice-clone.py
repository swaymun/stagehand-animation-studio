#!/usr/bin/env python3
"""Generate private narration from a consented voice reference with OmniVoice."""

from __future__ import annotations

import argparse
from pathlib import Path

import soundfile as sf
import torch
from omnivoice import OmniVoice


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reference", type=Path, required=True)
    parser.add_argument("--reference-text", required=True)
    parser.add_argument("--script", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--model", default="k2-fsa/OmniVoice")
    parser.add_argument("--device", default="mps")
    parser.add_argument("--steps", type=int, default=24)
    args = parser.parse_args()

    model = OmniVoice.from_pretrained(args.model, device_map=args.device, dtype=torch.float16)
    prompt = model.create_voice_clone_prompt(str(args.reference), args.reference_text)
    paragraphs = [value.strip() for value in args.script.read_text().split("\n\n") if value.strip()]
    rendered = []
    for index, paragraph in enumerate(paragraphs, start=1):
        print(f"[{index}/{len(paragraphs)}] {paragraph[:72]}", flush=True)
        rendered.append(model.generate(text=paragraph, voice_clone_prompt=prompt, num_step=args.steps)[0])
    silence = torch.zeros(int(model.sampling_rate * 0.32)).numpy()
    combined = []
    for index, audio in enumerate(rendered):
        combined.append(audio)
        if index + 1 < len(rendered):
            combined.append(silence)
    import numpy as np

    args.output.parent.mkdir(parents=True, exist_ok=True)
    sf.write(args.output, np.concatenate(combined), model.sampling_rate)


if __name__ == "__main__":
    main()
