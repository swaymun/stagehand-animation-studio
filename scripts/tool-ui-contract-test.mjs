import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  new URL('../app/page.tsx', import.meta.url),
  'utf8',
);
const list = source.match(
  /const PUBLIC_WEBMCP_TOOL_NAMES = \[([\s\S]*?)\] as const;/,
)?.[1];
assert(list, 'public tool list exists');
const names = [...list.matchAll(/'([a-z0-9_]+)'/g)].map((match) => match[1]);
assert.equal(
  names.length,
  40,
  `expected 40 public tools, found ${names.length}`,
);
assert.equal(names[names.indexOf('get_skeleton') + 1], 'edit_skeleton');
assert.equal(new Set(names).size, 40, 'tool names are unique');
for (const name of names) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert(
    new RegExp(`${escapedName}:\\s*toolUi\\(\\s*'${escapedName}'`).test(source),
    `${name} has a typed UI contract`,
  );
  assert(
    source.includes('data-tool-ui={name}'),
    'UI contract markers are rendered',
  );
}
assert(
  source.includes('satisfies Record<PublicWebMcpToolName, ToolUiContract>'),
);
console.log('tool-ui contract: 40/40 pass');
