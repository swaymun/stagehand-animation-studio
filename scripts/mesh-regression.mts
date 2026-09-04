import assert from 'node:assert/strict';
import {
  adaptLegacyMesh,
  affineFromTriangles,
  buildBoneMatrices,
  evaluateMeshVertices,
  invertAffine,
  measureMesh,
  multiplyAffine,
  transformPoint,
  validateMeshBinding,
  type MeshBindingV1,
} from '../app/mesh.ts';

const joints = [
  { id: 'shoulder', x: 10, y: 50 },
  { id: 'elbow', x: 50, y: 50 },
  { id: 'wrist', x: 90, y: 50 },
];
const bones = [
  { id: 'upper-arm', parentJointId: 'shoulder', childJointId: 'elbow' },
  { id: 'lower-arm', parentJointId: 'elbow', childJointId: 'wrist' },
];
const section = [
  { x: 0.1, upper: 1, lower: 0 },
  { x: 0.4, upper: 0.75, lower: 0.25 },
  { x: 0.6, upper: 0.25, lower: 0.75 },
  { x: 0.9, upper: 0, lower: 1 },
];
const vertices = section.flatMap((column, columnIndex) =>
  [0.35, 0.65].map((y, rowIndex) => ({
    id: `v-${columnIndex}-${rowIndex}`,
    x: column.x,
    y,
    u: column.x,
    v: y,
    influences: [
      ...(column.upper > 0
        ? [{ boneId: 'upper-arm', weight: column.upper }]
        : []),
      ...(column.lower > 0
        ? [{ boneId: 'lower-arm', weight: column.lower }]
        : []),
    ],
  })),
);
const fixture: MeshBindingV1 = {
  version: 1,
  id: 'two-bone-arm-proof',
  textureAssetId: 'arm-texture',
  coordinateSpace: 'normalized-image',
  vertices,
  triangles: [
    [0, 2, 1],
    [1, 2, 3],
    [2, 4, 3],
    [3, 4, 5],
    [4, 6, 5],
    [5, 6, 7],
  ],
  zIndex: 0,
  skeletonVersion: 1,
};
const context = {
  assetId: 'arm-texture',
  skeletonVersion: 1,
  boneIds: bones.map((bone) => bone.id),
};

assert.deepEqual(validateMeshBinding(fixture, context), []);

const matrix = affineFromTriangles(
  [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
  ],
  [
    { x: 4, y: 7 },
    { x: 6, y: 7 },
    { x: 4, y: 10 },
  ],
);
assert.ok(matrix);
const inverse = invertAffine(matrix);
assert.ok(inverse);
const identity = multiplyAffine(matrix, inverse);
assert.ok(Math.abs(identity.a - 1) < 1e-9 && Math.abs(identity.d - 1) < 1e-9);
assert.deepEqual(transformPoint(matrix, { x: 1, y: 1 }), { x: 6, y: 10 });

const restBones = buildBoneMatrices(joints, bones, [], 200, 100);
assert.deepEqual(restBones.issues, []);
const rest = evaluateMeshVertices(fixture, restBones.matrices, 200, 100);
assert.deepEqual(rest.issues, []);
fixture.vertices.forEach((vertex, index) => {
  const expected = { x: (vertex.x - 0.5) * 200, y: (vertex.y - 1) * 100 };
  assert.ok(
    Math.hypot(
      rest.points[index].x - expected.x,
      rest.points[index].y - expected.y,
    ) < 0.001,
  );
});
assert.deepEqual(measureMesh(fixture, rest.points, 200, 100), {
  vertexCount: 8,
  triangleCount: 6,
  maximumInfluences: 2,
  maximumWeightSumError: 0,
  degenerateCount: 0,
  flippedCount: 0,
  worstAreaRatio: 1,
});

const bendBones = buildBoneMatrices(
  joints,
  bones,
  [{ boneId: 'lower-arm', rotation: 60, x: 0, y: 0, scale: 1 }],
  200,
  100,
);
const bend = evaluateMeshVertices(fixture, bendBones.matrices, 200, 100);
assert.ok(
  Math.hypot(
    bend.points[6].x - rest.points[6].x,
    bend.points[6].y - rest.points[6].y,
  ) > 20,
);
const bendMetrics = measureMesh(fixture, bend.points, 200, 100);
assert.equal(bendMetrics.degenerateCount, 0);
assert.equal(bendMetrics.flippedCount, 0);

const rooted = buildBoneMatrices(
  joints,
  bones,
  [{ boneId: 'upper-arm', rotation: 30, x: 5, y: -3, scale: 1.2 }],
  200,
  100,
);
const rootPose = rooted.matrices.get('upper-arm');
const childPose = rooted.matrices.get('lower-arm');
assert.ok(rootPose && childPose);
assert.ok(Math.abs(rootPose.start.x - -75) < 1e-9);
assert.ok(Math.abs(rootPose.start.y - -53) < 1e-9);
assert.ok(Math.abs(childPose.scale - 1.2) < 1e-9);
assert.ok(Math.abs(childPose.angle - rootPose.angle) < 1e-9);

