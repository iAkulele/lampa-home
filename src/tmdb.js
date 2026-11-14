// Data loading for the home rows. Promise wrappers over Lampa's TMDB source.
import { tmdbGet, favoriteGet, store } from './lampa.js';
import { episodeStatus } from './episodes.js';
import { createQueue } from './queue.js';
import { rowQuery } from './tmdb-queries.js';
import { rowTitle, hasRussianTitle, fillPages } from './cards.js';

const HISTORY_LIMIT = 20;

// Local calendar date as YYYY-MM-DD.
export function todayIso(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function get(url, params) {
  return new Promise((resolve, reject) => tmdbGet(url, params, resolve, reject));
}

export function loadHistory() {
  return favoriteGet({ type: 'history' }).slice(0, HISTORY_LIMIT);
}

// Never rejects: a failed row resolves with results: [] and is skipped by the caller.
export function loadRow(rowKey, today = todayIso()) {
  const base = { title: rowTitle(rowKey), rowKey, results: [] };
  if (rowKey === 'history') {
    try {
      return Promise.resolve({ ...base, results: loadHistory() });
    } catch (e) {
      return Promise.resolve(base);
    }
  }
  const q = rowQuery(rowKey, today);
  if (!q) return Promise.resolve(base);
  let totalPages = 1;
  const fetchPage = (page) => get(q.url, { ...q.params, page }).then((json) => {
    if (page === 1) totalPages = (json && json.total_pages) || 1;
    return { cards: ((json && json.results) || []).filter(hasRussianTitle), done: page >= totalPages };
  });
  return fillPages(fetchPage).then(
    (results) => ({ ...base, results, total_pages: totalPages }),
    () => base,
  );
}

export function loadTv(tvId) {
  return get(`tv/${tvId}`, {});
}

const tvQueue = createQueue(6);

// Never rejects: resolves with {season, aired, total, airing, animation} or null on
// failure. `animation`: the show has TMDB genre 16 (notify.js confirms anime by it).
export function tvStatus(tvId, today = todayIso()) {
  const hit = store.tvcache.get(tvId);
  if (hit) return Promise.resolve(hit.status);
  return tvQueue(() => loadTv(tvId)).then(
    (json) => {
      const genres = (json && json.genres) || [];
      const status = { ...episodeStatus(json, today), animation: genres.some((g) => g && g.id === 16) };
      store.tvcache.set(tvId, status);
      return status;
    },
    () => null,
  );
}
