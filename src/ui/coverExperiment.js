// The issue's signature experiment, on the cover: "the listening dial".
//
// One slider sets the coupling K of a forest of fireflies (global coupling,
// no noise, so Kuramoto's theory applies exactly). Under the sky a curve
// records the synchrony r as it happens, with a dashed line showing where the
// theory says r will settle for the current K.

import { fitCanvasToDisplay, fmt } from '../utils/helpers.js';
import { criticalCouplingGaussian, kuramotoTheoryR } from '../utils/math.js';
import { rAgo } from '../worlds/firefly/observations.js';

const SPAN = 30; // seconds of history shown
const LIGHT = '#eef2ea';
const MUTED = 'rgba(238, 242, 234, 0.62)';
const FAINT = 'rgba(238, 242, 234, 0.18)';
const GLOW = '#f7dc52';

/**
 * @param {object} o
 * @param {import('../worlds/firefly/simulation.js').Simulation} o.sim
 * @param {HTMLInputElement} o.slider
 * @param {HTMLCanvasElement} o.curve
 * @param {HTMLElement} o.caption   live sentence about what is happening
 * @param {HTMLElement} o.rValue    big r read-out
 * @param {HTMLElement} o.kValue    K read-out under the slider
 * @param {HTMLElement} o.hint      "start here" nudge, hidden after first use
 * @param {()=>void} o.onFirstTouch
 */
export function createCoverExperiment({ sim, slider, curve, caption, rValue, kValue, hint, onFirstTouch }) {
  const sigma = sim.params.freqSpread;
  const kc = criticalCouplingGaussian(sigma);
  let touched = false;
  let target = kuramotoTheoryR(sim.params.coupling, sigma);
  let lastText = 0;
  let lastCaption = '';
  let captionSince = 0;

  slider.addEventListener('input', () => {
    const K = Number(slider.value);
    sim.setParams({ coupling: K });
    target = kuramotoTheoryR(K, sigma);
    kValue.innerHTML = `coupling <i>K</i> = ${fmt(K, 2)}`;
    if (!touched) {
      touched = true;
      hint.hidden = true;
      captionSince = 0; // let the first reaction show at once
      onFirstTouch?.();
    }
  });

  function describe(r) {
    const K = sim.params.coupling;
    const past = rAgo(sim.history, sim.time, 4);
    const falling = past !== null && past - r > 0.08;
    if (!touched) return 'Every light is a firefly keeping its own time. Right now, none of them is paying attention to any other.';
    if (K === 0) return 'Back to ignoring each other. Each firefly drifts off at its own speed and the beat dissolves.';
    if (falling) return 'Less listening, and the beat starts to come apart.';
    if (K < kc) return 'They can see each other now, but not enough to give up their own rhythms. Still a crowd. Keep going.';
    if (r < 0.45) return 'Something is starting. A few fireflies have fallen into step, and together they pull harder on the rest.';
    if (r < 0.85) return 'The agreement is spreading through the forest.';
    return 'They are keeping time. Nobody is leading. You changed one number, and the rest of this issue explains why that was enough.';
  }

  function draw(r) {
    const dpr = fitCanvasToDisplay(curve);
    const ctx = curve.getContext('2d');
    const { width: w, height: h } = curve;
    ctx.clearRect(0, 0, w, h);
    const pl = 22 * dpr;
    const pr = 10 * dpr;
    const pt = 12 * dpr;
    const pb = 20 * dpr;
    const pw = w - pl - pr;
    const ph = h - pt - pb;
    const Y = (v) => pt + (1 - v) * ph;

    ctx.font = `${11.5 * dpr}px "Instrument Sans Variable", "Instrument Sans", system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    ctx.lineWidth = 1 * dpr;
    for (const v of [0, 1]) {
      ctx.strokeStyle = FAINT;
      ctx.beginPath();
      ctx.moveTo(pl, Y(v));
      ctx.lineTo(pl + pw, Y(v));
      ctx.stroke();
      ctx.fillStyle = MUTED;
      ctx.fillText(String(v), pl - 7 * dpr, Y(v));
    }

    // where theory says r settles for the current K
    ctx.strokeStyle = LIGHT;
    ctx.setLineDash([5 * dpr, 5 * dpr]);
    ctx.beginPath();
    ctx.moveTo(pl, Y(target));
    ctx.lineTo(pl + pw, Y(target));
    ctx.stroke();
    ctx.setLineDash([]);
    // r over the last SPAN seconds
    const tEnd = Math.max(SPAN, sim.time);
    const tStart = tEnd - SPAN;
    const X = (t) => pl + ((t - tStart) / SPAN) * pw;
    const pts = sim.history.filter((p) => p.t >= tStart);
    if (pts.length > 1) {
      const fill = ctx.createLinearGradient(0, pt, 0, pt + ph);
      fill.addColorStop(0, 'rgba(247, 220, 82, 0.34)');
      fill.addColorStop(1, 'rgba(247, 220, 82, 0)');
      ctx.beginPath();
      ctx.moveTo(X(pts[0].t), Y(0));
      for (const p of pts) ctx.lineTo(X(p.t), Y(p.r));
      ctx.lineTo(X(pts[pts.length - 1].t), Y(0));
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(X(p.t), Y(p.r)) : ctx.lineTo(X(p.t), Y(p.r))));
      ctx.strokeStyle = GLOW;
      ctx.lineWidth = 2.5 * dpr;
      ctx.lineJoin = 'round';
      ctx.stroke();
      const last = pts[pts.length - 1];
      ctx.fillStyle = GLOW;
      ctx.beginPath();
      ctx.arc(X(last.t), Y(r), 4.5 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
    // key, under the axis where nothing else is drawn
    ctx.fillStyle = MUTED;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'right';
    ctx.fillText(`last ${SPAN} seconds`, pl + pw, h - 3 * dpr);
    ctx.strokeStyle = LIGHT;
    ctx.lineWidth = 1 * dpr;
    ctx.setLineDash([5 * dpr, 5 * dpr]);
    ctx.beginPath();
    ctx.moveTo(pl, h - 7 * dpr);
    ctx.lineTo(pl + 26 * dpr, h - 7 * dpr);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.textAlign = 'left';
    ctx.fillText(w < 360 * dpr ? 'what theory predicts' : 'where the mathematics says they settle', pl + 33 * dpr, h - 3 * dpr);
  }

  return {
    /** Call once per rendered frame of the cover sky. */
    update() {
      const { r } = sim.order();
      draw(r);
      const now = performance.now();
      if (now - lastText < 200) return;
      lastText = now;
      rValue.textContent = fmt(r, 2);
      // Hold each sentence for a few seconds so it can be read, even when r
      // is hovering around one of the thresholds.
      const text = describe(r);
      if (text !== lastCaption && (lastCaption === '' || now - captionSince > 3000)) {
        lastCaption = text;
        captionSince = now;
        caption.textContent = text;
      }
    },
  };
}
