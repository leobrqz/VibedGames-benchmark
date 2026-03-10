// ── Boulder Mechanics ──
// Physics simulation, grab/release, roll, reset

import * as THREE from 'three';
import { noise } from './noise.js';
import { getScene } from './scene.js';
import { getHeightAt, getNormalAt } from './terrain.js';
import { clamp } from './utils.js';
import {
  BOULDER_RADIUS, BOULDER_GRAB_DISTANCE, BOULDER_GRAB_OFFSET,
  BOULDER_START_Z,
  GRAVITY, PHYSICS_SUBSTEPS, PLAYER_RADIUS,
  TERRAIN_PATH_HALF_WIDTH
} from './constants.js';

let mesh = null;
let position = new THREE.Vector3();
let velocity = new THREE.Vector3();
let angularVelocity = new THREE.Vector3();
let isGrabbed = false;
let isResetting = false;
let resetTimer = 0;
const RESET_DELAY = 2.0;

// Callbacks set from main
let onBoulderRelease = null;
let onBoulderImpact = null;
let onBoulderReset = null;

function buildBoulderMesh() {
  const geo = new THREE.IcosahedronGeometry(BOULDER_RADIUS, 2);

  // Deform vertices for a natural rock shape
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const len = Math.sqrt(x * x + y * y + z * z);
    const nx = x / len;
    const ny = y / len;
    const nz = z / len;

    const deform = 1 + noise.noise2d(nx * 3 + ny * 7, nz * 3 + ny * 5) * 0.12
                     + noise.noise2d(nx * 8, nz * 8 + ny * 4) * 0.04;
    const r = BOULDER_RADIUS * deform;
    pos.setXYZ(i, nx * r, ny * r * 0.9, nz * r);
  }
  geo.computeVertexNormals();

  // Vertex colors for rocky look
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nv = noise.noise2d(x * 4, z * 4 + y * 3) * 0.12;
    const base = 0.32 + nv;
    colors[i * 3] = clamp(base + 0.03, 0, 1);
    colors[i * 3 + 1] = clamp(base, 0, 1);
    colors[i * 3 + 2] = clamp(base - 0.02, 0, 1);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0.02,
    flatShading: true
  });

  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function initBoulder() {
  mesh = buildBoulderMesh();
  const startZ = BOULDER_START_Z;
  const startY = getHeightAt(0, startZ) + BOULDER_RADIUS;
  position.set(0, startY, startZ);
  mesh.position.copy(position);
  getScene().add(mesh);
}

export function setBoulderCallbacks(release, impact, reset) {
  onBoulderRelease = release;
  onBoulderImpact = impact;
  onBoulderReset = reset;
}

export function getBoulderPosition() { return position; }
export function getBoulderRadius() { return BOULDER_RADIUS; }
export function isBoulderGrabbed() { return isGrabbed; }

export function getBoulderRef() {
  return { position, radius: BOULDER_RADIUS };
}

export function getBoulderSpeed() {
  return Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
}

// ── Grab / Release ──

export function tryGrab(playerPos) {
  if (isResetting) return false;
  const dist = playerPos.distanceTo(position);
  if (dist < BOULDER_GRAB_DISTANCE + BOULDER_RADIUS) {
    isGrabbed = true;
    return true;
  }
  return false;
}

export function releaseBoulder() {
  if (!isGrabbed) return;
  isGrabbed = false;
  if (onBoulderRelease) onBoulderRelease();
}

export function canGrab(playerPos) {
  if (isResetting) return false;
  const dist = playerPos.distanceTo(position);
  return dist < BOULDER_GRAB_DISTANCE + BOULDER_RADIUS;
}

// ── Physics Update ──

export function updateBoulder(dt, playerPos, playerFacing, playerSprinting) {
  if (isResetting) {
    resetTimer -= dt;
    if (resetTimer <= 0) {
      resetBoulder(playerPos);
    }
    return;
  }

  const subDt = dt / PHYSICS_SUBSTEPS;

  for (let step = 0; step < PHYSICS_SUBSTEPS; step++) {
    if (isGrabbed) {
      updateGrabbedPhysics(subDt, playerPos, playerFacing, playerSprinting);
    } else {
      updateFreePhysics(subDt);
    }
  }

  // Check if boulder needs reset
  checkBoulderReset(playerPos);

  // Update visual
  mesh.position.copy(position);

  // Roll rotation based on velocity
  const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
  if (speed > 0.05) {
    const rollAxis = new THREE.Vector3(-velocity.z, 0, velocity.x).normalize();
    const rollAngle = (speed * dt) / BOULDER_RADIUS;
    mesh.rotateOnWorldAxis(rollAxis, rollAngle);
  }
}

