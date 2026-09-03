import { chromium } from 'playwright';

const baseUrl = process.env.STAGEHAND_URL ?? 'http://localhost:3000';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  acceptDownloads: true,
  viewport: { width: 1440, height: 960 },
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

await page.addInitScript(() => {
  window.__stagehandTools = new Map();
  document.modelContext = {
    registerTool(tool) {
      window.__stagehandTools.set(tool.name, tool);
    },
  };
});

await page.goto(`${baseUrl}?qa=repo-smoke`, {
  waitUntil: 'domcontentloaded',
  timeout: 15000,
});
await page.waitForTimeout(700);
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(700);
await page.waitForFunction(() => window.__stagehandTools?.size === 51);
const sceneTitleLines = await page
  .locator('.scene-meta strong')
  .first()
  .evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    return range.getClientRects().length;
  });
if (sceneTitleLines < 2) {
  throw new Error(
    `scene title should remain readable across two lines: ${sceneTitleLines}`,
  );
}

const marks = page.locator('button[aria-label^="Alice keyframe"]');
const beforeDrag = await marks.nth(1).getAttribute('aria-label');
const keyframeBox = await marks.nth(1).boundingBox();
const trackBox = await page.locator('.track-area').boundingBox();
if (!keyframeBox || !trackBox) throw new Error('Timeline geometry unavailable');
await page.mouse.move(
  keyframeBox.x + keyframeBox.width / 2,
  keyframeBox.y + keyframeBox.height / 2,
);
await page.mouse.down();
await page.mouse.move(
  trackBox.x + trackBox.width * 0.44,
  keyframeBox.y + keyframeBox.height / 2,
  { steps: 8 },
);
await page.mouse.up();
await page.waitForTimeout(100);
const afterDrag = await marks.nth(1).getAttribute('aria-label');

await page.getByRole('tab', { name: 'Assets' }).click();
await page.getByRole('button', { name: 'Import prop' }).click();
await page.locator('input[aria-label="Import image asset"]').setInputFiles({
  name: 'smoke-prop.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  ),
});
await page.getByText('smoke-prop', { exact: true }).waitFor({ timeout: 5000 });
await page.waitForTimeout(250);
const humanPropXInput = page.locator('input[aria-label="X for smoke-prop"]');
await humanPropXInput.fill('63');
await page.waitForTimeout(100);
const humanPropX = await humanPropXInput.inputValue();
await page.getByRole('button', { name: 'Edit style for smoke-prop' }).click();
await page
  .locator('select[aria-label="Role for smoke-prop"]')
  .selectOption('accent');
await page.waitForTimeout(80);
const unnamedNumberInputs = await page
  .locator('input[type="number"]')
  .evaluateAll((inputs) =>
    inputs
      .filter((input) => !input.getAttribute('aria-label'))
      .map((input) => input.outerHTML),
  );
if (unnamedNumberInputs.length > 0) {
  throw new Error(
    `numeric controls must have accessible names: ${unnamedNumberInputs.join(', ')}`,
  );
}

