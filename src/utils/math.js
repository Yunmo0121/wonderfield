// Small maths helpers shared by all worlds.

export const TAU = Math.PI * 2;

/** Map any angle into [0, 2π). */
export function wrapAngle(x) {
  return ((x % TAU) + TAU) % TAU;
}

export function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

/**
 * Kuramoto order parameter.
 *
 *   r · e^{iψ} = (1/N) Σ_j e^{iθ_j}
 *
 * r ∈ [0, 1] measures phase coherence (1 = perfectly in step),
 * ψ is the average phase of the group.
 */
export function orderParameter(phases) {
  const n = phases.length;
  if (n === 0) return { r: 0, psi: 0 };
  let c = 0;
  let s = 0;
  for (let i = 0; i < n; i++) {
    c += Math.cos(phases[i]);
    s += Math.sin(phases[i]);
  }
  c /= n;
  s /= n;
  return { r: Math.hypot(c, s), psi: Math.atan2(s, c) };
}

/** Shortest signed difference b − a on a circle of length `size` (torus wrap). */
export function torusDelta(a, b, size) {
  let d = b - a;
  if (d > size / 2) d -= size;
  else if (d < -size / 2) d += size;
  return d;
}

/**
 * Kuramoto's critical coupling for all-to-all coupling and Gaussian natural
 * frequencies with standard deviation σ (in the limit N → ∞):
 *
 *   K_c = 2 / (π g(0)),  g(0) = 1 / (σ√(2π))   ⇒   K_c = σ √(8/π) ≈ 1.596 σ
 */
export function criticalCouplingGaussian(sigma) {
  return sigma * Math.sqrt(8 / Math.PI);
}

/**
 * Critical coupling when each clock is also jostled by white noise of
 * strength D (Sakaguchi 1988; Strogatz & Mirollo 1991), all-to-all coupling,
 * N → ∞, Gaussian natural frequencies with standard deviation σ:
 *
 *   K_c = 2 / ∫ g(ω) · D / (D² + ω²) dω
 *
 * As D → 0 the kernel D/(D² + ω²) tends to π δ(ω), which recovers 2 / (π g(0)).
 * For identical clocks (σ = 0) it reduces to K_c = 2D.
 *
 * Computed with the substitution ω = D tan u, which turns the integral into
 * ∫ g(D tan u) du over (−π/2, π/2): smooth and bounded, so Simpson's rule works.
 */
export function criticalCoupling(sigma, D = 0) {
  if (D <= 0) return criticalCouplingGaussian(sigma);
  if (sigma <= 0) return 2 * D;
  const n = 2000;
  const a = -Math.PI / 2;
  const h = Math.PI / n;
  let sum = 0;
  for (let k = 1; k < n; k++) { // the end points contribute g(±∞) = 0
    sum += (k % 2 ? 4 : 2) * gaussianDensity(D * Math.tan(a + k * h), sigma);
  }
  return 2 / ((sum * h) / 3);
}

/** Gaussian density with mean 0 and standard deviation σ. */
export function gaussianDensity(x, sigma) {
  return Math.exp(-(x * x) / (2 * sigma * sigma)) / (sigma * Math.sqrt(TAU));
}

/**
 * Kuramoto's self-consistency equation (N → ∞, global coupling, no noise):
 *
 *   1 = K ∫_{−π/2}^{π/2} cos²θ · g(K r sin θ) dθ
 *
 * where g is the density of natural frequencies (here Gaussian, std σ).
 * Returns the synchronised branch r(K), or 0 when K ≤ K_c.
 */
export function kuramotoTheoryR(K, sigma) {
  if (sigma === 0) return K > 0 ? 1 : 0;
  const F = (r) => {
    const n = 400; // Simpson's rule, n even
    const a = -Math.PI / 2;
    const h = Math.PI / n;
    let s = 0;
    for (let k = 0; k <= n; k++) {
      const th = a + k * h;
      const w = k === 0 || k === n ? 1 : k % 2 ? 4 : 2;
      s += w * Math.cos(th) ** 2 * gaussianDensity(K * r * Math.sin(th), sigma);
    }
    return (K * s * h) / 3;
  };
  if (F(0) <= 1) return 0; // K ≤ K_c: only the incoherent state r = 0
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (F(mid) > 1) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
