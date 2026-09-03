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
  CircleHelp,
  Clapperboard,
  ChevronDown,
  Film,
  FolderOpen,
  Grid2X2,
  Hand,
  Layers3,
  Lock,
  Maximize2,
  MousePointer2,
  Pause,
  Play,
  Redo2,
  RotateCcw,
  Save,
  Scissors,
  Settings2,
  Sparkles,
  SquareDashedMousePointer,
  Undo2,
  Upload,
  WandSparkles,
  ZoomIn,
} from 'lucide-react';

type Pose = 'idle' | 'nervous' | 'wave' | 'lean-in';
type Character = {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  rotation: number;
  pose: Pose;
};
type SceneMeta = {
  id: string;
  title: string;
  description: string;
  duration: number;
};
type Project = {
  revision: number;
  duration: number;
  currentTime: number;
  selectedId: string;
  characters: Character[];
  captions: {
    id: string;
    text: string;
    start: number;
    end: number;
    speaker: string;
  }[];
  scenes: SceneMeta[];
  activeSceneId: string;
  dirty: boolean;
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
const STORAGE_KEY = 'stagehand-paper-cutout-comedy-v1';
const starterScenes: SceneMeta[] = [
  {
    id: 'scene-01',
    title: 'Diner · first meeting',
    description: 'Alice waits. Bob arrives behind her.',
    duration: 5000,
  },
];
const starterProject: Project = {
  revision: 7,
  duration: 5000,
  currentTime: 1800,
  selectedId: 'alice',
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
  ],
  scenes: starterScenes,
  activeSceneId: 'scene-01',
};
const hydrateProject = (value: Partial<Project>): Project => ({
  ...copy(starterProject),
  ...value,
  scenes:
    Array.isArray(value.scenes) && value.scenes.length > 0
      ? value.scenes
      : copy(starterScenes),
  activeSceneId: value.activeSceneId ?? 'scene-01',
});
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const timecode = (ms: number) => `${(ms / 1000).toFixed(2).padStart(4, '0')}s`;

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  c: Character,
  width: number,
  height: number,
  selected: boolean,
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
  ctx.moveTo(-38, -128);
  ctx.lineTo(c.pose === 'wave' ? -79 : -65, c.pose === 'wave' ? -204 : -67);
  ctx.moveTo(38, -128);
  ctx.lineTo(c.pose === 'lean-in' ? 75 : 66, -65);
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
) {
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
  project.characters.forEach((character) =>
    drawCharacter(ctx, character, width, height, false),
  );
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

function StageCanvas({
  project,
  onSelect,
  sceneLabel,
}: {
  project: Project;
  onSelect: (id: string) => void;
  sceneLabel: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
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
    project.characters.forEach((c) =>
      drawCharacter(ctx, c, width, height, c.id === project.selectedId),
    );
    ctx.fillStyle = 'rgba(41,39,42,.55)';
    ctx.font = '11px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      `${sceneLabel.toUpperCase()}  /  ${timecode(project.currentTime)}`,
      16,
      height - 14,
    );
  }, [project, sceneLabel]);
  useEffect(() => {
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
        const rect = e.currentTarget.getBoundingClientRect(),
          x = ((e.clientX - rect.left) / rect.width) * 100;
        const nearest = project.characters.reduce((a, b) =>
          Math.abs(a.x - x) < Math.abs(b.x - x) ? a : b,
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

export default function Home() {
  const [project, setProject] = useState<Project>(starterProject),
    [, setHistory] = useState<Project[]>([]),
    [, setFuture] = useState<Project[]>([]),
    [playing, setPlaying] = useState(false),
    [panel, setPanel] = useState<'scenes' | 'storyboard' | 'assets'>('scenes'),
    [viewMode, setViewMode] = useState<'animate' | 'storyboard' | 'preview'>(
      'animate',
    ),
    [dialog, setDialog] = useState<'help' | 'settings' | null>(null),
    [rendering, setRendering] = useState(false),
    [notice, setNotice] = useState('Ready for direction'),
    [saved, setSaved] = useState(true);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [lastCommand, setLastCommand] = useState('set_pose( alice )');
  const [showSafeArea, setShowSafeArea] = useState(true);
  const selected =
      project.characters.find((c) => c.id === project.selectedId) ??
      project.characters[0],
    activeCaption = project.captions.find(
      (c) => project.currentTime >= c.start && project.currentTime <= c.end,
    ),
    ratio = project.currentTime / project.duration;
  const commit = useCallback(
    (mutate: (next: Project) => void, label: string, agent = false) => {
      setProject((current) => {
        const next = copy(current);
        mutate(next);
        next.revision += 1;
        next.dirty = true;
        setHistory((items) => [...items.slice(-29), copy(current)]);
        setFuture([]);
        setSaved(false);
        setLastCommand(label);
        setNotice(`${agent ? 'Agent' : 'Human'} · ${label}`);
        return next;
      });
    },
    [],
  );
  const undo = useCallback(() => {
    setHistory((items) => {
      const previous = items.at(-1);
      if (!previous) {
        setNotice('Nothing to undo');
        return items;
      }
      setFuture((redo) => [copy(project), ...redo]);
      setProject({ ...previous, revision: project.revision + 1, dirty: true });
      setLastCommand('undo()');
      setNotice('Undo · restored previous command');
      return items.slice(0, -1);
    });
  }, [project]);
  const redo = useCallback(() => {
    setFuture((items) => {
      const next = items[0];
      if (!next) {
        setNotice('Nothing to redo');
        return items;
      }
      setHistory((old) => [...old, copy(project)]);
      setProject({ ...next, revision: project.revision + 1, dirty: true });
      setLastCommand('redo()');
      setNotice('Redo · reapplied command');
      return items.slice(1);
    });
  }, [project]);
  const projectRef = useRef(project),
    selectedRef = useRef(selected),
    commitRef = useRef(commit),
    undoRef = useRef(undo);
  useEffect(() => {
    projectRef.current = project;
    selectedRef.current = selected;
    commitRef.current = commit;
    undoRef.current = undo;
  }, [project, selected, commit, undo]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setProject(hydrateProject(JSON.parse(stored) as Partial<Project>));
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
        setProject((current) => ({
          ...current,
          currentTime:
            current.currentTime >= current.duration
              ? 0
              : current.currentTime + 1000 / 12,
        })),
      1000 / 12,
    );
    return () => window.clearInterval(timer);
  }, [playing]);
  useEffect(() => {
    const modelContext = (
      document as Document & { modelContext?: ModelContext }
    ).modelContext;
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
      void Promise.resolve(
        modelContext.registerTool(
          {
            name,
            title,
            description,
            inputSchema,
            annotations: { readOnlyHint, untrustedContentHint: false },
            execute,
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
          name: 'Paper Cutout Comedy',
          durationMs: current.duration,
          sceneCount: current.scenes.length,
          activeSceneId: current.activeSceneId,
          selectedId: current.selectedId,
        };
      },
      true,
    );
    register(
      'get_scene',
      'Get active scene',
      'Inspect the active scene metadata and timing.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => {
        const current = projectRef.current;
        return {
          ok: true,
          revision: current.revision,
          scene: current.scenes.find(
            (scene) => scene.id === current.activeSceneId,
          ),
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
        beats: [
          { id: 'beat-01', title: 'The wait', startMs: 0, endMs: 1550 },
          {
            id: 'beat-02',
            title: 'The entrance',
            startMs: 1550,
            endMs: 3100,
          },
          { id: 'beat-03', title: 'The pause', startMs: 3100, endMs: 5000 },
        ],
      }),
      true,
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
          fps: 12,
          currentTimeMs: current.currentTime,
          durationMs: current.duration,
          tracks: ['camera', 'alice', 'bob', 'captions', 'music'],
          captions: current.captions,
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
      () => ({
        ok: true,
        revision: projectRef.current.revision,
        selection: selectedRef.current,
      }),
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
        styleBible: {
          construction: 'paper-cutout',
          motion: 'limited · snappy',
          camera: 'reaction cut',
          palette: ['coral', 'diner teal', 'mustard', 'warm paper'],
        },
      }),
      true,
    );
    register(
      'get_asset_manifest',
      'Get asset manifest',
      'Inspect the structured assets available to the active project.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => ({
        ok: true,
        revision: projectRef.current.revision,
        assets: [
          { id: 'alice', kind: 'rigged-character', label: 'Alice' },
          { id: 'bob', kind: 'rigged-character', label: 'Bob' },
          {
            id: 'diner-background',
            kind: 'background',
            label: 'Diner background',
          },
          { id: 'coffee-mug', kind: 'prop', label: 'Coffee mug' },
        ],
      }),
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
      'add_scene',
      'Add scene',
      'Append a new editable scene without changing existing scene content.',
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
        const sceneNumber = current.scenes.length + 1;
        const scene = {
          id: `scene-${String(sceneNumber).padStart(2, '0')}`,
          title:
            typeof input.title === 'string' && input.title.trim()
              ? input.title.trim()
              : `Scene ${String(sceneNumber).padStart(2, '0')}`,
          description:
            typeof input.description === 'string' && input.description.trim()
              ? input.description.trim()
              : 'New scene ready for blocking.',
          duration: current.duration,
        } satisfies SceneMeta;
        commitRef.current(
          (next) => {
            next.scenes.push(scene);
            next.activeSceneId = scene.id;
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
      'set_pose',
      'Set character pose',
      'Move a character while preserving unrelated edits.',
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
            enum: ['idle', 'nervous', 'wave', 'lean-in'],
          },
        },
      },
      (input) => {
        const current = projectRef.current;
        if (typeof input.characterId !== 'string')
          return { ok: false, code: 'INVALID_INPUT' };
        if (!current.characters.some((c) => c.id === input.characterId))
          return { ok: false, code: 'NOT_FOUND' };
        commitRef.current(
          (next) => {
            const c = next.characters.find(
              (item) => item.id === input.characterId,
            );
            if (c) {
              if (typeof input.x === 'number') c.x = input.x;
              if (typeof input.y === 'number') c.y = input.y;
              if (typeof input.rotation === 'number')
                c.rotation = input.rotation;
              if (typeof input.pose === 'string') c.pose = input.pose as Pose;
            }
          },
          `Set ${input.characterId} pose`,
          true,
        );
        return {
          ok: true,
          revision: current.revision + 1,
          changedEntityIds: [input.characterId],
          changedPaths: [`characters.${input.characterId}`],
          warnings: [],
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
        return { ok: true, revision: projectRef.current.revision + 1 };
      },
    );
    register(
      'validate_project',
      'Validate project',
      'Run deterministic readiness checks.',
      { type: 'object', properties: {}, additionalProperties: false },
      () => {
        const current = projectRef.current;
        const issues: Array<{
          code: string;
          severity: 'error' | 'warning';
          path: string;
          message: string;
        }> = [];
        if (current.scenes.length === 0)
          issues.push({
            code: 'NO_SCENES',
            severity: 'error',
            path: 'scenes',
            message: 'Project needs at least one scene.',
          });
        if (current.characters.length === 0)
          issues.push({
            code: 'NO_CHARACTERS',
            severity: 'error',
            path: 'characters',
            message: 'Active scene needs at least one character.',
          });
        current.captions.forEach((caption) => {
          if (caption.end <= caption.start || caption.end > current.duration) {
            issues.push({
              code: 'CAPTION_OUT_OF_BOUNDS',
              severity: 'error',
              path: `captions.${caption.id}`,
              message: `${caption.id} has invalid timing.`,
            });
          }
        });
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
  const updateSelected = (key: 'x' | 'y' | 'rotation', value: number) =>
    commit((next) => {
      const c = next.characters.find((item) => item.id === next.selectedId);
      if (c) c[key] = value;
    }, `Adjust ${key}`);
  const addScene = () => {
    const sceneNumber = project.scenes.length + 1;
    const scene = {
      id: `scene-${String(sceneNumber).padStart(2, '0')}`,
      title: `Scene ${String(sceneNumber).padStart(2, '0')}`,
      description: 'New scene ready for blocking.',
      duration: project.duration,
    } satisfies SceneMeta;
    commit((next) => {
      next.scenes.push(scene);
      next.activeSceneId = scene.id;
    }, `Add ${scene.title}`);
  };
  const exportProject = useCallback(() => {
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'stagehand-paper-cutout-comedy.stagehand.json';
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
        setProject(imported);
        setHistory([]);
        setFuture([]);
        setLastCommand('import_project()');
        setNotice('Project JSON imported');
      })
      .catch(() => setNotice('Import failed · expected Stagehand JSON'));
  };
  const renderWebM = useCallback(() => {
    if (rendering) return;
    const canvas = document.querySelector(
      '.stage-canvas',
    ) as HTMLCanvasElement | null;
    if (!canvas?.captureStream || !('MediaRecorder' in window)) {
      setNotice('WebM export is not supported in this browser');
      return;
    }
    const output = document.createElement('canvas');
    output.width = 720;
    output.height = 405;
    const outputContext = output.getContext('2d');
    if (!outputContext) {
      setNotice('Render surface could not be created');
      return;
    }
    const stream = output.captureStream(0),
      track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack,
      chunks: Blob[] = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    let frame = 0;
    let timer = 0;
    recorder.onstop = () => {
      window.clearInterval(timer);
      const url = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'stagehand-paper-cutout-comedy.webm';
      link.click();
      URL.revokeObjectURL(url);
      stream.getTracks().forEach((track) => track.stop());
      setPlaying(false);
      setRendering(false);
      setNotice('Silent WebM downloaded · preview render complete');
    };
    setProject((current) => ({ ...current, currentTime: 0 }));
    setRendering(true);
    setPlaying(false);
    setNotice('Rendering 5-second silent WebM preview');
    recorder.start();
    const drawNextFrame = () => {
      drawRenderFrame(
        outputContext,
        { ...project, currentTime: frame },
        output.width,
        output.height,
      );
      track.requestFrame();
      frame += 1000 / 12;
      if (frame > project.duration) {
        window.clearInterval(timer);
        window.setTimeout(() => recorder.stop(), 300);
      }
    };
    drawNextFrame();
    timer = window.setInterval(drawNextFrame, 1000 / 12);
  }, [project, rendering]);
  const tracks = useMemo(
    () => [
      { name: 'Camera', color: 'blue', marks: [0, 28, 55, 74] },
      { name: 'Alice · rig', color: 'coral', marks: [18, 36, 52, 77] },
      { name: 'Bob · rig', color: 'teal', marks: [51, 67, 82] },
      { name: 'Captions', color: 'yellow', marks: [31, 62] },
      { name: 'Music · low', color: 'violet', marks: [0, 100] },
    ],
    [],
  );
  const activeSceneIndex = Math.max(
    0,
    project.scenes.findIndex((scene) => scene.id === project.activeSceneId),
  );
  const activeScene = project.scenes[activeSceneIndex] ?? starterScenes[0];
  return (
    <main className="studio-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <Clapperboard size={17} />
          </div>
          <div>
            <div className="brand-name">stagehand</div>
            <div className="brand-subtitle">
              animation studio <span>·</span> local project
            </div>
          </div>
        </div>
        <div className="project-title">
          <span className="eyebrow">PROJECT</span>
          <span className="title-name">Paper Cutout Comedy</span>
          <ChevronDown size={14} />
        </div>
        <div className="top-actions">
          <div className={`save-state ${saved ? '' : 'unsaved'}`}>
            <span className="status-dot" />
            {saved ? 'Saved locally' : 'Saving…'}
          </div>
          <IconButton label="Help" onClick={() => setDialog('help')}>
            <CircleHelp size={17} />
          </IconButton>
          <IconButton label="Settings" onClick={() => setDialog('settings')}>
            <Settings2 size={17} />
          </IconButton>
          <button className="render-button" type="button" onClick={renderWebM}>
            <Film size={16} /> {rendering ? 'Rendering…' : 'Render silent WebM'}
          </button>
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
      <div className="workspace">
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
            >
              <Layers3 size={15} />
              Scenes
            </button>
            <button
              className={panel === 'storyboard' ? 'selected' : ''}
              onClick={() => setPanel('storyboard')}
              type="button"
              role="tab"
              aria-selected={panel === 'storyboard'}
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
            >
              <FolderOpen size={15} />
              Assets
            </button>
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
                <button
                  className={`scene-card ${scene.id === project.activeSceneId ? 'active' : ''}`}
                  key={scene.id}
                  type="button"
                  onClick={() =>
                    commit((next) => {
                      next.activeSceneId = scene.id;
                      next.duration = scene.duration;
                      next.currentTime = 0;
                    }, `Open ${scene.title}`)
                  }
                >
                  <div className="scene-thumbnail">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <div className="thumb-diner" />
                  </div>
                  <div className="scene-meta">
                    <strong>{scene.title}</strong>
                    <span>
                      {timecode(scene.duration)} <i>12 fps</i>
                    </span>
                  </div>
                  <span className="scene-more">ready</span>
                </button>
              ))}
              <button className="add-scene" type="button" onClick={addScene}>
                <span>＋</span> Add scene
              </button>
              <div className="section-label assets-label">
                <span>STARTER KIT</span>
              </div>
              <button
                className="starter-link"
                type="button"
                onClick={() => {
                  setHistory([]);
                  setFuture([]);
                  setProject(copy(starterProject));
                  setLastCommand('reset_to_starter()');
                  setNotice('Starter restored');
                }}
              >
                <RotateCcw size={14} /> Reset to starter
              </button>
            </div>
          )}
          {panel === 'storyboard' && (
            <div className="rail-content">
              <div className="section-label">
                <span>
                  BEATS <b>3</b>
                </span>
              </div>
              {[
                ['01', 'The wait', 'Alice practices what to say.'],
                ['02', 'The entrance', 'Bob arrives behind her.'],
                ['03', 'The pause', 'Neither knows what to do.'],
              ].map(([id, title, desc], index) => (
                <div
                  className={`board-card ${index === 0 ? 'active' : ''}`}
                  key={id}
                >
                  <span className="beat-index">{id}</span>
                  <strong>{title}</strong>
                  <small>{desc}</small>
                </div>
              ))}
            </div>
          )}
          {panel === 'assets' && (
            <div className="rail-content">
              <div className="section-label">
                <span>
                  ASSETS <b>4</b>
                </span>
                <Upload size={13} />
              </div>
              <div className="asset-list">
                <div>
                  <span className="asset-swatch alice-swatch" />
                  Alice · rigged
                </div>
                <div>
                  <span className="asset-swatch bob-swatch" />
                  Bob · rigged
                </div>
                <div>
                  <span className="asset-swatch bg-swatch" />
                  Diner background
                </div>
                <div>
                  <span className="asset-swatch prop-swatch" />
                  Coffee mug
                </div>
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
                <small>14 tools declared</small>
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
                onClick={() => setViewMode('animate')}
              >
                <SquareDashedMousePointer size={14} /> Animate
              </button>
              <button
                className={viewMode === 'storyboard' ? 'active' : ''}
                type="button"
                role="tab"
                aria-selected={viewMode === 'storyboard'}
                onClick={() => setViewMode('storyboard')}
              >
                <Grid2X2 size={14} /> Storyboard
              </button>
              <button
                className={viewMode === 'preview' ? 'active' : ''}
                type="button"
                role="tab"
                aria-selected={viewMode === 'preview'}
                onClick={() => {
                  setViewMode('preview');
                  setPlaying(true);
                }}
              >
                <Play size={14} /> Preview
              </button>
            </div>
            <div className="scene-tools">
              <IconButton label="Select tool" active>
                <MousePointer2 size={15} />
              </IconButton>
              <IconButton label="Pan tool">
                <Hand size={15} />
              </IconButton>
              <span className="divider" />
              <IconButton label="Zoom out">−</IconButton>
              <span className="zoom-readout">100%</span>
              <IconButton label="Zoom in">
                <ZoomIn size={15} />
              </IconButton>
              <IconButton label="Fit stage">
                <Maximize2 size={15} />
              </IconButton>
            </div>
          </div>
          <div className={`stage-wrap ${viewMode}-mode`}>
            {viewMode === 'storyboard' && (
              <div className="mode-banner">
                <span>STORYBOARD</span>
                <strong>Three beats · one awkward pause</strong>
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
                  Preview uses the same deterministic scene clock as render.
                </small>
              </div>
            )}
            <div className="stage-header">
              <span>
                <span className="live-dot" /> SCENE{' '}
                {String(activeSceneIndex + 1).padStart(2, '0')} <em>·</em> 12
                FPS
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
              className={`canvas-frame ${showSafeArea ? 'safe-area-visible' : ''}`}
            >
              <StageCanvas
                project={project}
                sceneLabel={activeScene.title}
                onSelect={(id) =>
                  setProject((current) => ({ ...current, selectedId: id }))
                }
              />
              {activeCaption && (
                <div className="canvas-caption">
                  <span>{activeCaption.speaker}</span>
                  {activeCaption.text}
                </div>
              )}
            </div>
            <div className="stage-footer">
              <span>Paper cutout / limited motion</span>
              <span>
                720 × 405 <i>16:9</i>
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
                    setProject((current) => ({
                      ...current,
                      currentTime: Math.max(0, current.currentTime - 83.33),
                    }))
                  }
                >
                  −
                </IconButton>
                <span className="timecode">
                  {timecode(project.currentTime)}{' '}
                  <small>/ {timecode(project.duration)}</small>
                </span>
              </div>
              <div className="timeline-actions">
                <button
                  type="button"
                  disabled
                  title="Coming soon · keyframe authoring"
                >
                  <Sparkles size={14} /> Keyframe
                </button>
                <button
                  type="button"
                  disabled
                  title="Coming soon · clip splitting"
                >
                  <Scissors size={14} /> Split
                </button>
                <button
                  type="button"
                  disabled
                  title="Coming soon · track locking"
                >
                  <Lock size={14} /> Lock track
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
                            : '✦'}
                    </span>
                    <span>{track.name}</span>
                  </div>
                ))}
              </div>
              <div className="track-area">
                <div className="ruler">
                  {[0, 1, 2, 3, 4, 5].map((second) => (
                    <span
                      key={second}
                      style={{ left: `${(second / 5) * 100}%` }}
                    >
                      0{second}
                    </span>
                  ))}
                </div>
                {tracks.map((track) => (
                  <div className="track-row" key={track.name}>
                    <div
                      className={`clip clip-${track.color}`}
                      style={{
                        left:
                          track.name === 'Bob · rig'
                            ? '50%'
                            : track.name === 'Captions'
                              ? '30%'
                              : '0%',
                        width:
                          track.name === 'Captions'
                            ? '40%'
                            : track.name === 'Bob · rig'
                              ? '44%'
                              : '100%',
                      }}
                    >
                      {track.name === 'Captions' && (
                        <span>You actually came</span>
                      )}
                    </div>
                    {track.marks.map((mark) => (
                      <span
                        className={`key key-${track.color}`}
                        style={{ left: `${mark}%` }}
                        key={mark}
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
                    setProject((current) => ({
                      ...current,
                      currentTime: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </section>
        <aside className="inspector">
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
              <span>Character · rigged</span>
            </div>
            <ChevronDown size={14} />
          </div>
          <div className="inspector-section">
            <div className="inspector-label">
              TRANSFORM <span>local</span>
            </div>
            <div className="field-row">
              <label>
                X{' '}
                <input
                  type="number"
                  value={selected.x}
                  onChange={(e) => updateSelected('x', Number(e.target.value))}
                />
                <b>%</b>
              </label>
              <label>
                Y{' '}
                <input
                  type="number"
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
                  value={selected.rotation}
                  onChange={(e) =>
                    updateSelected('rotation', Number(e.target.value))
                  }
                />
                <b>°</b>
              </label>
              <label>
                Opacity <input type="number" value="100" readOnly />
                <b>%</b>
              </label>
            </div>
            <small className="transform-help">
              Move the selected character in the scene. Changes are
              keyframe-ready and undoable.
            </small>
          </div>
          <div className="inspector-section">
            <div className="inspector-label">
              POSE{' '}
              <button
                type="button"
                onClick={() => setNotice('Preset applied to the selected rig')}
              >
                <WandSparkles size={13} /> Apply preset
              </button>
            </div>
            <div className="pose-grid">
              {(['idle', 'nervous', 'wave', 'lean-in'] as Pose[]).map(
                (pose) => (
                  <button
                    className={selected.pose === pose ? 'active' : ''}
                    type="button"
                    key={pose}
                    onClick={() =>
                      commit((next) => {
                        const c = next.characters.find(
                          (item) => item.id === next.selectedId,
                        );
                        if (c) c.pose = pose;
                      }, `Apply ${pose} pose`)
                    }
                  >
                    <span className={`pose-dot pose-${pose}`} />
                    {pose.replace('-', ' ')}
                  </button>
                ),
              )}
            </div>
          </div>
          <div className="inspector-section">
            <div className="inspector-label">STYLE BIBLE</div>
            <div className="style-row">
              <span>Construction</span>
              <strong>paper-cutout</strong>
            </div>
            <div className="style-row">
              <span>Motion</span>
              <strong>limited · snappy</strong>
            </div>
            <div className="style-row">
              <span>Camera</span>
              <strong>reaction cut</strong>
            </div>
          </div>
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
                window.localStorage.setItem(
                  STORAGE_KEY,
                  JSON.stringify({ ...project, dirty: false }),
                );
                setProject((current) => ({ ...current, dirty: false }));
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
                    <dt>Undo</dt>
                    <dd>Restore the last human or agent command</dd>
                  </div>
                  <div>
                    <dt>Render</dt>
                    <dd>Export a silent, editable-preview WebM</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <div className="dialog-copy">
                <p>Project data stays in this browser until you export it.</p>
                <div className="setting-line">
                  <span>Frame rate</span>
                  <strong>12 fps · paper cutout</strong>
                </div>
                <div className="setting-line">
                  <span>Storage</span>
                  <strong>Local browser project</strong>
                </div>
                <div className="setting-line">
                  <span>Agent surface</span>
                  <strong>14 WebMCP tools</strong>
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
