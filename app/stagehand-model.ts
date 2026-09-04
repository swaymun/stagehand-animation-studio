export const PROJECT_SCHEMA_VERSION = 2 as const;

export const MOUTH_SHAPES = [
  'X',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
] as const;
export type MouthShape = (typeof MOUTH_SHAPES)[number];

export type DemoId = 'brick-breakout' | 'deadline-show' | 'no-clams-no-patty';
export type TrackKind = 'character' | 'prop' | 'camera' | 'overlay';
export type AssetKind =
  | 'background'
  | 'character'
  | 'prop'
  | 'frame'
  | 'audio'
  | 'mouth-pack';
export type ReviewStatus = 'draft' | 'pending-review' | 'approved' | 'rejected';
export type AssetSource = 'generated' | 'imported' | 'bundled' | 'procedural';
export type SfxRecipe =
  | 'alarm'
  | 'brick-pop'
  | 'cash-register'
  | 'error-zap'
  | 'jelly-bloop'
  | 'keyboard'
  | 'portal'
  | 'splash'
  | 'success'
  | 'whoosh';

export type FrameTransform = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  flipX?: boolean;
};

export type AnimationCel = {
  id: string;
  sceneId: string;
  trackId: string;
  frame: number;
  exposure: number;
  label: string;
  drawing: string;
  assetId?: string;
  assetFrame?: number;
  transform: FrameTransform;
};

export type AnimationTrack = {
  id: string;
  sceneId: string;
  kind: TrackKind;
  targetId: string;
  name: string;
  color: string;
  locked: boolean;
  hidden?: boolean;
  cels: AnimationCel[];
};

export type LipSyncCue = {
  id: string;
  sceneId: string;
  characterId: string;
  startFrame: number;
  endFrame: number;
  shape: MouthShape;
  confidence: number;
  source: 'authored' | 'estimated' | 'rhubarb';
};

export type Caption = {
  id: string;
  speaker: string;
  characterId: string;
  text: string;
  startFrame: number;
  endFrame: number;
};

export type SfxCue = {
  id: string;
  label: string;
  recipe: SfxRecipe;
  startFrame: number;
  endFrame: number;
  volume: number;
  seed: number;
  params?: Record<string, number>;
};

export type AudioCue = {
  id: string;
  label: string;
  kind: 'voice' | 'music';
  startFrame: number;
  endFrame: number;
  volume: number;
  assetId?: string;
};

export type StoryboardBeat = {
  id: string;
  sceneId: string;
  title: string;
  description: string;
  thumbnailLabel: string;
};

export type Character = {
  id: string;
  name: string;
  design:
    | 'brick-coder'
    | 'brick-bug'
    | 'night-heron'
    | 'red-panda'
    | 'clock-boss'
    | 'human-cutout'
    | 'coral-cashier';
  primary: string;
  secondary: string;
  skin?: string;
  mouthAnchor: { x: number; y: number; scale: number };
};

export type Asset = {
  id: string;
  kind: AssetKind;
  label: string;
  source: AssetSource;
  reviewStatus: ReviewStatus;
  dataUrl?: string;
  mimeType?: string;
  durationMs?: number;
  prompt?: string;
  dimensions?: { width: number; height: number };
  frameGrid?: { columns: number; rows: number };
  provenance: {
    author: string;
    sourceUrl?: string;
    license?: string;
    licenseUrl?: string;
    checksum?: string;
  };
};

export type AssetRequest = {
  id: string;
  kind: Exclude<AssetKind, 'audio'>;
  label: string;
  prompt: string;
  checklist: string[];
  status: 'pending' | 'attached' | 'approved' | 'rejected';
  assetId?: string;
  createdAt: string;
};

export type Scene = {
  id: string;
  title: string;
  description: string;
  frameCount: number;
  background: string;
  backgroundAssetId?: string;
  palette: [string, string, string, string];
  characters: Character[];
  tracks: AnimationTrack[];
  captions: Caption[];
  lipSync: LipSyncCue[];
  sfx: SfxCue[];
  audio: AudioCue[];
};

export type StagehandProject = {
  schemaVersion: typeof PROJECT_SCHEMA_VERSION;
  id: string;
  demoId?: DemoId;
  name: string;
  revision: number;
  fps: 12 | 24;
  renderWidth: number;
  renderHeight: number;
  activeSceneId: string;
  currentFrame: number;
  selectedTrackId?: string;
  selectedCelId?: string;
  scenes: Scene[];
  storyboard: StoryboardBeat[];
  assets: Asset[];
  assetRequests: AssetRequest[];
  migrationWarnings: string[];
  dirty: boolean;
};

export type ValidationIssue = {
  code: string;
  severity: 'error' | 'warning';
  path: string;
  message: string;
};

export type EvaluatedFrame = {
  sceneId: string;
  sceneTitle: string;
  frame: number;
  timeMs: number;
  background: string;
  backgroundAssetId?: string;
  palette: Scene['palette'];
  camera: AnimationCel | null;
  characters: Array<{
    character: Character;
    cel: AnimationCel | null;
    mouth: MouthShape;
  }>;
  props: Array<{ track: AnimationTrack; cel: AnimationCel | null }>;
  caption: Caption | null;
  sfx: SfxCue[];
  audio: AudioCue[];
};

export const DEMO_CATALOG: Array<{
  id: DemoId;
  title: string;
  shortTitle: string;
  description: string;
  accent: string;
  durationLabel: string;
}> = [
  {
    id: 'brick-breakout',
    title: 'Ship the Brick',
    shortTitle: 'Ship the Brick',
    description:
      'A tactile brick-built stop-motion comedy about shipping one structural dependency.',
    accent: '#f5c843',
    durationLabel: '18 sec · 4 scenes',
  },
  {
    id: 'deadline-show',
    title: 'One More Deploy',
    shortTitle: 'One More Deploy',
    description:
      'Two original deadpan coworkers survive detached limbs, scope creep, and hosted drift.',
    accent: '#7db9d5',
    durationLabel: '24 sec · 5 scenes',
  },
  {
    id: 'no-clams-no-patty',
    title: 'Land Money',
    shortTitle: 'Land Money',
    description:
      'A realistic sticker-cutout wakes in a cartoon undersea economy with the wrong wallet.',
    accent: '#ff7d9f',
    durationLabel: '24 sec · 5 scenes',
  },
];

const tf = (
  x: number,
  y: number,
  scale = 1,
  rotation = 0,
  opacity = 1,
  flipX = false,
): FrameTransform => ({ x, y, scale, rotation, opacity, flipX });

const cel = (
  sceneId: string,
  trackId: string,
  frame: number,
  drawing: string,
  label: string,
  transform: FrameTransform,
  exposure = 12,
  assetId?: string,
): AnimationCel => ({
  id: `${trackId}-f${String(frame).padStart(3, '0')}`,
  sceneId,
  trackId,
  frame,
  exposure,
  drawing,
  label,
  transform,
  assetId,
});

const track = (
  sceneId: string,
  id: string,
  name: string,
  kind: TrackKind,
  targetId: string,
  color: string,
  cels: AnimationCel[],
): AnimationTrack => ({
  id,
  sceneId,
  name,
  kind,
  targetId,
  color,
  locked: false,
  cels: cels.sort((a, b) => a.frame - b.frame),
});

const caption = (
  sceneId: string,
  id: string,
  speaker: string,
  characterId: string,
  text: string,
  startFrame: number,
  endFrame: number,
): Caption => ({
  id: `${sceneId}-${id}`,
  speaker,
  characterId,
  text,
  startFrame,
  endFrame,
});

const sfx = (
  sceneId: string,
  id: string,
  label: string,
  recipe: SfxRecipe,
  startFrame: number,
  endFrame: number,
  volume = 0.7,
  seed = 1,
  params?: Record<string, number>,
): SfxCue => ({
  id: `${sceneId}-${id}`,
  label,
  recipe,
  startFrame,
  endFrame,
  volume,
  seed,
  params,
});

const makeCharacter = (
  id: string,
  name: string,
  design: Character['design'],
  primary: string,
  secondary: string,
  mouthX = 0,
  mouthY = -0.19,
  mouthScale = 1,
  skin?: string,
): Character => ({
  id,
  name,
  design,
  primary,
  secondary,
  skin,
  mouthAnchor: { x: mouthX, y: mouthY, scale: mouthScale },
});

const deriveLipSync = (scene: Scene): LipSyncCue[] =>
  scene.captions.flatMap((item) => estimateLipSync(item, scene.id));

function sceneWithLipSync(scene: Scene): Scene {
  return { ...scene, lipSync: deriveLipSync(scene) };
}

