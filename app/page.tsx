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
  ChevronDown,
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
  WandSparkles,
  ZoomIn,
} from 'lucide-react';

type Pose = 'idle' | 'nervous' | 'wave' | 'lean-in' | 'point' | 'shrug';
type AssetKind = 'rigged-character' | 'background' | 'prop' | 'audio';
type AssetFrameLayout = 'single' | 'four-column';
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
  source: 'starter' | 'placeholder' | 'imported';
  frameLayout?: AssetFrameLayout;
  mimeType?: string;
  dataUrl?: string;
  frameCount?: number;
  style?: AssetStyle;
};
type AudioCueKind = 'music' | 'footstep' | 'stinger';
type AudioCue = {
  id: string;
  kind: AudioCueKind;
  label: string;
  start: number;
  end: number;
  volume: number;
};
type Character = {
  id: string;
  name: string;
  color: string;
  assetId?: string;
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
  lockedTrackIds?: string[];
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
const WEBMCP_TOOL_COUNT = 52;
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
type TimelineMark = {
  time: number;
  id: string;
  kind: 'camera' | 'character' | 'prop' | 'cue';
  characterId?: string;
  assetId?: string;
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
    label: 'Alice · rigged',
    brief:
      'Warm coral paper protagonist; keep her silhouette clear for awkward reactions.',
    source: 'starter',
    frameLayout: 'single',
    style: defaultAssetStyle('rigged-character'),
  },
  {
    id: 'bob',
    kind: 'rigged-character',
    label: 'Bob · rigged',
    brief:
      'Diner teal foil character; enters from upstage with a readable lean-in.',
    source: 'starter',
    frameLayout: 'single',
    style: {
      ...defaultAssetStyle('rigged-character'),
      palette: ['diner teal', 'warm paper'],
    },
  },
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
  },
  {
    id: 'mug-hit',
    kind: 'stinger',
    label: 'Mug hit',
    start: 5000,
    end: 5350,
    volume: 0.14,
  },
  {
    id: 'second-chance-sting',
    kind: 'stinger',
    label: 'Second chance sting',
    start: 10800,
    end: 11250,
    volume: 0.16,
  },
];
const starterProject: Project = {
  name: 'Paper Cutout Comedy',
  revision: 7,
  duration: 15000,
  currentTime: 1800,
  fps: 12,
  renderWidth: 720,
  renderHeight: 405,
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
    },
    {
      id: 'bob',
      name: 'Bob',
      color: '#32748f',
      x: 68,
      y: 57,
      rotation: 3,
      pose: 'idle',
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
    },
    {
      id: 'kf-bob-12000',
      characterId: 'bob',
      time: 12000,
      x: 66,
      y: 57,
      rotation: 3,
      pose: 'shrug',
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
  storyboardBeats,
  styleBible: starterStyleBible,
  scenes: starterScenes,
  activeSceneId: 'scene-01',
  templateId: 'first-meeting',
};

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
    if (
      !project.characters.some(
        (character) => character.id === frame.characterId,
      )
    )
      issues.push({
        code: 'ORPHAN_KEYFRAME',
        severity: 'error',
        path: `keyframes.${frame.id}`,
        message: `${frame.id} points to a missing character.`,
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
        message: `${asset.id} must be a single image or a four-pose sheet.`,
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
  activeScene.lockedTrackIds = copy(project.lockedTrackIds);
}

const hydrateProject = (value: Partial<Project>): Project => {
  const base = copy(starterProject);
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
      asset.frameCount === 4 || asset.frameLayout === 'four-column'
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
    return {
      ...asset,
      brief:
        typeof asset.brief === 'string' && asset.brief.trim()
          ? asset.brief.trim()
          : defaultAssetBrief(asset.kind),
      frameLayout,
      style,
    };
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
    lockedTrackIds: Array.isArray(scene.lockedTrackIds)
      ? scene.lockedTrackIds
      : [],
  }));
  const activeScene =
    scenes.find((scene) => scene.id === requestedActiveId) ?? scenes[0];
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
    };
  });
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

