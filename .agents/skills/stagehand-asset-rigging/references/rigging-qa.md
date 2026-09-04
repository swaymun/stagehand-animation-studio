# Rigging and rendered QA

Inspect alpha and masks before joint placement. Isolate each part and confirm its bounds, pivot, parent anchor, assigned bone, draw order, overlap margin, and confidence. Correct low-confidence critical joints before approval.

Render the isolated character against transparency in at least these poses:

1. rest
2. shoulders raised or rotated
3. hips rotated
4. elbow and knee flexion
5. walk stride
6. turn or lean
7. reaction or squash pose

Block approval when rendered pixels show new significant gaps, excessive overlaps, clipping, disconnected alpha islands beyond the validated rest baseline, inverted limbs, invalid draw order, or coordinate-space mismatches. Review the rendered output, not only metadata.

For jointed cutouts also require decoded overlap depth of 20–35%, reassembled silhouette IoU at least 0.90, anchor residual at most 2% of character height, rest joint coverage at least 0.90, and approved stress-pose joint coverage at least 0.82. Exercise real shoulder, elbow, wrist, hip, knee, and ankle chains. A clean-cut atlas is a failed candidate, not a repair request.

After corrections, run `validate_skeleton`, approve separately from the asset, read back bone keyframes, inspect a representative frame, and run `validate_project` before export.

## Mesh proof QA

Before approval, require valid finite normalized rest positions and UVs, stable unique vertex IDs, valid indexed triangles, existing bone references, one to four positive influences per vertex, strict new-input weight sums within `1 ± 0.0001`, and a matching texture and skeleton version.

Render rest, a 60-degree weighted bend, and the allowed extreme through `canvas-lbs-mesh-v1`. Block approval on a near-zero evaluated area, winding flip, missing renderer report, or `fallbackUsed: true`. Report vertex and triangle counts, maximum influences, maximum weight error, degenerate and flipped counts, and worst area ratio.

For parity, disable editor guides and wireframes, render equal dimensions and timestamps, and compare RGBA SHA-256 hashes from `inspect_frame`, `export_frame`, and the WebM source-frame sample. The editor wireframe is a diagnostic overlay, not export content.
