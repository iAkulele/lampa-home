// Episode picker before «Играть» / «Скачать заранее» on a series: «Продолжить»
// with the computed episode, the aired episodes of its season with watched marks,
// another season and the native torrents list.
import { lampa, tmdbGet } from './lampa.js';
import { episodeStatus, trackerPosition, absoluteOf } from './episodes.js';
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

// Lampa's TMDB source cuts long seasons into virtual chunks of ~24 episodes in
// `episodes`; the whole TMDB season stays in `episodes_original`.
export function seasonEpisodeList(json) {
  if (!json) return null;
  if (Array.isArray(json.episodes_original) && json.episodes_original.length) return json.episodes_original;
  return Array.isArray(json.episodes) ? json.episodes : null;
}

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

// Episode items carry no subtitle (user's choice): «Серия 3 — name»; a mapped
// episode (tracker season, ep.absolute set) shows the absolute number instead.
const episodeTitle = (ep) => `Серия ${ep.episode_number}` + (ep.absolute != null ? ` (#${ep.absolute})` : ep.name ? ` — ${ep.name}` : '');

// -> [{title, subtitle, season, episode, kind, selected}]; kind: 'continue' (the
// computed target, selected), 'episode', 'season' (another season), 'list' (native list).
// Tracker seasons (episodes from mappedEpisodes): season/episode are the tracker
// ones, items also carry `absolute`; watchedSet / inProgress are keyed by absolute.
export function pickerItems({ season, target, episodes, watchedSet, inProgress, today, seasonsCount = 1 }) {
  const aired = (episodes || []).filter((ep) => ep && ep.episode_number > 0 && isAired(ep, today));
  const watched = watchedSet || new Set();
  const progress = inProgress || {};
  const items = [];
  const other = seasonsCount > 1
    ? { title: 'Другой сезон…', subtitle: `Сейчас: сезон ${season} · всего сезонов ${seasonsCount}`, season, episode: null, kind: 'season', selected: false }
    : null;
  if (target && target.season === season) {
    const ep = aired.find((e) => e.episode_number === target.episode);
    const item = {
      title: `Продолжить: серия ${target.episode}`, subtitle: '',
      season, episode: target.episode, kind: 'continue', selected: true,
    };
    if (ep && ep.absolute != null) item.absolute = ep.absolute;
    items.push(item);
  }
  if (other) items.push(other);
  for (const ep of aired) {
    const n = ep.episode_number;
    const mapped = ep.absolute != null;
    const key = mapped ? ep.absolute : n;
    let prefix = '';
    if (progress[key] != null) prefix = `▶ ${Math.max(1, Math.round(progress[key]))}% `;
    else if (watched.has(key)) prefix = '✓ ';
    const item = {
      title: prefix + episodeTitle(ep), subtitle: '',
      season, episode: n, kind: 'episode', selected: false,
    };
    if (mapped) item.absolute = ep.absolute;
    items.push(item);
  }
  items.push({ title: 'Все раздачи', subtitle: '', season, episode: null, kind: 'list', selected: false });
  return items;
}

function episodesWord(n) {
  const m = n % 100, d = n % 10;
  const w = m >= 11 && m <= 14 ? 'серий' : d === 1 ? 'серия' : d >= 2 && d <= 4 ? 'серии' : 'серий';
  return `${n} ${w}`;
}

// Seasons that have started airing: [{title, subtitle, season, selected}].
export function seasonItems(tv, current, today) {
  const status = tv ? episodeStatus(tv, today) : null;
  return ((tv && tv.seasons) || [])
    .filter((s) => s && s.season_number > 0 && s.episode_count > 0)
    .filter((s) => (s.air_date ? s.air_date <= today : !status || s.season_number <= status.season))
    .filter((s) => !status || s.season_number <= status.season)
    .sort((a, b) => a.season_number - b.season_number)
    .map((s) => {
      const live = !!status && status.airing && s.season_number === status.season;
      const state = live ? `выходит, вышло ${status.aired} из ${status.total}` : 'вышел полностью';
      const date = formatDate(s.air_date);
      return {
        title: `${s.season_number === current ? '✓ ' : ''}Сезон ${s.season_number} · ${episodesWord(s.episode_count)}`,
        subtitle: date ? `${state} · с ${date}` : state,
        season: s.season_number, selected: s.season_number === current,
      };
    });
}

// ---------- tracker seasons (SeasonMap of a single-season anime) ----------

