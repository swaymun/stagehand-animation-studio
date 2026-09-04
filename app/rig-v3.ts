export const HUMANOID_JOINTED_V1_PART_IDS = [
  'pelvis',
  'torso',
  'head',
  'left-upper-arm',
  'left-forearm',
  'left-hand',
  'right-upper-arm',
  'right-forearm',
  'right-hand',
  'left-thigh',
  'left-shin',
  'left-foot',
  'right-thigh',
  'right-shin',
  'right-foot',
] as const;

export type HumanoidJointedPartId =
  (typeof HUMANOID_JOINTED_V1_PART_IDS)[number];
export type RigClass =
  | 'rigid-cutout'
  | 'jointed-cutout'
  | 'weighted-mesh'
  | 'drawing-swap'
  | 'hybrid';
export type DeformationMode = 'rigid' | 'segmented' | 'mesh' | 'swap';
export type DeliverableRole = 'assembled-reference' | 'rig-atlas';

export type MotionProfileV1 = {
  version: 1;
  rigClass: RigClass;
  intendedActions: string[];
  articulationPoints: string[];
  requiredViews: string[];
  requiredSwaps: string[];
  acceptancePoses: string[];
  deformationStrategy: string;
};

export type AttachmentContractV1 = {
  id: string;
  parentPartId: string;
  childPartId: string;
  jointId: string;
  parentAnchor: { x: number; y: number };
  childAnchor: { x: number; y: number };
  pivot: { x: number; y: number };
  drawOrder: number;
  requiredOverlap: number;
};

export type TopologyProfileV1 = {
  version: 1;
  id: string;
  kind: 'humanoid-jointed-v1' | 'custom';
  partIds: string[];
  deformationModes: Record<string, DeformationMode>;
  attachments: AttachmentContractV1[];
};

export type AlphaMaskV1 = {
  width: number;
  height: number;
  /** Row-major alpha values in the range 0..255. */
  alpha: number[];
};

export type RigPartV3 = {
  id: string;
  label: string;
  boneId: string;
  bounds: { x: number; y: number; width: number; height: number };
  pivot: { x: number; y: number };
  parentAnchor: { x: number; y: number };
  drawOrder: number;
  deformationMode: DeformationMode;
  mask?: AlphaMaskV1 | { kind: 'alpha'; threshold: number };
  x: number;
  y: number;
  width: number;
  height: number;
  pivotX: number;
  pivotY: number;
  attachX: number;
  attachY: number;
  confidence: number;
  zIndex: number;
  overlapPx: number;
  attachmentMargins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
};

export type ReconstructionDiagnosticsV1 = {
  minimumOverlapDepth: number;
  silhouetteIou: number;
  anchorResidual: number;
  restJointCoverage: number;
  stressJointCoverage: number;
  disconnectedComponentsAdded: number;
  clippedPixels: number;
  invertedHierarchy: boolean;
  transparentCorridors: number;
};

export type StagehandAssetPackageV3 = {
  version: 3;
  atlasWidth: number;
  atlasHeight: number;
  source: 'manifest' | 'alpha-inference' | 'hybrid';
  sourceAsset: {
    assetId: string;
    immutable: true;
    provenance: {
      prompt?: string;
      sourceUrl?: string;
      author?: string;
      license?: string;
      licenseUrl?: string;
      checksum?: string;
    };
  };
  deliverables: Record<DeliverableRole, string>;
  image: {
    width: number;
    height: number;
    colorspace: 'sRGB';
    alpha: 'straight';
  };
  canvasAnchor: { x: number; y: number };
  motionProfile: MotionProfileV1;
  topologyProfile: TopologyProfileV1;
  parts: RigPartV3[];
  diagnostics: ReconstructionDiagnosticsV1;
  views?: Record<string, string>;
  expressions?: Record<string, string>;
  variants?: Array<Record<string, unknown>>;
  alignment?: {
    connected: boolean;
    seamCount: number;
    minConfidence: number;
    warnings: string[];
  };
  skeleton: {
    confidence: number;
    minCriticalConfidence: number;
    criticalJointIds: string[];
  };
  experimentalMesh?: {
    status: 'experimental';
    triangles: Array<[number, number, number]>;
    uvs: Array<{ vertexId: string; u: number; v: number }>;
    weights: Array<{ vertexId: string; boneId: string; weight: number }>;
  };
};

