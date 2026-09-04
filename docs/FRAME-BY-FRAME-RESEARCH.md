# Stagehand Frame-by-Frame Research

**Production brief - 4 September 2026**

Stagehand should treat a drawing, its exposure, and the rendered output frame as different things. A drawing is authored once. An exposure places that drawing on one or more integer frames. The renderer evaluates the visible exposure on every layer, composites the result, schedules audio cues against the same clock, and exports the evaluated frames. This small distinction is the foundation for dependable held-cel animation and agent editing.

## Direction in one page

- Default to 12 fps for the short-form demo workflow, while retaining 24 fps as an export option.
- Store timeline positions as integer frames. Convert to seconds only at the audio and playback boundary.
- Let one drawing remain exposed until the next drawing or for an explicit `durationFrames` value.
- Show previous and next _unique drawings_ in onion skin, not repeated copies of a held frame.
- Build the storyboard as shots containing action panels; time panels before generating finished art.
- Generate one approved master sheet per visual system, then derive bounded sheets or edits from that reference.
- Keep lip-sync as named drawing substitutions. Detection produces cues; it does not create mouth art.
- Represent sound effects as programmable cues with source, start frame, duration, gain, loop, and provenance.
- Run local voice cloning only with the speaker's explicit consent and retain the reference provenance.
- Validate the same evaluated frame path used by canvas preview, PNG inspection, and WebM export.

The strongest implementation is intentionally small: scene rail, stage, exposure strip, drawing library, previous/next controls, hold resize, onion skin, one dialogue/SFX lane, inspect, validate, and render. Rigging, curves, automatic in-betweening, and a multitrack audio workstation can remain separate advanced paths.

## 1. Frame-by-frame workflow

