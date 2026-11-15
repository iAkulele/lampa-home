import test from 'node:test';
import assert from 'node:assert';
import { ROWS } from '../src/config.js';
import { catalogQuery, genresFor } from '../src/tmdb-queries.js';
import {
  normalizeRowsConfig,
  homeRows,
  isRowEnabled,
  toggleRow,
  addCustomRow,
  hasCustomRow,
  moveCustomRow,
  removeCustomRow,
  customRowTitle,
  customPreset,
  customRowQuery,
  customRowKeeps,
  customRowOf,
  newRowId,
  editorItems,
  customActions,
  kindItems,
  genreItems,
} from '../src/rows.js';

const cfg = (disabled = [], custom = []) => ({ disabled, custom });

test('test_default_config_is_all_builtins_no_custom', () => {
  assert.deepStrictEqual(normalizeRowsConfig(undefined), { disabled: [], custom: [] });
  assert.deepStrictEqual(normalizeRowsConfig('garbage'), { disabled: [], custom: [] });
  assert.deepStrictEqual(homeRows(normalizeRowsConfig(null)).map((r) => r.key), ROWS);
});

test('test_normalize_drops_unknown_builtins_and_invalid_custom_rows', () => {
  const raw = {
    disabled: ['horror', 'nope', 'horror', 5],
    custom: [
      { id: 'a', kind: 'movie', genre: 35 },
      { id: 'b', kind: 'boat', genre: 35 },
      { id: 'c', kind: 'movie', genre: 99999 },
      { id: 'd', kind: 'anime', genre: 16 }, // animation is implied for anime: not offered
      { id: 'a', kind: 'tv', genre: 18 }, // duplicate id
      { kind: 'tv', genre: 18 }, // no id
      null,
      { id: 'e', kind: 'tv', genre: 'horror' },
    ],
  };
  assert.deepStrictEqual(normalizeRowsConfig(raw), {
    disabled: ['horror'],
    custom: [
      { id: 'a', kind: 'movie', genre: 35 },
      { id: 'e', kind: 'tv', genre: 'horror' },
    ],
  });
});

test('test_home_rows_builtins_in_rows_order_then_custom_in_their_order', () => {
  const c = cfg(['horror', 'history'], [
    { id: 'x', kind: 'tv', genre: 18 },
    { id: 'y', kind: 'movie', genre: 35 },
  ]);
  const rows = homeRows(c);
  assert.deepStrictEqual(rows.map((r) => r.key), [
    'movies', 'anime', 'series', 'cartoons', 'russian', 'russian_tv', 'custom:x', 'custom:y',
  ]);
  assert.deepStrictEqual(rows[6].custom, { id: 'x', kind: 'tv', genre: 18 });
  assert.strictEqual(rows[0].custom, undefined);
});

test('test_toggle_builtin_row', () => {
  let c = cfg();
  assert.strictEqual(isRowEnabled(c, 'horror'), true);
  c = toggleRow(c, 'horror');
  assert.strictEqual(isRowEnabled(c, 'horror'), false);
  assert.deepStrictEqual(c.disabled, ['horror']);
  c = toggleRow(c, 'horror');
  assert.strictEqual(isRowEnabled(c, 'horror'), true);
  assert.deepStrictEqual(c.disabled, []);
});

test('test_toggle_does_not_mutate_input', () => {
  const c = cfg();
  toggleRow(c, 'movies');
  assert.deepStrictEqual(c, cfg());
});

test('test_add_custom_row_appends', () => {
  let c = addCustomRow(cfg(), 'movie', 35, 'id1');
  c = addCustomRow(c, 'anime', 10759, 'id2');
  assert.deepStrictEqual(c.custom, [
    { id: 'id1', kind: 'movie', genre: 35 },
    { id: 'id2', kind: 'anime', genre: 10759 },
  ]);
  assert.strictEqual(hasCustomRow(c, 'movie', 35), true);
  assert.strictEqual(hasCustomRow(c, 'tv', 35), false);
});

test('test_add_duplicate_custom_row_is_ignored', () => {
  const c = addCustomRow(cfg(), 'movie', 35, 'id1');
  assert.deepStrictEqual(addCustomRow(c, 'movie', 35, 'id2'), c);
});

test('test_move_custom_row_up_and_down_with_bounds', () => {
  const c = cfg([], [
    { id: 'a', kind: 'movie', genre: 35 },
    { id: 'b', kind: 'movie', genre: 18 },
    { id: 'c', kind: 'movie', genre: 27 },
  ]);
  const ids = (x) => x.custom.map((r) => r.id);
  assert.deepStrictEqual(ids(moveCustomRow(c, 'b', -1)), ['b', 'a', 'c']);
  assert.deepStrictEqual(ids(moveCustomRow(c, 'b', 1)), ['a', 'c', 'b']);
  assert.deepStrictEqual(ids(moveCustomRow(c, 'a', -1)), ['a', 'b', 'c']);
  assert.deepStrictEqual(ids(moveCustomRow(c, 'c', 1)), ['a', 'b', 'c']);
  assert.deepStrictEqual(ids(moveCustomRow(c, 'zzz', 1)), ['a', 'b', 'c']);
});

test('test_remove_custom_row', () => {
  const c = cfg([], [{ id: 'a', kind: 'movie', genre: 35 }, { id: 'b', kind: 'tv', genre: 18 }]);
  assert.deepStrictEqual(removeCustomRow(c, 'a').custom, [{ id: 'b', kind: 'tv', genre: 18 }]);
});

