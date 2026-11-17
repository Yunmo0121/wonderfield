# World 01 · The Firefly Model

This note documents exactly what the simulation computes, so every number on
the page can be traced back to an equation.

## 1. One firefly = one phase oscillator

Each firefly *i* has a phase θᵢ ∈ [0, 2π). It advances at its natural frequency
and the firefly **flashes when θᵢ passes 2π** (then wraps back to 0):

$$\frac{d\theta_i}{dt} = \omega_i, \qquad \omega_i = \omega_0 + \sigma z_i,\quad z_i \sim \mathcal N(0,1)$$

- ω₀ = π rad/s, so one flash every 2 s on average (`BASE_OMEGA`)
- σ (“Individuality”) is the spread of natural frequencies
- zᵢ is drawn once at birth, so moving the σ slider rescales everyone consistently

Brightness is a pure function of phase: `b(θ) = exp(−θ / 0.55)` plus a small
pre-glow just before 2π (`firefly.js`). Rendering never stores state of its own.

One convention is used in every figure: θ = 0 points right, angles grow
anticlockwise, and the firefly flashes as it passes θ = 0.

## 2. Coupling: the local Kuramoto model with noise

$$d\theta_i = \Big[\omega_i + \frac{K}{|N_i|}\sum_{j\in N_i}\sin(\theta_j-\theta_i)\Big]dt + \sqrt{2D}\,dW_i$$

- Nᵢ = fireflies within distance R of i, **including i itself**, measured on a
  torus (the 1.6 × 1 world wraps at its edges)
- K = coupling strength, D = phase-noise intensity, Wᵢ = independent Wiener processes
- With R ≥ 0.95 (half the world’s diagonal ≈ 0.943), Nᵢ is everyone and this is
  the classic Kuramoto model: (K/N) Σⱼ sin(θⱼ − θᵢ)

**Movement.** Fireflies drift at 0.035 world-units/s with a randomly wandering
heading (`TURN_NOISE = 1.2 rad/√s`). Movement mixes neighbourhoods, which
spreads information in the local model.

## 3. Measuring synchrony

$$r\,e^{i\psi} = \frac1N\sum_{j=1}^N e^{i\theta_j}$$

r = 1 means all phases equal; r ≈ 0 means phases are spread around the circle.
For N independent uniform phases, E[r] ≈ √π / (2√N) (≈ 0.072 for N = 150), so
“no sync” never reads as exactly 0.

**Mean-field identity** (used for global coupling, O(N) instead of O(N²)):

$$\frac1N\sum_j \sin(\theta_j-\theta_i) = r\sin(\psi-\theta_i)$$

**Local coupling trick.** sin(θⱼ − θᵢ) = sin θⱼ cos θᵢ − cos θⱼ sin θᵢ, so each
firefly only needs Σ sin θⱼ and Σ cos θⱼ over its neighbours. The O(N²) pair
loop then contains no trigonometry.

## 4. Critical coupling

For global coupling, N → ∞ and a unimodal frequency density g, Kuramoto showed
synchrony appears only for K > K_c = 2 / (π g(0)). For a Gaussian with standard
deviation σ:

$$K_c = \sigma\sqrt{8/\pi} \approx 1.596\,\sigma$$

**With noise.** If each clock is also jostled by white noise of strength D, the
incoherent state loses stability at (Sakaguchi 1988; Strogatz & Mirollo 1991)

$$K_c(D) = \frac{2}{\int_{-\infty}^{\infty} g(\omega)\,\dfrac{D}{D^2+\omega^2}\,d\omega}$$

As D → 0 the kernel tends to π δ(ω), which recovers 2 / (π g(0)); for identical
clocks (σ = 0) it is 2D. `criticalCoupling(σ, D)` in `src/utils/math.js`
evaluates it with the substitution ω = D tan u, which turns the integral into
∫ g(D tan u) du over (−π/2, π/2). Some values for σ = 0.25:

| D | 0 | 0.02 | 0.1 | 0.2 | 0.4 |
|---|---|---|---|---|---|
| K_c | 0.399 | 0.425 | 0.534 | 0.684 | 1.012 |

Checked against simulation (N = 1500, 120 s): mean r is 0.11 at 0.9 K_c, 0.24 at
K_c and 0.49 at 1.1 K_c for (σ, D) = (0.25, 0.2), and likewise for (0.25, 0.1)
and (0, 0.2).

The status panel shows K / K_c(D), and a dotted tick on the coupling dial marks
K_c(D). For local coupling it is only a guide: a short line of sight generally
needs more.

**Who is locked.** In the mean-field form, firefly i behaves like one of a pair
whose partner is the group average, at coupling K r. So it can lock to the
group's frequency Ω when |ωᵢ − Ω| ≤ K r, and drifts otherwise. The simulation
keeps a running average of dθᵢ/dt for every firefly (memory 6 s), and the panel
“Who has joined the beat?” plots it against ωᵢ: locked fireflies fall on a flat
line, free ones on the diagonal, and the band |ω − Ω| ≤ K r is shaded when
coupling is all-to-all.

## 5. Numerics

- Euler–Maruyama, fixed step Δt = 1/60 s of simulated time (`DT`)
- The animation loop accumulates real time × speed and takes whole Δt steps,
  so frame rate and the speed slider never change results
- All randomness comes from a seeded `mulberry32` PRNG + Box–Muller normals
- Synchronous update: all coupling terms are computed from the same old phases

