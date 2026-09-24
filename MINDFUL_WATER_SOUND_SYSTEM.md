# Mindful Water Sound System

Companion document to [MINDFUL_WATER_SPEC.md](./MINDFUL_WATER_SPEC.md). This document defines the sound language, production plan, and web-audio architecture for Mindful Water. It does not replace the visual/product specification.

> **Implementation revision:** The current website uses six local audio assets rather than synthesized ambient noise or oscillator-based music. The six asset filenames and native-audio crossfade behavior in the latest implementation take precedence over earlier Web Audio synthesis recommendations in this document.

> **The water responds. The sound breathes. Time changes the atmosphere.**

## Sound intent

Sound should make the existing water world feel alive without turning it into a music player, game, or conventional meditation track. The user should feel that the environment itself is sounding: air, water, stone, distance, and time.

Sound must remain:

- quiet, tactile, spacious, and emotionally safe;
- subordinate to the thought and water interaction;
- continuous across the 24-hour time cycle;
- responsive to existing visual state rather than driven by a separate interaction model;
- graceful when disabled, unavailable, muted by the browser, or running on a lower-power device.

The sound system has three layers:

1. **AMBIENCE** — the continuous environment and time atmosphere.
2. **WATER** — pointer, drag, impact, and wave response.
3. **PEBBLE** — movement, drop, wave resonance, and COLLECT ritual.

## 1. AMBIENCE

Create a minimal ambient soundscape, not conventional meditation music:

- airy pad;
- subtle granular texture;
- low harmonic drone;
- no drums;
- no obvious melody;
- no obvious loop seam;
- approximately 2–4 minutes for the seamless base loop.

The base should feel like the atmosphere of the water surface has a sound. It should be sparse enough to leave room for water movement and Pebble events. Avoid a strong downbeat, chord progression, or emotional climax.

### Ambient playback rules

- Use one continuous sound environment, not four different songs.
- Start only after an intentional user interaction has unlocked audio.
- Fade in gently through the master bus; never start at full volume.
- Keep the base loop running through time changes and user interactions.
- Crossfade or parameter-morph any replacement asset rather than restarting playback.
- Preserve a low-level ambience while COLLECT completes; do not cut to silence.

## 2. TIME × SOUND

The audio atmosphere follows the existing visual timeOfDay / selected-time system. The time cycle is continuous and must not sound like four discrete tracks.

| Anchor | Sound character | Main controls |
| --- | --- | --- |
| **DAWN** | airy, soft, light | more high air, gentle brightness, low density, restrained low end |
| **NOON** | clean, open, transparent | neutral tone, clearest transient detail, moderate ambience |
| **DUSK** | warmer, slightly more resonant | warmer filter, slightly fuller body, longer soft reverb |
| **MIDNIGHT** | deeper, spacious, restrained | darker filter, quieter air, deeper drone, wider/longer tail |

Interpolate continuously between the four anchors. Map the existing continuous time value into normalized parameters such as:

```text
timeOfDay → ambient gain
timeOfDay → filter cutoff / air amount
timeOfDay → harmonic-layer gain
timeOfDay → drone weight
timeOfDay → reverb send and decay
```

Audio transitions must match the existing visual Time Wheel and live-time behavior. Scrubbing should morph smoothly, without restarting the loop or producing clicks. LIVE returning to real time should use the same smoothing path.

## 3. POINTER × WATER

Pointer movement creates extremely subtle water-friction sound. It is a continuous modulation of a quiet water texture, not a cursor trail or repeated sound effect.

```text
pointer velocity → water-friction gain / brightness
```

Rules:

- slow movement is almost silent;
- faster movement raises gain only within a restrained ceiling;
- velocity should be smoothed and measured over a short window to prevent jitter;
- use a filtered texture or granular water bed with gentle variation;
- stop or release the texture quickly when the pointer leaves the water or becomes idle;
- do not create one audio node per pointer event;
- touch drag may use the same movement model after audio has been unlocked.

