// Figure 6 · A map of synchrony.
// Coupling K across, individuality σ up. Every cell is a real simulation
// (src/data/syncMap.js, built by `npm run map`). The dashed line is Kuramoto's
// threshold K_c = σ√(8/π). Click a cell to open that forest in the laboratory.

import { el, fmt, fitCanvasToDisplay } from '../utils/helpers.js';
import { criticalCouplingGaussian, kuramotoTheoryR } from '../utils/math.js';
import { SYNC_MAP } from '../data/syncMap.js';
import { palette, font, rgb, SERIF } from './figureKit.js';

const { Ks, sigmas, r: GRID } = SYNC_MAP;
const dK = Ks[1] - Ks[0];
const dS = sigmas[1] - sigmas[0];
const K_MIN = Ks[0] - dK / 2;
const K_MAX = Ks[Ks.length - 1] + dK / 2;
const S_MIN = sigmas[0] - dS / 2;
const S_MAX = sigmas[sigmas.length - 1] + dS / 2;

export function createSyncMap(root, { onOpen }) {
  let sel = { i: Ks.indexOf(0.9), j: sigmas.indexOf(0.5) };
  let hover = null;
  let lab = null;   // { K, sigma } of the laboratory, drawn as a marker
  let geo = null;
  let ramp = null;

  const canvas = el('canvas', {
    class: 'fig-canvas fig-canvas--map', tabindex: '0', role: 'img',
    'aria-label': 'Map of synchrony: coupling K across, individuality sigma up. Cells are dark below a straight boundary line and bright above it. Use the arrow keys to move the selected cell.',
  });
  const legend = el('div', { class: 'ramp' },
    el('span', {}, 'r = 0, a crowd'),
    el('span', { class: 'ramp__bar' }),
    el('span', {}, 'r = 1, one beat'),
  );
  const readout = el('p', { class: 'fig-readout' });
  const open = el('button', { class: 'fig-button fig-button--solid', type: 'button', onclick: () => onOpen({ coupling: Ks[sel.i], freqSpread: sigmas[sel.j] }) }, 'Open this forest in the laboratory');
  root.append(canvas, el('div', { class: 'fig-controls' }, legend, el('div', { class: 'fig-controls__row' }, open), readout));

  new ResizeObserver(draw).observe(canvas);
  document.addEventListener('tw:theme', () => { ramp = null; draw(); });

  const cellAt = (e) => {
    if (!geo) return null;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - geo.pl;
    const y = e.clientY - rect.top - geo.pt;
    if (x < 0 || y < 0 || x >= geo.pw || y >= geo.ph) return null;
    return { i: Math.min(Ks.length - 1, Math.floor((x / geo.pw) * Ks.length)), j: sigmas.length - 1 - Math.min(sigmas.length - 1, Math.floor((y / geo.ph) * sigmas.length)) };
  };
  canvas.addEventListener('pointermove', (e) => {
    const c = cellAt(e);
    if ((c && hover && c.i === hover.i && c.j === hover.j) || (!c && !hover)) return;
    hover = c;
    describe();
    draw();
  });
  canvas.addEventListener('pointerleave', () => { hover = null; describe(); draw(); });
  canvas.addEventListener('click', (e) => {
    const c = cellAt(e);
    if (!c) return;
    sel = c;
    describe();
    draw();
  });
  canvas.addEventListener('keydown', (e) => {
    const move = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (!move) return;
    e.preventDefault();
    sel = {
      i: Math.max(0, Math.min(Ks.length - 1, sel.i + move[0])),
      j: Math.max(0, Math.min(sigmas.length - 1, sel.j + move[1])),
    };
    describe();
    draw();
  });

  function describe() {
    const c = hover || sel;
    const K = Ks[c.i];
    const sigma = sigmas[c.j];
    const kc = criticalCouplingGaussian(sigma);
    const side = K < kc ? 'below' : 'above';
    readout.innerHTML = `${hover ? 'Pointing at' : 'Selected'}: <i>K</i> = ${fmt(K, 2)}, <i>σ</i> = ${fmt(sigma, 2)}, which is ${side} the tipping line (<i>K</i> = ${fmt(K / kc, 2)} <i>K</i><sub>c</sub>). `
      + `After ${SYNC_MAP.seconds} s the simulated forest reached <b><i>r</i> = ${fmt(GRID[c.j][c.i], 2)}</b>; theory for an infinite forest says ${fmt(kuramotoTheoryR(K, sigma), 2)}.`;
  }

  function draw() {
    const C = palette();
    if (!ramp) {
      ramp = makeRamp(C.dusk, C.glow);
      legend.querySelector('.ramp__bar').style.background = `linear-gradient(90deg, ${[0, 0.25, 0.5, 0.75, 1].map((t) => ramp(t)).join(', ')})`;
    }
    const dpr = fitCanvasToDisplay(canvas);
    const ctx = canvas.getContext('2d');
    const { width: w, height: h } = canvas;
    ctx.clearRect(0, 0, w, h);
    const pl = 58 * dpr;
    const pr = 10 * dpr;
    const pt = 10 * dpr;
    const pb = 50 * dpr;
    const pw = w - pl - pr;
    const ph = h - pt - pb;
    geo = { pl: pl / dpr, pt: pt / dpr, pw: pw / dpr, ph: ph / dpr };
    const X = (K) => pl + ((K - K_MIN) / (K_MAX - K_MIN)) * pw;
    const Y = (s) => pt + (1 - (s - S_MIN) / (S_MAX - S_MIN)) * ph;
    const cw = pw / Ks.length;
    const ch = ph / sigmas.length;
    const gap = 1 * dpr;

    // night plate behind the cells
    ctx.fillStyle = C.night;
    ctx.fillRect(pl, pt, pw, ph);
    for (let j = 0; j < sigmas.length; j++) {
      for (let i = 0; i < Ks.length; i++) {
        ctx.fillStyle = ramp(GRID[j][i]);
        ctx.fillRect(pl + i * cw + gap / 2, pt + (sigmas.length - 1 - j) * ch + gap / 2, cw - gap, ch - gap);
      }
    }

    // axes
    ctx.font = font(11.5, dpr);
    ctx.fillStyle = C.soft;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (const K of [0, 0.5, 1, 1.5, 2, 2.5, 3]) {
      if (w < 480 * dpr && K % 1 !== 0) continue;
      ctx.fillText(String(K), X(K), pt + ph + 18 * dpr);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const s of [0.2, 0.4, 0.6, 0.8, 1]) ctx.fillText(String(s), pl - 8 * dpr, Y(s));
    ctx.fillStyle = C.ink;
    ctx.font = font(14, dpr, SERIF, 400, 'italic');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('coupling K  (how closely they watch)', pl + pw / 2, h - 8 * dpr);
    ctx.save();
    ctx.translate(15 * dpr, pt + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('individuality σ', 0, 0);
    ctx.restore();

    // Kuramoto's threshold: K = σ √(8/π), a straight line through the origin
    const slope = criticalCouplingGaussian(1);
    ctx.save();
    ctx.beginPath();
    ctx.rect(pl, pt, pw, ph);
    ctx.clip();
    ctx.strokeStyle = C.light;
    ctx.lineWidth = 2 * dpr;
    ctx.setLineDash([6 * dpr, 5 * dpr]);
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0));
    ctx.lineTo(X(slope * S_MAX), Y(S_MAX));
    ctx.stroke();
    ctx.restore();
    ctx.setLineDash([]);
    const label = 'tipping line, K = 1.6 σ';
    ctx.font = font(12.5, dpr);
    const lw = ctx.measureText(label).width;
    const tx = Math.min(X(slope * 0.9) + 12 * dpr, pl + pw - lw - 14 * dpr);
    const ty = Y(0.93);
    ctx.fillStyle = C.night;
    ctx.fillRect(tx - 7 * dpr, ty - 11 * dpr, lw + 14 * dpr, 22 * dpr);
    ctx.fillStyle = C.light;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, tx, ty);

    // the laboratory's current settings
    if (lab && lab.K >= K_MIN && lab.K <= K_MAX && lab.sigma >= S_MIN && lab.sigma <= S_MAX) {
      const x = X(lab.K);
      const y = Y(lab.sigma);
      ctx.strokeStyle = C.night;
      ctx.lineWidth = 5 * dpr;
      ctx.beginPath();
      ctx.arc(x, y, 7 * dpr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = C.light;
      ctx.lineWidth = 2 * dpr;
      ctx.stroke();
      ctx.font = font(11.5, dpr);
      ctx.textAlign = x > pl + pw - 90 * dpr ? 'right' : 'left';
      const text = 'laboratory now';
      const tw2 = ctx.measureText(text).width;
      const bx = ctx.textAlign === 'left' ? x + 12 * dpr : x - 12 * dpr - tw2;
      ctx.fillStyle = C.night;
      ctx.fillRect(bx - 5 * dpr, y - 9 * dpr, tw2 + 10 * dpr, 18 * dpr);
      ctx.fillStyle = C.light;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(text, bx, y);
    }

    // hovered and selected cells
    const outline = (c, width, colour) => {
      ctx.strokeStyle = colour;
      ctx.lineWidth = width * dpr;
      ctx.strokeRect(pl + c.i * cw, pt + (sigmas.length - 1 - c.j) * ch, cw, ch);
    };
    if (hover) outline(hover, 1.5, C.light);
    outline(sel, 4, C.night);
    outline(sel, 2, '#ffffff');
  }

  describe();
  return {
    /** Show where the laboratory's dials currently sit. */
    setLab(K, sigma) {
      lab = { K, sigma };
      draw();
    },
  };
}

// ---- a perceptually even colour ramp (interpolated in OKLab) ----------------

function makeRamp(from, to) {
  const a = toOklab(rgb(from));
  const b = toOklab(rgb(to));
  const lut = Array.from({ length: 101 }, (_, k) => {
    const t = k / 100;
    const [R, G, B] = fromOklab([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
    return `rgb(${R}, ${G}, ${B})`;
  });
  return (t) => lut[Math.round(Math.max(0, Math.min(1, t)) * 100)];
}

const toLinear = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const toSrgb = (c) => Math.round(255 * Math.max(0, Math.min(1, c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)));

function toOklab([R, G, B]) {
  const r = toLinear(R);
  const g = toLinear(G);
  const b = toLinear(B);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromOklab([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}
