# Mindful Water

## Product Vision

Mindful Water is an interactive mindfulness website, not a portfolio hero and not a scene-navigation demo.

Its central metaphor is:

> **THOUGHT → PEBBLE → WATER → RIPPLE → STILLNESS**

The user writes down what is currently on their mind, places that thought onto a natural pebble, and releases it into one calm body of water. The water responds briefly with a soft ripple, then returns to stillness. The pebble and its words remain, gradually forming a personal **thought garden**.

The core concept is:

> **The thought stays. Time passes around it.**

The experience should feel quiet, tactile, spacious, and emotionally safe. Visual quality matters, but every visual system must serve attention, reflection, and release.

## Experience Principles

- **One calm place:** The entire product is one continuous world-space water surface.
- **Reflection over performance:** Interaction should feel deliberate and unhurried, never game-like.
- **Subtle time:** Time changes the atmosphere without replacing the scene or overwhelming the thought garden.
- **Material presence:** Water, stone, wetness, shadow, text, and light should feel physically related.
- **Temporary response, lasting trace:** Ripples fade; thoughts and pebbles remain.
- **Progressive disclosure:** The interface is nearly invisible until the user needs it.
- **Accessible calm:** Text remains legible, controls remain discoverable, and motion can be reduced.

## Scene / Camera

### Required composition

- Use a single near-top-down view of the water.
- The camera may have slight dimensional tilt, but the surface must remain the dominant field of view.
- All pebbles, labels, shadows, ripples, and pointer feedback live in the same world-space water surface.
- Preserve a large uninterrupted area of water so the user can breathe visually.

### Explicit exclusions

- No portfolio hero composition.
- No `Perspective View` mode or mode switch.
- No horizon.
- No visible sky.
- No camera switching.
- No navigation between separate scene views.
- No dashboard framing, panels, cards, or persistent chrome around the water.

The camera should be stable. Any movement should be limited to subtle water response or carefully justified atmospheric motion.

## Water System

The water is the primary visual and interaction surface.

### Visual requirements

- High-quality soft water shading.
- Layered, readable caustics.
- Gentle surface displacement and reflection.
- Soft specular highlights with controlled contrast.
- Subtle depth and translucency without looking like a glossy game environment.
- Pointer interaction that creates a localized response without disturbing the whole scene.
- Clear recovery from disturbance: every ripple should decay naturally toward stillness.

### Ripple behavior

When a pebble is placed:

1. The contact point creates a soft displacement.
2. A primary ripple expands from the impact point.
3. Secondary rings follow with lower amplitude and opacity.
4. Nearby caustics and highlights react briefly.
5. The effect eases back to the current baseline atmosphere.

Ripple amplitude, radius, speed, decay, and distortion should be parameterized. The system must support multiple simultaneous ripples later, but the first version should prioritize softness and visual stability over complex fluid simulation.

### Pointer interaction

The pointer may produce a very light hover or focal response on the water. It must never feel like a cursor trail, game reticle, or noisy shader effect. Touch and keyboard equivalents should be supported where practical.

## Time System

Time remains one of the central interactions.

### Real-time display

The lower-left corner contains a minimal display:

```text
● 4:28 p.m.  LIVE
```

- Use the user's local real-world time by default.
- Update the displayed time continuously or at a sensible readable interval.
- Make the `LIVE` state visually clear but quiet.
- Do not turn the time display into a dashboard or analytics element.

### Time Wheel

Interacting with the time display opens an extremely minimal line-based **Time Wheel**.

- The wheel represents a continuous 24-hour cycle.
- The user can scrub smoothly through time.
- The wheel is an atmospheric control, not a date picker or scheduling tool.
- Closing it returns the user directly to the water surface.
- The selected time may be temporary unless persistence is explicitly enabled later.

### Four visual anchor states

The continuous cycle is expressed through four atmospheric anchors:

| Anchor | Approximate time | Mood | Visual direction |
| --- | --- | --- | --- |
| **DAWN** | 06:00 | quiet, fresh, beginning | pearl-white water, cool pale blue, soft early light |
| **NOON** | 12:00 | open, clear, present | balanced neutral warmth, readable highlights, restrained brightness |
| **DUSK** | 18:00 | settling, reflective, warm | muted amber/rose influence, low-angle softness, gentle contrast |
| **MIDNIGHT** | 00:00 | inward, spacious, restful | deep blue-grey atmosphere, visible water detail, soft cool highlights |

