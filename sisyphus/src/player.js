// ── Player Character ──
// Articulated low-poly humanoid with state machine and procedural animation

import * as THREE from 'three';
import { getScene } from './scene.js';
import { input } from './input.js';
import { getHeightAt } from './terrain.js';
import { createBoxMesh, clamp, lerp, dampLerp } from './utils.js';
import {
  PLAYER_WALK_SPEED, PLAYER_SPRINT_SPEED, PLAYER_PUSH_SPEED,
  PLAYER_PUSH_SPRINT_SPEED, PLAYER_JUMP_FORCE,
  PLAYER_RADIUS, PLAYER_GROUND_SNAP, GRAVITY,
  COLOR_SKIN, COLOR_CLOTH, COLOR_DARK
} from './constants.js';

// ── State definitions ──
export const PlayerState = {
  IDLE: 'idle',
  WALK: 'walk',
  SPRINT: 'sprint',
  PUSH: 'push',
  PUSH_SPRINT: 'pushSprint',
  EXHAUSTED: 'exhausted',
  AIRBORNE: 'airborne'
};

// ── Shared materials ──
let skinMat, clothMat, darkMat;

function initMaterials() {
  skinMat = new THREE.MeshStandardMaterial({
    color: COLOR_SKIN, roughness: 0.8, flatShading: true
  });
  clothMat = new THREE.MeshStandardMaterial({
    color: COLOR_CLOTH, roughness: 0.9, flatShading: true
  });
  darkMat = new THREE.MeshStandardMaterial({
    color: COLOR_DARK, roughness: 0.85, flatShading: true
  });
}

// ── Build character model ──

function buildCharacterModel() {
  initMaterials();

  const root = new THREE.Group();

  // -- Spine / torso (pivot at hip level) --
  const spine = new THREE.Group();
  spine.position.set(0, 0.82, 0);
  root.add(spine);

  // Hips
  const hips = createBoxMesh(0.40, 0.14, 0.20, clothMat);
  hips.position.set(0, 0.02, 0);
  spine.add(hips);

  // Torso
  const torso = createBoxMesh(0.38, 0.46, 0.22, clothMat);
  torso.position.set(0, 0.30, 0);
  spine.add(torso);

  // Shoulders (wider accent on torso)
  const shoulders = createBoxMesh(0.48, 0.08, 0.23, clothMat);
  shoulders.position.set(0, 0.52, 0);
  spine.add(shoulders);

  // Neck
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.07, 0.08, 6),
    skinMat
  );
  neck.position.set(0, 0.58, 0);
  neck.castShadow = true;
  spine.add(neck);

  // Head
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.66, 0);
  spine.add(headGroup);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.20, 0.22, 0.20),
    skinMat
  );
  head.castShadow = true;
  headGroup.add(head);

  // Hair (dark cap on top)
  const hair = new THREE.Mesh(
    new THREE.BoxGeometry(0.21, 0.08, 0.21),
    darkMat
  );
  hair.position.set(0, 0.12, -0.01);
  hair.castShadow = true;
  headGroup.add(hair);

  // -- Arms --
  // Left arm
  const leftShoulder = new THREE.Group();
  leftShoulder.position.set(-0.27, 0.48, 0);
  spine.add(leftShoulder);

  const leftUpperArm = createBoxMesh(0.10, 0.26, 0.10, skinMat);
  leftUpperArm.position.set(0, -0.13, 0);
  leftShoulder.add(leftUpperArm);

  const leftElbow = new THREE.Group();
  leftElbow.position.set(0, -0.26, 0);
  leftShoulder.add(leftElbow);

  const leftLowerArm = createBoxMesh(0.08, 0.24, 0.08, skinMat);
  leftLowerArm.position.set(0, -0.12, 0);
  leftElbow.add(leftLowerArm);

  const leftHand = createBoxMesh(0.07, 0.08, 0.05, skinMat);
  leftHand.position.set(0, -0.26, 0);
  leftElbow.add(leftHand);

  // Right arm
  const rightShoulder = new THREE.Group();
  rightShoulder.position.set(0.27, 0.48, 0);
  spine.add(rightShoulder);

  const rightUpperArm = createBoxMesh(0.10, 0.26, 0.10, skinMat);
  rightUpperArm.position.set(0, -0.13, 0);
  rightShoulder.add(rightUpperArm);

  const rightElbow = new THREE.Group();
  rightElbow.position.set(0, -0.26, 0);
  rightShoulder.add(rightElbow);

  const rightLowerArm = createBoxMesh(0.08, 0.24, 0.08, skinMat);
  rightLowerArm.position.set(0, -0.12, 0);
  rightElbow.add(rightLowerArm);

  const rightHand = createBoxMesh(0.07, 0.08, 0.05, skinMat);
  rightHand.position.set(0, -0.26, 0);
  rightElbow.add(rightHand);

  // -- Legs --
  // Left leg
  const leftHip = new THREE.Group();
  leftHip.position.set(-0.11, 0.82, 0);
  root.add(leftHip);

  const leftUpperLeg = createBoxMesh(0.13, 0.36, 0.13, clothMat);
  leftUpperLeg.position.set(0, -0.18, 0);
  leftHip.add(leftUpperLeg);

  const leftKnee = new THREE.Group();
  leftKnee.position.set(0, -0.36, 0);
  leftHip.add(leftKnee);

  const leftLowerLeg = createBoxMesh(0.11, 0.34, 0.11, skinMat);
  leftLowerLeg.position.set(0, -0.17, 0);
  leftKnee.add(leftLowerLeg);

  const leftFoot = createBoxMesh(0.11, 0.05, 0.20, darkMat);
  leftFoot.position.set(0, -0.36, 0.03);
  leftKnee.add(leftFoot);

  // Right leg
  const rightHip = new THREE.Group();
  rightHip.position.set(0.11, 0.82, 0);
  root.add(rightHip);

  const rightUpperLeg = createBoxMesh(0.13, 0.36, 0.13, clothMat);
  rightUpperLeg.position.set(0, -0.18, 0);
  rightHip.add(rightUpperLeg);

  const rightKnee = new THREE.Group();
  rightKnee.position.set(0, -0.36, 0);
  rightHip.add(rightKnee);

  const rightLowerLeg = createBoxMesh(0.11, 0.34, 0.11, skinMat);
  rightLowerLeg.position.set(0, -0.17, 0);
  rightKnee.add(rightLowerLeg);

  const rightFoot = createBoxMesh(0.11, 0.05, 0.20, darkMat);
  rightFoot.position.set(0, -0.36, 0.03);
  rightKnee.add(rightFoot);

  return {
    root,
    joints: {
      spine,
      headGroup,
      leftShoulder, leftElbow,
      rightShoulder, rightElbow,
      leftHip, leftKnee,
      rightHip, rightKnee
    }
  };
}

