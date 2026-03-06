import { INVENTORY_CONFIG } from '../core/constants.js';

const firstEmptyIndex = (grid) => grid.findIndex((entry) => entry === null);

export const createInventorySystem = ({ onChange, onLog }) => {
  const gridSize = INVENTORY_CONFIG.rows * INVENTORY_CONFIG.columns;
  const state = {
    grid: Array(gridSize).fill(null),
    equipment: {
      leftHand: null,
      rightHand: null,
    },
    hotbar: Array(INVENTORY_CONFIG.hotbarSize).fill(null),
  };

  const emit = () => onChange?.(state);

  const addItem = (item) => {
    const slotIndex = firstEmptyIndex(state.grid);
    if (slotIndex === -1) {
      onLog?.('Inventory full');
      return false;
    }
    state.grid[slotIndex] = item;
    onLog?.(`Picked up ${item.rarityName} ${item.name}`);
    emit();
    return true;
  };

  const getItemById = (itemId) => {
    if (!itemId) {
      return null;
    }
    return state.grid.find((item) => item?.id === itemId)
      ?? Object.values(state.equipment).find((item) => item?.id === itemId)
      ?? null;
  };

  const removeGridIndex = (index) => {
    const item = state.grid[index];
    state.grid[index] = null;
    return item;
  };

  const clearHotbarRefs = () => {
    for (let index = 0; index < state.hotbar.length; index += 1) {
      const itemId = state.hotbar[index];
      if (itemId && !getItemById(itemId)) {
        state.hotbar[index] = null;
      }
    }
  };

  const placeInGrid = (item, preferredIndex = null) => {
    if (preferredIndex !== null && state.grid[preferredIndex] === null) {
      state.grid[preferredIndex] = item;
      return true;
    }
    const index = firstEmptyIndex(state.grid);
    if (index === -1) {
      return false;
    }
    state.grid[index] = item;
    return true;
  };

  const equipFromGrid = (gridIndex, slot = null) => {
    const item = state.grid[gridIndex];
    if (!item || item.slot === 'consumable') {
      return false;
    }
    const targetSlot = slot ?? item.slot;
    if (item.slot !== targetSlot) {
      return false;
    }
    if (!state.equipment[targetSlot]) {
      state.equipment[targetSlot] = item;
      state.grid[gridIndex] = null;
      emit();
      return true;
    }

    const displaced = state.equipment[targetSlot];
    state.equipment[targetSlot] = item;
    state.grid[gridIndex] = displaced;
    emit();
    return true;
  };

  const unequipToGrid = (slot, preferredIndex = null) => {
    const item = state.equipment[slot];
    if (!item) {
      return false;
    }
    if (!placeInGrid(item, preferredIndex)) {
      return false;
    }
    state.equipment[slot] = null;
    clearHotbarRefs();
    emit();
    return true;
  };

  const swapGridItems = (fromIndex, toIndex) => {
    const temp = state.grid[fromIndex];
    state.grid[fromIndex] = state.grid[toIndex];
    state.grid[toIndex] = temp;
    emit();
  };

  const assignHotbar = (hotbarIndex, itemId) => {
    state.hotbar[hotbarIndex] = itemId;
    emit();
  };

  const firstAvailableHotbarIndex = () => state.hotbar.findIndex((entry) => entry === null);

  const bindItemToHotbar = (itemId, preferredIndex = null) => {
    const item = getItemById(itemId);
    if (!item) {
      return false;
    }
    const targetIndex = preferredIndex ?? firstAvailableHotbarIndex();
    if (targetIndex === -1 || targetIndex < 0 || targetIndex >= state.hotbar.length) {
      return false;
    }
    state.hotbar[targetIndex] = item.id;
    emit();
    return true;
  };

  const consumeItem = (itemId, onConsume) => {
    const gridIndex = state.grid.findIndex((item) => item?.id === itemId);
    if (gridIndex === -1) {
      return false;
    }
    const item = state.grid[gridIndex];
    if (item?.type !== 'consumable') {
      return false;
    }
    state.grid[gridIndex] = null;
    clearHotbarRefs();
    onConsume?.(item);
    emit();
    return true;
  };

  const useGridItem = (gridIndex, handlers) => {
    const item = state.grid[gridIndex];
    if (!item) {
      return false;
    }
    if (item.type === 'consumable') {
      return consumeItem(item.id, handlers?.onConsume);
    }
    return equipFromGrid(gridIndex);
  };

  const activateHotbar = (index, handlers) => {
    const itemId = state.hotbar[index];
    const item = getItemById(itemId);
    if (!item) {
      return false;
    }
    if (item.type === 'consumable') {
      return consumeItem(item.id, handlers.onConsume);
    }
    const gridIndex = state.grid.findIndex((entry) => entry?.id === item.id);
    if (gridIndex !== -1) {
      return equipFromGrid(gridIndex);
    }
    return false;
  };

  const getEquippedStats = () => {
    const right = state.equipment.rightHand;
    const left = state.equipment.leftHand;
    return {
      damage: (right?.stats.damage ?? 0) + (left?.stats.damage ?? 0),
      defense: (right?.stats.defense ?? 0) + (left?.stats.defense ?? 0),
      block: left?.stats.block ?? 0,
      glow: (right?.stats.glow ?? 0) + (left?.stats.glow ?? 0),
    };
  };

  return {
    state,
    addItem,
    getItemById,
    removeGridIndex,
    placeInGrid,
    equipFromGrid,
    unequipToGrid,
    swapGridItems,
    assignHotbar,
    bindItemToHotbar,
    consumeItem,
    useGridItem,
    activateHotbar,
    getEquippedStats,
    emit,
  };
};