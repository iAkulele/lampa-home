// Pure episode helpers: no window, no Lampa.

const realSeasons = (seasons) =>
  (seasons || []).filter((s) => s && s.season_number > 0).sort((a, b) => a.season_number - b.season_number);

const findSeason = (seasons, n) => realSeasons(seasons).find((s) => s.season_number === n);

export function episodeStatus(tv, today) {
  const list = realSeasons(tv && tv.seasons);
  const last = tv && tv.last_episode_to_air;
  const airing = !!tv && (tv.status === 'Returning Series' || !!tv.next_episode_to_air);

  if (!last) {
    const s = list[list.length - 1];
    const total = s ? s.episode_count : 0;
    return { season: s ? s.season_number : 1, aired: total, total, airing };
  }

  const season = last.season_number;
  const info = findSeason(list, season);
  const total = info ? info.episode_count : last.episode_number;
  const future = !!last.air_date && !!today && last.air_date > today;
  const aired = future ? Math.max(0, last.episode_number - 1) : last.episode_number;
  return { season, aired, total, airing };
}

export function absoluteEpisode(seasons, season, episode) {
  let sum = 0;
  for (const s of realSeasons(seasons)) {
    if (s.season_number < season) sum += s.episode_count;
  }
  return sum + episode;
}

export function nextEpisode(progress, seasons) {
  if (!progress) return { season: 1, episode: 1 };
  const cur = findSeason(seasons, progress.season);
  if (cur && progress.episode < cur.episode_count) {
    return { season: progress.season, episode: progress.episode + 1 };
  }
  if (findSeason(seasons, progress.season + 1)) {
    return { season: progress.season + 1, episode: 1 };
  }
  return { season: progress.season, episode: progress.episode };
}

// A bare "- 720" / "- 1080" is an episode (One Piece); resolutions carry a "p".
// A bracketed "[1080]" is still treated as a resolution tag.
const NOT_EPISODE_NUMBERS = new Set([360, 480, 576, 1440, 2160, 4320]);
const RESOLUTIONS = new Set([...NOT_EPISODE_NUMBERS, 720, 1080]);

export function parseEpisode(filename) {
  const result = (season, episode, absolute) => ({ season, episode, absolute });
  let name = String(filename || '').replace(/^.*[\\/]/, '');
  name = name.replace(/(?<![0-9A-Za-z])(?:19|20)\d{2}(?![0-9A-Za-z])/g, ' ');

  let m = name.match(/(?<![0-9A-Za-z])s(\d{1,2})[ ._-]?e(\d{1,4})(?!\d)/i);
  if (m) return result(+m[1], +m[2], null);

  m = name.match(/(?<![0-9A-Za-z])(\d{1,2})x(\d{1,4})(?![0-9A-Za-z])/i);
  if (m) return result(+m[1], +m[2], null);

  m = name.match(/сезон\s*(\d{1,2})\D{0,10}?сери[яи]\s*(\d{1,4})/i);
  if (m) return result(+m[1], +m[2], null);

  m = name.match(/(?<![0-9A-Za-z])(?:ep(?:isode)?|e)[ ._-]?(\d{1,4})(?!\d)/i) ||
    name.match(/сери[яи][ ._-]?(\d{1,4})(?!\d)/i);
  if (m) return result(null, +m[1], +m[1]);

  m = name.match(/\[(\d{1,4})\]/);
  if (m && !RESOLUTIONS.has(+m[1])) return result(null, +m[1], +m[1]);
  m = name.match(/\s-\s(\d{1,4})(?=\s|\.|\[|$)/);
  if (m && !NOT_EPISODE_NUMBERS.has(+m[1])) return result(null, +m[1], +m[1]);

  return result(null, null, null);
}

// ---------- tracker seasons (single-season anime, absolute numbering on TMDB) ----------

// SeasonMap: [{season, start, count, episodes: [absolute...]}], tracker season
// order. -> {season, episode, start, count} of an absolute episode, or null.
export function trackerPosition(map, absolute) {
  if (!Array.isArray(map) || !(absolute > 0)) return null;
  for (const s of map) {
    const list = Array.isArray(s.episodes) && s.episodes.length ? s.episodes : null;
    const i = list ? list.indexOf(absolute) : absolute - s.start;
    if (list ? i >= 0 : i >= 0 && i < s.count) return { season: s.season, episode: i + 1, start: s.start, count: s.count };
  }
  return null;
}

// Absolute episode of tracker season/episode; null when outside the map.
export function absoluteOf(map, season, episode) {
  const s = (map || []).find((x) => x && x.season === season);
  if (!s || !(episode >= 1) || episode > s.count) return null;
  return Array.isArray(s.episodes) && s.episodes[episode - 1] != null ? s.episodes[episode - 1] : s.start + episode - 1;
}
