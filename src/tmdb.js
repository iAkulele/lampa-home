// Data loading for the home rows. Promise wrappers over Lampa's TMDB source.
import { tmdbGet, favoriteGet } from './lampa.js';
import { rowQuery } from './tmdb-queries.js';
import { rowTitle } from './cards.js';

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
  return get(q.url, { ...q.params, page: 1 }).then(
    (json) => ({ ...base, results: (json && json.results) || [], total_pages: (json && json.total_pages) || 1 }),
    () => base,
  );
}

export function loadTv(tvId) {
  return get(`tv/${tvId}`, {});
}
