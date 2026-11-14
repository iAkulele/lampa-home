import test from 'node:test';
import assert from 'node:assert';
import {
  rowQuery,
  catalogQuery,
  genresFor,
  daysAgo,
  yearRange,
  GENRE_HORROR_TV_KEYWORDS,
} from '../src/tmdb-queries.js';

const TODAY = '2026-11-14';

test('test_days_ago_uses_utc_calendar_math', () => {
  assert.strictEqual(daysAgo(TODAY, 14), '2026-10-31');
  assert.strictEqual(daysAgo(TODAY, 30), '2026-10-15');
});

test('test_movies_row_uses_digital_release_us', () => {
  const q = rowQuery('movies', TODAY);
  assert.strictEqual(q.url, 'discover/movie');
  assert.strictEqual(q.params.filter['with_release_type'], '4');
  assert.strictEqual(q.params.filter.region, 'US');
  assert.strictEqual(q.params.sort_by, 'release_date.desc');
  assert.strictEqual(q.params.filter['release_date.lte'], TODAY);
  const without = q.params.filter.without_genres.split(',');
  assert.ok(without.includes('16'));
  assert.ok(without.includes('99'));
});

test('test_horror_row_adds_genre_27', () => {
  assert.strictEqual(rowQuery('horror', TODAY).params.genres, 27);
});

test('test_anime_row_is_tv_jp_animation_recent', () => {
  const q = rowQuery('anime', TODAY);
  assert.strictEqual(q.url, 'discover/tv');
  assert.strictEqual(q.params.genres, 16);
  assert.strictEqual(q.params.filter.with_origin_country, 'JP');
  assert.strictEqual(q.params.filter['air_date.gte'], '2026-10-31');
  assert.strictEqual(q.params.sort_by, 'popularity.desc');
});

test('test_series_row_excludes_anime', () => {
  const q = rowQuery('series', TODAY);
  assert.strictEqual(q.url, 'discover/tv');
  assert.strictEqual(q.params.filter['air_date.gte'], '2026-10-15');
  assert.strictEqual(q.params.filter.without_genres, '16');
});

test('test_cartoons_row_is_animation_movies', () => {
  const q = rowQuery('cartoons', TODAY);
  assert.strictEqual(q.params.genres, 16);
  assert.strictEqual(q.params.filter.with_release_type, '4');
  assert.strictEqual(q.params.filter.region, 'US');
});

test('test_history_row_has_no_query', () => {
  assert.strictEqual(rowQuery('history', TODAY), null);
});

test('test_catalog_sort_rating_requires_votes', () => {
  const q = catalogQuery('movie', { genre: null, year: null, sort: 'rating' }, 1, TODAY);
  assert.strictEqual(q.params.sort_by, 'vote_average.desc');
  assert.strictEqual(q.params.filter['vote_count.gte'], '100');
});

test('test_rows_have_vote_floor', () => {
  const floors = { movies: '20', horror: '20', cartoons: '20', series: '5', anime: '5' };
  for (const [row, v] of Object.entries(floors)) {
    assert.strictEqual(rowQuery(row, TODAY).params.filter['vote_count.gte'], v, row);
  }
});

test('test_catalog_year_filter', () => {
  const q = catalogQuery('movie', { genre: 28, year: 2024, sort: 'new' }, 2, TODAY);
  assert.strictEqual(q.params.filter.primary_release_year, 2024);
  assert.strictEqual(q.params.genres, 28);
  assert.strictEqual(q.params.page, 2);
});

test('test_catalog_tv_horror_uses_keywords', () => {
  const q = catalogQuery('tv', { genre: 'horror', year: null, sort: 'new' }, 1, TODAY);
  assert.strictEqual(q.params.keywords, GENRE_HORROR_TV_KEYWORDS.join('|'));
  assert.ok(!('genres' in q.params));
});

test('test_catalog_anime_is_tv_jp', () => {
  const q = catalogQuery('anime', { genre: null, year: null, sort: 'new' }, 1, TODAY);
  assert.strictEqual(q.url, 'discover/tv');
  assert.strictEqual(q.params.genres, 16);
  assert.strictEqual(q.params.filter.with_origin_country, 'JP');
});

test('test_genres_for_tv_has_horror', () => {
  assert.ok(genresFor('tv').some((g) => g.id === 'horror'));
});

test('test_catalog_anime_genre_is_anded_with_animation', () => {
  const q = catalogQuery('anime', { genre: 35, year: null, sort: 'new' }, 1, TODAY);
  assert.strictEqual(q.params.genres, '16,35');
});

test('test_catalog_cartoon_genre_is_anded_with_animation', () => {
  const q = catalogQuery('cartoon', { genre: 12, year: null, sort: 'new' }, 1, TODAY);
  assert.strictEqual(q.params.genres, '16,12');
});

test('test_genres_for_anime_excludes_animation', () => {
  assert.ok(genresFor('anime').length > 0);
  assert.ok(!genresFor('anime').some((g) => g.id === 16));
  assert.ok(!genresFor('cartoon').some((g) => g.id === 16));
});

test('test_year_range_maps_decade_string_to_dates', () => {
  assert.deepStrictEqual(yearRange('2000-2009'), { from: '2000-01-01', to: '2009-12-31' });
  assert.strictEqual(yearRange(2024), null);
  assert.strictEqual(yearRange(null), null);
  assert.strictEqual(yearRange('junk'), null);
});

