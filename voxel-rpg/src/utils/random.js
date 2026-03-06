export const createRng = (seed) => {
  let state = seed >>> 0;

  const next = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };

  const range = (min, max) => min + (max - min) * next();
  const int = (min, max) => Math.floor(range(min, max + 1));
  const chance = (value) => next() <= value;
  const pick = (array) => array[Math.floor(next() * array.length)];

  const weighted = (entries) => {
    const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
    let cursor = next() * total;
    for (const entry of entries) {
      cursor -= entry.weight;
      if (cursor <= 0) {
        return entry;
      }
    }
    return entries.at(-1);
  };

  const hash2 = (x, y) => {
    const a = Math.imul((x | 0) + 374761393, 668265263);
    const b = Math.imul((y | 0) + 1442695041, 2246822519);
    const c = (a ^ b ^ state) >>> 0;
    return ((c ^ (c >>> 13)) >>> 0) / 0xffffffff;
  };

  return {
    next,
    range,
    int,
    chance,
    pick,
    weighted,
    hash2,
  };
};