const bridge = await page.evaluate(async () => {
  const tools = window.__stagehandTools;
  const call = (name, input = {}) => tools.get(name).execute(input);
  const unguardedMutations = [...tools.values()]
    .filter((tool) => !tool.annotations?.readOnlyHint)
    .filter((tool) => !tool.inputSchema?.properties?.expectedRevision)
    .map((tool) => tool.name);
  if (unguardedMutations.length > 0) {
    throw new Error(
      `mutating tools must expose expectedRevision: ${unguardedMutations.join(', ')}`,
    );
  }
  const initial = await call('get_project_summary');
  const stale = await call('set_pose', {
    characterId: 'alice',
    pose: 'wave',
    expectedRevision: initial.revision - 1,
  });
  if (stale.ok !== false || stale.code !== 'REVISION_CONFLICT') {
    throw new Error(
      `expected stale revision conflict, got ${JSON.stringify(stale)}`,
    );
  }
  const renamed = await call('set_project_name', {
    name: 'Smoke Project',
    expectedRevision: initial.revision,
    idempotencyKey: 'smoke-rename-1',
  });
  const renamedReplay = await call('set_project_name', {
    name: 'Smoke Project',
    expectedRevision: initial.revision,
    idempotencyKey: 'smoke-rename-1',
  });
  if (
    !renamed.ok ||
    !renamedReplay.ok ||
    !renamedReplay.idempotentReplay ||
    renamedReplay.revision !== renamed.revision
  ) {
    throw new Error(
      `expected idempotent replay, got ${JSON.stringify({ renamed, renamedReplay })}`,
    );
  }
  const posed = await call('set_pose', {
    characterId: 'alice',
    pose: 'point',
  });
  const inspected = await call('inspect_frame', { timeMs: 125 });
  if (
    !inspected.ok ||
    inspected.timeMs !== 125 ||
    inspected.renderSize?.width !== 720 ||
    inspected.renderSize?.height !== 405
  ) {
    throw new Error(`frame inspection mismatch: ${JSON.stringify(inspected)}`);
  }
  const render1080 = await call('set_render_settings', {
    preset: '1080p',
    fps: 24,
  });
  const renderFpsOnly = await call('set_render_settings', { fps: 12 });
  if (
    !render1080.ok ||
    render1080.width !== 1920 ||
    !renderFpsOnly.ok ||
    renderFpsOnly.width !== 1920 ||
    renderFpsOnly.height !== 1080
  ) {
    throw new Error(
      `partial render settings update lost resolution: ${JSON.stringify({ render1080, renderFpsOnly })}`,
    );
  }
  const render720 = await call('set_render_settings', {
    preset: '720p',
    fps: 12,
  });
  const audio = await call('update_audio_cue', {
    cueId: 'music-low',
    volume: 0.03,
  });
  const manifest = await call('get_asset_manifest');
  const prop = manifest.assets.find(
    (asset) => asset.kind === 'prop' && asset.source === 'imported',
  );
  if (!prop) throw new Error('Imported smoke prop unavailable');
  const styled = await call('set_asset_style', {
    assetId: prop.id,
    role: 'accent',
    treatment: 'inked',
    silhouette: 'clear',
    palette: ['amber', 'coral'],
    notes: 'One readable silhouette for the beat.',
  });
  if (!styled.ok || styled.style?.treatment !== 'inked') {
    throw new Error(
      `expected asset style update, got ${JSON.stringify(styled)}`,
    );
  }
  const propReadBefore = await call('get_prop_keyframes', {
    assetId: prop.id,
  });
  const propKeyframe = await call('set_prop_keyframe', {
    assetId: prop.id,
    timeMs: 0,
    x: 64,
    y: 58,
    scale: 1.1,
    rotation: -3,
  });
  const propPreset = await call('apply_prop_preset', {
    assetId: prop.id,
    preset: 'pop-in',
  });
  const propReadAfter = await call('get_prop_keyframes', {
    assetId: prop.id,
  });
  const undone = await call('undo_command');
  const redone = await call('redo_command');
  const duration = await call('set_scene_duration', { durationMs: 500 });
  const secondScene = await call('add_scene', { title: 'Smoke Outro' });
  return {
    toolCount: tools.size,
    guardedMutations:
      tools.size -
      [...tools.values()].filter((tool) => tool.annotations?.readOnlyHint)
        .length,
    initial: { revision: initial.revision, canUndo: initial.canUndo },
    revisionConflict: {
      ok: stale.ok,
      code: stale.code,
      actualRevision: stale.actualRevision,
    },
    renamed: { ok: renamed.ok, revision: renamed.revision },
    idempotency: {
      ok: renamedReplay.ok,
      replay: renamedReplay.idempotentReplay,
      revision: renamedReplay.revision,
    },
    posed: { ok: posed.ok, revision: posed.revision },
    inspected: {
      ok: inspected.ok,
      timeMs: inspected.timeMs,
      width: inspected.renderSize?.width,
      height: inspected.renderSize?.height,
    },
    renderSettings: {
      preserved1080:
        renderFpsOnly.width === 1920 && renderFpsOnly.height === 1080,
      reset720:
        render720.ok && render720.width === 720 && render720.height === 405,
    },
    audio: { ok: audio.ok, volume: audio.cue?.volume },
    prop: {
      id: prop.id,
      before: propReadBefore.propKeyframes.length,
      keyframe: { ok: propKeyframe.ok, x: propKeyframe.keyframe?.x },
      preset: { ok: propPreset.ok, count: propPreset.keyframes?.length },
      after: propReadAfter.propKeyframes.length,
    },
    assetStyle: {
      ok: styled.ok,
      treatment: styled.style?.treatment,
      palette: styled.style?.palette,
    },
    undone: { ok: undone.ok, revision: undone.revision },
    redone: { ok: redone.ok, revision: redone.revision },
    duration: { ok: duration.ok, durationMs: duration.durationMs },
    secondScene: {
      ok: secondScene.ok,
      sceneCount: secondScene.scene ? 2 : 0,
    },
  };
});

const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
const rendered = await page.evaluate(() =>
  window.__stagehandTools.get('render_webm').execute({}),
);
const download = await downloadPromise;
const downloadPath = await download.path();
const downloadBytes = downloadPath
  ? (await import('node:fs/promises'))
      .stat(downloadPath)
      .then((file) => file.size)
  : 0;
const frameDownloadPromise = page.waitForEvent('download', { timeout: 15000 });
const frameExported = await page.evaluate(() =>
  window.__stagehandTools.get('export_frame').execute({}),
);
const frameDownload = await frameDownloadPromise;
const frameDownloadPath = await frameDownload.path();
const frameDownloadedBytes = frameDownloadPath
  ? (await import('node:fs/promises'))
      .stat(frameDownloadPath)
      .then((file) => file.size)
  : 0;
