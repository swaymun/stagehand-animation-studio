# StagehandAssetPackageV2

The package is the durable contract between media creation, rigging, animation, and export.

Required structure:

- `version: 2`, immutable source asset identity and provenance, decoded width and height, sRGB color space, straight-alpha mode, and canvas anchor.
- Stable semantic part IDs with mask or alpha-island reference, pixel bounds, pivot, parent anchor, attachment margins, draw order, and confidence.
- Named views and expressions that reference compatible assets or part sets.
- Skeleton joints and bones with confidence on every critical joint.
- Alignment and validation findings that explain why the package is ready or blocked.

Inference must be bounded by decoded image dimensions and significant alpha components. It may suggest geometry, but it must not invent filenames, asset IDs, source URLs, authors, licenses, or approvals. Preserve legacy package geometry during migration.

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
