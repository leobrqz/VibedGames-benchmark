import { describeItemStats } from '../systems/items.js';
import { UI_TEXT } from '../core/constants.js';

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

export const createHud = (root) => {
  root.innerHTML = '';
  const hud = createEl('div', 'hud', root);
  const crosshair = createEl('div', 'crosshair', hud);
  const promptCard = createEl('div', 'prompt-card', hud, UI_TEXT.pointerLock);

  const top = createEl('div', 'hud-top', hud);
  const leftStack = createEl('div', 'stack', top);
  const rightStack = createEl('div', 'stack', top);
  const bottom = createEl('div', 'hud-bottom', hud);
  const bottomLeft = createEl('div', 'stack', bottom);
  const hotbarDock = createEl('div', 'hotbar-dock', hud);

  const statsCard = createEl('div', 'panel hud-card', leftStack);
  const titleLine = createEl('div', 'title-line', statsCard);
  createEl('span', '', titleLine, 'Voxel Wilds');
  const seedLine = createEl('span', '', titleLine, 'Seed');
  const bars = createEl('div', 'bars', statsCard);
  const healthLabel = createEl('div', 'bar-label', bars);
  const healthValue = createEl('span', '', healthLabel, 'Health');
  const healthText = createEl('span', '', healthLabel, '100 / 100');
  const healthBar = createEl('div', 'bar', bars);
  const healthFill = createEl('div', 'bar-fill health', healthBar);
  const xpLabel = createEl('div', 'bar-label', bars);
  const xpValue = createEl('span', '', xpLabel, 'XP');
  const xpText = createEl('span', '', xpLabel, '0 / 100');
  const xpBar = createEl('div', 'bar', bars);
  const xpFill = createEl('div', 'bar-fill xp', xpBar);
  const statsGrid = createEl('div', 'stats-grid', statsCard);

  const questCard = createEl('div', 'panel hud-card', rightStack);
  createEl('div', 'title-line', questCard, 'Goals');
  const questList = createEl('div', 'quest-list', questCard);
  const instructionCard = createEl('div', 'panel hud-card', rightStack);
  createEl('div', 'title-line', instructionCard, 'Controls');
  createEl('div', 'muted', instructionCard, UI_TEXT.inventoryHint);

  const logCard = createEl('div', 'panel hud-card', bottomLeft);
  createEl('div', 'title-line', logCard, 'Field Notes');
  const logList = createEl('div', 'log-list', logCard);

  const hotbar = createEl('div', 'hotbar', hotbarDock);
  const hotbarSlots = Array.from({ length: 5 }, (_, index) => {
    const slot = createEl('div', 'slot panel', hotbar);
    createEl('div', 'slot-index', slot, `${index + 1}`);
    const content = createEl('div', 'slot-content', slot);
    const name = createEl('div', 'slot-name', content, 'Empty');
    const meta = createEl('div', 'slot-meta', content, 'Unbound');
    return { slot, name, meta };
  });

  return {
    render({ seed, progression, combatStats, quests, logs, inventory, pointerLocked, inventoryOpen }) {
      seedLine.textContent = `Seed ${seed}`;
      healthValue.textContent = 'Health';
      healthText.textContent = `${Math.round(progression.currentHealth)} / ${progression.maxHealth}`;
      healthFill.style.width = `${(progression.currentHealth / progression.maxHealth) * 100}%`;
      xpValue.textContent = `Level ${progression.level}`;
      xpText.textContent = `${progression.xp} / ${progression.xpToNext}`;
      xpFill.style.width = `${(progression.xp / progression.xpToNext) * 100}%`;

      statsGrid.innerHTML = '';
      [
        ['Damage', `${combatStats.damage}`],
        ['Defense', `${combatStats.defense}`],
        ['Right hand', inventory.state.equipment.rightHand?.name ?? 'Empty'],
        ['Left hand', inventory.state.equipment.leftHand?.name ?? 'Empty'],
        ['Block', `${Math.round(combatStats.block * 100)}%`],
        ['World', pointerLocked ? 'Focused' : 'Click to focus'],
      ].forEach(([label, value]) => {
        const row = createEl('div', 'stat-row', statsGrid);
        createEl('span', 'muted', row, label);
        createEl('span', '', row, value);
      });

      questList.innerHTML = '';
      quests.forEach((quest) => {
        const row = createEl('div', 'quest-row', questList);
        createEl('span', quest.completed ? 'rarity-uncommon' : '', row, quest.label);
        createEl('span', 'muted', row, `${quest.progress}/${quest.target}`);
      });

      logList.innerHTML = '';
      logs.forEach((entry) => {
        const row = createEl('div', 'log-row', logList);
        createEl('span', '', row, entry);
      });

      inventory.state.hotbar.forEach((itemId, index) => {
        const item = inventory.getItemById(itemId);
        const slot = hotbarSlots[index];
        slot.slot.classList.toggle('active', Boolean(item));
        slot.name.textContent = item?.name ?? 'Empty';
        slot.name.className = `slot-name ${item?.rarityClass ?? ''}`.trim();
        slot.meta.textContent = item ? describeItemStats(item) : 'Unbound';
      });

      crosshair.classList.toggle('hidden', inventoryOpen);
      promptCard.classList.toggle('hidden', pointerLocked || inventoryOpen);
    },
  };
};