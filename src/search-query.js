// Pure helpers that shape parser queries: short titles, script checks, TMDB
// alternative titles, the two-query plan and merging of its results.

const MIN_TITLE = 4;
const MAX_TITLE = 60;
// Two leading words of a long name count as a name when this long.
const MIN_TWO_WORDS = 12;
// Titles longer than this are cut before the subtitle: trackers name a release by
// the part before the colon («Изгнанный читер-чародей»), not by 228 characters.
export const LONG_TITLE = 40;
// Fewer results than this from the first query: a second one by the Latin title.
export const FEW_RESULTS = 5;

// Letters of any script other than Latin/Cyrillic (kana, CJK, hangul, arabic, thai...).
const FOREIGN = /(?=\p{L})[^\p{Script=Latin}\p{Script=Cyrillic}]/u;

export function isLatinOrCyrillic(str) {
  const s = String(str || '');
  return /\p{L}/u.test(s) && !FOREIGN.test(s);
}

export function isLatin(str) {
  const s = String(str || '');
  return isLatinOrCyrillic(s) && /\p{Script=Latin}/u.test(s) && !/\p{Script=Cyrillic}/u.test(s);
}

export const hasCyrillic = (str) => /\p{Script=Cyrillic}/u.test(String(str || ''));

// Name before the subtitle: cut at the first ":", " — ", " – ", " ~ ", "(";
// at most 60 characters, cut on a word boundary.
export function shortTitle(name) {
  const original = String(name || '').trim();
  let s = original;
  const cuts = [':', ' — ', ' – ', ' ~ ', '('].map((c) => s.indexOf(c)).filter((i) => i >= 0);
  if (cuts.length) s = s.slice(0, Math.min(...cuts)).trim();
  if (s.length < MIN_TITLE) s = original;
  if (s.length > MAX_TITLE) {
    const head = s.slice(0, MAX_TITLE + 1);
    const space = head.lastIndexOf(' ');
    s = (space >= MIN_TITLE ? head.slice(0, space) : s.slice(0, MAX_TITLE)).trim();
  }
  return s;
}

// Title as sent to the parser; non-Latin/Cyrillic ones dropped (''). Movies go
// whole (full title + year is precise; a cut title finds sequels); tv/anime
// titles longer than LONG_TITLE are cut before the subtitle.
export function queryTitle(name, kind) {
  const s = String(name || '').trim();
  if (!isLatinOrCyrillic(s)) return '';
  if (kind === 'movie') return s;
  return s.length > LONG_TITLE ? shortTitle(s) : s;
}

function altList(json) {
  return (json && (json.results || json.titles)) || [];
}

function uniqueShort(titles) {
  const out = [];
  const seen = new Set();
  titles.forEach((title) => {
    const s = shortTitle(title);
    const key = s.toLowerCase();
    if (s.length >= MIN_TITLE && !seen.has(key)) {
      seen.add(key);
      out.push(s);
    }
  });
  return out;
}

// TMDB alternative_titles ({results} for tv, {titles} for movies) -> Latin titles,
// JP entries first, then US; each shortened, at least 4 characters, no duplicates.
export function latinAltTitles(json) {
  const rank = (c) => (c === 'JP' ? 0 : 1);
  return uniqueShort(altList(json)
    .filter((t) => t && (t.iso_3166_1 === 'JP' || t.iso_3166_1 === 'US') && isLatin(t.title))
    .sort((a, b) => rank(a.iso_3166_1) - rank(b.iso_3166_1))
    .map((t) => t.title));
}

// RU/UA alternative titles in Cyrillic: relevance names only, never queries.
export function cyrillicAltTitles(json) {
  return uniqueShort(altList(json)
    .filter((t) => t && (t.iso_3166_1 === 'RU' || t.iso_3166_1 === 'UA') && hasCyrillic(t.title) && isLatinOrCyrillic(t.title))
    .map((t) => t.title));
}