test('test_catalog_year_range_uses_date_bounds', () => {
  const q = catalogQuery('movie', { genre: null, year: '1990-1999', sort: 'new' }, 1, TODAY);
  assert.strictEqual(q.params.filter['release_date.gte'], '1990-01-01');
  assert.strictEqual(q.params.filter['release_date.lte'], '1999-12-31');
  assert.ok(!('primary_release_year' in q.params.filter));
});

test('test_catalog_tv_year_range_uses_first_air_date', () => {
  const q = catalogQuery('tv', { genre: null, year: '2000-2009', sort: 'rating' }, 1, TODAY);
  assert.strictEqual(q.params.filter['first_air_date.gte'], '2000-01-01');
  assert.strictEqual(q.params.filter['first_air_date.lte'], '2009-12-31');
  assert.ok(!('first_air_date_year' in q.params.filter));
});

test('test_catalog_movie_new_has_digital_filter_and_votes', () => {
  for (const kind of ['movie', 'cartoon']) {
    const f = catalogQuery(kind, { genre: null, year: null, sort: 'new' }, 1, TODAY).params.filter;
    assert.strictEqual(f.with_release_type, '4');
    assert.strictEqual(f.region, 'US');
    assert.strictEqual(f['release_date.lte'], TODAY);
    assert.strictEqual(f['vote_count.gte'], '10');
  }
  // rating sort keeps the digital filter and its own vote floor
  const r = catalogQuery('movie', { genre: null, year: null, sort: 'rating' }, 1, TODAY).params.filter;
  assert.strictEqual(r.with_release_type, '4');
  assert.strictEqual(r.region, 'US');
  assert.strictEqual(r['release_date.lte'], TODAY);
  assert.strictEqual(r['vote_count.gte'], '100');
});

test('test_catalog_tv_new_has_votes_and_date_cap', () => {
  for (const kind of ['tv', 'anime']) {
    const q = catalogQuery(kind, { genre: null, year: null, sort: 'new' }, 1, TODAY);
    assert.strictEqual(q.params.sort_by, 'first_air_date.desc');
    assert.strictEqual(q.params.filter['first_air_date.lte'], TODAY);
    assert.strictEqual(q.params.filter['vote_count.gte'], '5');
    assert.ok(!('with_release_type' in q.params.filter));
  }
});

test('test_movie_rows_sort_and_cap_by_release_date', () => {
  for (const row of ['movies', 'horror', 'cartoons']) {
    const q = rowQuery(row, TODAY);
    assert.strictEqual(q.params.sort_by, 'release_date.desc', row);
    assert.strictEqual(q.params.filter['release_date.lte'], TODAY, row);
    assert.ok(!('primary_release_date.lte' in q.params.filter), row);
    assert.strictEqual(q.params.filter.with_release_type, '4', row);
    assert.strictEqual(q.params.filter.region, 'US', row);
  }
  const c = catalogQuery('cartoon', { genre: null, year: null, sort: 'new' }, 1, TODAY);
  assert.strictEqual(c.params.sort_by, 'release_date.desc');
});

test('test_catalog_movie_excludes_animation_and_docs_like_row', () => {
  const f = catalogQuery('movie', { genre: 28, year: null, sort: 'new' }, 1, TODAY).params.filter;
  assert.strictEqual(f.without_genres, '16,99');
  assert.strictEqual(catalogQuery('movie', { genre: null, year: null, sort: 'rating' }, 1, TODAY).params.filter.without_genres, '16,99');
  // Animation chosen explicitly: no exclusion.
  assert.ok(!('without_genres' in catalogQuery('movie', { genre: 16, year: null, sort: 'new' }, 1, TODAY).params.filter));
  // Cartoons are animation by definition.
  assert.ok(!('without_genres' in catalogQuery('cartoon', { genre: null, year: null, sort: 'new' }, 1, TODAY).params.filter));
});

test('test_tv_rows_skip_announced_episodes', () => {
  for (const row of ['anime', 'series']) {
    assert.strictEqual(rowQuery(row, TODAY).params.filter['air_date.lte'], TODAY, row);
  }
});

test('test_russian_row_is_ru_language_movies', () => {
  const q = rowQuery('russian', TODAY);
  assert.strictEqual(q.url, 'discover/movie');
  assert.strictEqual(q.params.orig_lang, 'ru');
  assert.strictEqual(q.params.sort_by, 'release_date.desc');
  assert.strictEqual(q.params.filter['release_date.lte'], TODAY);
  assert.strictEqual(q.params.filter['vote_count.gte'], '10');
  assert.strictEqual(q.params.filter.without_genres, '99');
  assert.ok(!('with_release_type' in q.params.filter));
  assert.ok(!('region' in q.params.filter));
});

test('test_catalog_movie_lang_ru', () => {
  const q = catalogQuery('movie', { genre: null, year: null, sort: 'new', lang: 'ru' }, 1, TODAY);
  assert.strictEqual(q.params.filter.with_original_language, 'ru');
  assert.ok(!('with_release_type' in q.params.filter));
  assert.ok(!('region' in q.params.filter));
  assert.strictEqual(q.params.filter['release_date.lte'], TODAY);
  const n = catalogQuery('movie', { genre: null, year: null, sort: 'new', lang: null }, 1, TODAY);
  assert.strictEqual(n.params.filter.with_release_type, '4');
  assert.ok(!('with_original_language' in n.params.filter));
});
