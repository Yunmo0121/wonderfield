// The Firefly world's maths, with no drawing code at all.
//
// Model: a *local* Kuramoto model on a torus with phase noise.
//
//   dθ_i = [ ω_i + (K / |N_i|) Σ_{j ∈ N_i} sin(θ_j − θ_i) ] dt + √(2D) dW_i
//
//   ω_i = ω₀ + σ z_i      natural frequency, z_i ~ N(0, 1)
//   N_i                   fireflies within distance R of i (including i itself)
//   D                     phase-noise intensity
//
// When R covers the whole world, N_i is everyone and this is exactly the
// classic Kuramoto model (1975). Integrated with Euler–Maruyama at a fixed
// time step DT, so results never depend on the screen's frame rate.

import { RNG } from '../../utils/random.js';
import { TAU, wrapAngle, orderParameter } from '../../utils/math.js';
import { Firefly } from './firefly.js';
import {
  WORLD, DT, BASE_OMEGA, DRIFT_SPEED, TURN_NOISE, GLOBAL_RADIUS, defaultParams,
} from './parameters.js';

const PALETTE_SIZE = 4;
const HISTORY_INTERVAL = 0.1; // seconds of simulated time between r(t) samples
const HISTORY_LENGTH = 400;   // 40 s of history
const MAX_STEPS_PER_ADVANCE = 480;
const TEMPO_MEMORY = 6;       // seconds over which a firefly's actual tempo is averaged

export class Simulation {
  /**
   * @param {object} params  see parameters.js
   * @param {number} seed
   * @param {{width:number,height:number}} world  size of the torus (defaults to 1.6 × 1)
   */
  constructor(params = defaultParams(), seed = 1, world = WORLD) {
    this.world = { width: world.width, height: world.height };
    this.reset(params, seed);
  }

  /** Start a brand-new experiment. Same params + same seed ⇒ same experiment. */
  reset(params = this.params, seed = this.seed) {
    this.params = { ...params };
    this.seed = seed >>> 0;
    this.rng = new RNG(this.seed);
    this.time = 0;
    this.stepCount = 0;
    this.flashes = 0;
    this._accumulator = 0;
    this.history = [];
    this.fireflies = [];
    for (let i = 0; i < this.params.count; i++) this.fireflies.push(this._spawn());
    this._coupling = new Float64Array(0);
    this._recordHistory();
  }

  /** Change parameters on the fly (no reset). Population size is adjusted in place. */
  setParams(patch) {
    Object.assign(this.params, patch);
    if ('count' in patch) this._setCount(patch.count);
  }

  /** Add one firefly at a chosen spot (e.g. where the user clicked). */
  addFirefly(x, y) {
    this.fireflies.push(this._spawn(x, y));
    this.params.count = this.fireflies.length;
  }

  get isGlobal() {
    return this.params.radius >= GLOBAL_RADIUS;
  }

  /** Order parameter of the current state. */
  order() {
    return orderParameter(this.fireflies.map((f) => f.theta));
  }

  /**
   * Advance by `realSeconds` of wall-clock time, scaled by params.speed.
   * Internally always takes fixed DT steps. Returns the number of steps taken.
   */
  advance(realSeconds) {
    this._accumulator += realSeconds * this.params.speed;
    let steps = 0;
    while (this._accumulator >= DT - 1e-12 && steps < MAX_STEPS_PER_ADVANCE) {
      this.step();
      this._accumulator -= DT;
      steps++;
    }
    if (steps === MAX_STEPS_PER_ADVANCE) this._accumulator = 0; // tab was asleep; don't spiral
    return steps;
  }

  /** Run for a given amount of *simulated* time (used by tests & experiments). */
  runFor(simSeconds) {
    const n = Math.round(simSeconds / DT);
    for (let i = 0; i < n; i++) this.step();
  }

  /** One Euler–Maruyama step of size DT. */
  step() {
    const { coupling: K, noise: D, freqSpread: sigma } = this.params;
    const ff = this.fireflies;
    const n = ff.length;
    if (this._coupling.length !== n) this._coupling = new Float64Array(n);
    const c = this._coupling;

    // 1. Coupling terms, all computed from the *current* phases (synchronous update).
    if (K === 0 || n === 0) c.fill(0);
    else if (this.isGlobal) this._globalCoupling(c);
    else this._localCoupling(c);

    // 2. Phase update + flash detection.
    const noiseScale = Math.sqrt(2 * D * DT);
    for (let i = 0; i < n; i++) {
      const f = ff[i];
      const omega = f.naturalFrequency(BASE_OMEGA, sigma);
      const advance = (omega + K * c[i]) * DT + noiseScale * this.rng.gaussian();
      const next = f.theta + advance;
      // The tempo this firefly is actually keeping: a running average of dθ/dt.
      f.meanFreq += (advance / DT - f.meanFreq) * (DT / TEMPO_MEMORY);
      if (next >= TAU) this.flashes++;
      f.theta = wrapAngle(next);
    }

    // 3. Gentle drifting flight on the torus (a correlated random walk).
    const turn = TURN_NOISE * Math.sqrt(DT);
    for (let i = 0; i < n; i++) {
      const f = ff[i];
      f.heading += turn * this.rng.gaussian();
      f.x = wrap(f.x + Math.cos(f.heading) * DRIFT_SPEED * DT, this.world.width);
      f.y = wrap(f.y + Math.sin(f.heading) * DRIFT_SPEED * DT, this.world.height);
    }

    this.time += DT;
    this.stepCount++;
    if (this.stepCount % Math.round(HISTORY_INTERVAL / DT) === 0) this._recordHistory();
  }

