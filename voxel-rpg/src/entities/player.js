import * as THREE from 'three';

import { CAMERA_CONFIG, PLAYER_CONFIG } from '../core/constants.js';
import { clamp, damp, yawToForward } from '../utils/math.js';

const createLimb = (color, dimensions, position) => {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(dimensions.x, dimensions.y, dimensions.z),
    new THREE.MeshLambertMaterial({ color }),
  );
  mesh.castShadow = true;
  mesh.position.copy(position);
  return mesh;
};

const buildEquipmentMesh = (item) => {
  if (!item) {
    return null;
  }

  const color = new THREE.Color(item.rarityColor);
  if (item.key === 'shield') {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.95, 0.18), new THREE.MeshLambertMaterial({ color }));
    mesh.castShadow = true;
    mesh.position.set(0, -0.1, 0);
    return mesh;
  }
  if (item.key === 'torch') {
    const group = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.9, 6), new THREE.MeshLambertMaterial({ color: '#704c35' }));
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), new THREE.MeshBasicMaterial({ color }));
    flame.position.y = 0.5;
    group.add(handle, flame);
    return group;
  }
  const length = item.key === 'axe' ? 1.1 : item.key === 'dagger' ? 0.8 : 1.25;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, length, 0.18), new THREE.MeshLambertMaterial({ color }));
  mesh.castShadow = true;
  mesh.position.y = -0.2;
  return mesh;
};

