# Phase 10: Skeletal character rigs

The working foundation is now part of Stagehand's polished finish-line cut. Segmented 2D binding is the reliable path; mesh vertices and weights are stored and validated through an experimental prototype path.

## Product goal

Let a person provide a character reference image or pose sheet and receive a reviewable skeletal-rig proposal that can be corrected before it drives animation.

## Proposed flow

1. Ask WebMCP for a generation checklist, create an asset request, then attach a character reference, pose sheet, or transparent parts sheet while preserving the original asset as the source of truth.
2. Generate a proposal containing a root, joints, bones, attachment regions, and confidence per landmark.
3. Show the proposal over the reference with clear handles for moving, adding, removing, and mirroring joints.
4. Let the person approve or revise the joint graph and art binding before animation commands can use it.
5. Create bone transforms and optional mesh or segmented-cutout weights while retaining the existing rigid-pose fallback.
6. Animate bones with the same revisioned commands, undo/redo history, playhead, Preview evaluator, validation, and WebM renderer used by the current studio.

## Suggested structured model

- `Skeleton`: stable id, root joint, joints, bones, bind asset, binding method, version, and approval state.
- `SkeletonJoint`: id, parent id, x/y, radius, label, confidence, and locked state.
- `SkeletonBone`: id, parent joint, child joint, length, angle limits, and optional influence regions.
- `SkeletonBinding`: asset id, method (`rigid`, `segmented`, or `mesh`), weights or regions, and source-image dimensions.
- `BoneKeyframe`: scene id, skeleton id, time, joint or bone transforms, and interpolation mode.

## Agent surface

Candidate tools are now live as `propose_skeleton`, `get_skeleton`, `update_skeleton_joint`, `set_bone_keyframe`, `bind_skeleton_asset`, `approve_skeleton`, and `validate_skeleton`, alongside the asset handoff tools `get_asset_generation_checklist`, `create_asset_request`, `attach_generated_asset`, `inspect_asset_candidate`, and `approve_asset`. Proposal and binding tools return a pending review state rather than silently making a character animation-ready.

## Acceptance gates

- A reference can produce a deterministic, inspectable proposal or an explicit invalid-asset result.
- The person can correct every joint and binding region before approval.
- Unapproved skeletons cannot affect Preview or export.
- Human and agent edits share revision guards, idempotency, undo/redo, persistence, and validation.
- The renderer, thumbnails, Preview, frame inspection, and WebM export agree on the same bone-evaluated frame; segmented regions are rendered from the shared evaluator and mesh data is preserved as experimental metadata.
- Existing six-pose characters and pose-sheet imports continue to work unchanged.
- A failed or low-confidence proposal never destroys the original reference or the rigid-pose fallback.

## Deliberate non-goals

Phase 10 does not require training a custom vision model, automatic perfect weights, 3D motion capture, facial lip-sync, or replacing the current deterministic pose rig. Those can be evaluated only after the reviewable 2D skeleton workflow is reliable.
