// Watch progress for «Играть»: Lampa's timeline marks (what is watched, what to
// resume) and lh_progress written while our inner-player playlist runs.
import { lampa, store } from './lampa.js';
import { nextEpisode } from './episodes.js';
import { originalTitle } from './play-pick.js';

const WATCHED_PERCENT = 85;

// Same string Lampa hashes for a serial's torrent file (utils/episodes_parser.js, by_title).
export function timelineHashString(season, episode, original) {
  return [season, season > 10 ? ':' : '', episode, original].join('');
}

// Lampa's timeline entry of the stored episode: still unfinished -> play it again.
export function resumeTarget(progress, view) {
  if (!progress || !view) return null;
  if (!(view.time > 0) || !(view.percent < WATCHED_PERCENT)) return null;
  return { season: progress.season, episode: progress.episode };
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

// Progress the picker wrote early: kept only if playback started, else the previous value
// comes back (null = nothing was stored). outcome: 'played' or anything else.
export function progressAfterOutcome(prev, picked, outcome) {
  return outcome === 'played' ? picked : prev;
}

// Lampa's timeline entry of one episode of the card.
export function timelineOf(movie) {
  const L = lampa();
  const title = originalTitle(movie);
  return (season, episode) => {
    const hash = L.Utils.hash(timelineHashString(season, episode, title));
    return L.Timeline.view(hash, L.Timeline.link(movie, season, episode));
  };
}

export function isWatchedIn(movie) {
  const view = timelineOf(movie);
  return (season, episode) => {
    const v = view(season, episode);
    return !!v && v.percent >= WATCHED_PERCENT;
  };
}

// Card whose episodes the inner player may record into lh_progress (null: a movie).
let playingId = null;
export function setPlaying(cardId) {
  playingId = cardId;
}

// Inner player: every started playlist element (incl. switching to the next episode)
// of the series we launched is recorded as progress.
export function onPlayerStart(data) {
  if (!playingId || !data || !data.card || data.card.id !== playingId) return;
  if (!data.torrent_hash || !(data.season > 0) || !(data.episode > 0)) return;
  store.progress.set(playingId, { season: data.season, episode: data.episode, hash: data.torrent_hash });
}
