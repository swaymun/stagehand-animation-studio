# StagehandAssetPackageV3

The package is the durable contract between media creation, rigging, animation, and export.

Required structure:

- `version: 3`; V2 is rejected with `UNSUPPORTED_PACKAGE_VERSION`.
- Immutable source identity and provenance, decoded width and height, sRGB color space, straight-alpha mode, and canvas anchor.
- Both deliverables: `assembled-reference` and `rig-atlas`, derived from the same neutral design.
- A `MotionProfileV1`, topology profile, per-part deformation mode, and explicit attachment contracts.
- `humanoid-jointed-v1` has exactly 15 canonical parts: pelvis, torso, head, and mirrored upper arm, forearm, hand, thigh, shin, and foot. Non-humanoids provide a complete custom topology.
- Stable semantic part IDs with decoded alpha mask, pixel bounds, pivot, parent anchor, draw order, and confidence.
- Named views and expressions that reference compatible assets or part sets.
- Skeleton joints and bones with confidence on every critical joint.
- Alignment and validation findings that explain why the package is ready or blocked.

Decoded-pixel diagnostics require overlap depth at least 20% of child length, silhouette IoU at least 0.90, anchor residual at most 2% of character height, joint coverage at least 0.90 at rest and 0.82 under stress, and zero added components, clipped pixels, inverted hierarchy, or transparent joint corridors. Overlap above 35% is a warning. Reject and preserve failures; do not invent or paint pixels.

Mesh data is optional and experimental. Mark it explicitly and retain a segmented package fallback. The canonical runtime binding is:

```ts
type MeshBindingV1 = {
  version: 1;
  id: string;
  textureAssetId: string;
  coordinateSpace: 'normalized-image';
  vertices: Array<{
    id: string;
    x: number;
    y: number;
    u: number;
    v: number;
    influences: Array<{ boneId: string; weight: number }>;
  }>;
  triangles: Array<[number, number, number]>;
  zIndex: number;
  skeletonVersion: number;
};
```

New writes use `SkeletonBinding.mesh`. Legacy `binding.vertices`, `binding.weights`, and package `experimentalMesh` may be adapted only when vertices, UVs, triangles, and weights are complete. Normalize positive legacy weights during adaptation, preserve the legacy fields, and never invent missing triangulation. Explicit new mesh input must already have weight sums within `1 ± 0.0001`.
