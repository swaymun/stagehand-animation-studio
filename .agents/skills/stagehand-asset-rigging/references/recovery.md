# Recovery playbook

- Revision conflict: inspect the project again, reconcile changes, and issue a new mutation with the new revision and a new idempotency key.
- Uncertain mutation result: retry only the identical request with the same idempotency key.
- Failed or rejected candidate: preserve it, record structured findings, and create a bounded revision or new candidate instead of overwriting the source.
- Clean-cut or under-covered joint: reject and regenerate from the assembled-first prompt. Phase 4.1 never synthesizes, extends, or paints missing joint pixels.
- Skeleton edit: inspect the Agent Live receipt, then rerun binding and rendered QA. Rest-pose or topology edits make an active mesh stale until rebound.
- Failed rendered QA: identify the affected pose and defect, correct pivots, anchors, bounds, overlap, parent assignment, draw order, or joint placement, then rerun the full stress set.
- Low-confidence critical joint: require human correction and keep the skeleton unapproved.
- Variant drift: compare stable part-ID and bone-ID topology; reject incompatible motion transfer or create a mapped variant.
- Experimental mesh failure: preserve the mesh revision and structured metrics, correct the named UV, weight, topology, version, or pose defect, and rerun the full mesh stress set. If it still fails, explicitly select the segmented production fallback; never draw the undeformed rectangle while reporting mesh success.
- Missing audio payload or unclear license: block attachment or export for that audio path until evidence is complete.
