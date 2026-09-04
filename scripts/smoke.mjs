import { chromium } from 'playwright';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const PUBLIC_TOOL_NAMES = [
  'inspect_project',
  'edit_project',
  'get_timeline',
  'set_playhead',
  'edit_scene',
  'edit_storyboard',
  'set_current_scene',
  'set_pose',
  'set_keyframe',
  'set_bone_keyframe',
  'delete_keyframe',
  'get_bone_keyframes',
  'set_character_variant',
  'validate_project',
  'undo',
  'redo',
  'edit_history',
  'list_assets',
  'get_asset_generation_checklist',
  'create_asset_request',
  'attach_generated_asset',
  'inspect_asset_candidate',
  'approve_asset',
  'list_asset_audio',
  'import_asset_audio',
  'attach_imported_audio',
  'add_audio_clip',
  'set_audio_clip',
  'inspect_audio_clip',
  'propose_skeleton',
  'get_skeleton',
  'approve_skeleton',
  'validate_skeleton',
  'bind_skeleton_asset',
  'apply_motion_clip',
  'inspect_frame',
  'export_frame',
  'render_webm',
];

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

function segmentedPngFixture() {
  const width = 600;
  const height = 600;
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(height * stride);
  const parts = [
    [18, 18, 180, 220, [239, 107, 87, 255]],
    [228, 18, 150, 280, [239, 107, 87, 255]],
    [390, 18, 90, 250, [52, 118, 143, 255]],
    [492, 18, 90, 250, [52, 118, 143, 255]],
    [228, 344, 90, 220, [242, 184, 75, 255]],
    [330, 344, 90, 220, [242, 184, 75, 255]],
  ];
  for (let y = 0; y < height; y += 1) {
    const row = y * stride;
    for (let x = 0; x < width; x += 1) {
      const part = parts.find(
        ([partX, partY, partWidth, partHeight]) =>
          x >= partX &&
          x < partX + partWidth &&
          y >= partY &&
          y < partY + partHeight,
      );
      if (!part) continue;
      const pixel = row + 1 + x * 4;
      raw[pixel] = part[4][0];
      raw[pixel + 1] = part[4][1];
      raw[pixel + 2] = part[4][2];
      raw[pixel + 3] = part[4][3];
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

function meshArmPngFixture() {
  const width = 320;
  const height = 160;
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(height * stride);
  for (let y = 56; y < 104; y += 1) {
    const row = y * stride;
    for (let x = 32; x < 288; x += 1) {
      const pixel = row + 1 + x * 4;
      const blend = (x - 32) / 256;
      raw[pixel] = Math.round(239 - blend * 107);
      raw[pixel + 1] = Math.round(107 + blend * 77);
      raw[pixel + 2] = Math.round(87 + blend * 56);
      raw[pixel + 3] = 255;
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

const fixtureDataUrl = `data:image/png;base64,${segmentedPngFixture().toString('base64')}`;
const meshTexturePath = process.env.STAGEHAND_MESH_TEXTURE_PATH;
const meshTextureBytes = meshTexturePath
  ? await readFile(meshTexturePath)
  : meshArmPngFixture();
const meshFixtureDataUrl = `data:image/png;base64,${meshTextureBytes.toString('base64')}`;

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
await page.waitForFunction(() => window.__stagehandTools?.size === 38);
const h1 = page.locator('h1');
if (
  (await h1.count()) !== 1 ||
  (await h1.textContent())?.trim() !== 'stagehand'
) {
  throw new Error('studio should expose one descriptive h1 brand heading');
}
const uiChrome = {
  previewAction: await page
    .getByRole('button', { name: 'Preview', exact: true })
    .count(),
  renderAction: await page
    .getByRole('button', { name: 'Render', exact: true })
    .count(),
  previewTab: await page
    .getByRole('tab', { name: 'Preview', exact: true })
    .count(),
  legacyToolBadge: await page
    .getByText('69 tools declared', { exact: true })
    .count(),
  legacyValidationCard: await page
    .getByText('READY TO RENDER', { exact: true })
    .count(),
  legacySaveCopy: await page
    .getByText('Saved locally', { exact: true })
    .count(),
};
if (
  uiChrome.previewAction !== 1 ||
  uiChrome.renderAction !== 1 ||
  uiChrome.previewTab !== 0 ||
  uiChrome.legacyToolBadge !== 0 ||
  uiChrome.legacyValidationCard !== 0 ||
  uiChrome.legacySaveCopy !== 0
) {
  throw new Error(`editor chrome regression: ${JSON.stringify(uiChrome)}`);
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
await page
  .getByRole('menuitem', { name: 'Help & shortcuts', exact: true })
  .click();
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
if (inspectorGroupCount !== 6 || !transformCollapsed) {
  throw new Error(
    `inspector sections should collapse independently: ${JSON.stringify({ inspectorGroupCount, transformCollapsed })}`,
  );
}

const marks = page.locator('button[aria-label^="Alice keyframe"]');
const semanticEvents = page.locator('.timeline-event');
const timelineHintBefore = await page
  .getByText('Click a clip to jump', { exact: true })
  .count();
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
const timelineHintAfter = await page
  .getByText('Drag keyframes · click to jump', { exact: true })
  .count();
if (timelineHintBefore !== 1 || timelineHintAfter !== 1) {
  throw new Error(
    `timeline hint should describe the current detail mode: ${JSON.stringify({ timelineHintBefore, timelineHintAfter })}`,
  );
}
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

const bridge = await page.evaluate(
  async ({ fixtureDataUrl, meshFixtureDataUrl, publicToolNames }) => {
    const tools = window.__stagehandTools;
    const legacyTools = window.__stagehandLegacyTools;
    const call = (name, input = {}) =>
      (tools.get(name) ?? legacyTools.get(name)).execute(input);
    const registeredNames = [...tools.keys()];
    if (JSON.stringify(registeredNames) !== JSON.stringify(publicToolNames)) {
      throw new Error(
        `public tool registry mismatch: ${JSON.stringify(registeredNames)}`,
      );
    }
    const schemaIds = [...tools.values()].map((tool) => tool.inputSchema?.$id);
    if (schemaIds.some((id) => !id) || new Set(schemaIds).size !== tools.size) {
      throw new Error(
        `public tools require unique schema ids: ${JSON.stringify(schemaIds)}`,
      );
    }
    const unguardedMutations = [...tools.values()]
      .filter((tool) => !tool.annotations?.readOnlyHint)
      .filter((tool) => !tool.inputSchema?.properties?.expectedRevision)
      .map((tool) => tool.name);
    if (unguardedMutations.length > 0) {
      throw new Error(
        `mutating tools must expose expectedRevision: ${unguardedMutations.join(', ')}`,
      );
    }
    const initial = await call('inspect_project');
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
      inspected.renderSize?.width !== 1920 ||
      inspected.renderSize?.height !== 1080
    ) {
      throw new Error(
        `frame inspection mismatch: ${JSON.stringify(inspected)}`,
      );
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
    const audioLibrary = await call('get_audio_library');
    const audioRoute = await call('set_audio_cue_asset', {
      cueId: 'footstep-1',
      assetId: 'audio-pop-2',
    });
    const checklist = await call('get_asset_generation_checklist', {
      kind: 'rigged-character',
      targetCharacterId: 'alice',
      bindingMethod: 'segmented',
    });
    const assetRequest = await call('create_asset_request', {
      kind: 'rigged-character',
      label: 'Smoke segmented Alice',
      targetCharacterId: 'alice',
      bindingMethod: 'segmented',
    });
    const candidate = await call('attach_generated_asset', {
      requestId: assetRequest.request.id,
      dataUrl: fixtureDataUrl,
      frameLayout: 'parts-sheet',
    });
    const candidateInspection = await call('inspect_asset_candidate', {
      assetId: candidate.asset.id,
    });
    const blockedBind = await call('bind_character_asset', {
      characterId: 'alice',
      assetId: candidate.asset.id,
    });
    const approvedAsset = await call('approve_asset', {
      assetId: candidate.asset.id,
      approved: true,
    });
    const boundGenerated = await call('bind_character_asset', {
      characterId: 'alice',
      assetId: candidate.asset.id,
    });
    const skeletonProposal = await call('propose_skeleton', {
      assetId: candidate.asset.id,
      bindingMethod: 'segmented',
    });
    const skeletonId = skeletonProposal.skeleton.id;
    const blockedBoneKeyframe = await call('set_bone_keyframe', {
      skeletonId,
      timeMs: 0,
      transforms: [
        { boneId: 'bone-chest-left-hand', rotation: -22, x: 0, y: 0, scale: 1 },
      ],
    });
    const correctedJoint = await call('update_skeleton_joint', {
      skeletonId,
      jointId: 'left-hand',
      x: 30,
      y: 50,
    });
    const approvedSkeleton = await call('approve_skeleton', {
      skeletonId,
      approved: true,
    });
    const statusAfterApproval = await call('get_skeleton', { skeletonId });
    const motionLibrary = await call('get_motion_library');
    const motionPreview = await call('preview_motion_clip', {
      clipId: 'motion-embarrassed-reaction',
      timeMs: 350,
    });
    const motionAnalysis = await call('analyze_scene_motion');
    const motionApplied = await call('apply_motion_clip', {
      characterId: 'alice',
      clipId: 'motion-embarrassed-reaction',
      startTimeMs: 3300,
    });
    const statusAfterMotion = await call('get_skeleton', { skeletonId });
    const bobVariant = await call('set_character_variant', {
      characterId: 'bob',
      variantId: 'bob-three-quarter-v2',
    });
    const boneAtStart = await call('set_bone_keyframe', {
      skeletonId,
      timeMs: 0,
      transforms: [
        { boneId: 'bone-chest-left-hand', rotation: -22, x: 0, y: 0, scale: 1 },
      ],
    });
    const boneAtReveal = await call('set_bone_keyframe', {
      skeletonId,
      timeMs: 3300,
      transforms: [
        { boneId: 'bone-chest-left-hand', rotation: -52, x: 0, y: 0, scale: 1 },
        { boneId: 'bone-chest-right-hand', rotation: 28, x: 0, y: 0, scale: 1 },
      ],
    });
    const boneReadback = await call('get_bone_keyframes', { skeletonId });
    const statusAfterBone = await call('get_skeleton', { skeletonId });
    const skeletonValidation = await call('validate_skeleton', { skeletonId });
    const skeletonFrame = await call('inspect_frame', { timeMs: 3300 });
    const meshChecklist = await call('get_asset_generation_checklist', {
      kind: 'rigged-character',
      bindingMethod: 'mesh',
    });
    const meshRequest = await call('create_asset_request', {
      kind: 'rigged-character',
      label: 'Two-bone arm mesh proof',
      targetCharacterId: 'alice',
      bindingMethod: 'mesh',
    });
    const meshCandidate = await call('attach_generated_asset', {
      requestId: meshRequest.request.id,
      dataUrl: meshFixtureDataUrl,
      frameLayout: 'single',
    });
    const approvedMeshAsset = await call('approve_asset', {
      assetId: meshCandidate.asset.id,
      approved: true,
    });
    const boundMeshAsset = await call('bind_character_asset', {
      characterId: 'alice',
      assetId: meshCandidate.asset.id,
    });
    const meshJoints = [
      {
        id: 'root',
        label: 'shoulder',
        x: 10,
        y: 50,
        radius: 4,
        confidence: 1,
        locked: true,
      },
      {
        id: 'elbow',
        parentId: 'root',
        label: 'elbow',
        x: 50,
        y: 50,
        radius: 4,
        confidence: 1,
        locked: true,
      },
      {
        id: 'wrist',
        parentId: 'elbow',
        label: 'wrist',
        x: 90,
        y: 50,
        radius: 4,
        confidence: 1,
        locked: true,
      },
    ];
    const meshBones = [
      {
        id: 'upper-arm',
        parentJointId: 'root',
        childJointId: 'elbow',
        length: 40,
        angleMin: -120,
        angleMax: 120,
      },
      {
        id: 'lower-arm',
        parentJointId: 'elbow',
        childJointId: 'wrist',
        length: 40,
        angleMin: -120,
        angleMax: 120,
      },
    ];
    const columns = [
      { x: 0.1, upper: 1, lower: 0 },
      { x: 0.4, upper: 0.75, lower: 0.25 },
      { x: 0.6, upper: 0.25, lower: 0.75 },
      { x: 0.9, upper: 0, lower: 1 },
    ];
    const meshVertices = columns.flatMap((column, columnIndex) =>
      [0.35, 0.65].map((y, rowIndex) => ({
        id: `v-${columnIndex}-${rowIndex}`,
        x: column.x,
        y,
        u: column.x,
        v: y,
        influences: [
          ...(column.upper > 0
            ? [{ boneId: 'upper-arm', weight: column.upper }]
            : []),
          ...(column.lower > 0
            ? [{ boneId: 'lower-arm', weight: column.lower }]
            : []),
        ],
      })),
    );
    const mesh = {
      version: 1,
      id: 'two-bone-arm-proof',
      textureAssetId: meshCandidate.asset.id,
      coordinateSpace: 'normalized-image',
      vertices: meshVertices,
      triangles: [
        [0, 2, 1],
        [1, 2, 3],
        [2, 4, 3],
        [3, 4, 5],
        [4, 6, 5],
        [5, 6, 7],
      ],
      zIndex: 0,
      skeletonVersion: 1,
    };
    const beforeInvalidMesh = await call('inspect_project');
    const invalidMeshProposal = await call('propose_skeleton', {
      assetId: meshCandidate.asset.id,
      bindingMethod: 'mesh',
      joints: meshJoints,
      bones: meshBones,
      mesh: {
        ...mesh,
        vertices: meshVertices.map((vertex, index) =>
          index === 0
            ? {
                ...vertex,
                influences: [{ boneId: 'upper-arm', weight: 0.8 }],
              }
            : vertex,
        ),
      },
    });
    const afterInvalidMesh = await call('inspect_project');
    const meshProposal = await call('propose_skeleton', {
      assetId: meshCandidate.asset.id,
      bindingMethod: 'mesh',
      joints: meshJoints,
      bones: meshBones,
      mesh,
    });
    const meshSkeletonId = meshProposal.skeleton?.id;
    const approvedMeshSkeleton = await call('approve_skeleton', {
      skeletonId: meshSkeletonId,
      approved: true,
    });
    const meshRestKeyframe = await call('set_bone_keyframe', {
      skeletonId: meshSkeletonId,
      timeMs: 0,
      transforms: [
        { boneId: 'upper-arm', rotation: 0, x: 0, y: 0, scale: 1 },
        { boneId: 'lower-arm', rotation: 0, x: 0, y: 0, scale: 1 },
      ],
    });
    const meshBendKeyframe = await call('set_bone_keyframe', {
      skeletonId: meshSkeletonId,
      timeMs: 600,
      transforms: [
        { boneId: 'upper-arm', rotation: 0, x: 0, y: 0, scale: 1 },
        { boneId: 'lower-arm', rotation: 60, x: 0, y: 0, scale: 1 },
      ],
    });
    const meshRestFrame = await call('inspect_frame', { timeMs: 0 });
    const meshBendFrame = await call('inspect_frame', { timeMs: 600 });
    const meshValidation = await call('validate_skeleton', {
      skeletonId: meshSkeletonId,
    });
    await call('set_playhead', { timeMs: 0 });
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
    const responseLeaks = [
      candidate,
      candidateInspection,
      approvedAsset,
      meshCandidate,
      approvedMeshAsset,
    ]
      .map((result) => JSON.stringify(result))
      .filter(
        (value) => value.includes('data:image') || value.includes('base64,'),
      );
    return {
      toolCount: tools.size,
      legacyToolCount: legacyTools.size,
      registeredNames,
      responseLeaks,
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
      audio: {
        ok: audio.ok,
        volume: audio.cue?.volume,
        libraryCount: audioLibrary.assets?.length,
        routed: audioRoute.ok,
      },
      generatedRig: {
        checklist: checklist.ok,
        request: assetRequest.ok,
        candidate: candidateInspection.readyForApproval,
        blockedBind: blockedBind.code,
        approvedAsset: approvedAsset.reviewStatus,
        bound: boundGenerated.ok,
        skeletonId,
        blockedBoneKeyframe: blockedBoneKeyframe.code,
        correctedJoint: correctedJoint.ok,
        approvedSkeleton: approvedSkeleton.reviewStatus,
        statusAfterApproval: statusAfterApproval.skeleton?.reviewStatus,
        motionLibrary: motionLibrary.motionClips?.length,
        motionPreview: motionPreview.evaluation?.transforms?.length,
        motionAnalysis: motionAnalysis.proposals?.length,
        motionApplied: motionApplied.ok,
        motionAppliedCode: motionApplied.code,
        statusAfterMotion: statusAfterMotion.skeleton?.reviewStatus,
        bobVariant: bobVariant.ok,
        boneAtStart: boneAtStart.ok,
        boneAtStartCode: boneAtStart.code,
        boneAtReveal: boneAtReveal.ok,
        boneAtRevealCode: boneAtReveal.code,
        boneReadback: boneReadback.boneKeyframes?.length,
        boneReadbackScenes: boneReadback.boneKeyframes?.map(
          (frame) => frame.sceneId,
        ),
        statusAfterBone: statusAfterBone.skeleton?.reviewStatus,
        valid: skeletonValidation.valid,
        validationIssues: skeletonValidation.issues,
        inspectedSkeleton: skeletonFrame.skeletons?.find(
          (item) => item.id === skeletonId,
        ),
        inspectedTransforms: skeletonFrame.skeletons?.find(
          (item) => item.id === skeletonId,
        )?.boneTransforms?.length,
      },
      meshProof: {
        checklist: meshChecklist.checklist?.some((item) =>
          item.includes('triangle mesh'),
        ),
        request: meshRequest.ok,
        approvedAsset: approvedMeshAsset.reviewStatus,
        boundAsset: boundMeshAsset.ok,
        invalidCode: invalidMeshProposal.code,
        invalidRevisionUnchanged:
          beforeInvalidMesh.revision === afterInvalidMesh.revision,
        proposed: meshProposal.ok,
        skeletonId: meshSkeletonId,
        approved: approvedMeshSkeleton.reviewStatus,
        restKeyframe: meshRestKeyframe.ok,
        bendKeyframe: meshBendKeyframe.ok,
        valid: meshValidation.valid,
        renderer: meshRestFrame.renderDiagnostics?.renderer,
        fallbackUsed: meshRestFrame.renderDiagnostics?.fallbackUsed,
        restMetrics: meshRestFrame.renderDiagnostics?.meshMetrics?.[0],
        bendMetrics: meshBendFrame.renderDiagnostics?.meshMetrics?.[0],
        restHash: meshRestFrame.pixelHash,
        bendHash: meshBendFrame.pixelHash,
      },
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
  },
  {
    fixtureDataUrl,
    meshFixtureDataUrl,
    publicToolNames: PUBLIC_TOOL_NAMES,
  },
);

await page.waitForTimeout(650);
await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(700);
await page.waitForFunction(() => window.__stagehandTools?.size === 38);
const recovery = await page.evaluate(() =>
  window.__stagehandTools.get('inspect_project').execute({}),
);
if (
  !recovery.ok ||
  recovery.name !== 'Smoke Project' ||
  recovery.sceneCount !== 2 ||
  recovery.assetCount < 5
) {
  throw new Error(`local recovery mismatch: ${JSON.stringify(recovery)}`);
}

const meshProofOutput = process.env.STAGEHAND_MESH_OUTPUT_DIR
  ? fileURLToPath(
      new URL(`${process.env.STAGEHAND_MESH_OUTPUT_DIR}/`, import.meta.url),
    )
  : fileURLToPath(new URL('../output/mesh-proof/', import.meta.url));
await mkdir(meshProofOutput, { recursive: true });
await page.evaluate(
  async ({ skeletonId }) => {
    const tools = window.__stagehandTools;
    await tools.get('set_current_scene').execute({ sceneId: 'scene-01' });
    await tools.get('set_playhead').execute({ timeMs: 0 });
    await tools.get('set_bone_keyframe').execute({
      skeletonId,
      timeMs: 125,
      transforms: [
        { boneId: 'upper-arm', rotation: 0, x: 0, y: 0, scale: 1 },
        { boneId: 'lower-arm', rotation: 60, x: 0, y: 0, scale: 1 },
      ],
    });
    await tools.get('set_bone_keyframe').execute({
      skeletonId,
      timeMs: 250,
      transforms: [
        { boneId: 'upper-arm', rotation: 0, x: 0, y: 0, scale: 1 },
        { boneId: 'lower-arm', rotation: 105, x: 0, y: 0, scale: 1 },
      ],
    });
  },
  { skeletonId: bridge.meshProof.skeletonId },
);
await page.waitForTimeout(160);
await page.locator('.stage-canvas').screenshot({
  path: `${meshProofOutput}/rest.png`,
});
const stageBox = await page.locator('.stage-canvas').boundingBox();
if (!stageBox) throw new Error('mesh proof canvas bounds unavailable');
const meshDetailClip = {
  x: stageBox.x + stageBox.width * 0.25,
  y: stageBox.y + stageBox.height * 0.4,
  width: stageBox.width * 0.25,
  height: stageBox.height * 0.35,
};
await page.screenshot({
  path: `${meshProofOutput}/rest-detail.png`,
  clip: meshDetailClip,
});
await page.evaluate(async () => {
  await window.__stagehandTools.get('set_playhead').execute({ timeMs: 125 });
});
await page.waitForTimeout(160);
await page.locator('.stage-canvas').screenshot({
  path: `${meshProofOutput}/bend-60.png`,
});
await page.screenshot({
  path: `${meshProofOutput}/bend-60-detail.png`,
  clip: meshDetailClip,
});
const wireframeToggle = page.getByRole('button', {
  name: 'Show mesh wireframe',
  exact: true,
});
await wireframeToggle.click();
await page.waitForTimeout(100);
await page.locator('.stage-canvas').screenshot({
  path: `${meshProofOutput}/bend-60-wireframe.png`,
});
await page.screenshot({
  path: `${meshProofOutput}/bend-60-wireframe-detail.png`,
  clip: meshDetailClip,
});
await page.getByRole('button', { name: 'Hide mesh wireframe' }).click();

const extremeInspection = await page.evaluate(async () => {
  const tools = window.__stagehandTools;
  await tools.get('set_playhead').execute({ timeMs: 250 });
  return tools.get('inspect_frame').execute({ timeMs: 250 });
});
await page.waitForTimeout(160);
await page.locator('.stage-canvas').screenshot({
  path: `${meshProofOutput}/bend-105.png`,
});
await page.screenshot({
  path: `${meshProofOutput}/bend-105-detail.png`,
  clip: meshDetailClip,
});
await wireframeToggle.click();
await page.waitForTimeout(100);
await page.locator('.stage-canvas').screenshot({
  path: `${meshProofOutput}/bend-105-wireframe.png`,
});
await page.screenshot({
  path: `${meshProofOutput}/bend-105-wireframe-detail.png`,
  clip: meshDetailClip,
});
await page.getByRole('button', { name: 'Hide mesh wireframe' }).click();

const parityInspection = await page.evaluate(async () => {
  const tools = window.__stagehandTools;
  await tools.get('set_current_scene').execute({ sceneId: 'scene-01' });
  await tools.get('set_playhead').execute({ timeMs: 0 });
  return tools.get('inspect_frame').execute({ timeMs: 0 });
});

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
  settings: await page
    .getByRole('menuitem', { name: 'Settings', exact: true })
    .count(),
  import: await page
    .getByRole('menuitem', { name: 'Import project', exact: true })
    .count(),
  export: await page
    .getByRole('menuitem', { name: 'Export project', exact: true })
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
    .getByRole('menuitem', { name: /Reset starter/ })
    .count(),
};
const summary = await page.evaluate(() =>
  window.__stagehandTools.get('inspect_project').execute({}),
);

await page.getByRole('button', { name: 'Exit preview' }).click();
await page.waitForTimeout(100);
const pauseButton = page.getByRole('button', { name: 'Pause', exact: true });
if ((await pauseButton.count()) > 0) await pauseButton.click();
const emptied = await page.evaluate(async () => {
  const tools = window.__stagehandTools;
  const legacyTools = window.__stagehandLegacyTools;
  const call = (name, input = {}) =>
    (tools.get(name) ?? legacyTools.get(name)).execute(input);
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
await page.waitForFunction(() => window.__stagehandTools?.size === 38);
const emptyStatePersistence = await page.evaluate(() =>
  window.__stagehandTools.get('inspect_project').execute({}),
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

const mobileContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
});
const mobilePage = await mobileContext.newPage();
await mobilePage.goto(`${baseUrl}?qa=responsive-smoke`, {
  waitUntil: 'domcontentloaded',
  timeout: 15000,
});
await mobilePage.evaluate(() => localStorage.clear());
await mobilePage.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
await mobilePage.waitForTimeout(400);
await mobilePage
  .getByRole('button', { name: 'More actions', exact: true })
  .click();
const mobileMenuItems = await mobilePage.locator('.mobile-only').count();
await mobilePage
  .getByRole('menuitem', { name: 'Open Inspector', exact: true })
  .click();
const responsive = {
  bodyWidth: await mobilePage.evaluate(() => document.body.scrollWidth),
  documentWidth: await mobilePage.evaluate(
    () => document.documentElement.scrollWidth,
  ),
  mobileMenuItems,
  inspectorDrawer: await mobilePage
    .locator('.workspace.mobile-inspector-open > .inspector')
    .isVisible(),
};
await mobileContext.close();
if (
  responsive.bodyWidth !== 390 ||
  responsive.documentWidth !== 390 ||
  responsive.mobileMenuItems !== 3 ||
  !responsive.inspectorDrawer
) {
  throw new Error(
    `responsive editor regression: ${JSON.stringify(responsive)}`,
  );
}

const splitContext = await browser.newContext({
  viewport: { width: 960, height: 820 },
});
const splitPage = await splitContext.newPage();
await splitPage.goto(`${baseUrl}?qa=split-pane-smoke`, {
  waitUntil: 'domcontentloaded',
  timeout: 15000,
});
await splitPage.evaluate(() => localStorage.clear());
await splitPage.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
await splitPage.waitForTimeout(400);
const splitInspector = splitPage.locator(
  '.workspace:not(.preview-workspace) > .inspector',
);
const splitInspectorTrigger = splitPage.getByRole('button', {
  name: 'Open Inspector',
  exact: true,
});
const splitInitiallyVisible = await splitInspector.isVisible();
const splitInspectorTriggerVisible = await splitInspectorTrigger.isVisible();
await splitPage
  .getByRole('button', { name: 'More actions', exact: true })
  .click();
const splitInspectorMenu = splitPage.getByRole('menuitem', {
  name: 'Open Inspector',
  exact: true,
});
const splitRailMenu = splitPage.getByRole('menuitem', {
  name: 'Open project drawer',
  exact: true,
});
const splitMenu = {
  inspector: await splitInspectorMenu.isVisible(),
  rail: await splitRailMenu.isVisible(),
};
await splitInspectorMenu.click();
const splitInspectorClose = splitPage.getByRole('button', {
  name: 'Close Inspector drawer',
  exact: true,
});
const splitPane = {
  bodyWidth: await splitPage.evaluate(() => document.body.scrollWidth),
  documentWidth: await splitPage.evaluate(
    () => document.documentElement.scrollWidth,
  ),
  canvasFrameRatio: await splitPage
    .locator('.canvas-frame')
    .evaluate(
      (node) =>
        node.getBoundingClientRect().width /
        node.getBoundingClientRect().height,
    ),
  timelineTrackWidth: await splitPage
    .locator('.track-area .track-row')
    .first()
    .evaluate((node) => Math.round(node.getBoundingClientRect().width)),
  inspectorInitiallyClosed: !splitInitiallyVisible,
  inspectorTrigger: splitInspectorTriggerVisible,
  inspectorMenu: splitMenu.inspector,
  railMenuHidden: !splitMenu.rail,
  inspectorDrawer: await splitInspector.isVisible(),
  inspectorClose: (await splitInspectorClose.count()) === 1,
  stageWidth: await splitPage
    .locator('.stage-wrap')
    .evaluate((node) => Math.round(node.getBoundingClientRect().width)),
};
await splitInspectorClose.click();
const splitInspectorClosed = !(await splitInspector.isVisible());
await splitContext.close();
if (
  splitPane.bodyWidth !== 960 ||
  splitPane.documentWidth !== 960 ||
  Math.abs(splitPane.canvasFrameRatio - 16 / 9) > 0.02 ||
  splitPane.timelineTrackWidth < 900 ||
  !splitPane.inspectorInitiallyClosed ||
  !splitPane.inspectorTrigger ||
  !splitPane.inspectorMenu ||
  !splitPane.railMenuHidden ||
  !splitPane.inspectorDrawer ||
  !splitPane.inspectorClose ||
  !splitInspectorClosed ||
  splitPane.stageWidth < 500
) {
  throw new Error(`split-pane editor regression: ${JSON.stringify(splitPane)}`);
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
  uiChrome,
  responsive,
  splitPane,
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
  parityInspection: {
    ok: parityInspection.ok,
    pixelHash: parityInspection.pixelHash,
    renderer: parityInspection.renderDiagnostics?.renderer,
    fallbackUsed: parityInspection.renderDiagnostics?.fallbackUsed,
  },
  extremeInspection: {
    ok: extremeInspection.ok,
    pixelHash: extremeInspection.pixelHash,
    renderer: extremeInspection.renderDiagnostics?.renderer,
    fallbackUsed: extremeInspection.renderDiagnostics?.fallbackUsed,
    meshMetrics: extremeInspection.renderDiagnostics?.meshMetrics?.[0],
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
    renderer: rendered.renderer,
    meshFrameCount: rendered.meshFrameCount,
    fallbackFrameCount: rendered.fallbackFrameCount,
    renderIssueCount: rendered.renderIssueCount,
    sampleFrameHashes: rendered.sampleFrameHashes,
  },
  frameExport: {
    ok: frameExported.ok,
    width: frameExported.width,
    height: frameExported.height,
    downloadedBytes: await frameDownloadedBytes,
    pngHeader,
    suggestedFilename: frameDownload.suggestedFilename(),
    pixelHash: frameExported.pixelHash,
    renderer: frameExported.renderDiagnostics?.renderer,
    fallbackUsed: frameExported.renderDiagnostics?.fallbackUsed,
    meshMetrics: frameExported.renderDiagnostics?.meshMetrics?.[0],
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
  result.toolCount !== 38 ||
  bridge.legacyToolCount < 38 ||
  JSON.stringify(bridge.registeredNames) !==
    JSON.stringify(PUBLIC_TOOL_NAMES) ||
  bridge.responseLeaks.length !== 0 ||
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
  result.inspector.groupCount !== 6 ||
  !result.inspector.transformCollapsed ||
  !result.recovery.ok ||
  result.recovery.name !== 'Smoke Project' ||
  result.recovery.sceneCount !== 2 ||
  result.recovery.assetCount < 5 ||
  !parityInspection.ok ||
  parityInspection.renderDiagnostics?.renderer !== 'canvas-lbs-mesh-v1' ||
  parityInspection.renderDiagnostics?.fallbackUsed ||
  !extremeInspection.ok ||
  extremeInspection.renderDiagnostics?.renderer !== 'canvas-lbs-mesh-v1' ||
  extremeInspection.renderDiagnostics?.fallbackUsed ||
  extremeInspection.renderDiagnostics?.meshMetrics?.[0]?.flippedCount !== 0 ||
  extremeInspection.renderDiagnostics?.meshMetrics?.[0]?.degenerateCount !==
    0 ||
  !bridge.audio.ok ||
  bridge.audio.volume !== 0.03 ||
  bridge.audio.libraryCount < 4 ||
  !bridge.audio.routed ||
  !bridge.generatedRig.checklist ||
  !bridge.generatedRig.request ||
  !bridge.generatedRig.candidate ||
  bridge.generatedRig.blockedBind !== 'ASSET_NOT_APPROVED' ||
  bridge.generatedRig.approvedAsset !== 'approved' ||
  !bridge.generatedRig.bound ||
  bridge.generatedRig.blockedBoneKeyframe !== 'SKELETON_NOT_APPROVED' ||
  !bridge.generatedRig.correctedJoint ||
  bridge.generatedRig.approvedSkeleton !== 'approved' ||
  bridge.generatedRig.motionLibrary < 4 ||
  bridge.generatedRig.motionPreview < 2 ||
  bridge.generatedRig.motionAnalysis < 1 ||
  !bridge.generatedRig.motionApplied ||
  !bridge.generatedRig.bobVariant ||
  !bridge.generatedRig.boneAtStart ||
  !bridge.generatedRig.boneAtReveal ||
  !bridge.generatedRig.valid ||
  bridge.generatedRig.inspectedTransforms < 2 ||
  !bridge.meshProof.checklist ||
  !bridge.meshProof.request ||
  bridge.meshProof.approvedAsset !== 'approved' ||
  !bridge.meshProof.boundAsset ||
  bridge.meshProof.invalidCode !== 'INVALID_MESH_BINDING' ||
  !bridge.meshProof.invalidRevisionUnchanged ||
  !bridge.meshProof.proposed ||
  bridge.meshProof.approved !== 'approved' ||
  !bridge.meshProof.restKeyframe ||
  !bridge.meshProof.bendKeyframe ||
  !bridge.meshProof.valid ||
  bridge.meshProof.renderer !== 'canvas-lbs-mesh-v1' ||
  bridge.meshProof.fallbackUsed ||
  bridge.meshProof.restMetrics?.vertexCount !== 8 ||
  bridge.meshProof.restMetrics?.triangleCount !== 6 ||
  bridge.meshProof.restMetrics?.flippedCount !== 0 ||
  bridge.meshProof.restMetrics?.degenerateCount !== 0 ||
  bridge.meshProof.bendMetrics?.flippedCount !== 0 ||
  bridge.meshProof.bendMetrics?.degenerateCount !== 0 ||
  !bridge.meshProof.restHash ||
  bridge.meshProof.restHash === bridge.meshProof.bendHash ||
  !bridge.inspected.ok ||
  bridge.inspected.timeMs !== 125 ||
  bridge.inspected.width !== 1920 ||
  bridge.inspected.height !== 1080 ||
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
  rendered.renderer !== 'canvas-lbs-mesh-v1' ||
  rendered.meshFrameCount < 1 ||
  rendered.fallbackFrameCount !== 0 ||
  rendered.renderIssueCount !== 0 ||
  rendered.sampleFrameHashes?.[0]?.pixelHash !== parityInspection.pixelHash ||
  webmHeader !== '1a45dfa3' ||
  !frameExported.ok ||
  frameExported.width !== 720 ||
  frameExported.height !== 405 ||
  frameExported.renderDiagnostics?.renderer !== 'canvas-lbs-mesh-v1' ||
  frameExported.renderDiagnostics?.fallbackUsed ||
  frameExported.renderDiagnostics?.meshMetrics?.[0]?.flippedCount !== 0 ||
  frameExported.pixelHash !== parityInspection.pixelHash ||
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
