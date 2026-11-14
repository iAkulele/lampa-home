import test from 'node:test';
import assert from 'node:assert';
import {
  rowQuery,
  catalogQuery,
  genresFor,
  daysAgo,
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
  assert.strictEqual(q.params.sort_by, 'primary_release_date.desc');
  assert.strictEqual(q.params.filter['primary_release_date.lte'], TODAY);
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
