# Stagehand WebMCP contract

The public surface contains exactly these 40 tools, in this order:

`inspect_project`, `create_project`, `edit_project`, `get_timeline`, `set_playhead`, `edit_scene`, `edit_storyboard`, `set_current_scene`, `set_pose`, `set_keyframe`, `set_bone_keyframe`, `delete_keyframe`, `get_bone_keyframes`, `set_character_variant`, `validate_project`, `undo`, `redo`, `edit_history`, `list_assets`, `get_asset_generation_checklist`, `create_asset_request`, `attach_generated_asset`, `inspect_asset_candidate`, `approve_asset`, `list_asset_audio`, `import_asset_audio`, `attach_imported_audio`, `add_audio_clip`, `set_audio_clip`, `inspect_audio_clip`, `propose_skeleton`, `get_skeleton`, `edit_skeleton`, `approve_skeleton`, `validate_skeleton`, `bind_skeleton_asset`, `apply_motion_clip`, `inspect_frame`, `export_frame`, `render_webm`.

Every public tool has a typed `ToolUiContract` with a visible route, focus target, action/display mode, and DOM marker. Agent calls appear in Agent Live and auto-follow the affected editor surface.

`edit_skeleton` discriminates `set_joint`, `add_joint`, `remove_joint`, `upsert_bone`, `remove_bone`, `set_binding_method`, `upsert_region`, `remove_region`, and `replace_mesh`. Every successful edit increments project and skeleton revisions, returns changed entity IDs, marks review pending, and invalidates QA. Rest-pose or topology edits make an active mesh stale until it is explicitly rebound.

`create_asset_request` records `motionProfile`, `topologyProfile`, and both required deliverables. `attach_generated_asset` requires `deliverableRole: assembled-reference | rig-atlas`.

Use `create_project` to replace the active browser project with a new blank project. It creates one empty scene, two unbound actor slots, and the bundled CC0 audio library; optional inputs set the project name, duration, frame rate, and 720p or 1080p render preset. The previous project remains available through undo.

Each tool has a unique input-schema `$id`. Mutations made from a prior read include `expectedRevision` and a unique `idempotencyKey`. On a revision conflict, re-read with `inspect_project`; on an uncertain response, retry only with the same idempotency key.

Use only `hold`, `linear`, or `ease-in-out` interpolation. Treat compatibility-only operations outside the public list as legacy adapters, never as additional public WebMCP registrations.

`propose_skeleton` and `bind_skeleton_asset` accept canonical `mesh: MeshBindingV1` without adding a new public tool. Keep the legacy `vertices` and `weights` inputs readable. Mesh input is rejected before commit when structure, weights, texture identity, bone references, or skeleton version are invalid. A successful rebind increments the skeleton version and stores the mesh against that version atomically.

`validate_skeleton`, `inspect_frame`, `export_frame`, and `render_webm` report `canvas-lbs-mesh-v1`, fallback use, vertex and triangle counts, maximum influences, maximum weight-sum error, degenerate and flipped counts, and worst area ratio when mesh rendering is active. Inspection and export may return RGBA hashes, but never image bytes.
