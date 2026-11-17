// Seeded randomness.
//
// Every random choice in a Tiny World goes through an RNG created from a seed,
// so the same seed + the same parameters always reproduce the same experiment.

/** mulberry32: a tiny, fast 32-bit PRNG. Returns floats in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.next = mulberry32(this.seed);
    this._spare = null;
  }

  /** Uniform float in [a, b). */
  uniform(a = 0, b = 1) {
    return a + (b - a) * this.next();
  }

  /** Standard normal N(0, 1) via the Box–Muller transform. */
  gaussian() {
    if (this._spare !== null) {
      const s = this._spare;
      this._spare = null;
      return s;
    }
    let u = 0;
    while (u === 0) u = this.next();
    const v = this.next();
    const m = Math.sqrt(-2 * Math.log(u));
    this._spare = m * Math.sin(2 * Math.PI * v);
    return m * Math.cos(2 * Math.PI * v);
  }
}

/** A fresh seed for the "Randomise" button (the only non-seeded randomness). */
export function randomSeed() {
  return Math.floor(Math.random() * 1_000_000_000);
}
