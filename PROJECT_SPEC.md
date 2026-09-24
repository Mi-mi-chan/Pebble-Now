# Water Drop — Mindfulness Water World

Status: **Product direction established; implementation is staged**  
Version: 2.0  
This document is the single source of truth for the experience, interaction model, rendering priorities, time behavior, and milestone boundaries.

## 1. Product purpose

Water Drop is an interactive mindfulness space, not a portfolio hero, dashboard, game, or productivity tool.

The central metaphor is:

```text
THOUGHT → PEBBLE → WATER → RIPPLE → STILLNESS
```

The user writes what is on their mind onto a pebble and gives that thought a place in a calm body of water. The thought remains in the water while time and light pass around it.

The emotional sequence is:

```text
NOTICE → WRITE → HOLD → PLACE → WATCH → RELEASE
```

The experience should feel like a digital meditation object: slow, quiet, tactile, spacious, and soundless by default.

## 2. Core scene

There is one view and one shared world:

- A full-screen, top-down or slightly dimensional water surface.
- No horizon, sky, visible pool walls, camera switching, or Perspective View mode.
- The water is calm, soft, translucent, minimal, and slightly abstract.
- The water itself is the interface; conventional panels and app chrome are avoided.
- Pebbles exist in world space and remain in the scene after placement.

The attached water references are visual guidance only. The implementation must preserve a coherent living surface rather than treating the reference image as the interface.

## 3. First experience

On load:

1. Water appears first.
2. A subtle sentence fades in: “What’s on your mind?”
3. There is no card, modal, onboarding panel, or blocking tutorial.
4. After the first meaningful interaction, the sentence gently fades away.

The experience must remain usable with reduced motion and keyboard input. The first interaction must not accidentally place a pebble.

## 4. Thought-entry interaction

The primary action is the minimal text control `+ PEBBLE`.

Activating it enters a quiet thought-entry state integrated with the scene:

- Show the prompt: “Leave a thought here.”
- Show a simple text input, without a conventional modal card.
- Accept a short thought, such as “I need to slow down.”
- Confirming creates one restrained, neutral pebble.
- Empty or excessively long input does not create an object.
- Escape/cancel exits without creating a pebble.

The entry state should feel like placing attention into the water, not filling out a form.

## 5. Pebble model and placement

Each pebble is a world-space object, not a DOM label pasted over the surface.

Each generated pebble has restrained procedural variation in:

- irregular shape
- size and proportions
- rotation
- neutral stone tone
- subtle surface roughness/wetness

Avoid colorful, glossy, collectible, or game-like stones.

After text confirmation:

1. The cursor carries the pebble as a physical object hovering slightly above the water.
2. Its text remains visible on the stone.
3. Pointer movement selects the placement location with only subtle feedback; do not show grids or target markers.
4. Clicking the water places the pebble into the shared world.
5. The placed pebble remains after the ripple dissipates and after time changes.

The text may use a hybrid rendering technique, but it must follow the pebble's world position, scale, and orientation and remain readable in every lighting state.

Minimum world-space record:

```js
{
  id,
  thought,
  seed,
  position: { x, y, z },
  rotation,
  scale,
  collisionRadius,
  shapeParameters
}
```

The data model must support multiple pebbles from the beginning, even if the first milestone only exposes one placement at a time.

## 6. Water response

Placement should feel physical and contemplative:

```text
pebble touches water
→ local displacement
→ ripple expands
→ caustics / highlights distort
→ ripple dissipates
→ water returns to calm
```

The pebble should have 3D volume, a soft contact shadow, subtle wetness near the waterline, and lighting consistent with the water.

Full rigid-body stacking is not required initially, but the architecture must leave room for later pebble collision and stacking.

The response should be driven by shared world/simulation state. Avoid unrelated decorative ripple overlays that do not respond to the placed object.

## 7. Time as atmosphere

TIME remains a central interaction. The bottom-left display stays:

