# Stagehand Animation Studio

Stagehand is a WebMCP-native 2D animation studio for making short, editable paper-cutout scenes together with a person and ChatGPT. The current cut is a deterministic 15-second, six-beat diner comedy scene with rigged characters, imported image assets, renderer-applied per-asset visual treatments, animated props, camera work, captions, non-voice audio cues, storyboard beats, multi-scene preview, and WebM export.

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
npm run build
npm run smoke
npm run smoke:native
STAGEHAND_URL=https://stagehand-animation-studio.saimun-h-shahee.chatgpt.site npm run smoke
```

The regular smoke gate injects a model-context bridge, verifies all 52 tools, inspects a deterministic frame, exports a real PNG frame, imports a PNG prop fixture and a wide four-column pose-sheet fixture, edits a prop from the human controls, verifies a human-scrubbed playhead through `get_timeline`, checks stage placement and renderer-applied asset treatment, exercises human and agent scene speed retiming, applies an agent prop preset, retimes a character keyframe, exercises undo/redo, audio levels, and partial render-settings updates, adds a second scene, verifies recovery and cross-scene Preview playback, switches Storyboard and Preview, and waits for a two-scene WebM download. `smoke:native` launches Chromium with its experimental WebMCP flag, captures the browser-native registration path, verifies all 52 tools register without errors, and executes valid and invalid tool calls through the registered callbacks. The hosted regular command is a Playwright fallback for the full interaction suite; the hosted native command verifies registration in experimental Chromium. ChatGPT Site tools themselves require no separate connection; in the ChatGPT desktop app they are account/model-gated and controlled by the Enable site tools permission.

## Studio map

- **Scenes / Board / Assets**: scene management, editable storyboard beats, starter templates, asset import, visual briefs, per-asset style direction, palette chips, stage/library placement, and imported-prop motion. Assets stay scannable in the rail; the selected asset’s full style editor lives in Inspector.
- **Animate**: canvas, character and camera Inspector, captions, non-voice mix, style bible, and a semantic timeline of camera, pose, prop, dialogue, music, and SFX events. Show details reveals the precise draggable keyframes; Inspector groups can collapse independently.
- **Storyboard**: renderer-backed beat thumbnails that move the shared playhead; beats can be promoted into trimmed scenes.
- **Preview**: primary review action using the same deterministic evaluator as export; editing chrome is hidden while transport, a compact scrubber, and scene context remain available.
- **Render**: deterministic project-sequence WebM export with captions and cue-based audio. PNG frame export, project import/export, templates, settings, help, and guides live under More actions.
- **WebMCP surface**: read tools expose project state; narrow mutation tools share the human command path and revisioned undo/redo history. Every mutation accepts optional `expectedRevision` and `idempotencyKey` safeguards for stale reads and safe retries, including structured per-asset visual style edits.

## Architecture

The app is intentionally local-first and currently implemented as one client-side studio surface in `app/page.tsx`:

1. Structured `Project` state contains scenes, characters, assets, prop/character/camera keyframes, captions, cues, and style direction.
2. `commit()` is the shared command path for human and agent mutations; it snapshots history, increments revisions, syncs the active scene, and persists recovery state.
3. `evaluateCharacters()`, `evaluateProps()`, and `evaluateCamera()` are deterministic timestamp evaluators shared by the canvas, thumbnails, Preview, frame inspection, and WebM renderer; imported asset treatments are applied at draw time so Preview and export stay visually aligned.
4. Human scrubbing, beat jumps, and canvas selection synchronize the current project snapshot that WebMCP reads, so agent commands never act on a stale playhead or selection.
5. `document.modelContext.registerTool()` registers the imperative WebMCP surface when the host provides it, with a `navigator.modelContext` compatibility fallback for current experimental Chromium builds; the native registration gate covers both local and hosted URLs.
6. Sites packages the validated `dist/` output from the exact pushed commit and deploys it as a public ChatGPT Site.

TTS, voice cloning, dialogue recording, phoneme extraction, and lip-sync are explicitly out of scope for this MVP.

## Demo path

1. Start with **Paper Cutout Comedy**, a 15-second six-beat arc, and scrub the shared playhead.
2. Choose Alice, change a transform, and add a keyframe; try **Nervous** or **Walk in**.
3. Open **Assets**, import a prop, use **Pop in** or **Nudge**, then edit X/Y/Scale/Rot at the playhead.
4. Open **Assets**, expand **Style**, and change treatment or palette to see the asset direction reflected in the stage and render path.
5. Open **Storyboard** to inspect the six beat thumbnails, then return to **Animate**.
6. Open **Preview** for the clean review player and let the sequence loop.
7. Lower the music cue, click **Render**, and inspect the downloaded result.

When the studio is used beside a ChatGPT or Codex conversation, the split-pane layout keeps the project rail and artwork visible while the Inspector stays available from More actions. The public demo has also been exercised by a Sol-powered Codex task through the page's WebMCP tools: it generated and applied an Alice/Bob coupon gag, then validated and inspected the punchline frame.

See [`SPEC.md`](SPEC.md) for the phase gates and [`docs/PHASE-EVIDENCE.md`](docs/PHASE-EVIDENCE.md) for the current verification record.
