// Parser search for «Играть» / «Скачать заранее»: the query sequence (RU title,
// short title, Latin alternative), jac.red's rate limit, the result cache and
// Lampa's native torrent list as the manual fallback.
import { lampa, storageField } from './lampa.js';
import { LIMITS } from './config.js';
import {
  isLatinOrCyrillic, latinAltTitles, cyrillicAltTitles, queryTitles, firstQuery, followUpQueries, mergeResults, searchParamsFor,
  FEW_RESULTS,
} from './search-query.js';
import { fail, withTimeout, sleep } from './play-error.js';
import { originalTitle } from './play-pick.js';

// jac.red answers HTTP 429 to a second request within about a second.
const QUERY_GAP_MS = 1200;
// A parser failure faster than this is a rate limit, not a dead parser: one retry.
const RETRY_FAST_MS = 500;
const RETRY_AFTER_MS = 2000;
// «Играть» then «Скачать заранее» (or a second press) reuse the search.
const RESULTS_TTL_MS = 60000;
const ALT_TIMEOUT_MS = 5000;

const MSG_PARSER = 'Парсер не ответил';

// Mirrors Lampa's components/full/start/torrents.js (the native list's params).
export function buildSearchParams(card, ctx, parseLang) {
  const title = card.title || card.name || '';
  const original = card.original_title || card.original_name || title;
  return searchParamsFor(card, ctx, parseLang, title, original);
}

// buildSearchParams with the user's parser language.
export const listParams = (card, ctx) => buildSearchParams(card, ctx, storageField('parse_lang'));

export function openNativeList(params) {
  const L = lampa();
  L.Activity.push({ url: '', title: L.Lang.translate('title_torrents'), component: 'torrents', ...params });
}

function searchTorrents(params) {
  const L = lampa();
  const req = new Promise((resolve, reject) => {
    L.Parser.get(params, (data) => resolve((data && data.Results) || []), () => reject(fail(MSG_PARSER)));
  });
  return withTimeout(req, LIMITS.searchTimeoutMs, MSG_PARSER);
}

// One parser query; a failure within RETRY_FAST_MS (jac.red's 429) is retried once after 2 s.
async function searchOnce(params, job) {
  const started = Date.now();
  try {
    return await searchTorrents(params);
  } catch (err) {
    if ((job && job.cancelled) || Date.now() - started >= RETRY_FAST_MS) throw err;
    await sleep(RETRY_AFTER_MS);
    if (job && job.cancelled) throw err;
    return searchTorrents(params);
  }
}

const altCache = new Map();

// Alternative titles of the card (TMDB alternative_titles): {latin, cyrillic},
// cached per card; null when TMDB did not answer.
function altTitles(kind, id) {
  if (id == null) return Promise.resolve(null);
  const key = (kind === 'movie' ? 'movie/' : 'tv/') + id;
  if (altCache.has(key)) return Promise.resolve(altCache.get(key));
  const req = new Promise((resolve, reject) => {
    lampa().Api.sources.tmdb.get(key + '/alternative_titles', {}, resolve, reject);
  });
  return withTimeout(req, ALT_TIMEOUT_MS, MSG_PARSER).then(
    (json) => {
      const alts = { latin: latinAltTitles(json), cyrillic: cyrillicAltTitles(json) };
      altCache.set(key, alts);
      return alts;
    },
    () => null,
  );
}

const resultsCache = new Map();

// Parser results for the target: Q1 by the RU title (tv/anime: cut when long);
// then, at least 1.2 s apart, the short RU title when Q1 found little and the
// Latin alternative title for anime or when Q1 found little.
// -> {results, names (for selectTorrent's relevance check), params (Q1)}.
export async function findReleases(movie, ctx, job) {
  const key = [movie.id, ctx.kind, ctx.seasonMap ? 'map' : ctx.season].join(':');
  const hit = resultsCache.get(key);
  if (hit && Date.now() - hit.at < RESULTS_TTL_MS) return hit.value;

  const cancelled = () => !!(job && job.cancelled);
  const original = originalTitle(movie);
  const titlesOf = (alts) => queryTitles(movie, (alts && alts.latin) || [], { kind: ctx.kind, cyrillic: alts && alts.cyrillic });
  let alts = ctx.kind === 'anime' || !isLatinOrCyrillic(original) ? await altTitles(ctx.kind, movie.id) : undefined;
  let titles = titlesOf(alts);
  const params = firstQuery(movie, ctx, storageField('parse_lang'), titles);
  const lists = [await searchOnce(params, job)];
  let lastDone = Date.now();
  let failed = false;
  if (!cancelled() && lists[0].length < FEW_RESULTS && alts === undefined) {
    alts = await altTitles(ctx.kind, movie.id);
    titles = { ...titlesOf(alts), title: titles.title, original: titles.original };
  }
  for (const q of cancelled() ? [] : followUpQueries(movie, ctx, titles, lists[0].length)) {
    const wait = QUERY_GAP_MS - (Date.now() - lastDone);
    if (wait > 0) await sleep(wait);
    if (cancelled()) break;
    try {
      lists.push(await searchOnce(q, job));
    } catch (e) {
      failed = true;
    }
    lastDone = Date.now();
  }
  const value = { results: mergeResults(...lists), names: titles.names, params };
  // A failed follow-up or a cancelled run is not cached: the next press asks again.
  if (!cancelled() && !failed) resultsCache.set(key, { at: Date.now(), value });
  return value;
}
