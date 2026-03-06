import * as THREE from 'three';

import { SLIME_CONFIG } from '../core/constants.js';
import { createEnemyProgression, gainEnemyXp, getEnemyCombatStats } from '../systems/progression.js';
import { xzDistance } from '../utils/math.js';

const createSlimeMaterial = (color) => new THREE.MeshLambertMaterial({ color });

export const createSlime = ({ parent, position, rng, seedXp, campId = null }) => {
  const progression = createEnemyProgression(seedXp);
  const combatStats = getEnemyCombatStats(progression);

  const group = new THREE.Group();
  group.position.copy(position);
  parent.add(group);

  const hue = rng.range(0.28, 0.42);
  const saturation = rng.range(0.5, 0.85);
  const lightness = rng.range(0.45, 0.6);
  const bodyColor = new THREE.Color().setHSL(hue, saturation, lightness);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.52, 14, 12), createSlimeMaterial(bodyColor));
  body.scale.y = 0.68;
  body.castShadow = true;
  body.receiveShadow = true;
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), new THREE.MeshBasicMaterial({ color: '#10200d' }));
  const eyeR = eyeL.clone();
  eyeL.position.set(-0.12, 0.12, 0.32);
  eyeR.position.set(0.12, 0.12, 0.32);
  group.add(body, eyeL, eyeR);

  const state = {
    id: `slime-${Math.random().toString(36).slice(2)}`,
    position: position.clone(),
    velocity: new THREE.Vector3(),
    radius: 0.5,
    height: 0.9,
    active: true,
    alive: true,
    campId,
    home: position.clone(),
    roamTarget: position.clone(),
    hopTime: Math.random() * Math.PI * 2,
    attackCooldown: 0,
    hitFlash: 0,
    respawnTimer: 0,
    progression,
    combatStats,
    currentHealth: combatStats.maxHealth,
  };

  const resetStats = (newSeedXp) => {
    state.progression.xp = newSeedXp;
    state.progression.level = Math.min(state.progression.maxLevel, Math.floor(newSeedXp / 100));
    state.combatStats = getEnemyCombatStats(state.progression);
    state.currentHealth = state.combatStats.maxHealth;
  };

  const applyDamage = (amount) => {
    state.currentHealth -= amount;
    state.hitFlash = 0.18;
    if (state.currentHealth <= 0) {
      state.alive = false;
      state.active = false;
      state.respawnTimer = SLIME_CONFIG.respawnDelay;
      group.visible = false;
      return true;
    }
    return false;
  };

  const respawn = (spawnPoint, seedXp) => {
    state.position.copy(spawnPoint);
    state.home.copy(spawnPoint);
    state.velocity.set(0, 0, 0);
    state.alive = true;
    state.active = true;
    state.attackCooldown = rng.range(0.6, 1.2);
    state.respawnTimer = 0;
    state.roamTarget.copy(spawnPoint);
    resetStats(seedXp);
    group.position.copy(state.position);
    group.visible = true;
  };

  const update = ({ dt, player, collision, onAttack, playerXpForGrowth }) => {
    if (!state.alive) {
      state.respawnTimer -= dt;
      return;
    }

    state.attackCooldown = Math.max(0, state.attackCooldown - dt);
    state.hitFlash = Math.max(0, state.hitFlash - dt);
    state.hopTime += dt * 5;

    const distanceToPlayer = xzDistance(state.position, player.state.position);
    let target = state.roamTarget;
    if (distanceToPlayer < SLIME_CONFIG.aggroRange && player.state.active) {
      target = player.state.position;
    } else if (xzDistance(state.position, state.roamTarget) < 1.2) {
      state.roamTarget = state.home.clone().add(new THREE.Vector3(rng.range(-5, 5), 0, rng.range(-5, 5)));
      target = state.roamTarget;
    }

    const direction = new THREE.Vector3(target.x - state.position.x, 0, target.z - state.position.z);
    if (direction.lengthSq() > 0.001) {
      direction.normalize();
      const speed = state.combatStats.moveSpeed * (distanceToPlayer < 2 ? 0.55 : 1);
      state.velocity.x = direction.x * speed;
      state.velocity.z = direction.z * speed;
    } else {
      state.velocity.x = 0;
      state.velocity.z = 0;
    }

    const currentGround = collision.getGroundHeight(state.position.x, state.position.z);
    const candidate = state.position.clone().addScaledVector(state.velocity, dt);
    const nextGround = collision.getGroundHeight(candidate.x, candidate.z);
    if (Math.abs(nextGround - currentGround) <= 1.5) {
      state.position.copy(candidate);
    }
    collision.resolveSolids(state.position, state.radius, state.height);
    state.position.y = collision.getGroundHeight(state.position.x, state.position.z);
    group.position.copy(state.position);

    if (distanceToPlayer <= SLIME_CONFIG.attackRange && state.attackCooldown <= 0 && player.state.active) {
      state.attackCooldown = 1.5;
      gainEnemyXp(state.progression, 15 + playerXpForGrowth * 0.02);
      state.combatStats = getEnemyCombatStats(state.progression);
      onAttack?.(state);
    }

    const bounce = Math.sin(state.hopTime) * 0.08;
    body.scale.set(1 + bounce * 0.32, 0.68 - bounce * 0.3, 1 + bounce * 0.32);
    body.position.y = Math.max(0, bounce + 0.05);
    body.material.emissive?.setScalar?.(state.hitFlash > 0 ? 0.2 : 0);
  };

  return {
    group,
    state,
    applyDamage,
    respawn,
    resetStats,
    update,
  };
};