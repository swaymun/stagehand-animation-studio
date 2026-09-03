from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output/pdf/stagehand-phase-evidence.pdf"
EVIDENCE = ROOT / "docs/evidence"
styles = getSampleStyleSheet()

title = ParagraphStyle("EvidenceTitle", parent=styles["Title"], fontName="Helvetica", fontSize=26, leading=31, alignment=TA_CENTER, textColor=colors.HexColor("#292929"), spaceAfter=10)
subtitle = ParagraphStyle("EvidenceSubtitle", parent=styles["Normal"], fontSize=11, leading=14, alignment=TA_CENTER, textColor=colors.HexColor("#82776d"), spaceAfter=30)
heading = ParagraphStyle("EvidenceHeading", parent=styles["Heading2"], fontName="Helvetica", fontSize=18, leading=22, textColor=colors.HexColor("#2d7d9f"), spaceBefore=12, spaceAfter=10, keepWithNext=True)
body = ParagraphStyle("EvidenceBody", parent=styles["BodyText"], fontName="Helvetica", fontSize=10.5, leading=15, textColor=colors.HexColor("#514d4a"), spaceAfter=10)
bullet = ParagraphStyle("EvidenceBullet", parent=body, leftIndent=8, firstLineIndent=-8, spaceAfter=7)
code = ParagraphStyle("EvidenceCode", parent=body, fontName="Courier", fontSize=8.5, leading=13, leftIndent=12, spaceAfter=10)
caption = ParagraphStyle("EvidenceCaption", parent=body, alignment=TA_CENTER, fontSize=9.5, leading=13, textColor=colors.HexColor("#82776d"), spaceBefore=8)


def footer(canvas, document):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#d8d1c8"))
    canvas.line(0.55 * inch, 0.42 * inch, 7.95 * inch, 0.42 * inch)
    canvas.setFillColor(colors.HexColor("#8c8176"))
    canvas.setFont("Helvetica", 8)
    canvas.drawString(0.6 * inch, 0.22 * inch, "Stagehand Animation Studio - phase evidence")
    canvas.drawRightString(7.9 * inch, 0.22 * inch, f"Page {document.page}")
    canvas.restoreState()


def p(text, style):
    return Paragraph(text, style)


def bullets(items):
    return [p(f"- {item}", bullet) for item in items]


story = [
    p("Stagehand Phase Evidence", title),
    p("Current checkpoint: public Site v84, verified 2026-09-03.", subtitle),
    p("Project", heading),
    p("Stagehand is a WebMCP-native 2D animation studio for editable paper-cutout scenes. The current cut supports rigged characters, imported image props, per-asset visual direction, camera work, captions, non-voice audio cues, storyboard beats, multi-scene Preview, and deterministic WebM export.", body),
    p("Private source: github.com/swaymun/stagehand-animation-studio<br/>Commit: 280b8f5a7a613c033eb053fa05be4ad12d4ff252<br/>Public Site: stagehand-animation-studio.saimun-h-shahee.chatgpt.site<br/>Sites version: 84", body),
    p("Acceptance loop", heading),
    p("Implement - local tests - Sites deployment - hosted test - UI roast - fixes - second review.", body),
    p("Implemented at this checkpoint", heading),
    *bullets([
        "Revision-safe WebMCP mutations with optional expectedRevision and structured REVISION_CONFLICT results.",
        "Idempotent WebMCP mutations with optional idempotencyKey replay protection.",
        "Structured per-asset role, treatment, silhouette, palette, and direction notes with human and agent parity.",
        "Asset treatment choices reach canvas, thumbnails, Preview, and WebM; the manifest reports bound, stage, or library placement and prop keyframe count.",
        "Motion actions show affected character and bounded duration; pose presets remain a separate group.",
        "Agent frame-rate-only render updates preserve the existing resolution until a new preset is explicitly chosen.",
        "Storyboard mode selects the Board rail; Preview hides editing mutation surfaces and selection chrome.",
    ]),
    p("Verification", heading),
    p("Local gate:", body),
    p("npm run format<br/>npm run lint<br/>npm run build<br/>git diff --check<br/>npm run smoke", code),
    p("Local and hosted smoke passed: 52 tools, 39 guarded mutations, synchronized timing and retiming, renderer treatment and placement, media import and animation, recovery, Preview, PNG/WebM export, and zero errors.", body),
    PageBreak(),
]