const invalidCases: Array<[string, MeshBindingV1, string]> = [
  ['bad index', { ...fixture, triangles: [[0, 1, 99]] }, 'MESH_TRIANGLE_INDEX'],
  [
    'repeated index',
    { ...fixture, triangles: [[0, 1, 1]] },
    'MESH_TRIANGLE_INDEX',
  ],
  [
    'bad weight',
    {
      ...fixture,
      vertices: fixture.vertices.map((vertex, index) =>
        index === 0
          ? { ...vertex, influences: [{ boneId: 'upper-arm', weight: 0.8 }] }
          : vertex,
      ),
    },
    'MESH_WEIGHT_SUM',
  ],
  [
    'missing bone',
    {
      ...fixture,
      vertices: fixture.vertices.map((vertex, index) =>
        index === 0
          ? { ...vertex, influences: [{ boneId: 'missing', weight: 1 }] }
          : vertex,
      ),
    },
    'MESH_MISSING_BONE',
  ],
  [
    'wrong version',
    { ...fixture, skeletonVersion: 2 },
    'MESH_SKELETON_VERSION',
  ],
  [
    'wrong texture',
    { ...fixture, textureAssetId: 'other' },
    'MESH_TEXTURE_MISMATCH',
  ],
  [
    'bad uv',
    {
      ...fixture,
      vertices: fixture.vertices.map((vertex, index) =>
        index === 0 ? { ...vertex, u: 1.1 } : vertex,
      ),
    },
    'MESH_VERTEX_COORDINATES',
  ],
  [
    'degenerate uv triangle',
    {
      ...fixture,
      vertices: fixture.vertices.map((vertex) => ({ ...vertex, v: 0.5 })),
    },
    'MESH_UV_DEGENERATE',
  ],
  [
    'non-finite coordinate',
    {
      ...fixture,
      vertices: fixture.vertices.map((vertex, index) =>
        index === 0 ? { ...vertex, x: Number.NaN } : vertex,
      ),
    },
    'MESH_VERTEX_COORDINATES',
  ],
  [
    'too many influences',
    {
      ...fixture,
      vertices: fixture.vertices.map((vertex, index) =>
        index === 0
          ? {
              ...vertex,
              influences: [
                { boneId: 'upper-arm', weight: 0.2 },
                { boneId: 'lower-arm', weight: 0.2 },
                { boneId: 'upper-arm', weight: 0.2 },
                { boneId: 'lower-arm', weight: 0.2 },
                { boneId: 'upper-arm', weight: 0.2 },
              ],
            }
          : vertex,
      ),
    },
    'MESH_INFLUENCE_CAP',
  ],
  [
    'zero weight',
    {
      ...fixture,
      vertices: fixture.vertices.map((vertex, index) =>
        index === 0
          ? {
              ...vertex,
              influences: [
                { boneId: 'upper-arm', weight: 1 },
                { boneId: 'lower-arm', weight: 0 },
              ],
            }
          : vertex,
      ),
    },
    'MESH_WEIGHT',
  ],
  [
    'degenerate',
    { ...fixture, triangles: [[0, 2, 4]] },
    'MESH_REST_DEGENERATE',
  ],
];
for (const [label, value, code] of invalidCases)
  assert.ok(
    validateMeshBinding(value, context).some((issue) => issue.code === code),
    label,
  );

const flippedPoints = rest.points.map((point) => ({ ...point }));
[flippedPoints[0], flippedPoints[1]] = [flippedPoints[1], flippedPoints[0]];
const flipped = measureMesh(fixture, flippedPoints, 200, 100);
assert.ok(flipped.flippedCount > 0);

const legacy = adaptLegacyMesh({
  assetId: 'arm-texture',
  skeletonVersion: 1,
  vertices: fixture.vertices.map(({ id, x, y }) => ({ id, x, y })),
  weights: fixture.vertices.flatMap((vertex, vertexIndex) =>
    vertex.influences.map((influence) => ({
      vertexId: vertex.id,
      ...influence,
      weight: vertexIndex === 0 ? influence.weight * 2 : influence.weight,
    })),
  ),
  experimentalMesh: {
    status: 'experimental',
    triangles: fixture.triangles,
    uvs: fixture.vertices.map(({ id: vertexId, u, v }) => ({ vertexId, u, v })),
  },
});
assert.ok(legacy);
assert.deepEqual(validateMeshBinding(legacy, context), []);
assert.equal(legacy.vertices[0].influences[0].weight, 1);

console.log(
  JSON.stringify(
    {
      ok: true,
      rest: measureMesh(fixture, rest.points, 200, 100),
      bend: bendMetrics,
    },
    null,
    2,
  ),
);
