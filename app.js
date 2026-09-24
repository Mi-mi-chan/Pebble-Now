const canvas = document.querySelector("#pool");
const ctx = canvas.getContext("2d", { alpha: false });
const pebbleCanvas = document.querySelector("#pebble-layer");
const pebbleCtx = pebbleCanvas.getContext("2d");
const cursor = document.querySelector(".cursor-ring");
const poolShell = document.querySelector(".pool-shell");
const timeControl = document.querySelector(".time-control");
const timeReadout = document.querySelector("#time-readout");
const timeMode = document.querySelector("#time-mode");
const dialTime = document.querySelector("#dial-time");
const dialTrack = document.querySelector("#dial-track");
const backToNow = document.querySelector("#back-to-now");
const pebbleControl = document.querySelector("#pebble-control");
const collectControl = document.querySelector("#collect-control");
const thoughtEntry = document.querySelector("#thought-entry");
const thoughtInput = document.querySelector("#thought-input");
const thoughtCancel = document.querySelector("#thought-cancel");
const thoughtHint = document.querySelector("#thought-hint");
const soundControl = document.querySelector("#sound-control");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const audioState = {
  ambient: {},
  waterMove: null,
  enabled: true,
  loaded: {},
  buffers: {},
  bufferPromises: {},
  loadingPromise: null,
  context: null,
  masterGain: null,
  ambientFadeFrame: 0,
  ambientTargetName: null,
  movementFadeFrame: 0,
  movementStopTimer: null,
  lastPointerAt: 0,
  lastPointerX: 0,
  lastPointerY: 0,
  lastMovementSpeed: 0,
  lastDropAt: 0,
  activeDrops: new Set(),
  audioReady: false
};

const AUDIO_ASSETS = {
  dawn: "./audio/dawn.mp3",
  noon: "./audio/noon.mp3",
  dusk: "./audio/dusk.mp3",
  midnight: "./audio/midnight.mp3",
  waterMove: "./audio/water-move.mp3",
  pebbleDrop: "./audio/pebble-drop.mp3"
};
const AMBIENT_POINTS = [
  { minute: 0, name: "midnight" },
  { minute: 360, name: "dawn" },
  { minute: 720, name: "noon" },
  { minute: 1080, name: "dusk" },
  { minute: 1440, name: "midnight" }
];
const AMBIENT_GAIN = .25;
// Keep the movement voice clearly audible while retaining a restrained ceiling.
// The base gain also makes slow, deliberate movement perceptible instead of
// relying on a velocity value that may be close to zero on high-DPI surfaces.
const WATER_MOVE_BASE_GAIN = .99;
const WATER_MOVE_SPEED_GAIN = 0;
const WATER_MOVE_MAX_GAIN = .99;

function getAudioContext() {
  if (audioState.context) return audioState.context;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  audioState.context = new AudioContextClass();
  audioState.masterGain = audioState.context.createGain();
  audioState.masterGain.gain.value = 1;
  audioState.masterGain.connect(audioState.context.destination);
  return audioState.context;
}

function audioSourceUrl(source) {
  return new URL(source, document.baseURI).href;
}

function createAmbientAudio(name, source) {
  const audio = new Audio(audioSourceUrl(source));
  audio.preload = "metadata";
  audio.loop = true;
  audio.playsInline = true;
  audio.volume = 0;
  audio.addEventListener("canplay", () => {
    audioState.loaded[source] = true;
    if (audioState.audioReady && audioState.enabled && audioState.ambientTargetName === name) {
      const track = audioState.ambient[name];
      if (track) startTrack(track, name, false);
    }
  });
  audio.addEventListener("canplaythrough", () => {
    audioState.loaded[source] = true;
  });
  audio.addEventListener("error", () => {
    audioState.loaded[source] = false;
    console.error("[audio] failed to load ambient track", { source, error: audio.error });
  });
  return audio;
}

function loadAudioBuffer(name, source) {
  if (audioState.bufferPromises[name]) return audioState.bufferPromises[name];
  const context = getAudioContext();
  if (!context) return Promise.resolve(null);
  const url = audioSourceUrl(source);
  const promise = fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return response.arrayBuffer();
    })
    .then((data) => context.decodeAudioData(data))
    .then((buffer) => {
      audioState.buffers[name] = buffer;
      audioState.loaded[source] = true;
      return buffer;
    })
    .catch((error) => {
      audioState.loaded[source] = false;
      console.error(`[audio] failed to preload ${name}`, { url, error });
      return null;
    });
  audioState.bufferPromises[name] = promise;
  return promise;
}

function initializeAudioAssets() {
  if (audioState.loadingPromise) return audioState.loadingPromise;
  const ambientNames = ["dawn", "noon", "dusk", "midnight"];
  ambientNames.forEach((name) => {
    audioState.ambient[name] ||= {
      audio: createAmbientAudio(name, AUDIO_ASSETS[name]),
      gain: null,
      source: null,
      offset: 0,
      startedAt: 0,
      playing: false,
      volume: 0,
      fadeToken: 0
    };
  });
  audioState.waterMove ||= {
    gain: null,
    source: null,
    offset: 0,
    startedAt: 0,
    playing: false,
    volume: 0,
    fadeToken: 0
  };
  const loadNames = ["waterMove", "pebbleDrop"];
  audioState.loadingPromise = Promise.all(loadNames.map((name) => loadAudioBuffer(name, AUDIO_ASSETS[name])));
  return audioState.loadingPromise;
}

function prepareAmbientTrack(name) {
  const track = audioState.ambient[name];
  if (!track || track.prepared) return;
  track.prepared = true;
  track.audio.preload = "auto";
  track.audio.load();
}

function prepareAmbientPlayers(minutes) {
  prepareAmbientTrack(ambientTrackForTime(minutes));
}

function ensureTrackGain(track) {
  if (!track || track.gain) return track?.gain;
  const context = getAudioContext();
  if (!context || !audioState.masterGain) return null;
  track.gain = context.createGain();
  track.gain.gain.value = track.volume;
  track.gain.connect(audioState.masterGain);
  return track.gain;
}

