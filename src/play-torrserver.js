// «Играть» on TorrServer through Lampa's Torserver API: add a release, wait for
// its file list, read the files as Lampa does and build the player's playlist.
import { lampa, store } from './lampa.js';
import { ext, isVideo, absoluteInPack, originalTitle } from './play-pick.js';
import { timelineHashString } from './play-progress.js';
import { fail, withTimeout } from './play-error.js';

const INDIVIDUAL = ['vob', 'm2ts'];
const FILES_EVERY_MS = 2000;
export const FILES_TRIES = 20;
const HASH_TIMEOUT_MS = 20000;

const MSG = {
  torrserver: 'TorrServer недоступен',
  noFiles: 'TorrServer не получил список файлов',
};

export function addTorrent(result, movie) {
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
// Resolves null when the job is cancelled.
export function pollFiles(hash, job, maxTries = FILES_TRIES) {
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

// A torrent that «Скачанное» keeps must never be dropped from TorrServer.
export function dropUnlessPreloaded(hash) {
  if (!hash) return;
  if (store.preload.all().some((e) => e && e.hash === hash)) return;
  lampa().Torserver.drop(hash);
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
// A per-season numbered tracker pack (ctx given) is renumbered to TMDB's season
// 1 / absolute episodes: Lampa's timeline marks and lh_progress use those. Only
// files of the tracker season or without a season marker (Lampa's default):
// other folders of a multi-season pack keep Lampa's numbers.
export function buildPlaylist(files, movie, hash, ctx) {
  const L = lampa();
  const tracker = !!ctx && ctx.trackerStart > 0;
  const defaults = new Set(tracker ? (fileInfos(files, movie) || []).filter((i) => i.defaultSeason).map((i) => i.id) : []);
  const title = originalTitle(movie);
  return parsePlays(files, movie).map(({ file, info: parsed }) => {
    let info = parsed;
    if (tracker && info.episode > 0 && (info.season === ctx.trackerSeason || defaults.has(file.id))) {
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
