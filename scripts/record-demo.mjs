import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.STAGEHAND_URL ?? 'http://localhost:3000';
const outputDir = path.resolve(
  process.env.STAGEHAND_RECORDING_DIR ?? 'output/demo-recordings',
);
const outputPath = path.resolve(
  process.env.STAGEHAND_RECORDING_PATH ??
    path.join(outputDir, 'stagehand-native-three-demos.webm'),
);
const demoIds = ['deadline-show', 'brick-breakout', 'no-clams-no-patty'];
const expectedToolCount = 27;
const maximumRuntimeMs = 175_000;

await mkdir(path.dirname(outputPath), { recursive: true });
const recordingTempDir = await mkdtemp(
  path.join(tmpdir(), 'stagehand-demo-recorder-'),
);

const startedAt = Date.now();
const toolCalls = [];
const pageErrors = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  screen: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: 'dark',
  reducedMotion: 'no-preference',
  acceptDownloads: true,
  recordVideo: {
    dir: recordingTempDir,
    size: { width: 1440, height: 900 },
  },
});
const page = await context.newPage();
const video = page.video();
page.on('pageerror', (error) => pageErrors.push(error.message));

await page.addInitScript(() => {
  window.__stagehandTools = new Map();
  document.modelContext = {
    registerTool(tool) {
      window.__stagehandTools.set(tool.name, tool);
    },
  };
});

const pause = (milliseconds) => page.waitForTimeout(milliseconds);

async function installRecorderOverlay() {
  await page.evaluate(() => {
    const overlay = document.createElement('aside');
    overlay.id = 'stagehand-recorder-callout';
    overlay.setAttribute('aria-live', 'polite');
    Object.assign(overlay.style, {
      position: 'fixed',
      zIndex: '2147483647',
      right: '24px',
      bottom: '22px',
      width: 'min(530px, calc(100vw - 48px))',
      padding: '13px 16px 14px',
      border: '1px solid rgba(139, 116, 255, .55)',
      borderRadius: '14px',
      background: 'rgba(11, 9, 24, .92)',
      boxShadow: '0 18px 55px rgba(0, 0, 0, .45)',
      color: '#f5f2ff',
      font: '600 15px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace',
      letterSpacing: '-.015em',
      pointerEvents: 'none',
      opacity: '0',
      transform: 'translateY(8px)',
      transition: 'opacity 180ms ease, transform 180ms ease',
    });
    overlay.innerHTML =
      '<small style="display:block;color:#a99cf7;font:700 10px/1.2 ui-sans-serif,system-ui;letter-spacing:.14em;text-transform:uppercase;margin-bottom:6px">Native document.modelContext</small><span></span>';
    document.body.appendChild(overlay);
  });
}

async function showCallout(message, tone = 'running') {
  await page.evaluate(
    ({ message, tone }) => {
      const overlay = document.querySelector('#stagehand-recorder-callout');
      if (!overlay) return;
      const label = overlay.querySelector('small');
      const text = overlay.querySelector('span');
      label.textContent =
        tone === 'done'
          ? 'Native WebMCP result'
          : 'Native document.modelContext';
      label.style.color = tone === 'done' ? '#73e5ac' : '#a99cf7';
      text.textContent = message;
      overlay.style.opacity = '1';
      overlay.style.transform = 'translateY(0)';
    },
    { message, tone },
  );
}

async function callRaw(name, input = {}) {
  return page.evaluate(
    async ({ name, input }) => {
      const tool = window.__stagehandTools?.get(name);
      if (!tool) return { ok: false, code: 'TOOL_NOT_REGISTERED', name };
      return tool.execute(input);
    },
    { name, input },
  );
}

function compactInput(input) {
  const entries = Object.entries(input).filter(
    ([key]) => !['expectedRevision', 'idempotencyKey'].includes(key),
  );
  if (!entries.length) return '{}';
  return `{ ${entries.map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(', ')} }`;
}

async function call(name, input = {}, { label = name, settleMs = 750 } = {}) {
  assert.ok(
    Date.now() - startedAt < maximumRuntimeMs,
    'recording exceeded its three-minute safety budget',
  );
  await showCallout(`${name}(${compactInput(input)})`);
  await pause(420);
  const result = await callRaw(name, input);
  assert.equal(result?.ok, true, `${name} failed: ${JSON.stringify(result)}`);
  toolCalls.push(name);
  await showCallout(`✓ ${label}`, 'done');
  await pause(settleMs);
  return result;
}

let mutationIndex = 0;
async function guardedCall(name, input = {}, options = {}) {
  const project = await callRaw('inspect_project');
  assert.equal(project?.ok, true, 'could not read project revision');
  mutationIndex += 1;
  return call(
    name,
    {
      ...input,
      expectedRevision: project.revision,
      idempotencyKey: `record-demo-${mutationIndex}-${name}`,
    },
    options,
  );
}

async function selectWorkspaceTab(name) {
  const button = page.getByRole('button', { name, exact: true });
  await button.click();
  await pause(650);
}