function startTrack(track, name, primary = true) {
  if (track?.audio) {
    if (!audioState.audioReady || !track.audio.paused) return;
    if (primary) prepareAmbientTrack(name);
    if (!primary && track.audio.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    track.playRequested = true;
    track.audio.play().then(() => {
      track.playing = true;
    }).catch((error) => {
      track.playing = false;
      console.warn("[audio] ambient playback rejected", { name, error });
    });
    return;
  }
  const context = getAudioContext();
  const buffer = audioState.buffers[name];
  if (!context || !buffer || !audioState.audioReady || track.playing) return;
  const gain = ensureTrackGain(track);
  if (!gain) return;
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(gain);
  const offset = buffer.duration ? track.offset % buffer.duration : 0;
  source.start(0, offset);
  track.source = source;
  track.startedAt = context.currentTime - offset;
  track.playing = true;
  source.onended = () => {
    if (track.source === source) {
      track.source = null;
      track.playing = false;
    }
  };
}

function stopTrack(track, reset = false) {
  if (track?.audio) {
    track.audio.pause();
    track.playRequested = false;
    if (reset) track.audio.currentTime = 0;
    track.playing = false;
    return;
  }
  const context = getAudioContext();
  if (!track) return;
  if (track.playing && context && track.source) {
    const duration = track.source.buffer?.duration || 0;
    track.offset = reset || !duration ? 0 : (context.currentTime - track.startedAt) % duration;
    track.source.onended = null;
    try { track.source.stop(); } catch {}
    track.source.disconnect();
  } else if (reset) {
    track.offset = 0;
  }
  track.source = null;
  track.playing = false;
}

function fadeAudio(track, target, duration = 420, onComplete) {
  if (!track) return;
  if (track.audio) {
    const fadeToken = ++track.fadeToken;
    const start = track.audio.volume;
    const startedAt = performance.now();
    const step = () => {
      if (track.fadeToken !== fadeToken) return;
      const progress = Math.min(1, (performance.now() - startedAt) / duration);
      track.audio.volume = start + (target - start) * (progress * progress * (3 - 2 * progress));
      track.volume = track.audio.volume;
      if (progress < 1) requestAnimationFrame(step);
      else if (onComplete) onComplete();
    };
    requestAnimationFrame(step);
    return;
  }
  const gain = ensureTrackGain(track);
  const context = getAudioContext();
  if (!gain || !context) return;
  const fadeToken = ++track.fadeToken;
  const start = track.volume;
  const endTime = context.currentTime + duration / 1000;
  gain.gain.cancelScheduledValues(context.currentTime);
  gain.gain.setValueAtTime(start, context.currentTime);
  gain.gain.linearRampToValueAtTime(target, endTime);
  track.volume = target;
  const startedAt = performance.now();
  const step = () => {
    if (track.fadeToken !== fadeToken) return;
    const progress = Math.min(1, (performance.now() - startedAt) / duration);
    if (progress < 1) requestAnimationFrame(step);
    else if (onComplete) onComplete();
  };
  requestAnimationFrame(step);
}

function playBuffer(name, volume = 1, playbackRate = 1) {
  const context = getAudioContext();
  const buffer = audioState.buffers[name];
  if (!context || !buffer || !audioState.audioReady || !audioState.enabled) return;
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  source.playbackRate.value = playbackRate;
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(audioState.masterGain);
  audioState.activeDrops.add(source);
  source.addEventListener("ended", () => {
    audioState.activeDrops.delete(source);
    source.disconnect();
    gain.disconnect();
  }, { once: true });
  source.start(0);
}

function ambientTrackForTime(minutes) {
  const value = ((minutes % 1440) + 1440) % 1440;
  for (let index = 0; index < AMBIENT_POINTS.length - 1; index++) {
    if (value < AMBIENT_POINTS[index + 1].minute) return AMBIENT_POINTS[index].name;
  }
  return AMBIENT_POINTS[0].name;
}

function updateAmbientForTime(minutes, immediate = false) {
  initializeAudioAssets();
  if (audioState.audioReady) prepareAmbientPlayers(minutes);
  const targetName = audioState.enabled ? ambientTrackForTime(minutes) : null;
  const targetTrack = targetName ? audioState.ambient[targetName] : null;
  const targetChanged = targetName !== audioState.ambientTargetName;
  const targetNeedsRestart = targetTrack?.audio && targetTrack.audio.paused;
  if (!immediate && !targetChanged && !targetNeedsRestart) return;
  audioState.ambientTargetName = targetName;
  const fadeId = ++audioState.ambientFadeFrame;
  Object.entries(audioState.ambient).forEach(([name, track]) => {
    const target = name === targetName ? AMBIENT_GAIN : 0;
    if (target > 0) startTrack(track, name, true);
    const duration = immediate || reducedMotion ? 20 : 850;
    fadeAudio(track, target, duration, () => {
      if (fadeId !== audioState.ambientFadeFrame) return;
      if (target === 0) stopTrack(track);
    });
  });
}

function setWaterMovement(velocityX, velocityY, active = true) {
  initializeAudioAssets();
  const speed = Math.min(1, Math.hypot(velocityX, velocityY) / 42);
  audioState.lastMovementSpeed = speed;
  const water = audioState.waterMove;
  if (!water) return;
  if (audioState.movementStopTimer) {
    clearTimeout(audioState.movementStopTimer);
    audioState.movementStopTimer = null;
  }
  // Do not gate playback on a fragile threshold. Pointer and Pebble movement
  // both arrive here, but their pixel-to-simulation scales are different.
  const target = active && speed > 0 ? Math.min(WATER_MOVE_MAX_GAIN, WATER_MOVE_BASE_GAIN + speed * WATER_MOVE_SPEED_GAIN) : 0;
  if (target > 0) startTrack(water, "waterMove");
  const fadeId = ++audioState.movementFadeFrame;
  fadeAudio(water, target, active ? 90 : 160, () => {
    if (fadeId !== audioState.movementFadeFrame || target > 0) return;
    audioState.movementStopTimer = setTimeout(() => {
      stopTrack(water);
    }, 90);
  });
}

function pulseWaterMovement() {
  initializeAudioAssets();
  const water = audioState.waterMove;
  if (!water) return;
  if (audioState.movementStopTimer) {
    clearTimeout(audioState.movementStopTimer);
    audioState.movementStopTimer = null;
  }
  const fadeId = ++audioState.movementFadeFrame;
  const target = WATER_MOVE_BASE_GAIN;
  startTrack(water, "waterMove");
  fadeAudio(water, target, 35);
  audioState.movementStopTimer = setTimeout(() => {
    if (fadeId !== audioState.movementFadeFrame) return;
    fadeAudio(water, 0, 180, () => {
      if (fadeId === audioState.movementFadeFrame) stopTrack(water);
    });
  }, 220);
}

function playPebbleDrop(scale = 1) {
  const now = performance.now();
  if (now - audioState.lastDropAt < 160) return;
  audioState.lastDropAt = now;
  playBuffer(
    "pebbleDrop",
    Math.max(.2, Math.min(.7, .44 + scale * .12)),
    Math.max(.92, Math.min(1.08, .98 + (scale - 1) * .08))
  );
}

function unlockAudio() {
  initializeAudioAssets();
  const context = getAudioContext();
  if (!context) return false;
  context.resume().catch((error) => console.warn("[audio] resume rejected", error));
  audioState.audioReady = true;
  prepareAmbientPlayers(selectedMinutes);
  audioState.loadingPromise?.then(() => {
    if (audioState.audioReady && audioState.enabled) updateAmbientForTime(selectedMinutes, true);
  });
  return true;
}

function updateSoundControl() {
  soundControl.setAttribute("aria-pressed", String(audioState.enabled));
  soundControl.textContent = audioState.enabled ? "SOUND OFF" : "SOUND ON";
}

function setSoundEnabled(enabled) {
  if (enabled && !unlockAudio()) return;
  audioState.enabled = Boolean(enabled);
  updateSoundControl();
  if (!audioState.enabled) {
    audioState.ambientFadeFrame += 1;
    audioState.ambientTargetName = null;
    Object.values(audioState.ambient).forEach((track) => {
      stopTrack(track);
      track.volume = 0;
      if (track.audio) track.audio.volume = 0;
      if (track.gain) track.gain.gain.value = 0;
    });
    return;
  }
  updateAmbientForTime(selectedMinutes, true);
}

function handleFirstAudioInteraction() {
  unlockAudio();
  if (audioState.enabled) updateAmbientForTime(selectedMinutes, true);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    Object.values(audioState.ambient).forEach((track) => stopTrack(track));
    if (audioState.waterMove) stopTrack(audioState.waterMove);
  } else if (audioState.enabled) {
    updateAmbientForTime(selectedMinutes, true);
  }
});

// Preload only the short SFX buffers while the page is idle. Long BGM tracks
// stay as native streaming players until the first intentional interaction.
initializeAudioAssets();

let W = 0, H = 0;
let manualTime = false, selectedMinutes = 0, draggingTime = false, lastDragY = 0;
let wheelOpen = false, timeVelocity = 0, lastTimeFrame = 0, lastInputAt = 0, lastCrossedTick = null;
let welcomeVisible = true;
let entryState = "idle", activePebble = null;
let dropState = null, impactState = null, collectState = null;
const pebbles = [];
const fadingPebbles = [];
const pointer = { down: false, moved: false, lastX: -Infinity, lastY: -Infinity, clientX: 0, clientY: 0 };
const GARDEN_STORAGE_KEY = "mindful-water-thought-garden-v1";
const PEBBLE_VISUAL_SCALE = 1.22;

