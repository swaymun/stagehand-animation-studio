import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const PUBLIC_TOOL_NAMES = [
  'inspect_project',
  'create_project',
  'load_demo',
  'edit_storyboard',
  'set_current_scene',
  'get_timeline',
  'set_playhead',
  'get_animation_frames',
  'edit_animation_frame',
  'get_lip_sync',
  'generate_lip_sync',
  'probe_local_voice',
  'generate_voice',
  'edit_audio',
  'generate_sfx',
  'list_assets',
  'get_asset_generation_checklist',
  'create_asset_request',
  'attach_generated_asset',
  'inspect_asset_candidate',
  'approve_asset',
  'validate_project',
  'inspect_frame',
  'export_frame',
  'render_webm',
  'undo',
  'redo',
];

const baseUrl = process.env.STAGEHAND_URL ?? 'http://localhost:3000';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 960 },
  acceptDownloads: true,
});
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
await page.addInitScript(() => {
  window.__stagehandTools = new Map();
  document.modelContext = {
    registerTool(tool) {
      window.__stagehandTools.set(tool.name, tool);
    },
  };
});

await page.goto(`${baseUrl}?qa=frames`, {
  waitUntil: 'domcontentloaded',
  timeout: 20_000,
});
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'domcontentloaded', timeout: 20_000 });
await page.waitForFunction(() => window.__stagehandTools?.size === 27, null, {
  timeout: 12_000,
});
await page.waitForSelector('canvas[aria-label="Animation stage preview"]');

const contract = await page.evaluate(() => {
  const tools = [...window.__stagehandTools.values()];
  return {
    names: tools.map((tool) => tool.name),
    schemaIds: tools.map((tool) => tool.inputSchema?.$id),
    unguarded: tools
      .filter((tool) => !tool.annotations?.readOnlyHint)
      .filter(
        (tool) =>
          !tool.inputSchema?.properties?.expectedRevision ||
          !tool.inputSchema?.properties?.idempotencyKey,
      )
      .map((tool) => tool.name),
  };
});
assert.deepEqual(
  contract.names,
  PUBLIC_TOOL_NAMES,
  'public tool order should be intentional',
);
assert.equal(new Set(contract.names).size, 27, 'tool names should be unique');
assert.equal(
  new Set(contract.schemaIds).size,
  27,
  'tool schema IDs should be unique',
);
assert.deepEqual(
  contract.unguarded,
  [],
  'all project mutations need revision and retry guards',
);

const call = (name, input = {}) =>
  page.evaluate(
    async ({ name, input }) => window.__stagehandTools.get(name).execute(input),
    { name, input },
  );

const initial = await call('inspect_project');
assert.equal(initial.ok, true);
assert.equal(initial.name, 'One More Deploy');
assert.equal(initial.sceneCount, 5);
assert.ok(initial.assetCount >= 7);
assert.ok(initial.drawingCount >= 20);
assert.ok(initial.lipSyncCueCount > 20);
assert.equal(
  'skeletonCount' in initial,
  false,
  'rigging state should not leak into the frame model',
);

const validated = await call('validate_project');
assert.equal(validated.ok, true, JSON.stringify(validated.issues));
assert.deepEqual(
  validated.issues.filter((issue) => issue.severity === 'error'),
  [],
);

const firstTimeline = await call('get_timeline');
assert.equal(firstTimeline.ok, true);
assert.ok(firstTimeline.scene.tracks.length >= 3);
const characterTrack = firstTimeline.scene.tracks.find(
  (track) => track.kind === 'character',
);
assert.ok(characterTrack);

const moved = await call('set_playhead', {
  frame: 12,
  expectedRevision: initial.revision,
  idempotencyKey: 'move-frame-12',
});
assert.equal(moved.ok, true);
assert.equal(moved.frame, 12);
const replayed = await call('set_playhead', {
  frame: 12,
  expectedRevision: initial.revision,
  idempotencyKey: 'move-frame-12',
});
assert.deepEqual(
  replayed,
  moved,
  'idempotent retry should return the first result',
);
const afterMove = await call('inspect_project');
assert.equal(afterMove.revision, initial.revision + 1);

const stale = await call('set_playhead', {
  frame: 3,
  expectedRevision: initial.revision,
});
assert.equal(stale.code, 'REVISION_CONFLICT');
assert.equal((await call('inspect_project')).revision, afterMove.revision);

