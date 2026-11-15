// Pure torrent release selection: parses tracker titles and scores them.
import { parseEpisode } from './episodes.js';
import {
  LIMITS,
  VOICE_STUDIOS,
  VOICE_PREFERENCE,
  RUSSIAN_MARKERS,
  SUBTITLE_PHRASES,
  SCREENER_MARKERS,
  DV_MARKERS,
  DV_P5_MARKERS,
  HDR_MARKERS,
  SCORING,
  SIZE_FLOORS,
  VOICE_MARKERS,
  EXT_AUDIO_MARKERS,
  RAW_MARKERS,
  SUBS_ONLY_MARKERS,
  ANIME_VOICE_STUDIOS,
} from './config.js';

const GiB = 1024 ** 3;
const re = (src) => new RegExp(src, 'iu');

const RE_RUSSIAN = re(RUSSIAN_MARKERS);
const RE_SUBS = re(SUBTITLE_PHRASES);
const RE_SCREENER = re(SCREENER_MARKERS);
const RE_DV = re(DV_MARKERS);
const RE_DV_P5 = re(DV_P5_MARKERS);
const RE_HDR = re(HDR_MARKERS);
const RE_VOICE = re(VOICE_MARKERS);
const RE_EXT = re(EXT_AUDIO_MARKERS);
const RE_RAW = re(RAW_MARKERS);
const RE_SUBS_ONLY = re(SUBS_ONLY_MARKERS);
const RE_ANIME_STUDIO = re(ANIME_VOICE_STUDIOS);
const STUDIO_RES = Object.entries(VOICE_STUDIOS).map(([id, src]) => [id, re(src)]);

function detectStudio(title) {
  for (const [id, rx] of STUDIO_RES) if (rx.test(title)) return id;
  return null;
}

function detectResolution(t) {
  if (/(?<![\d])2160\s*p?|\b4k\b|\buhd\b/i.test(t)) return 2160;
  if (/(?<![\d])1080\s*[pi]?(?![\d])/i.test(t)) return 1080;
  if (/(?<![\d])720\s*p?(?![\d])/i.test(t)) return 720;
  if (/(?<![\d])(?:480|576)\s*p?(?![\d])/i.test(t)) return 480;
  return null;
}

function detectAudio(t) {
  if (/e-?ac-?3|\bddp/i.test(t)) return 'eac3';
  if (/(?<![a-z])ac-?3(?![a-z\d])|\bdd ?5\.1/i.test(t)) return 'ac3';
  if (/truehd/i.test(t)) return 'truehd';
  if (/\bdts/i.test(t)) return 'dts';
  if (/\baac/i.test(t)) return 'aac';
  return null;
}

function detectVoice(t, studio, audioText) {
  if (studio === 'lostfilm' || studio === 'hdrezka' || studio === 'anidub') return studio;
  if (studio) return 'other';
  if (/дубляж|(?<![\p{L}\d])dub(?!bed)/iu.test(t)) return 'dub';
  if (/\bmvo\b|многоголос/i.test(t)) return 'mvo';
  return RE_RUSSIAN.test(audioText) ? 'other' : null;
}

// Seasons covered by the title: S01-S03, S02, "Сезон 2", "Сезон: 1-3",
// "Season 3", "2nd Season", "TV-2", "[ТВ-3]".
function detectSeasons(t) {
  const out = new Set();
  const add = (a, b) => {
    for (let s = a; s <= b && s - a < 60; s++) out.add(s);
  };
  let m;
  const sx = /(?<![\p{L}\d])s(\d{1,2})(?:\s*-\s*s?(\d{1,2}))?(?![\d])(?!e\d)/giu;
  while ((m = sx.exec(t))) add(+m[1], m[2] ? +m[2] : +m[1]);
  const en = /(?<![\p{L}\d])season\s*(\d{1,2})(?:\s*-\s*(\d{1,2}))?(?![\d])/giu;
  while ((m = en.exec(t))) add(+m[1], m[2] ? +m[2] : +m[1]);
  const nth = /(?<![\p{L}\d])(\d{1,2})(?:st|nd|rd|th)\s+season/giu;
  while ((m = nth.exec(t))) add(+m[1], +m[1]);
  const tv = /(?<![\p{L}\d])(?:tv|тв)-?(\d{1,2})(?![\d])/giu;
  while ((m = tv.exec(t))) add(+m[1], +m[1]);
  // "4 сезон: 1-8 серии", "1-3 сезоны": the number before the word wins, and then
  // the digits after "сезон:" are episodes, not seasons.
  const before = /(?<![\p{L}\d])(\d{1,2})(?:\s*-\s*(\d{1,2}))?\s*сезон/giu;
  let prefixed = false;
  while ((m = before.exec(t))) {
    prefixed = true;
    add(+m[1], m[2] ? +m[2] : +m[1]);
  }
  const ru = /сезон[ы:]*\s*(\d{1,2})(?:\s*-\s*(\d{1,2}))?/giu;
  while (!prefixed && (m = ru.exec(t))) add(+m[1], m[2] ? +m[2] : +m[1]);
  return out.size ? [...out].sort((a, b) => a - b) : null;
}