  /**
   * Visit every pair (i, j), i < j, closer than R (straight-line, not across
   * the wrap). Used only for drawing "connections".
   */
  forEachNeighbourPair(callback) {
    const R2 = this.params.radius ** 2;
    const ff = this.fireflies;
    for (let i = 0; i < ff.length; i++) {
      for (let j = i + 1; j < ff.length; j++) {
        const dx = ff[j].x - ff[i].x;
        const dy = ff[j].y - ff[i].y;
        const d2 = dx * dx + dy * dy;
        if (d2 <= R2) callback(ff[i], ff[j], d2);
      }
    }
  }

  // ---------------------------------------------------------------- private

  /**
   * All-to-all coupling via the mean field:
   *   (1/N) Σ_j sin(θ_j − θ_i) = r sin(ψ − θ_i)
   * O(N) instead of O(N²) — and a nice identity to show in the docs.
   */
  _globalCoupling(out) {
    const { r, psi } = this.order();
    const ff = this.fireflies;
    for (let i = 0; i < ff.length; i++) out[i] = r * Math.sin(psi - ff[i].theta);
  }

  /** Brute-force all-to-all average, kept for testing the mean-field identity. */
  _globalCouplingBruteForce(out) {
    const ff = this.fireflies;
    const n = ff.length;
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < n; j++) s += Math.sin(ff[j].theta - ff[i].theta);
      out[i] = s / n;
    }
  }

  /**
   * Neighbourhood average on the torus.
   *
   * Uses  sin(θ_j − θ_i) = sin θ_j cos θ_i − cos θ_j sin θ_i,  so each firefly
   * only needs the sums S_i = Σ sin θ_j and C_i = Σ cos θ_j over its
   * neighbours. The pair loop then does no trigonometry at all, and every pair
   * is visited once (the relation is symmetric). N = 400 ⇒ 80k distance checks.
   */
  _localCoupling(out) {
    const ff = this.fireflies;
    const n = ff.length;
    const R2 = this.params.radius ** 2;
    const W = this.world.width;
    const H = this.world.height;
    const xs = new Float64Array(n);
    const ys = new Float64Array(n);
    const sn = new Float64Array(n);
    const cs = new Float64Array(n);
    const S = new Float64Array(n);
    const C = new Float64Array(n);
    const count = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
      xs[i] = ff[i].x;
      ys[i] = ff[i].y;
      sn[i] = Math.sin(ff[i].theta);
      cs[i] = Math.cos(ff[i].theta);
      // every firefly is its own neighbour (contributes sin 0 = 0, but counts in |N_i|)
      S[i] = sn[i];
      C[i] = cs[i];
      count[i] = 1;
    }
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = Math.abs(xs[j] - xs[i]);
        if (dx > W / 2) dx = W - dx;
        let dy = Math.abs(ys[j] - ys[i]);
        if (dy > H / 2) dy = H - dy;
        if (dx * dx + dy * dy <= R2) {
          S[i] += sn[j]; C[i] += cs[j]; count[i]++;
          S[j] += sn[i]; C[j] += cs[i]; count[j]++;
        }
      }
    }
    for (let i = 0; i < n; i++) out[i] = (S[i] * cs[i] - C[i] * sn[i]) / count[i];
  }

  _spawn(x, y) {
    const rng = this.rng;
    const firefly = new Firefly({
      x: x ?? rng.uniform(0, this.world.width),
      y: y ?? rng.uniform(0, this.world.height),
      heading: rng.uniform(0, TAU),
      theta: rng.uniform(0, TAU),
      z: rng.gaussian(),
      hue: Math.floor(rng.uniform(0, PALETTE_SIZE)),
    });
    firefly.meanFreq = firefly.naturalFrequency(BASE_OMEGA, this.params.freqSpread);
    return firefly;
  }

  _setCount(count) {
    while (this.fireflies.length < count) this.fireflies.push(this._spawn());
    if (this.fireflies.length > count) this.fireflies.length = count;
  }

  _recordHistory() {
    this.history.push({ t: this.time, r: this.order().r });
    if (this.history.length > HISTORY_LENGTH) this.history.shift();
  }
}

function wrap(v, size) {
  return ((v % size) + size) % size;
}