const atmosphereAnchors = [
  { minute: 0,    color: [92, 111, 128],  ambient: .64, caustics: .4,  highlight: .26, angle: -.28 },
  { minute: 360,  color: [206, 223, 225], ambient: .98, caustics: .74, highlight: .56, angle: .18 },
  { minute: 720,  color: [222, 229, 225], ambient: 1.02, caustics: .86, highlight: .64, angle: .62 },
  { minute: 1080, color: [220, 216, 208], ambient: .96, caustics: .62, highlight: .52, angle: 1.02 },
  { minute: 1440, color: [92, 111, 128],  ambient: .64, caustics: .4,  highlight: .26, angle: -.28 }
];
let atmosphere = atmosphereAnchors[0];

function interpolateAtmosphere(minutes) {
  const value = ((minutes % 1440) + 1440) % 1440;
  let from = atmosphereAnchors[0], to = atmosphereAnchors[1];
  for (let i = 0; i < atmosphereAnchors.length - 1; i++) {
    if (value >= atmosphereAnchors[i].minute && value <= atmosphereAnchors[i + 1].minute) {
      from = atmosphereAnchors[i]; to = atmosphereAnchors[i + 1]; break;
    }
  }
  const range = to.minute - from.minute || 1;
  const t = (value - from.minute) / range;
  const smooth = t * t * (3 - 2 * t);
  return {
    color: from.color.map((channel, index) => channel + (to.color[index] - channel) * smooth),
    ambient: from.ambient + (to.ambient - from.ambient) * smooth,
    caustics: from.caustics + (to.caustics - from.caustics) * smooth,
    highlight: from.highlight + (to.highlight - from.highlight) * smooth,
    angle: from.angle + (to.angle - from.angle) * smooth
  };
}

function liveMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
}
function formatTime(minutes) {
  const total = Math.round(minutes) % 1440, h24 = Math.floor(total / 60), mins = total % 60;
  const suffix = h24 >= 12 ? "p.m." : "a.m.", h12 = h24 % 12 || 12;
  return `${h12}:${String(mins).padStart(2, "0")} ${suffix}`;
}
function updateTimeUI() {
  if (!manualTime) selectedMinutes = liveMinutes();
  atmosphere = interpolateAtmosphere(selectedMinutes);
  updateAmbientForTime(selectedMinutes);
  poolShell.style.setProperty("--atmosphere-rgb", atmosphere.color.join(", "));
  poolShell.style.setProperty("--atmosphere-highlight", atmosphere.highlight.toFixed(3));
  timeReadout.textContent = formatTime(selectedMinutes);
  dialTime.textContent = formatTime(selectedMinutes).replace(/ [ap]\.m\.$/, "");
  timeMode.textContent = manualTime ? "MANUAL" : "LIVE";
  updateTimelinePosition();
}
function setManual(minutes) { manualTime = true; selectedMinutes = (minutes + 1440) % 1440; updateTimeUI(); }
function dismissWelcome() {
  if (!welcomeVisible) return false;
  welcomeVisible = false; poolShell.classList.add("welcome-dismissed"); return true;
}

