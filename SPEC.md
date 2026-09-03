# Stagehand MVP

Stagehand is a WebMCP-native 2D animation studio where a person and ChatGPT can storyboard, assemble mixed-media assets, animate rigged characters, edit timing and camera work, validate scenes, and render a structured cartoon together.

## Current cut

The current cut is a deterministic, local-first Paper Cutout Comedy scene: two pre-rigged characters with replaceable imported art and automatically detected four-pose sheet crops, six built-in pose states, deterministic nervous and walk-in motion presets, a diner background, captions, interpolated character, imported-prop, and camera keyframe timelines with frame-snapped drag retiming, symmetric one-frame timeline stepping, direct scene-duration editing with safe timing trims, semantic scene speed-up/slow-down retiming across all timed tracks, structured non-voice music/footstep/sting cues with editable levels rendered into a concatenated multi-scene WebM, deterministic sequence preview playback, deterministic current-frame PNG export, a structured asset library with placeholder add/remove, persisted visual briefs and per-asset style direction, renderer-applied paper/inked/flat-color/photo treatments, palette chips and stage/library placement, local image import/compositing, deterministic imported-prop pop-in and nudge presets, renderer-backed scene and beat poster frames, four reusable scene templates, command-backed transforms, poses, reaction cuts, persistent character-track locking, split-at-playhead scene editing, undo/redo, local recovery, independent multi-scene content with add/rename/duplicate/delete/reorder operations, editable persisted storyboard beats with add/update/remove tools, a persisted editable visual style bible with agent parity, storyboard-beat promotion into trimmed scenes, a dedicated clickable storyboard beat-board mode, a persisted editable project name with human and agent parity, project-named JSON/PNG/WebM exports, persisted 12/24 fps and 720p/1080p render settings, deterministic frame inspection, JSON import/export, visible readiness validation, and fifty-two WebMCP tools including agent-triggered project WebM rendering. TTS, voice cloning, dialogue recording, phoneme extraction, and lip-sync remain explicitly out of scope.

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
3. Multi-scene animation core — complete for the current cut: independent scene content, scene operations, split-at-playhead trimming, interpolated camera framing, renderer-backed scene poster frames, editable storyboard beats, renderer-backed clickable storyboard beat-board mode, storyboard-beat promotion into trimmed scenes, and concatenated sequence WebM rendering with per-scene audio/caption timing are verified.
4. Agent-native control — in progress: fifty-two registered tools, revision reporting and optional stale-write guards, undo/redo, structured validation, deterministic frame inspection, persistent character-track locking, split-scene parity, editable storyboard parity, editable style-bible parity, editable asset-brief parity, editable asset-style parity, editable project-name parity, pose and motion-preset parity, imported-prop keyframe and motion-preset parity, scene speed-retiming parity, audio-cue level/timing parity, current-frame export parity, agent-triggered project WebM rendering, and visible/agent parity are present; hosted live WebMCP enumeration is still a platform/browser capability gap.
5. Mixed media/templates — complete for the current cut: structured asset add/remove, persisted asset briefs and per-asset style direction, renderer-applied asset treatments, palette and placement cues, local image import, deterministic character/background/prop compositing, imported-prop animation with human and agent controls, human and agent character-art binding, automatic four-column pose-sheet detection and crop selection, four reusable scene templates, and an editable style bible are present; richer media ingest remains.
6. Captions/audio/validation/render — in progress: captions, deterministic validation, cue-based music/SFX with human and agent level/timing edits, audio-capable concatenated multi-scene WebM export, current-frame PNG export, direct bounded scene-duration editing, and persisted 12/24 fps plus 720p/1080p controls are present; richer export formats remain.
7. UX/challenge polish — ongoing: accessibility, recovery, performance, readable scene-segment labels, supported desktop-width shell stability, distinct Animate/Storyboard/Preview editor modes, a review-first Preview player with hidden editing chrome, collapsible Inspector groups, sequence preview playback, direct timeline retiming with lock-aware feedback, README, architecture, and demo script continue through the implementation loop.

## Phase evidence contract

Each phase closes only after Implement → local tests → Sites deployment → real hosted WebMCP test where available (Playwright fallback is labeled separately) → UI roast → fixes → second review. Evidence records the deployed URL, test commands, screenshots, tool calls/results, roast findings, fixes, and warnings.

## Repeatable local gate

With the local dev server running on `http://localhost:3000`, run `npm run smoke`. The checked-in Playwright smoke test injects a model-context bridge, verifies all fifty-two tools, imports a tiny prop fixture and a wide four-column pose-sheet fixture, exercises human and agent prop transforms/styles/presets, verifies manifest placement and a renderer treatment filter, human and agent scene speed retiming, immediate undo/redo and audio edits, drags a timeline keyframe, proves local recovery, adds a second scene, verifies cross-scene Preview playback, switches storyboard and Preview modes, and waits for an actual two-scene agent-triggered WebM download. Set `STAGEHAND_URL` to point the same gate at another deployed build; hosted builds without the browser bridge remain a labeled Playwright fallback.
