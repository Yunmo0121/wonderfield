// "Interesting observation": turns the current state of a simulation into one
// plain sentence about what is going on and why. Pure functions, no DOM, so the
// rules can be unit-tested.

import { criticalCoupling, criticalCouplingGaussian } from '../../utils/math.js';
import { GLOBAL_RADIUS } from './parameters.js';

/**
 * Expected r for N phases chosen completely at random.
 * The sum of N random unit arrows has a Rayleigh-distributed length, giving
 * E[r] = √π / (2√N). A finite crowd never reads exactly zero.
 */
export function chanceLevel(n) {
  return n > 0 ? Math.sqrt(Math.PI) / (2 * Math.sqrt(n)) : 0;
}

/** r about `seconds` ago, from a history of {t, r} samples (or null). */
export function rAgo(history, now, seconds) {
  const target = now - seconds;
  if (!history.length || history[0].t > target + 0.5) return null;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].t <= target) return history[i].r;
  }
  return null;
}

const f2 = (x) => x.toFixed(2);

/**
 * @param {object} s
 * @param {object} s.params   simulation parameters
 * @param {number} s.r        current order parameter
 * @param {number} s.time     simulated seconds since the last reset
 * @param {Array<{t:number,r:number}>} s.history
 * @param {number} s.count    number of fireflies
 * @returns {{id: string, html: string}}
 */
export function observe({ params, r, time, history = [], count }) {
  const { coupling: K, freqSpread: sigma, noise: D, radius: R } = params;
  const isGlobal = R >= GLOBAL_RADIUS;
  const kc = criticalCoupling(sigma, D);          // tipping point for this much noise
  const kcStill = criticalCouplingGaussian(sigma); // and on a windless night
  const chance = chanceLevel(count);
  const past = rAgo(history, time, 5);
  const rising = past !== null && r - past > 0.06;
  const falling = past !== null && past - r > 0.06;

  if (time < 0.5) {
    return {
      id: 'start',
      html: `Nothing has happened yet: ${count} phases dealt at random. Chance alone gives <i>r</i> ≈ ${f2(chance)}, so the meter never reads exactly zero.`,
    };
  }
  if (K === 0) {
    return {
      id: 'ignoring',
      html: `<i>K</i> = 0: nobody is listening. Each firefly keeps its own time, and <i>r</i> wanders around the chance level of ${f2(chance)}.`,
    };
  }
  if (r > 0.995 && sigma === 0 && D === 0) {
    return {
      id: 'unison',
      html: 'Perfect unison. Identical fireflies with no noise have nothing left to disagree about, so <i>r</i> reaches 1.',
    };
  }
  if (falling && r > chance * 1.5) {
    return {
      id: 'dissolving',
      html: `The beat is dissolving: <i>r</i> fell from ${f2(past)} to ${f2(r)} in five seconds. Without enough coupling, different natural speeds pull the phases apart again.`,
    };
  }
  if (rising && r < 0.9) {
    return {
      id: 'snowball',
      html: `The snowball is rolling: <i>r</i> rose from ${f2(past)} to ${f2(r)} in five seconds. Every firefly that joins makes the group’s pull on the others stronger.`,
    };
  }
  if (r >= 0.85) {
    return {
      id: 'locked',
      html: sigma > 0
        ? 'In step, but not identical. On the phase circle the dots form an arc, not a point: naturally fast fireflies lead the beat slightly and slow ones trail it. That spread is why <i>r</i> settles below 1.'
        : 'In step. The only thing keeping <i>r</i> below 1 now is noise, which keeps jostling each clock.',
    };
  }
  if (D >= 0.2 && r < 0.6 && K < 1.2 * kc) {
    return {
      id: 'windy',
      html: `A noisy night. Random kicks (<i>D</i> = ${f2(D)}) knock phases apart about as fast as coupling gathers them. Noise this strong lifts the tipping point from ${f2(kcStill)} to <i>K</i><sub>c</sub> ≈ ${f2(kc)}, and <i>K</i> is ${f2(K)}.`,
    };
  }
  if (isGlobal && K < kc) {
    return {
      id: 'below',
      html: `Below the tipping point: <i>K</i> is ${Math.round((K / kc) * 100)}% of the critical value <i>K</i><sub>c</sub> ≈ ${f2(kc)}. Everyone can see everyone, yet the pull is too weak to hold the crowd together.${D >= 0.05 ? ` Without the noise the threshold would be ${f2(kcStill)}.` : ''}`,
    };
  }
  if (isGlobal && K < 1.4 * kc) {
    return {
      id: 'edge',
      html: `Just above the tipping point (<i>K</i> = ${f2(K / kc)} <i>K</i><sub>c</sub>). A core of like-minded fireflies has locked, while the fastest and slowest still drift round the circle. This partial synchrony can last for ever.`,
    };
  }
  if (!isGlobal && r >= 0.3) {
    return {
      id: 'patches',
      html: `Patches. Each firefly sees only neighbours within <i>R</i> = ${f2(R)}, so neighbourhoods agree first and the sky follows later. Switch on “Show connections” to watch agreement spread.`,
    };
  }
  if (!isGlobal && time > 20) {
    return {
      id: 'shortsighted',
      html: 'Local agreement, global disagreement. With a short line of sight, distant patches settle on different beats and take a long time to reconcile.',
    };
  }
  return {
    id: 'forming',
    html: 'Clusters are forming. Watch the phase circle for a clump of dots travelling round together.',
  };
}
