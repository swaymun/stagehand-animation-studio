# Stagehand agent contract

This repository-local guide describes the default behavior for agents operating the Stagehand WebMCP studio. It is guidance, not a second permission system: the MCP tools expose candidate and approval state, while the calling user or agent may explicitly choose a different autonomy policy.

## Asset-to-rig loop

1. Call `get_asset_generation_checklist` before generating or revising visual media.
2. Create a durable `create_asset_request`, then generate against its prompt and checklist.
3. Attach bounded image bytes with `attach_generated_asset` (or use the browser upload fallback). Keep the original source and every failed candidate.
4. Call `inspect_asset_candidate`; preserve provenance, prompt, dimensions/layout when available, transparency notes, and review status.
5. Ask for approval before binding or exporting by default. `approve_asset` is the explicit gate; an agent or user may override the default policy only when that choice is clear in the task.
6. Call `propose_skeleton`, inspect it with `get_skeleton`/`validate_skeleton`, and correct joints or binding regions before `approve_skeleton`.
7. Use `set_bone_keyframe` for bone motion only after skeleton approval. Read back with `get_bone_keyframes` and verify a representative `inspect_frame`.
8. Finish with `validate_project`, then compare `inspect_frame`, `export_frame`, and `render_webm` from the same evaluated state.

## Safety and recovery defaults

- Never replace a source asset in place when attaching a generated candidate.
- Keep rejected and failed candidates available for comparison or later revision.
- Treat low-confidence joints, missing audio payloads, stale revisions, and validation errors as blockers for the affected path.
- Prefer segmented 2D binding for reliable production output. Mesh bindings are supported as an experimental prototype and must be labeled as such.
- Existing six-pose characters remain the fallback when a candidate or skeleton is not approved.
- Use optional `expectedRevision` and a unique `idempotencyKey` on every mutation when operating from a prior read.
- Human approval is the default before binding/export; do not infer an autonomy override from a generated asset request alone.

## Media provenance

Bundled audio is CC0/public-domain only. Imported or linked audio must retain its source URL, author, license, license URL, duration, loopability, and checksum when available. Do not redistribute a file merely because it is reachable by URL.
