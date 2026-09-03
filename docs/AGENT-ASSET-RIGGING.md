# Agent-guided asset and rigging workflow

Stagehand's WebMCP surface separates capability discovery from autonomy policy. The MCP records requests, candidates, provenance, skeleton confidence, and approval state; the repository-local [`AGENTS.md`](../AGENTS.md) tells an agent how to sequence those capabilities.

## Required handoff

```text
get_asset_generation_checklist
  -> create_asset_request
  -> ImageGen or browser upload
  -> attach_generated_asset
  -> inspect_asset_candidate
  -> approve_asset
  -> propose_skeleton
  -> update_skeleton_joint / bind_skeleton_asset
  -> approve_skeleton
  -> set_bone_keyframe
  -> validate_skeleton / validate_project
  -> inspect_frame / export_frame / render_webm
```

Generated image payloads are bounded base64 image data URLs. Browser upload is the fallback when the calling agent cannot transfer image bytes. A candidate remains `pending-review` until explicitly approved, and an unapproved generated candidate cannot be bound through `bind_character_asset`.

## Rig modes

- `rigid`: whole-character fallback compatible with the existing pose rig.
- `segmented`: reliable 2D path using transparent parts-sheet regions and shared skeleton/bone keyframes.
- `mesh`: editable vertices and weights are stored and validated, with one experimental renderer path. It is not yet a universal solution for arbitrary artwork.

Skeleton mutations use the same revision, idempotency, history, persistence, and stale-write rules as the existing animation tools. Pending or rejected skeletons do not drive Preview, frame inspection, or export. The source image and rejected candidates remain preserved.
