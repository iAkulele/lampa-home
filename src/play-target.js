// What to play for a card: its kind, the full TMDB card, the next episode (or the
// one the user picks) and the tracker-season mapping. Shared by «Играть» and
// «Скачать заранее».
import { lampa, store, storageField } from './lampa.js';
import { episodeStatus, nextEpisode, absoluteEpisode } from './episodes.js';
import { loadTv, todayIso, loadSeasonMap, isSingleSeason } from './tmdb.js';
import { askEpisode } from './episode-picker.js';
import { detectKind, normalizeTitles, withTracker } from './play-pick.js';
import { resumeTarget, advanceWatched, timelineOf, isWatchedIn } from './play-progress.js';

const tmdbDetails = (kind, id) =>
  kind === 'movie'
    ? new Promise((resolve, reject) => lampa().Api.sources.tmdb.get(`movie/${id}`, {}, resolve, reject))
    : loadTv(id);

// The poster as `img` (Torserver.hash and the player read it) when the card has none.
export function withPoster(movie) {
  return !movie.img && movie.poster_path ? { ...movie, img: lampa().Api.img(movie.poster_path) } : movie;
}

// Lampa's parser needs `genres` (full card); list cards (banner, rows) only have genre_ids.
async function fullCard(card, kind) {
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
  return { movie: normalizeTitles(withPoster(movie)), details };
}

// What to play for a card: kind, the full card (movie) and, for series, the next
// episode (ctx) and the TMDB details (tv).
export async function resolveTarget(card) {
  const first = detectKind(card);
  const { movie, details } = await fullCard(card, first);
  if (first === 'movie') {
    const year = Number(String(movie.release_date || '').slice(0, 4)) || 0;
    return { kind: first, ctx: { kind: first, year }, movie, tv: null };
  }
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