These are visual anchor states, not four hard scenes. Interpolate smoothly between them across the full 24-hour cycle.

### Reduced light/dark range

Do not use dramatic day-to-night exposure changes.

- Noon must not become overexposed or white-hot.
- Midnight must remain clearly visible and readable.
- All states should feel like the same water at different moments.
- Distinction should primarily come from light temperature, light direction, caustic character, highlight softness, ambient tint, and gentle contrast.
- Avoid pure black backgrounds, crushed shadows, and sudden color jumps.

The time system changes atmosphere around the thoughts; it never hides or resets them.

## Thought / Pebble Flow

### First-entry prompt

On first entry, the water may present a restrained prompt:

> **What’s on your mind?**

The prompt should fade or move aside once the user begins interacting. It should not become a permanent headline.

### Creating a thought

1. The user chooses the minimal `+ PEBBLE` action.
2. A quiet input state appears with copy such as `Leave a thought here.`
3. The user enters a short thought.
4. On confirmation, the thought becomes a pebble.
5. The cursor carries the pebble over the same world-space water surface.
6. The user clicks, taps, or uses the keyboard to place it.
7. The pebble settles, the water ripples, and the thought remains visible.

Do not use random generation as a substitute for the user's input. Randomness should only shape the pebble's natural appearance.

### Pebble requirements

Each pebble should have:

- Natural variation in silhouette, size, rotation, roughness, and grey/earth tone.
- Actual 3D volume rather than a flat icon.
- A readable text treatment integrated into the stone's surface.
- Contact shadow or ambient occlusion where it meets the water.
- A subtle wetness response after placement.
- Stable world-space position after release.
- A unique identity for persistence and future interaction.

Text may wrap over one or a few lines, but it must remain legible at the intended viewing scale. The text should feel placed on or engraved into the pebble, not like a floating UI label.

### Placement model

The first release does not require rigid-body collision, stacking, or physically accurate dropping. It must, however, use an architecture that can later support collision, settling, proximity, and stacking.

For version one:

- Place pebbles on a valid water-surface coordinate.
- Prevent accidental placement outside the intended world bounds.
- Preserve each pebble's transform and text.
- Use a soft settle animation, not an exaggerated bounce.
- Keep nearby pebbles visually distinct enough for reading.

## UI / Typography

The UI should be nearly absent from the scene.

### Visible controls

- Lower-left: local time, `LIVE`, and access to the Time Wheel.
- A restrained `+ PEBBLE` affordance, positioned where it does not compete with the water.
- Temporary input and confirmation states only when needed.
- Optional small accessibility/settings affordance, if required, without creating a panel-heavy layout.

### Typography

- Use a quiet, refined typeface with strong small-size readability.
- Keep labels short and sentence-based.
- Favor light or regular weight over bold UI treatment.
- Use generous letter spacing only when it improves calmness and legibility.
- Maintain sufficient contrast against every time state.
- Do not use oversized marketing headlines, badges, scores, progress indicators, or achievement language.

## State / Persistence

The application should model the experience explicitly rather than relying only on visual effects.

### Core state

- `currentTime`: local live time or temporary wheel-selected time.
- `timeMode`: `live` or `scrubbed`.
- `atmosphere`: interpolated parameters derived from the selected time.
- `pebbles`: ordered collection of persisted thought objects.
- `activeThought`: current input text and input status.
- `activePebble`: pebble being carried or placed.
- `rippleEvents`: transient water disturbances.
- `reducedMotion`: accessibility preference.

Each persisted pebble should include at minimum:

```text
id
text
createdAt
position
rotation
scale
materialVariant
```

Use local persistence for the first version unless a backend is explicitly introduced. Loading the experience should restore the thought garden without requiring an account. Empty state, corrupted state, and storage-unavailable behavior should fail gracefully.

## Technical Architecture

Separate the experience into clear systems so visual iteration does not require a full rewrite.

### Suggested layers

1. **Application state:** time mode, thoughts, pebble lifecycle, preferences, persistence.
2. **World and camera:** the single near-top-down scene and world/screen coordinate conversion.
3. **Water renderer:** base material, caustics, displacement, pointer response, ripple events.
4. **Pebble renderer:** geometry, material variants, text mapping/rendering, wetness, shadows.
5. **Interaction layer:** pointer/touch hit testing, drag/carry state, placement, keyboard equivalents.
6. **UI layer:** time display, Time Wheel, thought input, `+ PEBBLE`, first-entry prompt.
7. **Accessibility layer:** reduced motion, focus order, contrast handling, readable text alternatives.

