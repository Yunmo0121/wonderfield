// Figure 5 · The tipping point.
// Line: Kuramoto's N → ∞ theory r(K) for Gaussian frequencies.
// Dots: real simulations (N = 200, global coupling, no noise) computed in the
// reader's browser, one coupling value at a time.

import { el, fmt, fitCanvasToDisplay } from '../utils/helpers.js';
import { criticalCouplingGaussian, kuramotoTheoryR } from '../utils/math.js';
import { Simulation } from '../worlds/firefly/simulation.js';
import { defaultParams, GLOBAL_RADIUS } from '../worlds/firefly/parameters.js';
import { palette, font, SERIF } from './figureKit.js';

const SIGMA = 0.25;
const N = 200;
const X_MAX = 3;
const RATIOS = Array.from({ length: 30 }, (_, i) => +(0.1 * (i + 1)).toFixed(1));
const BURN_IN = 40;
const AVERAGE = 20;

export function createPhaseTransition(root) {
  const kc = criticalCouplingGaussian(SIGMA);
  const theory = Array.from({ length: 241 }, (_, i) => {
    const x = (i / 240) * X_MAX;
    return { x, r: kuramotoTheoryR(x * kc, SIGMA) };
  });
  let dots = [];
  let running = false;
  let hover = null;
  let scale = null; // { X, Y } from the last draw, in CSS pixels

  const IDLE = 'The line is drawn from theory. Press the button to test it against 30 simulated forests.';
  const DONE = 'Each dot is a separate 60-second experiment with 200 fireflies. Point at a dot to read it.';

  const canvas = el('canvas', { class: 'fig-canvas fig-canvas--transition', role: 'img', 'aria-label': 'Graph of synchrony r against coupling strength: a theory curve that is zero up to the critical coupling and then rises steeply, with simulated points on top' });
  const status = el('p', { class: 'fig-readout' }, IDLE);
  const button = el('button', { class: 'fig-button fig-button--solid', type: 'button', onclick: run }, 'Run 30 simulations');
  root.append(canvas, el('div', { class: 'fig-controls' }, el('div', { class: 'fig-controls__row' }, button), status));

  new ResizeObserver(draw).observe(canvas);
  document.addEventListener('tw:theme', draw);

  canvas.addEventListener('pointermove', (e) => {
    if (!scale || running || !dots.length) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let best = null;
    for (const d of dots) {
      const dist = Math.hypot(scale.X(d.x) - mx, scale.Y(d.r) - my);
      if (dist < 16 && (!best || dist < best.dist)) best = { d, dist };
    }
    const next = best ? best.d : null;
    if (next === hover) return;
    hover = next;
    status.innerHTML = hover
      ? `<i>K</i> = ${fmt(hover.x, 1)} <i>K</i><sub>c</sub>: simulation <i>r</i> = ${fmt(hover.r, 2)}, theory ${fmt(kuramotoTheoryR(hover.x * kc, SIGMA), 2)}.`
      : DONE;
    draw();
  });
  canvas.addEventListener('pointerleave', () => {
    if (!hover) return;
    hover = null;
    status.textContent = DONE;
    draw();
  });

  function run() {
    if (running) return;
    running = true;
    dots = [];
    hover = null;
    button.disabled = true;
    let i = 0;
    const next = () => {
      const ratio = RATIOS[i];
      const sim = new Simulation(
        { ...defaultParams(), count: N, radius: GLOBAL_RADIUS, coupling: ratio * kc, freqSpread: SIGMA, noise: 0 },
        1000 + i,
      );
      sim.runFor(BURN_IN);
      let sum = 0;
      let n = 0;
      for (let k = 0; k < AVERAGE * 10; k++) {
        sim.runFor(0.1);
        sum += sim.order().r;
        n++;
      }
      dots.push({ x: ratio, r: sum / n });
      draw();
      status.innerHTML = `Simulated <i>K</i> = ${fmt(ratio, 1)} <i>K</i><sub>c</sub>: <i>r</i> = ${fmt(sum / n, 2)} (${i + 1} of ${RATIOS.length})`;
      i++;
      if (i < RATIOS.length) setTimeout(next, 0);
      else {
        running = false;
        button.disabled = false;
        button.textContent = 'Run them again';
        status.textContent = DONE;
      }
    };
    setTimeout(next, 30);
  }

  function draw() {
    const C = palette();
    const dpr = fitCanvasToDisplay(canvas);
    const ctx = canvas.getContext('2d');
    const { width: w, height: h } = canvas;
    ctx.clearRect(0, 0, w, h);
    const pl = 46 * dpr;
    const pr = 14 * dpr;
    const pt = 18 * dpr;
    const pb = 48 * dpr;
    const pw = w - pl - pr;
    const ph = h - pt - pb;
    const X = (x) => pl + (x / X_MAX) * pw;
    const Y = (r) => pt + (1 - r) * ph;
    scale = { X: (x) => X(x) / dpr, Y: (r) => Y(r) / dpr };

    // the synchronised side
    ctx.fillStyle = C.glowFill;
    ctx.fillRect(X(1), pt, X(X_MAX) - X(1), ph);

    // grid
    ctx.font = font(11.5, dpr);
    ctx.strokeStyle = C.rule;
    ctx.lineWidth = 1 * dpr;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const r of [0, 0.25, 0.5, 0.75, 1]) {
      ctx.beginPath();
      ctx.moveTo(pl, Y(r));
      ctx.lineTo(pl + pw, Y(r));
      ctx.stroke();
      ctx.fillStyle = C.soft;
      ctx.fillText(String(r), pl - 8 * dpr, Y(r));
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (const x of [0, 0.5, 1, 1.5, 2, 2.5, 3]) {
      if (w < 480 * dpr && x % 1 !== 0) continue;
      ctx.fillStyle = x === 1 ? C.ink : C.soft;
      if (x === 1) subscripted(ctx, 'K', 'c', X(x), pt + ph + 19 * dpr, dpr, 13);
      else { ctx.font = font(11.5, dpr); ctx.fillText(`${x}`, X(x), pt + ph + 19 * dpr); }
    }
    ctx.fillStyle = C.ink;
    subscripted(ctx, 'coupling K ÷ K', 'c', pl + pw / 2, h - 7 * dpr, dpr, 14);
    ctx.save();
    ctx.translate(13 * dpr, pt + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = font(14, dpr, SERIF, 400, 'italic');
    ctx.textAlign = 'center';
    ctx.fillText('synchrony r', 0, 0);
    ctx.restore();

    // the critical line
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1 * dpr;
    ctx.setLineDash([4 * dpr, 4 * dpr]);
    ctx.beginPath();
    ctx.moveTo(X(1), pt);
    ctx.lineTo(X(1), pt + ph);
    ctx.stroke();
    ctx.setLineDash([]);

    // theory
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.2 * dpr;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    theory.forEach((p, i) => (i === 0 ? ctx.moveTo(X(p.x), Y(p.r)) : ctx.lineTo(X(p.x), Y(p.r))));
    ctx.stroke();

    // simulations
    for (const d of dots) {
      const big = d === hover;
      ctx.fillStyle = C.glow;
      ctx.strokeStyle = big ? C.ink : C.glowEdge;
      ctx.lineWidth = (big ? 2 : 1.5) * dpr;
      ctx.beginPath();
      ctx.arc(X(d.x), Y(d.r), (big ? 8 : 5.5) * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // legend, on a plate-coloured box so no line runs through its words
    const narrow = w < 520 * dpr;
    const t1 = narrow ? 'theory (N → ∞)' : 'theory, infinitely many fireflies';
    const t2 = `simulation, N = ${N}`;
    ctx.font = font(12.5, dpr);
    const boxW = 30 * dpr + Math.max(ctx.measureText(t1).width, ctx.measureText(t2).width) + 12 * dpr;
    const lx = X(0.08);
    const ly = Y(0.9);
    ctx.fillStyle = C.plate;
    ctx.fillRect(lx - 8 * dpr, ly - 14 * dpr, boxW + 8 * dpr, 52 * dpr);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.2 * dpr;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx + 22 * dpr, ly);
    ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.fillText(t1, lx + 30 * dpr, ly);
    ctx.fillStyle = C.glow;
    ctx.strokeStyle = C.glowEdge;
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    ctx.arc(lx + 11 * dpr, ly + 24 * dpr, 5.5 * dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.fillText(t2, lx + 30 * dpr, ly + 24 * dpr);
  }
}

/** Italic serif text followed by a subscript, centred at (x, y). */
export function subscripted(ctx, text, sub, x, y, dpr, size) {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = font(size, dpr, SERIF, 400, 'italic');
  const tw = ctx.measureText(text).width;
  ctx.font = font(size * 0.72, dpr, SERIF, 400, 'italic');
  const sw = ctx.measureText(sub).width;
  const x0 = x - (tw + sw) / 2;
  ctx.font = font(size, dpr, SERIF, 400, 'italic');
  ctx.fillText(text, x0, y);
  ctx.font = font(size * 0.72, dpr, SERIF, 400, 'italic');
  ctx.fillText(sub, x0 + tw + 0.5 * dpr, y + size * 0.22 * dpr);
  ctx.restore();
}