```text
● 4:28 p.m.  LIVE
```

The default follows the user's local real-world time. Clicking the time display opens the existing minimal line-based Time Wheel. Clicking outside closes it. `LIVE` restores local time and natural progression.

The wheel moves continuously through 24 hours. It labels only these four atmospheric anchors:

- MIDNIGHT — 00:00
- DAWN — 06:00
- NOON — 12:00
- DUSK — 18:00

These are anchor states, not four hard presets. The wheel remains precise and tactile: each small time increment produces a subtle visual tick response, and all lighting values interpolate smoothly through the full day.

Time changes the atmosphere of the same water world. It must not change the camera, remove thoughts, reset ripples, or move pebbles.

### Atmospheric lighting constraints

Keep the overall exposure in a narrow, calm range. The scene must remain readable and luminous at all times. The primary differences should come from light temperature, direction, caustic character, highlight softness, ambient tint, and subtle contrast—not dramatic brightening or darkening.

| Anchor | Mood | Lighting direction |
|---|---|---|
| Dawn | quiet, fresh, slightly cool | pearl-white water, pale blue-grey undertone, gentle emerging warmth, soft caustics, low contrast, long delicate highlights |
| Noon | clear, open, still | neutral pearl-white water, clean transparent light, slightly stronger caustics, shorter clearer highlights, preserved midtones and texture; never clipped white |
| Dusk | warm, reflective, gentle | mostly neutral water with restrained ivory/champagne highlights, warmer ambient light, longer reflections, soft shadows, slightly reduced caustics; never orange water |
| Midnight | deep, quiet, contemplative | clearly visible silver-grey/muted cool-neutral water, low contrast, restrained highlights, subtle moon-like reflection, slower-feeling caustics; never black or dark-blue ocean |

All of the following interpolate continuously: light direction, color temperature, ambient intensity, specular strength, caustic intensity, shadow softness, and highlight character.

## 8. Interaction and accessibility rules

- No dashboards, cards, counters, scores, achievements, or gamification.
- No camera toggle or alternate scene view.
- Minimal controls remain keyboard reachable with visible focus states.
- Pointer and touch placement use the active water surface and the same world coordinates.
- Escape cancels the active entry/placement state.
- Text on pebbles remains readable across all four atmospheric anchors.
- `prefers-reduced-motion` reduces or removes transitions without removing functionality.
- The app should remain usable without relying on sound.

## 9. Current implementation baseline and known gaps

The repository is a dependency-free HTML/CSS/WebGL prototype:

- `index.html` contains the full-screen canvas, time control, controls, and time wheel.
- `app.js` contains a WebGL water surface, pointer ripples, time state, and camera logic.
- `styles.css` contains the scene and minimal control styling.

The current code is not yet aligned with this product direction. Known gaps include:

- portfolio-style `WELCOME` copy instead of “What’s on your mind?”
- a camera toggle that must be removed from the product experience
- no thought input flow
- no world-space pebble geometry or persistent thought records
- no pebble text attached to world-space objects
- no causal pebble-to-water boundary response
- extra time labels such as Daylight and Golden Hour
- a development-only golden-hour lock that must be removed
- lighting that still needs calibration to the reduced light/dark range

Do not treat the current implementation as acceptance-compliant merely because it renders a moving water surface.

## 10. Architecture direction

Keep responsibilities explicit so later physical simulation can grow without rewriting the experience:

```text
AppState
  entryState: "intro" | "idle" | "writing" | "carrying"
  timeMode / selectedTime
  pebbles: Pebble[]

TimeController
  local live time
  continuous wheel input
  four-anchor labels
  smooth atmospheric interpolation

WorldModel
  water bounds and depth
  world-space pebble records
  thought text and placement state

WaterSimulation
  surface motion
  disturbance injection
  pebble boundary interface
  surface normals and caustic inputs

Renderer
  single water world
  pebble volume, contact shadow, and wetness
  world-attached thought text
  atmospheric lighting

InteractionController
  intro dismissal
  thought input
  cursor carrying
  pointer-to-water placement
  time-wheel interaction
```

