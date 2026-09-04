import assert from 'node:assert/strict';
import {
  DEMO_CATALOG,
  MOUTH_SHAPES,
  createDemoProject,
  evaluateFrame,
  heldCel,
  hydrateProject,
  sequenceDurationMs,
  validateProject,
} from '../app/stagehand-model.ts';

for (const demo of DEMO_CATALOG) {
  const project = createDemoProject(demo.id);
  const errors = validateProject(project).filter(
    (issue) => issue.severity === 'error',
  );
  assert.deepEqual(
    errors,
    [],
    `${demo.title} should validate without blockers`,
  );
  assert.ok(
    project.scenes.length >= 4,
    `${demo.title} should be a real multi-scene story`,
  );
  assert.ok(
    sequenceDurationMs(project) >= 18_000,
    `${demo.title} should run at least 18 seconds`,
  );
  assert.ok(
    project.assets.some(
      (asset) =>
        asset.kind === 'background' && asset.reviewStatus === 'approved',
    ),
  );
  assert.ok(
    project.assets.filter((asset) => asset.kind === 'character').length >= 2,
  );
  assert.ok(project.scenes.every((scene) => Boolean(scene.backgroundAssetId)));
  assert.ok(project.scenes.every((scene) => scene.captions.length > 0));
  assert.ok(project.scenes.every((scene) => scene.lipSync.length > 0));
  assert.ok(project.scenes.every((scene) => scene.sfx.length > 0));

  for (const scene of project.scenes) {
    for (const track of scene.tracks) {
      assert.ok(
        track.cels.every(
          (cel) =>
            Number.isInteger(cel.frame) && Number.isInteger(cel.exposure),
        ),
      );
      const sorted = [...track.cels].sort((a, b) => a.frame - b.frame);
      assert.deepEqual(
        track.cels,
        sorted,
        `${track.name} drawings should stay sorted`,
      );
      for (let index = 0; index < track.cels.length - 1; index += 1) {
        const current = track.cels[index];
        const next = track.cels[index + 1];
        assert.equal(
          heldCel(track, next.frame - 1)?.id,
          current.id,
          'a drawing must hold until the next authored frame',
        );
        assert.equal(
          heldCel(track, next.frame)?.id,
          next.id,
          'the next drawing must switch on its exact frame',
        );
      }
    }
    assert.ok(scene.lipSync.every((cue) => MOUTH_SHAPES.includes(cue.shape)));
    const inspected = evaluateFrame(
      project,
      scene.id,
      Math.floor(scene.frameCount / 2),
    );
    assert.equal(inspected.frame, Math.floor(scene.frameCount / 2));
    assert.equal(inspected.sceneId, scene.id);
  }
}

const migrated = hydrateProject({
  name: 'Old rig project',
  fps: 24,
  duration: 4_000,
  skeletons: [{ id: 'retired-skeleton' }],
  boneKeyframes: [{ id: 'retired-bone-keyframe' }],
});
assert.equal(migrated.schemaVersion, 2);
assert.equal(migrated.fps, 24);
assert.ok(
  migrated.migrationWarnings.some((warning) => /skeleton|rig/i.test(warning)),
);
assert.deepEqual(
  validateProject(migrated).filter((issue) => issue.severity === 'error'),
  [],
);

console.log(
  `frame animation regression passed for ${DEMO_CATALOG.length} demos`,
);
