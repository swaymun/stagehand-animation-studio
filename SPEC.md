# Stagehand MVP

Stagehand is a WebMCP-native 2D animation studio where a person and ChatGPT can storyboard, assemble mixed-media assets, animate rigged characters, edit timing and camera work, validate scenes, and render a structured cartoon together.

## Current cut

The first vertical slice is a deterministic, local-first Paper Cutout Comedy scene: two pre-rigged placeholder characters, a diner background, captions, a timeline, command-backed transforms and poses, undo/redo, local recovery, and five WebMCP tools. TTS, voice cloning, dialogue recording, phoneme extraction, and lip-sync remain explicitly out of scope.

## Product rules

- The artifact is editable: scenes, assets, poses, timing, captions, and camera work remain structured data.
- Human and agent actions share one command model. Mutations are revisioned and undoable.
- Broad reads and narrow writes are preferred. Agent writes must preserve unrelated manual edits.
- Preview, frame inspection, and final render must share one deterministic evaluator.
- Browser 2D studio first; desktop Chrome is the initial target.

## Canonical demo

Start from Paper Cutout Comedy. Alice waits nervously in a diner; Bob enters behind her. Captions are “You actually came” and “I almost didn’t.” The tone is awkward, with an uncomfortable pause, a quick reaction punch-in, footsteps, and quiet music. A human moves Alice closer and raises her arm. The agent preserves that blocking and camera work while smoothing the arm, holding the reaction longer, and lowering music under captions.

## Roadmap gates

1. Feasibility spikes: deterministic timestamp evaluation, nested rig anchors, playable WebM, minimal WebMCP mutation/undo, imported asset renderability.
2. Editable vertical slice: model, persistence, commands, one scene, rig editing, timeline, preview, import/export.
3. Multi-scene animation core: storyboard promotion, scene operations, interpolation, motion presets, camera effects.
4. Agent-native control: P0 WebMCP tools, revisions, idempotency, preserve/lock, structured errors, parity tests.
5. Mixed media/templates: media compositing, asset briefs/import, character-sheet rig import, four starters, style bible.
6. Captions/audio/validation/render: captions, bundled SFX/music, deterministic issues, WebM export.
7. UX/challenge polish: onboarding, recovery, accessibility, performance, README, architecture, demo script.

## Phase evidence contract

Each phase closes only after Implement → local tests → Sites deployment → real hosted WebMCP test where available (Playwright fallback is labeled separately) → UI roast → fixes → second review. Evidence records the deployed URL, test commands, screenshots, tool calls/results, roast findings, fixes, and warnings.
