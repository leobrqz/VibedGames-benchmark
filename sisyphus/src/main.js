// ── Sisyphus — Main Entry Point ──
// Game loop, module orchestration, state management

import './styles.css';
import { input } from './input.js';
import { initScene, getScene, getRenderer, updateSceneAtmosphere, updateSunPosition } from './scene.js';
import { initTerrain, updateChunks, getHeightAt } from './terrain.js';
import {
  initPlayer, updatePlayer, getPlayerPosition, getPlayerState, getPlayerFacing,
  isPlayerPushing, setPlayerPushing, setPlayerDependencies, PlayerState
} from './player.js';
import {
  initBoulder, updateBoulder, getBoulderPosition, getBoulderRef, getBoulderSpeed,
  tryGrab, releaseBoulder, canGrab, setBoulderCallbacks
} from './boulder.js';
import { initCamera, getCamera, getCameraYaw, updateCamera, addCameraShake } from './camera.js';
import {
  initStamina, updateStamina, getStaminaInfo
} from './stamina.js';
import {
  initEffects, updateEffects, emitDust, emitFootstepDust, emitPebbles,
  emitSweat, emitImpactSparks, initVignette, setExhaustionVignette
} from './effects.js';
import {
  resumeAudio, updateAmbient, playFootstep, playImpact, playRelease,
  playGrab, playResetRumble, playEffort
} from './audio.js';
import {
  initUI, showIntro, updateStaminaBar, updateHeightCounter,
  showGrabIndicator, showResetMessage
} from './ui.js';

// ── Game State ──
let running = false;
let lastTime = 0;
let startHeight = 0;
let footstepTimer = 0;
let footstepDustTimer = 0;
let effortTimer = 0;
let sweatTimer = 0;
let dustTimer = 0;

// ── Bootstrap ──

