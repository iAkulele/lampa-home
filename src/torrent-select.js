// Pure torrent release selection: parses tracker titles and scores them.
import { parseEpisode } from './episodes.js';
import {
  LIMITS,
  VOICE_STUDIOS,
  VOICE_PREFERENCE,
  RUSSIAN_MARKERS,
  SCREENER_MARKERS,
  DV_MARKERS,
  HDR_MARKERS,
  SCORING,
} from './config.js';

const GiB = 1024 ** 3;
const re = (src) => new RegExp(src, 'iu');

const RE_RUSSIAN = re(RUSSIAN_MARKERS);
const RE_SCREENER = re(SCREENER_MARKERS);
const RE_DV = re(DV_MARKERS);
const RE_HDR = re(HDR_MARKERS);
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

function detectVoice(t, studio) {
  if (studio === 'lostfilm' || studio === 'hdrezka' || studio === 'anidub') return studio;
  if (studio) return 'other';
  if (/дубляж|(?<![\p{L}\d])dub(?!bed)/iu.test(t)) return 'dub';
  if (/\bmvo\b|многоголос/i.test(t)) return 'mvo';
  return RE_RUSSIAN.test(t) ? 'other' : null;
}

// Seasons covered by the title: S01-S03, S02, "Сезон 2", "Сезон: 1-3".
function detectSeasons(t) {
  const out = new Set();
  const add = (a, b) => {
    for (let s = a; s <= b && s - a < 60; s++) out.add(s);
  };
  let m;
  const sx = /(?<![\p{L}\d])s(\d{1,2})(?:\s*-\s*s?(\d{1,2}))?(?![\d])(?!e\d)/giu;
  while ((m = sx.exec(t))) add(+m[1], m[2] ? +m[2] : +m[1]);
  const ru = /сезон[ы:]*\s*(\d{1,2})(?:\s*-\s*(\d{1,2}))?/giu;
  while ((m = ru.exec(t))) add(+m[1], m[2] ? +m[2] : +m[1]);
  return out.size ? [...out].sort((a, b) => a - b) : null;
}

// Episode range "1-6 из 8", "(1-4 of 10)", "[1090-1100]", "Серии: 1-10".
function detectEpisodeRange(t) {
  const patterns = [
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

export function parseTitle(title) {
  const t = String(title || '');
  const studio = detectStudio(t);
  const hdr = RE_HDR.test(t);
  const dv = RE_DV.test(t);
  const range = detectEpisodeRange(t);
  const ep = parseEpisode(t);
  return {
    resolution: detectResolution(t),
    screener: RE_SCREENER.test(t),
    dvOnly: dv && !hdr,
    hdr,
    russian: RE_RUSSIAN.test(t) || studio !== null,
    voice: detectVoice(t, studio),
    studio,
    audio: detectAudio(t),
    seasons: detectSeasons(t),
    episodeRange: range,
    episode: ep.episode == null ? null : ep,
  };
}

// Does the release provably contain the target episode of ctx?
function hasEpisode(p, ctx) {
  const wantEp = ctx.episode ?? null;
  const wantAbs = ctx.absolute ?? ctx.episode ?? null;
  const inRange = (n) => n != null && p.episodeRange && n >= p.episodeRange[0] && n <= p.episodeRange[1];

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

function rejectReason(p, result, ctx) {
  if (p.screener) return 'screener';
  if (p.dvOnly) return 'dv-only';
  if (!p.russian) return 'no-russian';
  if (ctx.kind === 'movie' && Number(result.Size) > LIMITS.maxMovieBytes) return 'oversize';
  if ((ctx.kind === 'tv' || ctx.kind === 'anime') && !hasEpisode(p, ctx)) return 'episode-missing';
  return null;
}

function score(p, result, ctx) {
  const W = SCORING;
  let quality = W.quality.unknown;
  if (p.resolution === 720) quality = ctx.kind === 'anime' ? W.quality.anime720 : W.quality[720];
  else if (p.resolution) quality = W.quality[p.resolution];

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
  return quality + voice + audio + seeds - sizePenalty;
}

// Returns scored list (non-rejected first, each group by score desc) and the top non-rejected item.
export function selectTorrent(results, ctx) {
  const scored = (results || []).map((result) => {
    const p = parseTitle(result.Title);
    return { result, score: score(p, result, ctx), rejected: rejectReason(p, result, ctx) };
  });
  scored.sort((a, b) => (a.rejected ? 1 : 0) - (b.rejected ? 1 : 0) || b.score - a.score);
  const top = scored.find((s) => !s.rejected);
  return { chosen: top ? top.result : null, scored };
}
