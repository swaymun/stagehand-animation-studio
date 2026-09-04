export type Point2 = { x: number; y: number };

export type Affine2D = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

export type MeshInfluenceV1 = { boneId: string; weight: number };

export type MeshVertexV1 = {
  id: string;
  x: number;
  y: number;
  u: number;
  v: number;
  influences: MeshInfluenceV1[];
};

export type MeshBindingV1 = {
  version: 1;
  id: string;
  textureAssetId: string;
  coordinateSpace: 'normalized-image';
  vertices: MeshVertexV1[];
  triangles: Array<[number, number, number]>;
  zIndex: number;
  skeletonVersion: number;
};

export type MeshIssue = {
  code: string;
  message: string;
  vertexId?: string;
  triangleIndex?: number;
};

export type MeshMetrics = {
  vertexCount: number;
  triangleCount: number;
  maximumInfluences: number;
  maximumWeightSumError: number;
  degenerateCount: number;
  flippedCount: number;
  worstAreaRatio: number;
};

export type MeshJoint = { id: string; x: number; y: number };
export type MeshBone = {
  id: string;
  parentJointId: string;
  childJointId: string;
};
export type MeshBoneTransform = {
  boneId: string;
  rotation: number;
  x: number;
  y: number;
  scale: number;
};

export type BoneMatrixSet = {
  bindWorld: Affine2D;
  currentWorld: Affine2D;
  skin: Affine2D;
  start: Point2;
  end: Point2;
  angle: number;
  scale: number;
};

export const MESH_AREA_EPSILON = 1e-8;
export const MESH_WEIGHT_TOLERANCE = 0.0001;

export const identityAffine = (): Affine2D => ({
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: 0,
  f: 0,
});

export const translationAffine = (x: number, y: number): Affine2D => ({
  ...identityAffine(),
  e: x,
  f: y,
});

export const rotationAffine = (radians: number): Affine2D => ({
  a: Math.cos(radians),
  b: Math.sin(radians),
  c: -Math.sin(radians),
  d: Math.cos(radians),
  e: 0,
  f: 0,
});

export const scaleAffine = (scale: number): Affine2D => ({
  a: scale,
  b: 0,
  c: 0,
  d: scale,
  e: 0,
  f: 0,
});

/** Returns left * right using the Canvas 2D affine convention. */
export function multiplyAffine(left: Affine2D, right: Affine2D): Affine2D {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  };
}

export function invertAffine(matrix: Affine2D): Affine2D | null {
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
  if (!Number.isFinite(determinant) || Math.abs(determinant) <= 1e-12)
    return null;
  return {
    a: matrix.d / determinant,
    b: -matrix.b / determinant,
    c: -matrix.c / determinant,
    d: matrix.a / determinant,
    e: (matrix.c * matrix.f - matrix.d * matrix.e) / determinant,
    f: (matrix.b * matrix.e - matrix.a * matrix.f) / determinant,
  };
}

export function transformPoint(matrix: Affine2D, point: Point2): Point2 {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  };
}

export function normalizedImagePoint(
  point: Pick<MeshJoint, 'x' | 'y'>,
  imageWidth: number,
  imageHeight: number,
): Point2 {
  return {
    x: (point.x / 100 - 0.5) * imageWidth,
    y: (point.y / 100 - 1) * imageHeight,
  };
}

export function normalizedMeshPoint(
  point: Pick<MeshVertexV1, 'x' | 'y'>,
  imageWidth: number,
  imageHeight: number,
): Point2 {
  return {
    x: (point.x - 0.5) * imageWidth,
    y: (point.y - 1) * imageHeight,
  };
}

