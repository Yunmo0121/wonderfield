// Fireflies that talk only in flashes: the pulse-coupled model of
// Mirollo & Strogatz (1990). No drawing code here.
//
// Every firefly carries a "charge" x that climbs from 0 to 1 along the same
// concave-down curve,
//
//   x = f(φ) = ln(1 + (e^b − 1) φ) / b,     φ ∈ [0, 1] is its phase,  b > 0,
//
// and it flashes when x reaches 1, then starts again from 0. A flash is seen
// by everyone at once and lifts every other charge by ε. Anyone carried to 1
// by that lift flashes in the same instant, and from then on the two are
// indistinguishable: one has been absorbed by the other.
//
// Mirollo and Strogatz proved that for identical oscillators, all-to-all
// coupling, ε > 0 and a concave-down f, the population ends up flashing in
// perfect unison from every starting state outside a set of measure zero.
//
// The simulation is event-driven: it jumps exactly to each firing time, so
// there is no time-step error at all.

import { RNG } from '../../utils/random.js';

const SAME = 1e-9; // phases closer than this belong to one group

export class PulseSwarm {
  /**
   * @param {object} o
   * @param {number} o.count      number of fireflies
   * @param {number} o.epsilon    how far one flash lifts every other charge
   * @param {number} o.curvature  b: how strongly the charging curve bends (b → 0 is a straight line)
   * @param {number} o.period     seconds between flashes for a firefly left alone
   * @param {number} seed
   */
  constructor({ count = 20, epsilon = 0.03, curvature = 3, period = 2 } = {}, seed = 1) {
    this.count = count;
    this.epsilon = epsilon;
    this.curvature = curvature;
    this.period = period;
    this.reset(seed);
  }

  /** Scatter the phases again. Same seed ⇒ same starting state. */
  reset(seed = this.seed) {
    this.seed = seed >>> 0;
    const rng = new RNG(this.seed);
    this.phase = Float64Array.from({ length: this.count }, () => rng.uniform(0, 1));
    this.time = 0;
  }

  /** The charging curve f and its inverse. */
  charge(phase) {
    const b = this.curvature;
    return Math.log(1 + (Math.exp(b) - 1) * phase) / b;
  }

  phaseOf(charge) {
    const b = this.curvature;
    return (Math.exp(b * charge) - 1) / (Math.exp(b) - 1);
  }

  /** Number of separate rhythms: groups of fireflies with exactly the same phase. */
  groups() {
    const sorted = Array.from(this.phase).sort((a, b) => a - b);
    let n = sorted.length ? 1 : 0;
    for (let i = 1; i < sorted.length; i++) if (sorted[i] - sorted[i - 1] > SAME) n++;
    return n;
  }

  /**
   * Advance by `seconds`. Returns the flashes that happened, as {t, i}:
   * the time and the index of the firefly.
   */
  advance(seconds) {
    const flashes = [];
    let remaining = seconds;
    for (let guard = 0; remaining > 0 && guard < 100000; guard++) {
      let top = 0;
      for (let i = 0; i < this.count; i++) if (this.phase[i] > top) top = this.phase[i];
      const wait = Math.max(0, (1 - top) * this.period);
      if (wait > remaining) {
        this._shift(remaining);
        break;
      }
      this._shift(wait);
      remaining -= wait;
      this._fire(flashes);
    }
    return flashes;
  }

  // ---------------------------------------------------------------- private

  _shift(seconds) {
    const d = seconds / this.period;
    for (let i = 0; i < this.count; i++) this.phase[i] += d;
    this.time += seconds;
  }

  /** Everyone at the top flashes; each wave of flashes may carry others over the top too. */
  _fire(flashes) {
    const n = this.count;
    const fired = new Uint8Array(n);
    let wave = [];
    for (let i = 0; i < n; i++) if (this.phase[i] >= 1 - SAME) wave.push(i);
    while (wave.length) {
      for (const i of wave) fired[i] = 1;
      const lift = this.epsilon * wave.length;
      const next = [];
      for (let j = 0; j < n; j++) {
        if (fired[j]) continue;
        const x = this.charge(this.phase[j]) + lift;
        if (x >= 1) {
          next.push(j);
          this.phase[j] = 1;
        } else if (lift > 0) {
          this.phase[j] = this.phaseOf(x);
        }
      }
      wave = next;
    }
    for (let i = 0; i < n; i++) {
      if (!fired[i]) continue;
      this.phase[i] = 0;
      flashes.push({ t: this.time, i });
    }
  }
}
