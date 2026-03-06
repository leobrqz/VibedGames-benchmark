import * as THREE from 'three';

import { createInput } from './input.js';
import { PLAYER_CONFIG, SLIME_CONFIG, WORLD_CONFIG } from './constants.js';
import { createSceneContext } from './scene.js';
import { createRng } from '../utils/random.js';
import { disposeObject3D } from '../utils/dispose.js';
import { createTerrain } from '../world/terrain.js';
import { createPlacementSystem } from '../world/placement.js';
import { createStructures } from '../world/structures.js';
import { createVegetation } from '../world/vegetation.js';
import { createCollisionSystem } from '../physics/collision.js';
import { createPlayer } from '../entities/player.js';
import { createSlime } from '../entities/slime.js';
import { createEffectsSystem } from '../fx/effects.js';
import { createPlayerProgression, awardPlayerXp } from '../systems/progression.js';
import { createInventorySystem } from '../systems/inventory.js';
import { applyDamageToPlayer, getPlayerCombatStats, performPlayerAttack } from '../systems/combat.js';
import { createHud } from '../ui/hud.js';
import { createInventoryView } from '../ui/inventoryView.js';
import { createPickup, rollItem, updatePickupVisual } from '../systems/items.js';
import { createQuestSystem } from '../systems/quests.js';
import { xzDistance } from '../utils/math.js';

const clock = new THREE.Clock();

export class Game {
  constructor({ canvas, uiRoot }) {
    this.canvas = canvas;
    this.uiRoot = uiRoot;
    this.sceneContext = createSceneContext({ canvas });
    this.rng = createRng(WORLD_CONFIG.seed);
    this.progression = createPlayerProgression();
    this.logs = [];
    this.pickups = [];
    this.slimes = [];
    this.rafId = 0;
    this.timeOfDay = 0.23;
    this.elapsed = 0;
    this.inventoryOpen = false;
    this.resizeHandler = () => this.onResize();
  }

  addLog(message) {
    this.logs.unshift(message);
    this.logs = this.logs.slice(0, 5);
  }

  start() {
    this.onResize();
    window.addEventListener('resize', this.resizeHandler);

    this.terrain = createTerrain({ rng: this.rng, parent: this.sceneContext.worldRoot });
    this.placement = createPlacementSystem({ terrain: this.terrain, rng: this.rng });
    this.structures = createStructures({
      parent: this.sceneContext.worldRoot,
      terrain: this.terrain,
      placement: this.placement,
      rng: this.rng,
    });
    this.vegetation = createVegetation({
      parent: this.sceneContext.worldRoot,
      terrain: this.terrain,
      placement: this.placement,
      rng: this.rng,
    });
    this.collision = createCollisionSystem({
      terrain: this.terrain,
      solids: [...this.structures.solids, ...this.vegetation.solids],
      walkableSurfaces: this.structures.walkableSurfaces,
    });
    this.effects = createEffectsSystem({ parent: this.sceneContext.fxRoot });

    const spawnPoint = this.terrain.randomSurfacePoint(10, 0.8);
    this.spawnPoint = spawnPoint.clone();

    this.player = createPlayer({ parent: this.sceneContext.entityRoot, spawnPoint });
    this.inventory = createInventorySystem({
      onChange: () => this.onInventoryChanged(),
      onLog: (message) => this.addLog(message),
    });
    this.questSystem = createQuestSystem({
      onReward: (xp) => this.gainXp(xp),
      onLog: (message) => this.addLog(message),
    });

    this.hud = createHud(this.uiRoot);
    this.inventoryView = createInventoryView({
      root: this.uiRoot,
      inventory: this.inventory,
      getCombatStats: () => getPlayerCombatStats({ progression: this.progression, inventory: this.inventory }),
    });
    this.uiRoot.addEventListener('inventory-consume', (event) => {
      const item = event.detail;
      if (!item) {
        return;
      }
      this.player.heal(item.stats.heal, this.progression);
      this.effects.spawnBurst({ position: this.player.state.position.clone().add(new THREE.Vector3(0, 1.2, 0)), color: item.rarityColor, count: 10, speed: 2.5 });
      this.addLog(`Used ${item.name}`);
    });
    this.inventoryView.setOpen(false);

    this.input = createInput({
      domElement: this.canvas,
      onToggleInventory: (isOpen) => this.toggleInventory(isOpen),
      onHotbar: (index) => {
        this.inventory.activateHotbar(index, {
          onConsume: (item) => {
            this.player.heal(item.stats.heal, this.progression);
            this.effects.spawnBurst({ position: this.player.state.position.clone().add(new THREE.Vector3(0, 1.2, 0)), color: item.rarityColor, count: 10, speed: 2.5 });
            this.addLog(`Used ${item.name}`);
          },
        });
      },
    });

    this.spawnInitialItems();
    this.spawnSlimes();
    this.onInventoryChanged();
    this.loop();
  }

