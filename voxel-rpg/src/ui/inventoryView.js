import { describeItemStats } from '../systems/items.js';

const createEl = (tag, className, parent, text = '') => {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text) {
    element.textContent = text;
  }
  parent?.append(element);
  return element;
};

export const createInventoryView = ({ root, inventory, getCombatStats }) => {
  const shell = createEl('div', 'inventory-shell panel', root);
  const wrapper = createEl('div', 'inventory-header', shell);
  const title = createEl('div', 'inventory-title', wrapper);
  createEl('h2', '', title, 'Inventory');
  createEl('div', 'subtle', title, 'Drag items between grid, equipment, and hotbar');

  const statsPanel = createEl('div', 'panel inventory-section', wrapper);
  const statsGrid = createEl('div', 'stats-grid', statsPanel);

  const equipPanel = createEl('div', 'panel inventory-section', wrapper);
  createEl('div', 'title-line', equipPanel, 'Equipment');
  const equipmentGrid = createEl('div', 'equipment-grid', equipPanel);

  const gridPanel = createEl('div', 'panel inventory-section', wrapper);
  createEl('div', 'title-line', gridPanel, 'Backpack 5x5');
  const inventoryGrid = createEl('div', 'inventory-grid', gridPanel);

  const hotbarPanel = createEl('div', 'panel inventory-section', wrapper);
  createEl('div', 'title-line', hotbarPanel, 'Hotbar');
  const hotbarGrid = createEl('div', 'hotbar', hotbarPanel);

  const serializeDrag = (payload) => JSON.stringify(payload);

  const bindDrop = (element, onDrop) => {
    element.addEventListener('dragover', (event) => {
      event.preventDefault();
    });
    element.addEventListener('drop', (event) => {
      event.preventDefault();
      const raw = event.dataTransfer?.getData('text/plain');
      if (!raw) {
        return;
      }
      try {
        onDrop(JSON.parse(raw));
      } catch (error) {
        console.error(error);
      }
    });
  };

  const applyItemVisuals = (element, item, emptyLabel) => {
    element.innerHTML = '';
    element.draggable = Boolean(item);
    if (!item) {
      const empty = createEl('div', 'slot-empty', element, emptyLabel);
      return empty;
    }
    const content = createEl('div', 'slot-content', element);
    const name = createEl('div', `slot-name ${item.rarityClass}`, content, item.name);
    createEl('div', 'slot-meta', content, `${item.rarityName} ${describeItemStats(item)}`);
    return name;
  };

  const equipmentSlots = ['leftHand', 'rightHand'].map((slotName) => {
    const slot = createEl('div', 'equip-slot', equipmentGrid);
    bindDrop(slot, (payload) => {
      if (payload.type === 'grid') {
        inventory.equipFromGrid(payload.index, slotName);
      }
    });
    return { slotName, slot };
  });

  const gridSlots = Array.from({ length: inventory.state.grid.length }, (_, index) => {
    const slot = createEl('div', 'inventory-slot', inventoryGrid);
    bindDrop(slot, (payload) => {
      if (payload.type === 'grid') {
        inventory.swapGridItems(payload.index, index);
      }
      if (payload.type === 'equipment') {
        inventory.unequipToGrid(payload.slotName, index);
      }
    });
    return slot;
  });

  const hotbarSlots = Array.from({ length: inventory.state.hotbar.length }, (_, index) => {
    const slot = createEl('div', 'slot panel', hotbarGrid);
    const slotIndex = createEl('div', 'slot-index', slot, `${index + 1}`);
    bindDrop(slot, (payload) => {
      if (payload.type === 'grid') {
        const item = inventory.state.grid[payload.index];
        if (item) {
          inventory.bindItemToHotbar(item.id, index);
        }
      }
      if (payload.type === 'equipment') {
        const item = inventory.state.equipment[payload.slotName];
        if (item) {
          inventory.bindItemToHotbar(item.id, index);
        }
      }
      if (payload.type === 'hotbar') {
        const fromItemId = inventory.state.hotbar[payload.index];
        const toItemId = inventory.state.hotbar[index];
        inventory.assignHotbar(index, fromItemId ?? null);
        inventory.assignHotbar(payload.index, toItemId ?? null);
      }
    });
    return { slot, slotIndex };
  });

  const renderView = ({ progression }) => {
      const combatStats = getCombatStats();

      statsGrid.innerHTML = '';
      [
        ['Level', `${progression.level}`],
        ['Health', `${Math.round(progression.currentHealth)} / ${progression.maxHealth}`],
        ['Damage', `${combatStats.damage}`],
        ['Defense', `${combatStats.defense}`],
        ['Block', `${Math.round(combatStats.block * 100)}%`],
      ].forEach(([label, value]) => {
        const row = createEl('div', 'stat-row', statsGrid);
        createEl('span', 'muted', row, label);
        createEl('span', '', row, value);
      });

      equipmentSlots.forEach(({ slotName, slot }) => {
        const item = inventory.state.equipment[slotName];
        applyItemVisuals(slot, item, slotName === 'leftHand' ? 'Left hand' : 'Right hand');
        slot.draggable = Boolean(item);
        slot.ondragstart = (event) => {
          if (!item) {
            return;
          }
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer?.setData('text/plain', serializeDrag({ type: 'equipment', slotName }));
        };
      });

      gridSlots.forEach((slot, index) => {
        const item = inventory.state.grid[index];
        applyItemVisuals(slot, item, 'Empty');
        slot.ondragstart = (event) => {
          if (!item) {
            return;
          }
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer?.setData('text/plain', serializeDrag({ type: 'grid', index }));
        };
        slot.ondblclick = () => {
          if (!item) {
            return;
          }
          if (item.type === 'consumable') {
            inventory.useGridItem(index, {
              onConsume: (consumable) => {
                root.dispatchEvent(new CustomEvent('inventory-consume', { detail: consumable }));
              },
            });
            renderView({ progression });
            return;
          }
          inventory.useGridItem(index);
          renderView({ progression });
        };
      });

      hotbarSlots.forEach(({ slot, slotIndex }, index) => {
        const item = inventory.getItemById(inventory.state.hotbar[index]);
        applyItemVisuals(slot, item, `Slot ${index + 1}`);
        slot.draggable = Boolean(item);
        slot.ondragstart = (event) => {
          if (!item) {
            return;
          }
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer?.setData('text/plain', serializeDrag({ type: 'hotbar', index }));
        };
        slot.ondblclick = () => {
          inventory.assignHotbar(index, null);
          renderView({ progression });
        };
        slot.append(slotIndex);
      });
  };

  return {
    setOpen(isOpen) {
      shell.classList.toggle('open', isOpen);
    },
    render: renderView,
  };
};