# Stagehand Phase Evidence

This record follows the project contract in [`SPEC.md`](../SPEC.md): Implement → local tests → Sites deployment → hosted test → UI roast → fixes → second review.

## Current checkpoint

- Date: 2026-09-03
- Private source: [github.com/swaymun/stagehand-animation-studio](https://github.com/swaymun/stagehand-animation-studio)
- Verified source commit: `73432fa4360fed9dc406c7579f395954edf1391f`
- Public Site: [stagehand-animation-studio.saimun-h-shahee.chatgpt.site](https://stagehand-animation-studio.saimun-h-shahee.chatgpt.site)
- Sites version: `63`
- Scope at this checkpoint: imported-prop human/agent animation parity, review-first Preview, sequence smoke coverage, and larger timeline hit targets.

## Implement

- Imported props now have structured `PropKeyframe` data with interpolated X/Y/scale/rotation.
- WebMCP exposes `get_prop_keyframes`, `set_prop_keyframe`, and `apply_prop_preset`.
- Mutating WebMCP tools now expose an optional `expectedRevision` optimistic-concurrency guard; stale commands return `REVISION_CONFLICT` with the current revision and a reread hint.
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

- 50 registered tools and no page errors.
- Human prop X edit: `63.0`.
- Agent prop keyframe at explicit time and Pop in preset: PASS.
- Undo/redo revisions: PASS.
- Second scene: PASS.
- Agent-triggered WebM: `sceneCount: 2`, `durationMs: 1000`, downloaded bytes > 0.
- Storyboard cards: `3`.
- Preview banner and canvas: present; inspector hidden; Exit preview present.

## Hosted verification

```text
STAGEHAND_URL=https://stagehand-animation-studio.saimun-h-shahee.chatgpt.site npm run smoke
```

Result: PASS. The hosted run verified the same 50-tool injected bridge, prop workflow, two-scene WebM download, Preview state, and zero page errors. This is labeled a Playwright fallback: the public Site did not expose live WebMCP enumeration to the available runner, so it does not prove that ChatGPT’s production host enumerates the tools.

## UI roast and fixes

Evidence screenshots are captured from the hosted v63 build at 1440×960:

- [`v63-animate.png`](evidence/v63-animate.png): baseline editing workspace.
- [`v63-assets-prop.png`](evidence/v63-assets-prop.png): imported prop with motion controls and timeline row.
- [`v63-preview.png`](evidence/v63-preview.png): review-first Preview player.

Findings from the current screenshot review:

1. Imported props lacked direct human transform editing. Fixed with X/Y/Scale/Rot controls sharing the keyframe command path.
2. Four prop transform fields initially collided with the asset-list flex rule and truncated. Fixed with an explicit two-column grid; computed field boxes are 57 px wide in two rows.
3. Preview carried too much editing chrome. Fixed by hiding the inspector, scene tools, duration input, timeline mutation actions, and adding Exit preview.
4. Timeline diamonds had 7×7 px hit targets. Fixed with 22×22 px buttons while preserving the 7 px visual diamond.

## Limits and warnings

- Direct CUA inspection was unavailable because the Mac was locked; Playwright was used for hosted interaction and screenshots.
- The smoke harness proves injected `modelContext` registration and tool execution, not live production ChatGPT WebMCP discovery.
- Generated PNG fixtures are intentionally tiny test assets; production art quality is not evaluated by this gate.
- TTS and lip-sync remain out of scope.
