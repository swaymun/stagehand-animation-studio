import assert from 'node:assert/strict';
import {
  HUMANOID_JOINTED_V1_PART_IDS,
  alphaOverlapDepth,
  anchorResidual,
  createHumanoidJointedTopology,
  defaultMotionProfile,
  silhouetteIou,
  validatePackageV3,
  type AlphaMaskV1,
  type StagehandAssetPackageV3,
} from '../app/rig-v3.ts';

const topology = createHumanoidJointedTopology();
assert.equal(topology.partIds.length, 15);
assert.deepEqual(topology.partIds, [...HUMANOID_JOINTED_V1_PART_IDS]);
assert.equal(topology.attachments.length, 14);
for (const joint of ['left-elbow', 'right-elbow', 'left-knee', 'right-knee']) {
  assert(
    topology.attachments.some((item) => item.jointId === joint),
    `${joint} chain is real`,
  );
}

const valid: StagehandAssetPackageV3 = {
  version: 3,
  atlasWidth: 1000,
  atlasHeight: 1000,
  source: 'manifest',
  sourceAsset: {
    assetId: 'rabbit-atlas',
    immutable: true,
    provenance: { author: 'fixture' },
  },
  deliverables: {
    'assembled-reference': 'rabbit-reference',
    'rig-atlas': 'rabbit-atlas',
  },
  image: { width: 1000, height: 1000, colorspace: 'sRGB', alpha: 'straight' },
  canvasAnchor: { x: 0.5, y: 0.82 },
  motionProfile: defaultMotionProfile(),
  topologyProfile: topology,
  parts: topology.partIds.map((id, index) => ({
    id,
    label: id,
    boneId:
      topology.attachments.find((item) => item.childPartId === id)?.jointId ??
      'root',
    bounds: {
      x: (index % 5) * 0.2,
      y: Math.floor(index / 5) / 3,
      width: 0.18,
      height: 0.3,
    },
    pivot: { x: 0.5, y: 0.25 },
    parentAnchor: { x: 0.5, y: 0.25 },
    drawOrder: index,
    deformationMode: 'segmented',
    x: (index % 5) * 0.2,
    y: Math.floor(index / 5) / 3,
    width: 0.18,
    height: 0.3,
    pivotX: 0.5,
    pivotY: 0.25,
    attachX: 0.5,
    attachY: 0.25,
    confidence: 1,
    zIndex: index,
    overlapPx: 75,
    attachmentMargins: { top: 75, right: 0, bottom: 0, left: 0 },
  })),
  diagnostics: {
    minimumOverlapDepth: 0.25,
    silhouetteIou: 0.95,
    anchorResidual: 0.01,
    restJointCoverage: 0.94,
    stressJointCoverage: 0.86,
    disconnectedComponentsAdded: 0,
    clippedPixels: 0,
    invertedHierarchy: false,
    transparentCorridors: 0,
  },
  alignment: { connected: true, seamCount: 14, minConfidence: 1, warnings: [] },
  skeleton: {
    confidence: 1,
    minCriticalConfidence: 0.8,
    criticalJointIds: [
      'root',
      'left-elbow',
      'right-elbow',
      'left-knee',
      'right-knee',
    ],
  },
};

assert.deepEqual(validatePackageV3(valid), []);
assert.equal(
  validatePackageV3({ ...valid, version: 2 }).at(0)?.code,
  'UNSUPPORTED_PACKAGE_VERSION',
);

for (const [field, value, code] of [
  ['minimumOverlapDepth', 0.19, 'CLEAN_CUT_JOINT'],
  ['silhouetteIou', 0.89, 'RECONSTRUCTION_MISMATCH'],
  ['anchorResidual', 0.021, 'ANCHOR_RESIDUAL'],
  ['restJointCoverage', 0.89, 'REST_JOINT_GAP'],
  ['stressJointCoverage', 0.81, 'STRESS_JOINT_GAP'],
  ['disconnectedComponentsAdded', 1, 'DISCONNECTED_COMPONENT'],
  ['clippedPixels', 1, 'CLIPPED_PIXELS'],
  ['invertedHierarchy', true, 'INVERTED_HIERARCHY'],
  ['transparentCorridors', 1, 'TRANSPARENT_JOINT_CORRIDOR'],
] as const) {
  const pkg = structuredClone(valid);
  (pkg.diagnostics as unknown as Record<string, number | boolean>)[field] =
    value;
  assert(
    validatePackageV3(pkg).some((issue) => issue.code === code),
    code,
  );
}

const missingPart = structuredClone(valid);
missingPart.parts.pop();
assert(
  validatePackageV3(missingPart).some(
    (issue) => issue.code === 'MISSING_CANONICAL_PART',
  ),
);

const badAttachment = structuredClone(valid);
badAttachment.topologyProfile.attachments[0].childPartId = 'missing';
assert(
  validatePackageV3(badAttachment).some(
    (issue) => issue.code === 'INVALID_ATTACHMENT_PART',
  ),
);

const mask = (rows: string[]): AlphaMaskV1 => ({
  width: rows[0].length,
  height: rows.length,
  alpha: rows.flatMap((row) =>
    Array.from(row).map((cell) => (cell === '#' ? 255 : 0)),
  ),
});
const parent = mask(['####', '####', '....', '....']);
const child = mask(['....', '####', '####', '####']);
assert.equal(alphaOverlapDepth(parent, child, 'y'), 0.25);
assert.equal(silhouetteIou(parent, parent), 1);
assert.equal(silhouetteIou(parent, child), 0.25);
assert.equal(
  anchorResidual(
    [
      {
        ...topology.attachments[0],
        parentAnchor: { x: 0.5, y: 0.5 },
        childAnchor: { x: 0.5, y: 0.5 },
      },
    ],
    100,
  ),
  0,
);

console.log('rig-v3 regression: pass');