## 6. Checked three ways

**Unit tests** (`npm test`, 38 tests)

| Test | What it checks |
|---|---|
| r of equal phases | r = 1 exactly |
| r of evenly spaced phases | r = 0 |
| K = 0, D = 0 | θᵢ(t) = θᵢ(0) + ωᵢt to 1e-9 |
| Same seed twice | bit-identical state |
| 30 fps vs 144 fps | identical state after the same number of steps |
| Speed 1× vs 4× | identical state at equal simulated time |
| Mean-field vs brute force | agree to 1e-12 |
| Local (R ≈ world) vs global | agree to 1e-12 |
| K = 2, global | r > 0.95 after 30 s |
| K = 0.3 K_c, N = 400 | mean r < 0.2 |
| Theory curve | zero below K_c, continuous at K_c, → 1 for large K |
| Theory vs simulation at 2 K_c | within 0.05 |
| Noisy tipping point | D → 0 and σ = 0 limits; a simulated crowd below K_c(D), a beat above |
| Actual tempo | equals ωᵢ when K = 0; collapses to one value when locked |
| Pulse-coupled model | charging curve; ε = 0 never merges; ε > 0 only merges and ends in unison; event-driven |
| Chance level | √π / (2√N) matches random phases |
| Observation rules | one test per rule in `observations.js` |
| Synchrony map | dark below the tipping line, bright above, close to theory away from it |

**Theory.** `kuramotoTheoryR(K, σ)` in `src/utils/math.js` solves Kuramoto's
self-consistency equation, 1 = K ∫ cos²θ · g(K r sin θ) dθ over [−π/2, π/2], by
Simpson's rule and bisection. It draws the line in Figure 5 and the dashed
prediction on the cover.

**Bulk simulation.** `npm run map` runs 420 simulations (21 values of K × 20 of
σ, N = 200, 60 s each, fixed seeds) and writes `src/data/syncMap.js` for
Figure 6. `npm run experiments` re-measures the seven experiments.

## 7. Limits of the model

Kuramoto coupling is *continuous and smooth*: every firefly feels every
neighbour at every instant. Real fireflies react to discrete **flashes**, which
is better described by pulse-coupled oscillators (Mirollo & Strogatz, 1990) and
by the phase-response experiments reviewed by Buck (1988).

Natural frequencies here are fixed for ever, so a locked firefly keeps a
constant phase lead or lag, arcsin(Δω / K r). Some species, such as *Pteroptyx
malaccae*, remove that gap by adjusting their own period; Ermentrout (1991)
models this with an adaptive frequency.

Every firefly here is a regular clock even when alone. Isolated *Photinus
carolinus* males flash in bursts with no fixed interval between them, and a
regular period appears only in a group (Sarfati et al., 2023).

An adaptive-frequency mode is planned, so the models can be compared side by side.

## 8. The pulse-coupled model (Figure 7)

`src/worlds/pulse/pulseSwarm.js` implements the model of Mirollo & Strogatz
(1990), which builds on Peskin's model of the cardiac pacemaker. N identical
oscillators each have a phase φ ∈ [0, 1] advancing at rate 1/T and a state

$$x = f(\varphi) = \frac{1}{b}\ln\big(1 + (e^b - 1)\varphi\big), \qquad b = 3,$$

which is increasing and concave down. When x reaches 1 the oscillator fires and
resets to 0, and every other state becomes min(1, x + ε). An oscillator lifted
to 1 fires in the same instant and is from then on indistinguishable from the
one that lifted it (*absorption*); a group of m firing together lifts the rest
by mε. Their theorem: for all N, ε > 0 and concave-down f, the set of initial
conditions that do not end in full synchrony has measure zero.

The implementation is event-driven: it advances exactly to the next firing
time, so there is no time-step error. Figure 7 uses N = 20, ε = 0.004, T = 2 s;
its opening state (seed 21) reaches unison after 26 s. Unlike the Kuramoto
laboratory, the final state is exact unison, reached in finite time.

## References

- Y. Kuramoto, *Chemical Oscillations, Waves, and Turbulence*, Springer (1984).
- S. H. Strogatz, “From Kuramoto to Crawford”, *Physica D* 143 (2000).
- J. A. Acebrón et al., “The Kuramoto model: A simple paradigm for synchronization phenomena”, *Rev. Mod. Phys.* 77 (2005).
- R. E. Mirollo & S. H. Strogatz, “Synchronization of pulse-coupled biological oscillators”, *SIAM J. Appl. Math.* 50 (1990).
- J. Buck, “Synchronous rhythmic flashing of fireflies. II”, *Quarterly Review of Biology* 63 (1988).
- G. B. Ermentrout, “An adaptive model for synchrony in the firefly *Pteroptyx malaccae*”, *J. Math. Biol.* 29 (1991).
- R. Sarfati et al., “Emergent periodicity in the collective synchronous flashing of fireflies”, *eLife* 12 (2023).
- R. Adler, “A study of locking phenomena in oscillators”, *Proc. IRE* 34 (1946).
- H. Sakaguchi, “Cooperative phenomena in coupled oscillator systems under external fields”, *Prog. Theor. Phys.* 79 (1988).
- S. H. Strogatz & R. E. Mirollo, “Stability of incoherence in a population of coupled oscillators”, *J. Stat. Phys.* 63 (1991).
- C. S. Peskin, *Mathematical Aspects of Heart Physiology*, Courant Institute (1975).
