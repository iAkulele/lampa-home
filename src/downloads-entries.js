// Download entries (pure): TorrServer's answers and the local copy -> the list
// «Скачанное» shows, preload progress and what is stored where.
import { trackerFields } from './play-pick.js';
import { MSG } from './downloads-messages.js';

// Card fields the «Скачанное» screen and the player need; the rest of a full card
// (overview, credits, seasons...) is not stored.
const SNAPSHOT_FIELDS = ['id', 'title', 'name', 'original_title', 'original_name', 'original_language',
  'backdrop_path', 'poster_path', 'genre_ids', 'origin_country', 'release_date', 'first_air_date', 'runtime',
  'number_of_seasons'];

// TorrServer's `get` answer -> progress of one file. loaded_size counts the whole
// torrent's cache, so neighbouring pieces may push it a bit past the file length.
export function preloadProgress({ loaded_size, file_stats, index }) {
  const file = (file_stats || []).find((f) => f.id === index);
  const size = (file && file.length) || 0;
  const loaded = loaded_size || 0;
  if (!size) return { percent: 0, done: false };
  const done = loaded >= size;
  return { percent: done ? 100 : Math.min(99, Math.floor((loaded / size) * 100)), done };
}

// TorrServer's `get` answer -> {percent, done, notStarted, id}. id: the file the badge
// follows (the saved index, else the largest file). notStarted: no saved index and
// nothing loaded, i.e. marked but the preload was never kicked off.
export function preloadState({ index, loaded_size, file_stats }) {
  const stats = file_stats || [];
  const largest = stats.reduce((b, f) => ((f.length || 0) > ((b && b.length) || 0) ? f : b), null);
  const id = index != null ? index : largest && largest.id;
  const notStarted = index == null && !(loaded_size > 0);
  return { ...preloadProgress({ loaded_size, file_stats: stats, index: id }), notStarted, id };
}

export function cardSnapshot(card) {
  const out = {};
  for (const key of SNAPSHOT_FIELDS) {
    if (card[key] !== undefined && card[key] !== null) out[key] = card[key];
  }
  if (!out.genre_ids && Array.isArray(card.genres)) out.genre_ids = card.genres.map((g) => g && g.id).filter((id) => id != null);
  return out;
}

// What to do with an earlier download of the same card when a new one is started:
// 'new' (none), 'same' (same release again) or 'replace' (delete the old one first).
export function replacePlan(existing, newHash) {
  if (!existing || !existing.hash) return 'new';
  return existing.hash === newHash ? 'same' : 'replace';
}

export function badgeLabel(progress) {
  if (!progress) return '';
  if (progress.missing) return MSG.missing;
  if (progress.notStarted) return MSG.notStarted;
  return progress.done ? 'Скачано' : `Качается ${progress.percent} %`;
}

// Storage key: TMDB movie and tv ids overlap, so the kind is part of it.
export const entryKey = (card) => (card.original_name || card.name ? 'tv' : 'movie') + ':' + card.id;

// The episode a ctx or an entry is about, as stored in lh_preload and played from:
// {kind, season, episode, absolute} plus the tracker fields.
export const episodeMeta = (o) => ({
  kind: o.kind, season: o.season, episode: o.episode, absolute: o.absolute, ...trackerFields(o),
});

// The JSON string kept in TorrServer's `data` field: Lampa's own {lampa, movie} plus
// lh_preload, which marks the torrent as a download and lets every device list it.
export function preloadData(snapshot, meta) {
  return JSON.stringify({ lampa: true, movie: snapshot, lh_preload: meta });
}

const parseData = (data) => {
  if (data && typeof data === 'object') return data;
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
};

// TorrServer's `list` answer -> the downloads, newest first. Torrents without
// lh_preload (played with «Играть», added by Lampa) and broken `data` are skipped.
export function parseDownloadEntries(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const t of list) {
    if (!t || !t.hash) continue;
    const data = parseData(t.data);
    const meta = data && data.lh_preload;
    const card = data && data.movie;
    if (!meta || typeof meta !== 'object' || !card || typeof card !== 'object' || card.id == null) continue;
    out.push({
      key: entryKey(card),
      hash: t.hash,
      card,
      index: typeof meta.index === 'number' ? meta.index : undefined,
      season: meta.season,
      episode: meta.episode,
      absolute: meta.absolute,
      ...trackerFields(meta),
      kind: meta.kind,
      added: Number(meta.added) || (Number(t.timestamp) || 0) * 1000,
      size: t.torrent_size,
      title: String(t.title || '').replace(/^\[LAMPA\]\s*/, ''),
    });
  }
  return out.sort((a, b) => b.added - a.added);
}

// Downloads made before the list moved to TorrServer: in the local copy, on the
// server, but without lh_preload. -> entries to mark on the server.
export function legacyEntries(list, cached) {
  if (!Array.isArray(list) || !Array.isArray(cached)) return [];
  const marked = new Set(parseDownloadEntries(list).map((e) => e.hash));
  const onServer = new Map(list.filter((t) => t && t.hash).map((t) => [t.hash, t]));
  return cached
    .filter((e) => e && e.hash && e.card && e.key && onServer.has(e.hash) && !marked.has(e.hash))
    .map((e) => ({ ...e, server: onServer.get(e.hash) }));
}

// An earlier download of the same card: the same release if there is one, else the newest.
export function findExisting(entries, key, hash) {
  const same = (entries || []).filter((e) => e && e.key === key);
  return same.find((e) => e.hash === hash) || same[0] || null;
}

// The local copy of an entry (fallback when TorrServer is unreachable).
export const cacheEntry = (e) => ({
  hash: e.hash, index: e.index, title: e.title, kind: e.kind, season: e.season, episode: e.episode,
  absolute: e.absolute, ...trackerFields(e), size: e.size, added: e.added, card: e.card,
});

// The new local copy for TorrServer's list, or null to keep the old one: an empty
// server list never wipes a non-empty copy (a TorrServer reset or a wrong address
// would otherwise lose every device's list). The newest download of a card wins.
export function cacheUpdate(entries, cachedCount) {
  if (!Array.isArray(entries)) return null;
  if (!entries.length && cachedCount > 0) return null;
  const map = {};
  for (const e of [...entries].sort((a, b) => (a.added || 0) - (b.added || 0))) map[e.key] = cacheEntry(e);
  return map;
}
