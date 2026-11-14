// «Играть»: picks a torrent release by rules, sends it to TorrServer and starts
// the player on the right file (next episode for series) with a playlist.
import { lampa, store, storageField } from './lampa.js';
import { LIMITS } from './config.js';
import { selectTorrent, parseTitle } from './torrent-select.js';
import { episodeStatus, nextEpisode, absoluteEpisode, parseEpisode } from './episodes.js';
import { loadTv, todayIso } from './tmdb.js';

const ANIMATION = 16;
// Same list as Lampa's interaction/torrent.js.
const VIDEO = ['asf', 'wmv', 'divx', 'avi', 'mp4', 'm4v', 'mov', '3gp', '3g2', 'mkv', 'trp', 'tp', 'mts', 'mpg', 'mpeg', 'dat', 'vob', 'rm', 'rmvb', 'm2ts', 'ts'];
const INDIVIDUAL = ['vob', 'm2ts'];
const FILES_EVERY_MS = 2000;
const WATCHED_PERCENT = 85;
const FILES_TRIES = 45;
const HASH_TIMEOUT_MS = 20000;

const MSG = {
  search: 'Ищу раздачу…',
  server: 'Отправляю в TorrServer…',
  files: 'Жду список файлов…',
  none: 'Подходящей раздачи не нашёл, выберите вручную',
  noFile: 'Нужной серии в раздаче не нашёл, выберите вручную',
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

// files: [{id, path, length}]; infos (optional): [{id, season, episode}] as Lampa's
// Torserver.parse sees them (it also reads season folders). Returns the file or null.
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
  let ambiguous = false;
  for (const n of numbers) {
    if (n == null) continue;
    const hits = bare.filter(({ ep }) => ep.absolute === n);
    if (hits.length === 1) return hits[0].f;
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

// Mirrors Lampa's components/full/start/torrents.js.
export function buildSearchParams(card, ctx, parseLang) {
  const title = card.title || card.name || '';
  const original = card.original_title || card.original_name || title;
  const year = String(card.first_air_date || card.release_date || '0000').slice(0, 4);
  const combinations = {
    df: original,
    df_year: original + ' ' + year,
    df_lg: original + ' ' + title,
    df_lg_year: original + ' ' + title + ' ' + year,
    lg: title,
    lg_year: title + ' ' + year,
    lg_df: title + ' ' + original,
    lg_df_year: title + ' ' + original + ' ' + year,
  };
  const s = ctx && ctx.kind !== 'movie' && Number.isInteger(ctx.season) && ctx.season >= 0 ? ctx.season : null;
  const season = s == null ? '' : ' S' + (s < 10 ? '0' : '') + s;
  return {
    search: (combinations[parseLang] || original || title) + season,
    search_one: title + season,
    search_two: original + season,
    movie: card,
    page: 1,
  };
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
function pollFiles(hash, job) {
  const L = lampa();
  return new Promise((resolve, reject) => {
    let tries = 0;
    const tick = () => {
      if (job.cancelled) return stop(null);
      if (++tries > FILES_TRIES) return stop(fail(MSG.noFiles));
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

// [{id, season, episode}] for pickFile(); null if Lampa could not parse the list.
export function fileInfos(files, movie) {
  try {
    return parsePlays(files, movie).map(({ file, info }) => ({ id: file.id, season: info.season, episode: info.episode }));
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
  const job = { cancelled: false, timer: null, hash: null };
  current = job;
  job.finish = () => {
    if (job.timer) clearInterval(job.timer);
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
async function playFiles(job, card, movie, ctx) {
  const L = lampa();
  L.Loading.setText(MSG.files);
  const files = await pollFiles(job.hash, job);
  if (job.cancelled || !files) return 'cancelled';

  const playlist = buildPlaylist(files, movie, job.hash);
  const file = ctx.index != null ? files.find((f) => f.id === ctx.index) : pickFile(files, ctx, playlist);
  const element = file && playlist.find((p) => p.id === file.id);
  if (!element) return 'nofile';

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
  try {
    const { movie, ctx } = await resolveTarget(card);
    if (job.cancelled) return;
    params = buildSearchParams(movie, ctx, storageField('parse_lang'));

    const results = await searchTorrents(params);
    if (job.cancelled) return;
    const { chosen } = selectTorrent(results, ctx);
    if (!chosen) {
      finish();
      L.Noty.show(MSG.none);
      return openNativeList(params);
    }

    if (!L.Torserver.url()) throw fail(MSG.noServer);
    L.Loading.setText(MSG.server);
    job.hash = await addTorrent(chosen, movie);
    if (job.cancelled) return dropUnlessPreloaded(job.hash);
    const outcome = await playFiles(job, card, movie, { ...ctx, titleHasSeason: titleHasSeason(chosen.Title) });
    if (outcome === 'nofile') {
      dropUnlessPreloaded(job.hash);
      finish();
      L.Noty.show(MSG.noFile);
      return openNativeList(params);
    }
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
    if (outcome === 'nofile') {
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
