// Figure 2 · Two fireflies that can see each other.
//
//   dθ₁/dt = ω₁ + (K/2) sin(θ₂ − θ₁),   dθ₂/dt = ω₂ + (K/2) sin(θ₁ − θ₂)
//   ⇒  dφ/dt = Δω − K sin φ,   φ = θ₂ − θ₁,  Δω = ω₂ − ω₁   (Adler's equation)
//
// Locking iff |Δω| ≤ K, at φ* = arcsin(Δω/K). Otherwise φ drifts with period
// 2π / √(Δω² − K²).

import { el, fmt } from '../utils/helpers.js';
import { TAU } from '../utils/math.js';
import { flashBrightness } from '../worlds/firefly/firefly.js';
import {
  figureLoop, slider, palette, arrow, font, drawClockFace, onCircle, SERIF,
} from './figureKit.js';

const OMEGA0 = Math.PI;
const STEP = 1 / 120;

const wrapPi = (x) => ((((x + Math.PI) % TAU) + TAU) % TAU) - Math.PI;

export function createTwoClocks(root) {
  let dw = 0.6;
  let K = 1.0;
  let th1 = 0;
  let th2 = 2.4;
  let acc = 0;

  const canvas = el('canvas', { class: 'fig-canvas fig-canvas--two', role: 'img', 'aria-label': 'Two firefly clocks, and the graph of how their phase gap changes' });
  const readout = el('p', { class: 'fig-readout' });
  const sDw = slider({ label: 'Difference in natural speed <i>Δω</i>', min: 0, max: 2, step: 0.05, value: dw, format: (v) => `${fmt(v, 2)} rad/s`, onInput: (v) => { dw = v; } });
  const sK = slider({ label: 'Coupling <i>K</i>', min: 0, max: 2, step: 0.05, value: K, format: (v) => fmt(v, 2), onInput: (v) => { K = v; } });
  const push = el('button', { class: 'fig-button', type: 'button', onclick: () => { th2 = th1 + Math.PI * 0.95; } }, 'Push them apart');
  root.append(canvas, el('div', { class: 'fig-controls fig-controls--two' }, sDw.node, sK.node, el('div', { class: 'fig-controls__row' }, push), readout));

  let lastText = 0;
  figureLoop(canvas, (ctx, w, h, dt, dpr) => {
    acc += dt;
    while (acc >= STEP) {
      const s = Math.sin(th2 - th1);
      const d1 = OMEGA0 - dw / 2 + (K / 2) * s;
      const d2 = OMEGA0 + dw / 2 - (K / 2) * s;
      th1 = (th1 + d1 * STEP) % TAU;
      th2 = (th2 + d2 * STEP) % TAU;
      acc -= STEP;
    }
    const phi = wrapPi(th2 - th1);
    const C = palette();

    ctx.clearRect(0, 0, w, h);
    const narrow = w < 560 * dpr;

    // ---- two clocks (top band)
    const topH = h * (narrow ? 0.38 : 0.42);
    const R = Math.min(topH * 0.34, w * 0.13);
    const clocks = [
      { x: w * 0.3, th: th1, label: narrow ? 'the slower one' : 'firefly 1, the slower one' },
      { x: w * 0.7, th: th2, label: narrow ? 'the faster one' : 'firefly 2, the faster one' },
    ];
    for (const c of clocks) {
      const cy = topH * 0.52;
      drawClockFace(ctx, c.x, cy, R, flashBrightness(c.th), C, dpr);
      const [x, y] = onCircle(c.x, cy, R, c.th);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.moveTo(c.x, cy);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.arc(x, y, 5.5 * dpr, 0, TAU);
      ctx.fill();
      ctx.fillStyle = C.soft;
      ctx.font = font(12.5, dpr);
      ctx.textAlign = 'center';
      ctx.fillText(c.label, c.x, cy + R + 24 * dpr);
    }

    // ---- phase line: dφ/dt = Δω − K sin φ against φ ∈ [−π, π]
    const pl = 46 * dpr;
    const pr = 16 * dpr;
    const pt = topH + 18 * dpr;
    const pb = h - 50 * dpr;
    const pw = w - pl - pr;
    const yMax = Math.max(1, dw + K) * 1.15;
    const X = (p) => pl + ((p + Math.PI) / TAU) * pw;
    const Y = (v) => pt + ((yMax - v) / (2 * yMax)) * (pb - pt);
    const f = (p) => dw - K * Math.sin(p);

    // zero axis + ticks
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.moveTo(pl, Y(0));
    ctx.lineTo(pl + pw, Y(0));
    ctx.stroke();
    ctx.fillStyle = C.soft;
    ctx.font = font(11, dpr);
    ctx.textAlign = 'center';
    for (const deg of [-180, -90, 0, 90, 180]) {
      const x = X((deg * Math.PI) / 180);
      ctx.fillText(`${deg}°`, x, pb + 20 * dpr);
      ctx.strokeStyle = C.rule;
      ctx.beginPath();
      ctx.moveTo(x, pt);
      ctx.lineTo(x, pb);
      ctx.stroke();
    }
    ctx.textAlign = 'left';
    ctx.font = font(13, dpr, SERIF, 400, 'italic');
    ctx.fillStyle = C.ink;
    ctx.fillText('dφ/dt', 6 * dpr, pt + 4 * dpr);
    ctx.textAlign = 'center';
    ctx.fillText('gap φ = θ₂ − θ₁', pl + pw / 2, h - 6 * dpr);

    // shaded regions: above axis → gap grows; below → shrinks
    ctx.beginPath();
    ctx.moveTo(X(-Math.PI), Y(0));
    for (let i = 0; i <= 200; i++) {
      const p = -Math.PI + (i / 200) * TAU;
      ctx.lineTo(X(p), Y(f(p)));
    }
    ctx.lineTo(X(Math.PI), Y(0));
    ctx.closePath();
    ctx.fillStyle = C.glowFill;
    ctx.fill();

    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const p = -Math.PI + (i / 200) * TAU;
      if (i === 0) ctx.moveTo(X(p), Y(f(p))); else ctx.lineTo(X(p), Y(f(p)));
    }
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2 * dpr;
    ctx.stroke();

    // flow chevrons on the axis
    ctx.fillStyle = C.glowEdge;
    ctx.strokeStyle = C.glowEdge;
    ctx.lineWidth = 1.5 * dpr;
    for (let i = 0; i < 12; i++) {
      const p = -Math.PI + ((i + 0.5) / 12) * TAU;
      const v = f(p);
      if (Math.abs(v) < 0.04) continue;
      const x = X(p);
      const dir = Math.sign(v) * 9 * dpr;
      arrow(ctx, x - dir, Y(0), x + dir, Y(0), 6 * dpr);
    }

    // fixed points
    if (K > 0 && dw <= K) {
      const ps = Math.asin(dw / K);
      const pu = wrapPi(Math.PI - ps);
      ctx.lineWidth = 2 * dpr;
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.arc(X(ps), Y(0), 6 * dpr, 0, TAU);
      ctx.fill();
      ctx.fillStyle = C.plate;
      ctx.strokeStyle = C.ink;
      ctx.beginPath();
      ctx.arc(X(pu), Y(0), 6 * dpr, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }

    // current gap
    const cx = X(phi);
    ctx.setLineDash([3 * dpr, 3 * dpr]);
    ctx.strokeStyle = C.glowEdge;
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.moveTo(cx, Y(0));
    ctx.lineTo(cx, Y(f(phi)));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.glow;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    ctx.arc(cx, Y(0), 7.5 * dpr, 0, TAU);
    ctx.fill();
    ctx.stroke();

    const now = performance.now();
    if (now - lastText > 150) {
      lastText = now;
      const gap = `Current gap φ = ${fmt((phi * 180) / Math.PI, 0)}°.`;
      if (K === 0 && dw === 0) {
        readout.innerHTML = `<b>Frozen.</b> Same speed and no coupling: whatever gap they start with, they keep for ever. ${gap}`;
      } else if (K > 0 && dw <= K) {
        readout.innerHTML = `<b>Locks.</b> <i>K</i> ≥ <i>Δω</i>, so the gap comes to rest at φ* = arcsin(<i>Δω</i>/<i>K</i>) = ${fmt((Math.asin(dw / K) * 180) / Math.PI, 0)}° (filled dot). ${gap}`;
      } else {
        const T = TAU / Math.sqrt(dw * dw - K * K);
        readout.innerHTML = `<b>Drifts.</b> <i>Δω</i> &gt; <i>K</i>: no resting point, so the faster firefly laps the slower one every ${fmt(T, 1)} s. ${gap}`;
      }
    }
  });
}
