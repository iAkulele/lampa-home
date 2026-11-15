// Data loading for the home rows. Promise wrappers over Lampa's TMDB source.
import { tmdbGet, favoriteGet, store } from './lampa.js';
import { episodeStatus } from './episodes.js';
import { createQueue } from './queue.js';
import { rowQuery } from './tmdb-queries.js';
import { rowTitle, hasRussianTitle, fillPages, isAnimeCard, rowHidesAnime } from './cards.js';

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
    const keep = (c) => hasRussianTitle(c) && !(rowHidesAnime(rowKey) && isAnimeCard(c));
    return { cards: ((json && json.results) || []).filter(keep), done: page >= totalPages };
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

// ---------- tracker seasons of a single-season anime ----------

// TMDB episode group type 6: "TV", the seasons as aired.
const GROUP_TV = 6;
const SEASON_MAP_TIMEOUT_MS = 6000;

// tv/episode_group/{id} -> SeasonMap [{season, start, count, episodes}] in group
// order, specials (season 0) and empty groups skipped, numbered 1..n; episode
// numbers are the absolute ones of TMDB season 1. null when fewer than 2 seasons.
export function buildSeasonMap(groupJson) {
  const groups = ((groupJson && groupJson.groups) || [])
    .filter((g) => g && Array.isArray(g.episodes))
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const map = [];
  for (const g of groups) {
    const eps = g.episodes
      .filter((e) => e && e.season_number === 1 && e.episode_number > 0)
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.episode_number - b.episode_number)
      .map((e) => e.episode_number);
    if (!eps.length) continue;
    map.push({ season: map.length + 1, start: Math.min(...eps), count: eps.length, episodes: eps });
  }
  return map.length >= 2 ? map : null;
}

// One real TMDB season (tracker seasons are worth mapping only then).
export function isSingleSeason(tv) {
  if (!tv) return false;
  const real = (tv.seasons || []).filter((s) => s && s.season_number > 0);
  return tv.number_of_seasons === 1 || real.length === 1;
}

const seasonMapMemory = new Map();

// Never rejects: the SeasonMap of a single-season show from its TMDB "Seasons"
// episode group (type 6), or null. tv: the TMDB details when already loaded.
export function loadSeasonMap(tvId, tv) {
  if (tvId == null) return Promise.resolve(null);
  if (seasonMapMemory.has(tvId)) return Promise.resolve(seasonMapMemory.get(tvId));
  const hit = store.seasonmap.get(tvId);
  if (hit) {
    seasonMapMemory.set(tvId, hit.map);
    return Promise.resolve(hit.map);
  }
  const remember = (map) => {
    seasonMapMemory.set(tvId, map);
    store.seasonmap.set(tvId, map);
    return map;
  };
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(null), SEASON_MAP_TIMEOUT_MS);
  });
  const req = (tv ? Promise.resolve(tv) : loadTv(tvId))
    .then((details) => {
      if (!isSingleSeason(details)) return remember(null);
      return get(`tv/${tvId}/episode_groups`, {}).then((list) => {
        const group = ((list && list.results) || []).find((g) => g && g.type === GROUP_TV);
        if (!group) return remember(null);
        return get(`tv/episode_group/${group.id}`, {}).then((json) => remember(buildSeasonMap(json)));
      });
    })
    // A network failure is not remembered: the next press asks again.
    .catch(() => null);
  return Promise.race([req, timeout]).finally(() => clearTimeout(timer));
}