function scheduleAudioCues(
  context: AudioContext,
  destination: AudioNode,
  cues: AudioCue[],
  startAt: number,
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
  changes: Partial<Pick<Keyframe, 'x' | 'y' | 'rotation' | 'pose'>>,
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
  };
  if (existing) Object.assign(existing, frame);
  else project.keyframes.push(frame);
  project.keyframes.sort(
    (a, b) => a.time - b.time || a.characterId.localeCompare(b.characterId),
  );
  return frame;
}

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  c: Character,
  width: number,
  height: number,
  selected: boolean,
  characterImage?: CanvasImageSource,
  characterAsset?: Asset,
) {
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
  if (characterImage) {
    const image = characterImage as HTMLImageElement;
    ctx.filter = assetTreatmentFilter(characterAsset);
    const frameCount = characterAsset?.frameCount === 4 ? 4 : 1;
    const sourceWidth = image.naturalWidth || image.width || 100;
    const sourceHeight = image.naturalHeight || image.height || 220;
    const frameWidth = sourceWidth / frameCount;
    const imageScale = Math.min(112 / frameWidth, 242 / sourceHeight);
    const imageWidth = frameWidth * imageScale;
    const imageHeight = sourceHeight * imageScale;
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
    return;
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
}

function drawRenderFrame(
  ctx: CanvasRenderingContext2D,
  project: Project,
  width: number,
  height: number,
  imageMap?: Map<string, CanvasImageSource>,
) {
  ctx.fillStyle = '#e9d6b8';
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  applyCameraTransform(
    ctx,
    evaluateCamera(project, project.currentTime),
    width,
    height,
  );
  const backgroundImage = project.assets.find(
    (asset) => asset.kind === 'background' && asset.dataUrl,
  );
  drawDinerBackground(
    ctx,
    width,
    height,
    backgroundImage ? imageMap?.get(backgroundImage.id) : undefined,
    backgroundImage,
  );
  evaluateCharacters(project, project.currentTime).forEach((character) =>
    drawCharacter(
      ctx,
      character,
      width,
      height,
      false,
      character.assetId ? imageMap?.get(character.assetId) : undefined,
      character.assetId
        ? project.assets.find((asset) => asset.id === character.assetId)
        : undefined,
    ),
  );
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
  sceneLabel,
  interactionMode,
}: {
  project: Project;
  onSelect: (id: string) => void;
  sceneLabel: string;
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
      (asset) => asset.kind === 'background' && asset.dataUrl,
    );
    drawDinerBackground(
      ctx,
      width,
      height,
      backgroundAsset
        ? imageCacheRef.current.get(backgroundAsset.id)
        : undefined,
      backgroundAsset,
    );
    evaluateCharacters(project, project.currentTime).forEach((c) =>
      drawCharacter(
        ctx,
        c,
        width,
        height,
        interactionMode !== 'preview' && c.id === project.selectedId,
        c.assetId ? imageCacheRef.current.get(c.assetId) : undefined,
        c.assetId
          ? project.assets.find((asset) => asset.id === c.assetId)
          : undefined,
      ),
    );
    drawImportedProps(
      ctx,
      project,
      project.currentTime,
      width,
      height,
      imageCacheRef.current,
    );
    ctx.restore();
    const camera = evaluateCamera(project, project.currentTime);
    ctx.fillStyle = 'rgba(41,39,42,.55)';
    ctx.font = '10px ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(
      `CAM ${camera.zoom.toFixed(2)}×  ${camera.panX >= 0 ? '+' : ''}${camera.panX.toFixed(0)} / ${camera.panY >= 0 ? '+' : ''}${camera.panY.toFixed(0)}`,
      width - 16,
      height - 14,
    );
    ctx.fillStyle = 'rgba(41,39,42,.55)';
    ctx.font = '11px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      `${sceneLabel.toUpperCase()}  /  ${timecode(project.currentTime)}`,
      16,
      height - 14,
    );
  }, [interactionMode, project, sceneLabel]);
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
      aria-label="Diner scene canvas"
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
  const [project, setProject] = useState<Project>(starterProject),
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
    [dialog, setDialog] = useState<'help' | 'settings' | null>(null),
    [rendering, setRendering] = useState(false),
    [notice, setNotice] = useState('Ready for direction'),
    [saved, setSaved] = useState(true),
    [editingProjectName, setEditingProjectName] = useState(false),
    [projectNameDraft, setProjectNameDraft] = useState(starterProject.name),
    [editingBeatId, setEditingBeatId] = useState<string | null>(null),
    [beatTitleDraft, setBeatTitleDraft] = useState(''),
    [beatDescriptionDraft, setBeatDescriptionDraft] = useState(''),
    [beatStartDraft, setBeatStartDraft] = useState(''),
    [beatEndDraft, setBeatEndDraft] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);
  const assetImportInputRef = useRef<HTMLInputElement>(null);
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
    activeCaption = project.captions.find(
      (c) => project.currentTime >= c.start && project.currentTime <= c.end,
    ),
    selectedCaption = activeCaption ?? project.captions[0],
    ratio = project.currentTime / project.duration,
    camera = evaluateCamera(project, project.currentTime);
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
      setNotice(`${agent ? 'Agent' : 'Human'} · ${label}`);
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
    const output = document.createElement('canvas');
    output.width = project.renderWidth;
    output.height = project.renderHeight;
    const context = output.getContext('2d');
    if (!context) return { ok: false, code: 'CANVAS_UNAVAILABLE' };
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
    drawRenderFrame(context, project, output.width, output.height, imageMap);
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
    };
  }, [project]);
  const commitRef = useRef(commit),
    undoRef = useRef(undo),
    redoRef = useRef(redo);
  useEffect(() => {
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
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
      setSaved(true);
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
                retryFrom: 'get_project_summary',
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
      void Promise.resolve(
        modelContext.registerTool(
          {
            name,
            title,
            description,
            inputSchema: schema,
            annotations: { readOnlyHint, untrustedContentHint: false },
            execute: replayableExecute,
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => setNotice('WebMCP registration unavailable'));
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
      (input) => {
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
      (input) => {
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
          renderSize: {
            width: current.renderWidth,
            height: current.renderHeight,
            fps: current.fps,
          },
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
        commitRef.current(
          (next) => {
            const item = next.characters.find(
              (candidate) => candidate.id === characterId,
            );
            if (item) item.assetId = assetId;
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
        },
      },
      (input) => {
        const current = projectRef.current;
        if (typeof input.characterId !== 'string')
          return { ok: false, code: 'INVALID_INPUT' };
        if (!current.characters.some((c) => c.id === input.characterId))
          return { ok: false, code: 'NOT_FOUND' };
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
          (input.pose !== undefined && !isPose(input.pose))
        )
          return { ok: false, code: 'INVALID_INPUT' };
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
        },
      },
      (input) => {
        const current = projectRef.current;
        if (
          typeof input.characterId !== 'string' ||
          !current.characters.some((item) => item.id === input.characterId) ||
          typeof input.timeMs !== 'number' ||
          !Number.isFinite(input.timeMs) ||
          input.timeMs < 0 ||
          input.timeMs > current.duration
        )
          return { ok: false, code: 'INVALID_INPUT' };
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
          (input.pose !== undefined && !isPose(input.pose))
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
      () => {
        const current = projectRef.current;
        const issues = validateProjectState(current);
        return {
          ok: issues.every((issue) => issue.severity !== 'error'),
          revision: current.revision,
          issues,
          renderReady: issues.every((issue) => issue.severity !== 'error'),
        };
      },
      true,
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
    const character = project.characters.find(
      (item) => item.id === characterId,
    );
    if (!character) return;
    commit((next) => {
      next.characters.forEach((item) => {
        if (item.assetId === asset.id) item.assetId = undefined;
      });
      const target = next.characters.find((item) => item.id === characterId);
      if (target) target.assetId = asset.id;
    }, `Bind ${asset.label} to ${character.name}`);
  };
  const addAudioCue = (kind: Exclude<AudioCueKind, 'music'>) => {
    const start = project.currentTime;
    const end = Math.min(
      project.duration,
      start + (kind === 'footstep' ? 120 : 350),
    );
    const label = kind === 'footstep' ? 'Footstep' : 'Reaction sting';
    commit((next) => {
      next.audioCues.push({
        id: nextAudioCueId(next.audioCues, kind),
        kind,
        label,
        start,
        end,
        volume: kind === 'footstep' ? 0.24 : 0.16,
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
              style: defaultAssetStyle(assetImportKind),
              mimeType: file.type,
              dataUrl: reader.result as string,
              ...(frameCount > 1 ? { frameCount } : {}),
            });
            if (assetImportKind === 'rigged-character') {
              const character = next.characters.find(
                (item) => item.id === next.selectedId,
              );
              if (character) character.assetId = assetId;
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
  const applyTemplate = (template: (typeof starterTemplates)[number]) => {
    const scene = makeTemplateScene(template.id, nextSceneId(project.scenes));
    commit((next) => {
      next.scenes.push(scene);
      loadSceneContent(next, scene.id);
    }, `Apply ${scene.title}`);
    setPanel('scenes');
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
    const imageMap = new Map<string, HTMLImageElement>();
    await Promise.all(
      currentProject.assets
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
    const canvasStream = output.captureStream(0);
    const track =
      canvasStream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
    const audioContext = 'AudioContext' in window ? new AudioContext() : null;
    let stream = canvasStream;
    let audioStream: MediaStream | null = null;
    if (audioContext && sequenceAudioCues.length > 0) {
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
    return await new Promise<Record<string, unknown>>((resolve) => {
      recorder.onstop = () => {
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
        resolve({
          ok: true,
          fileName,
          sceneCount: sceneProjects.length,
          durationMs: totalDuration,
          fps: currentProject.fps,
          width: currentProject.renderWidth,
          height: currentProject.renderHeight,
          bytes: blob.size,
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
        drawRenderFrame(
          outputContext,
          { ...scene, currentTime: localTime },
          output.width,
          output.height,
          imageMap,
        );
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
        marks: project.cameraKeyframes.map((frame) => ({
          time: frame.time,
          id: frame.id,
          kind: 'camera' as const,
          label: 'Camera keyframe',
        })),
      },
      {
        name: 'Alice · rig',
        color: 'coral',
        range: rangeForCharacter('alice'),
        marks: marksForCharacter('alice'),
      },
      {
        name: 'Bob · rig',
        color: 'teal',
        range: rangeForCharacter('bob'),
        marks: marksForCharacter('bob'),
      },
      {
        name: 'Props · imported',
        color: 'violet',
        range: rangeFor(project.propKeyframes.map((frame) => frame.time)),
        marks: marksForProps,
      },
      {
        name: 'Captions',
        color: 'yellow',
        range: rangeForCaptions,
        marks: project.captions.map((caption) => ({
          time: caption.start,
          id: caption.id,
          kind: 'cue' as const,
          label: `${caption.speaker} caption`,
        })),
      },
      {
        name: 'Music · low',
        color: 'violet',
        range: rangeForAudio('music'),
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
  const activeScene = project.scenes[activeSceneIndex] ?? starterScenes[0];
  const selectedKeyframeCount = project.keyframes.filter(
    (frame) => frame.characterId === selected.id,
  ).length;
  const cameraKeyframeCount = project.cameraKeyframes.length;
  const validationIssues = validateProjectState(project);
  const renderReady = validationIssues.every(
    (issue) => issue.severity !== 'error',
  );
  return (
    <main className="studio-shell">
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
              <ChevronDown size={14} />
            </button>
          )}
        </div>
        <div className="top-actions">
          <div className={`save-state ${saved ? '' : 'unsaved'}`}>
            <span className="status-dot" />
            {saved ? 'Saved locally' : 'Saving…'}
          </div>
          <IconButton label="Help" onClick={() => setDialog('help')}>
            <CircleHelp size={17} />
          </IconButton>
          {viewMode !== 'preview' && (
            <IconButton label="Settings" onClick={() => setDialog('settings')}>
              <Settings2 size={17} />
            </IconButton>
          )}
          <button className="render-button" type="button" onClick={renderWebM}>
            <Film size={16} /> {rendering ? 'Rendering…' : 'Render WebM'}
          </button>
          <button
            className="top-secondary-button"
            type="button"
            onClick={() => void exportStill()}
            title="Download the current frame as a PNG"
          >
            <ImageIcon size={14} /> PNG frame
          </button>
          {viewMode !== 'preview' && (
            <>
              <button
                className="top-secondary-button"
                type="button"
                onClick={() => importInputRef.current?.click()}
              >
                <Upload size={14} /> Import
              </button>
              <button
                className="top-secondary-button"
                type="button"
                onClick={exportProject}
              >
                <Save size={14} /> Export
              </button>
            </>
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
        className={`workspace ${viewMode === 'preview' ? 'preview-workspace' : ''}`}
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
                          <span>
                            {timecode(scene.duration)} <i>{project.fps} fps</i>
                          </span>
                        </div>
                        <span className="scene-status">ready</span>
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
                <>
                  <button
                    className="add-scene"
                    type="button"
                    onClick={addScene}
                  >
                    <span>＋</span> Add scene
                  </button>
                  <div className="section-label assets-label">
                    <span>STARTER KIT</span>
                  </div>
                  <button
                    className="starter-link"
                    type="button"
                    onClick={() => {
                      const starter = copy(starterProject);
                      projectRef.current = starter;
                      commandResultsRef.current.clear();
                      historyRef.current = [];
                      futureRef.current = [];
                      setHistory([]);
                      setFuture([]);
                      setProject(starter);
                      setLastCommand('reset_to_starter()');
                      setNotice('Starter restored');
                    }}
                  >
                    <RotateCcw size={14} /> Reset to starter
                  </button>
                </>
              )}
              <div
                className={`validation-card ${renderReady ? 'ready' : 'attention'}`}
              >
                <div className="validation-heading">
                  <span className="validation-dot" />
                  <strong>
                    {renderReady ? 'READY TO RENDER' : 'NEEDS ATTENTION'}
                  </strong>
                  <span>
                    {validationIssues.length ? validationIssues.length : '✓'}
                  </span>
                </div>
                <small>
                  {renderReady
                    ? 'Scene structure, timing, captions, and rigs pass.'
                    : validationIssues[0]?.message}
                </small>
                {!renderReady && validationIssues.length > 1 && (
                  <small>+ {validationIssues.length - 1} more issue(s)</small>
                )}
              </div>
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
                        {expandedAssetStyleId === asset.id && (
                          <div className="asset-style-editor">
                            <label>
                              Role
                              <select
                                aria-label={`Role for ${asset.label}`}
                                value={assetStyle.role}
                                onChange={(event) =>
                                  updateAssetStyle(asset, {
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
                                aria-label={`Treatment for ${asset.label}`}
                                value={assetStyle.treatment}
                                onChange={(event) =>
                                  updateAssetStyle(asset, {
                                    treatment: event.target
                                      .value as AssetTreatment,
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
                                aria-label={`Silhouette for ${asset.label}`}
                                value={assetStyle.silhouette}
                                onChange={(event) =>
                                  updateAssetStyle(asset, {
                                    silhouette: event.target
                                      .value as AssetSilhouette,
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
                                aria-label={`Palette for ${asset.label}`}
                                value={assetStyle.palette.join(', ')}
                                onChange={(event) => {
                                  const palette = event.target.value
                                    .split(',')
                                    .map((value) => value.trim())
                                    .filter(Boolean);
                                  if (palette.length > 0)
                                    updateAssetStyle(asset, { palette });
                                }}
                              />
                            </label>
                            <label className="asset-style-notes">
                              Direction
                              <textarea
                                aria-label={`Style direction for ${asset.label}`}
                                value={assetStyle.notes}
                                rows={2}
                                onChange={(event) =>
                                  updateAssetStyle(asset, {
                                    notes: event.target.value,
                                  })
                                }
                              />
                            </label>
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
                        <textarea
                          className="asset-brief"
                          aria-label={`Brief for ${asset.label}`}
                          value={
                            assetBriefDrafts[asset.id] ??
                            asset.brief ??
                            defaultAssetBrief(asset.kind)
                          }
                          onChange={(event) =>
                            setAssetBriefDrafts((drafts) => ({
                              ...drafts,
                              [asset.id]: event.target.value,
                            }))
                          }
                          onBlur={(event) =>
                            updateAssetBrief(asset, event.target.value)
                          }
                          rows={2}
                        />
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
              <div className="asset-add-label template-label">
                STARTER TEMPLATES
              </div>
              <div className="template-list">
                {starterTemplates.map((template) => (
                  <button
                    type="button"
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    title={`Create ${template.title} scene`}
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
          <div className="rail-footer">
            <div className="agent-badge">
              <span className="sparkle-orbit">
                <Sparkles size={13} />
              </span>
              <div>
                <strong>WebMCP surface</strong>
                <small>{WEBMCP_TOOL_COUNT} tools declared</small>
              </div>
              <span className="online-dot" />
            </div>
          </div>
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
              <button
                className={viewMode === 'preview' ? 'active' : ''}
                type="button"
                role="tab"
                aria-selected={viewMode === 'preview'}
                tabIndex={viewMode === 'preview' ? 0 : -1}
                onKeyDown={handleTabListKeyDown}
                onClick={() => {
                  setEditingProjectName(false);
                  setViewMode('preview');
                  setPanel('scenes');
                  setPlaying(true);
                }}
              >
                <Play size={14} /> Preview
              </button>
            </div>
            {viewMode === 'preview' && (
              <button
                className="preview-exit"
                type="button"
                onClick={() => setViewMode('animate')}
              >
                Exit preview
              </button>
            )}
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
                  Preview uses the same deterministic clock as render
                  {project.scenes.length > 1
                    ? ` · sequence loops through ${project.scenes.length} scenes`
                    : ''}
                  .
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
              <span>
                <span className="live-dot" /> SCENE{' '}
                {String(activeSceneIndex + 1).padStart(2, '0')} <em>·</em>{' '}
                {project.fps} FPS
              </span>
              <span className="stage-header-right">
                SAFE AREA{' '}
                <button
                  className={`safe-toggle ${showSafeArea ? 'on' : ''}`}
                  type="button"
                  aria-label="Show safe area"
                  aria-pressed={showSafeArea}
                  onClick={() => setShowSafeArea((value) => !value)}
                />
              </span>
            </div>
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
                  sceneLabel={activeScene.title}
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
                {activeCaption && (
                  <div className="canvas-caption">
                    <span>{activeCaption.speaker}</span>
                    {activeCaption.text}
                  </div>
                )}
              </div>
            </div>
            <div className="stage-footer">
              <span>Paper cutout / limited motion</span>
              <span>
                {project.renderWidth} × {project.renderHeight} <i>16:9</i>
              </span>
            </div>
          </div>
          <div className="timeline">
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
                  −
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
                  +
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
                  Drag diamonds · click to jump
                </span>
              </div>
              <div className="timeline-actions">
                <button
                  type="button"
                  onClick={addKeyframe}
                  title={`Add ${selected.name} keyframe at ${timecode(project.currentTime)}`}
                >
                  <Sparkles size={14} /> Keyframe
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
                    ? 'Unlock track'
                    : 'Lock track'}
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
                        : track.name === 'Captions'
                          ? 'T'
                          : track.name === 'Music · low'
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
                      {track.name === 'Captions' && (
                        <span>dialogue captions</span>
                      )}
                      {track.name === 'Music · low' && (
                        <span>quiet diner bed</span>
                      )}
                      {track.name === 'SFX' && <span>footsteps + sting</span>}
                    </div>
                    {track.marks.map((mark, index) => (
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
                <FolderOpen size={14} />
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
                  onClick={() => setExpandedAssetStyleId(inspectorAsset.id)}
                >
                  Edit style in Assets <ArrowUpRight size={12} />
                </button>
              </div>
              <small className="asset-context-help">
                Asset identity and art direction live here. Motion and rig
                controls return when you select Scenes.
              </small>
            </div>
          )}
          <div className="inspector-header">
            <span>INSPECTOR</span>
            <Settings2 size={14} />
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
          </div>
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
              <span>LAST COMMAND</span>
              <span className="command-actor">{notice.split(' · ')[0]}</span>
            </div>
            <code>{lastCommand}</code>
            <small>revision {project.revision} · undoable</small>
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
                setNotice('Project saved locally');
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
                  {dialog === 'help' ? 'Help & shortcuts' : 'Studio settings'}
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
            ) : (
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
                <div className="setting-line">
                  <span>Agent surface</span>
                  <strong>{WEBMCP_TOOL_COUNT} WebMCP tools</strong>
                </div>
              </div>
            )}
          </dialog>
        </div>
      )}
      <output className="toast" aria-live="polite">
        <span className="toast-icon">
          <Sparkles size={13} />
        </span>
        <span>{notice}</span>
        <span className="toast-revision">rev {project.revision}</span>
      </output>
    </main>
  );
}
