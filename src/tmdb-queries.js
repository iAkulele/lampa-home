// Pure TMDB query builders. No window, no Lampa.
// Result shape: { url, params } where params follow Lampa.Api.sources.tmdb.url():
// top-level genres / keywords / sort_by / page, plus filter:{} appended verbatim
// to the query string (values are strings, except where the brief says otherwise).

export const GENRES_MOVIE = [
  { id: 28, title: 'Боевик' },
  { id: 12, title: 'Приключения' },
  { id: 16, title: 'Мультфильм' },
  { id: 35, title: 'Комедия' },
  { id: 80, title: 'Криминал' },
  { id: 18, title: 'Драма' },
  { id: 14, title: 'Фэнтези' },
  { id: 27, title: 'Ужасы' },
  { id: 9648, title: 'Детектив' },
  { id: 10749, title: 'Мелодрама' },
  { id: 878, title: 'Фантастика' },
  { id: 53, title: 'Триллер' },
  { id: 10752, title: 'Военный' },
];

export const GENRES_TV = [
  { id: 10759, title: 'Боевик и приключения' },
  { id: 16, title: 'Анимация' },
  { id: 35, title: 'Комедия' },
  { id: 80, title: 'Криминал' },
  { id: 18, title: 'Драма' },
  { id: 9648, title: 'Детектив' },
  { id: 10765, title: 'Фантастика и фэнтези' },
  { id: 'horror', title: 'Ужасы' }, // TV has no horror genre: emulated via keywords
];

// TMDB keyword ids (verified via /search/keyword on 2026-11-14):
// horror, zombie, vampire, haunted house, slasher, supernatural horror.
export const GENRE_HORROR_TV_KEYWORDS = [315058, 12377, 3133, 3358, 12339, 256183];

const GENRE_ANIMATION = 16;
const GENRE_DOCUMENTARY = 99;

export function genresFor(kind) {
  if (kind === 'tv') return GENRES_TV;
  if (kind === 'movie') return GENRES_MOVIE;
  // anime is TV and cartoon is movie; animation (16) is already implied
  const base = kind === 'anime' ? GENRES_TV : kind === 'cartoon' ? GENRES_MOVIE : [];
  return base.filter((g) => g.id !== GENRE_ANIMATION);
}

// UTC arithmetic: immune to DST shifts.
export function daysAgo(today, n) {
  const [y, m, d] = today.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10);
}

// Digital release in the US, up to today.
function movieFilter(today) {
  return {
    with_release_type: '4',
    region: 'US',
    'primary_release_date.lte': today,
  };
}

// Returns null for 'history': it is built from local storage, not TMDB.
export function rowQuery(rowKey, today) {
  switch (rowKey) {
    case 'movies':
      return {
        url: 'discover/movie',
        params: {
          sort_by: 'primary_release_date.desc',
          filter: {
            ...movieFilter(today),
            without_genres: `${GENRE_ANIMATION},${GENRE_DOCUMENTARY}`,
          },
        },
      };
    case 'horror':
      return {
        url: 'discover/movie',
        params: {
          genres: 27,
          sort_by: 'primary_release_date.desc',
          filter: movieFilter(today),
        },
      };
    case 'anime':
      return {
        url: 'discover/tv',
        params: {
          genres: GENRE_ANIMATION,
          sort_by: 'popularity.desc',
          filter: { with_origin_country: 'JP', 'air_date.gte': daysAgo(today, 14) },
        },
      };
    case 'series':
      // Simplification: animation is excluded here; western cartoons series
      // are reachable only through the catalog.
      return {
        url: 'discover/tv',
        params: {
          sort_by: 'popularity.desc',
          filter: { without_genres: String(GENRE_ANIMATION), 'air_date.gte': daysAgo(today, 30) },
        },
      };
    case 'cartoons':
      return {
        url: 'discover/movie',
        params: {
          genres: GENRE_ANIMATION,
          sort_by: 'primary_release_date.desc',
          filter: movieFilter(today),
        },
      };
    default:
      return null;
  }
}

// A decade filter is stored as 'YYYY-YYYY'; single years stay numbers (-> null here).
export function yearRange(year) {
  const m = typeof year === 'string' && /^(\d{4})-(\d{4})$/.exec(year);
  return m ? { from: `${m[1]}-01-01`, to: `${m[2]}-12-31` } : null;
}

// kind: 'movie' | 'tv' | 'cartoon' | 'anime'
// filters: { genre: number|'horror'|null, year: number|'YYYY-YYYY'|null, sort: 'new'|'rating' }
// For 'anime' and 'cartoon' genre 16 is always applied; a chosen genre is ANDed with it.
export function catalogQuery(kind, filters, page, today) {
  const isTv = kind === 'tv' || kind === 'anime';
  const params = { page, filter: {} };
  const f = params.filter;

  const fixed = kind === 'anime' || kind === 'cartoon';
  if (filters.genre === 'horror') {
    params.keywords = GENRE_HORROR_TV_KEYWORDS.join('|');
    if (fixed) params.genres = GENRE_ANIMATION;
  } else if (fixed) {
    // comma = AND in TMDB: animation AND the chosen genre
    params.genres = filters.genre != null ? `${GENRE_ANIMATION},${filters.genre}` : GENRE_ANIMATION;
  } else if (filters.genre != null) {
    params.genres = filters.genre;
  }
  if (kind === 'anime') f.with_origin_country = 'JP';

  const dateField = isTv ? 'first_air_date' : 'primary_release_date';
  if (filters.sort === 'rating') {
    params.sort_by = 'vote_average.desc';
    f['vote_count.gte'] = '100';
  } else {
    params.sort_by = `${dateField}.desc`;
    f[`${dateField}.lte`] = today;
  }
  const range = yearRange(filters.year);
  if (range) {
    f[`${dateField}.gte`] = range.from;
    // the range end is in the past, so it is also tighter than lte=today
    f[`${dateField}.lte`] = range.to;
  } else if (filters.year != null) {
    f[isTv ? 'first_air_date_year' : 'primary_release_year'] = filters.year;
  }

  return { url: isTv ? 'discover/tv' : 'discover/movie', params };
}
