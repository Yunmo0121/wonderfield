import { describe, it, expect } from 'vitest';
import { Simulation } from '../src/worlds/firefly/simulation.js';
import { defaultParams, DT, BASE_OMEGA, GLOBAL_RADIUS } from '../src/worlds/firefly/parameters.js';
import { orderParameter, wrapAngle, TAU, criticalCouplingGaussian } from '../src/utils/math.js';

const params = (patch = {}) => ({ ...defaultParams(), ...patch });
const snapshot = (sim) => sim.fireflies.map((f) => [f.x, f.y, f.theta]);

describe('order parameter r', () => {
  it('is exactly 1 when every phase is the same', () => {
    expect(orderParameter([1.3, 1.3, 1.3, 1.3]).r).toBeCloseTo(1, 12);
  });

  it('is 0 for phases spread evenly around the circle', () => {
    const phases = Array.from({ length: 12 }, (_, k) => (k * TAU) / 12);
    expect(orderParameter(phases).r).toBeLessThan(1e-12);
  });
});

describe('Firefly simulation', () => {
  it('with K = 0 and no noise, every firefly runs freely: θ(t) = θ(0) + ω t', () => {
    const sim = new Simulation(params({ coupling: 0, noise: 0, count: 30 }), 7);
    const start = sim.fireflies.map((f) => f.theta);
    const steps = 600;
    for (let s = 0; s < steps; s++) sim.step();
    const t = steps * DT;
    sim.fireflies.forEach((f, i) => {
      const omega = f.naturalFrequency(BASE_OMEGA, sim.params.freqSpread);
      const expected = wrapAngle(start[i] + omega * t);
      const diff = Math.abs(wrapAngle(f.theta - expected + Math.PI) - Math.PI);
      expect(diff).toBeLessThan(1e-9);
    });
  });

  it('is reproducible: same seed + same params ⇒ identical state', () => {
    const a = new Simulation(params(), 42);
    const b = new Simulation(params(), 42);
    a.runFor(10);
    b.runFor(10);
    expect(snapshot(a)).toEqual(snapshot(b));
  });

  it('does not depend on frame rate (fixed time step)', () => {
    const a = new Simulation(params({ speed: 1 }), 3);
    const b = new Simulation(params({ speed: 1 }), 3);
    for (let i = 0; i < 300; i++) a.advance(1 / 30); // 30 fps for 10 s
    for (let i = 0; i < 1440; i++) b.advance(1 / 144); // 144 fps for 10 s
    expect(Math.abs(a.stepCount - b.stepCount)).toBeLessThanOrEqual(1);
    const n = Math.min(a.stepCount, b.stepCount);
    const c = new Simulation(params(), 3);
    const d = new Simulation(params(), 3);
    for (let i = 0; i < n; i++) { c.step(); d.step(); }
    expect(snapshot(c)).toEqual(snapshot(d));
  });

  it('simulation speed changes how fast time passes, not the result', () => {
    const slow = new Simulation(params({ speed: 1 }), 11);
    const fast = new Simulation(params({ speed: 4 }), 11);
    for (let i = 0; i < 240; i++) slow.advance(1 / 60); // 4 s real ⇒ 4 s sim
    for (let i = 0; i < 60; i++) fast.advance(1 / 60);  // 1 s real ⇒ 4 s sim
    expect(fast.stepCount).toBe(slow.stepCount);
    expect(snapshot(fast)).toEqual(snapshot(slow));
  });

  it('mean-field shortcut equals the brute-force all-to-all sum', () => {
    const sim = new Simulation(params({ radius: GLOBAL_RADIUS, count: 80 }), 5);
    const fast = new Float64Array(80);
    const slow = new Float64Array(80);
    sim._globalCoupling(fast);
    sim._globalCouplingBruteForce(slow);
    for (let i = 0; i < 80; i++) expect(fast[i]).toBeCloseTo(slow[i], 12);
  });

  it('local coupling with a world-sized radius matches global coupling', () => {
    // Below GLOBAL_RADIUS the grid path is used; a radius just under it still
    // covers (almost) everyone, so the two should agree closely.
    const sim = new Simulation(params({ radius: 0.944, count: 60 }), 9);
    const local = new Float64Array(60);
    const global = new Float64Array(60);
    sim._localCoupling(local);
    sim._globalCouplingBruteForce(global);
    for (let i = 0; i < 60; i++) expect(local[i]).toBeCloseTo(global[i], 12);
  });

  it('strong global coupling synchronises (r → 1)', () => {
    const sim = new Simulation(params({ radius: GLOBAL_RADIUS, coupling: 2, noise: 0, freqSpread: 0.25 }), 1);
    sim.runFor(30);
    expect(sim.order().r).toBeGreaterThan(0.95);
  });

  it('coupling well below K_c leaves the swarm incoherent', () => {
    const sigma = 0.5;
    const K = 0.3 * criticalCouplingGaussian(sigma);
    const sim = new Simulation(params({ radius: GLOBAL_RADIUS, coupling: K, noise: 0, freqSpread: sigma, count: 400 }), 1);
    sim.runFor(60);
    const tail = sim.history.slice(-100).map((h) => h.r);
    const mean = tail.reduce((a, b) => a + b, 0) / tail.length;
    expect(mean).toBeLessThan(0.2);
  });
});

