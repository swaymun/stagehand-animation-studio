# Character art brief

Request a clean, orthographic 2D character on a fully transparent sRGBA canvas. Keep one canonical body design, consistent proportions, and stable costume details across every view, expression, and pose.

Choose the rig class from `motion-profile.md` before writing the prompt.

For production-ready segmented art:

- Separate head, torso, upper and lower arms, hands, upper and lower legs, and feet into non-touching cells or clearly separable alpha regions.
- Include hidden attachment margins under shoulders, elbows, hips, knees, neck, wrists, and ankles so rotation does not expose holes.
- Keep neutral front and side views when turns matter. Name requested expressions and action poses explicitly.
- Avoid baked shadows, opaque backgrounds, anti-aliased matte halos, cropped extremities, or accessories fused across articulation boundaries.
- Keep the same canvas anchor and scale across related variants.

For an experimental weighted-mesh proof:

- Request one single-frame texture on a transparent canvas.
- Describe the exact bend and bind pose; author triangulation, UVs, and weights separately rather than claiming the image generator produced them.
- Keep topology coarse and add rows only around intended deformation zones.
- Require rest, 60-degree bend, and allowed-extreme rendered checks.
- Preserve a separately approved segmented fallback.

Use bounded retries. After each candidate, inspect decoded pixels and package readiness before revising the prompt. Do not silently replace the source or discard failed candidates.