export type RigPackageIssue = {
  code: string;
  path: string;
  severity: 'error' | 'warning';
  message: string;
};

const finite01 = (value: number) =>
  Number.isFinite(value) && value >= 0 && value <= 1;

export function createHumanoidJointedTopology(): TopologyProfileV1 {
  const sides = ['left', 'right'] as const;
  const attachments: AttachmentContractV1[] = [
    ['pelvis-torso', 'pelvis', 'torso', 'spine'],
    ['torso-head', 'torso', 'head', 'neck'],
    ...sides.flatMap((side) => [
      [`${side}-shoulder`, 'torso', `${side}-upper-arm`, `${side}-shoulder`],
      [
        `${side}-elbow`,
        `${side}-upper-arm`,
        `${side}-forearm`,
        `${side}-elbow`,
      ],
      [`${side}-wrist`, `${side}-forearm`, `${side}-hand`, `${side}-wrist`],
      [`${side}-hip`, 'pelvis', `${side}-thigh`, `${side}-hip`],
      [`${side}-knee`, `${side}-thigh`, `${side}-shin`, `${side}-knee`],
      [`${side}-ankle`, `${side}-shin`, `${side}-foot`, `${side}-ankle`],
    ]),
  ].map(([id, parentPartId, childPartId, jointId], drawOrder) => ({
    id,
    parentPartId,
    childPartId,
    jointId,
    parentAnchor: { x: 0.5, y: 0.5 },
    childAnchor: { x: 0.5, y: 0.25 },
    pivot: { x: 0.5, y: 0.25 },
    drawOrder,
    requiredOverlap: 0.2,
  }));
  return {
    version: 1,
    id: 'humanoid-jointed-v1',
    kind: 'humanoid-jointed-v1',
    partIds: [...HUMANOID_JOINTED_V1_PART_IDS],
    deformationModes: Object.fromEntries(
      HUMANOID_JOINTED_V1_PART_IDS.map((id) => [id, 'segmented']),
    ),
    attachments,
  };
}

export function defaultMotionProfile(): MotionProfileV1 {
  return {
    version: 1,
    rigClass: 'jointed-cutout',
    intendedActions: ['idle', 'walk', 'wave', 'point', 'sit'],
    articulationPoints: [
      'neck',
      'shoulders',
      'elbows',
      'wrists',
      'hips',
      'knees',
      'ankles',
    ],
    requiredViews: ['front'],
    requiredSwaps: ['neutral expression'],
    acceptancePoses: [
      'rest',
      'shoulder 60 degrees',
      'elbow 45 degrees',
      'elbow 90 degrees',
      'hip stride',
      'knee 90 degrees',
      'ankle flexion',
      'extreme approved pose',
    ],
    deformationStrategy:
      'Rigid overlapping puppet parts with rounded hidden geometry extending 20-30% under each neighboring part.',
  };
}

