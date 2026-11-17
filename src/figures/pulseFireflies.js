// Figure 7 · Fireflies that talk only in flashes (Mirollo & Strogatz, 1990).
//
// A raster plot, the way field biologists draw firefly recordings: one row
// per firefly, one mark per flash, time running to the right. Separate
// rhythms appear as slanting stripes; each time one rhythm absorbs another,
// two stripes become one, until every mark falls on the same vertical line.

import { el, fmt } from '../utils/helpers.js';
import { randomSeed } from '../utils/random.js';
import { PulseSwarm } from '../worlds/pulse/pulseSwarm.js';
import { figureLoop, slider, palette, drawGlow, font, rgba } from './figureKit.js';

const COUNT = 20;
const WINDOW = 16; // seconds of flashes on screen
const AFTERGLOW = 0.45; // seconds a flash keeps glowing

export function createPulseFireflies(root) {
  // This starting state takes about 26 seconds to reach unison: long enough to watch.
  const swarm = new PulseSwarm({ count: COUNT, epsilon: 0.004, curvature: 3, period: 2 }, 21);
  let flashes = [];
  let rowOf = [];
  let lastFlash = new Float64Array(COUNT);
  let unisonAt = null;

  /** Put the fireflies in order of who will flash first, so separate rhythms read as stripes. */
  function arrange() {
    const order = Array.from({ length: COUNT }, (_, i) => i).sort((a, b) => swarm.phase[b] - swarm.phase[a]);
    rowOf = new Array(COUNT);
    order.forEach((i, row) => { rowOf[i] = row; });
    flashes = [];
    lastFlash = new Float64Array(COUNT).fill(-Infinity);
    unisonAt = null;
  }
  arrange();

  const canvas = el('canvas', { class: 'fig-canvas fig-canvas--raster', role: 'img', 'aria-label': 'Flash record of twenty pulse-coupled fireflies: one row each, one mark per flash, over the last sixteen seconds' });
  const readout = el('p', { class: 'fig-readout' });
  const sEps = slider({
    label: 'Lift from each flash, <i>ε</i>',
    min: 0, max: 0.02, step: 0.001, value: swarm.epsilon,
    format: (v) => (v === 0 ? 'not at all' : `${fmt(v * 100, 1)}% of a charge`),
    onInput: (v) => { swarm.epsilon = v; },
  });
  const again = el('button', { class: 'fig-button', type: 'button', onclick: () => { swarm.reset(randomSeed()); arrange(); } }, 'Scatter them again');
  root.append(canvas, el('div', { class: 'fig-controls' }, sEps.node, el('div', { class: 'fig-controls__row' }, again), readout));

  let lastText = 0;
  figureLoop(canvas, (ctx, w, h, dt, dpr) => {
    for (const f of swarm.advance(dt)) {
      flashes.push(f);
      lastFlash[f.i] = f.t;
    }
    const now = swarm.time;
    while (flashes.length && flashes[0].t < now - WINDOW) flashes.shift();
    const groups = swarm.groups();
    if (groups === 1 && unisonAt === null) unisonAt = now;
    if (groups > 1) unisonAt = null;

    const C = palette();
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 560 * dpr;
    const padL = (narrow ? 8 : 14) * dpr;
    const lamps = 34 * dpr; // the column of "fireflies now" on the right
    const padT = 10 * dpr;
    const padB = 30 * dpr;
    const pw = w - padL - lamps - 8 * dpr;
    const ph = h - padT - padB;
    const rowH = ph / COUNT;
    const X = (t) => padL + (1 - (now - t) / WINDOW) * pw;
    const Y = (row) => padT + (row + 0.5) * rowH;

    // faint row guides and time grid
    ctx.strokeStyle = C.rule;
    ctx.lineWidth = 1 * dpr;
    for (let row = 0; row <= COUNT; row += 5) {
      const y = padT + row * rowH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + pw, y);
      ctx.stroke();
    }
    ctx.font = font(11, dpr);
    ctx.fillStyle = C.soft;
    ctx.textBaseline = 'alphabetic';
    for (let ago = 0; ago <= WINDOW; ago += narrow ? 8 : 4) {
      const x = X(now - ago);
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + ph);
      ctx.stroke();
      ctx.textAlign = ago === 0 ? 'right' : ago === WINDOW ? 'left' : 'center';
      ctx.fillText(ago === 0 ? 'now' : `${ago} s ago`, x, h - 10 * dpr);
    }

    // one mark per flash
    ctx.lineCap = 'round';
    for (const f of flashes) {
      const x = X(f.t);
      const y = Y(rowOf[f.i]);
      const age = now - f.t;
      if (age < AFTERGLOW) drawGlow(ctx, x, y, rowH * 2.2, 1 - age / AFTERGLOW, C.glow);
      ctx.strokeStyle = rgba(C.ink, 0.9);
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.moveTo(x, y - rowH * 0.34);
      ctx.lineTo(x, y + rowH * 0.34);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';

    // the fireflies themselves, glowing when they have just flashed
    const lx = padL + pw + 8 * dpr + lamps / 2;
    for (let i = 0; i < COUNT; i++) {
      const y = Y(rowOf[i]);
      const glow = Math.max(0, 1 - (now - lastFlash[i]) / AFTERGLOW);
      drawGlow(ctx, lx, y, rowH * 1.9, glow, C.glow);
      ctx.fillStyle = glow > 0.05 ? C.glow : C.plate;
      ctx.strokeStyle = glow > 0.05 ? C.glowEdge : C.soft;
      ctx.lineWidth = 1.2 * dpr;
      ctx.beginPath();
      ctx.arc(lx, y, Math.min(rowH * 0.3, 5 * dpr), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    const stamp = performance.now();
    if (stamp - lastText > 250) {
      lastText = stamp;
      let html;
      if (swarm.epsilon === 0 && groups > 1) {
        html = `<b>Nobody reacts.</b> With <i>ε</i> = 0 every firefly keeps the rhythm it started with, and the ${groups} stripes stay parallel for ever.`;
      } else if (groups > 1) {
        html = `<b>${groups} separate rhythms</b>, out of ${COUNT} fireflies. Each flash lifts every other firefly a little nearer to its own. When that lift carries one over the top, it flashes in the same instant, and those two never part again.`;
      } else {
        html = `<b>One rhythm.</b> All ${COUNT} fireflies now flash at exactly the same instant: every mark sits on one vertical line. ${unisonAt > 0.05 ? `It took ${fmt(unisonAt, 0)} seconds.` : ''}`;
      }
      if (readout.innerHTML !== html) readout.innerHTML = html;
    }
  });
}
