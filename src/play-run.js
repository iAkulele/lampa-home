// «Играть»: picks a torrent release by rules, sends it to TorrServer and starts
// the player on the right file (next episode for series) with a playlist.
import { lampa, store, storageField } from './lampa.js';
import { selectTorrent } from './torrent-select.js';
import { queryTitles, firstQuery } from './search-query.js';
import { PlayError, fail } from './play-error.js';
import { detectKind, genreIds, normalizeTitles, titleHasSeason, releaseLabel, pickFile, packNumbering, previousEpisodeCtx, inferTracker } from './play-pick.js';
import { listParams, findReleases, openNativeList } from './play-search.js';
import { addTorrent, pollFiles, fileInfos, buildPlaylist, dropUnlessPreloaded, FILES_TRIES } from './play-torrserver.js';
import { resolveTarget, asksEpisode, chooseEpisode, withPoster } from './play-target.js';
import { setPlaying } from './play-progress.js';
import { nextCandidates, tryCandidates } from './play-candidates.js';
import { beginJob, isBusy } from './play-job.js';

// Extra candidates get a shorter wait for their file list (10 × 2 s).
const FILES_TRIES_EXTRA = 10;
// Whole «Играть» run (search + every candidate) never keeps the loader longer.
const RUN_TIMEOUT_MS = 90000;

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
  noServer: 'TorrServer не настроен',
  unknown: 'Не удалось запустить раздачу',
  starting: (label) => `Запускаю: ${label}`,
};

// A PlayError's own text; anything else is unexpected and logged.
function showError(err) {
  if (!(err instanceof PlayError)) console.error('lampa-home play', err);
  lampa().Noty.show(err instanceof PlayError ? err.message : MSG.unknown);
}

// Manual choice: Lampa's own torrent list with our search query (long press on
// «Играть» or «Выбрать раздачу вручную» in the card's «...» menu).
export function chooseManually(card) {
  if (!card || isBusy()) return;
  const kind = detectKind(card);
  // The same first query «Играть» sends: short RU title, never a CJK original.
  const titles = queryTitles(normalizeTitles(card), [], { kind });
  openNativeList(firstQuery(card, { kind }, storageField('parse_lang'), titles));
}

// Waits for the torrent's files, picks the one to start (ctx.index wins when
// known) and starts the player. Returns 'played', 'cancelled', 'nofile' or
// 'nofile-prev' (the episode before the target is there).
async function playFiles(job, card, movie, ctx, maxTries, filesText = MSG.files) {
  const L = lampa();
  L.Loading.setText(filesText);
  const files = await pollFiles(job.hash, job, maxTries);
  if (job.cancelled || !files) return 'cancelled';

  const infos = ctx.index != null ? null : fileInfos(files, movie);
  const file = ctx.index != null ? files.find((f) => f.id === ctx.index) : pickFile(files, ctx, infos);
  const playlist = buildPlaylist(files, movie, job.hash, file && packNumbering(files, ctx) === 'season' ? ctx : null);
  const element = file && playlist.find((p) => p.id === file.id);
  if (!element) {
    // The episode before the target is there: the target is just not released yet.
    const prev = ctx.index != null ? null : previousEpisodeCtx(ctx);
    return prev && pickFile(files, prev, infos) ? 'nofile-prev' : 'nofile';
  }

  job.finish();
  // History keeps genre_ids only (Utils.clearCard): notify.js needs them for anime.
  if (movie.id) L.Favorite.add('history', { ...movie, genre_ids: genreIds(movie) }, 100);
  setPlaying(ctx.kind === 'movie' ? null : card.id);
  const start = { ...element, playlist };
  L.Player.play(start);
  L.Player.playlist(playlist);
  L.Player.callback(() => L.Controller.toggle('content'));
  if (job.pick) L.Noty.show(MSG.starting(releaseLabel(job.pick)));
  if (ctx.kind !== 'movie') {
    store.progress.set(card.id, { season: ctx.season, episode: ctx.episode, hash: job.hash });
  }
  return 'played';
}

export async function run(card) {
  const L = lampa();
  if (!card || isBusy()) return;
  const job = beginJob(MSG.search, (j) => dropUnlessPreloaded(j.hash));
  const finish = job.finish;

  const kind = detectKind(card);
  let params = listParams(card, { kind });
  // The parser timeout, TorrServer and several file polls must not add up to
  // minutes: past RUN_TIMEOUT_MS the run stops and the native list opens.
  const arm = () => {
    clearTimeout(job.deadline);
    job.deadline = setTimeout(() => {
      if (!job.isCurrent() || job.cancelled) return;
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
        if (picked === 'list') openNativeList(listParams(movie, ctx));
        return;
      }
      ctx = picked;
      // Remembered at once: an external player may never report back.
      rollback = { prev: store.progress.get(card.id) };
      store.progress.set(card.id, { season: ctx.season, episode: ctx.episode, hash: null });
      job.restart(MSG.search);
      arm();
    }
    params = listParams(movie, ctx);

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
      job.pick = cand;
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
    showError(err);
    openNativeList(params);
  } finally {
    if (rollback && !played) {
      // The previous value comes back (null: nothing was stored).
      const { prev } = rollback;
      if (prev) store.progress.set(card.id, { season: prev.season, episode: prev.episode, hash: prev.hash });
      else store.progress.clear(card.id);
    }
  }
}

// Plays a torrent already in TorrServer (a pre-downloaded one) without searching.
// ctx: {kind, season, episode, absolute, index}. Nothing is dropped from the server.
export async function startFromHash(hash, card, ctx, title) {
  const L = lampa();
  if (!hash || !card || isBusy()) return;
  const job = beginJob(MSG.files, () => {});
  job.hash = hash;
  try {
    if (!L.Torserver.url()) throw fail(MSG.noServer, true);
    const kind = (ctx && ctx.kind) || detectKind(card);
    let movie = withPoster(normalizeTitles(card));
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
    showError(err);
  }
}
