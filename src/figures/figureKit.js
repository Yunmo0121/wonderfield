// Shared bits for the magazine's figures: an animation loop that only runs
// while the figure is on screen, slider builders and small drawing helpers.
// Colours come from palette() (utils/theme.js), so every figure follows the
// reader's choice of paper or night edition.

import { el, fitCanvasToDisplay, fmt, decimalsForStep } from '../utils/helpers.js';
import { palette } from '../utils/theme.js';

export { palette };

export const SANS = '"Instrument Sans Variable", "Instrument Sans", system-ui, sans-serif';
export const SERIF = '"Newsreader Variable", Newsreader, Georgia, serif';

/**
 * Run `frame(ctx, w, h, dt, dpr)` every animation frame while the canvas is
 * visible. dt is in seconds (0 on the first visible frame).
 */
export function figureLoop(canvas, frame) {
  const ctx = canvas.getContext('2d');
  let visible = false;
  let last = null;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '100px' }).observe(canvas);
  function tick(ts) {
    if (visible) {
      const dpr = fitCanvasToDisplay(canvas);
      const dt = last === null ? 0 : Math.min(0.05, (ts - last) / 1000);
      last = ts;
      frame(ctx, canvas.width, canvas.height, dt, dpr);
    } else {
      last = null;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/** A labelled slider. `format` turns the value into display text. */
export function slider({ label, min, max, step, value, format, onInput }) {
  const id = `fig-${Math.random().toString(36).slice(2, 9)}`;
  const out = el('output', { class: 'fig-slider__value', for: id });
  const input = el('input', { type: 'range', id, min, max, step, value });
  const show = (v) => { out.textContent = format ? format(v) : fmt(v, decimalsForStep(step)); };
  input.addEventListener('input', () => {
    const v = Number(input.value);
    show(v);
    onInput(v);
  });
  show(Number(value));
  const node = el('div', { class: 'fig-slider' },
    el('div', { class: 'fig-slider__top' }, el('label', { for: id, html: label }), out),
    input,
  );
  return { node, input, set(v) { input.value = v; show(v); } };
}

/** Parse "#rrggbb", "#rgb" or "rgb(r, g, b)" into [r, g, b]. */
export function rgb(colour) {
  const c = colour.trim();
  if (c.startsWith('#')) {
    const hex = c.length === 4 ? [...c.slice(1)].map((ch) => ch + ch).join('') : c.slice(1, 7);
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const parts = c.match(/[\d.]+/g) || [0, 0, 0];
  return parts.slice(0, 3).map(Number);
}

export function rgba(colour, alpha) {
  const [r, g, b] = rgb(colour);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Draw a soft firefly glow at (x, y). */
export function drawGlow(ctx, x, y, radius, brightness, colour) {
  if (brightness <= 0.01) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, `rgba(255, 255, 238, ${0.95 * brightness})`);
  g.addColorStop(0.22, rgba(colour, 0.85 * brightness));
  g.addColorStop(1, rgba(colour, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

/** Point on a circle in the usual mathematical orientation (0 = right, anticlockwise). */
export function onCircle(cx, cy, radius, angle) {
  return [cx + radius * Math.cos(angle), cy - radius * Math.sin(angle)];
}

/**
 * The clock every figure shares: a circle, the firefly's glow in the middle,
 * and a tick at θ = 0 (on the right) where the firefly flashes.
 */
export function drawClockFace(ctx, cx, cy, R, brightness, C, dpr) {
  drawGlow(ctx, cx, cy, R * 0.78, brightness, C.glow);
  ctx.strokeStyle = C.rule;
  ctx.lineWidth = 1.5 * dpr;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2.5 * dpr;
  ctx.beginPath();
  ctx.moveTo(cx + R - 5 * dpr, cy);
  ctx.lineTo(cx + R + 9 * dpr, cy);
  ctx.stroke();
}

/** Arrow from (x0,y0) to (x1,y1) with a small head. */
export function arrow(ctx, x0, y0, x1, y1, head = 7) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  if (Math.hypot(x1 - x0, y1 - y0) < head * 0.8) return;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - head * Math.cos(a - 0.4), y1 - head * Math.sin(a - 0.4));
  ctx.lineTo(x1 - head * Math.cos(a + 0.4), y1 - head * Math.sin(a + 0.4));
  ctx.closePath();
  ctx.fill();
}

export function font(px, dpr, family = SANS, weight = 400, style = 'normal') {
  return `${style} ${weight} ${px * dpr}px ${family}`;
}