// Episode range "1-6 из 8", "(1-4 of 10)", "[1090-1100]", "Серии: 1-10".
function detectEpisodeRange(t) {
  const patterns = [
    /(?<![\p{L}\d])e(\d{1,4})\s*-\s*e?(\d{1,4})(?!\d)/iu,
    /\[\s*(\d{1,4})\s*-\s*(\d{1,4})\s*\]/,
    /(\d{1,4})\s*-\s*(\d{1,4})\s*(?:of|из|серии|серий|episodes|eps)(?![\p{L}])/iu,
    /(?:серии|серия|episodes?|eps?)[\s:]*(\d{1,4})\s*-\s*(\d{1,4})/iu,
  ];
  for (const p of patterns) {
    const m = t.match(p);
    if (m && +m[1] <= +m[2] && +m[1] < 1900) return [+m[1], +m[2]];
  }
  return null;
}

// "S02E01-E10", "S02E01-10": a multi-episode pack of one season.
function detectSxeRange(t) {
  const m = t.match(/(?<![\p{L}\d])s(\d{1,2})[ ._-]?e(\d{1,4})\s*-\s*e?(\d{1,4})(?!\d)/iu);
  return m && +m[2] <= +m[3] ? { season: +m[1], range: [+m[2], +m[3]] } : null;
}

export function parseTitle(title) {
  const t = String(title || '');
  const audioText = t.replace(RE_SUBS, ' ');
  const studio = detectStudio(t);
  const hdr = RE_HDR.test(t);
  const dv = RE_DV.test(t);
  const dvP5 = dv && RE_DV_P5.test(t);
  const range = detectEpisodeRange(t);
  const ep = parseEpisode(t);
  return {
    resolution: detectResolution(t),
    screener: RE_SCREENER.test(t),
    dvOnly: dv && (dvP5 || !hdr),
    hdr,
    russian: RE_RUSSIAN.test(audioText) || studio !== null,
    voice: detectVoice(t, studio, audioText),
    explicitVoice: studio !== null || RE_VOICE.test(audioText),
    extAudio: RE_EXT.test(audioText),
    raw: RE_RAW.test(t),
    subsOnly: RE_SUBS_ONLY.test(t),
    animeStudio: RE_ANIME_STUDIO.test(audioText),
    studio,
    audio: detectAudio(t),
    seasons: detectSeasons(t),
    episodeRange: range,
    sxeRange: detectSxeRange(t),
    episode: ep.episode == null ? null : ep,
    total: statedTotal(t),
  };
}

const seasonTagged = (p) => !!(p.seasons || p.sxeRange || (p.episode && p.episode.season != null));