function createBrickDemo(): StagehandProject {
  const coder = makeCharacter(
    'brick-coder',
    'Mina',
    'brick-coder',
    '#f2c94c',
    '#3568b8',
    0,
    -0.23,
    0.82,
    '#f2c94c',
  );
  const bug = makeCharacter(
    'brick-bug',
    'Gus',
    'brick-bug',
    '#e84c3d',
    '#541f24',
    0,
    -0.1,
    1,
  );
  const scenes: Scene[] = [
    sceneWithLipSync({
      id: 'brick-wakeup',
      title: 'Deadline alarm',
      description:
        'Mina wakes on a studded baseplate as the countdown detonates.',
      frameCount: 48,
      background: 'brick-bedroom',
      palette: ['#f7e8bd', '#f2c94c', '#3568b8', '#e84c3d'],
      characters: [coder],
      tracks: [
        track(
          'brick-wakeup',
          'brick-wakeup-camera',
          'Camera',
          'camera',
          'camera',
          '#9fb4b8',
          [
            cel(
              'brick-wakeup',
              'brick-wakeup-camera',
              0,
              'wide',
              'Wide',
              tf(0, 0, 1),
              24,
            ),
            cel(
              'brick-wakeup',
              'brick-wakeup-camera',
              24,
              'punch-in',
              'Alarm punch-in',
              tf(-4, 2, 1.16, -1),
              24,
            ),
          ],
        ),
        track(
          'brick-wakeup',
          'brick-wakeup-sam',
          'Mina',
          'character',
          coder.id,
          '#f2c94c',
          [
            cel(
              'brick-wakeup',
              'brick-wakeup-sam',
              0,
              'sleep',
              'Asleep',
              tf(34, 67, 1.05, -5),
              12,
            ),
            cel(
              'brick-wakeup',
              'brick-wakeup-sam',
              12,
              'wake',
              'Eyes open',
              tf(36, 63, 1.04, 0),
              12,
            ),
            cel(
              'brick-wakeup',
              'brick-wakeup-sam',
              24,
              'panic',
              'Deadline panic',
              tf(46, 61, 1.14, -7),
              12,
            ),
            cel(
              'brick-wakeup',
              'brick-wakeup-sam',
              36,
              'run',
              'Run off',
              tf(74, 63, 1, 7),
              12,
            ),
          ],
        ),
      ],
      captions: [
        caption(
          'brick-wakeup',
          'line-1',
          'Mina',
          coder.id,
          'Three hours? That is at least twelve brick-hours.',
          15,
          45,
        ),
      ],
      lipSync: [],
      sfx: [
        sfx('brick-wakeup', 'alarm', 'Stud alarm', 'alarm', 4, 18, 0.55, 11),
        sfx(
          'brick-wakeup',
          'scatter',
          'Loose bricks',
          'brick-pop',
          24,
          31,
          0.72,
          19,
        ),
      ],
      audio: [],
    }),
    sceneWithLipSync({
      id: 'brick-build',
      title: 'Build storm',
      description: 'Every new feature arrives as a physical brick on the desk.',
      frameCount: 60,
      background: 'brick-lab',
      palette: ['#dfe9ef', '#f2c94c', '#3568b8', '#ef6d4d'],
      characters: [coder],
      tracks: [
        track(
          'brick-build',
          'brick-build-camera',
          'Camera',
          'camera',
          'camera',
          '#9fb4b8',
          [
            cel(
              'brick-build',
              'brick-build-camera',
              0,
              'desk-wide',
              'Desk wide',
              tf(0, 0, 1),
              36,
            ),
            cel(
              'brick-build',
              'brick-build-camera',
              36,
              'tower-close',
              'Tower close-up',
              tf(9, -1, 1.19, 1),
              24,
            ),
          ],
        ),
        track(
          'brick-build',
          'brick-build-sam',
          'Mina',
          'character',
          coder.id,
          '#f2c94c',
          [
            cel(
              'brick-build',
              'brick-build-sam',
              0,
              'type',
              'Rapid typing',
              tf(31, 62, 1),
              12,
            ),
            cel(
              'brick-build',
              'brick-build-sam',
              12,
              'stack',
              'Stack frame',
              tf(39, 59, 1.02, -3),
              12,
            ),
            cel(
              'brick-build',
              'brick-build-sam',
              24,
              'type-alt',
              'Type alternate',
              tf(33, 61, 1, 2),
              12,
            ),
            cel(
              'brick-build',
              'brick-build-sam',
              36,
              'tower',
              'Hold the tower',
              tf(45, 55, 1.1, -5),
              12,
            ),
            cel(
              'brick-build',
              'brick-build-sam',
              48,
              'crushed',
              'Scope collapse',
              tf(46, 71, 0.94, 12),
              12,
            ),
          ],
        ),
        track(
          'brick-build',
          'brick-build-features',
          'Feature bricks',
          'prop',
          'feature-stack',
          '#ef6d4d',
          [
            cel(
              'brick-build',
              'brick-build-features',
              0,
              'one-brick',
              'Frame editor',
              tf(66, 70, 0.7),
              12,
            ),
            cel(
              'brick-build',
              'brick-build-features',
              12,
              'three-bricks',
              'Lip sync',
              tf(66, 62, 0.84),
              12,
            ),
            cel(
              'brick-build',
              'brick-build-features',
              24,
              'six-bricks',
              'Audio tools',
              tf(66, 53, 0.95),
              12,
            ),
            cel(
              'brick-build',
              'brick-build-features',
              36,
              'tower',
              'Everything',
              tf(66, 44, 1.08, 2),
              24,
            ),
          ],
        ),
      ],
      captions: [
        caption(
          'brick-build',
          'line-1',
          'Mina',
          coder.id,
          'Frames. Lip sync. Local voice. Sensible scope.',
          4,
          34,
        ),
        caption(
          'brick-build',
          'line-2',
          'Mina',
          coder.id,
          'Why is the sensible scope taller than me?',
          38,
          58,
        ),
      ],
      lipSync: [],
      sfx: [
        sfx(
          'brick-build',
          'keys',
          'Plastic keyboard',
          'keyboard',
          0,
          28,
          0.42,
          5,
        ),
        sfx(
          'brick-build',
          'stack',
          'Feature snaps',
          'brick-pop',
          10,
          40,
          0.62,
          27,
        ),
      ],
      audio: [],
    }),
    sceneWithLipSync({
      id: 'brick-boss',
      title: 'The red error',
      description: 'A bug assembles itself from every red brick in the room.',
      frameCount: 48,
      background: 'brick-bug-arena',
      palette: ['#202936', '#f2c94c', '#e84c3d', '#74c0c8'],
      characters: [coder, bug],
      tracks: [
        track(
          'brick-boss',
          'brick-boss-camera',
          'Camera',
          'camera',
          'camera',
          '#9fb4b8',
          [
            cel(
              'brick-boss',
              'brick-boss-camera',
              0,
              'low-wide',
              'Low wide',
              tf(0, 0, 1),
              24,
            ),
            cel(
              'brick-boss',
              'brick-boss-camera',
              24,
              'impact',
              'Impact shake',
              tf(1, -2, 1.08, -2),
              6,
            ),
            cel(
              'brick-boss',
              'brick-boss-camera',
              30,
              'recover',
              'Recover',
              tf(0, 0, 1.02, 0),
              18,
            ),
          ],
        ),
        track(
          'brick-boss',
          'brick-boss-sam',
          'Mina',
          'character',
          coder.id,
          '#f2c94c',
          [
            cel(
              'brick-boss',
              'brick-boss-sam',
              0,
              'faceoff',
              'Face the bug',
              tf(26, 65, 1.05),
              16,
            ),
            cel(
              'brick-boss',
              'brick-boss-sam',
              16,
              'pull-lever',
              'Pull deploy lever',
              tf(37, 62, 1.09, -8),
              16,
            ),
            cel(
              'brick-boss',
              'brick-boss-sam',
              32,
              'duck',
              'Duck the blast',
              tf(34, 72, 0.91, 8),
              16,
            ),
          ],
        ),
        track(
          'brick-boss',
          'brick-boss-bug',
          'Gus',
          'character',
          bug.id,
          '#e84c3d',
          [
            cel(
              'brick-boss',
              'brick-boss-bug',
              0,
              'assemble',
              'Assemble',
              tf(72, 61, 0.62),
              12,
            ),
            cel(
              'brick-boss',
              'brick-boss-bug',
              12,
              'roar',
              'Error roar',
              tf(70, 57, 1.12, 5),
              12,
            ),
            cel(
              'brick-boss',
              'brick-boss-bug',
              24,
              'explode',
              'Break apart',
              tf(69, 54, 1.26, -9),
              12,
            ),
            cel(
              'brick-boss',
              'brick-boss-bug',
              36,
              'single-brick',
              'One harmless brick',
              tf(73, 78, 0.24),
              12,
            ),
          ],
        ),
      ],
      captions: [
        caption(
          'brick-boss',
          'line-1',
          'Gus',
          bug.id,
          'TYPE ERROR: ambition is not assignable to deadline.',
          7,
          25,
        ),
        caption(
          'brick-boss',
          'line-2',
          'Mina',
          coder.id,
          'Then I will cast it to shipped.',
          26,
          45,
        ),
      ],
      lipSync: [],
      sfx: [
        sfx('brick-boss', 'zap', 'Error crackle', 'error-zap', 8, 25, 0.64, 41),
        sfx(
          'brick-boss',
          'burst',
          'Rocket decompile',
          'brick-pop',
          24,
          36,
          0.9,
          99,
        ),
      ],
      audio: [],
    }),
    sceneWithLipSync({
      id: 'brick-ship',
      title: 'Ship it',
      description:
        'The feature tower becomes a rocket and clears the deadline clock.',
      frameCount: 60,
      background: 'brick-launchpad',
      palette: ['#132333', '#f2c94c', '#79d2df', '#ef6d4d'],
      characters: [coder],
      tracks: [
        track(
          'brick-ship',
          'brick-ship-camera',
          'Camera',
          'camera',
          'camera',
          '#9fb4b8',
          [
            cel(
              'brick-ship',
              'brick-ship-camera',
              0,
              'launch-wide',
              'Launch wide',
              tf(0, 0, 1),
              36,
            ),
            cel(
              'brick-ship',
              'brick-ship-camera',
              36,
              'sky-tilt',
              'Follow rocket',
              tf(0, 10, 1.12, -1),
              24,
            ),
          ],
        ),
        track(
          'brick-ship',
          'brick-ship-sam',
          'Mina',
          'character',
          coder.id,
          '#f2c94c',
          [
            cel(
              'brick-ship',
              'brick-ship-sam',
              0,
              'lever-ready',
              'Ready',
              tf(31, 67, 1),
              12,
            ),
            cel(
              'brick-ship',
              'brick-ship-sam',
              12,
              'lever',
              'Launch',
              tf(37, 63, 1.06, -8),
              12,
            ),
            cel(
              'brick-ship',
              'brick-ship-sam',
              24,
              'watch',
              'Watch it fly',
              tf(34, 65, 1.02, 4),
              20,
            ),
            cel(
              'brick-ship',
              'brick-ship-sam',
              44,
              'victory',
              'Tiny victory',
              tf(42, 61, 1.12, -3),
              16,
            ),
          ],
        ),
        track(
          'brick-ship',
          'brick-ship-rocket',
          'Feature rocket',
          'prop',
          'feature-rocket',
          '#79d2df',
          [
            cel(
              'brick-ship',
              'brick-ship-rocket',
              0,
              'idle',
              'On pad',
              tf(69, 62, 0.8),
              12,
            ),
            cel(
              'brick-ship',
              'brick-ship-rocket',
              12,
              'ignite',
              'Ignition',
              tf(69, 54, 0.9),
              12,
            ),
            cel(
              'brick-ship',
              'brick-ship-rocket',
              24,
              'rise',
              'Liftoff',
              tf(69, 32, 0.82),
              12,
            ),
            cel(
              'brick-ship',
              'brick-ship-rocket',
              36,
              'orbit',
              'Past deadline',
              tf(73, 9, 0.54, 7),
              24,
            ),
          ],
        ),
      ],
      captions: [
        caption(
          'brick-ship',
          'line-1',
          'Mina',
          coder.id,
          'It is not perfect. It is alive. Launch!',
          11,
          35,
        ),
        caption(
          'brick-ship',
          'line-2',
          'Mina',
          coder.id,
          'Okay. Now polish the landing page.',
          41,
          59,
        ),
      ],
      lipSync: [],
      sfx: [
        sfx(
          'brick-ship',
          'ignite',
          'Brick rocket ignition',
          'whoosh',
          12,
          36,
          0.82,
          73,
        ),
        sfx(
          'brick-ship',
          'success',
          'Green checks',
          'success',
          37,
          52,
          0.66,
          7,
        ),
      ],
      audio: [],
    }),
  ];
  return finalizeDemo('brick-breakout', 'Ship the Brick', scenes);
}

