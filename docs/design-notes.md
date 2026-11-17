# Design notes

## The idea

A small science museum that publishes a magazine. Dreamy Cosmos for the things
you play with (a night sky you can tune), Little Science Museum for the things
you read (calm pages, exact captions).

Three standards for every issue:

1. **Mathematical correctness.** Every simulation has an explicit model, stated
   assumptions and sources. Dials change the equations, never just the picture.
2. **Teaching that works.** The reader does something first, then is told what
   they did, then is shown why. Interaction before explanation.
3. **Engineering quality.** Simulation separate from drawing, seeded randomness,
   fixed time step, unit tests, and numbers that were measured.

## The house rules of an issue

Each issue has:

- **one colour pair**, used for everything live (Issue 1: firefly yellow
  `#f7dc52` on a June night `#071320`);
- **one phenomenon** (Issue 1: synchrony);
- **one experiment to open with**, controlled by a single dial on the cover
  (Issue 1: the listening dial);
- **a seal**: two Chinese characters naming the phenomenon (同步, 群飞, 生命),
  set vertically in the issue colour;
- **an emblem** drawn from its own mathematics (Issue 1: the phase ring, a
  circle of dots that gathers as you read down the page).

## Structure of Issue 1

Cover experiment → "What you just did" and the issue card → the feature in
three parts (one firefly, many, measuring) → the laboratory → why it works →
when it fails (Figures 5 and 6) → what the model leaves out → the same story
elsewhere → seven experiments → colophon and shelf.

The first screen asks for one action. Chapters, sources and the experiment page
come later, so a first-time reader always knows what to do next.

## Reading modes and editions

- `data-mode="story" | "maths"` on `<html>`: every `details.maths` note opens or
  closes together; any single note can still be opened by hand.
- `data-paper="day" | "night"`: the reading pages switch between white paper and
  a night edition. Figures read their colours through `palette()` in
  `src/utils/theme.js`, so they follow without knowing about themes.
- The cover, the laboratory and the colophon are always night.

## Visual language

- **Paper:** `#fbfaf5`, blue-black ink `#14181c`, rules instead of boxes.
- **Night:** a blue-to-teal sky with tree silhouettes that grow towards the
  edges, shared by the cover and the laboratory (`drawNight`).
- **Type:** Newsreader for reading and display, Instrument Sans for labels and
  controls, bundled with the site.
- **One convention for angles:** θ = 0 points right, angles grow anticlockwise,
  and a firefly flashes as it passes θ = 0. Figure 1, Figure 2, the laboratory's
  phase circle and the Euler diagram all agree, so the unit circle of Part one
  is literally the complex plane of Part three.
- **Avoided on purpose:** glass cards, gradients as decoration, rows of tracked
  capitals, numbered 01/02/03 cards, emoji icons.

## Architecture rules

- `worlds/<name>/simulation.js` contains no DOM or canvas code (testable in Node).
- `worlds/<name>/<name>World.js` only reads simulation state to draw it.
- `ui/` components talk to the simulation only through callbacks in `main.js`.
- A new issue is a new folder in `worlds/`, its own figures, and a new colour pair.