function worldFromClient(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.max(.04, Math.min(.96, (clientX - rect.left) / rect.width)),
    y: Math.max(.06, Math.min(.94, (clientY - rect.top) / rect.height))
  };
}
function hashSeed(seed) {
  let value = seed | 0;
  return () => {
    value = (value * 1664525 + 1013904223) | 0;
    return (value >>> 0) / 4294967296;
  };
}
function makePebble(thought) {
  const seed = Math.floor(Math.random() * 2147483647);
  const random = hashSeed(seed);
  return {
    id: `pebble-${Date.now()}-${seed}`,
    thought,
    seed,
    position: { x: .5, y: .5 },
    rotation: (random() - .5) * .42,
    scale: .86 + random() * .28,
    materialVariant: Math.floor(random() * 4),
    shapeParameters: Array.from({ length: 9 }, () => .88 + random() * .2),
    collisionRadius: .035 + random() * .012
  };
}
function pebblePalette(variant) {
  return [
    [187, 181, 169], [201, 194, 181], [174, 177, 169], [211, 201, 184]
  ][variant % 4];
}
function wrapPebbleText(context, text, maxWidth) {
  const words = text.match(/\S+\s*/g) || [];
  const lines = [];
  let line = "";
  for (const token of words) {
    const candidate = `${line}${token}`.trimEnd();
    if (context.measureText(candidate).width <= maxWidth) {
      line = `${line}${token}`;
      continue;
    }
    if (line.trim()) lines.push(line.trim());
    line = "";
    if (context.measureText(token.trim()).width <= maxWidth) {
      line = token;
      continue;
    }
    for (const character of Array.from(token.trim())) {
      const characterCandidate = `${line}${character}`;
      if (context.measureText(characterCandidate).width <= maxWidth || !line) line = characterCandidate;
      else { lines.push(line.trim()); line = character; }
    }
    if (/\s$/.test(token)) line += " ";
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}
function fitPebbleText(context, text, size) {
  const maxWidth = size * .82;
  const maxHeight = size * .5;
  const maximumFontSize = Math.max(16, Math.min(29, size * .19));
  const preferredMinimumFontSize = Math.max(11, Math.min(15, size * .1));
  const absoluteMinimumFontSize = 8;
  for (let fontSize = maximumFontSize; fontSize >= preferredMinimumFontSize; fontSize -= 1) {
    context.font = `${fontSize}px "Bradley Hand", "Segoe Print", "Comic Sans MS", cursive`;
    const lines = wrapPebbleText(context, text, maxWidth);
    const lineHeight = fontSize * 1.18;
    if (lines.length * lineHeight <= maxHeight) return { lines, fontSize, lineHeight, maxWidth, maxHeight };
  }
  for (let fontSize = preferredMinimumFontSize - 1; fontSize >= absoluteMinimumFontSize; fontSize -= 1) {
    context.font = `${fontSize}px "Bradley Hand", "Segoe Print", "Comic Sans MS", cursive`;
    const lines = wrapPebbleText(context, text, maxWidth);
    const lineHeight = fontSize * 1.18;
    if (lines.length * lineHeight <= maxHeight) return { lines, fontSize, lineHeight, maxWidth, maxHeight };
  }
  context.font = `${absoluteMinimumFontSize}px "Bradley Hand", "Segoe Print", "Comic Sans MS", cursive`;
  return {
    lines: wrapPebbleText(context, text, maxWidth),
    fontSize: absoluteMinimumFontSize,
    lineHeight: absoluteMinimumFontSize * 1.18,
    maxWidth,
    maxHeight
  };
}
function tracePebbleShape(context, size, shape) {
  const points = shape.map((amount, index) => {
    const angle = -Math.PI / 2 + (index / shape.length) * Math.PI * 2;
    const radius = size * amount * (index % 2 ? .58 : .67);
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
  context.beginPath();
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    const midpoint = { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 };
    if (index === 0) context.moveTo(midpoint.x, midpoint.y);
    context.quadraticCurveTo(point.x, point.y, midpoint.x, midpoint.y);
  });
  context.closePath();
}
function pebbleLightColor(base, atmosphereColor, lift) {
  return base.map((channel, index) => Math.max(0, Math.min(255,
    channel * .58 + atmosphereColor[index] * .22 + lift[index]
  )));
}
function drawOnePebble(pebble, isActive = false) {
  const x = pebble.position.x * W;
  const y = pebble.position.y * H;
  // Visual scale only: the simulation mask and all Pebble physics retain the
  // established physical size.
  const size = Math.max(66, Math.min(W, H) * .16) * pebble.scale * PEBBLE_VISUAL_SCALE;
  const shape = pebble.shapeParameters;
  const base = pebblePalette(pebble.materialVariant);
  const lightDirection = { x: Math.cos(atmosphere.angle), y: Math.sin(atmosphere.angle) };
  const lightLift = [
    22 + atmosphere.highlight * 18,
    20 + atmosphere.highlight * 16,
    16 + atmosphere.highlight * 12
  ];
  const lit = pebbleLightColor(base, atmosphere.color, lightLift);
  const [r, g, b] = lit;
  pebbleCtx.save();
  pebbleCtx.translate(x, y);
  pebbleCtx.rotate(pebble.rotation);
  pebbleCtx.scale(1, .62);

  // Keep the stone graphic flat: a quiet paper-like base, no floating shadow.
  const gradient = pebbleCtx.createLinearGradient(-size * .7, -size * .7, size * .72, size * .72);
  gradient.addColorStop(0, `rgb(${Math.min(255, r + 13)}, ${Math.min(255, g + 13)}, ${Math.min(255, b + 13)})`);
  gradient.addColorStop(.52, `rgb(${r}, ${g}, ${b})`);
  gradient.addColorStop(1, `rgb(${Math.max(0, r - 18)}, ${Math.max(0, g - 18)}, ${Math.max(0, b - 16)})`);
  const opacity = pebble.fadeOpacity == null ? 1 : pebble.fadeOpacity;
  pebbleCtx.globalAlpha = (isActive ? .78 : .96) * opacity;
  pebbleCtx.fillStyle = gradient;
  pebbleCtx.filter = "none";
  tracePebbleShape(pebbleCtx, size, shape); pebbleCtx.fill();

  // One restrained collage facet gives the stones their cut-paper character.
  pebbleCtx.save();
  pebbleCtx.clip();
  pebbleCtx.globalAlpha = (isActive ? .1 : .14) * opacity;
  pebbleCtx.fillStyle = `rgb(${Math.max(0, r - 46)}, ${Math.max(0, g - 43)}, ${Math.max(0, b - 36)})`;
  pebbleCtx.beginPath();
  pebbleCtx.moveTo(-size, size * .36); pebbleCtx.lineTo(-size * .05, -size); pebbleCtx.lineTo(size, -size * .2); pebbleCtx.lineTo(size, size); pebbleCtx.lineTo(-size, size); pebbleCtx.closePath(); pebbleCtx.fill();
  pebbleCtx.restore();

  // Wet/contact edge: it hugs the silhouette and is intentionally shallow.
  pebbleCtx.globalAlpha = (isActive ? .24 : .34) * opacity;
  pebbleCtx.strokeStyle = `rgba(${Math.min(255, atmosphere.color[0] + 18)}, ${Math.min(255, atmosphere.color[1] + 18)}, ${Math.min(255, atmosphere.color[2] + 16)}, .72)`;
  pebbleCtx.lineWidth = Math.max(1, size * .012);
  tracePebbleShape(pebbleCtx, size * .988, shape); pebbleCtx.stroke();

  const textureRandom = hashSeed(pebble.seed + 17);
  pebbleCtx.globalAlpha = (isActive ? .2 : .27) * opacity;
  for (let i = 0; i < 30; i++) {
    const speckX = (textureRandom() - .5) * size * 1.05;
    const speckY = (textureRandom() - .5) * size * .56;
    const speckSize = .45 + textureRandom() * 1.35;
    pebbleCtx.fillStyle = `rgba(76, 72, 64, ${.1 + textureRandom() * .14})`;
    pebbleCtx.beginPath(); pebbleCtx.arc(speckX, speckY, speckSize, 0, Math.PI * 2); pebbleCtx.fill();
  }

  pebbleCtx.globalAlpha = (isActive ? .76 : .9) * opacity;
  pebbleCtx.fillStyle = "rgba(55, 57, 53, .78)";
  pebbleCtx.textAlign = "center"; pebbleCtx.textBaseline = "middle";
  const textLayout = fitPebbleText(pebbleCtx, pebble.thought, size);
  pebbleCtx.font = `${textLayout.fontSize}px "Bradley Hand", "Segoe Print", "Comic Sans MS", cursive`;
  pebbleCtx.save();
  tracePebbleShape(pebbleCtx, size * .78, shape);
  pebbleCtx.clip();
  const { lines, lineHeight } = textLayout;
  lines.forEach((line, index) => {
    pebbleCtx.save();
    pebbleCtx.rotate((index % 2 ? -.018 : .012));
    pebbleCtx.fillText(line, 0, (index - (lines.length - 1) / 2) * lineHeight, textLayout.maxWidth);
    pebbleCtx.restore();
  });
  pebbleCtx.restore();
  pebbleCtx.restore();
}
function drawPebbles() {
  pebbleCtx.clearRect(0, 0, W, H);
  pebbles.forEach((pebble) => drawOnePebble(pebble));
  fadingPebbles.forEach((pebble) => drawOnePebble(pebble));
  if (dropState) {
    const progress = Math.max(0, Math.min(1, (performance.now() - dropState.startedAt) / DROP_DURATION));
    // Smooth both ends of the fall so the hand-off into the impact does not
    // feel like an instantaneous snap.
    const eased = progress * progress * (3 - 2 * progress);
    const fallingPebble = {
      ...dropState.pebble,
      position: {
        x: dropState.pebble.position.x,
        y: dropState.fromY + (dropState.pebble.position.y - dropState.fromY) * eased
      },
      rotation: dropState.pebble.rotation - (1 - eased) * .08,
      scale: dropState.pebble.scale * (1 + (1 - eased) * .05)
    };
    drawOnePebble(fallingPebble, true);
  }
  if (activePebble) drawOnePebble(activePebble, true);
  drawSplashCrownOverlay();
}
function drawSplashCrownOverlay() {
  if (!impactState) return;
  const age = performance.now() - impactState.startedAt;
  const duration = 520;
  if (age >= duration) return;
  const t = age / duration;
  const rise = Math.min(1, t * 5);
  const fade = 1 - t;
  const rx = impactState.pebbleRadius * (1.02 + rise * .1);
  const ry = impactState.pebbleRadius * (.46 + rise * .08);
  pebbleCtx.save();
  pebbleCtx.translate(impactState.x, impactState.y);
  pebbleCtx.rotate(impactState.rotation || 0);
  pebbleCtx.globalAlpha = .68 * fade;
  pebbleCtx.strokeStyle = "rgba(241, 250, 249, .92)";
  pebbleCtx.lineWidth = Math.max(1.2, Math.min(W, H) * .0028);
  for (let i = 0; i < 9; i++) {
    const start = -Math.PI * .86 + (i / 8) * Math.PI * 1.72;
    const end = start + Math.PI * (.1 + rise * .055);
    pebbleCtx.beginPath();
    pebbleCtx.ellipse(0, 0, rx, ry, 0, start, end);
    pebbleCtx.stroke();
    if (i % 2 === 0) {
      const dropletX = Math.cos(end) * rx * 1.03;
      const dropletY = Math.sin(end) * ry * (1.06 + rise * .2);
      pebbleCtx.beginPath();
      pebbleCtx.arc(dropletX, dropletY, Math.max(1.2, rx * .022), 0, Math.PI * 2);
      pebbleCtx.fillStyle = pebbleCtx.strokeStyle;
      pebbleCtx.fill();
    }
  }
  pebbleCtx.restore();
}
function updateCarriedPebble(clientX, clientY) {
  if (!activePebble) return;
  activePebble.position = worldFromClient(clientX, clientY);
}
function openThoughtEntry() {
  if (wheelOpen) closeTimeWheel();
  dismissWelcome();
  entryState = "writing";
  pebbleControl.setAttribute("aria-pressed", "true");
  thoughtEntry.hidden = false;
  thoughtEntry.classList.remove("has-error");
  thoughtHint.textContent = "A short thought, held gently.";
  thoughtInput.value = "";
  requestAnimationFrame(() => thoughtInput.focus());
}
function cancelThought() {
  entryState = "idle";
  activePebble = null;
  thoughtEntry.hidden = true;
  thoughtEntry.classList.remove("has-error");
  pebbleControl.setAttribute("aria-pressed", "false");
  drawPebbles();
}
function beginCarrying(thought) {
  activePebble = makePebble(thought);
  activePebble.position = worldFromClient(pointer.clientX || W / 2, pointer.clientY || H / 2);
  entryState = "carrying";
  thoughtEntry.hidden = true;
  pebbleControl.setAttribute("aria-pressed", "true");
  drawPebbles();
}
function placeCarriedPebble(clientX, clientY) {
  if (!activePebble) return;
  updateCarriedPebble(clientX, clientY);
  const pebble = { ...activePebble, position: { ...activePebble.position }, placedAt: Date.now() };
  activePebble = null;
  entryState = "idle";
  pebbleControl.setAttribute("aria-pressed", "false");
  dropState = {
    pebble,
    clientX,
    clientY,
    startedAt: performance.now(),
    fromY: Math.max(.04, pebble.position.y - .09)
  };
  drawPebbles();
}

function gardenSnapshot() {
  return pebbles.map((pebble) => ({
    id: pebble.id,
    thought: pebble.thought,
    seed: pebble.seed,
    position: { ...pebble.position },
    rotation: pebble.rotation,
    scale: pebble.scale,
    materialVariant: pebble.materialVariant,
    shapeParameters: [...pebble.shapeParameters],
    collisionRadius: pebble.collisionRadius,
    placedAt: pebble.placedAt
  }));
}
function persistGarden() {
  try {
    if (pebbles.length) localStorage.setItem(GARDEN_STORAGE_KEY, JSON.stringify(gardenSnapshot()));
    else localStorage.removeItem(GARDEN_STORAGE_KEY);
  } catch (error) {
    // Storage can be unavailable in private or embedded browsing contexts.
  }
}
function restoreGarden() {
  try {
    const saved = JSON.parse(localStorage.getItem(GARDEN_STORAGE_KEY) || "[]");
    if (!Array.isArray(saved)) return;
    saved.forEach((pebble) => {
      if (!pebble || typeof pebble.thought !== "string" || !pebble.position || !Array.isArray(pebble.shapeParameters)) return;
      const restored = {
        id: typeof pebble.id === "string" ? pebble.id : `pebble-restored-${Date.now()}-${pebbles.length}`,
        thought: pebble.thought.slice(0, 80),
        seed: Number.isFinite(pebble.seed) ? pebble.seed : Math.floor(Math.random() * 2147483647),
        position: {
          x: Math.max(.04, Math.min(.96, Number(pebble.position.x) || .5)),
          y: Math.max(.06, Math.min(.94, Number(pebble.position.y) || .5))
        },
        rotation: Number.isFinite(pebble.rotation) ? pebble.rotation : 0,
        scale: Number.isFinite(pebble.scale) ? Math.max(.7, Math.min(1.4, pebble.scale)) : 1,
        materialVariant: Number.isFinite(pebble.materialVariant) ? pebble.materialVariant : 0,
        shapeParameters: pebble.shapeParameters.slice(0, 12).map((value) => Number.isFinite(value) ? Math.max(.7, Math.min(1.2, value)) : 1),
        collisionRadius: Number.isFinite(pebble.collisionRadius) ? pebble.collisionRadius : .04,
        placedAt: Number.isFinite(pebble.placedAt) ? pebble.placedAt : Date.now()
      };
      if (restored.shapeParameters.length >= 5) pebbles.push(restored);
    });
  } catch (error) {
    try { localStorage.removeItem(GARDEN_STORAGE_KEY); } catch (ignored) { /* unavailable */ }
  }
}
function updateCollectControl() {
  collectControl.hidden = pebbles.length === 0 && fadingPebbles.length === 0;
  collectControl.disabled = Boolean(collectState);
}
thoughtEntry.addEventListener("submit", (event) => {
  event.preventDefault();
  const thought = thoughtInput.value.trim();
  if (!thought || thought.length > 80) {
    thoughtEntry.classList.add("has-error");
    thoughtHint.textContent = thought ? "Keep this thought to 80 characters." : "Give the thought a few words first.";
    thoughtInput.focus();
    return;
  }
  beginCarrying(thought);
});
thoughtCancel.addEventListener("click", cancelThought);
pebbleControl.addEventListener("click", (event) => { event.stopPropagation(); openThoughtEntry(); });
soundControl.addEventListener("click", (event) => {
  event.stopPropagation();
  setSoundEnabled(!audioState.enabled);
});
collectControl.addEventListener("click", (event) => {
  event.stopPropagation();
  if (collectState || !pebbles.length) return;
  dismissWelcome();
  collectState = { nextAt: performance.now(), index: 0 };
  collectControl.setAttribute("aria-pressed", "true");
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && entryState !== "idle") { event.preventDefault(); cancelThought(); return; }
  if (entryState === "carrying" && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault(); placeCarriedPebble(pointer.clientX || W / 2, pointer.clientY || H / 2);
  }
});
function openTimeWheel() { wheelOpen = true; poolShell.classList.add("dial-visible"); timeDial.setAttribute("aria-hidden", "false"); updateTimelinePosition(); }
function closeTimeWheel() { wheelOpen = false; poolShell.classList.remove("dial-visible"); timeDial.setAttribute("aria-hidden", "true"); }
const timeTimeline = document.querySelector("#time-timeline");
const timeDial = document.querySelector(".time-dial");
const timeTicks = [];
for (let i = 0; i <= 288; i++) {
  const tick = document.createElement("i");
  tick.className = `dial-tick${i % 12 === 0 ? " major" : ""}`;
  tick.style.top = `${(i / 288) * 100}%`;
  dialTrack.appendChild(tick); timeTicks.push(tick);
}
function updateTimelinePosition() {
  const h = timeDial.clientHeight || window.innerHeight * .62;
  timeTimeline.style.setProperty("--timeline-offset", `${h * 1.5 - (selectedMinutes / 1440) * h * 3}px`);
  const active = selectedMinutes / 5;
  timeTicks.forEach((tick, index) => {
    const distance = Math.abs(index - active), circularDistance = Math.min(distance, 288 - distance);
    const proximity = Math.max(0, 1 - circularDistance / 16);
    tick.style.opacity = `${.18 + proximity * .72}`;
    tick.style.width = `${10 + proximity * 24}px`;
  });
}
function nudgeTime(deltaPixels) { setManual(selectedMinutes + deltaPixels * (60 / 72)); lastInputAt = performance.now(); triggerDetent(); }
function triggerDetent() {
  const tick = Math.round(selectedMinutes / 5);
  if (tick === lastCrossedTick) return;
  lastCrossedTick = tick;
  dialTrack.classList.remove("detent"); void dialTrack.offsetWidth; dialTrack.classList.add("detent");
}
function animateTimeWheel(now) {
  if (!lastTimeFrame) lastTimeFrame = now;
  const dt = Math.min((now - lastTimeFrame) / 1000, .05); lastTimeFrame = now;
  if (Math.abs(timeVelocity) > .01) {
    nudgeTime(timeVelocity * dt); timeVelocity *= Math.pow(.89, dt * 60);
  } else if (manualTime && now - lastInputAt > 140) {
    const snapped = Math.round(selectedMinutes / 5) * 5;
    const delta = ((snapped - selectedMinutes + 720) % 1440) - 720;
    if (Math.abs(delta) > .02) setManual(selectedMinutes + delta * Math.min(1, dt * 8));
    else selectedMinutes = (snapped + 1440) % 1440;
  }
  updateTimelinePosition(); requestAnimationFrame(animateTimeWheel);
}
timeControl.addEventListener("click", () => { if (wheelOpen) closeTimeWheel(); else openTimeWheel(); });
backToNow.addEventListener("click", (event) => {
  event.stopPropagation(); manualTime = false; selectedMinutes = liveMinutes(); timeVelocity = 0; updateTimeUI(); openTimeWheel();
});
timeDial.addEventListener("wheel", (event) => {
  event.preventDefault(); openTimeWheel(); timeVelocity += Math.max(-900, Math.min(900, event.deltaY * .65));
  lastInputAt = performance.now(); manualTime = true;
}, { passive: false });
dialTrack.addEventListener("pointerdown", (event) => { draggingTime = true; lastDragY = event.clientY; dialTrack.setPointerCapture(event.pointerId); setManual(selectedMinutes); });
dialTrack.addEventListener("pointermove", (event) => { if (!draggingTime) return; const delta = lastDragY - event.clientY; lastDragY = event.clientY; nudgeTime(delta); });
dialTrack.addEventListener("pointerup", (event) => { draggingTime = false; dialTrack.releasePointerCapture(event.pointerId); });
document.addEventListener("pointerdown", (event) => { if (!wheelOpen || timeDial.contains(event.target) || timeControl.contains(event.target)) return; closeTimeWheel(); }, { capture: true });
document.addEventListener("click", dismissWelcome, { capture: true });
setInterval(() => { if (!manualTime) updateTimeUI(); }, 1000);
document.addEventListener("pointerdown", handleFirstAudioInteraction, { capture: true, once: true, passive: true });
document.addEventListener("keydown", handleFirstAudioInteraction, { capture: true, once: true });
soundControl.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") handleFirstAudioInteraction();
});
updateSoundControl();
updateTimeUI(); requestAnimationFrame(animateTimeWheel);