function createDeadlineDemo(): StagehandProject {
  const milo = makeCharacter(
    'milo',
    'Coil',
    'night-heron',
    '#3b6f95',
    '#d8e9ef',
    0,
    -0.21,
    0.92,
  );
  const patch = makeCharacter(
    'patch',
    'Stub',
    'red-panda',
    '#cf6845',
    '#f4d3ab',
    0,
    -0.2,
    0.92,
  );
  const boss = makeCharacter(
    'timestamp',
    'Mr. Timestamp',
    'clock-boss',
    '#d9b44a',
    '#2c3338',
    0,
    -0.02,
    0.8,
  );
  const scenes: Scene[] = [
    sceneWithLipSync({
      id: 'shift-brief',
      title: 'One tiny hackathon',
      description:
        'Coil and Stub receive a completely reasonable three-hour assignment.',
      frameCount: 48,
      background: 'office-night',
      palette: ['#26313b', '#3b6f95', '#cf6845', '#d9b44a'],
      characters: [milo, patch, boss],
      tracks: [
        track(
          'shift-brief',
          'shift-brief-camera',
          'Camera',
          'camera',
          'camera',
          '#80969f',
          [
            cel(
              'shift-brief',
              'shift-brief-camera',
              0,
              'office-wide',
              'Office wide',
              tf(0, 0, 1),
              28,
            ),
            cel(
              'shift-brief',
              'shift-brief-camera',
              28,
              'clock-close',
              'Deadline close-up',
              tf(-12, 5, 1.18),
              20,
            ),
          ],
        ),
        track(
          'shift-brief',
          'shift-brief-milo',
          'Coil',
          'character',
          milo.id,
          '#3b6f95',
          [
            cel(
              'shift-brief',
              'shift-brief-milo',
              0,
              'slouch',
              'Listening',
              tf(31, 66, 1),
              24,
            ),
            cel(
              'shift-brief',
              'shift-brief-milo',
              24,
              'side-eye',
              'Side-eye',
              tf(31, 66, 1, -2),
              24,
            ),
          ],
        ),
        track(
          'shift-brief',
          'shift-brief-patch',
          'Stub',
          'character',
          patch.id,
          '#cf6845',
          [
            cel(
              'shift-brief',
              'shift-brief-patch',
              0,
              'coffee',
              'Coffee',
              tf(58, 68, 0.96),
              20,
            ),
            cel(
              'shift-brief',
              'shift-brief-patch',
              20,
              'shrug',
              'Confident shrug',
              tf(58, 65, 1.02, 3),
              28,
            ),
          ],
        ),
        track(
          'shift-brief',
          'shift-brief-boss',
          'Mr. Timestamp',
          'character',
          boss.id,
          '#d9b44a',
          [
            cel(
              'shift-brief',
              'shift-brief-boss',
              0,
              'brief',
              'Deliver the brief',
              tf(81, 42, 0.82),
              24,
            ),
            cel(
              'shift-brief',
              'shift-brief-boss',
              24,
              'tick',
              'Menacing tick',
              tf(81, 42, 0.88, 4),
              24,
            ),
          ],
        ),
      ],
      captions: [
        caption(
          'shift-brief',
          'line-1',
          'Mr. Timestamp',
          boss.id,
          'Build an animation studio. You have three hours.',
          4,
          24,
        ),
        caption(
          'shift-brief',
          'line-2',
          'Stub',
          patch.id,
          'That is basically forever in demo time.',
          25,
          46,
        ),
      ],
      lipSync: [],
      sfx: [
        sfx(
          'shift-brief',
          'tick',
          'Aggressive wall clock',
          'cash-register',
          24,
          47,
          0.38,
          3,
        ),
      ],
      audio: [],
    }),
    sceneWithLipSync({
      id: 'shift-rig',
      title: 'The rigging incident',
      description:
        'A passing skeleton check produces one deeply disconnected character.',
      frameCount: 60,
      background: 'rig-graveyard',
      palette: ['#e9e4d7', '#3b6f95', '#cf6845', '#ef5f4b'],
      characters: [milo, patch],
      tracks: [
        track(
          'shift-rig',
          'shift-rig-camera',
          'Camera',
          'camera',
          'camera',
          '#80969f',
          [
            cel(
              'shift-rig',
              'shift-rig-camera',
              0,
              'monitor-two-shot',
              'Monitor two-shot',
              tf(0, 0, 1),
              36,
            ),
            cel(
              'shift-rig',
              'shift-rig-camera',
              36,
              'limb-close',
              'Detached limb close-up',
              tf(13, -3, 1.2, -1),
              24,
            ),
          ],
        ),
        track(
          'shift-rig',
          'shift-rig-milo',
          'Coil',
          'character',
          milo.id,
          '#3b6f95',
          [
            cel(
              'shift-rig',
              'shift-rig-milo',
              0,
              'type',
              'Run validation',
              tf(28, 66, 1),
              18,
            ),
            cel(
              'shift-rig',
              'shift-rig-milo',
              18,
              'hope',
              'Green check',
              tf(31, 63, 1.02, -2),
              18,
            ),
            cel(
              'shift-rig',
              'shift-rig-milo',
              36,
              'horror',
              'Sees the render',
              tf(31, 63, 1.08, -7),
              24,
            ),
          ],
        ),
        track(
          'shift-rig',
          'shift-rig-patch',
          'Stub',
          'character',
          patch.id,
          '#cf6845',
          [
            cel(
              'shift-rig',
              'shift-rig-patch',
              0,
              'watch',
              'Watching',
              tf(66, 68, 0.96),
              28,
            ),
            cel(
              'shift-rig',
              'shift-rig-patch',
              28,
              'hold-limb',
              'Finds a spare arm',
              tf(66, 64, 1.04, 5),
              32,
            ),
          ],
        ),
        track(
          'shift-rig',
          'shift-rig-limb',
          'Detached limb',
          'prop',
          'detached-limb',
          '#ef5f4b',
          [
            cel(
              'shift-rig',
              'shift-rig-limb',
              0,
              'hidden',
              'Still attached',
              tf(80, 72, 0.01, 0, 0),
              24,
            ),
            cel(
              'shift-rig',
              'shift-rig-limb',
              24,
              'fall',
              'Falls through preview',
              tf(73, 45, 0.72, 20),
              12,
            ),
            cel(
              'shift-rig',
              'shift-rig-limb',
              36,
              'floor',
              'On the floor',
              tf(70, 79, 0.62, 82),
              24,
            ),
          ],
        ),
      ],
      captions: [
        caption(
          'shift-rig',
          'line-1',
          'Coil',
          milo.id,
          'Skeleton validation passed.',
          12,
          27,
        ),
        caption(
          'shift-rig',
          'line-2',
          'Stub',
          patch.id,
          'The skeleton has chosen independence.',
          31,
          56,
        ),
      ],
      lipSync: [],
      sfx: [
        sfx(
          'shift-rig',
          'success',
          'Misleading green check',
          'success',
          17,
          25,
          0.4,
          9,
        ),
        sfx(
          'shift-rig',
          'limb',
          'Arm on linoleum',
          'brick-pop',
          27,
          39,
          0.65,
          62,
        ),
      ],
      audio: [],
    }),
    sceneWithLipSync({
      id: 'shift-scope',
      title: 'Forty tools later',
      description: 'The command surface grows until it has weather patterns.',
      frameCount: 60,
      background: 'scope-vortex',
      palette: ['#23273a', '#77b7d1', '#cf6845', '#ad77c7'],
      characters: [milo, patch],
      tracks: [
        track(
          'shift-scope',
          'shift-scope-camera',
          'Camera',
          'camera',
          'camera',
          '#80969f',
          [
            cel(
              'shift-scope',
              'shift-scope-camera',
              0,
              'vortex-wide',
              'Tool vortex',
              tf(0, 0, 1),
              30,
            ),
            cel(
              'shift-scope',
              'shift-scope-camera',
              30,
              'spin',
              'Scope spin',
              tf(0, 0, 1.12, 4),
              30,
            ),
          ],
        ),
        track(
          'shift-scope',
          'shift-scope-milo',
          'Coil',
          'character',
          milo.id,
          '#3b6f95',
          [
            cel(
              'shift-scope',
              'shift-scope-milo',
              0,
              'count',
              'Counting tools',
              tf(31, 68, 0.98),
              20,
            ),
            cel(
              'shift-scope',
              'shift-scope-milo',
              20,
              'buried',
              'Buried in schemas',
              tf(34, 73, 0.84, -9),
              20,
            ),
            cel(
              'shift-scope',
              'shift-scope-milo',
              40,
              'idea',
              'Pivot idea',
              tf(38, 63, 1.08, 2),
              20,
            ),
          ],
        ),
        track(
          'shift-scope',
          'shift-scope-patch',
          'Stub',
          'character',
          patch.id,
          '#cf6845',
          [
            cel(
              'shift-scope',
              'shift-scope-patch',
              0,
              'scroll',
              'Scrolls tool list',
              tf(64, 67, 1),
              20,
            ),
            cel(
              'shift-scope',
              'shift-scope-patch',
              20,
              'wind',
              'Schema wind',
              tf(67, 65, 1.05, 11),
              20,
            ),
            cel(
              'shift-scope',
              'shift-scope-patch',
              40,
              'point',
              'Points to frames',
              tf(61, 61, 1.08, -4),
              20,
            ),
          ],
        ),
        track(
          'shift-scope',
          'shift-scope-cards',
          'Tool cards',
          'prop',
          'tool-cards',
          '#ad77c7',
          [
            cel(
              'shift-scope',
              'shift-scope-cards',
              0,
              'eight',
              'Eight tools',
              tf(50, 39, 0.66),
              15,
            ),
            cel(
              'shift-scope',
              'shift-scope-cards',
              15,
              'twenty',
              'Twenty tools',
              tf(50, 39, 0.86, -3),
              15,
            ),
            cel(
              'shift-scope',
              'shift-scope-cards',
              30,
              'forty',
              'Forty tools',
              tf(50, 39, 1.08, 4),
              30,
            ),
          ],
        ),
      ],
      captions: [
        caption(
          'shift-scope',
          'line-1',
          'Coil',
          milo.id,
          'Why do we have a tool for editing a bone that fell off?',
          8,
          34,
        ),
        caption(
          'shift-scope',
          'line-2',
          'Stub',
          patch.id,
          'Counterproposal: drawings that stay where we put them.',
          35,
          59,
        ),
      ],
      lipSync: [],
      sfx: [
        sfx(
          'shift-scope',
          'schema',
          'Schema cyclone',
          'whoosh',
          12,
          38,
          0.55,
          22,
        ),
        sfx(
          'shift-scope',
          'idea',
          'Frame-by-frame idea',
          'success',
          42,
          54,
          0.5,
          14,
        ),
      ],
      audio: [],
    }),
    sceneWithLipSync({
      id: 'shift-pivot',
      title: 'Duplicate. Nudge. Hold.',
      description: 'They replace the bone graph with visible authored frames.',
      frameCount: 60,
      background: 'frame-workbench',
      palette: ['#f1eadc', '#3b6f95', '#cf6845', '#3e9a87'],
      characters: [milo, patch],
      tracks: [
        track(
          'shift-pivot',
          'shift-pivot-camera',
          'Camera',
          'camera',
          'camera',
          '#80969f',
          [
            cel(
              'shift-pivot',
              'shift-pivot-camera',
              0,
              'frame-board',
              'Frame board',
              tf(0, 0, 1),
              40,
            ),
            cel(
              'shift-pivot',
              'shift-pivot-camera',
              40,
              'preview',
              'Preview punch-in',
              tf(-5, 1, 1.13),
              20,
            ),
          ],
        ),
        track(
          'shift-pivot',
          'shift-pivot-milo',
          'Coil',
          'character',
          milo.id,
          '#3b6f95',
          [
            cel(
              'shift-pivot',
              'shift-pivot-milo',
              0,
              'draw-a',
              'Drawing A',
              tf(29, 66, 1),
              12,
            ),
            cel(
              'shift-pivot',
              'shift-pivot-milo',
              12,
              'draw-b',
              'Drawing B',
              tf(32, 64, 1.02, -2),
              12,
            ),
            cel(
              'shift-pivot',
              'shift-pivot-milo',
              24,
              'draw-c',
              'Drawing C',
              tf(35, 62, 1.04, 2),
              12,
            ),
            cel(
              'shift-pivot',
              'shift-pivot-milo',
              36,
              'play',
              'Playback',
              tf(38, 61, 1.08),
              24,
            ),
          ],
        ),
        track(
          'shift-pivot',
          'shift-pivot-patch',
          'Stub',
          'character',
          patch.id,
          '#cf6845',
          [
            cel(
              'shift-pivot',
              'shift-pivot-patch',
              0,
              'onion-back',
              'Past onion skin',
              tf(65, 67, 1, -3, 0.35),
              12,
            ),
            cel(
              'shift-pivot',
              'shift-pivot-patch',
              12,
              'onion-now',
              'Current drawing',
              tf(65, 64, 1.03, 0, 1),
              12,
            ),
            cel(
              'shift-pivot',
              'shift-pivot-patch',
              24,
              'onion-next',
              'Future onion skin',
              tf(65, 61, 1.05, 3, 0.45),
              12,
            ),
            cel(
              'shift-pivot',
              'shift-pivot-patch',
              36,
              'play',
              'Playback',
              tf(65, 61, 1.08),
              24,
            ),
          ],
        ),
      ],
      captions: [
        caption(
          'shift-pivot',
          'line-1',
          'Coil',
          milo.id,
          'Duplicate the drawing. Change the pose. Hold it.',
          6,
          31,
        ),
        caption(
          'shift-pivot',
          'line-2',
          'Stub',
          patch.id,
          'It is suspiciously understandable.',
          34,
          57,
        ),
      ],
      lipSync: [],
      sfx: [
        sfx('shift-pivot', 'frames', 'Cel flips', 'keyboard', 5, 42, 0.5, 35),
      ],
      audio: [],
    }),
    sceneWithLipSync({
      id: 'shift-ship',
      title: 'Hosted before sunrise',
      description:
        'The demo plays while the old skeleton watches from the trash can.',
      frameCount: 60,
      background: 'launch-room',
      palette: ['#1f2933', '#77b7d1', '#cf6845', '#68c3a3'],
      characters: [milo, patch, boss],
      tracks: [
        track(
          'shift-ship',
          'shift-ship-camera',
          'Camera',
          'camera',
          'camera',
          '#80969f',
          [
            cel(
              'shift-ship',
              'shift-ship-camera',
              0,
              'screen-wide',
              'Hosted preview',
              tf(0, 0, 1),
              36,
            ),
            cel(
              'shift-ship',
              'shift-ship-camera',
              36,
              'team-close',
              'Team close-up',
              tf(1, -1, 1.12),
              24,
            ),
          ],
        ),
        track(
          'shift-ship',
          'shift-ship-milo',
          'Coil',
          'character',
          milo.id,
          '#3b6f95',
          [
            cel(
              'shift-ship',
              'shift-ship-milo',
              0,
              'watch',
              'Watching deploy',
              tf(29, 66, 1),
              20,
            ),
            cel(
              'shift-ship',
              'shift-ship-milo',
              20,
              'relief',
              'Green deployment',
              tf(32, 64, 1.04, -2),
              20,
            ),
            cel(
              'shift-ship',
              'shift-ship-milo',
              40,
              'high-five',
              'High five',
              tf(39, 60, 1.08, 4),
              20,
            ),
          ],
        ),
        track(
          'shift-ship',
          'shift-ship-patch',
          'Stub',
          'character',
          patch.id,
          '#cf6845',
          [
            cel(
              'shift-ship',
              'shift-ship-patch',
              0,
              'watch',
              'Watching deploy',
              tf(66, 67, 1),
              20,
            ),
            cel(
              'shift-ship',
              'shift-ship-patch',
              20,
              'relief',
              'Green deployment',
              tf(63, 64, 1.04, 2),
              20,
            ),
            cel(
              'shift-ship',
              'shift-ship-patch',
              40,
              'high-five',
              'High five',
              tf(57, 60, 1.08, -4),
              20,
            ),
          ],
        ),
        track(
          'shift-ship',
          'shift-ship-boss',
          'Mr. Timestamp',
          'character',
          boss.id,
          '#d9b44a',
          [
            cel(
              'shift-ship',
              'shift-ship-boss',
              0,
              'watch',
              'Judging',
              tf(84, 42, 0.76),
              36,
            ),
            cel(
              'shift-ship',
              'shift-ship-boss',
              36,
              'smile',
              'One-minute smile',
              tf(84, 42, 0.8, -3),
              24,
            ),
          ],
        ),
      ],
      captions: [
        caption(
          'shift-ship',
          'line-1',
          'Mr. Timestamp',
          boss.id,
          'You removed half the system.',
          18,
          34,
        ),
        caption(
          'shift-ship',
          'line-2',
          'Coil',
          milo.id,
          'Yes. Now the other half works.',
          35,
          58,
        ),
      ],
      lipSync: [],
      sfx: [
        sfx(
          'shift-ship',
          'deploy',
          'Deployment success',
          'success',
          20,
          34,
          0.68,
          77,
        ),
        sfx('shift-ship', 'five', 'High five', 'brick-pop', 42, 48, 0.5, 48),
      ],
      audio: [],
    }),
  ];
  return finalizeDemo('deadline-show', 'One More Deploy', scenes);
}

