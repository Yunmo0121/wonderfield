// Connects a Simulation to the canvas: runs the animation loop and draws.
// It only *reads* simulation state; all maths stays in simulation.js.

import { fitCanvasToDisplay } from '../../utils/helpers.js';
import { mulberry32 } from '../../utils/random.js';

/**
 * Glow colours. Firefly light sits between yellow-green and amber (roughly
 * 550–580 nm depending on the species), so the palette stays in that band.
 */
export const FIREFLY_COLOURS = ['#e6f06a', '#f7e36b', '#ffd873', '#cfee8c'];

/** The night every Wonderfield scene shares: deep blue above, teal near the trees. */
const SKY_STOPS = [[0, '#050d1a'], [0.5, '#0a2733'], [1, '#0d3a3d']];
export const GROUND = '#03090c';

export class FireflyWorld {
  /**
   * @param {object} o
   * @param {HTMLCanvasElement} o.canvas       foreground (fireflies)
   * @param {HTMLCanvasElement} [o.background] static night, drawn once per resize
   * @param {import('./simulation.js').Simulation} o.simulation
   * @param {object} o.display                 { trails, glow, connections }
   * @param {()=>void} [o.onFrame]             called after every rendered frame
   * @param {()=>void} [o.onAdd]               called after a click adds a firefly
   * @param {boolean} [o.interactive=true]     click to add fireflies
   * @param {boolean} [o.treeline=true]        draw the tree silhouettes
   */
  constructor({ canvas, background, simulation, display, onFrame, onAdd, interactive = true, treeline = true }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.background = background;
    this.sim = simulation;
    this.display = display;
    this.onFrame = onFrame;
    this.onAdd = onAdd;
    this.treeline = treeline;
    this.running = false;
    this._last = null;
    this._sprites = FIREFLY_COLOURS.map(makeGlowSprite);
    this._loop = this._loop.bind(this);

    this._resize();
    new ResizeObserver(() => this._resize()).observe(canvas);
    if (interactive) canvas.addEventListener('pointerdown', (e) => this._handleClick(e));
    requestAnimationFrame(this._loop);
  }

  start() { this.running = true; }
  pause() { this.running = false; }
  toggle() { this.running = !this.running; return this.running; }

  /** Clear trails, e.g. after a reset. */
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /** The night and the fireflies flattened into one canvas (for saving a picture). */
  toImage() {
    const out = document.createElement('canvas');
    out.width = this.canvas.width;
    out.height = this.canvas.height;
    const g = out.getContext('2d');
    if (this.background) g.drawImage(this.background, 0, 0, out.width, out.height);
    else { g.fillStyle = SKY_STOPS[0][1]; g.fillRect(0, 0, out.width, out.height); }
    g.drawImage(this.canvas, 0, 0);
    return out;
  }

  // ---------------------------------------------------------------- private

  _loop(ts) {
    const dt = this._last === null ? 0 : Math.min(0.1, (ts - this._last) / 1000);
    this._last = ts;
    if (this.running && dt > 0) this.sim.advance(dt);
    this._render();
    this.onFrame?.();
    requestAnimationFrame(this._loop);
  }

  _resize() {
    this.dpr = fitCanvasToDisplay(this.canvas);
    // "cover" mapping: the world fills the canvas, centred.
    const { width: cw, height: ch } = this.canvas;
    const { width: ww, height: wh } = this.sim.world;
    this.scale = Math.max(cw / ww, ch / wh);
    this.ox = (cw - ww * this.scale) / 2;
    this.oy = (ch - wh * this.scale) / 2;
    if (this.background) {
      fitCanvasToDisplay(this.background);
      drawNight(this.background, { treeline: this.treeline });
    }
  }

