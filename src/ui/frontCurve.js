// The front cover: one curve, a few stars, and fireflies.
//
// The curve is Kuramoto's prediction for synchrony r against coupling K
// (Gaussian natural frequencies, σ = 0.25, infinitely many fireflies): flat
// at zero until the tipping point K_c, then rising. It is the same theory
// line as Figure 5 of Issue 1.
//
// Fireflies sit along it. Each stands for a forest at that coupling: on the
// flat stretch it flashes on its own clock, and the further past K_c it sits,
// the more closely its flash keeps time with one shared beat. So the right
// of the cover flashes together and the left does not.

import { TAU, criticalCouplingGaussian, kuramotoTheoryR } from '../utils/math.js';
import { RNG } from '../utils/random.js';
import { fitCanvasToDisplay, prefersReducedMotion } from '../utils/helpers.js';
import { flashBrightness } from '../worlds/firefly/firefly.js';

const SIGMA = 0.25;
const X_MAX = 3; // K runs from 0 to 3 K_c across the cover
const FIREFLIES = 46;

export function createFrontCurve(canvas) {
  const ctx = canvas.getContext('2d');
  const still = prefersReducedMotion();
  const rng = new RNG(1975);
  const kc = criticalCouplingGaussian(SIGMA);
  const curve = Array.from({ length: 301 }, (_, k) => {
    const x = (k / 300) * X_MAX;
    return { x, r: kuramotoTheoryR(x * kc, SIGMA) };
  });
  const rAt = (x) => curve[Math.round((x / X_MAX) * 300)].r;
  const flies = Array.from({ length: FIREFLIES }, (_, i) => {
    const x = (X_MAX * (i + 0.5 + rng.uniform(-0.35, 0.35))) / FIREFLIES;
    return { x, r: rAt(Math.min(X_MAX, Math.max(0, x))), phase: rng.uniform(0, TAU), omega: Math.PI + SIGMA * 1.6 * rng.gaussian(), lift: rng.uniform(-1, 1) };
  });
  const stars = Array.from({ length: 70 }, () => ({ u: rng.uniform(0, 1), v: rng.uniform(0, 1), s: rng.uniform(0.5, 1.3), a: rng.uniform(0.15, 0.55), tw: rng.next() < 0.12 }));

  let W = 0;
  let H = 0;
  let dpr = 1;
  let box = null;
  let t = still ? 30 : 0;
  let drawn = still ? 1 : 0; // how much of the curve has been drawn in
  let last = null;
  let visible = true;

  function layout() {
    dpr = fitCanvasToDisplay(canvas);
    W = canvas.width;
    H = canvas.height;
    const portrait = H > W;
    // the curve's frame, leaving room for masthead above and text below
    box = portrait
      ? { x0: 0.06 * W, x1: 0.94 * W, y0: 0.3 * H, y1: 0.56 * H }
      : { x0: 0.05 * W, x1: 0.95 * W, y0: 0.33 * H, y1: 0.62 * H };
    if (still) draw();
  }
  const X = (x) => box.x0 + (x / X_MAX) * (box.x1 - box.x0);
  const Y = (r) => box.y1 - r * (box.y1 - box.y0);

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const u = Math.min(W, H * 1.5) / 1400;

    for (const s of stars) {
      const tw = s.tw ? 0.55 + 0.45 * Math.sin(t * 1.3 + s.u * 40) : 1;
      ctx.globalAlpha = s.a * tw;
      ctx.fillStyle = '#f3efe4';
      ctx.beginPath();
      ctx.arc(s.u * W, s.v * H, s.s * dpr, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // baseline and the tipping point
    ctx.strokeStyle = 'rgba(243, 239, 228, 0.18)';
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.moveTo(box.x0, Y(0));
    ctx.lineTo(box.x1, Y(0));
    ctx.stroke();
    ctx.setLineDash([3 * dpr, 5 * dpr]);
    ctx.beginPath();
    ctx.moveTo(X(1), Y(0) + 10 * dpr);
    ctx.lineTo(X(1), Y(1));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(243, 239, 228, 0.7)';
    ctx.font = `italic 400 ${15 * dpr}px "Newsreader Variable", Newsreader, Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillText('K', X(1) - 2 * dpr, Y(0) + 28 * dpr);
    ctx.font = `italic 400 ${10 * dpr}px "Newsreader Variable", Newsreader, Georgia, serif`;
    ctx.fillText('c', X(1) + 6 * dpr, Y(0) + 31 * dpr);

    // the one curve, drawn in from the left
    const upto = Math.floor(drawn * (curve.length - 1));
    ctx.strokeStyle = '#f3efe4';
    ctx.lineWidth = 1.6 * dpr;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let k = 0; k <= upto; k++) {
      const p = curve[k];
      if (k === 0) ctx.moveTo(X(p.x), Y(p.r)); else ctx.lineTo(X(p.x), Y(p.r));
    }
    ctx.stroke();

    // fireflies on the curve
    const psi = Math.PI * t;
    for (const f of flies) {
      if (f.x / X_MAX > drawn) continue;
      const own = f.phase + f.omega * t;
      let d = (((own - psi) % TAU) + TAU) % TAU;
      if (d > Math.PI) d -= TAU;
      const theta = (((psi + (1 - f.r) * d) % TAU) + TAU) % TAU;
      const b = flashBrightness(theta);
      const x = X(f.x);
      const y = Y(f.r) - (1 - f.r) * f.lift * 14 * dpr;
      const R = (18 + 30 * b) * u * dpr;
      const g = ctx.createRadialGradient(x, y, 0, x, y, R);
      g.addColorStop(0, `rgba(247, 220, 82, ${0.45 * b})`);
      g.addColorStop(1, 'rgba(247, 220, 82, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, R, 0, TAU);
      ctx.fill();
      ctx.fillStyle = b > 0.25 ? '#f7dc52' : 'rgba(247, 220, 82, 0.45)';
      ctx.beginPath();
      ctx.arc(x, y, (1.8 + 1.6 * b) * dpr, 0, TAU);
      ctx.fill();
    }
  }

  function tick(ts) {
    const dt = last === null ? 0 : Math.min(0.05, (ts - last) / 1000);
    last = ts;
    if (visible) {
      t += dt;
      drawn = Math.min(1, drawn + dt / 2.4);
      draw();
    }
    requestAnimationFrame(tick);
  }

  new ResizeObserver(layout).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; last = null; }).observe(canvas);
  document.fonts?.ready.then(() => { if (still) draw(); });
  layout();
  if (!still) requestAnimationFrame(tick);
}