Mouse press/click uses the existing dropStrength to drive a deeper water-impact / ripple-resonance sound. The impact should be short, soft, and coupled to the visual disturbance radius and intensity.

```text
dropStrength → impact gain / low-frequency body / resonance send
```

## 4. HOLDING A PEBBLE

Holding a Pebble must not disable water sound. During the carry/drag state, the sound comes from the Pebble moving through the water:

```text
pebble velocity → water-friction intensity
pebble size     → low-frequency weight
```

This must correspond to the existing Pebble-shaped water displacement. The audio should follow the same world-space movement and should never imply that the Pebble is floating outside the water surface.

Implementation guidance:

- reuse the water-friction engine with a separate Pebble movement voice or modulation layer;
- keep the voice quiet enough that pointer movement and Pebble movement do not compete;
- smooth velocity and apply a maximum gain so fast dragging cannot become harsh;
- scale low-frequency content subtly with Pebble size;
- when the drag ends, release the movement voice with a short fade rather than an abrupt stop.

## 5. PEBBLE DROP

The drop is the most important sound effect. It should be a restrained physical gesture, not an exaggerated game splash.

```text
Contact → Splash → Body → Tail
```

The composite event contains:

1. a soft stone/water plop;
2. a short, delicate splash;
3. subtle low water resonance;
4. a ripple/reverb decay that follows the visual disturbance.

Target duration: approximately **0.8–1.5 seconds**.

Parameter mapping:

```text
Pebble size          → pitch / body / low-frequency weight
Impact/drop strength → splash gain / transient intensity
Visual ripple decay  → resonance and reverb tail duration
Pebble material      → small timbral variation, if available
```

The event may be layered from separate stems or synthesized voices, but it must behave as one parameterized drop event. Random variation should be constrained and quiet. Avoid cartoon droplets, loud transients, pitch jumps, and obvious repeated samples.

## 6. WAVE × PEBBLE

Existing waves touching placed Pebbles may create extremely subtle resonance only when the visual interaction exceeds an energy threshold.

```text
wave energy at Pebble → resonance send / brightness / short tone amount
```

Rules:

- no sound for negligible wave energy;
- use a per-Pebble cooldown;
- limit the total number of simultaneous resonance voices;
- prefer one blended response for a cluster of nearby Pebbles over many individual pings;
- keep resonance below the level of a deliberate Pebble drop;
- release voices naturally as the visual wave decays.

## 7. COLLECT SOUND RITUAL

COLLECT has its own sound ritual. As Pebbles disappear one by one, generate restrained harmonic/pentatonic tones with subtle variation. The tones should feel like release and clearing, not reward feedback.

Sequence:

```text
Pebbles disappear one by one
→ quiet harmonic / pentatonic tones
→ final Pebble disappears
→ ripples remain
→ long reverb tail
→ stillness
→ ambience remains
```

Requirements:

- synchronize each tone with the corresponding visual fade/removal;
- use a small scale and soft envelopes;
- vary timing, register, and tone color within a narrow range;
- apply voice limiting and a shared reverb bus;
- do not stop or restart ambience when collection begins;
- let the final reverb tail outlast the last visual Pebble while the water settles;
- respect reduced-motion/reduced-stimulation preferences where applicable.

## 8. Renoise production structure

Recommended Renoise project structure:

```text
01 Air / Noise
02 Ambient Pad
03 Low Drone
04 Water Texture
05 Ripple / Water Tap
06 Pebble Drop / Splash
07 Collect Tones
+ Reverb Bus
```

Production guidance:

