# Recovery playbook

- Revision conflict: inspect the project again, reconcile changes, and issue a new mutation with the new revision and a new idempotency key.
- Uncertain mutation result: retry only the identical request with the same idempotency key.
- Failed or rejected candidate: preserve it, record structured findings, and create a bounded revision or new candidate instead of overwriting the source.
- Failed rendered QA: identify the affected pose and defect, correct pivots, anchors, bounds, overlap, parent assignment, draw order, or joint placement, then rerun the full stress set.
- Low-confidence critical joint: require human correction and keep the skeleton unapproved.
- Variant drift: compare stable part-ID and bone-ID topology; reject incompatible motion transfer or create a mapped variant.
- Experimental mesh failure: return to the segmented production fallback.
- Missing audio payload or unclear license: block attachment or export for that audio path until evidence is complete.
