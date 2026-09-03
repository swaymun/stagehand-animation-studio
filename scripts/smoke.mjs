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
await page.waitForFunction(() => window.__stagehandTools?.size === 47);

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

const bridge = await page.evaluate(async () => {
  const tools = window.__stagehandTools;
  const call = (name, input = {}) => tools.get(name).execute(input);
  const initial = await call('get_project_summary');
  const renamed = await call('set_project_name', { name: 'Smoke Project' });
  const posed = await call('set_pose', {
    characterId: 'alice',
    pose: 'point',
  });
  const audio = await call('update_audio_cue', {
    cueId: 'music-low',
    volume: 0.03,
  });
  const undone = await call('undo_command');
  const redone = await call('redo_command');
  const duration = await call('set_scene_duration', { durationMs: 500 });
  return {
    toolCount: tools.size,
    initial: { revision: initial.revision, canUndo: initial.canUndo },
    renamed: { ok: renamed.ok, revision: renamed.revision },
    posed: { ok: posed.ok, revision: posed.revision },
    audio: { ok: audio.ok, volume: audio.cue?.volume },
    undone: { ok: undone.ok, revision: undone.revision },
    redone: { ok: redone.ok, revision: redone.revision },
    duration: { ok: duration.ok, durationMs: duration.durationMs },
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
const volume = page.locator('.audio-volume-control input').first();
await volume.fill('0.02');
await page.waitForTimeout(80);
await page.getByRole('tab', { name: 'Storyboard' }).click();
await page.waitForTimeout(100);
const storyboardCards = await page.locator('.storyboard-beat').count();
await page.getByRole('tab', { name: 'Preview' }).click();
await page.waitForTimeout(120);
const preview = {
  banner: await page.locator('.preview-banner').count(),
  canvas: await page.locator('.stage-canvas').count(),
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
  humanAudioVolume: await volume.inputValue(),
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
  result.toolCount !== 47 ||
  !result.timelineDrag.moved ||
  !bridge.audio.ok ||
  bridge.audio.volume !== 0.03 ||
  !bridge.undone.ok ||
  !bridge.redone.ok ||
  !rendered.ok ||
  rendered.bytes <= 0 ||
  result.humanAudioVolume !== '0.02' ||
  storyboardCards !== 3 ||
  preview.banner !== 1 ||
  preview.canvas !== 1 ||
  errors.length > 0
)
  throw new Error(`Smoke test failed: ${JSON.stringify(result)}`);

console.log(JSON.stringify(result, null, 2));
await browser.close();