// Does the release provably contain the target episode of ctx? With tracker
// seasons (ctx.trackerSeason: a single-season anime split into seasons on the
// trackers) a season-tagged release is judged by the tracker season/episode,
// an untagged one by the absolute number (ctx.season 1, ctx.absolute).
function hasEpisode(p, ctx) {
  if (ctx.trackerSeason == null) return hasEpisodePlain(p, ctx);
  const plain = { ...ctx, trackerSeason: null };
  if (!seasonTagged(p)) {
    // "(24 из 24) Complete": a whole pack of N episodes, not every episode.
    if (!p.episodeRange && !p.episode && p.total > 0) return ctx.absolute <= p.total;
    return hasEpisodePlain(p, plain);
  }
  // Inside a tracker season the numbers are per season; "4 сезон — Серия 3" is
  // another tracker season even though its bare episode number matches.
  const tracker = { ...plain, season: ctx.trackerSeason, episode: ctx.trackerEpisode, absolute: ctx.trackerEpisode };
  const otherSeason = !!p.seasons && !p.seasons.includes(ctx.trackerSeason);
  if (!otherSeason && hasEpisodePlain(p, tracker)) return true;
  // "S01 [1-57 из 63]", "3 сезон [38-50]": a one-season tag over an absolute range
  // (past tracker season 1, so the numbers cannot be per season).
  const r = p.episodeRange;
  const one = !!p.seasons && p.seasons.length === 1 && (p.seasons[0] === 1 || p.seasons[0] === ctx.trackerSeason);
  return ctx.trackerSeason > 1 && one && !p.sxeRange && !!r && ctx.absolute >= r[0] && ctx.absolute <= r[1];
}

function hasEpisodePlain(p, ctx) {
  const wantEp = ctx.episode ?? null;
  const wantAbs = ctx.absolute ?? ctx.episode ?? null;
  const inRange = (n) => n != null && p.episodeRange && n >= p.episodeRange[0] && n <= p.episodeRange[1];

  if (p.sxeRange) {
    const [a, b] = p.sxeRange.range;
    return p.sxeRange.season === ctx.season && wantEp >= a && wantEp <= b;
  }
  // "4 сезон — Серия 3": a bare episode number belongs to the title's season tag.
  if (p.episode && p.episode.season == null && p.seasons && ctx.season != null && !p.seasons.includes(ctx.season)) return false;
  if (p.episode && p.episode.season == null && p.episodeRange) return inRange(ctx.kind === 'anime' ? wantAbs : wantEp);
  if (p.episode) {
    if (p.episode.season != null) {
      return p.episode.season === ctx.season && p.episode.episode === wantEp;
    }
    // Bare episode number (absolute numbering, e.g. "- 1095").
    return ctx.kind === 'anime' ? p.episode.absolute === wantAbs : p.episode.absolute === wantEp;
  }
  if (p.seasons) {
    if (ctx.season != null && !p.seasons.includes(ctx.season)) return false;
    return p.episodeRange ? inRange(wantEp) : true; // "S02" without range = whole season
  }
  if (p.episodeRange) return inRange(ctx.kind === 'anime' ? wantAbs : wantEp);
  // No season/episode info at all: treat as a full pack, do not reject.
  return true;
}

// ---------- title relevance ----------

const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const SHORT_NAME = 8;

function containsName(title, name) {
  const n = norm(name);
  if (!n) return false;
  const t = norm(title);
  return n.length < SHORT_NAME ? (' ' + t + ' ').includes(' ' + n + ' ') : t.includes(n);
}

// Does the release title name the show (any of its names)? No names: no check.
export function isRelevant(title, names) {
  const list = (names || []).filter((n) => norm(n));
  if (!list.length) return true;
  return list.some((n) => containsName(title, n));
}

// ---------- audio metadata (JacRed: ffprobe, languages, info.voices) ----------

const RU_LANG = /^(?:rus?|russian)$/i;
const UKR_LETTERS = /[іїєґ]|укр/i;
const UNKNOWN_LANG = /^(?:|und|unk|unknown|mis|mul|zxx)$/i;

// One ffprobe audio stream: Russian by its language tag, or (no language tag)
// by a Cyrillic / "rus" track name that is not Ukrainian.
function streamIsRussian(s) {
  const tags = (s && s.tags) || {};
  const lang = String(tags.language || '').trim();
  if (RU_LANG.test(lang)) return true;
  if (!UNKNOWN_LANG.test(lang)) return false;
  const name = String(tags.title || '');
  return (/\p{Script=Cyrillic}/u.test(name) && !UKR_LETTERS.test(name)) || /(?<![\p{L}])rus/iu.test(name);
}

