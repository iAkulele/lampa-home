// «Играть»: picks a torrent release by rules, sends it to TorrServer and starts
// the player on the right file (next episode for series) with a playlist.
import { lampa, store, storageField } from './lampa.js';
import { LIMITS } from './config.js';
import { selectTorrent, parseTitle, inferSeasonMap } from './torrent-select.js';
import { episodeStatus, nextEpisode, absoluteEpisode, parseEpisode, trackerPosition } from './episodes.js';
import { loadTv, todayIso, loadSeasonMap, isSingleSeason } from './tmdb.js';
import { askEpisode } from './episode-picker.js';
import {
  isLatinOrCyrillic, latinAltTitles, cyrillicAltTitles, queryTitles, firstQuery, followUpQueries, mergeResults, searchParamsFor,
  FEW_RESULTS,
} from './search-query.js';

const ANIMATION = 16;
// Same list as Lampa's interaction/torrent.js.
const VIDEO = ['asf', 'wmv', 'divx', 'avi', 'mp4', 'm4v', 'mov', '3gp', '3g2', 'mkv', 'trp', 'tp', 'mts', 'mpg', 'mpeg', 'dat', 'vob', 'rm', 'rmvb', 'm2ts', 'ts'];
const INDIVIDUAL = ['vob', 'm2ts'];
const FILES_EVERY_MS = 2000;
const WATCHED_PERCENT = 85;
const FILES_TRIES = 20;
// Extra candidates get a shorter wait for their file list (10 × 2 s).
const FILES_TRIES_EXTRA = 10;
const HASH_TIMEOUT_MS = 20000;
// Releases «Играть» tries before giving up on the episode.
const MAX_CANDIDATES = 3;
// Whole «Играть» run (search + every candidate) never keeps the loader longer.
const RUN_TIMEOUT_MS = 90000;
// jac.red answers HTTP 429 to a second request within about a second.
const QUERY_GAP_MS = 1200;
// A parser failure faster than this is a rate limit, not a dead parser: one retry.
const RETRY_FAST_MS = 500;
const RETRY_AFTER_MS = 2000;
// «Играть» then «Скачать заранее» (or a second press) reuse the search.
const RESULTS_TTL_MS = 60000;
const ALT_TIMEOUT_MS = 5000;

const MSG = {
  search: 'Ищу раздачу…',
  server: 'Отправляю в TorrServer…',
  files: 'Жду список файлов…',
  filesOf: (i, n) => `Жду список файлов (${i}/${n})…`,
  none: 'Подходящей раздачи не нашёл, выберите вручную',
  noFile: 'Нужной серии в раздаче не нашёл, выберите вручную',
  notYet: (n) => `Серия ${n} ещё не появилась в раздачах`,
  retry: (i, n) => `Пробую другую раздачу (${i}/${n})…`,
  timeout: 'Раздача не запустилась вовремя, выберите вручную',
  parser: 'Парсер не ответил',
  torrserver: 'TorrServer недоступен',
  noServer: 'TorrServer не настроен',
  noFiles: 'TorrServer не получил список файлов',
  unknown: 'Не удалось запустить раздачу',
};

// fatal: TorrServer itself is missing or unreachable; any other PlayError about one
// release (no hash in time, no file list) only makes «Играть» try the next one.
export class PlayError extends Error {
  constructor(msg, fatal = false) {
    super(msg);
    this.fatal = fatal;
  }
}
const fail = (msg, fatal) => new PlayError(msg, fatal);

// ---------- pure helpers ----------

const ext = (path) => String(path || '').split('.').pop().toLowerCase();
const isVideo = (f) => VIDEO.includes(ext(f.path));

// Genre ids of a list card (genre_ids) or a full TMDB card (genres: [{id, name}]).
export function genreIds(card) {
  if (!card) return [];
  if (Array.isArray(card.genre_ids) && card.genre_ids.length) return card.genre_ids;
  return (Array.isArray(card.genres) ? card.genres : []).map((g) => g && g.id).filter((id) => id != null);
}

// Progress the picker wrote early: kept only if playback started, else the previous value
// comes back (null = nothing was stored). outcome: 'played' or anything else.
export function progressAfterOutcome(prev, picked, outcome) {
  return outcome === 'played' ? picked : prev;
}

export function detectKind(card) {
  if (!card || !card.original_name) return 'movie';
  const jp = (card.origin_country || []).includes('JP');
  return jp && genreIds(card).includes(ANIMATION) ? 'anime' : 'tv';
}

// Does the release title name a season ("S02", "Season 3", "2 сезон")? Then its
// files are numbered per season, not absolutely.
export function titleHasSeason(title) {
  const p = parseTitle(title);
  return !!(p.seasons || p.sxeRange || (p.episode && p.episode.season != null));
}

