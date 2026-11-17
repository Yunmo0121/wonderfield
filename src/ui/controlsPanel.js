// The little lab console: buttons, sliders (built from PARAMETERS) and toggles.
// It never touches the simulation directly; it reports changes via callbacks.

import { el, fmt, decimalsForStep } from '../utils/helpers.js';
import { PARAMETERS, GLOBAL_RADIUS } from '../worlds/firefly/parameters.js';

/**
 * @param {HTMLElement} root
 * @param {object} o
 * @param {object} o.params     current parameter values
 * @param {object} o.display    current display toggles
 * @param {number} o.seed
 * @param {object} o.on         { toggleRun, reset, randomise, param(key, value), display(key, value), snapshot? }
 */
export function createControlsPanel(root, { params, display, seed, on }) {
  const sliders = {};
  let mark = null; // dotted tick on the coupling dial

  const runBtn = el('button', { class: 'btn btn--primary', type: 'button', onclick: () => on.toggleRun() }, 'Start');
  const resetBtn = el('button', { class: 'btn btn--ghost', type: 'button', onclick: () => on.reset(), title: 'Restart this experiment (same seed)' }, 'Reset');
  const randBtn = el('button', { class: 'btn btn--ghost', type: 'button', onclick: () => on.randomise(), title: 'New random seed' }, 'Randomise');
  const seedLabel = el('span', { class: 'seed' });

  root.append(
    el('div', { class: 'panel__head' },
      el('h3', { class: 'panel__title' }, 'The dials'),
      seedLabel,
    ),
    el('div', { class: 'panel__buttons' }, runBtn, resetBtn, randBtn),
  );

  const group = el('div', { class: 'panel__sliders' });
  for (const [key, spec] of Object.entries(PARAMETERS)) {
    const id = `param-${key}`;
    const tipId = `${id}-tip`;
    const input = el('input', {
      type: 'range', id, min: spec.min, max: spec.max, step: spec.step, value: params[key],
      'aria-describedby': tipId,
    });
    const value = el('output', { class: 'slider__value', for: id });
    input.addEventListener('input', () => {
      const v = Number(input.value);
      showValue(key, v);
      on.param(key, v);
    });
    const row = el('div', { class: 'slider' },
      el('div', { class: 'slider__top' },
        el('label', { for: id },
          spec.label, ' ', el('span', { class: 'slider__symbol' }, spec.symbol),
        ),
        el('span', { class: 'tip' },
          el('button', { class: 'tip__btn', type: 'button', 'aria-label': `About ${spec.label}` }, 'i'),
          el('span', { class: 'tip__text', id: tipId, role: 'tooltip' }, spec.info),
        ),
        value,
      ),
      el('div', { class: 'slider__rail' }, input, key === 'coupling' ? (mark = el('span', { class: 'slider__mark', hidden: true, 'aria-hidden': 'true' }, el('span', {}, 'tipping point'))) : null),
    );
    sliders[key] = { input, value, spec };
    group.append(row);
  }
  root.append(group);

  const toggles = {};
  const toggleDefs = [
    ['trails', 'Show trails'],
    ['glow', 'Glow effect'],
    ['connections', 'Show connections'],
  ];
  const toggleGroup = el('div', { class: 'panel__toggles' });
  for (const [key, label] of toggleDefs) {
    const input = el('input', { type: 'checkbox', role: 'switch', checked: display[key] });
    input.addEventListener('change', () => on.display(key, input.checked));
    toggles[key] = input;
    toggleGroup.append(el('label', { class: 'switch' }, input, el('span', { class: 'switch__track', 'aria-hidden': 'true' }), label));
  }
  const connectionsHint = el('p', { class: 'panel__hint' });
  root.append(toggleGroup, connectionsHint);

  // Saving a picture needs a download, which embedded previews do not allow.
  if (on.snapshot && window.self === window.top) {
    root.append(el('button', { class: 'btn btn--ghost btn--wide', type: 'button', onclick: () => on.snapshot() }, 'Save this sky as a picture'));
  }

  function showValue(key, v) {
    const { value, spec } = sliders[key];
    if (key === 'radius' && v >= GLOBAL_RADIUS) value.textContent = 'everyone';
    else if (key === 'speed') value.textContent = `${fmt(v, 2)}×`;
    else value.textContent = fmt(v, decimalsForStep(spec.step));
    if (key === 'radius') {
      connectionsHint.textContent = v >= GLOBAL_RADIUS
        ? 'Everyone sees everyone, so there are too many connections to draw.'
        : '';
    }
  }

  const api = {
    setRunning(running) {
      runBtn.textContent = running ? 'Pause' : 'Start';
      runBtn.setAttribute('aria-pressed', String(running));
    },
    setSeed(s) {
      seedLabel.textContent = `seed ${s}`;
    },
    /** Push values into the sliders (after a preset or a click-to-add). */
    setParams(p) {
      for (const [key, v] of Object.entries(p)) {
        if (!sliders[key]) continue;
        const { input, spec } = sliders[key];
        input.value = Math.min(spec.max, Math.max(spec.min, v));
        showValue(key, v);
      }
    },
    /** Move the dotted tick on the coupling dial to the current tipping point. */
    setTippingPoint(kc) {
      const { spec } = sliders.coupling;
      const f = (kc - spec.min) / (spec.max - spec.min);
      mark.hidden = !(f >= 0 && f <= 1);
      // 18px thumb: its centre travels from 9px to (100% − 9px)
      mark.style.left = `calc(9px + (100% - 18px) * ${f.toFixed(4)})`;
    },
    setDisplay(d) {
      for (const [key, v] of Object.entries(d)) if (toggles[key]) toggles[key].checked = v;
    },
  };

  api.setParams(params);
  api.setSeed(seed);
  api.setRunning(false);
  return api;
}
