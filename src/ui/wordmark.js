// The Wonderfield wordmark: flat Newsreader, "Wonder" upright and "field" in
// light italic, with a firefly for the dot of the i.

export function renderWordmarks(root = document) {
  for (const host of root.querySelectorAll('[data-wordmark]')) {
    if (host.childElementCount) continue;
    host.innerHTML = '<span class="visually-hidden">Wonderfield</span>'
      + '<span aria-hidden="true">Wonder<span class="wordmark__field">f<span class="wordmark__i">ı<span class="wordmark__firefly"></span></span>eld</span></span>';
  }
}
