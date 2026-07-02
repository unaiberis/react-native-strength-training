/**
 * Deterministic Seeded PRNG
 *
 * Uses Mulberry32 algorithm with a string-to-seed conversion.
 * The same seed ALWAYS produces the same sequence of random numbers.
 *
 * Seed: "entrenamentua-demo-2026"
 *
 * Exports:
 *   createPRNG(seedString) → { random, randomInt, randomFloat, shuffle, pick, weightedPick }
 */

/**
 * Convert a string seed to a 32-bit integer via djb2 hash.
 */
function stringToSeed(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0; // unsigned
}

/**
 * Mulberry32 PRNG.
 * Returns a function that produces numbers in [0, 1).
 */
function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Create a full PRNG instance with utility methods.
 *
 * @param {string} seedString - The deterministic seed (default: "entrenamentua-demo-2026")
 * @returns {{ random, randomInt, randomFloat, shuffle, pick, weightedPick }}
 */
export function createPRNG(seedString = 'entrenamentua-demo-2026') {
  const seed = stringToSeed(seedString);
  const next = mulberry32(seed);

  return {
    /** Base random in [0, 1) */
    random: next,

    /** Random integer in [min, max] (inclusive) */
    randomInt(min, max) {
      return Math.floor(next() * (max - min + 1)) + min;
    },

    /** Random float in [min, max) */
    randomFloat(min, max) {
      return next() * (max - min) + min;
    },

    /** Fisher-Yates shuffle (in-place, returns same array) */
    shuffle(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },

    /** Pick a random element from array */
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },

    /**
     * Weighted random pick from an array of { item, weight }.
     * Higher weight = more likely to be picked.
     */
    weightedPick(entries) {
      const total = entries.reduce((sum, e) => sum + e.weight, 0);
      let r = next() * total;
      for (const entry of entries) {
        r -= entry.weight;
        if (r <= 0) return entry.item;
      }
      return entries[entries.length - 1].item;
    },

    /**
     * Gaussian-like random using Box-Muller transform.
     * Returns values centered around 0 (std dev ~1).
     */
    gaussian() {
      const u1 = next() || 0.0001;
      const u2 = next();
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    },
  };
}
