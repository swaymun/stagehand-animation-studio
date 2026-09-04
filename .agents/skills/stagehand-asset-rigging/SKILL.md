---
name: stagehand-asset-rigging
description: Build, inspect, correct, approve, animate, and export segmented 2D character rigs and experimental true-mesh proofs in Stagehand. Use for generated or uploaded character art, StagehandAssetPackageV2 manifests, skeleton and binding review, rendered seam or stress-pose QA, variant compatibility, provenance, and recovery from failed candidates or stale revisions.
---

# Stagehand Asset Rigging

Use this workflow when turning visual media into an inspectable Stagehand rig. Keep approval gates explicit and treat tool output as authoritative project state.

## Route the work

- Read [motion-profile.md](references/motion-profile.md) before choosing a rig class or preparing source art.
- Read [prompt-brief.md](references/prompt-brief.md) before generating or revising character art.
- Read [package-schema.md](references/package-schema.md) when creating, migrating, or diagnosing a `StagehandAssetPackageV2`.
- Read [tool-contracts.md](references/tool-contracts.md) before calling the Stagehand WebMCP surface.
- Read [rigging-qa.md](references/rigging-qa.md) for skeleton correction, binding review, and rendered validation.
- Read [provenance.md](references/provenance.md) for generated, uploaded, linked, or licensed media.
- Read [recovery.md](references/recovery.md) after a failed candidate, stale revision, partial mutation, validation error, or topology mismatch.

## Production loop

1. Inspect the project and current revision. Send `expectedRevision` and a unique `idempotencyKey` with every mutation based on a prior read.
2. Record the motion profile and choose rigid cutout, jointed cutout, mesh, warp, swap, or hybrid before calling `get_asset_generation_checklist` and creating a durable request.
3. Generate media only with explicit authorization for the external generator, credentials, uploads, paid compute, or publication. Preserve the original and every rejected or failed candidate.
4. Attach bounded image bytes, inspect the candidate, and verify decoded dimensions, straight-alpha transparency, checksum, provenance, package structure, and review state. Never echo image bytes in a tool result.
5. Correct package parts, masks, bounds, pivots, parent anchors, attachment margins, draw order, and confidence before asset approval. Prefer stable semantic part IDs.
6. Obtain explicit asset approval before binding. Propose a skeleton, inspect confidence and binding regions, render representative stress poses, correct defects, and obtain separate skeleton approval.
7. Prefer segmented 2D binding for production. A mesh proof must use canonical `MeshBindingV1`, `canvas-lbs-mesh-v1`, and rendered triangle metrics; label it experimental and keep a segmented fallback.
8. Animate approved bones only. Read keyframes back, verify interpolation and variant topology, then inspect a representative rendered frame.
9. Finish with `validate_project`, `inspect_frame`, and `render_webm` or `export_frame` from the same evaluated revision.

## Non-negotiable checks

- Do not guess resource names or IDs; inspect first.
- Do not approve an asset or skeleton merely because a request was created.
- Treat low-confidence critical joints, disconnected alpha islands, visible gaps, excessive overlaps, clipping, inverted limbs, invalid draw order, coordinate mismatches, missing audio payloads, stale revisions, and validation errors as blockers for the affected path.
- For mesh mode, also block missing UVs or bones, bad indices or weights, version drift, degenerate triangles, winding flips, and any undeformed rectangular fallback.
- Use only `hold`, `linear`, or `ease-in-out` interpolation.
- Keep source provenance immutable; corrections create revisions or new candidates.
- Report structured findings, confidence, correction status, and next safe action without returning binary payloads.
