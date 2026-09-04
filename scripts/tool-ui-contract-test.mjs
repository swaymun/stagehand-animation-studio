import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  new URL('../app/page.tsx', import.meta.url),
  'utf8',
);
const list = source.match(
  /export const PUBLIC_WEBMCP_TOOL_NAMES = \[([\s\S]*?)\] as const;/,
)?.[1];
assert(list, 'public tool list exists');
const names = [...list.matchAll(/'([a-z0-9_]+)'/g)].map((match) => match[1]);
assert.equal(
  names.length,
  27,
  `expected 27 focused public tools, found ${names.length}`,
);
assert.equal(new Set(names).size, 27, 'tool names are unique');
assert.equal(names[0], 'inspect_project');
assert.equal(names.at(-1), 'redo');
assert(
  !names.some((name) => /bone|skeleton|mesh|rig/.test(name)),
  'retired rigging calls must not remain public',
);
assert(
  source.includes('data-tool-ui={name}'),
  'Agent Live renders one contract marker per public tool',
);
assert(
  source.includes('TOOL_GROUPS'),
  'tools are grouped for a scannable agent surface',
);
for (const name of names)
  assert(
    new RegExp(`add\\(\\s*['"]${name}['"]`).test(source),
    `${name} has an executable registration`,
  );
console.log('tool-ui contract: 27/27 focused frame-animation tools pass');
