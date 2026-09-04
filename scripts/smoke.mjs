import { chromium } from 'playwright';

const PUBLIC_TOOL_NAMES = [
  'inspect_project',
  'create_project',
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
  'edit_skeleton',
  'approve_skeleton',
  'validate_skeleton',
  'bind_skeleton_asset',
  'apply_motion_clip',
  'inspect_frame',
  'export_frame',
  'render_webm',
];

const baseUrl = process.env.STAGEHAND_URL ?? 'http://localhost:3000';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
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

await page.goto(`${baseUrl}?qa=phase-4-1`, {
  waitUntil: 'domcontentloaded',
  timeout: 15000,
});
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForFunction(() => window.__stagehandTools?.size === 40);

const registered = await page.evaluate(() => [
  ...window.__stagehandTools.keys(),
]);
if (JSON.stringify(registered) !== JSON.stringify(PUBLIC_TOOL_NAMES))
  throw new Error(`public tool order mismatch: ${registered.join(', ')}`);
await page.getByRole('button', { name: /Agent Live/ }).click();
if ((await page.locator('[data-tool-ui]').count()) !== 40)
  throw new Error('expected 40 visible tool UI contract markers');
await page.getByRole('button', { name: 'Close Agent Live' }).click();

const call = (name, input = {}) =>
  page.evaluate(
    async ({ name, input }) => {
      const tool = window.__stagehandTools.get(name);
      if (!tool) throw new Error(`missing tool ${name}`);
      return tool.execute(input);
    },
    { name, input },
  );

const initial = await call('inspect_project');
if (!initial.ok || initial.assetCount !== 4 || initial.skeletonCount !== 0)
  throw new Error(`blank project mismatch: ${JSON.stringify(initial)}`);
const created = await call('create_project', {
  name: 'Phase 4.1 QA',
  durationMs: 6000,
  fps: 24,
  renderPreset: '720p',
  idempotencyKey: 'create-qa',
});
if (!created.ok || created.project.name !== 'Phase 4.1 QA')
  throw new Error('create_project failed');

const checklist = await call('get_asset_generation_checklist', {
  kind: 'rigged-character',
  bindingMethod: 'segmented',
});
if (
  !checklist.ok ||
  !checklist.checklist.some((line) => line.includes('20–30%'))
)
  throw new Error('rig-ready checklist missing overlap contract');

const requestResult = await call('create_asset_request', {
  kind: 'rigged-character',
  label: 'Courier rabbit',
  targetCharacterId: 'actor-a',
  bindingMethod: 'segmented',
  idempotencyKey: 'request-rabbit',
});
if (
  !requestResult.ok ||
  requestResult.request.requiredDeliverables.length !== 2
)
  throw new Error('two-deliverable request failed');
const requestId = requestResult.request.id;

const images = await page.evaluate(() => {
  const make = (atlas) => {
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 500, 300);
    ctx.fillStyle = '#e56b52';
    if (atlas) {
      for (let i = 0; i < 15; i += 1) {
        const x = (i % 5) * 96 + 12;
        const y = Math.floor(i / 5) * 92 + 12;
        ctx.beginPath();
        ctx.roundRect(x, y, 72, 72, 18);
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      ctx.arc(250, 68, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.roundRect(205, 100, 90, 95, 30);
      ctx.fill();
      ctx.lineWidth = 28;
      ctx.lineCap = 'round';
      for (const [x1, y1, x2, y2] of [
        [215, 120, 160, 185],
        [285, 120, 340, 185],
        [225, 180, 205, 260],
        [275, 180, 295, 260],
      ]) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = '#e56b52';
        ctx.stroke();
      }
    }
    return canvas.toDataURL('image/png');
  };
  return { assembled: make(false), atlas: make(true) };
});