The renderer may remain lightweight and dependency-free. The acceptance criterion is a coherent shared world and believable causal response, not a particular library.

## 11. Milestones

### M1 — Clean single-view water architecture

Remove portfolio/camera assumptions. Establish one water world, the new intro sentence, minimal `+ PEBBLE` and time controls, and clear state boundaries. Preserve the existing time-wheel mechanics while removing the camera toggle.

Acceptance: one view only; water appears first; “What’s on your mind?” fades in/out appropriately; no accidental placement; no console errors.

### M2 — Final water visual and interaction

Tune the single surface toward calm translucent pearl-white water. Keep pointer response subtle. Establish responsive layout, reduced-motion behavior, and a stable water-to-world coordinate conversion.

Acceptance: no horizon or scene switching; surface remains readable and meditative; pointer/touch interaction is calm and responsive.

### M3 — Thought input experience

Implement the integrated “Leave a thought here.” input, confirmation, cancellation, validation, and accessible focus behavior.

Acceptance: a short thought can be entered without a card/modal; the intro exits after first interaction; cancellation creates nothing.

### M4 — Procedural pebble generation

Create restrained seeded pebble geometry/material variation and attach readable thought text to the pebble in world space.

Acceptance: each confirmed thought creates one stable, neutral, dimensional pebble; text follows its transform and stays readable.

### M5 — Cursor carrying and placement

Allow the pointer to carry the generated pebble above the water and place it at a world-space location with subtle feedback.

Acceptance: placement is precise, calm, touch-compatible, and does not use grids or DOM-pasted object labels.

### M6 — Pebble-to-ripple integration

Connect pebble placement to local displacement, expanding ripple, caustic/highlight distortion, and dissipation. Add the boundary interface needed for later collision quality.

Acceptance: the ripple visibly originates from the pebble impact and settles without unbounded growth.

### M7 — Persistent multi-pebble thought garden

Support multiple simultaneous pebbles and stable records. Preserve every thought when new thoughts are added and when time changes.

Acceptance: previously placed thoughts remain in the shared world, remain readable, and do not duplicate after resize or interaction.

### M8 — Time-of-day lighting integration

Replace any temporary development lock and implement the four continuous atmospheric anchors: Dawn, Noon, Dusk, Midnight. Keep exposure narrow and preserve water readability.

Acceptance: wheel motion is continuous; only four anchors are labeled; all transitions are smooth; noon is clear rather than clipped; midnight is visible rather than black; pebbles remain unchanged except for light, shadow, and reflection.

### M9 — Polish, accessibility, and performance

Refine timing, typography, focus behavior, touch paths, text contrast, reduced motion, memory, and frame rate. Verify the complete emotional sequence from notice through stillness.

Acceptance: no console errors; responsive desktop/mobile interaction; readable thoughts at every anchor; stable performance; no conventional app chrome introduced.

## 12. Working rules and milestone reports

- Work one milestone at a time.
- Do not add features from a later milestone early unless required as a minimal interface boundary.
- Preserve placed thoughts across time changes and viewport resize.
- Never reintroduce camera switching, portfolio hero copy, or extreme day/night exposure.
- After every milestone, report files changed, intentional non-changes, run/verification method, console status, manual checks, performance observations, passed/failed acceptance criteria, and any proposed spec change separately.

### Next implementation prompt

> Read `PROJECT_SPEC.md` first. Implement **M1 only** for the Water Drop mindfulness water world. Remove the portfolio/camera assumptions, establish the single-view architecture, update the intro copy and minimal controls, preserve the existing time-wheel interaction, and do not implement thought input, pebble generation, pebble physics, or final time-of-day calibration yet. Run the app, inspect the console, verify every M1 acceptance criterion, then stop and report.