const volume = page.locator('.audio-volume-control input').first();
await volume.fill('0.02');
await page.waitForTimeout(80);
await page.getByRole('tab', { name: 'Storyboard' }).click();
await page.waitForTimeout(100);
const storyboardCards = await page.locator('.storyboard-beat').count();
const storyboardRail = await page
  .getByRole('tab', { name: 'Board', exact: true })
  .getAttribute('aria-selected');
if (storyboardRail !== 'true') {
  throw new Error(
    `storyboard mode did not select Board rail: ${storyboardRail}`,
  );
}
await page.getByRole('tab', { name: 'Preview' }).click();
await page.waitForTimeout(120);
const preview = {
  banner: await page.locator('.preview-banner').count(),
  canvas: await page.locator('.stage-canvas').count(),
  inspector: await page.locator('.preview-workspace .inspector').isVisible(),
  exit: await page.getByRole('button', { name: 'Exit preview' }).count(),
  settings: await page
    .getByRole('button', { name: 'Settings', exact: true })
    .count(),
  import: await page
    .getByRole('button', { name: 'Import', exact: true })
    .count(),
  export: await page
    .getByRole('button', { name: 'Export', exact: true })
    .count(),
  renameProject: await page
    .getByRole('button', { name: /Rename project/ })
    .count(),
  boardTab: await page.getByRole('tab', { name: 'Board', exact: true }).count(),
  assetsTab: await page
    .getByRole('tab', { name: 'Assets', exact: true })
    .count(),
  addScene: await page.getByRole('button', { name: /Add scene/ }).count(),
  resetStarter: await page
    .getByRole('button', { name: /Reset to starter/ })
    .count(),
};
const summary = await page.evaluate(() =>
  window.__stagehandTools.get('get_project_summary').execute({}),
);

const result = {
  url: baseUrl,
  toolCount: bridge.toolCount,
  timelineDrag: {
    moved: beforeDrag !== afterDrag,
    before: beforeDrag,
    after: afterDrag,
  },
  sceneTitleLines,
  bridge,
  render: {
    ok: rendered.ok,
    fileName: rendered.fileName,
    sceneCount: rendered.sceneCount,
    durationMs: rendered.durationMs,
    bytes: rendered.bytes,
    downloadedBytes: await downloadBytes,
    suggestedFilename: download.suggestedFilename(),
  },
  frameExport: {
    ok: frameExported.ok,
    width: frameExported.width,
    height: frameExported.height,
    downloadedBytes: await frameDownloadedBytes,
    suggestedFilename: frameDownload.suggestedFilename(),
  },
  humanAudioVolume: await volume.inputValue(),
  humanPropX,
  storyboardCards,
  preview,
  summary: {
    name: summary.name,
    durationMs: summary.durationMs,
    canUndo: summary.canUndo,
    canRedo: summary.canRedo,
  },
  pageErrors: errors,
};

if (
  result.toolCount !== 51 ||
  !result.timelineDrag.moved ||
  result.sceneTitleLines < 2 ||
  !bridge.audio.ok ||
  bridge.audio.volume !== 0.03 ||
  !bridge.inspected.ok ||
  bridge.inspected.timeMs !== 125 ||
  bridge.inspected.width !== 720 ||
  bridge.inspected.height !== 405 ||
  !bridge.renderSettings.preserved1080 ||
  !bridge.renderSettings.reset720 ||
  bridge.prop.before !== 1 ||
  !bridge.prop.keyframe.ok ||
  bridge.prop.keyframe.x !== 64 ||
  !bridge.prop.preset.ok ||
  bridge.prop.preset.count !== 2 ||
  bridge.prop.after < 2 ||
  !bridge.assetStyle.ok ||
  bridge.assetStyle.treatment !== 'inked' ||
  bridge.assetStyle.palette?.join(',') !== 'amber,coral' ||
  result.humanPropX !== '63.0' ||
  !bridge.undone.ok ||
  !bridge.redone.ok ||
  !rendered.ok ||
  rendered.sceneCount !== 2 ||
  rendered.durationMs < 1000 ||
  !bridge.secondScene.ok ||
  rendered.bytes <= 0 ||
  !frameExported.ok ||
  frameExported.width !== 720 ||
  frameExported.height !== 405 ||
  frameDownloadedBytes <= 0 ||
  !frameDownload.suggestedFilename().endsWith('.png') ||
  result.humanAudioVolume !== '0.02' ||
  storyboardCards !== 3 ||
  preview.banner !== 1 ||
  preview.canvas !== 1 ||
  preview.inspector ||
  preview.exit !== 1 ||
  preview.settings !== 0 ||
  preview.import !== 0 ||
  preview.export !== 0 ||
  preview.renameProject !== 0 ||
  preview.boardTab !== 0 ||
  preview.assetsTab !== 0 ||
  preview.addScene !== 0 ||
  preview.resetStarter !== 0 ||
  errors.length > 0
)
  throw new Error(`Smoke test failed: ${JSON.stringify(result)}`);

console.log(JSON.stringify(result, null, 2));
await browser.close();
