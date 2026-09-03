# StagehandAssetPackageV2

The package is the durable contract between media creation, rigging, animation, and export.

Required structure:

- `version: 2`, immutable source asset identity and provenance, decoded width and height, sRGB color space, straight-alpha mode, and canvas anchor.
- Stable semantic part IDs with mask or alpha-island reference, pixel bounds, pivot, parent anchor, attachment margins, draw order, and confidence.
- Named views and expressions that reference compatible assets or part sets.
- Skeleton joints and bones with confidence on every critical joint.
- Alignment and validation findings that explain why the package is ready or blocked.

Inference must be bounded by decoded image dimensions and significant alpha components. It may suggest geometry, but it must not invent filenames, asset IDs, source URLs, authors, licenses, or approvals. Preserve legacy package geometry during migration.

Mesh data is optional and experimental. Mark it explicitly and retain a segmented package fallback.
