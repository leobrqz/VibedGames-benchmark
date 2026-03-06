export const WORLD_CONFIG = {
  size: 56,
  cellSize: 1.15,
  minHeight: 3,
  maxHeight: 6,
  seed: Math.floor(Math.random() * 1_000_000),
  maxPlacementAttempts: 40,
  itemSpawnCount: 18,
  campCount: 3,
  towerCount: 4,
  campClearRadius: 10,
};

export const PLAYER_CONFIG = {
  radius: 0.45,
  height: 2.2,
  eyeHeight: 2.05,
  walkSpeed: 5,
  sprintSpeed: 7.6,
  jumpVelocity: 7.8,
  gravity: 25,
  airControl: 0.35,
  maxStepHeight: 1.25,
  attackRange: 2.8,
  attackCooldown: 0.58,
  defendSlowMultiplier: 0.62,
  respawnDelay: 2.2,
};

export const CAMERA_CONFIG = {
  distance: 5.4,
  minDistance: 1.9,
  maxPitch: Math.PI * 0.32,
  minPitch: -Math.PI * 0.22,
  mouseSensitivity: 0.0026,
};

export const SLIME_CONFIG = {
  maxActive: 10,
  baseHealth: 50,
  baseDamage: 10,
  aggroRange: 12,
  attackRange: 1.65,
  moveSpeed: 2.3,
  respawnDelay: 6,
};

export const INVENTORY_CONFIG = {
  rows: 5,
  columns: 5,
  hotbarSize: 5,
  maxLogs: 5,
};

export const RARITIES = [
  { key: 'common', name: 'Common', color: '#b7b7b7', statMultiplier: 1, weight: 52 },
  { key: 'uncommon', name: 'Uncommon', color: '#64d86e', statMultiplier: 1.18, weight: 28 },
  { key: 'rare', name: 'Rare', color: '#55b5ff', statMultiplier: 1.38, weight: 14 },
  { key: 'legendary', name: 'Legendary', color: '#f48cff', statMultiplier: 1.72, weight: 6 },
];

export const ITEM_TEMPLATES = {
  sword: { key: 'sword', name: 'Sword', slot: 'rightHand', type: 'weapon', damage: 10, speed: 1.05 },
  shield: { key: 'shield', name: 'Shield', slot: 'leftHand', type: 'defense', defense: 12, block: 0.55 },
  torch: { key: 'torch', name: 'Torch', slot: 'leftHand', type: 'utility', damage: 4, glow: 1, defense: 2 },
  dagger: { key: 'dagger', name: 'Dagger', slot: 'rightHand', type: 'weapon', damage: 7, speed: 1.35 },
  axe: { key: 'axe', name: 'Axe', slot: 'rightHand', type: 'weapon', damage: 13, speed: 0.88 },
  berry: { key: 'berry', name: 'Berry', slot: 'consumable', type: 'consumable', heal: 16 },
  potion: { key: 'potion', name: 'Potion', slot: 'consumable', type: 'consumable', heal: 34 },
};

export const UI_TEXT = {
  pointerLock: 'Click to focus the game and enable camera look',
  inventoryHint: 'TAB inventory  |  1-5 hotbar  |  LMB attack  |  RMB defend',
};