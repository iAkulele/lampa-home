// «Скачать заранее»: sends a release to TorrServer and asks it to preload the whole
// file into its disk cache. «Скачанное» (`lh_downloads`) lists those releases with
// their progress, plays them without a new search and deletes them through the
// helper on the PC (helper/ts-clean.js): TorrServer itself cannot delete its cache
// folder without changing its settings, which the plugin never does.
// The list itself lives on TorrServer (lh_preload in each torrent's `data`), so
// every device shows the same downloads; Lampa.Storage keeps only a local copy for
// when TorrServer is unreachable.
//
// This file wires the «...» menu entry and re-exports the public API of the
// downloads-*.js modules for index.js, menu.js and settings.js.
import { lampa } from './lampa.js';
import { preload } from './downloads-preload.js';

export { TITLE, NAME as COMPONENT, register, open } from './downloads-screen.js';
export { HELPER_DEFAULT, helperUrl } from './downloads-api.js';
export { preload, startPreload } from './downloads-preload.js';
export { listDownloads, status, remove, forget } from './downloads-list.js';
export {
  preloadProgress, preloadState, cardSnapshot, replacePlan, badgeLabel, entryKey, preloadData, parseDownloadEntries,
  legacyEntries, findExisting, cacheUpdate,
} from './downloads-entries.js';

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
