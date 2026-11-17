# Roadmap

## V1 · Firefly Synchronisation (Issue 1, Synchrony)

Core
- [x] Fireflies with their own phase and natural frequency, drifting on a wrapped world
- [x] Coupling: each firefly nudges its phase towards its neighbours (local Kuramoto model)
- [x] Start / pause, reset, number of fireflies, simulation speed, coupling strength
- [x] Title, simulation, explanation; works on desktop, tablet and phone

Enhancements (the V1.1 list)
- [x] Interaction radius slider
- [x] Noise slider
- [x] Random seed and randomise button
- [x] Show / hide glow effect (also trails and neighbour connections)
- [x] Sync level from 0 to 100%
- [x] Add fireflies by clicking
- [x] Theme toggle: paper edition and night edition
- [x] Info tooltip for each parameter

Showcase
- [x] Status text and charts: synchrony %, phase circle, r over time
- [x] Explanation badge: Local interactions → global order
- [x] "Interesting observation" box that explains the current state
- [x] Screenshots and a GIF for the README (`docs/media/`)

Depth
- [x] Level 1, the rhythm of one firefly: draggable phase clock, sin and cos
- [x] Level 2, when fireflies interact: two-firefly figure, the whole-sky laboratory
- [x] Level 3, measuring collective order: Euler's formula, order parameter, chance level
- [x] Two reading modes: just the story / with the mathematics
- [x] The tipping point checked two ways: 30 live simulations, and a map of 420
- [x] What the model leaves out, with sources
- [x] The tipping point with noise (Sakaguchi's formula), checked against simulation and shown as a tick on the coupling dial
- [x] “Who has joined the beat?”: natural tempo against actual tempo, with the theoretical locking band
- [x] A second model, running: pulse-coupled fireflies after Mirollo and Strogatz (Figure 7)

Still to do for Issue 1
- [ ] Rewrite "From the editor" in Kristie's own words
- [ ] Replace the GitHub link in the colophon with the real repository
- [ ] A frequency-adaptation mode after Ermentrout (1991), to close the phase gap
- [ ] Shareable links for laboratory settings

## V2 · Flocking Behaviour (Issue 2, Flocks 群飞)
Boids: separation, alignment, cohesion. Vectors and dynamical systems.
Colour, phenomenon and opening experiment to be chosen.

## V3 · Cellular Life (Issue 3, Life 生命)
Conway's Game of Life: discrete mathematics, cellular automata, emergence.

## V4 · The Science Behind It
A deeper notebook for every issue: mathematical explanations, experiment logs,
parameter comparisons and algorithm visualisations, so the collection becomes a
small digital science museum.