describe('Kuramoto theory curve', () => {
  it('is zero at and below K_c', async () => {
    const { kuramotoTheoryR } = await import('../src/utils/math.js');
    const kc = criticalCouplingGaussian(0.25);
    expect(kuramotoTheoryR(0.5 * kc, 0.25)).toBe(0);
    expect(kuramotoTheoryR(0.999 * kc, 0.25)).toBe(0);
  });

  it('grows continuously from 0 just above K_c and tends to 1', async () => {
    const { kuramotoTheoryR } = await import('../src/utils/math.js');
    const kc = criticalCouplingGaussian(0.25);
    const near = kuramotoTheoryR(1.01 * kc, 0.25);
    expect(near).toBeGreaterThan(0);
    expect(near).toBeLessThan(0.2);
    expect(kuramotoTheoryR(2 * kc, 0.25)).toBeGreaterThan(kuramotoTheoryR(1.5 * kc, 0.25));
    expect(kuramotoTheoryR(20 * kc, 0.25)).toBeGreaterThan(0.99);
  });

  it('matches a large simulation well above K_c', async () => {
    const { kuramotoTheoryR } = await import('../src/utils/math.js');
    const sigma = 0.25;
    const K = 2 * criticalCouplingGaussian(sigma);
    const sim = new Simulation(params({ radius: GLOBAL_RADIUS, coupling: K, noise: 0, freqSpread: sigma, count: 400 }), 3);
    sim.runFor(60);
    const tail = sim.history.slice(-150).map((h) => h.r);
    const mean = tail.reduce((a, b) => a + b, 0) / tail.length;
    expect(Math.abs(mean - kuramotoTheoryR(K, sigma))).toBeLessThan(0.05);
  });
});

describe('tipping point with noise', () => {
  it('reduces to the noiseless formula as D → 0, and to 2D for identical clocks', async () => {
    const { criticalCoupling } = await import('../src/utils/math.js');
    expect(criticalCoupling(0.25, 0)).toBeCloseTo(criticalCouplingGaussian(0.25), 12);
    expect(criticalCoupling(0.25, 1e-4)).toBeCloseTo(criticalCouplingGaussian(0.25), 3);
    expect(criticalCoupling(0, 0.2)).toBeCloseTo(0.4, 12);
  });

  it('rises with noise, and by less than the 2D that identical clocks would add', async () => {
    const { criticalCoupling } = await import('../src/utils/math.js');
    let previous = criticalCoupling(0.25, 0);
    for (const D of [0.05, 0.1, 0.2, 0.4]) {
      const kc = criticalCoupling(0.25, D);
      expect(kc).toBeGreaterThan(previous);
      expect(kc).toBeLessThan(criticalCouplingGaussian(0.25) + 2 * D);
      previous = kc;
    }
  });

  it('separates a noisy crowd from a noisy beat in simulation', async () => {
    const { criticalCoupling } = await import('../src/utils/math.js');
    const sigma = 0.25;
    const D = 0.2;
    const kc = criticalCoupling(sigma, D); // ≈ 0.68, against 0.40 without noise
    const settle = (K) => {
      const sim = new Simulation(params({ radius: GLOBAL_RADIUS, coupling: K, noise: D, freqSpread: sigma, count: 600 }), 5);
      sim.runFor(60);
      const tail = sim.history.slice(-200).map((h) => h.r);
      return tail.reduce((a, b) => a + b, 0) / tail.length;
    };
    expect(settle(0.7 * kc)).toBeLessThan(0.15);
    expect(settle(1.5 * kc)).toBeGreaterThan(0.6);
  });
});

describe('actual tempo of each firefly', () => {
  it('equals the natural frequency when nobody is listening', () => {
    const sim = new Simulation(params({ coupling: 0, noise: 0, count: 40 }), 3);
    sim.runFor(20);
    for (const f of sim.fireflies) {
      expect(f.meanFreq).toBeCloseTo(f.naturalFrequency(BASE_OMEGA, sim.params.freqSpread), 9);
    }
  });

  it('collapses onto one shared tempo once the swarm has locked', () => {
    const sim = new Simulation(params({ radius: GLOBAL_RADIUS, coupling: 2, noise: 0, freqSpread: 0.25, count: 150 }), 8);
    sim.runFor(60);
    const spread = (values) => {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      return Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length);
    };
    const natural = spread(sim.fireflies.map((f) => f.naturalFrequency(BASE_OMEGA, 0.25)));
    const actual = spread(sim.fireflies.map((f) => f.meanFreq));
    expect(natural).toBeGreaterThan(0.2);
    expect(actual).toBeLessThan(0.02); // every |ω − Ω| is far inside K·r, so all are locked
  });
});
