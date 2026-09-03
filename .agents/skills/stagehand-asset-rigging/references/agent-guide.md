# Agent guide

Run the Stagehand asset-to-rig loop as a sequence of inspectable state changes: inspect the project, obtain the media checklist, create a durable request, attach and inspect the candidate, approve the asset, propose and correct the skeleton, run rendered stress-pose QA, approve the skeleton, animate approved bones, then validate and export from one evaluated revision.

Every prior-read mutation carries `expectedRevision` and a unique `idempotencyKey`. Keep generated or uploaded source media, failed candidates, prompts, provenance, checksums, and review findings. Never return media bytes in a tool response.

Prefer segmented binding for production. Treat mesh binding as experimental. Asset and skeleton approval are separate gates; low-confidence critical joints or failed rendered QA block skeleton approval.

Use the focused references beside this file for prompt construction, package structure, the exact public tool contract, rigging QA, provenance, recovery, and golden fixtures.
