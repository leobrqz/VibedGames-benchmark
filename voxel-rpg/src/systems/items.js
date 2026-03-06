import * as THREE from 'three';

import { ITEM_TEMPLATES, RARITIES } from '../core/constants.js';

let itemId = 0;

const equipmentPool = ['sword', 'shield', 'torch', 'dagger', 'axe'];
const consumablePool = ['berry', 'potion'];

const shapeFactories = {
  sword: () => new THREE.BoxGeometry(0.18, 1.2, 0.18),
  shield: () => new THREE.BoxGeometry(0.85, 1, 0.2),
  torch: () => new THREE.CylinderGeometry(0.1, 0.12, 0.9, 6),
  dagger: () => new THREE.BoxGeometry(0.14, 0.85, 0.14),
  axe: () => new THREE.BoxGeometry(0.3, 1.1, 0.18),
  berry: () => new THREE.SphereGeometry(0.24, 10, 10),
  potion: () => new THREE.CylinderGeometry(0.2, 0.24, 0.6, 10),
};

const rarityClassMap = {
  common: 'rarity-common',
  uncommon: 'rarity-uncommon',
  rare: 'rarity-rare',
  legendary: 'rarity-legendary',
};

export const rollItem = (rng, forcedKey = null) => {
  const key = forcedKey ?? (rng.chance(0.24) ? rng.pick(consumablePool) : rng.pick(equipmentPool));
  const template = ITEM_TEMPLATES[key];
  const rarity = rng.weighted(RARITIES);
  const stats = {
    damage: Math.round((template.damage ?? 0) * rarity.statMultiplier),
    defense: Math.round((template.defense ?? 0) * rarity.statMultiplier),
    block: Math.min(0.8, (template.block ?? 0) * (0.92 + rarity.statMultiplier * 0.15)),
    heal: Math.round((template.heal ?? 0) * (0.92 + rarity.statMultiplier * 0.2)),
    glow: template.glow ?? 0,
    speed: template.speed ?? 1,
  };

  return {
    id: `item-${itemId += 1}`,
    key,
    name: template.name,
    type: template.type,
    slot: template.slot,
    rarity: rarity.key,
    rarityName: rarity.name,
    rarityColor: rarity.color,
    rarityClass: rarityClassMap[rarity.key],
    stats,
  };
};

export const createPickup = ({ item, position }) => {
  const group = new THREE.Group();
  group.position.copy(position);

  const mesh = new THREE.Mesh(
    shapeFactories[item.key](),
    new THREE.MeshLambertMaterial({ color: item.rarityColor }),
  );
  mesh.castShadow = true;
  mesh.position.y = 0.8;
  group.add(mesh);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.7, 0.06, 8, 18),
    new THREE.MeshBasicMaterial({ color: item.rarityColor, transparent: true, opacity: 0.72 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  group.add(ring);

  return {
    item,
    group,
    mesh,
    ring,
    bobOffset: Math.random() * Math.PI * 2,
    active: true,
  };
};

export const updatePickupVisual = (pickup, time) => {
  if (!pickup.active) {
    return;
  }
  pickup.mesh.position.y = 0.72 + Math.sin(time * 2.4 + pickup.bobOffset) * 0.16;
  pickup.mesh.rotation.y += 0.012;
  pickup.ring.material.opacity = 0.45 + Math.sin(time * 2 + pickup.bobOffset) * 0.2;
};

export const describeItemStats = (item) => {
  if (!item) {
    return 'Empty';
  }
  if (item.type === 'consumable') {
    return `Heals ${item.stats.heal}`;
  }
  const pieces = [];
  if (item.stats.damage) {
    pieces.push(`DMG ${item.stats.damage}`);
  }
  if (item.stats.defense) {
    pieces.push(`DEF ${item.stats.defense}`);
  }
  if (item.stats.block) {
    pieces.push(`BLK ${Math.round(item.stats.block * 100)}%`);
  }
  return pieces.join(' • ');
};