screens = [
    ("Animate editing workspace", "v84-animate.png", "Hosted Playwright capture at 1440 x 960. Motion actions identify their target character and duration; scene speed controls, frame steps, and labels remain readable."),
    ("Assets style editor", "v84-assets-style.png", "Hosted Playwright capture at 1440 x 960. Palette chips and stage/library cues make the structured Style direction legible without taking over the asset rail."),
    ("Storyboard mode with Board rail", "v83-storyboard.png", "Hosted Playwright capture at 1440 x 960. The selected top-level mode and project rail stay synchronized."),
    ("Review-first Preview player", "v83-preview.png", "Hosted Playwright capture at 1440 x 960. Scene-only context, transport, and Exit preview remain; global editing controls are hidden."),
]

for index, (heading_text, filename, caption_text) in enumerate(screens):
    story.extend([p(heading_text, heading), Spacer(1, 0.08 * inch), Image(str(EVIDENCE / filename), width=7.0 * inch, height=4.667 * inch), p(caption_text, caption)])
    if index != len(screens) - 1:
        story.append(PageBreak())

story.extend([
    PageBreak(),
    p("Roast findings and fixes", heading),
    *bullets([
        "Imported props lacked direct human transform editing. Added X/Y/Scale/Rot controls sharing the keyframe command path.",
        "Four prop transform fields initially collided with the asset-list flex rule and truncated. Replaced it with an explicit two-column grid; computed field boxes are 57 px wide in two rows.",
        "Preview carried too much editing chrome. Converted it into a review-first player with scene-only context and Exit preview.",
        "Timeline diamonds had 7 x 7 px hit targets. Enlarged the buttons to 22 x 22 pixels while preserving the visual diamond.",
        "Agent retries could duplicate successful writes. Added optional idempotency-key replay protection and a hosted smoke assertion.",
        "Switching top-level Storyboard mode could leave Assets selected. Synced mode selection to its companion project rail.",
        "Character transform inputs lacked explicit accessible names. Added dynamic X/Y/rotation/opacity labels and a smoke check.",
        "Asset briefs carried style intent only as prose. Added structured role, treatment, silhouette, palette, and direction fields; later made those treatments visible in the canvas and manifest placement cues.",
        "Motion action buttons were visually mixed with pose presets. Added explicit durations, affected-character copy, and a Pose presets label.",
        "Agent frame-rate-only render updates reset an existing 1080p choice. Preserved the current resolution when the preset is omitted and added smoke coverage.",
        "Preview still exposed global project-editing controls. Hid Settings, Import, Export JSON, and rename while retaining WebM and PNG review actions.",
        "Scene titles competed with the ready badge and were visually shortened. Used a two-line title clamp and positioned the badge outside the text flow.",
        "The smoke gate did not exercise recovery, modal semantics, or cross-scene playback. Added Help open/close, reload recovery, and sequence Preview transition checks to local and hosted runs.",
        "The Inspector was a long scroll dump, human scrubbing could leave agent reads one event behind, and keyboard stepping was unreliable after scrub focus. Added native collapsible groups, shared project-view synchronization, a focused stage target, and smoke coverage.",
    ]),
    p("Limits", heading),
    p("Direct CUA inspection was unavailable because the Mac was locked; Playwright was used for hosted interaction and screenshots. The smoke harness proves injected modelContext registration and execution, not live production ChatGPT WebMCP discovery. TTS, voice cloning, dialogue recording, phoneme extraction, and lip-sync remain out of scope.", body),
])

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
doc = SimpleDocTemplate(str(OUTPUT), pagesize=letter, leftMargin=0.6 * inch, rightMargin=0.6 * inch, topMargin=0.55 * inch, bottomMargin=0.62 * inch, title="Stagehand Phase Evidence", author="Codex")
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUTPUT)