  onResize() {
    this.sceneContext.setSize(window.innerWidth, window.innerHeight);
  }

  toggleInventory(isOpen) {
    this.inventoryOpen = isOpen;
    this.input.setEnabled(!isOpen);
    this.inventoryView.setOpen(isOpen);
  }

  onInventoryChanged() {
    this.player.refreshEquipment(this.inventory.state.equipment);
    this.inventoryView.render({ progression: this.progression });
  }

  gainXp(amount) {
    const result = awardPlayerXp(this.progression, amount);
    if (result.leveledUp) {
      this.addLog(`Reached level ${this.progression.level}`);
      this.effects.spawnRing({ position: this.player.state.position.clone().add(new THREE.Vector3(0, 1.1, 0)), color: '#72f1b8', lifetime: 0.7, endScale: 3 });
      this.effects.spawnBurst({ position: this.player.state.position.clone().add(new THREE.Vector3(0, 1.1, 0)), color: '#72f1b8', count: 16, speed: 3.6, lifetime: 0.8 });
    }
  }

  spawnItemAt(position, forcedKey = null) {
    const item = rollItem(this.rng, forcedKey);
    const pickup = createPickup({ item, position });
    this.sceneContext.worldRoot.add(pickup.group);
    this.pickups.push(pickup);
  }

  spawnInitialItems() {
    for (let index = 0; index < WORLD_CONFIG.itemSpawnCount; index += 1) {
      const point = this.terrain.randomSurfacePoint(6, 1.4);
      point.y = this.terrain.getHeightAt(point.x, point.z);
      this.spawnItemAt(point);
    }
    ['sword', 'shield', 'torch'].forEach((key, index) => {
      const point = this.spawnPoint.clone().add(new THREE.Vector3(index * 1.4 - 1.4, 0, 2.8));
      point.y = this.terrain.getHeightAt(point.x, point.z);
      this.spawnItemAt(point, key);
    });
  }

  spawnSlimes() {
    const campAssignments = this.structures.camps.flatMap((camp) => camp.enemySpawns.map((spawn) => ({ campId: camp.id, point: spawn })));
    this.campState = new Map(this.structures.camps.map((camp) => [camp.id, { remaining: camp.enemySpawns.length, cleared: false }]));

    for (let index = 0; index < SLIME_CONFIG.maxActive; index += 1) {
      const assignment = campAssignments[index] ?? { campId: null, point: this.terrain.randomSurfacePoint(5, 1.6) };
      assignment.point.y = this.terrain.getHeightAt(assignment.point.x, assignment.point.z);
      const slime = createSlime({
        parent: this.sceneContext.entityRoot,
        position: assignment.point,
        rng: this.rng,
        seedXp: this.progression.xp,
        campId: assignment.campId,
      });
      this.slimes.push(slime);
    }
  }