### Coordinate and event rules

- Keep pebble placement in world space, not as screen-fixed DOM decorations.
- Convert pointer coordinates into the water plane using a single source of truth.
- Treat ripple creation as an event with parameters rather than hard-coding it inside UI handlers.
- Keep time-atmosphere mapping independent from the renderer.
- Keep pebble data independent from mesh instances so future collision/stacking can be added without changing persistence.

### Performance expectations

- Maintain a calm, stable frame rate on the target device class.
- Avoid excessive transparent layers, uncontrolled post-processing, and unbounded ripple events.
- Use pooled or bounded transient ripple resources.
- Degrade gracefully when high-quality water effects are not available.

## Non-goals

The following are explicitly outside the first version:

- Portfolio hero messaging or case-study presentation.
- `Perspective View` and camera mode switching.
- Visible horizon or sky.
- A multi-page dashboard or productivity workspace.
- Social feeds, accounts, sharing, comments, or collaborative gardens.
- Gamification, scores, streaks, rewards, badges, quests, or progress meters.
- Rigid-body pebble simulation, realistic collisions, and automatic stacking as a launch requirement.
- Extreme day/night lighting or cinematic scene transitions.
- Complex fluid simulation whose visual cost exceeds its emotional value.

The architecture should leave room for future collision/stacking, richer pebble materials, and optional sync, but those additions must not compromise the first-version stillness.

## Milestones

Development must proceed incrementally. Do not perform a one-shot rewrite.

### Milestone 0 — Baseline and safety

- Inspect the current implementation and preserve unrelated working behavior.
- Identify existing water, camera, time, pointer, and UI boundaries.
- Record a baseline screenshot and note known regressions.

### Milestone 1 — Single-scene foundation — COMPLETE

Completed 2026-09-24.

Changed:

- `index.html`: removed the Top/Perspective camera control, updated the page metadata and entry prompt, and reduced Time Wheel labels to Midnight, Dawn, Noon, and Dusk.
- `app.js`: removed camera-mode state, transitions, alternate-view rendering, and camera-dependent interaction branches; fixed the renderer to one near-top-down water camera; removed the development golden-hour lock; removed the sky/horizon reflection path; preserved water shading, caustics, pointer ripples, Time Wheel behavior, and LIVE local time.
- `styles.css`: removed the perspective reference-image background and kept the WebGL water as the full-viewport surface; restored the renderer to normal opacity so removing the old background does not flatten the water unnecessarily.

Verified in the browser:

- One uninterrupted water view fills the viewport.
- No Perspective/Top View switch remains.
- No horizon or sky layer remains.
- Pointer press still creates a localized water ripple.
- The Time Wheel opens, shows only the four approved anchor labels, and closes from an outside click.
- `LIVE` remains the default local-time state and `Back to now` restores it.
- Browser console showed no errors or warnings during load and interaction checks.

Pebble behavior, thought input, water redesign, and Time-of-Day redesign were intentionally not started.

- Establish the single near-top-down water view.
- Remove or disable portfolio hero and Perspective View assumptions.
- Remove horizon, sky, and camera switching.
- Confirm pointer-to-world water coordinates.

### Milestone 2 — Water quality — COMPLETE

Completed 2026-09-24.

