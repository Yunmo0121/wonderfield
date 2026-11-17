// Wonderfield · Issue 1 · Synchrony. Entry point: wires the cover experiment,
// the figures, the laboratory and the experiments page together.

import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import '@fontsource-variable/instrument-sans/index.css';
import 'katex/dist/katex.min.css';
import './style.css';

import { Simulation } from './worlds/firefly/simulation.js';
import { FireflyWorld } from './worlds/firefly/fireflyWorld.js';
import {
  defaultParams, defaultDisplay, DEFAULT_SEED, GLOBAL_RADIUS,
} from './worlds/firefly/parameters.js';
import { initPreferences } from './utils/theme.js';
import { clamp, criticalCoupling } from './utils/math.js';
import { randomSeed } from './utils/random.js';
import { prefersReducedMotion } from './utils/helpers.js';
import { setupSwitches, renderRings, setupReadingRing } from './ui/chrome.js';
import { createCoverExperiment } from './ui/coverExperiment.js';
import { renderWordmarks } from './ui/wordmark.js';
import { createMenu } from './ui/menu.js';
import { createControlsPanel } from './ui/controlsPanel.js';
import { createInfoPanel, createObservation } from './ui/infoPanel.js';
import { renderMath, renderExperimentNotes, scrollToId } from './ui/layout.js';
import { EXPERIMENTS } from './data/experimentNotes.js';
import { createOneClock } from './figures/oneClock.js';
import { createTwoClocks } from './figures/twoClocks.js';
import { createVectorSum } from './figures/vectorSum.js';
import { createPhaseTransition } from './figures/phaseTransition.js';
import { createSyncMap } from './figures/syncMap.js';
import { createPulseFireflies } from './figures/pulseFireflies.js';

const $ = (id) => document.getElementById(id);

// ------------------------------------------------------------ page furniture
renderMath();
initPreferences();
setupSwitches();
renderRings();
setupReadingRing($('reading-ring'));

// --------------------------------------------------- the cover experiment
// A forest in which everyone can see everyone and there is no noise, so the
// dashed line under the sky (Kuramoto's theory) is the right prediction.
const coverCanvas = $('cover-sky');
const coverRect = coverCanvas.getBoundingClientRect();
const coverWorld = { width: 1.6, height: 1.6 * clamp(coverRect.height / Math.max(1, coverRect.width), 0.4, 1.6) };
const coverSim = new Simulation(
  { ...defaultParams(), count: 120, radius: GLOBAL_RADIUS, coupling: 0, freqSpread: 0.25, noise: 0, speed: 1 },
  1975, // the year Kuramoto published the model
  coverWorld,
);
let coverVisible = true;
let coverAllowed = !prefersReducedMotion(); // with reduced motion, wait for the reader to touch the dial
const cover = new FireflyWorld({
  canvas: coverCanvas,
  background: $('cover-bg'),
  simulation: coverSim,
  display: { trails: true, glow: true, connections: false },
  interactive: false,
  onFrame: () => coverExperiment.update(),
});
const coverExperiment = createCoverExperiment({
  sim: coverSim,
  slider: $('cover-k'),
  curve: $('cover-curve'),
  caption: $('cover-caption'),
  rValue: $('cover-r'),
  kValue: $('cover-k-value'),
  hint: $('cover-hint'),
  onFirstTouch: () => { coverAllowed = true; syncCover(); },
});
function syncCover() {
  if (coverAllowed && coverVisible) cover.start();
  else cover.pause();
}
new IntersectionObserver(([entry]) => { coverVisible = entry.isIntersecting; syncCover(); }).observe(coverCanvas);
syncCover();

// ---------------------------------------------------------------- figures
createOneClock($('figure-one'));
createTwoClocks($('figure-two'));
createVectorSum($('figure-four'));
createPhaseTransition($('figure-five'));
createPulseFireflies($('figure-seven'));
const map = createSyncMap($('figure-six'), {
  onOpen: ({ coupling, freqSpread }) => openInLab({ radius: GLOBAL_RADIUS, noise: 0, coupling, freqSpread }, 2026),
});

