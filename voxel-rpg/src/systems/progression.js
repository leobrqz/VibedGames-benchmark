import { SLIME_CONFIG } from '../core/constants.js';

export const createPlayerProgression = () => ({
  level: 1,
  xp: 0,
  xpToNext: 100,
  maxLevel: 10,
  maxHealth: 100,
  currentHealth: 100,
  baseDamage: 8,
  baseDefense: 3,
});

export const awardPlayerXp = (progression, amount) => {
  let xpLeft = amount;
  let leveledUp = false;

  while (xpLeft > 0 && progression.level < progression.maxLevel) {
    const remaining = progression.xpToNext - progression.xp;
    const step = Math.min(remaining, xpLeft);
    progression.xp += step;
    xpLeft -= step;

    if (progression.xp >= progression.xpToNext && progression.level < progression.maxLevel) {
      progression.level += 1;
      progression.xp = 0;
      progression.maxHealth += 12;
      progression.currentHealth = Math.min(progression.maxHealth, progression.currentHealth + 14);
      progression.baseDamage += 2;
      progression.baseDefense += 1;
      leveledUp = true;
    }
  }

  if (progression.level >= progression.maxLevel) {
    progression.xp = Math.min(progression.xp, progression.xpToNext);
  }

  return { leveledUp };
};

export const createEnemyProgression = (seedXp = 0) => {
  const progression = {
    xp: seedXp,
    level: 0,
    maxLevel: 5,
  };

  progression.level = Math.min(progression.maxLevel, Math.floor(progression.xp / 100));
  return progression;
};

export const gainEnemyXp = (progression, amount) => {
  progression.xp = Math.min(599, progression.xp + amount);
  progression.level = Math.min(progression.maxLevel, Math.floor(progression.xp / 100));
};

export const getEnemyCombatStats = (progression) => ({
  maxHealth: SLIME_CONFIG.baseHealth + progression.level * 12,
  damage: SLIME_CONFIG.baseDamage + progression.level * 3,
  moveSpeed: SLIME_CONFIG.moveSpeed + progression.level * 0.18,
});