function createPattyDemo(): StagehandProject {
  const human = makeCharacter(
    'human',
    'Dev',
    'human-cutout',
    '#ffffff',
    '#23508b',
    0,
    -0.24,
    0.78,
    '#9a6449',
  );
  const cashier = makeCharacter(
    'cashier',
    'Raya',
    'coral-cashier',
    '#ff8ca2',
    '#f5d36e',
    0,
    -0.16,
    0.9,
  );
  const scenes: Scene[] = [
    sceneWithLipSync({
      id: 'patty-wakeup',
      title: 'Breathing soup',
      description:
        'A realistic human cutout wakes on the floor of a painted undersea snack shack.',
      frameCount: 48,
      background: 'undersea-bedroom',
      palette: ['#77d3e5', '#ff8ca2', '#f5d36e', '#5e4094'],
      characters: [human],
      tracks: [
        track(
          'patty-wakeup',
          'patty-wakeup-camera',
          'Camera',
          'camera',
          'camera',
          '#79aeb8',
          [
            cel(
              'patty-wakeup',
              'patty-wakeup-camera',
              0,
              'ceiling',
              'Painted ceiling',
              tf(0, 11, 1.13),
              16,
            ),
            cel(
              'patty-wakeup',
              'patty-wakeup-camera',
              16,
              'bed-wide',
              'Reveal room',
              tf(0, 0, 1),
              32,
            ),
          ],
        ),
        track(
          'patty-wakeup',
          'patty-wakeup-human',
          'Dev cutout',
          'character',
          human.id,
          '#ffffff',
          [
            cel(
              'patty-wakeup',
              'patty-wakeup-human',
              0,
              'sleep',
              'Photographic sleep',
              tf(48, 70, 1.04, -4),
              12,
            ),
            cel(
              'patty-wakeup',
              'patty-wakeup-human',
              12,
              'blink',
              'Blink',
              tf(48, 66, 1.04),
              12,
            ),
            cel(
              'patty-wakeup',
              'patty-wakeup-human',
              24,
              'sit-up',
              'White-border sit-up',
              tf(48, 60, 1.07, 2),
              12,
            ),
            cel(
              'patty-wakeup',
              'patty-wakeup-human',
              36,
              'confused',
              'Checks reality',
              tf(48, 59, 1.08, -3),
              12,
            ),
          ],
        ),
      ],
      captions: [
        caption(
          'patty-wakeup',
          'line-1',
          'Dev',
          human.id,
          'Why am I breathing soup?',
          18,
          46,
        ),
      ],
      lipSync: [],
      sfx: [
        sfx(
          'patty-wakeup',
          'bubbles',
          'Bedroom bubbles',
          'jelly-bloop',
          1,
          46,
          0.32,
          24,
        ),
        sfx('patty-wakeup', 'sit', 'Cutout rustle', 'whoosh', 22, 34, 0.42, 13),
      ],
      audio: [],
    }),
    sceneWithLipSync({
      id: 'patty-town',
      title: 'Bikini Bottom commute',
      description:
        'The human walks through a flat cartoon town while jellyfish inspect the compositing.',
      frameCount: 60,
      background: 'undersea-street',
      palette: ['#5dd4e6', '#ff8ca2', '#ffd05a', '#7045a0'],
      characters: [human],
      tracks: [
        track(
          'patty-town',
          'patty-town-camera',
          'Camera',
          'camera',
          'camera',
          '#79aeb8',
          [
            cel(
              'patty-town',
              'patty-town-camera',
              0,
              'street-wide',
              'Street wide',
              tf(0, 0, 1),
              36,
            ),
            cel(
              'patty-town',
              'patty-town-camera',
              36,
              'diner-reveal',
              'Diner reveal',
              tf(-10, 0, 1.12),
              24,
            ),
          ],
        ),
        track(
          'patty-town',
          'patty-town-human',
          'Dev cutout',
          'character',
          human.id,
          '#ffffff',
          [
            cel(
              'patty-town',
              'patty-town-human',
              0,
              'walk-a',
              'Walk A',
              tf(14, 69, 0.92, -2),
              10,
            ),
            cel(
              'patty-town',
              'patty-town-human',
              10,
              'walk-b',
              'Walk B',
              tf(29, 67, 0.94, 2),
              10,
            ),
            cel(
              'patty-town',
              'patty-town-human',
              20,
              'walk-a',
              'Walk A',
              tf(44, 69, 0.96, -2),
              10,
            ),
            cel(
              'patty-town',
              'patty-town-human',
              30,
              'walk-b',
              'Walk B',
              tf(58, 67, 0.98, 2),
              10,
            ),
            cel(
              'patty-town',
              'patty-town-human',
              40,
              'sniff',
              'Smells the grill',
              tf(67, 64, 1.02, -3),
              20,
            ),
          ],
        ),
        track(
          'patty-town',
          'patty-town-jelly',
          'Jellyfish',
          'prop',
          'jellyfish',
          '#ff8ca2',
          [
            cel(
              'patty-town',
              'patty-town-jelly',
              0,
              'float-left',
              'Jelly left',
              tf(31, 27, 0.68, -6),
              15,
            ),
            cel(
              'patty-town',
              'patty-town-jelly',
              15,
              'float-mid',
              'Jelly middle',
              tf(47, 21, 0.72, 3),
              15,
            ),
            cel(
              'patty-town',
              'patty-town-jelly',
              30,
              'float-right',
              'Jelly right',
              tf(63, 27, 0.68, -4),
              30,
            ),
          ],
        ),
      ],
      captions: [
        caption(
          'patty-town',
          'line-1',
          'Dev',
          human.id,
          'Good news: the ocean has a walkable downtown.',
          8,
          35,
        ),
        caption(
          'patty-town',
          'line-2',
          'Dev',
          human.id,
          'Better news: somebody is grilling.',
          38,
          58,
        ),
      ],
      lipSync: [],
      sfx: [
        sfx(
          'patty-town',
          'steps',
          'Wet cutout footsteps',
          'splash',
          2,
          39,
          0.45,
          67,
        ),
        sfx(
          'patty-town',
          'jelly',
          'Jellyfish bloops',
          'jelly-bloop',
          8,
          50,
          0.38,
          71,
        ),
      ],
      audio: [],
    }),
    sceneWithLipSync({
      id: 'patty-order',
      title: 'One Krabby Patty',
      description:
        'The cartoon cashier accepts the order and rejects the currency.',
      frameCount: 60,
      background: 'coral-diner',
      palette: ['#f2df9f', '#ff8ca2', '#5bc5d5', '#8a5d3b'],
      characters: [human, cashier],
      tracks: [
        track(
          'patty-order',
          'patty-order-camera',
          'Camera',
          'camera',
          'camera',
          '#79aeb8',
          [
            cel(
              'patty-order',
              'patty-order-camera',
              0,
              'counter-two-shot',
              'Counter two-shot',
              tf(0, 0, 1),
              32,
            ),
            cel(
              'patty-order',
              'patty-order-camera',
              32,
              'wallet-close',
              'Wallet close-up',
              tf(12, -2, 1.18),
              28,
            ),
          ],
        ),
        track(
          'patty-order',
          'patty-order-human',
          'Dev cutout',
          'character',
          human.id,
          '#ffffff',
          [
            cel(
              'patty-order',
              'patty-order-human',
              0,
              'order',
              'Orders politely',
              tf(31, 66, 1),
              18,
            ),
            cel(
              'patty-order',
              'patty-order-human',
              18,
              'wallet',
              'Opens city wallet',
              tf(36, 64, 1.03, -2),
              18,
            ),
            cel(
              'patty-order',
              'patty-order-human',
              36,
              'search',
              'Checks every pocket',
              tf(33, 67, 1.02, 4),
              24,
            ),
          ],
        ),
        track(
          'patty-order',
          'patty-order-cashier',
          'Raya',
          'character',
          cashier.id,
          '#ff8ca2',
          [
            cel(
              'patty-order',
              'patty-order-cashier',
              0,
              'welcome',
              'Welcome',
              tf(71, 57, 1.02),
              18,
            ),
            cel(
              'patty-order',
              'patty-order-cashier',
              18,
              'scan',
              'Scans wallet',
              tf(69, 56, 1.04, -2),
              18,
            ),
            cel(
              'patty-order',
              'patty-order-cashier',
              36,
              'no-clams',
              'Currency rejected',
              tf(71, 56, 1.08, 3),
              24,
            ),
          ],
        ),
        track(
          'patty-order',
          'patty-order-wallet',
          'Wrong wallet',
          'prop',
          'wallet',
          '#23508b',
          [
            cel(
              'patty-order',
              'patty-order-wallet',
              0,
              'hidden',
              'Pocket',
              tf(49, 76, 0.01, 0, 0),
              18,
            ),
            cel(
              'patty-order',
              'patty-order-wallet',
              18,
              'metrocard',
              'MetroCard reveal',
              tf(49, 59, 0.65, -6),
              18,
            ),
            cel(
              'patty-order',
              'patty-order-wallet',
              36,
              'empty',
              'No clams',
              tf(49, 59, 0.68, 4),
              24,
            ),
          ],
        ),
      ],
      captions: [
        caption(
          'patty-order',
          'line-1',
          'Dev',
          human.id,
          'One Krabby Patty, please. Extra normal.',
          3,
          24,
        ),
        caption(
          'patty-order',
          'line-2',
          'Raya',
          cashier.id,
          'Eight. Sand. Dollars.',
          25,
          38,
        ),
        caption(
          'patty-order',
          'line-3',
          'Dev',
          human.id,
          'I only have regular dollars.',
          39,
          59,
        ),
      ],
      lipSync: [],
      sfx: [
        sfx(
          'patty-order',
          'register',
          'Clam register',
          'cash-register',
          26,
          37,
          0.64,
          13,
        ),
        sfx(
          'patty-order',
          'wallet',
          'Wrong wallet reveal',
          'error-zap',
          40,
          49,
          0.38,
          81,
        ),
      ],
      audio: [],
    }),
    sceneWithLipSync({
      id: 'patty-barter',
      title: 'Will animate for lunch',
      description:
        'Dev opens Stagehand and gives the diner menu a six-frame dance.',
      frameCount: 60,
      background: 'diner-backroom',
      palette: ['#283946', '#ff8ca2', '#f5d36e', '#57c5b6'],
      characters: [human, cashier],
      tracks: [
        track(
          'patty-barter',
          'patty-barter-camera',
          'Camera',
          'camera',
          'camera',
          '#79aeb8',
          [
            cel(
              'patty-barter',
              'patty-barter-camera',
              0,
              'laptop-wide',
              'Laptop wide',
              tf(0, 0, 1),
              36,
            ),
            cel(
              'patty-barter',
              'patty-barter-camera',
              36,
              'menu-close',
              'Animated menu',
              tf(-6, 3, 1.15),
              24,
            ),
          ],
        ),
        track(
          'patty-barter',
          'patty-barter-human',
          'Dev cutout',
          'character',
          human.id,
          '#ffffff',
          [
            cel(
              'patty-barter',
              'patty-barter-human',
              0,
              'pitch',
              'Offers a trade',
              tf(31, 66, 1),
              16,
            ),
            cel(
              'patty-barter',
              'patty-barter-human',
              16,
              'type',
              'Builds six frames',
              tf(34, 64, 1.02, -2),
              20,
            ),
            cel(
              'patty-barter',
              'patty-barter-human',
              36,
              'present',
              'Shows playback',
              tf(40, 61, 1.08, 3),
              24,
            ),
          ],
        ),
        track(
          'patty-barter',
          'patty-barter-cashier',
          'Raya',
          'character',
          cashier.id,
          '#ff8ca2',
          [
            cel(
              'patty-barter',
              'patty-barter-cashier',
              0,
              'skeptical',
              'Skeptical',
              tf(71, 58, 1.02, -2),
              20,
            ),
            cel(
              'patty-barter',
              'patty-barter-cashier',
              20,
              'watch',
              'Watches preview',
              tf(68, 57, 1.04),
              20,
            ),
            cel(
              'patty-barter',
              'patty-barter-cashier',
              40,
              'delighted',
              'Approves the barter',
              tf(68, 54, 1.12, 3),
              20,
            ),
          ],
        ),
        track(
          'patty-barter',
          'patty-barter-menu',
          'Dancing menu',
          'prop',
          'menu-board',
          '#f5d36e',
          [
            cel(
              'patty-barter',
              'patty-barter-menu',
              0,
              'menu-a',
              'Menu A',
              tf(52, 35, 0.68, -4),
              10,
            ),
            cel(
              'patty-barter',
              'patty-barter-menu',
              10,
              'menu-b',
              'Menu B',
              tf(52, 30, 0.72, 4),
              10,
            ),
            cel(
              'patty-barter',
              'patty-barter-menu',
              20,
              'menu-c',
              'Menu C',
              tf(52, 34, 0.74, -3),
              10,
            ),
            cel(
              'patty-barter',
              'patty-barter-menu',
              30,
              'menu-d',
              'Menu D',
              tf(52, 29, 0.78, 3),
              10,
            ),
            cel(
              'patty-barter',
              'patty-barter-menu',
              40,
              'menu-e',
              'Menu E',
              tf(52, 33, 0.8, -2),
              10,
            ),
            cel(
              'patty-barter',
              'patty-barter-menu',
              50,
              'menu-f',
              'Menu F',
              tf(52, 28, 0.84, 2),
              10,
            ),
          ],
        ),
      ],
      captions: [
        caption(
          'patty-barter',
          'line-1',
          'Dev',
          human.id,
          'What if I animate your lunch menu?',
          4,
          21,
        ),
        caption(
          'patty-barter',
          'line-2',
          'Raya',
          cashier.id,
          'Add one tasteful bubble transition.',
          24,
          44,
        ),
        caption(
          'patty-barter',
          'line-3',
          'Dev',
          human.id,
          'I can synthesize that.',
          45,
          59,
        ),
      ],
      lipSync: [],
      sfx: [
        sfx(
          'patty-barter',
          'typing',
          'Undersea keyboard',
          'keyboard',
          14,
          39,
          0.42,
          53,
        ),
        sfx(
          'patty-barter',
          'menu',
          'Menu bounce',
          'jelly-bloop',
          20,
          55,
          0.5,
          17,
        ),
      ],
      audio: [],
    }),
    sceneWithLipSync({
      id: 'patty-payoff',
      title: 'Paid in frames',
      description:
        'The mixed-media hero finally gets lunch and discovers the exchange rate.',
      frameCount: 60,
      background: 'coral-patio',
      palette: ['#65d5e6', '#ff8ca2', '#f5d36e', '#58a97b'],
      characters: [human, cashier],
      tracks: [
        track(
          'patty-payoff',
          'patty-payoff-camera',
          'Camera',
          'camera',
          'camera',
          '#79aeb8',
          [
            cel(
              'patty-payoff',
              'patty-payoff-camera',
              0,
              'patio-wide',
              'Patio wide',
              tf(0, 0, 1),
              36,
            ),
            cel(
              'patty-payoff',
              'patty-payoff-camera',
              36,
              'patty-close',
              'Patty close-up',
              tf(8, -1, 1.2),
              24,
            ),
          ],
        ),
        track(
          'patty-payoff',
          'patty-payoff-human',
          'Dev cutout',
          'character',
          human.id,
          '#ffffff',
          [
            cel(
              'patty-payoff',
              'patty-payoff-human',
              0,
              'receive',
              'Receives lunch',
              tf(38, 65, 1.02),
              16,
            ),
            cel(
              'patty-payoff',
              'patty-payoff-human',
              16,
              'bite',
              'First bite',
              tf(41, 62, 1.08, -3),
              16,
            ),
            cel(
              'patty-payoff',
              'patty-payoff-human',
              32,
              'bliss',
              'Mixed-media bliss',
              tf(41, 61, 1.1, 2),
              16,
            ),
            cel(
              'patty-payoff',
              'patty-payoff-human',
              48,
              'bill',
              'Sees revision bill',
              tf(43, 63, 1.08, -4),
              12,
            ),
          ],
        ),
        track(
          'patty-payoff',
          'patty-payoff-cashier',
          'Raya',
          'character',
          cashier.id,
          '#ff8ca2',
          [
            cel(
              'patty-payoff',
              'patty-payoff-cashier',
              0,
              'serve',
              'Serves patty',
              tf(72, 57, 1.02),
              24,
            ),
            cel(
              'patty-payoff',
              'patty-payoff-cashier',
              24,
              'proud',
              'Proud cashier',
              tf(72, 55, 1.06, 2),
              20,
            ),
            cel(
              'patty-payoff',
              'patty-payoff-cashier',
              44,
              'invoice',
              'Shows invoice',
              tf(69, 54, 1.08, -3),
              16,
            ),
          ],
        ),
        track(
          'patty-payoff',
          'patty-payoff-food',
          'Krabby Patty',
          'prop',
          'krabby-patty',
          '#f5d36e',
          [
            cel(
              'patty-payoff',
              'patty-payoff-food',
              0,
              'tray',
              'On tray',
              tf(55, 63, 0.54),
              16,
            ),
            cel(
              'patty-payoff',
              'patty-payoff-food',
              16,
              'bite',
              'One bite missing',
              tf(49, 54, 0.48, -4),
              16,
            ),
            cel(
              'patty-payoff',
              'patty-payoff-food',
              32,
              'sparkle',
              'Perfect patty',
              tf(49, 54, 0.52, 3),
              28,
            ),
          ],
        ),
      ],
      captions: [
        caption(
          'patty-payoff',
          'line-1',
          'Dev',
          human.id,
          'Can I pay in exposure?',
          18,
          39,
        ),
        caption(
          'patty-payoff',
          'line-2',
          'Raya',
          cashier.id,
          'You can eat in exposure.',
          40,
          59,
        ),
      ],
      lipSync: [],
      sfx: [
        sfx(
          'patty-payoff',
          'serve',
          'Patty sparkle',
          'success',
          3,
          18,
          0.58,
          98,
        ),
        sfx(
          'patty-payoff',
          'bite',
          'Cartoon bite',
          'brick-pop',
          17,
          25,
          0.48,
          12,
        ),
        sfx(
          'patty-payoff',
          'tag',
          'Final bubble sting',
          'jelly-bloop',
          46,
          59,
          0.55,
          4,
        ),
      ],
      audio: [],
    }),
  ];
  return finalizeDemo('no-clams-no-patty', 'Land Money', scenes);
}