  handleEnemyKill(enemy) {
    this.effects.spawnBurst({ position: enemy.state.position.clone().add(new THREE.Vector3(0, 0.8, 0)), color: '#a5ff88', count: 14, speed: 3.2, lifetime: 0.8 });
    this.effects.spawnRing({ position: enemy.state.position.clone().add(new THREE.Vector3(0, 0.2, 0)), color: '#a5ff88', lifetime: 0.5, endScale: 2 });
    this.gainXp(18 + enemy.state.progression.level * 6);
    if (this.rng.chance(0.68)) {
      const dropKey = this.rng.chance(0.7) ? 'berry' : 'potion';
      this.spawnItemAt(enemy.state.position.clone(), dropKey);
    }
    if (enemy.state.campId) {
      const camp = this.campState.get(enemy.state.campId);
      if (camp && !camp.cleared) {
        camp.remaining -= 1;
        if (camp.remaining <= 0) {
          camp.cleared = true;
          this.questSystem.onCampCleared();
          this.addLog(`Camp cleared: ${enemy.state.campId}`);
        }
      }
      enemy.state.campId = null;
    }
  }

  updatePickups() {
    for (let index = this.pickups.length - 1; index >= 0; index -= 1) {
      const pickup = this.pickups[index];
      updatePickupVisual(pickup, this.elapsed);
      if (!pickup.active) {
        continue;
      }
      if (xzDistance(this.player.state.position, pickup.group.position) < 1.25) {
        const accepted = this.inventory.addItem(pickup.item);
        if (!accepted) {
          continue;
        }
        if (pickup.item.type === 'consumable') {
          this.inventory.bindItemToHotbar(pickup.item.id);
        }
        pickup.active = false;
        this.questSystem.onItemCollected();
        this.effects.spawnBurst({ position: pickup.group.position.clone().add(new THREE.Vector3(0, 0.8, 0)), color: pickup.item.rarityColor, count: 10, speed: 2.6 });
        this.effects.spawnRing({ position: pickup.group.position.clone().add(new THREE.Vector3(0, 0.2, 0)), color: pickup.item.rarityColor, endScale: 1.4 });
        this.sceneContext.worldRoot.remove(pickup.group);
        disposeObject3D(pickup.group);
        this.pickups.splice(index, 1);
      }
    }
  }

  updateSlimes(dt) {
    for (const slime of this.slimes) {
      slime.update({
        dt,
        player: this.player,
        collision: this.collision,
        playerXpForGrowth: this.progression.xp + (this.progression.level - 1) * 100,
        onAttack: (enemyState) => {
          if (!this.player.state.active) {
            return;
          }
          applyDamageToPlayer({
            player: this.player,
            progression: this.progression,
            inventory: this.inventory,
            amount: enemyState.combatStats.damage,
            effects: this.effects,
            sourcePosition: slime.state.position,
          });
          if (this.progression.currentHealth <= 0) {
            this.killPlayer();
          }
        },
      });

      if (!slime.state.alive && slime.state.respawnTimer <= 0) {
        const respawnPoint = this.terrain.randomSurfacePoint(5, 1.6);
        respawnPoint.y = this.terrain.getHeightAt(respawnPoint.x, respawnPoint.z);
        slime.respawn(respawnPoint, this.progression.xp + (this.progression.level - 1) * 100);
        this.effects.spawnRing({ position: respawnPoint.clone().add(new THREE.Vector3(0, 0.3, 0)), color: '#7ee786', endScale: 2.2, lifetime: 0.5 });
      }
    }
  }

  updateHealSpots(dt) {
    for (const spot of this.structures.healSpots) {
      if (xzDistance(this.player.state.position, spot.position) <= spot.radius && this.progression.currentHealth < this.progression.maxHealth) {
        this.progression.currentHealth = Math.min(this.progression.maxHealth, this.progression.currentHealth + dt * 8);
        if (this.rng.chance(dt * 5)) {
          this.effects.spawnBurst({ position: spot.position.clone().add(new THREE.Vector3(0, 0.5, 0)), color: '#ffce7a', count: 4, speed: 1.6, lifetime: 0.45, size: 0.08 });
        }
      }
    }
  }

