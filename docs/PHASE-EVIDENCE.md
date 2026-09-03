# Stagehand Phase Evidence

This record follows the project contract in [`SPEC.md`](../SPEC.md): Implement → local tests → Sites deployment → hosted test → UI roast → fixes → second review.

## Current checkpoint

- Date: 2026-09-03
- Private source: [github.com/swaymun/stagehand-animation-studio](https://github.com/swaymun/stagehand-animation-studio)
- Verified source commit: `216672e1b4dfd715bbed2991815f4f84860148ba`
- Deployed runtime commit: `216672e1b4dfd715bbed2991815f4f84860148ba`
- Public Site: [stagehand-animation-studio.saimun-h-shahee.chatgpt.site](https://stagehand-animation-studio.saimun-h-shahee.chatgpt.site)
- Sites version: `99`
- Scope at this checkpoint: a 15-second six-beat canonical starter arc with expanded captions, poses, camera beats, and non-voice cues, plus renderer-applied per-asset visual treatments, palette chips and stage/library placement, manifest-derived asset usage state, immediate style defaults for new/imported assets, human audio cue timing controls, clarified motion actions, revision-safe and idempotent WebMCP mutations, partial render-settings preservation, synchronized human/agent playhead reads, semantic scene speed retiming across timed tracks, synchronized Storyboard/Board navigation, review-first Preview with editing controls removed, readable two-line scene labels, semantic heading/dialog landmarks, accessible transform controls, wide four-column pose-sheet detection, imported-prop/sequence coverage, a calmer Animate/Storyboard editor shell, semantic timeline event bands with optional raw-keyframe details, compact header overflow actions, on-demand validation, and mobile project/Inspector drawers.

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
- WebMCP registration now supports both `document.modelContext` and the current experimental Chromium `navigator.modelContext` location.
- The Assets view now has an asset-specific Inspector that identifies the selected asset, placement, style, palette, and edit handoff; character transform and motion controls are hidden until Scenes is active.
- The editor chrome now keeps Animate and Storyboard as the only top-level modes; Preview is a primary review action, Render is the primary export action, and PNG/import/export/settings/templates/help/guides live under More actions.
- The timeline now presents camera, pose, prop, dialogue, music, and SFX events as semantic bands by default; raw keyframe diamonds remain available through Show details so precise editing is preserved without making implementation noise the first read.
- Validation, WebMCP tool counts, starter-kit copy, revision numbers, and explanatory status cards are no longer permanent workspace chrome; validation remains available to the command path and export blocks on error-level issues.
- On small screens the project rail and Inspector are drawer surfaces opened from More actions; the timeline retains a minimum readable editing width without forcing the whole document to overflow.
- At split-browser widths up to 1200px, the Inspector is closed by default and opens as an overlay drawer from a visible mode-bar action or More actions, while the scene rail and stage keep the available width focused on editing.
- The stage now preserves the 16:9 export frame at every editor width, removes permanent canvas debug labels, and pillarboxes the artwork when the split pane is wider than the composition.
- Compact timeline controls wrap into a second row below 900px, while scene kebab actions overlay the card so two-line scene titles remain readable.

## Local verification

Commands run from the repository:

```text
npm run format       PASS
npm run lint         PASS
npm run build        PASS
git diff --check     PASS
npm run smoke        PASS
npm run smoke:native PASS
```

The local smoke result verified:

- 52 registered tools and no page errors.
- 39 mutating tools expose the concurrency/retry contract; a stale pose command returns `REVISION_CONFLICT`, and a repeated rename replays at the same revision.
- Human asset-style editor and agent `set_asset_style` update: PASS.
- Agent partial render-settings update preserves 1080p before an explicit reset to 720p: PASS.
- Agent `inspect_frame` at 125 ms returns deterministic scene state and 720×405 render metadata: PASS.
- Agent `export_frame` produced a 720×405 PNG download (`29,587` bytes) with the PNG signature `89504e47`: PASS.
- Human prop X edit: `63.0`.
- Agent prop keyframe at explicit time and Pop in preset: PASS.
- Undo/redo revisions: PASS.
- Second scene: PASS.
- Agent-triggered WebM: `sceneCount: 2`, `durationMs: 1000`, downloaded bytes > 0, and the EBML/WebM signature `1a45dfa3`: PASS.
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
- Native WebMCP registration: Chromium experimental WebMCP context captured all 52 unique tools with zero registration errors; valid `set_playhead` moved to 250 ms, invalid input returned `INVALID_INPUT`, and the read-back revision advanced by one: PASS.
- Semantic timeline presentation: the local and hosted shells render named Camera/Pose/Dialogue/Music/SFX event bands by default, and the Show details disclosure restores draggable raw keyframe controls: PASS.
- Responsive shell: 390px Playwright inspection reports equal body/document widths and the More actions menu can open the Inspector drawer without page overflow: PASS.
- Split-pane shell: 960px Playwright inspection reports equal body/document widths, a closed-by-default Inspector, a visible Open Inspector action, no redundant project-drawer action, a working Inspector drawer, and a 770px stage: PASS.
- Compact geometry: 960px Playwright inspection reports a 1.77775 canvas ratio, a 900px internal timeline surface, and no document overflow; the narrower 799px layout wraps timeline actions without truncation: PASS.
- Inspector drawer lifecycle: 960px Playwright inspection opens the Inspector from the compact mode bar and closes it from the drawer's own close control: PASS.

## Hosted verification

```text
STAGEHAND_URL=https://stagehand-animation-studio.saimun-h-shahee.chatgpt.site npm run smoke
STAGEHAND_URL=https://stagehand-animation-studio.saimun-h-shahee.chatgpt.site npm run smoke:native
```

Result: PASS. The hosted run verified the same 52-tool injected bridge, 39 guarded mutations, the 15-second six-beat starter, stale-write conflict, idempotent replay, human and agent scene retiming, focused-stage keyboard stepping, frame inspection, PNG frame download with a valid `89504e47` signature, wide pose-sheet auto-detection, manifest stage placement, renderer-applied `inked` treatment, asset-style update, immediate fresh-asset readiness, human audio cue timing, partial render-settings preservation, prop workflow, two-scene WebM download with a valid `1a45dfa3` EBML/WebM signature, sequence Preview scene transition, synchronized Storyboard/Board context, synchronized Assets asset-specific Inspector context, human-scrubbed playhead visibility through `get_timeline`, clarified motion copy, collapsible Inspector groups, clean Preview state with global editing controls removed, readable scene-label layout, semantic `h1`, labelled Help modal, reload recovery including intentionally empty asset/beat/cue collections, split-pane behavior at 960px, and zero page errors. This remains labeled a Playwright fallback for the full interaction suite. A separate hosted native Chromium run registered all 52 unique tools with zero registration errors and passed valid/invalid callback checks. A Sol-powered Codex sub-agent then used the public site's live WebMCP path in the in-app browser: it read project state, applied the Alice/Bob coupon gag, and verified `validate_project` with zero issues plus `inspect_frame` at 3300 ms. No Codex TOML entry or restart was needed.

## UI roast and fixes

Evidence screenshots are captured from hosted builds at 1440×960 unless noted:

- [`v93-animate.png`](evidence/v93-animate.png): focused Animate workspace with semantic timeline event bands and the reduced header/rail chrome.
- [`v93-assets.png`](evidence/v93-assets.png): Assets workflow with scannable asset rows and the asset-specific Inspector.
- [`v93-storyboard.png`](evidence/v93-storyboard.png): six-card Storyboard mode with the Board rail selected and the same semantic timeline below.
- [`v93-preview.png`](evidence/v93-preview.png): compact review player with a scene strip and scrubber, no editor timeline grid, and no Inspector.
- [`v94-split-pane.png`](evidence/v94-split-pane.png): hosted 960px split-pane capture with the Inspector closed by default, a wide stage, and the scene rail retained.
- [`v98-split-pane.png`](evidence/v98-split-pane.png): hosted 960px split-pane capture with the corrected 16:9 stage, readable two-line scene title, visible Inspector action, and compact two-row timeline controls.

- [`v90-animate.png`](evidence/v90-animate.png): current editing workspace with the expanded timeline and semantic scene speed controls.
- [`v90-assets.png`](evidence/v90-assets.png): Assets workflow with the selected Alice style editor and matching asset-specific Inspector context.
- [`v90-storyboard.png`](evidence/v90-storyboard.png): six-card Storyboard mode with the Board rail selected.
- [`v90-preview.png`](evidence/v90-preview.png): review-first Preview player with editing controls hidden.

Earlier v88 screenshots remain useful for the prior compatibility checkpoint:

- [`v88-animate.png`](evidence/v88-animate.png): 15-second editing workspace with the expanded timeline and semantic scene speed controls.
- [`v88-assets-style.png`](evidence/v88-assets-style.png): expandable per-asset style editor with palette chips and stage/library placement cues.
- [`v88-storyboard.png`](evidence/v88-storyboard.png): six-card Storyboard mode with the Board rail selected.
- [`v88-preview.png`](evidence/v88-preview.png): clean review-first Preview player with only review outputs in the header.

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
24. Export checks only proved that downloads were non-empty. Added binary signature assertions for WebM/EBML and PNG outputs in local and hosted smoke runs.
25. Experimental Chromium exposed `navigator.modelContext` while the app only checked `document.modelContext`. Added a compatibility fallback and a native registration smoke gate covering all 52 tools plus valid/invalid calls.
26. The Assets rail could edit a selected asset while the right Inspector still showed character controls. Fixed by adding an asset-specific Inspector context and a smoke assertion that character transforms are not visible while Assets is active.
27. The Preview screenshot still read like the editor because the raw timeline grid, editing guides, and status toast survived into review. Fixed with a compact scene/timing scrubber and by hiding the editable grid, guides, and editor toast in Preview.
28. The asset rail still carried too much editing UI in a narrow column. Fixed by keeping asset rows scannable and moving the full style and brief editor into the wider asset Inspector.
29. Header and sidebar implementation details competed with the artwork: Preview was an equal mode, Render said “Render WebM,” and validation/tool-count/starter cards were always present. Fixed with two top-level editor modes, primary Preview/Render actions, a More actions overflow, and on-demand infrastructure UI.
30. The timeline’s first read was a field of keyframe diamonds rather than animation intent. Fixed with semantic event bands for camera, poses, props, dialogue, music, and SFX, with raw diamonds behind an explicit Show details control.
31. The desktop shell could force horizontal overflow at phone widths. Fixed by removing the global minimum width and adding responsive project/Inspector drawers plus a scrollable readable-width timeline.
32. In a split ChatGPT/Codex browser pane, the permanent Inspector consumed the stage's working width even when no property edit was active. Fixed by moving the Inspector to a closed-by-default overlay drawer at ≤1200px, hiding the redundant project-drawer action while the rail remains visible, and adding a checked-in 960px regression gate.
33. The split-pane stage could stretch toward 2:1 and disagree with the 16:9 export frame. Fixed with a responsive 16:9 canvas frame that centers inside the available stage area, removes permanent debug metadata, and is covered by a ratio assertion.
34. At narrower in-app widths, timeline actions and scene titles competed for the same compact row. Fixed by wrapping actions below 900px, containing toolbar overflow, widening the internal timeline surface, and overlaying the scene kebab action so titles can occupy two lines.
35. The compact Inspector's open trigger sits behind the drawer after opening. Added a visible close button inside both Inspector header variants and a hosted open/close lifecycle assertion.

## Limits and warnings

- The regular hosted interaction suite remains a Playwright fallback, while the separate Sol-powered Codex run is the direct live WebMCP evidence for the public Site.
- The main Luna-bound task cannot call the browser WebMCP capability; supported Sol/Terra tasks can. The page itself has no separate MCP server connection, so no Codex TOML entry or restart was required for the successful live run.
- Native Chromium smoke requires the experimental WebMCP flag and validates registration/callback behavior; it complements, rather than replaces, the live in-app browser path.
- Generated PNG fixtures are intentionally tiny test assets; production art quality is not evaluated by this gate.
- TTS and lip-sync remain out of scope.
