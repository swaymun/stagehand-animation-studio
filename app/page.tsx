'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AudioLines,
  BookOpen,
  Bot,
  ChevronDown,
  Clapperboard,
  Copy,
  Download,
  Film,
  Image as ImageIcon,
  Layers3,
  Mic2,
  MonitorPlay,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RotateCcw,
  ScanLine,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume2,
  WandSparkles,
  X,
} from 'lucide-react';
import NextImage from 'next/image';
import {
  DEMO_CATALOG,
  MOUTH_SHAPES,
  activeScene,
  assetGenerationChecklist,
  cloneProject,
  createBlankProject,
  createDemoProject,
  evaluateFrame,
  evaluateSequenceFrame,
  framesToMs,
  hydrateProject,
  normalizeTrackExposures,
  regenerateSceneLipSync,
  sequenceDurationMs,
  sequenceFrameCount,
  validateProject,
  type AnimationCel,
  type AnimationTrack,
  type Asset,
  type AssetKind,
  type DemoId,
  type SfxRecipe,
  type StagehandProject,
} from './stagehand-model';
import {
  adjacentDrawings,
  buildImageMap,
  drawStagehandFrame,
  playAudioCueNow,
  playSfxNow,
  scheduleProjectAudio,
  scheduleProjectSfx,
  type ImageMap,
} from './stagehand-renderer';

type WorkspaceTab = 'frames' | 'storyboard' | 'assets' | 'audio';
type ToolInput = Record<string, unknown>;
type ModelTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: ToolInput) => unknown;
};
type ModelContext = {
  registerTool: (
    tool: ModelTool,
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
};
type VoiceCapability = {
  status: 'checking' | 'ready' | 'fallback' | 'offline';
  engine: string;
  detail: string;
};

const STORAGE_KEY = 'stagehand-frame-studio-v2';
const LOCAL_VOICE_URL = 'http://127.0.0.1:8787';

export const PUBLIC_WEBMCP_TOOL_NAMES = [
  'inspect_project',
  'create_project',
  'load_demo',
  'edit_storyboard',
  'set_current_scene',
  'get_timeline',
  'set_playhead',
  'get_animation_frames',
  'edit_animation_frame',
  'get_lip_sync',
  'generate_lip_sync',
  'probe_local_voice',
  'generate_voice',
  'edit_audio',
  'generate_sfx',
  'list_assets',
  'get_asset_generation_checklist',
  'create_asset_request',
  'attach_generated_asset',
  'inspect_asset_candidate',
  'approve_asset',
  'validate_project',
  'inspect_frame',
  'export_frame',
  'render_webm',
  'undo',
  'redo',
] as const;

const TOOL_GROUPS: Array<{
  label: string;
  names: Array<(typeof PUBLIC_WEBMCP_TOOL_NAMES)[number]>;
}> = [
  {
    label: 'Project',
    names: [
      'inspect_project',
      'create_project',
      'load_demo',
      'edit_storyboard',
      'set_current_scene',
    ],
  },
  {
    label: 'Frames',
    names: [
      'get_timeline',
      'set_playhead',
      'get_animation_frames',
      'edit_animation_frame',
      'get_lip_sync',
      'generate_lip_sync',
    ],
  },
  {
    label: 'Sound',
    names: [
      'probe_local_voice',
      'generate_voice',
      'edit_audio',
      'generate_sfx',
    ],
  },
  {
    label: 'Assets',
    names: [
      'list_assets',
      'get_asset_generation_checklist',
      'create_asset_request',
      'attach_generated_asset',
      'inspect_asset_candidate',
      'approve_asset',
    ],
  },
  {
    label: 'Proof & export',
    names: [
      'validate_project',
      'inspect_frame',
      'export_frame',
      'render_webm',
      'undo',
      'redo',
    ],
  },
];

const schema = (
  id: string,
  properties: Record<string, unknown> = {},
  required: string[] = [],
) => ({
  $id: `https://stagehand.local/schemas/${id}.json`,
  type: 'object',
  additionalProperties: false,
  properties,
  ...(required.length ? { required } : {}),
});

const asString = (value: unknown) => (typeof value === 'string' ? value : '');
const asNumber = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const asBoolean = (value: unknown, fallback = false) =>
  typeof value === 'boolean' ? value : fallback;
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
const makeId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return url;
}

function summarizeProject(project: StagehandProject) {
  const scene = activeScene(project);
  return {
    ok: true,
    schemaVersion: project.schemaVersion,
    id: project.id,
    name: project.name,
    revision: project.revision,
    fps: project.fps,
    renderSize: { width: project.renderWidth, height: project.renderHeight },
    durationMs: sequenceDurationMs(project),
    totalFrames: sequenceFrameCount(project),
    sceneCount: project.scenes.length,
    activeScene: {
      id: scene.id,
      title: scene.title,
      frame: project.currentFrame,
      frameCount: scene.frameCount,
    },
    storyboard: project.storyboard.map((beat) => ({ ...beat })),
    trackCount: project.scenes.reduce(
      (sum, item) => sum + item.tracks.length,
      0,
    ),
    drawingCount: project.scenes.reduce(
      (sum, item) =>
        sum +
        item.tracks.reduce((inner, track) => inner + track.cels.length, 0),
      0,
    ),
    lipSyncCueCount: project.scenes.reduce(
      (sum, item) => sum + item.lipSync.length,
      0,
    ),
    sfxCueCount: project.scenes.reduce((sum, item) => sum + item.sfx.length, 0),
    assetCount: project.assets.length,
    canUndo: false,
    migrationWarnings: project.migrationWarnings,
  };
}

function selectedTrack(project: StagehandProject): AnimationTrack | undefined {
  return activeScene(project).tracks.find(
    (item) => item.id === project.selectedTrackId,
  );
}

function selectedCel(project: StagehandProject): AnimationCel | undefined {
  const track = selectedTrack(project);
  return (
    track?.cels.find((item) => item.id === project.selectedCelId) ??
    track?.cels.find(
      (item) =>
        item.frame <= project.currentFrame &&
        item.frame + item.exposure > project.currentFrame,
    ) ??
    track?.cels[0]
  );
}

async function inspectImage(dataUrl: string) {
  return new Promise<{
    width: number;
    height: number;
    hasTransparency: boolean;
  }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(image.naturalWidth, 720);
      canvas.height = Math.max(
        1,
        Math.round((canvas.width / image.naturalWidth) * image.naturalHeight),
      );
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return reject(new Error('Canvas unavailable'));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      ).data;
      let transparent = false;
      for (let index = 3; index < pixels.length; index += 64) {
        if (pixels[index] < 250) {
          transparent = true;
          break;
        }
      }
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
        hasTransparency: transparent,
      });
    };
    image.onerror = () => reject(new Error('Image could not be decoded'));
    image.src = dataUrl;
  });
}

