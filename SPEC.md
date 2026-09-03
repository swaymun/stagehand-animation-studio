# Stagehand MVP

Stagehand is a WebMCP-native 2D animation studio where a person and ChatGPT can storyboard, hand off generated assets, review skeleton proposals, animate rigid or segmented characters, experiment with mesh bindings, edit timing and camera work, layer CC0/imported audio, validate scenes, and render a structured cartoon together.

## Current cut

The current cut is a deterministic, local-first 15-second, six-beat Paper Cutout Comedy scene: two pre-rigged characters with replaceable generated/imported art, review-gated skeleton proposals, segmented binding metadata plus an experimental mesh path, automatically detected four-pose sheet crops, six built-in pose states, deterministic nervous and walk-in motion presets, a diner background, captions, interpolated character, imported-prop, bone, and camera keyframe timelines with semantic event bands plus optional frame-snapped raw-keyframe editing, structured non-voice music/footstep/sting cues backed by a bundled CC0 library or user imports, audio-capable concatenated multi-scene WebM, deterministic sequence preview playback, current-frame PNG export, provenance-first asset requests/candidates, local recovery, and sixty-nine WebMCP tools including agent-triggered project WebM rendering. TTS, voice cloning, dialogue recording, phoneme extraction, and lip-sync remain explicitly out of scope.

## Product rules

- The artifact is editable: scenes, assets, poses, timing, captions, and camera work remain structured data.
- Human and agent actions share one command model. Mutations are revisioned and undoable.
- Broad reads and narrow writes are preferred. Agent writes must preserve unrelated manual edits.
- Preview, frame inspection, and final render must share one deterministic evaluator for character motion and camera framing.
- Human view changes such as scrubbing, beat jumps, and canvas selection must update the same current project snapshot read by WebMCP tools before the next command runs.
- Character motion is stored as explicit keyframes and interpolated at the playhead; human and agent edits use the same keyframe command path.
- Camera framing is stored as explicit zoom, pan, and rotation keyframes and interpolated at the playhead; human and agent edits use the same camera command path.
- Asset style direction is structured per asset as role, treatment, silhouette, palette, and notes; human and agent edits use the same command path.
- Imported asset treatments affect the canvas, thumbnails, Preview, and WebM draw path; `get_asset_manifest` also reports whether an asset is bound, on stage, or library-only plus its prop keyframe count.
- Browser 2D studio first; desktop Chrome is the initial target.
- Mutating WebMCP tools accept an optional `expectedRevision` and reject stale
  writes with a structured conflict result so an agent must reread before
  overwriting a human's newer work.

## Canonical demo

Start from Paper Cutout Comedy. Alice waits nervously in a diner; Bob enters behind her. Captions are “You actually came” and “I almost didn’t.” The tone is awkward, with an uncomfortable pause, a quick reaction punch-in, footsteps, and quiet music. A human moves Alice closer and raises her arm. The agent preserves that blocking and camera work while smoothing the arm, holding the reaction longer, and lowering music under captions.

## Roadmap gates

1. Feasibility spikes — complete: deterministic timestamp evaluation, playable WebM, imperative WebMCP registration, and imported-project recovery are proven.
2. Editable vertical slice — complete: model, persistence, commands, one scene, rig editing, timeline, preview, import/export.
3. Multi-scene animation core — complete for the current cut: a 15-second six-beat starter arc, independent scene content, scene operations, split-at-playhead trimming, interpolated camera framing, renderer-backed scene poster frames, editable storyboard beats, renderer-backed clickable storyboard beat-board mode, storyboard-beat promotion into trimmed scenes, and concatenated sequence WebM rendering with per-scene audio/caption timing are verified.
4. Agent-native control — in progress: sixty-nine registered tools, revision reporting and optional stale-write guards, undo/redo, structured validation, deterministic frame inspection, persistent character-track locking, split-scene parity, editable storyboard parity, editable style-bible parity, editable asset-brief parity, editable asset-style parity, editable project-name parity, pose and motion-preset parity, imported-prop keyframe and motion-preset parity, scene speed-retiming parity, audio-library and cue level/timing parity, generated-asset request/approval parity, skeleton/joint/bone-keyframe parity, current-frame export parity, agent-triggered project WebM rendering, visible/agent parity, and browser-native registration in experimental Chromium are present; ChatGPT in-app tool discovery remains host/model-gated.
5. Mixed media/templates — complete for the current cut: structured asset add/remove, generated/imported asset requests with provenance and review state, persisted asset briefs and per-asset style direction, renderer-applied asset treatments, palette and placement cues, local image import, deterministic character/background/prop compositing, imported-prop animation with human and agent controls, human and agent character-art binding, automatic four-column pose-sheet detection and crop selection, four reusable scene templates, and an editable style bible are present; broader arbitrary-asset ingest remains.
6. Captions/audio/validation/render — in progress: captions, deterministic validation, a bundled CC0 audio library plus user/link import, cue-based music/SFX routing with human and agent level/timing edits, audio-capable concatenated multi-scene WebM export, current-frame PNG export, direct bounded scene-duration editing, and persisted 12/24 fps plus 720p/1080p controls are present; MP4/GIF and voice workflows remain deferred.
7. UX/challenge polish — ongoing: accessibility, recovery, performance, readable scene-segment labels, supported desktop-width shell stability, Animate/Storyboard as the only top-level editor modes, Preview as a review action with hidden editing chrome, semantic timeline event bands with optional raw-keyframe details, collapsible Inspector groups, sequence preview playback, direct timeline retiming with lock-aware feedback, responsive project/Inspector drawers, README, architecture, and demo script continue through the implementation loop.
8. Skeletal character rigs — working foundation: accept a generated/imported character reference or parts/pose sheet, propose an editable bone graph and segmented/mesh-capable binding, require review of joints and confidence, then drive approved bone keyframes through the existing command, timeline, Preview, validation, and WebM export paths. Segmented regions are the reliable path; mesh vertices/weights are an experimental prototype. The current six-pose rig remains the rigid fallback when a reference cannot be safely interpreted.

## Phase evidence contract

Each phase closes only after Implement → local tests → Sites deployment → real hosted WebMCP test where available (Playwright fallback is labeled separately) → UI roast → fixes → second review. Evidence records the deployed URL, test commands, screenshots, tool calls/results, roast findings, fixes, and warnings.

## Repeatable local gate

With the local dev server running on `http://localhost:3000`, run `npm run smoke` and `npm run smoke:native`. The checked-in Playwright smoke test injects a model-context bridge, verifies all sixty-nine tools, exercises generated-asset checklist/request/attach/inspect/approval, proposes/corrects/approves a segmented skeleton, sets bone keyframes, routes an audio cue through the library, imports a tiny prop fixture and a wide four-column pose-sheet fixture, exercises human and agent prop transforms/styles/presets, verifies manifest placement and a renderer treatment filter, human and agent scene speed retiming, immediate undo/redo and audio edits, checks semantic timeline bands plus the raw-keyframe disclosure, drags a timeline keyframe, proves local recovery, adds a second scene, verifies cross-scene Preview playback, switches storyboard and Preview modes, and waits for an actual two-scene agent-triggered WebM download. The native gate enables Chromium's experimental WebMCP implementation and checks native registration plus valid and invalid callbacks. Set `STAGEHAND_URL` to point either gate at another deployed build; the full hosted interaction suite remains a labeled Playwright fallback.
