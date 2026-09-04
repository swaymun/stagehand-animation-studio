# Stagehand MVP specification

Stagehand is a WebMCP-native 2D animation studio for editable, deterministic frame-by-frame sequences. The current release has three multi-scene demos, storyboard/video-editing controls, authored drawing exposures, captions, estimated lip-sync, optional local voice, procedural SFX, asset provenance and approval, validation, PNG export, and WebM export.

Projects use `schemaVersion: 2`: scenes, storyboard beats, assets, asset requests, revision/history, fps (12 or 24), render dimensions, and active scene/playhead. Each scene contains character/prop/camera/overlay tracks; tracks contain sorted integer-frame cels with drawing, optional asset/frame reference, transform, and exposure. Captions, lip-sync, audio, and SFX are scene-local frame ranges.

The evaluator holds the most recent cel at or before the requested frame and never interpolates drawings. Preview, `inspect_frame`, PNG, and WebM use the same evaluator. Sequence WebM renders scenes in order and schedules generated dialogue, optional music, and procedural SFX; missing audio payloads are validation warnings.

Exactly 27 tools are public: project/demo, storyboard/scene, timeline/playhead/frame editing, lip-sync, local voice, audio, SFX, assets, validation, frame inspection, PNG/WebM export, undo, and redo. Tool schema IDs are unique. Mutations use optimistic revision and idempotency guards and return structured `{ ok, revision, ... }` results. Registration is `document.modelContext.registerTool(tool, { signal })`; the concrete example is in `README.md`.

## Verification gate

Run format, lint, typecheck, build, frame regression, UI contract, regular smoke, and native smoke. Hosted smoke runs separately against the deployed URL. Evidence records commit, URL, tool count/order, schema uniqueness, guarded mutation result, frame holds, lip-sync/SFX, validation, PNG dimensions, WebM bytes/duration, and responsive viewports.

## Non-goals

No skeletal rigs, bone keyframes, mesh skinning, automatic segmentation, IK, phoneme extraction, cloud voice generation, MP4/GIF export, or deployment automation are included.