export function buildBoneMatrices(
  joints: MeshJoint[],
  bones: MeshBone[],
  transforms: MeshBoneTransform[],
  imageWidth: number,
  imageHeight: number,
): { matrices: Map<string, BoneMatrixSet>; issues: MeshIssue[] } {
  const issues: MeshIssue[] = [];
  const jointById = new Map(joints.map((joint) => [joint.id, joint]));
  const transformById = new Map(
    transforms.map((transform) => [transform.boneId, transform]),
  );
  const boneByChildJoint = new Map(
    bones.map((bone) => [bone.childJointId, bone]),
  );
  const matrices = new Map<string, BoneMatrixSet>();
  const visiting = new Set<string>();

  const visit = (bone: MeshBone): BoneMatrixSet | null => {
    const cached = matrices.get(bone.id);
    if (cached) return cached;
    if (visiting.has(bone.id)) {
      issues.push({
        code: 'BONE_CYCLE',
        message: `Bone ${bone.id} participates in a cycle.`,
      });
      return null;
    }
    const parentJoint = jointById.get(bone.parentJointId);
    const childJoint = jointById.get(bone.childJointId);
    if (!parentJoint || !childJoint) {
      issues.push({
        code: 'MISSING_BONE_JOINT',
        message: `Bone ${bone.id} references a missing joint.`,
      });
      return null;
    }
    visiting.add(bone.id);
    const bindStart = normalizedImagePoint(
      parentJoint,
      imageWidth,
      imageHeight,
    );
    const bindEnd = normalizedImagePoint(childJoint, imageWidth, imageHeight);
    const bindAngle = Math.atan2(
      bindEnd.y - bindStart.y,
      bindEnd.x - bindStart.x,
    );
    const bindLength = Math.hypot(
      bindEnd.x - bindStart.x,
      bindEnd.y - bindStart.y,
    );
    const parentBone = boneByChildJoint.get(bone.parentJointId);
    const parentPose = parentBone ? visit(parentBone) : null;
    const transform = transformById.get(bone.id);
    const rotation = ((transform?.rotation ?? 0) * Math.PI) / 180;
    const localScale = transform?.scale ?? 1;
    const inheritedAngleDelta = parentPose
      ? parentPose.angle -
        Math.atan2(
          normalizedImagePoint(
            jointById.get(parentBone!.childJointId)!,
            imageWidth,
            imageHeight,
          ).y -
            normalizedImagePoint(
              jointById.get(parentBone!.parentJointId)!,
              imageWidth,
              imageHeight,
            ).y,
          normalizedImagePoint(
            jointById.get(parentBone!.childJointId)!,
            imageWidth,
            imageHeight,
          ).x -
            normalizedImagePoint(
              jointById.get(parentBone!.parentJointId)!,
              imageWidth,
              imageHeight,
            ).x,
        )
      : 0;
    const start = {
      x: (parentPose?.end.x ?? bindStart.x) + (transform?.x ?? 0),
      y: (parentPose?.end.y ?? bindStart.y) + (transform?.y ?? 0),
    };
    const angle = bindAngle + inheritedAngleDelta + rotation;
    const accumulatedScale = (parentPose?.scale ?? 1) * localScale;
    const bindWorld = multiplyAffine(
      translationAffine(bindStart.x, bindStart.y),
      rotationAffine(bindAngle),
    );
    const currentWorld = multiplyAffine(
      multiplyAffine(
        translationAffine(start.x, start.y),
        rotationAffine(angle),
      ),
      scaleAffine(accumulatedScale),
    );
    const inverseBind = invertAffine(bindWorld);
    if (!inverseBind) {
      issues.push({
        code: 'INVALID_BIND_MATRIX',
        message: `Bone ${bone.id} has a non-invertible bind matrix.`,
      });
      visiting.delete(bone.id);
      return null;
    }
    const pose: BoneMatrixSet = {
      bindWorld,
      currentWorld,
      skin: multiplyAffine(currentWorld, inverseBind),
      start,
      end: transformPoint(currentWorld, { x: bindLength, y: 0 }),
      angle,
      scale: accumulatedScale,
    };
    matrices.set(bone.id, pose);
    visiting.delete(bone.id);
    return pose;
  };

  bones.forEach(visit);
  return { matrices, issues };
}

export function triangleSignedArea(
  first: Point2,
  second: Point2,
  third: Point2,
) {
  return (
    ((second.x - first.x) * (third.y - first.y) -
      (second.y - first.y) * (third.x - first.x)) /
    2
  );
}

