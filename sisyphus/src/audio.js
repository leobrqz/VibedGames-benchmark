// ── Audio System ──
// Web Audio API synthesized sounds — no external files needed

let ctx = null;
let masterGain = null;
let initialized = false;

// Sound channels
let windNode = null;
let windGain = null;
let droneNode = null;
let droneGain = null;
let rollNode = null;
let rollGain = null;

export function initAudio() {
  // Audio context is created on first user interaction
}

function ensureContext() {
  if (ctx) return true;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(ctx.destination);
    initialized = true;
    startAmbient();
    return true;
  } catch {
    return false;
  }
}

export function resumeAudio() {
  if (!ensureContext()) return;
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
}

// ── Ambient Layers ──

function startAmbient() {
  // Wind — filtered white noise
  const windBufferSize = ctx.sampleRate * 2;
  const windBuffer = ctx.createBuffer(1, windBufferSize, ctx.sampleRate);
  const windData = windBuffer.getChannelData(0);
  for (let i = 0; i < windBufferSize; i++) {
    windData[i] = (Math.random() * 2 - 1) * 0.3;
  }

  windNode = ctx.createBufferSource();
  windNode.buffer = windBuffer;
  windNode.loop = true;

  const windFilter = ctx.createBiquadFilter();
  windFilter.type = 'lowpass';
  windFilter.frequency.value = 400;
  windFilter.Q.value = 0.5;

  windGain = ctx.createGain();
  windGain.gain.value = 0.08;

  windNode.connect(windFilter);
  windFilter.connect(windGain);
  windGain.connect(masterGain);
  windNode.start();

  // Drone — low sine with slight modulation
  droneNode = ctx.createOscillator();
  droneNode.type = 'sine';
  droneNode.frequency.value = 55;

  const droneLFO = ctx.createOscillator();
  droneLFO.type = 'sine';
  droneLFO.frequency.value = 0.15;
  const droneLFOGain = ctx.createGain();
  droneLFOGain.gain.value = 3;
  droneLFO.connect(droneLFOGain);
  droneLFOGain.connect(droneNode.frequency);
  droneLFO.start();

  droneGain = ctx.createGain();
  droneGain.gain.value = 0.04;

  droneNode.connect(droneGain);
  droneGain.connect(masterGain);
  droneNode.start();
}

export function updateAmbient(altitude, boulderSpeed) {
  if (!initialized) return;

  // Wind intensity increases with altitude
  const windIntensity = 0.06 + Math.min(altitude / 300, 1) * 0.18;
  if (windGain) {
    windGain.gain.linearRampToValueAtTime(windIntensity, ctx.currentTime + 0.5);
  }

  // Drone pitch shifts slightly with altitude
  if (droneNode) {
    droneNode.frequency.linearRampToValueAtTime(
      50 + Math.min(altitude / 400, 1) * 15,
      ctx.currentTime + 1
    );
  }

  // Boulder roll sound
  updateRollSound(boulderSpeed);
}

function updateRollSound(speed) {
  if (speed > 0.3) {
    if (!rollNode) {
      startRollSound();
    }
    if (rollGain) {
      const vol = Math.min(speed / 8, 1) * 0.15;
      rollGain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.1);
    }
    if (rollNode && rollNode.frequency) {
      rollNode.frequency.linearRampToValueAtTime(
        30 + speed * 8,
        ctx.currentTime + 0.1
      );
    }
  } else {
    if (rollGain) {
      rollGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    }
  }
}

function startRollSound() {
  if (!ctx || rollNode) return;

  // Low rumble: triangle wave + filtered noise
  rollNode = ctx.createOscillator();
  rollNode.type = 'triangle';
  rollNode.frequency.value = 40;

  const rollFilter = ctx.createBiquadFilter();
  rollFilter.type = 'lowpass';
  rollFilter.frequency.value = 120;
  rollFilter.Q.value = 2;

  rollGain = ctx.createGain();
  rollGain.gain.value = 0;

  rollNode.connect(rollFilter);
  rollFilter.connect(rollGain);
  rollGain.connect(masterGain);
  rollNode.start();
}

// ── One-shot Sounds ──

export function playFootstep() {
  if (!ensureContext()) return;

  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.value = 100 + Math.random() * 60;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 800 + Math.random() * 400;
  filter.Q.value = 1;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.04, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.08);
}

export function playImpact(intensity) {
  if (!ensureContext()) return;

  // Noise burst
  const bufferSize = ctx.sampleRate * 0.15;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 200 + intensity * 100;

  const gain = ctx.createGain();
  const vol = Math.min(intensity / 10, 1) * 0.2;
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  source.start();
}

export function playRelease() {
  if (!ensureContext()) return;

  // Deep rumble
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(60, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + 0.5);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.6);
}

export function playGrab() {
  if (!ensureContext()) return;

  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(90, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.15);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.06, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}

export function playResetRumble() {
  if (!ensureContext()) return;

  // Distant thunder-like rumble
  const bufferSize = ctx.sampleRate * 1.5;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const env = Math.sin((i / bufferSize) * Math.PI);
    data[i] = (Math.random() * 2 - 1) * env * 0.4;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 150;
  filter.Q.value = 0.7;

  const gain = ctx.createGain();
  gain.gain.value = 0.12;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  source.start();
}

export function playEffort() {
  if (!ensureContext()) return;

  // Short grunt-like sound
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(120 + Math.random() * 30, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 600;
  filter.Q.value = 2;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.03, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

export function disposeAudio() {
  if (ctx) {
    ctx.close();
    ctx = null;
    initialized = false;
    windNode = null;
    droneNode = null;
    rollNode = null;
  }
}
