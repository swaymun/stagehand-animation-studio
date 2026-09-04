# Stagehand asset-to-rig agent guide · Phase 4.1

Stagehand turns generated or uploaded 2D character art into a reviewable, animated rig without hiding approval, provenance, or rendered-quality decisions.

## Production sequence

1. Inspect the project and retain its revision.
2. Call `get_asset_generation_checklist`, then `create_asset_request` with a motion profile, topology profile, and both required deliverables.
3. Generate or upload only with explicit authorization. Keep originals and every failed or rejected candidate.
4. Attach the assembled neutral reference and its matching exploded atlas with explicit deliverable roles. Verify decoded dimensions, straight-alpha transparency, checksum, provenance, and strict `StagehandAssetPackageV3` readiness. V2 is unsupported.
5. Reject clean-cut or under-covered joints and regenerate; Phase 4.1 never invents or paints missing pixels. Require 20–35% overlap, 0.90 silhouette IoU, 2% maximum anchor residual, and 0.90/0.82 rest/stress coverage.
6. Call `propose_skeleton`; inspect and correct low-confidence joints and binding regions through the live Setup, Binding, Animate, and QA surfaces. `edit_skeleton` invalidates approval and QA. Prefer segmented binding for production and label mesh binding experimental.
7. Render rest, shoulder, hip, elbow/knee, walk, turn, and reaction stress poses. Block approval for new gaps, excessive overlap, clipping, inverted limbs, invalid draw order, or coordinate mismatches.
8. Approve the skeleton separately. Add bone keyframes using `hold`, `linear`, or `ease-in-out`, then read them back.
9. Finish with `validate_skeleton`, `validate_project`, `inspect_frame`, and `render_webm` or `export_frame` from the same evaluated state.

Every mutation based on a prior read sends `expectedRevision` and a unique `idempotencyKey`. Re-read after a revision conflict. Retry an uncertain mutation only with the same key.

## Package contract

`StagehandAssetPackageV3` records immutable source provenance, both related deliverables, decoded image properties, a canvas anchor, the motion and topology profiles, semantic parts, per-part deformation modes, attachment contracts, pivots, anchors, required overlap, draw order, confidence, and reconstruction diagnostics. V2 packages are rejected with `UNSUPPORTED_PACKAGE_VERSION`; variant motion transfer requires stable part and bone topology.

## Recovery rules

- Preserve a rejected candidate and attach a corrected revision or a new candidate.
- Treat low-confidence critical joints and failed rendered QA as blockers.
- Leave the character slot unbound until the replacement asset and skeleton are approved; there is no bundled character fallback.
- Return from experimental mesh binding to an explicitly selected, validated segmented binding when mesh validation fails.
- Block imported audio when its payload or license evidence is incomplete.

## Install the Codex skill

Download `stagehand-asset-rigging-v1.0.0.zip`, verify its adjacent SHA-256 file, and extract the `stagehand-asset-rigging` folder into `$CODEX_HOME/skills/`. Restart Codex or begin a fresh task, then request the `stagehand-asset-rigging` skill for an asset-to-rig workflow.

The same guide and recovery details are bundled inside the skill under `references/`.
