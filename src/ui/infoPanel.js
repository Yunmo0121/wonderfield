// Status display under the sky: synchronisation level, phase circle, r(t) curve.

import { el, fmt, fitCanvasToDisplay } from '../utils/helpers.js';
import { TAU, clamp, criticalCoupling } from '../utils/math.js';
import { BASE_OMEGA } from '../worlds/firefly/parameters.js';
import { FIREFLY_COLOURS } from '../worlds/firefly/fireflyWorld.js';
import { observe } from '../worlds/firefly/observations.js';

// The lab sits on a night spread, so everything here is drawn light-on-dark.
const LIGHT = '#eef2ea';
const MUTED = 'rgba(238, 242, 234, 0.6)';
const FAINT = 'rgba(238, 242, 234, 0.16)';
const GLOW = '#f7dc52';

export function describeOrder(r) {
  if (r < 0.3) return 'scattered';
  if (r < 0.6) return 'clusters forming';
  if (r < 0.85) return 'mostly in step';
  return 'in step';
}

/**
 * The "Interesting observation" box: one sentence about what the sky is doing
 * right now and why, chosen by worlds/firefly/observations.js.
 */
export function createObservation(root) {
  const text = root.querySelector('[data-observation]');
  let lastUpdate = 0;
  return {
    update(sim) {
      const now = performance.now();
      if (now - lastUpdate < 800) return;
      lastUpdate = now;
      const { html } = observe({
        params: sim.params, r: sim.order().r, time: sim.time, history: sim.history, count: sim.fireflies.length,
      });
      if (text.innerHTML !== html) text.innerHTML = html;
    },
  };
}

export function createInfoPanel(root) {
  const percent = el('span', { class: 'status__percent' }, '0%');
  const label = el('span', { class: 'status__label' }, '');
  const meter = el('span', { class: 'meter__fill' });
  const facts = el('dl', { class: 'status__facts' });

  const phaseCanvas = el('canvas', { class: 'status__phase', 'aria-label': 'Phase circle: every firefly as a dot on its cycle' });
  const joinedCanvas = el('canvas', { class: 'status__joined', 'aria-label': 'Scatter plot of every firefly: natural tempo against the tempo it is actually keeping' });
  const joinedCaption = el('p', { class: 'status__caption' });
  const JOINED = 'One dot per firefly: its natural tempo across, the tempo it is actually keeping up the page. On the dashed diagonal it still keeps its own time. On the flat line it has joined.';
  const curveCanvas = el('canvas', { class: 'status__curve', 'aria-label': 'Synchronisation level over the last 40 seconds' });

  root.append(
    el('div', { class: 'status__card status__card--level' },
      el('p', { class: 'status__title' }, 'Synchrony right now'),
      el('p', { class: 'status__big' }, percent),
      el('span', { class: 'meter', 'aria-hidden': 'true' }, meter),
      label,
      facts,
    ),
    el('div', { class: 'status__card' },
      el('p', { class: 'status__title' }, 'Phase circle'),
      phaseCanvas,
      el('p', { class: 'status__caption' }, 'Every firefly’s phase. Each one flashes as it passes the tick on the right. The arrow is their average, and its length is r.'),
    ),
    el('div', { class: 'status__card status__card--joined' },
      el('p', { class: 'status__title' }, 'Who has joined the beat?'),
      joinedCanvas,
      joinedCaption,
    ),
    el('div', { class: 'status__card status__card--wide' },
      el('p', { class: 'status__title' }, 'r over the last 40 seconds'),
      curveCanvas,
    ),
  );

  let lastText = 0;

  return {
    /** Called every animation frame. */
    update(sim) {
      const { r, psi } = sim.order();
      drawPhaseCircle(phaseCanvas, sim, r, psi);
      drawJoined(joinedCanvas, sim, r);
      drawCurve(curveCanvas, sim.history);

      const now = performance.now();
      if (now - lastText < 100) return; // text at 10 Hz is plenty
      lastText = now;
      percent.textContent = `${Math.round(r * 100)}%`;
      meter.style.width = `${(r * 100).toFixed(1)}%`;
      label.textContent = describeOrder(r);
      const caption = sim.isGlobal
        ? `${JOINED} The shaded band is where theory says joining is possible.`
        : `${JOINED} Theory draws a band of who can join only when everyone sees everyone.`;
      if (joinedCaption.textContent !== caption) joinedCaption.textContent = caption;

      const p = sim.params;
      const kc = criticalCoupling(p.freqSpread, p.noise);
      const rows = [
        ['time', `${fmt(sim.time, 1)} s`],
        ['fireflies', String(sim.fireflies.length)],
        ['<i>K</i> / <i>K</i><sub>c</sub>', kc === 0 ? '∞' : fmt(p.coupling / kc, 2)],
      ];
      facts.replaceChildren(...rows.flatMap(([k, v]) => [el('dt', { html: k }), el('dd', {}, v)]));
      facts.title = sim.isGlobal
        ? 'K_c is the tipping point for this individuality and this much noise, for an endless forest where everyone sees everyone.'
        : 'K_c here is for a forest where everyone sees everyone. With a short line of sight, expect to need more.';
    },
  };
}

