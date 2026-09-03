import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL(
  '../.agents/skills/stagehand-asset-rigging/',
  import.meta.url,
);
const fixtureDir = new URL('references/fixtures/', root);

function findings(fixture) {
  const result = [];
  if (fixture.case === 'malformed-package') {
    if (fixture.package?.version !== 2) result.push('PACKAGE_VERSION');
    if (!fixture.package?.sourceAsset?.provenance)
      result.push('SOURCE_PROVENANCE');
    if (
      !Array.isArray(fixture.package?.parts) ||
      fixture.package.parts.length === 0
    )
      result.push('PARTS_REQUIRED');
  }
  if (fixture.preview?.visibleGaps > 0) result.push('VISIBLE_GAPS');
  if (fixture.preview?.excessiveOverlaps > 0) result.push('EXCESSIVE_OVERLAPS');
  if (fixture.preview?.clippedEdges > 0) result.push('CLIPPED_EDGES');
  if (fixture.criticalJoints?.some((joint) => joint.confidence < 0.55))
    result.push('LOW_CONFIDENCE_CRITICAL_JOINT');
  if (
    fixture.basePartIds &&
    JSON.stringify(
      [...fixture.basePartIds].sort((a, b) => a.localeCompare(b)),
    ) !==
      JSON.stringify(
        [...fixture.variantPartIds].sort((a, b) => a.localeCompare(b)),
      )
  )
    result.push('VARIANT_TOPOLOGY_MISMATCH');
  return result;
}

const files = (await readdir(fixtureDir)).filter((file) =>
  file.endsWith('.json'),
);
if (files.length !== 5)
  throw new Error(`expected 5 golden fixtures, found ${files.length}`);

const results = [];
for (const file of files) {
  const fixture = JSON.parse(
    await readFile(join(fixtureDir.pathname, file), 'utf8'),
  );
  const actual = findings(fixture);
  if (JSON.stringify(actual) !== JSON.stringify(fixture.expected)) {
    throw new Error(
      `${String(fixture.case)}: expected ${JSON.stringify(fixture.expected)}, received ${JSON.stringify(actual)}`,
    );
  }
  results.push({ case: fixture.case, findings: actual });
}

const skill = await readFile(new URL('SKILL.md', root), 'utf8');
for (const required of [
  'expectedRevision',
  'idempotencyKey',
  'rendered',
  'segmented',
  'experimental',
  'Preserve',
]) {
  if (!skill.includes(required))
    throw new Error(`SKILL.md missing ${required}`);
}

console.log(
  JSON.stringify({ ok: true, fixtureCount: files.length, results }, null, 2),
);
