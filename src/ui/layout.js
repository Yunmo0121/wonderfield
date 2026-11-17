// Page-level helpers: maths typesetting, scrolling, and the experiments page.

import katex from 'katex';
import { el, prefersReducedMotion } from '../utils/helpers.js';

/** Typeset every [data-tex] (inline) and [data-tex-display] (block) element. */
export function renderMath(root = document) {
  for (const node of root.querySelectorAll('[data-tex]')) {
    katex.render(node.dataset.tex, node, { throwOnError: false });
  }
  for (const node of root.querySelectorAll('[data-tex-display]')) {
    katex.render(node.dataset.texDisplay, node, { throwOnError: false, displayMode: true });
  }
}

export function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

const SYMBOL = { count: 'N', coupling: 'K', radius: 'R', freqSpread: 'σ', noise: 'D', speed: 'speed' };

/**
 * The experiments page. As on a magazine puzzle page, each answer is printed
 * upside down: it stays out of sight until asked for, then turns the right
 * way up.
 */
export function renderExperimentNotes(root, experiments, onTry) {
  for (const exp of experiments) {
    const answer = el('div', { class: 'puzzle__answer', hidden: true },
      el('p', { class: 'puzzle__result' }, exp.result),
      el('p', {}, exp.observation),
    );
    const flip = el('button', { class: 'puzzle__flip', type: 'button', 'aria-expanded': 'false' }, 'Turn the answer up');
    flip.addEventListener('click', () => {
      const open = answer.hidden;
      answer.hidden = !open;
      flip.setAttribute('aria-expanded', String(open));
      flip.textContent = open ? 'Hide the answer' : 'Turn the answer up';
    });
    const setup = Object.entries(exp.params)
      .map(([k, v]) => `${SYMBOL[k] ?? k} = ${k === 'radius' && v >= 0.95 ? 'everyone' : v}`)
      .join(', ');
    root.append(
      el('article', { class: 'puzzle' },
        el('h3', { class: 'puzzle__title' }, exp.title),
        el('p', { class: 'puzzle__question' }, exp.question),
        el('p', { class: 'puzzle__setup' }, `${setup}, seed ${exp.seed}`),
        el('div', { class: 'puzzle__actions' },
          el('button', { class: 'fig-button fig-button--solid', type: 'button', onclick: () => onTry(exp) }, 'Set up the sky'),
          flip,
        ),
        answer,
      ),
    );
  }
}
