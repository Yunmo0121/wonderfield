// Figure 4 · The order parameter as an average of arrows.
//
//   r e^{iψ} = (1/N) Σ e^{iθ_j}
//
// Left: N unit arrows. Right: the same arrows shrunk to length 1/N and laid
// head to tail; the chain ends exactly at r e^{iψ}.

import { el, fmt } from '../utils/helpers.js';
import { TAU, orderParameter } from '../utils/math.js';
import { RNG, randomSeed } from '../utils/random.js';
import { figureLoop, slider, palette, arrow, font, SERIF } from './figureKit.js';
import { chanceLevel } from '../worlds/firefly/observations.js';

const N = 12;

export function createVectorSum(root) {
  let spread = 0.35;
  let offsets = makeOffsets(7);
  let centre = -0.6;
  let dirty = true;
  let lastText = 0;

  const canvas = el('canvas', { class: 'fig-canvas fig-canvas--vectors', role: 'img', 'aria-label': 'Twelve unit arrows, and the same arrows added head to tail' });
  const readout = el('p', { class: 'fig-readout' });
  const s = slider({
    label: 'How spread out the phases are',
    min: 0, max: 1, step: 0.01, value: spread,
    format: (v) => (v === 0 ? 'all equal' : v === 1 ? 'anywhere' : `±${fmt(v * 180, 0)}°`),
    onInput: (v) => { spread = v; dirty = true; },
  });
  const shuffle = el('button', { class: 'fig-button', type: 'button', onclick: () => { offsets = makeOffsets(randomSeed()); dirty = true; } }, 'Shuffle the arrows');
  root.append(canvas, el('div', { class: 'fig-controls' }, s.node, el('div', { class: 'fig-controls__row' }, shuffle), readout));

  figureLoop(canvas, (ctx, w, h, dt, dpr) => {
    // a slow drift of the whole group, so the picture breathes
    centre += dt * 0.15;
    const phases = offsets.map((u) => centre + u * spread * Math.PI);
    const { r, psi } = orderParameter(phases);
    const C = palette();

    ctx.clearRect(0, 0, w, h);
    const narrow = w < 560 * dpr;
    const R = Math.min(narrow ? w * 0.36 : w * 0.18, h * (narrow ? 0.2 : 0.36));
    const left = narrow ? { x: w / 2, y: R + 30 * dpr } : { x: w * 0.27, y: h / 2 };
    const right = narrow ? { x: w / 2, y: h - R - 40 * dpr } : { x: w * 0.73, y: h / 2 };

    for (const c of [left, right]) {
      ctx.strokeStyle = C.rule;
      ctx.lineWidth = 1.2 * dpr;
      ctx.beginPath();
      ctx.arc(c.x, c.y, R, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(c.x - R - 8 * dpr, c.y);
      ctx.lineTo(c.x + R + 8 * dpr, c.y);
      ctx.moveTo(c.x, c.y - R - 8 * dpr);
      ctx.lineTo(c.x, c.y + R + 8 * dpr);
      ctx.stroke();
    }

    // left: unit arrows (standard maths orientation: angle from +x, anticlockwise)
    ctx.strokeStyle = C.glowEdge;
    ctx.fillStyle = C.glowEdge;
    ctx.lineWidth = 1.6 * dpr;
    for (const th of phases) {
      arrow(ctx, left.x, left.y, left.x + R * Math.cos(th), left.y - R * Math.sin(th), 7 * dpr);
    }

    // right: chain of arrows of length R/N
    let x = right.x;
    let y = right.y;
    for (const th of phases) {
      const nx = x + (R / N) * Math.cos(th);
      const ny = y - (R / N) * Math.sin(th);
      arrow(ctx, x, y, nx, ny, 5 * dpr);
      x = nx;
      y = ny;
    }
    // resultant
    ctx.strokeStyle = C.ink;
    ctx.fillStyle = C.ink;
    ctx.lineWidth = 2.5 * dpr;
    arrow(ctx, right.x, right.y, x, y, 10 * dpr);
    ctx.fillStyle = C.glow;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    ctx.arc(x, y, 6 * dpr, 0, TAU);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = C.soft;
    ctx.font = font(12, dpr);
    ctx.textAlign = 'center';
    ctx.fillText(`${N} phases as arrows`, left.x, left.y + R + 26 * dpr);
    ctx.fillText('head to tail, each 1/12 long', right.x, right.y + R + 26 * dpr);
    ctx.fillStyle = C.ink;
    ctx.font = font(15, dpr, SERIF, 400, 'italic');
    ctx.textAlign = 'left';
    const lx = right.x + 0.5 * (x - right.x) + 10 * dpr;
    const ly = right.y + 0.5 * (y - right.y) - 8 * dpr;
    if (r > 0.12) {
      ctx.fillText('r e', lx, ly);
      const wd = ctx.measureText('r e').width;
      ctx.font = font(10.5, dpr, SERIF, 400, 'italic');
      ctx.fillText('iψ', lx + wd + 1 * dpr, ly - 7 * dpr);
    }

    const now = performance.now();
    if (dirty || now - lastText > 250) {
      dirty = false;
      lastText = now;
      readout.innerHTML = `Length of the average arrow: <b><i>r</i> = ${fmt(r, 2)}</b>. Its direction <i>ψ</i> = ${fmt(((((psi * 180) / Math.PI) % 360) + 360) % 360, 0)}° is the group’s average phase.`
        + (spread >= 0.99 ? ` These arrows are completely random, yet <i>r</i> is not zero: twelve random arrows give about ${fmt(chanceLevel(N), 2)} on average. Shuffle a few times to see the scatter.` : '');
    }
  });
}

function makeOffsets(seed) {
  const rng = new RNG(seed);
  return Array.from({ length: N }, () => rng.uniform(-1, 1));
}