Adobe defines frame-by-frame animation as changing the Stage contents in each frame and storing each complete frame; it is suited to complex changes that cannot be represented as simple movement. [Adobe Animate: Frame-by-frame animation](https://helpx.adobe.com/animate/desktop/animation/frame-by-frame-animation.html). In practice, "each frame" does not require a new drawing on every output frame. Timing comes from the relationship between unique drawings and held exposures.

Krita's Animation Timeline makes the useful data distinctions explicit: blank frames, duplicate frames, clone frames, keyframes, and holds are different states. A drawing is automatically held until the next keyframe, and timeline units are frames rather than seconds. [Krita: Animation Timeline Docker](https://docs.krita.org/en/reference_manual/dockers/animation_timeline.html).

### Recommended Stagehand loop

1. **Write the beat.** State the action, emotional turn, and final readable pose.
2. **Board the shot.** Add only enough panels to express changes in action, staging, or camera.
3. **Time the panels.** Establish the pause before a joke, the anticipation before an impact, and the final reaction hold.
4. **Create keys and breakdowns.** Make the storytelling poses work before adding transitional drawings.
5. **Expose drawings.** Start with long holds, then add drawings only where the motion reads as too abrupt.
6. **Add mouth and effects drawings.** Keep them on independent, anchored layers.
7. **Add voice and SFX cues.** Quantize visual changes to frames; retain audio timing at sample precision.
8. **Inspect boundaries.** Review the frame before, at, and after every drawing or sound transition.
9. **Render and revise.** A request such as "hold the reaction eight frames longer" should update exposure metadata and ripple later events predictably.

### Minimal data contract

```text
Drawing:  id, assetId, cell, anchor, sourceRevision
Exposure: id, layerId, drawingId, startFrame, durationFrames
AudioCue: id, assetId, startFrame, durationFrames, gain, loop, provenance
MouthCue: characterId, shape, startFrame, endFrame
```

The renderer resolves the active exposure for each layer at frame `n`, composites in draw order, applies camera state if present, and schedules audio at `n / fps`. An uncovered frame must be intentional transparency or a validation error.

## 2. Holds, onion skin, and storyboards

### Held exposures

Toon Boom notes that production drawings are commonly exposed for two frames in Western animation and three frames in Japanese animation, with faster or more detailed action as an exception. [Toon Boom Harmony: Setting the Exposure Hold](https://docs.toonboom.com/help/harmony-24/premium/timing/hold-exposure.html). The product lesson is not to enforce twos or threes; it is to make exposure length a first-class, editable value.

Stagehand should therefore:

- display one thumbnail followed by a visually distinct hold span;
- resize the hold without copying image bytes;
- offer 1, 2, 3, 4, 6, 8, and 12-frame presets;
- ripple later exposures when requested;
- preserve exact frame boundaries through undo, save/load, inspection, and export; and
- render identical pixels throughout a hold unless another layer or camera changes.

### Onion skin

Krita describes onion skin as tinted previous and next frames with configurable visibility, opacity, and colors. [Krita: Onion Skin Docker](https://docs.krita.org/en/reference_manual/dockers/onion_skin.html). For held-cel animation, "previous" and "next" should normally mean adjacent unique drawings. Otherwise a 12-frame hold would show the same image as both neighbors and provide no motion information.

Recommended defaults:

- previous drawing in muted red at 22 percent opacity;
- next drawing in teal-green at 18 percent opacity;
- range of one drawing before and after;
- optional fade as distance increases;
- no onion skin in playback, `inspect_frame`, PNG, or WebM; and
- a loop option that can show the first drawing while editing the final drawing.

Nanimate is a useful browser-native reference for keeping the interaction light: each layer owns frames and FPS, playback continues while editing, and onion-skin settings remain close to the drawing loop. It is an interface reference, not a production standard. [Nanimate GitHub](https://github.com/tmanderson/nanimate).

### Storyboard to shot

Storyboard Pro defines a panel as an action and recommends a new scene when layout, camera angle, or setting changes. [Storyboard Pro: Add Scenes and Panels](https://docs.toonboom.com/help/storyboard-pro-24/storyboard/getting-started/panel.html). It also supports changing panel duration by exact frames and rippling later panels. [Storyboard Pro: Changing Panel Duration](https://docs.toonboom.com/help/storyboard-pro-24/storyboard/timing/change-panel-duration.html).

For Stagehand, a scene should behave as a shot, and storyboard panels should become an initial exposure plan:

```text
Script beat -> shot -> action panels -> timed animatic -> keys -> breakdowns
            -> exposures -> mouth/SFX cues -> inspected frames -> WebM
```

Do not generate finished art before the panel order and reaction holds work as an animatic. A polished wrong shot is more expensive than a rough correct one.

### Supplemental transcript evidence

The inherited research archive contains a human-captioned Toon Boom rigs-plus-roughs tutorial, YouTube ID `IkDUhWsT7n8`. Around **7:56**, the animator says most effort goes into keys and breakdowns because clear large masses make the scene readable and the remaining process easier. Around **17:05**, the workflow renders and steps through every frame because errors can be hidden in the working OpenGL view. [YouTube: Toon Boom rigs plus roughs](https://www.youtube.com/watch?v=IkDUhWsT7n8&t=476s). This supports two Stagehand gates: approve timing before polish, and review rendered frames rather than editor metadata alone.

## 3. Prompting consistent sheets

OpenAI recommends grounding an image request in purpose, subject, action, setting, and style, using a small reference set, and making incremental revisions. [OpenAI Academy: Creating images with ChatGPT](https://openai.com/academy/image-generation/). Google's current image guidance similarly recommends narrative scene descriptions, explicit camera language, previously generated images for character consistency, and pose references for difficult poses. [Gemini API: Image generation](https://ai.google.dev/gemini-api/docs/image-generation).

### Rules that matter

1. Generate one complete sheet in one request instead of independent images.
2. Attach the accepted master reference to every revision.
3. Give each subject a unique production name.
4. Repeat a short invariant bible verbatim: anatomy, face, materials, wardrobe, palette, outline, light, camera, scale, and anchor.
5. Separate `LOCKED` properties from `CHANGE PER CELL`.
6. Specify exact rows, columns, reading order, gutters, cell aspect ratio, and crop margin.
7. Do not rely on generated labels. Map cells by row and column in the asset manifest.
8. Keep text, subtitles, and signs out of the image; render them in Stagehand.
9. Make one change per correction request and preserve the prior candidate.
10. Inspect cell count, alpha, bleed, crop, identity, anchor, and background continuity before approval.

### Whole-frame contact sheet template

```text
OUTPUT TYPE
Create one production animation contact sheet, not a poster.
Canvas: [WIDTH] x [HEIGHT] PNG. Grid: exactly [COLS] x [ROWS],
row-major. Every cell is a clean [ASPECT] camera frame with
[GUTTER] px empty gutters. No labels, captions, borders, or watermarks.

CANONICAL SUBJECT
Production name: [UNIQUE NAME].
[Exact anatomy, material, face, costume, and prop description.]

LOCKED ACROSS EVERY CELL
Same identity, proportions, anatomy count, costume, palette, outline,
rendering method, light direction, camera height, lens, horizon,
background geometry, screen scale, and anchor at [X%, Y%].

CELL PLAN
A1: [pose, action, expression].
A2: [pose, action, expression].
[Continue in row-major order.]
Only the listed pose, action, expression, or prop state may change.

FINAL CHECK
Correct identity drift, extra anatomy, costume drift, perspective drift,
cropping, accidental text, matte halos, and gutter bleed before output.
```

### Transparent sprite-sheet template

```text
Use Image 1 as the immutable identity and construction reference.
Create one transparent sRGBA sprite sheet: exactly [COLS] x [ROWS],
row-major, equal cells, empty gutters. Each cell contains one complete,
uncropped sprite. Lock scale, pivot, baseline, facing direction, outline,
palette, lighting, and canvas anchor. Change only [POSE / ARM / MOUTH / FX].
No labels, shadows outside the sprite, matte halo, overlap, or redesign.
```

Use whole-frame sheets when materials and environments interact, such as a realistic cutout waking in an illustrated world. Use sprite sheets for anchored swaps such as mouths, hands, bubbles, and a minifigure acting over a locked background.

## 4. Lip-sync, programmable SFX, and local voice

### Mouth drawings, not generated deformation

Toon Boom's standard chart uses eight named drawings, A-G plus X for silence, and explicitly notes that detection fills the timeline with existing mouth drawings rather than creating them. [Toon Boom Harmony: About Lip-sync](https://docs.toonboom.com/help/harmony-24/advanced/sound/about-lip-sync.html). Adobe uses a larger viseme set stored as frames inside a graphic symbol, then creates keyframes from analyzed audio while preserving manual Frame Picker correction. [Adobe Animate: Frame Picker and Auto Lip-Sync](https://helpx.adobe.com/uk/animate/using/symbol-instances.html).

Rhubarb Lip Sync provides a practical local bridge. It supports six required A-F shapes plus optional G, H, and X, and exports timestamped mouth cues as TSV, XML, or JSON. Supplying the dialogue text can improve recognition. [Rhubarb Lip Sync GitHub](https://github.com/DanielSWolf/rhubarb-lip-sync).

Recommended Stagehand flow:

1. Author and approve one anchored mouth atlas.
2. Generate or import final dialogue audio.
3. Run Rhubarb locally with the dialogue text and JSON output.
4. Quantize cue boundaries to animation frames with a documented rounding rule.
5. Map Rhubarb A-F/G/H/X to the project's available drawings.
6. Collapse one-frame chatter that does not improve readability.
7. Force X or the approved rest drawing through silence.
8. Scrub the waveform and manually correct plosives, long vowels, and final closures.

The upper teeth, head crop, anchor, scale, and lighting must remain fixed across mouth drawings. Lip-sync should never move the face.

### Programmable SFX

Treat effects as data rather than baked soundtrack edits. Each cue should retain `assetId`, `startFrame`, optional `durationFrames`, gain, pan, loop, fade, and provenance. Visual timing remains frame-quantized, while playback can schedule audio at exact Web Audio times. The Web Audio specification defines scheduled source start/stop against the audio context clock. [W3C Web Audio API](https://www.w3.org/TR/webaudio-1.0/).

Useful agent operations are semantic and bounded:

- "place the plastic click on the impact frame";
- "move the bubble pop two frames earlier";
- "lower the office ambience by 5 dB"; and
- "loop the room tone through the shot, with a six-frame fade."

Validation should block missing payloads, cues outside the scene, negative duration, unknown licenses, and preview/export timing disagreement.

### Local OmniVoice integration

OmniVoice supports local multilingual zero-shot TTS and voice cloning. Its official examples accept `ref_audio` and `ref_text`, write 24 kHz audio, recommend a short 3-10 second reference, and allow a voice prompt to be saved for reuse. [k2-fsa OmniVoice GitHub](https://github.com/k2-fsa/OmniVoice).

The safe integration boundary is:

```text
approved script + consent record + owned reference WAV/transcript
  -> local OmniVoice generation
  -> WAV normalization and checksum
  -> Rhubarb JSON mouth cues
  -> frame quantization and manual correction
  -> Stagehand dialogue, mouth, and SFX tracks
  -> canvas preview and WebM export
```

Required safeguards:

- clone only a voice the user owns or has explicit permission to use;
- store speaker, consent scope/date, reference checksum, model revision, prompt, and output checksum;
- never expose reusable voice embeddings or source audio through a public tool response;
- make generated-voice disclosure visible in the demo credits;
- keep deletion and revocation possible; and
- treat local execution as privacy-preserving infrastructure, not permission by itself.

## 5. Acceptance checklist

### Timeline and authoring

- [ ] All visual positions and durations round-trip as integer frames.
- [ ] Holds render without blank flashes or accidental duplicate drawings.
- [ ] Hold resizing, ripple behavior, and undo are deterministic.
- [ ] Onion skin finds adjacent unique drawings and never enters export.
- [ ] Scene and panel timing can be read back through the same state used by the UI.

### Generated sheets

- [ ] Exact cell count, dimensions, gutters, alpha, and row-major mapping validate.
- [ ] Identity, palette, camera, scale, and anchor remain stable.
- [ ] No generated text, neighboring-cell bleed, crop, matte halo, or extra anatomy appears.
- [ ] Original sources, prompts, candidates, approval state, and checksums remain available.

### Dialogue and sound

- [ ] Every mouth cue maps to an existing approved drawing.
- [ ] Silence resolves to X/rest; one mouth shape is active per character per frame.
- [ ] Mouth anchors do not crawl, and closures land cleanly on plosives and line endings.
- [ ] Voice cloning has explicit consent and provenance.
- [ ] SFX cues are editable independently and agree between preview and export.

### Render parity

- [ ] Boundary frames are checked at `N-1`, `N`, and `N+1`.
- [ ] Canvas preview, inspected PNG, and WebM source frame use the same evaluator.
- [ ] Overlays and onion skin are disabled for parity checks.
- [ ] Output duration equals final frame count divided by fps.
- [ ] The rendered animation is reviewed visually, not approved from schema validity alone.

## Primary sources

- [Adobe Animate: Frame-by-frame animation](https://helpx.adobe.com/animate/desktop/animation/frame-by-frame-animation.html) - complete-frame authoring and the boundary between frame-by-frame work and simple movement.
- [Adobe Animate: Frame Picker and Auto Lip-Sync](https://helpx.adobe.com/uk/animate/using/symbol-instances.html) - viseme frames, automatic placement, and manual correction.
- [Krita: Animation Timeline Docker](https://docs.krita.org/en/reference_manual/dockers/animation_timeline.html) - integer-frame timing, blank/duplicate/clone frames, and automatic holds.
- [Krita: Onion Skin Docker](https://docs.krita.org/en/reference_manual/dockers/onion_skin.html) - neighboring drawings, tint, range, and opacity.
- [Toon Boom Harmony: Setting the Exposure Hold](https://docs.toonboom.com/help/harmony-24/premium/timing/hold-exposure.html) - production exposure on twos, threes, and deliberate exceptions.
- [Storyboard Pro: Add Scenes and Panels](https://docs.toonboom.com/help/storyboard-pro-24/storyboard/getting-started/panel.html) - scenes as shots and panels as visible actions.
- [Storyboard Pro: Changing Panel Duration](https://docs.toonboom.com/help/storyboard-pro-24/storyboard/timing/change-panel-duration.html) - frame-accurate panel timing and ripple behavior.
- [Toon Boom Harmony: About Lip-sync](https://docs.toonboom.com/help/harmony-24/advanced/sound/about-lip-sync.html) - the A-G/X mouth chart and drawing substitution model.
- [OpenAI Academy: Creating images with ChatGPT](https://openai.com/academy/image-generation/) - structured scene prompts, small reference sets, and incremental edits.
- [Gemini API: Image generation](https://ai.google.dev/gemini-api/docs/image-generation) - narrative prompting, camera control, and prior-image references for consistency.
- [k2-fsa OmniVoice GitHub](https://github.com/k2-fsa/OmniVoice) - local reference-audio voice cloning, reusable prompts, and consent warning.
- [Rhubarb Lip Sync GitHub](https://github.com/DanielSWolf/rhubarb-lip-sync) - local audio analysis, six-to-nine mouth shapes, and timestamped JSON cues.
- [Nanimate GitHub](https://github.com/tmanderson/nanimate) - a lightweight browser timeline with per-layer FPS, looping, and onion skin.
- [W3C Web Audio API](https://www.w3.org/TR/webaudio-1.0/) - sample-clock source scheduling and programmable audio parameters.
- [Supplemental transcript: Toon Boom rigs plus roughs, `IkDUhWsT7n8`](https://www.youtube.com/watch?v=IkDUhWsT7n8) - key/breakdown effort at 7:56 and rendered frame review at 17:05.

Source review date: 4 September 2026.
