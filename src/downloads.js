// «Скачать заранее»: sends a release to TorrServer and asks it to preload the whole
// file into its disk cache. «Скачанное» (`lh_downloads`) lists those releases with
// their progress, plays them without a new search and deletes them through the
// helper on the PC (helper/ts-clean.js): TorrServer itself cannot delete its cache
// folder without changing its settings, which the plugin never does.
// The list itself lives on TorrServer (lh_preload in each torrent's `data`), so
// every device shows the same downloads; Lampa.Storage keeps only a local copy for
// when TorrServer is unreachable.
//
// This file wires the «...» menu entry; the work lives in:
//   downloads-preload.js   «Скачать заранее» and «Начать закачку»
//   downloads-screen.js    the «Скачанное» component
//   downloads-list.js      server list + local copy, status, remove, forget
//   downloads-api.js       TorrServer /torrents and /stream, the PC delete helper
//   downloads-entries.js   entries, progress, cache shape (pure)
//   downloads-messages.js  texts
import { lampa } from './lampa.js';
import { preload } from './downloads-preload.js';

// For index.js, menu.js and settings.js.
export { TITLE, register, open } from './downloads-screen.js';
export { HELPER_DEFAULT } from './downloads-api.js';

// «Скачать заранее» in the card's «...» options.
export function init() {
  const L = lampa();
  L.Listener.follow('full', (e) => {
    if (e.type !== 'options' || !Array.isArray(e.options)) return;
    const card = (e.link && e.link.card) || (e.data && e.data.movie);
    if (!card || !card.id) return;
    e.options.push({ title: 'Скачать заранее', onSelect: () => preload(card) });
  });
}