// ------------------------------------------------- the laboratory (Fig. 3)
const display = defaultDisplay();
const sim = new Simulation(defaultParams(), DEFAULT_SEED);
const status = createInfoPanel($('status'));
const observation = createObservation($('observation'));
const badge = $('mode-badge');

const world = new FireflyWorld({
  canvas: $('sky'),
  background: $('sky-bg'),
  simulation: sim,
  display,
  onFrame: () => { status.update(sim); observation.update(sim); },
  onAdd: () => controls.setParams({ count: sim.fireflies.length }),
});

function setRunning(running) {
  if (running) world.start();
  else world.pause();
  controls.setRunning(running);
}

function restart(params, seed) {
  sim.reset(params, seed);
  world.clear();
  controls.setParams(sim.params);
  controls.setSeed(sim.seed);
  reflectParams();
}

/** Things outside the lab that mirror its dials: the badge and the map marker. */
function reflectParams() {
  badge.textContent = sim.isGlobal ? 'Everyone sees everyone' : 'Local interactions → global order';
  map.setLab(sim.params.coupling, sim.params.freqSpread);
  controls.setTippingPoint(criticalCoupling(sim.params.freqSpread, sim.params.noise));
}

/** Load a set of dials into the laboratory, start it and bring it into view. */
function openInLab(patch, seed) {
  restart({ ...defaultParams(), ...patch, speed: sim.params.speed }, seed);
  setRunning(true);
  scrollToId('lab');
}

const controls = createControlsPanel($('controls'), {
  params: sim.params,
  display,
  seed: sim.seed,
  on: {
    toggleRun: () => setRunning(world.toggle()),
    reset: () => restart(sim.params, sim.seed),
    randomise: () => restart(sim.params, randomSeed()),
    param: (key, value) => {
      sim.setParams({ [key]: value });
      reflectParams();
    },
    display: (key, value) => { display[key] = value; },
    snapshot: savePicture,
  },
});
reflectParams();

function savePicture() {
  world.toImage().toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `wonderfield-synchrony-seed-${sim.seed}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  }, 'image/png');
}

// Space bar starts and pauses the laboratory while it is on screen.
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return;
  const tag = document.activeElement?.tagName;
  if (['INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'SUMMARY', 'A', 'CANVAS'].includes(tag)) return;
  const lab = $('lab').getBoundingClientRect();
  if (lab.bottom < 0 || lab.top > window.innerHeight) return;
  e.preventDefault();
  setRunning(world.toggle());
});

// ------------------------------------------------------------ experiments
const byId = Object.fromEntries(EXPERIMENTS.map((exp) => [exp.id, exp]));
renderExperimentNotes($('notes-grid'), EXPERIMENTS, (exp) => openInLab(exp.params, exp.seed));
for (const button of document.querySelectorAll('[data-experiment]')) {
  const exp = byId[button.dataset.experiment];
  if (exp) button.addEventListener('click', () => openInLab(exp.params, exp.seed));
}

// Canvas labels are drawn with web fonts; redraw the still figures once they load.
document.fonts?.ready.then(() => document.dispatchEvent(new CustomEvent('tw:theme')));

// ------------------------------------------------- wordmark and contents
renderWordmarks();
createMenu({
  base: '../',
  current: 'synchrony',
  sections: [
    ['#dial', 'The listening dial'],
    ['#one', 'Part one · The rhythm of one firefly'],
    ['#two', 'Part two · When fireflies interact'],
    ['#lab', 'The laboratory'],
    ['#three', 'Part three · Measuring collective order'],
    ['#why', 'Why it works, and when it fails'],
    ['#limits', 'What the model leaves out'],
    ['#everywhere', 'The same story elsewhere'],
    ['#experiments', 'Seven experiments to try'],
    ['#colophon', 'From the editor, and sources'],
  ],
});
