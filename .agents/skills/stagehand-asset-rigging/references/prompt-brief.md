# Character art brief

Request a clean, orthographic 2D character on a fully transparent sRGBA canvas. Keep one canonical body design, consistent proportions, and stable costume details across every view, expression, and pose.

Choose the rig class from `motion-profile.md` before writing the prompt.

For production-ready jointed cutout art, request two related deliverables: an assembled neutral reference and an exploded atlas derived from that exact design.

- Conceptually assemble the character first, then separate the parts without changing their geometry, scale, or orientation.
- Use the 15-part humanoid topology: pelvis, torso, head, and mirrored upper arm, forearm, hand, thigh, shin, and foot.
- Extend each child part 20–30% underneath its neighbor with rounded hidden geometry at shoulders, elbows, hips, knees, neck, wrists, and ankles.
- Do not draw clean cut endpoints, sockets, detached stumps, clipped pixels, or transparent corridors through a joint.
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
