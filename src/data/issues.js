// The magazine's shelf. To add an issue: give it an entry here and a folder
// with its own index.html (see synchrony/), and add that page to vite.config.js.

export const ISSUES = [
  {
    id: 'synchrony',
    number: 1,
    title: 'Synchrony',
    question: 'How does a forest keep time?',
    topic: 'Fireflies that flash in unison',
    phenomenon: 'Many rhythms becoming one',
    experiment: 'The listening dial',
    maths: 'Phase oscillators, the Kuramoto model, complex numbers, a phase transition',
    colour: '#f7dc52',
    ground: '#11162f',
    href: 'synchrony/index.html',
    status: 'open',
  },
  {
    id: 'flocks',
    number: 2,
    title: 'Flocks',
    question: 'How does a murmuration turn as one?',
    topic: 'Starlings, and order in motion',
    phenomenon: 'Order without a leader, in motion',
    experiment: 'Steer a flock of starlings',
    maths: 'Vectors, the Boids rules, alignment and the Vicsek model',
    colour: '#8fb4e3',
    ground: '#11162f',
    status: 'In preparation',
  },
  {
    id: 'life',
    number: 3,
    title: 'Life',
    question: 'Can four rules make something alive?',
    topic: 'A grid of cells that seems to live',
    phenomenon: 'Complexity from a grid of cells',
    experiment: 'Draw a creature and let it go',
    maths: 'Cellular automata, Conway’s Game of Life, computation',
    colour: '#a9cf86',
    ground: '#11162f',
    status: 'Planned',
  },
];

/** A small drawing for each issue, in its own colour pair (SVG, 320 × 200). */
export function issueArt(issue) {
  const c = issue.colour;
  const g = issue.ground;
  let body = '';
  if (issue.id === 'synchrony') {
    // a phase circle: most fireflies have gathered near one angle
    const angles = [0.3, 0.45, 0.52, 0.6, 0.66, 0.74, 0.8, 0.9, 1.02, 2.6, 3.9, 5.1];
    body = `<circle cx="160" cy="100" r="62" fill="none" stroke="#f3efe4" stroke-opacity=".35"/>`
      + angles.map((a, k) => `<circle cx="${(160 + 62 * Math.cos(a)).toFixed(1)}" cy="${(100 - 62 * Math.sin(a)).toFixed(1)}" r="${k < 9 ? 4 : 3}" fill="${c}" opacity="${k < 9 ? 1 : 0.45}"/>`).join('')
      + `<line x1="160" y1="100" x2="${(160 + 46 * Math.cos(0.66)).toFixed(1)}" y2="${(100 - 46 * Math.sin(0.66)).toFixed(1)}" stroke="#f3efe4" stroke-width="1.5"/><circle cx="160" cy="100" r="2" fill="#f3efe4"/>`;
  } else if (issue.id === 'flocks') {
    let k = 0;
    for (let i = 0; i < 26; i++) {
      const t = i / 25;
      const x = 30 + 260 * t;
      const y = 120 - 70 * Math.sin(Math.PI * t) + 12 * Math.sin(9 * t + (k += 1));
      const a = Math.atan2(-70 * Math.PI * Math.cos(Math.PI * t), 260) * 180 / Math.PI;
      body += `<path d="M-7 -4 L6 0 L-7 4 L-4 0Z" fill="${c}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${a.toFixed(1)})"/>`;
    }
  } else if (issue.id === 'life') {
    const live = new Set(['5,2', '6,3', '4,4', '5,4', '6,4', '12,6', '13,6', '14,6', '17,2', '18,2', '17,3', '18,3', '9,8', '10,8', '10,9', '9,10']);
    for (let x = 0; x < 20; x++) {
      for (let y = 0; y < 12; y++) {
        const on = live.has(`${x},${y}`);
        body += `<rect x="${4 + x * 15.8}" y="${6 + y * 15.8}" width="13" height="13" fill="${on ? c : '#f3efe4'}" opacity="${on ? 1 : 0.05}"/>`;
      }
    }
  } else {
    for (let i = 0; i < 6; i++) body += `<line x1="28" x2="292" y1="${44 + i * 24}" y2="${44 + i * 24}" stroke="#ffffff" stroke-opacity=".12"/>`;
    body += `<path d="M40 150 C90 150 110 60 160 60 S230 150 280 150" fill="none" stroke="${c}" stroke-width="3"/>`
      + `<circle cx="160" cy="60" r="5" fill="${c}"/><line x1="160" x2="160" y1="60" y2="168" stroke="${c}" stroke-dasharray="4 4" stroke-opacity=".7"/>`;
  }
  return `<svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="320" height="200" fill="${g}"/>${body}</svg>`;
}