// ---------- tracker seasons (single-season anime split into seasons on trackers) ----------
// ctx stays in TMDB terms (season 1, episode = absolute = TMDB's number) for
// progress and Lampa's timeline; trackerSeason / trackerEpisode / trackerStart
// (first absolute episode of that tracker season) serve release and file choice.

// The tracker fields of a ctx or a stored entry ({} when there are none).
export function trackerFields(o) {
  if (!o || o.trackerSeason == null) return {};
  return { trackerSeason: o.trackerSeason, trackerEpisode: o.trackerEpisode, trackerStart: o.trackerStart };
}

// ctx with the tracker position of its absolute episode in map. keepMap: the
// map came from TMDB before the search (the query then goes without a season).
export function withTracker(ctx, map, keepMap = true) {
  if (!ctx || !map) return ctx;
  const { trackerSeason, trackerEpisode, trackerStart, ...rest } = ctx;
  const out = keepMap ? { ...rest, seasonMap: map } : rest;
  const pos = trackerPosition(map, ctx.absolute);
  return pos ? { ...out, trackerSeason: pos.season, trackerEpisode: pos.episode, trackerStart: pos.start } : out;
}

// Single-season anime without a TMDB episode group: tracker seasons inferred
// from the season-tagged releases themselves (ctx.inferTotal: TMDB's count).
export function inferTracker(ctx, results, names) {
  if (!ctx || ctx.trackerSeason != null || ctx.seasonMap || !(ctx.inferTotal > 0)) return ctx;
  const map = inferSeasonMap(results, { names, total: ctx.inferTotal });
  return map ? withTracker(ctx, map, false) : ctx;
}

// Absolute (TMDB) number of a playlist episode of a tracker-season pack:
// per-season numbers 1..n map to trackerStart.., absolute ones stay.
export function absoluteInPack(episode, ctx) {
  if (!(episode > 0) || !ctx || !(ctx.trackerStart > 0)) return episode;
  return ctx.trackerStart > 1 && episode >= ctx.trackerStart ? episode : ctx.trackerStart - 1 + episode;
}

// The picked file is numbered within its tracker season (03 for absolute 40).
export function isTrackerPackFile(file, ctx) {
  if (!file || !ctx || !(ctx.trackerStart > 0)) return false;
  const n = parseEpisode(file.path).episode;
  return n != null && n !== ctx.absolute && n === ctx.trackerEpisode;
}

// files: [{id, path, length}]; infos (optional): [{id, season, episode, defaultSeason}]
// as Lampa's Torserver.parse sees them (it also reads season folders);
// defaultSeason: no season marker in the path, `season` is Lampa's guess.
// Returns the file or null.
export function pickFile(files, ctx, infos) {
  const videos = (files || []).filter(isVideo);
  if (!videos.length) return null;
  if (ctx.trackerSeason != null && ctx.kind !== 'movie') {
    // Tracker S03E03 in the names; then the absolute number ("40" exists only in
    // an absolutely numbered pack); then the per-season number of a season pack.
    const { trackerSeason, trackerEpisode, trackerStart, ...plain } = ctx;
    const sxe = videos.find((f) => {
      const ep = parseEpisode(f.path);
      return ep.season != null && ep.season === trackerSeason && ep.episode === trackerEpisode;
    });
    if (sxe) return sxe;
    const abs = pickFile(videos, { ...plain, titleHasSeason: false }, infos);
    if (abs) return abs;
    return pickFile(videos, { ...plain, season: trackerSeason, episode: trackerEpisode, absolute: trackerEpisode, titleHasSeason: true }, infos);
  }
  if (ctx.kind === 'movie') {
    return videos.reduce((best, f) => ((f.length || 0) > (best.length || 0) ? f : best));
  }
  const parsed = videos.map((f) => ({ f, ep: parseEpisode(f.path) }));
  const bySxe = parsed.find(({ ep }) => ep.season != null && ep.season === ctx.season && ep.episode === ctx.episode);
  if (bySxe) return bySxe.f;
  const bare = parsed.filter(({ ep }) => ep.season == null && ep.absolute != null);
  // Absolute numbering first only for anime packs without a season in the title;
  // series and season packs are numbered per season.
  const absFirst = ctx.kind === 'anime' && !ctx.titleHasSeason;
  const numbers = absFirst ? [ctx.absolute, ctx.episode] : [ctx.episode, ctx.absolute];
  const infoOf = (f) => (Array.isArray(infos) ? infos.find((i) => i && i.id === f.id) : null);
  // "Season 1/Серия 5" is not S2E5 even when it is the only "5" in the pack.
  const otherSeason = (f) => {
    const i = infoOf(f);
    return !!i && !i.defaultSeason && i.season != null && i.season !== ctx.season;
  };
  let ambiguous = false;
  for (const n of numbers) {
    if (n == null) continue;
    const hits = bare.filter(({ ep }) => ep.absolute === n);
    if (hits.length === 1) {
      if (!otherSeason(hits[0].f)) return hits[0].f;
      ambiguous = true;
      break;
    }
    // "Season 1/Серия 5" and "Season 2/Серия 5": the bare number says nothing.
    if (hits.length > 1) {
      ambiguous = true;
      break;
    }
  }
  if (Array.isArray(infos)) {
    const ids = new Set(videos.map((f) => f.id));
    const hits = infos.filter((i) => i && ids.has(i.id) && i.season === ctx.season && i.episode === ctx.episode);
    if (hits.length === 1) return videos.find((f) => f.id === hits[0].id);
  }
  if (ambiguous) return null;
  // A single-episode release: selectTorrent already matched the episode by title.
  return videos.length === 1 && parsed[0].ep.episode == null ? videos[0] : null;
}

