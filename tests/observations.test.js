import { describe, it, expect } from 'vitest';
import { observe, chanceLevel, rAgo } from '../src/worlds/firefly/observations.js';
import { defaultParams, GLOBAL_RADIUS } from '../src/worlds/firefly/parameters.js';
import { Simulation } from '../src/worlds/firefly/simulation.js';
import { SYNC_MAP } from '../src/data/syncMap.js';
import { criticalCouplingGaussian, kuramotoTheoryR } from '../src/utils/math.js';

const P = (patch = {}) => ({ ...defaultParams(), ...patch });
const flat = (r, until = 30) => Array.from({ length: until * 10 + 1 }, (_, i) => ({ t: i / 10, r }));
const ramp = (from, to, until = 30) => Array.from({ length: until * 10 + 1 }, (_, i) => ({ t: i / 10, r: from + ((to - from) * i) / (until * 10) }));

describe('chance level', () => {
  it('matches the average r of random phases (N = 150)', () => {
    let sum = 0;
    const trials = 400;
    for (let s = 0; s < trials; s++) sum += new Simulation(P({ count: 150 }), s + 1).order().r;
    expect(sum / trials).toBeCloseTo(chanceLevel(150), 2);
  });
});

describe('rAgo', () => {
  it('reads r five seconds back, or null when there is not enough history', () => {
    expect(rAgo(ramp(0, 1, 10), 10, 5)).toBeCloseTo(0.5, 5);
    expect(rAgo([{ t: 0, r: 0.1 }, { t: 1, r: 0.2 }], 1, 5)).toBeNull();
  });
});

describe('observe', () => {
  const id = (s) => observe({ count: 150, history: flat(s.r), time: 30, ...s }).id;

  it('start of an experiment', () => {
    expect(observe({ params: P(), r: 0.07, time: 0, history: [], count: 150 }).id).toBe('start');
  });
  it('no coupling', () => expect(id({ params: P({ coupling: 0 }), r: 0.07 })).toBe('ignoring'));
  it('below the tipping point (global)', () => expect(id({ params: P({ radius: GLOBAL_RADIUS, coupling: 0.2 }), r: 0.1 })).toBe('below'));
  it('partial synchrony near the threshold', () => expect(id({ params: P({ radius: GLOBAL_RADIUS, coupling: 0.5 }), r: 0.6 })).toBe('edge'));
  it('snowball while r is climbing', () => {
    expect(observe({ params: P(), r: 0.6, time: 30, history: ramp(0, 0.6), count: 150 }).id).toBe('snowball');
  });
  it('dissolving while r is falling', () => {
    expect(observe({ params: P({ coupling: 0.1 }), r: 0.4, time: 30, history: ramp(0.9, 0.4), count: 150 }).id).toBe('dissolving');
  });
  it('locked', () => expect(id({ params: P(), r: 0.93 })).toBe('locked'));
  it('perfect unison for identical, noiseless fireflies', () => {
    expect(id({ params: P({ freqSpread: 0, noise: 0 }), r: 1 })).toBe('unison');
  });
  it('strong noise', () => expect(id({ params: P({ noise: 0.4 }), r: 0.15 })).toBe('windy'));
  it('local patches', () => expect(id({ params: P({ radius: 0.15, coupling: 2 }), r: 0.5 })).toBe('patches'));
});

describe('synchrony map (precomputed simulations)', () => {
  const kcOf = (sigma) => criticalCouplingGaussian(sigma);

  it('has one value per cell, all between 0 and 1', () => {
    expect(SYNC_MAP.r.length).toBe(SYNC_MAP.sigmas.length);
    for (const row of SYNC_MAP.r) {
      expect(row.length).toBe(SYNC_MAP.Ks.length);
      for (const v of row) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
    }
  });

  it('is dark well below the theoretical boundary and bright well above it', () => {
    SYNC_MAP.sigmas.forEach((sigma, j) => {
      SYNC_MAP.Ks.forEach((K, i) => {
        const ratio = K / kcOf(sigma);
        if (ratio < 0.6) expect(SYNC_MAP.r[j][i]).toBeLessThan(0.3);
        if (ratio > 1.8) expect(SYNC_MAP.r[j][i]).toBeGreaterThan(0.75);
      });
    });
  });

  it('agrees with Kuramoto theory away from the boundary (within 0.08)', () => {
    // Very weak coupling is excluded: order grows at a rate of roughly
    // (K − K_c)/2 per second, so for K < 0.3 sixty seconds is not enough to settle.
    SYNC_MAP.sigmas.forEach((sigma, j) => {
      SYNC_MAP.Ks.forEach((K, i) => {
        if (K >= 0.3 && K / kcOf(sigma) > 1.8) {
          expect(Math.abs(SYNC_MAP.r[j][i] - kuramotoTheoryR(K, sigma))).toBeLessThan(0.08);
        }
      });
    });
  });
});
