# Mindful Water audio assets

The website loads exactly six local audio assets from this folder:

```text
dawn.mp3          final minimal airy ambient music loop
noon.mp3          final minimal clear/open ambient music loop
dusk.mp3          final minimal warm/reflective ambient music loop
midnight.mp3      final minimal deep/spacious ambient music loop
water-move.mp3    subtle continuous movement texture
pebble-drop.mp3   refined plop → small splash → resonance
```

The four scene files and both interaction sounds are now configured from the supplied recordings. Keep the filenames unchanged when replacing them.

Current scene durations:

- The four BGM files are the final supplied MP3 versions and are used exactly as provided.

Recommended delivery:

- ambient loops: seamless stereo WAV or a browser-ready compressed derivative, approximately 2–4 minutes;
- `water-move.mp3`: 18.6-second movement loop;
- `pebble-drop.mp3`: 1.1-second one-shot with its complete tail preserved.

No ambient music is synthesized in JavaScript. The app uses native audio files and crossfades the four time loops.