// Releases to try, in selectTorrent's order (best score first; for tv/anime a
// title range that provably holds the episode already scores higher): rejected
// ones skipped, the same link only once, at most `max`.
export function nextCandidates(scored, max = MAX_CANDIDATES) {
  const out = [];
  const seen = new Set();
  for (const s of scored || []) {
    if (out.length >= max) break;
    if (!s || s.rejected || !s.result) continue;
    const link = s.result.MagnetUri || s.result.Link || s.result.Title;
    if (link && seen.has(link)) continue;
    if (link) seen.add(link);
    out.push(s.result);
  }
  return out;
}

// Ongoing shows: the best pack may stop one episode short, or the episode sits in
// another release; a release may also never deliver its files. Tries each
// candidate with attempt(cand, i) -> 'played' | 'cancelled' | 'nofile' | 'nofile-prev'.
// A non-fatal PlayError is a miss like 'nofile'; after every miss onMiss() runs.
// Fatal errors (TorrServer missing/unreachable) and foreign errors are rethrown.
// Returns 'played', 'cancelled', 'nofile-prev' (a release held the episode before) or 'nofile'.
export async function tryCandidates(candidates, attempt, { cancelled = () => false, onMiss = () => {} } = {}) {
  let prevSeen = false;
  for (let i = 0; i < (candidates || []).length; i++) {
    let outcome;
    try {
      outcome = await attempt(candidates[i], i);
    } catch (err) {
      if (cancelled() || !(err instanceof PlayError) || err.fatal) throw err;
      outcome = 'nofile';
    }
    if (outcome === 'played' || outcome === 'cancelled') return outcome;
    if (cancelled()) return 'cancelled';
    if (outcome === 'nofile-prev') prevSeen = true;
    onMiss();
  }
  return prevSeen ? 'nofile-prev' : 'nofile';
}

// ctx of the episode before the target in the same season (null for a movie or
// the first episode of a season): a pack holding it means the target is not out yet.
export function previousEpisodeCtx(ctx) {
  if (!ctx || ctx.kind === 'movie' || !(ctx.episode > 1)) return null;
  const prev = { ...ctx, episode: ctx.episode - 1, absolute: ctx.absolute > 1 ? ctx.absolute - 1 : ctx.absolute };
  if (ctx.trackerSeason == null) return prev;
  // The first episode of a tracker season: its predecessor is in another pack.
  if (!(ctx.trackerEpisode > 1)) return null;
  return { ...prev, trackerEpisode: ctx.trackerEpisode - 1 };
}

// Lampa's timeline entry of the stored episode: still unfinished -> play it again.
export function resumeTarget(progress, view) {
  if (!progress || !view) return null;
  if (!(view.time > 0) || !(view.percent < WATCHED_PERCENT)) return null;
  return { season: progress.season, episode: progress.episode };
}

// Lampa hashes by `title` / `original_title` (Torserver.parse); TV cards carry name.
export function normalizeTitles(card) {
  const out = { ...card };
  if (!out.title && out.name) out.title = out.name;
  if (!out.original_title && out.original_name) out.original_title = out.original_name;
  return out;
}

// Moves past episodes already watched (by Lampa's timeline); stops at the last known episode.
export function advanceWatched(target, seasons, isWatched) {
  let t = { season: target.season, episode: target.episode };
  for (let guard = 0; guard < 5000 && isWatched(t.season, t.episode); guard++) {
    const next = nextEpisode(t, seasons);
    if (next.season === t.season && next.episode === t.episode) break;
    t = next;
  }
  return t;
}