export function validateMeshBinding(
  mesh: MeshBindingV1 | undefined,
  context: {
    assetId: string;
    skeletonVersion: number;
    boneIds: Iterable<string>;
  },
): MeshIssue[] {
  if (!mesh)
    return [{ code: 'MESH_REQUIRED', message: 'Mesh binding is missing.' }];
  const issues: MeshIssue[] = [];
  const boneIds = new Set(context.boneIds);
  if (mesh.version !== 1)
    issues.push({ code: 'MESH_VERSION', message: 'Mesh version must be 1.' });
  if (!mesh.id?.trim())
    issues.push({ code: 'MESH_ID', message: 'Mesh ID is required.' });
  if (mesh.textureAssetId !== context.assetId)
    issues.push({
      code: 'MESH_TEXTURE_MISMATCH',
      message: 'Mesh texture must match the bound character asset.',
    });
  if (mesh.coordinateSpace !== 'normalized-image')
    issues.push({
      code: 'MESH_COORDINATE_SPACE',
      message: 'Mesh coordinates must use normalized-image space.',
    });
  if (mesh.skeletonVersion !== context.skeletonVersion)
    issues.push({
      code: 'MESH_SKELETON_VERSION',
      message: 'Mesh binding targets a different skeleton version.',
    });
  if (!Number.isFinite(mesh.zIndex))
    issues.push({
      code: 'MESH_Z_INDEX',
      message: 'Mesh zIndex must be finite.',
    });
  if (!Array.isArray(mesh.vertices) || mesh.vertices.length < 3)
    issues.push({
      code: 'MESH_VERTICES',
      message: 'Mesh needs at least three vertices.',
    });
  if (!Array.isArray(mesh.triangles) || mesh.triangles.length < 1)
    issues.push({
      code: 'MESH_TRIANGLES',
      message: 'Mesh needs at least one triangle.',
    });
  const vertexIds = new Set<string>();
  mesh.vertices?.forEach((vertex) => {
    if (!vertex.id?.trim() || vertexIds.has(vertex.id))
      issues.push({
        code: 'MESH_VERTEX_ID',
        message: 'Mesh vertex IDs must be present and unique.',
        vertexId: vertex.id,
      });
    vertexIds.add(vertex.id);
    if (
      ![vertex.x, vertex.y, vertex.u, vertex.v].every(Number.isFinite) ||
      vertex.x < 0 ||
      vertex.x > 1 ||
      vertex.y < 0 ||
      vertex.y > 1 ||
      vertex.u < 0 ||
      vertex.u > 1 ||
      vertex.v < 0 ||
      vertex.v > 1
    )
      issues.push({
        code: 'MESH_VERTEX_COORDINATES',
        message: `Vertex ${vertex.id} has invalid normalized coordinates.`,
        vertexId: vertex.id,
      });
    if (!Array.isArray(vertex.influences) || vertex.influences.length === 0)
      issues.push({
        code: 'MESH_INFLUENCES',
        message: `Vertex ${vertex.id} needs at least one influence.`,
        vertexId: vertex.id,
      });
    if (vertex.influences.length > 4)
      issues.push({
        code: 'MESH_INFLUENCE_CAP',
        message: `Vertex ${vertex.id} exceeds four bone influences.`,
        vertexId: vertex.id,
      });
    let total = 0;
    vertex.influences.forEach((influence) => {
      total += influence.weight;
      if (!boneIds.has(influence.boneId))
        issues.push({
          code: 'MESH_MISSING_BONE',
          message: `Vertex ${vertex.id} references missing bone ${influence.boneId}.`,
          vertexId: vertex.id,
        });
      if (!Number.isFinite(influence.weight) || influence.weight <= 0)
        issues.push({
          code: 'MESH_WEIGHT',
          message: `Vertex ${vertex.id} has a non-positive or non-finite weight.`,
          vertexId: vertex.id,
        });
    });
    if (!Number.isFinite(total) || Math.abs(total - 1) > MESH_WEIGHT_TOLERANCE)
      issues.push({
        code: 'MESH_WEIGHT_SUM',
        message: `Vertex ${vertex.id} weights must sum to 1.`,
        vertexId: vertex.id,
      });
  });
  mesh.triangles?.forEach((triangle, triangleIndex) => {
    if (
      !Array.isArray(triangle) ||
      triangle.length !== 3 ||
      triangle.some(
        (index) =>
          !Number.isInteger(index) ||
          index < 0 ||
          index >= mesh.vertices.length,
      ) ||
      new Set(triangle).size !== 3
    ) {
      issues.push({
        code: 'MESH_TRIANGLE_INDEX',
        message: `Triangle ${triangleIndex} has invalid indices.`,
        triangleIndex,
      });
      return;
    }
    const points = triangle.map((index) => mesh.vertices[index]);
    if (
      Math.abs(triangleSignedArea(points[0], points[1], points[2])) <=
      MESH_AREA_EPSILON
    )
      issues.push({
        code: 'MESH_REST_DEGENERATE',
        message: `Triangle ${triangleIndex} is degenerate in the rest pose.`,
        triangleIndex,
      });
    const uvPoints = points.map((point) => ({ x: point.u, y: point.v }));
    if (
      Math.abs(triangleSignedArea(uvPoints[0], uvPoints[1], uvPoints[2])) <=
      MESH_AREA_EPSILON
    )
      issues.push({
        code: 'MESH_UV_DEGENERATE',
        message: `Triangle ${triangleIndex} has a degenerate UV mapping.`,
        triangleIndex,
      });
  });
  return issues;
}

