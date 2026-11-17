import { describe, it, expect } from 'vitest';
import { PulseSwarm } from '../src/worlds/pulse/pulseSwarm.js';

describe('pulse-coupled fireflies (Mirollo–Strogatz)', () => {
  it('the charging curve runs from 0 to 1, bends downwards, and inverts exactly', () => {
    const s = new PulseSwarm();
    expect(s.charge(0)).toBeCloseTo(0, 12);
    expect(s.charge(1)).toBeCloseTo(1, 12);
    expect(s.charge(0.5)).toBeGreaterThan(0.5); // concave down: above the straight line
    for (const phi of [0.1, 0.37, 0.9]) expect(s.phaseOf(s.charge(phi))).toBeCloseTo(phi, 12);
  });

  it('with ε = 0 nobody reacts: every firefly flashes once per period and rhythms never merge', () => {
    const s = new PulseSwarm({ count: 12, epsilon: 0, period: 2 }, 4);
    const flashes = s.advance(20);
    expect(flashes.length).toBe(12 * 10);
    expect(s.groups()).toBe(12);
  });

  it('with ε > 0 the rhythms can only merge, and end as one', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const s = new PulseSwarm({ count: 20, epsilon: 0.005, curvature: 3, period: 2 }, seed);
      let previous = s.groups();
      for (let k = 0; k < 2000 && s.groups() > 1; k++) {
        s.advance(0.1);
        expect(s.groups()).toBeLessThanOrEqual(previous); // absorption is permanent
        previous = s.groups();
      }
      expect(s.groups()).toBe(1);
    }
  });

  it('once in unison, all fireflies flash at exactly the same instants', () => {
    const s = new PulseSwarm({ count: 20, epsilon: 0.01 }, 7);
    s.advance(400);
    expect(s.groups()).toBe(1);
    const flashes = s.advance(10);
    const instants = new Set(flashes.map((f) => f.t.toFixed(9)));
    expect(flashes.length).toBe(instants.size * 20);
  });

  it('is event-driven: splitting time into pieces does not change the result', () => {
    const a = new PulseSwarm({ count: 15, epsilon: 0.004 }, 9);
    const b = new PulseSwarm({ count: 15, epsilon: 0.004 }, 9);
    a.advance(12);
    for (let k = 0; k < 120; k++) b.advance(0.1);
    for (let i = 0; i < 15; i++) expect(b.phase[i]).toBeCloseTo(a.phase[i], 9);
  });
});