// Same string Lampa hashes for a serial's torrent file (utils/episodes_parser.js, by_title).
export function timelineHashString(season, episode, originalTitle) {
  return [season, season > 10 ? ':' : '', episode, originalTitle].join('');
}

// Mirrors Lampa's components/full/start/torrents.js (the native list's params).
export function buildSearchParams(card, ctx, parseLang) {
  const title = card.title || card.name || '';
  const original = card.original_title || card.original_name || title;
  return searchParamsFor(card, ctx, parseLang, title, original);
}

// ---------- Lampa side ----------

function withTimeout(promise, ms, msg) {
  let timer;
  const t = new Promise((_, reject) => {
    timer = setTimeout(() => reject(fail(msg)), ms);
  });
  return Promise.race([promise, t]).finally(() => clearTimeout(timer));
}

const tmdbDetails = (kind, id) =>
  kind === 'movie'
    ? new Promise((resolve, reject) => lampa().Api.sources.tmdb.get(`movie/${id}`, {}, resolve, reject))
    : loadTv(id);

// Lampa's parser needs `genres` (full card); list cards (banner, rows) only have genre_ids.
async function fullCard(card, kind) {
  const L = lampa();
  let movie = card;
  let details = null;
  if (kind !== 'movie' || !Array.isArray(card.genres)) {
    try {
      details = await tmdbDetails(kind, card.id);
    } catch (e) {
      details = null;
    }
  }
  if (details && !Array.isArray(card.genres)) {
    movie = { ...card, genres: details.genres || [], number_of_seasons: details.number_of_seasons };
  } else if (!Array.isArray(card.genres)) {
    movie = { ...card, genres: [] };
  }
  if (!movie.img && movie.poster_path) movie = { ...movie, img: L.Api.img(movie.poster_path) };
  return { movie: normalizeTitles(movie), details };
}

