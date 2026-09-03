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

After corrections, run `validate_skeleton`, approve separately from the asset, read back bone keyframes, inspect a representative frame, and run `validate_project` before export.
