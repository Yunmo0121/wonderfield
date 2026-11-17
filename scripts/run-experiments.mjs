// Re-runs every preset in src/data/experimentNotes.js headlessly and prints a
// Markdown table of results. Usage:  npm run experiments
import { Simulation } from '../src/worlds/firefly/simulation.js';
import { defaultParams } from '../src/worlds/firefly/parameters.js';
import { criticalCoupling } from '../src/utils/math.js';
import { EXPERIMENTS } from '../src/data/experimentNotes.js';

const SEEDS = [1, 2, 3, 4, 5];
const DURATION = 90; // seconds of simulated time
const WINDOW = 30;   // average r over the last WINDOW seconds
const THRESHOLD = 0.8;

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const sd = (a) => Math.sqrt(mean(a.map((x) => (x - mean(a)) ** 2)));
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

console.log(`| Experiment | K | R | σ | D | K / K_c | mean r (last ${WINDOW} s) | time to r > ${THRESHOLD} (median) |`);
console.log('|---|---|---|---|---|---|---|---|');
for (const exp of EXPERIMENTS) {
  const p = { ...defaultParams(), ...exp.params };
  const finals = [];
  const times = [];
  for (const seed of SEEDS) {
    const sim = new Simulation(p, seed);
    let reached = null;
    const tail = [];
    while (sim.time < DURATION) {
      sim.runFor(0.1);
      const { r } = sim.order();
      if (reached === null && r > THRESHOLD) reached = sim.time;
      if (sim.time > DURATION - WINDOW) tail.push(r);
    }
    finals.push(mean(tail));
    times.push(reached ?? Infinity);
  }
  const kc = criticalCoupling(p.freqSpread, p.noise); // threshold for this σ and this much noise
  const ratio = kc === 0 ? '∞' : (p.coupling / kc).toFixed(2);
  const t = median(times);
  console.log(`| ${exp.title} | ${p.coupling} | ${p.radius >= 0.95 ? 'global' : p.radius} | ${p.freqSpread} | ${p.noise} | ${ratio} | ${mean(finals).toFixed(2)} ± ${sd(finals).toFixed(2)} | ${Number.isFinite(t) ? t.toFixed(1) + ' s' : 'never'} |`);
}