- build the ambience as a sparse long-form texture first, then cut a seamless 2–4 minute base loop;
- leave headroom for interaction SFX; the ambience must not be mastered as a loud finished song;
- export the ambient loop as a web-ready stereo asset with a clean loop boundary;
- export Pebble Drop as a small set of normalized variations or separated layers if parameterized recombination is needed;
- export Ripple/Water Tap and Collect Tones as short, clearly named assets with tails preserved;
- keep source files at a high-quality working format and provide a compressed web delivery format only as a derived export;
- test every loop at the boundary, at low volume, and under repeated interaction;
- document each asset's intended gain, pitch range, and loop/tail behavior next to the export.

Suggested naming:

```text
ambient_base_loop_v01
water_friction_v01
water_impact_soft_v01
pebble_drop_small_v01
pebble_drop_medium_v01
pebble_drop_large_v01
collect_tone_01 ... collect_tone_05
```

## 9. Web Audio architecture

Do not implement the website as independent `play("sound.mp3")` calls. Use a parameter-driven audio system connected to the existing interaction state.

### Signal model

```text
TIME                 → Ambient Engine → Ambient Bus ┐
Pointer velocity     → Water Movement  → Water Bus   │
dropStrength         → Water Impact    → Water Bus   ├→ Master Gain → destination
Pebble size/velocity → Pebble Movement → Pebble Bus  │
Pebble impact        → Plop/Splash/Resonance         │
COLLECT              → Harmonic Tones → Reverb Bus ┘
```

Recommended logical modules:

- `AudioManager`: owns the `AudioContext`, unlock state, master gain, mute state, and lifecycle;
- `AmbientEngine`: loop scheduling, time interpolation, filter/gain/harmonic controls, and ambience crossfades;
- `WaterMovementVoice`: pooled filtered texture or granular voice driven by smoothed velocity;
- `WaterImpactVoice`: short impact/resonance event driven by `dropStrength`;
- `PebbleMovementVoice`: drag friction and size weighting;
- `PebbleDropVoice`: Contact → Splash → Body → Tail composite event;
- `WavePebbleResonance`: threshold, cooldown, and global voice limiter for wave contact;
- `CollectRitual`: staggered tones, timing, scale, and final reverb tail;
- `AudioBus`: gain, filtering, sends, and per-layer ceilings;
- `AudioDebugState` (development only): current unlock, mute, voice count, and smoothed parameters.

### Required audio state boundaries

The sound layer reads existing application events/state and does not own visual truth:

```text
timeOfDay / selected time → ambient parameters
audioUnlocked              → start/fade audio
audioEnabled               → mute/unmute master bus
pointer velocity           → water movement
dropStrength               → water impact
activePebble + velocity    → Pebble movement
pebble placed              → Pebble drop
wave energy + Pebble hit   → Pebble resonance
collect lifecycle          → Collect ritual
reducedMotion              → reduce/disable event density and tails
```

### Gain and voice management

- Put every layer behind a named bus and a final master gain.
- Use short attack/release envelopes to prevent clicks.
- Smooth continuous parameters before applying them to AudioParams.
- Cap event gain and total simultaneous voices.
- Use pooling or bounded allocation for repeated short voices.
- Apply a quiet default mix and tune interaction sounds relative to ambience.
- Prevent multiple effects from summing into a harsh peak; a gentle limiter may be used at the final bus.
- Keep debug logging disabled in production.

### Loop handling and performance

- Use one scheduled looping buffer or a stable procedural ambience source.
- Schedule ahead enough to avoid gaps, but do not create a timer per animation frame.
- Keep the audio graph shallow and reuse nodes where practical.
- Avoid decoding or allocating large assets during pointer movement or drop events.
- Load ambience lazily or progressively if startup cost is material.
- On visibilitychange, pause or reduce nonessential processing and resync cleanly on return.
- On devices with limited audio capability, preserve ambience and the primary drop sound while reducing granular texture, resonance voices, and tail length.

## 10. Sound control and browser behavior

Provide one minimal control:

```text
SOUND ON / OFF
```

The control should remain quiet and discoverable, without becoming a settings panel or persistent chrome.

Browser rules:

