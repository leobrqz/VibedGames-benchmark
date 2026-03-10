// ── Third-Person Camera ──
// Orbital camera with mouse look, smooth follow, terrain collision

import * as THREE from 'three';
import { input } from './input.js';
import { getHeightAt } from './terrain.js';
import { clamp, dampLerp } from './utils.js';
import {
  CAMERA_DISTANCE, CAMERA_HEIGHT_OFFSET,
  CAMERA_PUSH_DISTANCE, CAMERA_PUSH_HEIGHT,
  CAMERA_SMOOTHING, CAMERA_SENSITIVITY,
  CAMERA_MIN_PITCH, CAMERA_MAX_PITCH,
  CAMERA_MIN_DISTANCE
} from './constants.js';

let camera = null;
let yaw = Math.PI;  // Start facing forward (+Z)
let pitch = 0.3;
let currentDistance = CAMERA_DISTANCE;
let currentHeightOffset = CAMERA_HEIGHT_OFFSET;
let shakeIntensity = 0;
let shakeDecay = 0;

const targetPosition = new THREE.Vector3();
const currentPosition = new THREE.Vector3();
const lookTarget = new THREE.Vector3();

export function initCamera() {
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  return camera;
}

export function getCamera() { return camera; }
export function getCameraYaw() { return yaw; }

export function addCameraShake(intensity) {
  shakeIntensity = Math.max(shakeIntensity, intensity);
  shakeDecay = 4;
}

export function updateCamera(dt, playerPos, isPushing) {
  if (!camera) return;

  // ── Mouse look ──
  if (input.pointerLocked) {
    yaw -= input.mouseDX * CAMERA_SENSITIVITY;
    pitch += input.mouseDY * CAMERA_SENSITIVITY;
    pitch = clamp(pitch, CAMERA_MIN_PITCH, CAMERA_MAX_PITCH);
  }

  // ── Target distance and height based on push state ──
  const targetDist = isPushing ? CAMERA_PUSH_DISTANCE : CAMERA_DISTANCE;
  const targetHeight = isPushing ? CAMERA_PUSH_HEIGHT : CAMERA_HEIGHT_OFFSET;
  currentDistance = dampLerp(currentDistance, targetDist, 3, dt);
  currentHeightOffset = dampLerp(currentHeightOffset, targetHeight, 3, dt);

  // ── Compute ideal camera position ──
  const lookAtPoint = new THREE.Vector3(
    playerPos.x,
    playerPos.y + 1.1,
    playerPos.z
  );

  const offsetX = Math.sin(yaw) * Math.cos(pitch) * currentDistance;
  const offsetY = Math.sin(pitch) * currentDistance + currentHeightOffset;
  const offsetZ = Math.cos(yaw) * Math.cos(pitch) * currentDistance;

  targetPosition.set(
    lookAtPoint.x + offsetX,
    lookAtPoint.y + offsetY,
    lookAtPoint.z + offsetZ
  );

  // ── Terrain collision: pull camera in if terrain blocks view ──
  const terrainY = getHeightAt(targetPosition.x, targetPosition.z) + 0.5;
  if (targetPosition.y < terrainY) {
    targetPosition.y = terrainY;
  }

  // Raycast check: ensure line of sight to player
  const toPlayer = new THREE.Vector3().subVectors(lookAtPoint, targetPosition);
  const distToPlayer = toPlayer.length();
  const rayDir = toPlayer.clone().normalize();

  // Simple terrain probe along camera-to-player ray
  const probeSteps = 8;
  let blocked = false;
  for (let i = 1; i < probeSteps; i++) {
    const t = i / probeSteps;
    const probeX = targetPosition.x + rayDir.x * distToPlayer * t;
    const probeZ = targetPosition.z + rayDir.z * distToPlayer * t;
    const probeY = targetPosition.y + rayDir.y * distToPlayer * t;
    const terrainProbeY = getHeightAt(probeX, probeZ) + 0.3;
    if (probeY < terrainProbeY) {
      // Pull camera closer
      const pullFactor = Math.max(0.2, t - 0.1);
      targetPosition.lerpVectors(lookAtPoint, targetPosition, pullFactor);
      blocked = true;
      break;
    }
  }

  // Minimum distance enforcement
  const finalDist = targetPosition.distanceTo(lookAtPoint);
  if (finalDist < CAMERA_MIN_DISTANCE && !blocked) {
    const dir = new THREE.Vector3().subVectors(targetPosition, lookAtPoint).normalize();
    targetPosition.copy(lookAtPoint).addScaledVector(dir, CAMERA_MIN_DISTANCE);
  }

  // ── Smooth follow ──
  currentPosition.lerp(targetPosition, 1 - Math.exp(-CAMERA_SMOOTHING * dt));

  // ── Camera shake ──
  let shakeOffset = new THREE.Vector3();
  if (shakeIntensity > 0.001) {
    shakeOffset.set(
      (Math.random() - 0.5) * shakeIntensity,
      (Math.random() - 0.5) * shakeIntensity * 0.7,
      (Math.random() - 0.5) * shakeIntensity
    );
    shakeIntensity *= Math.max(0, 1 - shakeDecay * dt);
  }

  camera.position.copy(currentPosition).add(shakeOffset);

  // ── Look at player ──
  lookTarget.copy(lookAtPoint);
  camera.lookAt(lookTarget);
}
