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

function searchTorrents(params) {
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

export async function run(card) {
  const L = lampa();
  if (!card || current) return;
  const job = { cancelled: false, timer: null, hash: null };
  current = job;

  const finish = () => {
    if (job.timer) clearInterval(job.timer);
    if (current === job) current = null;
    L.Loading.stop();
  };
  L.Loading.start(() => {
    job.cancelled = true;
    if (job.hash) L.Torserver.drop(job.hash);
    finish();
  }, MSG.search);

  const kind = detectKind(card);
  let params = buildSearchParams(card, { kind }, storageField('parse_lang'));
  try {
    const { movie, details } = await fullCard(card, kind);
    if (job.cancelled) return;
    let ctx = { kind };
    if (kind !== 'movie') {
      const seasons = (details && details.seasons) || card.seasons || [];
      const progress = store.progress.get(card.id);
      let target = nextEpisode(progress, seasons);
      // TMDB counts announced episodes too: never go past the last aired one.
      const status = details ? episodeStatus(details, todayIso()) : null;
      if (progress && status && (target.season > status.season || (target.season === status.season && target.episode > status.aired))) {
        target = { season: progress.season, episode: progress.episode };
      }
      ctx = { kind, season: target.season, episode: target.episode, absolute: absoluteEpisode(seasons, target.season, target.episode) };
    }
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
    L.Loading.setText(MSG.files);
    const files = await pollFiles(job.hash, job);
    if (job.cancelled || !files) return;

    const playlist = buildPlaylist(files, movie, job.hash);
    const file = pickFile(files, ctx);
    const element = file && playlist.find((p) => p.id === file.id);
    if (!element) {
      console.log('lampa-home', 'no file for', ctx, files.map((f) => f.path));
      L.Torserver.drop(job.hash);
      finish();
      L.Noty.show(MSG.noFile);
      return openNativeList(params);
    }

    finish();
    if (movie.id) L.Favorite.add('history', movie, 100);
    const start = { ...element, playlist };
    L.Player.play(start);
    L.Player.playlist(playlist);
    L.Player.callback(() => L.Controller.toggle('content'));
    if (kind !== 'movie') {
      store.progress.set(card.id, { season: ctx.season, episode: ctx.episode, hash: job.hash });
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

export function init() {
  lampa().Listener.follow('full', (e) => {
    if (e.type == 'complite') addButton(e);
  });
}