async function init() {
  const canvas = document.getElementById('game-canvas');

  // Initialize all systems
  initScene(canvas);
  initCamera();
  input.init(canvas);
  initTerrain();
  initPlayer();
  initBoulder();
  initStamina();
  initEffects();
  initVignette();
  initUI();

  // Wire up dependencies
  setPlayerDependencies(
    getStaminaInfo,
    getCameraYaw,
    getBoulderRef
  );

  setBoulderCallbacks(
    onBoulderRelease,
    onBoulderImpact,
    onBoulderReset
  );

  // Record starting height
  startHeight = getHeightAt(0, 2);

  // Show intro and wait for click
  await showIntro();

  // Start game
  resumeAudio();
  running = true;
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

// ── Game Loop ──

function gameLoop(timestamp) {
  if (!running) return;
  requestAnimationFrame(gameLoop);

  const rawDt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  // Clamp dt to prevent spiral of death
  const dt = Math.min(rawDt, 1 / 20);

  // ── Update input (must be first) ──
  // Grab/release interaction
  handleInteraction();

  // ── Update stamina ──
  const isSprinting = input.sprint && getStaminaInfo().canSprint;
  const isMoving = input.anyMovement;
  updateStamina(dt, isSprinting, isPlayerPushing(), isMoving);

  // ── Update player ──
  updatePlayer(dt);
  const playerPos = getPlayerPosition();
  const playerFacing = getPlayerFacing();
  const playerState = getPlayerState();

  // ── Update boulder ──
  updateBoulder(dt, playerPos, playerFacing, isSprinting);
  const boulderPos = getBoulderPosition();
  const boulderSpeed = getBoulderSpeed();

  // ── Update camera ──
  updateCamera(dt, playerPos, isPlayerPushing());

  // ── Update terrain chunks ──
  updateChunks(playerPos.z);

  // ── Update atmosphere ──
  const currentHeight = playerPos.y - startHeight;
  updateSceneAtmosphere(currentHeight);
  updateSunPosition(playerPos);

  // ── Update effects ──
  updateEffects(dt);
  updateEffectEmitters(dt, playerPos, playerState, boulderPos, boulderSpeed, isSprinting);

  // ── Update audio ──
  updateAmbient(currentHeight, boulderSpeed);
  updateFootstepAudio(dt, playerState);
  updateEffortAudio(dt);

  // ── Update UI ──
  const staminaInfo = getStaminaInfo();
  updateStaminaBar(staminaInfo.current, staminaInfo.max, staminaInfo.exhausted);
  updateHeightCounter(currentHeight);
  setExhaustionVignette(staminaInfo.exhausted);

  // Grab indicator
  const nearBoulder = canGrab(playerPos);
  showGrabIndicator(nearBoulder, isPlayerPushing());

  // ── Render ──
  const renderer = getRenderer();
  const camera = getCamera();
  renderer.render(getScene(), camera);

  // ── Flush input (must be last) ──
  input.update();
}

// ── Interaction Handler ──

function handleInteraction() {
  if (!input.interact) return;

  const playerPos = getPlayerPosition();

  if (isPlayerPushing()) {
    // Release boulder
    releaseBoulder();
    setPlayerPushing(false);
  } else {
    // Try to grab boulder
    if (tryGrab(playerPos)) {
      setPlayerPushing(true);
      playGrab();
    }
  }
}

// ── Effect Emitters ──

function updateEffectEmitters(dt, playerPos, playerState, boulderPos, boulderSpeed, isSprinting) {
  // Boulder dust while rolling
  if (boulderSpeed > 0.5) {
    dustTimer += dt;
    if (dustTimer > 0.08) {
      dustTimer = 0;
      emitDust(boulderPos.x, boulderPos.y - 0.7, boulderPos.z, boulderSpeed * 0.4);
    }

    // Pebbles at higher speeds
    if (boulderSpeed > 2) {
      emitPebbles(boulderPos.x, boulderPos.y - 0.5, boulderPos.z, boulderSpeed * 0.3);
    }
  }

  // Player footstep dust
  const isWalking = playerState === PlayerState.WALK ||
                    playerState === PlayerState.SPRINT ||
                    playerState === PlayerState.PUSH ||
                    playerState === PlayerState.PUSH_SPRINT;
  if (isWalking) {
    const footRate = playerState === PlayerState.SPRINT ? 0.18 : 0.3;
    footstepDustTimer += dt;
    if (footstepDustTimer > footRate) {
      footstepDustTimer = 0;
      emitFootstepDust(
        playerPos.x + (Math.random() - 0.5) * 0.2,
        playerPos.y + 0.02,
        playerPos.z + (Math.random() - 0.5) * 0.2
      );
    }
  }

  // Sweat during push+sprint
  if (isPlayerPushing() && isSprinting) {
    sweatTimer += dt;
    if (sweatTimer > 0.3) {
      sweatTimer = 0;
      emitSweat(playerPos.x, playerPos.y, playerPos.z);
    }
  }

  // Camera shake during push sprint
  if (playerState === PlayerState.PUSH_SPRINT) {
    addCameraShake(0.015);
  }
}

// ── Audio Callbacks ──

function updateFootstepAudio(dt, playerState) {
  if (playerState === PlayerState.WALK || playerState === PlayerState.SPRINT ||
      playerState === PlayerState.PUSH || playerState === PlayerState.PUSH_SPRINT) {
    const rate = playerState === PlayerState.SPRINT ? 0.22 :
                 playerState === PlayerState.PUSH_SPRINT ? 0.25 : 0.35;
    footstepTimer += dt;
    if (footstepTimer > rate) {
      footstepTimer -= rate;
      playFootstep();
    }
  }
}

function updateEffortAudio(dt) {
  if (isPlayerPushing()) {
    effortTimer += dt;
    const rate = getStaminaInfo().fraction < 0.3 ? 1.5 : 3.0;
    if (effortTimer > rate) {
      effortTimer = 0;
      playEffort();
    }
  } else {
    effortTimer = 0;
  }
}

// ── Boulder Event Callbacks ──

function onBoulderRelease() {
  playRelease();
  addCameraShake(0.08);
}

function onBoulderImpact(velocity) {
  playImpact(velocity);
  const boulderPos = getBoulderPosition();
  emitImpactSparks(boulderPos.x, boulderPos.y, boulderPos.z, velocity * 0.3);
  addCameraShake(velocity * 0.01);
}

function onBoulderReset() {
  showResetMessage();
  playResetRumble();
  addCameraShake(0.12);
  setPlayerPushing(false);
}

// ── Start ──
init();
