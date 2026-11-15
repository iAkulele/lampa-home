// Pure helpers that shape parser queries: short titles, script checks, TMDB
// alternative titles, the two-query plan and merging of its results.

const MIN_TITLE = 4;
const MAX_TITLE = 60;
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

// Title as sent to the parser: long ones shortened, non-Latin/Cyrillic ones dropped ('').
export function queryTitle(name) {
  const s = String(name || '').trim();
  if (!isLatinOrCyrillic(s)) return '';
  return s.length > LONG_TITLE ? shortTitle(s) : s;
}

// TMDB alternative_titles ({results} for tv, {titles} for movies) -> Latin titles,
// JP entries first, then US; each shortened, at least 4 characters, no duplicates.
export function latinAltTitles(json) {
  const list = (json && (json.results || json.titles)) || [];
  const rank = (c) => (c === 'JP' ? 0 : c === 'US' ? 1 : 2);
  const out = [];
  const seen = new Set();
  list
    .filter((t) => t && (t.iso_3166_1 === 'JP' || t.iso_3166_1 === 'US') && isLatin(t.title))
    .sort((a, b) => rank(a.iso_3166_1) - rank(b.iso_3166_1))
    .forEach((t) => {
      const s = shortTitle(t.title);
      const key = s.toLowerCase();
      if (s.length >= MIN_TITLE && !seen.has(key)) {
        seen.add(key);
        out.push(s);
      }
    });
  return out;
}

// What the plan needs to know about a card: the RU and original titles for the
// queries, the Latin alternative title for the second one, and all names that
// a relevant release title must contain one of.
// card: {title|name, original_title|original_name}; alts: latinAltTitles() output.
export function queryTitles(card, alts = []) {
  const ru = queryTitle(card.title || card.name);
  const rawOriginal = card.original_title || card.original_name || '';
  const original = queryTitle(rawOriginal);
  const alt = alts[0] || '';
  const title = ru || alt || original;
  const names = [];
  const add = (n) => {
    const s = shortTitle(n);
    if (s && isLatinOrCyrillic(s) && !names.some((x) => x.toLowerCase() === s.toLowerCase())) names.push(s);
  };
  [card.title || card.name, rawOriginal, ...alts].forEach(add);
  return { title, original: original || title, alt, names };
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

// Second query, by the Latin alternative title; null when there is none or it
// would repeat the first one.
export function secondQuery(card, ctx, t) {
  if (!t.alt) return null;
  const same = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
  if (same(t.alt, t.title) || same(t.alt, t.original)) return null;
  const movie = withTitles(card, t.title, t.alt);
  return searchParamsFor(movie, ctx, 'df', t.title, t.alt);
}

export const needSecond = (kind, count) => kind === 'anime' || count < FEW_RESULTS;

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
