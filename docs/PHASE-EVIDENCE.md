# Stagehand Phase 4.1 Evidence

## Release scope

Phase 4.1 replaces the demo-first six-part workflow with a blank-project, rig-ready puppet pipeline and a live WebMCP editor. The former Alice/Bob Late Plate project, public artwork, fallback scenery, and Load demo controls are removed. New projects contain one blank scene, two unbound actor slots, one camera keyframe, and four bundled CC0 audio assets.

## Runtime and contracts

- The public WebMCP surface contains exactly 40 tools in the documented order.
- `edit_skeleton` is inserted immediately after `get_skeleton` and supports joint, bone, binding-method, segmented-region, and complete canonical-mesh operations.
- Every public tool has an exhaustive typed `ToolUiContract` with route, focus target, action/display mode, and visible DOM marker.
- Agent Live records running, succeeded, failed, conflicted, and replayed commands with revision and affected entities, then follows the relevant editor surface.
- Skeleton edits increment project and skeleton revisions, return changed IDs, mark review pending, invalidate QA, and make an active mesh stale after rest-pose or topology changes.
- Stale mesh rendering returns `STALE_MESH_BINDING`; it never draws an undeformed rectangular fallback.

## Rig-ready asset pipeline

- Jointed characters require strict `StagehandAssetPackageV3`; V2 attachment returns `UNSUPPORTED_PACKAGE_VERSION` without committing.
- `humanoid-jointed-v1` defines 15 canonical parts: pelvis, torso, head, and mirrored upper arm, forearm, hand, thigh, shin, and foot.
- Asset requests persist a `MotionProfileV1`, topology profile, and two deliverable slots: assembled neutral reference and matching exploded rig atlas.
- The generation brief requires assembled-first design, identical scale/orientation, rounded hidden geometry, 20–30% joint extensions, and no clean-cut endpoints.
- Decoded atlas pixels are checked for transparency, exactly 15 significant alpha components, and clipped edge pixels.
- Package validation blocks overlap below 20%, silhouette IoU below 0.90, anchor residual above 2% of character height, rest coverage below 0.90, stress coverage below 0.82, added components, clipping, inversion, and transparent joint corridors. Overlap above 35% is a warning.
- Failed candidates are preserved. Phase 4.1 does not synthesize or paint missing joint pixels.

## Live editor

- Project Health exposes project inspection and validation.
- The blank-project dialog configures name, duration, frame rate, and 720p/1080p output through the same project model.
- The Assets rail provides a durable rig request composer, motion/topology summary, required deliverable progress, decoded candidate diagnostics, approval, and rejection.
- The rig workspace exposes Setup, Binding, Animate, and QA, including stage joint dragging, numeric joint editing, bone hierarchy, region/bone assignment, binding Apply, bone rotation keyframes, keyframe deletion, isolated parts, alpha masks, stress poses, wireframe, renderer metrics, validation, and approval.
- Character variants and audio provenance/payload/timing controls have visible human surfaces.
- Preview, frame inspection, PNG export, and WebM report shared renderer and attachment diagnostics without returning binary payloads from WebMCP.

## Verification

Commands passed on 2026-09-04:

```text
npm run format
npm run lint
npm run typecheck
npm run build
npm run test:rig
npm run test:tool-ui
npm run test:mesh
npm run smoke
npm run smoke:native
npm run smoke:skill
```

Focused results:

- V3 rig regression: PASS, including 15-part topology, 14 attachment relationships, real elbow/knee joints, overlap depth, reconstruction IoU, anchor residual, clean-cut rejection, clipping, gaps, inversion, and coverage thresholds.
- Tool/UI contract: 40/40 PASS; exact order and the `get_skeleton → edit_skeleton` insertion are asserted.
- Mesh regression: PASS with 8 vertices, 6 triangles, at most 2 influences, zero weight error, zero degenerate triangles, zero winding flips, and no fallback.
- Browser smoke: PASS from blank project through two-deliverable requests, clean-cut rejection, valid V3 atlas approval, 16-joint/15-bone skeleton proposal, live skeleton edit, audio provenance and payload, project/frame inspection, Agent Live history, and mobile overflow.
- Native WebMCP smoke: PASS with 40 unique tools, exact order, unique schema IDs, optimistic concurrency, idempotency, and zero registration/page errors.
- Skill fixtures: 15/15 PASS.
- Impeccable mechanical detector: no findings.
- Desktop 1440×960 and mobile 390×844 visual review: PASS after the mobile brand text was collapsed to its mark; page width remains 390 px.

## ImageGen acceptance

The assembled courier-rabbit reference passed the decoded-alpha check and is preserved under `output/phase-4.1-imagegen-acceptance/`. Both generated atlas candidates contained a baked checkerboard and decoded as fully opaque RGB, so they were rejected and preserved. A final regeneration failed upstream with `moderation_blocked`.

No skeleton approval, deformation claim, or stress-pose render was made from those invalid atlas candidates. The acceptance result is therefore an honest blocked generated-rig candidate and a passing rejection/recovery pipeline. See `qa.json` and `provenance.json` beside the preserved images.

## Release boundaries

Automatic segmentation, pixel repair, painting, IK, constraints, warp deformers, auto-weighting, and production auto-rigging remain deferred. Weighted mesh remains an experimental proof even though the canonical evaluator and parity tests pass.
