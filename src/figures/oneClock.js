// Figure 1 · A firefly as a clock.
//
// A dot on the unit circle at angle θ (the phase). The horizontal bar is cos θ,
// the vertical bar is sin θ. Beside the circle, the height sin θ is recorded
// over the last six seconds, newest on the left, so the reader sees the circle
// unroll into a sine wave. The dot can be dragged by hand or left to run at ω.

import { el, fmt, prefersReducedMotion } from '../utils/helpers.js';
import { TAU } from '../utils/math.js';
import { flashBrightness } from '../worlds/firefly/firefly.js';
import { figureLoop, slider, palette, font, drawClockFace, onCircle, SERIF } from './figureKit.js';

const WINDOW = 6; // seconds of height on record

export function createOneClock(root) {
  let freq = 0.5; // laps per second, so ω = π rad/s
  let theta = 2.2;
  let playing = !prefersReducedMotion();
  let dragging = false;
  let time = 0;
  const trace = []; // { t, s, flash }
  const geo = { cx: 0, cy: 0, R: 1, dpr: 1 };

  const canvas = el('canvas', { class: 'fig-canvas fig-canvas--clock', role: 'img', 'aria-label': 'A dot on a circle with bars for its cosine and sine, and a wave recording its height over the last six seconds' });
  const handle = el('div', { class: 'fig-handle', 'aria-hidden': 'true' });
  const readout = el('p', { class: 'fig-readout' });
  const play = el('button', { class: 'fig-button', type: 'button', onclick: () => setPlaying(!playing) });
  const sTheta = slider({
    label: 'Phase <i>θ</i>, by hand',
    min: 0, max: 360, step: 1, value: Math.round((theta * 360) / TAU),
    format: (v) => `${v}°`,
    onInput: (v) => { setTheta(((v % 360) * TAU) / 360); setPlaying(false); },
  });
  const sOmega = slider({
    label: 'Natural frequency <i>ω</i>',
    min: 0.2, max: 1.5, step: 0.05, value: freq,
    format: (v) => `${fmt(v * TAU, 2)} rad/s`,
    onInput: (v) => { freq = v; },
  });
  root.append(
    el('div', { class: 'fig-stage' }, canvas, handle),
    el('div', { class: 'fig-controls' }, sTheta.node, sOmega.node, el('div', { class: 'fig-controls__row' }, play), readout),
  );

  function setPlaying(value) {
    playing = value;
    play.textContent = playing ? 'Hold it still' : 'Let it run';
  }
  setPlaying(playing);

  /** Move the dot, noting a flash if it passes θ = 0 going forwards. */
  let pendingFlash = false;
  function setTheta(next) {
    const step = ((((next - theta) + Math.PI) % TAU) + TAU) % TAU - Math.PI; // shortest signed move
    if (step > 0 && theta + step >= TAU) pendingFlash = true;
    theta = ((next % TAU) + TAU) % TAU;
  }

  // ---- dragging the dot round the circle
  function pointerAngle(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * geo.dpr - geo.cx;
    const y = (e.clientY - rect.top) * geo.dpr - geo.cy;
    return { angle: (Math.atan2(-y, x) + TAU) % TAU, dist: Math.hypot(x, y) };
  }
  function move(e) {
    setTheta(pointerAngle(e).angle);
    sTheta.set(Math.round((theta * 360) / TAU) % 360);
  }
  function endDrag() {
    dragging = false;
    handle.classList.remove('is-dragging');
    window.removeEventListener('pointermove', move);
  }
  function startDrag(e) {
    dragging = true;
    handle.classList.add('is-dragging');
    setPlaying(false);
    move(e);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', endDrag, { once: true });
    window.addEventListener('pointercancel', endDrag, { once: true });
    e.preventDefault();
  }
  handle.addEventListener('pointerdown', startDrag);
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return; // touch uses the handle, so the page still scrolls
    if (Math.abs(pointerAngle(e).dist - geo.R) < 28 * geo.dpr) startDrag(e);
  });

  let lastText = 0;
  figureLoop(canvas, (ctx, w, h, dt, dpr) => {
    if (playing && !dragging) {
      setTheta(theta + freq * TAU * dt);
      sTheta.set(Math.round((theta * 360) / TAU) % 360);
    }
    time += dt;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    trace.push({ t: time, s: sin, flash: pendingFlash });
    pendingFlash = false;
    while (trace.length && trace[0].t < time - WINDOW) trace.shift();

    const C = palette();
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 620 * dpr;

    // ------------------------------------------------------------ the circle
    const R = narrow ? Math.min(w * 0.3, 108 * dpr) : Math.min(h * 0.36, w * 0.16);
    const cx = narrow ? w / 2 : R + 60 * dpr;
    const cy = narrow ? R + 34 * dpr : h / 2 - 8 * dpr;
    Object.assign(geo, { cx, cy, R, dpr });

    ctx.strokeStyle = C.rule;
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.moveTo(cx - R - 16 * dpr, cy);
    ctx.lineTo(cx + R + 16 * dpr, cy);
    ctx.moveTo(cx, cy - R - 16 * dpr);
    ctx.lineTo(cx, cy + R + 16 * dpr);
    ctx.stroke();
    drawClockFace(ctx, cx, cy, R, flashBrightness(theta), C, dpr);
    ctx.fillStyle = C.ink;
    ctx.font = font(13, dpr, SERIF, 400, 'italic');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('flash', cx + R + 13 * dpr, cy - 8 * dpr);

    const [px, py] = onCircle(cx, cy, R, theta);

    // cos θ: how far across. sin θ: how high.
    ctx.lineCap = 'round';
    ctx.lineWidth = 4 * dpr;
    ctx.strokeStyle = C.teal;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, cy);
    ctx.stroke();
    ctx.strokeStyle = C.glowEdge;
    ctx.beginPath();
    ctx.moveTo(px, cy);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // the angle
    ctx.strokeStyle = C.soft;
    ctx.lineWidth = 1.2 * dpr;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.24, 0, -theta, true);
    ctx.stroke();
    const [tx, ty] = onCircle(cx, cy, R * 0.4, theta / 2);
    ctx.fillStyle = C.ink;
    ctx.font = font(15, dpr, SERIF, 400, 'italic');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('θ', tx, ty);

    // the radius and the dot you can grab
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.fillStyle = C.glow;
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.arc(px, py, 8.5 * dpr, 0, TAU);
    ctx.fill();
    ctx.stroke();
    handle.style.transform = `translate(${px / dpr - 22}px, ${py / dpr - 22}px)`;

    // --------------------------------------------- the height, written down
    // In the wide layout the wave shares the circle's vertical scale, so the
    // dot's height carries straight across to the newest point of the curve.
    const gx = narrow ? 20 * dpr : cx + R + 78 * dpr;
    const gw = w - gx - 34 * dpr;
    const amp = narrow ? Math.min(64 * dpr, (h - (cy + R)) * 0.3) : R;
    const gy = narrow ? cy + R + 46 * dpr + amp : cy;
    const X = (age) => gx + (age / WINDOW) * gw;
    const Y = (s) => gy - amp * s;

    ctx.font = font(11, dpr);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.lineWidth = 1 * dpr;
    for (const v of [1, 0, -1]) {
      ctx.strokeStyle = C.rule;
      ctx.beginPath();
      ctx.moveTo(gx, Y(v));
      ctx.lineTo(gx + gw, Y(v));
      ctx.stroke();
      ctx.fillStyle = C.soft;
      ctx.fillText(v === -1 ? '−1' : String(v), gx + gw + 8 * dpr, Y(v));
    }
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'center';
    for (const age of [0, 2, 4, 6]) {
      ctx.fillText(age === 0 ? 'now' : `${age} s ago`, X(age) + (age === 0 ? 10 * dpr : age === 6 ? -18 * dpr : 0), Y(-1) + 20 * dpr);
    }

    if (!narrow) {
      ctx.setLineDash([3 * dpr, 4 * dpr]);
      ctx.strokeStyle = C.soft;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(gx, py);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.beginPath();
    for (let i = trace.length - 1; i >= 0; i--) {
      const p = trace[i];
      const x = X(time - p.t);
      if (i === trace.length - 1) ctx.moveTo(x, Y(p.s)); else ctx.lineTo(x, Y(p.s));
    }
    ctx.strokeStyle = C.glowEdge;
    ctx.lineWidth = 2.5 * dpr;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // a marker each time the dot passed the flash mark
    let labelled = false;
    for (let i = trace.length - 1; i >= 0; i--) {
      const p = trace[i];
      if (!p.flash) continue;
      const x = X(time - p.t);
      ctx.fillStyle = C.glow;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.arc(x, Y(0), 5.5 * dpr, 0, TAU);
      ctx.fill();
      ctx.stroke();
      if (!labelled && x > gx + 26 * dpr && x < gx + gw - 30 * dpr) {
        labelled = true;
        ctx.fillStyle = C.ink;
        ctx.font = font(13, dpr, SERIF, 400, 'italic');
        ctx.textAlign = 'center';
        ctx.fillText('flash', x, Y(0) + 22 * dpr);
      }
    }
    // newest point
    ctx.fillStyle = C.glowEdge;
    ctx.beginPath();
    ctx.arc(X(0), Y(sin), 4.5 * dpr, 0, TAU);
    ctx.fill();

    ctx.fillStyle = C.ink;
    ctx.font = font(13.5, dpr, SERIF, 400, 'italic');
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('height of the dot, sin θ', gx + gw, Y(1) - 10 * dpr);

    const now = performance.now();
    if (now - lastText > 120) {
      lastText = now;
      readout.innerHTML = `<i>θ</i> = ${fmt((theta * 360) / TAU, 0)}° = ${fmt(theta, 2)} rad &nbsp;·&nbsp; across: cos <i>θ</i> = ${fmt(cos, 2)} &nbsp;·&nbsp; up: sin <i>θ</i> = ${fmt(sin, 2)} &nbsp;·&nbsp; one lap every <i>T</i> = 2π/<i>ω</i> = ${fmt(1 / freq, 2)} s`;
    }
  });
}