const partIds = [
  'pelvis',
  'torso',
  'head',
  'left-upper-arm',
  'left-forearm',
  'left-hand',
  'right-upper-arm',
  'right-forearm',
  'right-hand',
  'left-thigh',
  'left-shin',
  'left-foot',
  'right-thigh',
  'right-shin',
  'right-foot',
];
const attachments = [
  ['pelvis-torso', 'pelvis', 'torso', 'spine'],
  ['torso-head', 'torso', 'head', 'neck'],
  ...['left', 'right'].flatMap((side) => [
    [`${side}-shoulder`, 'torso', `${side}-upper-arm`, `${side}-shoulder`],
    [`${side}-elbow`, `${side}-upper-arm`, `${side}-forearm`, `${side}-elbow`],
    [`${side}-wrist`, `${side}-forearm`, `${side}-hand`, `${side}-wrist`],
    [`${side}-hip`, 'pelvis', `${side}-thigh`, `${side}-hip`],
    [`${side}-knee`, `${side}-thigh`, `${side}-shin`, `${side}-knee`],
    [`${side}-ankle`, `${side}-shin`, `${side}-foot`, `${side}-ankle`],
  ]),
].map(([id, parentPartId, childPartId, jointId], drawOrder) => ({
  id,
  parentPartId,
  childPartId,
  jointId,
  parentAnchor: { x: 0.5, y: 0.25 },
  childAnchor: { x: 0.5, y: 0.25 },
  pivot: { x: 0.5, y: 0.25 },
  drawOrder,
  requiredOverlap: 0.25,
}));
const makePackage = (cleanCut = false) => ({
  version: 3,
  atlasWidth: 500,
  atlasHeight: 300,
  source: 'manifest',
  sourceAsset: {
    assetId: 'rabbit-atlas',
    immutable: true,
    provenance: { author: 'smoke fixture' },
  },
  deliverables: {
    'assembled-reference': 'rabbit-reference',
    'rig-atlas': 'rabbit-atlas',
  },
  image: { width: 500, height: 300, colorspace: 'sRGB', alpha: 'straight' },
  canvasAnchor: { x: 0.5, y: 0.82 },
  motionProfile: {
    version: 1,
    rigClass: 'jointed-cutout',
    intendedActions: ['wave'],
    articulationPoints: ['elbows', 'knees'],
    requiredViews: ['front'],
    requiredSwaps: [],
    acceptancePoses: ['rest', 'elbow 90'],
    deformationStrategy: '20-30% overlap',
  },
  topologyProfile: {
    version: 1,
    id: 'humanoid-jointed-v1',
    kind: 'humanoid-jointed-v1',
    partIds,
    deformationModes: Object.fromEntries(
      partIds.map((id) => [id, 'segmented']),
    ),
    attachments,
  },
  parts: partIds.map((id, index) => {
    const x = (index % 5) * 0.2 + 0.02,
      y = Math.floor(index / 5) / 3 + 0.02,
      width = 0.16,
      height = 0.28;
    return {
      id,
      label: id,
      boneId: 'bone-root-hip',
      x,
      y,
      width,
      height,
      pivotX: 0.5,
      pivotY: 0.25,
      attachX: 0.5,
      attachY: 0.25,
      confidence: 1,
      zIndex: index,
      overlapPx: 21,
      bounds: { x, y, width, height },
      pivot: { x: 0.5, y: 0.25 },
      parentAnchor: { x: 0.5, y: 0.25 },
      drawOrder: index,
      deformationMode: 'segmented',
      attachmentMargins: { top: 21, right: 8, bottom: 8, left: 8 },
    };
  }),
  diagnostics: {
    minimumOverlapDepth: cleanCut ? 0.1 : 0.25,
    silhouetteIou: 0.95,
    anchorResidual: 0.01,
    restJointCoverage: 0.94,
    stressJointCoverage: 0.86,
    disconnectedComponentsAdded: 0,
    clippedPixels: 0,
    invertedHierarchy: false,
    transparentCorridors: 0,
  },
  alignment: { connected: true, seamCount: 14, minConfidence: 1, warnings: [] },
  skeleton: {
    confidence: 1,
    minCriticalConfidence: 0.8,
    criticalJointIds: ['root', 'hip', 'chest', 'head'],
  },
});

const assembled = await call('attach_generated_asset', {
  requestId,
  deliverableRole: 'assembled-reference',
  dataUrl: images.assembled,
  frameLayout: 'single',
  idempotencyKey: 'attach-reference',
});
if (!assembled.ok)
  throw new Error(`assembled attach failed: ${JSON.stringify(assembled)}`);
const rejectedAtlas = await call('attach_generated_asset', {
  requestId,
  deliverableRole: 'rig-atlas',
  dataUrl: images.atlas,
  frameLayout: 'parts-sheet',
  assetPackage: makePackage(true),
  idempotencyKey: 'attach-clean-cut',
});
if (
  !rejectedAtlas.ok ||
  !rejectedAtlas.asset.packageIssues.some((issue) =>
    issue.includes('CLEAN_CUT_JOINT'),
  )
)
  throw new Error('clean-cut candidate was not preserved and blocked');
const rejectedApproval = await call('approve_asset', {
  assetId: rejectedAtlas.asset.id,
  approved: true,
  idempotencyKey: 'approve-clean-cut',
});
if (rejectedApproval.ok || rejectedApproval.code !== 'ASSET_REVIEW_REQUIRED')
  throw new Error('clean-cut asset approved');