  killPlayer() {
    if (!this.player.state.active) {
      return;
    }
    this.player.state.active = false;
    this.player.state.respawnTimer = PLAYER_CONFIG.respawnDelay;
    this.player.group.visible = false;
    this.addLog('You collapsed. Respawning...');
    this.effects.spawnBurst({ position: this.player.state.position.clone().add(new THREE.Vector3(0, 1, 0)), color: '#ff8578', count: 18, speed: 3.5, lifetime: 0.8 });
  }

  respawnPlayerIfNeeded() {
    if (this.player.state.active || this.player.state.respawnTimer > 0) {
      return;
    }
    let closestSpot = this.spawnPoint;
    let closestDistance = Infinity;
    for (const spot of this.structures.healSpots) {
      const distance = xzDistance(this.player.state.position, spot.position);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestSpot = spot.position;
      }
    }
    const respawnPoint = closestSpot.clone();
    respawnPoint.y = this.terrain.getHeightAt(respawnPoint.x, respawnPoint.z);
    this.player.respawn(respawnPoint, this.progression);
    this.addLog('Respawned at a campfire');
    this.effects.spawnRing({ position: respawnPoint.clone().add(new THREE.Vector3(0, 0.8, 0)), color: '#7fd6ff', endScale: 2.8, lifetime: 0.55 });
  }

  update(dt) {
    this.elapsed += dt;
    this.timeOfDay = (this.timeOfDay + dt * 0.012) % 1;
    this.sceneContext.updateAtmosphere(this.timeOfDay);

    this.player.state.defendActive = this.input.state.defendHeld && !this.inventoryOpen;
    const combatStats = getPlayerCombatStats({ progression: this.progression, inventory: this.inventory });

    if (this.input.state.attackPressed && !this.inventoryOpen) {
      const hit = performPlayerAttack({
        player: this.player,
        enemies: this.slimes,
        progression: this.progression,
        inventory: this.inventory,
        effects: this.effects,
        onEnemyKilled: (enemy) => this.handleEnemyKill(enemy),
      });
      if (!hit) {
        this.addLog('Swing');
      }
    }

    this.player.update({
      dt,
      inputState: this.input.state,
      progression: this.progression,
      collision: this.collision,
      inventoryStats: combatStats,
      inventoryOpen: this.inventoryOpen,
    });

    this.updateSlimes(dt);
    this.collision.resolveDynamicBodies(this.player.state, this.slimes.map((slime) => slime.state));
    this.player.group.position.copy(this.player.state.position);
    this.slimes.forEach((slime) => slime.group.position.copy(slime.state.position));
    this.updatePickups();
    this.updateHealSpots(dt);
    this.respawnPlayerIfNeeded();

    if (this.player.state.active && this.player.state.grounded && this.player.state.moveSpeed > 0.6 && this.rng.chance(dt * 8)) {
      this.effects.spawnBurst({ position: this.player.state.position.clone().add(new THREE.Vector3(0, 0.05, 0)), color: '#c19f74', count: 3, speed: 1, lifetime: 0.28, size: 0.06 });
    }

    this.effects.update(dt);
    this.sceneContext.updateCamera({
      focus: this.player.getFocusPosition(),
      yaw: this.player.state.lookYaw,
      pitch: this.player.state.lookPitch,
      collisionMeshes: [...this.terrain.collisionMeshes, ...this.structures.collisionMeshes, ...this.vegetation.collisionMeshes],
      dt,
    });

    this.hud.render({
      seed: WORLD_CONFIG.seed,
      progression: this.progression,
      combatStats,
      quests: this.questSystem.quests,
      logs: this.logs,
      inventory: this.inventory,
      pointerLocked: this.input.state.pointerLocked,
      inventoryOpen: this.inventoryOpen,
    });
    this.inventoryView.render({ progression: this.progression });
    this.input.endFrame();
    this.sceneContext.render();
  }

  loop = () => {
    const dt = Math.min(clock.getDelta(), 1 / 30);
    this.update(dt);
    this.rafId = window.requestAnimationFrame(this.loop);
  };

  dispose() {
    window.cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.resizeHandler);
    this.input?.dispose();
    this.sceneContext?.dispose();
    disposeObject3D(this.sceneContext?.scene);
  }
}