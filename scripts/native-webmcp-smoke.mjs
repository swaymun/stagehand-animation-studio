import { chromium } from 'playwright';

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
  const originalRegisterTool = prototype.registerTool;
  prototype.registerTool = function (tool, options) {
    window.__nativeWebMcpTools.push(tool);
    try {
      const result = originalRegisterTool.call(this, tool, options);
      if (result && typeof result.catch === 'function') {
        result.catch((error) =>
          window.__nativeWebMcpErrors.push({
            name: tool?.name,
            message: String(error),
          }),
        );
      }
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

await page.goto(`${baseUrl}?qa=native-webmcp`, {
  waitUntil: 'domcontentloaded',
  timeout: 15000,
});
await page.waitForTimeout(900);
await page.waitForFunction(
  () => window.__nativeWebMcpTools?.length === 38,
  null,
  { timeout: 10000 },
);

const result = await page.evaluate(async (publicToolNames) => {
  const tools = window.__nativeWebMcpTools;
  const summaryTool = tools.find((tool) => tool.name === 'inspect_project');
  const timelineTool = tools.find((tool) => tool.name === 'get_timeline');
  const playheadTool = tools.find((tool) => tool.name === 'set_playhead');
  const before = await summaryTool.execute({});
  const beforeTimeline = await timelineTool.execute({});
  const invalid = await playheadTool.execute({ timeMs: 'not-a-number' });
  const moved = await playheadTool.execute({ timeMs: 250 });
  const after = await summaryTool.execute({});
  const afterTimeline = await timelineTool.execute({});
  const names = tools.map((tool) => tool.name);
  const schemaIds = tools.map((tool) => tool.inputSchema?.$id);
  const unguardedMutations = tools
    .filter((tool) => !tool.annotations?.readOnlyHint)
    .filter((tool) => !tool.inputSchema?.properties?.expectedRevision)
    .map((tool) => tool.name);
  return {
    status: window.__nativeWebMcpStatus,
    toolCount: tools.length,
    uniqueToolCount: new Set(tools.map((tool) => tool.name)).size,
    exactOrder: JSON.stringify(names) === JSON.stringify(publicToolNames),
    uniqueSchemaIds:
      schemaIds.every(Boolean) && new Set(schemaIds).size === tools.length,
    unguardedMutations,
    firstTool: tools[0]?.name,
    lastTool: tools.at(-1)?.name,
    invalid,
    moved,
    beforeRevision: before.revision,
    afterRevision: after.revision,
    beforeTimeMs: beforeTimeline.currentTimeMs,
    afterTimeMs: afterTimeline.currentTimeMs,
    registrationErrors: window.__nativeWebMcpErrors,
  };
}, PUBLIC_TOOL_NAMES);

console.log(JSON.stringify({ ...result, pageErrors }, null, 2));
await browser.close();

if (
  result.status !== 'available' ||
  result.toolCount !== 38 ||
  result.uniqueToolCount !== 38 ||
  !result.exactOrder ||
  !result.uniqueSchemaIds ||
  result.unguardedMutations.length > 0 ||
  result.registrationErrors.length > 0 ||
  result.invalid?.code !== 'INVALID_INPUT' ||
  result.moved?.ok !== true ||
  result.afterTimeMs !== 250 ||
  result.afterRevision !== result.beforeRevision + 1 ||
  pageErrors.length > 0
) {
  throw new Error('native WebMCP smoke failed');
}
