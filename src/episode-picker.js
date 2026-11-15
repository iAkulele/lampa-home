// Episode picker before «Играть» / «Скачать заранее» on a series: «Продолжить»
// with the computed episode, the aired episodes of its season with watched marks,
// another season and the native torrents list.
import { lampa, tmdbGet } from './lampa.js';
import { episodeStatus } from './episodes.js';
import { todayIso } from './tmdb.js';

const WATCHED_PERCENT = 85;
const SEASON_TIMEOUT_MS = 5000;

// ---------- pure helpers ----------

// YYYY-MM-DD -> DD.MM.YYYY ('' when unknown).
export function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? `${m[3]}.${m[2]}.${m[1]}` : '';
}

const isAired = (ep, today) => ep.aired === true || (!!ep.air_date && (!today || ep.air_date <= today));

// Episodes 1..count without names (TMDB season not loaded), aired by construction.
export function fallbackEpisodes(season, count) {
  const out = [];
  for (let n = 1; n <= count; n++) out.push({ episode_number: n, season_number: season, name: '', air_date: null, aired: true });
  return out;
}

// Watched episodes of `season` (numbers): Lampa's timeline at 85 % or more, or
// lh_progress says a later episode was started.
export function watchedEpisodes(season, numbers, progress, view) {
  const out = new Set();
  for (const n of numbers || []) {
    const later = !!progress && (progress.season > season || (progress.season === season && progress.episode > n));
    const v = view ? view(season, n) : null;
    if (later || (v && v.percent >= WATCHED_PERCENT)) out.add(n);
  }
  return out;
}

// {episode: percent} of episodes started but not finished (timeline time > 0, < 85 %).
export function inProgressEpisodes(season, numbers, view) {
  const out = {};
  for (const n of numbers || []) {
    const v = view ? view(season, n) : null;
    if (v && v.time > 0 && v.percent < WATCHED_PERCENT) out[n] = v.percent;
  }
  return out;
}

const episodeTitle = (ep) => `Серия ${ep.episode_number}` + (ep.name ? ` — ${ep.name}` : '');

// -> [{title, subtitle, season, episode, kind, selected}]; kind: 'continue' (the
// computed target, selected), 'episode', 'season' (another season), 'list' (native list).
export function pickerItems({ season, target, episodes, watchedSet, inProgress, today, seasonsCount = 1 }) {
  const aired = (episodes || []).filter((ep) => ep && ep.episode_number > 0 && isAired(ep, today));
  const watched = watchedSet || new Set();
  const progress = inProgress || {};
  const items = [];
  if (target && target.season === season) {
    const ep = aired.find((e) => e.episode_number === target.episode);
    items.push({
      title: `Продолжить: серия ${target.episode}`, subtitle: (ep && ep.name) || '',
      season, episode: target.episode, kind: 'continue', selected: true,
    });
  }
  for (const ep of aired) {
    const n = ep.episode_number;
    let prefix = '';
    if (progress[n] != null) prefix = `▶ ${Math.max(1, Math.round(progress[n]))}% `;
    else if (watched.has(n)) prefix = '✓ ';
    items.push({
      title: prefix + episodeTitle(ep), subtitle: formatDate(ep.air_date),
      season, episode: n, kind: 'episode', selected: false,
    });
  }
  if (seasonsCount > 1) items.push({ title: 'Другой сезон…', subtitle: '', season, episode: null, kind: 'season', selected: false });
  items.push({ title: 'Все раздачи', subtitle: '', season, episode: null, kind: 'list', selected: false });
  return items;
}

// Seasons that have started airing: [{title, subtitle, season, selected}].
export function seasonItems(tv, current, today) {
  const status = tv ? episodeStatus(tv, today) : null;
  return ((tv && tv.seasons) || [])
    .filter((s) => s && s.season_number > 0 && s.episode_count > 0)
    .filter((s) => (s.air_date ? s.air_date <= today : !status || s.season_number <= status.season))
    .filter((s) => !status || s.season_number <= status.season)
    .sort((a, b) => a.season_number - b.season_number)
    .map((s) => ({
      title: `Сезон ${s.season_number}`, subtitle: formatDate(s.air_date),
      season: s.season_number, selected: s.season_number === current,
    }));
}

// Episodes of a season known to have aired when TMDB's season list is missing.
function airedCount(tv, season, today) {
  const s = ((tv && tv.seasons) || []).find((x) => x && x.season_number === season);
  const status = tv ? episodeStatus(tv, today) : null;
  if (status && season === status.season) return status.aired;
  if (status && season > status.season) return 0;
  return s ? s.episode_count : 0;
}

// ---------- Lampa side ----------

const seasonCache = new Map();

// TMDB tv/{id}/season/{n} episodes, cached for the session; fallback without names.
function seasonEpisodes(tv, season, today) {
  const key = tv.id + ':' + season;
  if (seasonCache.has(key)) return Promise.resolve(seasonCache.get(key));
  const fallback = () => fallbackEpisodes(season, airedCount(tv, season, today));
  let timer;
  const req = new Promise((resolve, reject) => {
    timer = setTimeout(reject, SEASON_TIMEOUT_MS);
    tmdbGet(`tv/${tv.id}/season/${season}`, {}, resolve, reject);
  });
  return req.then(
    (json) => {
      const eps = (json && Array.isArray(json.episodes)) ? json.episodes : null;
      if (!eps || !eps.length) return fallback();
      seasonCache.set(key, eps);
      return eps;
    },
    fallback,
  ).finally(() => clearTimeout(timer));
}

// Shows the picker. opts: {title (show name), tv, target {season, episode},
// progress (lh_progress of the card), view(season, episode) -> Lampa timeline}.
// Resolves {season, episode}, 'list' («Все раздачи») or null (Back).
export function askEpisode({ title, tv, target, progress, view }) {
  const L = lampa();
  const today = todayIso();
  // Opened from the card's «...» menu the enabled one is that (closed) select.
  const name = L.Controller.enabled().name;
  const enabled = !name || name === 'select' || name === 'loading' ? 'content' : name;
  const seasons = tv ? seasonItems(tv, target.season, today) : [];
  return new Promise((resolve) => {
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      L.Controller.toggle(enabled);
      resolve(value);
    };

    const showSeasons = (current) => {
      L.Select.show({
        title: title || 'Сезон',
        items: seasonItems(tv, current, today),
        onSelect: (a) => showEpisodes(a.season, false),
        onBack: () => showEpisodes(current, current === target.season),
      });
    };

    function showEpisodes(season, withTarget) {
      seasonEpisodes(tv || { id: 0 }, season, today).then((episodes) => {
        if (done) return;
        const numbers = episodes.map((e) => e.episode_number);
        const items = pickerItems({
          season,
          target: withTarget ? target : null,
          episodes,
          watchedSet: watchedEpisodes(season, numbers, progress, view),
          inProgress: inProgressEpisodes(season, numbers, view),
          today,
          seasonsCount: seasons.length,
        });
        L.Select.show({
          title: `${title ? title + ' · ' : ''}Сезон ${season}`,
          items,
          onSelect: (a) => {
            if (a.kind === 'season') return showSeasons(season);
            if (a.kind === 'list') return finish('list');
            finish({ season: a.season, episode: a.episode });
          },
          // Back from another season returns to the target's season first.
          onBack: () => (season === target.season ? finish(null) : showEpisodes(target.season, true)),
        });
      });
    }

    showEpisodes(target.season, true);
  });
}
