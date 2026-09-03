# Stagehand Phase Evidence

This record follows the project contract in [`SPEC.md`](../SPEC.md): Implement → local tests → Sites deployment → hosted test → UI roast → fixes → second review.

## Current checkpoint

- Date: 2026-09-03
- Private source: [github.com/swaymun/stagehand-animation-studio](https://github.com/swaymun/stagehand-animation-studio)
- Verified source commit: `2a8a56cbf823566003a0a58b244ea93cb416bdd4`
- Public Site: [stagehand-animation-studio.saimun-h-shahee.chatgpt.site](https://stagehand-animation-studio.saimun-h-shahee.chatgpt.site)
- Sites version: `88`
- Scope at this checkpoint: a 15-second six-beat canonical starter arc with expanded captions, poses, camera beats, and non-voice cues, plus renderer-applied per-asset visual treatments, palette chips and stage/library placement, manifest-derived asset usage state, immediate style defaults for new/imported assets, human audio cue timing controls, clarified motion actions, revision-safe and idempotent WebMCP mutations, partial render-settings preservation, synchronized human/agent playhead reads, semantic scene speed retiming across timed tracks, synchronized Storyboard/Board navigation, review-first Preview with editing controls removed, readable two-line scene labels, semantic heading/dialog landmarks, accessible transform controls, wide four-column pose-sheet detection, and imported-prop/sequence coverage.

## Implement

- Imported props now have structured `PropKeyframe` data with interpolated X/Y/scale/rotation.
- WebMCP exposes `get_prop_keyframes`, `set_prop_keyframe`, and `apply_prop_preset`.
- Mutating WebMCP tools now expose an optional `expectedRevision` optimistic-concurrency guard; stale commands return `REVISION_CONFLICT` with the current revision and a reread hint.
- Mutating WebMCP tools also expose an optional `idempotencyKey`; repeated successful commands replay the original result without incrementing the project revision or duplicating edits.
- Assets now persist role, treatment, silhouette, palette, and direction notes; the Assets rail exposes a compact Style editor and `set_asset_style` provides agent parity.
- Motion actions now show their affected character and bounded duration while pose presets remain a separate visible group.
- Agent render-settings updates preserve the existing resolution when only the frame rate changes.
- Human Assets controls expose Pop in, Nudge, and four transform fields at the playhead.
- Prop keyframes flow through scene duplication, splitting, templates, persistence, validation, thumbnails, Preview, and WebM rendering.
- Preview hides the inspector, scene tools, duration editing, and mutation actions while retaining transport, scrubber, scene context, and Exit preview.
- Preview also removes global project-editing controls; WebM/PNG review outputs remain available.
- Scene labels use a two-line layout with the ready badge removed from the text flow, keeping segment names readable in the desktop shell.
- The studio brand is a descriptive `h1`, and the modal surface declares `aria-modal` alongside its labelled heading.
- Timeline keyframe buttons retain small diamonds but use 22×22 px hit targets.
- The smoke harness now opens the Help dialog through the human UI and reloads the mutated project to prove its local recovery path.
- Inspector editing groups now collapse independently so the working surface can stay focused without losing access to controls.
- Human scrubbing, beat jumps, and canvas selection now synchronize the project snapshot read by WebMCP tools before the next agent command.
- Human `0.8×` / `1.25×` controls and agent `retime_scene` synchronize scene duration, keyframes, captions, cues, and storyboard beats.
- The timeline now has symmetric one-frame step controls and stage-focused `← / →` keyboard stepping.
- Asset treatment choices now reach the canvas, thumbnails, Preview, and WebM draw path; `get_asset_manifest` reports bound/stage/library placement and prop keyframe count.
- The canonical starter now carries a 15-second six-beat arc with five captions, nine camera keyframes, extended character poses, and reaction cues through the final second chance.
- Empty editable asset, storyboard, and audio collections now remain empty after local recovery instead of silently repopulating starter defaults.
- New and imported assets receive a complete structured style direction before the first validation pass.
- Human audio cue Start/End fields now share bounded, undoable timing updates with the agent cue editor.

## Local verification

Commands run from the repository:

```text
npm run format       PASS
npm run lint         PASS
npm run build        PASS
git diff --check     PASS
npm run smoke        PASS
```

The local smoke result verified:

- 52 registered tools and no page errors.
- 39 mutating tools expose the concurrency/retry contract; a stale pose command returns `REVISION_CONFLICT`, and a repeated rename replays at the same revision.
- Human asset-style editor and agent `set_asset_style` update: PASS.
- Agent partial render-settings update preserves 1080p before an explicit reset to 720p: PASS.
- Agent `inspect_frame` at 125 ms returns deterministic scene state and 720×405 render metadata: PASS.
- Agent `export_frame` produced a 720×405 PNG download (`29,587` bytes): PASS.
- Human prop X edit: `63.0`.
- Agent prop keyframe at explicit time and Pop in preset: PASS.
- Undo/redo revisions: PASS.
- Second scene: PASS.
- Agent-triggered WebM: `sceneCount: 2`, `durationMs: 1000`, downloaded bytes > 0.
- Storyboard cards: `6`.
- Preview banner and canvas: present; inspector hidden; Board/Assets tabs and scene mutation actions hidden; Exit preview present.
- Help dialog: labelled heading and `aria-modal="true"` landmark present; close action works.
- Reload recovery: renamed two-scene project and imported asset restored from local storage: PASS.
- Sequence Preview: playback advanced from Scene 02 to Scene 01 across the 500 ms scene boundary: PASS.
- Wide pose-sheet import: 400×100 PNG auto-detected as a four-column sheet and bound to the selected rig: PASS.
- Inspector groups: five editing sections expose native collapse/reopen behavior while preserving accessible controls: PASS.
- Human scrub parity: a scrub to approximately 1.25 s is immediately returned by `get_timeline`: PASS.
- Scene retiming: human 1.25× / 0.8× controls and agent `retime_scene` preserve synchronized track timing while changing 15.00 s → 12.00 s → 15.00 s: PASS.
- Canonical duration/beat arc: starter restores at 15.00 s, retimes to 12.00 s at 1.25×, and exposes six storyboard cards: PASS.
- Keyboard stepping: focused stage `ArrowRight` advances the same playhead returned by `get_timeline`: PASS.
- Asset manifest placement: imported prop reports `placement: stage` and a nonzero prop keyframe count: PASS.
- Asset renderer treatment: agent `set_asset_style` to `inked` produces the expected grayscale/contrast filter during canvas drawing: PASS.
- Fresh asset readiness: imported prop and four-pose sheet assets carry valid default style metadata immediately; `validate_project` returns zero issues before reload: PASS.
- Human audio timing: Start for the quiet diner bed changes from 0 ms to 120 ms through the Inspector and remains valid for render: PASS.
- Empty collection recovery: deleting all six assets, six storyboard beats, and the active scene's audio cue, then reloading, preserves `assetCount: 0`, `storyboardBeatCount: 0`, and `audioCueCount: 0`: PASS.

## Hosted verification

```text
STAGEHAND_URL=https://stagehand-animation-studio.saimun-h-shahee.chatgpt.site npm run smoke
```

Result: PASS. The hosted run verified the same 52-tool injected bridge, 39 guarded mutations, the 15-second six-beat starter, stale-write conflict, idempotent replay, human and agent scene retiming, focused-stage keyboard stepping, frame inspection, PNG frame download, wide pose-sheet auto-detection, manifest stage placement, renderer-applied `inked` treatment, asset-style update, immediate fresh-asset readiness, human audio cue timing, partial render-settings preservation, prop workflow, two-scene WebM download, sequence Preview scene transition, synchronized Storyboard/Board context, human-scrubbed playhead visibility through `get_timeline`, clarified motion copy, collapsible Inspector groups, clean Preview state with global editing controls removed, readable scene-label layout, semantic `h1`, labelled Help modal, reload recovery including intentionally empty asset/beat/cue collections, and zero page errors. This is labeled a Playwright fallback: the public Site did not expose live WebMCP enumeration to the available runner, so it does not prove that ChatGPT’s production host enumerates the tools.

## UI roast and fixes

Evidence screenshots are captured from the hosted v85 build at 1440×960:

- [`v85-animate.png`](evidence/v85-animate.png): 15-second editing workspace with the expanded timeline and semantic scene speed controls.
- [`v85-assets-style.png`](evidence/v85-assets-style.png): expandable per-asset style editor with palette chips and stage/library placement cues.
- [`v85-storyboard.png`](evidence/v85-storyboard.png): six-card Storyboard mode with the Board rail selected.
- [`v85-preview.png`](evidence/v85-preview.png): clean review-first Preview player with only review outputs in the header.

Findings from the current screenshot review:

1. Imported props lacked direct human transform editing. Fixed with X/Y/Scale/Rot controls sharing the keyframe command path.
2. Four prop transform fields initially collided with the asset-list flex rule and truncated. Fixed with an explicit two-column grid; computed field boxes are 57 px wide in two rows.
3. Preview carried too much editing chrome. Fixed by hiding the inspector, scene tools, duration input, timeline mutation actions, and adding Exit preview.
4. Timeline diamonds had 7×7 px hit targets. Fixed with 22×22 px buttons while preserving the 7 px visual diamond.
5. Agent retries could duplicate successful writes. Fixed with optional idempotency-key replay protection and a hosted smoke assertion.
6. Switching top-level Storyboard mode could leave the Assets rail selected. Fixed by syncing mode selection to its companion project rail.
7. Character transform inputs lacked explicit accessible names. Fixed with dynamic X/Y/rotation/opacity labels and a smoke check for unnamed numeric controls.
8. Asset briefs carried style intent only as prose. Fixed with structured role, treatment, silhouette, palette, and direction fields, plus human/agent parity.
9. Motion action buttons were visually mixed with pose presets. Fixed with explicit action durations, affected-character copy, and a Pose presets label.
10. Agent frame-rate-only render updates reset an existing 1080p choice. Fixed by preserving the current resolution when the preset is omitted, with local and hosted smoke coverage.
11. Preview still exposed global project-editing controls. Fixed by hiding Settings, Import, Export JSON, and the project rename affordance while keeping WebM and PNG review actions.
12. Scene titles competed with the ready badge and were visually shortened. Fixed with a two-line title clamp and a badge positioned outside the text flow; hosted smoke asserts two rendered title lines.
13. The brand lacked a document-level heading and the modal lacked an explicit modal landmark. Fixed with a descriptive `h1` and `aria-modal="true"`.
14. The existing smoke gate did not exercise the recovery, modal, or sequence transition paths. Added a real Help open/close assertion, a post-mutation reload assertion, and a cross-scene Preview playback assertion to both local and hosted runs.
15. The Inspector was a long scroll dump. Converted the major editing groups to native collapsible sections and added a smoke assertion for collapse/reopen behavior.
16. Human timeline scrubbing could leave agent reads one event behind. Synchronized ephemeral view updates through the shared project reference and added a smoke assertion that `get_timeline` sees the scrubbed playhead immediately.
17. Basic speed-up/slow-down editing was missing. Added human 0.8× / 1.25× controls and the guarded `retime_scene` operation across all timed tracks, with local and hosted coverage.
18. The timeline exposed step-back only and keyboard stepping was unreliable after scrub focus. Added a symmetric step-forward control, a keyboard-focusable stage target, and hosted smoke coverage.
19. Asset treatment choices were structured but did not affect the render path, and asset cards did not make stage usage obvious. Added deterministic canvas/thumbnail/Preview/WebM treatment filters, palette chips, placement cues, and manifest parity with hosted smoke coverage.
20. The canonical demo was only five seconds with three beats, too thin for a complete animation pass. Expanded it to a 15-second six-beat arc with additional poses, captions, camera beats, and reaction cues, then updated local and hosted timing assertions.
21. Removing the final asset, storyboard beat, or audio cue could repopulate starter defaults on reload. Preserved intentionally empty collections during hydration and added local/hosted recovery assertions.
22. Newly added/imported assets lacked style metadata until reload, which could make a fresh project fail readiness validation. Seeded `defaultAssetStyle` in both human and agent creation paths and added local/hosted validation coverage.
23. Human audio rows exposed levels but not timing, creating a parity gap with the agent cue editor. Added compact Start/End editors with bounded updates and hosted smoke coverage.

## Limits and warnings

- Direct CUA inspection was unavailable because the Mac was locked; Playwright was used for hosted interaction and screenshots.
- The smoke harness proves injected `modelContext` registration and tool execution, not live production ChatGPT WebMCP discovery.
- Generated PNG fixtures are intentionally tiny test assets; production art quality is not evaluated by this gate.
- TTS and lip-sync remain out of scope.