// 'ru': a Russian audio stream; 'none': audio streams, all in known other
// languages; 'unknown': no audio streams, or some without a language.
export function audioFromFfprobe(ffprobe) {
  const audio = (Array.isArray(ffprobe) ? ffprobe : []).filter((s) => s && s.codec_type === 'audio');
  if (!audio.length) return 'unknown';
  if (audio.some(streamIsRussian)) return 'ru';
  return audio.every((s) => !UNKNOWN_LANG.test(String((s.tags && s.tags.language) || '').trim())) ? 'none' : 'unknown';
}

// ffprobe plus JacRed's `languages` (it also reads the tracker page: a dub
// mislabelled "eng" inside the file still shows "rus" there).
export function audioFromResult(result) {
  const probe = audioFromFfprobe(result && result.ffprobe);
  if (probe === 'ru') return 'ru';
  const langs = Array.isArray(result && result.languages) ? result.languages.map(String) : [];
  if (langs.some((l) => RU_LANG.test(l))) return 'ru';
  if (probe === 'none' || langs.length) return 'none';
  return 'unknown';
}

const cyrillic = (s) => /\p{Script=Cyrillic}/u.test(String(s || ''));

// Russian audio of a release: from the title first (markers, external track,
// raw), then the parser's metadata; for anime an unmarked release that names the
// show in Russian is a maybe (voice 'unknown', penalized).
// -> {russian, voice, studio, penalty, reason}
export function classifyAudio(p, result, ctx) {
  const anime = ctx.kind === 'anime';
  const title = String((result && result.Title) || '');
  const info = result && result.info;
  const voices = info && Array.isArray(info.voices) ? info.voices.join(' ') : '';
  const animeStudio = anime && (p.animeStudio || RE_ANIME_STUDIO.test(voices));
  const out = (russian, voice, extra) => ({ russian, voice, studio: p.studio, penalty: 0, reason: null, ...extra });

  if (anime && p.raw && !(p.explicitVoice || animeStudio)) return out(false, null, { reason: 'raw' });
  if (p.extAudio) return out(true, p.voice || 'other', { penalty: SCORING.extAudioPenalty });
  if (p.russian || animeStudio) return out(true, p.voice || 'other');
  const meta = audioFromResult(result);
  if (meta === 'ru') {
    const studio = detectStudio(voices);
    return out(true, detectVoice('', studio, '') || 'other', { studio });
  }
  if (meta === 'none') return out(false, null, { reason: 'no-russian' });
  const ruNames = (ctx.names || []).filter(cyrillic);
  if (anime && !p.subsOnly && ruNames.some((n) => containsName(title, n))) {
    return out(false, 'unknown', { penalty: SCORING.unknownVoicePenalty });
  }
  return out(false, null, { reason: 'no-russian' });
}

// Years a release title names: single years and ranges («2021-2024»), not
// resolutions or sizes. [] when it names none.
export function titleYears(title) {
  const out = [];
  const re = /(?<!\d)((?:19|20)\d\d)(?:\s*[-–]\s*((?:19|20)\d\d))?(?!\d)/g;
  for (const m of String(title || '').matchAll(re)) out.push([Number(m[1]), Number(m[2] || m[1])]);
  return out;
}

// A movie release that names years, none of them within a year of the film's.
// Russian and US premieres may sit in different years, hence the tolerance.
export function wrongYear(title, year) {
  if (!year) return false;
  const years = titleYears(title);
  return years.length > 0 && !years.some(([a, b]) => year >= a - 1 && year <= b + 1);
}

function rejectReason(p, result, ctx) {
  if (!isRelevant(result.Title, ctx.names)) return 'unrelated';
  if (ctx.kind === 'movie' && wrongYear(result.Title, ctx.year)) return 'wrong-year';
  if (p.screener) return 'screener';
  if (p.dvOnly) return 'dv-only';
  if (p.audioReason) return p.audioReason;
  if (ctx.kind === 'movie' && Number(result.Size) > LIMITS.maxMovieBytes) return 'oversize';
  if ((ctx.kind === 'tv' || ctx.kind === 'anime') && !hasEpisode(p, ctx)) return 'episode-missing';
  return null;
}