- create or resume the `AudioContext` only after the user's first intentional interaction;
- treat click, tap, keyboard confirmation, or deliberate Pebble interaction as unlock candidates;
- fade audio in after unlock instead of exposing a sudden full-volume start;
- if unlock fails, keep the visual experience fully usable and allow a later interaction to retry;
- mute by reducing the master bus to zero or a true silent state while preserving the graph for fast recovery;
- never assume audio is available merely because the page loaded;
- expose an accessible label and keyboard operation for the control;
- honor browser, OS, and user reduced-motion/reduced-stimulation preferences where available.

## Development milestones

Implementation must proceed one sound milestone at a time. After each milestone, run the website and test the sound through real interaction. Verify timing, volume, layering, browser console errors, and behavior with Sound Off before stopping for review.

### S1 — Audio Foundation / Sound On-Off

Scope:

- `AudioContext` lifecycle and first-interaction unlock;
- master gain and Sound On/Off control;
- fade in/out;
- no required music or SFX yet.

Acceptance criteria:

- audio does not attempt audible playback before intentional interaction;
- Sound Off is silent and reversible;
- failed unlock does not break the visual experience;
- no console errors or leaked audio nodes are introduced.

### S2 — Ambient + Time

Scope:

- connect a Renoise-produced ambient loop or approved placeholder;
- connect ambience parameters to the existing continuous time system;
- implement smooth DAWN/NOON/DUSK/MIDNIGHT interpolation.

Acceptance criteria:

- ambience is one continuous environment, not four songs;
- time scrubbing changes tone smoothly without restarting the loop;
- LIVE return is smooth;
- loop seams are inaudible at low and normal volume.

### S3 — Pointer × Water

Scope:

- pointer/touch velocity to subtle water friction;
- click and existing `dropStrength` to water impact/resonance;
- smoothing, gain ceiling, and idle release.

Acceptance criteria:

- slow movement is nearly silent;
- faster movement remains restrained and free of jitter;
- visual water impact and audio impact occur together;
- repeated clicks do not create uncontrolled voice growth or clipping.

### S4 — Pebble Drag + Drop

Scope:

- Pebble movement through water while held;
- Pebble size/velocity mapping;
- Contact → Splash → Body → Tail drop event;
- wave-to-Pebble resonance threshold and cooldown.

Acceptance criteria:

- holding a Pebble does not remove water sound;
- dragging sound follows the existing Pebble displacement;
- drop sound lasts approximately 0.8–1.5 seconds and remains natural;
- size and impact strength produce audible but restrained variation;
- multiple Pebbles do not create clutter when waves pass through them.

### S5 — COLLECT Sound Ritual

Scope:

- staggered restrained pentatonic/harmonic tones;
- synchronization with Pebble disappearance;
- final ripple/reverb tail and return to ambience.

Acceptance criteria:

- tones are synchronized with the visual collection sequence;
- the final tail supports stillness rather than sounding like a reward;
- ambience remains present throughout;
- the final Pebble, ripple decay, reverb, and stillness form one coherent ending.

### S6 — Final Mix / Performance / Polish

Scope:

- final gain balance, buses, limiter, pooling, lazy loading, visibility handling;
- mobile/touch behavior;
- reduced-motion/reduced-stimulation behavior;
- accessibility and console/performance review.

Acceptance criteria:

- no layer dominates the mindfulness experience;
- no audible clicks, loop seams, runaway voices, or clipping;
- Sound Off remains reliable at every state;
- performance remains stable on the target device class;
- interaction and audio remain coherent after tab visibility changes and repeated use;
- browser console is clean during the complete Thought → Pebble → Water → Ripple → COLLECT loop.

## Implementation rule

At the end of every implementation request, include:

> **Implement S# only. Do not begin the next sound milestone. Run the website and test the sound through real interaction. Verify timing, volume, layering and console errors, then STOP for my review.**

This document is specification and implementation planning only. Creating it must not modify the website or begin S1–S6.
