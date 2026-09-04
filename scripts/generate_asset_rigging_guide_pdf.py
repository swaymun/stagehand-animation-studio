#!/usr/bin/env python3
"""Compatibility entry point for the current Markdown-first agent guide PDF."""

from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]

subprocess.run(
    [
        sys.executable,
        str(ROOT / "scripts" / "render_markdown_pdf.py"),
        str(ROOT / "docs" / "AGENT-ASSET-RIGGING.md"),
        str(ROOT / "output" / "pdf" / "stagehand-asset-rigging-agent-guide.pdf"),
    ],
    check=True,
)
