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
    if (fixture.package?.version !== 3) result.push('PACKAGE_VERSION');
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
  if (fixture.mesh) {
    const vertices = Array.isArray(fixture.mesh.vertices)
      ? fixture.mesh.vertices
      : [];
    for (const vertex of vertices) {
      const total = Array.isArray(vertex.influences)
        ? vertex.influences.reduce(
            (sum, influence) => sum + Number(influence.weight),
            0,
          )
        : 0;
      if (!Number.isFinite(total) || Math.abs(total - 1) > 0.0001) {
        result.push('MESH_WEIGHT_SUM');
        break;
      }
    }
    for (const triangle of fixture.mesh.triangles ?? []) {
      if (
        !Array.isArray(triangle) ||
        triangle.length !== 3 ||
        new Set(triangle).size !== 3 ||
        triangle.some(
          (index) =>
            !Number.isInteger(index) || index < 0 || index >= vertices.length,
        )
      ) {
        result.push('MESH_TRIANGLE_INDEX');
        break;
      }
      const [first, second, third] = triangle.map((index) => vertices[index]);
      const area =
        ((second.x - first.x) * (third.y - first.y) -
          (second.y - first.y) * (third.x - first.x)) /
        2;
      if (Math.abs(area) <= 1e-8) {
        result.push('MESH_REST_DEGENERATE');
        break;
      }
    }
  }
  if (fixture.preview?.flippedCount > 0) result.push('MESH_EVALUATED_FLIPPED');
  if (fixture.reconstruction?.minimumOverlapDepth < 0.2)
    result.push('CLEAN_CUT_JOINT');
  if (fixture.reconstruction?.silhouetteIou < 0.9)
    result.push('RECONSTRUCTION_MISMATCH');
  if (fixture.reconstruction?.anchorResidual > 0.02)
    result.push('ANCHOR_RESIDUAL');
  if (fixture.reconstruction?.restJointCoverage < 0.9)
    result.push('REST_JOINT_GAP');
  if (fixture.reconstruction?.stressJointCoverage < 0.82)
    result.push('STRESS_JOINT_GAP');
  return result;
}

const files = (await readdir(fixtureDir)).filter((file) =>
  file.endsWith('.json'),
);
if (files.length < 15)
  throw new Error(
    `expected at least 15 golden fixtures, found ${files.length}`,
  );

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
  'MeshBindingV1',
  'canvas-lbs-mesh-v1',
  'motion-profile.md',
  'StagehandAssetPackageV3',
  'edit_skeleton',
  '20%',
  'Preserve',
]) {
  if (!skill.includes(required))
    throw new Error(`SKILL.md missing ${required}`);
}

console.log(
  JSON.stringify({ ok: true, fixtureCount: files.length, results }, null, 2),
);
