#!/usr/bin/env python3
"""Compatibility entry point for the current Markdown-first phase evidence PDF."""

from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]

subprocess.run(
    [
        sys.executable,
        str(ROOT / "scripts" / "render_markdown_pdf.py"),
        str(ROOT / "docs" / "PHASE-EVIDENCE.md"),
        str(ROOT / "output" / "pdf" / "stagehand-phase-evidence.pdf"),
    ],
    check=True,
)
