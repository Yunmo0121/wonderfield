// Two reader preferences, both stored on <html>:
//
//   data-mode  = "story" | "maths"   how much mathematics is open in the article
//   data-paper = "day"   | "night"   white paper, or a night edition
//
// Figures read their colours from CSS custom properties through palette(),
// so they follow the paper theme without knowing about it.

const root = document.documentElement;

function load(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function save(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage may be unavailable */ }
}

export function getMode() {
  return root.dataset.mode === 'maths' ? 'maths' : 'story';
}

/** Open or close every "The mathematics" note in the article. */
export function setMode(mode) {
  root.dataset.mode = mode === 'maths' ? 'maths' : 'story';
  save('wf-mode', root.dataset.mode);
  for (const note of document.querySelectorAll('details.maths')) note.open = root.dataset.mode === 'maths';
  document.dispatchEvent(new CustomEvent('tw:mode'));
}

export function getPaper() {
  return root.dataset.paper === 'night' ? 'night' : 'day';
}

export function setPaper(paper) {
  root.dataset.paper = paper === 'night' ? 'night' : 'day';
  save('wf-paper', root.dataset.paper);
  cache = null;
  document.dispatchEvent(new CustomEvent('tw:theme'));
}

export function initPreferences() {
  setMode(load('wf-mode') || 'story');
  setPaper(load('wf-paper') || (root.dataset.theme === 'dark' ? 'night' : 'day'));
  // Some hosts set data-theme on <html> when their own light/dark switch is
  // used; follow it, as the latest thing the reader asked for.
  new MutationObserver(() => {
    if (root.dataset.theme === 'dark' || root.dataset.theme === 'light') setPaper(root.dataset.theme === 'dark' ? 'night' : 'day');
  }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
}

let cache = null;

/** Current drawing colours, read from the stylesheet. */
export function palette() {
  if (cache) return cache;
  const css = getComputedStyle(root);
  const v = (name) => css.getPropertyValue(name).trim();
  cache = {
    ink: v('--ink'),
    soft: v('--ink-3'),
    rule: v('--rule'),
    plate: v('--plate'),
    glow: v('--glow'),
    glowEdge: v('--glow-edge'),
    glowFill: v('--glow-fill'),
    teal: v('--teal'),
    night: v('--night'),
    dusk: v('--dusk'),
    light: v('--light'),
  };
  return cache;
}