// ── Animation System ──

function animateIdle(joints, time) {
  const breathe = Math.sin(time * 1.8) * 0.015;
  joints.spine.rotation.x = breathe;
  joints.headGroup.rotation.x = breathe * 0.5;

  joints.leftShoulder.rotation.x = 0;
  joints.leftShoulder.rotation.z = 0.08;
  joints.leftElbow.rotation.x = -0.05;
  joints.rightShoulder.rotation.x = 0;
  joints.rightShoulder.rotation.z = -0.08;
  joints.rightElbow.rotation.x = -0.05;

  joints.leftHip.rotation.x = 0;
  joints.leftKnee.rotation.x = 0;
  joints.rightHip.rotation.x = 0;
  joints.rightKnee.rotation.x = 0;
}

function animateWalk(joints, time, speed) {
  const cycle = Math.sin(time * speed * 2.8);
  const cycleAbs = Math.abs(cycle);

  joints.spine.rotation.x = 0.03;
  joints.headGroup.rotation.x = -0.02;

  // Arms swing opposite to legs
  joints.leftShoulder.rotation.x = cycle * 0.35;
  joints.leftShoulder.rotation.z = 0.06;
  joints.leftElbow.rotation.x = -cycleAbs * 0.3 - 0.1;
  joints.rightShoulder.rotation.x = -cycle * 0.35;
  joints.rightShoulder.rotation.z = -0.06;
  joints.rightElbow.rotation.x = -cycleAbs * 0.3 - 0.1;

  // Legs
  joints.leftHip.rotation.x = -cycle * 0.4;
  joints.leftKnee.rotation.x = Math.max(0, cycle) * 0.5;
  joints.rightHip.rotation.x = cycle * 0.4;
  joints.rightKnee.rotation.x = Math.max(0, -cycle) * 0.5;
}

function animateSprint(joints, time) {
  const cycle = Math.sin(time * 8.5);
  const cycleAbs = Math.abs(cycle);

  joints.spine.rotation.x = 0.12;
  joints.headGroup.rotation.x = -0.05;

  joints.leftShoulder.rotation.x = cycle * 0.55;
  joints.leftShoulder.rotation.z = 0.04;
  joints.leftElbow.rotation.x = -cycleAbs * 0.6 - 0.2;
  joints.rightShoulder.rotation.x = -cycle * 0.55;
  joints.rightShoulder.rotation.z = -0.04;
  joints.rightElbow.rotation.x = -cycleAbs * 0.6 - 0.2;

  joints.leftHip.rotation.x = -cycle * 0.6;
  joints.leftKnee.rotation.x = Math.max(0, cycle) * 0.7;
  joints.rightHip.rotation.x = cycle * 0.6;
  joints.rightKnee.rotation.x = Math.max(0, -cycle) * 0.7;
}

