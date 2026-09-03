# Stagehand MVP

Stagehand is a WebMCP-native 2D animation studio where a person and ChatGPT can storyboard, assemble mixed-media assets, animate rigged characters, edit timing and camera work, validate scenes, and render a structured cartoon together.

## Current cut

The current cut is a deterministic, local-first Paper Cutout Comedy scene: two pre-rigged characters with replaceable imported art and four-pose sheet crops, a diner background, captions, interpolated character and camera keyframe timelines, structured non-voice music/footstep/sting cues rendered into WebM, a structured asset library with placeholder add/remove and local image import/compositing, four reusable scene templates, command-backed transforms, poses, reaction cuts, persistent character-track locking, split-at-playhead scene editing, undo/redo, local recovery, independent multi-scene content with add/rename/duplicate/delete/reorder operations, editable persisted storyboard beats with add/update/remove tools, storyboard-beat promotion into trimmed scenes, persisted 12/24 fps and 720p/1080p render settings, deterministic frame inspection, JSON import/export, visible readiness validation, and thirty-nine WebMCP tools. TTS, voice cloning, dialogue recording, phoneme extraction, and lip-sync remain explicitly out of scope.

## Product rules

- The artifact is editable: scenes, assets, poses, timing, captions, and camera work remain structured data.
- Human and agent actions share one command model. Mutations are revisioned and undoable.
- Broad reads and narrow writes are preferred. Agent writes must preserve unrelated manual edits.
- Preview, frame inspection, and final render must share one deterministic evaluator for character motion and camera framing.
- Character motion is stored as explicit keyframes and interpolated at the playhead; human and agent edits use the same keyframe command path.
- Camera framing is stored as explicit zoom, pan, and rotation keyframes and interpolated at the playhead; human and agent edits use the same camera command path.
- Browser 2D studio first; desktop Chrome is the initial target.

## Canonical demo

Start from Paper Cutout Comedy. Alice waits nervously in a diner; Bob enters behind her. Captions are “You actually came” and “I almost didn’t.” The tone is awkward, with an uncomfortable pause, a quick reaction punch-in, footsteps, and quiet music. A human moves Alice closer and raises her arm. The agent preserves that blocking and camera work while smoothing the arm, holding the reaction longer, and lowering music under captions.

## Roadmap gates

1. Feasibility spikes — complete: deterministic timestamp evaluation, playable WebM, imperative WebMCP registration, and imported-project recovery are proven.
2. Editable vertical slice — complete: model, persistence, commands, one scene, rig editing, timeline, preview, import/export.
3. Multi-scene animation core — complete for the current cut: independent scene content, scene operations, split-at-playhead trimming, interpolated camera framing, editable storyboard beats, and storyboard-beat promotion into trimmed scenes are verified.
4. Agent-native control — in progress: thirty-nine registered tools, revisions, undo, structured validation, deterministic frame inspection, persistent character-track locking, split-scene parity, editable storyboard parity, and visible/agent parity are present; hosted live WebMCP enumeration is still a platform/browser capability gap.
5. Mixed media/templates — in progress: structured asset add/remove, local image import, deterministic character/background/prop compositing, character-art binding, four-pose sheet crop selection, and four reusable scene templates are present; asset briefs, automatic character-sheet pose extraction, and an expanded style bible remain.
6. Captions/audio/validation/render — in progress: captions, deterministic validation, cue-based music/SFX, audio-capable WebM export, and persisted 12/24 fps plus 720p/1080p controls are present; richer export formats remain.
7. UX/challenge polish — ongoing: accessibility, recovery, performance, readable scene-segment labels, README, architecture, and demo script continue through the implementation loop.

## Phase evidence contract

Each phase closes only after Implement → local tests → Sites deployment → real hosted WebMCP test where available (Playwright fallback is labeled separately) → UI roast → fixes → second review. Evidence records the deployed URL, test commands, screenshots, tool calls/results, roast findings, fixes, and warnings.
