# Current release evidence

Keep current screenshots only in `docs/evidence/`.

## Identity

- Commit: `782f898` (`Ship frame-by-frame Stagehand release`)
- Deployed URL: https://stagehand-animation-studio.saimun-h-shahee.chatgpt.site
- Date/time (America/New_York): 2026-09-04 03:17 EDT
- Reviewer: Codex release verification

## Automated gates

- [x] format [x] lint [x] typecheck [x] build
- [x] test:frames [x] test:tool-ui [x] smoke [x] smoke:native
- [x] hosted smoke with `STAGEHAND_URL`

## WebMCP

- [x] Exactly 27 tools, intentional order, unique schema IDs.
- [x] Every mutation exposes `expectedRevision` and `idempotencyKey`.
- [x] Stale revision returns `REVISION_CONFLICT` without changing state.
- [x] Repeated idempotency key replays the first result.
- [x] Reads omit binary asset payloads.

## Product

- [x] Three demos load with multiple scenes.
- [x] Duplicate drawing switches only at its authored frame and holds between cels.
- [x] Lip-sync regeneration returns estimated mouth cues.
- [x] Procedural SFX is audible in preview and represented in render.
- [x] Validation has no error-severity issues.
- [x] `inspect_frame` and PNG use the same evaluated frame.
- [x] WebM returns a non-zero artifact with expected duration/fps.
- [x] Desktop and 390px mobile layouts are usable.

## Boundaries

Record missing gates explicitly. Rigging, mesh, IK, phoneme extraction, cloud voice, and MP4/GIF are out of scope.

## Submission

- Devpost: https://devpost.com/software/stagehand-i5xuht
- Demo: https://www.youtube.com/watch?v=bOg6uA2fGfY
- Submitted: 2026-09-04 03:31 EDT