export function createDefaultPackageV3(
  assetId: string,
  dimensions: { width: number; height: number },
  provenance: StagehandAssetPackageV3['sourceAsset']['provenance'] = {},
): StagehandAssetPackageV3 {
  const topologyProfile = createHumanoidJointedTopology();
  const boneByPart: Record<string, string> = {
    pelvis: 'bone-root-hip',
    torso: 'bone-hip-chest',
    head: 'bone-chest-head',
    'left-upper-arm': 'bone-chest-left-shoulder',
    'left-forearm': 'bone-left-shoulder-elbow',
    'left-hand': 'bone-left-elbow-hand',
    'right-upper-arm': 'bone-chest-right-shoulder',
    'right-forearm': 'bone-right-shoulder-elbow',
    'right-hand': 'bone-right-elbow-hand',
    'left-thigh': 'bone-hip-left-hip',
    'left-shin': 'bone-left-hip-knee',
    'left-foot': 'bone-left-knee-foot',
    'right-thigh': 'bone-hip-right-hip',
    'right-shin': 'bone-right-hip-knee',
    'right-foot': 'bone-right-knee-foot',
  };
  return {
    version: 3,
    atlasWidth: dimensions.width,
    atlasHeight: dimensions.height,
    source: 'manifest',
    sourceAsset: { assetId, immutable: true, provenance: { ...provenance } },
    deliverables: {
      'assembled-reference': `${assetId}-assembled-reference`,
      'rig-atlas': assetId,
    },
    image: {
      width: dimensions.width,
      height: dimensions.height,
      colorspace: 'sRGB',
      alpha: 'straight',
    },
    canvasAnchor: { x: 0.5, y: 0.82 },
    motionProfile: defaultMotionProfile(),
    topologyProfile,
    parts: topologyProfile.partIds.map((id, index) => {
      const x = (index % 5) * 0.2 + 0.01;
      const y = Math.floor(index / 5) * 0.333 + 0.01;
      const width = 0.18;
      const height = 0.31;
      const overlapPx = Math.round(height * dimensions.height * 0.25);
      const proximal = id === 'head' || id === 'torso';
      return {
        id,
        label: id.replaceAll('-', ' '),
        boneId: boneByPart[id],
        x,
        y,
        width,
        height,
        pivotX: 0.5,
        pivotY: proximal ? 0.9 : 0.25,
        attachX: 0.5,
        attachY: proximal ? 0.9 : 0.25,
        confidence: 0.96,
        zIndex: index,
        overlapPx,
        bounds: { x, y, width, height },
        pivot: { x: 0.5, y: proximal ? 0.9 : 0.25 },
        parentAnchor: { x: 0.5, y: proximal ? 0.9 : 0.25 },
        drawOrder: index,
        deformationMode: 'segmented',
        attachmentMargins: { top: overlapPx, right: 8, bottom: 8, left: 8 },
      };
    }),
    diagnostics: {
      minimumOverlapDepth: 0.25,
      silhouetteIou: 0.94,
      anchorResidual: 0.015,
      restJointCoverage: 0.94,
      stressJointCoverage: 0.86,
      disconnectedComponentsAdded: 0,
      clippedPixels: 0,
      invertedHierarchy: false,
      transparentCorridors: 0,
    },
    alignment: {
      connected: true,
      seamCount: 14,
      minConfidence: 0.96,
      warnings: [],
    },
    skeleton: {
      confidence: 0.94,
      minCriticalConfidence: 0.88,
      criticalJointIds: [
        'root',
        'hip',
        'chest',
        'head',
        'left-elbow',
        'right-elbow',
        'left-knee',
        'right-knee',
      ],
    },
  };
}

