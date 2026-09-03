from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A5
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "stagehand-asset-rigging-agent-guide.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="GuideTitle", parent=styles["Title"], fontName="Helvetica-Bold",
    fontSize=22, leading=24, textColor=colors.HexColor("#29272A"),
    spaceAfter=7 * mm, alignment=TA_LEFT,
))
styles.add(ParagraphStyle(
    name="GuideHeading", parent=styles["Heading2"], fontName="Helvetica-Bold",
    fontSize=12, leading=15, textColor=colors.HexColor("#9A382F"),
    spaceBefore=4 * mm, spaceAfter=2 * mm,
))
styles.add(ParagraphStyle(
    name="GuideBody", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=9.5, leading=13.5, textColor=colors.HexColor("#29272A"),
    spaceAfter=2.2 * mm,
))
styles.add(ParagraphStyle(
    name="GuideStep", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=9.2, leading=13, leftIndent=5 * mm, firstLineIndent=-5 * mm,
    textColor=colors.HexColor("#29272A"), spaceAfter=2 * mm,
))
styles.add(ParagraphStyle(
    name="GuideCode", parent=styles["Code"], fontName="Courier",
    fontSize=7.7, leading=10.5, leftIndent=4 * mm, rightIndent=4 * mm,
    borderColor=colors.HexColor("#D9C7A8"), borderWidth=0.6,
    borderPadding=3 * mm, backColor=colors.HexColor("#F5EBD9"),
    spaceBefore=2 * mm, spaceAfter=3 * mm,
))

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#D9C7A8"))
    canvas.line(14 * mm, 11 * mm, A5[0] - 14 * mm, 11 * mm)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(colors.HexColor("#6B6460"))
    canvas.drawString(14 * mm, 7 * mm, "STAGEHAND / ASSET-TO-RIG")
    canvas.drawRightString(A5[0] - 14 * mm, 7 * mm, str(doc.page))
    canvas.restoreState()

story = [
    Paragraph("Stagehand asset-to-rig", styles["GuideTitle"]),
    Paragraph("A compact production guide for inspectable 2D character packages, approval-gated skeletons, and rendered seam validation.", styles["GuideBody"]),
    Paragraph("Production sequence", styles["GuideHeading"]),
]

steps = [
    "Inspect the project and retain its revision.",
    "Call get_asset_generation_checklist, then create_asset_request.",
    "Generate or upload only with explicit authorization. Preserve originals and rejected candidates.",
    "Attach and inspect the candidate. Verify decoded dimensions, straight alpha, checksum, provenance, and StagehandAssetPackageV2 readiness. Never return media bytes.",
    "Correct masks, bounds, pivots, parent anchors, margins, bone assignments, draw order, overlap, and confidence. Approve the asset explicitly.",
    "Propose and correct the skeleton. Prefer segmented production binding; label mesh binding experimental.",
    "Render rest, shoulder, hip, elbow/knee, walk, turn, and reaction poses. Block new gaps, excessive overlap, clipping, inversion, bad draw order, and coordinate mismatch.",
    "Approve the skeleton separately. Add and read back bone keyframes using hold, linear, or ease-in-out.",
    "Validate the skeleton and project, inspect a frame, then export from the same evaluated state.",
]
for index, step in enumerate(steps, 1):
    story.append(Paragraph(f"<b>{index}.</b> {step}", styles["GuideStep"]))

story += [
    Spacer(1, 2 * mm),
    Paragraph("Mutation safety", styles["GuideHeading"]),
    Paragraph("Every mutation based on a prior read includes expectedRevision and a unique idempotencyKey. Re-read after a conflict. Retry an uncertain mutation only with the same key.", styles["GuideCode"]),
    PageBreak(),
    Paragraph("Package contract", styles["GuideHeading"]),
    Paragraph("StagehandAssetPackageV2 records immutable source provenance, decoded image properties, a canvas anchor, semantic parts, masks and bounds, pivots, parent anchors, attachment margins, draw order, confidence, views, expressions, and skeleton confidence. Variant motion transfer requires stable part and bone topology.", styles["GuideBody"]),
    Paragraph("Recovery rules", styles["GuideHeading"]),
]
for item in [
    "Preserve rejected candidates; attach a corrected revision or new candidate.",
    "Treat low-confidence critical joints and failed rendered QA as blockers.",
    "Keep the existing six-pose character until replacement asset and skeleton approvals are complete.",
    "Return from experimental mesh to the segmented production fallback when validation fails.",
    "Block imported audio when payload or license evidence is incomplete.",
]:
    story.append(Paragraph(f"- {item}", styles["GuideStep"]))

story += [
    Paragraph("Install the Codex skill", styles["GuideHeading"]),
    Paragraph("Download stagehand-asset-rigging-v1.0.0.zip and verify the adjacent SHA-256 file. Extract the stagehand-asset-rigging folder into $CODEX_HOME/skills, then restart Codex or begin a fresh task.", styles["GuideBody"]),
    Paragraph("The bundle includes prompt, schema, tool-contract, QA, provenance, recovery, and golden-fixture references.", styles["GuideBody"]),
]

doc = SimpleDocTemplate(
    str(OUTPUT), pagesize=A5, rightMargin=14 * mm, leftMargin=14 * mm,
    topMargin=14 * mm, bottomMargin=16 * mm,
    title="Stagehand Asset-to-Rig Agent Guide",
    author="Stagehand",
)
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUTPUT)
