// Every tunable number of the Firefly world lives here, so the simulation,
// the control panel and the experiment presets all read from one place.

import { TAU } from '../../utils/math.js';

/** The world is a fixed 16:10 torus (edges wrap), independent of screen size. */
export const WORLD = Object.freeze({ width: 1.6, height: 1.0 });

/** Fixed simulation time step in seconds. Rendering never changes the maths. */
export const DT = 1 / 60;

/** Mean natural frequency: one flash every 2 seconds (0.5 Hz). */
export const BASE_OMEGA = TAU * 0.5;

/** How fast fireflies drift (world units per second) and how wiggly they fly. */
export const DRIFT_SPEED = 0.035;
export const TURN_NOISE = 1.2; // rad / √s

/**
 * At this radius every firefly can see every other firefly on the torus
 * (half-diagonal of the world ≈ 0.943), so the model becomes the classic
 * all-to-all Kuramoto model.
 */
export const GLOBAL_RADIUS = 0.95;

/** Slider definitions. `live: true` means the change applies without a reset. */
export const PARAMETERS = Object.freeze({
  count: {
    label: 'Number of fireflies',
    symbol: 'N',
    min: 10, max: 400, step: 10, default: 150, live: true,
    info: 'How many fireflies live in this tiny world. You can also click the night sky to add one.',
  },
  coupling: {
    label: 'Coupling strength',
    symbol: 'K',
    min: 0, max: 3, step: 0.05, default: 0.8, live: true,
    info: 'How strongly each firefly nudges its rhythm towards its neighbours. K = 0 means everyone ignores everyone. The dotted tick is the tipping point for the current individuality and noise, in a forest where everyone sees everyone.',
  },
  radius: {
    label: 'Interaction radius',
    symbol: 'R',
    min: 0.1, max: GLOBAL_RADIUS, step: 0.05, default: 0.35, live: true,
    info: 'How far a firefly can see. At the maximum, everyone sees everyone (global coupling).',
  },
  freqSpread: {
    label: 'Individuality',
    symbol: 'σ',
    min: 0, max: 1, step: 0.05, default: 0.25, live: true,
    info: 'Spread of natural flashing speeds (std. dev. of ω, in rad/s). Bigger σ = more stubborn individuals.',
  },
  noise: {
    label: 'Noise',
    symbol: 'D',
    min: 0, max: 0.5, step: 0.01, default: 0.02, live: true,
    info: 'Random jitter in each firefly’s internal clock (phase diffusion). A breezy, distracting night.',
  },
  speed: {
    label: 'Simulation speed',
    symbol: '×',
    min: 0.25, max: 4, step: 0.25, default: 1, live: true,
    info: 'How fast simulated time runs. Changing speed never changes the result of an experiment.',
  },
});

export function defaultParams() {
  return Object.fromEntries(Object.entries(PARAMETERS).map(([k, p]) => [k, p.default]));
}

export const DEFAULT_SEED = 20261116;

/** Display options: purely visual, never touch the simulation. */
export function defaultDisplay() {
  return { trails: true, glow: true, connections: false };
}