function updateGrabbedPhysics(dt, playerPos, playerFacing, playerSprinting) {
  // Target position: directly in front of the player
  const pushDirX = Math.sin(playerFacing);
  const pushDirZ = Math.cos(playerFacing);
  const targetX = playerPos.x + pushDirX * BOULDER_GRAB_OFFSET;
  const targetZ = playerPos.z + pushDirZ * BOULDER_GRAB_OFFSET;

  // Track previous position to derive velocity for roll animation / release momentum
  const prevX = position.x;
  const prevZ = position.z;

  // Stiff exponential tracking — boulder stays firmly in front of the player.
  // Closes ~26% of the gap per frame, fully tracks within ~0.2s.
  const t = 1 - Math.exp(-18 * dt);
  position.x += (targetX - position.x) * t;
  position.z += (targetZ - position.z) * t;

  // Enforce minimum distance from player to prevent clipping
  const minDist = PLAYER_RADIUS + BOULDER_RADIUS + 0.1;
  const toPlayerX = position.x - playerPos.x;
  const toPlayerZ = position.z - playerPos.z;
  const distToPlayer = Math.sqrt(toPlayerX * toPlayerX + toPlayerZ * toPlayerZ);
  if (distToPlayer < minDist && distToPlayer > 0.01) {
    const scale = minDist / distToPlayer;
    position.x = playerPos.x + toPlayerX * scale;
    position.z = playerPos.z + toPlayerZ * scale;
  }

  // Ground contact
  const groundY = getHeightAt(position.x, position.z) + BOULDER_RADIUS;
  position.y = groundY;

  // Derive velocity from position change (used for roll animation and momentum on release)
  velocity.x = (position.x - prevX) / dt;
  velocity.z = (position.z - prevZ) / dt;
  velocity.y = 0;
}

function updateFreePhysics(dt) {
  const normal = getNormalAt(position.x, position.z);
  const gravityMag = GRAVITY;

  // Gravitational acceleration projected onto terrain surface.
  // For a surface y = h(x,z), the horizontal acceleration is:
  //   a_x = g * dh/dx = g * Nx/Ny,   a_z = g * dh/dz = g * Nz/Ny
  // where N = (-dh/dx, 1, -dh/dz) normalized.
  // Cap the slope factor to avoid singularity on near-vertical walls.
  const invNy = Math.min(1 / Math.max(normal.y, 0.01), 10);
  const slopeGravX = gravityMag * normal.x * invNy;
  const slopeGravZ = gravityMag * normal.z * invNy;

  velocity.x += slopeGravX * dt;
  velocity.z += slopeGravZ * dt;

  // Rolling friction (Coulomb model with rolling resistance coefficient).
  // A heavy stone boulder on rough rocky terrain has high rolling resistance.
  const rollingCoeff = 0.12;
  const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
  if (speed > 0.001) {
    const normalForce = gravityMag * normal.y;
    const frictionDecel = Math.min(rollingCoeff * normalForce * dt, speed);
    const factor = (speed - frictionDecel) / speed;
    velocity.x *= factor;
    velocity.z *= factor;
  }

  // Terrain drag (rough ground absorbing kinetic energy, air resistance).
  // Terminal velocity ~3 m/s on base slope (below walk speed 4.5),
  // so the player can always catch the boulder on foot.
  const drag = Math.exp(-1.5 * dt);
  velocity.x *= drag;
  velocity.z *= drag;

  // Integrate position
  position.x += velocity.x * dt;
  position.z += velocity.z * dt;

  // Lateral constraint — terrain side walls contain the boulder, but
  // clamp as a safety net to prevent it from escaping the path.
  const lateralLimit = TERRAIN_PATH_HALF_WIDTH - BOULDER_RADIUS;
  if (position.x > lateralLimit) {
    position.x = lateralLimit;
    if (velocity.x > 0) velocity.x *= -0.3;
  } else if (position.x < -lateralLimit) {
    position.x = -lateralLimit;
    if (velocity.x < 0) velocity.x *= -0.3;
  }

  // Ground contact
  const groundY = getHeightAt(position.x, position.z) + BOULDER_RADIUS;

  if (position.y > groundY + 0.1) {
    // Airborne — apply vertical gravity
    velocity.y -= gravityMag * dt;
    position.y += velocity.y * dt;
    if (position.y < groundY) {
      position.y = groundY;
      if (velocity.y < -2) {
        if (onBoulderImpact) onBoulderImpact(Math.abs(velocity.y));
      }
      velocity.y *= -0.15;
    }
  } else {
    position.y = groundY;
    velocity.y = 0;
  }
}

function checkBoulderReset(playerPos) {
  // Safety only: if boulder clips below terrain, snap it back to the surface.
  // No teleportation — the player must walk back to retrieve the boulder.
  const groundY = getHeightAt(position.x, position.z) + BOULDER_RADIUS;
  if (position.y < groundY - 5) {
    position.y = groundY;
    velocity.set(0, 0, 0);
  }
}

function startReset() {
  if (isResetting) return;
  isResetting = true;
  isGrabbed = false;
  resetTimer = RESET_DELAY;
  mesh.visible = false;
  if (onBoulderReset) onBoulderReset();
}

function resetBoulder(playerPos) {
  // Place boulder near the player, slightly ahead
  const resetZ = playerPos.z + 3;
  const resetY = getHeightAt(0, resetZ) + BOULDER_RADIUS;
  position.set(0, resetY, resetZ);
  velocity.set(0, 0, 0);
  angularVelocity.set(0, 0, 0);
  isResetting = false;
  mesh.visible = true;
}

export function getBoulderMesh() { return mesh; }
