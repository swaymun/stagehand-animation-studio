import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.STAGEHAND_URL ?? 'http://localhost:3000';
const outputDir = path.resolve(
  process.env.STAGEHAND_DEMO_OUTPUT_DIR ?? 'output/demo-animations',
);
const toolTimeoutMs = Number(
  process.env.STAGEHAND_RENDER_TIMEOUT_MS ?? 180_000,
);
const demos = [
  { id: 'deadline-show', outputName: 'one-more-deploy.webm' },
  { id: 'brick-breakout', outputName: 'ship-the-brick.webm' },
  { id: 'no-clams-no-patty', outputName: 'land-money.webm' },
];

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  acceptDownloads: true,
});
const page = await context.newPage();
const pageErrors = [];
const reports = [];

page.on('pageerror', (error) => pageErrors.push(error.message));
page.setDefaultTimeout(30_000);

await page.addInitScript(() => {
  window.__stagehandTools = new Map();
  document.modelContext = {
    registerTool(tool) {
      window.__stagehandTools.set(tool.name, tool);
    },
  };
});

async function callTool(name, input = {}) {
  return page.evaluate(
    async ({ name, input }) => {
      const tool = window.__stagehandTools?.get(name);
      if (!tool) return { ok: false, code: 'TOOL_NOT_REGISTERED', name };
      return tool.execute(input);
    },
    { name, input },
  );
}

async function currentRevision() {
  const project = await callTool('inspect_project');
  assert.equal(
    project?.ok,
    true,
    `inspect_project failed: ${JSON.stringify(project)}`,
  );
  return project.revision;
}

async function loadDemo(demoId, index) {
  const revision = await currentRevision();
  const result = await callTool('load_demo', {
    demoId,
    expectedRevision: revision,
    idempotencyKey: `render-demo-${index + 1}-${demoId}`,
  });
  assert.equal(
    result?.ok,
    true,
    `load_demo(${demoId}) failed: ${JSON.stringify(result)}`,
  );
  assert.ok(
    result.project?.sceneCount > 0,
    `${demoId} should load at least one scene`,
  );
  return result.project;
}

async function renderAndDownload(demo, index) {
  const project = await loadDemo(demo.id, index);
  const outputPath = path.join(outputDir, demo.outputName);
  const renderStartedAt = Date.now();
  const downloadPromise = page.waitForEvent('download', {
    timeout: toolTimeoutMs,
  });
  const renderPromise = callTool('render_webm', { download: true });
  const [download, renderResult] = await Promise.all([
    downloadPromise,
    renderPromise,
  ]);

  assert.equal(
    renderResult?.ok,
    true,
    `render_webm(${demo.id}) failed: ${JSON.stringify(renderResult)}`,
  );
  await download.saveAs(outputPath);

  const downloadFailure = await download.failure();
  assert.equal(
    downloadFailure,
    null,
    `${demo.id} download failed: ${downloadFailure}`,
  );
  const file = await stat(outputPath);
  const sha256 = createHash('sha256')
    .update(await readFile(outputPath))
    .digest('hex');

  return {
    demoId: demo.id,
    projectName: project.name,
    outputPath,
    suggestedFilename: download.suggestedFilename(),
    fileBytes: file.size,
    sha256,
    elapsedMs: Date.now() - renderStartedAt,
    render: {
      filename: renderResult.filename,
      bytes: renderResult.bytes,
      durationMs: renderResult.durationMs,
      fps: renderResult.fps,
      sceneCount: renderResult.sceneCount,
    },
  };
}

try {
  await page.goto(`${baseUrl}?render=all-demos`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForFunction(
    () =>
      window.__stagehandTools?.has('inspect_project') &&
      window.__stagehandTools?.has('load_demo') &&
      window.__stagehandTools?.has('render_webm'),
    null,
    { timeout: 20_000 },
  );
  await page.waitForSelector('canvas[aria-label="Animation stage preview"]', {
    timeout: 20_000,
  });

  for (const [index, demo] of demos.entries()) {
    const report = await renderAndDownload(demo, index);
    reports.push(report);
    console.log(
      `[${index + 1}/${demos.length}] ${report.projectName}: ${report.fileBytes} bytes -> ${report.outputPath}`,
    );
  }

  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join('; ')}`);
} finally {
  await context.close();
  await browser.close();
}

console.log(
  JSON.stringify(
    {
      ok: true,
      baseUrl,
      outputDir,
      demoCount: reports.length,
      reports,
      pageErrors,
    },
    null,
    2,
  ),
);