function drawPhaseCircle(canvas, sim, r, psi) {
  const dpr = fitCanvasToDisplay(canvas);
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) / 2 - 14 * dpr;

  // Same convention as every figure in the issue: θ = 0 points right,
  // angles increase anticlockwise, and a firefly flashes as it passes θ = 0.
  const toXY = (theta, radius) => [cx + radius * Math.cos(theta), cy - radius * Math.sin(theta)];

  ctx.strokeStyle = FAINT;
  ctx.lineWidth = 1.5 * dpr;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.stroke();

  // Flash marker: a short tick at θ = 0.
  ctx.strokeStyle = GLOW;
  ctx.lineWidth = 3 * dpr;
  ctx.beginPath();
  ctx.moveTo(cx + R - 4 * dpr, cy);
  ctx.lineTo(cx + R + 10 * dpr, cy);
  ctx.stroke();

  // Fireflies (slightly jittered radius so dense clusters stay readable).
  const ff = sim.fireflies;
  for (let i = 0; i < ff.length; i++) {
    const f = ff[i];
    const jitter = ((i * 37) % 11) / 11 - 0.5;
    const [x, y] = toXY(f.theta, R + jitter * 6 * dpr);
    ctx.globalAlpha = 0.45 + 0.55 * f.brightness;
    ctx.fillStyle = FIREFLY_COLOURS[f.hue];
    ctx.beginPath();
    ctx.arc(x, y, 2.4 * dpr, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Mean field arrow r·e^{iψ}.
  const [ax, ay] = toXY(psi, R * r);
  ctx.strokeStyle = LIGHT;
  ctx.fillStyle = LIGHT;
  ctx.lineWidth = 2 * dpr;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(ax, ay);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(ax, ay, 3.2 * dpr, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, 2 * dpr, 0, TAU);
  ctx.fill();
}

function drawCurve(canvas, history) {
  const dpr = fitCanvasToDisplay(canvas);
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);
  const padL = 26 * dpr;
  const padR = 8 * dpr;
  const padT = 8 * dpr;
  const padB = 20 * dpr;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const span = 40; // seconds shown

  ctx.font = `${11 * dpr}px "Instrument Sans Variable", "Instrument Sans", system-ui, sans-serif`;
  ctx.fillStyle = MUTED;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const v of [0, 0.5, 1]) {
    const y = padT + plotH * (1 - v);
    ctx.fillText(String(v), padL - 6 * dpr, y);
    ctx.strokeStyle = FAINT;
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.stroke();
  }
  if (history.length < 2) return;

  const tEnd = Math.max(span, history[history.length - 1].t);
  const tStart = tEnd - span;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${fmt(tStart, 0)} s`, padL, h - 4 * dpr);
  ctx.textAlign = 'right';
  ctx.fillText(`${fmt(tEnd, 0)} s`, w - padR, h - 4 * dpr);

  const X = (t) => padL + ((t - tStart) / span) * plotW;
  const Y = (r) => padT + plotH * (1 - r);
  const pts = history.filter((p) => p.t >= tStart);

  const fill = ctx.createLinearGradient(0, padT, 0, padT + plotH);
  fill.addColorStop(0, 'rgba(247, 220, 82, 0.30)');
  fill.addColorStop(1, 'rgba(247, 220, 82, 0.0)');
  ctx.beginPath();
  ctx.moveTo(X(pts[0].t), Y(0));
  for (const p of pts) ctx.lineTo(X(p.t), Y(p.r));
  ctx.lineTo(X(pts[pts.length - 1].t), Y(0));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.strokeStyle = GLOW;
  ctx.lineWidth = 2 * dpr;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(X(p.t), Y(p.r)) : ctx.lineTo(X(p.t), Y(p.r))));
  ctx.stroke();
}

/**
 * "Who has joined the beat?": natural tempo (across) against the tempo each
 * firefly is actually keeping (up). A free firefly sits on the diagonal; a
 * locked one sits on the flat line at the group's tempo. With all-to-all
 * coupling, theory says a firefly can lock when |ω − Ω| ≤ K·r, the shaded band.
 */
function drawJoined(canvas, sim, r) {
  const dpr = fitCanvasToDisplay(canvas);
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);
  const padL = 24 * dpr;
  const padR = 6 * dpr;
  const padT = 6 * dpr;
  const padB = 22 * dpr;
  const pw = w - padL - padR;
  const ph = h - padT - padB;
  const { coupling: K, freqSpread: sigma } = sim.params;
  const half = Math.max(0.3, 2.8 * sigma); // rad/s either side of the average tempo
  const X = (d) => padL + ((clamp(d, -half, half) + half) / (2 * half)) * pw;
  const Y = (d) => padT + (1 - (clamp(d, -half, half) + half) / (2 * half)) * ph;
  const ff = sim.fireflies;

  // The group's tempo: the median of the tempos actually being kept.
  const kept = ff.map((f) => f.meanFreq - BASE_OMEGA).sort((a, b) => a - b);
  const group = kept.length ? kept[Math.floor(kept.length / 2)] : 0;

  if (sim.isGlobal && K * r > 0.004) {
    const x0 = X(group - K * r);
    const x1 = X(group + K * r);
    ctx.fillStyle = 'rgba(247, 220, 82, 0.14)';
    ctx.fillRect(x0, padT, x1 - x0, ph);
  }

  ctx.strokeStyle = FAINT;
  ctx.lineWidth = 1 * dpr;
  ctx.strokeRect(padL, padT, pw, ph);
  ctx.setLineDash([4 * dpr, 4 * dpr]);
  ctx.strokeStyle = MUTED;
  ctx.beginPath();
  ctx.moveTo(X(-half), Y(-half));
  ctx.lineTo(X(half), Y(half));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = GLOW;
  ctx.globalAlpha = 0.85;
  for (const f of ff) {
    ctx.beginPath();
    ctx.arc(X(sigma * f.z), Y(f.meanFreq - BASE_OMEGA), 2.3 * dpr, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.font = `${11 * dpr}px "Instrument Sans Variable", "Instrument Sans", system-ui, sans-serif`;
  ctx.fillStyle = MUTED;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillText('slow', padL, h - 6 * dpr);
  ctx.textAlign = 'center';
  ctx.fillText('natural tempo', padL + pw / 2, h - 6 * dpr);
  ctx.textAlign = 'right';
  ctx.fillText('fast', padL + pw, h - 6 * dpr);
  ctx.save();
  ctx.translate(12 * dpr, padT + ph / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('actual tempo', 0, 0);
  ctx.restore();
}
