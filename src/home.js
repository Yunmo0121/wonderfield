// Wonderfield front page: one curve on the cover, the shelf of issues, the menu.

import './style.css';
import { createFrontCurve } from './ui/frontCurve.js';
import { renderWordmarks } from './ui/wordmark.js';
import { createMenu } from './ui/menu.js';
import { ISSUES, issueArt } from './data/issues.js';

renderWordmarks();
createMenu({ base: './' });
createFrontCurve(document.getElementById('front-sky'));

document.getElementById('issues-grid').innerHTML = ISSUES.map((i) => {
  const open = i.status === 'open';
  const body = `
    <div class="entry__art">${issueArt(i)}</div>
    <p class="entry__meta"><b>No. ${i.number}</b><span>${open ? 'Out now' : i.status}</span></p>
    <h3>${i.question}</h3>
    <p class="entry__topic">${i.title}: ${i.topic.charAt(0).toLowerCase()}${i.topic.slice(1)}</p>
    <p class="entry__maths">${i.maths}</p>
    ${open ? '<span class="entry__go">Read the issue</span>' : ''}`;
  return `<li class="entry ${open ? 'entry--open' : 'entry--later'}" style="--c:${i.colour}">${open ? `<a href="${i.href}">${body}</a>` : body}</li>`;
}).join('');
