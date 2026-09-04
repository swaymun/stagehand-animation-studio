# Stagehand agent contract

Stagehand is a frame-by-frame animation studio. Agents operate on integer frames, held drawings, scene-local captions, mouth cues, audio, and procedural SFX. Do not introduce skeleton, mesh, bone, IK, or tween dependencies into the production path.

## Asset-to-frame loop

1. Read the project and call `get_asset_generation_checklist` before generating or revising media.
2. Save a durable `create_asset_request` with a full prompt and consistency constraints.
3. Attach a bounded candidate without replacing its source.
4. Inspect dimensions, transparency, cell layout, prompt, and provenance.
5. Approve the candidate before using it in an exposed drawing.
6. Add or update an integer animation frame and set its exposure length.
7. Inspect representative boundary frames, regenerate lip-sync if dialogue changed, and validate the project.
8. Compare preview, PNG inspection, and WebM output from the same held-cel evaluator.

## Safety and recovery

- Keep rejected candidates for comparison; never overwrite source media in place.
- Mutations should use a fresh `expectedRevision` and a unique `idempotencyKey`.
- Treat missing assets, uncovered frames, invalid mouth shapes, and missing audio payloads as blockers for that output.
- Onion skin and editing guides are preview-only and must not appear in PNG or WebM exports.
- Local voice generation requires explicit consent when cloning a real person. Never commit voice references or reusable clone prompts.

## Media provenance

Generated and imported assets retain author, source, license, and checksum metadata when available. Reachable media is not automatically redistributable. Stagehand's bundled demo art and dialogue are original project assets; the local voice bridge uploads nothing.