// Forms of one name a release title may carry: the name before the subtitle
// (no length cap), the 60-char short form and, for a long name, its first two
// words («Изгнанный читер-чародей»).
export function nameForms(name) {
  const s = String(name || '').trim();
  if (!s || !isLatinOrCyrillic(s)) return [];
  const cuts = [':', ' — ', '('].map((c) => s.indexOf(c)).filter((i) => i >= 0);
  const head = cuts.length ? s.slice(0, Math.min(...cuts)).trim() : s;
  const out = [head.length >= MIN_TITLE ? head : s, shortTitle(s)];
  if (s.length > LONG_TITLE) {
    const two = s.split(/\s+/).slice(0, 2).join(' ').replace(/[:,.(—–~]+$/, '');
    if (two.length >= MIN_TWO_WORDS) out.push(two);
  }
  return out;
}

// What the plan needs to know about a card: the RU and original titles for the
// queries, the Latin alternative title, the short RU fallback, and the names a
// relevant release title must contain one of (broader than the queries).
// alts: latinAltTitles(); opts.cyrillic: cyrillicAltTitles(); opts.kind.
// Anime without a Latin name (no alternative titles): names [] = no relevance check.
export function queryTitles(card, alts = [], opts = {}) {
  const kind = opts.kind;
  const rawRu = card.title || card.name || '';
  const rawOriginal = card.original_title || card.original_name || '';
  const ru = queryTitle(rawRu, kind);
  const original = queryTitle(rawOriginal, kind);
  const alt = alts[0] || '';
  const title = ru || alt || original;
  const short = ru ? shortTitle(ru) : '';
  let names = [];
  const add = (n) => {
    if (n && !names.some((x) => x.toLowerCase() === n.toLowerCase())) names.push(n);
  };
  [rawRu, rawOriginal, ...alts, ...(opts.cyrillic || [])].forEach((n) => nameForms(n).forEach(add));
  if (kind === 'anime' && !names.some(isLatin)) names = [];
  return { title, original: original || title, alt, short: short !== title ? short : '', names };
}

// Mirrors Lampa's components/full/start/torrents.js, with the titles given.
export function searchParamsFor(card, ctx, parseLang, title, original) {
  const year = String(card.first_air_date || card.release_date || '0000').slice(0, 4);
  const combinations = {
    df: original,
    df_year: original + ' ' + year,
    df_lg: original + ' ' + title,
    df_lg_year: original + ' ' + title + ' ' + year,
    lg: title,
    lg_year: title + ' ' + year,
    lg_df: title + ' ' + original,
    lg_df_year: title + ' ' + original + ' ' + year,
  };
  const s = ctx && ctx.kind !== 'movie' && Number.isInteger(ctx.season) && ctx.season >= 0 ? ctx.season : null;
  const season = s == null ? '' : ' S' + (s < 10 ? '0' : '') + s;
  return {
    search: (combinations[parseLang] || original || title) + season,
    search_one: title + season,
    search_two: original + season,
    movie: card,
    page: 1,
  };
}

// The parser sends params.movie.title / original_title as title= / title_original=.
const withTitles = (card, title, original) => ({ ...card, title, original_title: original });

// First query: the (short) RU title, the original only when it is Latin/Cyrillic.
export function firstQuery(card, ctx, parseLang, t) {
  const movie = withTitles(card, t.title, t.original);
  return searchParamsFor(movie, ctx, parseLang, t.title, t.original);
}

const same = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();

// Second query, by the Latin alternative title; null when there is none or it
// would repeat the first one.
export function secondQuery(card, ctx, t) {
  if (!t.alt) return null;
  if (same(t.alt, t.title) || same(t.alt, t.original)) return null;
  const movie = withTitles(card, t.title, t.alt);
  return searchParamsFor(movie, ctx, 'df', t.title, t.alt);
}

// Fallback by the short RU title (a movie or a tv title not cut for Q1); null
// when it is the same as the first query's title.
export function shortQuery(card, ctx, t) {
  if (!t.short || same(t.short, t.title)) return null;
  const movie = withTitles(card, t.short, t.short);
  return searchParamsFor(movie, ctx, 'lg', t.short, t.short);
}

export const needSecond = (kind, count) => kind === 'anime' || count < FEW_RESULTS;

// Queries after the first one, in order (at most two): the short RU title when
// the first query found little, then the Latin alternative title (anime, or little found).
export function followUpQueries(card, ctx, t, firstCount) {
  const out = [];
  if (firstCount < FEW_RESULTS) out.push(shortQuery(card, ctx, t));
  if (needSecond(ctx.kind, firstCount)) out.push(secondQuery(card, ctx, t));
  return out.filter(Boolean);
}

// Union of result lists: deduped by MagnetUri||Link, then by Title.
export function mergeResults(...lists) {
  const out = [];
  const links = new Set();
  const titles = new Set();
  for (const list of lists) {
    for (const r of list || []) {
      if (!r) continue;
      const link = r.MagnetUri || r.Link || '';
      const title = String(r.Title || '').trim().toLowerCase();
      if ((link && links.has(link)) || (title && titles.has(title))) continue;
      if (link) links.add(link);
      if (title) titles.add(title);
      out.push(r);
    }
  }
  return out;
}
