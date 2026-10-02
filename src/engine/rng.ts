export type Rng = {
  next: () => number;
  range: (min: number, max: number) => number;
  int: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
  chance: (probability: number) => boolean;
  getState: () => number;
};

/** mulberry32. Saving getState() and passing it to createRng resumes the stream. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]): T => {
      if (items.length === 0) {
        throw new Error("Cannot pick from an empty list");
      }
      const index = Math.floor(next() * items.length);
      const item = items[index];
      if (item === undefined) {
        throw new Error("Pick index was out of range");
      }
      return item;
    },
    chance: (probability) => next() < probability,
    getState: () => state >>> 0,
  };
}
