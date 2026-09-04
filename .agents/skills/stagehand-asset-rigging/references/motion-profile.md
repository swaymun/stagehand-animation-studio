# Motion profile and rig-class gate

Record the following before requesting or revising character art:

- intended actions and the maximum approved range of motion;
- articulation points that must bend or remain rigid;
- required views, expressions, hand shapes, and drawing swaps;
- deformation strategy per part;
- acceptance poses and the rendered defects that block approval; and
- the explicit fallback if the preferred rig cannot pass.

Choose the smallest honest rig class:

| Rig class      | Use when                                                          | Source-art requirement                                  | Runtime claim                                   |
| -------------- | ----------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------- |
| Rigid cutout   | A part only translates, rotates, or scales                        | One isolated sprite per rigid part                      | No bending                                      |
| Jointed cutout | Elbows, knees, wrists, or ankles articulate as pieces             | Split parts with hidden overlap at each joint           | Rigid pieces with real joints                   |
| Weighted mesh  | Pixels must bend continuously across bones                        | UV-mapped triangles with authored bind pose and weights | Experimental until rendered metrics pass        |
| Warp or curve  | Organic regions need cage or curve deformation                    | Continuous art with useful control topology             | Unsupported by the current runtime              |
| Drawing swap   | A view, mouth, hand, or expression needs authored replacement art | Compatible named drawings and anchors                   | Supported only where an explicit variant exists |
| Hybrid         | Different parts need different modes                              | A declared per-part combination of the above            | Claim only the modes the renderer evaluates     |

Do not choose mesh merely because a schema can store vertices. Stagehand may call a result a Phase 4 mesh proof only when `canvas-lbs-mesh-v1` deforms textured triangles and preview, inspection, PNG, and WebM report the same evaluator with no silent fallback.