export function evaluateMeshVertices(
  mesh: MeshBindingV1,
  matrices: Map<string, BoneMatrixSet>,
  imageWidth: number,
  imageHeight: number,
): { points: Point2[]; issues: MeshIssue[] } {
  const issues: MeshIssue[] = [];
  const points = mesh.vertices.map((vertex) => {
    const rest = normalizedMeshPoint(vertex, imageWidth, imageHeight);
    let x = 0;
    let y = 0;
    vertex.influences.forEach((influence) => {
      const bone = matrices.get(influence.boneId);
      if (!bone) {
        issues.push({
          code: 'MESH_MISSING_BONE_MATRIX',
          message: `No evaluated matrix exists for bone ${influence.boneId}.`,
          vertexId: vertex.id,
        });
        return;
      }
      const transformed = transformPoint(bone.skin, rest);
      x += transformed.x * influence.weight;
      y += transformed.y * influence.weight;
    });
    return { x, y };
  });
  return { points, issues };
}

export function measureMesh(
  mesh: MeshBindingV1,
  evaluated: Point2[],
  imageWidth: number,
  imageHeight: number,
): MeshMetrics {
  let maximumInfluences = 0;
  let maximumWeightSumError = 0;
  mesh.vertices.forEach((vertex) => {
    maximumInfluences = Math.max(maximumInfluences, vertex.influences.length);
    maximumWeightSumError = Math.max(
      maximumWeightSumError,
      Math.abs(
        vertex.influences.reduce(
          (total, influence) => total + influence.weight,
          0,
        ) - 1,
      ),
    );
  });
  let degenerateCount = 0;
  let flippedCount = 0;
  let worstAreaRatio = Number.POSITIVE_INFINITY;
  mesh.triangles.forEach((triangle) => {
    const rest = triangle.map((index) =>
      normalizedMeshPoint(mesh.vertices[index], imageWidth, imageHeight),
    );
    const current = triangle.map((index) => evaluated[index]);
    const restArea = triangleSignedArea(rest[0], rest[1], rest[2]);
    const currentArea = triangleSignedArea(current[0], current[1], current[2]);
    if (Math.abs(currentArea) <= MESH_AREA_EPSILON) degenerateCount += 1;
    if (restArea * currentArea < 0) flippedCount += 1;
    if (Math.abs(restArea) > MESH_AREA_EPSILON)
      worstAreaRatio = Math.min(
        worstAreaRatio,
        Math.abs(currentArea / restArea),
      );
  });
  return {
    vertexCount: mesh.vertices.length,
    triangleCount: mesh.triangles.length,
    maximumInfluences,
    maximumWeightSumError,
    degenerateCount,
    flippedCount,
    worstAreaRatio: Number.isFinite(worstAreaRatio) ? worstAreaRatio : 0,
  };
}