function finalizeDemo(
  demoId: DemoId,
  name: string,
  scenes: Scene[],
): StagehandProject {
  const storyboard = scenes.map((scene, index) => ({
    id: `beat-${scene.id}`,
    sceneId: scene.id,
    title: scene.title,
    description: scene.description,
    thumbnailLabel: `${String(index + 1).padStart(2, '0')} · ${scene.frameCount}f`,
  }));
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: `demo-${demoId}`,
    demoId,
    name,
    revision: 1,
    fps: 12,
    renderWidth: 1280,
    renderHeight: 720,
    activeSceneId: scenes[0].id,
    currentFrame: 0,
    selectedTrackId: scenes[0].tracks.find((item) => item.kind === 'character')
      ?.id,
    selectedCelId: scenes[0].tracks.find((item) => item.kind === 'character')
      ?.cels[0]?.id,
    scenes,
    storyboard,
    assets: [],
    assetRequests: [],
    migrationWarnings: [],
    dirty: false,
  };
}

type DemoAssetSpec = Pick<
  Asset,
  'id' | 'kind' | 'label' | 'dataUrl' | 'dimensions' | 'frameGrid'
>;

const generatedAsset = (spec: DemoAssetSpec): Asset => ({
  ...spec,
  source: 'generated',
  reviewStatus: 'approved',
  mimeType: 'image/png',
  provenance: {
    author: 'OpenAI image generation',
    sourceUrl: '/demo-assets/provenance.json',
    license: 'Original project asset',
  },
});

