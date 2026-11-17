// Page furniture: the reading-mode and paper/night switches, the phase-ring
// emblem, and the sticky bar whose ring gathers as you read down the issue.

import { getMode, setMode, getPaper, setPaper } from '../utils/theme.js';
import { mulberry32 } from '../utils/random.js';
import { TAU } from '../utils/math.js';

/** Wire every [data-set-mode] and [data-set-paper] button on the page. */
export function setupSwitches() {
  const sync = () => {
    for (const b of document.querySelectorAll('[data-set-mode]')) b.setAttribute('aria-pressed', String(b.dataset.setMode === getMode()));
    for (const b of document.querySelectorAll('[data-set-paper]')) b.setAttribute('aria-pressed', String(b.dataset.setPaper === getPaper()));
  };
  document.addEventListener('click', (e) => {
    const mode = e.target.closest('[data-set-mode]');
    if (mode) setMode(mode.dataset.setMode);
    const paper = e.target.closest('[data-set-paper]');
    if (paper) setPaper(paper.dataset.setPaper);
  });
  document.addEventListener('tw:mode', sync);
  document.addEventListener('tw:theme', sync);
  sync();
}

/**
 * The emblem of the issue: a phase circle with a dot for each phase.
 * Scattered dots mean a crowd; gathered dots mean a beat.
 */
export function ringSVG(phases, size = 44) {
  const c = size / 2;
  const R = size / 2 - size * 0.14;
  const dot = Math.max(1.8, size * 0.075);
  const dots = phases.map((th) => `<circle cx="${(c + R * Math.cos(th)).toFixed(2)}" cy="${(c - R * Math.sin(th)).toFixed(2)}" r="${dot}"/>`).join('');
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true"><circle class="ring__track" cx="${c}" cy="${c}" r="${R}"/><g class="ring__dots">${dots}</g></svg>`;
}

const SCATTER = (() => {
  const rand = mulberry32(21);
  return Array.from({ length: 9 }, () => rand() * 2 - 1); // offsets in [−1, 1]
})();

/** Nine phases whose spread shrinks from the whole circle (0) to a tight arc (1). */
export function gatheredPhases(order, centre = 0.9) {
  const spread = (1 - order) * Math.PI + order * 0.22;
  return SCATTER.map((u) => centre + u * spread);
}

const PRESETS = {
  one: [0.9],
  two: [0.5, 2.7],
  many: gatheredPhases(0),
  order: gatheredPhases(1),
};

/** Fill every <span class="ring" data-ring="…"> with its emblem. */
export function renderRings() {
  for (const node of document.querySelectorAll('.ring[data-ring]')) {
    node.innerHTML = ringSVG(PRESETS[node.dataset.ring] || PRESETS.many, Number(node.dataset.size) || 44);
  }
}

/** The bar's ring gathers as the reader scrolls from the top to the end. */
export function setupReadingRing(node) {
  let frame = null;
  const update = () => {
    frame = null;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    node.innerHTML = ringSVG(gatheredPhases(progress, 0.9 + progress * TAU), 26);
    node.title = `You are ${Math.round(progress * 100)}% of the way through the issue`;
  };
  window.addEventListener('scroll', () => { if (frame === null) frame = requestAnimationFrame(update); }, { passive: true });
  update();
}