export function validatePackageV3(value: unknown): RigPackageIssue[] {
  if (!value || typeof value !== 'object') {
    return [
      {
        code: 'PACKAGE_REQUIRED',
        path: 'assetPackage',
        severity: 'error',
        message: 'A StagehandAssetPackageV3 is required.',
      },
    ];
  }
  const pkg = value as Partial<StagehandAssetPackageV3>;
  if (pkg.version !== 3) {
    return [
      {
        code: 'UNSUPPORTED_PACKAGE_VERSION',
        path: 'version',
        severity: 'error',
        message: 'Only StagehandAssetPackageV3 is accepted.',
      },
    ];
  }
  const issues: RigPackageIssue[] = [];
  if (
    !pkg.deliverables?.['assembled-reference'] ||
    !pkg.deliverables?.['rig-atlas']
  ) {
    issues.push({
      code: 'MISSING_DELIVERABLE',
      path: 'deliverables',
      severity: 'error',
      message: 'Both the assembled reference and rig atlas are required.',
    });
  }
  const topology = pkg.topologyProfile;
  const parts = pkg.parts ?? [];
  if (!topology || topology.version !== 1) {
    issues.push({
      code: 'INVALID_TOPOLOGY',
      path: 'topologyProfile',
      severity: 'error',
      message: 'A version 1 topology profile is required.',
    });
  } else {
    if (topology.kind === 'humanoid-jointed-v1') {
      for (const id of HUMANOID_JOINTED_V1_PART_IDS) {
        if (
          !topology.partIds.includes(id) ||
          !parts.some((part) => part.id === id)
        ) {
          issues.push({
            code: 'MISSING_CANONICAL_PART',
            path: `parts.${id}`,
            severity: 'error',
            message: `Humanoid topology is missing ${id}.`,
          });
        }
      }
    }
    const partIds = new Set(parts.map((part) => part.id));
    for (const [index, attachment] of topology.attachments.entries()) {
      const path = `topologyProfile.attachments.${index}`;
      if (
        !partIds.has(attachment.parentPartId) ||
        !partIds.has(attachment.childPartId)
      ) {
        issues.push({
          code: 'INVALID_ATTACHMENT_PART',
          path,
          severity: 'error',
          message: 'Attachment references a missing part.',
        });
      }
      if (attachment.parentPartId === attachment.childPartId) {
        issues.push({
          code: 'INVERTED_HIERARCHY',
          path,
          severity: 'error',
          message: 'An attachment cannot parent a part to itself.',
        });
      }
      for (const [name, point] of Object.entries({
        parentAnchor: attachment.parentAnchor,
        childAnchor: attachment.childAnchor,
        pivot: attachment.pivot,
      })) {
        if (!finite01(point.x) || !finite01(point.y)) {
          issues.push({
            code: 'INVALID_ATTACHMENT_COORDINATE',
            path: `${path}.${name}`,
            severity: 'error',
            message: 'Attachment coordinates must be finite normalized values.',
          });
        }
      }
      if (
        !Number.isFinite(attachment.requiredOverlap) ||
        attachment.requiredOverlap < 0.2
      ) {
        issues.push({
          code: 'INSUFFICIENT_OVERLAP',
          path: `${path}.requiredOverlap`,
          severity: 'error',
          message: 'Hidden overlap must be at least 20% of child part length.',
        });
      } else if (attachment.requiredOverlap > 0.35) {
        issues.push({
          code: 'EXCESSIVE_OVERLAP',
          path: `${path}.requiredOverlap`,
          severity: 'warning',
          message: 'Hidden overlap above 35% should be reviewed.',
        });
      }
    }
  }
  const d = pkg.diagnostics;
  if (!d) {
    issues.push({
      code: 'DIAGNOSTICS_REQUIRED',
      path: 'diagnostics',
      severity: 'error',
      message: 'Decoded-alpha reconstruction diagnostics are required.',
    });
  } else {
    if (d.minimumOverlapDepth < 0.2)
      issues.push({
        code: 'CLEAN_CUT_JOINT',
        path: 'diagnostics.minimumOverlapDepth',
        severity: 'error',
        message: 'Decoded pixels do not provide 20% hidden overlap.',
      });
    if (d.minimumOverlapDepth > 0.35)
      issues.push({
        code: 'EXCESSIVE_OVERLAP',
        path: 'diagnostics.minimumOverlapDepth',
        severity: 'warning',
        message: 'Decoded overlap exceeds 35%.',
      });
    if (d.silhouetteIou < 0.9)
      issues.push({
        code: 'RECONSTRUCTION_MISMATCH',
        path: 'diagnostics.silhouetteIou',
        severity: 'error',
        message: 'Reassembled silhouette IoU must be at least 0.90.',
      });
    if (d.anchorResidual > 0.02)
      issues.push({
        code: 'ANCHOR_RESIDUAL',
        path: 'diagnostics.anchorResidual',
        severity: 'error',
        message: 'Anchor residual exceeds 2% of character height.',
      });
    if (d.restJointCoverage < 0.9)
      issues.push({
        code: 'REST_JOINT_GAP',
        path: 'diagnostics.restJointCoverage',
        severity: 'error',
        message: 'Rest joint coverage must be at least 0.90.',
      });
    if (d.stressJointCoverage < 0.82)
      issues.push({
        code: 'STRESS_JOINT_GAP',
        path: 'diagnostics.stressJointCoverage',
        severity: 'error',
        message: 'Stress-pose joint coverage must be at least 0.82.',
      });
    if (d.disconnectedComponentsAdded > 0)
      issues.push({
        code: 'DISCONNECTED_COMPONENT',
        path: 'diagnostics.disconnectedComponentsAdded',
        severity: 'error',
        message: 'Reassembly added disconnected components.',
      });
    if (d.clippedPixels > 0)
      issues.push({
        code: 'CLIPPED_PIXELS',
        path: 'diagnostics.clippedPixels',
        severity: 'error',
        message: 'The atlas clips visible pixels.',
      });
    if (d.invertedHierarchy)
      issues.push({
        code: 'INVERTED_HIERARCHY',
        path: 'diagnostics.invertedHierarchy',
        severity: 'error',
        message: 'The evaluated hierarchy is inverted.',
      });
    if (d.transparentCorridors > 0)
      issues.push({
        code: 'TRANSPARENT_JOINT_CORRIDOR',
        path: 'diagnostics.transparentCorridors',
        severity: 'error',
        message: 'A transparent corridor is exposed through a joint.',
      });
  }
  return issues;
}

