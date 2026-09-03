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
    p("Current checkpoint: public Site v94, verified 2026-09-03.", subtitle),
    p("Project", heading),
    p("Stagehand is a WebMCP-native 2D animation studio for editable paper-cutout scenes. The current cut supports rigged characters, imported image props, per-asset visual direction, camera work, captions, non-voice audio cues, storyboard beats, multi-scene Preview, and deterministic WebM export.", body),
    p("Private source: github.com/swaymun/stagehand-animation-studio<br/>Source HEAD: c28911081af6a7f611bb684cf84235637ece04e7<br/>Deployed runtime: 2312388c03d4f245378fe9ec667cd246852859c3<br/>Public Site: stagehand-animation-studio.saimun-h-shahee.chatgpt.site<br/>Sites version: 94", body),
    p("Acceptance loop", heading),
    p("Implement - local tests - Sites deployment - hosted test - UI roast - fixes - second review.", body),
    p("Implemented at this checkpoint", heading),
    *bullets([
        "Revision-safe WebMCP mutations with optional expectedRevision and structured REVISION_CONFLICT results.",
        "Idempotent WebMCP mutations with optional idempotencyKey replay protection.",
        "Structured per-asset role, treatment, silhouette, palette, and direction notes with human and agent parity.",
        "Asset treatment choices reach canvas, thumbnails, Preview, and WebM; new assets also receive valid style defaults immediately.",
        "Motion actions show affected character and bounded duration; pose presets remain a separate group.",
        "Human audio cue Start/End editors share bounded timing updates with the agent cue editor.",
        "Animate and Storyboard are the only top-level editor modes; Preview is a compact review action and overflow actions keep infrastructure chrome out of the workspace.",
        "The timeline defaults to semantic camera, pose, prop, dialogue, music, and SFX event bands; Show details restores raw keyframe controls.",
        "Responsive project and Inspector drawers preserve a readable shell at phone widths.",
        "At split-browser widths up to 1200 px, the Inspector is closed by default and opens as an overlay drawer while the stage and project rail retain working width.",
        "A Sol-powered Codex run used the public page's live WebMCP tools to apply and validate an Alice/Bob coupon gag without a separate MCP connection or TOML change.",
    ]),
    p("Verification", heading),
    p("Local gate:", body),
    p("npm run format<br/>npm run lint<br/>npm run build<br/>git diff --check<br/>npm run smoke<br/>npm run smoke:native", code),
    p("Smoke passed: 52 tools, 39 guarded mutations, a 15-second six-beat starter, synchronized timing, asset treatments, import/recovery including empty collections, Preview, valid PNG/WebM signatures, native WebMCP registration, and zero errors.", body),
    PageBreak(),
]

screens = [
    ("Animate editing workspace", "v93-animate.png", "Hosted Playwright capture at 1440 x 960. The focused editor keeps artwork dominant, with semantic event bands and raw-keyframe details available on demand.", 4.667),
    ("Assets style editor", "v93-assets.png", "Hosted Playwright capture at 1440 x 960. Scannable asset rows stay in the rail while the selected asset's style and placement context live in Inspector.", 4.667),
    ("Storyboard mode with Board rail", "v93-storyboard.png", "Hosted Playwright capture at 1440 x 960. Six beat cards make the longer arc inspectable while the selected mode and project rail stay synchronized.", 4.667),
    ("Review-first Preview player", "v93-preview.png", "Hosted Playwright capture at 1440 x 960. Scene-only context, transport, and a compact scrubber remain; the editable timeline grid and Inspector are hidden.", 4.667),
    ("Split-browser compact editor", "v94-split-pane.png", "Hosted Playwright capture at 960 x 820. The Inspector becomes a closed-by-default drawer, leaving the scene rail and artwork usable beside a ChatGPT or Codex conversation.", 5.979),
]

for index, (heading_text, filename, caption_text, image_height) in enumerate(screens):
    story.extend([p(heading_text, heading), Spacer(1, 0.08 * inch), Image(str(EVIDENCE / filename), width=7.0 * inch, height=image_height * inch), p(caption_text, caption)])
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
        "Export checks only proved that downloads were non-empty. Added binary signature assertions for WebM/EBML and PNG outputs in local and hosted smoke runs.",
        "Experimental Chromium exposed navigator.modelContext while the app only checked document.modelContext. Added a compatibility fallback and a native registration smoke gate covering all 52 tools plus valid and invalid calls.",
        "Preview still read like the editor because raw timeline, guides, and status toast survived into review. Added a compact scene/timing scrubber and hid editing-only surfaces.",
        "The asset rail carried too much editing UI. Kept it scannable and moved the full style/brief editor into the wider Inspector.",
        "Header/sidebar implementation details competed with the artwork. Made Preview and Render primary actions, moved secondary actions under More, and removed permanent validation/tool-count/starter cards.",
        "The timeline's first read was keyframe noise. Added semantic event bands with an explicit Show details disclosure for precise edits.",
        "The desktop shell could force phone-width overflow. Removed the global minimum width and added responsive project/Inspector drawers with a readable-width timeline.",
        "In a split ChatGPT/Codex browser pane, the permanent Inspector consumed the stage's working width. Moved it to a closed-by-default overlay drawer at <= 1200 px, hid the redundant project-drawer action while the rail remains visible, and added a checked-in 960 px regression gate.",
    ]),
    p("Limits", heading),
    p("The regular hosted interaction suite remains a Playwright fallback, while a Sol-powered Codex run directly exercised the public page's WebMCP tools in the in-app browser and verified the Alice/Bob coupon gag. The Luna-bound main task cannot call browser WebMCP; supported Sol/Terra tasks can. No separate MCP server connection, TOML entry, or restart was needed. Native Chromium smoke complements that live run. TTS, voice cloning, dialogue recording, phoneme extraction, and lip-sync remain out of scope.", body),
])

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
doc = SimpleDocTemplate(str(OUTPUT), pagesize=letter, leftMargin=0.6 * inch, rightMargin=0.6 * inch, topMargin=0.55 * inch, bottomMargin=0.62 * inch, title="Stagehand Phase Evidence", author="Codex")
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUTPUT)
