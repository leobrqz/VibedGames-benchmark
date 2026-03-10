// ── Stamina System ──

import {
  STAMINA_MAX, STAMINA_DRAIN_SPRINT, STAMINA_DRAIN_PUSH_SPRINT,
  STAMINA_REGEN_MOVING, STAMINA_REGEN_IDLE,
  STAMINA_EXHAUSTION_THRESHOLD
} from './constants.js';
import { clamp } from './utils.js';

let current = STAMINA_MAX;
let exhausted = false;

export function initStamina() {
  current = STAMINA_MAX;
  exhausted = false;
}

export function getStaminaCurrent() { return current; }
export function getStaminaMax() { return STAMINA_MAX; }
export function isExhausted() { return exhausted; }

export function canSprint() {
  return !exhausted;
}

export function getStaminaInfo() {
  return {
    current,
    max: STAMINA_MAX,
    fraction: current / STAMINA_MAX,
    exhausted,
    canSprint: canSprint()
  };
}

export function updateStamina(dt, isSprinting, isPushing, isMoving) {
  if (isSprinting && canSprint()) {
    // Drain
    const drainRate = isPushing ? STAMINA_DRAIN_PUSH_SPRINT : STAMINA_DRAIN_SPRINT;
    current -= drainRate * dt;

    if (current <= 0) {
      current = 0;
      exhausted = true;
    }
  } else {
    // Regenerate
    const regenRate = isMoving ? STAMINA_REGEN_MOVING : STAMINA_REGEN_IDLE;
    current += regenRate * dt;

    if (current >= STAMINA_EXHAUSTION_THRESHOLD) {
      exhausted = false;
    }

    current = Math.min(current, STAMINA_MAX);
  }

  current = clamp(current, 0, STAMINA_MAX);
}