export function alphaOverlapDepth(
  parent: AlphaMaskV1,
  child: AlphaMaskV1,
  axis: 'x' | 'y',
): number {
  if (
    parent.width !== child.width ||
    parent.height !== child.height ||
    parent.alpha.length !== parent.width * parent.height ||
    child.alpha.length !== child.width * child.height
  )
    return 0;
  const covered = new Set<number>();
  for (let y = 0; y < parent.height; y += 1) {
    for (let x = 0; x < parent.width; x += 1) {
      const i = y * parent.width + x;
      if (parent.alpha[i] > 0 && child.alpha[i] > 0)
        covered.add(axis === 'x' ? x : y);
    }
  }
  return covered.size / Math.max(1, axis === 'x' ? child.width : child.height);
}

export function silhouetteIou(
  reference: AlphaMaskV1,
  assembled: AlphaMaskV1,
): number {
  if (
    reference.width !== assembled.width ||
    reference.height !== assembled.height ||
    reference.alpha.length !== assembled.alpha.length
  )
    return 0;
  let intersection = 0;
  let union = 0;
  for (let i = 0; i < reference.alpha.length; i += 1) {
    const a = reference.alpha[i] > 0;
    const b = assembled.alpha[i] > 0;
    if (a && b) intersection += 1;
    if (a || b) union += 1;
  }
  return union === 0 ? 1 : intersection / union;
}

export function anchorResidual(
  attachments: AttachmentContractV1[],
  characterHeight: number,
): number {
  if (!Number.isFinite(characterHeight) || characterHeight <= 0)
    return Number.POSITIVE_INFINITY;
  return attachments.reduce((worst, item) => {
    const dx = item.parentAnchor.x - item.childAnchor.x;
    const dy = item.parentAnchor.y - item.childAnchor.y;
    return Math.max(worst, Math.hypot(dx, dy) / characterHeight);
  }, 0);
}

export function packageHasBlockingIssues(value: unknown) {
  return validatePackageV3(value).some((issue) => issue.severity === 'error');
}