// Movies: 2160p lighter than 15 GiB counts as 1080p; 1080p lighter than 6 GiB as 'thin'.
export function effectiveResolution(p, result, ctx) {
  const floors = SIZE_FLOORS[ctx.kind];
  const size = Number(result.Size) || 0;
  if (!floors || !size) return p.resolution;
  let res = p.resolution;
  if (res === 2160 && size < floors[2160]) res = 1080;
  if (res === 1080 && size < floors[1080]) res = 'thin';
  return res;
}

function score(p, result, ctx) {
  const W = SCORING;
  let quality = W.quality.unknown;
  const res = effectiveResolution(p, result, ctx);
  if (res === 720) quality = ctx.kind === 'anime' ? W.quality.anime720 : W.quality[720];
  else if (res) quality = W.quality[res];

  const pref = VOICE_PREFERENCE[ctx.kind] || [];
  const rank = pref.indexOf(p.studio);
  let voice = 0;
  if (rank === 0) voice = W.voiceFirst;
  else if (rank === 1) voice = W.voiceSecond;
  else if (p.russian) voice = W.voiceAnyRussian;

  const audio = ['ac3', 'aac', 'eac3'].includes(p.audio) ? W.audioLossy : 0;
  const seeders = Math.max(0, Number(result.Seeders) || 0);
  let seeds = Math.min(W.seedsCap, Math.log2(seeders + 1) * W.seedsFactor);
  if (seeders < W.deadSeeders) seeds -= W.deadPenalty;
  const sizePenalty = ((Number(result.Size) || 0) / GiB) * W.sizePenaltyPerGiB;
  return quality + voice + audio + seeds - sizePenalty - (p.audioPenalty || 0);
}

// Returns scored list (non-rejected first, each group by score desc) and the top non-rejected item.
// ctx.names: the show's names; a release naming none of them is 'unrelated' (empty: no check).
export function selectTorrent(results, ctx) {
  const scored = (results || []).map((result) => {
    const title = parseTitle(result.Title);
    const a = classifyAudio(title, result, ctx);
    const p = { ...title, russian: a.russian, voice: a.voice, studio: a.studio, audioPenalty: a.penalty, audioReason: a.reason };
    return { result, score: score(p, result, ctx), rejected: rejectReason(p, result, ctx), voice: p.voice };
  });
  scored.sort((a, b) => (a.rejected ? 1 : 0) - (b.rejected ? 1 : 0) || b.score - a.score);
  const top = scored.find((s) => !s.rejected);
  return { chosen: top ? top.result : null, scored };
}

// ---------- tracker seasons inferred from the releases ----------

// Total episode count a title states: "1-6 из 13", "[13 из 13]", "(1-4 of 10)".
function statedTotal(t) {
  const m = String(t || '').match(/(?<![\p{L}\d])(?:\d{1,4}\s*-\s*)?\d{1,4}\s*(?:из|of)\s*(\d{1,4})(?!\d)/iu);
  return m ? +m[1] : null;
}

// Releases of a single-season anime that carry tracker season tags ->
// SeasonMap [{season, start, count, episodes}]: per season the largest stated
// total ("из N"), cumulative offsets for the absolute numbers. Seasons 1..K
// without a gap; a season starting past `total` (TMDB's episode count) is dropped.
// names: relevance names (releases of other shows ignored). null below 2 seasons.
export function inferSeasonMap(results, { names, total } = {}) {
  const totals = new Map();
  for (const r of results || []) {
    if (!r || !isRelevant(r.Title, names)) continue;
    const p = parseTitle(r.Title);
    const seasons = p.seasons || (p.sxeRange ? [p.sxeRange.season] : null);
    if (!seasons || seasons.length !== 1) continue;
    const n = statedTotal(r.Title);
    if (!(n > 0) || n > 500) continue;
    totals.set(seasons[0], Math.max(totals.get(seasons[0]) || 0, n));
  }
  const map = [];
  let start = 1;
  for (let season = 1; totals.has(season); season++) {
    if (total > 0 && start > total) break;
    const count = totals.get(season);
    const episodes = [];
    for (let i = 0; i < count; i++) episodes.push(start + i);
    map.push({ season, start, count, episodes });
    start += count;
  }
  return map.length >= 2 ? map : null;
}
