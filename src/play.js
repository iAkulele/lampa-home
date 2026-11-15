// «Играть» on the card screen: the button, the «...» menu entry and the inner
// player hook. The work itself lives in the play-*.js modules:
//   play-run.js         run() / startFromHash(): the whole «Играть» flow
//   play-target.js      which episode to play, the episode picker
//   play-search.js      parser queries, result cache, Lampa's native list
//   play-candidates.js  which releases to try and the try loop
//   play-torrserver.js  TorrServer via Lampa: add, file list, playlist
//   play-pick.js        kind, tracker seasons, file choice (pure)
//   play-progress.js    timeline marks, lh_progress from the inner player
//   play-job.js         the single running job and its loader
//   play-error.js       PlayError, timeouts
import { lampa } from './lampa.js';
import { run, chooseManually } from './play-run.js';
import { onPlayerStart } from './play-progress.js';

// For home.js (banner «Играть») and notify.js.
export { run } from './play-run.js';
export { detectKind, genreIds } from './play-pick.js';

// Lampa's sprite-play, inlined: the new card layout shows buttons icon-only until focused.
const PLAY_ICON = '<svg viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"></circle><path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"></path></svg>';

function addButton(e) {
  const card = e.data && e.data.movie;
  if (!card || !e.body) return;
  let row = e.body.find('.full-start-new__buttons');
  if (!row.length) row = e.body.find('.full-start__buttons');
  if (!row.length || row.find('.lh-play').length) return;
  const btn = $(`<div class="full-start__button selector lh-play">${PLAY_ICON}<span>Играть</span></div>`);
  btn.on('hover:enter', () => run(card));
  btn.on('hover:long', () => chooseManually(card));
  row.first().prepend(btn);
}

export function init() {
  const L = lampa();
  L.Listener.follow('full', (e) => {
    if (e.type == 'complite') addButton(e);
    if (e.type === 'options' && Array.isArray(e.options)) {
      const card = (e.link && e.link.card) || (e.data && e.data.movie);
      if (card && card.id) e.options.push({ title: 'Выбрать раздачу вручную', onSelect: () => chooseManually(card) });
    }
  });
  if (L.Player.listener) L.Player.listener.follow('start', onPlayerStart);
}
