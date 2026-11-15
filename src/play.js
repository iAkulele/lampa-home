// «Играть»: picks a torrent release by rules, sends it to TorrServer and starts
// the player on the right file (next episode for series) with a playlist.
import { lampa, store, storageField } from './lampa.js';
import { LIMITS } from './config.js';
import { selectTorrent, parseTitle } from './torrent-select.js';
import { episodeStatus, nextEpisode, absoluteEpisode, parseEpisode } from './episodes.js';
import { loadTv, todayIso } from './tmdb.js';
import {
  isLatinOrCyrillic, latinAltTitles, queryTitles, firstQuery, secondQuery, needSecond, mergeResults, searchParamsFor,
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

class PlayError extends Error {}
const fail = (msg) => new PlayError(msg);

// ---------- pure helpers ----------

const ext = (path) => String(path || '').split('.').pop().toLowerCase();
const isVideo = (f) => VIDEO.includes(ext(f.path));

// Genre ids of a list card (genre_ids) or a full TMDB card (genres: [{id, name}]).
export function genreIds(card) {
  if (!card) return [];
  if (Array.isArray(card.genre_ids) && card.genre_ids.length) return card.genre_ids;
  return (Array.isArray(card.genres) ? card.genres : []).map((g) => g && g.id).filter((id) => id != null);
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

// files: [{id, path, length}]; infos (optional): [{id, season, episode, defaultSeason}]
// as Lampa's Torserver.parse sees them (it also reads season folders);
// defaultSeason: no season marker in the path, `season` is Lampa's guess.
// Returns the file or null.
export function pickFile(files, ctx, infos) {
  const videos = (files || []).filter(isVideo);
  if (!videos.length) return null;
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

// ctx of the episode before the target in the same season (null for a movie or
// the first episode of a season): a pack holding it means the target is not out yet.
export function previousEpisodeCtx(ctx) {
  if (!ctx || ctx.kind === 'movie' || !(ctx.episode > 1)) return null;
  return { ...ctx, episode: ctx.episode - 1, absolute: ctx.absolute > 1 ? ctx.absolute - 1 : ctx.absolute };
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

// Latin alternative titles of the card (TMDB alternative_titles), cached per card; [] on failure.
function altTitles(kind, id) {
  if (id == null) return Promise.resolve([]);
  const key = (kind === 'movie' ? 'movie/' : 'tv/') + id;
  if (altCache.has(key)) return Promise.resolve(altCache.get(key));
  const req = new Promise((resolve, reject) => {
    lampa().Api.sources.tmdb.get(key + '/alternative_titles', {}, resolve, reject);
  });
  return withTimeout(req, ALT_TIMEOUT_MS, MSG.parser).then(
    (json) => {
      const list = latinAltTitles(json);
      altCache.set(key, list);
      return list;
    },
    () => [],
  );
}

const resultsCache = new Map();

// Parser results for the target: Q1 by the (short) RU title; Q2 by the Latin
// alternative title for anime or when Q1 found little, at least 1.2 s later.
// -> {results, names (for selectTorrent's relevance check), params (Q1)}.
export async function findReleases(movie, ctx, job) {
  const key = [movie.id, ctx.kind, ctx.season].join(':');
  const hit = resultsCache.get(key);
  if (hit && Date.now() - hit.at < RESULTS_TTL_MS) return hit.value;

  const original = movie.original_title || movie.original_name || '';
  let alts = ctx.kind === 'anime' || !isLatinOrCyrillic(original) ? await altTitles(ctx.kind, movie.id) : null;
  let titles = queryTitles(movie, alts || []);
  const params = firstQuery(movie, ctx, storageField('parse_lang'), titles);
  const first = await searchOnce(params, job);
  const firstDone = Date.now();
  let second = [];
  if (!(job && job.cancelled) && needSecond(ctx.kind, first.length)) {
    if (!alts) {
      alts = await altTitles(ctx.kind, movie.id);
      titles = { ...queryTitles(movie, alts), title: titles.title, original: titles.original };
    }
    const q2 = secondQuery(movie, ctx, titles);
    if (q2) {
      const wait = QUERY_GAP_MS - (Date.now() - firstDone);
      if (wait > 0) await sleep(wait);
      if (!(job && job.cancelled)) second = await searchOnce(q2, job).catch(() => []);
    }
  }
  const value = { results: mergeResults(first, second), names: titles.names, params };
  if (!(job && job.cancelled)) resultsCache.set(key, { at: Date.now(), value });
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
      () => reject(fail(MSG.torrserver)),
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
function buildPlaylist(files, movie, hash) {
  const L = lampa();
  return parsePlays(files, movie).map(({ file, info }) => {
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

function openNativeList(params) {
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
  const ctx = { kind, season: target.season, episode: target.episode, absolute: absoluteEpisode(seasons, target.season, target.episode) };
  return { kind, ctx, movie, tv: details };
}

// One play attempt at a time; Back on the loader cancels it (onCancel runs first).
function beginJob(text, onCancel) {
  const L = lampa();
  if (current) return null;
  const job = { cancelled: false, timer: null, hash: null, deadline: null };
  current = job;
  job.finish = () => {
    if (job.timer) clearInterval(job.timer);
    if (job.deadline) clearTimeout(job.deadline);
    if (current === job) current = null;
    L.Loading.stop();
  };
  L.Loading.start(() => {
    job.cancelled = true;
    onCancel(job);
    job.finish();
  }, text);
  return job;
}

// Waits for the torrent's files, picks the one to start (ctx.index wins when
// known) and starts the player. Returns 'played', 'cancelled' or 'nofile'.
async function playFiles(job, card, movie, ctx, maxTries) {
  const L = lampa();
  L.Loading.setText(MSG.files);
  const files = await pollFiles(job.hash, job, maxTries);
  if (job.cancelled || !files) return 'cancelled';

  const playlist = buildPlaylist(files, movie, job.hash);
  const infos = ctx.index != null ? null : fileInfos(files, movie);
  const file = ctx.index != null ? files.find((f) => f.id === ctx.index) : pickFile(files, ctx, infos);
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
  job.deadline = setTimeout(() => {
    if (current !== job || job.cancelled) return;
    job.cancelled = true;
    dropUnlessPreloaded(job.hash);
    finish();
    L.Noty.show(MSG.timeout);
    openNativeList(params);
  }, RUN_TIMEOUT_MS);
  try {
    const { movie, ctx } = await resolveTarget(card);
    if (job.cancelled) return;
    params = buildSearchParams(movie, ctx, storageField('parse_lang'));

    const found = await findReleases(movie, ctx, job);
    if (job.cancelled) return;
    // The native list opens on the query that worked, with Lampa's own card.
    params = { ...params, search: found.params.search };
    const candidates = nextCandidates(selectTorrent(found.results, { ...ctx, names: found.names }).scored);
    if (!candidates.length) {
      finish();
      L.Noty.show(MSG.none);
      return openNativeList(params);
    }

    if (!L.Torserver.url()) throw fail(MSG.noServer);
    // Ongoing shows: the best pack may stop one episode short, or the episode
    // sits in another release. Try the next ones before giving up.
    let prevSeen = false;
    for (let i = 0; i < candidates.length; i++) {
      const cand = candidates[i];
      L.Loading.setText(i === 0 ? MSG.server : MSG.retry(i + 1, candidates.length));
      let outcome;
      try {
        const hash = await addTorrent(cand, movie);
        job.hash = hash;
        if (job.cancelled) return dropUnlessPreloaded(hash);
        outcome = await playFiles(job, card, movie, { ...ctx, titleHasSeason: titleHasSeason(cand.Title) },
          i === 0 ? FILES_TRIES : FILES_TRIES_EXTRA);
      } catch (err) {
        // The first release's errors stop the run as before; a later one just did not work out.
        if (i === 0 || job.cancelled || !(err instanceof PlayError)) throw err;
        outcome = 'nofile';
      }
      if (outcome === 'played' || outcome === 'cancelled' || job.cancelled) return;
      if (outcome === 'nofile-prev') prevSeen = true;
      dropUnlessPreloaded(job.hash);
      job.hash = null;
    }
    finish();
    L.Noty.show(prevSeen ? MSG.notYet(ctx.episode) : MSG.noFile);
    return openNativeList(params);
  } catch (err) {
    if (job.cancelled) return;
    dropUnlessPreloaded(job.hash);
    finish();
    const msg = err instanceof PlayError ? err.message : MSG.unknown;
    if (!(err instanceof PlayError)) console.error('lampa-home play', err);
    L.Noty.show(msg);
    openNativeList(params);
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
    if (!L.Torserver.url()) throw fail(MSG.noServer);
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