function animatePush(joints, time, isSprinting) {
  const strain = isSprinting ? 0.32 : 0.22;
  const legCycle = Math.sin(time * (isSprinting ? 5.5 : 3.5));
  const effort = Math.sin(time * 2) * 0.02;

  // Body leans forward
  joints.spine.rotation.x = strain + effort;
  joints.headGroup.rotation.x = -0.1 - effort;

  // Arms extended forward
  joints.leftShoulder.rotation.x = -1.2;
  joints.leftShoulder.rotation.z = 0.2;
  joints.leftElbow.rotation.x = -0.25;
  joints.rightShoulder.rotation.x = -1.2;
  joints.rightShoulder.rotation.z = -0.2;
  joints.rightElbow.rotation.x = -0.25;

  // Driving legs with small stride
  const legAmp = isSprinting ? 0.35 : 0.2;
  joints.leftHip.rotation.x = -legCycle * legAmp - 0.1;
  joints.leftKnee.rotation.x = Math.max(0, legCycle) * legAmp * 0.8;
  joints.rightHip.rotation.x = legCycle * legAmp - 0.1;
  joints.rightKnee.rotation.x = Math.max(0, -legCycle) * legAmp * 0.8;
}

function animateExhausted(joints, time) {
  const heavyBreath = Math.sin(time * 3) * 0.04;

  joints.spine.rotation.x = 0.15 + heavyBreath;
  joints.headGroup.rotation.x = -0.1 + heavyBreath * 0.5;

  joints.leftShoulder.rotation.x = -0.3;
  joints.leftShoulder.rotation.z = 0.25;
  joints.leftElbow.rotation.x = -0.8;
  joints.rightShoulder.rotation.x = -0.3;
  joints.rightShoulder.rotation.z = -0.25;
  joints.rightElbow.rotation.x = -0.8;

  joints.leftHip.rotation.x = -0.05;
  joints.leftKnee.rotation.x = 0.1;
  joints.rightHip.rotation.x = -0.05;
  joints.rightKnee.rotation.x = 0.1;
}

// ── Joint Smoothing (blend current toward target) ──

const prevJointRotations = {};

function initSmoothing(joints) {
  for (const [name, joint] of Object.entries(joints)) {
    prevJointRotations[name] = {
      x: joint.rotation.x,
      y: joint.rotation.y,
      z: joint.rotation.z
    };
  }
}

function smoothJoints(joints, dt) {
  const factor = 1 - Math.exp(-12 * dt);
  for (const [name, joint] of Object.entries(joints)) {
    const prev = prevJointRotations[name];
    if (!prev) continue;
    joint.rotation.x = lerp(prev.x, joint.rotation.x, factor);
    joint.rotation.y = lerp(prev.y, joint.rotation.y, factor);
    joint.rotation.z = lerp(prev.z, joint.rotation.z, factor);
    prev.x = joint.rotation.x;
    prev.y = joint.rotation.y;
    prev.z = joint.rotation.z;
  }
}

// ── Player Controller ──

let model = null;
let joints = null;
let state = PlayerState.IDLE;
let position = new THREE.Vector3(0, 0, 2);
let velocity = new THREE.Vector3();
let facing = 0; // Y-axis rotation (radians)
let isGrounded = true;
let animTime = 0;
let isPushing = false;
let canSprint = true;

// External references set by main
let getStamina = () => ({ current: 100, canSprint: true });
let getCameraYaw = () => 0;
let getBoulderRef = () => null;

export function initPlayer() {
  const built = buildCharacterModel();
  model = built.root;
  joints = built.joints;

  position.set(0, getHeightAt(0, 2), 2);
  model.position.copy(position);

  getScene().add(model);
  initSmoothing(joints);
}

export function setPlayerDependencies(staminaFn, cameraYawFn, boulderRefFn) {
  getStamina = staminaFn;
  getCameraYaw = cameraYawFn;
  getBoulderRef = boulderRefFn;
}

export function getPlayerPosition() { return position; }
export function getPlayerState() { return state; }
export function isPlayerPushing() { return isPushing; }
export function getPlayerFacing() { return facing; }
export function getPlayerVelocity() { return velocity; }
export function setPlayerPushing(v) { isPushing = v; }