export function affineFromTriangles(
  source: [Point2, Point2, Point2],
  destination: [Point2, Point2, Point2],
): Affine2D | null {
  const [s0, s1, s2] = source;
  const [d0, d1, d2] = destination;
  const determinant =
    s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
  if (!Number.isFinite(determinant) || Math.abs(determinant) <= 1e-8)
    return null;
  const solve = (v0: number, v1: number, v2: number) => ({
    x:
      (v0 * (s1.y - s2.y) + v1 * (s2.y - s0.y) + v2 * (s0.y - s1.y)) /
      determinant,
    y:
      (v0 * (s2.x - s1.x) + v1 * (s0.x - s2.x) + v2 * (s1.x - s0.x)) /
      determinant,
    offset:
      (v0 * (s1.x * s2.y - s2.x * s1.y) +
        v1 * (s2.x * s0.y - s0.x * s2.y) +
        v2 * (s0.x * s1.y - s1.x * s0.y)) /
      determinant,
  });
  const x = solve(d0.x, d1.x, d2.x);
  const y = solve(d0.y, d1.y, d2.y);
  return { a: x.x, b: y.x, c: x.y, d: y.y, e: x.offset, f: y.offset };
}

export function expandTriangle(
  triangle: [Point2, Point2, Point2],
  pixels = 0.35,
): [Point2, Point2, Point2] {
  const center = {
    x: (triangle[0].x + triangle[1].x + triangle[2].x) / 3,
    y: (triangle[0].y + triangle[1].y + triangle[2].y) / 3,
  };
  return triangle.map((point) => {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    return {
      x: point.x + (dx / distance) * pixels,
      y: point.y + (dy / distance) * pixels,
    };
  }) as [Point2, Point2, Point2];
}

export function adaptLegacyMesh(input: {
  assetId: string;
  skeletonVersion: number;
  vertices?: Array<{ id: string; x: number; y: number }>;
  weights?: Array<{ vertexId: string; boneId: string; weight: number }>;
  experimentalMesh?: {
    status?: string;
    triangles?: Array<[number, number, number]>;
    uvs?: Array<{ vertexId: string; u: number; v: number }>;
    weights?: Array<{ vertexId: string; boneId: string; weight: number }>;
  };
}): MeshBindingV1 | undefined {
  const triangles = input.experimentalMesh?.triangles;
  const uvs = input.experimentalMesh?.uvs;
  const weights = input.weights?.length
    ? input.weights
    : input.experimentalMesh?.weights;
  if (
    !input.vertices?.length ||
    !triangles?.length ||
    !uvs?.length ||
    !weights?.length
  )
    return undefined;
  const uvById = new Map(uvs.map((uv) => [uv.vertexId, uv]));
  const weightsById = new Map<string, MeshInfluenceV1[]>();
  weights.forEach((weight) => {
    const list = weightsById.get(weight.vertexId) ?? [];
    list.push({ boneId: weight.boneId, weight: weight.weight });
    weightsById.set(weight.vertexId, list);
  });
  const vertices: MeshVertexV1[] = [];
  for (const vertex of input.vertices) {
    const uv = uvById.get(vertex.id);
    const influences = weightsById.get(vertex.id);
    const total =
      influences?.reduce((sum, influence) => sum + influence.weight, 0) ?? 0;
    if (!uv || !influences?.length || !Number.isFinite(total) || total <= 0)
      return undefined;
    vertices.push({
      ...vertex,
      u: uv.u,
      v: uv.v,
      influences: influences.map((influence) => ({
        ...influence,
        weight: influence.weight / total,
      })),
    });
  }
  return {
    version: 1,
    id: `legacy-mesh-${input.assetId}`,
    textureAssetId: input.assetId,
    coordinateSpace: 'normalized-image',
    vertices,
    triangles,
    zIndex: 0,
    skeletonVersion: input.skeletonVersion,
  };
}
