// Pure choices behind «Играть»: the card's kind, the tracker season of an
// episode and the file of a release that holds it. No Lampa calls here.
import { parseTitle, inferSeasonMap } from './torrent-select.js';
import { parseEpisode, trackerPosition } from './episodes.js';

const ANIMATION = 16;
// Same list as Lampa's interaction/torrent.js.
const VIDEO = ['asf', 'wmv', 'divx', 'avi', 'mp4', 'm4v', 'mov', '3gp', '3g2', 'mkv', 'trp', 'tp', 'mts', 'mpg', 'mpeg', 'dat', 'vob', 'rm', 'rmvb', 'm2ts', 'ts'];

export const ext = (path) => String(path || '').split('.').pop().toLowerCase();
export const isVideo = (f) => VIDEO.includes(ext(f.path));

// «2160p · 16,6 ГБ · HDRezka» for the toast shown when playback starts.
export function releaseLabel(result) {
  if (!result) return '';
  const p = parseTitle(result.Title);
  const gib = (Number(result.Size) || 0) / 1024 ** 3;
  const size = gib >= 0.1 ? `${gib.toFixed(1).replace('.', ',')} ГБ` : '';
  return [p.resolution ? `${p.resolution}p` : '', size, p.studio || ''].filter(Boolean).join(' · ');
}

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

// Lampa hashes by `title` / `original_title` (Torserver.parse); TV cards carry name.
export function normalizeTitles(card) {
  const out = { ...card };
  if (!out.title && out.name) out.title = out.name;
  if (!out.original_title && out.original_name) out.original_title = out.original_name;
  return out;
}

// The original title Lampa's timeline hashes use ('' when there is none).
export const originalTitle = (movie) => movie.original_title || movie.original_name || '';

// Does the release title name a season ("S02", "Season 3", "2 сезон")? Then its
// files are numbered per season, not absolutely.
export function titleHasSeason(title) {
  const p = parseTitle(title);
  return !!(p.seasons || p.sxeRange || (p.episode && p.episode.season != null));
}

// ---------- tracker seasons (single-season anime split into seasons on trackers) ----------
// ctx stays in TMDB terms (season 1, episode = absolute = TMDB's number) for
// progress and Lampa's timeline; trackerSeason / trackerEpisode / trackerStart
// (first absolute episode of that tracker season) serve release and file choice.

// The tracker fields of a ctx or a stored entry ({} when there are none).
export function trackerFields(o) {
  if (!o || o.trackerSeason == null) return {};
  return { trackerSeason: o.trackerSeason, trackerEpisode: o.trackerEpisode, trackerStart: o.trackerStart, trackerCount: o.trackerCount };
}

// ctx with the tracker position of its absolute episode in map. keepMap: the
// map came from TMDB before the search (the query then goes without a season).
export function withTracker(ctx, map, keepMap = true) {
  if (!ctx || !map) return ctx;
  const { trackerSeason, trackerEpisode, trackerStart, trackerCount, ...rest } = ctx;
  const out = keepMap ? { ...rest, seasonMap: map } : rest;
  const pos = trackerPosition(map, ctx.absolute);
  return pos
    ? { ...out, trackerSeason: pos.season, trackerEpisode: pos.episode, trackerStart: pos.start, trackerCount: pos.count }
    : out;
}

// Single-season anime without a TMDB episode group: tracker seasons inferred
// from the season-tagged releases themselves (ctx.inferTotal: TMDB's count).
export function inferTracker(ctx, results, names) {
  if (!ctx || ctx.trackerSeason != null || ctx.seasonMap || !(ctx.inferTotal > 0)) return ctx;
  const map = inferSeasonMap(results, { names, total: ctx.inferTotal });
  return map ? withTracker(ctx, map, false) : ctx;
}

// How a pack in tracker mode numbers its files, decided by the whole file set:
// 'absolute' when some bare number exceeds the tracker season's episode count
// (TMDB's numbers), 'season' otherwise (1..n of the tracker season); null
// outside tracker mode. The tracker season S2 of 24 episodes starting at 13
// holds 01..24: «20» there is S2E20, not absolute 20.
export function packNumbering(files, ctx) {
  if (!ctx || ctx.trackerSeason == null || !(ctx.trackerStart > 0)) return null;
  const count = ctx.trackerCount > 0 ? ctx.trackerCount : Infinity;
  const bare = (files || []).filter(isVideo).map((f) => parseEpisode(f.path)).filter((ep) => ep.season == null && ep.absolute != null);
  return bare.some((ep) => ep.absolute > count) ? 'absolute' : 'season';
}

// Absolute (TMDB) number of an episode of a per-season numbered tracker pack.
export function absoluteInPack(episode, ctx) {
  if (!(episode > 0) || !ctx || !(ctx.trackerStart > 0)) return episode;
  return ctx.trackerStart - 1 + episode;
}

// ---------- file choice ----------

// files: [{id, path, length}]; infos (optional): [{id, season, episode, defaultSeason}]
// as Lampa's Torserver.parse sees them (it also reads season folders);
// defaultSeason: no season marker in the path, `season` is Lampa's guess.
// Returns the file or null.
export function pickFile(files, ctx, infos) {
  const videos = (files || []).filter(isVideo);
  if (!videos.length) return null;
  if (ctx.trackerSeason != null && ctx.kind !== 'movie') {
    // Tracker S03E03 in the names; then the absolute number ("40" exists only in
    // an absolutely numbered pack); then the per-season number of a season pack.
    const { trackerSeason, trackerEpisode, trackerStart, trackerCount, ...plain } = ctx;
    const sxe = videos.find((f) => {
      const ep = parseEpisode(f.path);
      return ep.season != null && ep.season === trackerSeason && ep.episode === trackerEpisode;
    });
    if (sxe) return sxe;
    if (packNumbering(videos, ctx) === 'absolute') return pickFile(videos, { ...plain, titleHasSeason: false }, infos);
    return pickFile(videos, { ...plain, season: trackerSeason, episode: trackerEpisode, absolute: trackerEpisode, titleHasSeason: true }, infos);
  }
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
  const infoOf = (f) => (Array.isArray(infos) ? infos.find((i) => i && i.id === f.id) : null);
  // "Season 1/Серия 5" is not S2E5 even when it is the only "5" in the pack.
  const otherSeason = (f) => {
    const i = infoOf(f);
    return !!i && !i.defaultSeason && i.season != null && i.season !== ctx.season;
  };
  let ambiguous = false;
  for (const n of numbers) {
    if (n == null) continue;
    const hits = bare.filter(({ ep }) => ep.absolute === n);
    if (hits.length === 1) {
      if (!otherSeason(hits[0].f)) return hits[0].f;
      ambiguous = true;
      break;
    }
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

// ctx of the episode before the target in the same season (null for a movie or
// the first episode of a season): a pack holding it means the target is not out yet.
export function previousEpisodeCtx(ctx) {
  if (!ctx || ctx.kind === 'movie' || !(ctx.episode > 1)) return null;
  const prev = { ...ctx, episode: ctx.episode - 1, absolute: ctx.absolute > 1 ? ctx.absolute - 1 : ctx.absolute };
  if (ctx.trackerSeason == null) return prev;
  // The first episode of a tracker season: its predecessor is in another pack.
  if (!(ctx.trackerEpisode > 1)) return null;
  return { ...prev, trackerEpisode: ctx.trackerEpisode - 1 };
}
