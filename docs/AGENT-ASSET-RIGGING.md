# Stagehand asset-to-rig agent guide

Stagehand turns generated or uploaded 2D character art into a reviewable, animated rig without hiding approval, provenance, or rendered-quality decisions.

## Production sequence

1. Inspect the project and retain its revision.
2. Call `get_asset_generation_checklist`, then `create_asset_request`.
3. Generate or upload only with explicit authorization. Keep originals and every failed or rejected candidate.
4. Call `attach_generated_asset`, then `inspect_asset_candidate`. Verify decoded dimensions, straight-alpha transparency, checksum, provenance, and `StagehandAssetPackageV2` readiness. Tool results never return binary media payloads.
5. Correct part masks, bounds, pivots, parent anchors, attachment margins, bone assignments, draw order, overlap, and confidence. Approve the asset explicitly.
6. Call `propose_skeleton`; inspect and correct low-confidence joints and binding regions. Prefer segmented binding for production and label mesh binding experimental.
7. Render rest, shoulder, hip, elbow/knee, walk, turn, and reaction stress poses. Block approval for new gaps, excessive overlap, clipping, inverted limbs, invalid draw order, or coordinate mismatches.
8. Approve the skeleton separately. Add bone keyframes using `hold`, `linear`, or `ease-in-out`, then read them back.
9. Finish with `validate_skeleton`, `validate_project`, `inspect_frame`, and `render_webm` or `export_frame` from the same evaluated state.

Every mutation based on a prior read sends `expectedRevision` and a unique `idempotencyKey`. Re-read after a revision conflict. Retry an uncertain mutation only with the same key.

## Package contract

`StagehandAssetPackageV2` records immutable source provenance, decoded image properties, a canvas anchor, semantic parts, masks and bounds, pivots, parent anchors, attachment margins, draw order, confidence, views, expressions, and skeleton confidence. Variant motion transfer requires stable part and bone topology.

## Recovery rules

- Preserve a rejected candidate and attach a corrected revision or a new candidate.
- Treat low-confidence critical joints and failed rendered QA as blockers.
- Keep the existing six-pose character as the fallback until the replacement asset and skeleton are approved.
- Return from experimental mesh binding to segmented binding when mesh validation fails.
- Block imported audio when its payload or license evidence is incomplete.

## Install the Codex skill

Download `stagehand-asset-rigging-v1.0.0.zip`, verify its adjacent SHA-256 file, and extract the `stagehand-asset-rigging` folder into `$CODEX_HOME/skills/`. Restart Codex or begin a fresh task, then request the `stagehand-asset-rigging` skill for an asset-to-rig workflow.

The same guide and recovery details are bundled inside the skill under `references/`.
