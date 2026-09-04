# Agent guide

Run the Stagehand asset-to-rig loop as visible editor state: inspect the blank project, obtain the checklist, create a durable motion/topology request, attach the assembled reference and matching atlas, inspect decoded reconstruction metrics, approve the asset, propose and live-edit the skeleton, apply binding, run rendered stress-pose QA, approve, animate approved bones, then validate and export from one evaluated revision. Use Agent Live receipts to verify route, revision, affected entities, and failures.

Every prior-read mutation carries `expectedRevision` and a unique `idempotencyKey`. Keep generated or uploaded source media, failed candidates, prompts, provenance, checksums, and review findings. Never return media bytes in a tool response.

Choose a rig class from the motion profile before preparing art. Prefer segmented binding for production. Treat weighted mesh as an experimental Phase 4 proof until canonical mesh validation, actual `canvas-lbs-mesh-v1` deformation, stress-pose metrics, and renderer parity pass. Asset and skeleton approval are separate gates; low-confidence critical joints or failed rendered QA block skeleton approval.

Use the focused references beside this file for prompt construction, package structure, the exact public tool contract, rigging QA, provenance, recovery, and golden fixtures.