async function showcaseDemo(demoId, { fullProductionPass = false } = {}) {
  const loaded = await guardedCall(
    'load_demo',
    { demoId },
    {
      label: `loaded ${demoId}`,
      settleMs: 1_150,
    },
  );
  const project = loaded.project;

  await selectWorkspaceTab('Storyboard');
  await showCallout(
    `${project.name} · ${project.storyboard.length} storyboard scenes`,
    'done',
  );
  await pause(1_250);

  await selectWorkspaceTab('Frames');
  const sceneIndexes = [
    0,
    Math.floor(project.storyboard.length / 2),
    project.storyboard.length - 1,
  ];
  for (const sceneIndex of new Set(sceneIndexes)) {
    const beat = project.storyboard[sceneIndex];
    await guardedCall(
      'set_current_scene',
      { sceneId: beat.sceneId },
      {
        label: `scene ${sceneIndex + 1}: ${beat.title}`,
        settleMs: 650,
      },
    );
    const sceneState = await callRaw('inspect_project');
    const heroFrame = Math.max(
      0,
      Math.min(
        sceneState.activeScene.frameCount - 1,
        Math.round(sceneState.activeScene.frameCount * 0.62),
      ),
    );
    await guardedCall(
      'set_playhead',
      { sceneId: beat.sceneId, frame: heroFrame },
      {
        label: `${beat.title} · held drawing F${heroFrame + 1}`,
        settleMs: 900,
      },
    );
  }

  if (!fullProductionPass) return;

  await call('get_lip_sync', {}, { label: 'read caption-driven mouth cues' });
  await guardedCall(
    'generate_lip_sync',
    { allScenes: true },
    {
      label: 'rebuilt mouth cues across all five scenes',
      settleMs: 900,
    },
  );

  const active = await callRaw('inspect_project');
  const sfxStart = Math.max(0, Math.min(14, active.activeScene.frameCount - 6));
  await guardedCall(
    'generate_sfx',
    {
      recipe: 'success',
      label: 'Agent victory ping',
      startFrame: sfxStart,
      durationFrames: 5,
    },
    { label: 'added deterministic procedural SFX', settleMs: 900 },
  );

  await selectWorkspaceTab('Audio');
  await pause(1_300);
  await call(
    'validate_project',
    {},
    { label: 'production check passed', settleMs: 950 },
  );

  const finalState = await callRaw('inspect_project');
  await call(
    'export_frame',
    {
      sceneId: finalState.activeScene.id,
      frame: finalState.activeScene.frame,
      download: false,
    },
    { label: 'exported exact evaluated PNG frame', settleMs: 1_050 },
  );

  await call(
    'render_webm',
    { download: false },
    {
      label: 'rendered all scenes, captions, holds, and SFX',
      settleMs: 1_350,
    },
  );
}

try {
  await page.goto(`${baseUrl}?record=three-demos`, {
    waitUntil: 'domcontentloaded',
    timeout: 25_000,
  });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 25_000 });
  await page.waitForFunction(
    (count) => window.__stagehandTools?.size === count,
    expectedToolCount,
    { timeout: 15_000 },
  );
  await page.waitForSelector('canvas[aria-label="Animation stage preview"]', {
    timeout: 15_000,
  });
  await pause(1_500);
  await installRecorderOverlay();

  const registered = await page.evaluate(() => window.__stagehandTools.size);
  assert.equal(
    registered,
    expectedToolCount,
    'native tool contract should be complete',
  );
  await showCallout('27 native animation tools registered', 'done');
  await pause(1_200);

  await page.getByRole('button', { name: /Agent Live/ }).click();
  await page
    .locator('[data-tool-ui="inspect_project"]')
    .scrollIntoViewIfNeeded();
  await page.locator('[data-tool-ui="inspect_project"]').evaluate((element) => {
    element.style.outline = '2px solid #a99cf7';
    element.style.outlineOffset = '3px';
  });
  await call(
    'inspect_project',
    {},
    { label: 'inspected five-scene production', settleMs: 1_200 },
  );
  await page
    .getByRole('button', { name: 'Close Agent Live', exact: true })
    .last()
    .click();
  await pause(650);

  await showcaseDemo(demoIds[0]);
  await showcaseDemo(demoIds[1], { fullProductionPass: true });
  await showcaseDemo(demoIds[2]);

  await page.getByRole('button', { name: /Agent Live/ }).click();
  await page.locator('[data-tool-ui="render_webm"]').scrollIntoViewIfNeeded();
  await page.locator('[data-tool-ui="render_webm"]').evaluate((element) => {
    element.style.outline = '2px solid #73e5ac';
    element.style.outlineOffset = '3px';
  });
  await showCallout('Three demos · one native production contract', 'done');
  await pause(2_400);

  assert.deepEqual(
    demoIds.every((demoId) => demoId.length > 0),
    true,
  );
  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join('; ')}`);
} finally {
  await page.close();
  if (video) await video.saveAs(outputPath);
  await context.close();
  await browser.close();
  await rm(recordingTempDir, { recursive: true, force: true });
}

const durationMs = Date.now() - startedAt;
assert.ok(
  durationMs < 180_000,
  `recording ran ${durationMs}ms, expected less than three minutes`,
);

console.log(
  JSON.stringify(
    {
      ok: true,
      outputPath,
      durationMs,
      viewport: '1440x900',
      demos: demoIds,
      nativeToolCalls: toolCalls,
      pageErrors,
    },
    null,
    2,
  ),
);
