import * as THREE from 'three';

import { PLAYER_CONFIG } from '../core/constants.js';
import { xzDistance } from '../utils/math.js';

const forwardVector = new THREE.Vector3();
const enemyVector = new THREE.Vector3();

export const getPlayerCombatStats = ({ progression, inventory }) => {
  const equipped = inventory.getEquippedStats();
  return {
    damage: progression.baseDamage + equipped.damage,
    defense: progression.baseDefense + equipped.defense,
    block: equipped.block,
    glow: equipped.glow,
  };
};

export const performPlayerAttack = ({ player, enemies, progression, inventory, effects, onEnemyKilled }) => {
  if (!player.state.active || player.state.attackTimer > 0) {
    return false;
  }
  player.state.attackTimer = PLAYER_CONFIG.attackCooldown;

  const stats = getPlayerCombatStats({ progression, inventory });
  const origin = player.state.position;
  forwardVector.set(Math.sin(player.state.lookYaw), 0, Math.cos(player.state.lookYaw));
  let hit = false;

  effects.spawnRing({ position: origin.clone().add(new THREE.Vector3(0, 1, 0)), color: '#ffd489', lifetime: 0.25, endScale: 1.4 });

  for (const enemy of enemies) {
    if (!enemy.state.alive) {
      continue;
    }
    const distance = xzDistance(origin, enemy.state.position);
    if (distance > PLAYER_CONFIG.attackRange) {
      continue;
    }
    enemyVector.copy(enemy.state.position).sub(origin).setY(0).normalize();
    const angle = forwardVector.dot(enemyVector);
    if (angle < 0.15) {
      continue;
    }

    const damage = Math.max(4, stats.damage + Math.round((1 - player.state.attackTimer / PLAYER_CONFIG.attackCooldown) * 3));
    const died = enemy.applyDamage(damage);
    effects.spawnBurst({ position: enemy.state.position.clone().add(new THREE.Vector3(0, 0.8, 0)), color: '#ffad7f', count: 7, speed: 2.8 });
    hit = true;
    if (died) {
      onEnemyKilled?.(enemy);
    }
  }

  return hit;
};

export const applyDamageToPlayer = ({ player, progression, inventory, amount, effects, sourcePosition }) => {
  const stats = getPlayerCombatStats({ progression, inventory });
  let finalDamage = Math.max(1, amount - Math.round(stats.defense * 0.35));
  const leftHand = inventory.state.equipment.leftHand;
  if (player.state.defendActive && leftHand && (leftHand.type === 'defense' || leftHand.stats.block > 0)) {
    finalDamage *= Math.max(0.2, 1 - stats.block);
    effects.spawnRing({ position: player.state.position.clone().add(new THREE.Vector3(0, 1, 0)), color: '#89c9ff', lifetime: 0.22, endScale: 1.2 });
  } else {
    effects.spawnBurst({ position: player.state.position.clone().add(new THREE.Vector3(0, 1.1, 0)), color: '#ff6d66', count: 6, speed: 2.2 });
  }
  progression.currentHealth = Math.max(0, progression.currentHealth - Math.round(finalDamage));
  player.damage(finalDamage);
  if (sourcePosition) {
    const dx = sourcePosition.x - player.state.position.x;
    const dz = sourcePosition.z - player.state.position.z;
    if (Math.abs(dx) + Math.abs(dz) > 0.001) {
      player.state.lookYaw = Math.atan2(dx, dz);
    }
  }
  return finalDamage;
};