test('test_custom_row_title_is_genre_and_kind', () => {
  assert.strictEqual(customRowTitle({ kind: 'movie', genre: 35 }), 'Комедия · фильмы');
  assert.strictEqual(customRowTitle({ kind: 'tv', genre: 'horror' }), 'Ужасы · сериалы');
  assert.strictEqual(customRowTitle({ kind: 'cartoon', genre: 12 }), 'Приключения · мультфильмы');
  assert.strictEqual(customRowTitle({ kind: 'anime', genre: 10765 }), 'Фантастика и фэнтези · аниме');
});

test('test_custom_preset_is_fresh_catalog_with_genre', () => {
  assert.deepStrictEqual(customPreset({ kind: 'movie', genre: 35 }), { genre: 35, year: null, sort: 'new', lang: null });
});

test('test_custom_row_query_is_the_catalog_query', () => {
  const row = { kind: 'tv', genre: 18 };
  assert.deepStrictEqual(
    customRowQuery(row, 2, '2026-11-15'),
    catalogQuery('tv', { genre: 18, year: null, sort: 'new', lang: null }, 2, '2026-11-15'),
  );
});

test('test_custom_row_keeps_russian_titles_and_hides_anime_outside_anime', () => {
  const ru = { title: 'Сериал', original_language: 'en', genre_ids: [18] };
  const en = { title: 'Show', original_language: 'en', genre_ids: [18] };
  const anime = { name: 'Аниме', original_language: 'ja', genre_ids: [16, 18], origin_country: ['JP'] };
  const tv = customRowKeeps('tv');
  assert.strictEqual(tv(ru), true);
  assert.strictEqual(tv(en), false);
  assert.strictEqual(tv(anime), false);
  assert.strictEqual(customRowKeeps('cartoon')(anime), false);
  assert.strictEqual(customRowKeeps('anime')(anime), true);
});

test('test_custom_row_of_finds_row_by_key', () => {
  const c = cfg([], [{ id: 'a', kind: 'movie', genre: 35 }]);
  assert.deepStrictEqual(customRowOf(c, 'custom:a'), { id: 'a', kind: 'movie', genre: 35 });
  assert.strictEqual(customRowOf(c, 'custom:b'), null);
  assert.strictEqual(customRowOf(c, 'movies'), null);
});

test('test_editor_items_builtins_checkboxes_then_custom_then_add', () => {
  const c = cfg(['horror'], [{ id: 'a', kind: 'movie', genre: 35 }]);
  const items = editorItems(c);
  const builtins = items.filter((i) => i.lh && i.lh.type === 'builtin');
  assert.deepStrictEqual(builtins.map((i) => i.lh.key), ROWS);
  assert.ok(builtins.every((i) => i.checkbox === true));
  assert.strictEqual(builtins.find((i) => i.lh.key === 'horror').checked, false);
  assert.strictEqual(builtins.find((i) => i.lh.key === 'movies').checked, true);
  assert.strictEqual(builtins.find((i) => i.lh.key === 'movies').title, 'Новые фильмы');
  const customItems = items.filter((i) => i.lh && i.lh.type === 'custom');
  assert.deepStrictEqual(customItems.map((i) => [i.title, i.lh.id]), [['Комедия · фильмы', 'a']]);
  const last = items[items.length - 1];
  assert.strictEqual(last.title, '+ Добавить ленту по жанру');
  assert.strictEqual(last.lh.type, 'add');
  // custom rows come after every built-in and before "add"
  const pos = (pred) => items.findIndex(pred);
  assert.ok(pos((i) => i.lh && i.lh.type === 'custom') > pos((i) => i.lh && i.lh.key === 'history'));
});

test('test_custom_actions_skip_impossible_moves', () => {
  const c = cfg([], [
    { id: 'a', kind: 'movie', genre: 35 },
    { id: 'b', kind: 'movie', genre: 18 },
  ]);
  assert.deepStrictEqual(customActions(c, 'a').map((i) => i.title), ['Ниже', 'Удалить']);
  assert.deepStrictEqual(customActions(c, 'b').map((i) => i.title), ['Выше', 'Удалить']);
  const one = cfg([], [{ id: 'a', kind: 'movie', genre: 35 }]);
  assert.deepStrictEqual(customActions(one, 'a').map((i) => i.title), ['Удалить']);
});

test('test_kind_items_in_catalog_order', () => {
  assert.deepStrictEqual(kindItems().map((i) => [i.title, i.kind]), [
    ['Фильмы', 'movie'], ['Сериалы', 'tv'], ['Мультфильмы', 'cartoon'], ['Аниме', 'anime'],
  ]);
});

test('test_genre_items_mark_rows_already_added', () => {
  const c = cfg([], [{ id: 'a', kind: 'movie', genre: 35 }]);
  const items = genreItems(c, 'movie');
  assert.strictEqual(items.length, genresFor('movie').length);
  const comedy = items.find((i) => i.genre === 35);
  assert.strictEqual(comedy.ghost, true);
  assert.ok(comedy.subtitle);
  assert.strictEqual(items.find((i) => i.genre === 28).ghost, undefined);
});

test('test_new_row_id_is_unique_string', () => {
  const ids = new Set([newRowId(1000, () => 0.1), newRowId(1000, () => 0.2), newRowId(1001, () => 0.1)]);
  assert.strictEqual(ids.size, 3);
  for (const id of ids) assert.match(id, /^[a-z0-9]+$/);
});
