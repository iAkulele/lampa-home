// «Играть»: picks a torrent release by rules, sends it to TorrServer and starts
// the player on the right file (next episode for series) with a playlist.
import { lampa, store, storageField } from './lampa.js';
import { LIMITS } from './config.js';
import { selectTorrent } from './torrent-select.js';
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

export function detectKind(card) {
  if (!card || !card.original_name) return 'movie';
  const genres = card.genre_ids || (card.genres || []).map((g) => g && g.id);
  const jp = (card.origin_country || []).includes('JP');
  return jp && genres.includes(ANIMATION) ? 'anime' : 'tv';
}

// files: [{id, path, length}]; returns the file to start or null.
export function pickFile(files, ctx) {
  const videos = (files || []).filter(isVideo);
  if (!videos.length) return null;
  if (ctx.kind === 'movie') {
    return videos.reduce((best, f) => ((f.length || 0) > (best.length || 0) ? f : best));
  }
  const parsed = videos.map((f) => ({ f, ep: parseEpisode(f.path) }));
  const bySxe = parsed.find(({ ep }) => ep.season != null && ep.season === ctx.season && ep.episode === ctx.episode);
  if (bySxe) return bySxe.f;
  const bare = parsed.filter(({ ep }) => ep.season == null && ep.absolute != null);
  // Absolute numbering first (anime packs), then per-season numbering of a season pack.
  const byAbs = bare.find(({ ep }) => ctx.absolute != null && ep.absolute === ctx.absolute) ||
    bare.find(({ ep }) => ep.absolute === ctx.episode);
  if (byAbs) return byAbs.f;
  // A single-episode release: selectTorrent already matched the episode by title.
  return videos.length === 1 && parsed[0].ep.episode == null ? videos[0] : null;
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
  return { movie, details };
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

// Playlist items shaped like list() in Lampa's interaction/torrent.js.
function buildPlaylist(files, movie, hash) {
  const L = lampa();
  const plays = L.Torserver.clearFileName(
    files.filter(isVideo).sort((a, b) => natural(a.path).localeCompare(natural(b.path))),
  );
  return plays.map((file) => {
    const info = L.Torserver.parse({
      movie,
      files: plays,
      filename: file.path_human,
      path: file.path,
      is_file: INDIVIDUAL.includes(ext(file.path)),
    });
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
// Card whose episodes the inner player may record into lh_progress.
let playingId = null;

function isWatchedIn(movie) {
  const L = lampa();
  const title = movie.original_title || movie.original_name || '';
  return (season, episode) => {
    const hash = L.Utils.hash(timelineHashString(season, episode, title));
    const view = L.Timeline.view(hash, L.Timeline.link(movie, season, episode));
    return !!view && view.percent >= WATCHED_PERCENT;
  };
}

// What to play for a card: kind, the full card (movie) and, for series, the next
// episode (ctx) and the TMDB details (tv). Shared by «Играть» and «Скачать заранее».
export async function resolveTarget(card) {
  const kind = detectKind(card);
  const { movie, details } = await fullCard(card, kind);
  if (kind === 'movie') return { kind, ctx: { kind }, movie, tv: null };
  const seasons = (details && details.seasons) || card.seasons || [];
  const progress = store.progress.get(card.id);
  // Lampa's own marks win: skip episodes its timeline already has as watched
  // (an external player auto-advancing E1 -> E2 -> E3 reports them there).
  let target = advanceWatched(nextEpisode(progress, seasons), seasons, isWatchedIn(movie));
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
  const file = ctx.index != null ? files.find((f) => f.id === ctx.index) : pickFile(files, ctx);
  const element = file && playlist.find((p) => p.id === file.id);
  if (!element) {
    console.log('lampa-home', 'no file for', ctx, files.map((f) => f.path));
    return 'nofile';
  }

  job.finish();
  if (movie.id) L.Favorite.add('history', movie, 100);
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
  const job = beginJob(MSG.search, (j) => {
    if (j.hash) L.Torserver.drop(j.hash);
  });
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

    console.log('lampa-home', 'play', ctx, chosen.Title);
    if (!L.Torserver.url()) throw fail(MSG.noServer);
    L.Loading.setText(MSG.server);
    job.hash = await addTorrent(chosen, movie);
    if (job.cancelled) return L.Torserver.drop(job.hash);
    const outcome = await playFiles(job, card, movie, ctx);
    if (outcome === 'nofile') {
      L.Torserver.drop(job.hash);
      finish();
      L.Noty.show(MSG.noFile);
      return openNativeList(params);
    }
  } catch (err) {
    if (job.cancelled) return;
    if (job.hash) L.Torserver.drop(job.hash);
    finish();
    const msg = err instanceof PlayError ? err.message : MSG.unknown;
    if (!(err instanceof PlayError)) console.error('lampa-home play', err);
    L.Noty.show(msg);
    openNativeList(params);
  }
}

// Plays a torrent already in TorrServer (a pre-downloaded one) without searching.
// ctx: {kind, season, episode, absolute, index}. Nothing is dropped from the server.
export async function startFromHash(hash, card, ctx) {
  const L = lampa();
  if (!hash || !card || current) return;
  const job = beginJob(MSG.files, () => {});
  job.hash = hash;
  try {
    if (!L.Torserver.url()) throw fail(MSG.noServer);
    let movie = card;
    if (!movie.img && movie.poster_path) movie = { ...movie, img: L.Api.img(movie.poster_path) };
    const outcome = await playFiles(job, card, movie, { kind: detectKind(card), ...ctx });
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

function addButton(e) {
  const card = e.data && e.data.movie;
  if (!card || !e.body) return;
  let row = e.body.find('.full-start-new__buttons');
  if (!row.length) row = e.body.find('.full-start__buttons');
  if (!row.length || row.find('.lh-play').length) return;
  const btn = $('<div class="full-start__button selector lh-play"><span>Играть</span></div>');
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