export function searchTorrents(params) {
  const L = lampa();
  const req = new Promise((resolve, reject) => {
    L.Parser.get(params, (data) => resolve((data && data.Results) || []), () => reject(fail(MSG.parser)));
  });
  return withTimeout(req, LIMITS.searchTimeoutMs, MSG.parser);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// One parser query; a failure within RETRY_FAST_MS (jac.red's 429) is retried once after 2 s.
async function searchOnce(params, job) {
  const started = Date.now();
  try {
    return await searchTorrents(params);
  } catch (err) {
    if ((job && job.cancelled) || Date.now() - started >= RETRY_FAST_MS) throw err;
    await sleep(RETRY_AFTER_MS);
    if (job && job.cancelled) throw err;
    return searchTorrents(params);
  }
}

const altCache = new Map();

// Alternative titles of the card (TMDB alternative_titles): {latin, cyrillic},
// cached per card; null when TMDB did not answer.
function altTitles(kind, id) {
  if (id == null) return Promise.resolve(null);
  const key = (kind === 'movie' ? 'movie/' : 'tv/') + id;
  if (altCache.has(key)) return Promise.resolve(altCache.get(key));
  const req = new Promise((resolve, reject) => {
    lampa().Api.sources.tmdb.get(key + '/alternative_titles', {}, resolve, reject);
  });
  return withTimeout(req, ALT_TIMEOUT_MS, MSG.parser).then(
    (json) => {
      const alts = { latin: latinAltTitles(json), cyrillic: cyrillicAltTitles(json) };
      altCache.set(key, alts);
      return alts;
    },
    () => null,
  );
}

const resultsCache = new Map();

// Parser results for the target: Q1 by the RU title (tv/anime: cut when long);
// then, at least 1.2 s apart, the short RU title when Q1 found little and the
// Latin alternative title for anime or when Q1 found little.
// -> {results, names (for selectTorrent's relevance check), params (Q1)}.
export async function findReleases(movie, ctx, job) {
  const key = [movie.id, ctx.kind, ctx.seasonMap ? 'map' : ctx.season].join(':');
  const hit = resultsCache.get(key);
  if (hit && Date.now() - hit.at < RESULTS_TTL_MS) return hit.value;

  const cancelled = () => !!(job && job.cancelled);
  const original = movie.original_title || movie.original_name || '';
  const titlesOf = (alts) => queryTitles(movie, (alts && alts.latin) || [], { kind: ctx.kind, cyrillic: alts && alts.cyrillic });
  let alts = ctx.kind === 'anime' || !isLatinOrCyrillic(original) ? await altTitles(ctx.kind, movie.id) : undefined;
  let titles = titlesOf(alts);
  const params = firstQuery(movie, ctx, storageField('parse_lang'), titles);
  const lists = [await searchOnce(params, job)];
  let lastDone = Date.now();
  let failed = false;
  if (!cancelled() && lists[0].length < FEW_RESULTS && alts === undefined) {
    alts = await altTitles(ctx.kind, movie.id);
    titles = { ...titlesOf(alts), title: titles.title, original: titles.original };
  }
  for (const q of cancelled() ? [] : followUpQueries(movie, ctx, titles, lists[0].length)) {
    const wait = QUERY_GAP_MS - (Date.now() - lastDone);
    if (wait > 0) await sleep(wait);
    if (cancelled()) break;
    try {
      lists.push(await searchOnce(q, job));
    } catch (e) {
      failed = true;
    }
    lastDone = Date.now();
  }
  const value = { results: mergeResults(...lists), names: titles.names, params };
  // A failed follow-up or a cancelled run is not cached: the next press asks again.
  if (!cancelled() && !failed) resultsCache.set(key, { at: Date.now(), value });
  return value;
}

function addTorrent(result, movie) {
  const L = lampa();
  const req = new Promise((resolve, reject) => {
    L.Torserver.hash(
      {
        title: result.Title,
        link: result.MagnetUri || result.Link,
        poster: movie.img,
        data: { lampa: true, movie },
      },
      (json) => (json && json.hash ? resolve(json.hash) : reject(fail(MSG.torrserver))),
      () => reject(fail(MSG.torrserver, true)),
    );
  });
  return withTimeout(req, HASH_TIMEOUT_MS, MSG.torrserver);
}

// Torserver.files() calls back only once file_stats exist; poll like Lampa does.
function pollFiles(hash, job, maxTries = FILES_TRIES) {
  const L = lampa();
  return new Promise((resolve, reject) => {
    let tries = 0;
    const tick = () => {
      if (job.cancelled) return stop(null);
      if (++tries > maxTries) return stop(fail(MSG.noFiles));
      L.Torserver.files(hash, (json) => {
        if (json && json.file_stats) stop(null, json.file_stats);
      }, () => {});
    };
    const stop = (err, files) => {
      clearInterval(job.timer);
      job.timer = null;
      if (err) reject(err);
      else resolve(files || null);
    };
    job.timer = setInterval(tick, FILES_EVERY_MS);
    tick();
  });
}

const natural = (p) => p.replace(/\d+/g, (m) => (m.length > 3 ? m : ('000' + m).substr(-4)));

// Video files sorted like Lampa does, each with Torserver.parse's view of it.
function parsePlays(files, movie) {
  const L = lampa();
  const plays = L.Torserver.clearFileName(
    files.filter(isVideo).sort((a, b) => natural(a.path).localeCompare(natural(b.path))),
  );
  return plays.map((file) => ({
    file,
    info: L.Torserver.parse({
      movie,
      files: plays,
      filename: file.path_human,
      path: file.path,
      is_file: INDIVIDUAL.includes(ext(file.path)),
    }),
  }));
}

// [{id, season, episode, defaultSeason}] for pickFile(); null if Lampa could not
// parse the list. Without a season marker Lampa assumes season 1 for a serial
// (0 for a non-serial): a second parse as a non-serial tells the guess apart.
export function fileInfos(files, movie) {
  const L = lampa();
  try {
    return parsePlays(files, movie).map(({ file, info }) => {
      const bare = L.Torserver.parse({ movie: { ...movie, number_of_seasons: 0 }, files: [], filename: file.path_human, path: file.path, is_file: true });
      return { id: file.id, season: info.season, episode: info.episode, defaultSeason: !(bare.season > 0) };
    });
  } catch (e) {
    return null;
  }
}

// Playlist items shaped like list() in Lampa's interaction/torrent.js.
// A tracker-season pack (ctx.trackerStart) is renumbered to TMDB's season 1 /
// absolute episodes: Lampa's timeline marks and lh_progress use those.
function buildPlaylist(files, movie, hash, ctx) {
  const L = lampa();
  const tracker = !!ctx && ctx.trackerStart > 0;
  const title = movie.original_title || movie.original_name || '';
  return parsePlays(files, movie).map(({ file, info: parsed }) => {
    let info = parsed;
    if (tracker && info.episode > 0) {
      const episode = absoluteInPack(info.episode, ctx);
      info = { ...info, season: 1, episode, hash: L.Utils.hash(timelineHashString(1, episode, title)) };
    }
    const link = info.by_title && (!info.serial || info.episode) ? L.Timeline.link(movie, info.season, info.episode) : null;
    const timeline = L.Timeline.view(info.hash, link);
    if (movie.runtime) timeline.duration = movie.runtime * 60;
    return {
      id: file.id,
      path: file.path,
      length: file.length,
      season: info.season,
      episode: info.episode,
      title: file.path_human,
      first_title: movie.name || movie.title,
      card: movie,
      url: L.Torserver.stream(file.path, hash, file.id),
      torrent_hash: hash,
      timeline,
      img: './img/img_broken.svg',
    };
  });
}

export function openNativeList(params) {
  const L = lampa();
  L.Activity.push({ url: '', title: L.Lang.translate('title_torrents'), component: 'torrents', ...params });
}

let current = null;
// True while «Играть» (or a play from «Скачанное») is starting.
export const isBusy = () => !!current;
// Card whose episodes the inner player may record into lh_progress.
let playingId = null;

// Lampa's timeline entry of one episode of the card.
function timelineOf(movie) {
  const L = lampa();
  const title = movie.original_title || movie.original_name || '';
  return (season, episode) => {
    const hash = L.Utils.hash(timelineHashString(season, episode, title));
    return L.Timeline.view(hash, L.Timeline.link(movie, season, episode));
  };
}

function isWatchedIn(movie) {
  const view = timelineOf(movie);
  return (season, episode) => {
    const v = view(season, episode);
    return !!v && v.percent >= WATCHED_PERCENT;
  };
}

// A torrent that «Скачанное» keeps must never be dropped from TorrServer.
function dropUnlessPreloaded(hash) {
  if (!hash) return;
  if (store.preload.all().some((e) => e && e.hash === hash)) return;
  lampa().Torserver.drop(hash);
}

// What to play for a card: kind, the full card (movie) and, for series, the next
// episode (ctx) and the TMDB details (tv). Shared by «Играть» and «Скачать заранее».
export async function resolveTarget(card) {
  const first = detectKind(card);
  const { movie, details } = await fullCard(card, first);
  if (first === 'movie') return { kind: first, ctx: { kind: first }, movie, tv: null };
  // List cards (history, bookmarks) may carry no genres: anime or tv by the details.
  const kind = details && Array.isArray(details.genres)
    ? detectKind({
      original_name: movie.original_name,
      origin_country: details.origin_country || movie.origin_country,
      genres: details.genres,
    })
    : first;
  const seasons = (details && details.seasons) || card.seasons || [];
  const progress = store.progress.get(card.id);
  // An episode stopped midway is resumed; otherwise Lampa's own marks win: skip
  // episodes its timeline already has as watched (an external player
  // auto-advancing E1 -> E2 -> E3 reports them there).
  let target = resumeTarget(progress, progress && timelineOf(movie)(progress.season, progress.episode)) ||
    advanceWatched(nextEpisode(progress, seasons), seasons, isWatchedIn(movie));
  // TMDB counts announced episodes too: never go past the last aired one.
  const status = details ? episodeStatus(details, todayIso()) : null;
  if (status && (target.season > status.season || (target.season === status.season && target.episode > status.aired))) {
    if (status.aired >= 1) target = { season: status.season, episode: status.aired };
    else if (progress) target = { season: progress.season, episode: progress.episode };
  }
  let ctx = { kind, season: target.season, episode: target.episode, absolute: absoluteEpisode(seasons, target.season, target.episode) };
  // Single-season anime: the trackers may split it into seasons (TMDB episode
  // group first; without one, inferred from the releases after the search).
  let seasonMap = null;
  if (kind === 'anime' && details && isSingleSeason(details)) {
    seasonMap = await loadSeasonMap(card.id, details);
    if (seasonMap) ctx = withTracker(ctx, seasonMap);
    else {
      const s1 = (details.seasons || []).find((s) => s && s.season_number === 1);
      ctx = { ...ctx, inferTotal: (s1 && s1.episode_count) || (status && status.total) || 0 };
    }
  }
  return { kind, ctx, movie, tv: details, seasonMap };
}

// «Спрашивать серию при запуске» (lh_ask_episode, on by default).
export const asksEpisode = (ctx) => !!ctx && ctx.kind !== 'movie' && storageField('lh_ask_episode') !== false;

// Episode picker for a resolved series target -> the ctx to search for, 'list'
// («Все раздачи») or null (Back). The loader must be stopped before.
export async function chooseEpisode(card, { movie, ctx, tv, seasonMap }) {
  const seasons = (tv && tv.seasons) || card.seasons || [];
  const picked = await askEpisode({
    title: movie.title || movie.name || card.title || card.name || '',
    tv: tv ? { ...tv, id: tv.id != null ? tv.id : card.id } : { id: card.id, seasons },
    target: { season: ctx.season, episode: ctx.episode },
    progress: store.progress.get(card.id),
    view: timelineOf(movie),
    seasonMap,
  });
  if (!picked || picked === 'list') return picked;
  const next = { ...ctx, season: picked.season, episode: picked.episode, absolute: absoluteEpisode(seasons, picked.season, picked.episode) };
  return seasonMap ? withTracker(next, seasonMap) : next;
}

// One play attempt at a time; Back on the loader cancels it (onCancel runs first).
function beginJob(text, onCancel) {
  const L = lampa();
  if (current) return null;
  // loading: the loader is shown (paused while the episode picker is open: a
  // second Loading.stop would toggle a stale controller).
  const job = { cancelled: false, timer: null, hash: null, deadline: null, loading: true };
  current = job;
  const cancel = () => {
    job.cancelled = true;
    onCancel(job);
    job.finish();
  };
  job.pause = () => {
    job.loading = false;
    L.Loading.stop();
  };
  // The loader again after a pause (the episode picker).
  job.restart = (t) => {
    job.loading = true;
    L.Loading.start(cancel, t);
  };
  job.finish = () => {
    if (job.timer) clearInterval(job.timer);
    if (job.deadline) clearTimeout(job.deadline);
    if (current === job) current = null;
    if (job.loading) L.Loading.stop();
    job.loading = false;
  };
  L.Loading.start(cancel, text);
  return job;
}

// Waits for the torrent's files, picks the one to start (ctx.index wins when
// known) and starts the player. Returns 'played', 'cancelled' or 'nofile'.
async function playFiles(job, card, movie, ctx, maxTries, filesText = MSG.files) {
  const L = lampa();
  L.Loading.setText(filesText);
  const files = await pollFiles(job.hash, job, maxTries);
  if (job.cancelled || !files) return 'cancelled';

  const infos = ctx.index != null ? null : fileInfos(files, movie);
  const file = ctx.index != null ? files.find((f) => f.id === ctx.index) : pickFile(files, ctx, infos);
  const playlist = buildPlaylist(files, movie, job.hash, isTrackerPackFile(file, ctx) ? ctx : null);
  const element = file && playlist.find((p) => p.id === file.id);
  if (!element) {
    // The episode before the target is there: the target is just not released yet.
    const prev = ctx.index != null ? null : previousEpisodeCtx(ctx);
    return prev && pickFile(files, prev, infos) ? 'nofile-prev' : 'nofile';
  }

  job.finish();
  // History keeps genre_ids only (Utils.clearCard): notify.js needs them for anime.
  if (movie.id) L.Favorite.add('history', { ...movie, genre_ids: genreIds(movie) }, 100);
  playingId = ctx.kind === 'movie' ? null : card.id;
  const start = { ...element, playlist };
  L.Player.play(start);
  L.Player.playlist(playlist);
  L.Player.callback(() => L.Controller.toggle('content'));
  if (ctx.kind !== 'movie') {
    store.progress.set(card.id, { season: ctx.season, episode: ctx.episode, hash: job.hash });
  }
  return 'played';
}

export async function run(card) {
  const L = lampa();
  if (!card || current) return;
  const job = beginJob(MSG.search, (j) => dropUnlessPreloaded(j.hash));
  const finish = job.finish;

  const kind = detectKind(card);
  let params = buildSearchParams(card, { kind }, storageField('parse_lang'));
  // The parser timeout, TorrServer and several file polls must not add up to
  // minutes: past RUN_TIMEOUT_MS the run stops and the native list opens.
  const arm = () => {
    clearTimeout(job.deadline);
    job.deadline = setTimeout(() => {
      if (current !== job || job.cancelled) return;
      job.cancelled = true;
      dropUnlessPreloaded(job.hash);
      finish();
      L.Noty.show(MSG.timeout);
      openNativeList(params);
    }, RUN_TIMEOUT_MS);
  };
  arm();
  // Picker's early progress write is undone unless the run ends in playback.
  let rollback = null;
  let played = false;
  try {
    const target = await resolveTarget(card);
    const { movie } = target;
    let { ctx } = target;
    if (job.cancelled) return;
    if (asksEpisode(ctx)) {
      // User thinking time does not count against the run's cap.
      clearTimeout(job.deadline);
      job.deadline = null;
      job.pause();
      const picked = await chooseEpisode(card, target);
      if (job.cancelled) return;
      if (!picked || picked === 'list') {
        job.cancelled = true;
        finish();
        if (picked === 'list') openNativeList(buildSearchParams(movie, ctx, storageField('parse_lang')));
        return;
      }
      ctx = picked;
      // Remembered at once: an external player may never report back.
      rollback = { prev: store.progress.get(card.id) };
      store.progress.set(card.id, { season: ctx.season, episode: ctx.episode, hash: null });
      job.restart(MSG.search);
      arm();
    }
    params = buildSearchParams(movie, ctx, storageField('parse_lang'));

    const found = await findReleases(movie, ctx, job);
    if (job.cancelled) return;
    // The native list opens on the query that worked, with Lampa's own card.
    params = { ...params, search: found.params.search };
    ctx = inferTracker(ctx, found.results, found.names);
    const candidates = nextCandidates(selectTorrent(found.results, { ...ctx, names: found.names }).scored);
    if (!candidates.length) {
      finish();
      L.Noty.show(MSG.none);
      return openNativeList(params);
    }

    if (!L.Torserver.url()) throw fail(MSG.noServer, true);
    const n = candidates.length;
    const outcome = await tryCandidates(candidates, async (cand, i) => {
      L.Loading.setText(i === 0 ? MSG.server : MSG.retry(i + 1, n));
      const hash = await addTorrent(cand, movie);
      job.hash = hash;
      if (job.cancelled) {
        dropUnlessPreloaded(hash);
        return 'cancelled';
      }
      return playFiles(job, card, movie, { ...ctx, titleHasSeason: titleHasSeason(cand.Title) },
        i === 0 ? FILES_TRIES : FILES_TRIES_EXTRA, i === 0 ? MSG.files : MSG.filesOf(i + 1, n));
    }, {
      cancelled: () => job.cancelled,
      onMiss: () => {
        dropUnlessPreloaded(job.hash);
        job.hash = null;
      },
    });
    played = outcome === 'played';
    if (outcome === 'played' || outcome === 'cancelled' || job.cancelled) return;
    finish();
    L.Noty.show(outcome === 'nofile-prev' ? MSG.notYet(ctx.episode) : MSG.noFile);
    return openNativeList(params);
  } catch (err) {
    if (job.cancelled) return;
    dropUnlessPreloaded(job.hash);
    finish();
    const msg = err instanceof PlayError ? err.message : MSG.unknown;
    if (!(err instanceof PlayError)) console.error('lampa-home play', err);
    L.Noty.show(msg);
    openNativeList(params);
  } finally {
    if (rollback && !played) {
      const prev = progressAfterOutcome(rollback.prev, null, 'failed');
      if (prev) store.progress.set(card.id, { season: prev.season, episode: prev.episode, hash: prev.hash });
      else store.progress.clear(card.id);
    }
  }
}

// Plays a torrent already in TorrServer (a pre-downloaded one) without searching.
// ctx: {kind, season, episode, absolute, index}. Nothing is dropped from the server.
export async function startFromHash(hash, card, ctx, title) {
  const L = lampa();
  if (!hash || !card || current) return;
  const job = beginJob(MSG.files, () => {});
  job.hash = hash;
  try {
    if (!L.Torserver.url()) throw fail(MSG.noServer, true);
    const kind = (ctx && ctx.kind) || detectKind(card);
    let movie = normalizeTitles(card);
    if (!movie.img && movie.poster_path) movie = { ...movie, img: L.Api.img(movie.poster_path) };
    // Torserver.parse hashes series by title only when the card says it is a serial.
    if (kind !== 'movie' && !movie.number_of_seasons) {
      movie = { ...movie, number_of_seasons: Math.max(1, (ctx && ctx.season) || 1) };
    }
    const outcome = await playFiles(job, card, movie, { kind, ...ctx, titleHasSeason: titleHasSeason(title) });
    if (outcome === 'nofile' || outcome === 'nofile-prev') {
      job.finish();
      L.Noty.show(MSG.noFile);
    }
  } catch (err) {
    if (job.cancelled) return;
    job.finish();
    if (!(err instanceof PlayError)) console.error('lampa-home play', err);
    L.Noty.show(err instanceof PlayError ? err.message : MSG.unknown);
  }
}

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
  row.first().prepend(btn);
}

// Inner player: every started playlist element (incl. switching to the next episode)
// of the series we launched is recorded as progress.
function onPlayerStart(data) {
  if (!playingId || !data || !data.card || data.card.id !== playingId) return;
  if (!data.torrent_hash || !(data.season > 0) || !(data.episode > 0)) return;
  store.progress.set(playingId, { season: data.season, episode: data.episode, hash: data.torrent_hash });
}

export function init() {
  const L = lampa();
  L.Listener.follow('full', (e) => {
    if (e.type == 'complite') addButton(e);
  });
  if (L.Player.listener) L.Player.listener.follow('start', onPlayerStart);
}