// TMDB season 1 episodes of tracker season `season`, renumbered 1..n with the
// absolute number kept in `absolute`. Missing TMDB episodes: no name, aired up to
// airedAbs (the last aired absolute episode).
export function mappedEpisodes(map, season, tmdbEpisodes, airedAbs) {
  const s = (map || []).find((x) => x && x.season === season);
  if (!s) return [];
  const byNumber = new Map((tmdbEpisodes || []).filter(Boolean).map((e) => [e.episode_number, e]));
  const list = Array.isArray(s.episodes) && s.episodes.length ? s.episodes : Array.from({ length: s.count }, (_, i) => s.start + i);
  return list.map((abs, i) => {
    const e = byNumber.get(abs);
    const base = e || { name: '', air_date: null, aired: airedAbs == null || abs <= airedAbs };
    return { ...base, episode_number: i + 1, season_number: season, absolute: abs };
  });
}

// Tracker seasons that have started airing (first episode <= airedAbs):
// [{title, subtitle, season, selected}].
export function mappedSeasonItems(map, current, airedAbs) {
  return (map || [])
    .filter((s) => s && s.count > 0 && (airedAbs == null || s.start <= airedAbs))
    .map((s) => {
      const list = s.episodes && s.episodes.length ? s.episodes : Array.from({ length: s.count }, (_, i) => s.start + i);
      const last = list[list.length - 1];
      const out = airedAbs == null ? s.count : list.filter((a) => a <= airedAbs).length;
      const state = out < s.count ? `выходит, вышло ${out} из ${s.count}` : 'вышел полностью';
      return {
        title: `${s.season === current ? '✓ ' : ''}Сезон ${s.season} · ${episodesWord(s.count)}`,
        subtitle: `${state} · #${s.start}–#${last}`,
        season: s.season, selected: s.season === current,
      };
    });
}

// Tracker {season, episode} of a TMDB target (season 1, absolute) or null.
export function mappedTarget(map, target) {
  if (!target || target.season !== 1) return null;
  const pos = trackerPosition(map, target.episode);
  return pos ? { season: pos.season, episode: pos.episode } : null;
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
      const eps = seasonEpisodeList(json);
      if (!eps || !eps.length) return fallback();
      seasonCache.set(key, eps);
      return eps;
    },
    fallback,
  ).finally(() => clearTimeout(timer));
}

// Shows the picker. opts: {title (show name), tv, target {season, episode},
// progress (lh_progress of the card), view(season, episode) -> Lampa timeline,
// seasonMap (tracker seasons of a single-season anime, or null)}.
// Resolves {season, episode}, 'list' («Все раздачи») or null (Back).
export function askEpisode(opts) {
  const tracker = opts.seasonMap ? mappedTarget(opts.seasonMap, opts.target) : null;
  return tracker ? askMapped(opts, tracker) : askPlain(opts);
}

// Picker in tracker seasons; resolves {season: 1, episode: absolute}, 'list' or null.
function askMapped({ title, tv, target, progress, view, seasonMap }, tracker) {
  const L = lampa();
  const today = todayIso();
  const name = L.Controller.enabled().name;
  const enabled = !name || name === 'select' || name === 'loading' ? 'content' : name;
  const status = tv ? episodeStatus(tv, today) : null;
  const airedAbs = status && status.season === 1 ? status.aired : null;
  const seasons = mappedSeasonItems(seasonMap, tracker.season, airedAbs);
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
        items: mappedSeasonItems(seasonMap, current, airedAbs),
        onSelect: (a) => showEpisodes(a.season, false),
        onBack: () => showEpisodes(current, current === tracker.season),
      });
    };
    function showEpisodes(season, withTarget) {
      seasonEpisodes(tv || { id: 0 }, 1, today).then((tmdb) => {
        if (done) return;
        const episodes = mappedEpisodes(seasonMap, season, tmdb, airedAbs);
        const numbers = episodes.map((e) => e.absolute);
        const items = pickerItems({
          season,
          target: withTarget ? tracker : null,
          episodes,
          watchedSet: watchedEpisodes(1, numbers, progress, view),
          inProgress: inProgressEpisodes(1, numbers, view),
          today,
          seasonsCount: seasons.length,
        });
        L.Select.show({
          title: `${title ? title + ' · ' : ''}Сезон ${season}`,
          items,
          onSelect: (a) => {
            if (a.kind === 'season') return showSeasons(season);
            if (a.kind === 'list') return finish('list');
            // «Продолжить» of a target missing from the aired list carries no absolute.
            finish({ season: 1, episode: a.absolute != null ? a.absolute : absoluteOf(seasonMap, a.season, a.episode) });
          },
          onBack: () => (season === tracker.season ? finish(null) : showEpisodes(tracker.season, true)),
        });
      });
    }
    showEpisodes(tracker.season, true);
  });
}

function askPlain({ title, tv, target, progress, view }) {
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