const validRequest = await call('create_asset_request', {
  kind: 'rigged-character',
  label: 'Courier rabbit valid',
  targetCharacterId: 'actor-a',
  bindingMethod: 'segmented',
  idempotencyKey: 'request-valid',
});
await call('attach_generated_asset', {
  requestId: validRequest.request.id,
  deliverableRole: 'assembled-reference',
  dataUrl: images.assembled,
  frameLayout: 'single',
  idempotencyKey: 'valid-reference',
});
const atlas = await call('attach_generated_asset', {
  requestId: validRequest.request.id,
  deliverableRole: 'rig-atlas',
  dataUrl: images.atlas,
  frameLayout: 'parts-sheet',
  assetPackage: makePackage(false),
  idempotencyKey: 'valid-atlas',
});
if (!atlas.ok || atlas.asset.packageIssues.length)
  throw new Error(`valid atlas rejected: ${JSON.stringify(atlas)}`);
const approvedAtlas = await call('approve_asset', {
  assetId: atlas.asset.id,
  approved: true,
  idempotencyKey: 'approve-valid-atlas',
});
if (!approvedAtlas.ok)
  throw new Error(
    `valid atlas approval failed: ${JSON.stringify(approvedAtlas)}`,
  );

const proposed = await call('propose_skeleton', {
  assetId: atlas.asset.id,
  bindingMethod: 'segmented',
  idempotencyKey: 'propose-rig',
});
if (
  !proposed.ok ||
  proposed.skeleton.joints.length < 16 ||
  proposed.skeleton.bones.length < 15
)
  throw new Error(
    `real articulated skeleton missing: ${JSON.stringify(proposed)}`,
  );
const edited = await call('edit_skeleton', {
  skeletonId: proposed.skeleton.id,
  operation: 'set_joint',
  joint: {
    ...proposed.skeleton.joints.find((joint) => joint.id === 'left-elbow'),
    x: 29,
    y: 52,
  },
  idempotencyKey: 'move-elbow',
});
if (
  !edited.ok ||
  edited.changedEntityIds[0] !== 'left-elbow' ||
  !edited.qaInvalidated
)
  throw new Error(`edit_skeleton failed: ${JSON.stringify(edited)}`);
const validation = await call('validate_skeleton', {
  skeletonId: proposed.skeleton.id,
});
if (!validation.ok)
  throw new Error('validate_skeleton did not return diagnostics');

const audioImport = await call('import_asset_audio', {
  label: 'QA click',
  kind: 'stinger',
  sourceUrl: 'https://example.com/qa-click.ogg',
  author: 'QA',
  license: 'CC0',
  licenseUrl: 'https://creativecommons.org/public-domain/cc0',
  durationMs: 500,
  loopable: false,
  idempotencyKey: 'audio-import',
});
if (!audioImport.ok) throw new Error('audio provenance import failed');
const audioAttached = await call('attach_imported_audio', {
  assetId: audioImport.asset.id,
  dataUrl: 'data:audio/ogg;base64,T2dnUw==',
  mimeType: 'audio/ogg',
  idempotencyKey: 'audio-attach',
});
if (!audioAttached.ok) throw new Error('audio payload attachment failed');
const clip = await call('add_audio_clip', {
  assetId: audioImport.asset.id,
  label: 'QA click',
  kind: 'stinger',
  startMs: 500,
  endMs: 900,
  volume: 0.3,
  idempotencyKey: 'audio-clip',
});
if (!clip.ok) throw new Error('audio clip creation failed');

const projectValidation = await call('validate_project');
const frame = await call('inspect_frame', { timeMs: 0 });
if (!projectValidation.ok || !frame.ok)
  throw new Error(
    `project/frame inspection failed: ${JSON.stringify({ projectValidation, frame })}`,
  );

await page.getByRole('button', { name: /Agent Live/ }).click();
await page.waitForSelector('.agent-activity');
const statuses = await page.locator('.agent-activity').allTextContents();
if (
  !statuses.some((value) => value.includes('edit_skeleton')) ||
  !statuses.some((value) => value.includes('failed'))
)
  throw new Error('Agent Live did not surface mutations and failures');

await page.setViewportSize({ width: 390, height: 844 });
if ((await page.evaluate(() => document.documentElement.scrollWidth)) > 390)
  throw new Error('mobile layout overflows');
if (pageErrors.length)
  throw new Error(`page errors: ${pageErrors.join(' | ')}`);

console.log(
  JSON.stringify(
    {
      ok: true,
      toolCount: registered.length,
      blankAssetCount: initial.assetCount,
      rejectedCleanCut: true,
      jointCount: proposed.skeleton.joints.length,
      boneCount: proposed.skeleton.bones.length,
      agentActivityCount: statuses.length,
      projectIssueCount: projectValidation.issues?.length ?? 0,
    },
    null,
    2,
  ),
);
await browser.close();