const DEMO_ASSETS: Record<DemoId, DemoAssetSpec[]> = {
  'brick-breakout': [
    {
      id: 'brick-bg',
      kind: 'background',
      label: 'Brick rocket lab',
      dataUrl: '/demo-assets/brick/brick-rocket-lab-bg.png',
      dimensions: { width: 1672, height: 941 },
    },
    {
      id: 'brick-mina',
      kind: 'character',
      label: 'Mina four-pose sheet',
      dataUrl: '/demo-assets/brick/mina-stagehand-sheet.png',
      dimensions: { width: 1600, height: 382 },
      frameGrid: { columns: 4, rows: 1 },
    },
    {
      id: 'brick-gus',
      kind: 'character',
      label: 'Gus four-pose sheet',
      dataUrl: '/demo-assets/brick/gus-stagehand-sheet.png',
      dimensions: { width: 1600, height: 392 },
      frameGrid: { columns: 4, rows: 1 },
    },
    {
      id: 'brick-rocket-intact',
      kind: 'prop',
      label: 'Intact rocket',
      dataUrl: '/demo-assets/brick/rocket-intact.png',
      dimensions: { width: 416, height: 356 },
    },
    {
      id: 'brick-rocket-wobble',
      kind: 'prop',
      label: 'Wobbling rocket',
      dataUrl: '/demo-assets/brick/rocket-wobble.png',
      dimensions: { width: 416, height: 356 },
    },
    {
      id: 'brick-rocket-rubble',
      kind: 'prop',
      label: 'Rocket rubble',
      dataUrl: '/demo-assets/brick/rocket-rubble.png',
      dimensions: { width: 416, height: 356 },
    },
    {
      id: 'brick-launch',
      kind: 'prop',
      label: 'Launching brick',
      dataUrl: '/demo-assets/brick/brick-launch.png',
      dimensions: { width: 416, height: 356 },
    },
  ],
  'deadline-show': [
    {
      id: 'hack-bg',
      kind: 'background',
      label: 'Midnight maker shed',
      dataUrl: '/demo-assets/hackathon/maker-shed-bg.png',
      dimensions: { width: 1672, height: 941 },
    },
    {
      id: 'hack-coil',
      kind: 'character',
      label: 'Coil four-pose sheet',
      dataUrl: '/demo-assets/hackathon/coil-stagehand-sheet.png',
      dimensions: { width: 1600, height: 452 },
      frameGrid: { columns: 4, rows: 1 },
    },
    {
      id: 'hack-stub',
      kind: 'character',
      label: 'Stub four-pose sheet',
      dataUrl: '/demo-assets/hackathon/stub-stagehand-sheet.png',
      dimensions: { width: 1600, height: 397 },
      frameGrid: { columns: 4, rows: 1 },
    },
    {
      id: 'hack-laptop',
      kind: 'prop',
      label: 'Hackathon laptop',
      dataUrl: '/demo-assets/hackathon/laptop.png',
      dimensions: { width: 416, height: 336 },
    },
    {
      id: 'hack-arm',
      kind: 'prop',
      label: 'Detached puppet arm',
      dataUrl: '/demo-assets/hackathon/puppet-arm-fail.png',
      dimensions: { width: 416, height: 336 },
    },
    {
      id: 'hack-conflict',
      kind: 'prop',
      label: 'Revision conflict',
      dataUrl: '/demo-assets/hackathon/revision-conflict.png',
      dimensions: { width: 416, height: 336 },
    },
    {
      id: 'hack-deploy',
      kind: 'prop',
      label: 'Deploy button',
      dataUrl: '/demo-assets/hackathon/deploy-button.png',
      dimensions: { width: 416, height: 336 },
    },
  ],
  'no-clams-no-patty': [
    {
      id: 'sea-bg',
      kind: 'background',
      label: 'Undersea snack shack',
      dataUrl: '/demo-assets/undersea/snack-shack-bg.png',
      dimensions: { width: 1672, height: 941 },
    },
    {
      id: 'sea-dev',
      kind: 'character',
      label: 'Dev realistic cutout sheet',
      dataUrl: '/demo-assets/undersea/dev-stagehand-sheet.png',
      dimensions: { width: 1600, height: 482 },
      frameGrid: { columns: 4, rows: 1 },
    },
    {
      id: 'sea-raya',
      kind: 'character',
      label: 'Raya four-pose sheet',
      dataUrl: '/demo-assets/undersea/raya-stagehand-sheet.png',
      dimensions: { width: 1600, height: 382 },
      frameGrid: { columns: 4, rows: 1 },
    },
    {
      id: 'sea-burger',
      kind: 'prop',
      label: 'Cartoon burger',
      dataUrl: '/demo-assets/undersea/burger.png',
      dimensions: { width: 416, height: 336 },
    },
    {
      id: 'sea-sand-dollars',
      kind: 'prop',
      label: 'Sand dollars',
      dataUrl: '/demo-assets/undersea/sand-dollars.png',
      dimensions: { width: 416, height: 336 },
    },
    {
      id: 'sea-phone',
      kind: 'prop',
      label: 'Wet phone',
      dataUrl: '/demo-assets/undersea/wet-phone.png',
      dimensions: { width: 416, height: 336 },
    },
    {
      id: 'sea-tray',
      kind: 'prop',
      label: 'Empty shell tray',
      dataUrl: '/demo-assets/undersea/empty-tray.png',
      dimensions: { width: 416, height: 336 },
    },
  ],
};

function drawingFrame(drawing: string): number {
  const token = drawing.toLowerCase();
  if (/sleep|idle|listen|closed|ready|wide|slouch|faceoff/.test(token))
    return 0;
  if (/speak|type|walk|search|serve|lever|receive|idea|build|stack/.test(token))
    return 1;
  if (
    /panic|point|shock|horror|roar|explode|empty|bill|buried|pull/.test(token)
  )
    return 2;
  return 3;
}

