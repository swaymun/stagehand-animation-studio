# Stagehand WebMCP contract

The public surface contains exactly these 38 tools, in this order:

`inspect_project`, `edit_project`, `get_timeline`, `set_playhead`, `edit_scene`, `edit_storyboard`, `set_current_scene`, `set_pose`, `set_keyframe`, `set_bone_keyframe`, `delete_keyframe`, `get_bone_keyframes`, `set_character_variant`, `validate_project`, `undo`, `redo`, `edit_history`, `list_assets`, `get_asset_generation_checklist`, `create_asset_request`, `attach_generated_asset`, `inspect_asset_candidate`, `approve_asset`, `list_asset_audio`, `import_asset_audio`, `attach_imported_audio`, `add_audio_clip`, `set_audio_clip`, `inspect_audio_clip`, `propose_skeleton`, `get_skeleton`, `approve_skeleton`, `validate_skeleton`, `bind_skeleton_asset`, `apply_motion_clip`, `inspect_frame`, `export_frame`, `render_webm`.

Each tool has a unique input-schema `$id`. Mutations made from a prior read include `expectedRevision` and a unique `idempotencyKey`. On a revision conflict, re-read with `inspect_project`; on an uncertain response, retry only with the same idempotency key.

Use only `hold`, `linear`, or `ease-in-out` interpolation. Treat compatibility-only operations outside the public list as legacy adapters, never as additional public WebMCP registrations.
