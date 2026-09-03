import { chromium } from 'playwright';
import { readFile, stat } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1)
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return Buffer.from([
    (crc ^ 0xffffffff) >>> 24,
    (crc ^ 0xffffffff) >>> 16,
    (crc ^ 0xffffffff) >>> 8,
    crc ^ 0xffffffff,
  ]);
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  return Buffer.concat([
    length,
    typeBuffer,
    data,
    crc32(Buffer.concat([typeBuffer, data])),
  ]);
}

function widePngFixture() {
  const width = 400;
  const height = 100;
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(height * stride);
  const colors = [
    [239, 107, 87, 255],
    [52, 118, 143, 255],
    [242, 184, 75, 255],
    [131, 82, 145, 255],
  ];
  for (let y = 0; y < height; y += 1) {
    const row = y * stride;
    for (let x = 0; x < width; x += 1) {
      const color = colors[Math.min(3, Math.floor(x / 100))];
      const pixel = row + 1 + x * 4;
      raw[pixel] = color[0];
      raw[pixel + 1] = color[1];
      raw[pixel + 2] = color[2];
      raw[pixel + 3] = color[3];
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

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
  window.__stagehandCanvasFilters = [];
  const originalDrawImage = Object.getOwnPropertyDescriptor(
    CanvasRenderingContext2D.prototype,
    'drawImage',
  )?.value;
  CanvasRenderingContext2D.prototype.drawImage = function (...args) {
    if (this.filter && this.filter !== 'none') {
      window.__stagehandCanvasFilters.push(this.filter);
    }
    return Reflect.apply(originalDrawImage, this, args);
  };
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
await page.waitForFunction(() => window.__stagehandTools?.size === 52);
const h1 = page.locator('h1');
if (
  (await h1.count()) !== 1 ||
  (await h1.textContent())?.trim() !== 'stagehand'
) {
  throw new Error('studio should expose one descriptive h1 brand heading');
}
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
await page.getByRole('button', { name: 'More actions', exact: true }).click();
await page.getByRole('menuitem', { name: 'Help & shortcuts', exact: true }).click();
const modal = page.locator('dialog[aria-modal="true"]');
await modal.waitFor({ state: 'visible', timeout: 5000 });
const modalHeading = (await modal.locator('h2').textContent())?.trim();
if (modalHeading !== 'Help & shortcuts') {
  throw new Error(`help dialog heading mismatch: ${modalHeading}`);
}
await modal.getByRole('button', { name: 'Close dialog' }).click();
await page.waitForTimeout(80);
const inspectorGroups = page.locator('details.inspector-section');
const inspectorGroupCount = await inspectorGroups.count();
const transformGroup = inspectorGroups.first();
await transformGroup.locator('summary').click();
const transformCollapsed = !(await page
  .getByLabel('Alice X position')
  .isVisible());
await transformGroup.locator('summary').click();
if (inspectorGroupCount !== 5 || !transformCollapsed) {
  throw new Error(
    `inspector sections should collapse independently: ${JSON.stringify({ inspectorGroupCount, transformCollapsed })}`,
  );
}

const marks = page.locator('button[aria-label^="Alice keyframe"]');
const semanticEvents = page.locator('.timeline-event');
const detailsToggle = page.getByRole('button', {
  name: 'Show details',
  exact: true,
});
if ((await semanticEvents.count()) < 4 || (await detailsToggle.count()) !== 1) {
  throw new Error(
    `timeline should default to semantic events with an optional detail disclosure: ${JSON.stringify({ events: await semanticEvents.count(), details: await detailsToggle.count() })}`,
  );
}
await detailsToggle.click();
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
const durationInput = page.getByLabel('Scene duration seconds');
await page.getByRole('button', { name: '1.25×', exact: true }).click();
await page.waitForTimeout(80);
const humanFastDuration = await durationInput.inputValue();
await page.getByRole('button', { name: '0.8×', exact: true }).click();
await page.waitForTimeout(80);
const humanSlowDuration = await durationInput.inputValue();
if (humanFastDuration !== '12.00' || humanSlowDuration !== '15.00') {
  throw new Error(
    `human speed controls should retime and restore duration: ${JSON.stringify({ humanFastDuration, humanSlowDuration })}`,
  );
}
const scrubber = page.getByLabel('Timeline playhead');
await scrubber.evaluate((input) => {
  input.value = '1250';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
});
await page.waitForTimeout(80);
const humanTimeline = await page.evaluate(() =>
  window.__stagehandTools.get('get_timeline').execute({}),
);
if (!humanTimeline.ok || Math.abs(humanTimeline.currentTimeMs - 1250) > 1) {
  throw new Error(
    `agent timeline read should follow human scrubbing: ${JSON.stringify(humanTimeline)}`,
  );
}
await page.evaluate(() => {
  const stage = document.querySelector('.stage-wrap');
  if (stage instanceof HTMLElement) stage.focus();
});
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(80);
const keyboardTimeline = await page.evaluate(() =>
  window.__stagehandTools.get('get_timeline').execute({}),
);
if (
  !keyboardTimeline.ok ||
  keyboardTimeline.currentTimeMs <= humanTimeline.currentTimeMs
) {
  throw new Error(
    `arrow shortcut should advance the playhead: ${JSON.stringify({ humanTimeline, keyboardTimeline })}`,
  );
}

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
await page
  .locator('.asset-list')
  .getByText('smoke-prop', { exact: true })
  .waitFor({ timeout: 5000 });
await page.waitForTimeout(250);
const humanPropXInput = page.locator('input[aria-label="X for smoke-prop"]');
await humanPropXInput.fill('63');
await page.waitForTimeout(100);
const humanPropX = await humanPropXInput.inputValue();
await page.getByRole('button', { name: 'Edit style for smoke-prop' }).click();
if (!(await page.locator('.asset-context-style-editor').isVisible())) {
  throw new Error('asset style editor should open in the asset Inspector');
}
await page
  .locator('select[aria-label="Role for smoke-prop"]')
  .selectOption('accent');
await page.waitForTimeout(80);
await page.getByRole('button', { name: 'Import pose sheet · auto' }).click();
await page.locator('input[aria-label="Import image asset"]').setInputFiles({
  name: 'smoke-sheet.png',
  mimeType: 'image/png',
  buffer: widePngFixture(),
});
await page
  .locator('.asset-list')
  .getByText('smoke-sheet', { exact: true })
  .waitFor({ timeout: 5000 });
await page.waitForTimeout(120);
const poseSheet = await page
  .locator('.asset-copy small')
  .filter({ hasText: '4-pose sheet' })
  .count();
if (poseSheet !== 1) {
  throw new Error(`wide pose sheet was not auto-detected: ${poseSheet}`);
}
const assetValidation = await page.evaluate(() =>
  window.__stagehandTools.get('validate_project').execute({}),
);
if (!assetValidation.ok) {
  throw new Error(
    `freshly added/imported assets should carry valid style defaults: ${JSON.stringify(assetValidation)}`,
  );
}
if ((await page.locator('.asset-context-panel').count()) !== 1) {
  throw new Error('Assets view should provide an asset-specific inspector');
}
if (
  (await page
    .locator('.asset-context-panel')
    .getByText('smoke-prop', { exact: true })
    .count()) !== 1
) {
  throw new Error('asset-specific inspector should identify the active asset');
}
if (
  await page
    .locator('.asset-context-inspector input[aria-label="Alice X position"]')
    .isVisible()
) {
  throw new Error('Assets view should not expose character transform controls');
}
await page.getByRole('tab', { name: 'Scenes' }).click();
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
  const retimed = await call('retime_scene', { speed: 1.25 });
  const retimedTimeline = await call('get_timeline');
  const restoredDuration = await call('set_scene_duration', {
    durationMs: 15000,
  });
  if (
    !retimed.ok ||
    retimed.durationMs !== 12000 ||
    retimedTimeline.currentTimeMs > 12000 ||
    !restoredDuration.ok ||
    restoredDuration.durationMs !== 15000
  ) {
    throw new Error(
      `scene retime should synchronize duration and tracks: ${JSON.stringify({ retimed, retimedTimeline, restoredDuration })}`,
    );
  }
  const audio = await call('update_audio_cue', {
    cueId: 'music-low',
    volume: 0.03,
  });
  const manifest = await call('get_asset_manifest');
  const prop = manifest.assets.find(
    (asset) => asset.kind === 'prop' && asset.source === 'imported',
  );
  if (!prop) throw new Error('Imported smoke prop unavailable');
  if (prop.placement !== 'stage' || prop.keyframeCount < 1) {
    throw new Error(
      `asset manifest should expose stage placement and animation state: ${JSON.stringify(prop)}`,
    );
  }
  window.__stagehandCanvasFilters.length = 0;
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
  await new Promise((resolve) => setTimeout(resolve, 140));
  const inkedFilters = [...new Set(window.__stagehandCanvasFilters)];
  if (!inkedFilters.some((filter) => filter.includes('grayscale'))) {
    throw new Error(
      `asset treatment should reach the canvas renderer: ${JSON.stringify({ inkedFilters })}`,
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
    retime: {
      ok: retimed.ok,
      durationMs: retimed.durationMs,
      restoredDurationMs: restoredDuration.durationMs,
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
      rendererFilters: inkedFilters,
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

await page.waitForTimeout(650);
await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(700);
await page.waitForFunction(() => window.__stagehandTools?.size === 52);
const recovery = await page.evaluate(() =>
  window.__stagehandTools.get('get_project_summary').execute({}),
);
if (
  !recovery.ok ||
  recovery.name !== 'Smoke Project' ||
  recovery.sceneCount !== 2 ||
  recovery.assetCount < 5
) {
  throw new Error(`local recovery mismatch: ${JSON.stringify(recovery)}`);
}

const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
const rendered = await page.evaluate(() =>
  window.__stagehandTools.get('render_webm').execute({}),
);
const download = await downloadPromise;
const downloadPath = await download.path();
const downloadBytes = downloadPath ? (await stat(downloadPath)).size : 0;
const webmHeader = downloadPath
  ? (await readFile(downloadPath)).subarray(0, 4).toString('hex')
  : '';
const frameDownloadPromise = page.waitForEvent('download', { timeout: 15000 });
const frameExported = await page.evaluate(() =>
  window.__stagehandTools.get('export_frame').execute({}),
);
const frameDownload = await frameDownloadPromise;
const frameDownloadPath = await frameDownload.path();
const frameDownloadedBytes = frameDownloadPath
  ? (await stat(frameDownloadPath)).size
  : 0;
const pngHeader = frameDownloadPath
  ? (await readFile(frameDownloadPath)).subarray(0, 4).toString('hex')
  : '';
const volume = page.locator('.audio-volume-control input').first();
await volume.fill('0.02');
await page.waitForTimeout(80);
const humanAudioVolume = await volume.inputValue();
const audioStartInput = page.getByLabel('Start time Quiet diner bed');
await audioStartInput.fill('120');
await page.waitForTimeout(80);
const humanAudioStart = await audioStartInput.inputValue();
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
await page.getByRole('button', { name: 'Preview', exact: true }).click();
await page.waitForTimeout(120);
if (!(await page.locator('.preview-scrubber').isVisible())) {
  throw new Error('Preview should expose a compact scrubber');
}
if (await page.locator('.preview-workspace .timeline-grid').isVisible()) {
  throw new Error('Preview should hide the editable timeline grid');
}
if (await page.locator('.preview-shell .toast').isVisible()) {
  throw new Error('Preview should hide editor status toasts');
}
if (await page.locator('.preview-mode .stage-header-right').isVisible()) {
  throw new Error('Preview should hide editing guides');
}
const previewSceneBefore = (
  await page.locator('.preview-banner strong').textContent()
)?.trim();
await page.waitForTimeout(700);
const previewSceneAfter = (
  await page.locator('.preview-banner strong').textContent()
)?.trim();
if (
  !previewSceneBefore ||
  !previewSceneAfter ||
  previewSceneBefore === previewSceneAfter
) {
  throw new Error(
    `preview did not advance to another scene: ${JSON.stringify({ previewSceneBefore, previewSceneAfter })}`,
  );
}
const preview = {
  banner: await page.locator('.preview-banner').count(),
  canvas: await page.locator('.stage-canvas').count(),
  inspector: await page.locator('.preview-workspace .inspector').isVisible(),
  exit: await page.getByRole('button', { name: 'Exit preview' }).count(),
  settings: await page.getByRole('menuitem', { name: 'Settings', exact: true }).count(),
  import: await page.getByRole('menuitem', { name: 'Import project', exact: true }).count(),
  export: await page.getByRole('menuitem', { name: 'Export project', exact: true }).count(),
  renameProject: await page
    .getByRole('button', { name: /Rename project/ })
    .count(),
  boardTab: await page.getByRole('tab', { name: 'Board', exact: true }).count(),
  assetsTab: await page
    .getByRole('tab', { name: 'Assets', exact: true })
    .count(),
  addScene: await page.getByRole('button', { name: /Add scene/ }).count(),
  resetStarter: await page.getByRole('menuitem', { name: /Reset starter/ }).count(),
};
const summary = await page.evaluate(() =>
  window.__stagehandTools.get('get_project_summary').execute({}),
);

await page.getByRole('button', { name: 'Exit preview' }).click();
await page.waitForTimeout(100);
const pauseButton = page.getByRole('button', { name: 'Pause', exact: true });
if ((await pauseButton.count()) > 0) await pauseButton.click();
const emptied = await page.evaluate(async () => {
  const tools = window.__stagehandTools;
  const call = (name, input = {}) => tools.get(name).execute(input);
  const storyboard = await call('get_storyboard');
  const timeline = await call('get_timeline');
  const manifest = await call('get_asset_manifest');
  for (const beat of storyboard.beats ?? []) {
    await call('remove_storyboard_beat', { beatId: beat.id });
  }
  for (const cue of timeline.audioCues ?? []) {
    await call('remove_audio_cue', { cueId: cue.id });
  }
  for (const asset of manifest.assets ?? []) {
    await call('remove_asset', { assetId: asset.id });
  }
  return {
    beatsRemoved: storyboard.beats?.length ?? 0,
    cuesRemoved: timeline.audioCues?.length ?? 0,
    assetsRemoved: manifest.assets?.length ?? 0,
  };
});
await page.waitForTimeout(650);
await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(700);
await page.waitForFunction(() => window.__stagehandTools?.size === 52);
const emptyStatePersistence = await page.evaluate(() =>
  window.__stagehandTools.get('get_project_summary').execute({}),
);
if (
  emptied.beatsRemoved !== 6 ||
  emptied.cuesRemoved < 1 ||
  emptied.assetsRemoved < 5 ||
  emptyStatePersistence.storyboardBeatCount !== 0 ||
  emptyStatePersistence.audioCueCount !== 0 ||
  emptyStatePersistence.assetCount !== 0
) {
  throw new Error(
    `empty editable collections should survive recovery: ${JSON.stringify({ emptied, emptyStatePersistence })}`,
  );
}

const result = {
  url: baseUrl,
  toolCount: bridge.toolCount,
  timelineDrag: {
    moved: beforeDrag !== afterDrag,
    before: beforeDrag,
    after: afterDrag,
  },
  humanTimeline: {
    ok: humanTimeline.ok,
    currentTimeMs: humanTimeline.currentTimeMs,
  },
  keyboardStep: {
    ok: keyboardTimeline.ok,
    currentTimeMs: keyboardTimeline.currentTimeMs,
  },
  humanSpeed: {
    fastDuration: humanFastDuration,
    restoredDuration: humanSlowDuration,
  },
  sceneTitleLines,
  h1: (await h1.textContent())?.trim(),
  modal: { heading: modalHeading },
  inspector: {
    groupCount: inspectorGroupCount,
    transformCollapsed,
  },
  recovery: {
    ok: recovery.ok,
    name: recovery.name,
    sceneCount: recovery.sceneCount,
    assetCount: recovery.assetCount,
  },
  bridge,
  render: {
    ok: rendered.ok,
    fileName: rendered.fileName,
    sceneCount: rendered.sceneCount,
    durationMs: rendered.durationMs,
    bytes: rendered.bytes,
    downloadedBytes: await downloadBytes,
    webmHeader,
    suggestedFilename: download.suggestedFilename(),
  },
  frameExport: {
    ok: frameExported.ok,
    width: frameExported.width,
    height: frameExported.height,
    downloadedBytes: await frameDownloadedBytes,
    pngHeader,
    suggestedFilename: frameDownload.suggestedFilename(),
  },
  humanAudioVolume,
  humanAudioStart,
  humanPropX,
  poseSheet,
  assetValidation: {
    ok: assetValidation.ok,
    issueCount: assetValidation.issues?.length ?? 0,
  },
  storyboardCards,
  sequencePreview: {
    advanced: previewSceneBefore !== previewSceneAfter,
    before: previewSceneBefore,
    after: previewSceneAfter,
  },
  preview,
  emptyStatePersistence: {
    removedBeats: emptied.beatsRemoved,
    removedCues: emptied.cuesRemoved,
    removedAssets: emptied.assetsRemoved,
    persistedBeats: emptyStatePersistence.storyboardBeatCount,
    persistedCues: emptyStatePersistence.audioCueCount,
    persistedAssets: emptyStatePersistence.assetCount,
  },
  summary: {
    name: summary.name,
    durationMs: summary.durationMs,
    canUndo: summary.canUndo,
    canRedo: summary.canRedo,
  },
  pageErrors: errors,
};

if (
  result.toolCount !== 52 ||
  !result.timelineDrag.moved ||
  !result.humanTimeline.ok ||
  Math.abs(result.humanTimeline.currentTimeMs - 1250) > 1 ||
  !result.keyboardStep.ok ||
  result.keyboardStep.currentTimeMs <= result.humanTimeline.currentTimeMs ||
  result.humanSpeed.fastDuration !== '12.00' ||
  result.humanSpeed.restoredDuration !== '15.00' ||
  result.sceneTitleLines < 2 ||
  result.h1 !== 'stagehand' ||
  result.modal.heading !== 'Help & shortcuts' ||
  result.inspector.groupCount !== 5 ||
  !result.inspector.transformCollapsed ||
  !result.recovery.ok ||
  result.recovery.name !== 'Smoke Project' ||
  result.recovery.sceneCount !== 2 ||
  result.recovery.assetCount < 5 ||
  !bridge.audio.ok ||
  bridge.audio.volume !== 0.03 ||
  !bridge.inspected.ok ||
  bridge.inspected.timeMs !== 125 ||
  bridge.inspected.width !== 720 ||
  bridge.inspected.height !== 405 ||
  !bridge.renderSettings.preserved1080 ||
  !bridge.renderSettings.reset720 ||
  !bridge.retime.ok ||
  bridge.retime.durationMs !== 12000 ||
  bridge.retime.restoredDurationMs !== 15000 ||
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
  result.poseSheet !== 1 ||
  !result.assetValidation.ok ||
  !bridge.undone.ok ||
  !bridge.redone.ok ||
  !rendered.ok ||
  rendered.sceneCount !== 2 ||
  rendered.durationMs < 1000 ||
  !bridge.secondScene.ok ||
  rendered.bytes <= 0 ||
  webmHeader !== '1a45dfa3' ||
  !frameExported.ok ||
  frameExported.width !== 720 ||
  frameExported.height !== 405 ||
  frameDownloadedBytes <= 0 ||
  pngHeader !== '89504e47' ||
  !frameDownload.suggestedFilename().endsWith('.png') ||
  result.humanAudioVolume !== '0.02' ||
  result.humanAudioStart !== '120' ||
  storyboardCards !== 6 ||
  !result.sequencePreview.advanced ||
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
  result.emptyStatePersistence.persistedBeats !== 0 ||
  result.emptyStatePersistence.persistedCues !== 0 ||
  result.emptyStatePersistence.persistedAssets !== 0 ||
  errors.length > 0
)
  throw new Error(`Smoke test failed: ${JSON.stringify(result)}`);

console.log(JSON.stringify(result, null, 2));
await browser.close();