export default function StagehandStudio() {
  const [project, setProject] = useState<StagehandProject>(() =>
    createDemoProject('deadline-show'),
  );
  const [tab, setTab] = useState<WorkspaceTab>('frames');
  const [playing, setPlaying] = useState(false);
  const [onionSkin, setOnionSkin] = useState(false);
  const [guides, setGuides] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [notice, setNotice] = useState(
    'Three detailed demos are ready to direct.',
  );
  const [rendering, setRendering] = useState<{
    active: boolean;
    progress: number;
  }>({ active: false, progress: 0 });
  const [voice, setVoice] = useState<VoiceCapability>({
    status: 'checking',
    engine: 'Detecting',
    detail: 'Looking for a private local voice service.',
  });
  const [images, setImages] = useState<ImageMap>(new Map());
  const registeredCount = PUBLIC_WEBMCP_TOOL_NAMES.length;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const projectRef = useRef(project);
  const historyRef = useRef<StagehandProject[]>([]);
  const futureRef = useRef<StagehandProject[]>([]);
  const idempotencyRef = useRef(new Map<string, unknown>());

  const applyProject = useCallback((next: StagehandProject) => {
    projectRef.current = next;
    setProject(next);
  }, []);

  const commit = useCallback(
    (label: string, mutate: (next: StagehandProject) => void) => {
      const before = projectRef.current;
      const next = cloneProject(before);
      mutate(next);
      next.revision = before.revision + 1;
      next.dirty = true;
      historyRef.current.push(cloneProject(before));
      if (historyRef.current.length > 80) historyRef.current.shift();
      futureRef.current = [];
      applyProject(next);
      setNotice(label);
      return next;
    },
    [applyProject],
  );

  const setView = useCallback((mutate: (next: StagehandProject) => void) => {
    const next = cloneProject(projectRef.current);
    mutate(next);
    projectRef.current = next;
    setProject(next);
  }, []);

  const undo = useCallback(() => {
    const previous = historyRef.current.pop();
    if (!previous) return { ok: false, code: 'NOTHING_TO_UNDO' };
    futureRef.current.push(cloneProject(projectRef.current));
    previous.revision = projectRef.current.revision + 1;
    applyProject(previous);
    setNotice('Undid the last edit');
    return { ok: true, revision: previous.revision };
  }, [applyProject]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return { ok: false, code: 'NOTHING_TO_REDO' };
    historyRef.current.push(cloneProject(projectRef.current));
    next.revision = projectRef.current.revision + 1;
    applyProject(next);
    setNotice('Redid the edit');
    return { ok: true, revision: next.revision };
  }, [applyProject]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) applyProject(hydrateProject(JSON.parse(saved)));
      } catch {
        setNotice('Recovered with a clean demo project');
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [applyProject]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
      } catch {
        // Imported data URLs can exceed browser storage; the live project stays intact.
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [project]);

  useEffect(() => {
    let cancelled = false;
    void buildImageMap(project.assets).then((next) => {
      if (!cancelled) setImages(next);
    });
    return () => {
      cancelled = true;
    };
  }, [project.assets]);

  const paint = useCallback(
    (
      target = canvasRef.current,
      frameProject = projectRef.current,
      frame = evaluateFrame(frameProject),
      renderImages = images,
      includeGuides = guides,
    ) => {
      if (!target) return;
      if (target.width !== frameProject.renderWidth)
        target.width = frameProject.renderWidth;
      if (target.height !== frameProject.renderHeight)
        target.height = frameProject.renderHeight;
      const context = target.getContext('2d');
      if (!context) return;
      drawStagehandFrame(
        context,
        target.width,
        target.height,
        frameProject,
        frame,
        renderImages,
        {
          selectedTrackId: frameProject.selectedTrackId,
          onionSkin,
          onionOpacity: 0.2,
          guides: includeGuides,
        },
      );
    },
    [guides, images, onionSkin],
  );

  useEffect(() => {
    paint();
  }, [paint, project]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setView((next) => {
        const scene = activeScene(next);
        const nextFrame = next.currentFrame + 1;
        if (nextFrame < scene.frameCount) {
          next.currentFrame = nextFrame;
          const cue = scene.sfx.find((item) => item.startFrame === nextFrame);
          if (cue) playSfxNow(cue, next.fps);
          return;
        }
        const index = next.scenes.findIndex((item) => item.id === scene.id);
        const following = next.scenes[index + 1];
        if (following) {
          next.activeSceneId = following.id;
          next.currentFrame = 0;
          next.selectedTrackId =
            following.tracks.find((item) => item.kind === 'character')?.id ??
            following.tracks[0]?.id;
          next.selectedCelId = following.tracks.find(
            (item) => item.id === next.selectedTrackId,
          )?.cels[0]?.id;
        } else {
          next.activeSceneId = next.scenes[0].id;
          next.currentFrame = 0;
          setPlaying(false);
        }
      });
    }, 1000 / project.fps);
    return () => window.clearInterval(timer);
  }, [playing, project.fps, setView]);

  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select')) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (event.code === 'Space') {
        event.preventDefault();
        setPlaying((value) => !value);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        setView((next) => {
          const scene = activeScene(next);
          next.currentFrame = clamp(
            next.currentFrame + direction,
            0,
            scene.frameCount - 1,
          );
        });
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [redo, setView, undo]);

  const probeVoice = useCallback(async (): Promise<
    VoiceCapability & { ok: boolean }
  > => {
    try {
      const response = await fetch(`${LOCAL_VOICE_URL}/v1/capabilities`, {
        signal: AbortSignal.timeout(1600),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json()) as {
        tts?: { engine?: string; available?: boolean };
        mode?: string;
      };
      const engine = payload.tts?.engine ?? payload.mode ?? 'local voice';
      const result: VoiceCapability & { ok: boolean } = {
        ok: true,
        status: engine.includes('fallback') ? 'fallback' : 'ready',
        engine,
        detail: engine.includes('fallback')
          ? 'Local deterministic preview is ready; OmniVoice can replace it behind the same endpoint.'
          : 'Private local speech generation is ready.',
      };
      setVoice(result);
      return result;
    } catch {
      const result: VoiceCapability & { ok: boolean } = {
        ok: false,
        status: 'offline',
        engine: 'Not running',
        detail:
          'Run npm run voice:local. If OmniVoice is installed, the bridge will use it; otherwise SFX and timing stay local.',
      };
      setVoice(result);
      return result;
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void probeVoice(), 0);
    return () => window.clearTimeout(timer);
  }, [probeVoice]);

  const frameDataUrl = useCallback(
    async (sceneId?: string, frame?: number, width?: number) => {
      const current = projectRef.current;
      const scene =
        current.scenes.find((item) => item.id === sceneId) ??
        activeScene(current);
      const exportWidth = clamp(
        Math.round(width ?? current.renderWidth),
        320,
        current.renderWidth,
      );
      const exportHeight = Math.round(
        (exportWidth / current.renderWidth) * current.renderHeight,
      );
      const canvas = document.createElement('canvas');
      canvas.width = exportWidth;
      canvas.height = exportHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      const exportImages = await buildImageMap(current.assets);
      drawStagehandFrame(
        context,
        exportWidth,
        exportHeight,
        current,
        evaluateFrame(current, scene.id, frame ?? current.currentFrame),
        exportImages,
        { guides: false, onionSkin: false },
      );
      return canvas.toDataURL('image/png');
    },
    [],
  );

  const renderWebm = useCallback(async (download = true) => {
    const current = cloneProject(projectRef.current);
    if (typeof MediaRecorder === 'undefined')
      return { ok: false, code: 'MEDIA_RECORDER_UNAVAILABLE' };
    setRendering({ active: true, progress: 0 });
    setPlaying(false);
    setNotice('Rendering the full scene sequence…');
    const canvas = document.createElement('canvas');
    canvas.width = current.renderWidth;
    canvas.height = current.renderHeight;
    const context = canvas.getContext('2d');
    if (!context) return { ok: false, code: 'CANVAS_UNAVAILABLE' };
    const renderImages = await buildImageMap(current.assets);
    const canvasStream = canvas.captureStream(0);
    const stream = new MediaStream(canvasStream.getVideoTracks());
    const audioContext = new AudioContext();
    const audioDestination = audioContext.createMediaStreamDestination();
    for (const track of audioDestination.stream.getAudioTracks())
      stream.addTrack(track);
    const mimeType = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ].find((item) => MediaRecorder.isTypeSupported(item));
    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType, videoBitsPerSecond: 3_000_000 } : undefined,
    );
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    const done = new Promise<Blob>((resolve) => {
      recorder.onstop = () =>
        resolve(new Blob(chunks, { type: recorder.mimeType || 'video/webm' }));
    });
    await audioContext.resume();
    recorder.start(500);
    const audioStart = audioContext.currentTime + 0.08;
    scheduleProjectSfx(audioContext, audioDestination, current, audioStart);
    const voiceCueCount = await scheduleProjectAudio(
      audioContext,
      audioDestination,
      current,
      audioStart,
    );
    const videoTrack =
      canvasStream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
    const totalFrames = sequenceFrameCount(current);
    const stepMs = 1000 / current.fps;
    for (let frame = 0; frame < totalFrames; frame += 1) {
      drawStagehandFrame(
        context,
        canvas.width,
        canvas.height,
        current,
        evaluateSequenceFrame(current, frame),
        renderImages,
        { guides: false, onionSkin: false },
      );
      videoTrack.requestFrame?.();
      if (frame % current.fps === 0)
        setRendering({ active: true, progress: frame / totalFrames });
      await new Promise((resolve) => window.setTimeout(resolve, stepMs));
    }
    recorder.stop();
    const blob = await done;
    await audioContext.close();
    for (const track of stream.getTracks()) track.stop();
    const filename = `${
      current.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'stagehand'
    }.webm`;
    if (download) downloadBlob(blob, filename);
    setRendering({ active: false, progress: 1 });
    setNotice(
      `Rendered ${current.scenes.length} scenes · ${(blob.size / 1_000_000).toFixed(1)} MB`,
    );
    return {
      ok: true,
      filename,
      bytes: blob.size,
      durationMs: sequenceDurationMs(current),
      fps: current.fps,
      sceneCount: current.scenes.length,
      voiceCueCount,
    };
  }, []);

  useEffect(() => {
    const modelContext =
      (document as Document & { modelContext?: ModelContext }).modelContext ??
      (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
    const lifecycle = new AbortController();
    const tools = new Map<string, ModelTool>();
    const add = (
      name: (typeof PUBLIC_WEBMCP_TOOL_NAMES)[number],
      title: string,
      description: string,
      inputSchema: Record<string, unknown>,
      execute: ModelTool['execute'],
      readOnly = false,
    ) => {
      const guardedSchema = readOnly
        ? inputSchema
        : {
            ...inputSchema,
            properties: {
              ...(inputSchema.properties as Record<string, unknown>),
              expectedRevision: {
                type: 'integer',
                minimum: 1,
                description:
                  'Optional optimistic-concurrency guard from a fresh read.',
              },
              idempotencyKey: {
                type: 'string',
                minLength: 1,
                maxLength: 120,
                description:
                  'Unique retry key. Repeated calls return the first result.',
              },
            },
          };
      const tool: ModelTool = {
        name,
        title,
        description,
        inputSchema: guardedSchema,
        annotations: { readOnlyHint: readOnly },
        execute: async (input) => {
          if (!readOnly) {
            const key = asString(input.idempotencyKey);
            if (key && idempotencyRef.current.has(`${name}:${key}`))
              return idempotencyRef.current.get(`${name}:${key}`);
            const expected = input.expectedRevision;
            if (
              typeof expected === 'number' &&
              expected !== projectRef.current.revision
            )
              return {
                ok: false,
                code: 'REVISION_CONFLICT',
                expectedRevision: expected,
                actualRevision: projectRef.current.revision,
              };
            const result = await execute(input);
            if (key) idempotencyRef.current.set(`${name}:${key}`, result);
            return result;
          }
          return execute(input);
        },
      };
      tools.set(name, tool);
    };

    const mutate = (
      label: string,
      action: (next: StagehandProject) => Record<string, unknown> | void,
    ) => {
      const before = projectRef.current;
      const next = cloneProject(before);
      const payload = action(next) ?? {};
      if (payload.ok === false || typeof payload.warning === 'string') {
        return {
          ok: false,
          revision: before.revision,
          code: typeof payload.code === 'string' ? payload.code : 'NO_CHANGE',
          ...payload,
        };
      }
      next.revision = before.revision + 1;
      next.dirty = true;
      historyRef.current.push(cloneProject(before));
      if (historyRef.current.length > 80) historyRef.current.shift();
      futureRef.current = [];
      applyProject(next);
      setNotice(label);
      return { ok: true, revision: next.revision, ...payload };
    };

    add(
      'inspect_project',
      'Inspect project',
      'Read the complete high-level state before editing.',
      schema('inspect-project'),
      () => ({
        ...summarizeProject(projectRef.current),
        canUndo: historyRef.current.length > 0,
        canRedo: futureRef.current.length > 0,
      }),
      true,
    );
    add(
      'create_project',
      'Create project',
      'Start a blank held-cel frame animation.',
      schema(
        'create-project',
        {
          name: { type: 'string', minLength: 1 },
          fps: { enum: [12, 24] },
          frameCount: { type: 'integer', minimum: 12, maximum: 1440 },
          renderPreset: { enum: ['720p', '1080p'] },
        },
        ['name'],
      ),
      (input) => {
        const name = asString(input.name).trim();
        if (!name) return { ok: false, code: 'INVALID_INPUT', field: 'name' };
        const before = projectRef.current;
        const next = createBlankProject({
          name,
          fps: input.fps === 24 ? 24 : 12,
          frameCount: asNumber(input.frameCount, 120),
          renderPreset: input.renderPreset === '1080p' ? '1080p' : '720p',
        });
        next.revision = before.revision + 1;
        historyRef.current.push(cloneProject(before));
        futureRef.current = [];
        applyProject(next);
        setNotice('Created a blank frame animation');
        return {
          ok: true,
          revision: next.revision,
          project: summarizeProject(next),
        };
      },
    );
    add(
      'load_demo',
      'Load demo',
      'Load one of the three complete multi-scene demo animations.',
      schema(
        'load-demo',
        { demoId: { enum: DEMO_CATALOG.map((item) => item.id) } },
        ['demoId'],
      ),
      (input) => {
        const demoId = asString(input.demoId) as DemoId;
        if (!DEMO_CATALOG.some((item) => item.id === demoId))
          return { ok: false, code: 'INVALID_DEMO' };
        const before = projectRef.current;
        const next = createDemoProject(demoId);
        next.revision = before.revision + 1;
        historyRef.current.push(cloneProject(before));
        futureRef.current = [];
        applyProject(next);
        setNotice(`Loaded ${next.name}`);
        return {
          ok: true,
          revision: next.revision,
          project: summarizeProject(next),
        };
      },
    );
    add(
      'edit_storyboard',
      'Edit storyboard',
      'Add, update, delete, or reorder a story scene and its storyboard beat.',
      schema(
        'edit-storyboard',
        {
          action: { enum: ['add', 'update', 'delete', 'move'] },
          sceneId: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          frameCount: { type: 'integer', minimum: 12, maximum: 1440 },
          toIndex: { type: 'integer', minimum: 0 },
        },
        ['action'],
      ),
      (input) =>
        mutate('Storyboard updated', (next) => {
          const action = asString(input.action);
          const sceneId = asString(input.sceneId);
          if (action === 'add') {
            const base = cloneProject(activeScene(next));
            base.id = makeId('scene');
            base.title =
              asString(input.title) || `Scene ${next.scenes.length + 1}`;
            base.description = asString(input.description) || 'New story beat';
            base.frameCount = clamp(
              Math.round(asNumber(input.frameCount, 48)),
              12,
              1440,
            );
            base.captions = [];
            base.lipSync = [];
            base.sfx = [];
            base.audio = [];
            base.tracks.forEach((track) => {
              track.id = `${base.id}-${track.kind}-${Math.random().toString(36).slice(2, 5)}`;
              track.sceneId = base.id;
              track.cels = track.cels
                .slice(0, 1)
                .map((cel) => ({
                  ...cel,
                  id: makeId('cel'),
                  sceneId: base.id,
                  trackId: track.id,
                  frame: 0,
                  exposure: base.frameCount,
                }));
            });
            next.scenes.push(base);
            next.storyboard.push({
              id: makeId('beat'),
              sceneId: base.id,
              title: base.title,
              description: base.description,
              thumbnailLabel: `${String(next.scenes.length).padStart(2, '0')} · ${base.frameCount}f`,
            });
            return { sceneId: base.id };
          }
          const index = next.scenes.findIndex((item) => item.id === sceneId);
          if (index < 0)
            return {
              ok: false,
              code: 'SCENE_NOT_FOUND',
              warning: 'Scene not found; project unchanged.',
            };
          if (action === 'delete') {
            if (next.scenes.length === 1)
              return {
                ok: false,
                code: 'LAST_SCENE_REQUIRED',
                warning: 'A project must keep one scene.',
              };
            next.scenes.splice(index, 1);
            next.storyboard = next.storyboard.filter(
              (item) => item.sceneId !== sceneId,
            );
            if (next.activeSceneId === sceneId)
              next.activeSceneId = next.scenes[Math.max(0, index - 1)].id;
          } else if (action === 'move') {
            const [scene] = next.scenes.splice(index, 1);
            next.scenes.splice(
              clamp(Math.round(asNumber(input.toIndex)), 0, next.scenes.length),
              0,
              scene,
            );
            next.storyboard.sort(
              (a, b) =>
                next.scenes.findIndex((item) => item.id === a.sceneId) -
                next.scenes.findIndex((item) => item.id === b.sceneId),
            );
          } else {
            const scene = next.scenes[index];
            if (asString(input.title)) scene.title = asString(input.title);
            if (asString(input.description))
              scene.description = asString(input.description);
            if (typeof input.frameCount === 'number')
              scene.frameCount = clamp(Math.round(input.frameCount), 12, 1440);
            const beat = next.storyboard.find(
              (item) => item.sceneId === sceneId,
            );
            if (beat) {
              beat.title = scene.title;
              beat.description = scene.description;
              beat.thumbnailLabel = `${String(index + 1).padStart(2, '0')} · ${scene.frameCount}f`;
            }
          }
          return { sceneCount: next.scenes.length };
        }),
    );
    add(
      'set_current_scene',
      'Set current scene',
      'Open a scene by ID and reset its local playhead.',
      schema('set-current-scene', { sceneId: { type: 'string' } }, ['sceneId']),
      (input) =>
        mutate('Scene selected', (next) => {
          const scene = next.scenes.find(
            (item) => item.id === asString(input.sceneId),
          );
          if (!scene)
            return {
              ok: false,
              code: 'SCENE_NOT_FOUND',
              warning: 'Scene not found.',
            };
          next.activeSceneId = scene.id;
          next.currentFrame = 0;
          next.selectedTrackId =
            scene.tracks.find((item) => item.kind === 'character')?.id ??
            scene.tracks[0]?.id;
          next.selectedCelId = scene.tracks.find(
            (item) => item.id === next.selectedTrackId,
          )?.cels[0]?.id;
          return { sceneId: scene.id };
        }),
    );
    add(
      'get_timeline',
      'Get timeline',
      'Read scene-local tracks, held drawings, captions, mouth cues, and SFX.',
      schema('get-timeline', { sceneId: { type: 'string' } }),
      (input) => {
        const current = projectRef.current;
        const scene =
          current.scenes.find((item) => item.id === asString(input.sceneId)) ??
          activeScene(current);
        return {
          ok: true,
          revision: current.revision,
          fps: current.fps,
          scene: cloneProject(scene),
          currentFrame:
            scene.id === current.activeSceneId ? current.currentFrame : 0,
        };
      },
      true,
    );
    add(
      'set_playhead',
      'Set playhead',
      'Move to an exact integer frame in the active scene.',
      schema(
        'set-playhead',
        { frame: { type: 'integer', minimum: 0 }, sceneId: { type: 'string' } },
        ['frame'],
      ),
      (input) => {
        if (!Number.isInteger(input.frame))
          return { ok: false, code: 'INVALID_INPUT', field: 'frame' };
        return mutate('Playhead moved', (next) => {
          const scene =
            next.scenes.find((item) => item.id === asString(input.sceneId)) ??
            activeScene(next);
          next.activeSceneId = scene.id;
          next.currentFrame = clamp(
            Math.floor(asNumber(input.frame)),
            0,
            scene.frameCount - 1,
          );
          return {
            sceneId: scene.id,
            frame: next.currentFrame,
            timeMs: framesToMs(next.currentFrame, next.fps),
          };
        });
      },
    );
    add(
      'get_animation_frames',
      'Get animation frames',
      'Read exposed drawings for one track or every track in a scene.',
      schema('get-animation-frames', {
        sceneId: { type: 'string' },
        trackId: { type: 'string' },
      }),
      (input) => {
        const current = projectRef.current;
        const scene =
          current.scenes.find((item) => item.id === asString(input.sceneId)) ??
          activeScene(current);
        const tracks = asString(input.trackId)
          ? scene.tracks.filter((item) => item.id === input.trackId)
          : scene.tracks;
        return {
          ok: true,
          revision: current.revision,
          sceneId: scene.id,
          fps: current.fps,
          tracks: cloneProject(tracks),
        };
      },
      true,
    );
    add(
      'edit_animation_frame',
      'Edit animation frame',
      'Add, update, duplicate, or delete one exposed drawing with hold semantics.',
      schema(
        'edit-animation-frame',
        {
          action: { enum: ['add', 'update', 'duplicate', 'delete'] },
          sceneId: { type: 'string' },
          trackId: { type: 'string' },
          celId: { type: 'string' },
          frame: { type: 'integer', minimum: 0 },
          exposure: { type: 'integer', minimum: 1 },
          drawing: { type: 'string' },
          assetId: { type: 'string' },
          assetFrame: { type: 'integer', minimum: 0, maximum: 63 },
          x: { type: 'number' },
          y: { type: 'number' },
          scale: { type: 'number', minimum: 0.05, maximum: 8 },
          rotation: { type: 'number', minimum: -360, maximum: 360 },
          opacity: { type: 'number', minimum: 0, maximum: 1 },
        },
        ['action', 'trackId'],
      ),
      (input) =>
        mutate('Drawing exposure updated', (next) => {
          const scene =
            next.scenes.find((item) => item.id === asString(input.sceneId)) ??
            activeScene(next);
          const track = scene.tracks.find(
            (item) => item.id === asString(input.trackId),
          );
          if (!track || track.locked)
            return {
              ok: false,
              code: track?.locked ? 'TRACK_LOCKED' : 'TRACK_NOT_FOUND',
              warning: track?.locked ? 'Track is locked.' : 'Track not found.',
            };
          const action = asString(input.action);
          const source: AnimationCel | undefined =
            track.cels.find((item) => item.id === asString(input.celId)) ??
            track.cels
              .filter((item) => item.frame <= next.currentFrame)
              .at(-1) ??
            track.cels[0];
          if (action === 'delete') {
            if (!source || track.cels.length === 1)
              return {
                ok: false,
                code: 'LAST_DRAWING_REQUIRED',
                warning: 'Each track must keep one drawing.',
              };
            track.cels = track.cels.filter((item) => item.id !== source.id);
          } else if (action === 'add' || action === 'duplicate') {
            const frame = clamp(
              Math.floor(asNumber(input.frame, next.currentFrame)),
              0,
              scene.frameCount - 1,
            );
            const base = source ?? {
              transform: { x: 50, y: 65, scale: 1, rotation: 0, opacity: 1 },
              drawing: 'drawing-1',
              assetId: undefined,
              assetFrame: undefined,
            };
            const created: AnimationCel = {
              id: makeId('cel'),
              sceneId: scene.id,
              trackId: track.id,
              frame,
              exposure: Math.max(1, Math.floor(asNumber(input.exposure, 1))),
              label: asString(input.drawing) || `${track.name} drawing`,
              drawing: asString(input.drawing) || base.drawing,
              assetId: asString(input.assetId) || base.assetId,
              assetFrame:
                typeof input.assetFrame === 'number'
                  ? Math.floor(input.assetFrame)
                  : base.assetFrame,
              transform: { ...base.transform },
            };
            track.cels = track.cels.filter((item) => item.frame !== frame);
            track.cels.push(created);
            next.selectedCelId = created.id;
            next.currentFrame = frame;
          } else if (source) {
            if (typeof input.frame === 'number')
              source.frame = clamp(
                Math.floor(input.frame),
                0,
                scene.frameCount - 1,
              );
            if (typeof input.exposure === 'number')
              source.exposure = Math.max(1, Math.floor(input.exposure));
            if (asString(input.drawing))
              source.drawing = asString(input.drawing);
            if (asString(input.assetId))
              source.assetId = asString(input.assetId);
            if (typeof input.assetFrame === 'number')
              source.assetFrame = Math.floor(input.assetFrame);
            for (const key of [
              'x',
              'y',
              'scale',
              'rotation',
              'opacity',
            ] as const)
              if (typeof input[key] === 'number')
                source.transform[key] = input[key];
            next.selectedCelId = source.id;
          }
          normalizeTrackExposures(track, scene.frameCount);
          return { trackId: track.id, cels: cloneProject(track.cels) };
        }),
    );
    add(
      'get_lip_sync',
      'Get lip sync',
      'Read compact X/A/B/C/D/E/F/G/H mouth cues for a scene.',
      schema('get-lip-sync', { sceneId: { type: 'string' } }),
      (input) => {
        const current = projectRef.current;
        const scene =
          current.scenes.find((item) => item.id === asString(input.sceneId)) ??
          activeScene(current);
        return {
          ok: true,
          revision: current.revision,
          sceneId: scene.id,
          mouthShapes: MOUTH_SHAPES,
          cues: cloneProject(scene.lipSync),
          captions: cloneProject(scene.captions),
        };
      },
      true,
    );
    add(
      'generate_lip_sync',
      'Generate lip sync',
      'Estimate held mouth shapes from every caption; use Rhubarb later for aligned cues.',
      schema('generate-lip-sync', {
        sceneId: { type: 'string' },
        allScenes: { type: 'boolean' },
      }),
      (input) =>
        mutate('Lip-sync cues regenerated', (next) => {
          const scenes = asBoolean(input.allScenes)
            ? next.scenes
            : [
                next.scenes.find(
                  (item) => item.id === asString(input.sceneId),
                ) ?? activeScene(next),
              ];
          scenes.forEach(regenerateSceneLipSync);
          return {
            sceneIds: scenes.map((item) => item.id),
            cueCount: scenes.reduce(
              (sum, item) => sum + item.lipSync.length,
              0,
            ),
            timingQuality: 'estimated',
          };
        }),
    );
    add(
      'probe_local_voice',
      'Probe local voice',
      'Check the localhost bridge for OmniVoice or the deterministic preview engine.',
      schema('probe-local-voice'),
      async () => probeVoice(),
      true,
    );
    add(
      'generate_voice',
      'Generate voice',
      'Generate private local speech and attach its WAV plus estimated timing to the current project.',
      schema(
        'generate-voice',
        {
          text: { type: 'string', minLength: 1, maxLength: 1000 },
          label: { type: 'string' },
          sceneId: { type: 'string' },
          startFrame: { type: 'integer', minimum: 0 },
          characterId: { type: 'string' },
          durationMs: { type: 'integer', minimum: 80, maximum: 30000 },
        },
        ['text'],
      ),
      async (input) => {
        try {
          const response = await fetch(`${LOCAL_VOICE_URL}/v1/tts`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              text: asString(input.text),
              durationMs:
                typeof input.durationMs === 'number'
                  ? input.durationMs
                  : undefined,
            }),
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const payload = (await response.json()) as {
            audioBase64: string;
            audioMime: string;
            durationMs: number;
            engine: string;
            timings?: unknown[];
            timingQuality?: string;
          };
          return mutate('Local voice generated', (next) => {
            const scene =
              next.scenes.find((item) => item.id === asString(input.sceneId)) ??
              activeScene(next);
            const assetId = makeId('voice');
            const startFrame = clamp(
              Math.floor(asNumber(input.startFrame, next.currentFrame)),
              0,
              scene.frameCount - 1,
            );
            const frameLength = Math.max(
              1,
              Math.ceil((payload.durationMs / 1000) * next.fps),
            );
            next.assets.push({
              id: assetId,
              kind: 'audio',
              label: asString(input.label) || asString(input.text).slice(0, 42),
              source: 'generated',
              reviewStatus: 'approved',
              dataUrl: `data:${payload.audioMime};base64,${payload.audioBase64}`,
              mimeType: payload.audioMime,
              durationMs: payload.durationMs,
              provenance: {
                author: payload.engine,
                license: 'Locally generated',
              },
            });
            scene.audio.push({
              id: makeId('voice-cue'),
              label: asString(input.label) || 'Generated dialogue',
              kind: 'voice',
              startFrame,
              endFrame: Math.min(scene.frameCount, startFrame + frameLength),
              volume: 1,
              assetId,
            });
            return {
              assetId,
              sceneId: scene.id,
              durationMs: payload.durationMs,
              engine: payload.engine,
              timingQuality: payload.timingQuality ?? 'estimated',
              timings: payload.timings ?? [],
            };
          });
        } catch {
          return {
            ok: false,
            code: 'LOCAL_VOICE_UNAVAILABLE',
            endpoint: LOCAL_VOICE_URL,
            next: 'Run npm run voice:local, then probe_local_voice.',
          };
        }
      },
    );
    add(
      'edit_audio',
      'Edit audio',
      'List, add, update, or delete voice/music cues in a scene.',
      schema(
        'edit-audio',
        {
          action: { enum: ['list', 'add', 'update', 'delete'] },
          sceneId: { type: 'string' },
          cueId: { type: 'string' },
          label: { type: 'string' },
          kind: { enum: ['voice', 'music'] },
          startFrame: { type: 'integer', minimum: 0 },
          endFrame: { type: 'integer', minimum: 1 },
          volume: { type: 'number', minimum: 0, maximum: 1 },
          assetId: { type: 'string' },
        },
        ['action'],
      ),
      (input) => {
        const current = projectRef.current;
        const selectedScene =
          current.scenes.find((item) => item.id === asString(input.sceneId)) ??
          activeScene(current);
        if (input.action === 'list')
          return {
            ok: true,
            revision: current.revision,
            sceneId: selectedScene.id,
            audio: cloneProject(selectedScene.audio),
            sfx: cloneProject(selectedScene.sfx),
          };
        return mutate('Audio cue updated', (next) => {
          const scene =
            next.scenes.find((item) => item.id === selectedScene.id) ??
            activeScene(next);
          if (input.action === 'delete') {
            if (!scene.audio.some((item) => item.id === input.cueId))
              return { ok: false, code: 'AUDIO_CUE_NOT_FOUND' };
            scene.audio = scene.audio.filter((item) => item.id !== input.cueId);
          } else if (input.action === 'update') {
            const cue = scene.audio.find((item) => item.id === input.cueId);
            if (!cue) return { ok: false, code: 'AUDIO_CUE_NOT_FOUND' };
            if (asString(input.label)) cue.label = asString(input.label);
            if (typeof input.startFrame === 'number')
              cue.startFrame = clamp(
                Math.floor(input.startFrame),
                0,
                scene.frameCount - 1,
              );
            if (typeof input.endFrame === 'number')
              cue.endFrame = clamp(
                Math.floor(input.endFrame),
                cue.startFrame + 1,
                scene.frameCount,
              );
            if (typeof input.volume === 'number')
              cue.volume = clamp(input.volume, 0, 1);
          } else
            scene.audio.push({
              id: makeId('audio'),
              label: asString(input.label) || 'Audio cue',
              kind: input.kind === 'music' ? 'music' : 'voice',
              startFrame: clamp(
                Math.floor(asNumber(input.startFrame)),
                0,
                scene.frameCount - 1,
              ),
              endFrame: clamp(
                Math.floor(asNumber(input.endFrame, scene.frameCount)),
                1,
                scene.frameCount,
              ),
              volume: clamp(asNumber(input.volume, 1), 0, 1),
              assetId: asString(input.assetId) || undefined,
            });
          return { sceneId: scene.id, audio: cloneProject(scene.audio) };
        });
      },
    );
    add(
      'generate_sfx',
      'Generate SFX',
      'Add a deterministic Web Audio sound recipe—no stock library or network required.',
      schema(
        'generate-sfx',
        {
          sceneId: { type: 'string' },
          label: { type: 'string' },
          recipe: {
            enum: [
              'alarm',
              'brick-pop',
              'cash-register',
              'error-zap',
              'jelly-bloop',
              'keyboard',
              'portal',
              'splash',
              'success',
              'whoosh',
            ],
          },
          startFrame: { type: 'integer', minimum: 0 },
          durationFrames: { type: 'integer', minimum: 1, maximum: 240 },
          volume: { type: 'number', minimum: 0, maximum: 1 },
          seed: { type: 'integer' },
        },
        ['recipe', 'startFrame'],
      ),
      (input) =>
        mutate('Procedural SFX added', (next) => {
          const scene =
            next.scenes.find((item) => item.id === asString(input.sceneId)) ??
            activeScene(next);
          const startFrame = clamp(
            Math.floor(asNumber(input.startFrame)),
            0,
            scene.frameCount - 1,
          );
          const cue = {
            id: makeId('sfx'),
            label: asString(input.label) || asString(input.recipe),
            recipe: asString(input.recipe) as SfxRecipe,
            startFrame,
            endFrame: Math.min(
              scene.frameCount,
              startFrame +
                Math.max(1, Math.floor(asNumber(input.durationFrames, 6))),
            ),
            volume: clamp(asNumber(input.volume, 0.65), 0, 1),
            seed: Math.floor(asNumber(input.seed, Date.now() % 100_000)),
          };
          scene.sfx.push(cue);
          return { sceneId: scene.id, cue };
        }),
    );
    add(
      'list_assets',
      'List assets',
      'Read asset metadata and approval state without returning large payloads.',
      schema('list-assets', {
        kind: {
          enum: [
            'background',
            'character',
            'prop',
            'frame',
            'audio',
            'mouth-pack',
          ],
        },
      }),
      (input) => ({
        ok: true,
        revision: projectRef.current.revision,
        assets: projectRef.current.assets
          .filter((item) => !input.kind || item.kind === input.kind)
          .map(({ dataUrl, ...item }) => ({
            ...item,
            hasPayload: Boolean(dataUrl),
          })),
        requests: cloneProject(projectRef.current.assetRequests),
      }),
      true,
    );
    add(
      'get_asset_generation_checklist',
      'Get asset checklist',
      'Get the frame-animation generation contract before creating media.',
      schema(
        'asset-checklist',
        {
          kind: {
            enum: ['background', 'character', 'prop', 'frame', 'mouth-pack'],
          },
        },
        ['kind'],
      ),
      (input) => ({
        ok: true,
        kind: input.kind,
        checklist: assetGenerationChecklist(
          input.kind as Exclude<AssetKind, 'audio'>,
        ),
        workflow: [
          'create_asset_request',
          'attach_generated_asset',
          'inspect_asset_candidate',
          'approve_asset',
        ],
      }),
      true,
    );
    add(
      'create_asset_request',
      'Create asset request',
      'Save a durable prompt and checklist before image generation.',
      schema(
        'create-asset-request',
        {
          kind: {
            enum: ['background', 'character', 'prop', 'frame', 'mouth-pack'],
          },
          label: { type: 'string', minLength: 1 },
          prompt: { type: 'string', minLength: 1 },
        },
        ['kind', 'label', 'prompt'],
      ),
      (input) =>
        mutate('Asset request saved', (next) => {
          const kind = input.kind as Exclude<AssetKind, 'audio'>;
          const request = {
            id: makeId('request'),
            kind,
            label: asString(input.label),
            prompt: asString(input.prompt),
            checklist: assetGenerationChecklist(kind),
            status: 'pending' as const,
            createdAt: new Date().toISOString(),
          };
          next.assetRequests.push(request);
          return { request };
        }),
    );
    add(
      'attach_generated_asset',
      'Attach generated asset',
      'Attach bounded image bytes as a new candidate; never replaces a source in place.',
      schema(
        'attach-generated-asset',
        {
          requestId: { type: 'string' },
          dataUrl: { type: 'string', minLength: 32, maxLength: 12_000_000 },
          mimeType: { enum: ['image/png', 'image/jpeg', 'image/webp'] },
        },
        ['requestId', 'dataUrl'],
      ),
      async (input) => {
        const request = projectRef.current.assetRequests.find(
          (item) => item.id === input.requestId,
        );
        if (!request) return { ok: false, code: 'REQUEST_NOT_FOUND' };
        const dataUrl = asString(input.dataUrl);
        if (!dataUrl.startsWith('data:image/'))
          return { ok: false, code: 'INVALID_IMAGE_DATA_URL' };
        const inspection = await inspectImage(dataUrl);
        return mutate('Generated candidate attached', (next) => {
          const liveRequest = next.assetRequests.find(
            (item) => item.id === request.id,
          )!;
          const assetId = makeId('asset');
          const asset: Asset = {
            id: assetId,
            kind: liveRequest.kind,
            label: liveRequest.label,
            source: 'generated',
            reviewStatus: 'pending-review',
            dataUrl,
            mimeType: asString(input.mimeType) || 'image/png',
            prompt: liveRequest.prompt,
            dimensions: { width: inspection.width, height: inspection.height },
            provenance: { author: 'Attached by WebMCP agent' },
          };
          next.assets.push(asset);
          liveRequest.assetId = assetId;
          liveRequest.status = 'attached';
          return { assetId, requestId: request.id, inspection };
        });
      },
    );
    add(
      'inspect_asset_candidate',
      'Inspect asset candidate',
      'Read dimensions, transparency, checklist, prompt, and provenance before approval.',
      schema('inspect-asset-candidate', { assetId: { type: 'string' } }, [
        'assetId',
      ]),
      async (input) => {
        const asset = projectRef.current.assets.find(
          (item) => item.id === input.assetId,
        );
        if (!asset) return { ok: false, code: 'ASSET_NOT_FOUND' };
        const pixelInspection = asset.dataUrl
          ? await inspectImage(asset.dataUrl).catch(() => null)
          : null;
        return {
          ok: true,
          revision: projectRef.current.revision,
          asset: {
            ...asset,
            dataUrl: undefined,
            hasPayload: Boolean(asset.dataUrl),
          },
          pixelInspection,
          checklist:
            asset.kind === 'audio' ? [] : assetGenerationChecklist(asset.kind),
        };
      },
      true,
    );
    add(
      'approve_asset',
      'Approve asset',
      'Approve or reject a visually inspected candidate.',
      schema(
        'approve-asset',
        {
          assetId: { type: 'string' },
          decision: { enum: ['approve', 'reject'] },
        },
        ['assetId', 'decision'],
      ),
      (input) =>
        mutate('Asset review saved', (next) => {
          const asset = next.assets.find((item) => item.id === input.assetId);
          if (!asset)
            return {
              ok: false,
              code: 'ASSET_NOT_FOUND',
              warning: 'Asset not found.',
            };
          asset.reviewStatus =
            input.decision === 'approve' ? 'approved' : 'rejected';
          const request = next.assetRequests.find(
            (item) => item.assetId === asset.id,
          );
          if (request)
            request.status =
              input.decision === 'approve' ? 'approved' : 'rejected';
          return { assetId: asset.id, reviewStatus: asset.reviewStatus };
        }),
    );
    add(
      'validate_project',
      'Validate project',
      'Check integer frames, exposure holds, references, lip cues, SFX, and approval state.',
      schema('validate-project'),
      () => {
        const issues = validateProject(projectRef.current);
        return {
          ok: !issues.some((item) => item.severity === 'error'),
          revision: projectRef.current.revision,
          issues,
          stats: summarizeProject(projectRef.current),
        };
      },
      true,
    );
    add(
      'inspect_frame',
      'Inspect frame',
      'Evaluate one exact held-cel frame using the same state as preview and export.',
      schema('inspect-frame', {
        sceneId: { type: 'string' },
        frame: { type: 'integer', minimum: 0 },
        includePng: { type: 'boolean' },
      }),
      async (input) => {
        const current = projectRef.current;
        const scene =
          current.scenes.find((item) => item.id === asString(input.sceneId)) ??
          activeScene(current);
        const frame = clamp(
          Math.floor(asNumber(input.frame, current.currentFrame)),
          0,
          scene.frameCount - 1,
        );
        return {
          ok: true,
          revision: current.revision,
          evaluated: evaluateFrame(current, scene.id, frame),
          interpolation: 'none',
          ...(asBoolean(input.includePng)
            ? { pngDataUrl: await frameDataUrl(scene.id, frame, 720) }
            : {}),
        };
      },
      true,
    );
    add(
      'export_frame',
      'Export frame',
      'Export an exact scene frame as PNG using the production evaluator.',
      schema('export-frame', {
        sceneId: { type: 'string' },
        frame: { type: 'integer', minimum: 0 },
        download: { type: 'boolean' },
      }),
      async (input) => {
        const current = projectRef.current;
        const scene =
          current.scenes.find((item) => item.id === asString(input.sceneId)) ??
          activeScene(current);
        const frame = clamp(
          Math.floor(asNumber(input.frame, current.currentFrame)),
          0,
          scene.frameCount - 1,
        );
        const dataUrl = await frameDataUrl(scene.id, frame);
        const blob = await (await fetch(dataUrl)).blob();
        if (input.download !== false) {
          downloadBlob(
            blob,
            `${scene.id}-f${String(frame + 1).padStart(4, '0')}.png`,
          );
        }
        return {
          ok: true,
          revision: current.revision,
          sceneId: scene.id,
          frame,
          mimeType: 'image/png',
          width: current.renderWidth,
          height: current.renderHeight,
          bytes: blob.size,
          downloaded: input.download !== false,
        };
      },
      true,
    );
    add(
      'render_webm',
      'Render WebM',
      'Render every held-cel scene with captions, generated dialogue, optional music, and procedural SFX.',
      schema('render-webm', { download: { type: 'boolean' } }),
      (input) => renderWebm(input.download !== false),
      true,
    );
    add(
      'undo',
      'Undo',
      'Undo the most recent project edit.',
      schema('undo'),
      () => undo(),
    );
    add(
      'redo',
      'Redo',
      'Redo the most recently undone edit.',
      schema('redo'),
      () => redo(),
    );

    (
      window as Window & { __stagehandTools?: Map<string, ModelTool> }
    ).__stagehandTools = tools;
    if (modelContext?.registerTool) {
      const registrations = PUBLIC_WEBMCP_TOOL_NAMES.map((name) => {
        const tool = tools.get(name);
        return tool
          ? Promise.resolve(
              modelContext.registerTool(tool, { signal: lifecycle.signal }),
            )
          : Promise.resolve();
      });
      void Promise.all(registrations).catch(() =>
        setNotice('Native WebMCP registration needs an enabled browser.'),
      );
    }
    return () => lifecycle.abort();
  }, [applyProject, commit, frameDataUrl, probeVoice, redo, renderWebm, undo]);

  const scene = activeScene(project);
  const track = selectedTrack(project);
  const cel = selectedCel(project);
  const neighboring = adjacentDrawings(
    project,
    track?.id,
    project.currentFrame,
  );
  const validation = useMemo(() => validateProject(project), [project]);
  const seconds = framesToMs(project.currentFrame, project.fps) / 1000;

  const selectScene = (sceneId: string) =>
    setView((next) => {
      const destination = next.scenes.find((item) => item.id === sceneId);
      if (!destination) return;
      next.activeSceneId = destination.id;
      next.currentFrame = 0;
      next.selectedTrackId =
        destination.tracks.find((item) => item.kind === 'character')?.id ??
        destination.tracks[0]?.id;
      next.selectedCelId = destination.tracks.find(
        (item) => item.id === next.selectedTrackId,
      )?.cels[0]?.id;
    });

  const loadDemo = (demoId: DemoId) => {
    historyRef.current.push(cloneProject(projectRef.current));
    futureRef.current = [];
    const next = createDemoProject(demoId);
    next.revision = projectRef.current.revision + 1;
    applyProject(next);
    setNotice(`Loaded ${next.name}`);
  };

  const updateCel = (
    patch: Partial<AnimationCel['transform']> & {
      exposure?: number;
      drawing?: string;
    },
  ) => {
    if (!track || !cel) return;
    commit(`Updated ${cel.label}`, (next) => {
      const nextScene = activeScene(next);
      const nextTrack = nextScene.tracks.find((item) => item.id === track.id);
      const nextCel = nextTrack?.cels.find((item) => item.id === cel.id);
      if (!nextTrack || !nextCel) return;
      if (typeof patch.exposure === 'number')
        nextCel.exposure = Math.max(1, Math.floor(patch.exposure));
      if (typeof patch.drawing === 'string') {
        nextCel.drawing = patch.drawing;
        nextCel.label = patch.drawing;
      }
      for (const key of ['x', 'y', 'scale', 'rotation', 'opacity'] as const)
        if (typeof patch[key] === 'number') nextCel.transform[key] = patch[key];
      normalizeTrackExposures(nextTrack, nextScene.frameCount);
    });
  };

  const duplicateCel = () => {
    if (!track || !cel) return;
    commit('Duplicated held drawing', (next) => {
      const nextScene = activeScene(next);
      const nextTrack = nextScene.tracks.find((item) => item.id === track.id);
      if (!nextTrack) return;
      const frame = Math.min(
        nextScene.frameCount - 1,
        Math.max(project.currentFrame, cel.frame + 1),
      );
      const created = {
        ...cloneProject(cel),
        id: makeId('cel'),
        frame,
        exposure: 1,
      };
      nextTrack.cels = nextTrack.cels.filter((item) => item.frame !== frame);
      nextTrack.cels.push(created);
      normalizeTrackExposures(nextTrack, nextScene.frameCount);
      next.selectedCelId = created.id;
      next.currentFrame = frame;
    });
  };

  return (
    <main className="studio">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <Clapperboard size={19} strokeWidth={2.4} />
          </div>
          <div>
            <strong>Stagehand</strong>
            <span>frame studio</span>
          </div>
        </div>
        <div className="project-picker">
          <span className="eyebrow">Now directing</span>
          <label>
            <select
              aria-label="Choose demo"
              value={project.demoId ?? ''}
              onChange={(event) => loadDemo(event.target.value as DemoId)}
            >
              {!project.demoId && <option value="">{project.name}</option>}
              {DEMO_CATALOG.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
            <ChevronDown size={15} />
          </label>
        </div>
        <div className="top-actions">
          <button
            className={`voice-pill ${voice.status}`}
            onClick={() => void probeVoice()}
            title={voice.detail}
          >
            <span className="status-dot" />
            <Mic2 size={14} />
            <span>
              {voice.status === 'ready'
                ? 'OmniVoice'
                : voice.status === 'fallback'
                  ? 'Local preview'
                  : 'Voice offline'}
            </span>
          </button>
          <button className="agent-button" onClick={() => setAgentOpen(true)}>
            <Bot size={16} /> Agent Live <span>{registeredCount}</span>
          </button>
          <button
            className="render-button"
            onClick={() => void renderWebm(true)}
            disabled={rendering.active}
          >
            {rendering.active ? (
              <RotateCcw className="spin" size={16} />
            ) : (
              <Download size={16} />
            )}
            {rendering.active
              ? `${Math.round(rendering.progress * 100)}%`
              : 'Render film'}
          </button>
        </div>
      </header>

      <section className="mode-strip" aria-label="Production model">
        <span>
          <Film size={14} /> held drawings
        </span>
        <i />
        <span>{project.fps} fps</span>
        <i />
        <span>no interpolation</span>
        <i />
        <span>
          {project.scenes.length} scenes ·{' '}
          {(sequenceDurationMs(project) / 1000).toFixed(0)} sec
        </span>
        <p>{notice}</p>
      </section>

      <div className="workbench">
        <aside className="scene-rail" aria-label="Scenes">
          <div className="rail-heading">
            <span>SCENES</span>
            <button
              aria-label="Add scene"
              onClick={() =>
                setNotice('Ask Agent Live to add a storyboard scene.')
              }
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="scene-list">
            {project.scenes.map((item, index) => (
              <button
                key={item.id}
                className={`scene-card ${item.id === scene.id ? 'active' : ''}`}
                onClick={() => selectScene(item.id)}
              >
                <span className="scene-index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span
                  className="scene-thumb"
                  style={{
                    background: `linear-gradient(135deg, ${item.palette[0]}, ${item.palette[2]})`,
                  }}
                >
                  <span>{item.title.split(' ').slice(0, 2).join(' ')}</span>
                </span>
                <strong>{item.title}</strong>
                <small>
                  {item.frameCount}f ·{' '}
                  {(item.frameCount / project.fps).toFixed(1)}s
                </small>
              </button>
            ))}
          </div>
          <button className="story-button" onClick={() => setTab('storyboard')}>
            <BookOpen size={15} /> Story overview
          </button>
        </aside>

        <section className="center-stage">
          <div className="stage-heading">
            <div>
              <span className="eyebrow">
                Scene{' '}
                {project.scenes.findIndex((item) => item.id === scene.id) + 1}
              </span>
              <h1>{scene.title}</h1>
              <p>{scene.description}</p>
            </div>
            <div className="stage-tools">
              <button
                className={onionSkin ? 'active' : ''}
                onClick={() => setOnionSkin((value) => !value)}
                title="Toggle onion skin"
              >
                <Layers3 size={16} /> Onion
              </button>
              <button
                className={guides ? 'active' : ''}
                onClick={() => setGuides((value) => !value)}
                title="Toggle safe guides"
              >
                <ScanLine size={16} /> Guides
              </button>
              <button
                className="mobile-inspector"
                onClick={() => setInspectorOpen(true)}
              >
                <MoreHorizontal size={17} /> Inspect
              </button>
            </div>
          </div>

          <div className="stage-frame">
            <canvas ref={canvasRef} aria-label="Animation stage preview" />
            <div className="stage-corner">
              {project.renderWidth} × {project.renderHeight}
            </div>
            <div className="frame-badge">
              F{String(project.currentFrame + 1).padStart(3, '0')}
            </div>
          </div>

          <div className="transport">
            <button
              aria-label="First frame"
              onClick={() =>
                setView((next) => {
                  next.currentFrame = 0;
                })
              }
            >
              <SkipBack size={17} />
            </button>
            <button
              className="play"
              aria-label={playing ? 'Pause animation' : 'Play animation'}
              onClick={() => setPlaying((value) => !value)}
            >
              {playing ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" />
              )}
            </button>
            <button
              aria-label="Last frame"
              onClick={() =>
                setView((next) => {
                  next.currentFrame = activeScene(next).frameCount - 1;
                })
              }
            >
              <SkipForward size={17} />
            </button>
            <span className="timecode">
              {seconds.toFixed(2)}s{' '}
              <em>/ {(scene.frameCount / project.fps).toFixed(2)}s</em>
            </span>
            <input
              aria-label="Scene playhead"
              type="range"
              min={0}
              max={Math.max(0, scene.frameCount - 1)}
              value={project.currentFrame}
              onChange={(event) =>
                setView((next) => {
                  next.currentFrame = Number(event.target.value);
                })
              }
            />
            <button
              title="Play current frame SFX"
              onClick={() =>
                scene.sfx
                  .filter(
                    (item) =>
                      item.startFrame <= project.currentFrame &&
                      item.endFrame > project.currentFrame,
                  )
                  .forEach((cue) => playSfxNow(cue, project.fps))
              }
            >
              <Volume2 size={17} />
            </button>
          </div>

          <nav className="workspace-tabs" aria-label="Workspace views">
            {(
              [
                ['frames', Film, 'Frames'],
                ['storyboard', BookOpen, 'Storyboard'],
                ['assets', ImageIcon, 'Assets'],
                ['audio', AudioLines, 'Audio'],
              ] as const
            ).map(([id, Icon, label]) => (
              <button
                key={id}
                className={tab === id ? 'active' : ''}
                onClick={() => setTab(id)}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>

          {tab === 'frames' && (
            <div className="timeline-panel">
              <div className="timeline-ruler">
                <span>DRAWING EXPOSURE</span>
                {Array.from(
                  { length: Math.ceil(scene.frameCount / 12) + 1 },
                  (_, index) => (
                    <i
                      key={index}
                      style={{
                        left: `${Math.min(100, ((index * 12) / scene.frameCount) * 100)}%`,
                      }}
                    >
                      {index * 12 + 1}
                    </i>
                  ),
                )}
              </div>
              <div className="track-stack">
                {scene.tracks.map((item) => (
                  <div
                    key={item.id}
                    className={`track-row ${item.id === track?.id ? 'selected' : ''}`}
                  >
                    <button
                      className="track-label"
                      onClick={() =>
                        setView((next) => {
                          next.selectedTrackId = item.id;
                          next.selectedCelId =
                            item.cels.find(
                              (frame) =>
                                frame.frame <= next.currentFrame &&
                                frame.frame + frame.exposure >
                                  next.currentFrame,
                            )?.id ?? item.cels[0]?.id;
                        })
                      }
                    >
                      <span style={{ background: item.color }} />
                      {item.name}
                      <small>{item.kind}</small>
                    </button>
                    <div className="exposure-lane">
                      <b
                        className="playhead"
                        style={{
                          left: `${((project.currentFrame + 0.5) / scene.frameCount) * 100}%`,
                        }}
                      />
                      {item.cels.map((frame) => (
                        <button
                          key={frame.id}
                          className={`exposure ${frame.id === cel?.id ? 'active' : ''}`}
                          style={{
                            left: `${(frame.frame / scene.frameCount) * 100}%`,
                            width: `${Math.max(1.4, (frame.exposure / scene.frameCount) * 100)}%`,
                            background: item.color,
                          }}
                          title={`${frame.label}, frame ${frame.frame + 1}, hold ${frame.exposure}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setView((next) => {
                              next.currentFrame = frame.frame;
                              next.selectedTrackId = item.id;
                              next.selectedCelId = frame.id;
                            });
                          }}
                        >
                          <span>
                            {frame.assetFrame !== undefined
                              ? frame.assetFrame + 1
                              : frame.drawing.slice(0, 1).toUpperCase()}
                          </span>
                          <em>{frame.exposure}</em>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="track-row lip-row">
                  <div className="track-label">
                    <span className="mouth-dot" />
                    Mouth<small>{scene.lipSync.length} cues</small>
                  </div>
                  <div className="exposure-lane">
                    {scene.lipSync.map((cue) => (
                      <i
                        key={cue.id}
                        className="mouth-cue"
                        style={{
                          left: `${(cue.startFrame / scene.frameCount) * 100}%`,
                          width: `${Math.max(0.8, ((cue.endFrame - cue.startFrame) / scene.frameCount) * 100)}%`,
                        }}
                      >
                        {cue.shape}
                      </i>
                    ))}
                  </div>
                </div>
                <div className="track-row sfx-row">
                  <div className="track-label">
                    <span className="sfx-dot" />
                    SFX<small>{scene.sfx.length} cues</small>
                  </div>
                  <div className="exposure-lane">
                    {scene.sfx.map((cue) => (
                      <button
                        key={cue.id}
                        className="sfx-cue"
                        style={{
                          left: `${(cue.startFrame / scene.frameCount) * 100}%`,
                          width: `${Math.max(2, ((cue.endFrame - cue.startFrame) / scene.frameCount) * 100)}%`,
                        }}
                        onClick={() => playSfxNow(cue, project.fps)}
                      >
                        {cue.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="drawing-strip">
                <span className="eyebrow">Flip drawings</span>
                {[
                  neighboring.previous,
                  neighboring.current,
                  neighboring.next,
                ].map((item, index) => (
                  <button
                    key={item?.id ?? index}
                    disabled={!item}
                    className={index === 1 ? 'current' : ''}
                    onClick={() =>
                      item &&
                      setView((next) => {
                        next.currentFrame = item.frame;
                        next.selectedCelId = item.id;
                      })
                    }
                  >
                    <small>
                      {index === 0 ? 'PREV' : index === 1 ? 'ON STAGE' : 'NEXT'}
                    </small>
                    <strong>{item?.label ?? '—'}</strong>
                    <span>
                      {item
                        ? `F${item.frame + 1} · ${item.exposure}f hold`
                        : 'No drawing'}
                    </span>
                  </button>
                ))}
                <button className="duplicate-drawing" onClick={duplicateCel}>
                  <Copy size={15} /> Duplicate at playhead
                </button>
              </div>
            </div>
          )}

          {tab === 'storyboard' && (
            <div className="storyboard-grid">
              {project.storyboard.map((beat, index) => {
                const item = project.scenes.find(
                  (value) => value.id === beat.sceneId,
                )!;
                return (
                  <button
                    key={beat.id}
                    className={item.id === scene.id ? 'active' : ''}
                    onClick={() => selectScene(item.id)}
                  >
                    <span
                      className="board-image"
                      style={{
                        background: `linear-gradient(150deg, ${item.palette[0]}, ${item.palette[2]})`,
                      }}
                    >
                      <em>{String(index + 1).padStart(2, '0')}</em>
                      <Film size={24} />
                    </span>
                    <strong>{beat.title}</strong>
                    <p>{beat.description}</p>
                    <small>
                      {item.frameCount} frames ·{' '}
                      {(item.frameCount / project.fps).toFixed(1)} sec
                    </small>
                  </button>
                );
              })}
            </div>
          )}

          {tab === 'assets' && (
            <div className="asset-grid">
              {project.assets
                .filter((asset) => asset.kind !== 'audio')
                .map((asset) => (
                  <article key={asset.id}>
                    <div className="asset-preview">
                      {asset.dataUrl ? (
                        <NextImage
                          src={asset.dataUrl}
                          alt=""
                          width={160}
                          height={90}
                          unoptimized
                        />
                      ) : (
                        <ImageIcon />
                      )}
                    </div>
                    <div>
                      <span className={`review ${asset.reviewStatus}`}>
                        {asset.reviewStatus}
                      </span>
                      <strong>{asset.label}</strong>
                      <small>
                        {asset.kind} ·{' '}
                        {asset.frameGrid
                          ? `${asset.frameGrid.columns} drawing states`
                          : 'single plate'}
                      </small>
                    </div>
                  </article>
                ))}
            </div>
          )}

          {tab === 'audio' && (
            <div className="audio-board">
              <section>
                <div className="panel-title">
                  <div>
                    <span className="eyebrow">Dialogue</span>
                    <h2>Local voice lane</h2>
                  </div>
                  <button onClick={() => void probeVoice()}>
                    <Mic2 size={15} /> Probe
                  </button>
                </div>
                <div className={`voice-card ${voice.status}`}>
                  <span className="status-dot" />
                  <div>
                    <strong>{voice.engine}</strong>
                    <p>{voice.detail}</p>
                  </div>
                </div>
                {scene.audio.length ? (
                  scene.audio.map((cue) => (
                    <button
                      className="audio-cue voice-cue"
                      key={cue.id}
                      onClick={() =>
                        void playAudioCueNow(
                          project.assets.find(
                            (asset) => asset.id === cue.assetId,
                          ),
                          cue,
                        )
                      }
                    >
                      <Mic2 size={16} />
                      <strong>{cue.label}</strong>
                      <small>
                        F{cue.startFrame + 1}–{cue.endFrame}
                      </small>
                      <Play size={14} fill="currentColor" />
                    </button>
                  ))
                ) : (
                  <div className="empty-audio">
                    <Mic2 size={24} />
                    <strong>No recorded dialogue yet</strong>
                    <p>
                      Captions already drive visible mouth shapes. Agent Live
                      can generate a private local WAV when the voice bridge is
                      running.
                    </p>
                  </div>
                )}
              </section>
              <section>
                <div className="panel-title">
                  <div>
                    <span className="eyebrow">Procedural</span>
                    <h2>Sound effects</h2>
                  </div>
                  <Sparkles size={18} />
                </div>
                {scene.sfx.map((cue) => (
                  <button
                    className="audio-cue"
                    key={cue.id}
                    onClick={() => playSfxNow(cue, project.fps)}
                  >
                    <span className="waveform">
                      {Array.from({ length: 18 }, (_, index) => (
                        <i
                          key={index}
                          style={{
                            height: `${20 + ((cue.seed + index * 17) % 70)}%`,
                          }}
                        />
                      ))}
                    </span>
                    <strong>{cue.label}</strong>
                    <small>
                      {cue.recipe} · F{cue.startFrame + 1}
                    </small>
                    <Play size={14} fill="currentColor" />
                  </button>
                ))}
              </section>
            </div>
          )}
        </section>

        <aside className={`inspector ${inspectorOpen ? 'open' : ''}`}>
          <div className="inspector-heading">
            <div>
              <span className="eyebrow">Inspector</span>
              <h2>{cel?.label ?? scene.title}</h2>
            </div>
            <button
              className="close-inspector"
              aria-label="Close inspector"
              onClick={() => setInspectorOpen(false)}
            >
              <X size={17} />
            </button>
          </div>
          {cel && track ? (
            <>
              <div className="inspector-section">
                <div className="section-label">
                  <span>EXPOSURE</span>
                  <em>held, no tween</em>
                </div>
                <label>
                  Drawing name
                  <input
                    value={cel.drawing}
                    onChange={(event) =>
                      updateCel({ drawing: event.target.value })
                    }
                  />
                </label>
                <div className="field-grid">
                  <label>
                    Starts
                    <input type="number" value={cel.frame + 1} readOnly />
                  </label>
                  <label>
                    Hold
                    <input
                      type="number"
                      min={1}
                      max={scene.frameCount - cel.frame}
                      value={cel.exposure}
                      onChange={(event) =>
                        updateCel({ exposure: Number(event.target.value) })
                      }
                    />
                  </label>
                </div>
                <button className="wide-action" onClick={duplicateCel}>
                  <Copy size={15} /> Duplicate drawing here
                </button>
              </div>
              <div className="inspector-section">
                <div className="section-label">
                  <span>TRANSFORM</span>
                  <em>% of stage</em>
                </div>
                <div className="field-grid">
                  {(['x', 'y', 'scale', 'rotation'] as const).map((key) => (
                    <label key={key}>
                      {key === 'scale' ? 'Scale' : key.toUpperCase()}
                      <input
                        type="number"
                        step={key === 'scale' ? 0.05 : 1}
                        value={Number(cel.transform[key].toFixed(2))}
                        onChange={(event) =>
                          updateCel({ [key]: Number(event.target.value) })
                        }
                      />
                    </label>
                  ))}
                </div>
                <label>
                  Opacity
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={cel.transform.opacity}
                    onChange={(event) =>
                      updateCel({ opacity: Number(event.target.value) })
                    }
                  />
                </label>
              </div>
              <div className="inspector-section mouth-section">
                <div className="section-label">
                  <span>MOUTH SYSTEM</span>
                  <em>{scene.lipSync.length} cues</em>
                </div>
                <div className="mouths">
                  {MOUTH_SHAPES.map((shape) => (
                    <span key={shape}>{shape}</span>
                  ))}
                </div>
                <button
                  className="wide-action"
                  onClick={() =>
                    commit('Lip-sync cues regenerated', (next) =>
                      regenerateSceneLipSync(activeScene(next)),
                    )
                  }
                >
                  <WandSparkles size={15} /> Rebuild from captions
                </button>
              </div>
            </>
          ) : (
            <div className="empty-inspector">
              <Layers3 size={26} />
              <strong>Select a drawing</strong>
              <p>Choose a frame exposure to edit its hold and placement.</p>
            </div>
          )}
          <div className="validation-card">
            <div>
              <Activity size={16} />
              <strong>Production check</strong>
            </div>
            <span
              className={
                validation.some((item) => item.severity === 'error')
                  ? 'error'
                  : 'pass'
              }
            >
              {validation.some((item) => item.severity === 'error')
                ? `${validation.filter((item) => item.severity === 'error').length} blockers`
                : 'Ready to render'}
            </span>
            <p>Preview, inspect, PNG, and WebM share one held-cel evaluator.</p>
          </div>
        </aside>
      </div>

      {agentOpen && (
        <div className="drawer-scrim">
          <button
            className="drawer-dismiss"
            aria-label="Close Agent Live"
            onClick={() => setAgentOpen(false)}
          />
          <aside className="agent-drawer">
            <header>
              <div>
                <span className="eyebrow">Native WebMCP</span>
                <h2>Agent Live</h2>
                <p>
                  {PUBLIC_WEBMCP_TOOL_NAMES.length} focused calls—down from the
                  rigging build’s 40.
                </p>
              </div>
              <button
                aria-label="Close Agent Live"
                onClick={() => setAgentOpen(false)}
              >
                <X size={19} />
              </button>
            </header>
            <div className="agent-status">
              <span className="status-dot" />
              <strong>
                {registeredCount === PUBLIC_WEBMCP_TOOL_NAMES.length
                  ? 'Tool contract ready'
                  : 'Registering tools'}
              </strong>
              <small>
                revision {project.revision} · optimistic guards on edits
              </small>
            </div>
            {TOOL_GROUPS.map((group) => (
              <section key={group.label}>
                <h3>{group.label}</h3>
                <div>
                  {group.names.map((name) => (
                    <article key={name} data-tool-ui={name}>
                      <span>
                        {name.includes('render') || name.includes('export') ? (
                          <MonitorPlay size={14} />
                        ) : name.includes('voice') ||
                          name.includes('audio') ||
                          name.includes('sfx') ? (
                          <AudioLines size={14} />
                        ) : name.includes('asset') ? (
                          <ImageIcon size={14} />
                        ) : (
                          <Sparkles size={14} />
                        )}
                      </span>
                      <div>
                        <strong>{name}</strong>
                        <small>
                          {name.startsWith('get_') ||
                          name.startsWith('inspect_') ||
                          name.startsWith('list_') ||
                          name.startsWith('validate_') ||
                          name === 'probe_local_voice' ||
                          name === 'export_frame' ||
                          name === 'render_webm'
                            ? 'read / proof'
                            : 'edit'}
                        </small>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </aside>
        </div>
      )}
    </main>
  );
}
