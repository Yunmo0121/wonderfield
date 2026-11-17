// Experiment notes: each one is a reproducible preset (params + seed) with a
// question to ask and what we actually measured.
//
// The numbers in `result` come from `npm run experiments`
// (scripts/run-experiments.mjs): 5 seeds, 90 s of simulated time each,
// r averaged over the last 30 s. Re-run it after changing the model.
//
// Kc here is the tipping point for a forest where everyone sees everyone, for
// the experiment's own σ and noise D (utils/math.js, criticalCoupling). With
// the default σ = 0.25 and D = 0.02 it is 0.43; without noise it would be 0.40.

import { GLOBAL_RADIUS } from '../worlds/firefly/parameters.js';

export const EXPERIMENTS = [
  {
    id: 'alone',
    title: 'Everyone ignores everyone',
    question: 'With no coupling at all (K = 0), does any order appear by itself?',
    params: { coupling: 0 },
    seed: 101,
    result: 'r ≈ 0.07 ± 0.00 · never syncs',
    observation:
      'No order appears. But r isn’t exactly 0: for N random phases, finite-size fluctuations give E[r] ≈ √π / (2√N) ≈ 0.072 for N = 150, which is exactly what we measured. Even “chaos” has a predictable size.',
  },
  {
    id: 'below',
    title: 'Below the threshold',
    question: 'Global coupling, but weaker than the critical value Kc ≈ 1.6σ. Can a crowd sync if the bond is too weak?',
    params: { radius: GLOBAL_RADIUS, coupling: 0.2 },
    seed: 102,
    result: 'K/Kc = 0.47 · r ≈ 0.12 ± 0.01 · never syncs',
    observation:
      'Everyone can see everyone, yet nothing happens. Below Kc the pull towards the group can’t overcome the spread of natural rhythms, so phases keep slipping past each other. Coupling isn’t enough; it has to be strong enough.',
  },
  {
    id: 'edge',
    title: 'On the edge',
    question: 'Just above Kc. What does “partial” synchronisation look like?',
    params: { radius: GLOBAL_RADIUS, coupling: 0.5 },
    seed: 103,
    result: 'K/Kc = 1.18 · r ≈ 0.65 ± 0.09 · never reaches 0.8',
    observation:
      'A partially synchronised state: a core of fireflies with similar natural frequencies locks together, while the fastest and slowest individuals keep drifting around the circle. Watch the phase circle: a tight cluster plus a ring of “rebels”. In “Who has joined the beat?” the middle of the pack sits on the flat line while both tails stay on the diagonal.',
  },
  {
    id: 'above',
    title: 'Above the threshold',
    question: 'Nearly twice Kc, everyone sees everyone. How quickly does the swarm lock in?',
    params: { radius: GLOBAL_RADIUS, coupling: 0.8 },
    seed: 104,
    result: 'K/Kc = 1.88 · r ≈ 0.92 ± 0.01 · r > 0.8 after ≈ 10 s',
    observation:
      'Fast, clean synchronisation. r doesn’t reach exactly 1, because σ > 0 means each locked firefly sits at a slightly different angle from the group, and the noise D keeps jiggling them.',
  },
  {
    id: 'gossip',
    title: 'Neighbourhood gossip',
    question: 'Each firefly only sees a small circle around it (R = 0.15). Can purely local whispers create global order?',
    params: { radius: 0.15, coupling: 2 },
    seed: 105,
    result: 'local R = 0.15 · r ≈ 0.79 ± 0.08 · r > 0.8 after ≈ 28 s',
    observation:
      'Purely local whispers do create global order, but slower and less reliably (look at the larger ± across seeds). You can often see travelling waves and patches that disagree before the whole sky settles. Because fireflies drift, information is also carried by movement.',
  },
  {
    id: 'windy',
    title: 'A windy night',
    question: 'Same as the default world, but with strong noise (D = 0.4). How much chaos can the swarm absorb?',
    params: { noise: 0.4 },
    seed: 106,
    result: 'D = 0.4 · K/Kc = 0.79 · r ≈ 0.16 ± 0.04 · never syncs',
    observation:
      'Strong noise breaks the default world’s synchrony (which reached r ≈ 0.9 with D = 0.02). Noise acts like extra individuality: the coupling has to beat both the spread of natural speeds and the random kicks. With D = 0.4 the tipping point itself rises from 0.40 to about 1.01, even for a forest where everyone sees everyone, so K = 0.8 is now below it.',
  },
  {
    id: 'twins',
    title: 'Identical twins',
    question: 'If all fireflies had exactly the same natural rhythm (σ = 0), is even a tiny coupling enough?',
    params: { radius: GLOBAL_RADIUS, coupling: 0.3, freqSpread: 0, noise: 0 },
    seed: 107,
    result: 'σ = 0 · r = 1.00 · r > 0.8 after ≈ 20 s',
    observation:
      'With identical natural frequencies and no noise, any K > 0 eventually gives perfect synchrony (Kc = 0). It just takes longer when K is small. Individuality is what makes synchronisation hard.',
  },
];