// Alexander Smith's Pool reference: a quarter-resolution two-buffer height field.
const SCALE = 4;
const DAMPING = .99;
const DROP_DURATION = 250;
const IMPACT_LIFETIME = 4200;
const COLLECT_INTERVAL = 620;
const COLLECT_FADE_DURATION = 420;
const DROP_STRENGTH = 340;
const DROP_RADIUS = 3;
const POINTER_PRESS_STRENGTH = 760;
const POINTER_PRESS_RADIUS = 4;
const PEBBLE_DROP_STRENGTH = 1200;
const PEBBLE_DROP_RADIUS = 7;
const PEBBLE_BOUNDARY_STRENGTH = 550;
const PEBBLE_REBOUND_STRENGTH = 300;
const PEBBLE_WAVE_STRENGTH = 160;
const HOVER_DROP_STRENGTH = 180;
const HOVER_DROP_RADIUS = 3;
const HOVER_STEP = 2.5;
const BASE_LEVEL = 232;
const SLOPE_GAIN = 1.7;
const STEP = 1000 / 60;
const offscreen = document.createElement("canvas");
const offscreenContext = offscreen.getContext("2d", { alpha: false });
const obstacleCanvas = document.createElement("canvas");
const obstacleContext = obstacleCanvas.getContext("2d", { willReadFrequently: true });
const movingPebbleCanvas = document.createElement("canvas");
const movingPebbleContext = movingPebbleCanvas.getContext("2d", { willReadFrequently: true });
let simW = 0, simH = 0, current = new Float32Array(0), previous = new Float32Array(0);
let obstacleMask = new Uint8Array(0);
let movingPebbleMask = new Uint8Array(0);
let imageData;

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  W = Math.max(1, Math.floor(rect.width * dpr)); H = Math.max(1, Math.floor(rect.height * dpr));
  canvas.width = W; canvas.height = H;
  pebbleCanvas.width = W; pebbleCanvas.height = H;
  simW = Math.max(3, Math.floor(W / SCALE)); simH = Math.max(3, Math.floor(H / SCALE));
  offscreen.width = simW; offscreen.height = simH;
  obstacleCanvas.width = simW; obstacleCanvas.height = simH;
  movingPebbleCanvas.width = simW; movingPebbleCanvas.height = simH;
  current = new Float32Array(simW * simH); previous = new Float32Array(simW * simH);
  obstacleMask = new Uint8Array(simW * simH);
  movingPebbleMask = new Uint8Array(simW * simH);
  imageData = offscreenContext.createImageData(simW, simH);
  rebuildObstacleMask();
  drawSurface();
  drawPebbles();
}
function rebuildObstacleMask() {
  if (!simW || !simH) return;
  obstacleContext.clearRect(0, 0, simW, simH);
  obstacleContext.fillStyle = "#fff";
  for (const pebble of pebbles) {
    const size = Math.max(66, Math.min(W, H) * .16) * pebble.scale;
    obstacleContext.save();
    obstacleContext.translate(pebble.position.x * simW, pebble.position.y * simH);
    obstacleContext.rotate(pebble.rotation);
    obstacleContext.scale(1, .62);
    tracePebbleShape(obstacleContext, size / SCALE, pebble.shapeParameters);
    obstacleContext.fill();
    obstacleContext.restore();
  }
  const maskPixels = obstacleContext.getImageData(0, 0, simW, simH).data;
  for (let i = 0; i < obstacleMask.length; i++) obstacleMask[i] = maskPixels[i * 4] > 20 ? 1 : 0;
}
function injectDrop(clientX, clientY, strength = DROP_STRENGTH, radius = DROP_RADIUS) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(((clientX - rect.left) / rect.width) * simW);
  const y = Math.floor(((clientY - rect.top) / rect.height) * simH);
  if (x < 1 || x >= simW - 1 || y < 1 || y >= simH - 1) return;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const distance = Math.hypot(dx, dy);
      if (distance > radius) continue;
      const i = (y + dy) * simW + x + dx;
      current[i] -= strength * (1 - distance / radius);
    }
  }
  pointer.lastX = x; pointer.lastY = y;
}
function rebuildMovingPebbleMask(pebble) {
  movingPebbleContext.clearRect(0, 0, simW, simH);
  const size = Math.max(66, Math.min(W, H) * .16) * pebble.scale;
  movingPebbleContext.save();
  movingPebbleContext.translate(pebble.position.x * simW, pebble.position.y * simH);
  movingPebbleContext.rotate(pebble.rotation);
  movingPebbleContext.scale(1, .62);
  tracePebbleShape(movingPebbleContext, size / SCALE, pebble.shapeParameters);
  movingPebbleContext.fillStyle = "#fff";
  movingPebbleContext.fill();
  movingPebbleContext.restore();
  const pixels = movingPebbleContext.getImageData(0, 0, simW, simH).data;
  for (let i = 0; i < movingPebbleMask.length; i++) movingPebbleMask[i] = pixels[i * 4] > 20 ? 1 : 0;
}
function injectPebbleDrag(pebble, previousPosition) {
  if (!simW || !simH) return;
  rebuildMovingPebbleMask(pebble);
  const centerX = pebble.position.x * simW;
  const centerY = pebble.position.y * simH;
  const velocityX = (pebble.position.x - previousPosition.x) * simW;
  const velocityY = (pebble.position.y - previousPosition.y) * simH;
  const speed = Math.hypot(velocityX, velocityY);
  const directionLength = speed || 1;
  const directionX = velocityX / directionLength;
  const directionY = velocityY / directionLength;
  const sizeFactor = .72 + pebble.scale * .42;
  const strength = (8 + Math.min(26, speed * 2.2)) * sizeFactor;

  for (let y = 1; y < simH - 1; y++) {
    const row = y * simW;
    for (let x = 1; x < simW - 1; x++) {
      const i = row + x;
      if (movingPebbleMask[i]) {
        // Volume displacement is applied across the real Pebble silhouette.
        current[i] -= strength * .48;
        continue;
      }
      const contacts = movingPebbleMask[i - 1] + movingPebbleMask[i + 1] + movingPebbleMask[i - simW] + movingPebbleMask[i + simW];
      if (!contacts) continue;
      const fromCenterX = x - centerX;
      const fromCenterY = y - centerY;
      const behind = Math.max(0, -(fromCenterX * directionX + fromCenterY * directionY) / 22);
      // Boundary pressure is strongest in the wake, producing waves around
      // and behind the moving stone rather than a pointer-shaped drop.
      current[i] -= strength * (.58 + Math.min(.8, behind)) * Math.min(1, contacts * .55);
    }
  }
  pointer.lastX = centerX; pointer.lastY = centerY;
}
function injectBoundaryImpulse(strength) {
  for (let y = 1; y < simH - 1; y++) {
    const row = y * simW;
    for (let x = 1; x < simW - 1; x++) {
      const i = row + x;
      if (obstacleMask[i]) continue;
      const contacts = obstacleMask[i - 1] + obstacleMask[i + 1] + obstacleMask[i - simW] + obstacleMask[i + simW];
      if (contacts) current[i] -= strength * Math.min(1, contacts * .55);
    }
  }
}
function beginPebbleImpact(drop, now) {
  const placed = drop.pebble;
  pebbles.push(placed);
  playPebbleDrop(placed.scale);
  persistGarden();
  updateCollectControl();
  rebuildObstacleMask();
  const impactScale = Math.max(.78, Math.min(1.42, placed.scale));
  const pebbleSize = Math.max(66, Math.min(W, H) * .16) * impactScale;
  const stoneRadius = Math.max(10, Math.round((pebbleSize / SCALE) * .78));
  const impactRadius = Math.max(PEBBLE_DROP_RADIUS + 2, Math.round(stoneRadius * 1.05));
  injectDrop(drop.clientX, drop.clientY, PEBBLE_DROP_STRENGTH * impactScale, impactRadius);
  injectBoundaryImpulse(PEBBLE_BOUNDARY_STRENGTH * impactScale);
  impactState = {
    x: placed.position.x * W,
    y: placed.position.y * H,
    scale: impactScale,
    pebbleRadius: pebbleSize * .68,
    rotation: placed.rotation,
    clientX: drop.clientX,
    clientY: drop.clientY,
    startedAt: now,
    reboundAt: now + 58,
    waveAt: now + 150,
    reboundInjected: false,
    waveInjected: false,
    lastDecayAt: now
  };
}
function beginCollectPebble(now) {
  if (!pebbles.length) return;
  const pebble = pebbles.shift();
  const x = pebble.position.x * W;
  const y = pebble.position.y * H;
  const size = Math.max(66, Math.min(W, H) * .16) * pebble.scale;
  // The last contact is sampled while this stone is still a real boundary.
  injectBoundaryImpulse(PEBBLE_BOUNDARY_STRENGTH * .72 * pebble.scale);
  injectDrop(x, y, PEBBLE_DROP_STRENGTH * .64 * pebble.scale, Math.max(5, Math.round((size / SCALE) * .72)));
  pebble.fadeOpacity = 1;
  pebble.fadeStartedAt = now;
  fadingPebbles.push(pebble);
  rebuildObstacleMask();
  persistGarden();
  collectState.index += 1;
  collectState.nextAt = now + COLLECT_INTERVAL;
  updateCollectControl();
}
function advancePebbleEvent(now) {
  if (dropState && now - dropState.startedAt >= DROP_DURATION) {
    const drop = dropState;
    dropState = null;
    beginPebbleImpact(drop, now);
  }
  if (impactState) {
    const age = now - impactState.startedAt;
    if (!impactState.reboundInjected && now >= impactState.reboundAt) {
      injectDrop(impactState.clientX, impactState.clientY, -PEBBLE_REBOUND_STRENGTH * impactState.scale, Math.max(5, Math.round(PEBBLE_DROP_RADIUS * impactState.scale)));
      injectBoundaryImpulse(-PEBBLE_REBOUND_STRENGTH * .58 * impactState.scale);
      impactState.reboundInjected = true;
    }
    if (!impactState.waveInjected && now >= impactState.waveAt) {
      // A second, smaller impulse is applied on the actual obstacle boundary;
      // the expanding rings still come from the M2 field, not from CSS geometry.
      injectBoundaryImpulse(PEBBLE_WAVE_STRENGTH * impactState.scale);
      impactState.waveInjected = true;
    }
    if (age > 900) {
      // Keep the approved .99 solver damping, then add a late-stage viscous
      // settle only to this impact's buffers so the event resolves by 4s.
      const elapsed = Math.min(40, Math.max(0, now - impactState.lastDecayAt));
      const settleFactor = Math.pow(.974, elapsed / (1000 / 60));
      for (let i = 0; i < current.length; i++) {
        current[i] *= settleFactor;
        previous[i] *= settleFactor;
      }
      impactState.lastDecayAt = now;
    }
    if (age >= IMPACT_LIFETIME) impactState = null;
  }

  if (collectState && now >= collectState.nextAt && pebbles.length) beginCollectPebble(now);
  if (collectState && !pebbles.length && fadingPebbles.length === 0) {
    collectState = null;
    collectControl.setAttribute("aria-pressed", "false");
    persistGarden();
    updateCollectControl();
  }
  for (let index = fadingPebbles.length - 1; index >= 0; index--) {
    const fading = fadingPebbles[index];
    const fadeProgress = Math.min(1, (now - fading.fadeStartedAt) / COLLECT_FADE_DURATION);
    fading.fadeOpacity = 1 - fadeProgress * fadeProgress * (3 - 2 * fadeProgress);
    if (fadeProgress >= 1) fadingPebbles.splice(index, 1);
  }
}
function stepSimulation() {
  for (let y = 1; y < simH - 1; y++) {
    const row = y * simW;
    for (let x = 1; x < simW - 1; x++) {
      const i = row + x;
      if (obstacleMask[i]) {
        // Solid boundary: the water has no height inside the stone.
        previous[i] = current[i] = 0;
        continue;
      }
      const left = obstacleMask[i - 1] ? current[i] : current[i - 1];
      const right = obstacleMask[i + 1] ? current[i] : current[i + 1];
      const up = obstacleMask[i - simW] ? current[i] : current[i - simW];
      const down = obstacleMask[i + simW] ? current[i] : current[i + simW];
      previous[i] = ((left + right + up + down) / 2 - previous[i]) * DAMPING;
    }
  }
  const swap = current; current = previous; previous = swap;
}
function drawSurface() {
  const d = imageData.data;
  atmosphere = interpolateAtmosphere(selectedMinutes);
  const [baseR, baseG, baseB] = atmosphere.color;
  const now = performance.now() * .00018;
  const lightCos = Math.cos(atmosphere.angle), lightSin = Math.sin(atmosphere.angle);
  for (let y = 1; y < simH - 1; y++) {
    const row = y * simW;
    for (let x = 1; x < simW - 1; x++) {
      const i = row + x;
      // Match the solid-boundary rule used by the solver. Reading the
      // obstacle's forced zero height here would create a false black wedge
      // at the stone edge instead of a physical contact gradient.
      const leftHeight = obstacleMask[i - 1] ? current[i] : current[i - 1];
      const rightHeight = obstacleMask[i + 1] ? current[i] : current[i + 1];
      const topHeight = obstacleMask[i - simW] ? current[i] : current[i - simW];
      const bottomHeight = obstacleMask[i + simW] ? current[i] : current[i + simW];
      const slope = leftHeight - rightHeight;
      const verticalSlope = topHeight - bottomHeight;
      const visualSlope = Math.max(-42, Math.min(42, slope));
      const visualVerticalSlope = Math.max(-42, Math.min(42, verticalSlope));
      const directional = Math.sin((x * lightCos + y * lightSin) * .045 + now) * .5 + .5;
      const caustic = Math.max(0, visualSlope * .018 + visualVerticalSlope * .012) * atmosphere.caustics;
      const lift = atmosphere.ambient * 7 + directional * atmosphere.highlight * 8 + caustic * 13;
      const nearObstacle = obstacleMask[i - 1] + obstacleMask[i + 1] + obstacleMask[i - simW] + obstacleMask[i + simW];
      const value = Math.max(0, Math.min(255, BASE_LEVEL + lift + visualSlope * SLOPE_GAIN - nearObstacle * 4.5));
      const o = i * 4;
      d[o] = Math.min(255, baseR * .7 + value * .3);
      d[o + 1] = Math.min(255, baseG * .7 + value * .3);
      d[o + 2] = Math.min(255, baseB * .7 + value * .3);
      d[o + 3] = 255;
    }
  }
  offscreenContext.putImageData(imageData, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(offscreen, 0, 0, W, H);
  drawPebbleImpact();
  drawPebbles();
}
function drawPebbleImpact() {
  if (!impactState) return;
  const age = performance.now() - impactState.startedAt;
  const duration = 520;
  if (age >= duration) return;
  const t = age / duration;
  const splashScale = Math.min(1, t * 5);
  const fade = 1 - t;
  const radius = Math.max(18, impactState.pebbleRadius);
  const { x, y } = impactState;

  ctx.save();
  ctx.translate(x, y);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = .34 * fade;
  ctx.strokeStyle = "rgba(44, 91, 99, .72)";
  ctx.lineWidth = Math.max(1, Math.min(W, H) * .0022);
  ctx.beginPath();
  ctx.ellipse(0, radius * .18, radius * (1.02 + splashScale * .62), radius * (.34 + splashScale * .1), 0, 0, Math.PI * 2);
  ctx.stroke();

  // A restrained crown: short sheets and droplets, not a second ripple.
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = .58 * fade;
  ctx.strokeStyle = `rgba(${Math.min(255, atmosphere.color[0] + 52)}, ${Math.min(255, atmosphere.color[1] + 52)}, ${Math.min(255, atmosphere.color[2] + 46)}, 1)`;
  ctx.lineWidth = Math.max(1, Math.min(W, H) * .0018);
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8 + .18;
    const inner = radius * .24;
    const outer = radius * (.62 + splashScale * .34);
    const startX = Math.cos(angle) * inner;
    const startY = Math.sin(angle) * inner * .36;
    const endX = Math.cos(angle) * outer;
    const endY = Math.sin(angle) * outer * .22 - (i % 2 ? radius * .12 : radius * .2) * splashScale;
    ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke();
    if (i % 2 === 0) {
      ctx.beginPath(); ctx.arc(endX, endY, Math.max(1.2, radius * .035), 0, Math.PI * 2); ctx.fillStyle = ctx.strokeStyle; ctx.fill();
    }
  }
  ctx.restore();
}
let lastSimulationTime = -1, accumulator = 0;
function simulationFrame(now) {
  if (lastSimulationTime < 0) lastSimulationTime = now;
  accumulator += Math.min(now - lastSimulationTime, 100);
  lastSimulationTime = now;
  advancePebbleEvent(now);
  while (accumulator >= STEP) { accumulator -= STEP; stepSimulation(); }
  drawSurface(); requestAnimationFrame(simulationFrame);
}
document.addEventListener("visibilitychange", () => { if (document.hidden) { lastSimulationTime = -1; accumulator = 0; } });
function moveCursor(event, pressImpact = false) {
  const rect = canvas.getBoundingClientRect();
  const now = performance.now();
  if (!pressImpact && pointer.down) pointer.moved = true;
  const elapsed = Math.max(16, now - (audioState.lastPointerAt || now - 16));
  const velocityX = (event.clientX - audioState.lastPointerX) / elapsed * 16;
  const velocityY = (event.clientY - audioState.lastPointerY) / elapsed * 16;
  audioState.lastPointerAt = now;
  audioState.lastPointerX = event.clientX;
  audioState.lastPointerY = event.clientY;
  cursor.style.left = `${event.clientX}px`; cursor.style.top = `${event.clientY}px`;
  document.body.classList.add("is-inside");
  pointer.clientX = event.clientX;
  pointer.clientY = event.clientY;
  setWaterMovement(velocityX, velocityY, true);
  if (entryState === "carrying" && activePebble) {
    const previousPosition = { ...activePebble.position };
    updateCarriedPebble(event.clientX, event.clientY);
    const pebbleX = activePebble.position.x * simW;
    const pebbleY = activePebble.position.y * simH;
    if (Math.hypot(pebbleX - pointer.lastX, pebbleY - pointer.lastY) >= HOVER_STEP) {
      injectPebbleDrag(activePebble, previousPosition);
    }
    return;
  }
  updateCarriedPebble(event.clientX, event.clientY);
  const x = ((event.clientX - rect.left) / rect.width) * simW;
  const y = ((event.clientY - rect.top) / rect.height) * simH;
  const distance = Math.hypot(x - pointer.lastX, y - pointer.lastY);
  if (distance < HOVER_STEP && !pressImpact) return;
  if (pressImpact) {
    pulseWaterMovement();
    injectDrop(event.clientX, event.clientY, POINTER_PRESS_STRENGTH, POINTER_PRESS_RADIUS);
  } else if (pointer.down) {
    injectDrop(event.clientX, event.clientY, DROP_STRENGTH, DROP_RADIUS);
  } else {
    injectDrop(event.clientX, event.clientY, HOVER_DROP_STRENGTH, HOVER_DROP_RADIUS);
  }
}
canvas.addEventListener("pointermove", moveCursor);
// Pointer Events browsers also dispatch a compatibility mousemove for the same
// gesture. Handling both paths makes the second call look like zero velocity
// and immediately fades Water Move out. Keep the legacy path only where Pointer
// Events are unavailable.
if (!window.PointerEvent) canvas.addEventListener("mousemove", moveCursor);
canvas.addEventListener("pointerenter", () => document.body.classList.add("is-inside"));
canvas.addEventListener("pointerleave", () => {
  document.body.classList.remove("is-inside", "is-pressing");
  setWaterMovement(0, 0, false);
});
canvas.addEventListener("pointerdown", (event) => {
  if (entryState === "carrying") {
    event.preventDefault();
    placeCarriedPebble(event.clientX, event.clientY);
    return;
  }
  if (entryState === "writing") return;
  pointer.down = true; pointer.moved = false; moveCursor(event, true); document.body.classList.add("is-pressing"); canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointerup", (event) => {
  const wasTap = !pointer.moved;
  pointer.down = false;
  document.body.classList.remove("is-pressing");
  if (!wasTap) setWaterMovement(0, 0, false);
  canvas.releasePointerCapture(event.pointerId);
});
window.addEventListener("resize", resize, { passive: true });
restoreGarden();
updateCollectControl();
resize(); requestAnimationFrame(simulationFrame);
