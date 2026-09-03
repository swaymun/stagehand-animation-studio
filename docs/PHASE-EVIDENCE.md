# Stagehand Phase Evidence

This record follows the project contract in [`SPEC.md`](../SPEC.md): Implement → local tests → Sites deployment → hosted test → UI roast → fixes → second review.

## Current checkpoint

- Date: 2026-09-03
- Private source: [github.com/swaymun/stagehand-animation-studio](https://github.com/swaymun/stagehand-animation-studio)
- Verified source commit: `3720e51d540d7f13ccd85303dc2c6d77963ae723`
- Public Site: [stagehand-animation-studio.saimun-h-shahee.chatgpt.site](https://stagehand-animation-studio.saimun-h-shahee.chatgpt.site)
- Sites version: `72`
- Scope at this checkpoint: structured per-asset visual direction, clarified motion actions, revision-safe and idempotent WebMCP mutations, partial render-settings preservation, synchronized Storyboard/Board navigation, review-first Preview, accessible transform controls, and the existing imported-prop/sequence coverage.

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
- Timeline keyframe buttons retain small diamonds but use 22×22 px hit targets.

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

- 51 registered tools and no page errors.
- 38 mutating tools expose the concurrency/retry contract; a stale pose command returns `REVISION_CONFLICT`, and a repeated rename replays at the same revision.
- Human asset-style editor and agent `set_asset_style` update: PASS.
- Agent partial render-settings update preserves 1080p before an explicit reset to 720p: PASS.
- Human prop X edit: `63.0`.
- Agent prop keyframe at explicit time and Pop in preset: PASS.
- Undo/redo revisions: PASS.
- Second scene: PASS.
- Agent-triggered WebM: `sceneCount: 2`, `durationMs: 1000`, downloaded bytes > 0.
- Storyboard cards: `3`.
- Preview banner and canvas: present; inspector hidden; Board/Assets tabs and scene mutation actions hidden; Exit preview present.

## Hosted verification

```text
STAGEHAND_URL=https://stagehand-animation-studio.saimun-h-shahee.chatgpt.site npm run smoke
```

Result: PASS. The hosted run verified the same 51-tool injected bridge, stale-write conflict, idempotent replay, asset-style update, partial render-settings preservation, prop workflow, two-scene WebM download, synchronized Storyboard/Board context, clarified motion copy, clean Preview state, and zero page errors. This is labeled a Playwright fallback: the public Site did not expose live WebMCP enumeration to the available runner, so it does not prove that ChatGPT’s production host enumerates the tools.

## UI roast and fixes

Evidence screenshots are captured from the hosted v72 build at 1440×960:

- [`v72-animate.png`](evidence/v72-animate.png): editing workspace with clarified motion actions.
- [`v72-assets-style.png`](evidence/v72-assets-style.png): expandable per-asset style editor.
- [`v72-storyboard.png`](evidence/v72-storyboard.png): Storyboard mode with the Board rail selected.
- [`v72-preview.png`](evidence/v72-preview.png): clean review-first Preview player with scene-only context.

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

## Limits and warnings

- Direct CUA inspection was unavailable because the Mac was locked; Playwright was used for hosted interaction and screenshots.
- The smoke harness proves injected `modelContext` registration and tool execution, not live production ChatGPT WebMCP discovery.
- Generated PNG fixtures are intentionally tiny test assets; production art quality is not evaluated by this gate.
- TTS and lip-sync remain out of scope.
