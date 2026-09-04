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
const browser = await chromium.launch({
  headless: true,
  args: ['--enable-features=WebMCPTesting'],
});
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
await page.addInitScript(() => {
  window.__nativeWebMcpTools = [];
  window.__nativeWebMcpErrors = [];
  const context = navigator.modelContext;
  if (!context?.registerTool) {
    window.__nativeWebMcpStatus = 'missing';
    return;
  }
  window.__nativeWebMcpStatus = 'available';
  const prototype = Object.getPrototypeOf(context);
  const original = prototype.registerTool;
  prototype.registerTool = function registerStagehandTool(tool, options) {
    window.__nativeWebMcpTools.push(tool);
    try {
      const result = original.call(this, tool, options);
      if (result && typeof result.catch === 'function')
        result.catch((error) =>
          window.__nativeWebMcpErrors.push({
            name: tool?.name,
            message: String(error),
          }),
        );
      return result;
    } catch (error) {
      window.__nativeWebMcpErrors.push({
        name: tool?.name,
        message: String(error),
      });
      throw error;
    }
  };
});

await page.goto(`${baseUrl}?qa=native-frames`, {
  waitUntil: 'domcontentloaded',
  timeout: 20_000,
});
await page.waitForFunction(
  () => window.__nativeWebMcpTools?.length === 27,
  null,
  { timeout: 12_000 },
);
await page.waitForTimeout(350);

const result = await page.evaluate(async (expectedNames) => {
  const tools = window.__nativeWebMcpTools;
  const byName = (name) => tools.find((tool) => tool.name === name);
  const before = await byName('inspect_project').execute({});
  const moved = await byName('set_playhead').execute({
    frame: 7,
    expectedRevision: before.revision,
    idempotencyKey: 'native-move-7',
  });
  const inspected = await byName('inspect_frame').execute({ frame: 7 });
  const validated = await byName('validate_project').execute({});
  const names = tools.map((tool) => tool.name);
  return {
    status: window.__nativeWebMcpStatus,
    names,
    exactOrder: JSON.stringify(names) === JSON.stringify(expectedNames),
    uniqueSchemaIds:
      new Set(tools.map((tool) => tool.inputSchema?.$id)).size === tools.length,
    unguardedMutations: tools
      .filter((tool) => !tool.annotations?.readOnlyHint)
      .filter(
        (tool) =>
          !tool.inputSchema?.properties?.expectedRevision ||
          !tool.inputSchema?.properties?.idempotencyKey,
      )
      .map((tool) => tool.name),
    registrationErrors: window.__nativeWebMcpErrors,
    before,
    moved,
    inspected,
    validated,
  };
}, PUBLIC_TOOL_NAMES);

assert.equal(result.status, 'available');
assert.equal(result.names.length, 27);
assert.equal(new Set(result.names).size, 27);
assert.equal(result.exactOrder, true);
assert.equal(result.uniqueSchemaIds, true);
assert.deepEqual(result.unguardedMutations, []);
assert.deepEqual(result.registrationErrors, []);
assert.equal(result.moved.ok, true);
assert.equal(result.moved.frame, 7);
assert.equal(result.inspected.ok, true);
assert.equal(result.inspected.interpolation, 'none');
assert.equal(result.validated.ok, true);
assert.deepEqual(pageErrors, []);

console.log(
  JSON.stringify(
    {
      ok: true,
      url: baseUrl,
      status: result.status,
      toolCount: result.names.length,
      firstTool: result.names[0],
      lastTool: result.names.at(-1),
      projectRevision: result.moved.revision,
      evaluatedFrame: result.inspected.evaluated.frame,
    },
    null,
    2,
  ),
);
await browser.close();