function addDemoAssets(
  project: StagehandProject,
  demoId: DemoId,
): StagehandProject {
  project.assets = DEMO_ASSETS[demoId].map(generatedAsset);
  const backgroundAssetId =
    demoId === 'brick-breakout'
      ? 'brick-bg'
      : demoId === 'deadline-show'
        ? 'hack-bg'
        : 'sea-bg';
  for (const scene of project.scenes) {
    scene.backgroundAssetId = backgroundAssetId;
    for (const trackValue of scene.tracks) {
      if (trackValue.kind === 'character') {
        const character = scene.characters.find(
          (item) => item.id === trackValue.targetId,
        );
        const assetId =
          demoId === 'brick-breakout'
            ? character?.design === 'brick-bug'
              ? 'brick-gus'
              : 'brick-mina'
            : demoId === 'deadline-show'
              ? character?.design === 'red-panda'
                ? 'hack-stub'
                : character?.design === 'night-heron'
                  ? 'hack-coil'
                  : undefined
              : character?.design === 'coral-cashier'
                ? 'sea-raya'
                : character?.design === 'human-cutout'
                  ? 'sea-dev'
                  : undefined;
        if (assetId) {
          for (const item of trackValue.cels) {
            item.assetId = assetId;
            item.assetFrame = drawingFrame(item.drawing);
          }
        }
      }
      if (trackValue.kind === 'prop' || trackValue.kind === 'overlay') {
        for (const item of trackValue.cels) {
          if (
            demoId === 'brick-breakout' &&
            trackValue.targetId === 'feature-rocket'
          ) {
            item.assetId = /orbit/.test(item.drawing)
              ? 'brick-launch'
              : /ignite|rise/.test(item.drawing)
                ? 'brick-rocket-wobble'
                : 'brick-rocket-intact';
          } else if (
            demoId === 'deadline-show' &&
            trackValue.targetId === 'detached-limb'
          ) {
            item.assetId = 'hack-arm';
          } else if (
            demoId === 'deadline-show' &&
            trackValue.targetId === 'tool-cards'
          ) {
            item.assetId = 'hack-conflict';
          } else if (
            demoId === 'no-clams-no-patty' &&
            trackValue.targetId === 'krabby-patty'
          ) {
            item.assetId = 'sea-burger';
          } else if (
            demoId === 'no-clams-no-patty' &&
            trackValue.targetId === 'wallet'
          ) {
            item.assetId = /empty/.test(item.drawing)
              ? 'sea-phone'
              : 'sea-sand-dollars';
          }
        }
      }
    }
    scene.audio = scene.captions.map((caption) => {
      const assetId = `voice-${caption.id}`;
      project.assets.push({
        id: assetId,
        kind: 'audio',
        label: `${caption.speaker}: ${caption.text}`,
        source: 'generated',
        reviewStatus: 'approved',
        dataUrl: `/demo-assets/audio/${demoId}/${caption.id}.wav`,
        mimeType: 'audio/wav',
        durationMs: Math.round(
          ((caption.endFrame - caption.startFrame) / project.fps) * 1000,
        ),
        provenance: {
          author: 'OmniVoice voice design',
          sourceUrl: 'https://github.com/k2-fsa/OmniVoice',
          license: 'Locally generated with Apache-2.0 software',
          licenseUrl: 'https://github.com/k2-fsa/OmniVoice/blob/master/LICENSE',
        },
      });
      return {
        id: `cue-${caption.id}`,
        label: `${caption.speaker} dialogue`,
        kind: 'voice' as const,
        startFrame: caption.startFrame,
        endFrame: caption.endFrame,
        volume: 0.95,
        assetId,
      };
    });
  }
  return project;
}

export function createDemoProject(id: DemoId): StagehandProject {
  if (id === 'brick-breakout') return addDemoAssets(createBrickDemo(), id);
  if (id === 'deadline-show') return addDemoAssets(createDeadlineDemo(), id);
  return addDemoAssets(createPattyDemo(), id);
}

export function createBlankProject(options?: {
  name?: string;
  fps?: 12 | 24;
  frameCount?: number;
  renderPreset?: '720p' | '1080p';
}): StagehandProject {
  const sceneId = 'scene-01';
  const frameCount = Math.max(12, Math.min(1440, options?.frameCount ?? 120));
  const renderPreset = options?.renderPreset ?? '720p';
  const scene: Scene = {
    id: sceneId,
    title: 'Opening shot',
    description: 'A blank frame sequence ready for a story beat.',
    frameCount,
    background: 'blank-stage',
    palette: ['#e7ecea', '#f9fbfa', '#273236', '#2f7782'],
    characters: [],
    tracks: [
      track(
        sceneId,
        `${sceneId}-camera`,
        'Camera',
        'camera',
        'camera',
        '#91a4a8',
        [
          cel(
            sceneId,
            `${sceneId}-camera`,
            0,
            'wide',
            'Wide',
            tf(0, 0, 1),
            frameCount,
          ),
        ],
      ),
    ],
    captions: [],
    lipSync: [],
    sfx: [],
    audio: [],
  };
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: `project-${Date.now().toString(36)}`,
    name: options?.name?.trim() || 'Untitled frame animation',
    revision: 1,
    fps: options?.fps ?? 12,
    renderWidth: renderPreset === '1080p' ? 1920 : 1280,
    renderHeight: renderPreset === '1080p' ? 1080 : 720,
    activeSceneId: sceneId,
    currentFrame: 0,
    selectedTrackId: scene.tracks[0].id,
    selectedCelId: scene.tracks[0].cels[0].id,
    scenes: [scene],
    storyboard: [
      {
        id: `beat-${sceneId}`,
        sceneId,
        title: scene.title,
        description: scene.description,
        thumbnailLabel: `01 · ${frameCount}f`,
      },
    ],
    assets: [],
    assetRequests: [],
    migrationWarnings: [],
    dirty: false,
  };
}

export const cloneProject = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

export function activeScene(project: StagehandProject): Scene {
  return (
    project.scenes.find((scene) => scene.id === project.activeSceneId) ??
    project.scenes[0]
  );
}

export function framesToMs(frames: number, fps: number): number {
  return Math.round((frames / fps) * 1000);
}

export function msToFrame(ms: number, fps: number): number {
  return Math.max(0, Math.floor((ms / 1000) * fps));
}

export function sequenceFrameCount(project: StagehandProject): number {
  return project.scenes.reduce((sum, scene) => sum + scene.frameCount, 0);
}

export function sequenceDurationMs(project: StagehandProject): number {
  return framesToMs(sequenceFrameCount(project), project.fps);
}

export function heldCel(
  trackValue: AnimationTrack,
  frame: number,
): AnimationCel | null {
  let result: AnimationCel | null = null;
  for (const item of trackValue.cels) {
    if (item.frame > frame) break;
    result = item;
  }
  return result;
}

function mouthAt(scene: Scene, characterId: string, frame: number): MouthShape {
  return (
    scene.lipSync.find(
      (cue) =>
        cue.characterId === characterId &&
        frame >= cue.startFrame &&
        frame < cue.endFrame,
    )?.shape ?? 'X'
  );
}

export function evaluateFrame(
  project: StagehandProject,
  sceneId = project.activeSceneId,
  requestedFrame = project.currentFrame,
): EvaluatedFrame {
  const scene =
    project.scenes.find((item) => item.id === sceneId) ?? activeScene(project);
  const frame = Math.max(
    0,
    Math.min(scene.frameCount - 1, Math.floor(requestedFrame)),
  );
  const cameraTrack = scene.tracks.find(
    (item) => item.kind === 'camera' && !item.hidden,
  );
  const characterTracks = scene.tracks.filter(
    (item) => item.kind === 'character' && !item.hidden,
  );
  const props = scene.tracks
    .filter(
      (item) =>
        (item.kind === 'prop' || item.kind === 'overlay') && !item.hidden,
    )
    .map((item) => ({ track: item, cel: heldCel(item, frame) }));
  const characters = characterTracks.map((item) => ({
    character:
      scene.characters.find((character) => character.id === item.targetId) ??
      makeCharacter(
        item.targetId,
        item.name,
        'human-cutout',
        item.color,
        '#ffffff',
      ),
    cel: heldCel(item, frame),
    mouth: mouthAt(scene, item.targetId, frame),
  }));
  return {
    sceneId: scene.id,
    sceneTitle: scene.title,
    frame,
    timeMs: framesToMs(frame, project.fps),
    background: scene.background,
    backgroundAssetId: scene.backgroundAssetId,
    palette: scene.palette,
    camera: cameraTrack ? heldCel(cameraTrack, frame) : null,
    characters,
    props,
    caption:
      scene.captions.find(
        (item) => frame >= item.startFrame && frame < item.endFrame,
      ) ?? null,
    sfx: scene.sfx.filter(
      (item) => frame >= item.startFrame && frame < item.endFrame,
    ),
    audio: scene.audio.filter(
      (item) => frame >= item.startFrame && frame < item.endFrame,
    ),
  };
}

export function evaluateSequenceFrame(
  project: StagehandProject,
  requestedFrame: number,
): EvaluatedFrame {
  let cursor = Math.max(
    0,
    Math.min(sequenceFrameCount(project) - 1, Math.floor(requestedFrame)),
  );
  for (const scene of project.scenes) {
    if (cursor < scene.frameCount)
      return evaluateFrame(project, scene.id, cursor);
    cursor -= scene.frameCount;
  }
  const last = project.scenes.at(-1) ?? activeScene(project);
  return evaluateFrame(project, last.id, last.frameCount - 1);
}

function charToMouth(value: string): MouthShape {
  const character = value.toLowerCase();
  if (!/[a-z0-9]/.test(character)) return 'X';
  if ('mbp'.includes(character)) return 'A';
  if ('fv'.includes(character)) return 'G';
  if (character === 'l') return 'H';
  if ('ouqw'.includes(character)) return character === 'o' ? 'E' : 'F';
  if ('eiy'.includes(character)) return 'C';
  if ('a'.includes(character)) return 'D';
  if ('rstkngd'.includes(character)) return 'B';
  return 'B';
}

export function estimateLipSync(item: Caption, sceneId: string): LipSyncCue[] {
  const cleaned = item.text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  const duration = Math.max(1, item.endFrame - item.startFrame);
  const groups: Array<{ shape: MouthShape; weight: number }> = [];
  for (const character of cleaned) {
    const shape = charToMouth(character);
    const weight =
      shape === 'X' ? 0.4 : /[aeiouy]/i.test(character) ? 1.3 : 0.82;
    const previous = groups.at(-1);
    if (previous?.shape === shape) previous.weight += weight;
    else groups.push({ shape, weight });
  }
  const totalWeight = groups.reduce((sum, group) => sum + group.weight, 0);
  let cursor = item.startFrame;
  return groups
    .map((group, index) => {
      const remaining = item.endFrame - cursor;
      const proposed =
        index === groups.length - 1
          ? remaining
          : Math.max(1, Math.round((duration * group.weight) / totalWeight));
      const endFrame = Math.min(item.endFrame, cursor + proposed);
      const cue: LipSyncCue = {
        id: `${sceneId}-${item.id}-mouth-${index}`,
        sceneId,
        characterId: item.characterId,
        startFrame: cursor,
        endFrame,
        shape: group.shape,
        confidence: 0.62,
        source: 'estimated',
      };
      cursor = endFrame;
      return cue;
    })
    .filter((cue) => cue.endFrame > cue.startFrame);
}

export function regenerateSceneLipSync(scene: Scene): void {
  scene.lipSync = deriveLipSync(scene);
}