  _render() {
    const { ctx, canvas, sim, display, scale, dpr, ox, oy } = this;

    // Trails: fade the previous frame instead of erasing it.
    if (display.trails) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Neighbour connections (only meaningful for local coupling).
    if (display.connections && !sim.isGlobal) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = 1 * dpr;
      const R2 = sim.params.radius ** 2;
      sim.forEachNeighbourPair((a, b, d2) => {
        const alpha = 0.04 + 0.22 * (1 - d2 / R2) * Math.max(a.brightness, b.brightness);
        ctx.strokeStyle = `rgba(232, 240, 150, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(ox + a.x * scale, oy + a.y * scale);
        ctx.lineTo(ox + b.x * scale, oy + b.y * scale);
        ctx.stroke();
      });
    }

    // Fireflies: a faint body + an additive glow that follows the flash.
    ctx.globalCompositeOperation = 'lighter';
    const unit = Math.min(2, (sim.world.width * scale) / 900 / dpr) * dpr; // consistent across screens
    for (const f of sim.fireflies) {
      const b = f.brightness;
      const x = ox + f.x * scale;
      const y = oy + f.y * scale;
      if (display.glow) {
        const size = (10 + 46 * b) * unit;
        ctx.globalAlpha = 0.12 + 0.88 * b;
        ctx.drawImage(this._sprites[f.hue], x - size / 2, y - size / 2, size, size);
      }
      ctx.globalAlpha = 0.35 + 0.65 * b;
      ctx.fillStyle = FIREFLY_COLOURS[f.hue];
      ctx.beginPath();
      ctx.arc(x, y, (1.3 + 1.2 * b) * unit, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  _handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * this.canvas.width;
    const py = ((e.clientY - rect.top) / rect.height) * this.canvas.height;
    const x = (px - this.ox) / this.scale;
    const y = (py - this.oy) / this.scale;
    if (x < 0 || y < 0 || x >= this.sim.world.width || y >= this.sim.world.height) return;
    if (this.sim.fireflies.length >= 600) return;
    this.sim.addFirefly(x, y);
    this.onAdd?.();
  }
}

/** A soft radial glow, pre-rendered once per colour. */
function makeGlowSprite(colour) {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.12, colour);
  grad.addColorStop(0.4, hexToRgba(colour, 0.28));
  grad.addColorStop(1, hexToRgba(colour, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

/**
 * The shared night: a blue-to-teal sky, a few faint stars near the top, and
 * (optionally) a line of trees along the bottom, taller towards both edges.
 * Everything is seeded, so the same trees grow on every visit.
 */
export function drawNight(canvas, { treeline = true, seed = 7 } = {}) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  for (const [stop, colour] of SKY_STOPS) sky.addColorStop(stop, colour);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const haze = ctx.createRadialGradient(w * 0.5, h * 1.05, 0, w * 0.5, h * 1.05, Math.max(w, h) * 0.7);
  haze.addColorStop(0, 'rgba(46, 128, 118, 0.30)');
  haze.addColorStop(1, 'rgba(46, 128, 118, 0)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, w, h);

  const rand = mulberry32(seed);
  const unit = Math.max(1, Math.min(w, h * 1.6) / 900);
  ctx.fillStyle = '#e8f0ee';
  for (let i = 0; i < 70; i++) {
    const y = rand() ** 1.8 * h * 0.75; // denser towards the top
    ctx.globalAlpha = 0.06 + rand() * 0.22;
    ctx.beginPath();
    ctx.arc(rand() * w, y, (0.4 + rand() * 0.6) * unit, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (treeline) drawTreeline(ctx, w, h, rand);
}

/**
 * Tree silhouettes: a low hedge along the bottom, and trees that grow taller
 * and closer together towards both edges, framing the sky. Each crown is a
 * handful of overlapping lobes with small leaves scattered round its edge.
 */
function drawTreeline(ctx, w, h, rand) {
  ctx.fillStyle = GROUND;
  const unit = h / 100;
  const ground = unit * 3;
  const disc = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
  ctx.fillRect(0, h - ground, w, ground + 1);

  for (let x = -unit * 2; x < w + unit * 2; x += unit * 1.1) {
    const edge = Math.abs(x / w - 0.5) * 2;
    const r = unit * (0.9 + 1.9 * rand()) * (1 + 1.2 * edge ** 3);
    disc(x, h - ground - r * 0.2, r);
  }

  const slots = Math.max(8, Math.round(w / (unit * 7)));
  for (let k = 0; k < slots; k++) {
    const u = (k + rand()) / slots;
    const edge = Math.abs(u - 0.5) * 2; // 0 in the middle, 1 at the edges
    if (rand() > 0.12 + 0.95 * edge ** 1.6) continue; // few trees in the middle
    const x = u * w;
    const height = unit * (7 + 34 * edge ** 2.2) * (0.65 + 0.5 * rand());
    const size = height * 0.42;
    const cy = h - ground - height * 0.62;
    ctx.fillRect(x - unit * 0.3, cy, unit * 0.6, height * 0.62); // trunk
    for (let i = 0; i < 9; i++) {
      const a = rand() * Math.PI * 2;
      const d = size * 0.6 * Math.sqrt(rand());
      disc(x + d * Math.cos(a) * 1.15, cy + d * Math.sin(a) * 0.85, size * (0.34 + 0.3 * rand()));
    }
    const leaves = Math.round(26 + size / unit * 5);
    for (let i = 0; i < leaves; i++) {
      const a = rand() * Math.PI * 2;
      const d = size * (0.78 + 0.42 * rand());
      disc(x + d * Math.cos(a) * 1.15, cy + d * Math.sin(a) * 0.85, size * (0.025 + 0.055 * rand()));
    }
  }
}

function hexToRgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