export const createPlayer = ({ parent, spawnPoint }) => {
  const group = new THREE.Group();
  group.name = 'player';
  parent.add(group);

  const visualRoot = new THREE.Group();
  visualRoot.scale.setScalar(0.76);
  group.add(visualRoot);

  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 0;
  visualRoot.add(bodyPivot);

  const torso = createLimb('#d7a56d', new THREE.Vector3(0.9, 1.1, 0.5), new THREE.Vector3(0, 1.25, 0));
  const head = createLimb('#f0d2a0', new THREE.Vector3(0.72, 0.72, 0.72), new THREE.Vector3(0, 2.15, 0));
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.62, 1.68, 0);
  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.62, 1.68, 0);
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.22, 0.95, 0);
  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.22, 0.95, 0);
  const leftArm = createLimb('#9a6d47', new THREE.Vector3(0.28, 0.9, 0.28), new THREE.Vector3(0, -0.42, 0));
  const rightArm = createLimb('#9a6d47', new THREE.Vector3(0.28, 0.9, 0.28), new THREE.Vector3(0, -0.42, 0));
  const leftLeg = createLimb('#5a7ac4', new THREE.Vector3(0.3, 0.95, 0.3), new THREE.Vector3(0, -0.48, 0));
  const rightLeg = createLimb('#5a7ac4', new THREE.Vector3(0.3, 0.95, 0.3), new THREE.Vector3(0, -0.48, 0));
  const leftHandMount = new THREE.Group();
  leftHandMount.position.set(0, -0.82, 0);
  const rightHandMount = new THREE.Group();
  rightHandMount.position.set(0, -0.82, 0);

  leftArmPivot.add(leftArm, leftHandMount);
  rightArmPivot.add(rightArm, rightHandMount);
  leftLegPivot.add(leftLeg);
  rightLegPivot.add(rightLeg);
  bodyPivot.add(torso, head, leftArmPivot, rightArmPivot, leftLegPivot, rightLegPivot);

  const state = {
    position: spawnPoint.clone(),
    velocity: new THREE.Vector3(),
    lookYaw: Math.PI,
    lookPitch: -0.18,
    moveSpeed: 0,
    grounded: false,
    active: true,
    radius: PLAYER_CONFIG.radius,
    height: PLAYER_CONFIG.height,
    stepCycle: 0,
    attackTimer: 0,
    defendActive: false,
    respawnTimer: 0,
    hitFlash: 0,
  };

  group.position.copy(state.position);

  let leftEquipMesh = null;
  let rightEquipMesh = null;

  const refreshEquipment = ({ leftHand, rightHand }) => {
    if (leftEquipMesh) {
      rightHandMount.remove(leftEquipMesh);
    }
    if (rightEquipMesh) {
      leftHandMount.remove(rightEquipMesh);
    }
    leftEquipMesh = buildEquipmentMesh(leftHand);
    rightEquipMesh = buildEquipmentMesh(rightHand);
    if (leftEquipMesh) {
      rightHandMount.add(leftEquipMesh);
    }
    if (rightEquipMesh) {
      leftHandMount.add(rightEquipMesh);
    }
  };

  const getFocusPosition = () => new THREE.Vector3(state.position.x, state.position.y + PLAYER_CONFIG.eyeHeight, state.position.z);

  const damage = (amount) => {
    state.hitFlash = 0.18;
    return amount;
  };

  const heal = (amount, progression) => {
    progression.currentHealth = Math.min(progression.maxHealth, progression.currentHealth + amount);
  };

  const respawn = (point, progression) => {
    state.position.copy(point);
    state.velocity.set(0, 0, 0);
    state.active = true;
    state.respawnTimer = 0;
    progression.currentHealth = progression.maxHealth;
    group.visible = true;
  };

  const update = ({ dt, inputState, progression, collision, inventoryStats, inventoryOpen }) => {
    if (!state.active) {
      state.respawnTimer -= dt;
      return;
    }

    if (!inventoryOpen) {
      state.lookYaw -= inputState.mouseDeltaX * CAMERA_CONFIG.mouseSensitivity;
      state.lookPitch -= inputState.mouseDeltaY * CAMERA_CONFIG.mouseSensitivity;
      state.lookPitch = clamp(state.lookPitch, CAMERA_CONFIG.minPitch, CAMERA_CONFIG.maxPitch);
    }

    const moveVector = new THREE.Vector3(inputState.moveX, 0, inputState.moveZ);
    if (moveVector.lengthSq() > 0) {
      moveVector.normalize();
      const forward = yawToForward(state.lookYaw);
      const right = new THREE.Vector3(-forward.z, 0, forward.x);
      const worldMove = new THREE.Vector3();
      worldMove.addScaledVector(right, moveVector.x);
      worldMove.addScaledVector(forward, moveVector.z);
      worldMove.normalize();

      const speedTarget = (inputState.sprint ? PLAYER_CONFIG.sprintSpeed : PLAYER_CONFIG.walkSpeed) * (state.defendActive ? PLAYER_CONFIG.defendSlowMultiplier : 1);
      state.moveSpeed = damp(state.moveSpeed, speedTarget, 12, dt);
      const control = state.grounded ? 1 : PLAYER_CONFIG.airControl;
      state.velocity.x = damp(state.velocity.x, worldMove.x * state.moveSpeed, 10 * control, dt);
      state.velocity.z = damp(state.velocity.z, worldMove.z * state.moveSpeed, 10 * control, dt);
      bodyPivot.rotation.y = damp(bodyPivot.rotation.y, Math.atan2(worldMove.x, worldMove.z) - state.lookYaw, 14, dt);
      state.stepCycle += dt * state.moveSpeed * 1.5;
    } else {
      state.moveSpeed = damp(state.moveSpeed, 0, 14, dt);
      state.velocity.x = damp(state.velocity.x, 0, 12, dt);
      state.velocity.z = damp(state.velocity.z, 0, 12, dt);
      state.stepCycle += dt * 1.8;
    }

    const currentGround = collision.getGroundHeight(state.position.x, state.position.z);
    if (state.position.y <= currentGround + 0.02) {
      state.position.y = currentGround;
      state.grounded = true;
      state.velocity.y = Math.max(0, state.velocity.y);
    }

    if (state.grounded && inputState.jumpPressed) {
      state.velocity.y = PLAYER_CONFIG.jumpVelocity;
      state.grounded = false;
    }

    state.velocity.y -= PLAYER_CONFIG.gravity * dt;

    const tryMoveAxis = (axis) => {
      const candidate = state.position.clone();
      candidate[axis] += state.velocity[axis] * dt;
      const nextGround = collision.getGroundHeight(candidate.x, candidate.z);
      if (nextGround - currentGround <= PLAYER_CONFIG.maxStepHeight || !state.grounded) {
        state.position[axis] = candidate[axis];
      }
      collision.resolveSolids(state.position, state.radius, state.height);
    };

    tryMoveAxis('x');
    tryMoveAxis('z');

    state.position.y += state.velocity.y * dt;
    const newGround = collision.getGroundHeight(state.position.x, state.position.z);
    if (state.position.y <= newGround) {
      state.position.y = newGround;
      state.velocity.y = 0;
      state.grounded = true;
    }

    group.position.copy(state.position);
    group.rotation.y = state.lookYaw;
    group.rotation.x = 0;
    group.rotation.z = 0;

    state.attackTimer = Math.max(0, state.attackTimer - dt);
    state.hitFlash = Math.max(0, state.hitFlash - dt);
    const swing = Math.sin(state.stepCycle * 1.8) * Math.min(0.8, state.moveSpeed / PLAYER_CONFIG.sprintSpeed);
    leftLegPivot.rotation.x = swing;
    rightLegPivot.rotation.x = -swing;
    leftArmPivot.rotation.x = -swing * 0.7 - (state.defendActive ? 0.8 : 0);
    rightArmPivot.rotation.x = swing * 0.7 - (state.attackTimer > 0 ? Math.sin((1 - state.attackTimer / PLAYER_CONFIG.attackCooldown) * Math.PI) * 1.3 : 0);
    bodyPivot.position.y = Math.abs(Math.sin(state.stepCycle * 3.6)) * 0.06 + (state.grounded ? 0 : 0.1);
    bodyPivot.rotation.x = 0;
    bodyPivot.rotation.z = 0;

    if (leftEquipMesh?.children?.[1]) {
      leftEquipMesh.children[1].visible = (inventoryStats.glow ?? 0) > 0;
    }
    torso.material.emissive?.setScalar?.(state.hitFlash > 0 ? 0.3 : 0);
  };

  return {
    group,
    state,
    refreshEquipment,
    update,
    getFocusPosition,
    damage,
    heal,
    respawn,
  };
};