M2 replaces the former WebGL procedural/radial ripple renderer with the published Pool interaction model from [Alexander Smith’s Pool article](https://www.alexandersmith.dev/lab/pool): two quarter-resolution `Float32Array` height buffers, a discrete neighbor wave step, slope-based shading, and a fixed 60 Hz accumulator.

Reference parameters are kept unchanged:

- `damping = 0.982`
- `SCALE = 4`
- `drop strength = 340`
- `drop radius = 3` simulation cells
- `base level = 232`
- `slope gain = 1.7`
- `STEP = 1000 / 60`

Changed:

- `app.js`: replaced the WebGL water shader/ripple path with the two-buffer CPU height-field simulation; added fixed-step accumulation with long-frame clamping and visibility resync; added shared pointer/touch drop injection for click, repeated click, boundary, and drag disturbances; retained the Time Wheel, local `LIVE` time, single-view layout, and future-compatible disturbance boundary.
- `styles.css`: removed the stale reference-image comment; retained the full-viewport canvas presentation.

Verified in the browser:

- Single click creates a localized depression that propagates from the simulation.
- Repeated and overlapping clicks use the same height field.
- Boundary clicks remain bounded by the fixed zero outer ring.
- The ripple decays through damping rather than a manually drawn expanding circle.
- The canvas is simulated at one quarter viewport resolution and smoothed on upscale.
- Time Wheel opens with the four existing anchor labels and `LIVE` remains functional.
- Browser console showed no errors or warnings.

Pebbles, thought input, advanced caustics, extra procedural waves, and Time-of-Day redesign remain intentionally out of scope.

The reference interaction is now the baseline for later visual integration; no additional water effects are added in this milestone.

### Milestone 3 — Time atmosphere

- Add the lower-left local time and `LIVE` display.
- Add the minimal line-based Time Wheel.
- Implement continuous 24-hour interpolation through DAWN, NOON, DUSK, and MIDNIGHT.
- Tune the reduced light/dark range: no overexposed Noon and no unreadable Midnight.

### Milestone 4 — Thought input and pebble placement

- Add `What’s on your mind?` first-entry behavior.
- Add `+ PEBBLE` and temporary thought input.
- Generate natural randomized 3D pebbles with readable text.
- Implement cursor carrying, world-space placement, contact shadow, wetness, and ripple response.

### Milestone 5 — Thought Garden & persistence — COMPLETE

Completed 2026-09-24.

- Placed Pebbles persist locally with their thought, world position, scale, shape parameters, rotation, material variant, seed, and collision metadata.
- Restore is validated and bounded; empty, malformed, and storage-unavailable states fail quietly back to an empty garden.
- Restored Pebbles are rasterized into the same height-field obstacle mask as newly placed Pebbles, so their actual silhouettes remain water boundaries after refresh.
- Multiple Pebbles coexist in one world-space scene with text drawn directly onto each stone.

### Milestone 6 — COLLECT / Let Go — COMPLETE

Completed 2026-09-24.

- A restrained `COLLECT` action appears only when placed Pebbles exist.
- Collection is a staggered sequence: each Pebble receives a final height-field disturbance, fades away, and is removed from the obstacle mask at that moment.
- Thought Garden storage is cleared after the last Pebble disappears; the remaining waves settle back into the empty-water state.

### Milestone 7 — Final integration & polish — COMPLETE

Completed 2026-09-24.

- Verified the complete Thought → Pebble → Water → Ripple → Thought Garden → COLLECT → Stillness loop in the browser.
- Kept the approved Water, Time, drag, click, placement, dawn/noon/dusk/midnight, touch, and responsive interactions intact.
- Kept the scene free of cards, galleries, counters, dashboards, and management UI.
- Rechecked the persistence boundary, obstacle silhouettes, collection timing, reduced-motion treatment, and browser console after integration.

### Required loop for every milestone

For every meaningful change, follow this loop:

> **Edit → Run → visually verify → screenshot/compare**

Do not make a large batch of speculative changes and defer visual verification. Compare the result with the prior baseline after each milestone, keep changes attributable, and stop to correct regressions before continuing.

## Acceptance Criteria

The first version is acceptable when all of the following are true:

- The product is clearly an interactive mindfulness website, not a portfolio hero.
- The experience opens into one calm near-top-down water surface.
- There is no horizon, sky, camera switching, or Perspective View mode.
- The metaphor is legible through behavior: thought becomes pebble, pebble enters water, water ripples, then returns to stillness.
- A user can write a thought, carry its pebble with the cursor, place it on the same world-space surface, and see the pebble and text remain.
- Pebbles have natural variation, 3D volume, contact shadow, wetness, and readable world-space text.
- Multiple pebbles form a persistent personal thought garden.
- The lower-left display shows local time and `LIVE` in a restrained treatment.
- The Time Wheel represents a continuous 24-hour cycle.
- DAWN, NOON, DUSK, and MIDNIGHT are visibly distinct but belong to the same calm luminous world.
- Noon is not overexposed, and Midnight remains readable.
- Water quality includes convincing caustics, soft displacement, highlights, and pointer interaction.
- The UI contains no dashboard, cards, gamification, or unnecessary chrome.
- The first-entry prompt can use `What’s on your mind?` without becoming a permanent hero headline.
- Reduced motion and basic keyboard/focus behavior are handled.
- The implementation has separable state, water, pebble, interaction, and UI systems.
- The work was completed incrementally using **Edit → Run → visually verify → screenshot/compare**, with no unverified one-shot rewrite.
