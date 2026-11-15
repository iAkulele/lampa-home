import { STORAGE_KEYS, LIMITS } from './config.js';
import { normalizeRowsConfig } from './rows.js';

const MAX_ENTRIES = 200;
const DEFAULT_FILTER = { genre: null, year: null, sort: 'new' };

// storage: {get(key, empty), set(key, value)}; values are plain JSON-able objects.
export function createStore(storage, now = () => Date.now()) {
  const read = (key) => {
    const v = storage.get(key, {});
    return v && typeof v === 'object' ? v : {};
  };

  const progress = {
    get(cardId) {
      return read(STORAGE_KEYS.progress)[cardId] || null;
    },
    set(cardId, { season, episode, hash }) {
      const all = read(STORAGE_KEYS.progress);
      all[cardId] = { season, episode, hash, updated: now() };
      storage.set(STORAGE_KEYS.progress, all);
    },
    clear(cardId) {
      const all = read(STORAGE_KEYS.progress);
      delete all[cardId];
      storage.set(STORAGE_KEYS.progress, all);
    },
  };

  const seen = {
    get(tvId) {
      const v = read(STORAGE_KEYS.seen)[tvId];
      return typeof v === 'number' ? v : null;
    },
    set(tvId, aired) {
      const all = read(STORAGE_KEYS.seen);
      all[tvId] = aired;
      storage.set(STORAGE_KEYS.seen, all);
    },
  };

  const tvcache = {
    get(tvId) {
      const e = read(STORAGE_KEYS.tvcache)[tvId];
      if (!e || now() - e.checked > LIMITS.tvCacheMs) return null;
      return e;
    },
    set(tvId, status) {
      const all = read(STORAGE_KEYS.tvcache);
      all[tvId] = { status, checked: now() };
      storage.set(STORAGE_KEYS.tvcache, all);
    },
  };

  // Tracker seasons of a single-season anime (TMDB episode group): {map} with
  // map null when the show has none; same TTL as tvcache.
  const seasonmap = {
    get(tvId) {
      const e = read(STORAGE_KEYS.seasonmap)[tvId];
      if (!e || now() - e.checked > LIMITS.tvCacheMs) return null;
      return e;
    },
    set(tvId, map) {
      const all = read(STORAGE_KEYS.seasonmap);
      all[tvId] = { map: map || null, checked: now() };
      storage.set(STORAGE_KEYS.seasonmap, all);
    },
  };

  const notify = {
    due() {
      const at = storage.get(STORAGE_KEYS.notifyAt, 0);
      return now() - (typeof at === 'number' ? at : 0) >= LIMITS.notifyEveryMs;
    },
    mark() {
      storage.set(STORAGE_KEYS.notifyAt, now());
    },
  };

  const filters = {
    get(kind) {
      return { ...DEFAULT_FILTER, ...(read(STORAGE_KEYS.filters)[kind] || {}) };
    },
    set(kind, f) {
      const all = read(STORAGE_KEYS.filters);
      all[kind] = { genre: f.genre ?? null, year: f.year ?? null, sort: f.sort ?? 'new' };
      storage.set(STORAGE_KEYS.filters, all);
    },
  };

  const preload = {
    get(cardId) {
      return read(STORAGE_KEYS.preload)[cardId] || null;
    },
    set(cardId, data) {
      const all = read(STORAGE_KEYS.preload);
      all[cardId] = data;
      storage.set(STORAGE_KEYS.preload, all);
    },
    remove(cardId) {
      const all = read(STORAGE_KEYS.preload);
      if (!(cardId in all)) return;
      delete all[cardId];
      storage.set(STORAGE_KEYS.preload, all);
    },
    // Overwrites the whole list (the local copy of TorrServer's list).
    replace(map) {
      storage.set(STORAGE_KEYS.preload, map && typeof map === 'object' ? map : {});
    },
    all() {
      const all = read(STORAGE_KEYS.preload);
      return Object.keys(all)
        .map((cardId) => ({ cardId, ...all[cardId] }))
        .sort((a, b) => (b.added || 0) - (a.added || 0));
    },
  };

  // Keeps the MAX_ENTRIES newest by `field`; null / non-object entries are dropped.
  function trim(key, field) {
    const all = read(key);
    const ids = Object.keys(all);
    const valid = ids.filter((id) => all[id] && typeof all[id] === 'object');
    if (ids.length <= MAX_ENTRIES && valid.length === ids.length) return;
    valid.sort((a, b) => (Number(all[b][field]) || 0) - (Number(all[a][field]) || 0));
    const kept = {};
    for (const id of valid.slice(0, MAX_ENTRIES)) kept[id] = all[id];
    storage.set(key, kept);
  }

  function prune() {
    trim(STORAGE_KEYS.progress, 'updated');
    trim(STORAGE_KEYS.tvcache, 'checked');
    trim(STORAGE_KEYS.seasonmap, 'checked');
  }

  // Home rows: built-ins switched off and the user's genre rows (see rows.js).
  const rows = {
    get() {
      return normalizeRowsConfig(storage.get(STORAGE_KEYS.rows, null));
    },
    set(cfg) {
      storage.set(STORAGE_KEYS.rows, normalizeRowsConfig(cfg));
    },
  };

  return { progress, seen, tvcache, seasonmap, notify, filters, preload, rows, prune };
}
