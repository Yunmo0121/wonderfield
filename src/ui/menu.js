// The contents menu: every issue on the shelf, and the sections of the issue
// you are reading. Opened by any [data-open-menu] button.

import { ISSUES } from '../data/issues.js';

/**
 * @param {object} o
 * @param {string} o.base       path from this page to the site root ('./' or '../')
 * @param {string} [o.current]  id of the issue being read
 * @param {Array<[string,string]>} [o.sections]  this issue's sections: [hash, title]
 */
export function createMenu({ base = './', current = null, sections = [] } = {}) {
  const dialog = document.createElement('dialog');
  dialog.className = 'menu';
  dialog.setAttribute('aria-label', 'Contents');
  const issue = ISSUES.find((i) => i.id === current);
  dialog.innerHTML = `
    <div class="menu__head">
      <a class="menu__home" href="${base}index.html"><span class="wordmark wordmark--menu" data-wordmark></span></a>
      <button class="menu__close" type="button" aria-label="Close the contents">Close</button>
    </div>
    <div class="menu__body">
      <section>
        <h2 class="menu__title">The issues</h2>
        <ol class="menu__issues">
          ${ISSUES.map((i) => {
            const open = i.status === 'open';
            const inner = `<span class="menu__n" style="--c:${i.colour}">${i.number}</span><span><b>${i.title}</b><small>${i.id === current ? 'You are reading this issue' : open ? i.question : i.status}</small></span>`;
            return `<li class="${i.id === current ? 'is-current' : ''} ${open ? '' : 'is-later'}">${open ? `<a href="${base}${i.href}">${inner}</a>` : `<div>${inner}</div>`}</li>`;
          }).join('')}
        </ol>
      </section>
      ${sections.length ? `
      <section>
        <h2 class="menu__title">In Issue ${issue?.number ?? ''}</h2>
        <ol class="menu__sections">
          ${sections.map(([hash, title]) => `<li><a href="${hash}">${title}</a></li>`).join('')}
        </ol>
      </section>` : ''}
    </div>`;
  document.body.append(dialog);
  import('./wordmark.js').then((m) => m.renderWordmarks(dialog));

  const open = () => (dialog.showModal ? dialog.showModal() : dialog.setAttribute('open', ''));
  const close = () => (dialog.close ? dialog.close() : dialog.removeAttribute('open'));
  for (const b of document.querySelectorAll('[data-open-menu]')) b.addEventListener('click', open);
  dialog.querySelector('.menu__close').addEventListener('click', close);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close(); // click on the backdrop
    if (e.target.closest('.menu__sections a')) close();
  });
}
