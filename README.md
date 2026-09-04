# Stagehand Animation Studio

Stagehand is a local-first, WebMCP-native 2D frame-by-frame animation studio. It combines scenes, storyboard editing, authored drawing exposures, captions, estimated lip-sync, local voice, procedural sound effects, and deterministic PNG/WebM export.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000. Editable project state is recovered from local browser storage.

## Current product

The shipped build has three multi-scene demos: **Ship the Brick**, **One More Deploy**, and **Land Money**. Discrete drawings are held on integer frames at 12 or 24 fps. The shared evaluator powers canvas, storyboard thumbnails, Preview, frame inspection, PNG export, and WebM export; it does not interpolate drawings.

- **Scenes / Storyboard**: create, rename, delete, reorder, and select scenes and beats.
- **Frames**: edit, duplicate, delete, and expose authored drawings on character, prop, camera, and overlay tracks.
- **Dialogue / lip-sync**: captions regenerate estimated X/A/B/C/D/E/F/G/H mouth cues. Optional private local voice uses `npm run voice:local`.
- **Sound**: bundled OmniVoice dialogue, local voice/music cue editing, and deterministic Web Audio SFX recipes.
- **Assets**: provenance-first requests, bounded image attachment, inspection, approval, and frame/mouth-pack assets.
- **Proof / export**: validation, exact-frame inspection, PNG export, and sequence WebM rendering.

## WebMCP contract

Exactly 27 public tools are registered. Reads are marked `readOnlyHint`; mutations accept optional `expectedRevision` and `idempotencyKey`.

```js
document.modelContext.registerTool(
  {
    name: 'set_playhead',
    title: 'Set playhead',
    description: 'Move to an exact integer frame in the active scene.',
    inputSchema: {
      type: 'object',
      required: ['frame'],
      properties: {
        frame: { type: 'integer', minimum: 0 },
        sceneId: { type: 'string' },
        expectedRevision: { type: 'integer', minimum: 1 },
        idempotencyKey: { type: 'string', minLength: 1, maxLength: 120 },
      },
    },
    annotations: { readOnlyHint: false },
    execute: async ({ frame, sceneId }) => ({
      ok: true,
      revision: 3,
      sceneId,
      frame,
    }),
  },
  { signal },
);
```

Names, order, and unique schema IDs are asserted by `scripts/smoke.mjs` and `scripts/native-webmcp-smoke.mjs`. The public surface has no skeleton, bone, mesh, or rigging tools.

## Verification

```bash
npm run format && npm run lint && npm run typecheck && npm run build
npm run test:frames && npm run test:tool-ui && npm run smoke && npm run smoke:native
```

For hosted verification, set `STAGEHAND_URL` to the deployed URL. Current reference: https://stagehand-animation-studio.saimun-h-shahee.chatgpt.site

`app/stagehand-model.ts` defines the version-2 schema; `app/stagehand-renderer.ts` draws evaluated frames and mixes generated dialogue, optional music, and procedural SFX. Automatic rigging, skeletal deformation, mesh skinning, IK, phoneme extraction, and MP4/GIF export are out of scope.

Released under the MIT License; see [LICENSE](LICENSE).

## Submission demo

Watch the 2:48 Stagehand demo: https://www.youtube.com/watch?v=bOg6uA2fGfY

Submitted to the WebMCP Challenge: https://devpost.com/software/stagehand-i5xuht
