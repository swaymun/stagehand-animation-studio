"""Render a Stagehand Markdown file to a compact, phone-readable A5 PDF."""

from __future__ import annotations

import html
import re
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A5
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, Preformatted, SimpleDocTemplate, Spacer


source = Path(sys.argv[1]).resolve()
output = Path(sys.argv[2]).resolve()
title = source.stem.replace("-", " ").title()
base = getSampleStyleSheet()
ink = colors.HexColor("#29272A")
muted = colors.HexColor("#6B6460")
accent = colors.HexColor("#176A78")
styles = {
    "title": ParagraphStyle("Title", parent=base["Title"], fontName="Helvetica-Bold", fontSize=20, leading=23, textColor=ink, spaceAfter=5 * mm),
    "h2": ParagraphStyle("H2", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=accent, spaceBefore=4 * mm, spaceAfter=2 * mm, keepWithNext=True),
    "h3": ParagraphStyle("H3", parent=base["Heading3"], fontName="Helvetica-Bold", fontSize=10, leading=13, textColor=ink, spaceBefore=3 * mm, spaceAfter=1.5 * mm, keepWithNext=True),
    "body": ParagraphStyle("Body", parent=base["BodyText"], fontName="Helvetica", fontSize=8.5, leading=12, textColor=ink, spaceAfter=1.8 * mm),
    "bullet": ParagraphStyle("Bullet", parent=base["BodyText"], fontName="Helvetica", fontSize=8.3, leading=11.7, leftIndent=4 * mm, firstLineIndent=-3 * mm, textColor=ink, spaceAfter=1.4 * mm),
    "code": ParagraphStyle("Code", parent=base["Code"], fontName="Courier", fontSize=6.8, leading=9, leftIndent=3 * mm, rightIndent=3 * mm, backColor=colors.HexColor("#F5EBDD"), borderPadding=2 * mm, textColor=ink, spaceAfter=2 * mm),
}


def inline(text: str) -> str:
    escaped = html.escape(text)
    escaped = re.sub(r"`([^`]+)`", r"<font name='Courier'>\1</font>", escaped)
    escaped = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", escaped)
    escaped = re.sub(r"\[([^]]+)\]\([^)]+\)", r"\1", escaped)
    return escaped


story = []
in_code = False
code_lines: list[str] = []
for raw in source.read_text(encoding="utf-8").splitlines():
    line = raw.rstrip()
    if line.startswith("```"):
        if in_code:
            story.append(Preformatted("\n".join(code_lines), styles["code"]))
            code_lines = []
        in_code = not in_code
        continue
    if in_code:
        code_lines.append(line)
    elif line.startswith("# "):
        story.append(Paragraph(inline(line[2:]), styles["title"]))
    elif line.startswith("## "):
        story.append(Paragraph(inline(line[3:]), styles["h2"]))
    elif line.startswith("### "):
        story.append(Paragraph(inline(line[4:]), styles["h3"]))
    elif re.match(r"^[-*] ", line):
        story.append(Paragraph("- " + inline(line[2:]), styles["bullet"]))
    elif re.match(r"^\d+\. ", line):
        number, text = line.split(". ", 1)
        story.append(Paragraph(f"<b>{number}.</b> {inline(text)}", styles["bullet"]))
    elif line.strip():
        story.append(Paragraph(inline(line), styles["body"]))
    else:
        story.append(Spacer(1, 1.2 * mm))


def footer(canvas, document):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#D8C8B0"))
    canvas.line(12 * mm, 10.5 * mm, A5[0] - 12 * mm, 10.5 * mm)
    canvas.setFont("Helvetica", 6.6)
    canvas.setFillColor(muted)
    canvas.drawString(12 * mm, 6.5 * mm, "STAGEHAND / PHASE 4.1")
    canvas.drawRightString(A5[0] - 12 * mm, 6.5 * mm, str(document.page))
    canvas.restoreState()


output.parent.mkdir(parents=True, exist_ok=True)
doc = SimpleDocTemplate(str(output), pagesize=A5, leftMargin=12 * mm, rightMargin=12 * mm, topMargin=12 * mm, bottomMargin=14 * mm, title=title, author="Stagehand")
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(output)