export function normalizeTrackExposures(
  trackValue: AnimationTrack,
  frameCount: number,
): void {
  trackValue.cels.sort((a, b) => a.frame - b.frame);
  trackValue.cels.forEach((item, index) => {
    const nextFrame = trackValue.cels[index + 1]?.frame ?? frameCount;
    item.exposure = Math.max(1, nextFrame - item.frame);
  });
}

export function validateProject(project: StagehandProject): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!project.name.trim())
    issues.push({
      code: 'PROJECT_NAME_EMPTY',
      severity: 'error',
      path: 'name',
      message: 'Project name is required.',
    });
  if (project.fps !== 12 && project.fps !== 24)
    issues.push({
      code: 'FPS_UNSUPPORTED',
      severity: 'error',
      path: 'fps',
      message: 'Frame playback supports 12 or 24 fps.',
    });
  if (!project.scenes.length)
    issues.push({
      code: 'SCENE_MISSING',
      severity: 'error',
      path: 'scenes',
      message: 'Add at least one scene.',
    });
  if (!project.scenes.some((scene) => scene.id === project.activeSceneId))
    issues.push({
      code: 'ACTIVE_SCENE_MISSING',
      severity: 'error',
      path: 'activeSceneId',
      message: 'The active scene no longer exists.',
    });
  const assetIds = new Set(project.assets.map((asset) => asset.id));
  const sceneIds = new Set<string>();
  for (const scene of project.scenes) {
    if (sceneIds.has(scene.id))
      issues.push({
        code: 'SCENE_ID_DUPLICATE',
        severity: 'error',
        path: `scenes.${scene.id}`,
        message: 'Scene IDs must be unique.',
      });
    sceneIds.add(scene.id);
    if (!Number.isInteger(scene.frameCount) || scene.frameCount < 1)
      issues.push({
        code: 'FRAME_COUNT_INVALID',
        severity: 'error',
        path: `scenes.${scene.id}.frameCount`,
        message: 'Scene frame count must be a positive integer.',
      });
    const trackIds = new Set<string>();
    for (const trackValue of scene.tracks) {
      if (trackIds.has(trackValue.id))
        issues.push({
          code: 'TRACK_ID_DUPLICATE',
          severity: 'error',
          path: `scenes.${scene.id}.tracks.${trackValue.id}`,
          message: 'Track IDs must be unique inside a scene.',
        });
      trackIds.add(trackValue.id);
      const frames = new Set<number>();
      for (const item of trackValue.cels) {
        if (
          !Number.isInteger(item.frame) ||
          item.frame < 0 ||
          item.frame >= scene.frameCount
        )
          issues.push({
            code: 'CEL_OUT_OF_RANGE',
            severity: 'error',
            path: `cels.${item.id}.frame`,
            message: `${item.label} sits outside ${scene.title}.`,
          });
        if (frames.has(item.frame))
          issues.push({
            code: 'CEL_DUPLICATE_FRAME',
            severity: 'error',
            path: `tracks.${trackValue.id}.cels`,
            message: `${trackValue.name} has two drawings on frame ${item.frame + 1}.`,
          });
        frames.add(item.frame);
        if (item.exposure < 1)
          issues.push({
            code: 'EXPOSURE_INVALID',
            severity: 'error',
            path: `cels.${item.id}.exposure`,
            message: 'Exposure must hold for at least one frame.',
          });
        if (item.assetId && !assetIds.has(item.assetId))
          issues.push({
            code: 'CEL_ASSET_MISSING',
            severity: 'error',
            path: `cels.${item.id}.assetId`,
            message: `${item.label} references a missing asset.`,
          });
      }
    }
    for (const cue of scene.lipSync) {
      if (
        !MOUTH_SHAPES.includes(cue.shape) ||
        cue.startFrame < 0 ||
        cue.endFrame <= cue.startFrame ||
        cue.endFrame > scene.frameCount
      )
        issues.push({
          code: 'LIP_SYNC_INVALID',
          severity: 'error',
          path: `lipSync.${cue.id}`,
          message:
            'Lip-sync cues must use a supported mouth shape inside the scene.',
        });
      if (
        !scene.characters.some((character) => character.id === cue.characterId)
      )
        issues.push({
          code: 'LIP_SYNC_CHARACTER_MISSING',
          severity: 'error',
          path: `lipSync.${cue.id}.characterId`,
          message: 'Lip-sync cue has no matching character.',
        });
    }
    for (const cue of scene.sfx) {
      if (
        cue.startFrame < 0 ||
        cue.endFrame <= cue.startFrame ||
        cue.endFrame > scene.frameCount
      )
        issues.push({
          code: 'SFX_RANGE_INVALID',
          severity: 'error',
          path: `sfx.${cue.id}`,
          message: `${cue.label} falls outside the scene.`,
        });
      if (cue.volume < 0 || cue.volume > 1)
        issues.push({
          code: 'SFX_VOLUME_INVALID',
          severity: 'error',
          path: `sfx.${cue.id}.volume`,
          message: 'SFX volume must be between 0 and 1.',
        });
    }
  }
  for (const request of project.assetRequests) {
    if (request.status === 'attached')
      issues.push({
        code: 'ASSET_REVIEW_PENDING',
        severity: 'warning',
        path: `assetRequests.${request.id}`,
        message: `${request.label} still needs visual approval.`,
      });
  }
  for (const asset of project.assets) {
    if (asset.source !== 'procedural' && asset.reviewStatus !== 'approved')
      issues.push({
        code: 'ASSET_NOT_APPROVED',
        severity: 'warning',
        path: `assets.${asset.id}.reviewStatus`,
        message: `${asset.label} has not been approved.`,
      });
    if (asset.kind === 'audio' && !asset.dataUrl)
      issues.push({
        code: 'AUDIO_PAYLOAD_MISSING',
        severity: 'warning',
        path: `assets.${asset.id}.dataUrl`,
        message: `${asset.label} has metadata but no local payload.`,
      });
  }
  return issues;
}

export function hydrateProject(value: unknown): StagehandProject {
  if (!value || typeof value !== 'object')
    return createDemoProject('deadline-show');
  const source = value as Partial<StagehandProject> & {
    fps?: number;
    duration?: number;
    scenes?: Array<Record<string, unknown>>;
    skeletons?: unknown[];
    boneKeyframes?: unknown[];
  };
  if (
    source.schemaVersion !== PROJECT_SCHEMA_VERSION ||
    !Array.isArray(source.scenes)
  ) {
    const migrated = createBlankProject({
      name:
        typeof source.name === 'string' ? source.name : 'Migrated animation',
      fps: source.fps === 24 ? 24 : 12,
      frameCount: Math.max(
        12,
        Math.round(
          ((source.duration ?? 10000) / 1000) * (source.fps === 24 ? 24 : 12),
        ),
      ),
    });
    migrated.migrationWarnings.push(
      'Legacy skeleton and tween data was intentionally dropped. The source file was preserved; this project now uses authored frame exposures.',
    );
    return migrated;
  }
  const candidate = cloneProject(source as StagehandProject);
  candidate.schemaVersion = PROJECT_SCHEMA_VERSION;
  candidate.fps = candidate.fps === 24 ? 24 : 12;
  candidate.revision = Number.isInteger(candidate.revision)
    ? candidate.revision
    : 1;
  candidate.assets = Array.isArray(candidate.assets) ? candidate.assets : [];
  candidate.assetRequests = Array.isArray(candidate.assetRequests)
    ? candidate.assetRequests
    : [];
  candidate.migrationWarnings = Array.isArray(candidate.migrationWarnings)
    ? candidate.migrationWarnings
    : [];
  candidate.storyboard = Array.isArray(candidate.storyboard)
    ? candidate.storyboard
    : [];
  candidate.scenes = candidate.scenes.map((sceneValue, index) => {
    const scene = sceneValue as unknown as Scene;
    scene.id ||= `scene-${index + 1}`;
    scene.title ||= `Scene ${index + 1}`;
    scene.description ||= 'Imported frame sequence.';
    scene.frameCount = Math.max(1, Math.floor(scene.frameCount || 120));
    scene.palette ||= ['#e7ecea', '#f9fbfa', '#273236', '#2f7782'];
    scene.characters ||= [];
    scene.tracks ||= [];
    scene.captions ||= [];
    scene.lipSync ||= [];
    scene.sfx ||= [];
    scene.audio ||= [];
    for (const trackValue of scene.tracks)
      normalizeTrackExposures(trackValue, scene.frameCount);
    return scene;
  });
  if (!candidate.scenes.some((scene) => scene.id === candidate.activeSceneId))
    candidate.activeSceneId = candidate.scenes[0]?.id ?? '';
  const current = activeScene(candidate);
  candidate.currentFrame = Math.max(
    0,
    Math.min(current.frameCount - 1, Math.floor(candidate.currentFrame || 0)),
  );
  candidate.dirty = false;
  return candidate;
}

export function assetGenerationChecklist(
  kind: Exclude<AssetKind, 'audio'>,
): string[] {
  const shared = [
    'No text, logos, watermark, panel labels, or baked captions.',
    'Match the project palette, line weight, lighting, and character proportions exactly.',
    'Preserve generous safe padding so motion never clips at 720p.',
    'Return one coherent production asset, not a UI mockup or presentation board.',
  ];
  if (kind === 'background')
    return [
      ...shared,
      'Use a clean 16:9 composition with negative space for characters and subtitles.',
      'Keep foreground props on separate transparent layers when they need to move.',
    ];
  if (kind === 'character')
    return [
      ...shared,
      'Use a genuinely transparent background and a complete full-body silhouette.',
      'Keep identity, outfit, proportions, and camera angle invariant across every drawing.',
    ];
  if (kind === 'mouth-pack')
    return [
      ...shared,
      'Use a genuinely transparent background.',
      'Provide the nine Stagehand/Rhubarb mouth drawings X, A, B, C, D, E, F, G, H in an exact 3 by 3 grid.',
      'Change only the mouth; keep head, face, camera, and lighting identical.',
    ];
  if (kind === 'frame')
    return [
      ...shared,
      'Provide discrete authored drawings with no tweened blur.',
      'Use equal-size cells in a declared grid and repeat the exact character description in every panel.',
    ];
  return [
    ...shared,
    'Use a genuinely transparent background.',
    'Keep one clear silhouette that remains readable at thumbnail size.',
  ];
}

export const DEMO_PROMPT_RULES = [
  'Describe the shared world once, then number every frame or cell with one concrete action.',
  'Repeat the exact character identity, clothing, proportions, palette, and camera rules for every generated sheet.',
  'Generate backgrounds, character drawings, mouth packs, and moving props as separate assets.',
  'Use equal-size grids for frame sheets; no text, labels, gutters that overlap art, or watermark.',
  'Prefer strong key drawings and held exposure over dozens of near-duplicate images.',
  'For edits, say what changes and explicitly freeze everything else.',
];
