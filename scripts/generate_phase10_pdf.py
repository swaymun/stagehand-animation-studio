from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output/pdf/phase-10-skeletal-rigs.pdf"

styles = getSampleStyleSheet()
title = ParagraphStyle(
    "Title", parent=styles["Title"], fontName="Helvetica", fontSize=25,
    leading=30, alignment=TA_CENTER, textColor=colors.HexColor("#263238"),
    spaceAfter=12,
)
subtitle = ParagraphStyle(
    "Subtitle", parent=styles["Normal"], fontName="Helvetica", fontSize=10,
    leading=14, alignment=TA_CENTER, textColor=colors.HexColor("#7b6f68"),
    spaceAfter=24,
)
heading = ParagraphStyle(
    "Heading", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=16,
    leading=20, textColor=colors.HexColor("#267fa8"), spaceBefore=12,
    spaceAfter=8,
)
body = ParagraphStyle(
    "Body", parent=styles["BodyText"], fontName="Helvetica", fontSize=10.5,
    leading=15, textColor=colors.HexColor("#4e4a47"), spaceAfter=8,
)
bullet = ParagraphStyle(
    "Bullet", parent=body, leftIndent=14, firstLineIndent=-10, bulletIndent=2,
    spaceAfter=5,
)


def p(text, style=body):
    return Paragraph(text, style)


def bullets(items):
    return [p(f"- {item}", bullet) for item in items]


story = [
    p("Phase 10: Skeletal character rigs", title),
    p("Future extension of Stagehand's current pose-based character rig", subtitle),
    p("Status", heading),
    p("This is a future extension of Stagehand's current pose-based character rig. It is not part of the MVP checkpoint.", body),
    p("Product goal", heading),
    p("Let a person provide a character reference image or pose sheet and receive a reviewable skeletal-rig proposal that can be corrected before it drives animation.", body),
    p("Proposed flow", heading),
    *bullets([
        "Import a character reference image or pose sheet and preserve the original asset as the source of truth.",
        "Generate a proposal containing a root, joints, bones, attachment regions, and confidence per landmark.",
        "Show the proposal over the reference with clear handles for moving, adding, removing, and mirroring joints.",
        "Let the person approve or revise the joint graph and art binding before animation commands can use it.",
        "Create bone transforms and optional mesh or segmented-cutout weights while retaining the existing rigid-pose fallback.",
        "Animate bones with the same revisioned commands, undo/redo history, playhead, Preview evaluator, validation, and WebM renderer used by the current studio.",
    ]),
    p("Suggested structured model", heading),
    *bullets([
        "Skeleton: stable id, root joint, joints, bones, bind asset, binding method, version, and approval state.",
        "SkeletonJoint: id, parent id, x/y, radius, label, confidence, and locked state.",
        "SkeletonBone: id, parent joint, child joint, length, angle limits, and optional influence regions.",
        "SkeletonBinding: asset id, method (rigid, segmented, or mesh), weights or regions, and source-image dimensions.",
        "BoneKeyframe: scene id, skeleton id, time, joint or bone transforms, and interpolation mode.",
    ]),
    p("Agent surface", heading),
    p("Candidate tools are propose_skeleton, get_skeleton, update_skeleton_joint, set_bone_keyframe, bind_skeleton_asset, and validate_skeleton. Proposal and binding tools must return a pending review state rather than silently making a character animation-ready.", body),
    p("Acceptance gates", heading),
    *bullets([
        "A reference can produce a deterministic, inspectable proposal or an explicit UNABLE_TO_PROPOSE result.",
        "The person can correct every joint and binding region before approval.",
        "Unapproved skeletons cannot affect Preview or export.",
        "Human and agent edits share revision guards, idempotency, undo/redo, persistence, and validation.",
        "The renderer, thumbnails, Preview, frame inspection, and WebM export agree on the same bone-evaluated frame.",
        "Existing six-pose characters and pose-sheet imports continue to work unchanged.",
        "A failed or low-confidence proposal never destroys the original reference or the rigid-pose fallback.",
    ]),
    p("Deliberate non-goals", heading),
    *bullets([
        "Training a custom vision model, automatic perfect weights, 3D motion capture, facial lip-sync, or replacing the current deterministic pose rig.",
        "Those can be evaluated only after the reviewable 2D skeleton workflow is reliable.",
    ]),
]


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#d5c9c0"))
    canvas.line(0.6 * inch, 0.42 * inch, 7.9 * inch, 0.42 * inch)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#8d8178"))
    canvas.drawString(0.65 * inch, 0.22 * inch, "Stagehand Animation Studio - future phase note")
    canvas.drawRightString(7.85 * inch, 0.22 * inch, f"Page {doc.page}")
    canvas.restoreState()


OUTPUT.parent.mkdir(parents=True, exist_ok=True)
doc = SimpleDocTemplate(
    str(OUTPUT), pagesize=letter, leftMargin=0.65 * inch, rightMargin=0.65 * inch,
    topMargin=0.6 * inch, bottomMargin=0.62 * inch,
    title="Phase 10: Skeletal character rigs", author="Codex",
)
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUTPUT)
