import test from 'node:test';
import assert from 'node:assert';
import {
  presetFor,
  yearOptions,
  chosenLabels,
  genreName,
  applyPreset,
  guarded,
  dedupe,
  KIND_TITLES,
} from '../src/catalog.js';

test('test_preset_for_rows', () => {
  // Rows are "new" lists: their catalogs open on sort 'new' with no year.
  const fresh = { genre: null, year: null, sort: 'new' };
  assert.deepStrictEqual(presetFor('movies'), { kind: 'movie', preset: fresh });
  assert.deepStrictEqual(presetFor('horror'), { kind: 'movie', preset: { ...fresh, genre: 27 } });
  assert.deepStrictEqual(presetFor('anime'), { kind: 'anime', preset: fresh });
  assert.deepStrictEqual(presetFor('series'), { kind: 'tv', preset: fresh });
  assert.deepStrictEqual(presetFor('cartoons'), { kind: 'cartoon', preset: fresh });
  assert.strictEqual(presetFor('history'), null);
  assert.strictEqual(presetFor('nope'), null);
});

test('test_apply_preset_merges_over_stored', () => {
  const stored = { genre: 35, year: 2020, sort: 'rating' };
  assert.deepStrictEqual(applyPreset(stored, { genre: 27 }), { genre: 27, year: 2020, sort: 'rating' });
  assert.deepStrictEqual(applyPreset(stored, undefined), stored);
});

test('test_year_options_from_current_year_down_to_2010_then_decades', () => {
  const opts = yearOptions('2026-11-14');
  assert.deepStrictEqual(opts[0], { title: 'Все', value: null });
  assert.deepStrictEqual(opts[1], { title: '2026', value: 2026 });
  assert.deepStrictEqual(opts[17], { title: '2010', value: 2010 });
  assert.deepStrictEqual(opts.slice(18), [
    { title: '2000–2009', value: '2000-2009' },
    { title: '1990–1999', value: '1990-1999' },
  ]);
});

test('test_genre_name_and_chosen_labels', () => {
  assert.strictEqual(genreName('movie', 27), 'Ужасы');
  assert.strictEqual(genreName('tv', 'horror'), 'Ужасы');
  assert.strictEqual(genreName('movie', null), 'все');
  assert.strictEqual(genreName('movie', 999999), 'все');
  assert.deepStrictEqual(chosenLabels('movie', { genre: 27, year: null, sort: 'new' }), {
    genre: 'Жанр: Ужасы',
    year: 'Год: все',
    sort: 'Сначала новые',
  });
  assert.deepStrictEqual(chosenLabels('tv', { genre: null, year: '2000-2009', sort: 'rating' }), {
    genre: 'Жанр: все',
    year: 'Год: 2000–2009',
    sort: 'По рейтингу',
  });
});

test('test_kind_titles', () => {
  assert.deepStrictEqual(KIND_TITLES, { movie: 'Фильмы', tv: 'Сериалы', cartoon: 'Мультфильмы', anime: 'Аниме' });
});

test('test_horror_preset_overrides_stored_sort_and_year', () => {
  const stored = { genre: 35, year: 2020, sort: 'rating' };
  assert.deepStrictEqual(applyPreset(stored, presetFor('horror').preset), { genre: 27, year: null, sort: 'new' });
});

test('test_guarded_drops_calls_after_destroy', () => {
  const comp = { destroyed: false };
  const calls = [];
  const fn = guarded(comp, (x) => calls.push(x));
  fn(1);
  comp.destroyed = true;
  fn(2);
  assert.deepStrictEqual(calls, [1]);
});

test('test_dedupe_skips_ids_already_shown', () => {
  const seen = new Set();
  assert.deepStrictEqual(dedupe([{ id: 1 }, { id: 2 }], seen).map((c) => c.id), [1, 2]);
  assert.deepStrictEqual(dedupe([{ id: 2 }, { id: 3 }, { id: 3 }], seen).map((c) => c.id), [3]);
  // cards without an id are kept
  assert.strictEqual(dedupe([{ title: 'x' }], seen).length, 1);
});