export function updatePlayer(dt) {
  const staminaInfo = getStamina();
  canSprint = staminaInfo.canSprint;

  const cameraYaw = getCameraYaw();

  // ── Compute movement direction (camera-relative) ──
  let moveX = 0;
  let moveZ = 0;
  if (input.forward) moveZ += 1;
  if (input.back)    moveZ -= 1;
  if (input.left)    moveX -= 1;
  if (input.right)   moveX += 1;

  const hasInput = moveX !== 0 || moveZ !== 0;

  // Rotate move direction by camera yaw
  const moveDir = new THREE.Vector3();
  if (hasInput) {
    const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
    moveX /= len;
    moveZ /= len;
    const cos = Math.cos(cameraYaw);
    const sin = Math.sin(cameraYaw);
    // right = (cos(yaw), 0, -sin(yaw)), forward = (-sin(yaw), 0, -cos(yaw))
    // worldDir = moveX * right + moveZ * forward
    moveDir.set(
      moveX * cos - moveZ * sin,
      0,
      -moveX * sin - moveZ * cos
    );
  }

  // ── Determine speed ──
  const wantsSprint = input.sprint && canSprint;
  let speed;
  if (isPushing) {
    speed = wantsSprint ? PLAYER_PUSH_SPRINT_SPEED : PLAYER_PUSH_SPEED;
  } else {
    speed = wantsSprint ? PLAYER_SPRINT_SPEED : PLAYER_WALK_SPEED;
  }

  // ── Apply horizontal movement ──
  if (hasInput) {
    velocity.x = moveDir.x * speed;
    velocity.z = moveDir.z * speed;

    // Face the movement direction
    const targetFacing = Math.atan2(moveDir.x, moveDir.z);
    facing = dampLerp(facing, targetFacing, 10, dt);
  } else {
    // Decelerate
    velocity.x *= Math.max(0, 1 - 12 * dt);
    velocity.z *= Math.max(0, 1 - 12 * dt);
  }

  // ── Jump ──
  if (input.jump && isGrounded && !isPushing) {
    velocity.y = PLAYER_JUMP_FORCE;
    isGrounded = false;
  }

  // ── Gravity ──
  if (!isGrounded) {
    velocity.y -= GRAVITY * dt;
  }

  // ── Integrate position ──
  position.x += velocity.x * dt;
  position.y += velocity.y * dt;
  position.z += velocity.z * dt;

  // ── Ground collision ──
  const groundY = getHeightAt(position.x, position.z);
  if (position.y <= groundY) {
    position.y = groundY;
    velocity.y = 0;
    isGrounded = true;
  } else if (position.y > groundY + PLAYER_GROUND_SNAP && isGrounded) {
    // Walking off edge
    isGrounded = false;
  }

  // ── Snap to ground when grounded (follow terrain) ──
  if (isGrounded && !input.jump) {
    position.y = lerp(position.y, groundY, 1 - Math.exp(-20 * dt));
  }

  // ── Clamp to path boundaries ──
  const maxX = 10;
  position.x = clamp(position.x, -maxX, maxX);

  // ── Boulder collision (push away from boulder) ──
  const boulder = getBoulderRef();
  if (boulder && !isPushing) {
    const toBoulder = new THREE.Vector3().subVectors(boulder.position, position);
    toBoulder.y = 0;
    const dist = toBoulder.length();
    const minDist = PLAYER_RADIUS + boulder.radius;
    if (dist < minDist && dist > 0.01) {
      const pushBack = toBoulder.normalize().multiplyScalar(dist - minDist);
      position.add(pushBack);
    }
  }

  // ── Update state ──
  const horizontalSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);

  if (!isGrounded) {
    state = PlayerState.AIRBORNE;
  } else if (isPushing && staminaInfo.current <= 0) {
    state = PlayerState.EXHAUSTED;
  } else if (isPushing && wantsSprint) {
    state = PlayerState.PUSH_SPRINT;
  } else if (isPushing) {
    state = PlayerState.PUSH;
  } else if (wantsSprint && horizontalSpeed > 1) {
    state = PlayerState.SPRINT;
  } else if (horizontalSpeed > 0.5) {
    state = PlayerState.WALK;
  } else {
    state = PlayerState.IDLE;
  }

  // ── Animate ──
  animTime += dt;

  switch (state) {
    case PlayerState.IDLE:
      animateIdle(joints, animTime);
      break;
    case PlayerState.WALK:
      animateWalk(joints, animTime, 1.0);
      break;
    case PlayerState.SPRINT:
      animateSprint(joints, animTime);
      break;
    case PlayerState.PUSH:
      animatePush(joints, animTime, false);
      break;
    case PlayerState.PUSH_SPRINT:
      animatePush(joints, animTime, true);
      break;
    case PlayerState.EXHAUSTED:
      animateExhausted(joints, animTime);
      break;
    case PlayerState.AIRBORNE:
      // Slight tuck
      animateIdle(joints, animTime);
      joints.leftHip.rotation.x = -0.2;
      joints.rightHip.rotation.x = -0.2;
      break;
  }

  smoothJoints(joints, dt);

  // ── Update visual model ──
  model.position.copy(position);
  model.rotation.y = facing;
}

export function getPlayerModel() { return model; }
