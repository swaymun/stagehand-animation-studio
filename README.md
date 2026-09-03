# Stagehand Animation Studio

Stagehand is a WebMCP-native 2D animation studio for making short, editable paper-cutout scenes together with a person and ChatGPT. The current cut is a deterministic diner comedy scene with rigged characters, imported image assets, renderer-applied per-asset visual treatments, animated props, camera work, captions, non-voice audio cues, storyboard beats, multi-scene preview, and WebM export.

## Run it

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in a desktop browser. The project stores its editable state in local browser storage; use Export to save a JSON project file and Import to recover it.

## Verify it

```bash
npm run format
npm run lint
npm run build
npm run smoke
STAGEHAND_URL=https://stagehand-animation-studio.saimun-h-shahee.chatgpt.site npm run smoke
```

The smoke gate injects a model-context bridge, verifies all 52 tools, inspects a deterministic frame, exports a real PNG frame, imports a PNG prop fixture and a wide four-column pose-sheet fixture, edits a prop from the human controls, verifies a human-scrubbed playhead through `get_timeline`, checks stage placement and renderer-applied asset treatment, exercises human and agent scene speed retiming, applies an agent prop preset, retimes a character keyframe, exercises undo/redo, audio levels, and partial render-settings updates, adds a second scene, verifies recovery and cross-scene Preview playback, switches Storyboard and Preview, and waits for a two-scene WebM download. The hosted command is a Playwright fallback because the public Site does not expose live WebMCP enumeration to this runner.

## Studio map

- **Scenes / Board / Assets**: scene management, editable storyboard beats, starter templates, asset import, visual briefs, per-asset style direction, palette chips, stage/library placement, and imported-prop motion.
- **Animate**: canvas, character and camera inspector, captions, non-voice mix, style bible, and the structured timeline. Inspector groups can collapse independently to keep the working surface focused; arrow keys and the symmetric step buttons move one frame at a time.
- **Storyboard**: renderer-backed beat thumbnails that move the shared playhead; beats can be promoted into trimmed scenes.
- **Preview**: review-first sequence player using the same deterministic evaluator as export; editing chrome is hidden while transport and scene context remain available.
- **Render WebM**: deterministic project-sequence export with captions and cue-based audio.
- **WebMCP surface**: read tools expose project state; narrow mutation tools share the human command path and revisioned undo/redo history. Every mutation accepts optional `expectedRevision` and `idempotencyKey` safeguards for stale reads and safe retries, including structured per-asset visual style edits.

## Architecture

The app is intentionally local-first and currently implemented as one client-side studio surface in `app/page.tsx`:

1. Structured `Project` state contains scenes, characters, assets, prop/character/camera keyframes, captions, cues, and style direction.
2. `commit()` is the shared command path for human and agent mutations; it snapshots history, increments revisions, syncs the active scene, and persists recovery state.
3. `evaluateCharacters()`, `evaluateProps()`, and `evaluateCamera()` are deterministic timestamp evaluators shared by the canvas, thumbnails, Preview, frame inspection, and WebM renderer; imported asset treatments are applied at draw time so Preview and export stay visually aligned.
4. Human scrubbing, beat jumps, and canvas selection synchronize the current project snapshot that WebMCP reads, so agent commands never act on a stale playhead or selection.
5. `document.modelContext.registerTool()` registers the imperative WebMCP surface when the host provides it.
6. Sites packages the validated `dist/` output from the exact pushed commit and deploys it as a public ChatGPT Site.

TTS, voice cloning, dialogue recording, phoneme extraction, and lip-sync are explicitly out of scope for this MVP.

## Demo path

1. Start with **Paper Cutout Comedy** and scrub the shared playhead.
2. Choose Alice, change a transform, and add a keyframe; try **Nervous** or **Walk in**.
3. Open **Assets**, import a prop, use **Pop in** or **Nudge**, then edit X/Y/Scale/Rot at the playhead.
4. Open **Assets**, expand **Style**, and change treatment or palette to see the asset direction reflected in the stage and render path.
5. Open **Storyboard** to inspect the three beat thumbnails, then return to **Animate**.
6. Open **Preview** for the clean review player and let the sequence loop.
7. Lower the music cue, click **Render WebM**, and inspect the downloaded result.

See [`SPEC.md`](SPEC.md) for the phase gates and [`docs/PHASE-EVIDENCE.md`](docs/PHASE-EVIDENCE.md) for the current verification record.
