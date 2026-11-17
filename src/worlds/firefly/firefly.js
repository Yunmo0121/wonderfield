// A single firefly: where it is, where it is heading, and where it is in its
// flashing cycle (its phase θ).

import { TAU } from '../../utils/math.js';

/** Width (in radians of phase) of the bright part of a flash. */
export const FLASH_WIDTH = 0.55;

export class Firefly {
  /**
   * @param {object} o
   * @param {number} o.x, o.y   position on the torus
   * @param {number} o.heading  flight direction (radians)
   * @param {number} o.theta    phase θ ∈ [0, 2π); the firefly flashes as θ wraps past 2π
   * @param {number} o.z        a standard-normal number fixed at birth; the
   *                            natural frequency is ω = ω₀ + σ·z, so changing σ
   *                            live rescales everyone's individuality consistently
   * @param {number} o.hue      index into the colour palette (visual only)
   */
  constructor({ x, y, heading, theta, z, hue }) {
    this.x = x;
    this.y = y;
    this.heading = heading;
    this.theta = theta;
    this.z = z;
    this.hue = hue;
    /** Running average of dθ/dt, kept up to date by the simulation. */
    this.meanFreq = 0;
  }

  naturalFrequency(baseOmega, sigma) {
    return baseOmega + sigma * this.z;
  }

  /** Brightness is a pure function of phase: a sharp flash at θ = 0 that fades. */
  get brightness() {
    return flashBrightness(this.theta);
  }
}

export function flashBrightness(theta) {
  // θ just after 0 → bright; also a tiny "pre-glow" just before 2π.
  const after = Math.exp(-theta / FLASH_WIDTH);
  const before = Math.exp(-(TAU - theta) / (FLASH_WIDTH * 0.25));
  return Math.min(1, after + 0.35 * before);
}