const duplicated = await call('edit_animation_frame', {
  action: 'duplicate',
  trackId: characterTrack.id,
  celId: characterTrack.cels[0].id,
  frame: 13,
  expectedRevision: afterMove.revision,
  idempotencyKey: 'duplicate-drawing-13',
});
assert.equal(duplicated.ok, true);
assert.ok(duplicated.cels.some((cel) => cel.frame === 13));
const duplicateScene = (await call('get_timeline')).scene;
const editedTrack = duplicateScene.tracks.find(
  (track) => track.id === characterTrack.id,
);
const heldBefore = editedTrack.cels.filter((cel) => cel.frame <= 12).at(-1);
const switchesAt = editedTrack.cels.find((cel) => cel.frame === 13);
assert.ok(
  heldBefore && switchesAt && heldBefore.id !== switchesAt.id,
  'held drawing should switch only on authored frame',
);

const sync = await call('generate_lip_sync', {
  allScenes: true,
  expectedRevision: duplicated.revision,
  idempotencyKey: 'sync-all-scenes',
});
assert.equal(sync.ok, true);
assert.ok(sync.cueCount > 20);
assert.equal(sync.timingQuality, 'estimated');

const sfx = await call('generate_sfx', {
  recipe: 'success',
  label: 'QA chime',
  startFrame: 14,
  durationFrames: 5,
  expectedRevision: sync.revision,
  idempotencyKey: 'qa-sfx',
});
assert.equal(sfx.ok, true);
assert.equal(sfx.cue.recipe, 'success');

const checklist = await call('get_asset_generation_checklist', {
  kind: 'character',
});
assert.equal(checklist.ok, true);
assert.ok(checklist.checklist.some((line) => line.includes('transparent')));
assert.deepEqual(checklist.workflow, [
  'create_asset_request',
  'attach_generated_asset',
  'inspect_asset_candidate',
  'approve_asset',
]);

const frameA = await call('inspect_frame', { frame: 12 });
const frameB = await call('inspect_frame', { frame: 13 });
assert.equal(frameA.interpolation, 'none');
assert.notDeepEqual(frameA.evaluated.characters, frameB.evaluated.characters);

const png = await call('export_frame', { frame: 13, download: false });
assert.equal(png.ok, true);
assert.ok(png.bytes > 1_000);
assert.equal(png.downloaded, false);
assert.equal(png.width, 1280);
assert.equal(png.height, 720);

const loaded = await call('load_demo', {
  demoId: 'no-clams-no-patty',
  expectedRevision: sfx.revision,
  idempotencyKey: 'load-land-money',
});
assert.equal(loaded.ok, true);
assert.equal(loaded.project.name, 'Land Money');
assert.equal(loaded.project.sceneCount, 5);

await page.getByRole('button', { name: /Agent Live/ }).click();
assert.equal(await page.locator('[data-tool-ui]').count(), 27);
await page.getByRole('button', { name: 'Close Agent Live' }).last().click();

const canvasPixels = await page.locator('canvas').evaluate((canvas) => {
  const context = canvas.getContext('2d');
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let nonTransparent = 0;
  for (let index = 3; index < pixels.length; index += 4 * 97)
    if (pixels[index] > 0) nonTransparent += 1;
  return { width: canvas.width, height: canvas.height, nonTransparent };
});
assert.deepEqual(
  { width: canvasPixels.width, height: canvasPixels.height },
  { width: 1280, height: 720 },
);
assert.ok(
  canvasPixels.nonTransparent > 1000,
  'stage should render visible pixels',
);

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(250);
assert.equal(
  await page.getByRole('button', { name: 'Inspect' }).isVisible(),
  true,
);
assert.equal(
  await page.getByRole('button', { name: /Render film/ }).isVisible(),
  true,
);

assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join('; ')}`);
console.log(
  JSON.stringify(
    {
      ok: true,
      url: baseUrl,
      toolCount: contract.names.length,
      scenes: loaded.project.sceneCount,
      assets: loaded.project.assetCount,
      lipSyncCues: sync.cueCount,
      canvas: canvasPixels,
      responsive: '390x844 pass',
    },
    null,
    2,
  ),
);
await browser.close();
