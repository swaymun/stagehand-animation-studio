'use client';

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowUpRight,
  CircleHelp,
  Clapperboard,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CopyPlus,
  Film,
  FolderOpen,
  Grid2X2,
  Hand,
  Image as ImageIcon,
  Layers3,
  Lock,
  Maximize2,
  MoreHorizontal,
  MousePointer2,
  Pause,
  Play,
  Pencil,
  Redo2,
  RotateCcw,
  Save,
  Scissors,
  Settings2,
  Sparkles,
  SquareDashedMousePointer,
  Trash2,
  Undo2,
  Upload,
  Volume2,
  WandSparkles,
  X,
  ZoomIn,
} from 'lucide-react';
import {
  adaptLegacyMesh,
  affineFromTriangles,
  buildBoneMatrices,
  evaluateMeshVertices,
  expandTriangle,
  measureMesh,
  validateMeshBinding,
  type MeshBindingV1,
  type MeshIssue,
  type MeshMetrics,
  type Point2,
} from './mesh';

type Pose = 'idle' | 'nervous' | 'wave' | 'lean-in' | 'point' | 'shrug';
type AssetKind = 'rigged-character' | 'background' | 'prop' | 'audio';
type AssetFrameLayout = 'single' | 'four-column' | 'parts-sheet';
type AssetSource =
  | 'starter'
  | 'placeholder'
  | 'imported'
  | 'generated'
  | 'bundled';
type ReviewStatus = 'draft' | 'pending-review' | 'approved' | 'rejected';
type BindingMethod = 'rigid' | 'segmented' | 'mesh';
type AssetVariantKind = 'base' | 'view' | 'pose' | 'expression' | 'motion';
type ViewDirection = 'front' | 'three-quarter' | 'profile' | 'back';
type MotionClipKind =
  | 'idle'
  | 'walk-in'
  | 'walk-cycle'
  | 'stop'
  | 'turn'
  | 'lean'
  | 'wave'
  | 'point'
  | 'shrug'
  | 'surprise'
  | 'embarrassed'
  | 'pleased';
type AssetRole = 'hero' | 'support' | 'environment' | 'accent';
type AssetTreatment = 'paper' | 'inked' | 'flat-color' | 'photo';
type AssetSilhouette = 'clear' | 'detailed';
type AssetStyle = {
  role: AssetRole;
  treatment: AssetTreatment;
  silhouette: AssetSilhouette;
  palette: string[];
  notes: string;
};
type TemplateId =
  | 'first-meeting'
  | 'coffee-spill'
  | 'wrong-booth'
  | 'the-apology';
type Asset = {
  id: string;
  kind: AssetKind;
  label: string;
  brief?: string;
  source: AssetSource;
  frameLayout?: AssetFrameLayout;
  mimeType?: string;
  dataUrl?: string;
  frameCount?: number;
  variantOf?: string;
  variantKind?: AssetVariantKind;
  viewDirection?: ViewDirection;
  poseVariant?: Pose;
  expression?: 'neutral' | 'surprised' | 'embarrassed' | 'pleased';
  rigManifest?: RigManifest;
  assetPackage?: StagehandAssetPackageV2;
  packageIssues?: string[];
  dimensions?: { width: number; height: number };
  transparencyStatus?: 'yes' | 'no' | 'unknown';
  detectedLayout?: AssetFrameLayout;
  style?: AssetStyle;
  reviewStatus?: ReviewStatus;
  generationRequestId?: string;
  provenance?: {
    prompt?: string;
    sourceUrl?: string;
    author?: string;
    license?: string;
    licenseUrl?: string;
    checksum?: string;
  };
  mediaDurationMs?: number;
  loopable?: boolean;
};
type AudioCueKind = 'music' | 'footstep' | 'stinger';
type AudioCue = {
  id: string;
  kind: AudioCueKind;
  label: string;
  start: number;
  end: number;
  volume: number;
  assetId?: string;
  loop?: boolean;
};
type Character = {
  id: string;
  name: string;
  color: string;
  assetId?: string;
  variantId?: string;
  x: number;
  y: number;
  rotation: number;
  pose: Pose;
};
type Keyframe = {
  id: string;
  characterId: string;
  time: number;
  x: number;
  y: number;
  rotation: number;
  pose: Pose;
  variantId?: string;
};
type PropKeyframe = {
  id: string;
  assetId: string;
  time: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};
type CameraKeyframe = {
  id: string;
  time: number;
  zoom: number;
  panX: number;
  panY: number;
  rotation: number;
};
type AssetGenerationRequest = {
  id: string;
  kind: Exclude<AssetKind, 'audio'>;
  label: string;
  targetCharacterId?: string;
  bindingMethod?: BindingMethod;
  variantKind?: AssetVariantKind;
  viewDirection?: ViewDirection;
  pose?: Pose;
  expression?: string;
  prompt: string;
  checklist: string[];
  status: 'pending' | 'attached' | 'approved' | 'rejected';
  createdAt: string;
};
type SkeletonJoint = {
  id: string;
  parentId?: string;
  label: string;
  x: number;
  y: number;
  radius: number;
  confidence: number;
  locked: boolean;
};
type SkeletonBone = {
  id: string;
  parentJointId: string;
  childJointId: string;
  length: number;
  angleMin: number;
  angleMax: number;
};
type SkeletonBinding = {
  assetId: string;
  method: BindingMethod;
  sourceWidth: number;
  sourceHeight: number;
  regions?: Array<{
    id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    targetX?: number;
    targetY?: number;
    targetWidth?: number;
    targetHeight?: number;
    boneId?: string;
    pivotX?: number;
    pivotY?: number;
    attachX?: number;
    attachY?: number;
    confidence?: number;
    zIndex?: number;
    overlapPx?: number;
  }>;
  vertices?: Array<{ id: string; x: number; y: number }>;
  weights?: Array<{ vertexId: string; boneId: string; weight: number }>;
  mesh?: MeshBindingV1;
};
type StagehandAssetPackageV2 = {
  version: 2;
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
  image: {
    width: number;
    height: number;
    colorspace: 'sRGB';
    alpha: 'straight';
  };
  canvasAnchor: { x: number; y: number };
  parts: Array<{
    id: string;
    label: string;
    boneId: string;
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
    mask: { kind: 'alpha'; threshold: number };
    bounds: { x: number; y: number; width: number; height: number };
    pivot: { x: number; y: number };
    parentAnchor: { x: number; y: number };
    attachmentMargins: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  }>;
  views?: Partial<Record<ViewDirection, string>>;
  expressions?: Partial<
    Record<'neutral' | 'surprised' | 'embarrassed' | 'pleased', string>
  >;
  variants?: Array<{
    id: string;
    kind: AssetVariantKind;
    label: string;
    assetId?: string;
    viewDirection?: ViewDirection;
    pose?: Pose;
    expression?: string;
  }>;
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
type RigManifest = StagehandAssetPackageV2;
type RigPreviewPoseReport = {
  id: string;
  label: string;
  alphaPixels: number;
  significantComponents: number;
  visibleGaps: number;
  excessiveOverlaps: number;
  clippedEdges: number;
  disconnectedAlphaIslands: number;
  invertedLimbs: string[];
  invalidDrawOrder: string[];
  coordinateMismatches: string[];
  meshMetrics?: MeshMetrics;
  renderer: 'canvas-alpha-v1' | 'canvas-lbs-mesh-v1';
  fallbackUsed: boolean;
  passed: boolean;
};
type RigPreviewReport = {
  passed: boolean;
  renderer: 'canvas-alpha-v1' | 'canvas-lbs-mesh-v1';
  poses: RigPreviewPoseReport[];
  blockedReasons: string[];
  meshMetrics?: MeshMetrics;
  fallbackUsed: boolean;
};
type Skeleton = {
  id: string;
  label: string;
  assetId: string;
  rootJointId: string;
  joints: SkeletonJoint[];
  bones: SkeletonBone[];
  binding: SkeletonBinding;
  reviewStatus: ReviewStatus;
  version: number;
};
type BoneTransform = {
  boneId: string;
  rotation: number;
  x: number;
  y: number;
  scale: number;
};
type BoneKeyframe = {
  id: string;
  sceneId: string;
  skeletonId: string;
  time: number;
  transforms: BoneTransform[];
};
type MotionClip = {
  id: string;
  label: string;
  kind: MotionClipKind;
  durationMs: number;
  loop: boolean;
  easing: 'linear' | 'ease-in-out' | 'hold';
  transforms: Array<{
    time: number;
    transforms: BoneTransform[];
    variantId?: string;
  }>;
  description: string;
};
type Caption = {
  id: string;
  text: string;
  start: number;
  end: number;
  speaker: string;
};
type SceneMeta = {
  id: string;
  title: string;
  description: string;
  duration: number;
  templateId?: TemplateId;
  characters?: Character[];
  keyframes?: Keyframe[];
  propKeyframes?: PropKeyframe[];
  cameraKeyframes?: CameraKeyframe[];
  captions?: Caption[];
  audioCues?: AudioCue[];
  boneKeyframes?: BoneKeyframe[];
  lockedTrackIds?: string[];
  motionClipIds?: string[];
};
type StoryBeat = {
  id: string;
  index: string;
  title: string;
  description: string;
  startMs: number;
  endMs: number;
};
type StyleBible = {
  construction: string;
  motion: string;
  camera: string;
  palette: string[];
  notes: string;
};
type Project = {
  name: string;
  revision: number;
  duration: number;
  currentTime: number;
  fps: number;
  renderWidth: number;
  renderHeight: number;
  selectedId: string;
  lockedTrackIds: string[];
  characters: Character[];
  keyframes: Keyframe[];
  propKeyframes: PropKeyframe[];
  cameraKeyframes: CameraKeyframe[];
  captions: Caption[];
  audioCues: AudioCue[];
  assets: Asset[];
  assetRequests: AssetGenerationRequest[];
  skeletons: Skeleton[];
  boneKeyframes: BoneKeyframe[];
  motionClips: MotionClip[];
  storyboardBeats: StoryBeat[];
  styleBible: StyleBible;
  scenes: SceneMeta[];
  activeSceneId: string;
  templateId?: TemplateId;
  dirty: boolean;
};
type ValidationIssue = {
  code: string;
  severity: 'error' | 'warning';
  path: string;
  message: string;
};
type ModelTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: Record<string, unknown>) => unknown;
};
type ModelContext = {
  registerTool: (
    tool: ModelTool,
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
};
const PUBLIC_WEBMCP_TOOL_NAMES = [
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
] as const;
const PUBLIC_WEBMCP_TOOL_SET = new Set<string>(PUBLIC_WEBMCP_TOOL_NAMES);
type TimelineMark = {
  time: number;
  id: string;
  kind: 'camera' | 'character' | 'prop' | 'cue';
  characterId?: string;
  assetId?: string;
  label: string;
};
type TimelineEvent = {
  start: number;
  end: number;
  label: string;
};
const STORAGE_KEY = 'stagehand-paper-cutout-comedy-v1';
const starterScenes: SceneMeta[] = [
  {
    id: 'scene-01',
    title: 'Diner · first meeting',
    description: 'Alice waits. Bob arrives behind her.',
    duration: 15000,
    templateId: 'first-meeting',
  },
];
function defaultAssetStyle(kind: AssetKind): AssetStyle {
  return kind === 'rigged-character'
    ? {
        role: 'hero',
        treatment: 'paper',
        silhouette: 'clear',
        palette: ['coral', 'diner teal'],
        notes: 'Keep the silhouette readable during pose changes.',
      }
    : kind === 'background'
      ? {
          role: 'environment',
          treatment: 'paper',
          silhouette: 'clear',
          palette: ['warm paper', 'diner teal'],
          notes: 'Protect negative space for blocking and captions.',
        }
      : kind === 'prop'
        ? {
            role: 'accent',
            treatment: 'flat-color',
            silhouette: 'clear',
            palette: ['mustard', 'amber'],
            notes: 'Use one readable silhouette for the business beat.',
          }
        : {
            role: 'support',
            treatment: 'flat-color',
            silhouette: 'detailed',
            palette: ['violet'],
            notes: 'Keep the cue supportive and below the dialogue mix.',
          };
}

function assetTreatmentFilter(asset?: Asset) {
  switch (asset?.style?.treatment) {
    case 'inked':
      return 'grayscale(0.12) saturate(0.78) contrast(1.28)';
    case 'flat-color':
      return 'saturate(1.42) contrast(1.08)';
    case 'photo':
      return 'saturate(0.94) contrast(1.03)';
    case 'paper':
      return 'saturate(0.84) contrast(1.05) brightness(1.02)';
    default:
      return 'none';
  }
}

function paletteColor(value: string) {
  const colors: Record<string, string> = {
    amber: '#e3a847',
    coral: '#e56b52',
    'diner teal': '#32748f',
    mustard: '#d9a53b',
    violet: '#825291',
    'warm paper': '#e9d6b8',
  };
  return colors[value.trim().toLowerCase()] ?? '#b8ada1';
}

const starterAssets: Asset[] = [
  {
    id: 'alice',
    kind: 'rigged-character',
    label: 'Alice · v2 rig pack',
    brief:
      'Warm coral paper protagonist; keep her silhouette clear for awkward reactions.',
    source: 'generated',
    frameLayout: 'parts-sheet',
    detectedLayout: 'parts-sheet',
    dataUrl: '/assets/alice-parts-v2.png',
    reviewStatus: 'approved',
    transparencyStatus: 'yes',
    dimensions: { width: 1536, height: 1024 },
    provenance: {
      prompt:
        'Transparent coral paper-cutout Alice v2 rig-ready parts sheet with shoulder and hip overlap, generated for the Stagehand demo pack.',
      author: 'OpenAI ImageGen',
      checksum:
        '27c235ad1c2377e7af7c7ac5ae478c2605469816c918b8153cc1adb33de8ffa4',
    },
    variantKind: 'base',
    rigManifest: rigManifestForAsset('alice'),
    style: defaultAssetStyle('rigged-character'),
  },
  {
    id: 'bob',
    kind: 'rigged-character',
    label: 'Bob · v2 rig pack',
    brief:
      'Diner teal foil character; enters from upstage with a readable lean-in.',
    source: 'generated',
    frameLayout: 'parts-sheet',
    detectedLayout: 'parts-sheet',
    dataUrl: '/assets/bob-parts-v2.png',
    reviewStatus: 'approved',
    transparencyStatus: 'yes',
    dimensions: { width: 1536, height: 1024 },
    provenance: {
      prompt:
        'Transparent teal paper-cutout Bob v2 rig-ready parts sheet with shoulder and hip overlap, generated for the Stagehand demo pack.',
      author: 'OpenAI ImageGen',
      checksum:
        '33cc8dfe886d1b318b6eb1921bd895ea292f2f2ce35ad9b2b768a2464041b85e',
    },
    variantKind: 'base',
    rigManifest: rigManifestForAsset('bob'),
    style: {
      ...defaultAssetStyle('rigged-character'),
      palette: ['diner teal', 'warm paper'],
    },
  },
  ...(
    [
      [
        'alice',
        'embarrassed',
        'Alice · embarrassed expression',
        '/assets/alice-expression-embarrassed-v2.png',
        'e2bdfcd69a54341214fad3a7927c65f0198783893fc408ff194ac4d1ea024a31',
      ],
      [
        'alice',
        'surprised',
        'Alice · surprised expression',
        '/assets/alice-expression-surprised-v2.png',
        'e75cb92d3161fa0da5e0b2a801010ef7c476efa3bd4784ce5dd9d37fe5b50da0',
      ],
      [
        'alice',
        'pleased',
        'Alice · pleased expression',
        '/assets/alice-expression-pleased-v2.png',
        '0cbf65b02192a178a9397b91fd299c2b10d64e1ddc14c8f6659f7a004daf5a84',
      ],
      [
        'bob',
        'embarrassed',
        'Bob · embarrassed expression',
        '/assets/bob-expression-embarrassed-v2.png',
        'af0900ce609911b0563d5881dd2714bba4fdbee87e488a425eedbcc1813afd6d',
      ],
      [
        'bob',
        'surprised',
        'Bob · surprised expression',
        '/assets/bob-expression-surprised-v2.png',
        '946784bc176938ae68a590a5004ce8a3a36b73bba50910fde91d9abd8ff798a6',
      ],
      [
        'bob',
        'pleased',
        'Bob · pleased expression',
        '/assets/bob-expression-pleased-v2.png',
        '697d743ed4ffca287bebd1cc7d651d09fd3b420345eeba4bddef4c37b0210b24',
      ],
    ] as const
  ).map(([parent, expression, label, dataUrl, checksum]) => ({
    id: `${parent}-${expression}-v2`,
    kind: 'rigged-character' as const,
    label,
    source: 'generated' as const,
    frameLayout: 'single' as const,
    dataUrl,
    variantOf: parent,
    variantKind: 'expression' as const,
    expression: expression as Asset['expression'],
    reviewStatus: 'approved' as const,
    transparencyStatus: 'yes' as const,
    dimensions: { width: 615, height: 639 },
    provenance: { author: 'OpenAI ImageGen', checksum },
    style: defaultAssetStyle('rigged-character'),
  })),
  ...(
    [
      [
        'alice',
        'Alice · three-quarter view',
        '/assets/alice-view-three-quarter-v2.png',
        '37e1113b7d5161504b7ea23fd1a26ac1d55b90b854d5c812c644bf0867a504b8',
      ],
      [
        'bob',
        'Bob · three-quarter view',
        '/assets/bob-view-three-quarter-v2.png',
        'cb3eaf61cced4fc086e07688c8de776a9f3171ed12a974072cc5a06a95850f71',
      ],
    ] as const
  ).map(([parent, label, dataUrl, checksum]) => ({
    id: `${parent}-three-quarter-v2`,
    kind: 'rigged-character' as const,
    label,
    source: 'generated' as const,
    frameLayout: 'single' as const,
    dataUrl,
    variantOf: parent,
    variantKind: 'view' as const,
    viewDirection: 'three-quarter' as const,
    reviewStatus: 'approved' as const,
    transparencyStatus: 'yes' as const,
    dimensions: { width: 612, height: 642 },
    provenance: { author: 'OpenAI ImageGen', checksum },
    style: defaultAssetStyle('rigged-character'),
  })),
  {
    id: 'diner-background',
    kind: 'background',
    label: 'Diner background',
    brief:
      'Warm late-night diner backdrop; leave the lower third open for captions.',
    source: 'starter',
    frameLayout: 'single',
    style: defaultAssetStyle('background'),
  },
  {
    id: 'coffee-mug',
    kind: 'prop',
    label: 'Coffee mug',
    brief:
      'Small amber prop for the coffee-spill business and close reaction beats.',
    source: 'starter',
    frameLayout: 'single',
    style: defaultAssetStyle('prop'),
  },
  {
    id: 'audio-simple-loop',
    kind: 'audio',
    label: 'Late-night loop',
    source: 'bundled',
    mimeType: 'audio/ogg',
    dataUrl: '/audio/simple-loop.ogg',
    mediaDurationMs: 120000,
    loopable: true,
    provenance: {
      sourceUrl:
        'https://opengameart.org/content/simple-menubackground-music-loop',
      author: 'polosik',
      license: 'CC0',
      licenseUrl: 'https://creativecommons.org/public-domain/cc0',
      checksum:
        '31ffea0b986eaba7f3f5c3ddf50dc2f68f51085a7a232cc346af6af722b72550',
    },
    style: defaultAssetStyle('audio'),
  },
  {
    id: 'audio-othercenter',
    kind: 'audio',
    label: 'Other Center loop',
    source: 'bundled',
    mimeType: 'audio/ogg',
    dataUrl: '/audio/othercenter.ogg',
    mediaDurationMs: 30000,
    loopable: true,
    provenance: {
      sourceUrl: 'https://opengameart.org/content/other-center',
      author: 'zesona / Chris Murphy',
      license: 'CC0',
      licenseUrl: 'https://creativecommons.org/public-domain/cc0',
      checksum:
        '0301701eca84af4580d23007100254a87747c0fcef819ea97101ec8fd79b1c6b',
    },
    style: defaultAssetStyle('audio'),
  },
  {
    id: 'audio-pop-1',
    kind: 'audio',
    label: 'Paper pop 01',
    source: 'bundled',
    mimeType: 'audio/ogg',
    dataUrl: '/audio/pop-1.ogg',
    mediaDurationMs: 500,
    loopable: false,
    provenance: {
      sourceUrl: 'https://opengameart.org/content/pop-sounds',
      author: 'cogitollc',
      license: 'CC0',
      licenseUrl: 'https://creativecommons.org/public-domain/cc0',
      checksum:
        'a00ec6f278e2237d1b95dd0a53dfd2398ea44a7497794b38ab4b28602573d763',
    },
    style: defaultAssetStyle('audio'),
  },
  {
    id: 'audio-pop-2',
    kind: 'audio',
    label: 'Paper pop 02',
    source: 'bundled',
    mimeType: 'audio/ogg',
    dataUrl: '/audio/pop-2.ogg',
    mediaDurationMs: 500,
    loopable: false,
    provenance: {
      sourceUrl: 'https://opengameart.org/content/pop-sounds',
      author: 'cogitollc',
      license: 'CC0',
      licenseUrl: 'https://creativecommons.org/public-domain/cc0',
      checksum:
        '6fb961237268cff437924e3ac48edc0a3da966a20b86b6c10d17e22d947ca2dd',
    },
    style: defaultAssetStyle('audio'),
  },
];
const starterCameraKeyframes: CameraKeyframe[] = [
  {
    id: 'cam-0000',
    time: 0,
    zoom: 1,
    panX: 0,
    panY: 0,
    rotation: 0,
  },
  {
    id: 'cam-1550',
    time: 1550,
    zoom: 1,
    panX: 0,
    panY: 0,
    rotation: 0,
  },
  {
    id: 'cam-3100',
    time: 3100,
    zoom: 1.16,
    panX: -4,
    panY: 1,
    rotation: 0,
  },
  {
    id: 'cam-4000',
    time: 4000,
    zoom: 1.16,
    panX: -4,
    panY: 1,
    rotation: 0,
  },
  {
    id: 'cam-5000',
    time: 5000,
    zoom: 1,
    panX: 0,
    panY: 0,
    rotation: 0,
  },
  {
    id: 'cam-7000',
    time: 7000,
    zoom: 1.16,
    panX: -4,
    panY: 1,
    rotation: 0,
  },
  {
    id: 'cam-9800',
    time: 9800,
    zoom: 1.3,
    panX: 1,
    panY: 0,
    rotation: 0,
  },
  {
    id: 'cam-12000',
    time: 12000,
    zoom: 1.08,
    panX: 0,
    panY: 0,
    rotation: 0,
  },
  {
    id: 'cam-15000',
    time: 15000,
    zoom: 1,
    panX: 0,
    panY: 0,
    rotation: 0,
  },
];
const storyboardBeats: StoryBeat[] = [
  {
    id: 'beat-01',
    index: '01',
    title: 'The wait',
    description: 'Alice practices what to say.',
    startMs: 0,
    endMs: 1550,
  },
  {
    id: 'beat-02',
    index: '02',
    title: 'The entrance',
    description: 'Bob arrives behind her.',
    startMs: 1550,
    endMs: 3100,
  },
  {
    id: 'beat-03',
    index: '03',
    title: 'The pause',
    description: 'Neither knows what to do.',
    startMs: 3100,
    endMs: 5000,
  },
  {
    id: 'beat-04',
    index: '04',
    title: 'The spill',
    description: 'A tiny accident makes the silence worse.',
    startMs: 5000,
    endMs: 7000,
  },
  {
    id: 'beat-05',
    index: '05',
    title: 'The recovery',
    description: 'They attempt a normal conversation.',
    startMs: 7000,
    endMs: 10000,
  },
  {
    id: 'beat-06',
    index: '06',
    title: 'A second chance',
    description: 'One honest sentence finally lands.',
    startMs: 10000,
    endMs: 15000,
  },
];
const starterStyleBible: StyleBible = {
  construction: 'paper-cutout',
  motion: 'limited · snappy',
  camera: 'reaction cut',
  palette: ['coral', 'diner teal', 'mustard', 'warm paper'],
  notes: 'Keep silhouettes readable and leave room for captions.',
};
const starterTemplates: Array<{
  id: TemplateId;
  title: string;
  description: string;
  tag: string;
}> = [
  {
    id: 'first-meeting',
    title: 'First meeting',
    description: 'Alice waits. Bob arrives behind her.',
    tag: 'canonical',
  },
  {
    id: 'coffee-spill',
    title: 'Coffee spill',
    description: 'A tiny accident makes the silence worse.',
    tag: 'reaction',
  },
  {
    id: 'wrong-booth',
    title: 'Wrong booth',
    description: 'They both thought the other picked the table.',
    tag: 'blocking',
  },
  {
    id: 'the-apology',
    title: 'The apology',
    description: 'One sentence arrives much too late.',
    tag: 'caption-led',
  },
];
const starterAudioCues: AudioCue[] = [
  {
    id: 'music-low',
    kind: 'music',
    label: 'Quiet diner bed',
    start: 0,
    end: 15000,
    volume: 0.08,
    assetId: 'audio-simple-loop',
    loop: true,
  },
  {
    id: 'footstep-1',
    kind: 'footstep',
    label: 'Bob step 1',
    start: 1550,
    end: 1650,
    volume: 0.28,
  },
  {
    id: 'footstep-2',
    kind: 'footstep',
    label: 'Bob step 2',
    start: 1770,
    end: 1870,
    volume: 0.24,
  },
  {
    id: 'reaction-sting',
    kind: 'stinger',
    label: 'Reaction sting',
    start: 3100,
    end: 3450,
    volume: 0.18,
    assetId: 'audio-pop-1',
  },
  {
    id: 'mug-hit',
    kind: 'stinger',
    label: 'Mug hit',
    start: 5000,
    end: 5350,
    volume: 0.14,
    assetId: 'audio-pop-2',
  },
  {
    id: 'second-chance-sting',
    kind: 'stinger',
    label: 'Second chance sting',
    start: 10800,
    end: 11250,
    volume: 0.16,
    assetId: 'audio-pop-2',
  },
];
const starterBoneIds = [
  'bone-root-hip',
  'bone-hip-chest',
  'bone-chest-head',
  'bone-chest-left-hand',
  'bone-chest-right-hand',
  'bone-hip-left-foot',
  'bone-hip-right-foot',
];
function motionTransforms(
  overrides: Partial<Record<string, Partial<BoneTransform>>> = {},
): BoneTransform[] {
  return starterBoneIds.map((boneId) => ({
    boneId,
    rotation: 0,
    x: 0,
    y: 0,
    scale: 1,
    ...overrides[boneId],
  }));
}
const starterMotionClips: MotionClip[] = [
  {
    id: 'motion-walk-in',
    label: 'Walk in',
    kind: 'walk-in',
    durationMs: 1550,
    loop: false,
    easing: 'ease-in-out',
    description:
      'A compact two-step entrance with alternating foot and arm swing.',
    transforms: [
      {
        time: 0,
        transforms: motionTransforms({
          'bone-root-hip': { x: 58 },
          'bone-hip-left-foot': { rotation: 14 },
          'bone-hip-right-foot': { rotation: -14 },
          'bone-chest-left-hand': { rotation: -10 },
          'bone-chest-right-hand': { rotation: 10 },
        }),
      },
      {
        time: 775,
        transforms: motionTransforms({
          'bone-root-hip': { x: 26 },
          'bone-hip-left-foot': { rotation: -14 },
          'bone-hip-right-foot': { rotation: 14 },
          'bone-chest-left-hand': { rotation: 10 },
          'bone-chest-right-hand': { rotation: -10 },
        }),
      },
      { time: 1550, transforms: motionTransforms() },
    ],
  },
  {
    id: 'motion-walk-cycle',
    label: 'Walk cycle',
    kind: 'walk-cycle',
    durationMs: 900,
    loop: true,
    easing: 'linear',
    description: 'A looping alternating stride for scene entrances and exits.',
    transforms: [
      {
        time: 0,
        transforms: motionTransforms({
          'bone-hip-left-foot': { rotation: 16 },
          'bone-hip-right-foot': { rotation: -16 },
          'bone-chest-left-hand': { rotation: -10 },
          'bone-chest-right-hand': { rotation: 10 },
        }),
      },
      {
        time: 450,
        transforms: motionTransforms({
          'bone-hip-left-foot': { rotation: -16 },
          'bone-hip-right-foot': { rotation: 16 },
          'bone-chest-left-hand': { rotation: 10 },
          'bone-chest-right-hand': { rotation: -10 },
        }),
      },
      {
        time: 900,
        transforms: motionTransforms({
          'bone-hip-left-foot': { rotation: 16 },
          'bone-hip-right-foot': { rotation: -16 },
          'bone-chest-left-hand': { rotation: -10 },
          'bone-chest-right-hand': { rotation: 10 },
        }),
      },
    ],
  },
  {
    id: 'motion-turn-three-quarter',
    label: 'Turn to three-quarter',
    kind: 'turn',
    durationMs: 500,
    loop: false,
    easing: 'ease-in-out',
    description:
      'A small body and head turn that can switch to a three-quarter asset view.',
    transforms: [
      { time: 0, transforms: motionTransforms() },
      {
        time: 250,
        transforms: motionTransforms({
          'bone-hip-chest': { rotation: -8 },
          'bone-chest-head': { rotation: 10 },
        }),
      },
      {
        time: 500,
        transforms: motionTransforms({
          'bone-hip-chest': { rotation: -14 },
          'bone-chest-head': { rotation: 16 },
        }),
      },
    ],
  },
  {
    id: 'motion-embarrassed-reaction',
    label: 'Embarrassed reaction',
    kind: 'embarrassed',
    durationMs: 700,
    loop: false,
    easing: 'ease-in-out',
    description: 'A quick shoulder tuck and head dip for the coupon reveal.',
    transforms: [
      { time: 0, transforms: motionTransforms() },
      {
        time: 350,
        transforms: motionTransforms({
          'bone-hip-chest': { rotation: 5, y: 4 },
          'bone-chest-head': { rotation: -9, y: 5 },
          'bone-chest-left-hand': { rotation: 18 },
          'bone-chest-right-hand': { rotation: -18 },
        }),
      },
      { time: 700, transforms: motionTransforms() },
    ],
  },
];
function starterBoneKeyframes(): BoneKeyframe[] {
  const clips = [
    { skeletonId: 'skeleton-bob', clip: starterMotionClips[0], start: 0 },
    {
      skeletonId: 'skeleton-bob',
      clip: starterMotionClips[2],
      start: 3100,
    },
    {
      skeletonId: 'skeleton-alice',
      clip: starterMotionClips[3],
      start: 10800,
    },
  ];
  return clips.flatMap(({ skeletonId, clip, start }) =>
    clip.transforms.map((frame) => ({
      id: `bkf-${skeletonId}-${start + frame.time}`,
      sceneId: 'scene-01',
      skeletonId,
      time: start + frame.time,
      transforms: frame.transforms,
    })),
  );
}
const starterProject: Project = {
  name: 'Paper Cutout Comedy',
  revision: 7,
  duration: 15000,
  currentTime: 1800,
  fps: 24,
  renderWidth: 1920,
  renderHeight: 1080,
  selectedId: 'alice',
  lockedTrackIds: [],
  dirty: false,
  characters: [
    {
      id: 'alice',
      name: 'Alice',
      color: '#e56b52',
      x: 37,
      y: 62,
      rotation: -2,
      pose: 'nervous',
      assetId: 'alice',
    },
    {
      id: 'bob',
      name: 'Bob',
      color: '#32748f',
      x: 68,
      y: 57,
      rotation: 3,
      pose: 'idle',
      assetId: 'bob',
    },
  ],
  keyframes: [
    {
      id: 'kf-alice-0000',
      characterId: 'alice',
      time: 0,
      x: 37,
      y: 62,
      rotation: -2,
      pose: 'nervous',
    },
    {
      id: 'kf-alice-1550',
      characterId: 'alice',
      time: 1550,
      x: 40,
      y: 62,
      rotation: -2,
      pose: 'nervous',
    },
    {
      id: 'kf-alice-2450',
      characterId: 'alice',
      time: 2450,
      x: 43,
      y: 62,
      rotation: -2,
      pose: 'wave',
      variantId: 'alice-embarrassed-v2',
    },
    {
      id: 'kf-alice-5000',
      characterId: 'alice',
      time: 5000,
      x: 43,
      y: 62,
      rotation: -2,
      pose: 'wave',
    },
    {
      id: 'kf-alice-7000',
      characterId: 'alice',
      time: 7000,
      x: 43,
      y: 62,
      rotation: -2,
      pose: 'point',
      variantId: 'alice-surprised-v2',
    },
    {
      id: 'kf-alice-9800',
      characterId: 'alice',
      time: 9800,
      x: 45,
      y: 62,
      rotation: -1,
      pose: 'point',
    },
    {
      id: 'kf-alice-12000',
      characterId: 'alice',
      time: 12000,
      x: 43,
      y: 62,
      rotation: -2,
      pose: 'shrug',
      variantId: 'alice-pleased-v2',
    },
    {
      id: 'kf-alice-15000',
      characterId: 'alice',
      time: 15000,
      x: 43,
      y: 62,
      rotation: -2,
      pose: 'shrug',
    },
    {
      id: 'kf-bob-0000',
      characterId: 'bob',
      time: 0,
      x: 75,
      y: 57,
      rotation: 3,
      pose: 'idle',
    },
    {
      id: 'kf-bob-1550',
      characterId: 'bob',
      time: 1550,
      x: 68,
      y: 57,
      rotation: 3,
      pose: 'idle',
    },
    {
      id: 'kf-bob-3100',
      characterId: 'bob',
      time: 3100,
      x: 66,
      y: 57,
      rotation: 3,
      pose: 'lean-in',
      variantId: 'bob-embarrassed-v2',
    },
    {
      id: 'kf-bob-5000',
      characterId: 'bob',
      time: 5000,
      x: 66,
      y: 57,
      rotation: 3,
      pose: 'lean-in',
    },
    {
      id: 'kf-bob-7000',
      characterId: 'bob',
      time: 7000,
      x: 64,
      y: 57,
      rotation: 3,
      pose: 'lean-in',
    },
    {
      id: 'kf-bob-9800',
      characterId: 'bob',
      time: 9800,
      x: 66,
      y: 57,
      rotation: 3,
      pose: 'point',
      variantId: 'bob-surprised-v2',
    },
    {
      id: 'kf-bob-12000',
      characterId: 'bob',
      time: 12000,
      x: 66,
      y: 57,
      rotation: 3,
      pose: 'shrug',
      variantId: 'bob-pleased-v2',
    },
    {
      id: 'kf-bob-15000',
      characterId: 'bob',
      time: 15000,
      x: 66,
      y: 57,
      rotation: 3,
      pose: 'shrug',
    },
  ],
  propKeyframes: [],
  cameraKeyframes: starterCameraKeyframes,
  captions: [
    {
      id: 'caption-1',
      text: 'You actually came',
      start: 1550,
      end: 2450,
      speaker: 'Alice',
    },
    {
      id: 'caption-2',
      text: 'I almost didn’t',
      start: 3100,
      end: 4000,
      speaker: 'Bob',
    },
    {
      id: 'caption-3',
      text: 'The mug is okay',
      start: 5000,
      end: 6500,
      speaker: 'Alice',
    },
    {
      id: 'caption-4',
      text: 'That makes one of us',
      start: 7600,
      end: 9200,
      speaker: 'Bob',
    },
    {
      id: 'caption-5',
      text: 'Can we start over?',
      start: 10800,
      end: 13000,
      speaker: 'Alice',
    },
  ],
  audioCues: starterAudioCues,
  assets: starterAssets,
  assetRequests: [],
  skeletons: [
    {
      ...defaultSkeletonForAsset(
        'alice',
        'Alice',
        'segmented',
        starterAssets[0],
      ),
      reviewStatus: 'approved',
    },
    {
      ...defaultSkeletonForAsset('bob', 'Bob', 'segmented', starterAssets[1]),
      reviewStatus: 'approved',
    },
  ],
  boneKeyframes: starterBoneKeyframes(),
  motionClips: starterMotionClips,
  storyboardBeats,
  styleBible: starterStyleBible,
  scenes: starterScenes,
  activeSceneId: 'scene-01',
  templateId: 'first-meeting',
};

const blankCharacters: Character[] = [
  {
    id: 'actor-a',
    name: 'Actor A',
    color: '#e56b52',
    x: 38,
    y: 62,
    rotation: 0,
    pose: 'idle',
  },
  {
    id: 'actor-b',
    name: 'Actor B',
    color: '#32748f',
    x: 66,
    y: 62,
    rotation: 0,
    pose: 'idle',
  },
];
const blankScenes: SceneMeta[] = [
  {
    id: 'scene-01',
    title: 'Blank scene',
    description: 'An empty stage ready for blocking.',
    duration: 10000,
    characters: blankCharacters.map((character) => ({ ...character })),
    keyframes: [],
    propKeyframes: [],
    cameraKeyframes: [],
    captions: [],
    audioCues: [],
    boneKeyframes: [],
    lockedTrackIds: [],
  },
];
const blankProject: Project = {
  name: 'Untitled animation',
  revision: 1,
  duration: 10000,
  currentTime: 0,
  fps: 24,
  renderWidth: 1920,
  renderHeight: 1080,
  selectedId: 'actor-a',
  lockedTrackIds: [],
  dirty: false,
  characters: blankCharacters.map((character) => ({ ...character })),
  keyframes: [],
  propKeyframes: [],
  cameraKeyframes: [],
  captions: [],
  audioCues: [],
  assets: starterAssets.filter((asset) => asset.kind === 'audio'),
  assetRequests: [],
  skeletons: [],
  boneKeyframes: [],
  motionClips: starterMotionClips,
  storyboardBeats: [],
  styleBible: {
    construction: 'not set',
    motion: 'not set',
    camera: 'not set',
    palette: [],
    notes: 'Define the visual direction before generating assets.',
  },
  scenes: blankScenes,
  activeSceneId: 'scene-01',
};

function isBlankProject(project: Project) {
  return (
    project.characters.every((character) => !character.assetId) &&
    project.assets.every((asset) => asset.kind === 'audio') &&
    project.assetRequests.length === 0 &&
    project.skeletons.length === 0 &&
    project.keyframes.length === 0 &&
    project.propKeyframes.length === 0 &&
    project.cameraKeyframes.length === 0 &&
    project.captions.length === 0 &&
    project.audioCues.length === 0 &&
    project.boneKeyframes.length === 0 &&
    project.storyboardBeats.length === 0
  );
}

function makeTemplateScene(templateId: TemplateId, id: string): SceneMeta {
  const base = copy(starterProject);
  const variants: Record<
    TemplateId,
    {
      title: string;
      description: string;
      captions: string[];
      cameraZoom: number;
      cameraPanX: number;
    }
  > = {
    'first-meeting': {
      title: 'Diner · first meeting',
      description: 'Alice waits. Bob arrives behind her.',
      captions: ['You actually came', 'I almost didn’t'],
      cameraZoom: 1.16,
      cameraPanX: -4,
    },
    'coffee-spill': {
      title: 'Diner · coffee spill',
      description: 'A tiny accident makes the silence worse.',
      captions: ['That was my coffee', 'I panicked'],
      cameraZoom: 1.22,
      cameraPanX: -2,
    },
    'wrong-booth': {
      title: 'Diner · wrong booth',
      description: 'They both thought the other picked the table.',
      captions: ['I reserved this booth', 'For someone else?'],
      cameraZoom: 1.1,
      cameraPanX: 2,
    },
    'the-apology': {
      title: 'Diner · the apology',
      description: 'One sentence arrives much too late.',
      captions: ['I’m sorry I vanished', 'You did wave first'],
      cameraZoom: 1.2,
      cameraPanX: -3,
    },
  };
  const variant = variants[templateId];
  const cameraKeyframes = base.cameraKeyframes.map((frame) => ({ ...frame }));
  cameraKeyframes.forEach((frame) => {
    if (frame.time >= 3100 && frame.time < base.duration) {
      frame.zoom = variant.cameraZoom;
      frame.panX = variant.cameraPanX;
    }
  });
  return {
    id,
    title: variant.title,
    description: variant.description,
    duration: base.duration,
    templateId,
    characters: base.characters,
    keyframes: base.keyframes,
    propKeyframes: base.propKeyframes,
    cameraKeyframes,
    captions: base.captions.map((caption, index) => ({
      ...caption,
      text: variant.captions[index] ?? caption.text,
    })),
    audioCues: base.audioCues,
  };
}

function makeBeatScene(
  project: Project,
  beat: StoryBeat,
  id: string,
): SceneMeta {
  const sourceScene = project.scenes.find(
    (scene) => scene.id === project.activeSceneId,
  );
  const start = clamp(beat.startMs, 0, project.duration);
  const end = clamp(beat.endMs, start + 1, project.duration);
  const duration = end - start;
  const characters = evaluateCharacters(project, start).map((character) => ({
    ...character,
  }));
  const keyframes: Keyframe[] = characters.map((character) => ({
    id: `kf-${id}-${character.id}-0000`,
    characterId: character.id,
    time: 0,
    x: character.x,
    y: character.y,
    rotation: character.rotation,
    pose: character.pose,
  }));
  project.keyframes
    .filter(
      (frame) =>
        frame.time > start &&
        frame.time <= end &&
        characters.some((character) => character.id === frame.characterId),
    )
    .forEach((frame) => {
      keyframes.push({
        ...frame,
        id: `${frame.id}-${id}`,
        time: frame.time - start,
      });
    });
  const propKeyframes: PropKeyframe[] = evaluateProps(project, start).map(
    (prop) => ({
      ...prop,
      id: `pkf-${id}-${prop.assetId}-0000`,
      time: 0,
    }),
  );
  project.propKeyframes
    .filter(
      (frame) =>
        frame.time > start &&
        frame.time <= end &&
        project.assets.some(
          (asset) => asset.id === frame.assetId && asset.kind === 'prop',
        ),
    )
    .forEach((frame) => {
      propKeyframes.push({
        ...frame,
        id: `${frame.id}-${id}`,
        time: frame.time - start,
      });
    });
  const cameraAtStart = evaluateCamera(project, start);
  const cameraKeyframes: CameraKeyframe[] = [
    {
      ...cameraAtStart,
      id: `cam-${id}-0000`,
      time: 0,
    },
  ];
  project.cameraKeyframes
    .filter((frame) => frame.time > start && frame.time <= end)
    .forEach((frame) => {
      cameraKeyframes.push({
        ...frame,
        id: `${frame.id}-${id}`,
        time: frame.time - start,
      });
    });
  const captions = project.captions
    .filter((caption) => caption.end > start && caption.start < end)
    .map((caption) => ({
      ...caption,
      id: `${caption.id}-${id}`,
      start: Math.max(caption.start, start) - start,
      end: Math.min(caption.end, end) - start,
    }));
  const audioCues = project.audioCues
    .filter((cue) => cue.end > start && cue.start < end)
    .map((cue) => ({
      ...cue,
      id: `${cue.id}-${id}`,
      start: Math.max(cue.start, start) - start,
      end: Math.min(cue.end, end) - start,
    }));
  const boneKeyframes = project.boneKeyframes
    .filter(
      (frame) =>
        frame.sceneId === project.activeSceneId &&
        frame.time >= start &&
        frame.time <= end,
    )
    .map((frame) => ({
      ...frame,
      id: `${frame.id}-${id}`,
      sceneId: id,
      time: frame.time - start,
    }));
  return {
    id,
    title: `${sourceScene?.title ?? 'Scene'} · ${beat.title}`,
    description: beat.description,
    duration,
    templateId: project.templateId,
    characters,
    keyframes,
    propKeyframes,
    cameraKeyframes,
    captions,
    audioCues,
    boneKeyframes,
    lockedTrackIds: copy(project.lockedTrackIds),
  };
}

function makeSplitScenes(
  project: Project,
  splitTime: number,
  beforeId: string,
  afterId: string,
) {
  const source = project.scenes.find(
    (scene) => scene.id === project.activeSceneId,
  );
  const before = makeBeatScene(
    project,
    {
      id: 'split-before',
      index: 'A',
      title: 'before split',
      description: 'The first half of the scene.',
      startMs: 0,
      endMs: splitTime,
    },
    beforeId,
  );
  const after = makeBeatScene(
    project,
    {
      id: 'split-after',
      index: 'B',
      title: 'after split',
      description: 'The second half of the scene.',
      startMs: splitTime,
      endMs: project.duration,
    },
    afterId,
  );
  before.title = `A · ${source?.title ?? 'Scene'}`;
  before.description = `First half · ends at ${timecode(splitTime)}.`;
  after.title = `B · ${source?.title ?? 'Scene'}`;
  after.description = `Second half · starts at ${timecode(splitTime)}.`;
  return [before, after] as const;
}

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const timecode = (ms: number) => `${(ms / 1000).toFixed(2).padStart(4, '0')}s`;
const poseLabel = (pose: Pose) =>
  pose.replace('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const projectFileStem = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'stagehand-project';
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
const isPose = (value: unknown): value is Pose =>
  value === 'idle' ||
  value === 'nervous' ||
  value === 'wave' ||
  value === 'lean-in' ||
  value === 'point' ||
  value === 'shrug';
const isAssetKind = (value: unknown): value is AssetKind =>
  value === 'rigged-character' ||
  value === 'background' ||
  value === 'prop' ||
  value === 'audio';
const isAssetRole = (value: unknown): value is AssetRole =>
  value === 'hero' ||
  value === 'support' ||
  value === 'environment' ||
  value === 'accent';
const isAssetTreatment = (value: unknown): value is AssetTreatment =>
  value === 'paper' ||
  value === 'inked' ||
  value === 'flat-color' ||
  value === 'photo';
const isAssetSilhouette = (value: unknown): value is AssetSilhouette =>
  value === 'clear' || value === 'detailed';
const isAudioCueKind = (value: unknown): value is AudioCueKind =>
  value === 'music' || value === 'footstep' || value === 'stinger';
const isBindingMethod = (value: unknown): value is BindingMethod =>
  value === 'rigid' || value === 'segmented' || value === 'mesh';
const isAssetVariantKind = (value: unknown): value is AssetVariantKind =>
  value === 'base' ||
  value === 'view' ||
  value === 'pose' ||
  value === 'expression' ||
  value === 'motion';
const isViewDirection = (value: unknown): value is ViewDirection =>
  value === 'front' ||
  value === 'three-quarter' ||
  value === 'profile' ||
  value === 'back';
const isMotionClipKind = (value: unknown): value is MotionClipKind =>
  value === 'idle' ||
  value === 'walk-in' ||
  value === 'walk-cycle' ||
  value === 'stop' ||
  value === 'turn' ||
  value === 'lean' ||
  value === 'wave' ||
  value === 'point' ||
  value === 'shrug' ||
  value === 'surprise' ||
  value === 'embarrassed' ||
  value === 'pleased';
const isReviewStatus = (value: unknown): value is ReviewStatus =>
  value === 'draft' ||
  value === 'pending-review' ||
  value === 'approved' ||
  value === 'rejected';

const meshBindingInputSchema = {
  type: 'object',
  required: [
    'version',
    'id',
    'textureAssetId',
    'coordinateSpace',
    'vertices',
    'triangles',
    'zIndex',
    'skeletonVersion',
  ],
  additionalProperties: false,
  properties: {
    version: { type: 'integer', const: 1 },
    id: { type: 'string', minLength: 1, maxLength: 120 },
    textureAssetId: { type: 'string', minLength: 1, maxLength: 160 },
    coordinateSpace: { type: 'string', const: 'normalized-image' },
    vertices: {
      type: 'array',
      minItems: 3,
      maxItems: 512,
      items: {
        type: 'object',
        required: ['id', 'x', 'y', 'u', 'v', 'influences'],
        additionalProperties: false,
        properties: {
          id: { type: 'string', minLength: 1, maxLength: 120 },
          x: { type: 'number', minimum: 0, maximum: 1 },
          y: { type: 'number', minimum: 0, maximum: 1 },
          u: { type: 'number', minimum: 0, maximum: 1 },
          v: { type: 'number', minimum: 0, maximum: 1 },
          influences: {
            type: 'array',
            minItems: 1,
            maxItems: 4,
            items: {
              type: 'object',
              required: ['boneId', 'weight'],
              additionalProperties: false,
              properties: {
                boneId: { type: 'string', minLength: 1, maxLength: 120 },
                weight: { type: 'number', exclusiveMinimum: 0, maximum: 1 },
              },
            },
          },
        },
      },
    },
    triangles: {
      type: 'array',
      minItems: 1,
      maxItems: 1024,
      items: {
        type: 'array',
        minItems: 3,
        maxItems: 3,
        items: { type: 'integer', minimum: 0 },
      },
    },
    zIndex: { type: 'number' },
    skeletonVersion: { type: 'integer', minimum: 1 },
  },
} as const;

function assetChecklist(
  kind: Exclude<AssetKind, 'audio'>,
  method?: BindingMethod,
) {
  const common = [
    'Readable silhouette with no text or watermark.',
    'Matches the project style bible palette and construction notes.',
    'Transparent background with generous edge padding.',
  ];
  if (kind === 'rigged-character' && method === 'segmented') {
    return [
      ...common,
      'Transparent parts sheet with separate head, torso, arms, and legs.',
      'Include a v2 rig manifest with named parts, pivots, parent and child seam anchors, draw order, and overlap margins.',
      'Design the shoulder, hip, wrist, and ankle ends with hidden overlap so articulated pieces never expose a gap.',
      'Provide front, three-quarter, profile, and back view coverage plus idle, walk, reaction, and expression variants.',
      'Use consistent scale and facing direction across every part.',
    ];
  }
  if (kind === 'rigged-character' && method === 'mesh') {
    return [
      ...common,
      'Use one single-frame texture with a declared normalized-image triangle mesh and UV map.',
      'Declare a rest skeleton and normalized per-vertex bone weights; do not imply automatic triangulation or weighting.',
      'Keep topology coarse, add density only around intended bends, and cap the proof fixture at two influences per vertex.',
      'Provide rest, 60-degree bend, and allowed-extreme poses for rendered flip, collapse, seam, and silhouette review.',
      'Keep a separately approved segmented package as the explicit production fallback.',
    ];
  }
  if (kind === 'rigged-character') {
    return [
      ...common,
      'Full-body character centered in the frame.',
      'Provide a four-column pose sheet when multiple poses are requested.',
      'Hands, feet, and face remain visible for joint placement.',
    ];
  }
  if (kind === 'background') {
    return [
      ...common,
      'Leave negative space for blocking and captions.',
      'Use a 16:9 composition.',
    ];
  }
  return [
    ...common,
    'Keep one clear story silhouette.',
    'Avoid detail that disappears at 720p.',
  ];
}

function rigManifestForAsset(
  assetId: string,
  dimensions: { width: number; height: number } = {
    width: 1536,
    height: 1024,
  },
  provenance: Asset['provenance'] = {},
): RigManifest {
  const bob = assetId.toLowerCase().includes('bob');
  const common = bob
    ? [
        {
          id: 'head',
          label: 'head',
          boneId: 'bone-chest-head',
          x: 0.02,
          y: 0.02,
          width: 0.27,
          height: 0.4,
          pivotX: 0.5,
          pivotY: 0.92,
          attachX: 0.5,
          attachY: 0.94,
          zIndex: 5,
        },
        {
          id: 'torso',
          label: 'torso',
          boneId: 'bone-hip-chest',
          x: 0.3,
          y: 0.02,
          width: 0.36,
          height: 0.52,
          pivotX: 0.5,
          pivotY: 0.92,
          attachX: 0.5,
          attachY: 0.9,
          zIndex: 3,
        },
        {
          id: 'left-arm',
          label: 'left arm',
          boneId: 'bone-chest-left-hand',
          x: 0.63,
          y: 0.02,
          width: 0.17,
          height: 0.48,
          pivotX: 0.5,
          pivotY: 0.08,
          attachX: 0.5,
          attachY: 0.08,
          zIndex: 2,
        },
        {
          id: 'right-arm',
          label: 'right arm',
          boneId: 'bone-chest-right-hand',
          x: 0.8,
          y: 0.02,
          width: 0.18,
          height: 0.48,
          pivotX: 0.5,
          pivotY: 0.08,
          attachX: 0.5,
          attachY: 0.08,
          zIndex: 4,
        },
        {
          id: 'left-leg',
          label: 'left leg',
          boneId: 'bone-hip-left-foot',
          x: 0.28,
          y: 0.54,
          width: 0.2,
          height: 0.45,
          pivotX: 0.5,
          pivotY: 0.08,
          attachX: 0.5,
          attachY: 0.08,
          zIndex: 1,
        },
        {
          id: 'right-leg',
          label: 'right leg',
          boneId: 'bone-hip-right-foot',
          x: 0.52,
          y: 0.54,
          width: 0.2,
          height: 0.45,
          pivotX: 0.5,
          pivotY: 0.08,
          attachX: 0.5,
          attachY: 0.08,
          zIndex: 1,
        },
      ]
    : [
        {
          id: 'head',
          label: 'head',
          boneId: 'bone-chest-head',
          x: 0.0,
          y: 0.02,
          width: 0.34,
          height: 0.42,
          pivotX: 0.5,
          pivotY: 0.92,
          attachX: 0.5,
          attachY: 0.94,
          zIndex: 5,
        },
        {
          id: 'torso',
          label: 'torso',
          boneId: 'bone-hip-chest',
          x: 0.35,
          y: 0.02,
          width: 0.34,
          height: 0.52,
          pivotX: 0.5,
          pivotY: 0.92,
          attachX: 0.5,
          attachY: 0.9,
          zIndex: 3,
        },
        {
          id: 'left-arm',
          label: 'left arm',
          boneId: 'bone-chest-left-hand',
          x: 0.64,
          y: 0.02,
          width: 0.17,
          height: 0.48,
          pivotX: 0.5,
          pivotY: 0.08,
          attachX: 0.5,
          attachY: 0.08,
          zIndex: 2,
        },
        {
          id: 'right-arm',
          label: 'right arm',
          boneId: 'bone-chest-right-hand',
          x: 0.81,
          y: 0.02,
          width: 0.17,
          height: 0.48,
          pivotX: 0.5,
          pivotY: 0.08,
          attachX: 0.5,
          attachY: 0.08,
          zIndex: 4,
        },
        {
          id: 'left-leg',
          label: 'left leg',
          boneId: 'bone-hip-left-foot',
          x: 0.35,
          y: 0.56,
          width: 0.17,
          height: 0.42,
          pivotX: 0.5,
          pivotY: 0.08,
          attachX: 0.5,
          attachY: 0.08,
          zIndex: 1,
        },
        {
          id: 'right-leg',
          label: 'right leg',
          boneId: 'bone-hip-right-foot',
          x: 0.53,
          y: 0.56,
          width: 0.17,
          height: 0.42,
          pivotX: 0.5,
          pivotY: 0.08,
          attachX: 0.5,
          attachY: 0.08,
          zIndex: 1,
        },
      ];
  return {
    version: 2,
    atlasWidth: dimensions.width,
    atlasHeight: dimensions.height,
    source: 'manifest',
    sourceAsset: {
      assetId,
      immutable: true,
      provenance: { ...provenance },
    },
    image: {
      width: dimensions.width,
      height: dimensions.height,
      colorspace: 'sRGB',
      alpha: 'straight',
    },
    canvasAnchor: { x: 0.5, y: 0.82 },
    parts: common.map((part) => ({
      ...part,
      confidence: 0.96,
      overlapPx: part.id === 'head' || part.id === 'torso' ? 10 : 14,
      mask: { kind: 'alpha' as const, threshold: 48 },
      bounds: {
        x: part.x,
        y: part.y,
        width: part.width,
        height: part.height,
      },
      pivot: { x: part.pivotX, y: part.pivotY },
      parentAnchor: { x: part.attachX, y: part.attachY },
      attachmentMargins: {
        top: part.id.includes('arm') || part.id.includes('leg') ? 14 : 10,
        right: 8,
        bottom: part.id === 'head' || part.id === 'torso' ? 10 : 8,
        left: 8,
      },
    })),
    views: {
      front: assetId,
      'three-quarter': assetId,
      profile: assetId,
      back: assetId,
    },
    expressions: {
      neutral: `${assetId}-neutral`,
      surprised: `${assetId}-surprised`,
      embarrassed: `${assetId}-embarrassed`,
      pleased: `${assetId}-pleased`,
    },
    variants: [
      { id: `${assetId}-base`, kind: 'base', label: 'Front base', assetId },
      {
        id: `${assetId}-idle`,
        kind: 'pose',
        label: 'Idle',
        assetId,
        pose: 'idle',
      },
      {
        id: `${assetId}-walk`,
        kind: 'motion',
        label: 'Walk cycle',
        assetId,
        pose: 'idle',
      },
      {
        id: `${assetId}-surprised`,
        kind: 'expression',
        label: 'Surprised',
        assetId,
        expression: 'surprised',
      },
      {
        id: `${assetId}-embarrassed`,
        kind: 'expression',
        label: 'Embarrassed',
        assetId,
        expression: 'embarrassed',
      },
      {
        id: `${assetId}-pleased`,
        kind: 'expression',
        label: 'Pleased',
        assetId,
        expression: 'pleased',
      },
    ],
    alignment: {
      connected: true,
      seamCount: 8,
      minConfidence: 0.96,
      warnings: [],
    },
    skeleton: {
      confidence: 0.94,
      minCriticalConfidence: 0.88,
      criticalJointIds: ['root', 'hip', 'chest', 'head'],
    },
  };
}

function normalizeAssetPackage(
  asset: Asset,
): StagehandAssetPackageV2 | undefined {
  const legacy = asset.assetPackage ?? asset.rigManifest;
  if (!legacy) return undefined;
  const dimensions = asset.dimensions ?? {
    width: legacy.atlasWidth || 1536,
    height: legacy.atlasHeight || 1024,
  };
  const fallback = rigManifestForAsset(
    '__legacy-package__',
    dimensions,
    asset.provenance,
  );
  const parts = Array.isArray(legacy.parts)
    ? legacy.parts.map((part) => {
        const fallbackPart =
          fallback.parts.find((candidate) => candidate.id === part.id) ??
          fallback.parts[0];
        return {
          ...fallbackPart,
          ...part,
          mask: part.mask ?? { kind: 'alpha' as const, threshold: 48 },
          bounds: part.bounds ?? {
            x: part.x,
            y: part.y,
            width: part.width,
            height: part.height,
          },
          pivot: part.pivot ?? { x: part.pivotX, y: part.pivotY },
          parentAnchor: part.parentAnchor ?? {
            x: part.attachX,
            y: part.attachY,
          },
          attachmentMargins: part.attachmentMargins ?? {
            top: part.overlapPx ?? 8,
            right: 8,
            bottom: part.overlapPx ?? 8,
            left: 8,
          },
        };
      })
    : fallback.parts;
  return {
    ...fallback,
    ...legacy,
    sourceAsset: legacy.sourceAsset ?? {
      assetId: asset.id,
      immutable: true,
      provenance: { ...asset.provenance },
    },
    image: legacy.image ?? {
      width: dimensions.width,
      height: dimensions.height,
      colorspace: 'sRGB',
      alpha: 'straight',
    },
    canvasAnchor: legacy.canvasAnchor ?? fallback.canvasAnchor,
    parts,
    skeleton: legacy.skeleton ?? fallback.skeleton,
  };
}

type AlphaComponent = {
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
};

function readAlphaComponents(dataUrl: string): Promise<AlphaComponent[]> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const width = 96;
      const height = Math.max(
        48,
        Math.round((image.naturalHeight / image.naturalWidth) * width),
      );
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) return resolve([]);
      context.drawImage(image, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height).data;
      const visited = new Uint8Array(width * height);
      const components: AlphaComponent[] = [];
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const index = y * width + x;
          if (visited[index] || pixels[index * 4 + 3] < 48) continue;
          const queue = [[x, y]];
          visited[index] = 1;
          let minX = x,
            maxX = x,
            minY = y,
            maxY = y,
            area = 0;
          while (queue.length) {
            const [currentX, currentY] = queue.pop()!;
            area += 1;
            minX = Math.min(minX, currentX);
            maxX = Math.max(maxX, currentX);
            minY = Math.min(minY, currentY);
            maxY = Math.max(maxY, currentY);
            for (const [nextX, nextY] of [
              [currentX - 1, currentY],
              [currentX + 1, currentY],
              [currentX, currentY - 1],
              [currentX, currentY + 1],
            ]) {
              if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height)
                continue;
              const nextIndex = nextY * width + nextX;
              if (visited[nextIndex] || pixels[nextIndex * 4 + 3] < 48)
                continue;
              visited[nextIndex] = 1;
              queue.push([nextX, nextY]);
            }
          }
          if (area > 18)
            components.push({
              x: minX / width,
              y: minY / height,
              width: (maxX - minX + 1) / width,
              height: (maxY - minY + 1) / height,
              area,
            });
        }
      }
      resolve(components.sort((a, b) => b.area - a.area));
    };
    image.onerror = () => reject(new Error('Unable to decode asset alpha'));
    image.src = dataUrl;
  });
}

async function inferRigManifest(asset: Asset): Promise<RigManifest> {
  const manifest = rigManifestForAsset(
    '__inferred__',
    asset.dimensions ?? { width: 1536, height: 1024 },
    asset.provenance,
  );
  manifest.sourceAsset.assetId = asset.id;
  manifest.views = {};
  manifest.expressions = {};
  if (!asset.dataUrl) {
    return {
      ...manifest,
      source: 'alpha-inference',
      alignment: {
        connected: false,
        seamCount: 0,
        minConfidence: 0.35,
        warnings: ['Asset payload is unavailable for alpha analysis.'],
      },
    };
  }
  try {
    const components = await readAlphaComponents(asset.dataUrl);
    const structuralComponents = components.filter(
      (component) => component.area >= (components[0]?.area ?? 1) * 0.08,
    );
    if (structuralComponents.length < manifest.parts.length) {
      return {
        ...manifest,
        source: 'hybrid',
        alignment: {
          connected: false,
          seamCount: Math.max(0, structuralComponents.length - 1),
          minConfidence: 0.42,
          warnings: [
            `Expected ${manifest.parts.length} structural components but found ${structuralComponents.length}.`,
          ],
        },
      };
    }
    const remaining = [...structuralComponents];
    const parts = manifest.parts.map((part) => {
      const expectedX = part.x + part.width / 2;
      const expectedY = part.y + part.height / 2;
      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      remaining.forEach((component, index) => {
        const distance = Math.hypot(
          component.x + component.width / 2 - expectedX,
          component.y + component.height / 2 - expectedY,
        );
        if (distance < bestDistance) {
          bestIndex = index;
          bestDistance = distance;
        }
      });
      const component = remaining.splice(bestIndex, 1)[0];
      const confidence = clamp(0.98 - bestDistance * 1.8, 0.5, 0.98);
      const x = clamp(component.x - 0.008, 0, 1);
      const y = clamp(component.y - 0.008, 0, 1);
      const width = clamp(component.width + 0.016, 0.02, 1 - x);
      const height = clamp(component.height + 0.016, 0.02, 1 - y);
      return {
        ...part,
        x,
        y,
        width,
        height,
        bounds: { x, y, width, height },
        confidence,
      };
    });
    const minConfidence = Math.min(...parts.map((part) => part.confidence));
    const unmatchedSignificant = remaining.filter(
      (component) => component.area >= (components[0]?.area ?? 1) * 0.08,
    );
    return {
      ...manifest,
      source: 'hybrid',
      parts,
      alignment: {
        connected: minConfidence >= 0.72 && unmatchedSignificant.length === 0,
        seamCount: 5,
        minConfidence,
        warnings:
          minConfidence < 0.72 || unmatchedSignificant.length > 0
            ? [
                ...(minConfidence < 0.72
                  ? ['One or more inferred part bounds need joint review.']
                  : []),
                ...(unmatchedSignificant.length > 0
                  ? [
                      `Found ${unmatchedSignificant.length} unmatched significant alpha islands.`,
                    ]
                  : []),
              ]
            : [],
      },
    };
  } catch {
    return {
      ...manifest,
      source: 'alpha-inference',
      alignment: {
        connected: false,
        seamCount: 0,
        minConfidence: 0.35,
        warnings: [
          'Alpha analysis failed; provide a rig manifest or review the inferred parts.',
        ],
      },
    };
  }
}

function decodeImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to decode image payload'));
    image.src = dataUrl;
  });
}

async function inspectImagePayload(dataUrl: string) {
  const image = await decodeImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(192, Math.max(1, image.naturalWidth));
  canvas.height = Math.min(
    192,
    Math.max(
      1,
      Math.round((image.naturalHeight / image.naturalWidth) * canvas.width),
    ),
  );
  const context = canvas.getContext('2d', { willReadFrequently: true });
  let hasTransparentPixels = false;
  if (context) {
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] < 250) {
        hasTransparentPixels = true;
        break;
      }
    }
  }
  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
    transparencyStatus: hasTransparentPixels
      ? ('yes' as const)
      : ('no' as const),
  };
}

async function checksumDataUrl(dataUrl: string) {
  const comma = dataUrl.indexOf(',');
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1)
    bytes[index] = binary.charCodeAt(index);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('');
}

function assetPackageIssues(
  value: unknown,
  dimensions?: { width: number; height: number },
) {
  const issues: string[] = [];
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return ['StagehandAssetPackageV2 is missing.'];
  const packageData = value as Partial<StagehandAssetPackageV2>;
  if (packageData.version !== 2) issues.push('Package version must be 2.');
  if (
    !packageData.sourceAsset ||
    packageData.sourceAsset.immutable !== true ||
    typeof packageData.sourceAsset.assetId !== 'string'
  )
    issues.push('Immutable source identity is missing.');
  if (
    !packageData.image ||
    !Number.isFinite(packageData.image.width) ||
    !Number.isFinite(packageData.image.height) ||
    packageData.image.colorspace !== 'sRGB' ||
    packageData.image.alpha !== 'straight'
  )
    issues.push('Decoded image metadata is invalid.');
  if (
    dimensions &&
    packageData.image &&
    (packageData.image.width !== dimensions.width ||
      packageData.image.height !== dimensions.height)
  )
    issues.push('Package dimensions do not match decoded pixels.');
  if (
    !packageData.canvasAnchor ||
    !Number.isFinite(packageData.canvasAnchor.x) ||
    !Number.isFinite(packageData.canvasAnchor.y) ||
    packageData.canvasAnchor.x < 0 ||
    packageData.canvasAnchor.x > 1 ||
    packageData.canvasAnchor.y < 0 ||
    packageData.canvasAnchor.y > 1
  )
    issues.push('Canvas anchor must be normalized.');
  if (!Array.isArray(packageData.parts) || packageData.parts.length < 6) {
    issues.push('Package needs at least six named segmented parts.');
  } else {
    const ids = new Set<string>();
    packageData.parts.forEach((part) => {
      if (!part || typeof part !== 'object' || !part.id || ids.has(part.id)) {
        issues.push('Part IDs must be present and unique.');
        return;
      }
      ids.add(part.id);
      if (
        !part.bounds ||
        part.bounds.x < 0 ||
        part.bounds.y < 0 ||
        part.bounds.width <= 0 ||
        part.bounds.height <= 0 ||
        part.bounds.x + part.bounds.width > 1.001 ||
        part.bounds.y + part.bounds.height > 1.001
      )
        issues.push(`${part.id} has invalid normalized bounds.`);
      if (
        !part.pivot ||
        !part.parentAnchor ||
        !part.attachmentMargins ||
        Object.values(part.attachmentMargins).some(
          (margin) => !Number.isFinite(margin) || margin < 0,
        )
      )
        issues.push(
          `${part.id} is missing pivot, anchor, or attachment margins.`,
        );
      if (!Number.isFinite(part.zIndex))
        issues.push(`${part.id} needs a finite z-order.`);
    });
  }
  if (
    !packageData.skeleton ||
    !Number.isFinite(packageData.skeleton.confidence) ||
    !Number.isFinite(packageData.skeleton.minCriticalConfidence) ||
    !Array.isArray(packageData.skeleton.criticalJointIds)
  )
    issues.push('Package-level skeleton confidence is missing.');
  if (
    packageData.experimentalMesh &&
    packageData.experimentalMesh.status !== 'experimental'
  )
    issues.push('Mesh data must be labeled experimental.');
  return [...new Set(issues)];
}

function candidateApprovalChecks(
  asset: Asset,
  request?: AssetGenerationRequest,
) {
  const packageIssues = asset.packageIssues ?? [];
  const needsTransparentPackage =
    asset.kind === 'rigged-character' &&
    (request?.bindingMethod === 'segmented' ||
      asset.frameLayout === 'parts-sheet');
  const checks = {
    hasPayload: Boolean(asset.dataUrl),
    hasBrief: Boolean(asset.brief?.trim()),
    hasStyle: Boolean(asset.style),
    hasDimensions: Boolean(asset.dimensions?.width && asset.dimensions?.height),
    hasPackage: !needsTransparentPackage || Boolean(asset.assetPackage),
    packageValid: packageIssues.length === 0,
    transparencyStatus: asset.transparencyStatus ?? 'unknown',
    layout: asset.frameLayout ?? 'single',
    reviewStatus: asset.reviewStatus ?? 'approved',
    source: asset.source,
  };
  const readyForApproval =
    checks.hasPayload &&
    checks.hasBrief &&
    checks.hasStyle &&
    checks.hasDimensions &&
    checks.hasPackage &&
    checks.packageValid &&
    (!needsTransparentPackage || checks.transparencyStatus === 'yes');
  return { checks, readyForApproval };
}

function inspectAlphaPixels(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context)
    return { alphaPixels: 0, significantComponents: 0, clippedEdges: 0 };
  const { width, height } = canvas;
  const pixels = context.getImageData(0, 0, width, height).data;
  const active = new Uint8Array(width * height);
  let alphaPixels = 0;
  let clippedEdges = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (pixels[index * 4 + 3] < 32) continue;
      active[index] = 1;
      alphaPixels += 1;
      if (x < 2 || y < 2 || x >= width - 2 || y >= height - 2)
        clippedEdges += 1;
    }
  }
  const componentAreas: number[] = [];
  const queue = new Int32Array(width * height);
  for (let start = 0; start < active.length; start += 1) {
    if (active[start] !== 1) continue;
    let head = 0;
    let tail = 0;
    let area = 0;
    queue[tail++] = start;
    active[start] = 2;
    while (head < tail) {
      const index = queue[head++];
      area += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) continue;
          const nextX = x + offsetX;
          const nextY = y + offsetY;
          if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height)
            continue;
          const next = nextY * width + nextX;
          if (active[next] !== 1) continue;
          active[next] = 2;
          queue[tail++] = next;
        }
      }
    }
    componentAreas.push(area);
  }
  const significantFloor = Math.max(12, alphaPixels * 0.0025);
  return {
    alphaPixels,
    significantComponents: componentAreas.filter(
      (area) => area >= significantFloor,
    ).length,
    clippedEdges,
  };
}

async function inspectRenderedRigPreview(
  asset: Asset,
  skeleton: Skeleton,
): Promise<RigPreviewReport> {
  if (!asset.dataUrl)
    return {
      passed: false,
      renderer: 'canvas-alpha-v1',
      poses: [],
      blockedReasons: ['Asset payload is unavailable.'],
      fallbackUsed: false,
    };
  const image = await decodeImage(asset.dataUrl);
  const packageData = asset.assetPackage ?? asset.rigManifest;
  const coordinateMismatches: string[] = [];
  if (
    packageData &&
    (packageData.image.width !== image.naturalWidth ||
      packageData.image.height !== image.naturalHeight)
  )
    coordinateMismatches.push(
      'Package dimensions do not match decoded pixels.',
    );
  if (
    skeleton.binding.regions?.some(
      (region) =>
        region.x < 0 ||
        region.y < 0 ||
        region.width <= 0 ||
        region.height <= 0 ||
        (region.x <= 1 && region.x + region.width > 1.001) ||
        (region.y <= 1 && region.y + region.height > 1.001),
    )
  )
    coordinateMismatches.push('One or more source bounds leave the atlas.');
  const regions = skeleton.binding.regions ?? [];
  const invalidDrawOrder = [
    ...new Set(
      regions
        .filter((region) => !Number.isFinite(region.zIndex))
        .map((region) => region.id),
    ),
  ];
  const leftArm = regions.find((region) => region.id === 'left-arm');
  const rightArm = regions.find((region) => region.id === 'right-arm');
  const invertedLimbs =
    leftArm && rightArm && (leftArm.targetX ?? 0) >= (rightArm.targetX ?? 1)
      ? ['left-arm/right-arm']
      : [];
  const segmentedPoseInputs: Array<{
    id: string;
    label: string;
    transforms: BoneTransform[];
  }> = [
    { id: 'rest', label: 'Rest pose', transforms: [] },
    {
      id: 'shoulders',
      label: 'Shoulder rotation extremes',
      transforms: [
        { boneId: 'bone-chest-left-hand', rotation: -62, x: 0, y: 0, scale: 1 },
        { boneId: 'bone-chest-right-hand', rotation: 62, x: 0, y: 0, scale: 1 },
      ],
    },
    {
      id: 'hips',
      label: 'Hip rotation extremes',
      transforms: [
        { boneId: 'bone-hip-left-foot', rotation: -42, x: 0, y: 0, scale: 1 },
        { boneId: 'bone-hip-right-foot', rotation: 42, x: 0, y: 0, scale: 1 },
      ],
    },
    {
      id: 'elbow-knee',
      label: 'Elbow and knee bend stress',
      transforms: [
        { boneId: 'bone-chest-left-hand', rotation: -96, x: 0, y: 0, scale: 1 },
        { boneId: 'bone-hip-right-foot', rotation: 72, x: 0, y: 0, scale: 1 },
      ],
    },
    {
      id: 'walk',
      label: 'Walk stride',
      transforms: [
        { boneId: 'bone-hip-left-foot', rotation: 28, x: 0, y: 0, scale: 1 },
        { boneId: 'bone-hip-right-foot', rotation: -28, x: 0, y: 0, scale: 1 },
        { boneId: 'bone-chest-left-hand', rotation: -18, x: 0, y: 0, scale: 1 },
        { boneId: 'bone-chest-right-hand', rotation: 18, x: 0, y: 0, scale: 1 },
      ],
    },
    {
      id: 'turn',
      label: 'Turn anticipation',
      transforms: [
        { boneId: 'bone-root-hip', rotation: 14, x: 3, y: 0, scale: 1 },
        { boneId: 'bone-chest-head', rotation: -24, x: 0, y: 0, scale: 1 },
      ],
    },
    {
      id: 'reaction',
      label: 'Reaction pose',
      transforms: [
        { boneId: 'bone-hip-chest', rotation: -12, x: 0, y: -2, scale: 1 },
        { boneId: 'bone-chest-left-hand', rotation: -55, x: 0, y: 0, scale: 1 },
        { boneId: 'bone-chest-right-hand', rotation: 55, x: 0, y: 0, scale: 1 },
      ],
    },
  ];
  const bendBoneId = skeleton.bones[1]?.id ?? skeleton.bones[0]?.id ?? '';
  const poseInputs =
    skeleton.binding.method === 'mesh'
      ? [
          { id: 'rest', label: 'Rest pose', transforms: [] },
          {
            id: 'bend-60',
            label: '60 degree weighted bend',
            transforms: [
              { boneId: bendBoneId, rotation: 60, x: 0, y: 0, scale: 1 },
            ],
          },
          {
            id: 'bend-extreme',
            label: '95 degree extreme bend',
            transforms: [
              { boneId: bendBoneId, rotation: 95, x: 0, y: 0, scale: 1 },
            ],
          },
        ]
      : segmentedPoseInputs;
  let restAlpha = 0;
  let restComponents = 0;
  const poses: RigPreviewPoseReport[] = [];
  for (const pose of poseInputs) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context) continue;
    context.clearRect(0, 0, canvas.width, canvas.height);
    const drawDiagnostics = drawCharacter(
      context,
      {
        id: 'rig-preview',
        name: 'Rig preview',
        color: '#f06c57',
        assetId: asset.id,
        x: 50,
        y: 91,
        rotation: 0,
        pose: 'idle',
      },
      canvas.width,
      canvas.height,
      false,
      image,
      asset,
      skeleton,
      pose.transforms,
    );
    const pixels = inspectAlphaPixels(canvas);
    if (pose.id === 'rest') {
      restAlpha = pixels.alphaPixels;
      restComponents = pixels.significantComponents;
    }
    const disconnectedAlphaIslands = Math.max(
      0,
      pixels.significantComponents - 1,
    );
    const visibleGaps =
      pose.id === 'rest'
        ? skeleton.binding.method === 'segmented' &&
          packageData?.alignment?.connected === false
          ? 1
          : 0
        : Math.max(0, pixels.significantComponents - restComponents - 1);
    const excessiveOverlaps =
      restAlpha > 0 &&
      pose.id !== 'rest' &&
      pixels.alphaPixels < restAlpha * 0.58
        ? 1
        : 0;
    const passed =
      pixels.alphaPixels > 0 &&
      visibleGaps === 0 &&
      excessiveOverlaps === 0 &&
      pixels.clippedEdges === 0 &&
      invalidDrawOrder.length === 0 &&
      invertedLimbs.length === 0 &&
      coordinateMismatches.length === 0 &&
      drawDiagnostics.issues.length === 0 &&
      drawDiagnostics.fallbackUsed === false;
    poses.push({
      id: pose.id,
      label: pose.label,
      alphaPixels: pixels.alphaPixels,
      significantComponents: pixels.significantComponents,
      visibleGaps,
      excessiveOverlaps,
      clippedEdges: pixels.clippedEdges,
      disconnectedAlphaIslands,
      invertedLimbs,
      invalidDrawOrder,
      coordinateMismatches,
      meshMetrics: drawDiagnostics.meshMetrics,
      renderer:
        drawDiagnostics.renderer === 'canvas-lbs-mesh-v1'
          ? 'canvas-lbs-mesh-v1'
          : 'canvas-alpha-v1',
      fallbackUsed: drawDiagnostics.fallbackUsed,
      passed,
    });
  }
  const blockedReasons = [
    ...poses
      .filter((pose) => !pose.passed)
      .map((pose) => `${pose.label} failed rendered seam QA.`),
    ...poses.flatMap((pose) =>
      pose.renderer === 'canvas-lbs-mesh-v1' && !pose.passed
        ? [`${pose.label} has invalid mesh geometry or renderer state.`]
        : [],
    ),
  ];
  return {
    passed: poses.length === poseInputs.length && blockedReasons.length === 0,
    renderer:
      skeleton.binding.method === 'mesh'
        ? 'canvas-lbs-mesh-v1'
        : 'canvas-alpha-v1',
    poses,
    blockedReasons,
    meshMetrics: poses.find((pose) => pose.id === 'rest')?.meshMetrics,
    fallbackUsed: poses.some((pose) => pose.fallbackUsed),
  };
}

function skeletonModelIssues(skeleton: Skeleton, asset?: Asset) {
  const issues: string[] = [];
  const jointIds = new Set(skeleton.joints.map((joint) => joint.id));
  if (!jointIds.has(skeleton.rootJointId))
    issues.push('Root joint is missing.');
  if (
    skeleton.joints.some(
      (joint) => joint.x < 0 || joint.x > 100 || joint.y < 0 || joint.y > 100,
    )
  )
    issues.push('One or more joints are outside the character bounds.');
  const reachable = new Set([skeleton.rootJointId]);
  let changed = true;
  while (changed) {
    changed = false;
    skeleton.bones.forEach((bone) => {
      if (
        reachable.has(bone.parentJointId) &&
        !reachable.has(bone.childJointId)
      ) {
        reachable.add(bone.childJointId);
        changed = true;
      }
    });
  }
  if (reachable.size !== skeleton.joints.length)
    issues.push('Bone graph is disconnected from the root.');
  if (skeleton.binding.method === 'segmented') {
    const manifest = asset?.assetPackage ?? asset?.rigManifest;
    if (!manifest) issues.push('Segmented binding needs a rig manifest.');
    if (manifest?.alignment && !manifest.alignment.connected)
      issues.push(...manifest.alignment.warnings);
    if (manifest) {
      const criticalConfidence = Math.min(
        ...skeleton.joints
          .filter((joint) =>
            manifest.skeleton.criticalJointIds.includes(joint.id),
          )
          .map((joint) => joint.confidence),
      );
      if (
        !Number.isFinite(criticalConfidence) ||
        criticalConfidence < manifest.skeleton.minCriticalConfidence
      )
        issues.push('One or more critical joints have low confidence.');
    }
    const boneIds = new Set(skeleton.bones.map((bone) => bone.id));
    const regions = skeleton.binding.regions ?? [];
    if (regions.length < 6)
      issues.push(
        'Segmented binding needs head, torso, two arms, and two legs.',
      );
    regions.forEach((region) => {
      if (region.boneId && !boneIds.has(region.boneId))
        issues.push(`${region.label} references a missing bone.`);
      if (
        region.attachX !== undefined &&
        (region.attachX < 0 || region.attachX > 1)
      )
        issues.push(`${region.label} pivot X is outside its crop.`);
      if (
        region.attachY !== undefined &&
        (region.attachY < 0 || region.attachY > 1)
      )
        issues.push(`${region.label} pivot Y is outside its crop.`);
      if ((region.overlapPx ?? 0) < 8)
        issues.push(
          `${region.label} needs at least 8px of attachment overlap.`,
        );
      if ((region.confidence ?? 1) < 0.72)
        issues.push(`${region.label} has low alignment confidence.`);
    });
  }
  if (skeleton.binding.method === 'mesh') {
    if (asset?.frameCount && asset.frameCount !== 1)
      issues.push('Mesh binding requires a single-frame texture asset.');
    const meshIssues = validateMeshBinding(skeleton.binding.mesh, {
      assetId: skeleton.assetId,
      skeletonVersion: skeleton.version,
      boneIds: skeleton.bones.map((bone) => bone.id),
    });
    issues.push(...meshIssues.map((issue) => issue.message));
  }
  return [...new Set(issues)];
}

function defaultSkeletonForAsset(
  assetId: string,
  label: string,
  method: BindingMethod = 'segmented',
  asset?: Asset,
): Skeleton {
  const joints: SkeletonJoint[] = [
    {
      id: 'root',
      label: 'root',
      x: 50,
      y: 82,
      radius: 4,
      confidence: 0.96,
      locked: false,
    },
    {
      id: 'hip',
      parentId: 'root',
      label: 'hip',
      x: 50,
      y: 64,
      radius: 4,
      confidence: 0.9,
      locked: false,
    },
    {
      id: 'chest',
      parentId: 'hip',
      label: 'chest',
      x: 50,
      y: 43,
      radius: 4,
      confidence: 0.9,
      locked: false,
    },
    {
      id: 'head',
      parentId: 'chest',
      label: 'head',
      x: 50,
      y: 22,
      radius: 4,
      confidence: 0.88,
      locked: false,
    },
    {
      id: 'left-hand',
      parentId: 'chest',
      label: 'left hand',
      x: 33,
      y: 53,
      radius: 3,
      confidence: 0.75,
      locked: false,
    },
    {
      id: 'right-hand',
      parentId: 'chest',
      label: 'right hand',
      x: 67,
      y: 53,
      radius: 3,
      confidence: 0.75,
      locked: false,
    },
    {
      id: 'left-foot',
      parentId: 'hip',
      label: 'left foot',
      x: 42,
      y: 88,
      radius: 3,
      confidence: 0.78,
      locked: false,
    },
    {
      id: 'right-foot',
      parentId: 'hip',
      label: 'right foot',
      x: 58,
      y: 88,
      radius: 3,
      confidence: 0.78,
      locked: false,
    },
  ];
  const joint = (id: string) => joints.find((item) => item.id === id)!;
  const bone = (
    id: string,
    parentJointId: string,
    childJointId: string,
  ): SkeletonBone => {
    const parent = joint(parentJointId);
    const child = joint(childJointId);
    return {
      id,
      parentJointId,
      childJointId,
      length: Math.hypot(child.x - parent.x, child.y - parent.y),
      angleMin: -180,
      angleMax: 180,
    };
  };
  const manifest = asset?.assetPackage ?? asset?.rigManifest;
  const targetRegions = [
    {
      id: 'head',
      label: 'head',
      targetX: 0.34,
      targetY: 0.02,
      targetWidth: 0.32,
      targetHeight: 0.25,
    },
    {
      id: 'torso',
      label: 'torso',
      targetX: 0.3,
      targetY: 0.28,
      targetWidth: 0.4,
      targetHeight: 0.34,
    },
    {
      id: 'left-arm',
      label: 'left arm',
      targetX: 0.16,
      targetY: 0.28,
      targetWidth: 0.24,
      targetHeight: 0.38,
    },
    {
      id: 'right-arm',
      label: 'right arm',
      targetX: 0.62,
      targetY: 0.28,
      targetWidth: 0.24,
      targetHeight: 0.38,
    },
    {
      id: 'left-leg',
      label: 'left leg',
      targetX: 0.25,
      targetY: 0.62,
      targetWidth: 0.22,
      targetHeight: 0.36,
    },
    {
      id: 'right-leg',
      label: 'right leg',
      targetX: 0.53,
      targetY: 0.62,
      targetWidth: 0.22,
      targetHeight: 0.36,
    },
  ];
  const sourceRegions = rigManifestForAsset('__fallback__').parts.map(
    (part) => ({
      id: part.id,
      label: part.label,
      x: part.x,
      y: part.y,
      width: part.width,
      height: part.height,
    }),
  );
  const regions = sourceRegions.map((region) => ({
    ...region,
    ...targetRegions.find((target) => target.id === region.id),
  }));
  const manifestRegions = manifest?.parts.map((part) => ({
    id: part.id,
    label: part.label,
    boneId: part.boneId,
    x: part.x,
    y: part.y,
    width: part.width,
    height: part.height,
    targetX: targetRegions.find((target) => target.id === part.id)?.targetX,
    targetY: targetRegions.find((target) => target.id === part.id)?.targetY,
    targetWidth: targetRegions.find((target) => target.id === part.id)
      ?.targetWidth,
    targetHeight: targetRegions.find((target) => target.id === part.id)
      ?.targetHeight,
    pivotX: part.pivotX,
    pivotY: part.pivotY,
    attachX: part.attachX,
    attachY: part.attachY,
    confidence: part.confidence,
    zIndex: part.zIndex,
    overlapPx: part.overlapPx,
  }));
  return {
    id: `skeleton-${assetId}`,
    label: `${label} skeleton`,
    assetId,
    rootJointId: 'root',
    joints,
    bones: [
      bone('bone-root-hip', 'root', 'hip'),
      bone('bone-hip-chest', 'hip', 'chest'),
      bone('bone-chest-head', 'chest', 'head'),
      bone('bone-chest-left-hand', 'chest', 'left-hand'),
      bone('bone-chest-right-hand', 'chest', 'right-hand'),
      bone('bone-hip-left-foot', 'hip', 'left-foot'),
      bone('bone-hip-right-foot', 'hip', 'right-foot'),
    ],
    binding: {
      assetId,
      method,
      sourceWidth: manifest?.image.width ?? asset?.dimensions?.width ?? 100,
      sourceHeight: manifest?.image.height ?? asset?.dimensions?.height ?? 220,
      regions:
        method === 'segmented' ? (manifestRegions ?? regions) : undefined,
      vertices: method === 'mesh' ? [] : undefined,
      weights: method === 'mesh' ? [] : undefined,
    },
    reviewStatus: 'pending-review',
    version: 1,
  };
}

function nextSceneId(scenes: SceneMeta[]) {
  let index = scenes.length + 1;
  let id = `scene-${String(index).padStart(2, '0')}`;
  while (scenes.some((scene) => scene.id === id)) {
    index += 1;
    id = `scene-${String(index).padStart(2, '0')}`;
  }
  return id;
}

function nextBeatId(beats: StoryBeat[]) {
  let index = beats.length + 1;
  let id = `beat-${String(index).padStart(2, '0')}`;
  while (beats.some((beat) => beat.id === id)) {
    index += 1;
    id = `beat-${String(index).padStart(2, '0')}`;
  }
  return id;
}

function nextAssetId(assets: Asset[], kind: AssetKind) {
  let index = assets.length + 1;
  let id = `asset-${kind}-${String(index).padStart(2, '0')}`;
  while (assets.some((asset) => asset.id === id)) {
    index += 1;
    id = `asset-${kind}-${String(index).padStart(2, '0')}`;
  }
  return id;
}

function nextAssetRequestId(requests: AssetGenerationRequest[]) {
  let index = requests.length + 1;
  let id = `asset-request-${String(index).padStart(2, '0')}`;
  while (requests.some((request) => request.id === id)) {
    index += 1;
    id = `asset-request-${String(index).padStart(2, '0')}`;
  }
  return id;
}

function assetKindLabel(kind: AssetKind) {
  return kind === 'rigged-character'
    ? 'Rigged character'
    : kind === 'background'
      ? 'Background'
      : kind === 'prop'
        ? 'Prop'
        : 'Audio';
}

function defaultAssetBrief(kind: AssetKind) {
  return kind === 'rigged-character'
    ? 'Readable character silhouette with a clear pose-change purpose.'
    : kind === 'background'
      ? 'Scene backdrop with enough negative space for characters and captions.'
      : kind === 'prop'
        ? 'Story prop with a simple silhouette and one clear animation beat.'
        : 'Non-voice audio layer that supports the scene without competing with captions.';
}

function poseFrameIndex(pose: Pose, frameCount: number) {
  if (frameCount < 4) return 0;
  return pose === 'nervous'
    ? 1
    : pose === 'wave' || pose === 'point'
      ? 2
      : pose === 'lean-in' || pose === 'shrug'
        ? 3
        : 0;
}

function isTrackLocked(project: Project, characterId: string) {
  return project.lockedTrackIds.includes(characterId);
}

function nextAudioCueId(cues: AudioCue[], kind: AudioCueKind) {
  let index = cues.length + 1;
  let id = `${kind}-${String(index).padStart(2, '0')}`;
  while (cues.some((cue) => cue.id === id)) {
    index += 1;
    id = `${kind}-${String(index).padStart(2, '0')}`;
  }
  return id;
}

function retimeTimelineMark(
  project: Project,
  mark: TimelineMark,
  requestedTime: number,
) {
  if (mark.kind === 'cue') return false;
  const frameDuration = 1000 / project.fps;
  const snappedTime = clamp(
    Math.round(requestedTime / frameDuration) * frameDuration,
    0,
    project.duration,
  );
  const frames =
    mark.kind === 'camera'
      ? project.cameraKeyframes
      : mark.kind === 'prop'
        ? project.propKeyframes.filter(
            (frame) => frame.assetId === mark.assetId,
          )
        : project.keyframes.filter(
            (frame) => frame.characterId === mark.characterId,
          );
  const target = frames.find((frame) => frame.id === mark.id);
  if (!target) return false;
  const ordered = [...frames].sort((a, b) => a.time - b.time);
  const index = ordered.findIndex((frame) => frame.id === mark.id);
  const minimum = index > 0 ? ordered[index - 1].time + frameDuration : 0;
  const maximum =
    index < ordered.length - 1
      ? ordered[index + 1].time - frameDuration
      : project.duration;
  if (minimum > maximum) return false;
  const nextTime = clamp(snappedTime, minimum, maximum);
  if (Math.abs(target.time - nextTime) < 0.01) return false;
  target.time = nextTime;
  if (mark.kind === 'camera') {
    project.cameraKeyframes.sort((a, b) => a.time - b.time);
  } else if (mark.kind === 'prop') {
    project.propKeyframes.sort(
      (a, b) => a.time - b.time || a.assetId.localeCompare(b.assetId),
    );
  } else {
    project.keyframes.sort(
      (a, b) => a.time - b.time || a.characterId.localeCompare(b.characterId),
    );
  }
  return true;
}

function loadSceneContent(project: Project, sceneId: string) {
  const target = project.scenes.find((scene) => scene.id === sceneId);
  if (!target) return false;
  project.activeSceneId = sceneId;
  project.templateId = target.templateId;
  project.duration = target.duration;
  project.characters = copy(target.characters ?? project.characters);
  project.keyframes = copy(target.keyframes ?? project.keyframes);
  project.propKeyframes = copy(target.propKeyframes ?? project.propKeyframes);
  project.cameraKeyframes = copy(
    target.cameraKeyframes ?? project.cameraKeyframes,
  );
  project.captions = copy(target.captions ?? project.captions);
  project.audioCues = copy(target.audioCues ?? project.audioCues);
  project.boneKeyframes = copy(
    target.boneKeyframes ??
      project.boneKeyframes.filter((frame) => frame.sceneId === sceneId),
  );
  project.lockedTrackIds = copy(
    target.lockedTrackIds ?? project.lockedTrackIds,
  );
  project.currentTime = 0;
  if (
    !project.characters.some((character) => character.id === project.selectedId)
  )
    project.selectedId = project.characters[0]?.id ?? '';
  return true;
}

function validateProjectState(project: Project): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (project.scenes.length === 0)
    issues.push({
      code: 'NO_SCENES',
      severity: 'error',
      path: 'scenes',
      message: 'Project needs at least one scene.',
    });
  if (project.characters.length === 0)
    issues.push({
      code: 'NO_CHARACTERS',
      severity: 'error',
      path: 'characters',
      message: 'Active scene needs at least one character.',
    });
  if (!Number.isFinite(project.duration) || project.duration <= 0)
    issues.push({
      code: 'INVALID_DURATION',
      severity: 'error',
      path: 'duration',
      message: 'Active scene needs a positive duration.',
    });
  if (
    !Number.isFinite(project.fps) ||
    ![12, 24].includes(project.fps) ||
    !Number.isFinite(project.renderWidth) ||
    !Number.isFinite(project.renderHeight) ||
    project.renderWidth <= 0 ||
    project.renderHeight <= 0 ||
    Math.abs(project.renderWidth / project.renderHeight - 16 / 9) > 0.02
  )
    issues.push({
      code: 'INVALID_RENDER_SETTINGS',
      severity: 'error',
      path: 'renderSettings',
      message: 'Render settings must use 12 or 24 fps and a 16:9 frame.',
    });
  project.captions.forEach((caption) => {
    if (
      !caption.text.trim() ||
      caption.end <= caption.start ||
      caption.start < 0 ||
      caption.end > project.duration
    )
      issues.push({
        code: 'CAPTION_OUT_OF_BOUNDS',
        severity: 'error',
        path: `captions.${caption.id}`,
        message: `${caption.id} has invalid timing or empty text.`,
      });
  });
  project.keyframes.forEach((frame) => {
    const character = project.characters.find(
      (candidate) => candidate.id === frame.characterId,
    );
    if (!character)
      issues.push({
        code: 'ORPHAN_KEYFRAME',
        severity: 'error',
        path: `keyframes.${frame.id}`,
        message: `${frame.id} points to a missing character.`,
      });
    else if (
      frame.variantId &&
      variantCompatibilityIssues(project, character, frame.variantId).length
    )
      issues.push({
        code: 'VARIANT_TOPOLOGY_DRIFT',
        severity: 'error',
        path: `keyframes.${frame.id}.variantId`,
        message: `${frame.id} references an incompatible or missing variant.`,
      });
  });
  project.propKeyframes.forEach((frame) => {
    const asset = project.assets.find(
      (candidate) => candidate.id === frame.assetId,
    );
    if (
      !asset ||
      asset.kind !== 'prop' ||
      !Number.isFinite(frame.time) ||
      frame.time < 0 ||
      frame.time > project.duration ||
      !Number.isFinite(frame.x) ||
      frame.x < 0 ||
      frame.x > 100 ||
      !Number.isFinite(frame.y) ||
      frame.y < 0 ||
      frame.y > 100 ||
      !Number.isFinite(frame.scale) ||
      frame.scale < 0.25 ||
      frame.scale > 2.5 ||
      !Number.isFinite(frame.rotation) ||
      frame.rotation < -180 ||
      frame.rotation > 180
    )
      issues.push({
        code: 'PROP_KEYFRAME_OUT_OF_BOUNDS',
        severity: 'error',
        path: `propKeyframes.${frame.id}`,
        message: `${frame.id} has an invalid prop asset or transform.`,
      });
  });
  if (project.cameraKeyframes.length === 0)
    issues.push({
      code: 'NO_CAMERA_KEYFRAMES',
      severity: 'error',
      path: 'cameraKeyframes',
      message: 'Active scene needs at least one camera keyframe.',
    });
  project.cameraKeyframes.forEach((frame) => {
    if (
      !Number.isFinite(frame.time) ||
      frame.time < 0 ||
      frame.time > project.duration ||
      !Number.isFinite(frame.zoom) ||
      frame.zoom < 0.75 ||
      frame.zoom > 1.8 ||
      !Number.isFinite(frame.panX) ||
      frame.panX < -25 ||
      frame.panX > 25 ||
      !Number.isFinite(frame.panY) ||
      frame.panY < -25 ||
      frame.panY > 25 ||
      !Number.isFinite(frame.rotation) ||
      frame.rotation < -8 ||
      frame.rotation > 8
    )
      issues.push({
        code: 'CAMERA_OUT_OF_BOUNDS',
        severity: 'error',
        path: `cameraKeyframes.${frame.id}`,
        message: `${frame.id} has an invalid camera transform or time.`,
      });
  });
  project.audioCues.forEach((cue) => {
    if (
      !isAudioCueKind(cue.kind) ||
      !Number.isFinite(cue.start) ||
      !Number.isFinite(cue.end) ||
      cue.start < 0 ||
      cue.end <= cue.start ||
      cue.end > project.duration ||
      !Number.isFinite(cue.volume) ||
      cue.volume < 0 ||
      cue.volume > 1
    )
      issues.push({
        code: 'AUDIO_OUT_OF_BOUNDS',
        severity: 'error',
        path: `audioCues.${cue.id}`,
        message: `${cue.id} has invalid timing, type, or volume.`,
      });
    if (cue.assetId) {
      const asset = project.assets.find((item) => item.id === cue.assetId);
      if (!asset || asset.kind !== 'audio')
        issues.push({
          code: 'AUDIO_ASSET_MISSING',
          severity: 'error',
          path: `audioCues.${cue.id}.assetId`,
          message: `${cue.id} references a missing audio asset.`,
        });
    }
  });
  project.assets.forEach((asset) => {
    if (
      asset.frameCount !== undefined &&
      asset.frameCount !== 1 &&
      asset.frameCount !== 4
    )
      issues.push({
        code: 'INVALID_ASSET_SHEET',
        severity: 'error',
        path: `assets.${asset.id}.frameCount`,
        message: `${asset.id} must be a single image, parts sheet, or four-pose sheet.`,
      });
    if (
      !asset.style ||
      !isAssetRole(asset.style.role) ||
      !isAssetTreatment(asset.style.treatment) ||
      !isAssetSilhouette(asset.style.silhouette) ||
      asset.style.palette.length === 0 ||
      asset.style.palette.some((value) => !value.trim())
    )
      issues.push({
        code: 'INVALID_ASSET_STYLE',
        severity: 'error',
        path: `assets.${asset.id}.style`,
        message: `${asset.id} needs a complete visual style direction.`,
      });
    if (
      asset.reviewStatus === 'approved' &&
      asset.kind === 'rigged-character' &&
      asset.frameLayout === 'parts-sheet'
    ) {
      const packageData = asset.assetPackage ?? asset.rigManifest;
      assetPackageIssues(packageData, asset.dimensions).forEach((message) =>
        issues.push({
          code: 'INVALID_ASSET_PACKAGE',
          severity: 'error',
          path: `assets.${asset.id}.assetPackage`,
          message: `${asset.id}: ${message}`,
        }),
      );
    }
  });
  project.skeletons.forEach((skeleton) => {
    const asset = project.assets.find((item) => item.id === skeleton.assetId);
    if (!asset || asset.kind !== 'rigged-character')
      issues.push({
        code: 'SKELETON_ASSET_MISSING',
        severity: 'error',
        path: `skeletons.${skeleton.id}.assetId`,
        message: `${skeleton.id} must reference a rigged-character asset.`,
      });
    if (
      !isReviewStatus(skeleton.reviewStatus) ||
      !isBindingMethod(skeleton.binding.method)
    )
      issues.push({
        code: 'SKELETON_INVALID_STATUS',
        severity: 'error',
        path: `skeletons.${skeleton.id}`,
        message: `${skeleton.id} has an invalid review status or binding method.`,
      });
    if (skeleton.joints.length === 0 || skeleton.bones.length === 0)
      issues.push({
        code: 'SKELETON_EMPTY',
        severity: 'error',
        path: `skeletons.${skeleton.id}`,
        message: `${skeleton.id} needs at least one joint and bone.`,
      });
    const jointIds = new Set(skeleton.joints.map((joint) => joint.id));
    skeleton.bones.forEach((bone) => {
      if (!jointIds.has(bone.parentJointId) || !jointIds.has(bone.childJointId))
        issues.push({
          code: 'SKELETON_ORPHAN_BONE',
          severity: 'error',
          path: `skeletons.${skeleton.id}.bones.${bone.id}`,
          message: `${bone.id} points to a missing joint.`,
        });
    });
    const rigIssues = skeletonModelIssues(skeleton, asset);
    rigIssues.forEach((message) =>
      issues.push({
        code: 'SKELETON_ALIGNMENT_REVIEW',
        severity: skeleton.reviewStatus === 'approved' ? 'error' : 'warning',
        path: `skeletons.${skeleton.id}.binding`,
        message: `${skeleton.id}: ${message}`,
      }),
    );
  });
  project.boneKeyframes.forEach((frame) => {
    const skeleton = project.skeletons.find(
      (item) => item.id === frame.skeletonId,
    );
    if (
      !skeleton ||
      skeleton.reviewStatus !== 'approved' ||
      !Number.isFinite(frame.time) ||
      frame.time < 0 ||
      frame.time > project.duration ||
      !frame.transforms.every(
        (transform) =>
          skeleton.bones.some((bone) => bone.id === transform.boneId) &&
          Number.isFinite(transform.rotation) &&
          Number.isFinite(transform.x) &&
          Number.isFinite(transform.y) &&
          Number.isFinite(transform.scale) &&
          transform.scale > 0,
      )
    )
      issues.push({
        code: 'BONE_KEYFRAME_INVALID',
        severity: 'error',
        path: `boneKeyframes.${frame.id}`,
        message: `${frame.id} has invalid skeleton, timing, or transforms.`,
      });
  });
  return issues;
}

function syncActiveScene(project: Project) {
  const activeScene = project.scenes.find(
    (scene) => scene.id === project.activeSceneId,
  );
  if (!activeScene) return;
  activeScene.duration = project.duration;
  activeScene.templateId = project.templateId;
  activeScene.characters = copy(project.characters);
  activeScene.keyframes = copy(project.keyframes);
  activeScene.propKeyframes = copy(project.propKeyframes);
  activeScene.cameraKeyframes = copy(project.cameraKeyframes);
  activeScene.captions = copy(project.captions);
  activeScene.audioCues = copy(project.audioCues);
  activeScene.boneKeyframes = copy(project.boneKeyframes);
  activeScene.lockedTrackIds = copy(project.lockedTrackIds);
}

const hydrateProject = (value: Partial<Project>): Project => {
  const base = copy(blankProject);
  const fallbackCharacters =
    Array.isArray(value.characters) && value.characters.length > 0
      ? value.characters
      : base.characters;
  const fallbackKeyframes =
    Array.isArray(value.keyframes) && value.keyframes.length > 0
      ? value.keyframes
      : base.keyframes;
  const fallbackPropKeyframes = Array.isArray(value.propKeyframes)
    ? value.propKeyframes
    : base.propKeyframes;
  const fallbackCameraKeyframes =
    Array.isArray(value.cameraKeyframes) && value.cameraKeyframes.length > 0
      ? value.cameraKeyframes
      : base.cameraKeyframes;
  const fallbackCaptions = Array.isArray(value.captions)
    ? value.captions
    : base.captions;
  const fallbackAudioCues = Array.isArray(value.audioCues)
    ? value.audioCues
    : base.audioCues;
  const rawAssets = Array.isArray(value.assets) ? value.assets : base.assets;
  const fallbackAssets = rawAssets.map((asset) => {
    const frameLayout: AssetFrameLayout =
      asset.frameLayout === 'parts-sheet'
        ? 'parts-sheet'
        : asset.frameCount === 4 || asset.frameLayout === 'four-column'
          ? 'four-column'
          : 'single';
    const rawAssetStyle = asset.style;
    const baseAssetStyle = defaultAssetStyle(asset.kind);
    const style: AssetStyle = {
      role: isAssetRole(rawAssetStyle?.role)
        ? rawAssetStyle.role
        : baseAssetStyle.role,
      treatment: isAssetTreatment(rawAssetStyle?.treatment)
        ? rawAssetStyle.treatment
        : baseAssetStyle.treatment,
      silhouette: isAssetSilhouette(rawAssetStyle?.silhouette)
        ? rawAssetStyle.silhouette
        : baseAssetStyle.silhouette,
      palette:
        Array.isArray(rawAssetStyle?.palette) &&
        rawAssetStyle.palette.every(
          (value) => typeof value === 'string' && value.trim(),
        )
          ? rawAssetStyle.palette.map((value) => value.trim())
          : baseAssetStyle.palette,
      notes:
        typeof rawAssetStyle?.notes === 'string'
          ? rawAssetStyle.notes
          : baseAssetStyle.notes,
    };
    const hydratedAsset: Asset = {
      ...asset,
      brief:
        typeof asset.brief === 'string' && asset.brief.trim()
          ? asset.brief.trim()
          : defaultAssetBrief(asset.kind),
      frameLayout,
      style,
    };
    const assetPackage = normalizeAssetPackage(hydratedAsset);
    if (assetPackage) {
      hydratedAsset.assetPackage = assetPackage;
      hydratedAsset.rigManifest = assetPackage;
    }
    return hydratedAsset;
  });
  const rawScenes =
    Array.isArray(value.scenes) && value.scenes.length > 0
      ? value.scenes
      : base.scenes;
  const rawBeats = Array.isArray(value.storyboardBeats)
    ? value.storyboardBeats
    : base.storyboardBeats;
  const rawStyleBible = value.styleBible ?? base.styleBible;
  const requestedActiveId = value.activeSceneId ?? rawScenes[0].id;
  const scenes = rawScenes.map((scene) => ({
    ...scene,
    characters:
      Array.isArray(scene.characters) && scene.characters.length > 0
        ? scene.characters
        : fallbackCharacters,
    keyframes:
      Array.isArray(scene.keyframes) && scene.keyframes.length > 0
        ? scene.keyframes
        : fallbackKeyframes,
    propKeyframes: Array.isArray(scene.propKeyframes)
      ? scene.propKeyframes
      : fallbackPropKeyframes,
    cameraKeyframes:
      Array.isArray(scene.cameraKeyframes) && scene.cameraKeyframes.length > 0
        ? scene.cameraKeyframes
        : fallbackCameraKeyframes,
    captions: Array.isArray(scene.captions) ? scene.captions : fallbackCaptions,
    audioCues: Array.isArray(scene.audioCues)
      ? scene.audioCues
      : fallbackAudioCues,
    boneKeyframes: Array.isArray(scene.boneKeyframes)
      ? scene.boneKeyframes
      : [],
    lockedTrackIds: Array.isArray(scene.lockedTrackIds)
      ? scene.lockedTrackIds
      : [],
  }));
  const activeScene =
    scenes.find((scene) => scene.id === requestedActiveId) ?? scenes[0];
  const rawSkeletons = Array.isArray(value.skeletons)
    ? value.skeletons
    : base.skeletons;
  const hydratedSkeletons = rawSkeletons.map((skeleton) => {
    const asset = fallbackAssets.find((item) => item.id === skeleton.assetId);
    const fallback = defaultSkeletonForAsset(
      skeleton.assetId,
      skeleton.label || asset?.label || skeleton.assetId,
      isBindingMethod(skeleton.binding?.method)
        ? skeleton.binding.method
        : 'segmented',
      asset,
    );
    const skeletonVersion =
      Number.isInteger(skeleton.version) && skeleton.version > 0
        ? skeleton.version
        : fallback.version;
    const legacyMesh = adaptLegacyMesh({
      assetId: skeleton.assetId,
      skeletonVersion,
      vertices: skeleton.binding?.vertices,
      weights: skeleton.binding?.weights,
      experimentalMesh:
        asset?.assetPackage?.experimentalMesh ??
        asset?.rigManifest?.experimentalMesh,
    });
    return {
      ...fallback,
      ...skeleton,
      version: skeletonVersion,
      rootJointId:
        typeof skeleton.rootJointId === 'string'
          ? skeleton.rootJointId
          : fallback.rootJointId,
      joints:
        Array.isArray(skeleton.joints) && skeleton.joints.length
          ? skeleton.joints
          : fallback.joints,
      bones:
        Array.isArray(skeleton.bones) && skeleton.bones.length
          ? skeleton.bones
          : fallback.bones,
      binding: {
        ...fallback.binding,
        ...skeleton.binding,
        regions:
          Array.isArray(skeleton.binding?.regions) &&
          skeleton.binding.regions.length
            ? skeleton.binding.regions
            : fallback.binding.regions,
        mesh: skeleton.binding?.mesh ?? legacyMesh,
      },
    } satisfies Skeleton;
  });
  return {
    ...base,
    ...value,
    name:
      typeof value.name === 'string' && value.name.trim()
        ? value.name.trim()
        : base.name,
    scenes: copy(scenes),
    storyboardBeats: copy(rawBeats),
    styleBible: {
      construction:
        typeof rawStyleBible.construction === 'string'
          ? rawStyleBible.construction
          : base.styleBible.construction,
      motion:
        typeof rawStyleBible.motion === 'string'
          ? rawStyleBible.motion
          : base.styleBible.motion,
      camera:
        typeof rawStyleBible.camera === 'string'
          ? rawStyleBible.camera
          : base.styleBible.camera,
      palette:
        Array.isArray(rawStyleBible.palette) &&
        rawStyleBible.palette.every((value) => typeof value === 'string')
          ? rawStyleBible.palette
          : base.styleBible.palette,
      notes:
        typeof rawStyleBible.notes === 'string'
          ? rawStyleBible.notes
          : base.styleBible.notes,
    },
    activeSceneId: activeScene.id,
    templateId: activeScene.templateId ?? value.templateId,
    duration: activeScene.duration,
    characters: copy(activeScene.characters ?? fallbackCharacters),
    keyframes: copy(activeScene.keyframes ?? fallbackKeyframes),
    propKeyframes: copy(activeScene.propKeyframes ?? fallbackPropKeyframes),
    cameraKeyframes: copy(
      activeScene.cameraKeyframes ?? fallbackCameraKeyframes,
    ),
    captions: copy(activeScene.captions ?? fallbackCaptions),
    audioCues: copy(activeScene.audioCues ?? fallbackAudioCues),
    assetRequests: Array.isArray(value.assetRequests)
      ? copy(value.assetRequests)
      : copy(base.assetRequests),
    skeletons: copy(hydratedSkeletons),
    boneKeyframes: copy(activeScene.boneKeyframes ?? value.boneKeyframes ?? []),
    motionClips: Array.isArray(value.motionClips)
      ? copy(value.motionClips)
      : copy(base.motionClips),
    lockedTrackIds: copy(activeScene.lockedTrackIds ?? []),
    assets: copy(fallbackAssets),
  };
};

function resizeProjectDuration(project: Project, durationMs: number) {
  const previousDuration = project.duration;
  const duration = clamp(Math.round(durationMs), 500, 60000);
  project.duration = duration;
  project.currentTime = Math.min(project.currentTime, duration);
  project.keyframes = project.keyframes.filter(
    (frame) => frame.time <= duration,
  );
  project.propKeyframes = project.propKeyframes.filter(
    (frame) => frame.time <= duration,
  );
  project.cameraKeyframes = project.cameraKeyframes.filter(
    (frame) => frame.time <= duration,
  );
  project.boneKeyframes = project.boneKeyframes.filter(
    (frame) => frame.time <= duration,
  );
  project.captions = project.captions
    .filter((caption) => caption.start < duration)
    .map((caption) => ({
      ...caption,
      end: Math.min(caption.end, duration),
    }))
    .filter((caption) => caption.end > caption.start);
  project.audioCues = project.audioCues
    .filter((cue) => cue.start < duration)
    .map((cue) => ({
      ...cue,
      end:
        cue.kind === 'music' && cue.end === previousDuration
          ? duration
          : Math.min(cue.end, duration),
    }))
    .filter((cue) => cue.end > cue.start);
  return duration;
}

function retimeProjectBySpeed(project: Project, speed: number) {
  const duration = clamp(Math.round(project.duration / speed), 500, 60000);
  const retime = (time: number) => clamp(Math.round(time / speed), 0, duration);
  const retimeRange = (start: number, end: number) => {
    const nextStart = retime(start);
    return {
      start: nextStart,
      end: Math.min(duration, Math.max(nextStart + 1, retime(end))),
    };
  };
  project.duration = duration;
  project.currentTime = retime(project.currentTime);
  project.keyframes = project.keyframes.map((frame) => ({
    ...frame,
    time: retime(frame.time),
  }));
  project.propKeyframes = project.propKeyframes.map((frame) => ({
    ...frame,
    time: retime(frame.time),
  }));
  project.cameraKeyframes = project.cameraKeyframes.map((frame) => ({
    ...frame,
    time: retime(frame.time),
  }));
  project.boneKeyframes = project.boneKeyframes.map((frame) => ({
    ...frame,
    time: retime(frame.time),
  }));
  project.captions = project.captions
    .map((caption) => ({
      ...caption,
      ...retimeRange(caption.start, caption.end),
    }))
    .filter(
      (caption) => caption.end <= duration && caption.end > caption.start,
    );
  project.audioCues = project.audioCues
    .map((cue) => ({
      ...cue,
      ...retimeRange(cue.start, cue.end),
    }))
    .filter((cue) => cue.end <= duration && cue.end > cue.start);
  project.storyboardBeats = project.storyboardBeats
    .map((beat) => {
      const range = retimeRange(beat.startMs, beat.endMs);
      return { ...beat, startMs: range.start, endMs: range.end };
    })
    .filter((beat) => beat.endMs <= duration && beat.endMs > beat.startMs);
  return duration;
}

function evaluateCharacters(project: Project, time: number) {
  return project.characters.map((character) => {
    const frames = project.keyframes
      .filter((frame) => frame.characterId === character.id)
      .sort((a, b) => a.time - b.time);
    if (frames.length === 0) return character;
    const first = frames[0];
    if (time <= first.time)
      return {
        ...character,
        x: first.x,
        y: first.y,
        rotation: first.rotation,
        pose: first.pose,
        variantId: first.variantId ?? character.variantId,
      };
    const last = frames.at(-1);
    if (!last || time >= last.time)
      return last
        ? {
            ...character,
            x: last.x,
            y: last.y,
            rotation: last.rotation,
            pose: last.pose,
            variantId: last.variantId ?? character.variantId,
          }
        : character;
    const nextIndex = frames.findIndex((frame) => frame.time > time);
    const right = frames[nextIndex];
    const left = frames[nextIndex - 1];
    const amount = (time - left.time) / (right.time - left.time);
    return {
      ...character,
      x: left.x + (right.x - left.x) * amount,
      y: left.y + (right.y - left.y) * amount,
      rotation: left.rotation + (right.rotation - left.rotation) * amount,
      pose: amount < 0.5 ? left.pose : right.pose,
      variantId:
        (amount < 0.5 ? left.variantId : right.variantId) ??
        character.variantId,
    };
  });
}

function characterAssetFor(project: Project, character: Character) {
  const variant = character.variantId
    ? project.assets.find((asset) => asset.id === character.variantId)
    : undefined;
  if (variant?.dataUrl) return variant;
  return character.assetId
    ? project.assets.find((asset) => asset.id === character.assetId)
    : undefined;
}

function variantCompatibilityIssues(
  project: Project,
  character: Character,
  variantId: string,
) {
  const issues: string[] = [];
  const base = character.assetId
    ? project.assets.find((asset) => asset.id === character.assetId)
    : undefined;
  const variant = project.assets.find((asset) => asset.id === variantId);
  if (!base || !variant) return ['Variant or base asset is missing.'];
  if (
    variant.kind !== 'rigged-character' ||
    variant.variantOf !== base.id ||
    variant.reviewStatus !== 'approved' ||
    !variant.dataUrl
  )
    issues.push(
      'Variant is not an approved child of the character base asset.',
    );
  const basePackage = base.assetPackage ?? base.rigManifest;
  const variantPackage = variant.assetPackage ?? variant.rigManifest;
  if (basePackage && variantPackage) {
    const baseTopology = basePackage.parts
      .map((part) => `${part.id}:${part.boneId}`)
      .sort()
      .join('|');
    const variantTopology = variantPackage.parts
      .map((part) => `${part.id}:${part.boneId}`)
      .sort()
      .join('|');
    if (baseTopology !== variantTopology)
      issues.push('Variant topology differs from the approved base package.');
  }
  return issues;
}

function characterSkeletonFor(project: Project, character: Character) {
  const asset = characterAssetFor(project, character);
  const baseAssetId = asset?.variantOf ?? character.assetId;
  return project.skeletons.find(
    (skeleton) =>
      skeleton.assetId === baseAssetId && skeleton.reviewStatus === 'approved',
  );
}

function defaultBoneTransforms(skeleton: Skeleton): BoneTransform[] {
  return skeleton.bones.map((bone) => ({
    boneId: bone.id,
    rotation: 0,
    x: 0,
    y: 0,
    scale: 1,
  }));
}

function evaluateBoneKeyframes(
  project: Project,
  skeleton: Skeleton,
  time: number,
): BoneTransform[] {
  const frames = project.boneKeyframes
    .filter(
      (frame) =>
        frame.sceneId === project.activeSceneId &&
        frame.skeletonId === skeleton.id,
    )
    .sort((a, b) => a.time - b.time);
  if (frames.length === 0) return defaultBoneTransforms(skeleton);
  const interpolate = (
    left: BoneTransform,
    right: BoneTransform,
    amount: number,
  ) => ({
    boneId: left.boneId,
    rotation: left.rotation + (right.rotation - left.rotation) * amount,
    x: left.x + (right.x - left.x) * amount,
    y: left.y + (right.y - left.y) * amount,
    scale: left.scale + (right.scale - left.scale) * amount,
  });
  if (time <= frames[0].time) return copy(frames[0].transforms);
  const last = frames.at(-1);
  if (!last || time >= last.time) return copy(last?.transforms ?? []);
  const nextIndex = frames.findIndex((frame) => frame.time > time);
  const leftFrame = frames[nextIndex - 1];
  const rightFrame = frames[nextIndex];
  const amount = (time - leftFrame.time) / (rightFrame.time - leftFrame.time);
  const rightById = new Map(
    rightFrame.transforms.map((item) => [item.boneId, item]),
  );
  return leftFrame.transforms.map((left) => {
    const right = rightById.get(left.boneId) ?? left;
    return interpolate(left, right, amount);
  });
}

function easeMotionAmount(amount: number, easing: MotionClip['easing']) {
  if (easing === 'hold') return amount < 1 ? 0 : 1;
  if (easing === 'ease-in-out') return amount * amount * (3 - 2 * amount);
  return amount;
}

function evaluateMotionClip(clip: MotionClip, timeMs: number) {
  const time = clip.loop
    ? ((Math.max(0, timeMs) % clip.durationMs) + clip.durationMs) %
      clip.durationMs
    : clamp(timeMs, 0, clip.durationMs);
  const frames = clip.transforms.slice().sort((a, b) => a.time - b.time);
  if (frames.length === 0) return { transforms: [], variantId: undefined };
  if (time <= frames[0].time) return frames[0];
  const last = frames.at(-1);
  if (!last || time >= last.time) return last;
  const nextIndex = frames.findIndex((frame) => frame.time > time);
  const left = frames[nextIndex - 1];
  const right = frames[nextIndex];
  const amount = easeMotionAmount(
    (time - left.time) / Math.max(1, right.time - left.time),
    clip.easing,
  );
  const rightById = new Map(
    right.transforms.map((item) => [item.boneId, item]),
  );
  return {
    variantId: amount < 0.5 ? left.variantId : right.variantId,
    transforms: left.transforms.map((item) => {
      const other = rightById.get(item.boneId) ?? item;
      return {
        boneId: item.boneId,
        rotation: item.rotation + (other.rotation - item.rotation) * amount,
        x: item.x + (other.x - item.x) * amount,
        y: item.y + (other.y - item.y) * amount,
        scale: item.scale + (other.scale - item.scale) * amount,
      };
    }),
  };
}

function upsertBoneKeyframeInProject(
  project: Project,
  skeletonId: string,
  time: number,
  transforms: BoneTransform[],
) {
  const safeTime = Math.max(0, Math.min(project.duration, Math.round(time)));
  const normalized = transforms.map((transform) => ({
    boneId: transform.boneId,
    rotation: clamp(Number(transform.rotation) || 0, -180, 180),
    x: clamp(Number(transform.x) || 0, -160, 160),
    y: clamp(Number(transform.y) || 0, -160, 160),
    scale: clamp(Number(transform.scale) || 1, 0.25, 2.5),
  }));
  const existing = project.boneKeyframes.find(
    (frame) =>
      frame.sceneId === project.activeSceneId &&
      frame.skeletonId === skeletonId &&
      frame.time === safeTime,
  );
  if (existing) existing.transforms = normalized;
  else
    project.boneKeyframes.push({
      id: `bkf-${skeletonId}-${safeTime}`,
      sceneId: project.activeSceneId,
      skeletonId,
      time: safeTime,
      transforms: normalized,
    });
  project.boneKeyframes.sort((a, b) => a.time - b.time);
  return safeTime;
}

function defaultPropKeyframe(assetId: string, index: number): PropKeyframe {
  return {
    id: `prop-default-${assetId}`,
    assetId,
    time: 0,
    x: 68.5 + index * 6.48,
    y: 56 - index * 1.28,
    scale: 1,
    rotation: 0,
  };
}

function evaluateProps(project: Project, time: number): PropKeyframe[] {
  return project.assets
    .filter((asset) => asset.kind === 'prop' && asset.dataUrl)
    .map((asset, index) => {
      const fallback = defaultPropKeyframe(asset.id, index);
      const frames = project.propKeyframes
        .filter((frame) => frame.assetId === asset.id)
        .sort((a, b) => a.time - b.time);
      if (frames.length === 0) return fallback;
      const first = frames[0];
      if (time <= first.time) return { ...fallback, ...first };
      const last = frames.at(-1);
      if (!last || time >= last.time) return last ?? fallback;
      const nextIndex = frames.findIndex((frame) => frame.time > time);
      const right = frames[nextIndex];
      const left = frames[nextIndex - 1];
      const amount = (time - left.time) / (right.time - left.time);
      return {
        ...fallback,
        assetId: asset.id,
        time,
        x: left.x + (right.x - left.x) * amount,
        y: left.y + (right.y - left.y) * amount,
        scale: left.scale + (right.scale - left.scale) * amount,
        rotation: left.rotation + (right.rotation - left.rotation) * amount,
      };
    });
}

function upsertPropKeyframe(
  project: Project,
  assetId: string,
  time: number,
  changes: Partial<Pick<PropKeyframe, 'x' | 'y' | 'scale' | 'rotation'>>,
) {
  const prop = evaluateProps(project, time).find(
    (item) => item.assetId === assetId,
  );
  if (!prop) return null;
  const safeTime = clamp(time, 0, project.duration);
  const existing = project.propKeyframes.find(
    (frame) => frame.assetId === assetId && frame.time === safeTime,
  );
  const frame: PropKeyframe = {
    id: existing?.id ?? `pkf-${assetId}-${Math.round(safeTime)}`,
    assetId,
    time: safeTime,
    x: clamp(changes.x ?? prop.x, 0, 100),
    y: clamp(changes.y ?? prop.y, 0, 100),
    scale: clamp(changes.scale ?? prop.scale, 0.25, 2.5),
    rotation: clamp(changes.rotation ?? prop.rotation, -180, 180),
  };
  if (existing) Object.assign(existing, frame);
  else project.propKeyframes.push(frame);
  project.propKeyframes.sort((a, b) => a.time - b.time);
  return frame;
}

function evaluateCamera(project: Project, time: number): CameraKeyframe {
  const frames = [...project.cameraKeyframes].sort((a, b) => a.time - b.time);
  const fallback: CameraKeyframe = {
    id: 'cam-fallback',
    time: 0,
    zoom: 1,
    panX: 0,
    panY: 0,
    rotation: 0,
  };
  if (frames.length === 0) return fallback;
  const first = frames[0];
  if (time <= first.time) return first;
  const last = frames.at(-1);
  if (!last || time >= last.time) return last ?? fallback;
  const nextIndex = frames.findIndex((frame) => frame.time > time);
  const right = frames[nextIndex];
  const left = frames[nextIndex - 1];
  const amount = (time - left.time) / (right.time - left.time);
  return {
    id: `cam-evaluated-${Math.round(time)}`,
    time,
    zoom: left.zoom + (right.zoom - left.zoom) * amount,
    panX: left.panX + (right.panX - left.panX) * amount,
    panY: left.panY + (right.panY - left.panY) * amount,
    rotation: left.rotation + (right.rotation - left.rotation) * amount,
  };
}

function upsertCameraKeyframe(
  project: Project,
  time: number,
  changes: Partial<Pick<CameraKeyframe, 'zoom' | 'panX' | 'panY' | 'rotation'>>,
) {
  const camera = evaluateCamera(project, time);
  const safeTime = clamp(time, 0, project.duration);
  const existing = project.cameraKeyframes.find(
    (frame) => frame.time === safeTime,
  );
  const frame: CameraKeyframe = {
    id:
      existing?.id ?? `cam-${Math.round(safeTime).toString().padStart(4, '0')}`,
    time: safeTime,
    zoom: clamp(changes.zoom ?? camera.zoom, 0.75, 1.8),
    panX: clamp(changes.panX ?? camera.panX, -25, 25),
    panY: clamp(changes.panY ?? camera.panY, -25, 25),
    rotation: clamp(changes.rotation ?? camera.rotation, -8, 8),
  };
  if (existing) Object.assign(existing, frame);
  else project.cameraKeyframes.push(frame);
  project.cameraKeyframes.sort((a, b) => a.time - b.time);
  return frame;
}

function drawDinerBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  backgroundImage?: CanvasImageSource,
  backgroundAsset?: Asset,
) {
  if (backgroundImage) {
    ctx.save();
    ctx.filter = assetTreatmentFilter(backgroundAsset);
    ctx.drawImage(backgroundImage, 0, 0, width, height);
    ctx.restore();
    return;
  }
  ctx.fillStyle = '#e9d6b8';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#c38b62';
  ctx.fillRect(0, height * 0.69, width, height * 0.31);
  ctx.fillStyle = '#f4ead9';
  ctx.fillRect(width * 0.05, height * 0.08, width * 0.9, height * 0.52);
  ctx.strokeStyle = '#d8c4a5';
  ctx.lineWidth = 3;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(width * (0.11 + i * 0.19), height * 0.08);
    ctx.lineTo(width * (0.11 + i * 0.19), height * 0.6);
    ctx.stroke();
  }
  ctx.fillStyle = '#506d72';
  ctx.fillRect(width * 0.1, height * 0.2, width * 0.8, 7);
  ctx.fillStyle = '#2d4448';
  ctx.font = '700 13px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    'THE LATE PLATE  ·  OPEN UNTIL AWKWARD',
    width / 2,
    height * 0.17,
  );
  ctx.fillStyle = '#714b3c';
  ctx.fillRect(width * 0.17, height * 0.55, width * 0.66, 20);
  ctx.fillStyle = '#d6a26d';
  ctx.fillRect(width * 0.2, height * 0.59, width * 0.6, 11);
  ctx.fillStyle = '#b86e4e';
  ctx.beginPath();
  ctx.arc(width * 0.3, height * 0.52, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f5d69b';
  ctx.beginPath();
  ctx.arc(width * 0.3, height * 0.52, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#597579';
  ctx.fillRect(width * 0.71, height * 0.27, 32, 72);
  ctx.fillStyle = '#f0c27f';
  ctx.fillRect(width * 0.73, height * 0.3, 28, 40);
}

function drawImportedProps(
  ctx: CanvasRenderingContext2D,
  project: Project,
  time: number,
  width: number,
  height: number,
  imageMap?: Map<string, CanvasImageSource>,
) {
  evaluateProps(project, time).forEach((prop) => {
    const image = imageMap?.get(prop.assetId);
    if (!image) return;
    const asset = project.assets.find((item) => item.id === prop.assetId);
    const size = Math.min(width, height) * 0.16 * prop.scale;
    ctx.save();
    ctx.translate((prop.x / 100) * width, (prop.y / 100) * height);
    ctx.rotate((prop.rotation * Math.PI) / 180);
    ctx.filter = assetTreatmentFilter(asset);
    ctx.drawImage(image, -size / 2, -size / 2, size, size);
    ctx.restore();
  });
}

function applyCameraTransform(
  ctx: CanvasRenderingContext2D,
  camera: CameraKeyframe,
  width: number,
  height: number,
) {
  ctx.translate(
    width / 2 + (camera.panX / 100) * width,
    height / 2 + (camera.panY / 100) * height,
  );
  ctx.rotate((camera.rotation * Math.PI) / 180);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-width / 2, -height / 2);
}

async function loadAudioBuffers(
  context: AudioContext,
  assets: Asset[],
): Promise<Map<string, AudioBuffer>> {
  const buffers = new Map<string, AudioBuffer>();
  await Promise.all(
    assets
      .filter((asset) => asset.kind === 'audio' && asset.dataUrl)
      .map(async (asset) => {
        try {
          const response = await fetch(asset.dataUrl as string);
          if (!response.ok) return;
          const bytes = await response.arrayBuffer();
          buffers.set(asset.id, await context.decodeAudioData(bytes));
        } catch {
          /* Keep the procedural fallback for unavailable audio assets. */
        }
      }),
  );
  return buffers;
}

function scheduleAudioCues(
  context: AudioContext,
  destination: AudioNode,
  cues: AudioCue[],
  startAt: number,
  buffers: Map<string, AudioBuffer>,
  assets: Asset[],
) {
  const footstepBuffer = context.createBuffer(
    1,
    Math.ceil(context.sampleRate * 0.12),
    context.sampleRate,
  );
  const noise = footstepBuffer.getChannelData(0);
  for (let index = 0; index < noise.length; index++) {
    const envelope = 1 - index / noise.length;
    noise[index] = Math.sin(index * 12.9898) * envelope;
  }
  cues.forEach((cue) => {
    const start = startAt + cue.start / 1000;
    const end = startAt + cue.end / 1000;
    const audioAsset = cue.assetId
      ? assets.find((asset) => asset.id === cue.assetId)
      : undefined;
    const audioBuffer = cue.assetId ? buffers.get(cue.assetId) : undefined;
    if (audioBuffer) {
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = audioBuffer;
      source.loop = Boolean(
        cue.loop || (cue.kind === 'music' && audioAsset?.loopable),
      );
      const attackEnd = Math.max(
        start + 0.001,
        Math.min(start + 0.08, end - 0.001),
      );
      const releaseStart = Math.max(attackEnd, end - 0.18);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(cue.volume, attackEnd);
      gain.gain.setValueAtTime(cue.volume, releaseStart);
      gain.gain.linearRampToValueAtTime(0, end);
      source.connect(gain).connect(destination);
      source.start(start, cue.kind === 'music' ? 0 : 0);
      source.stop(end + 0.05);
      return;
    }
    if (cue.kind === 'music') {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(110, start);
      gain.gain.setValueAtTime(0, start);
      const attackEnd = Math.max(
        start + 0.001,
        Math.min(start + 0.18, end - 0.001),
      );
      const releaseStart = Math.max(attackEnd, end - 0.25);
      gain.gain.linearRampToValueAtTime(cue.volume * 0.22, attackEnd);
      gain.gain.setValueAtTime(cue.volume * 0.22, releaseStart);
      gain.gain.linearRampToValueAtTime(0, end);
      oscillator.connect(gain).connect(destination);
      oscillator.start(start);
      oscillator.stop(end + 0.05);
    } else if (cue.kind === 'footstep') {
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = footstepBuffer;
      gain.gain.setValueAtTime(cue.volume * 0.35, start);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        Math.max(start + 0.04, end),
      );
      source.connect(gain).connect(destination);
      source.start(start);
    } else {
      [330, 440].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, start + index * 0.04);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(cue.volume * 0.18, start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, end);
        oscillator.connect(gain).connect(destination);
        oscillator.start(start);
        oscillator.stop(end + 0.05);
      });
    }
  });
}

function upsertCharacterKeyframe(
  project: Project,
  characterId: string,
  time: number,
  changes: Partial<
    Pick<Keyframe, 'x' | 'y' | 'rotation' | 'pose' | 'variantId'>
  >,
) {
  const character = evaluateCharacters(project, time).find(
    (item) => item.id === characterId,
  );
  if (!character) return null;
  const safeTime = clamp(time, 0, project.duration);
  const existing = project.keyframes.find(
    (frame) => frame.characterId === characterId && frame.time === safeTime,
  );
  const frame: Keyframe = {
    id: existing?.id ?? `kf-${characterId}-${Math.round(safeTime)}`,
    characterId,
    time: safeTime,
    x: clamp(changes.x ?? character.x, 0, 100),
    y: clamp(changes.y ?? character.y, 0, 100),
    rotation: clamp(changes.rotation ?? character.rotation, -180, 180),
    pose: changes.pose ?? character.pose,
    variantId: changes.variantId ?? character.variantId,
  };
  if (existing) Object.assign(existing, frame);
  else project.keyframes.push(frame);
  project.keyframes.sort(
    (a, b) => a.time - b.time || a.characterId.localeCompare(b.characterId),
  );
  return frame;
}

type BoneWorldPose = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  angle: number;
  scale: number;
};

function buildBoneWorldPoses(
  skeleton: Skeleton,
  transforms: BoneTransform[],
  imageWidth: number,
  imageHeight: number,
) {
  const world = new Map<string, BoneWorldPose>();
  const evaluated = buildBoneMatrices(
    skeleton.joints,
    skeleton.bones,
    transforms,
    imageWidth,
    imageHeight,
  );
  evaluated.matrices.forEach((pose, boneId) =>
    world.set(boneId, {
      startX: pose.start.x,
      startY: pose.start.y,
      endX: pose.end.x,
      endY: pose.end.y,
      angle: pose.angle,
      scale: pose.scale,
    }),
  );
  return world;
}

type CharacterRenderDiagnostics = {
  renderer: 'canvas-rigid-v1' | 'canvas-segmented-v1' | 'canvas-lbs-mesh-v1';
  fallbackUsed: boolean;
  issues: MeshIssue[];
  meshMetrics?: MeshMetrics;
};

function drawTexturedMesh(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  mesh: MeshBindingV1,
  points: Point2[],
  sourceWidth: number,
  sourceHeight: number,
  showWireframe: boolean,
) {
  mesh.triangles.forEach((indices) => {
    const source = indices.map((index) => ({
      x: mesh.vertices[index].u * sourceWidth,
      y: mesh.vertices[index].v * sourceHeight,
    })) as [Point2, Point2, Point2];
    const destination = indices.map((index) => points[index]) as [
      Point2,
      Point2,
      Point2,
    ];
    const affine = affineFromTriangles(source, destination);
    if (!affine) return;
    const clip = expandTriangle(destination);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(clip[0].x, clip[0].y);
    ctx.lineTo(clip[1].x, clip[1].y);
    ctx.lineTo(clip[2].x, clip[2].y);
    ctx.closePath();
    ctx.clip();
    ctx.transform(affine.a, affine.b, affine.c, affine.d, affine.e, affine.f);
    ctx.drawImage(image, 0, 0, sourceWidth, sourceHeight);
    ctx.restore();
  });
  if (!showWireframe) return;
  ctx.save();
  ctx.strokeStyle = '#8a52ff';
  ctx.lineWidth = 0.8;
  mesh.triangles.forEach((indices) => {
    const triangle = indices.map((index) => points[index]);
    ctx.beginPath();
    ctx.moveTo(triangle[0].x, triangle[0].y);
    ctx.lineTo(triangle[1].x, triangle[1].y);
    ctx.lineTo(triangle[2].x, triangle[2].y);
    ctx.closePath();
    ctx.stroke();
  });
  ctx.restore();
}

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  c: Character,
  width: number,
  height: number,
  selected: boolean,
  characterImage?: CanvasImageSource,
  characterAsset?: Asset,
  skeleton?: Skeleton,
  boneTransforms: BoneTransform[] = [],
  isolatedPartId?: string | null,
  showAlphaMask = false,
  showMeshWireframe = false,
): CharacterRenderDiagnostics {
  const x = (c.x / 100) * width,
    ground = (c.y / 100) * height,
    scale = Math.min(width / 900, height / 520);
  ctx.save();
  ctx.translate(x, ground);
  ctx.rotate((c.rotation * Math.PI) / 180);
  ctx.scale(scale, scale);
  if (selected) {
    ctx.strokeStyle = '#f2b84b';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    ctx.strokeRect(-66, -270, 132, 280);
    ctx.setLineDash([]);
    ctx.fillStyle = '#f2b84b';
    ctx.beginPath();
    ctx.arc(0, -282, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (skeleton?.binding.method === 'mesh' && !characterImage) {
    ctx.restore();
    return {
      renderer: 'canvas-lbs-mesh-v1',
      fallbackUsed: false,
      issues: [
        {
          code: 'MESH_TEXTURE_UNAVAILABLE',
          message: 'Mesh texture could not be decoded for rendering.',
        },
      ],
    };
  }
  if (characterImage) {
    const image = characterImage as HTMLImageElement;
    ctx.filter = assetTreatmentFilter(characterAsset);
    const frameCount = characterAsset?.frameCount === 4 ? 4 : 1;
    const sourceWidth = image.naturalWidth || image.width || 100;
    const sourceHeight = image.naturalHeight || image.height || 220;
    const frameWidth = sourceWidth / frameCount;
    const imageScale =
      characterAsset?.frameLayout === 'parts-sheet'
        ? 242 / sourceHeight
        : Math.min(112 / frameWidth, 242 / sourceHeight);
    const imageWidth = frameWidth * imageScale;
    const imageHeight = sourceHeight * imageScale;
    if (skeleton?.binding.method === 'mesh') {
      const mesh = skeleton.binding.mesh;
      const issues = validateMeshBinding(mesh, {
        assetId: skeleton.assetId,
        skeletonVersion: skeleton.version,
        boneIds: skeleton.bones.map((bone) => bone.id),
      });
      const matrices = buildBoneMatrices(
        skeleton.joints,
        skeleton.bones,
        boneTransforms,
        imageWidth,
        imageHeight,
      );
      issues.push(...matrices.issues);
      const evaluated = mesh
        ? evaluateMeshVertices(mesh, matrices.matrices, imageWidth, imageHeight)
        : undefined;
      if (evaluated) issues.push(...evaluated.issues);
      const meshMetrics =
        mesh && evaluated
          ? measureMesh(mesh, evaluated.points, imageWidth, imageHeight)
          : undefined;
      if (meshMetrics?.degenerateCount)
        issues.push({
          code: 'MESH_EVALUATED_DEGENERATE',
          message: `${meshMetrics.degenerateCount} evaluated triangle(s) are degenerate.`,
        });
      if (meshMetrics?.flippedCount)
        issues.push({
          code: 'MESH_EVALUATED_FLIPPED',
          message: `${meshMetrics.flippedCount} evaluated triangle(s) changed winding.`,
        });
      if (mesh && evaluated && issues.length === 0)
        drawTexturedMesh(
          ctx,
          characterImage,
          mesh,
          evaluated.points,
          sourceWidth,
          sourceHeight,
          showMeshWireframe,
        );
      ctx.filter = 'none';
      ctx.restore();
      return {
        renderer: 'canvas-lbs-mesh-v1',
        fallbackUsed: false,
        issues,
        meshMetrics,
      };
    }
    if (
      characterAsset?.frameLayout === 'parts-sheet' &&
      skeleton?.binding.method === 'segmented' &&
      skeleton.binding.regions?.length
    ) {
      const poses = buildBoneWorldPoses(
        skeleton,
        boneTransforms,
        imageWidth,
        imageHeight,
      );
      skeleton.binding.regions
        .slice()
        .filter((region) => !isolatedPartId || region.id === isolatedPartId)
        .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
        .forEach((region) => {
          const sourceX = region.x <= 1 ? region.x * sourceWidth : region.x;
          const sourceY = region.y <= 1 ? region.y * sourceHeight : region.y;
          const sourceRegionWidth =
            region.width <= 1 ? region.width * sourceWidth : region.width;
          const sourceRegionHeight =
            region.height <= 1 ? region.height * sourceHeight : region.height;
          const layoutWidth =
            (region.targetWidth ?? sourceRegionWidth / sourceWidth) *
            imageWidth;
          const layoutHeight =
            (region.targetHeight ?? sourceRegionHeight / sourceHeight) *
            imageHeight;
          const offsetX =
            ((region.targetX ?? 0.5) +
              (region.targetWidth ?? region.width) / 2 -
              0.5) *
            imageWidth;
          const boneId =
            region.boneId ??
            (
              {
                head: 'bone-chest-head',
                torso: 'bone-hip-chest',
                'left-arm': 'bone-chest-left-hand',
                'right-arm': 'bone-chest-right-hand',
                'left-leg': 'bone-hip-left-foot',
                'right-leg': 'bone-hip-right-foot',
              } as Record<string, string>
            )[region.id];
          const pose = boneId ? poses.get(boneId) : undefined;
          if (!pose) return;
          const attachX = (region.attachX ?? 0.5) * layoutWidth;
          const attachY = (region.attachY ?? 0.5) * layoutHeight;
          const canonicalAngle =
            region.id === 'head' || region.id === 'torso'
              ? -Math.PI / 2
              : Math.PI / 2;
          ctx.save();
          ctx.translate(pose.startX + offsetX, pose.startY);
          ctx.rotate(pose.angle - canonicalAngle);
          ctx.scale(pose.scale, pose.scale);
          ctx.drawImage(
            characterImage,
            sourceX,
            sourceY,
            sourceRegionWidth,
            sourceRegionHeight,
            -attachX,
            -attachY,
            layoutWidth,
            layoutHeight,
          );
          if (showAlphaMask) {
            ctx.globalCompositeOperation = 'source-atop';
            ctx.globalAlpha = 0.32;
            ctx.fillStyle = '#18c6d8';
            ctx.fillRect(-attachX, -attachY, layoutWidth, layoutHeight);
          }
          ctx.restore();
        });
      ctx.filter = 'none';
      ctx.restore();
      return {
        renderer: 'canvas-segmented-v1',
        fallbackUsed: false,
        issues: [],
      };
    }
    if (frameCount > 1) {
      ctx.drawImage(
        characterImage,
        poseFrameIndex(c.pose, frameCount) * frameWidth,
        0,
        frameWidth,
        sourceHeight,
        -imageWidth / 2,
        -imageHeight,
        imageWidth,
        imageHeight,
      );
    } else {
      ctx.drawImage(
        characterImage,
        -imageWidth / 2,
        -imageHeight,
        imageWidth,
        imageHeight,
      );
    }
    ctx.restore();
    return {
      renderer: 'canvas-rigid-v1',
      fallbackUsed: false,
      issues: [],
    };
  }
  ctx.fillStyle = 'rgba(31,32,35,.16)';
  ctx.beginPath();
  ctx.ellipse(0, 5, 67, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#29272a';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = c.color;
  ctx.beginPath();
  ctx.roundRect(-39, -150, 78, 137, 17);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f3c7a9';
  ctx.beginPath();
  ctx.arc(0, -207, 43, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = c.id === 'alice' ? '#3e3036' : '#3c5360';
  ctx.beginPath();
  ctx.arc(0, -231, 44, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#29272a';
  ctx.beginPath();
  ctx.arc(-15, -207, 4, 0, Math.PI * 2);
  ctx.arc(15, -207, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, -198, 12, 0.15, Math.PI - 0.15);
  ctx.stroke();
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-24, -10);
  ctx.lineTo(-34, 7);
  ctx.moveTo(24, -10);
  ctx.lineTo(34, 7);
  const leftArm =
    c.pose === 'wave'
      ? { x: -79, y: -204 }
      : c.pose === 'point'
        ? { x: -92, y: -116 }
        : c.pose === 'shrug'
          ? { x: -58, y: -103 }
          : { x: -65, y: -67 };
  const rightArm =
    c.pose === 'point'
      ? { x: 92, y: -116 }
      : c.pose === 'shrug'
        ? { x: 58, y: -103 }
        : c.pose === 'lean-in'
          ? { x: 75, y: -65 }
          : { x: 66, y: -65 };
  ctx.moveTo(-38, -128);
  ctx.lineTo(leftArm.x, leftArm.y);
  ctx.moveTo(38, -128);
  ctx.lineTo(rightArm.x, rightArm.y);
  ctx.stroke();
  if (c.pose === 'wave') {
    ctx.beginPath();
    ctx.moveTo(-79, -204);
    ctx.lineTo(-93, -222);
    ctx.moveTo(-79, -204);
    ctx.lineTo(-77, -229);
    ctx.stroke();
  }
  ctx.restore();
  return {
    renderer: 'canvas-rigid-v1',
    fallbackUsed: false,
    issues: [],
  };
}

function drawSkeletonOverlay(
  ctx: CanvasRenderingContext2D,
  character: Character,
  skeleton: Skeleton,
  transforms: BoneTransform[],
  width: number,
  height: number,
) {
  const transformByBone = new Map(
    transforms.map((transform) => [transform.boneId, transform]),
  );
  const jointById = new Map(skeleton.joints.map((joint) => [joint.id, joint]));
  const point = (joint: SkeletonJoint) => ({
    x: (character.x / 100) * width + (joint.x - 50) * 1.55,
    y: (character.y / 100) * height + (joint.y - 82) * 1.55,
  });
  ctx.save();
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  skeleton.bones.forEach((bone) => {
    const parent = jointById.get(bone.parentJointId);
    const child = jointById.get(bone.childJointId);
    if (!parent || !child) return;
    const start = point(parent);
    const base = point(child);
    const transform = transformByBone.get(bone.id);
    const radians = ((transform?.rotation ?? 0) * Math.PI) / 180;
    const dx = base.x - start.x;
    const dy = base.y - start.y;
    const end = {
      x:
        start.x +
        dx * Math.cos(radians) -
        dy * Math.sin(radians) +
        (transform?.x ?? 0) * 0.5,
      y:
        start.y +
        dx * Math.sin(radians) +
        dy * Math.cos(radians) +
        (transform?.y ?? 0) * 0.5,
    };
    ctx.strokeStyle = '#f2b84b';
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  });
  skeleton.joints.forEach((joint) => {
    const current = point(joint);
    ctx.fillStyle = joint.confidence < 0.55 ? '#d5564d' : '#f2b84b';
    ctx.beginPath();
    ctx.arc(current.x, current.y, Math.max(3, joint.radius), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

type FrameRenderDiagnostics = {
  renderer: CharacterRenderDiagnostics['renderer'];
  rendererIds: CharacterRenderDiagnostics['renderer'][];
  fallbackUsed: boolean;
  issues: MeshIssue[];
  meshMetrics: MeshMetrics[];
};

type FrameRenderOptions = {
  selectedId?: string;
  showSkeleton?: boolean;
  isolatedPartId?: string | null;
  showAlphaMask?: boolean;
  showMeshWireframe?: boolean;
};

function drawRenderFrame(
  ctx: CanvasRenderingContext2D,
  project: Project,
  width: number,
  height: number,
  imageMap?: Map<string, CanvasImageSource>,
  options: FrameRenderOptions = {},
): FrameRenderDiagnostics {
  const characterDiagnostics: CharacterRenderDiagnostics[] = [];
  ctx.fillStyle = '#e9d6b8';
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  applyCameraTransform(
    ctx,
    evaluateCamera(project, project.currentTime),
    width,
    height,
  );
  const backgroundAsset = project.assets.find(
    (asset) => asset.kind === 'background',
  );
  if (backgroundAsset) {
    drawDinerBackground(
      ctx,
      width,
      height,
      backgroundAsset.dataUrl ? imageMap?.get(backgroundAsset.id) : undefined,
      backgroundAsset,
    );
  }
  evaluateCharacters(project, project.currentTime).forEach((character) => {
    const asset = characterAssetFor(project, character);
    if (!asset) return;
    const skeleton = characterSkeletonFor(project, character);
    const diagnostics = drawCharacter(
      ctx,
      character,
      width,
      height,
      character.id === options.selectedId,
      asset ? imageMap?.get(asset.id) : undefined,
      asset,
      skeleton,
      skeleton
        ? evaluateBoneKeyframes(project, skeleton, project.currentTime)
        : [],
      character.id === options.selectedId ? options.isolatedPartId : null,
      options.showAlphaMask,
      options.showMeshWireframe,
    );
    characterDiagnostics.push(diagnostics);
    if (options.showSkeleton && skeleton && character.id === options.selectedId)
      drawSkeletonOverlay(
        ctx,
        character,
        skeleton,
        evaluateBoneKeyframes(project, skeleton, project.currentTime),
        width,
        height,
      );
  });
  drawImportedProps(ctx, project, project.currentTime, width, height, imageMap);
  ctx.restore();
  const caption = project.captions.find(
    (item) =>
      project.currentTime >= item.start && project.currentTime <= item.end,
  );
  if (caption) {
    ctx.font = '800 15px Inter, sans-serif';
    const textWidth = ctx.measureText(caption.text).width + 28;
    ctx.fillStyle = 'rgba(41,39,42,.92)';
    ctx.fillRect((width - textWidth) / 2, height * 0.78, textWidth, 30);
    ctx.fillStyle = '#f2b84b';
    ctx.font = '800 9px ui-monospace, monospace';
    ctx.fillText(
      caption.speaker.toUpperCase(),
      width / 2 - textWidth / 2 + 28,
      height * 0.78 + 19,
    );
    ctx.fillStyle = '#fffaf2';
    ctx.font = '800 15px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      caption.text,
      width / 2 - textWidth / 2 + 58,
      height * 0.78 + 20,
    );
  }
  const rendererIds = [
    ...new Set(characterDiagnostics.map((item) => item.renderer)),
  ];
  return {
    renderer: rendererIds.includes('canvas-lbs-mesh-v1')
      ? 'canvas-lbs-mesh-v1'
      : rendererIds.includes('canvas-segmented-v1')
        ? 'canvas-segmented-v1'
        : 'canvas-rigid-v1',
    rendererIds,
    fallbackUsed: characterDiagnostics.some((item) => item.fallbackUsed),
    issues: characterDiagnostics.flatMap((item) => item.issues),
    meshMetrics: characterDiagnostics.flatMap((item) =>
      item.meshMetrics ? [item.meshMetrics] : [],
    ),
  };
}

async function loadRenderableImageMap(project: Project) {
  const imageMap = new Map<string, HTMLImageElement>();
  await Promise.all(
    project.assets
      .filter(
        (asset) =>
          (asset.kind === 'rigged-character' ||
            asset.kind === 'background' ||
            asset.kind === 'prop') &&
          asset.dataUrl,
      )
      .map(
        (asset) =>
          new Promise<void>((resolve) => {
            const image = new Image();
            image.onload = () => {
              imageMap.set(asset.id, image);
              resolve();
            };
            image.onerror = () => resolve();
            image.src = asset.dataUrl as string;
          }),
      ),
  );
  return imageMap;
}

async function hashRgbaPixels(pixels: Uint8Array | Uint8ClampedArray) {
  const bytes = Uint8Array.from(pixels);
  const digest = await crypto.subtle.digest(
    'SHA-256',
    bytes.buffer as ArrayBuffer,
  );
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('');
}

async function renderFrameSnapshot(project: Project, timeMs: number) {
  const canvas = document.createElement('canvas');
  canvas.width = project.renderWidth;
  canvas.height = project.renderHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  const imageMap = await loadRenderableImageMap(project);
  const diagnostics = drawRenderFrame(
    context,
    { ...project, currentTime: timeMs },
    canvas.width,
    canvas.height,
    imageMap,
  );
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  return {
    canvas,
    diagnostics,
    pixelHash: await hashRgbaPixels(pixels),
  };
}

function RenderThumbnail({
  project,
  timeMs,
  className,
}: {
  project: Project;
  timeMs: number;
  className: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const imageCacheRef = useRef(new Map<string, HTMLImageElement>());
  const imagePendingRef = useRef(new Set<string>());
  const redrawRef = useRef<() => void>(() => {});
  const draw = useCallback(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    project.assets
      .filter(
        (asset) =>
          (asset.kind === 'rigged-character' ||
            asset.kind === 'background' ||
            asset.kind === 'prop') &&
          asset.dataUrl,
      )
      .forEach((asset) => {
        if (
          imageCacheRef.current.has(asset.id) ||
          imagePendingRef.current.has(asset.id) ||
          !asset.dataUrl
        )
          return;
        imagePendingRef.current.add(asset.id);
        const image = new Image();
        image.onload = () => {
          imageCacheRef.current.set(asset.id, image);
          imagePendingRef.current.delete(asset.id);
          redrawRef.current();
        };
        image.onerror = () => imagePendingRef.current.delete(asset.id);
        image.src = asset.dataUrl;
      });
    drawRenderFrame(
      context,
      { ...project, currentTime: timeMs },
      width,
      height,
      imageCacheRef.current,
    );
  }, [project, timeMs]);
  useEffect(() => {
    redrawRef.current = draw;
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [draw]);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

function StageCanvas({
  project,
  onSelect,
  showSkeleton,
  isolatedPartId,
  showAlphaMask,
  showMeshWireframe,
  interactionMode,
}: {
  project: Project;
  onSelect: (id: string) => void;
  showSkeleton: boolean;
  isolatedPartId?: string | null;
  showAlphaMask?: boolean;
  showMeshWireframe?: boolean;
  interactionMode: 'select' | 'pan' | 'preview';
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const imageCacheRef = useRef(new Map<string, HTMLImageElement>());
  const imagePendingRef = useRef(new Set<string>());
  const redrawRef = useRef<() => void>(() => {});
  const draw = useCallback(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect(),
      dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const { width, height } = rect;
    project.assets
      .filter(
        (asset) =>
          (asset.kind === 'rigged-character' ||
            asset.kind === 'background' ||
            asset.kind === 'prop') &&
          asset.dataUrl,
      )
      .forEach((asset) => {
        if (
          imageCacheRef.current.has(asset.id) ||
          imagePendingRef.current.has(asset.id) ||
          !asset.dataUrl
        )
          return;
        imagePendingRef.current.add(asset.id);
        const image = new Image();
        image.onload = () => {
          imageCacheRef.current.set(asset.id, image);
          imagePendingRef.current.delete(asset.id);
          redrawRef.current();
        };
        image.onerror = () => imagePendingRef.current.delete(asset.id);
        image.src = asset.dataUrl;
      });
    const diagnostics = drawRenderFrame(
      ctx,
      project,
      width,
      height,
      imageCacheRef.current,
      {
        selectedId:
          interactionMode === 'preview' ? undefined : project.selectedId,
        showSkeleton,
        isolatedPartId,
        showAlphaMask,
        showMeshWireframe,
      },
    );
    canvas.dataset.renderer = diagnostics.renderer;
    canvas.dataset.fallbackUsed = String(diagnostics.fallbackUsed);
    canvas.dataset.renderIssues = String(diagnostics.issues.length);
  }, [
    interactionMode,
    isolatedPartId,
    project,
    showAlphaMask,
    showMeshWireframe,
    showSkeleton,
  ]);
  useEffect(() => {
    redrawRef.current = draw;
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [draw]);
  return (
    <canvas
      ref={ref}
      className="stage-canvas"
      aria-label={
        isBlankProject(project) ? 'Blank scene canvas' : 'Scene canvas'
      }
      onClick={(e) => {
        if (interactionMode === 'pan' || interactionMode === 'preview') return;
        const rect = e.currentTarget.getBoundingClientRect();
        const camera = evaluateCamera(project, project.currentTime);
        const clickX = e.clientX - rect.left;
        const sceneX =
          (clickX - (rect.width / 2 + (camera.panX / 100) * rect.width)) /
            camera.zoom +
          rect.width / 2;
        const x = (sceneX / rect.width) * 100;
        const nearest = evaluateCharacters(project, project.currentTime).reduce(
          (a, b) => (Math.abs(a.x - x) < Math.abs(b.x - x) ? a : b),
        );
        onSelect(nearest.id);
      }}
    />
  );
}

function IconButton({
  label,
  children,
  onClick,
  active = false,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`icon-button ${active ? 'active' : ''}`}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function handleTabListKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
  const key = event.key;
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return;
  const tabs = Array.from(
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]',
    ) ?? [],
  );
  const currentIndex = tabs.indexOf(event.currentTarget);
  if (currentIndex < 0 || tabs.length === 0) return;
  const nextIndex =
    key === 'Home'
      ? 0
      : key === 'End'
        ? tabs.length - 1
        : (currentIndex + (key === 'ArrowRight' ? 1 : -1) + tabs.length) %
          tabs.length;
  event.preventDefault();
  tabs[nextIndex].focus();
  tabs[nextIndex].click();
}

export default function Home() {
  const [project, setProject] = useState<Project>(blankProject),
    [, setHistory] = useState<Project[]>([]),
    [, setFuture] = useState<Project[]>([]),
    [playing, setPlaying] = useState(false),
    [panel, setPanel] = useState<'scenes' | 'storyboard' | 'assets'>('scenes'),
    [viewMode, setViewMode] = useState<'animate' | 'storyboard' | 'preview'>(
      'animate',
    ),
    [stageTool, setStageTool] = useState<'select' | 'pan'>('select'),
    [viewportZoom, setViewportZoom] = useState(100),
    [viewportPan, setViewportPan] = useState({ x: 0, y: 0 }),
    [dialog, setDialog] = useState<'help' | 'settings' | 'templates' | null>(
      null,
    ),
    [rendering, setRendering] = useState(false),
    [notice, setNotice] = useState(''),
    [saved, setSaved] = useState(true),
    [editingProjectName, setEditingProjectName] = useState(false),
    [projectNameDraft, setProjectNameDraft] = useState(blankProject.name),
    [editingBeatId, setEditingBeatId] = useState<string | null>(null),
    [beatTitleDraft, setBeatTitleDraft] = useState(''),
    [beatDescriptionDraft, setBeatDescriptionDraft] = useState(''),
    [beatStartDraft, setBeatStartDraft] = useState(''),
    [beatEndDraft, setBeatEndDraft] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);
  const assetImportInputRef = useRef<HTMLInputElement>(null);
  const audioImportInputRef = useRef<HTMLInputElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const projectNameInputRef = useRef<HTMLInputElement>(null);
  const commandResultsRef = useRef(new Map<string, Record<string, unknown>>());
  const projectRef = useRef(project);
  const historyRef = useRef<Project[]>([]);
  const futureRef = useRef<Project[]>([]);
  const [lastCommand, setLastCommand] = useState('set_pose( alice )');
  const [showSafeArea, setShowSafeArea] = useState(true);
  const [sceneMenuId, setSceneMenuId] = useState<string | null>(null);
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [sceneTitleDraft, setSceneTitleDraft] = useState('');
  const [sceneDescriptionDraft, setSceneDescriptionDraft] = useState('');
  const [assetBriefDrafts, setAssetBriefDrafts] = useState<
    Record<string, string>
  >({});
  const [expandedAssetStyleId, setExpandedAssetStyleId] = useState<
    string | null
  >(null);
  const [topMenuOpen, setTopMenuOpen] = useState(false);
  const [showTimelineDetails, setShowTimelineDetails] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showAlphaMask, setShowAlphaMask] = useState(false);
  const [showMeshWireframe, setShowMeshWireframe] = useState(false);
  const [isolatedPartId, setIsolatedPartId] = useState<string | null>(null);
  const [rigPreviewReport, setRigPreviewReport] =
    useState<RigPreviewReport | null>(null);
  const [rigPreviewLoading, setRigPreviewLoading] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState('');
  const [mobileDrawer, setMobileDrawer] = useState<'rail' | 'inspector' | null>(
    null,
  );
  const [assetImportKind, setAssetImportKind] = useState<
    'rigged-character' | 'background' | 'prop'
  >('prop');
  const [assetImportMode, setAssetImportMode] = useState<
    'single' | 'pose-sheet'
  >('single');
  const panStartRef = useRef<{
    x: number;
    y: number;
    originX: number;
    originY: number;
  } | null>(null);
  const timelineDragRef = useRef<{
    mark: TimelineMark;
    before: Project;
    pointerId: number;
    moved: boolean;
  } | null>(null);
  const suppressTimelineClickRef = useRef(false);
  const exportStillRef = useRef<() => Promise<Record<string, unknown>>>(
    async () => ({
      ok: false,
      code: 'UNAVAILABLE',
    }),
  );
  const renderWebMRef = useRef<() => Promise<Record<string, unknown>>>(
    async () => ({
      ok: false,
      code: 'UNAVAILABLE',
    }),
  );
  const renderingRef = useRef(false);
  const evaluatedCharacters = evaluateCharacters(project, project.currentTime),
    evaluatedProps = evaluateProps(project, project.currentTime),
    selected =
      evaluatedCharacters.find((c) => c.id === project.selectedId) ??
      evaluatedCharacters[0],
    inspectorAsset =
      project.assets.find((asset) => asset.id === expandedAssetStyleId) ??
      project.assets.find((asset) => asset.dataUrl) ??
      project.assets[0],
    inspectorAssetStyle = inspectorAsset
      ? (inspectorAsset.style ?? defaultAssetStyle(inspectorAsset.kind))
      : null,
    activeCaption = project.captions.find(
      (c) => project.currentTime >= c.start && project.currentTime <= c.end,
    ),
    selectedCaption = activeCaption ?? project.captions[0],
    ratio = project.currentTime / project.duration,
    camera = evaluateCamera(project, project.currentTime),
    selectedSkeleton = project.skeletons.find(
      (skeleton) =>
        skeleton.assetId ===
        (characterAssetFor(project, selected)?.variantOf ?? selected.assetId),
    );
  const commit = useCallback(
    (mutate: (next: Project) => void, label: string, agent = false) => {
      const current = projectRef.current;
      const next = copy(current);
      mutate(next);
      syncActiveScene(next);
      next.revision += 1;
      next.dirty = true;
      projectRef.current = next;
      setProject(next);
      const nextHistory = [...historyRef.current.slice(-29), copy(current)];
      historyRef.current = nextHistory;
      futureRef.current = [];
      setHistory(nextHistory);
      setFuture([]);
      setSaved(false);
      setLastCommand(label);
      setNotice(`${agent ? 'ChatGPT' : 'You'} · ${label}`);
    },
    [],
  );
  const updateProjectView = useCallback(
    (update: (current: Project) => Project) => {
      setProject((current) => {
        const next = update(current);
        projectRef.current = next;
        return next;
      });
    },
    [],
  );
  const beginProjectNameEdit = () => {
    setProjectNameDraft(project.name);
    setEditingProjectName(true);
  };
  const finishProjectNameEdit = () => {
    const name = projectNameDraft.trim();
    if (!name) {
      setNotice('Project name cannot be empty');
      setProjectNameDraft(project.name);
      return;
    }
    if (name !== project.name)
      commit((next) => (next.name = name), `Rename project to ${name}`);
    setEditingProjectName(false);
  };
  useEffect(() => {
    if (editingProjectName) projectNameInputRef.current?.focus();
  }, [editingProjectName]);
  const undo = useCallback(() => {
    const current = projectRef.current;
    const previous = historyRef.current.at(-1);
    if (!previous) {
      setNotice('Nothing to undo');
      return;
    }
    const restored = {
      ...previous,
      revision: current.revision + 1,
      dirty: true,
    };
    const nextHistory = historyRef.current.slice(0, -1);
    const nextFuture = [copy(current), ...futureRef.current];
    historyRef.current = nextHistory;
    futureRef.current = nextFuture;
    setHistory(nextHistory);
    setFuture(nextFuture);
    projectRef.current = restored;
    setProject(restored);
    setLastCommand('undo()');
    setNotice('Undo · restored previous command');
  }, []);
  const redo = useCallback(() => {
    const current = projectRef.current;
    const next = futureRef.current[0];
    if (!next) {
      setNotice('Nothing to redo');
      return;
    }
    const restored = {
      ...next,
      revision: current.revision + 1,
      dirty: true,
    };
    const nextHistory = [...historyRef.current, copy(current)];
    const nextFuture = futureRef.current.slice(1);
    historyRef.current = nextHistory;
    futureRef.current = nextFuture;
    setHistory(nextHistory);
    setFuture(nextFuture);
    projectRef.current = restored;
    setProject(restored);
    setLastCommand('redo()');
    setNotice('Redo · reapplied command');
  }, []);
  const exportStill = useCallback(async () => {
    const snapshot = await renderFrameSnapshot(project, project.currentTime);
    if (!snapshot) return { ok: false, code: 'CANVAS_UNAVAILABLE' };
    if (snapshot.diagnostics.issues.length > 0)
      return {
        ok: false,
        code: 'RIG_RENDER_INVALID',
        issues: snapshot.diagnostics.issues,
        renderDiagnostics: snapshot.diagnostics,
      };
    const output = snapshot.canvas;
    const fileName = `${projectFileStem(project.name)}-frame-${String(Math.round(project.currentTime)).padStart(5, '0')}ms.png`;
    const link = document.createElement('a');
    link.href = output.toDataURL('image/png');
    link.download = fileName;
    link.click();
    setLastCommand('export_frame()');
    setNotice('PNG frame downloaded');
    return {
      ok: true,
      fileName,
      timeMs: project.currentTime,
      width: output.width,
      height: output.height,
      pixelHash: snapshot.pixelHash,
      renderDiagnostics: snapshot.diagnostics,
    };
  }, [project]);
  const commitRef = useRef(commit),
    undoRef = useRef(undo),
    redoRef = useRef(redo);
  useEffect(() => {
    if (project.revision >= projectRef.current.revision)
      projectRef.current = project;
    commitRef.current = commit;
    undoRef.current = undo;
    redoRef.current = redo;
    exportStillRef.current = exportStill;
  }, [project, commit, undo, redo, exportStill]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const recovered = hydrateProject(
            JSON.parse(stored) as Partial<Project>,
          );
          projectRef.current = recovered;
          historyRef.current = [];
          futureRef.current = [];
          setHistory([]);
          setFuture([]);
          setProject(recovered);
          setNotice('Recovered local project');
        } catch {
          /* starter remains */
        }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
        setSaved(true);
        setLastSavedAt(new Date());
        setSaveError('');
      } catch {
        setSaved(false);
        setSaveError('Local autosave failed');
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [project]);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(
      () =>
        setProject((current) => {
          const nextTime = current.currentTime + 1000 / current.fps;
          if (nextTime < current.duration) {
            const next = { ...current, currentTime: nextTime };
            projectRef.current = next;
            return next;
          }
          const activeIndex = current.scenes.findIndex(
            (scene) => scene.id === current.activeSceneId,
          );
          const nextScene =
            current.scenes.length > 1
              ? current.scenes[(activeIndex + 1) % current.scenes.length]
              : undefined;
          if (nextScene) {
            const next = copy(current);
            loadSceneContent(next, nextScene.id);
            next.currentTime = 0;
            projectRef.current = next;
            return next;
          }
          const next = { ...current, currentTime: 0 };
          projectRef.current = next;
          return next;
        }),
      1000 / project.fps,
    );
    return () => window.clearInterval(timer);
  }, [playing, project.fps]);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTextEntry =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT';
      if (isTextEntry) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redoRef.current();
        else undoRef.current();
        return;
      }
      if (
        (event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
        !target?.closest('button, [role="tab"]')
      ) {
        event.preventDefault();
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        updateProjectView((current) => ({
          ...current,
          currentTime: Math.max(
            0,
            Math.min(current.duration, current.currentTime + direction * 83.33),
          ),
        }));
        return;
      }
      if (event.code !== 'Space') return;
      event.preventDefault();
      setPlaying((value) => !value);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [updateProjectView]);
  useEffect(() => {
    const modelContext =
      (document as Document & { modelContext?: ModelContext }).modelContext ??
      (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
    if (!modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    const internalTools = new Map<string, ModelTool>();
    const register = (
      name: string,
      title: string,
      description: string,
      inputSchema: object,
      execute: ModelTool['execute'],
      readOnlyHint = false,
    ) => {
      const schema = readOnlyHint
        ? inputSchema
        : {
            ...(inputSchema as {
              type?: string;
              properties?: Record<string, unknown>;
              [key: string]: unknown;
            }),
            properties: {
              ...(inputSchema as { properties?: Record<string, unknown> })
                .properties,
              expectedRevision: {
                type: 'integer',
                minimum: 0,
                description:
                  'Optional optimistic-concurrency check. Use the revision from a fresh read; the command is rejected if it is stale.',
              },
              idempotencyKey: {
                type: 'string',
                minLength: 1,
                maxLength: 120,
                description:
                  'Optional retry key. Repeating the same key for this tool replays the successful result without applying the mutation twice.',
              },
            },
          };
      const guardedExecute: ModelTool['execute'] = readOnlyHint
        ? execute
        : (input) => {
            const expectedRevision = input.expectedRevision;
            const actualRevision = projectRef.current.revision;
            if (
              expectedRevision !== undefined &&
              (typeof expectedRevision !== 'number' ||
                !Number.isInteger(expectedRevision) ||
                expectedRevision !== actualRevision)
            ) {
              setNotice(
                `Agent · revision conflict · current rev ${actualRevision}`,
              );
              return {
                ok: false,
                code: 'REVISION_CONFLICT',
                expectedRevision:
                  typeof expectedRevision === 'number'
                    ? expectedRevision
                    : null,
                actualRevision,
                retryFrom: 'inspect_project',
              };
            }
            const commandInput = { ...input };
            delete commandInput.expectedRevision;
            delete commandInput.idempotencyKey;
            return execute(commandInput);
          };
      const replayableExecute: ModelTool['execute'] = readOnlyHint
        ? execute
        : (input) => {
            const idempotencyKey = input.idempotencyKey;
            const cacheKey =
              typeof idempotencyKey === 'string' && idempotencyKey.trim()
                ? `${name}:${idempotencyKey.trim()}`
                : null;
            if (cacheKey) {
              const previous = commandResultsRef.current.get(cacheKey);
              if (previous) return { ...previous, idempotentReplay: true };
            }
            const output = guardedExecute(input);
            const cacheSuccessful = (result: unknown) => {
              if (
                cacheKey &&
                result &&
                typeof result === 'object' &&
                !Array.isArray(result) &&
                (result as { ok?: unknown }).ok === true
              ) {
                commandResultsRef.current.set(
                  cacheKey,
                  result as Record<string, unknown>,
                );
              }
              return result;
            };
            return output instanceof Promise
              ? output.then(cacheSuccessful)
              : cacheSuccessful(output);
          };
      internalTools.set(name, {
        name,
        title,
        description,
        inputSchema: {
          ...(schema as Record<string, unknown>),
          $id: `https://stagehand.tools/${name}/input`,
        },
        annotations: { readOnlyHint, untrustedContentHint: false },
        execute: replayableExecute,
      });
    };
    register(
      'get_project_summary',
      'Get project summary',
      'Inspect the active Stagehand project summary.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => {
        const current = projectRef.current;
        return {
          ok: true,
          revision: current.revision,
          name: current.name,
          durationMs: current.duration,
          fps: current.fps,
          renderSize: {
            width: current.renderWidth,
            height: current.renderHeight,
          },
          sceneCount: current.scenes.length,
          activeSceneId: current.activeSceneId,
          templateId: current.templateId ?? null,
          selectedId: current.selectedId,
          lockedTrackIds: current.lockedTrackIds,
          characterCount: current.characters.length,
          keyframeCount: current.keyframes.length,
          propKeyframeCount: current.propKeyframes.length,
          cameraKeyframeCount: current.cameraKeyframes.length,
          captionCount: current.captions.length,
          audioCueCount: current.audioCues.length,
          assetCount: current.assets.length,
          assetRequestCount: current.assetRequests.length,
          skeletonCount: current.skeletons.length,
          approvedSkeletonCount: current.skeletons.filter(
            (skeleton) => skeleton.reviewStatus === 'approved',
          ).length,
          motionClipCount: current.motionClips.length,
          boneKeyframeCount: current.boneKeyframes.length,
          storyboardBeatCount: current.storyboardBeats.length,
          canUndo: historyRef.current.length > 0,
          canRedo: futureRef.current.length > 0,
        };
      },
      true,
    );
    register(
      'set_project_name',
      'Set project name',
      'Rename the active Stagehand project without changing scene content or timing.',
      {
        type: 'object',
        required: ['name'],
        additionalProperties: false,
        properties: { name: { type: 'string', minLength: 1, maxLength: 80 } },
      },
      (input) => {
        const current = projectRef.current;
        const name = typeof input.name === 'string' ? input.name.trim() : '';
        if (!name || name.length > 80)
          return { ok: false, code: 'INVALID_INPUT' };
        commitRef.current(
          (next) => {
            next.name = name;
          },
          `Rename project to ${name}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          name,
          changedPaths: ['name'],
        };
      },
    );
    register(
      'set_render_settings',
      'Set render settings',
      'Set the bounded 16:9 WebM frame rate and resolution for the project.',
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          fps: { type: 'number', enum: [12, 24] },
          preset: { type: 'string', enum: ['720p', '1080p'] },
        },
      },
      async (input) => {
        const current = projectRef.current;
        const fps = input.fps === undefined ? current.fps : input.fps;
        const preset =
          input.preset === undefined
            ? current.renderWidth >= 1920
              ? '1080p'
              : '720p'
            : input.preset;
        if (
          (fps !== 12 && fps !== 24) ||
          (preset !== '720p' && preset !== '1080p')
        )
          return { ok: false, code: 'INVALID_INPUT' };
        const renderWidth = preset === '1080p' ? 1920 : 720;
        const renderHeight = preset === '1080p' ? 1080 : 405;
        commitRef.current(
          (next) => {
            next.fps = fps;
            next.renderWidth = renderWidth;
            next.renderHeight = renderHeight;
          },
          `Set render ${preset} · ${fps} fps`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          fps,
          preset,
          width: renderWidth,
          height: renderHeight,
        };
      },
    );
    register(
      'get_scene',
      'Get active scene',
      'Inspect the active scene metadata, timing, and structured content counts.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => {
        const current = projectRef.current;
        return {
          ok: true,
          revision: current.revision,
          scene: current.scenes.find(
            (scene) => scene.id === current.activeSceneId,
          ),
          characterCount: current.characters.length,
          keyframeCount: current.keyframes.length,
          propKeyframeCount: current.propKeyframes.length,
          cameraKeyframeCount: current.cameraKeyframes.length,
          captionCount: current.captions.length,
          audioCueCount: current.audioCues.length,
          lockedTrackIds: current.lockedTrackIds,
        };
      },
      true,
    );
    register(
      'get_storyboard',
      'Get storyboard beats',
      'Inspect the ordered story beats for the active project.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => ({
        ok: true,
        revision: projectRef.current.revision,
        beats: projectRef.current.storyboardBeats,
      }),
      true,
    );
    register(
      'add_storyboard_beat',
      'Add storyboard beat',
      'Add an editable timed beat to the project storyboard without changing scene content.',
      {
        type: 'object',
        required: ['title'],
        additionalProperties: false,
        properties: {
          title: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          startMs: { type: 'number', minimum: 0 },
          endMs: { type: 'number', minimum: 0 },
        },
      },
      (input) => {
        const current = projectRef.current;
        const title = typeof input.title === 'string' ? input.title.trim() : '';
        if (!title) return { ok: false, code: 'INVALID_INPUT' };
        const startMs =
          typeof input.startMs === 'number'
            ? input.startMs
            : current.currentTime;
        const endMs =
          typeof input.endMs === 'number' ? input.endMs : startMs + 1000;
        if (
          !Number.isFinite(startMs) ||
          !Number.isFinite(endMs) ||
          startMs < 0 ||
          endMs <= startMs ||
          endMs > current.duration
        )
          return { ok: false, code: 'INVALID_TIMING' };
        const beat: StoryBeat = {
          id: nextBeatId(current.storyboardBeats),
          index: String(current.storyboardBeats.length + 1).padStart(2, '0'),
          title,
          description:
            typeof input.description === 'string' && input.description.trim()
              ? input.description.trim()
              : 'New story beat ready for blocking.',
          startMs,
          endMs,
        };
        commitRef.current(
          (next) => next.storyboardBeats.push(beat),
          `Add beat ${beat.title}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          beat,
          changedEntityIds: [beat.id],
        };
      },
    );
    register(
      'update_storyboard_beat',
      'Update storyboard beat',
      'Edit a storyboard beat title, description, or bounded timing.',
      {
        type: 'object',
        required: ['beatId'],
        additionalProperties: false,
        properties: {
          beatId: { type: 'string' },
          title: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          startMs: { type: 'number', minimum: 0 },
          endMs: { type: 'number', minimum: 0 },
        },
      },
      (input) => {
        const current = projectRef.current;
        const beatId = typeof input.beatId === 'string' ? input.beatId : '';
        const target = current.storyboardBeats.find(
          (beat) => beat.id === beatId,
        );
        if (!target) return { ok: false, code: 'NOT_FOUND' };
        const title =
          input.title === undefined
            ? target.title
            : typeof input.title === 'string'
              ? input.title.trim()
              : '';
        const description =
          input.description === undefined
            ? target.description
            : typeof input.description === 'string'
              ? input.description.trim()
              : '';
        const startMs =
          input.startMs === undefined ? target.startMs : input.startMs;
        const endMs = input.endMs === undefined ? target.endMs : input.endMs;
        if (
          !title ||
          typeof startMs !== 'number' ||
          typeof endMs !== 'number' ||
          !Number.isFinite(startMs) ||
          !Number.isFinite(endMs) ||
          startMs < 0 ||
          endMs <= startMs ||
          endMs > current.duration
        )
          return { ok: false, code: 'INVALID_INPUT' };
        const updated = { ...target, title, description, startMs, endMs };
        commitRef.current(
          (next) => {
            const beat = next.storyboardBeats.find(
              (item) => item.id === beatId,
            );
            if (beat) Object.assign(beat, updated);
          },
          `Update beat ${updated.title}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          beat: updated,
          changedEntityIds: [beatId],
        };
      },
    );
    register(
      'remove_storyboard_beat',
      'Remove storyboard beat',
      'Remove one editable beat from the project storyboard.',
      {
        type: 'object',
        required: ['beatId'],
        additionalProperties: false,
        properties: { beatId: { type: 'string' } },
      },
      (input) => {
        const current = projectRef.current;
        const beatId = typeof input.beatId === 'string' ? input.beatId : '';
        const target = current.storyboardBeats.find(
          (beat) => beat.id === beatId,
        );
        if (!target) return { ok: false, code: 'NOT_FOUND' };
        commitRef.current(
          (next) => {
            next.storyboardBeats = next.storyboardBeats
              .filter((beat) => beat.id !== beatId)
              .map((beat, index) => ({
                ...beat,
                index: String(index + 1).padStart(2, '0'),
              }));
          },
          `Remove beat ${target.title}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          removedBeatId: beatId,
          beatCount: current.storyboardBeats.length - 1,
        };
      },
    );
    register(
      'get_timeline',
      'Get timeline',
      'Inspect the active scene clock, tracks, and caption timing.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => {
        const current = projectRef.current;
        return {
          ok: true,
          revision: current.revision,
          fps: current.fps,
          currentTimeMs: current.currentTime,
          durationMs: current.duration,
          tracks: [
            'camera',
            'alice',
            'bob',
            'bones',
            'props',
            'captions',
            'music',
            'sfx',
          ],
          captions: current.captions,
          keyframes: current.keyframes,
          propKeyframes: current.propKeyframes,
          cameraKeyframes: current.cameraKeyframes,
          audioCues: current.audioCues,
          skeletons: current.skeletons,
          boneKeyframes: current.boneKeyframes.filter(
            (frame) => frame.sceneId === current.activeSceneId,
          ),
          lockedTrackIds: current.lockedTrackIds,
        };
      },
      true,
    );
    register(
      'inspect_frame',
      'Inspect frame',
      'Read the deterministic scene state at a bounded timestamp for visual direction and QA.',
      {
        type: 'object',
        additionalProperties: false,
        properties: { timeMs: { type: 'number', minimum: 0 } },
      },
      async (input) => {
        const current = projectRef.current;
        const timeMs =
          input.timeMs === undefined ? current.currentTime : input.timeMs;
        if (
          typeof timeMs !== 'number' ||
          !Number.isFinite(timeMs) ||
          timeMs < 0 ||
          timeMs > current.duration
        )
          return { ok: false, code: 'INVALID_TIMING' };
        const snapshot = await renderFrameSnapshot(current, timeMs);
        if (!snapshot) return { ok: false, code: 'CANVAS_UNAVAILABLE' };
        if (snapshot.diagnostics.issues.length > 0)
          return {
            ok: false,
            code: 'RIG_RENDER_INVALID',
            timeMs,
            issues: snapshot.diagnostics.issues,
            renderDiagnostics: snapshot.diagnostics,
          };
        return {
          ok: true,
          revision: current.revision,
          timeMs,
          durationMs: current.duration,
          camera: evaluateCamera(current, timeMs),
          characters: evaluateCharacters(current, timeMs),
          props: evaluateProps(current, timeMs),
          captions: current.captions.filter(
            (caption) => timeMs >= caption.start && timeMs <= caption.end,
          ),
          audioCues: current.audioCues.filter(
            (cue) => timeMs >= cue.start && timeMs <= cue.end,
          ),
          skeletons: current.skeletons.map((skeleton) => ({
            id: skeleton.id,
            label: skeleton.label,
            assetId: skeleton.assetId,
            reviewStatus: skeleton.reviewStatus,
            bindingMethod: skeleton.binding.method,
            boneTransforms:
              skeleton.reviewStatus === 'approved'
                ? evaluateBoneKeyframes(current, skeleton, timeMs)
                : [],
          })),
          renderSize: {
            width: current.renderWidth,
            height: current.renderHeight,
            fps: current.fps,
          },
          pixelHash: snapshot.pixelHash,
          renderDiagnostics: snapshot.diagnostics,
        };
      },
      true,
    );
    register(
      'set_playhead',
      'Set playhead',
      'Move the active scene playhead with a bounded, undoable command.',
      {
        type: 'object',
        required: ['timeMs'],
        additionalProperties: false,
        properties: { timeMs: { type: 'number', minimum: 0 } },
      },
      (input) => {
        const current = projectRef.current;
        if (typeof input.timeMs !== 'number' || !Number.isFinite(input.timeMs))
          return { ok: false, code: 'INVALID_INPUT' };
        const timeMs = Math.max(0, Math.min(current.duration, input.timeMs));
        commitRef.current(
          (next) => {
            next.currentTime = timeMs;
          },
          'Move playhead',
          true,
        );
        return { ok: true, revision: current.revision + 1, timeMs };
      },
    );
    register(
      'export_frame',
      'Export current frame',
      'Download the deterministic current scene frame as a PNG for review or sharing.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => exportStillRef.current(),
    );
    register(
      'render_webm',
      'Render project WebM',
      'Render and download the complete project scene sequence as a WebM with deterministic captions and non-voice cues.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => renderWebMRef.current(),
    );
    register(
      'set_scene_duration',
      'Set scene duration',
      'Resize the active scene and safely trim or extend its timed animation data.',
      {
        type: 'object',
        required: ['durationMs'],
        additionalProperties: false,
        properties: {
          durationMs: { type: 'number', minimum: 500, maximum: 60000 },
        },
      },
      (input) => {
        const current = projectRef.current;
        if (
          typeof input.durationMs !== 'number' ||
          !Number.isFinite(input.durationMs) ||
          input.durationMs < 500 ||
          input.durationMs > 60000
        )
          return { ok: false, code: 'INVALID_DURATION' };
        const durationMs = Math.round(input.durationMs);
        commitRef.current(
          (next) => {
            resizeProjectDuration(next, durationMs);
          },
          `Set scene duration to ${timecode(durationMs)}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          durationMs,
          activeSceneId: current.activeSceneId,
        };
      },
    );
    register(
      'retime_scene',
      'Retime scene',
      'Speed up or slow down the active scene while preserving its structure and synchronizing all timed tracks.',
      {
        type: 'object',
        required: ['speed'],
        additionalProperties: false,
        properties: {
          speed: {
            type: 'number',
            minimum: 0.5,
            maximum: 2,
            description:
              'Playback speed multiplier; 0.8 is slower and 1.25 is faster.',
          },
        },
      },
      (input) => {
        const current = projectRef.current;
        if (
          typeof input.speed !== 'number' ||
          !Number.isFinite(input.speed) ||
          input.speed < 0.5 ||
          input.speed > 2
        )
          return { ok: false, code: 'INVALID_SPEED' };
        const speed = input.speed;
        let durationMs = current.duration;
        commitRef.current(
          (next) => {
            durationMs = retimeProjectBySpeed(next, speed);
          },
          `Set scene speed to ${speed.toFixed(2)}×`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          speed,
          durationMs,
          activeSceneId: current.activeSceneId,
          changedPaths: [
            'duration',
            'currentTime',
            'keyframes',
            'propKeyframes',
            'cameraKeyframes',
            'captions',
            'audioCues',
            'storyboardBeats',
          ],
        };
      },
    );
    register(
      'set_caption',
      'Edit caption',
      'Update one caption while preserving other scene timing and content.',
      {
        type: 'object',
        required: ['captionId', 'text'],
        additionalProperties: false,
        properties: {
          captionId: { type: 'string' },
          text: { type: 'string', minLength: 1 },
          startMs: { type: 'number', minimum: 0 },
          endMs: { type: 'number', minimum: 0 },
        },
      },
      (input) => {
        const current = projectRef.current;
        const textInput =
          typeof input.text === 'string' ? input.text.trim() : '';
        if (typeof input.captionId !== 'string' || !textInput)
          return { ok: false, code: 'INVALID_INPUT' };
        const caption = current.captions.find(
          (item) => item.id === input.captionId,
        );
        if (!caption) return { ok: false, code: 'NOT_FOUND' };
        const startMs =
          typeof input.startMs === 'number' ? input.startMs : caption.start;
        const endMs =
          typeof input.endMs === 'number' ? input.endMs : caption.end;
        if (
          !Number.isFinite(startMs) ||
          !Number.isFinite(endMs) ||
          startMs < 0 ||
          endMs <= startMs ||
          endMs > current.duration
        )
          return { ok: false, code: 'INVALID_TIMING' };
        commitRef.current(
          (next) => {
            const item = next.captions.find(
              (candidate) => candidate.id === input.captionId,
            );
            if (item) {
              item.text = textInput;
              item.start = startMs;
              item.end = endMs;
            }
          },
          `Edit ${input.captionId}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          changedEntityIds: [input.captionId],
          changedPaths: [`captions.${input.captionId}`],
        };
      },
    );
    register(
      'get_selection',
      'Get selection',
      'Inspect current selection and transform.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => {
        const current = projectRef.current;
        return {
          ok: true,
          revision: current.revision,
          selection:
            evaluateCharacters(current, current.currentTime).find(
              (character) => character.id === current.selectedId,
            ) ?? null,
        };
      },
      true,
    );
    register(
      'get_keyframes',
      'Get character keyframes',
      'Inspect the evaluated animation keyframes for a character or the whole scene.',
      {
        type: 'object',
        additionalProperties: false,
        properties: { characterId: { type: 'string' } },
      },
      (input) => {
        const current = projectRef.current;
        const characterId =
          typeof input.characterId === 'string' ? input.characterId : undefined;
        return {
          ok: true,
          revision: current.revision,
          keyframes: current.keyframes.filter(
            (frame) => !characterId || frame.characterId === characterId,
          ),
        };
      },
      true,
    );
    register(
      'get_camera_keyframes',
      'Get camera keyframes',
      'Inspect the active scene camera framing and timing keyframes.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => {
        const current = projectRef.current;
        return {
          ok: true,
          revision: current.revision,
          camera: evaluateCamera(current, current.currentTime),
          cameraKeyframes: current.cameraKeyframes,
        };
      },
      true,
    );
    register(
      'get_prop_keyframes',
      'Get prop keyframes',
      'Inspect imported prop animation keyframes for one prop or the whole active scene.',
      {
        type: 'object',
        additionalProperties: false,
        properties: { assetId: { type: 'string' } },
      },
      (input) => {
        const current = projectRef.current;
        const assetId =
          typeof input.assetId === 'string' ? input.assetId : undefined;
        return {
          ok: true,
          revision: current.revision,
          propKeyframes: current.propKeyframes.filter(
            (frame) => !assetId || frame.assetId === assetId,
          ),
        };
      },
      true,
    );
    register(
      'get_audio_cues',
      'Get audio cues',
      'Inspect non-voice music, footsteps, and reaction sting cues for the active scene.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => {
        const current = projectRef.current;
        return {
          ok: true,
          revision: current.revision,
          audioCues: current.audioCues,
          voiceStatus: 'out-of-scope',
        };
      },
      true,
    );
    register(
      'get_audio_library',
      'Get audio library',
      'List bundled CC0 audio and user-imported audio with provenance and payload availability.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => {
        const current = projectRef.current;
        return {
          ok: true,
          revision: current.revision,
          assets: current.assets
            .filter((asset) => asset.kind === 'audio')
            .map((asset) => ({
              ...asset,
              dataUrl: undefined,
              hasPayload: Boolean(asset.dataUrl),
              inUse: current.audioCues.some((cue) => cue.assetId === asset.id),
            })),
          bundledLicense: 'CC0/public-domain only',
        };
      },
      true,
    );
    register(
      'get_style_bible',
      'Get style bible',
      'Inspect the visual and motion constraints for this project.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => ({
        ok: true,
        revision: projectRef.current.revision,
        styleBible: projectRef.current.styleBible,
      }),
      true,
    );
    register(
      'set_style_bible',
      'Set style bible',
      'Update persisted visual, motion, camera, palette, and direction notes for the project.',
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          construction: { type: 'string', minLength: 1 },
          motion: { type: 'string', minLength: 1 },
          camera: { type: 'string', minLength: 1 },
          palette: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
            minItems: 1,
          },
          notes: { type: 'string' },
        },
      },
      (input) => {
        const current = projectRef.current;
        const nextBible: StyleBible = {
          construction:
            typeof input.construction === 'string'
              ? input.construction.trim()
              : current.styleBible.construction,
          motion:
            typeof input.motion === 'string'
              ? input.motion.trim()
              : current.styleBible.motion,
          camera:
            typeof input.camera === 'string'
              ? input.camera.trim()
              : current.styleBible.camera,
          palette:
            Array.isArray(input.palette) &&
            input.palette.every(
              (value) => typeof value === 'string' && value.trim(),
            )
              ? input.palette.map((value) => value.trim())
              : current.styleBible.palette,
          notes:
            typeof input.notes === 'string'
              ? input.notes.trim()
              : current.styleBible.notes,
        };
        if (
          !nextBible.construction ||
          !nextBible.motion ||
          !nextBible.camera ||
          nextBible.palette.length === 0
        )
          return { ok: false, code: 'INVALID_INPUT' };
        commitRef.current(
          (next) => {
            next.styleBible = nextBible;
          },
          'Update style bible',
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          styleBible: nextBible,
        };
      },
    );
    register(
      'get_asset_generation_checklist',
      'Get asset generation checklist',
      'Return a structured prompt and checklist for generating a character, parts sheet, background, or prop that matches this project.',
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          kind: {
            type: 'string',
            enum: ['rigged-character', 'background', 'prop'],
          },
          targetCharacterId: { type: 'string' },
          bindingMethod: {
            type: 'string',
            enum: ['rigid', 'segmented', 'mesh'],
          },
        },
      },
      (input) => {
        const current = projectRef.current;
        const kind =
          isAssetKind(input.kind) && input.kind !== 'audio'
            ? input.kind
            : 'rigged-character';
        const target = current.characters.find(
          (character) => character.id === input.targetCharacterId,
        );
        const method = isBindingMethod(input.bindingMethod)
          ? input.bindingMethod
          : kind === 'rigged-character'
            ? 'segmented'
            : 'rigid';
        const brief = target
          ? current.assets.find((asset) => asset.id === target.assetId)?.brief
          : defaultAssetBrief(kind);
        return {
          ok: true,
          revision: current.revision,
          kind,
          targetCharacterId: target?.id,
          bindingMethod: method,
          styleBible: current.styleBible,
          brief: brief ?? defaultAssetBrief(kind),
          checklist: assetChecklist(kind, method),
          prompt: [
            `Create a ${kind.replace('-', ' ')} for Stagehand.`,
            `Use ${current.styleBible.construction} construction and ${current.styleBible.palette.join(', ')} palette.`,
            brief ?? defaultAssetBrief(kind),
            assetChecklist(kind, method).join(' '),
          ].join(' '),
        };
      },
      true,
    );
    register(
      'analyze_scene_asset_needs',
      'Analyze scene asset needs',
      'Inspect the active scene and return the pose, expression, view, and motion variants missing from its character packages.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => {
        const current = projectRef.current;
        const needs: Array<Record<string, unknown>> = [];
        current.characters.forEach((character) => {
          const baseAsset = current.assets.find(
            (asset) => asset.id === character.assetId,
          );
          if (!baseAsset) return;
          const characterFrames = current.keyframes
            .filter((frame) => frame.characterId === character.id)
            .sort((a, b) => a.time - b.time);
          const moved = characterFrames.some(
            (frame, index) =>
              index > 0 && Math.abs(frame.x - characterFrames[index - 1].x) > 3,
          );
          const turned = characterFrames.some(
            (frame, index) =>
              index > 0 &&
              Math.abs(frame.rotation - characterFrames[index - 1].rotation) >
                8,
          );
          const text = current.captions
            .filter((caption) => caption.speaker === character.name)
            .map((caption) => caption.text.toLowerCase())
            .join(' ');
          const requested: Array<{
            variantKind: AssetVariantKind;
            label: string;
            expression?: string;
            viewDirection?: ViewDirection;
            pose?: Pose;
          }> = [
            ...(moved
              ? [
                  {
                    variantKind: 'motion' as const,
                    label: 'Walk cycle',
                    pose: 'idle' as Pose,
                  },
                ]
              : []),
            ...(turned
              ? [
                  {
                    variantKind: 'view' as const,
                    label: 'Three-quarter turn',
                    viewDirection: 'three-quarter' as ViewDirection,
                  },
                ]
              : []),
            ...(text.includes('actually') || text.includes('came')
              ? [
                  {
                    variantKind: 'expression' as const,
                    label: 'Embarrassed',
                    expression: 'embarrassed',
                  },
                ]
              : []),
            ...(text.includes('spill') || text.includes('mug')
              ? [
                  {
                    variantKind: 'expression' as const,
                    label: 'Surprised',
                    expression: 'surprised',
                  },
                ]
              : []),
            {
              variantKind: 'expression' as const,
              label: 'Pleased',
              expression: 'pleased',
            },
          ];
          requested.forEach((requirement) => {
            const available = current.assets.some(
              (asset) =>
                asset.variantOf === baseAsset.id &&
                asset.variantKind === requirement.variantKind &&
                (requirement.expression === undefined ||
                  asset.expression === requirement.expression) &&
                (requirement.viewDirection === undefined ||
                  asset.viewDirection === requirement.viewDirection),
            );
            if (!available)
              needs.push({
                characterId: character.id,
                character: character.name,
                sourceAssetId: baseAsset.id,
                ...requirement,
                bindingMethod: 'segmented',
                reason: 'Scene timing and dialogue call for this coverage.',
              });
          });
        });
        return {
          ok: true,
          revision: current.revision,
          sceneId: current.activeSceneId,
          needs,
          requestCount: needs.length,
          nextStep: needs.length
            ? 'create_asset_request for each need, then generate and attach the reviewed package.'
            : 'All requested variants are available.',
        };
      },
      true,
    );
    register(
      'create_asset_request',
      'Create asset request',
      'Persist a reviewable request that an agent can use to generate a compatible visual asset.',
      {
        type: 'object',
        required: ['kind', 'label'],
        additionalProperties: false,
        properties: {
          kind: {
            type: 'string',
            enum: ['rigged-character', 'background', 'prop'],
          },
          label: { type: 'string', minLength: 1, maxLength: 80 },
          targetCharacterId: { type: 'string' },
          bindingMethod: {
            type: 'string',
            enum: ['rigid', 'segmented', 'mesh'],
          },
          variantKind: {
            type: 'string',
            enum: ['base', 'view', 'pose', 'expression', 'motion'],
          },
          viewDirection: {
            type: 'string',
            enum: ['front', 'three-quarter', 'profile', 'back'],
          },
          pose: { type: 'string' },
          expression: { type: 'string' },
          prompt: { type: 'string', maxLength: 2400 },
        },
      },
      (input) => {
        const current = projectRef.current;
        const kind = input.kind;
        const label = typeof input.label === 'string' ? input.label.trim() : '';
        if (!isAssetKind(kind) || kind === 'audio' || !label)
          return { ok: false, code: 'INVALID_INPUT' };
        const target = current.characters.find(
          (character) => character.id === input.targetCharacterId,
        );
        const bindingMethod = isBindingMethod(input.bindingMethod)
          ? input.bindingMethod
          : kind === 'rigged-character'
            ? 'segmented'
            : 'rigid';
        const checklist = assetChecklist(kind, bindingMethod);
        const variantBrief = [
          isAssetVariantKind(input.variantKind)
            ? `${input.variantKind} variant`
            : '',
          isViewDirection(input.viewDirection)
            ? `view: ${input.viewDirection}`
            : '',
          isPose(input.pose) ? `pose: ${input.pose}` : '',
          typeof input.expression === 'string'
            ? `expression: ${input.expression.trim()}`
            : '',
        ]
          .filter(Boolean)
          .join(', ');
        const prompt =
          typeof input.prompt === 'string' && input.prompt.trim()
            ? input.prompt.trim()
            : [
                `Create ${label} for Stagehand.`,
                current.styleBible.construction,
                current.styleBible.palette.join(', '),
                variantBrief,
                checklist.join(' '),
              ].join(' · ');
        const request: AssetGenerationRequest = {
          id: nextAssetRequestId(current.assetRequests),
          kind,
          label,
          targetCharacterId: target?.id,
          bindingMethod,
          variantKind: isAssetVariantKind(input.variantKind)
            ? input.variantKind
            : 'base',
          viewDirection: isViewDirection(input.viewDirection)
            ? input.viewDirection
            : undefined,
          pose: isPose(input.pose) ? input.pose : undefined,
          expression:
            typeof input.expression === 'string' &&
            ['neutral', 'surprised', 'embarrassed', 'pleased'].includes(
              input.expression.trim(),
            )
              ? (input.expression.trim() as Asset['expression'])
              : undefined,
          prompt,
          checklist,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        commitRef.current(
          (next) => next.assetRequests.push(request),
          `Request asset ${label}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          request,
        };
      },
    );
    register(
      'attach_generated_asset',
      'Attach generated asset',
      'Attach a generated image candidate to a pending request without binding or approving it.',
      {
        type: 'object',
        required: ['requestId', 'dataUrl'],
        additionalProperties: false,
        properties: {
          requestId: { type: 'string' },
          dataUrl: {
            type: 'string',
            minLength: 24,
            maxLength: 5600000,
            description:
              'A bounded data:image payload produced by the agent or browser upload path.',
          },
          mimeType: { type: 'string' },
          frameLayout: {
            type: 'string',
            enum: ['single', 'four-column', 'parts-sheet'],
          },
          prompt: { type: 'string', maxLength: 2400 },
          sourceUrl: { type: 'string', maxLength: 500 },
          width: { type: 'number', minimum: 1, maximum: 8192 },
          height: { type: 'number', minimum: 1, maximum: 8192 },
          transparencyStatus: {
            type: 'string',
            enum: ['yes', 'no', 'unknown'],
          },
          variantKind: {
            type: 'string',
            enum: ['base', 'view', 'pose', 'expression', 'motion'],
          },
          viewDirection: {
            type: 'string',
            enum: ['front', 'three-quarter', 'profile', 'back'],
          },
          poseVariant: { type: 'string' },
          expression: { type: 'string' },
          assetPackage: { type: 'object' },
          rigManifest: { type: 'object' },
        },
      },
      async (input) => {
        const current = projectRef.current;
        const requestId =
          typeof input.requestId === 'string' ? input.requestId : '';
        const dataUrl = typeof input.dataUrl === 'string' ? input.dataUrl : '';
        const request = current.assetRequests.find(
          (item) => item.id === requestId,
        );
        if (!request) return { ok: false, code: 'NOT_FOUND' };
        if (
          !/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(dataUrl) ||
          dataUrl.length > 5600000
        )
          return { ok: false, code: 'INVALID_ASSET_PAYLOAD' };
        let payload: Awaited<ReturnType<typeof inspectImagePayload>>;
        try {
          payload = await inspectImagePayload(dataUrl);
        } catch {
          return { ok: false, code: 'INVALID_ASSET_PAYLOAD' };
        }
        const checksum = await checksumDataUrl(dataUrl);
        const frameLayout: AssetFrameLayout =
          input.frameLayout === 'parts-sheet' ||
          input.frameLayout === 'four-column'
            ? input.frameLayout
            : request.bindingMethod === 'segmented'
              ? 'parts-sheet'
              : 'single';
        const provenance: NonNullable<Asset['provenance']> = {
          prompt:
            typeof input.prompt === 'string' && input.prompt.trim()
              ? input.prompt.trim()
              : request.prompt,
          sourceUrl:
            typeof input.sourceUrl === 'string' ? input.sourceUrl : undefined,
          checksum,
        };
        const asset: Asset = {
          id: nextAssetId(current.assets, request.kind),
          kind: request.kind,
          label: request.label,
          brief: request.prompt,
          source: 'generated',
          frameLayout,
          detectedLayout: frameLayout,
          frameCount: frameLayout === 'four-column' ? 4 : 1,
          mimeType:
            typeof input.mimeType === 'string' ? input.mimeType : 'image/png',
          dataUrl,
          reviewStatus: 'pending-review',
          transparencyStatus: payload.transparencyStatus,
          dimensions: { width: payload.width, height: payload.height },
          generationRequestId: request.id,
          variantOf:
            request.targetCharacterId && request.variantKind !== 'base'
              ? current.characters.find(
                  (character) => character.id === request.targetCharacterId,
                )?.assetId
              : undefined,
          variantKind: isAssetVariantKind(input.variantKind)
            ? input.variantKind
            : 'base',
          viewDirection: isViewDirection(input.viewDirection)
            ? input.viewDirection
            : undefined,
          poseVariant: isPose(input.poseVariant)
            ? input.poseVariant
            : undefined,
          expression:
            typeof input.expression === 'string' &&
            ['neutral', 'surprised', 'embarrassed', 'pleased'].includes(
              input.expression.trim(),
            )
              ? (input.expression.trim() as Asset['expression'])
              : undefined,
          provenance,
          style: defaultAssetStyle(request.kind),
        };
        const declaredDimensionsMismatch =
          (typeof input.width === 'number' && input.width !== payload.width) ||
          (typeof input.height === 'number' && input.height !== payload.height);
        const providedPackage =
          input.assetPackage && typeof input.assetPackage === 'object'
            ? input.assetPackage
            : input.rigManifest && typeof input.rigManifest === 'object'
              ? input.rigManifest
              : undefined;
        if (
          request.kind === 'rigged-character' &&
          frameLayout === 'parts-sheet'
        ) {
          if (providedPackage) {
            const issues = assetPackageIssues(providedPackage, payload);
            asset.packageIssues = [
              ...(declaredDimensionsMismatch
                ? ['Declared dimensions do not match decoded pixels.']
                : []),
              ...issues,
            ];
            if (issues.length === 0) {
              asset.assetPackage = providedPackage as StagehandAssetPackageV2;
              asset.rigManifest = asset.assetPackage;
            }
          } else {
            const inferred = await inferRigManifest(asset);
            inferred.sourceAsset = {
              assetId: asset.id,
              immutable: true,
              provenance,
            };
            inferred.image = {
              width: payload.width,
              height: payload.height,
              colorspace: 'sRGB',
              alpha: 'straight',
            };
            asset.assetPackage = inferred;
            asset.rigManifest = inferred;
            asset.packageIssues = [
              ...(declaredDimensionsMismatch
                ? ['Declared dimensions do not match decoded pixels.']
                : []),
              ...assetPackageIssues(inferred, payload),
            ];
          }
        } else if (declaredDimensionsMismatch) {
          asset.packageIssues = [
            'Declared dimensions do not match decoded pixels.',
          ];
        }
        commitRef.current(
          (next) => {
            next.assets.push(asset);
            const nextRequest = next.assetRequests.find(
              (item) => item.id === request.id,
            );
            if (nextRequest) nextRequest.status = 'attached';
          },
          `Attach generated ${asset.label}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          asset: { ...asset, dataUrl: undefined, hasPayload: true },
          reviewStatus: asset.reviewStatus,
          nextStep:
            'inspect_asset_candidate, then approve_asset and bind_character_asset',
        };
      },
    );
    register(
      'inspect_asset_candidate',
      'Inspect asset candidate',
      'Inspect generated asset readiness, provenance, layout, and the remaining generation checklist.',
      {
        type: 'object',
        required: ['assetId'],
        additionalProperties: false,
        properties: { assetId: { type: 'string' } },
      },
      (input) => {
        const current = projectRef.current;
        const assetId = typeof input.assetId === 'string' ? input.assetId : '';
        const asset = current.assets.find((item) => item.id === assetId);
        if (!asset) return { ok: false, code: 'NOT_FOUND' };
        const request = asset.generationRequestId
          ? current.assetRequests.find(
              (item) => item.id === asset.generationRequestId,
            )
          : undefined;
        const { checks, readyForApproval } = candidateApprovalChecks(
          asset,
          request,
        );
        return {
          ok: true,
          revision: current.revision,
          asset: {
            ...asset,
            dataUrl: undefined,
            hasPayload: Boolean(asset.dataUrl),
          },
          request,
          checks,
          packageIssues: asset.packageIssues ?? [],
          checklist:
            request?.checklist ??
            assetChecklist(asset.kind === 'audio' ? 'prop' : asset.kind),
          readyForApproval,
        };
      },
      true,
    );
    register(
      'approve_asset',
      'Approve asset candidate',
      'Approve or reject a generated asset candidate without changing the original source asset.',
      {
        type: 'object',
        required: ['assetId', 'approved'],
        additionalProperties: false,
        properties: {
          assetId: { type: 'string' },
          approved: { type: 'boolean' },
        },
      },
      (input) => {
        const current = projectRef.current;
        const assetId = typeof input.assetId === 'string' ? input.assetId : '';
        const asset = current.assets.find((item) => item.id === assetId);
        if (!asset) return { ok: false, code: 'NOT_FOUND' };
        const approved = input.approved === true;
        const request = asset.generationRequestId
          ? current.assetRequests.find(
              (item) => item.id === asset.generationRequestId,
            )
          : undefined;
        const { readyForApproval } = candidateApprovalChecks(asset, request);
        if (approved && !readyForApproval)
          return {
            ok: false,
            code: 'ASSET_REVIEW_REQUIRED',
            issues: asset.packageIssues ?? [],
            message:
              'Inspect the candidate and correct its payload, transparency, dimensions, or package before approval.',
          };
        commitRef.current(
          (next) => {
            const item = next.assets.find(
              (candidate) => candidate.id === assetId,
            );
            if (item) item.reviewStatus = approved ? 'approved' : 'rejected';
            if (item?.generationRequestId) {
              const request = next.assetRequests.find(
                (candidate) => candidate.id === item.generationRequestId,
              );
              if (request) request.status = approved ? 'approved' : 'rejected';
            }
          },
          `${approved ? 'Approve' : 'Reject'} asset ${asset.label}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          assetId,
          reviewStatus: approved ? 'approved' : 'rejected',
        };
      },
    );
    register(
      'get_asset_manifest',
      'Get asset manifest',
      'Inspect the structured assets available to the active project.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => {
        const current = projectRef.current;
        return {
          ok: true,
          revision: current.revision,
          assets: current.assets.map((asset) => {
            const boundTo = current.characters
              .filter((character) => character.assetId === asset.id)
              .map((character) => character.name);
            const visibleOnStage =
              boundTo.length > 0 ||
              (asset.kind === 'background' &&
                (asset.source === 'starter' || Boolean(asset.dataUrl))) ||
              (asset.kind === 'prop' && Boolean(asset.dataUrl));
            return {
              ...asset,
              dataUrl: undefined,
              hasPayload: Boolean(asset.dataUrl),
              placement:
                boundTo.length > 0
                  ? 'bound'
                  : visibleOnStage
                    ? 'stage'
                    : 'library',
              boundTo,
              keyframeCount: current.propKeyframes.filter(
                (frame) => frame.assetId === asset.id,
              ).length,
            };
          }),
        };
      },
      true,
    );
    register(
      'set_asset_brief',
      'Set asset brief',
      'Update the concise visual and story-direction brief for one structured asset.',
      {
        type: 'object',
        required: ['assetId', 'brief'],
        additionalProperties: false,
        properties: {
          assetId: { type: 'string' },
          brief: { type: 'string', minLength: 1 },
        },
      },
      (input) => {
        const current = projectRef.current;
        const assetId = typeof input.assetId === 'string' ? input.assetId : '';
        const brief = typeof input.brief === 'string' ? input.brief.trim() : '';
        const asset = current.assets.find((item) => item.id === assetId);
        if (!asset) return { ok: false, code: 'NOT_FOUND' };
        if (!brief) return { ok: false, code: 'INVALID_INPUT' };
        commitRef.current(
          (next) => {
            const item = next.assets.find(
              (candidate) => candidate.id === assetId,
            );
            if (item) item.brief = brief;
          },
          `Set brief for ${asset.label}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          assetId,
          brief,
          changedPaths: [`assets.${assetId}.brief`],
        };
      },
    );
    register(
      'set_asset_style',
      'Set asset style',
      'Update the structured visual treatment, role, silhouette, palette, and notes for one asset.',
      {
        type: 'object',
        required: ['assetId'],
        additionalProperties: false,
        properties: {
          assetId: { type: 'string' },
          role: {
            type: 'string',
            enum: ['hero', 'support', 'environment', 'accent'],
          },
          treatment: {
            type: 'string',
            enum: ['paper', 'inked', 'flat-color', 'photo'],
          },
          silhouette: { type: 'string', enum: ['clear', 'detailed'] },
          palette: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
            minItems: 1,
          },
          notes: { type: 'string' },
        },
      },
      (input) => {
        const current = projectRef.current;
        const assetId = typeof input.assetId === 'string' ? input.assetId : '';
        const asset = current.assets.find((item) => item.id === assetId);
        if (!asset) return { ok: false, code: 'NOT_FOUND' };
        const currentStyle = asset.style ?? defaultAssetStyle(asset.kind);
        const role = input.role === undefined ? currentStyle.role : input.role;
        const treatment =
          input.treatment === undefined
            ? currentStyle.treatment
            : input.treatment;
        const silhouette =
          input.silhouette === undefined
            ? currentStyle.silhouette
            : input.silhouette;
        const palette =
          input.palette === undefined
            ? currentStyle.palette
            : Array.isArray(input.palette)
              ? input.palette
              : null;
        const notes =
          input.notes === undefined ? currentStyle.notes : input.notes;
        if (
          !isAssetRole(role) ||
          !isAssetTreatment(treatment) ||
          !isAssetSilhouette(silhouette) ||
          !Array.isArray(palette) ||
          palette.length === 0 ||
          palette.some((value) => typeof value !== 'string' || !value.trim()) ||
          typeof notes !== 'string'
        )
          return { ok: false, code: 'INVALID_INPUT' };
        const style: AssetStyle = {
          role,
          treatment,
          silhouette,
          palette: palette.map((value) => value.trim()),
          notes: notes.trim(),
        };
        commitRef.current(
          (next) => {
            const item = next.assets.find(
              (candidate) => candidate.id === assetId,
            );
            if (item) item.style = style;
          },
          `Set style for ${asset.label}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          assetId,
          style,
          changedPaths: [`assets.${assetId}.style`],
        };
      },
    );
    register(
      'add_asset',
      'Add asset',
      'Add a structured placeholder asset to the project asset library for later media replacement.',
      {
        type: 'object',
        required: ['kind', 'label'],
        additionalProperties: false,
        properties: {
          kind: {
            type: 'string',
            enum: ['rigged-character', 'background', 'prop', 'audio'],
          },
          label: { type: 'string', minLength: 1 },
        },
      },
      (input) => {
        const current = projectRef.current;
        const label = typeof input.label === 'string' ? input.label.trim() : '';
        if (!isAssetKind(input.kind) || !label)
          return { ok: false, code: 'INVALID_INPUT' };
        const asset: Asset = {
          id: nextAssetId(current.assets, input.kind),
          kind: input.kind,
          label,
          brief: defaultAssetBrief(input.kind),
          source: 'placeholder',
          frameLayout: 'single',
          style: defaultAssetStyle(input.kind),
        };
        commitRef.current(
          (next) => {
            next.assets.push(asset);
          },
          `Add asset ${label}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          asset,
          changedEntityIds: [asset.id],
        };
      },
    );
    register(
      'remove_asset',
      'Remove asset',
      'Remove one asset from the project asset library without changing scene timing or animation.',
      {
        type: 'object',
        required: ['assetId'],
        additionalProperties: false,
        properties: { assetId: { type: 'string' } },
      },
      (input) => {
        const current = projectRef.current;
        const assetId = typeof input.assetId === 'string' ? input.assetId : '';
        const asset = current.assets.find((item) => item.id === assetId);
        if (!asset) return { ok: false, code: 'NOT_FOUND' };
        commitRef.current(
          (next) => {
            next.assets = next.assets.filter((item) => item.id !== assetId);
            next.assetRequests = next.assetRequests.filter(
              (request) => request.id !== asset.generationRequestId,
            );
            const removedSkeletonIds = next.skeletons
              .filter((skeleton) => skeleton.assetId === assetId)
              .map((skeleton) => skeleton.id);
            next.skeletons = next.skeletons.filter(
              (skeleton) => skeleton.assetId !== assetId,
            );
            next.boneKeyframes = next.boneKeyframes.filter(
              (frame) => !removedSkeletonIds.includes(frame.skeletonId),
            );
            next.propKeyframes = next.propKeyframes.filter(
              (frame) => frame.assetId !== assetId,
            );
            next.characters.forEach((character) => {
              if (character.assetId === assetId) character.assetId = undefined;
            });
          },
          `Remove asset ${asset.label}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          removedAssetId: assetId,
        };
      },
    );
    register(
      'bind_character_asset',
      'Bind character art',
      'Attach imported character art to a rigged character while preserving its animation keyframes.',
      {
        type: 'object',
        required: ['characterId', 'assetId'],
        additionalProperties: false,
        properties: {
          characterId: { type: 'string' },
          assetId: { type: 'string' },
        },
      },
      (input) => {
        const current = projectRef.current;
        const characterId =
          typeof input.characterId === 'string' ? input.characterId : '';
        const assetId = typeof input.assetId === 'string' ? input.assetId : '';
        const character = current.characters.find(
          (item) => item.id === characterId,
        );
        const asset = current.assets.find((item) => item.id === assetId);
        if (!character || !asset) return { ok: false, code: 'NOT_FOUND' };
        if (asset.kind !== 'rigged-character' || !asset.dataUrl) {
          return { ok: false, code: 'INVALID_ASSET' };
        }
        if (asset.source === 'generated' && asset.reviewStatus !== 'approved') {
          return {
            ok: false,
            code: 'ASSET_NOT_APPROVED',
            message:
              'Approve the generated candidate before binding it to a character.',
          };
        }
        commitRef.current(
          (next) => {
            const item = next.characters.find(
              (candidate) => candidate.id === characterId,
            );
            if (item) {
              item.assetId = assetId;
              const selectedVariant = item.variantId
                ? next.assets.find(
                    (candidate) => candidate.id === item.variantId,
                  )
                : undefined;
              if (selectedVariant?.variantOf !== assetId)
                item.variantId = undefined;
            }
            next.keyframes
              .filter((frame) => frame.characterId === characterId)
              .forEach((frame) => {
                const variant = frame.variantId
                  ? next.assets.find(
                      (candidate) => candidate.id === frame.variantId,
                    )
                  : undefined;
                if (variant && variant.variantOf !== assetId)
                  frame.variantId = undefined;
              });
          },
          `Bind ${asset.label} to ${character.name}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          characterId,
          assetId,
          changedPaths: [`characters.${characterId}.assetId`],
        };
      },
    );
    register(
      'propose_skeleton',
      'Propose skeleton',
      'Create a pending-review skeleton proposal for a character asset; proposals never affect animation until approved.',
      {
        type: 'object',
        required: ['assetId'],
        additionalProperties: false,
        properties: {
          assetId: { type: 'string' },
          label: { type: 'string', maxLength: 100 },
          bindingMethod: {
            type: 'string',
            enum: ['rigid', 'segmented', 'mesh'],
          },
          joints: { type: 'array', maxItems: 64 },
          bones: { type: 'array', maxItems: 64 },
          regions: { type: 'array', maxItems: 32 },
          vertices: { type: 'array', maxItems: 512 },
          weights: { type: 'array', maxItems: 2048 },
          mesh: meshBindingInputSchema,
        },
      },
      async (input) => {
        const current = projectRef.current;
        const assetId = typeof input.assetId === 'string' ? input.assetId : '';
        const asset = current.assets.find((item) => item.id === assetId);
        if (!asset || asset.kind !== 'rigged-character')
          return { ok: false, code: 'INVALID_ASSET' };
        const method = isBindingMethod(input.bindingMethod)
          ? input.bindingMethod
          : asset.frameLayout === 'parts-sheet'
            ? 'segmented'
            : 'rigid';
        const rigManifest =
          asset.assetPackage ??
          asset.rigManifest ??
          (await inferRigManifest(asset));
        const analyzedAsset = {
          ...asset,
          rigManifest,
          assetPackage: rigManifest,
        };
        const base = defaultSkeletonForAsset(
          assetId,
          typeof input.label === 'string' && input.label.trim()
            ? input.label.trim()
            : asset.label,
          method,
          analyzedAsset,
        );
        const skeletonId = `${base.id}-${current.skeletons.length + 1}`;
        base.id = skeletonId;
        if (Array.isArray(input.joints) && input.joints.length > 0)
          base.joints = input.joints.filter(
            (joint): joint is SkeletonJoint =>
              typeof joint === 'object' &&
              joint !== null &&
              typeof (joint as SkeletonJoint).id === 'string' &&
              typeof (joint as SkeletonJoint).label === 'string' &&
              Number.isFinite((joint as SkeletonJoint).x) &&
              Number.isFinite((joint as SkeletonJoint).y),
          );
        if (Array.isArray(input.bones) && input.bones.length > 0)
          base.bones = input.bones.filter(
            (bone): bone is SkeletonBone =>
              typeof bone === 'object' &&
              bone !== null &&
              typeof (bone as SkeletonBone).id === 'string' &&
              typeof (bone as SkeletonBone).parentJointId === 'string' &&
              typeof (bone as SkeletonBone).childJointId === 'string',
          );
        base.binding = {
          ...base.binding,
          ...(Array.isArray(input.regions) ? { regions: input.regions } : {}),
          ...(Array.isArray(input.vertices)
            ? { vertices: input.vertices }
            : {}),
          ...(Array.isArray(input.weights) ? { weights: input.weights } : {}),
        } as SkeletonBinding;
        const requestedMesh =
          input.mesh &&
          typeof input.mesh === 'object' &&
          !Array.isArray(input.mesh)
            ? copy(input.mesh as MeshBindingV1)
            : adaptLegacyMesh({
                assetId,
                skeletonVersion: base.version,
                vertices: base.binding.vertices,
                weights: base.binding.weights,
                experimentalMesh: rigManifest.experimentalMesh,
              });
        if (method === 'mesh') {
          const meshIssues = validateMeshBinding(requestedMesh, {
            assetId,
            skeletonVersion: base.version,
            boneIds: base.bones.map((bone) => bone.id),
          });
          if (meshIssues.length > 0)
            return {
              ok: false,
              code: 'INVALID_MESH_BINDING',
              issues: meshIssues,
            };
          base.binding.mesh = requestedMesh;
        }
        commitRef.current(
          (next) => {
            const targetAsset = next.assets.find((item) => item.id === assetId);
            if (targetAsset) {
              targetAsset.rigManifest = rigManifest;
              targetAsset.assetPackage = rigManifest;
            }
            next.skeletons.push(base);
          },
          `Propose ${base.label}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          skeleton: base,
          reviewStatus: 'pending-review',
          nextStep:
            'get_skeleton, update_skeleton_joint, then approve_skeleton',
        };
      },
    );
    register(
      'get_skeleton',
      'Get skeleton',
      'Inspect a pending or approved skeleton proposal, its binding, confidence, and approval state.',
      {
        type: 'object',
        properties: {
          skeletonId: { type: 'string' },
          assetId: { type: 'string' },
        },
        additionalProperties: false,
      },
      (input) => {
        const current = projectRef.current;
        const skeleton = current.skeletons.find(
          (item) =>
            (typeof input.skeletonId !== 'string' ||
              item.id === input.skeletonId) &&
            (typeof input.assetId !== 'string' ||
              item.assetId === input.assetId),
        );
        if (!skeleton) return { ok: false, code: 'NOT_FOUND' };
        return {
          ok: true,
          revision: current.revision,
          skeleton,
          boneKeyframes: current.boneKeyframes.filter(
            (frame) => frame.skeletonId === skeleton.id,
          ),
        };
      },
      true,
    );
    register(
      'update_skeleton_joint',
      'Update skeleton joint',
      'Move, lock, or relabel one joint in a pending skeleton proposal; editing an approved skeleton returns it to review.',
      {
        type: 'object',
        required: ['skeletonId', 'jointId'],
        additionalProperties: false,
        properties: {
          skeletonId: { type: 'string' },
          jointId: { type: 'string' },
          x: { type: 'number', minimum: 0, maximum: 100 },
          y: { type: 'number', minimum: 0, maximum: 100 },
          radius: { type: 'number', minimum: 1, maximum: 20 },
          label: { type: 'string', minLength: 1, maxLength: 50 },
          locked: { type: 'boolean' },
        },
      },
      (input) => {
        const current = projectRef.current;
        const skeletonId =
          typeof input.skeletonId === 'string' ? input.skeletonId : '';
        const jointId = typeof input.jointId === 'string' ? input.jointId : '';
        const skeleton = current.skeletons.find(
          (item) => item.id === skeletonId,
        );
        const joint = skeleton?.joints.find((item) => item.id === jointId);
        if (!skeleton || !joint) return { ok: false, code: 'NOT_FOUND' };
        const updates = {
          x: input.x === undefined ? joint.x : Number(input.x),
          y: input.y === undefined ? joint.y : Number(input.y),
          radius:
            input.radius === undefined ? joint.radius : Number(input.radius),
          label:
            input.label === undefined
              ? joint.label
              : typeof input.label === 'string'
                ? input.label.trim()
                : '',
          locked:
            input.locked === undefined ? joint.locked : input.locked === true,
        };
        if (
          !Number.isFinite(updates.x) ||
          !Number.isFinite(updates.y) ||
          !Number.isFinite(updates.radius) ||
          !updates.label
        )
          return { ok: false, code: 'INVALID_INPUT' };
        commitRef.current(
          (next) => {
            const target = next.skeletons
              .find((item) => item.id === skeletonId)
              ?.joints.find((item) => item.id === jointId);
            if (target) Object.assign(target, updates);
            const edited = next.skeletons.find(
              (item) => item.id === skeletonId,
            );
            if (edited) {
              edited.version += 1;
              if (edited.reviewStatus === 'approved')
                edited.reviewStatus = 'pending-review';
            }
          },
          `Update ${joint.label}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          skeletonId,
          joint: { ...joint, ...updates },
        };
      },
    );
    register(
      'bind_skeleton_asset',
      'Bind skeleton asset',
      'Set the segmented or mesh binding metadata for a skeleton without approving it.',
      {
        type: 'object',
        required: ['skeletonId', 'assetId'],
        additionalProperties: false,
        properties: {
          skeletonId: { type: 'string' },
          assetId: { type: 'string' },
          method: { type: 'string', enum: ['rigid', 'segmented', 'mesh'] },
          regions: { type: 'array' },
          vertices: { type: 'array' },
          weights: { type: 'array' },
          mesh: meshBindingInputSchema,
        },
      },
      (input) => {
        const current = projectRef.current;
        const skeletonId =
          typeof input.skeletonId === 'string' ? input.skeletonId : '';
        const assetId = typeof input.assetId === 'string' ? input.assetId : '';
        const skeleton = current.skeletons.find(
          (item) => item.id === skeletonId,
        );
        const asset = current.assets.find((item) => item.id === assetId);
        if (!skeleton || !asset || asset.kind !== 'rigged-character')
          return { ok: false, code: 'NOT_FOUND' };
        if (!asset.dataUrl || asset.reviewStatus !== 'approved')
          return { ok: false, code: 'ASSET_NOT_APPROVED' };
        const method = isBindingMethod(input.method)
          ? input.method
          : skeleton.binding.method;
        if (
          method === 'segmented' &&
          (!asset.assetPackage || assetPackageIssues(asset.assetPackage).length)
        )
          return { ok: false, code: 'INVALID_ASSET_PACKAGE' };
        const requestedMesh =
          input.mesh &&
          typeof input.mesh === 'object' &&
          !Array.isArray(input.mesh)
            ? copy(input.mesh as MeshBindingV1)
            : (skeleton.binding.mesh ??
              adaptLegacyMesh({
                assetId,
                skeletonVersion: skeleton.version,
                vertices: Array.isArray(input.vertices)
                  ? (input.vertices as SkeletonBinding['vertices'])
                  : skeleton.binding.vertices,
                weights: Array.isArray(input.weights)
                  ? (input.weights as SkeletonBinding['weights'])
                  : skeleton.binding.weights,
                experimentalMesh:
                  asset.assetPackage?.experimentalMesh ??
                  asset.rigManifest?.experimentalMesh,
              }));
        if (method === 'mesh') {
          const meshIssues = validateMeshBinding(requestedMesh, {
            assetId,
            skeletonVersion: skeleton.version,
            boneIds: skeleton.bones.map((bone) => bone.id),
          });
          if (meshIssues.length > 0)
            return {
              ok: false,
              code: 'INVALID_MESH_BINDING',
              issues: meshIssues,
            };
        }
        const nextSkeletonVersion = skeleton.version + 1;
        commitRef.current(
          (next) => {
            const target = next.skeletons.find(
              (item) => item.id === skeletonId,
            );
            if (!target) return;
            target.assetId = assetId;
            target.binding = {
              ...target.binding,
              assetId,
              method,
              ...(Array.isArray(input.regions)
                ? { regions: input.regions }
                : {}),
              ...(Array.isArray(input.vertices)
                ? { vertices: input.vertices }
                : {}),
              ...(Array.isArray(input.weights)
                ? { weights: input.weights }
                : {}),
              ...(method === 'mesh' && requestedMesh
                ? {
                    mesh: {
                      ...requestedMesh,
                      textureAssetId: assetId,
                      skeletonVersion: nextSkeletonVersion,
                    },
                  }
                : {}),
            } as SkeletonBinding;
            target.reviewStatus = 'pending-review';
            target.version = nextSkeletonVersion;
          },
          `Bind skeleton to ${asset.label}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          skeletonId,
          assetId,
          method,
          reviewStatus: 'pending-review',
        };
      },
    );
    register(
      'approve_skeleton',
      'Approve skeleton',
      'Approve or reject a skeleton proposal; only approved skeletons can drive bone animation.',
      {
        type: 'object',
        required: ['skeletonId', 'approved'],
        additionalProperties: false,
        properties: {
          skeletonId: { type: 'string' },
          approved: { type: 'boolean' },
        },
      },
      async (input) => {
        const current = projectRef.current;
        const skeletonId =
          typeof input.skeletonId === 'string' ? input.skeletonId : '';
        const skeleton = current.skeletons.find(
          (item) => item.id === skeletonId,
        );
        if (!skeleton) return { ok: false, code: 'NOT_FOUND' };
        const approved = input.approved === true;
        const asset = current.assets.find(
          (item) => item.id === skeleton.assetId,
        );
        const modelIssues = skeletonModelIssues(skeleton, asset);
        const rendered =
          approved && asset?.dataUrl
            ? await inspectRenderedRigPreview(asset, skeleton)
            : undefined;
        if (approved && modelIssues.length > 0)
          return {
            ok: false,
            code: 'SKELETON_REVIEW_REQUIRED',
            message: modelIssues.join(' '),
          };
        if (approved && rendered && !rendered.passed)
          return {
            ok: false,
            code: 'RIG_PREVIEW_FAILED',
            message: rendered.blockedReasons.join(' '),
            preview: rendered,
          };
        commitRef.current(
          (next) => {
            const target = next.skeletons.find(
              (item) => item.id === skeletonId,
            );
            if (target)
              target.reviewStatus = approved ? 'approved' : 'rejected';
          },
          `${approved ? 'Approve' : 'Reject'} ${skeleton.label}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          skeletonId,
          reviewStatus: approved ? 'approved' : 'rejected',
          preview: rendered,
        };
      },
    );
    register(
      'set_bone_keyframe',
      'Set bone keyframe',
      'Set joint-level bone transforms at a scene time; rejected until the referenced skeleton is approved.',
      {
        type: 'object',
        required: ['skeletonId', 'timeMs', 'transforms'],
        additionalProperties: false,
        properties: {
          skeletonId: { type: 'string' },
          timeMs: { type: 'number', minimum: 0 },
          transforms: { type: 'array', minItems: 1, maxItems: 64 },
        },
      },
      async (input) => {
        const current = projectRef.current;
        const skeletonId =
          typeof input.skeletonId === 'string' ? input.skeletonId : '';
        const skeleton = current.skeletons.find(
          (item) => item.id === skeletonId,
        );
        const timeMs = typeof input.timeMs === 'number' ? input.timeMs : NaN;
        const transforms = Array.isArray(input.transforms)
          ? input.transforms
          : [];
        if (!skeleton) return { ok: false, code: 'NOT_FOUND' };
        if (skeleton.reviewStatus !== 'approved')
          return { ok: false, code: 'SKELETON_NOT_APPROVED' };
        if (
          !Number.isFinite(timeMs) ||
          timeMs < 0 ||
          timeMs > current.duration ||
          transforms.length === 0
        )
          return { ok: false, code: 'INVALID_INPUT' };
        const boneIds = new Set(skeleton.bones.map((bone) => bone.id));
        const normalized = transforms.map((value) => {
          const item = value as Partial<BoneTransform>;
          return {
            boneId: String(item.boneId ?? ''),
            rotation: Number(item.rotation ?? 0),
            x: Number(item.x ?? 0),
            y: Number(item.y ?? 0),
            scale: Number(item.scale ?? 1),
          };
        });
        if (
          normalized.some(
            (item) =>
              !boneIds.has(item.boneId) ||
              !Number.isFinite(item.rotation) ||
              !Number.isFinite(item.x) ||
              !Number.isFinite(item.y) ||
              !Number.isFinite(item.scale) ||
              item.scale <= 0,
          )
        )
          return { ok: false, code: 'INVALID_BONE_TRANSFORM' };
        const safeTime = Math.round(timeMs);
        commitRef.current(
          (next) => {
            const existing = next.boneKeyframes.find(
              (frame) =>
                frame.sceneId === next.activeSceneId &&
                frame.skeletonId === skeletonId &&
                frame.time === safeTime,
            );
            if (existing) existing.transforms = normalized;
            else
              next.boneKeyframes.push({
                id: `bkf-${skeletonId}-${safeTime}`,
                sceneId: next.activeSceneId,
                skeletonId,
                time: safeTime,
                transforms: normalized,
              });
            next.boneKeyframes.sort((a, b) => a.time - b.time);
          },
          `Set ${skeleton.label} bone keyframe`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          skeletonId,
          sceneId: current.activeSceneId,
          timeMs: safeTime,
          transforms: normalized,
        };
      },
    );
    register(
      'get_motion_library',
      'Get motion library',
      'List reusable semantic motion clips available to the active project.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => ({
        ok: true,
        revision: projectRef.current.revision,
        motionClips: projectRef.current.motionClips,
      }),
      true,
    );
    register(
      'preview_motion_clip',
      'Preview motion clip',
      'Evaluate a motion clip at a time without mutating the project.',
      {
        type: 'object',
        required: ['clipId'],
        properties: {
          clipId: { type: 'string' },
          timeMs: { type: 'number', minimum: 0 },
        },
        additionalProperties: false,
      },
      (input) => {
        const current = projectRef.current;
        const clip = current.motionClips.find(
          (item) => item.id === input.clipId,
        );
        if (!clip) return { ok: false, code: 'NOT_FOUND' };
        const timeMs = typeof input.timeMs === 'number' ? input.timeMs : 0;
        return {
          ok: true,
          revision: current.revision,
          clip,
          timeMs,
          evaluation: evaluateMotionClip(clip, timeMs),
        };
      },
      true,
    );
    register(
      'set_motion_clip',
      'Set motion clip',
      'Add or replace a reusable semantic motion clip in the project motion library.',
      {
        type: 'object',
        required: ['id', 'label', 'kind', 'durationMs', 'transforms'],
        properties: {
          id: { type: 'string', minLength: 1 },
          label: { type: 'string', minLength: 1 },
          kind: { type: 'string' },
          durationMs: { type: 'number', minimum: 100, maximum: 10000 },
          loop: { type: 'boolean' },
          easing: { type: 'string', enum: ['hold', 'linear', 'ease-in-out'] },
          transforms: { type: 'array', minItems: 1, maxItems: 120 },
          description: { type: 'string' },
        },
        additionalProperties: false,
      },
      (input) => {
        const current = projectRef.current;
        const id = typeof input.id === 'string' ? input.id.trim() : '';
        const label = typeof input.label === 'string' ? input.label.trim() : '';
        const kind = typeof input.kind === 'string' ? input.kind : '';
        const durationMs = Number(input.durationMs);
        const rawTransforms = Array.isArray(input.transforms)
          ? input.transforms
          : [];
        if (
          !id ||
          !label ||
          !isMotionClipKind(kind) ||
          !Number.isFinite(durationMs) ||
          rawTransforms.length === 0
        )
          return { ok: false, code: 'INVALID_INPUT' };
        const clip: MotionClip = {
          id,
          label,
          kind,
          durationMs: Math.round(durationMs),
          loop: input.loop === true,
          easing:
            input.easing === 'hold' || input.easing === 'linear'
              ? input.easing
              : 'ease-in-out',
          description:
            typeof input.description === 'string'
              ? input.description.trim()
              : 'Agent-authored motion clip.',
          transforms: rawTransforms
            .filter(
              (frame) =>
                frame &&
                typeof frame === 'object' &&
                Number.isFinite(Number((frame as { time?: unknown }).time)),
            )
            .map((frame) => ({
              time: clamp(
                Math.round(Number((frame as { time: unknown }).time)),
                0,
                Math.round(durationMs),
              ),
              variantId:
                typeof (frame as { variantId?: unknown }).variantId === 'string'
                  ? (frame as { variantId: string }).variantId
                  : undefined,
              transforms: Array.isArray(
                (frame as { transforms?: unknown }).transforms,
              )
                ? (frame as { transforms: unknown[] }).transforms
                    .filter((value) => value && typeof value === 'object')
                    .map((value) => {
                      const item = value as Partial<BoneTransform>;
                      return {
                        boneId: String(item.boneId ?? ''),
                        rotation: Number(item.rotation ?? 0),
                        x: Number(item.x ?? 0),
                        y: Number(item.y ?? 0),
                        scale: Number(item.scale ?? 1),
                      };
                    })
                : [],
            })),
        };
        if (
          !clip.transforms.length ||
          clip.transforms.length > 120 ||
          clip.transforms.some((frame) =>
            frame.transforms.some(
              (item) =>
                !item.boneId ||
                !Number.isFinite(item.rotation) ||
                !Number.isFinite(item.x) ||
                !Number.isFinite(item.y) ||
                !Number.isFinite(item.scale) ||
                item.scale <= 0,
            ),
          )
        )
          return { ok: false, code: 'INVALID_MOTION_CLIP' };
        const knownBoneIds = new Set(
          current.skeletons.flatMap((skeleton) =>
            skeleton.bones.map((bone) => bone.id),
          ),
        );
        if (
          clip.transforms.some((frame) =>
            frame.transforms.some((item) => !knownBoneIds.has(item.boneId)),
          )
        )
          return { ok: false, code: 'UNKNOWN_MOTION_BONE' };
        commitRef.current(
          (next) => {
            const existing = next.motionClips.findIndex(
              (item) => item.id === id,
            );
            if (existing >= 0) next.motionClips[existing] = clip;
            else next.motionClips.push(clip);
          },
          `Set motion clip ${label}`,
          true,
        );
        return { ok: true, revision: current.revision + 1, clip };
      },
    );
    register(
      'apply_motion_clip',
      'Apply motion clip',
      'Apply a reusable motion clip to an approved character skeleton as ordinary revisioned bone keyframes.',
      {
        type: 'object',
        required: ['characterId', 'clipId'],
        properties: {
          characterId: { type: 'string' },
          clipId: { type: 'string' },
          startTimeMs: { type: 'number', minimum: 0 },
        },
        additionalProperties: false,
      },
      (input) => {
        const current = projectRef.current;
        const character = current.characters.find(
          (item) => item.id === input.characterId,
        );
        const clip = current.motionClips.find(
          (item) => item.id === input.clipId,
        );
        const skeleton = current.skeletons.find(
          (item) =>
            item.assetId === character?.assetId &&
            item.reviewStatus === 'approved',
        );
        if (!character || !clip || !skeleton)
          return { ok: false, code: 'NOT_FOUND' };
        if (skeleton.reviewStatus !== 'approved')
          return { ok: false, code: 'SKELETON_NOT_APPROVED' };
        const startTimeMs =
          typeof input.startTimeMs === 'number'
            ? Math.max(0, input.startTimeMs)
            : current.currentTime;
        const incompatibleVariant = clip.transforms
          .map((frame) => frame.variantId)
          .filter((variantId): variantId is string => Boolean(variantId))
          .find(
            (variantId) =>
              variantCompatibilityIssues(current, character, variantId).length >
              0,
          );
        if (incompatibleVariant)
          return {
            ok: false,
            code: 'INVALID_VARIANT_TOPOLOGY',
            variantId: incompatibleVariant,
          };
        const applied: number[] = [];
        commitRef.current(
          (next) => {
            clip.transforms.forEach((frame) => {
              const time = startTimeMs + frame.time;
              if (time <= next.duration) {
                applied.push(
                  upsertBoneKeyframeInProject(
                    next,
                    skeleton.id,
                    time,
                    frame.transforms,
                  ),
                );
                if (frame.variantId)
                  upsertCharacterKeyframe(next, character.id, time, {
                    variantId: frame.variantId,
                  });
              }
            });
          },
          `Apply ${clip.label} to ${character.name}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          characterId: character.id,
          skeletonId: skeleton.id,
          clipId: clip.id,
          appliedTimes: applied,
        };
      },
    );
    register(
      'analyze_scene_motion',
      'Analyze scene motion',
      'Return proposed motion clips and timing for the active scene based on movement, turns, captions, and beats.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => {
        const current = projectRef.current;
        const proposals = current.characters.flatMap((character) => {
          const frames = current.keyframes
            .filter((frame) => frame.characterId === character.id)
            .sort((a, b) => a.time - b.time);
          const moved = frames.find(
            (frame, index) =>
              index > 0 && Math.abs(frame.x - frames[index - 1].x) > 3,
          );
          const turned = frames.find(
            (frame, index) =>
              index > 0 &&
              Math.abs(frame.rotation - frames[index - 1].rotation) > 8,
          );
          const output: Array<Record<string, unknown>> = [];
          if (moved)
            output.push({
              characterId: character.id,
              clipId: 'motion-walk-in',
              startTimeMs: Math.max(0, moved.time - 1550),
              reason: 'Position changes indicate an entrance or exit.',
            });
          if (turned)
            output.push({
              characterId: character.id,
              clipId: 'motion-turn-three-quarter',
              startTimeMs: turned.time,
              reason: 'Rotation changes indicate a view turn.',
            });
          output.push({
            characterId: character.id,
            clipId: 'motion-embarrassed-reaction',
            startTimeMs: Math.min(current.duration - 700, 9800),
            reason: 'The coupon beat needs a readable reaction.',
          });
          return output;
        });
        return {
          ok: true,
          revision: current.revision,
          sceneId: current.activeSceneId,
          proposals,
          nextStep:
            'Review proposals, then apply_motion_clip for approved character skeletons.',
        };
      },
      true,
    );
    register(
      'get_bone_keyframes',
      'Get bone keyframes',
      'Inspect bone-level keyframes for the active scene and one skeleton.',
      {
        type: 'object',
        required: ['skeletonId'],
        additionalProperties: false,
        properties: { skeletonId: { type: 'string' } },
      },
      (input) => {
        const current = projectRef.current;
        const skeletonId =
          typeof input.skeletonId === 'string' ? input.skeletonId : '';
        return {
          ok: true,
          revision: current.revision,
          skeletonId,
          boneKeyframes: current.boneKeyframes.filter(
            (frame) =>
              frame.sceneId === current.activeSceneId &&
              frame.skeletonId === skeletonId,
          ),
        };
      },
      true,
    );
    register(
      'validate_skeleton',
      'Validate skeleton',
      'Return actionable skeleton issues without changing the project.',
      {
        type: 'object',
        required: ['skeletonId'],
        additionalProperties: false,
        properties: { skeletonId: { type: 'string' } },
      },
      async (input) => {
        const current = projectRef.current;
        const skeletonId =
          typeof input.skeletonId === 'string' ? input.skeletonId : '';
        const skeleton = current.skeletons.find(
          (item) => item.id === skeletonId,
        );
        if (!skeleton) return { ok: false, code: 'NOT_FOUND' };
        const asset = current.assets.find(
          (candidate) => candidate.id === skeleton.assetId,
        );
        const issues: string[] = skeletonModelIssues(skeleton, asset);
        const preview = asset?.dataUrl
          ? await inspectRenderedRigPreview(copy(asset), copy(skeleton))
          : undefined;
        if (preview && !preview.passed) issues.push(...preview.blockedReasons);
        return {
          ok: true,
          revision: current.revision,
          skeletonId,
          valid: issues.length === 0,
          issues,
          reviewStatus: skeleton.reviewStatus,
          binding: skeleton.binding,
          preview,
        };
      },
      true,
    );
    register(
      'set_selection',
      'Set selection',
      'Select an existing character for focused human and agent edits.',
      {
        type: 'object',
        required: ['characterId'],
        additionalProperties: false,
        properties: { characterId: { type: 'string' } },
      },
      (input) => {
        const current = projectRef.current;
        if (
          typeof input.characterId !== 'string' ||
          !current.characters.some((item) => item.id === input.characterId)
        )
          return { ok: false, code: 'NOT_FOUND' };
        commitRef.current(
          (next) => {
            next.selectedId = input.characterId as string;
          },
          `Select ${input.characterId}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          selectedId: input.characterId,
        };
      },
    );
    register(
      'set_track_lock',
      'Set track lock',
      'Lock or unlock one character track without affecting camera, captions, or audio tracks.',
      {
        type: 'object',
        required: ['characterId', 'locked'],
        additionalProperties: false,
        properties: {
          characterId: { type: 'string' },
          locked: { type: 'boolean' },
        },
      },
      (input) => {
        const current = projectRef.current;
        const characterId =
          typeof input.characterId === 'string' ? input.characterId : '';
        if (
          !current.characters.some((character) => character.id === characterId)
        )
          return { ok: false, code: 'NOT_FOUND' };
        if (typeof input.locked !== 'boolean')
          return { ok: false, code: 'INVALID_INPUT' };
        commitRef.current(
          (next) => {
            next.lockedTrackIds = next.lockedTrackIds.filter(
              (id) => id !== characterId,
            );
            if (input.locked) next.lockedTrackIds.push(characterId);
          },
          `${input.locked ? 'Lock' : 'Unlock'} ${characterId} track`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          characterId,
          locked: input.locked,
          lockedTrackIds: input.locked
            ? [
                ...current.lockedTrackIds.filter((id) => id !== characterId),
                characterId,
              ]
            : current.lockedTrackIds.filter((id) => id !== characterId),
        };
      },
    );
    register(
      'split_scene',
      'Split scene at playhead',
      'Replace the active scene with two independent editable scenes split at the playhead or an explicit timestamp.',
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          timeMs: { type: 'number', minimum: 0 },
        },
      },
      (input) => {
        const current = projectRef.current;
        const splitTime =
          input.timeMs === undefined ? current.currentTime : input.timeMs;
        if (
          typeof splitTime !== 'number' ||
          !Number.isFinite(splitTime) ||
          splitTime <= 0 ||
          splitTime >= current.duration
        )
          return { ok: false, code: 'INVALID_TIMING' };
        const index = current.scenes.findIndex(
          (scene) => scene.id === current.activeSceneId,
        );
        if (index < 0) return { ok: false, code: 'NOT_FOUND' };
        const beforeId = nextSceneId(current.scenes);
        const afterId = nextSceneId([
          ...current.scenes,
          { id: beforeId } as SceneMeta,
        ]);
        const [before, after] = makeSplitScenes(
          current,
          splitTime,
          beforeId,
          afterId,
        );
        commitRef.current(
          (next) => {
            next.scenes.splice(index, 1, before, after);
            loadSceneContent(next, after.id);
          },
          `Split ${current.activeSceneId} at ${Math.round(splitTime)}ms`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          sourceSceneId: current.activeSceneId,
          splitTimeMs: splitTime,
          scenes: [before, after],
          activeSceneId: after.id,
          changedEntityIds: [before.id, after.id],
        };
      },
    );
    register(
      'add_scene',
      'Add scene',
      'Append an editable scene with an independent copy of the current structured content.',
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
        },
      },
      (input) => {
        const current = projectRef.current;
        const id = nextSceneId(current.scenes);
        const sceneNumber = current.scenes.length + 1;
        const scene = {
          id,
          title:
            typeof input.title === 'string' && input.title.trim()
              ? input.title.trim()
              : `Scene ${String(sceneNumber).padStart(2, '0')}`,
          description:
            typeof input.description === 'string' && input.description.trim()
              ? input.description.trim()
              : 'New scene ready for blocking.',
          duration: current.duration,
          characters: copy(current.characters),
          keyframes: copy(current.keyframes),
          propKeyframes: copy(current.propKeyframes),
          cameraKeyframes: copy(current.cameraKeyframes),
          captions: copy(current.captions),
          audioCues: copy(current.audioCues),
          boneKeyframes: copy(current.boneKeyframes),
          lockedTrackIds: copy(current.lockedTrackIds),
        } satisfies SceneMeta;
        commitRef.current(
          (next) => {
            next.scenes.push(scene);
            loadSceneContent(next, scene.id);
          },
          `Add ${scene.title}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          scene,
          changedEntityIds: [scene.id],
          warnings: [],
        };
      },
    );
    register(
      'rename_scene',
      'Rename scene',
      'Update a scene title and description without changing its animation content.',
      {
        type: 'object',
        required: ['sceneId', 'title'],
        additionalProperties: false,
        properties: {
          sceneId: { type: 'string' },
          title: { type: 'string', minLength: 1 },
          description: { type: 'string' },
        },
      },
      (input) => {
        const current = projectRef.current;
        const title = typeof input.title === 'string' ? input.title.trim() : '';
        const sceneId = typeof input.sceneId === 'string' ? input.sceneId : '';
        const target = current.scenes.find((scene) => scene.id === sceneId);
        if (!target || !title) return { ok: false, code: 'INVALID_INPUT' };
        const description =
          typeof input.description === 'string'
            ? input.description.trim()
            : target.description;
        commitRef.current(
          (next) => {
            const scene = next.scenes.find(
              (candidate) => candidate.id === sceneId,
            );
            if (scene) {
              scene.title = title;
              scene.description = description;
            }
          },
          `Rename ${sceneId}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          scene: { ...target, title, description },
        };
      },
    );
    register(
      'duplicate_scene',
      'Duplicate scene',
      'Create an independent editable copy of a scene and make the copy active.',
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          sceneId: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
        },
      },
      (input) => {
        const current = projectRef.current;
        const sourceId =
          typeof input.sceneId === 'string'
            ? input.sceneId
            : current.activeSceneId;
        const source = current.scenes.find((scene) => scene.id === sourceId);
        if (!source) return { ok: false, code: 'NOT_FOUND' };
        const scene = {
          ...copy(source),
          id: nextSceneId(current.scenes),
          title:
            typeof input.title === 'string' && input.title.trim()
              ? input.title.trim()
              : `${source.title} copy`,
          description:
            typeof input.description === 'string'
              ? input.description.trim()
              : source.description,
        } satisfies SceneMeta;
        commitRef.current(
          (next) => {
            next.scenes.push(scene);
            loadSceneContent(next, scene.id);
          },
          `Duplicate ${source.title}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          scene,
          changedEntityIds: [scene.id],
        };
      },
    );
    register(
      'delete_scene',
      'Delete scene',
      'Remove a scene when another scene remains, then activate a neighboring scene if needed.',
      {
        type: 'object',
        required: ['sceneId'],
        additionalProperties: false,
        properties: { sceneId: { type: 'string' } },
      },
      (input) => {
        const current = projectRef.current;
        const sceneId = typeof input.sceneId === 'string' ? input.sceneId : '';
        const index = current.scenes.findIndex((scene) => scene.id === sceneId);
        if (index < 0) return { ok: false, code: 'NOT_FOUND' };
        if (current.scenes.length === 1)
          return { ok: false, code: 'LAST_SCENE' };
        const nextActiveId =
          current.activeSceneId === sceneId
            ? (current.scenes[index + 1]?.id ?? current.scenes[index - 1]?.id)
            : current.activeSceneId;
        commitRef.current(
          (next) => {
            next.scenes.splice(index, 1);
            if (nextActiveId) loadSceneContent(next, nextActiveId);
          },
          `Delete ${sceneId}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          deletedSceneId: sceneId,
          activeSceneId: nextActiveId,
        };
      },
    );
    register(
      'move_scene',
      'Move scene',
      'Reorder one scene up or down without changing its editable content or active selection.',
      {
        type: 'object',
        required: ['sceneId', 'direction'],
        additionalProperties: false,
        properties: {
          sceneId: { type: 'string' },
          direction: { type: 'string', enum: ['up', 'down'] },
        },
      },
      (input) => {
        const current = projectRef.current;
        const sceneId = typeof input.sceneId === 'string' ? input.sceneId : '';
        const direction = input.direction === 'up' ? -1 : 1;
        const index = current.scenes.findIndex((scene) => scene.id === sceneId);
        const targetIndex = index + direction;
        if (index < 0) return { ok: false, code: 'NOT_FOUND' };
        if (input.direction !== 'up' && input.direction !== 'down') {
          return { ok: false, code: 'INVALID_INPUT' };
        }
        if (targetIndex < 0 || targetIndex >= current.scenes.length) {
          return { ok: false, code: 'BOUNDARY' };
        }
        commitRef.current(
          (next) => {
            const from = next.scenes.findIndex((scene) => scene.id === sceneId);
            const [scene] = next.scenes.splice(from, 1);
            next.scenes.splice(from + direction, 0, scene);
          },
          `Move ${sceneId} ${input.direction}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          sceneId,
          fromIndex: index,
          toIndex: targetIndex,
          activeSceneId: current.activeSceneId,
        };
      },
    );
    register(
      'apply_template',
      'Apply starter template',
      'Create a new editable scene from a starter recipe without overwriting existing scenes.',
      {
        type: 'object',
        required: ['templateId'],
        additionalProperties: false,
        properties: {
          templateId: {
            type: 'string',
            enum: [
              'first-meeting',
              'coffee-spill',
              'wrong-booth',
              'the-apology',
            ],
          },
        },
      },
      (input) => {
        const current = projectRef.current;
        if (
          input.templateId !== 'first-meeting' &&
          input.templateId !== 'coffee-spill' &&
          input.templateId !== 'wrong-booth' &&
          input.templateId !== 'the-apology'
        )
          return { ok: false, code: 'INVALID_INPUT' };
        const scene = makeTemplateScene(
          input.templateId,
          nextSceneId(current.scenes),
        );
        commitRef.current(
          (next) => {
            next.scenes.push(scene);
            loadSceneContent(next, scene.id);
          },
          `Apply ${scene.title}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          scene,
          changedEntityIds: [scene.id],
        };
      },
    );
    register(
      'promote_storyboard_beat',
      'Promote storyboard beat',
      'Create a new editable scene from one storyboard beat while preserving the source scene.',
      {
        type: 'object',
        required: ['beatId'],
        additionalProperties: false,
        properties: { beatId: { type: 'string' } },
      },
      (input) => {
        const current = projectRef.current;
        const beat = current.storyboardBeats.find(
          (item) => item.id === input.beatId,
        );
        if (!beat) return { ok: false, code: 'NOT_FOUND' };
        if (beat.startMs >= current.duration || beat.endMs <= beat.startMs) {
          return { ok: false, code: 'INVALID_TIMING' };
        }
        const scene = makeBeatScene(current, beat, nextSceneId(current.scenes));
        commitRef.current(
          (next) => {
            next.scenes.push(scene);
            loadSceneContent(next, scene.id);
          },
          `Promote ${beat.title}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          scene,
          sourceSceneId: current.activeSceneId,
          changedEntityIds: [scene.id],
        };
      },
    );
    register(
      'add_audio_cue',
      'Add audio cue',
      'Add a bounded non-voice music, footstep, or reaction sting cue to the active scene.',
      {
        type: 'object',
        required: ['kind', 'label'],
        additionalProperties: false,
        properties: {
          kind: { type: 'string', enum: ['music', 'footstep', 'stinger'] },
          label: { type: 'string', minLength: 1 },
          startMs: { type: 'number', minimum: 0 },
          endMs: { type: 'number', minimum: 0 },
          volume: { type: 'number', minimum: 0, maximum: 1 },
          assetId: { type: 'string' },
          loop: { type: 'boolean' },
        },
      },
      (input) => {
        const current = projectRef.current;
        const label = typeof input.label === 'string' ? input.label.trim() : '';
        if (!isAudioCueKind(input.kind) || !label)
          return { ok: false, code: 'INVALID_INPUT' };
        const start =
          typeof input.startMs === 'number'
            ? input.startMs
            : current.currentTime;
        const defaultLength =
          input.kind === 'music'
            ? current.duration
            : input.kind === 'footstep'
              ? 120
              : 350;
        const end =
          typeof input.endMs === 'number' ? input.endMs : start + defaultLength;
        const volume = typeof input.volume === 'number' ? input.volume : 0.15;
        const requestedAssetId =
          typeof input.assetId === 'string'
            ? input.assetId
            : current.assets.find(
                (asset) =>
                  asset.kind === 'audio' &&
                  asset.dataUrl &&
                  (input.kind === 'music'
                    ? asset.loopable
                    : asset.label.toLowerCase().includes('pop')),
              )?.id;
        if (requestedAssetId) {
          const audioAsset = current.assets.find(
            (asset) => asset.id === requestedAssetId,
          );
          if (!audioAsset || audioAsset.kind !== 'audio')
            return { ok: false, code: 'INVALID_AUDIO_ASSET' };
        }
        if (
          !Number.isFinite(start) ||
          !Number.isFinite(end) ||
          !Number.isFinite(volume) ||
          start < 0 ||
          end <= start ||
          end > current.duration ||
          volume < 0 ||
          volume > 1
        )
          return { ok: false, code: 'INVALID_TIMING' };
        const cue: AudioCue = {
          id: nextAudioCueId(current.audioCues, input.kind),
          kind: input.kind,
          label,
          start,
          end,
          volume,
          ...(requestedAssetId ? { assetId: requestedAssetId } : {}),
          ...(input.loop === true || input.kind === 'music'
            ? { loop: input.loop !== false }
            : {}),
        };
        commitRef.current(
          (next) => {
            next.audioCues.push(cue);
          },
          `Add audio ${label}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          cue,
          changedEntityIds: [cue.id],
        };
      },
    );
    register(
      'add_audio_asset',
      'Add audio asset',
      'Add a provenance-first audio library entry. Use import_audio_asset when the agent can transfer audio bytes.',
      {
        type: 'object',
        required: ['label'],
        additionalProperties: false,
        properties: {
          label: { type: 'string', minLength: 1, maxLength: 100 },
          sourceUrl: { type: 'string', maxLength: 500 },
          author: { type: 'string', maxLength: 120 },
          license: { type: 'string', maxLength: 80 },
          licenseUrl: { type: 'string', maxLength: 500 },
          durationMs: { type: 'number', minimum: 1 },
          loopable: { type: 'boolean' },
          mimeType: { type: 'string', maxLength: 80 },
        },
      },
      (input) => {
        const current = projectRef.current;
        const label = typeof input.label === 'string' ? input.label.trim() : '';
        if (!label) return { ok: false, code: 'INVALID_INPUT' };
        const asset: Asset = {
          id: nextAssetId(current.assets, 'audio'),
          kind: 'audio',
          label,
          source: 'imported',
          mimeType:
            typeof input.mimeType === 'string' ? input.mimeType : 'audio/ogg',
          mediaDurationMs:
            typeof input.durationMs === 'number' ? input.durationMs : undefined,
          loopable: input.loopable === true,
          provenance: {
            sourceUrl:
              typeof input.sourceUrl === 'string' ? input.sourceUrl : undefined,
            author: typeof input.author === 'string' ? input.author : undefined,
            license:
              typeof input.license === 'string' ? input.license : undefined,
            licenseUrl:
              typeof input.licenseUrl === 'string'
                ? input.licenseUrl
                : undefined,
          },
          style: defaultAssetStyle('audio'),
        };
        commitRef.current(
          (next) => next.assets.push(asset),
          `Add audio asset ${label}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          asset: { ...asset, dataUrl: undefined, hasPayload: false },
        };
      },
    );
    register(
      'import_audio_asset',
      'Import audio asset',
      'Import bounded audio bytes as a playable audio asset while preserving source and license metadata.',
      {
        type: 'object',
        required: ['label', 'dataUrl'],
        additionalProperties: false,
        properties: {
          label: { type: 'string', minLength: 1, maxLength: 100 },
          dataUrl: { type: 'string', minLength: 24, maxLength: 5600000 },
          mimeType: { type: 'string', maxLength: 80 },
          durationMs: { type: 'number', minimum: 1 },
          loopable: { type: 'boolean' },
          sourceUrl: { type: 'string', maxLength: 500 },
          author: { type: 'string', maxLength: 120 },
          license: { type: 'string', maxLength: 80 },
          licenseUrl: { type: 'string', maxLength: 500 },
        },
      },
      (input) => {
        const current = projectRef.current;
        const label = typeof input.label === 'string' ? input.label.trim() : '';
        const dataUrl = typeof input.dataUrl === 'string' ? input.dataUrl : '';
        if (!label || !/^data:audio\/[a-z0-9.+-]+;base64,/i.test(dataUrl))
          return { ok: false, code: 'INVALID_AUDIO_PAYLOAD' };
        const asset: Asset = {
          id: nextAssetId(current.assets, 'audio'),
          kind: 'audio',
          label,
          source: 'imported',
          dataUrl,
          mimeType:
            typeof input.mimeType === 'string' ? input.mimeType : 'audio/ogg',
          mediaDurationMs:
            typeof input.durationMs === 'number' ? input.durationMs : undefined,
          loopable: input.loopable === true,
          provenance: {
            sourceUrl:
              typeof input.sourceUrl === 'string' ? input.sourceUrl : undefined,
            author: typeof input.author === 'string' ? input.author : undefined,
            license:
              typeof input.license === 'string' ? input.license : undefined,
            licenseUrl:
              typeof input.licenseUrl === 'string'
                ? input.licenseUrl
                : undefined,
          },
          style: defaultAssetStyle('audio'),
        };
        commitRef.current(
          (next) => next.assets.push(asset),
          `Import audio asset ${label}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          asset: { ...asset, dataUrl: undefined, hasPayload: true },
        };
      },
    );
    register(
      'set_audio_cue_asset',
      'Set audio cue asset',
      'Route one cue through a playable audio asset from the library.',
      {
        type: 'object',
        required: ['cueId', 'assetId'],
        additionalProperties: false,
        properties: {
          cueId: { type: 'string' },
          assetId: { type: 'string' },
          loop: { type: 'boolean' },
        },
      },
      (input) => {
        const current = projectRef.current;
        const cueId = typeof input.cueId === 'string' ? input.cueId : '';
        const assetId = typeof input.assetId === 'string' ? input.assetId : '';
        const cue = current.audioCues.find((item) => item.id === cueId);
        const asset = current.assets.find((item) => item.id === assetId);
        if (!cue || !asset) return { ok: false, code: 'NOT_FOUND' };
        if (asset.kind !== 'audio' || !asset.dataUrl)
          return { ok: false, code: 'AUDIO_PAYLOAD_MISSING' };
        const updated = {
          ...cue,
          assetId,
          ...(input.loop !== undefined ? { loop: input.loop === true } : {}),
        };
        commitRef.current(
          (next) => {
            const target = next.audioCues.find((item) => item.id === cueId);
            if (target) Object.assign(target, updated);
          },
          `Set audio asset for ${cue.label}`,
          true,
        );
        return { ok: true, revision: current.revision + 1, cue: updated };
      },
    );
    register(
      'remove_audio_cue',
      'Remove audio cue',
      'Remove one non-voice audio cue while preserving captions and animation.',
      {
        type: 'object',
        required: ['cueId'],
        additionalProperties: false,
        properties: { cueId: { type: 'string' } },
      },
      (input) => {
        const current = projectRef.current;
        const cueId = typeof input.cueId === 'string' ? input.cueId : '';
        const cue = current.audioCues.find((item) => item.id === cueId);
        if (!cue) return { ok: false, code: 'NOT_FOUND' };
        commitRef.current(
          (next) => {
            next.audioCues = next.audioCues.filter((item) => item.id !== cueId);
          },
          `Remove audio ${cue.label}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          removedCueId: cueId,
        };
      },
    );
    register(
      'update_audio_cue',
      'Update audio cue',
      'Edit a bounded non-voice cue label, timing, or volume without changing animation tracks.',
      {
        type: 'object',
        required: ['cueId'],
        additionalProperties: false,
        properties: {
          cueId: { type: 'string' },
          label: { type: 'string', minLength: 1 },
          startMs: { type: 'number', minimum: 0 },
          endMs: { type: 'number', minimum: 0 },
          volume: { type: 'number', minimum: 0, maximum: 1 },
        },
      },
      (input) => {
        const current = projectRef.current;
        const cueId = typeof input.cueId === 'string' ? input.cueId : '';
        const cue = current.audioCues.find((item) => item.id === cueId);
        if (!cue) return { ok: false, code: 'NOT_FOUND' };
        const label =
          input.label === undefined
            ? cue.label
            : typeof input.label === 'string'
              ? input.label.trim()
              : '';
        const start = input.startMs === undefined ? cue.start : input.startMs;
        const end = input.endMs === undefined ? cue.end : input.endMs;
        const volume = input.volume === undefined ? cue.volume : input.volume;
        if (
          !label ||
          typeof start !== 'number' ||
          typeof end !== 'number' ||
          typeof volume !== 'number' ||
          !Number.isFinite(start) ||
          !Number.isFinite(end) ||
          !Number.isFinite(volume) ||
          start < 0 ||
          end <= start ||
          end > current.duration ||
          volume < 0 ||
          volume > 1
        )
          return { ok: false, code: 'INVALID_TIMING' };
        const updated = { ...cue, label, start, end, volume };
        commitRef.current(
          (next) => {
            const item = next.audioCues.find(
              (candidate) => candidate.id === cueId,
            );
            if (item) Object.assign(item, updated);
          },
          `Update audio ${label}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          cue: updated,
          changedPaths: [`audioCues.${cueId}`],
        };
      },
    );
    register(
      'set_pose',
      'Set character pose',
      'Set a character pose and transform at the current playhead as one undoable keyframe command.',
      {
        type: 'object',
        required: ['characterId'],
        additionalProperties: false,
        properties: {
          characterId: { type: 'string' },
          x: { type: 'number' },
          y: { type: 'number' },
          rotation: { type: 'number' },
          pose: {
            type: 'string',
            enum: ['idle', 'nervous', 'wave', 'lean-in', 'point', 'shrug'],
          },
          variantId: { type: 'string' },
        },
      },
      (input) => {
        const current = projectRef.current;
        if (typeof input.characterId !== 'string')
          return { ok: false, code: 'INVALID_INPUT' };
        const character = current.characters.find(
          (candidate) => candidate.id === input.characterId,
        );
        if (!character) return { ok: false, code: 'NOT_FOUND' };
        if (isTrackLocked(current, input.characterId))
          return { ok: false, code: 'TRACK_LOCKED' };
        if (
          (input.x !== undefined &&
            (typeof input.x !== 'number' || !Number.isFinite(input.x))) ||
          (input.y !== undefined &&
            (typeof input.y !== 'number' || !Number.isFinite(input.y))) ||
          (input.rotation !== undefined &&
            (typeof input.rotation !== 'number' ||
              !Number.isFinite(input.rotation))) ||
          (input.pose !== undefined && !isPose(input.pose)) ||
          (input.variantId !== undefined && typeof input.variantId !== 'string')
        )
          return { ok: false, code: 'INVALID_INPUT' };
        if (
          typeof input.variantId === 'string' &&
          variantCompatibilityIssues(current, character, input.variantId).length
        )
          return { ok: false, code: 'INVALID_VARIANT' };
        const frameTime = current.currentTime;
        commitRef.current(
          (next) => {
            upsertCharacterKeyframe(
              next,
              input.characterId as string,
              frameTime,
              {
                x: typeof input.x === 'number' ? input.x : undefined,
                y: typeof input.y === 'number' ? input.y : undefined,
                rotation:
                  typeof input.rotation === 'number'
                    ? input.rotation
                    : undefined,
                pose: isPose(input.pose) ? input.pose : undefined,
                variantId:
                  typeof input.variantId === 'string'
                    ? input.variantId
                    : undefined,
              },
            );
          },
          `Set ${input.characterId} pose`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          changedEntityIds: [input.characterId],
          changedPaths: [`keyframes.${input.characterId}.${frameTime}`],
          keyframeTimeMs: frameTime,
          warnings: [],
        };
      },
    );
    register(
      'set_keyframe',
      'Set keyframe',
      'Create or update a character keyframe at an explicit time without changing other tracks.',
      {
        type: 'object',
        required: ['characterId', 'timeMs'],
        additionalProperties: false,
        properties: {
          characterId: { type: 'string' },
          timeMs: { type: 'number', minimum: 0 },
          x: { type: 'number', minimum: 0, maximum: 100 },
          y: { type: 'number', minimum: 0, maximum: 100 },
          rotation: { type: 'number', minimum: -180, maximum: 180 },
          pose: {
            type: 'string',
            enum: ['idle', 'nervous', 'wave', 'lean-in', 'point', 'shrug'],
          },
          variantId: { type: 'string' },
        },
      },
      (input) => {
        const current = projectRef.current;
        const character = current.characters.find(
          (candidate) => candidate.id === input.characterId,
        );
        if (
          typeof input.characterId !== 'string' ||
          !character ||
          typeof input.timeMs !== 'number' ||
          !Number.isFinite(input.timeMs) ||
          input.timeMs < 0 ||
          input.timeMs > current.duration
        )
          return { ok: false, code: 'INVALID_INPUT' };
        if (
          typeof input.variantId === 'string' &&
          variantCompatibilityIssues(current, character, input.variantId).length
        )
          return { ok: false, code: 'INVALID_VARIANT' };
        if (isTrackLocked(current, input.characterId))
          return { ok: false, code: 'TRACK_LOCKED' };
        if (
          (input.x !== undefined &&
            (typeof input.x !== 'number' || input.x < 0 || input.x > 100)) ||
          (input.y !== undefined &&
            (typeof input.y !== 'number' || input.y < 0 || input.y > 100)) ||
          (input.rotation !== undefined &&
            (typeof input.rotation !== 'number' ||
              input.rotation < -180 ||
              input.rotation > 180)) ||
          (input.pose !== undefined && !isPose(input.pose)) ||
          (input.variantId !== undefined && typeof input.variantId !== 'string')
        )
          return { ok: false, code: 'INVALID_INPUT' };
        let keyframe: Keyframe | null = null;
        commitRef.current(
          (next) => {
            keyframe = upsertCharacterKeyframe(
              next,
              input.characterId as string,
              input.timeMs as number,
              {
                x: typeof input.x === 'number' ? input.x : undefined,
                y: typeof input.y === 'number' ? input.y : undefined,
                rotation:
                  typeof input.rotation === 'number'
                    ? input.rotation
                    : undefined,
                pose: isPose(input.pose) ? input.pose : undefined,
                variantId:
                  typeof input.variantId === 'string'
                    ? input.variantId
                    : undefined,
              },
            );
          },
          `Keyframe ${input.characterId}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          keyframe,
          changedEntityIds: [input.characterId],
        };
      },
    );
    register(
      'set_character_variant',
      'Set character asset variant',
      'Bind an approved generated view, pose, or expression variant at the current playhead without changing the character rig or base asset.',
      {
        type: 'object',
        required: ['characterId', 'variantId'],
        additionalProperties: false,
        properties: {
          characterId: { type: 'string' },
          variantId: { type: 'string' },
        },
      },
      (input) => {
        const current = projectRef.current;
        const characterId =
          typeof input.characterId === 'string' ? input.characterId : '';
        const variantId =
          typeof input.variantId === 'string' ? input.variantId : '';
        const character = current.characters.find(
          (item) => item.id === characterId,
        );
        const variant = current.assets.find((asset) => asset.id === variantId);
        if (!character || !variant) return { ok: false, code: 'NOT_FOUND' };
        const variantIssues = variantCompatibilityIssues(
          current,
          character,
          variantId,
        );
        if (variantIssues.length)
          return { ok: false, code: 'INVALID_VARIANT', issues: variantIssues };
        if (isTrackLocked(current, characterId))
          return { ok: false, code: 'TRACK_LOCKED' };
        const frameTime = current.currentTime;
        let keyframe: Keyframe | null = null;
        commitRef.current(
          (next) => {
            keyframe = upsertCharacterKeyframe(next, characterId, frameTime, {
              variantId,
            });
          },
          `Set ${variant.label}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          characterId,
          variantId,
          keyframe,
        };
      },
    );
    register(
      'set_prop_keyframe',
      'Set prop keyframe',
      'Create or update an imported prop transform keyframe at an explicit time.',
      {
        type: 'object',
        required: ['assetId', 'timeMs'],
        additionalProperties: false,
        properties: {
          assetId: { type: 'string' },
          timeMs: { type: 'number', minimum: 0 },
          x: { type: 'number', minimum: 0, maximum: 100 },
          y: { type: 'number', minimum: 0, maximum: 100 },
          scale: { type: 'number', minimum: 0.25, maximum: 2.5 },
          rotation: { type: 'number', minimum: -180, maximum: 180 },
        },
      },
      (input) => {
        const current = projectRef.current;
        const assetId = typeof input.assetId === 'string' ? input.assetId : '';
        const asset = current.assets.find((item) => item.id === assetId);
        const timeMs = input.timeMs;
        if (!asset) return { ok: false, code: 'NOT_FOUND' };
        if (asset.kind !== 'prop' || !asset.dataUrl)
          return { ok: false, code: 'INVALID_ASSET' };
        if (
          typeof timeMs !== 'number' ||
          !Number.isFinite(timeMs) ||
          timeMs < 0 ||
          timeMs > current.duration
        )
          return { ok: false, code: 'INVALID_TIMING' };
        const numericKeys = ['x', 'y', 'scale', 'rotation'] as const;
        if (
          numericKeys.some(
            (key) =>
              input[key] !== undefined &&
              (typeof input[key] !== 'number' || !Number.isFinite(input[key])),
          )
        )
          return { ok: false, code: 'INVALID_INPUT' };
        if (
          (typeof input.x === 'number' && (input.x < 0 || input.x > 100)) ||
          (typeof input.y === 'number' && (input.y < 0 || input.y > 100)) ||
          (typeof input.scale === 'number' &&
            (input.scale < 0.25 || input.scale > 2.5)) ||
          (typeof input.rotation === 'number' &&
            (input.rotation < -180 || input.rotation > 180))
        )
          return { ok: false, code: 'OUT_OF_BOUNDS' };
        let keyframe: PropKeyframe | null = null;
        commitRef.current(
          (next) => {
            keyframe = upsertPropKeyframe(next, assetId, timeMs, {
              x: typeof input.x === 'number' ? input.x : undefined,
              y: typeof input.y === 'number' ? input.y : undefined,
              scale: typeof input.scale === 'number' ? input.scale : undefined,
              rotation:
                typeof input.rotation === 'number' ? input.rotation : undefined,
            });
          },
          `Keyframe ${asset.label}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          keyframe,
          changedEntityIds: [assetId],
        };
      },
    );
    register(
      'apply_prop_preset',
      'Apply prop motion preset',
      'Apply a deterministic entrance or nudge motion phrase to an imported prop.',
      {
        type: 'object',
        required: ['assetId', 'preset'],
        additionalProperties: false,
        properties: {
          assetId: { type: 'string' },
          preset: { type: 'string', enum: ['pop-in', 'nudge'] },
        },
      },
      (input) => {
        const current = projectRef.current;
        const assetId = typeof input.assetId === 'string' ? input.assetId : '';
        const asset = current.assets.find((item) => item.id === assetId);
        if (!asset) return { ok: false, code: 'NOT_FOUND' };
        if (asset.kind !== 'prop' || !asset.dataUrl)
          return { ok: false, code: 'INVALID_ASSET' };
        if (input.preset !== 'pop-in' && input.preset !== 'nudge')
          return { ok: false, code: 'INVALID_INPUT' };
        const start = current.currentTime;
        let applied: PropKeyframe[] = [];
        commitRef.current(
          (next) => {
            const base = evaluateProps(next, start).find(
              (item) => item.assetId === assetId,
            );
            if (!base) return;
            const points =
              input.preset === 'pop-in'
                ? [
                    { ...base, time: start, scale: 0.25, rotation: -4 },
                    {
                      ...base,
                      time: Math.min(next.duration, start + 220),
                      scale: base.scale,
                      rotation: 0,
                    },
                  ]
                : [
                    { ...base, time: start, rotation: -5 },
                    {
                      ...base,
                      time: Math.min(next.duration, start + 180),
                      rotation: 5,
                    },
                    {
                      ...base,
                      time: Math.min(next.duration, start + 360),
                      rotation: 0,
                    },
                  ];
            const unique = points.filter(
              (point, index) =>
                points.findIndex(
                  (candidate) => candidate.time === point.time,
                ) === index,
            );
            applied = unique
              .map((point) =>
                upsertPropKeyframe(next, assetId, point.time, point),
              )
              .filter((point): point is PropKeyframe => Boolean(point));
          },
          `Apply ${input.preset} to ${asset.label}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          assetId,
          preset: input.preset,
          keyframes: applied,
          changedEntityIds: [assetId],
        };
      },
    );
    register(
      'set_camera_keyframe',
      'Set camera keyframe',
      'Create or update an explicit camera keyframe without changing character tracks.',
      {
        type: 'object',
        required: ['timeMs'],
        additionalProperties: false,
        properties: {
          timeMs: { type: 'number', minimum: 0 },
          zoom: { type: 'number', minimum: 0.75, maximum: 1.8 },
          panX: { type: 'number', minimum: -25, maximum: 25 },
          panY: { type: 'number', minimum: -25, maximum: 25 },
          rotation: { type: 'number', minimum: -8, maximum: 8 },
        },
      },
      (input) => {
        const current = projectRef.current;
        if (
          typeof input.timeMs !== 'number' ||
          !Number.isFinite(input.timeMs) ||
          input.timeMs < 0 ||
          input.timeMs > current.duration
        )
          return { ok: false, code: 'INVALID_INPUT' };
        const numericKeys = ['zoom', 'panX', 'panY', 'rotation'] as const;
        if (
          numericKeys.some(
            (key) =>
              input[key] !== undefined &&
              (typeof input[key] !== 'number' || !Number.isFinite(input[key])),
          )
        )
          return { ok: false, code: 'INVALID_INPUT' };
        if (
          (typeof input.zoom === 'number' &&
            (input.zoom < 0.75 || input.zoom > 1.8)) ||
          (typeof input.panX === 'number' &&
            (input.panX < -25 || input.panX > 25)) ||
          (typeof input.panY === 'number' &&
            (input.panY < -25 || input.panY > 25)) ||
          (typeof input.rotation === 'number' &&
            (input.rotation < -8 || input.rotation > 8))
        )
          return { ok: false, code: 'OUT_OF_BOUNDS' };
        let keyframe: CameraKeyframe | null = null;
        commitRef.current(
          (next) => {
            keyframe = upsertCameraKeyframe(next, input.timeMs as number, {
              zoom: typeof input.zoom === 'number' ? input.zoom : undefined,
              panX: typeof input.panX === 'number' ? input.panX : undefined,
              panY: typeof input.panY === 'number' ? input.panY : undefined,
              rotation:
                typeof input.rotation === 'number' ? input.rotation : undefined,
            });
          },
          'Set camera keyframe',
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          keyframe,
          changedEntityIds: ['camera'],
        };
      },
    );
    register(
      'apply_camera_preset',
      'Apply camera preset',
      'Apply a deterministic reaction punch-in or reset across the camera track.',
      {
        type: 'object',
        required: ['preset'],
        additionalProperties: false,
        properties: {
          preset: { type: 'string', enum: ['reaction-cut', 'reset'] },
        },
      },
      (input) => {
        const current = projectRef.current;
        if (input.preset !== 'reaction-cut' && input.preset !== 'reset')
          return { ok: false, code: 'INVALID_INPUT' };
        const start = current.currentTime;
        const base = evaluateCamera(current, start);
        const frames =
          input.preset === 'reaction-cut'
            ? [
                { ...base, time: start },
                {
                  time: Math.min(start + 220, current.duration),
                  zoom: Math.max(1.16, base.zoom),
                  panX: clamp(base.panX - 4, -25, 25),
                  panY: clamp(base.panY + 1, -25, 25),
                  rotation: base.rotation,
                },
                {
                  time: Math.min(start + 950, current.duration),
                  zoom: base.zoom,
                  panX: base.panX,
                  panY: base.panY,
                  rotation: base.rotation,
                },
              ]
            : [
                {
                  time: start,
                  zoom: 1,
                  panX: 0,
                  panY: 0,
                  rotation: 0,
                },
              ];
        const applied: CameraKeyframe[] = [];
        commitRef.current(
          (next) => {
            frames.forEach((frame) => {
              const result = upsertCameraKeyframe(next, frame.time, frame);
              if (result) applied.push(result);
            });
          },
          `Apply ${input.preset} camera`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          preset: input.preset,
          cameraKeyframes: applied,
          changedEntityIds: ['camera'],
        };
      },
    );
    register(
      'apply_motion_preset',
      'Apply motion preset',
      'Apply a deterministic multi-keyframe motion preset to one character.',
      {
        type: 'object',
        required: ['characterId', 'preset'],
        additionalProperties: false,
        properties: {
          characterId: { type: 'string' },
          preset: {
            type: 'string',
            enum: ['nervous', 'entrance', 'reaction', 'walk-in'],
          },
        },
      },
      (input) => {
        const current = projectRef.current;
        if (
          typeof input.characterId !== 'string' ||
          !current.characters.some((item) => item.id === input.characterId) ||
          (input.preset !== 'nervous' &&
            input.preset !== 'entrance' &&
            input.preset !== 'reaction' &&
            input.preset !== 'walk-in')
        )
          return { ok: false, code: 'INVALID_INPUT' };
        if (isTrackLocked(current, input.characterId))
          return { ok: false, code: 'TRACK_LOCKED' };
        const character = evaluateCharacters(current, current.currentTime).find(
          (item) => item.id === input.characterId,
        );
        if (!character) return { ok: false, code: 'NOT_FOUND' };
        const start = current.currentTime;
        const preset = input.preset;
        const frames =
          preset === 'nervous'
            ? [
                {
                  time: start,
                  rotation: character.rotation - 3,
                  pose: 'nervous' as Pose,
                },
                {
                  time: start + 250,
                  rotation: character.rotation + 3,
                  pose: 'nervous' as Pose,
                },
                {
                  time: start + 500,
                  rotation: character.rotation,
                  pose: 'nervous' as Pose,
                },
              ]
            : preset === 'entrance' || preset === 'walk-in'
              ? [
                  {
                    time: start,
                    x: clamp(
                      character.x + (preset === 'walk-in' ? 16 : 12),
                      0,
                      100,
                    ),
                    pose: 'idle' as Pose,
                  },
                  {
                    time: start + (preset === 'walk-in' ? 450 : 700),
                    x: clamp(
                      character.x + (preset === 'walk-in' ? 7 : 0),
                      0,
                      100,
                    ),
                    pose:
                      preset === 'walk-in'
                        ? ('idle' as Pose)
                        : ('lean-in' as Pose),
                  },
                  ...(preset === 'walk-in'
                    ? [
                        {
                          time: start + 900,
                          x: character.x,
                          pose: 'lean-in' as Pose,
                        },
                      ]
                    : []),
                ]
              : [
                  {
                    time: start,
                    rotation: character.rotation - 4,
                    pose: 'wave' as Pose,
                  },
                  {
                    time: start + 450,
                    rotation: character.rotation,
                    pose: character.pose,
                  },
                ];
        const applied: Keyframe[] = [];
        commitRef.current(
          (next) => {
            frames.forEach((frame) => {
              const result = upsertCharacterKeyframe(
                next,
                input.characterId as string,
                frame.time,
                frame,
              );
              if (result) applied.push(result);
            });
          },
          `Apply ${preset} motion`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          preset,
          keyframes: applied,
          changedEntityIds: [input.characterId],
        };
      },
    );
    register(
      'undo_command',
      'Undo command',
      'Undo the latest conflict-free command.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => {
        undoRef.current();
        return { ok: true, revision: projectRef.current.revision };
      },
    );
    register(
      'redo_command',
      'Redo command',
      'Redo the latest undone conflict-free command.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => {
        redoRef.current();
        return { ok: true, revision: projectRef.current.revision };
      },
    );
    register(
      'validate_project',
      'Validate project',
      'Run deterministic readiness checks.',
      { type: 'object', properties: {}, additionalProperties: false },
      async () => {
        const current = projectRef.current;
        const issues = validateProjectState(current);
        for (const skeleton of current.skeletons.filter(
          (candidate) => candidate.reviewStatus === 'approved',
        )) {
          const asset = current.assets.find(
            (candidate) => candidate.id === skeleton.assetId,
          );
          if (!asset?.dataUrl) continue;
          const preview = await inspectRenderedRigPreview(asset, skeleton);
          if (!preview.passed)
            issues.push({
              code: 'RIG_RENDER_QA_FAILED',
              severity: 'error',
              path: `skeletons.${skeleton.id}.preview`,
              message: preview.blockedReasons.join(' '),
            });
        }
        return {
          ok: issues.every((issue) => issue.severity !== 'error'),
          revision: current.revision,
          issues,
          renderReady: issues.every((issue) => issue.severity !== 'error'),
        };
      },
      true,
    );
    const callInternal = (
      name: string,
      input: Record<string, unknown> = {},
    ) => {
      const tool = internalTools.get(name);
      return tool
        ? tool.execute(input)
        : { ok: false, code: 'LEGACY_HANDLER_UNAVAILABLE', handler: name };
    };
    register(
      'inspect_project',
      'Inspect project',
      'Inspect the active project, approval gates, render settings, and recovery state.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => callInternal('get_project_summary'),
      true,
    );
    register(
      'edit_history',
      'Edit history',
      'Undo or redo one conflict-free project command.',
      {
        type: 'object',
        required: ['operation'],
        additionalProperties: false,
        properties: {
          operation: { type: 'string', enum: ['undo', 'redo'] },
        },
      },
      (input) =>
        input.operation === 'undo'
          ? callInternal('undo_command')
          : input.operation === 'redo'
            ? callInternal('redo_command')
            : { ok: false, code: 'INVALID_INPUT' },
    );
    register(
      'edit_project',
      'Edit project',
      'Rename, resize, or retime the active project through one discriminated command.',
      {
        type: 'object',
        required: ['operation'],
        additionalProperties: false,
        properties: {
          operation: {
            type: 'string',
            enum: ['rename', 'set-duration', 'retime'],
          },
          name: { type: 'string', minLength: 1, maxLength: 80 },
          durationMs: { type: 'number', minimum: 500, maximum: 60000 },
          speed: { type: 'number', minimum: 0.5, maximum: 2 },
        },
      },
      (input) => {
        if (input.operation === 'rename')
          return callInternal('set_project_name', { name: input.name });
        if (input.operation === 'set-duration')
          return callInternal('set_scene_duration', {
            durationMs: input.durationMs,
          });
        if (input.operation === 'retime')
          return callInternal('retime_scene', { speed: input.speed });
        return { ok: false, code: 'INVALID_INPUT' };
      },
    );
    register(
      'edit_storyboard',
      'Edit storyboard',
      'Add, update, remove, or promote a storyboard beat.',
      {
        type: 'object',
        required: ['operation'],
        additionalProperties: false,
        properties: {
          operation: {
            type: 'string',
            enum: ['add', 'update', 'remove', 'promote'],
          },
          beatId: { type: 'string' },
          title: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          startMs: { type: 'number', minimum: 0 },
          endMs: { type: 'number', minimum: 0 },
        },
      },
      (input) => {
        const payload = {
          beatId: input.beatId,
          title: input.title,
          description: input.description,
          startMs: input.startMs,
          endMs: input.endMs,
        };
        if (input.operation === 'add')
          return callInternal('add_storyboard_beat', payload);
        if (input.operation === 'update')
          return callInternal('update_storyboard_beat', payload);
        if (input.operation === 'remove')
          return callInternal('remove_storyboard_beat', payload);
        if (input.operation === 'promote')
          return callInternal('promote_storyboard_beat', payload);
        return { ok: false, code: 'INVALID_INPUT' };
      },
    );
    register(
      'edit_scene',
      'Edit scene',
      'Split, add, rename, duplicate, delete, or reorder a scene.',
      {
        type: 'object',
        required: ['operation'],
        additionalProperties: false,
        properties: {
          operation: {
            type: 'string',
            enum: ['split', 'add', 'rename', 'duplicate', 'delete', 'move'],
          },
          sceneId: { type: 'string' },
          title: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          timeMs: { type: 'number', minimum: 0 },
          direction: { type: 'string', enum: ['up', 'down'] },
        },
      },
      (input) => {
        const payload = {
          sceneId: input.sceneId,
          title: input.title,
          description: input.description,
          timeMs: input.timeMs,
          direction: input.direction,
        };
        const handler =
          input.operation === 'split'
            ? 'split_scene'
            : input.operation === 'add'
              ? 'add_scene'
              : input.operation === 'rename'
                ? 'rename_scene'
                : input.operation === 'duplicate'
                  ? 'duplicate_scene'
                  : input.operation === 'delete'
                    ? 'delete_scene'
                    : input.operation === 'move'
                      ? 'move_scene'
                      : '';
        return handler
          ? callInternal(handler, payload)
          : { ok: false, code: 'INVALID_INPUT' };
      },
    );
    register(
      'set_current_scene',
      'Set current scene',
      'Load one existing scene as the active editable scene.',
      {
        type: 'object',
        required: ['sceneId'],
        additionalProperties: false,
        properties: { sceneId: { type: 'string' } },
      },
      (input) => {
        const current = projectRef.current;
        const sceneId = typeof input.sceneId === 'string' ? input.sceneId : '';
        if (!current.scenes.some((scene) => scene.id === sceneId))
          return { ok: false, code: 'NOT_FOUND' };
        commitRef.current(
          (next) => loadSceneContent(next, sceneId),
          `Set current scene ${sceneId}`,
          true,
        );
        return { ok: true, revision: current.revision + 1, sceneId };
      },
    );
    register(
      'delete_keyframe',
      'Delete keyframe',
      'Delete one character, bone, prop, or camera keyframe by stable ID.',
      {
        type: 'object',
        required: ['keyframeId'],
        additionalProperties: false,
        properties: { keyframeId: { type: 'string' } },
      },
      (input) => {
        const current = projectRef.current;
        const keyframeId =
          typeof input.keyframeId === 'string' ? input.keyframeId : '';
        const exists = [
          ...current.keyframes,
          ...current.boneKeyframes,
          ...current.propKeyframes,
          ...current.cameraKeyframes,
        ].some((frame) => frame.id === keyframeId);
        if (!exists) return { ok: false, code: 'NOT_FOUND' };
        commitRef.current(
          (next) => {
            next.keyframes = next.keyframes.filter(
              (frame) => frame.id !== keyframeId,
            );
            next.boneKeyframes = next.boneKeyframes.filter(
              (frame) => frame.id !== keyframeId,
            );
            next.propKeyframes = next.propKeyframes.filter(
              (frame) => frame.id !== keyframeId,
            );
            next.cameraKeyframes = next.cameraKeyframes.filter(
              (frame) => frame.id !== keyframeId,
            );
          },
          `Delete keyframe ${keyframeId}`,
          true,
        );
        return { ok: true, revision: current.revision + 1, keyframeId };
      },
    );
    register(
      'undo',
      'Undo',
      'Undo the latest conflict-free command.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => callInternal('undo_command'),
    );
    register(
      'redo',
      'Redo',
      'Redo the latest undone conflict-free command.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => callInternal('redo_command'),
    );
    register(
      'list_assets',
      'List assets',
      'List project assets, placement, review status, and provenance without binary payloads.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => callInternal('get_asset_manifest'),
      true,
    );
    register(
      'list_asset_audio',
      'List asset audio',
      'List playable and pending audio assets with provenance but no binary payloads.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => callInternal('get_audio_library'),
      true,
    );
    register(
      'import_asset_audio',
      'Import asset audio metadata',
      'Create a provenance-first audio entry before attaching bounded bytes.',
      {
        type: 'object',
        required: ['label'],
        additionalProperties: false,
        properties: {
          label: { type: 'string', minLength: 1, maxLength: 100 },
          sourceUrl: { type: 'string', maxLength: 500 },
          author: { type: 'string', maxLength: 120 },
          license: { type: 'string', maxLength: 80 },
          licenseUrl: { type: 'string', maxLength: 500 },
          durationMs: { type: 'number', minimum: 1 },
          loopable: { type: 'boolean' },
          mimeType: { type: 'string', maxLength: 80 },
        },
      },
      (input) => callInternal('add_audio_asset', input),
    );
    register(
      'attach_imported_audio',
      'Attach imported audio',
      'Attach bounded audio bytes to an existing provenance-first audio entry.',
      {
        type: 'object',
        required: ['assetId', 'dataUrl'],
        additionalProperties: false,
        properties: {
          assetId: { type: 'string' },
          dataUrl: { type: 'string', minLength: 24, maxLength: 5600000 },
          mimeType: { type: 'string', maxLength: 80 },
          durationMs: { type: 'number', minimum: 1 },
        },
      },
      (input) => {
        const current = projectRef.current;
        const assetId = typeof input.assetId === 'string' ? input.assetId : '';
        const dataUrl = typeof input.dataUrl === 'string' ? input.dataUrl : '';
        const asset = current.assets.find((item) => item.id === assetId);
        if (!asset || asset.kind !== 'audio')
          return { ok: false, code: 'NOT_FOUND' };
        if (!/^data:audio\/[a-z0-9.+-]+;base64,/i.test(dataUrl))
          return { ok: false, code: 'INVALID_AUDIO_PAYLOAD' };
        commitRef.current(
          (next) => {
            const target = next.assets.find((item) => item.id === assetId);
            if (!target) return;
            target.dataUrl = dataUrl;
            if (typeof input.mimeType === 'string')
              target.mimeType = input.mimeType;
            if (typeof input.durationMs === 'number')
              target.mediaDurationMs = input.durationMs;
          },
          `Attach audio ${asset.label}`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          asset: { ...asset, dataUrl: undefined, hasPayload: true },
        };
      },
    );
    register(
      'add_audio_clip',
      'Add audio clip',
      'Add a bounded non-voice audio clip to the active scene.',
      {
        type: 'object',
        required: ['kind', 'label'],
        additionalProperties: false,
        properties: {
          kind: { type: 'string', enum: ['music', 'footstep', 'stinger'] },
          label: { type: 'string', minLength: 1 },
          startMs: { type: 'number', minimum: 0 },
          endMs: { type: 'number', minimum: 0 },
          volume: { type: 'number', minimum: 0, maximum: 1 },
          assetId: { type: 'string' },
          loop: { type: 'boolean' },
        },
      },
      (input) => callInternal('add_audio_cue', input),
    );
    register(
      'set_audio_clip',
      'Set audio clip',
      'Update timing, volume, label, routing, or loop state for one audio clip.',
      {
        type: 'object',
        required: ['clipId'],
        additionalProperties: false,
        properties: {
          clipId: { type: 'string' },
          label: { type: 'string', minLength: 1 },
          startMs: { type: 'number', minimum: 0 },
          endMs: { type: 'number', minimum: 0 },
          volume: { type: 'number', minimum: 0, maximum: 1 },
          assetId: { type: 'string' },
          loop: { type: 'boolean' },
        },
      },
      (input) => {
        const cueId = input.clipId;
        if (input.assetId)
          return callInternal('set_audio_cue_asset', {
            cueId,
            assetId: input.assetId,
            loop: input.loop,
          });
        return callInternal('update_audio_cue', { ...input, cueId });
      },
    );
    register(
      'inspect_audio_clip',
      'Inspect audio clip',
      'Inspect one audio clip and its payload and provenance readiness.',
      {
        type: 'object',
        required: ['clipId'],
        additionalProperties: false,
        properties: { clipId: { type: 'string' } },
      },
      (input) => {
        const current = projectRef.current;
        const cue = current.audioCues.find((item) => item.id === input.clipId);
        if (!cue) return { ok: false, code: 'NOT_FOUND' };
        const asset = cue.assetId
          ? current.assets.find((item) => item.id === cue.assetId)
          : undefined;
        return {
          ok: true,
          revision: current.revision,
          clip: cue,
          asset: asset
            ? {
                ...asset,
                dataUrl: undefined,
                hasPayload: Boolean(asset.dataUrl),
              }
            : null,
        };
      },
      true,
    );
    register(
      'inspect_rig_preview',
      'Inspect rig preview',
      'Render and inspect the rest pose plus representative joint extremes before rig approval.',
      {
        type: 'object',
        required: ['skeletonId'],
        additionalProperties: false,
        properties: { skeletonId: { type: 'string' } },
      },
      async (input) => {
        const current = projectRef.current;
        const skeleton = current.skeletons.find(
          (item) => item.id === input.skeletonId,
        );
        if (!skeleton) return { ok: false, code: 'NOT_FOUND' };
        const asset = current.assets.find(
          (item) => item.id === skeleton.assetId,
        );
        if (!asset?.dataUrl)
          return { ok: false, code: 'ASSET_PAYLOAD_MISSING' };
        const report = await inspectRenderedRigPreview(asset, skeleton);
        return {
          ok: true,
          revision: current.revision,
          skeletonId: skeleton.id,
          assetId: asset.id,
          ...report,
        };
      },
      true,
    );
    (
      window as Window & {
        __stagehandLegacyTools?: Map<string, ModelTool>;
      }
    ).__stagehandLegacyTools = internalTools;
    const registrations = PUBLIC_WEBMCP_TOOL_NAMES.map((name) => {
      const tool = internalTools.get(name);
      if (!tool || !PUBLIC_WEBMCP_TOOL_SET.has(name)) {
        setNotice(`WebMCP tool missing · ${name}`);
        return Promise.resolve();
      }
      return Promise.resolve(
        modelContext.registerTool(tool, { signal: lifecycle.signal }),
      );
    });
    void Promise.all(registrations).catch(() =>
      setNotice('WebMCP registration unavailable'),
    );
    return () => lifecycle.abort();
  }, []);
  const updateSelected = (key: 'x' | 'y' | 'rotation', value: number) => {
    if (isTrackLocked(project, project.selectedId)) {
      setNotice(`${selected.name} track is locked`);
      return;
    }
    commit((next) => {
      upsertCharacterKeyframe(next, next.selectedId, next.currentTime, {
        [key]: value,
      });
    }, `Adjust ${key}`);
  };
  const addKeyframe = () => {
    if (isTrackLocked(project, project.selectedId)) {
      setNotice(`${selected.name} track is locked`);
      return;
    }
    commit((next) => {
      upsertCharacterKeyframe(next, next.selectedId, next.currentTime, {});
    }, `Keyframe ${selected.name}`);
  };
  const updateCaption = (patch: Partial<Caption>) => {
    if (!selectedCaption) return;
    commit((next) => {
      const caption = next.captions.find(
        (item) => item.id === selectedCaption.id,
      );
      if (!caption) return;
      if (typeof patch.text === 'string') caption.text = patch.text;
      if (typeof patch.start === 'number' && Number.isFinite(patch.start))
        caption.start = clamp(patch.start, 0, caption.end - 1);
      if (typeof patch.end === 'number' && Number.isFinite(patch.end))
        caption.end = clamp(patch.end, caption.start + 1, next.duration);
    }, `Edit ${selectedCaption.id}`);
  };
  const applyNervousPreset = () => {
    if (isTrackLocked(project, project.selectedId)) {
      setNotice(`${selected.name} track is locked`);
      return;
    }
    const start = project.currentTime;
    const rotation = selected.rotation;
    commit((next) => {
      [
        { time: start, rotation: rotation - 3 },
        { time: start + 250, rotation: rotation + 3 },
        { time: start + 500, rotation },
      ].forEach((frame) =>
        upsertCharacterKeyframe(next, next.selectedId, frame.time, {
          rotation: frame.rotation,
          pose: 'nervous',
        }),
      );
    }, 'Apply nervous motion');
  };
  const applyWalkPreset = () => {
    if (isTrackLocked(project, project.selectedId)) {
      setNotice(`${selected.name} track is locked`);
      return;
    }
    const start = project.currentTime;
    const x = selected.x;
    commit((next) => {
      [
        { time: start, x: clamp(x + 16, 0, 100), pose: 'idle' as Pose },
        { time: start + 450, x: clamp(x + 7, 0, 100), pose: 'idle' as Pose },
        { time: start + 900, x, pose: 'lean-in' as Pose },
      ].forEach((frame) =>
        upsertCharacterKeyframe(next, next.selectedId, frame.time, frame),
      );
    }, 'Apply walk-in motion');
  };
  const applyMotionClipHuman = (clipId: string) => {
    if (isTrackLocked(project, project.selectedId)) {
      setNotice(`${selected.name} track is locked`);
      return;
    }
    const clip = project.motionClips.find((item) => item.id === clipId);
    if (!clip || !selectedSkeleton) {
      setNotice('Approve a skeleton before applying motion clips');
      return;
    }
    if (selectedSkeleton.reviewStatus !== 'approved') {
      setNotice('Approve the skeleton before applying motion clips');
      return;
    }
    const start = project.currentTime;
    commit((next) => {
      clip.transforms.forEach((frame) => {
        const time = start + frame.time;
        if (time <= next.duration) {
          upsertBoneKeyframeInProject(
            next,
            selectedSkeleton.id,
            time,
            frame.transforms,
          );
          if (frame.variantId)
            upsertCharacterKeyframe(next, selected.id, time, {
              variantId: frame.variantId,
            });
        }
      });
    }, `Apply ${clip.label}`);
  };
  const setSelectedPose = (pose: Pose) => {
    if (isTrackLocked(project, project.selectedId)) {
      setNotice(`${selected.name} track is locked`);
      return;
    }
    commit((next) => {
      upsertCharacterKeyframe(next, next.selectedId, next.currentTime, {
        pose,
      });
    }, `Apply ${pose} pose`);
  };
  const createSkeletonForSelected = () => {
    if (!selected.assetId) {
      setNotice('Bind character art before proposing a skeleton');
      return;
    }
    if (selectedSkeleton) {
      setNotice(`${selectedSkeleton.label} is already available`);
      return;
    }
    const asset = project.assets.find((item) => item.id === selected.assetId);
    if (!asset) return;
    const skeleton = defaultSkeletonForAsset(
      asset.id,
      selected.name,
      asset.frameLayout === 'parts-sheet' ? 'segmented' : 'rigid',
      asset,
    );
    commit(
      (next) => next.skeletons.push(skeleton),
      `Propose ${selected.name} skeleton`,
    );
  };
  const updateSelectedSkeletonJoint = (
    jointId: string,
    key: 'x' | 'y',
    value: number,
  ) => {
    if (!selectedSkeleton) return;
    const joint = selectedSkeleton.joints.find((item) => item.id === jointId);
    if (!joint || !Number.isFinite(value)) return;
    commit((next) => {
      const target = next.skeletons
        .find((item) => item.id === selectedSkeleton.id)
        ?.joints.find((item) => item.id === jointId);
      if (target) target[key] = clamp(value, 0, 100);
      const skeleton = next.skeletons.find(
        (item) => item.id === selectedSkeleton.id,
      );
      if (skeleton) {
        skeleton.version += 1;
        skeleton.reviewStatus = 'pending-review';
      }
    }, `Move ${joint.label}`);
  };
  const updateSelectedBindingRegion = (
    regionId: string,
    key: 'pivotX' | 'pivotY' | 'overlapPx' | 'zIndex' | 'boneId',
    value: number | string,
  ) => {
    if (!selectedSkeleton) return;
    commit((next) => {
      const skeleton = next.skeletons.find(
        (item) => item.id === selectedSkeleton.id,
      );
      const region = skeleton?.binding.regions?.find(
        (item) => item.id === regionId,
      );
      if (!skeleton || !region) return;
      if (key === 'boneId') region.boneId = String(value);
      else if (Number.isFinite(Number(value))) region[key] = Number(value);
      skeleton.version += 1;
      skeleton.reviewStatus = 'pending-review';
    }, `Correct ${regionId} ${key}`);
  };
  const setSelectedBindingMethod = (method: BindingMethod) => {
    if (!selectedSkeleton) return;
    commit((next) => {
      const skeleton = next.skeletons.find(
        (item) => item.id === selectedSkeleton.id,
      );
      if (!skeleton) return;
      skeleton.binding.method = method;
      skeleton.version += 1;
      skeleton.reviewStatus = 'pending-review';
    }, `Set ${method} binding`);
  };
  const runRigPreview = async () => {
    if (!selectedSkeleton) return null;
    const asset = project.assets.find(
      (item) => item.id === selectedSkeleton.assetId,
    );
    if (!asset?.dataUrl) {
      setNotice('Attach character pixels before rendered rig review');
      return null;
    }
    setRigPreviewLoading(true);
    try {
      const report = await inspectRenderedRigPreview(asset, selectedSkeleton);
      setRigPreviewReport(report);
      setNotice(
        report.passed
          ? 'Rendered rig passed all stress poses'
          : 'Rendered rig needs correction before approval',
      );
      return report;
    } finally {
      setRigPreviewLoading(false);
    }
  };
  const approveSelectedSkeleton = async (approved: boolean) => {
    if (!selectedSkeleton) return;
    if (
      approved &&
      selectedSkeleton.joints.some((joint) => joint.confidence < 0.55)
    ) {
      setNotice('Review low-confidence joints before approval');
      return;
    }
    if (approved) {
      const report = await runRigPreview();
      if (!report?.passed) return;
    }
    commit(
      (next) => {
        const skeleton = next.skeletons.find(
          (item) => item.id === selectedSkeleton.id,
        );
        if (skeleton)
          skeleton.reviewStatus = approved ? 'approved' : 'rejected';
      },
      `${approved ? 'Approve' : 'Reject'} ${selectedSkeleton.label}`,
    );
  };
  const reviewAsset = (asset: Asset, approved: boolean) => {
    if (approved) {
      const readiness = candidateApprovalChecks(asset);
      if (!readiness.readyForApproval) {
        setNotice('Complete the asset checklist before approval');
        return;
      }
    }
    commit(
      (next) => {
        const target = next.assets.find((item) => item.id === asset.id);
        if (target) target.reviewStatus = approved ? 'approved' : 'rejected';
      },
      `${approved ? 'Approve' : 'Reject'} ${asset.label}`,
    );
  };
  const updateCamera = (
    key: 'zoom' | 'panX' | 'panY' | 'rotation',
    value: number,
  ) =>
    commit((next) => {
      upsertCameraKeyframe(next, next.currentTime, { [key]: value });
    }, `Adjust camera ${key}`);
  const addCameraKeyframe = () =>
    commit((next) => {
      upsertCameraKeyframe(next, next.currentTime, {});
    }, 'Keyframe camera');
  const splitAtPlayhead = () => {
    const splitTime = project.currentTime;
    if (splitTime <= 0 || splitTime >= project.duration) {
      setNotice('Move the playhead inside the scene before splitting');
      return;
    }
    const index = project.scenes.findIndex(
      (scene) => scene.id === project.activeSceneId,
    );
    if (index < 0) return;
    const beforeId = nextSceneId(project.scenes);
    const afterId = nextSceneId([
      ...project.scenes,
      { id: beforeId } as SceneMeta,
    ]);
    const [before, after] = makeSplitScenes(
      project,
      splitTime,
      beforeId,
      afterId,
    );
    commit(
      (next) => {
        next.scenes.splice(index, 1, before, after);
        loadSceneContent(next, after.id);
      },
      `Split ${project.activeSceneId} at ${Math.round(splitTime)}ms`,
    );
    setPanel('scenes');
    setViewMode('animate');
    setNotice(`Split scene at ${timecode(splitTime)} · editing Scene B`);
  };
  const toggleTrackLock = () => {
    const locked = isTrackLocked(project, project.selectedId);
    commit(
      (next) => {
        next.lockedTrackIds = next.lockedTrackIds.filter(
          (id) => id !== next.selectedId,
        );
        if (!locked) next.lockedTrackIds.push(next.selectedId);
      },
      `${locked ? 'Unlock' : 'Lock'} ${selected.name} track`,
    );
  };
  const applyReactionCut = () => {
    const start = project.currentTime;
    const base = camera;
    commit((next) => {
      [
        { ...base, time: start },
        {
          time: Math.min(start + 220, next.duration),
          zoom: Math.max(1.16, base.zoom),
          panX: clamp(base.panX - 4, -25, 25),
          panY: clamp(base.panY + 1, -25, 25),
          rotation: base.rotation,
        },
        {
          time: Math.min(start + 950, next.duration),
          zoom: base.zoom,
          panX: base.panX,
          panY: base.panY,
          rotation: base.rotation,
        },
      ].forEach((frame) => upsertCameraKeyframe(next, frame.time, frame));
    }, 'Apply reaction cut');
  };
  const finishTimelineDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = timelineDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    suppressTimelineClickRef.current = drag.moved;
    if (drag.moved) {
      const current = projectRef.current;
      const finalized = {
        ...current,
        revision: current.revision + 1,
        dirty: true,
      };
      syncActiveScene(finalized);
      projectRef.current = finalized;
      setProject(finalized);
      const nextHistory = [...historyRef.current.slice(-29), copy(drag.before)];
      historyRef.current = nextHistory;
      futureRef.current = [];
      setHistory(nextHistory);
      setFuture([]);
      setSaved(false);
      setLastCommand(`Retimed ${drag.mark.label}`);
      const movedTime =
        drag.mark.kind === 'camera'
          ? current.cameraKeyframes.find((frame) => frame.id === drag.mark.id)
              ?.time
          : drag.mark.kind === 'prop'
            ? current.propKeyframes.find((frame) => frame.id === drag.mark.id)
                ?.time
            : current.keyframes.find((frame) => frame.id === drag.mark.id)
                ?.time;
      setNotice(
        `Human · Retimed ${drag.mark.label} · ${timecode(movedTime ?? current.currentTime)}`,
      );
    }
    timelineDragRef.current = null;
  };
  const startTimelineDrag = (
    event: React.PointerEvent<HTMLButtonElement>,
    mark: TimelineMark,
  ) => {
    if (mark.kind === 'cue') return;
    if (
      mark.kind === 'character' &&
      mark.characterId &&
      isTrackLocked(project, mark.characterId)
    ) {
      setNotice(`${mark.label} is locked`);
      return;
    }
    timelineDragRef.current = {
      mark,
      before: copy(projectRef.current),
      pointerId: event.pointerId,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveTimelineDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = timelineDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const trackArea = event.currentTarget.closest('.track-area');
    if (!(trackArea instanceof HTMLElement)) return;
    const rect = trackArea.getBoundingClientRect();
    const requestedTime =
      ((event.clientX - rect.left) / Math.max(1, rect.width)) *
      project.duration;
    const next = copy(projectRef.current);
    if (!retimeTimelineMark(next, drag.mark, requestedTime)) return;
    syncActiveScene(next);
    projectRef.current = next;
    drag.moved = true;
    setProject(next);
  };
  const addAsset = (kind: AssetKind) => {
    const label = `${assetKindLabel(kind)} ${project.assets.length + 1}`;
    commit((next) => {
      next.assets.push({
        id: nextAssetId(next.assets, kind),
        kind,
        label,
        brief: defaultAssetBrief(kind),
        source: 'placeholder',
        frameLayout: 'single',
        style: defaultAssetStyle(kind),
      });
    }, `Add asset ${label}`);
  };
  const updateAssetBrief = (asset: Asset, value: string) => {
    const brief = value.trim();
    setAssetBriefDrafts((drafts) => {
      const next = { ...drafts };
      delete next[asset.id];
      return next;
    });
    if (!brief) {
      setNotice('Asset brief cannot be empty');
      return;
    }
    if (brief === (asset.brief ?? defaultAssetBrief(asset.kind))) return;
    commit((next) => {
      const item = next.assets.find((candidate) => candidate.id === asset.id);
      if (item) item.brief = brief;
    }, `Set brief for ${asset.label}`);
  };
  const updateAssetStyle = (asset: Asset, changes: Partial<AssetStyle>) => {
    const currentStyle = asset.style ?? defaultAssetStyle(asset.kind);
    const style: AssetStyle = {
      ...currentStyle,
      ...changes,
      palette: changes.palette ?? currentStyle.palette,
      notes: changes.notes ?? currentStyle.notes,
    };
    commit((next) => {
      const item = next.assets.find((candidate) => candidate.id === asset.id);
      if (item) item.style = style;
    }, `Set style for ${asset.label}`);
  };
  const removeAsset = (asset: Asset) => {
    commit((next) => {
      next.assets = next.assets.filter((item) => item.id !== asset.id);
      next.assetRequests = next.assetRequests.filter(
        (request) => request.id !== asset.generationRequestId,
      );
      const removedSkeletonIds = next.skeletons
        .filter((skeleton) => skeleton.assetId === asset.id)
        .map((skeleton) => skeleton.id);
      next.skeletons = next.skeletons.filter(
        (skeleton) => skeleton.assetId !== asset.id,
      );
      next.boneKeyframes = next.boneKeyframes.filter(
        (frame) => !removedSkeletonIds.includes(frame.skeletonId),
      );
      next.propKeyframes = next.propKeyframes.filter(
        (frame) => frame.assetId !== asset.id,
      );
      next.characters.forEach((character) => {
        if (character.assetId === asset.id) character.assetId = undefined;
      });
    }, `Remove asset ${asset.label}`);
  };
  const bindAssetToCharacter = (asset: Asset, characterId: string) => {
    if (asset.kind !== 'rigged-character' || !asset.dataUrl) {
      setNotice('Import character art before binding it to a rig');
      return;
    }
    if (!characterId) {
      commit((next) => {
        next.characters.forEach((item) => {
          if (item.assetId === asset.id) item.assetId = undefined;
        });
      }, `Unbind ${asset.label}`);
      return;
    }
    if (asset.source === 'generated' && asset.reviewStatus !== 'approved') {
      setNotice(
        'Approve the generated candidate before binding it to a character',
      );
      return;
    }
    const character = project.characters.find(
      (item) => item.id === characterId,
    );
    if (!character) return;
    commit((next) => {
      next.characters.forEach((item) => {
        if (item.assetId === asset.id) item.assetId = undefined;
      });
      const target = next.characters.find((item) => item.id === characterId);
      if (target) {
        target.assetId = asset.id;
        target.variantId = undefined;
        next.keyframes.forEach((frame) => {
          if (frame.characterId === target.id) frame.variantId = undefined;
        });
      }
    }, `Bind ${asset.label} to ${character.name}`);
  };
  const addAudioCue = (kind: Exclude<AudioCueKind, 'music'>) => {
    const start = project.currentTime;
    const end = Math.min(
      project.duration,
      start + (kind === 'footstep' ? 120 : 350),
    );
    const label = kind === 'footstep' ? 'Footstep' : 'Reaction sting';
    const assetId = project.assets.find(
      (asset) =>
        asset.kind === 'audio' &&
        asset.dataUrl &&
        asset.label.toLowerCase().includes('pop'),
    )?.id;
    commit((next) => {
      next.audioCues.push({
        id: nextAudioCueId(next.audioCues, kind),
        kind,
        label,
        start,
        end,
        volume: kind === 'footstep' ? 0.24 : 0.16,
        ...(assetId ? { assetId } : {}),
      });
    }, `Add audio ${label}`);
  };
  const removeAudioCue = (cue: AudioCue) => {
    commit((next) => {
      next.audioCues = next.audioCues.filter((item) => item.id !== cue.id);
    }, `Remove audio ${cue.label}`);
  };
  const updateAudioCueVolume = (cue: AudioCue, volume: number) => {
    const safeVolume = clamp(volume, 0, 1);
    if (Math.abs(cue.volume - safeVolume) < 0.005) return;
    commit(
      (next) => {
        const item = next.audioCues.find(
          (candidate) => candidate.id === cue.id,
        );
        if (item) item.volume = safeVolume;
      },
      `Set ${cue.label} volume to ${Math.round(safeVolume * 100)}%`,
    );
  };
  const updateAudioCueTiming = (
    cue: AudioCue,
    key: 'start' | 'end',
    value: number,
  ) => {
    if (!Number.isFinite(value)) return;
    const start = key === 'start' ? clamp(value, 0, cue.end - 1) : cue.start;
    const end =
      key === 'end' ? clamp(value, cue.start + 1, project.duration) : cue.end;
    if (start === cue.start && end === cue.end) return;
    commit(
      (next) => {
        const item = next.audioCues.find(
          (candidate) => candidate.id === cue.id,
        );
        if (item) {
          item.start = start;
          item.end = end;
        }
      },
      `Set ${cue.label} ${key} to ${timecode(key === 'start' ? start : end)}`,
    );
  };
  const applyPropPreset = (asset: Asset, preset: 'pop-in' | 'nudge') => {
    if (asset.kind !== 'prop' || !asset.dataUrl) {
      setNotice('Import a prop before animating it');
      return;
    }
    const start = project.currentTime;
    const base = evaluateProps(project, start).find(
      (item) => item.assetId === asset.id,
    );
    if (!base) return;
    const points =
      preset === 'pop-in'
        ? [
            { ...base, time: start, scale: 0.25, rotation: -4 },
            {
              ...base,
              time: Math.min(project.duration, start + 220),
              scale: base.scale,
              rotation: 0,
            },
          ]
        : [
            { ...base, time: start, rotation: -5 },
            {
              ...base,
              time: Math.min(project.duration, start + 180),
              rotation: 5,
            },
            {
              ...base,
              time: Math.min(project.duration, start + 360),
              rotation: 0,
            },
          ];
    const unique = points.filter(
      (point, index) =>
        points.findIndex((candidate) => candidate.time === point.time) ===
        index,
    );
    commit((next) => {
      unique.forEach((point) =>
        upsertPropKeyframe(next, asset.id, point.time, point),
      );
    }, `Apply ${preset} to ${asset.label}`);
  };
  const updateRenderSettings = (changes: {
    fps?: number;
    preset?: '720p' | '1080p';
  }) => {
    const fps = changes.fps ?? project.fps;
    const preset =
      changes.preset ?? (project.renderWidth >= 1920 ? '1080p' : '720p');
    const width = preset === '1080p' ? 1920 : 720;
    const height = preset === '1080p' ? 1080 : 405;
    commit((next) => {
      next.fps = fps;
      next.renderWidth = width;
      next.renderHeight = height;
    }, `Set render ${preset} · ${fps} fps`);
  };
  const updateSceneDuration = (value: string) => {
    const seconds = Number(value);
    if (!Number.isFinite(seconds) || seconds < 0.5 || seconds > 60) {
      setNotice('Scene duration must be between 0.5 and 60 seconds');
      return;
    }
    const durationMs = Math.round(seconds * 1000);
    if (durationMs === project.duration) return;
    commit(
      (next) => {
        resizeProjectDuration(next, durationMs);
      },
      `Set scene duration to ${timecode(durationMs)}`,
    );
  };
  const retimeSceneBySpeed = (speed: number) => {
    if (!Number.isFinite(speed) || speed < 0.5 || speed > 2) return;
    commit(
      (next) => {
        retimeProjectBySpeed(next, speed);
      },
      `Set scene speed to ${speed.toFixed(2)}×`,
    );
  };
  const updatePropTransform = (
    asset: Asset,
    key: 'x' | 'y' | 'scale' | 'rotation',
    value: number,
  ) => {
    if (asset.kind !== 'prop' || !asset.dataUrl || !Number.isFinite(value))
      return;
    const current = evaluatedProps.find((item) => item.assetId === asset.id);
    if (!current) return;
    const limits: Record<typeof key, [number, number]> = {
      x: [0, 100],
      y: [0, 100],
      scale: [0.25, 2.5],
      rotation: [-180, 180],
    };
    const safeValue = clamp(value, ...limits[key]);
    if (Math.abs(current[key] - safeValue) < 0.001) return;
    commit((next) => {
      upsertPropKeyframe(next, asset.id, next.currentTime, {
        [key]: safeValue,
      });
    }, `Set ${asset.label} ${key}`);
  };
  const importAsset = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setNotice('Import an image asset · PNG, JPG, WebP, or GIF');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setNotice('Image import is limited to 4 MB for local recovery');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setNotice('Image import failed');
        return;
      }
      const label = file.name.replace(/\.[^/.]+$/, '') || 'Imported image';
      const assetId = nextAssetId(project.assets, assetImportKind);
      const requestedPoseSheet =
        assetImportKind === 'rigged-character' &&
        assetImportMode === 'pose-sheet';
      const image = new Image();
      image.onload = () => {
        const frameLayout: AssetFrameLayout =
          requestedPoseSheet && image.naturalWidth >= image.naturalHeight * 2.1
            ? 'four-column'
            : 'single';
        const frameCount = frameLayout === 'four-column' ? 4 : 1;
        commit(
          (next) => {
            next.assets.push({
              id: assetId,
              kind: assetImportKind,
              label,
              brief: defaultAssetBrief(assetImportKind),
              source: 'imported',
              frameLayout,
              detectedLayout: frameLayout,
              style: defaultAssetStyle(assetImportKind),
              mimeType: file.type,
              dataUrl: reader.result as string,
              dimensions: {
                width: image.naturalWidth,
                height: image.naturalHeight,
              },
              transparencyStatus: 'unknown',
              ...(frameCount > 1 ? { frameCount } : {}),
            });
            if (assetImportKind === 'rigged-character') {
              const character = next.characters.find(
                (item) => item.id === next.selectedId,
              );
              if (character) {
                character.assetId = assetId;
                character.variantId = undefined;
                next.keyframes.forEach((frame) => {
                  if (frame.characterId === character.id)
                    frame.variantId = undefined;
                });
              }
            }
          },
          assetImportKind === 'rigged-character'
            ? `Import and bind ${frameLayout === 'four-column' ? 'pose sheet' : 'character art'} ${label}`
            : `Import asset ${label}`,
        );
        if (requestedPoseSheet && frameLayout === 'single') {
          setNotice('Auto-detected single image · imported without pose crops');
        }
      };
      image.onerror = () => setNotice('Image decode failed');
      image.src = reader.result;
    };
    reader.onerror = () => setNotice('Image import failed');
    reader.readAsDataURL(file);
  };
  const importAudioAsset = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      setNotice('Import an audio file · OGG, WAV, MP3, or M4A');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setNotice('Audio import is limited to 4 MB for local recovery');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setNotice('Audio import failed');
        return;
      }
      const label = file.name.replace(/\.[^/.]+$/, '') || 'Imported audio';
      const assetId = nextAssetId(project.assets, 'audio');
      const probe = new Audio(reader.result);
      const commitAudio = () => {
        commit((next) => {
          next.assets.push({
            id: assetId,
            kind: 'audio',
            label,
            source: 'imported',
            mimeType: file.type,
            dataUrl: reader.result as string,
            mediaDurationMs:
              Number.isFinite(probe.duration) && probe.duration > 0
                ? Math.round(probe.duration * 1000)
                : undefined,
            loopable: false,
            reviewStatus: 'approved',
            provenance: { author: 'User import' },
            style: defaultAssetStyle('audio'),
          });
        }, `Import audio ${label}`);
      };
      probe.addEventListener('loadedmetadata', commitAudio, { once: true });
      probe.addEventListener('error', commitAudio, { once: true });
    };
    reader.onerror = () => setNotice('Audio import failed');
    reader.readAsDataURL(file);
  };
  const previewAudioAsset = (asset: Asset) => {
    if (asset.kind !== 'audio' || !asset.dataUrl) {
      setNotice('This audio entry has no playable payload yet');
      return;
    }
    audioPreviewRef.current?.pause();
    const audio = new Audio(asset.dataUrl);
    audioPreviewRef.current = audio;
    void audio
      .play()
      .catch(() => setNotice('Audio preview was blocked by the browser'));
  };
  const replaceProject = (
    template: Project,
    command: string,
    message: string,
  ) => {
    const nextProject = copy(template);
    projectRef.current = nextProject;
    commandResultsRef.current.clear();
    historyRef.current = [];
    futureRef.current = [];
    setHistory([]);
    setFuture([]);
    setProject(nextProject);
    setProjectNameDraft(nextProject.name);
    setPlaying(false);
    setViewMode('animate');
    setPanel('scenes');
    setDialog(null);
    setSaved(true);
    setLastCommand(command);
    setNotice(message);
    setTopMenuOpen(false);
  };
  const startBlankProject = () => {
    if (
      !isBlankProject(project) &&
      !window.confirm(
        'Start a new blank project? Export first if you need a recoverable copy. This cannot be undone.',
      )
    )
      return;
    replaceProject(blankProject, 'new_blank_project()', 'Blank project ready');
  };
  const loadDemoProject = () => {
    if (
      !isBlankProject(project) &&
      !window.confirm(
        'Replace this browser project with the Late Plate demo? Export first if you need a recoverable copy. This cannot be undone.',
      )
    )
      return;
    replaceProject(
      starterProject,
      'load_demo_project()',
      'Demo project loaded',
    );
  };
  const applyTemplate = (template: (typeof starterTemplates)[number]) => {
    if (isBlankProject(project)) {
      const scene = makeTemplateScene(template.id, 'scene-01');
      const templatedProject = copy(starterProject);
      templatedProject.revision = 1;
      templatedProject.currentTime = 0;
      templatedProject.scenes = [scene];
      templatedProject.activeSceneId = scene.id;
      loadSceneContent(templatedProject, scene.id);
      replaceProject(
        templatedProject,
        `apply_template(${template.id})`,
        `${scene.title} ready`,
      );
      return;
    }
    const scene = makeTemplateScene(template.id, nextSceneId(project.scenes));
    commit((next) => {
      next.scenes.push(scene);
      loadSceneContent(next, scene.id);
    }, `Apply ${scene.title}`);
    setPanel('scenes');
    setDialog(null);
  };
  const addStoryboardBeat = () => {
    const startMs = Math.min(
      project.currentTime,
      Math.max(0, project.duration - 1000),
    );
    const endMs = Math.min(project.duration, startMs + 1000);
    const beat: StoryBeat = {
      id: nextBeatId(project.storyboardBeats),
      index: String(project.storyboardBeats.length + 1).padStart(2, '0'),
      title: `Beat ${String(project.storyboardBeats.length + 1).padStart(2, '0')}`,
      description: 'New story beat ready for blocking.',
      startMs,
      endMs,
    };
    commit((next) => next.storyboardBeats.push(beat), `Add beat ${beat.title}`);
    setEditingBeatId(beat.id);
    setBeatTitleDraft(beat.title);
    setBeatDescriptionDraft(beat.description);
    setBeatStartDraft(String(beat.startMs));
    setBeatEndDraft(String(beat.endMs));
  };
  const beginBeatEdit = (beat: StoryBeat) => {
    setEditingBeatId(beat.id);
    setBeatTitleDraft(beat.title);
    setBeatDescriptionDraft(beat.description);
    setBeatStartDraft(String(beat.startMs));
    setBeatEndDraft(String(beat.endMs));
  };
  const finishBeatEdit = () => {
    if (!editingBeatId) return;
    const title = beatTitleDraft.trim();
    const description = beatDescriptionDraft.trim() || 'Untitled story beat.';
    const startMs = Number(beatStartDraft);
    const endMs = Number(beatEndDraft);
    if (
      !title ||
      !Number.isFinite(startMs) ||
      !Number.isFinite(endMs) ||
      startMs < 0 ||
      endMs <= startMs ||
      endMs > project.duration
    ) {
      setNotice('Beat timing must fit inside the active scene');
      return;
    }
    const beatId = editingBeatId;
    commit((next) => {
      const beat = next.storyboardBeats.find((item) => item.id === beatId);
      if (beat) Object.assign(beat, { title, description, startMs, endMs });
    }, `Update beat ${title}`);
    setEditingBeatId(null);
  };
  const removeStoryboardBeat = (beat: StoryBeat) => {
    commit((next) => {
      next.storyboardBeats = next.storyboardBeats
        .filter((item) => item.id !== beat.id)
        .map((item, index) => ({
          ...item,
          index: String(index + 1).padStart(2, '0'),
        }));
    }, `Remove beat ${beat.title}`);
    setEditingBeatId(null);
  };
  const updateStyleBibleField = (
    key: Exclude<keyof StyleBible, 'palette'>,
    value: string,
  ) => {
    if (key !== 'notes' && !value.trim()) return;
    commit((next) => {
      next.styleBible[key] = value;
    }, `Update style ${key}`);
  };
  const updateStylePalette = (value: string) => {
    const palette = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (palette.length === 0) return;
    commit((next) => {
      next.styleBible.palette = palette;
    }, 'Update style palette');
  };
  const promoteBeat = (beat: StoryBeat) => {
    if (beat.startMs >= project.duration) {
      setNotice('Beat does not fit inside this scene');
      return;
    }
    const scene = makeBeatScene(project, beat, nextSceneId(project.scenes));
    commit((next) => {
      next.scenes.push(scene);
      loadSceneContent(next, scene.id);
    }, `Promote ${beat.title}`);
    setPanel('scenes');
    setViewMode('animate');
  };
  const addScene = () => {
    const sceneNumber = project.scenes.length + 1;
    const scene = {
      id: nextSceneId(project.scenes),
      title: `Scene ${String(sceneNumber).padStart(2, '0')}`,
      description: 'New scene ready for blocking.',
      duration: project.duration,
      characters: copy(project.characters),
      keyframes: copy(project.keyframes),
      propKeyframes: copy(project.propKeyframes),
      cameraKeyframes: copy(project.cameraKeyframes),
      captions: copy(project.captions),
      audioCues: copy(project.audioCues),
      boneKeyframes: copy(project.boneKeyframes),
      lockedTrackIds: copy(project.lockedTrackIds),
    } satisfies SceneMeta;
    commit((next) => {
      next.scenes.push(scene);
      loadSceneContent(next, scene.id);
    }, `Add ${scene.title}`);
  };
  const beginSceneEdit = (scene: SceneMeta) => {
    setSceneMenuId(null);
    setEditingSceneId(scene.id);
    setSceneTitleDraft(scene.title);
    setSceneDescriptionDraft(scene.description);
  };
  const finishSceneEdit = () => {
    if (!editingSceneId) return;
    const title = sceneTitleDraft.trim();
    if (!title) {
      setNotice('Scene title cannot be empty');
      return;
    }
    const sceneId = editingSceneId;
    commit((next) => {
      const scene = next.scenes.find((candidate) => candidate.id === sceneId);
      if (scene) {
        scene.title = title;
        scene.description = sceneDescriptionDraft.trim() || 'Untitled scene.';
      }
    }, `Rename ${sceneId}`);
    setEditingSceneId(null);
  };
  const moveScene = (scene: SceneMeta, direction: 'up' | 'down') => {
    const index = project.scenes.findIndex((item) => item.id === scene.id);
    const targetIndex = index + (direction === 'up' ? -1 : 1);
    if (index < 0 || targetIndex < 0 || targetIndex >= project.scenes.length) {
      setNotice('Scene is already at the edge');
      return;
    }
    commit((next) => {
      const from = next.scenes.findIndex((item) => item.id === scene.id);
      const [moved] = next.scenes.splice(from, 1);
      next.scenes.splice(from + (direction === 'up' ? -1 : 1), 0, moved);
    }, `Move ${scene.title} ${direction}`);
    setSceneMenuId(null);
  };
  const duplicateScene = (source: SceneMeta) => {
    const scene = {
      ...copy(source),
      id: nextSceneId(project.scenes),
      title: `${source.title} copy`,
      description: source.description,
    } satisfies SceneMeta;
    commit((next) => {
      next.scenes.push(scene);
      loadSceneContent(next, scene.id);
    }, `Duplicate ${source.title}`);
    setSceneMenuId(null);
  };
  const deleteScene = (scene: SceneMeta) => {
    if (project.scenes.length === 1) {
      setNotice('Keep at least one scene in the project');
      return;
    }
    const index = project.scenes.findIndex(
      (candidate) => candidate.id === scene.id,
    );
    const nextActiveId =
      scene.id === project.activeSceneId
        ? (project.scenes[index + 1]?.id ?? project.scenes[index - 1]?.id)
        : project.activeSceneId;
    commit((next) => {
      next.scenes.splice(index, 1);
      if (nextActiveId) loadSceneContent(next, nextActiveId);
    }, `Delete ${scene.title}`);
    setSceneMenuId(null);
  };
  const exportProject = useCallback(() => {
    const exportable = copy(project);
    syncActiveScene(exportable);
    const blob = new Blob([JSON.stringify(exportable, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectFileStem(project.name)}.stagehand.json`;
    link.click();
    URL.revokeObjectURL(url);
    setLastCommand('export_project()');
    setNotice('Project JSON downloaded');
  }, [project]);
  const importProject = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    void file
      .text()
      .then((contents) => {
        const imported = hydrateProject(
          JSON.parse(contents) as Partial<Project>,
        );
        projectRef.current = imported;
        commandResultsRef.current.clear();
        historyRef.current = [];
        futureRef.current = [];
        setProject(imported);
        setHistory([]);
        setFuture([]);
        setLastCommand('import_project()');
        setNotice('Project JSON imported');
      })
      .catch(() => setNotice('Import failed · expected Stagehand JSON'));
  };
  const renderWebM = useCallback(async (): Promise<Record<string, unknown>> => {
    if (renderingRef.current) return { ok: false, code: 'RENDER_IN_PROGRESS' };
    const currentProject = projectRef.current;
    const renderIssues = validateProjectState(currentProject).filter(
      (issue) => issue.severity === 'error',
    );
    if (renderIssues.length > 0) {
      setNotice(
        `${renderIssues.length} issue${renderIssues.length === 1 ? '' : 's'} need attention before rendering`,
      );
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        issues: renderIssues,
      };
    }
    const canvas = document.querySelector(
      '.stage-canvas',
    ) as HTMLCanvasElement | null;
    if (!canvas?.captureStream || !('MediaRecorder' in window)) {
      setNotice('WebM export is not supported in this browser');
      return { ok: false, code: 'UNSUPPORTED_BROWSER' };
    }
    renderingRef.current = true;
    setRendering(true);
    setPlaying(false);
    setNotice('Preparing local media for WebM render');
    const renderBase = copy(currentProject);
    syncActiveScene(renderBase);
    const sceneProjects =
      renderBase.scenes.length > 0
        ? renderBase.scenes.map((scene) => {
            const sceneProject = copy(renderBase);
            loadSceneContent(sceneProject, scene.id);
            sceneProject.currentTime = 0;
            return sceneProject;
          })
        : [renderBase];
    const totalDuration = sceneProjects.reduce(
      (total, scene) => total + scene.duration,
      0,
    );
    const sequenceAudioCues = sceneProjects.flatMap((scene, sceneIndex) => {
      const offset = sceneProjects
        .slice(0, sceneIndex)
        .reduce((total, previous) => total + previous.duration, 0);
      return scene.audioCues.map((cue) => ({
        ...cue,
        start: cue.start + offset,
        end: cue.end + offset,
      }));
    });
    const imageMap = await loadRenderableImageMap(currentProject);
    const output = document.createElement('canvas');
    output.width = renderBase.renderWidth;
    output.height = renderBase.renderHeight;
    const outputContext = output.getContext('2d');
    if (!outputContext) {
      renderingRef.current = false;
      setRendering(false);
      setNotice('Render surface could not be created');
      return { ok: false, code: 'CANVAS_UNAVAILABLE' };
    }
    const preflightIssues: MeshIssue[] = [];
    for (const scene of sceneProjects) {
      for (
        let timeMs = 0;
        timeMs <= scene.duration;
        timeMs += 1000 / currentProject.fps
      ) {
        const diagnostics = drawRenderFrame(
          outputContext,
          { ...scene, currentTime: Math.min(timeMs, scene.duration) },
          output.width,
          output.height,
          imageMap,
        );
        preflightIssues.push(...diagnostics.issues);
      }
    }
    if (preflightIssues.length > 0) {
      renderingRef.current = false;
      setRendering(false);
      setNotice('Mesh render preflight failed');
      return {
        ok: false,
        code: 'RIG_RENDER_INVALID',
        issues: preflightIssues,
      };
    }
    const canvasStream = output.captureStream(0);
    const track =
      canvasStream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
    const audioContext = 'AudioContext' in window ? new AudioContext() : null;
    let stream = canvasStream;
    let audioStream: MediaStream | null = null;
    if (audioContext && sequenceAudioCues.length > 0) {
      const audioBuffers = await loadAudioBuffers(
        audioContext,
        currentProject.assets,
      );
      const destination = audioContext.createMediaStreamDestination();
      audioStream = destination.stream;
      stream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioStream.getAudioTracks(),
      ]);
      scheduleAudioCues(
        audioContext,
        destination,
        sequenceAudioCues,
        audioContext.currentTime + 0.08,
        audioBuffers,
        currentProject.assets,
      );
      void audioContext.resume();
    }
    const chunks: Blob[] = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    let frame = 0;
    let timer = 0;
    const renderStats: {
      meshFrameCount: number;
      fallbackFrameCount: number;
      renderIssueCount: number;
      rendererIds: Set<CharacterRenderDiagnostics['renderer']>;
      firstSample?: { timeMs: number; pixels: Uint8ClampedArray };
      lastSample?: { timeMs: number; pixels: Uint8ClampedArray };
    } = {
      meshFrameCount: 0,
      fallbackFrameCount: 0,
      renderIssueCount: 0,
      rendererIds: new Set(),
    };
    return await new Promise<Record<string, unknown>>((resolve) => {
      recorder.onstop = async () => {
        window.clearInterval(timer);
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const fileName = `${projectFileStem(currentProject.name)}.webm`;
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
        stream.getTracks().forEach((track) => track.stop());
        audioStream?.getTracks().forEach((audioTrack) => audioTrack.stop());
        void audioContext?.close();
        setPlaying(false);
        renderingRef.current = false;
        setRendering(false);
        setNotice(
          `WebM downloaded · ${sceneProjects.length} scene${sceneProjects.length === 1 ? '' : 's'} rendered`,
        );
        const sampleFrameHashes = await Promise.all(
          [renderStats.firstSample, renderStats.lastSample]
            .filter(
              (
                sample,
              ): sample is {
                timeMs: number;
                pixels: Uint8ClampedArray;
              } => Boolean(sample),
            )
            .filter(
              (sample, index, samples) =>
                index === 0 || sample.timeMs !== samples[index - 1].timeMs,
            )
            .map(async (sample) => ({
              timeMs: sample.timeMs,
              pixelHash: await hashRgbaPixels(sample.pixels),
            })),
        );
        resolve({
          ok: true,
          fileName,
          sceneCount: sceneProjects.length,
          durationMs: totalDuration,
          fps: currentProject.fps,
          width: currentProject.renderWidth,
          height: currentProject.renderHeight,
          bytes: blob.size,
          renderer: renderStats.rendererIds.has('canvas-lbs-mesh-v1')
            ? 'canvas-lbs-mesh-v1'
            : renderStats.rendererIds.has('canvas-segmented-v1')
              ? 'canvas-segmented-v1'
              : 'canvas-rigid-v1',
          rendererIds: [...renderStats.rendererIds],
          meshFrameCount: renderStats.meshFrameCount,
          fallbackFrameCount: renderStats.fallbackFrameCount,
          renderIssueCount: renderStats.renderIssueCount,
          sampleFrameHashes,
        });
      };
      updateProjectView((current) => ({ ...current, currentTime: 0 }));
      setNotice(
        `Rendering ${timecode(totalDuration)} WebM · ${sceneProjects.length} scene${sceneProjects.length === 1 ? '' : 's'} · ${currentProject.fps} fps · ${currentProject.renderWidth}×${currentProject.renderHeight}`,
      );
      recorder.start();
      const drawNextFrame = () => {
        let sceneOffset = 0;
        let scene = sceneProjects[sceneProjects.length - 1];
        let localTime = scene.duration;
        for (const candidate of sceneProjects) {
          if (frame < sceneOffset + candidate.duration) {
            scene = candidate;
            localTime = frame - sceneOffset;
            break;
          }
          sceneOffset += candidate.duration;
        }
        const diagnostics = drawRenderFrame(
          outputContext,
          { ...scene, currentTime: localTime },
          output.width,
          output.height,
          imageMap,
        );
        if (diagnostics.rendererIds.includes('canvas-lbs-mesh-v1'))
          renderStats.meshFrameCount += 1;
        diagnostics.rendererIds.forEach((renderer) =>
          renderStats.rendererIds.add(renderer),
        );
        if (diagnostics.fallbackUsed) renderStats.fallbackFrameCount += 1;
        renderStats.renderIssueCount += diagnostics.issues.length;
        const pixels = outputContext.getImageData(
          0,
          0,
          output.width,
          output.height,
        ).data;
        const sample = {
          timeMs: Math.round(frame),
          pixels: new Uint8ClampedArray(pixels),
        };
        if (!renderStats.firstSample) renderStats.firstSample = sample;
        renderStats.lastSample = sample;
        track.requestFrame();
        frame += 1000 / currentProject.fps;
        if (frame > totalDuration) {
          window.clearInterval(timer);
          window.setTimeout(() => recorder.stop(), 300);
        }
      };
      drawNextFrame();
      timer = window.setInterval(drawNextFrame, 1000 / currentProject.fps);
    });
  }, [updateProjectView]);
  useEffect(() => {
    renderWebMRef.current = renderWebM;
  }, [renderWebM]);
  const tracks = useMemo(() => {
    const marksForCharacter = (characterId: string): TimelineMark[] =>
      project.keyframes
        .filter((frame) => frame.characterId === characterId)
        .map((frame) => ({
          time: frame.time,
          id: frame.id,
          kind: 'character' as const,
          characterId,
          label: `${project.characters.find((character) => character.id === characterId)?.name ?? characterId} keyframe`,
        }));
    const marksForProps: TimelineMark[] = project.propKeyframes.map(
      (frame) => ({
        time: frame.time,
        id: frame.id,
        kind: 'prop',
        assetId: frame.assetId,
        label: `${project.assets.find((asset) => asset.id === frame.assetId)?.label ?? frame.assetId} keyframe`,
      }),
    );
    const rangeFor = (times: number[]) => {
      if (times.length === 0) return { start: 0, end: project.duration };
      const start = Math.min(...times);
      const end = Math.max(...times);
      return { start, end: end > start ? end : project.duration };
    };
    const rangeForCharacter = (characterId: string) =>
      rangeFor(
        project.keyframes
          .filter((frame) => frame.characterId === characterId)
          .map((frame) => frame.time),
      );
    const eventsForKeyframes = (
      frames: Array<{ time: number; label: string }>,
    ): TimelineEvent[] => {
      const ordered = [...frames].sort((a, b) => a.time - b.time);
      return ordered
        .map((frame, index) => ({
          start: frame.time,
          end: ordered[index + 1]?.time ?? project.duration,
          label: frame.label,
        }))
        .filter((event) => event.end > event.start);
    };
    const cameraFrames = [...project.cameraKeyframes].sort(
      (a, b) => a.time - b.time,
    );
    const characterEvents = (characterId: string) =>
      eventsForKeyframes(
        project.keyframes
          .filter((frame) => frame.characterId === characterId)
          .map((frame) => ({ time: frame.time, label: poseLabel(frame.pose) })),
      );
    const propEvents = eventsForKeyframes(
      project.propKeyframes.map((frame) => ({
        time: frame.time,
        label:
          project.assets.find((asset) => asset.id === frame.assetId)?.label ??
          'Prop',
      })),
    );
    const rangeForCaptions = rangeFor(
      project.captions.flatMap((caption) => [caption.start, caption.end]),
    );
    const rangeForAudio = (kind?: AudioCueKind) =>
      rangeFor(
        project.audioCues
          .filter((cue) => !kind || cue.kind === kind)
          .flatMap((cue) => [cue.start, cue.end]),
      );
    const rangeForSfx = rangeFor(
      project.audioCues
        .filter((cue) => cue.kind !== 'music')
        .flatMap((cue) => [cue.start, cue.end]),
    );
    return [
      {
        name: 'Camera',
        color: 'blue',
        range: { start: 0, end: project.duration },
        events: eventsForKeyframes(
          cameraFrames.map((frame) => ({
            time: frame.time,
            label: frame.zoom > 1.08 ? 'Punch in' : 'Wide',
          })),
        ),
        marks: project.cameraKeyframes.map((frame) => ({
          time: frame.time,
          id: frame.id,
          kind: 'camera' as const,
          label: 'Camera keyframe',
        })),
      },
      {
        name: 'Alice',
        color: 'coral',
        range: rangeForCharacter('alice'),
        events: characterEvents('alice'),
        marks: marksForCharacter('alice'),
      },
      {
        name: 'Bob',
        color: 'teal',
        range: rangeForCharacter('bob'),
        events: characterEvents('bob'),
        marks: marksForCharacter('bob'),
      },
      {
        name: 'Props',
        color: 'violet',
        range: rangeFor(project.propKeyframes.map((frame) => frame.time)),
        events: propEvents,
        marks: marksForProps,
      },
      {
        name: 'Dialogue',
        color: 'yellow',
        range: rangeForCaptions,
        events: project.captions.map((caption) => ({
          start: caption.start,
          end: caption.end,
          label: `“${caption.text}”`,
        })),
        marks: project.captions.map((caption) => ({
          time: caption.start,
          id: caption.id,
          kind: 'cue' as const,
          label: `${caption.speaker} caption`,
        })),
      },
      ...project.skeletons.map((skeleton) => {
        const frames = project.boneKeyframes
          .filter((frame) => frame.skeletonId === skeleton.id)
          .sort((a, b) => a.time - b.time);
        return {
          name: `${skeleton.label} · bones`,
          color: skeleton.binding.method === 'mesh' ? 'violet' : 'teal',
          range: rangeFor(frames.map((frame) => frame.time)),
          events: eventsForKeyframes(
            frames.map((frame) => ({
              time: frame.time,
              label: `${frame.transforms.length} bone${frame.transforms.length === 1 ? '' : 's'}`,
            })),
          ),
          marks: frames.map((frame) => ({
            time: frame.time,
            id: frame.id,
            kind: 'cue' as const,
            label: `${skeleton.label} bone keyframe`,
          })),
        };
      }),
      {
        name: 'Music',
        color: 'violet',
        range: rangeForAudio('music'),
        events: project.audioCues
          .filter((cue) => cue.kind === 'music')
          .map((cue) => ({
            start: cue.start,
            end: cue.end,
            label: cue.label,
          })),
        marks: project.audioCues
          .filter((cue) => cue.kind === 'music')
          .map((cue) => ({
            time: cue.start,
            id: cue.id,
            kind: 'cue' as const,
            label: `${cue.label} cue`,
          })),
      },
      {
        name: 'SFX',
        color: 'yellow',
        range: rangeForSfx,
        events: project.audioCues
          .filter((cue) => cue.kind !== 'music')
          .map((cue) => ({
            start: cue.start,
            end: cue.end,
            label: cue.label,
          })),
        marks: project.audioCues
          .filter((cue) => cue.kind !== 'music')
          .map((cue) => ({
            time: cue.start,
            id: cue.id,
            kind: 'cue' as const,
            label: `${cue.label} cue`,
          })),
      },
    ];
  }, [
    project.cameraKeyframes,
    project.captions,
    project.characters,
    project.duration,
    project.audioCues,
    project.keyframes,
    project.propKeyframes,
    project.assets,
    project.skeletons,
    project.boneKeyframes,
  ]);
  const rulerTimes = useMemo(() => {
    const times = Array.from(
      { length: Math.floor(project.duration / 1000) + 1 },
      (_, index) => index * 1000,
    );
    if (times.at(-1) !== project.duration) times.push(project.duration);
    return times;
  }, [project.duration]);
  const activeSceneIndex = Math.max(
    0,
    project.scenes.findIndex((scene) => scene.id === project.activeSceneId),
  );
  const activeScene = project.scenes[activeSceneIndex] ?? blankScenes[0];
  const blankProjectActive = isBlankProject(project);
  const selectedKeyframeCount = project.keyframes.filter(
    (frame) => frame.characterId === selected.id,
  ).length;
  const cameraKeyframeCount = project.cameraKeyframes.length;
  return (
    <main
      className={`studio-shell ${viewMode === 'preview' ? 'preview-shell' : ''}`}
    >
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <Clapperboard size={17} />
          </div>
          <div>
            <h1 className="brand-name">stagehand</h1>
            <div className="brand-subtitle">
              animation studio <span>·</span> local project
            </div>
          </div>
        </div>
        <div className="project-title">
          <span className="eyebrow">PROJECT</span>
          {editingProjectName && viewMode !== 'preview' ? (
            <input
              className="project-name-input"
              ref={projectNameInputRef}
              aria-label="Project name"
              value={projectNameDraft}
              onChange={(event) => setProjectNameDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
                if (event.key === 'Escape') setEditingProjectName(false);
              }}
              onBlur={finishProjectNameEdit}
              maxLength={80}
            />
          ) : viewMode === 'preview' ? (
            <span className="project-name-button preview-project-name">
              <span className="title-name">{project.name}</span>
            </span>
          ) : (
            <button
              className="project-name-button"
              type="button"
              aria-label={`Rename project ${project.name}`}
              onClick={beginProjectNameEdit}
            >
              <span className="title-name">{project.name}</span>
              <Pencil size={13} />
            </button>
          )}
        </div>
        <div className="top-actions">
          <div className={`save-state ${saved ? '' : 'unsaved'}`}>
            <span className="status-dot" />
            {saveError
              ? 'Save failed'
              : saved
                ? `Saved${lastSavedAt ? ` ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}`
                : 'Saving…'}
          </div>
          <button
            className="preview-button"
            type="button"
            onClick={() => {
              setTopMenuOpen(false);
              if (viewMode === 'preview') {
                setViewMode('animate');
                setPlaying(false);
              } else {
                setEditingProjectName(false);
                setMobileDrawer(null);
                setViewMode('preview');
                setPanel('scenes');
                setPlaying(true);
              }
            }}
          >
            <Play size={14} />
            {viewMode === 'preview' ? 'Exit preview' : 'Preview'}
          </button>
          <button className="render-button" type="button" onClick={renderWebM}>
            <Film size={16} /> {rendering ? 'Rendering…' : 'Render'}
          </button>
          <button
            className="top-overflow-trigger"
            type="button"
            aria-label="More actions"
            aria-expanded={topMenuOpen}
            onClick={() => setTopMenuOpen((value) => !value)}
          >
            <MoreHorizontal size={18} />
          </button>
          {topMenuOpen && (
            <div className="top-overflow-menu" role="menu">
              {viewMode !== 'preview' && (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setTopMenuOpen(false);
                      void exportStill();
                    }}
                  >
                    <ImageIcon size={14} /> Export frame
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setTopMenuOpen(false);
                      importInputRef.current?.click();
                    }}
                  >
                    <Upload size={14} /> Import project
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setTopMenuOpen(false);
                      exportProject();
                    }}
                  >
                    <Save size={14} /> Export project
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setTopMenuOpen(false);
                      setDialog('templates');
                    }}
                  >
                    <Layers3 size={14} /> Templates
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setTopMenuOpen(false);
                      setDialog('settings');
                    }}
                  >
                    <Settings2 size={14} /> Settings
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={startBlankProject}
                  >
                    <RotateCcw size={14} /> New blank project
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={loadDemoProject}
                  >
                    <Clapperboard size={14} /> Load demo project
                  </button>
                </>
              )}
              <button
                className="mobile-only rail-drawer-action"
                type="button"
                role="menuitem"
                onClick={() => {
                  setMobileDrawer((value) =>
                    value === 'rail' ? null : 'rail',
                  );
                  setTopMenuOpen(false);
                }}
              >
                <Layers3 size={14} />
                {mobileDrawer === 'rail'
                  ? 'Close project drawer'
                  : 'Open project drawer'}
              </button>
              <button
                className="mobile-only"
                type="button"
                role="menuitem"
                onClick={() => {
                  setMobileDrawer((value) =>
                    value === 'inspector' ? null : 'inspector',
                  );
                  setTopMenuOpen(false);
                }}
              >
                <Settings2 size={14} />
                {mobileDrawer === 'inspector'
                  ? 'Close Inspector'
                  : 'Open Inspector'}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setTopMenuOpen(false);
                  setDialog('help');
                }}
              >
                <CircleHelp size={14} /> Help & shortcuts
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setShowSafeArea((value) => !value);
                  setTopMenuOpen(false);
                }}
              >
                <Maximize2 size={14} />
                Guides: {showSafeArea ? 'On' : 'Off'}
              </button>
            </div>
          )}
          <input
            ref={importInputRef}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            onChange={importProject}
            aria-label="Import Stagehand project JSON"
          />
        </div>
      </header>
      <div
        className={`workspace ${viewMode === 'preview' ? 'preview-workspace' : ''} ${mobileDrawer === 'rail' ? 'mobile-rail-open' : ''} ${mobileDrawer === 'inspector' ? 'mobile-inspector-open' : ''}`}
      >
        <aside className="left-rail">
          <div
            className="rail-tabs"
            role="tablist"
            aria-label="Project navigation"
          >
            <button
              className={panel === 'scenes' ? 'selected' : ''}
              onClick={() => setPanel('scenes')}
              type="button"
              role="tab"
              aria-selected={panel === 'scenes'}
              tabIndex={panel === 'scenes' ? 0 : -1}
              onKeyDown={handleTabListKeyDown}
            >
              <Layers3 size={15} />
              Scenes
            </button>
            {viewMode !== 'preview' && (
              <>
                <button
                  className={panel === 'storyboard' ? 'selected' : ''}
                  onClick={() => setPanel('storyboard')}
                  type="button"
                  role="tab"
                  aria-selected={panel === 'storyboard'}
                  tabIndex={panel === 'storyboard' ? 0 : -1}
                  onKeyDown={handleTabListKeyDown}
                >
                  <Grid2X2 size={15} />
                  Board
                </button>
                <button
                  className={panel === 'assets' ? 'selected' : ''}
                  onClick={() => setPanel('assets')}
                  type="button"
                  role="tab"
                  aria-selected={panel === 'assets'}
                  tabIndex={panel === 'assets' ? 0 : -1}
                  onKeyDown={handleTabListKeyDown}
                >
                  <FolderOpen size={15} />
                  Assets
                </button>
              </>
            )}
          </div>
          {panel === 'scenes' && (
            <div className="rail-content">
              <div className="section-label">
                <span>
                  SCENES <b>{project.scenes.length}</b>
                </span>
                <Sparkles size={13} />
              </div>
              {project.scenes.map((scene, index) => (
                <div
                  className={`scene-card ${scene.id === project.activeSceneId ? 'active' : ''}`}
                  key={scene.id}
                >
                  {editingSceneId === scene.id ? (
                    <div className="scene-editor">
                      <label>
                        Scene title
                        <input
                          value={sceneTitleDraft}
                          onChange={(event) =>
                            setSceneTitleDraft(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') finishSceneEdit();
                            if (event.key === 'Escape') setEditingSceneId(null);
                          }}
                        />
                      </label>
                      <label>
                        Description
                        <input
                          value={sceneDescriptionDraft}
                          onChange={(event) =>
                            setSceneDescriptionDraft(event.target.value)
                          }
                        />
                      </label>
                      <div className="scene-editor-actions">
                        <button
                          type="button"
                          onClick={() => setEditingSceneId(null)}
                        >
                          Cancel
                        </button>
                        <button type="button" onClick={finishSceneEdit}>
                          Done
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        className="scene-card-main"
                        type="button"
                        onClick={() =>
                          commit((next) => {
                            loadSceneContent(next, scene.id);
                          }, `Open ${scene.title}`)
                        }
                      >
                        <div className="scene-thumbnail">
                          <RenderThumbnail
                            project={{
                              ...project,
                              activeSceneId: scene.id,
                              duration: scene.duration,
                              currentTime: scene.duration / 2,
                              characters:
                                scene.characters ?? project.characters,
                              keyframes: scene.keyframes ?? project.keyframes,
                              propKeyframes:
                                scene.propKeyframes ?? project.propKeyframes,
                              cameraKeyframes:
                                scene.cameraKeyframes ??
                                project.cameraKeyframes,
                              captions: scene.captions ?? project.captions,
                              audioCues: scene.audioCues ?? project.audioCues,
                              lockedTrackIds:
                                scene.lockedTrackIds ?? project.lockedTrackIds,
                            }}
                            timeMs={scene.duration / 2}
                            className="scene-thumbnail-canvas"
                          />
                          <span className="scene-thumbnail-index">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                        </div>
                        <div className="scene-meta">
                          <strong>{scene.title}</strong>
                          <span>{timecode(scene.duration)}</span>
                        </div>
                      </button>
                      {viewMode !== 'preview' && (
                        <>
                          <button
                            className="scene-more"
                            type="button"
                            aria-label={`Actions for ${scene.title}`}
                            aria-expanded={sceneMenuId === scene.id}
                            onClick={() =>
                              setSceneMenuId((current) =>
                                current === scene.id ? null : scene.id,
                              )
                            }
                          >
                            <MoreHorizontal size={15} />
                          </button>
                          {sceneMenuId === scene.id && (
                            <div className="scene-actions">
                              <button
                                type="button"
                                onClick={() => beginSceneEdit(scene)}
                              >
                                <Pencil size={12} /> Rename
                              </button>
                              <button
                                type="button"
                                onClick={() => duplicateScene(scene)}
                              >
                                <CopyPlus size={12} /> Duplicate
                              </button>
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => moveScene(scene, 'up')}
                              >
                                <ChevronUp size={12} /> Move up
                              </button>
                              <button
                                type="button"
                                disabled={index === project.scenes.length - 1}
                                onClick={() => moveScene(scene, 'down')}
                              >
                                <ChevronDown size={12} /> Move down
                              </button>
                              <button
                                className="delete-scene-action"
                                type="button"
                                onClick={() => deleteScene(scene)}
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              ))}
              {viewMode !== 'preview' && (
                <button className="add-scene" type="button" onClick={addScene}>
                  <span>＋</span> Add scene
                </button>
              )}
            </div>
          )}
          {panel === 'storyboard' && (
            <div className="rail-content">
              <div className="section-label">
                <span>
                  BEATS <b>{project.storyboardBeats.length}</b>
                </span>
                <button
                  className="add-beat-button"
                  type="button"
                  onClick={addStoryboardBeat}
                >
                  + Beat
                </button>
              </div>
              <small className="panel-hint">
                Edit timing, then promote any beat into a new scene.
              </small>
              {project.storyboardBeats.map((beat) => {
                const active =
                  project.currentTime >= beat.startMs &&
                  project.currentTime < beat.endMs;
                return (
                  <div
                    className={`board-card ${active ? 'active' : ''}`}
                    key={beat.id}
                  >
                    {editingBeatId === beat.id ? (
                      <div className="scene-editor beat-editor">
                        <label>
                          Beat title
                          <input
                            value={beatTitleDraft}
                            onChange={(event) =>
                              setBeatTitleDraft(event.target.value)
                            }
                          />
                        </label>
                        <label>
                          Description
                          <input
                            value={beatDescriptionDraft}
                            onChange={(event) =>
                              setBeatDescriptionDraft(event.target.value)
                            }
                          />
                        </label>
                        <div className="beat-time-fields">
                          <label>
                            Start ms
                            <input
                              type="number"
                              min="0"
                              value={beatStartDraft}
                              onChange={(event) =>
                                setBeatStartDraft(event.target.value)
                              }
                            />
                          </label>
                          <label>
                            End ms
                            <input
                              type="number"
                              min="1"
                              value={beatEndDraft}
                              onChange={(event) =>
                                setBeatEndDraft(event.target.value)
                              }
                            />
                          </label>
                        </div>
                        <div className="scene-editor-actions">
                          <button
                            type="button"
                            onClick={() => setEditingBeatId(null)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => removeStoryboardBeat(beat)}
                          >
                            Remove
                          </button>
                          <button type="button" onClick={finishBeatEdit}>
                            Done
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          className="board-card-main"
                          type="button"
                          disabled={beat.startMs >= project.duration}
                          onClick={() =>
                            updateProjectView((current) => ({
                              ...current,
                              currentTime: beat.startMs,
                            }))
                          }
                          aria-label={`Select beat ${beat.index}: ${beat.title}`}
                        >
                          <span className="beat-index">{beat.index}</span>
                          <strong>{beat.title}</strong>
                          <small>{beat.description}</small>
                        </button>
                        <div className="board-actions">
                          <button
                            className="board-promote"
                            type="button"
                            disabled={beat.startMs >= project.duration}
                            onClick={() => promoteBeat(beat)}
                          >
                            Promote <ArrowUpRight size={11} />
                          </button>
                          <button
                            className="board-edit"
                            type="button"
                            onClick={() => beginBeatEdit(beat)}
                          >
                            <Pencil size={11} /> Edit
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {panel === 'assets' && (
            <div className="rail-content">
              <div className="section-label">
                <span>
                  ASSETS <b>{project.assets.length}</b>
                </span>
                <Upload size={13} />
              </div>
              <small className="panel-hint asset-hint">
                Audio library: bundled CC0 sounds plus your imported files.
              </small>
              <div className="asset-list">
                {project.assets.map((asset) => {
                  const assetStyle =
                    asset.style ?? defaultAssetStyle(asset.kind);
                  const boundCharacters = project.characters.filter(
                    (character) => character.assetId === asset.id,
                  );
                  const inScene =
                    boundCharacters.length > 0 ||
                    (asset.kind === 'background' &&
                      (asset.source === 'starter' || Boolean(asset.dataUrl))) ||
                    (asset.kind === 'prop' && Boolean(asset.dataUrl));
                  return (
                    <div className="asset-row" key={asset.id}>
                      <span
                        className={`asset-swatch asset-${asset.kind.replace('rigged-character', 'rig')}`}
                        style={
                          asset.dataUrl
                            ? {
                                backgroundImage: `url(${asset.dataUrl})`,
                                backgroundPosition: 'center',
                                backgroundSize: 'cover',
                                filter: assetTreatmentFilter(asset),
                              }
                            : undefined
                        }
                      />
                      <span className="asset-copy">
                        <strong>{asset.label}</strong>
                        {asset.reviewStatus && asset.source === 'generated' && (
                          <em
                            className={`asset-review-status ${asset.reviewStatus}`}
                          >
                            {asset.reviewStatus.replace('-', ' ')}
                          </em>
                        )}
                        {asset.kind === 'rigged-character' && asset.dataUrl && (
                          <div className="asset-review-card">
                            <span>
                              {asset.assetPackage
                                ? `Package v${asset.assetPackage.version} · ${asset.assetPackage.parts.length} parts`
                                : 'Package not attached'}
                            </span>
                            <small>
                              {asset.dimensions
                                ? `${asset.dimensions.width}×${asset.dimensions.height}`
                                : 'dimensions pending'}{' '}
                              · alpha {asset.transparencyStatus ?? 'unknown'} ·{' '}
                              {asset.provenance?.license ??
                                'license not recorded'}
                            </small>
                            {asset.packageIssues?.map((issue) => (
                              <small className="review-warning" key={issue}>
                                {issue}
                              </small>
                            ))}
                            {asset.reviewStatus !== 'approved' && (
                              <span className="asset-review-actions">
                                <button
                                  type="button"
                                  onClick={() => reviewAsset(asset, true)}
                                >
                                  Approve asset
                                </button>
                                <button
                                  type="button"
                                  onClick={() => reviewAsset(asset, false)}
                                >
                                  Reject
                                </button>
                              </span>
                            )}
                          </div>
                        )}
                        <small>
                          {asset.frameLayout === 'four-column' ||
                          asset.frameCount === 4
                            ? '4-pose sheet'
                            : assetKindLabel(asset.kind)}{' '}
                          · {asset.source} ·{' '}
                          <span
                            className={`asset-placement ${inScene ? 'is-in-scene' : ''}`}
                          >
                            {boundCharacters.length > 0
                              ? `bound · ${boundCharacters.map((character) => character.name).join(', ')}`
                              : inScene
                                ? 'on stage'
                                : 'library'}
                          </span>
                        </small>
                        <div className="asset-style-summary">
                          <span>
                            {assetStyle.role} · {assetStyle.treatment}
                          </span>
                          <button
                            type="button"
                            aria-expanded={expandedAssetStyleId === asset.id}
                            aria-label={`Edit style for ${asset.label}`}
                            onClick={() =>
                              setExpandedAssetStyleId((current) =>
                                current === asset.id ? null : asset.id,
                              )
                            }
                          >
                            Style
                          </button>
                        </div>
                        <div
                          className="asset-palette"
                          aria-label={`${asset.label} palette: ${assetStyle.palette.join(', ')}`}
                        >
                          {assetStyle.palette.slice(0, 4).map((color) => (
                            <i
                              key={`${asset.id}-${color}`}
                              title={color}
                              style={{ background: paletteColor(color) }}
                            />
                          ))}
                          <span>{assetStyle.palette.join(' · ')}</span>
                        </div>
                        {asset.kind === 'audio' && (
                          <div className="asset-motion-actions audio-library-actions">
                            <span>
                              {asset.mediaDurationMs
                                ? timecode(asset.mediaDurationMs)
                                : 'duration unknown'}
                              {asset.loopable ? ' · loop' : ''}
                            </span>
                            <button
                              type="button"
                              disabled={!asset.dataUrl}
                              onClick={() => previewAudioAsset(asset)}
                            >
                              <Play size={10} /> Preview
                            </button>
                            <small>
                              {asset.provenance?.license ?? 'user/import'}
                            </small>
                          </div>
                        )}
                        {asset.kind === 'rigged-character' && asset.dataUrl && (
                          <label className="asset-bind-control">
                            <span>Rig binding</span>
                            <select
                              aria-label={`Bind ${asset.label} to rig`}
                              value={
                                project.characters.find(
                                  (character) => character.assetId === asset.id,
                                )?.id ?? ''
                              }
                              onChange={(event) =>
                                bindAssetToCharacter(asset, event.target.value)
                              }
                            >
                              <option value="">Unbound</option>
                              {project.characters.map((character) => (
                                <option value={character.id} key={character.id}>
                                  {character.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        {asset.kind === 'prop' && asset.dataUrl && (
                          <>
                            <div className="asset-motion-actions">
                              <span>Motion</span>
                              <button
                                type="button"
                                onClick={() => applyPropPreset(asset, 'pop-in')}
                              >
                                Pop in
                              </button>
                              <button
                                type="button"
                                onClick={() => applyPropPreset(asset, 'nudge')}
                              >
                                Nudge
                              </button>
                            </div>
                            {(() => {
                              const prop = evaluatedProps.find(
                                (item) => item.assetId === asset.id,
                              );
                              if (!prop) return null;
                              return (
                                <div className="asset-transform-editor">
                                  <span>At playhead</span>
                                  <label>
                                    X
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.1"
                                      aria-label={`X for ${asset.label}`}
                                      value={prop.x.toFixed(1)}
                                      onChange={(event) =>
                                        updatePropTransform(
                                          asset,
                                          'x',
                                          Number(event.target.value),
                                        )
                                      }
                                    />
                                    <b>%</b>
                                  </label>
                                  <label>
                                    Y
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.1"
                                      aria-label={`Y for ${asset.label}`}
                                      value={prop.y.toFixed(1)}
                                      onChange={(event) =>
                                        updatePropTransform(
                                          asset,
                                          'y',
                                          Number(event.target.value),
                                        )
                                      }
                                    />
                                    <b>%</b>
                                  </label>
                                  <label>
                                    Scale
                                    <input
                                      type="number"
                                      min="0.25"
                                      max="2.5"
                                      step="0.05"
                                      aria-label={`Scale for ${asset.label}`}
                                      value={prop.scale.toFixed(2)}
                                      onChange={(event) =>
                                        updatePropTransform(
                                          asset,
                                          'scale',
                                          Number(event.target.value),
                                        )
                                      }
                                    />
                                    <b>×</b>
                                  </label>
                                  <label>
                                    Rot
                                    <input
                                      type="number"
                                      min="-180"
                                      max="180"
                                      step="1"
                                      aria-label={`Rotation for ${asset.label}`}
                                      value={prop.rotation.toFixed(0)}
                                      onChange={(event) =>
                                        updatePropTransform(
                                          asset,
                                          'rotation',
                                          Number(event.target.value),
                                        )
                                      }
                                    />
                                    <b>°</b>
                                  </label>
                                </div>
                              );
                            })()}
                          </>
                        )}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${asset.label}`}
                        title={`Remove ${asset.label}`}
                        onClick={() => removeAsset(asset)}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="asset-add-label">ADD PLACEHOLDER</div>
              <div className="asset-add-grid">
                {(
                  [
                    'rigged-character',
                    'background',
                    'prop',
                    'audio',
                  ] as AssetKind[]
                ).map((kind) => (
                  <button
                    type="button"
                    key={kind}
                    onClick={() => addAsset(kind)}
                  >
                    + {assetKindLabel(kind)}
                  </button>
                ))}
              </div>
              <div className="asset-import-grid">
                <button
                  type="button"
                  onClick={() => {
                    setAssetImportKind('rigged-character');
                    setAssetImportMode('single');
                    assetImportInputRef.current?.click();
                  }}
                >
                  <Upload size={11} /> Import character art
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAssetImportKind('rigged-character');
                    setAssetImportMode('pose-sheet');
                    assetImportInputRef.current?.click();
                  }}
                >
                  <Layers3 size={11} /> Import pose sheet · auto
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAssetImportKind('background');
                    assetImportInputRef.current?.click();
                  }}
                >
                  <Upload size={11} /> Import background
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAssetImportKind('prop');
                    assetImportInputRef.current?.click();
                  }}
                >
                  <Upload size={11} /> Import prop
                </button>
                <button
                  type="button"
                  onClick={() => audioImportInputRef.current?.click()}
                >
                  <Volume2 size={11} /> Import audio
                </button>
              </div>
              <small className="panel-hint asset-hint">
                Import character art to bind it to the selected rig; poses and
                keyframes stay editable. Pose-sheet imports auto-detect a wide
                four-column image and fall back to single art when needed.
              </small>
              <input
                ref={assetImportInputRef}
                className="visually-hidden"
                type="file"
                accept="image/*"
                onChange={importAsset}
                aria-label="Import image asset"
              />
              <input
                ref={audioImportInputRef}
                className="visually-hidden"
                type="file"
                accept="audio/*"
                onChange={importAudioAsset}
                aria-label="Import audio asset"
              />
            </div>
          )}
        </aside>
        <section className="main-column">
          <div className="modebar">
            <div className="mode-tabs" role="tablist" aria-label="Editor mode">
              <button
                className={viewMode === 'animate' ? 'active' : ''}
                type="button"
                role="tab"
                aria-selected={viewMode === 'animate'}
                tabIndex={viewMode === 'animate' ? 0 : -1}
                onKeyDown={handleTabListKeyDown}
                onClick={() => setViewMode('animate')}
              >
                <SquareDashedMousePointer size={14} /> Animate
              </button>
              <button
                className={viewMode === 'storyboard' ? 'active' : ''}
                type="button"
                role="tab"
                aria-selected={viewMode === 'storyboard'}
                tabIndex={viewMode === 'storyboard' ? 0 : -1}
                onKeyDown={handleTabListKeyDown}
                onClick={() => {
                  setViewMode('storyboard');
                  setPanel('storyboard');
                }}
              >
                <Grid2X2 size={14} /> Storyboard
              </button>
            </div>
            <div className="scene-tools">
              <IconButton
                label="Select tool"
                active={stageTool === 'select'}
                onClick={() => setStageTool('select')}
              >
                <MousePointer2 size={15} />
              </IconButton>
              <IconButton
                label="Pan tool"
                active={stageTool === 'pan'}
                onClick={() => setStageTool('pan')}
              >
                <Hand size={15} />
              </IconButton>
              <span className="divider" />
              <IconButton
                label="Zoom out"
                onClick={() =>
                  setViewportZoom((value) => Math.max(75, value - 10))
                }
              >
                −
              </IconButton>
              <span className="zoom-readout">{viewportZoom}%</span>
              <IconButton
                label="Zoom in"
                onClick={() =>
                  setViewportZoom((value) => Math.min(150, value + 10))
                }
              >
                <ZoomIn size={15} />
              </IconButton>
              <IconButton
                label="Fit stage"
                onClick={() => {
                  setViewportZoom(100);
                  setViewportPan({ x: 0, y: 0 });
                }}
              >
                <Maximize2 size={15} />
              </IconButton>
              <button
                className="compact-panel-trigger mobile-only"
                type="button"
                aria-label={
                  mobileDrawer === 'rail'
                    ? 'Close project panels'
                    : 'Open project panels'
                }
                onClick={() =>
                  setMobileDrawer((value) => (value === 'rail' ? null : 'rail'))
                }
              >
                <Layers3 size={14} />
                {mobileDrawer === 'rail' ? 'Close panels' : 'Panels'}
              </button>
              <button
                className="compact-inspector-trigger"
                type="button"
                aria-label={
                  mobileDrawer === 'inspector'
                    ? 'Close Inspector'
                    : 'Open Inspector'
                }
                onClick={() =>
                  setMobileDrawer((value) =>
                    value === 'inspector' ? null : 'inspector',
                  )
                }
              >
                <Settings2 size={14} />
                {mobileDrawer === 'inspector' ? 'Close Inspector' : 'Inspector'}
              </button>
            </div>
          </div>
          <div
            className={`stage-wrap ${viewMode}-mode`}
            tabIndex={-1}
            aria-label="Animation stage"
          >
            {viewMode === 'storyboard' && (
              <div className="mode-banner">
                <span>STORYBOARD</span>
                <strong>
                  {project.storyboardBeats.length} beats · one awkward arc
                </strong>
                <small>Review the beat plan before promoting timing.</small>
              </div>
            )}
            {viewMode === 'preview' && (
              <div className="mode-banner preview-banner">
                <span>PREVIEW PLAYBACK</span>
                <strong>
                  {playing
                    ? `Playing Scene ${String(activeSceneIndex + 1).padStart(2, '0')} — ${activeScene.title}`
                    : 'Paused at ' + timecode(project.currentTime)}
                </strong>
                <small>
                  {project.scenes.length > 1
                    ? `Reviewing ${project.scenes.length} scenes before export.`
                    : 'Review this scene before export.'}
                </small>
              </div>
            )}
            {viewMode === 'storyboard' && (
              <section
                className="storyboard-mode-grid"
                aria-label="Storyboard beat board"
              >
                <div className="storyboard-grid-heading">
                  <span>BEAT BOARD</span>
                  <strong>Block the awkward moment</strong>
                  <small>Click a beat to move the playhead.</small>
                </div>
                <div className="storyboard-cards">
                  {project.storyboardBeats.map((beat) => {
                    const active =
                      project.currentTime >= beat.startMs &&
                      project.currentTime <= beat.endMs;
                    return (
                      <button
                        className={`storyboard-beat ${active ? 'active' : ''}`}
                        type="button"
                        key={beat.id}
                        onClick={() =>
                          updateProjectView((current) => ({
                            ...current,
                            currentTime: beat.startMs,
                          }))
                        }
                        aria-label={`Go to beat ${beat.index}: ${beat.title}`}
                      >
                        <span className="storyboard-thumb">
                          <RenderThumbnail
                            project={project}
                            timeMs={(beat.startMs + beat.endMs) / 2}
                            className="storyboard-thumb-canvas"
                          />
                          <span className="storyboard-thumb-index">
                            {beat.index}
                          </span>
                        </span>
                        <span className="storyboard-beat-copy">
                          <strong>{beat.title}</strong>
                          <small>{beat.description}</small>
                          <em>
                            {timecode(beat.startMs)} — {timecode(beat.endMs)}
                          </em>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <small className="storyboard-grid-hint">
                  Edit titles and timing in the Board rail · Promote a beat to
                  make a trimmed scene.
                </small>
              </section>
            )}
            <div className="stage-header">
              <span className="stage-scene-name">{activeScene.title}</span>
            </div>
            <div className="canvas-stage-area">
              <div
                className={`canvas-frame ${showSafeArea ? 'safe-area-visible' : ''} ${stageTool === 'pan' ? 'pan-mode' : ''}`}
                onPointerDown={(event) => {
                  if (stageTool !== 'pan') return;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  panStartRef.current = {
                    x: event.clientX,
                    y: event.clientY,
                    originX: viewportPan.x,
                    originY: viewportPan.y,
                  };
                }}
                onPointerMove={(event) => {
                  const start = panStartRef.current;
                  if (!start) return;
                  setViewportPan({
                    x: start.originX + event.clientX - start.x,
                    y: start.originY + event.clientY - start.y,
                  });
                }}
                onPointerUp={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId))
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  panStartRef.current = null;
                }}
                onPointerCancel={() => {
                  panStartRef.current = null;
                }}
              >
                <div
                  className="canvas-viewport"
                  style={{
                    transform: `translate(${viewportPan.x}px, ${viewportPan.y}px) scale(${viewportZoom / 100})`,
                  }}
                >
                  <StageCanvas
                    project={project}
                    showSkeleton={showSkeleton}
                    showAlphaMask={showAlphaMask}
                    showMeshWireframe={showMeshWireframe}
                    isolatedPartId={isolatedPartId}
                    interactionMode={
                      viewMode === 'preview' ? 'preview' : stageTool
                    }
                    onSelect={(id) =>
                      updateProjectView((current) => ({
                        ...current,
                        selectedId: id,
                      }))
                    }
                  />
                  {blankProjectActive && viewMode !== 'preview' && (
                    <div className="canvas-empty-state">
                      <span className="canvas-empty-icon" aria-hidden="true">
                        <SquareDashedMousePointer size={20} />
                      </span>
                      <strong>Blank scene</strong>
                      <p>
                        Build with WebMCP or add artwork to either open actor
                        slot.
                      </p>
                      <div className="canvas-empty-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setPanel('assets');
                            setMobileDrawer('rail');
                          }}
                        >
                          Open assets
                        </button>
                        <button type="button" onClick={loadDemoProject}>
                          Load demo
                        </button>
                      </div>
                    </div>
                  )}
                  {activeCaption && (
                    <div className="canvas-caption">
                      <span>{activeCaption.speaker}</span>
                      {activeCaption.text}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="timeline">
            {viewMode === 'preview' && (
              <div className="preview-transport">
                <div className="preview-transport-meta">
                  <IconButton
                    label={playing ? 'Pause preview' : 'Play preview'}
                    onClick={() => setPlaying((value) => !value)}
                    active
                  >
                    {playing ? (
                      <Pause size={15} />
                    ) : (
                      <Play size={15} fill="currentColor" />
                    )}
                  </IconButton>
                  <span className="timecode">
                    {timecode(project.currentTime)}{' '}
                    <small>/ {timecode(project.duration)}</small>
                  </span>
                  <span className="preview-transport-scene">
                    {activeScene.title}
                  </span>
                  <span className="preview-timing-note">
                    Review playback · scene timing
                  </span>
                </div>
                <input
                  className="preview-scrubber"
                  type="range"
                  min="0"
                  max={project.duration}
                  step="83.33"
                  value={project.currentTime}
                  aria-label="Preview scrubber"
                  onChange={(event) =>
                    updateProjectView((current) => ({
                      ...current,
                      currentTime: Number(event.target.value),
                    }))
                  }
                />
              </div>
            )}
            <div className="timeline-toolbar">
              <div className="play-controls">
                <IconButton
                  label={playing ? 'Pause' : 'Play'}
                  onClick={() => setPlaying((value) => !value)}
                  active
                >
                  {playing ? (
                    <Pause size={15} />
                  ) : (
                    <Play size={15} fill="currentColor" />
                  )}
                </IconButton>
                <IconButton
                  label="Step back"
                  onClick={() =>
                    updateProjectView((current) => ({
                      ...current,
                      currentTime: Math.max(0, current.currentTime - 83.33),
                    }))
                  }
                >
                  <ChevronLeft size={14} />
                </IconButton>
                <IconButton
                  label="Step forward"
                  onClick={() =>
                    updateProjectView((current) => ({
                      ...current,
                      currentTime: Math.min(
                        current.duration,
                        current.currentTime + 83.33,
                      ),
                    }))
                  }
                >
                  <ChevronRight size={14} />
                </IconButton>
                <span className="timecode">
                  {timecode(project.currentTime)}{' '}
                  <small>/ {timecode(project.duration)}</small>
                </span>
                <label className="duration-control">
                  <span>Duration</span>
                  <input
                    key={project.duration}
                    type="number"
                    min="0.5"
                    max="60"
                    step="0.1"
                    aria-label="Scene duration seconds"
                    defaultValue={(project.duration / 1000).toFixed(2)}
                    onBlur={(event) => updateSceneDuration(event.target.value)}
                  />
                  <em>s</em>
                </label>
                <div
                  className="retime-controls"
                  aria-label="Scene speed controls"
                >
                  <span>Speed</span>
                  <button
                    type="button"
                    title="Slow the scene to 80 percent speed"
                    onClick={() => retimeSceneBySpeed(0.8)}
                  >
                    0.8×
                  </button>
                  <button
                    type="button"
                    title="Speed the scene to 125 percent"
                    onClick={() => retimeSceneBySpeed(1.25)}
                  >
                    1.25×
                  </button>
                </div>
                <span className="timeline-hint">
                  {showTimelineDetails
                    ? 'Drag keyframes · click to jump'
                    : 'Click a clip to jump'}
                </span>
              </div>
              <div className="timeline-actions">
                <span className="timeline-selection-context">
                  {selected.name} selected
                </span>
                <button
                  className="timeline-details-toggle"
                  type="button"
                  aria-pressed={showTimelineDetails}
                  onClick={() => setShowTimelineDetails((value) => !value)}
                  title="Show or hide raw keyframe controls"
                >
                  {showTimelineDetails ? 'Hide details' : 'Show details'}
                </button>
                <button
                  type="button"
                  onClick={addKeyframe}
                  title={`Add ${selected.name} keyframe at ${timecode(project.currentTime)}`}
                >
                  <Sparkles size={14} /> Add keyframe
                </button>
                <button
                  type="button"
                  onClick={splitAtPlayhead}
                  disabled={
                    project.currentTime <= 0 ||
                    project.currentTime >= project.duration
                  }
                  title="Split the active scene at the playhead"
                >
                  <Scissors size={14} /> Split
                </button>
                <button
                  type="button"
                  onClick={toggleTrackLock}
                  aria-pressed={isTrackLocked(project, selected.id)}
                  title={
                    isTrackLocked(project, selected.id)
                      ? 'Unlock selected character track'
                      : 'Lock selected character track'
                  }
                >
                  <Lock size={14} />{' '}
                  {isTrackLocked(project, selected.id)
                    ? `Unlock ${selected.name}`
                    : `Lock ${selected.name}`}
                </button>
              </div>
            </div>
            <div className="timeline-grid">
              <div className="track-labels">
                {tracks.map((track) => (
                  <div className="track-label" key={track.name}>
                    <span className={`track-icon ${track.color}`}>
                      {track.name === 'Camera'
                        ? '◉'
                        : track.name === 'Dialogue'
                          ? 'T'
                          : track.name === 'Music'
                            ? '♫'
                            : track.name === 'SFX'
                              ? '⌁'
                              : '✦'}
                    </span>
                    <span>{track.name}</span>
                  </div>
                ))}
              </div>
              <div className="track-area">
                <div className="ruler">
                  {rulerTimes.map((time) => (
                    <span
                      key={time}
                      style={{
                        left: `${(time / project.duration) * 100}%`,
                      }}
                    >
                      {(time / 1000).toFixed(time === project.duration ? 2 : 1)}
                    </span>
                  ))}
                </div>
                {tracks.map((track) => (
                  <div className="track-row" key={track.name}>
                    <div
                      className={`clip clip-${track.color}`}
                      style={{
                        left: `${(track.range.start / project.duration) * 100}%`,
                        width: `${((track.range.end - track.range.start) / project.duration) * 100}%`,
                      }}
                    >
                      {track.events.map((event, index) => {
                        const trackSpan = Math.max(
                          1,
                          track.range.end - track.range.start,
                        );
                        const left =
                          ((event.start - track.range.start) / trackSpan) * 100;
                        const width =
                          ((event.end - event.start) / trackSpan) * 100;
                        return (
                          <span
                            className="timeline-event"
                            key={`${track.name}-event-${event.start}-${index}`}
                            style={{
                              left: `${Math.max(0, left)}%`,
                              width: `${Math.max(4, Math.min(100, width))}%`,
                            }}
                            title={`${event.label} · ${timecode(event.start)}–${timecode(event.end)}`}
                          >
                            {event.label}
                          </span>
                        );
                      })}
                    </div>
                    {showTimelineDetails &&
                      track.marks.map((mark, index) => (
                        <button
                          type="button"
                          className={`key key-${track.color} ${mark.kind !== 'cue' ? 'draggable-key' : ''}`}
                          style={{
                            left: `${(mark.time / project.duration) * 100}%`,
                          }}
                          key={`${track.name}-${mark.id}-${index}`}
                          aria-label={`${mark.label} at ${timecode(mark.time)}. ${mark.kind === 'cue' ? 'Click to move the playhead.' : 'Drag to retime.'}`}
                          title={`${mark.label} · ${timecode(mark.time)} · ${mark.kind === 'cue' ? 'click to jump' : 'drag to retime'}`}
                          onPointerDown={(event) =>
                            startTimelineDrag(event, mark)
                          }
                          onPointerMove={moveTimelineDrag}
                          onPointerUp={finishTimelineDrag}
                          onPointerCancel={finishTimelineDrag}
                          onClick={() => {
                            if (suppressTimelineClickRef.current) {
                              suppressTimelineClickRef.current = false;
                              return;
                            }
                            updateProjectView((current) => ({
                              ...current,
                              currentTime: mark.time,
                            }));
                          }}
                        />
                      ))}
                  </div>
                ))}
                <div className="playhead" style={{ left: `${ratio * 100}%` }}>
                  <span />
                </div>
                <input
                  className="scrubber"
                  type="range"
                  min="0"
                  max={project.duration}
                  step="83.33"
                  value={project.currentTime}
                  aria-label="Timeline playhead"
                  onChange={(e) =>
                    updateProjectView((current) => ({
                      ...current,
                      currentTime: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </section>
        <aside
          className={`inspector ${panel === 'assets' ? 'asset-context-inspector' : ''}`}
        >
          {panel === 'assets' && inspectorAsset && (
            <div className="asset-context-panel">
              <div className="inspector-header">
                <span>ASSET INSPECTOR</span>
                <div className="inspector-header-actions">
                  <FolderOpen size={14} />
                  <button
                    className="inspector-close-button"
                    type="button"
                    aria-label="Close Inspector drawer"
                    onClick={() => setMobileDrawer(null)}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div className="asset-context-heading">
                <span
                  className={`asset-context-swatch asset-${inspectorAsset.kind.replace('rigged-character', 'rig')}`}
                  style={
                    inspectorAsset.dataUrl
                      ? {
                          backgroundImage: `url(${inspectorAsset.dataUrl})`,
                          backgroundPosition: 'center',
                          backgroundSize: 'cover',
                          filter: assetTreatmentFilter(inspectorAsset),
                        }
                      : undefined
                  }
                />
                <div>
                  <strong>{inspectorAsset.label}</strong>
                  <span>
                    {assetKindLabel(inspectorAsset.kind)} ·{' '}
                    {inspectorAsset.source}
                  </span>
                </div>
              </div>
              <div className="asset-context-section">
                <div className="inspector-label">
                  <span>PLACEMENT</span>
                  <span>
                    {inspectorAsset.kind === 'rigged-character'
                      ? project.characters.some(
                          (character) =>
                            character.assetId === inspectorAsset.id,
                        )
                        ? 'bound'
                        : 'unbound'
                      : inspectorAsset.dataUrl
                        ? 'on stage'
                        : 'library'}
                  </span>
                </div>
                <p>
                  {inspectorAsset.kind === 'rigged-character'
                    ? project.characters
                        .filter(
                          (character) =>
                            character.assetId === inspectorAsset.id,
                        )
                        .map((character) => character.name)
                        .join(', ') || 'Available for rig binding.'
                    : (inspectorAsset.brief ??
                      'Reusable visual asset for the current project.')}
                </p>
              </div>
              <div className="asset-context-section">
                <div className="inspector-label">
                  <span>STYLE</span>
                  <span>
                    {
                      (
                        inspectorAsset.style ??
                        defaultAssetStyle(inspectorAsset.kind)
                      ).treatment
                    }
                  </span>
                </div>
                <div className="asset-context-style">
                  <span>
                    {
                      (
                        inspectorAsset.style ??
                        defaultAssetStyle(inspectorAsset.kind)
                      ).role
                    }
                  </span>
                  <span>
                    {
                      (
                        inspectorAsset.style ??
                        defaultAssetStyle(inspectorAsset.kind)
                      ).silhouette
                    }{' '}
                    silhouette
                  </span>
                </div>
                <div
                  className="asset-context-palette"
                  aria-label={`${inspectorAsset.label} inspector palette`}
                >
                  {(
                    inspectorAsset.style ??
                    defaultAssetStyle(inspectorAsset.kind)
                  ).palette.map((color) => (
                    <span
                      key={`${inspectorAsset.id}-inspector-${color}`}
                      title={color}
                      style={{ background: paletteColor(color) }}
                    />
                  ))}
                </div>
                <button
                  className="asset-context-edit"
                  type="button"
                  onClick={() =>
                    setExpandedAssetStyleId((current) =>
                      current === inspectorAsset.id ? null : inspectorAsset.id,
                    )
                  }
                >
                  {expandedAssetStyleId === inspectorAsset.id
                    ? 'Close style editor'
                    : 'Edit style'}{' '}
                  <ArrowUpRight size={12} />
                </button>
                {expandedAssetStyleId === inspectorAsset.id &&
                  inspectorAssetStyle && (
                    <div className="asset-context-style-editor">
                      <label>
                        Role
                        <select
                          aria-label={`Role for ${inspectorAsset.label}`}
                          value={inspectorAssetStyle.role}
                          onChange={(event) =>
                            updateAssetStyle(inspectorAsset, {
                              role: event.target.value as AssetRole,
                            })
                          }
                        >
                          <option value="hero">Hero</option>
                          <option value="support">Support</option>
                          <option value="environment">Environment</option>
                          <option value="accent">Accent</option>
                        </select>
                      </label>
                      <label>
                        Treatment
                        <select
                          aria-label={`Treatment for ${inspectorAsset.label}`}
                          value={inspectorAssetStyle.treatment}
                          onChange={(event) =>
                            updateAssetStyle(inspectorAsset, {
                              treatment: event.target.value as AssetTreatment,
                            })
                          }
                        >
                          <option value="paper">Paper</option>
                          <option value="inked">Inked</option>
                          <option value="flat-color">Flat color</option>
                          <option value="photo">Photo</option>
                        </select>
                      </label>
                      <label>
                        Silhouette
                        <select
                          aria-label={`Silhouette for ${inspectorAsset.label}`}
                          value={inspectorAssetStyle.silhouette}
                          onChange={(event) =>
                            updateAssetStyle(inspectorAsset, {
                              silhouette: event.target.value as AssetSilhouette,
                            })
                          }
                        >
                          <option value="clear">Clear</option>
                          <option value="detailed">Detailed</option>
                        </select>
                      </label>
                      <label className="asset-style-palette">
                        Palette
                        <input
                          aria-label={`Palette for ${inspectorAsset.label}`}
                          value={inspectorAssetStyle.palette.join(', ')}
                          onChange={(event) => {
                            const palette = event.target.value
                              .split(',')
                              .map((value) => value.trim())
                              .filter(Boolean);
                            if (palette.length > 0)
                              updateAssetStyle(inspectorAsset, { palette });
                          }}
                        />
                      </label>
                      <label className="asset-style-notes">
                        Direction
                        <textarea
                          aria-label={`Style direction for ${inspectorAsset.label}`}
                          value={inspectorAssetStyle.notes}
                          rows={3}
                          onChange={(event) =>
                            updateAssetStyle(inspectorAsset, {
                              notes: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className="asset-context-brief">
                        Brief
                        <textarea
                          aria-label={`Brief for ${inspectorAsset.label}`}
                          value={
                            assetBriefDrafts[inspectorAsset.id] ??
                            inspectorAsset.brief ??
                            defaultAssetBrief(inspectorAsset.kind)
                          }
                          onChange={(event) =>
                            setAssetBriefDrafts((drafts) => ({
                              ...drafts,
                              [inspectorAsset.id]: event.target.value,
                            }))
                          }
                          onBlur={(event) =>
                            updateAssetBrief(inspectorAsset, event.target.value)
                          }
                          rows={3}
                        />
                      </label>
                    </div>
                  )}
              </div>
              <small className="asset-context-help">
                Asset identity and art direction live here. Motion and rig
                controls return when you select Scenes.
              </small>
            </div>
          )}
          <div className="inspector-header">
            <span>INSPECTOR</span>
            <div className="inspector-header-actions">
              <Settings2 size={14} />
              <button
                className="inspector-close-button"
                type="button"
                aria-label="Close Inspector drawer"
                onClick={() => setMobileDrawer(null)}
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="selection-card">
            <div
              className={`selection-avatar ${selected.id === 'alice' ? 'alice-avatar' : 'bob-avatar'}`}
            >
              {selected.name[0]}
            </div>
            <div>
              <strong>{selected.name}</strong>
              <span>
                Character · rigged
                {isTrackLocked(project, selected.id) ? ' · track locked' : ''}
              </span>
            </div>
            <select
              className="character-select"
              aria-label="Select character"
              value={project.selectedId}
              onChange={(event) =>
                commit((next) => {
                  next.selectedId = event.target.value;
                }, `Select ${event.target.value}`)
              }
            >
              {project.characters.map((character) => (
                <option value={character.id} key={character.id}>
                  {character.name}
                </option>
              ))}
            </select>
          </div>
          <details className="inspector-section" open>
            <summary className="inspector-label">
              <span>TRANSFORM</span>
              <span>local</span>
            </summary>
            <div className="field-row">
              <label>
                X{' '}
                <input
                  type="number"
                  aria-label={`${selected.name} X position`}
                  value={selected.x}
                  onChange={(e) => updateSelected('x', Number(e.target.value))}
                />
                <b>%</b>
              </label>
              <label>
                Y{' '}
                <input
                  type="number"
                  aria-label={`${selected.name} Y position`}
                  value={selected.y}
                  onChange={(e) => updateSelected('y', Number(e.target.value))}
                />
                <b>%</b>
              </label>
            </div>
            <div className="field-row">
              <label>
                Rotation{' '}
                <input
                  type="number"
                  aria-label={`${selected.name} rotation`}
                  value={selected.rotation}
                  onChange={(e) =>
                    updateSelected('rotation', Number(e.target.value))
                  }
                />
                <b>°</b>
              </label>
              <label>
                Opacity{' '}
                <input
                  type="number"
                  aria-label={`${selected.name} opacity`}
                  value="100"
                  readOnly
                />
                <b>%</b>
              </label>
            </div>
            <small className="transform-help">
              Move the selected character in the scene. Changes are
              keyframe-ready and undoable. {selectedKeyframeCount} keyframes on
              this rig.
            </small>
          </details>
          <details className="inspector-section camera-editor" open>
            <summary className="inspector-label">
              <span>CAMERA</span>
              <span>{cameraKeyframeCount} keyframes</span>
            </summary>
            <div className="field-row">
              <label>
                Zoom
                <input
                  type="number"
                  min="0.75"
                  max="1.8"
                  step="0.01"
                  aria-label="Camera zoom"
                  value={camera.zoom.toFixed(2)}
                  onChange={(event) =>
                    updateCamera('zoom', Number(event.target.value))
                  }
                />
                <b>×</b>
              </label>
              <label>
                Pan X
                <input
                  type="number"
                  min="-25"
                  max="25"
                  step="1"
                  aria-label="Camera pan X"
                  value={camera.panX.toFixed(0)}
                  onChange={(event) =>
                    updateCamera('panX', Number(event.target.value))
                  }
                />
                <b>%</b>
              </label>
            </div>
            <div className="field-row">
              <label>
                Pan Y
                <input
                  type="number"
                  min="-25"
                  max="25"
                  step="1"
                  aria-label="Camera pan Y"
                  value={camera.panY.toFixed(0)}
                  onChange={(event) =>
                    updateCamera('panY', Number(event.target.value))
                  }
                />
                <b>%</b>
              </label>
              <label>
                Tilt
                <input
                  type="number"
                  min="-8"
                  max="8"
                  step="1"
                  aria-label="Camera rotation"
                  value={camera.rotation.toFixed(0)}
                  onChange={(event) =>
                    updateCamera('rotation', Number(event.target.value))
                  }
                />
                <b>°</b>
              </label>
            </div>
            <div className="camera-actions">
              <button type="button" onClick={addCameraKeyframe}>
                <Sparkles size={12} /> Keyframe camera
              </button>
              <button type="button" onClick={applyReactionCut}>
                <WandSparkles size={12} /> Reaction cut
              </button>
            </div>
            <small className="transform-help">
              Framing is evaluated with the same clock as character motion and
              render.
            </small>
          </details>
          <div className="inspector-section">
            <div className="inspector-label">
              <span>MOTION</span>
              <span className="motion-preset-actions">
                <button
                  type="button"
                  onClick={applyNervousPreset}
                  title={`Action for ${selected.name} · 0.5s nervous motion`}
                >
                  <WandSparkles size={12} /> Nervous · 0.5s
                </button>
                <button
                  type="button"
                  onClick={applyWalkPreset}
                  title={`Action for ${selected.name} · 0.9s walk-in motion`}
                >
                  <WandSparkles size={12} /> Walk in · 0.9s
                </button>
              </span>
            </div>
            <small className="motion-help">
              Actions affect {selected.name}; pose presets set the current
              keyframe.
            </small>
            <div className="pose-label">POSE PRESETS</div>
            <div className="pose-grid">
              {(
                [
                  'idle',
                  'nervous',
                  'wave',
                  'lean-in',
                  'point',
                  'shrug',
                ] as Pose[]
              ).map((pose) => (
                <button
                  className={selected.pose === pose ? 'active' : ''}
                  type="button"
                  key={pose}
                  disabled={isTrackLocked(project, selected.id)}
                  title={
                    isTrackLocked(project, selected.id)
                      ? 'Unlock the character track to edit poses'
                      : `Apply ${pose.replace('-', ' ')} pose`
                  }
                  onClick={() => setSelectedPose(pose)}
                >
                  <span className={`pose-dot pose-${pose}`} />
                  {pose.replace('-', ' ')}
                </button>
              ))}
            </div>
            <div className="pose-label motion-clip-label">MOTION CLIPS</div>
            <div className="motion-clip-grid">
              {project.motionClips
                .filter((clip) =>
                  ['walk-in', 'turn', 'embarrassed'].includes(clip.kind),
                )
                .map((clip) => (
                  <button
                    type="button"
                    key={clip.id}
                    onClick={() => applyMotionClipHuman(clip.id)}
                    disabled={
                      isTrackLocked(project, selected.id) ||
                      selectedSkeleton?.reviewStatus !== 'approved'
                    }
                    title={clip.description}
                  >
                    {clip.label}
                    <small>{clip.durationMs} ms</small>
                  </button>
                ))}
            </div>
          </div>
          <details className="inspector-section skeleton-editor" open>
            <summary className="inspector-label">
              <span>SKELETAL RIG</span>
              <span>
                {selectedSkeleton
                  ? selectedSkeleton.reviewStatus.replace('-', ' ')
                  : 'not proposed'}
              </span>
            </summary>
            {selectedSkeleton ? (
              <>
                <div className="skeleton-status-row">
                  <label>
                    Binding
                    <select
                      aria-label="Rig binding method"
                      value={selectedSkeleton.binding.method}
                      onChange={(event) =>
                        setSelectedBindingMethod(
                          event.target.value as BindingMethod,
                        )
                      }
                    >
                      <option value="segmented">Segmented · production</option>
                      <option value="rigid">Rigid fallback</option>
                      <option value="mesh">Mesh · experimental</option>
                    </select>
                  </label>
                  <span>{selectedSkeleton.joints.length} joints</span>
                  <span>{selectedSkeleton.bones.length} bones</span>
                </div>
                {(() => {
                  const manifest = project.assets.find(
                    (asset) => asset.id === selectedSkeleton.assetId,
                  )?.rigManifest;
                  const alignment = manifest?.alignment;
                  return (
                    <div className="rig-quality-summary">
                      <span>
                        {alignment?.connected
                          ? 'Connected seams'
                          : 'Needs seam review'}
                      </span>
                      <span>
                        {alignment?.seamCount ?? 0} seams ·{' '}
                        {Math.round((alignment?.minConfidence ?? 0) * 100)}%
                        confidence
                      </span>
                    </div>
                  );
                })()}
                <div className="rig-part-list">
                  {selectedSkeleton.binding.regions?.map((region) => (
                    <div className="rig-part-row" key={region.id}>
                      <button
                        type="button"
                        className={isolatedPartId === region.id ? 'active' : ''}
                        onClick={() =>
                          setIsolatedPartId((current) =>
                            current === region.id ? null : region.id,
                          )
                        }
                      >
                        {region.label}
                      </button>
                      <small>
                        {Math.round((region.confidence ?? 0) * 100)}%
                      </small>
                      <label>
                        Bone
                        <select
                          value={region.boneId ?? ''}
                          onChange={(event) =>
                            updateSelectedBindingRegion(
                              region.id,
                              'boneId',
                              event.target.value,
                            )
                          }
                        >
                          {selectedSkeleton.bones.map((bone) => (
                            <option key={bone.id} value={bone.id}>
                              {bone.id.replace('bone-', '')}
                            </option>
                          ))}
                        </select>
                      </label>
                      {(
                        ['pivotX', 'pivotY', 'overlapPx', 'zIndex'] as const
                      ).map((key) => (
                        <label key={key}>
                          {key === 'pivotX'
                            ? 'Pivot X'
                            : key === 'pivotY'
                              ? 'Pivot Y'
                              : key === 'overlapPx'
                                ? 'Overlap'
                                : 'Z'}
                          <input
                            type="number"
                            step={key.startsWith('pivot') ? '0.05' : '1'}
                            min={key.startsWith('pivot') ? '0' : '-20'}
                            max={key.startsWith('pivot') ? '1' : '40'}
                            value={
                              region[key] ?? (key.startsWith('pivot') ? 0.5 : 0)
                            }
                            onChange={(event) =>
                              updateSelectedBindingRegion(
                                region.id,
                                key,
                                Number(event.target.value),
                              )
                            }
                          />
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="skeleton-joint-list">
                  {selectedSkeleton.joints.slice(0, 8).map((joint) => (
                    <div className="skeleton-joint-row" key={joint.id}>
                      <span>
                        <i
                          className={
                            joint.confidence < 0.55 ? 'low-confidence' : ''
                          }
                        />
                        {joint.label}
                      </span>
                      <label>
                        X
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          aria-label={`${joint.label} joint X`}
                          value={joint.x}
                          onChange={(event) =>
                            updateSelectedSkeletonJoint(
                              joint.id,
                              'x',
                              Number(event.target.value),
                            )
                          }
                        />
                      </label>
                      <label>
                        Y
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          aria-label={`${joint.label} joint Y`}
                          value={joint.y}
                          onChange={(event) =>
                            updateSelectedSkeletonJoint(
                              joint.id,
                              'y',
                              Number(event.target.value),
                            )
                          }
                        />
                      </label>
                    </div>
                  ))}
                </div>
                <div className="skeleton-actions">
                  <button
                    type="button"
                    onClick={() => setShowSkeleton((value) => !value)}
                    aria-pressed={showSkeleton}
                  >
                    {showSkeleton ? 'Hide guides' : 'Show guides'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAlphaMask((value) => !value)}
                    aria-pressed={showAlphaMask}
                  >
                    {showAlphaMask ? 'Hide alpha mask' : 'Show alpha mask'}
                  </button>
                  {selectedSkeleton.binding.method === 'mesh' && (
                    <button
                      type="button"
                      onClick={() => setShowMeshWireframe((value) => !value)}
                      aria-pressed={showMeshWireframe}
                    >
                      {showMeshWireframe
                        ? 'Hide mesh wireframe'
                        : 'Show mesh wireframe'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void runRigPreview()}
                    disabled={rigPreviewLoading}
                  >
                    {rigPreviewLoading ? 'Inspecting…' : 'Run stress poses'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void approveSelectedSkeleton(true)}
                    disabled={selectedSkeleton.reviewStatus === 'approved'}
                  >
                    Approve rig
                  </button>
                  <button
                    type="button"
                    onClick={() => void approveSelectedSkeleton(false)}
                    disabled={selectedSkeleton.reviewStatus === 'rejected'}
                  >
                    Reject
                  </button>
                </div>
                {rigPreviewReport && (
                  <div
                    className={`rig-preview-report ${rigPreviewReport.passed ? 'passed' : 'failed'}`}
                  >
                    <strong>
                      {rigPreviewReport.passed
                        ? 'Rendered QA passed'
                        : 'Rendered QA needs correction'}
                    </strong>
                    <span>
                      {rigPreviewReport.poses
                        .map(
                          (pose) =>
                            `${pose.label}: ${pose.passed ? 'pass' : 'review'}`,
                        )
                        .join(' · ')}
                    </span>
                    {rigPreviewReport.meshMetrics && (
                      <span>
                        {rigPreviewReport.renderer} ·{' '}
                        {rigPreviewReport.meshMetrics.vertexCount} vertices ·{' '}
                        {rigPreviewReport.meshMetrics.triangleCount} triangles ·{' '}
                        {rigPreviewReport.meshMetrics.flippedCount} flips ·{' '}
                        {rigPreviewReport.meshMetrics.degenerateCount}{' '}
                        degenerate
                      </span>
                    )}
                  </div>
                )}
                <small className="transform-help">
                  Approval unlocks bone keyframes. Mesh binding is experimental;
                  pose animation remains available as a fallback.
                </small>
              </>
            ) : (
              <>
                <small className="transform-help">
                  Generate or import character art, then propose a reviewable
                  joint hierarchy before adding bone motion.
                </small>
                <button
                  className="skeleton-propose-button"
                  type="button"
                  onClick={createSkeletonForSelected}
                  disabled={!selected.assetId}
                >
                  <Sparkles size={12} /> Propose skeleton
                </button>
              </>
            )}
          </details>
          <details className="inspector-section caption-editor" open>
            <summary className="inspector-label">
              <span>CAPTION</span>
              <span>{selectedCaption?.speaker ?? 'none'}</span>
            </summary>
            {selectedCaption ? (
              <>
                <textarea
                  aria-label="Caption text"
                  value={selectedCaption.text}
                  onChange={(event) =>
                    updateCaption({ text: event.target.value })
                  }
                  rows={2}
                />
                <div className="field-row">
                  <label>
                    Start
                    <input
                      type="number"
                      aria-label="Caption start"
                      value={selectedCaption.start}
                      onChange={(event) =>
                        updateCaption({ start: Number(event.target.value) })
                      }
                    />
                    <b>ms</b>
                  </label>
                  <label>
                    End
                    <input
                      type="number"
                      aria-label="Caption end"
                      value={selectedCaption.end}
                      onChange={(event) =>
                        updateCaption({ end: Number(event.target.value) })
                      }
                    />
                    <b>ms</b>
                  </label>
                </div>
                <small className="transform-help">
                  Caption edits preserve the rest of the scene and are undoable.
                </small>
              </>
            ) : (
              <small className="transform-help">
                No captions in this scene.
              </small>
            )}
          </details>
          <details className="inspector-section" open>
            <summary className="inspector-label">
              <span>AUDIO CUES</span>
              <span>non-voice mix</span>
            </summary>
            <div className="audio-cue-list">
              {project.audioCues.map((cue) => (
                <div className="audio-cue-item" key={cue.id}>
                  <div className="audio-cue-row">
                    <span className={`audio-cue-dot cue-${cue.kind}`} />
                    <span>
                      <strong>{cue.label}</strong>
                      <small>
                        {cue.kind} · {timecode(cue.start)}–{timecode(cue.end)} ·{' '}
                        {Math.round(cue.volume * 100)}%
                      </small>
                    </span>
                    <label className="audio-volume-control">
                      <span className="visually-hidden">Volume</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        aria-label={`Volume ${cue.label}`}
                        value={cue.volume}
                        onChange={(event) =>
                          updateAudioCueVolume(cue, Number(event.target.value))
                        }
                      />
                    </label>
                    <button
                      type="button"
                      aria-label={`Remove ${cue.label}`}
                      title={`Remove ${cue.label}`}
                      onClick={() => removeAudioCue(cue)}
                    >
                      ×
                    </button>
                  </div>
                  <details className="audio-timing-editor" open>
                    <summary>
                      Timing · {timecode(cue.start)}–{timecode(cue.end)}
                    </summary>
                    <div className="audio-timing-fields">
                      <label>
                        Start
                        <input
                          type="number"
                          min="0"
                          max={Math.max(0, cue.end - 1)}
                          step="1"
                          aria-label={`Start time ${cue.label}`}
                          value={cue.start}
                          onChange={(event) =>
                            updateAudioCueTiming(
                              cue,
                              'start',
                              Number(event.target.value),
                            )
                          }
                        />
                        <b>ms</b>
                      </label>
                      <label>
                        End
                        <input
                          type="number"
                          min={cue.start + 1}
                          max={project.duration}
                          step="1"
                          aria-label={`End time ${cue.label}`}
                          value={cue.end}
                          onChange={(event) =>
                            updateAudioCueTiming(
                              cue,
                              'end',
                              Number(event.target.value),
                            )
                          }
                        />
                        <b>ms</b>
                      </label>
                    </div>
                  </details>
                </div>
              ))}
            </div>
            <div className="audio-actions">
              <button type="button" onClick={() => addAudioCue('footstep')}>
                + Footstep
              </button>
              <button type="button" onClick={() => addAudioCue('stinger')}>
                + Sting
              </button>
            </div>
            <small className="transform-help">
              Adjust levels here; cue mix is rendered into WebM. Voice and
              lip-sync stay out of scope.
            </small>
          </details>
          <details className="inspector-section" open>
            <summary className="inspector-label">
              <span>STYLE BIBLE</span>
              <span>editable direction</span>
            </summary>
            <div className="style-row">
              <span>Construction</span>
              <input
                aria-label="Style construction"
                value={project.styleBible.construction}
                onChange={(event) =>
                  updateStyleBibleField('construction', event.target.value)
                }
              />
            </div>
            <div className="style-row">
              <span>Motion</span>
              <input
                aria-label="Style motion"
                value={project.styleBible.motion}
                onChange={(event) =>
                  updateStyleBibleField('motion', event.target.value)
                }
              />
            </div>
            <div className="style-row">
              <span>Camera</span>
              <input
                aria-label="Style camera"
                value={project.styleBible.camera}
                onChange={(event) =>
                  updateStyleBibleField('camera', event.target.value)
                }
              />
            </div>
            <div className="style-row style-row-stack">
              <span>Palette</span>
              <input
                aria-label="Style palette"
                value={project.styleBible.palette.join(', ')}
                onChange={(event) => updateStylePalette(event.target.value)}
              />
            </div>
            <label className="style-notes">
              Direction notes
              <textarea
                aria-label="Style direction notes"
                value={project.styleBible.notes}
                onChange={(event) =>
                  updateStyleBibleField('notes', event.target.value)
                }
                rows={2}
              />
            </label>
          </details>
          <div className="inspector-section command-preview">
            <div className="inspector-label">
              <span>LAST CHANGE</span>
              <span className="command-actor">
                {notice ? notice.split(' · ')[0] : '—'}
              </span>
            </div>
            <code>{lastCommand}</code>
          </div>
          <div className="inspector-bottom">
            <button type="button" className="secondary-button" onClick={undo}>
              <Undo2 size={14} /> Undo
            </button>
            <button type="button" className="secondary-button" onClick={redo}>
              <Redo2 size={14} /> Redo
            </button>
            <button
              type="button"
              className="save-button"
              onClick={() => {
                try {
                  const savedProject = copy(project);
                  savedProject.dirty = false;
                  syncActiveScene(savedProject);
                  window.localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify(savedProject),
                  );
                  projectRef.current = savedProject;
                  setProject(savedProject);
                  setSaved(true);
                  setLastSavedAt(new Date());
                  setSaveError('');
                  setNotice('Project saved locally');
                } catch {
                  setSaved(false);
                  setSaveError('Local save failed');
                  setNotice('Local save failed · export a project copy');
                }
              }}
            >
              <Save size={14} /> Save
            </button>
          </div>
        </aside>
      </div>
      {dialog && (
        <div className="dialog-backdrop">
          <dialog
            className="studio-dialog"
            open
            aria-labelledby="studio-dialog-title"
            aria-modal="true"
          >
            <div className="dialog-heading">
              <div>
                <span className="eyebrow">STAGEHAND</span>
                <h2 id="studio-dialog-title">
                  {dialog === 'help'
                    ? 'Help & shortcuts'
                    : dialog === 'settings'
                      ? 'Studio settings'
                      : 'Starter templates'}
                </h2>
              </div>
              <button
                className="dialog-close"
                type="button"
                aria-label="Close dialog"
                onClick={() => setDialog(null)}
              >
                ×
              </button>
            </div>
            {dialog === 'help' ? (
              <div className="dialog-copy">
                <p>Build the awkward moment in beats, then refine the pose.</p>
                <div className="skill-download-card">
                  <span>
                    <strong>Stagehand asset-rigging skill</strong>
                    <small>
                      Install into <code>$CODEX_HOME/skills</code> for the
                      guided asset-to-rig workflow.
                    </small>
                  </span>
                  <a
                    href="/downloads/stagehand-asset-rigging-v1.0.0.zip"
                    download
                  >
                    Download v1.0.0
                  </a>
                </div>
                <dl>
                  <div>
                    <dt>Space</dt>
                    <dd>Play or pause the scene clock</dd>
                  </div>
                  <div>
                    <dt>← / →</dt>
                    <dd>Step the playhead one frame</dd>
                  </div>
                  <div>
                    <dt>Undo</dt>
                    <dd>Restore the last human or agent command</dd>
                  </div>
                  <div>
                    <dt>Render</dt>
                    <dd>
                      Export an editable-preview WebM with cue-based audio
                    </dd>
                  </div>
                </dl>
              </div>
            ) : dialog === 'settings' ? (
              <div className="dialog-copy">
                <p>Project data stays in this browser until you export it.</p>
                <div className="setting-line">
                  <span>Frame rate</span>
                  <select
                    aria-label="Render frame rate"
                    value={project.fps}
                    onChange={(event) =>
                      updateRenderSettings({ fps: Number(event.target.value) })
                    }
                  >
                    <option value="12">12 fps · paper cutout</option>
                    <option value="24">24 fps · smoother motion</option>
                  </select>
                </div>
                <div className="setting-line">
                  <span>Render size</span>
                  <select
                    aria-label="Render resolution"
                    value={project.renderWidth >= 1920 ? '1080p' : '720p'}
                    onChange={(event) =>
                      updateRenderSettings({
                        preset: event.target.value as '720p' | '1080p',
                      })
                    }
                  >
                    <option value="720p">720p · 720×405</option>
                    <option value="1080p">1080p · 1920×1080</option>
                  </select>
                </div>
                <div className="setting-line">
                  <span>Storage</span>
                  <strong>Local browser project</strong>
                </div>
              </div>
            ) : (
              <div className="dialog-copy">
                <p>Begin empty or add a focused story beat to this project.</p>
                <div className="template-dialog-grid">
                  <button
                    className="blank-template-card"
                    type="button"
                    onClick={startBlankProject}
                  >
                    <span>
                      <strong>Blank project</strong>
                      <small>
                        One empty scene with two open actor slots and no cues.
                      </small>
                    </span>
                    <em>blank</em>
                  </button>
                  {starterTemplates.map((template) => (
                    <button
                      type="button"
                      key={template.id}
                      onClick={() => applyTemplate(template)}
                    >
                      <span>
                        <strong>{template.title}</strong>
                        <small>{template.description}</small>
                      </span>
                      <em>{template.tag}</em>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </dialog>
        </div>
      )}
      {notice && (
        <output className="toast" aria-live="polite">
          <span className="toast-icon">
            <Sparkles size={13} />
          </span>
          <span>{notice}</span>
        </output>
      )}
    </main>
  );
}
