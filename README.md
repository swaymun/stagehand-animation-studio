# Stagehand Animation Studio

Stagehand is a WebMCP-native 2D animation studio for making short, editable paper-cutout scenes together with a person and ChatGPT. The current cut is a deterministic 15-second, six-beat diner comedy scene with generated/imported asset handoff, review-gated skeleton proposals, segmented 2D binding plus an experimental mesh data path, renderer-applied visual treatments, animated props, camera work, captions, CC0/imported audio cues, storyboard beats, multi-scene preview, PNG export, and audio-capable WebM export.

## Run it

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in a desktop browser. The project stores its editable state in local browser storage; use More actions → Export project to save a JSON project file and More actions → Import project to recover it.

## Verify it

```bash
npm run format
npm run lint
npm run typecheck
npm run build
npm run smoke:skill
npm run smoke
npm run smoke:native
STAGEHAND_URL=https://stagehand-animation-studio.saimun-h-shahee.chatgpt.site npm run smoke
```

The regular smoke gate injects a model-context bridge, verifies the exact ordered set of 39 public tools and unique schema IDs, checks concurrency guards and the explicit legacy adapter, then exercises blank-project creation, assets, rigging, motion, audio, recovery, PNG, and WebM paths. `smoke:native` launches Chromium with its experimental WebMCP flag and verifies the same 39-tool contract through browser-native registration. `smoke:skill` checks the downloadable skill and ten golden rigging fixtures. ChatGPT Site tools themselves require no separate connection; in the ChatGPT desktop app they are account/model-gated and controlled by the Enable site tools permission.

## Studio map

- **Scenes / Board / Assets**: blank-project creation, scene management, editable storyboard beats, asset import, visual briefs, per-asset style direction, palette chips, stage/library placement, and imported-prop motion. Assets stay scannable in the rail; the selected asset’s full style editor lives in Inspector.
- **Animate**: canvas, character and camera Inspector, captions, non-voice mix, style bible, and a semantic timeline of camera, pose, prop, dialogue, music, and SFX events. Show details reveals the precise draggable keyframes; Inspector groups can collapse independently.
- **Storyboard**: renderer-backed beat thumbnails that move the shared playhead; beats can be promoted into trimmed scenes.
- **Preview**: primary review action using the same deterministic evaluator as export; editing chrome is hidden while transport, a compact scrubber, and scene context remain available.
- **Render**: deterministic project-sequence WebM export with captions and cue-based audio. PNG frame export, project import/export, settings, help, and guides live under More actions.
- **WebMCP surface**: exactly 39 public tools expose blank-project creation plus the complete project, asset, audio, skeleton, motion, validation, and export loop. Narrow mutations share the human command path and revisioned undo/redo history. Every mutation accepts optional `expectedRevision` and `idempotencyKey`; older granular operations remain available only through an explicit in-page legacy adapter.

## Architecture

The app is intentionally local-first and currently implemented as one client-side studio surface in `app/page.tsx`:

1. Structured `Project` state contains scenes, characters, assets, prop/character/camera keyframes, captions, cues, and style direction.
2. `commit()` is the shared command path for human and agent mutations; it snapshots history, increments revisions, syncs the active scene, and persists recovery state.
3. `evaluateCharacters()`, `evaluateProps()`, and `evaluateCamera()` are deterministic timestamp evaluators shared by the canvas, thumbnails, Preview, frame inspection, and WebM renderer; imported asset treatments are applied at draw time so Preview and export stay visually aligned.
4. Human scrubbing, beat jumps, and canvas selection synchronize the current project snapshot that WebMCP reads, so agent commands never act on a stale playhead or selection.
5. `document.modelContext.registerTool()` registers the imperative WebMCP surface when the host provides it, with a `navigator.modelContext` compatibility fallback for current experimental Chromium builds; the native registration gate covers both local and hosted URLs.
6. Sites packages the validated `dist/` output from the exact pushed commit and deploys it as a public ChatGPT Site.

TTS, voice cloning, dialogue recording, phoneme extraction, and lip-sync are explicitly out of scope for this MVP.

## Blank-project path

1. Create a configurable blank project with two unbound actor slots and the bundled CC0 audio library.
2. Create a rig-ready asset request with a motion profile and `humanoid-jointed-v1` topology.
3. Attach the assembled neutral reference and matching 15-part exploded rig atlas.
4. Inspect decoded overlap, reconstruction, anchor, and stress-pose diagnostics before asset approval.
5. Use Setup, Binding, Animate, and QA to edit the live rig, add bone keyframes, and validate it.
6. Inspect the frame diagnostics, then export PNG and WebM from the same evaluated state.

When the studio is used beside a ChatGPT or Codex conversation, Agent Live records each WebMCP command, revision, outcome, affected entities, and the matching editor surface. The public surface contains 40 tools, including `edit_skeleton`, and every tool has a typed visible UI contract. V2 asset packages are rejected; jointed characters require strict `StagehandAssetPackageV3`.

See [`AGENTS.md`](AGENTS.md) for the repo-local asset/rigging contract, [`SPEC.md`](SPEC.md) for the phase gates, and [`docs/PHASE-EVIDENCE.md`](docs/PHASE-EVIDENCE.md) for the current verification record.

The installable `stagehand-asset-rigging` Codex skill is available from the app's Help dialog or directly as [`stagehand-asset-rigging-v1.0.0.zip`](public/downloads/stagehand-asset-rigging-v1.0.0.zip), with an adjacent SHA-256 checksum.
