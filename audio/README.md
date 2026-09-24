# Mindful Water audio assets

The website loads exactly six local audio assets from this folder:

```text
dawn.wav          minimal airy ambient music loop
noon.wav          minimal clear/open ambient music loop
dusk.wav          minimal warm/reflective ambient music loop
midnight.wav      minimal deep/spacious ambient music loop
water-move.mp3    subtle continuous movement texture
pebble-drop.mp3   refined plop → small splash → resonance
```

The four scene files and both interaction sounds are now configured from the supplied recordings. Keep the filenames unchanged when replacing them.

Current scene durations:

- `dawn.wav`: approximately 158.7 seconds;
- `noon.wav`: approximately 59.6 seconds;
- `dusk.wav`: approximately 90.2 seconds;
- `midnight.wav`: approximately 89.7 seconds.

Recommended delivery:

- ambient loops: seamless stereo WAV or a browser-ready compressed derivative, approximately 2–4 minutes;
- `water-move.mp3`: 18.6-second movement loop;
- `pebble-drop.mp3`: 1.1-second one-shot with its complete tail preserved.

No ambient music is synthesized in JavaScript. The app uses native audio files and crossfades the four time loops.
