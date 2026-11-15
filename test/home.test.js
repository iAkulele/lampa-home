import test from 'node:test';
import assert from 'node:assert';
import { buildRows, wantsBadge, loadHomeRows } from '../src/home.js';

const cards = (n) => Array.from({ length: n }, (_, i) => ({ id: i + 1, title: 'Фильм ' + i }));

test('test_row_with_catalog_reports_more_pages_even_when_tmdb_has_one', () => {
  // The russian row's TMDB window often fits one page; its catalog has many.
  const [row] = buildRows([{ title: 'Русское', rowKey: 'russian', results: cards(5), total_pages: 1 }]);
  assert.ok(row.total_pages >= 2, 'Lampa shows «Ещё» only for total_pages > 1');
});

test('test_row_keeps_larger_tmdb_total_pages', () => {
  const [row] = buildRows([{ title: 'Новые фильмы', rowKey: 'movies', results: cards(20), total_pages: 7 }]);
  assert.strictEqual(row.total_pages, 7);
});

test('test_custom_row_reports_more_pages', () => {
  const [row] = buildRows([{ title: 'Комедия · фильмы', rowKey: 'custom:a1', results: cards(3), total_pages: 1 }]);
  assert.ok(row.total_pages >= 2);
});

test('test_full_history_row_gets_more', () => {
  const [row] = buildRows([{ title: 'Недавно просмотренное', rowKey: 'history', results: cards(20) }]);
  assert.ok(row.total_pages >= 2);
});

test('test_short_history_row_gets_more_too', () => {
  const [row] = buildRows([{ title: 'Недавно просмотренное', rowKey: 'history', results: cards(4) }]);
  assert.ok(row.total_pages >= 2);
});

test('test_custom_row_params_carry_its_catalog', () => {
  const custom = { id: 'a1', kind: 'tv', genre: 18 };
  const [row] = buildRows([{ title: 'Драма · сериалы', rowKey: 'custom:a1', custom, results: cards(3), total_pages: 1 }]);
  assert.strictEqual(row.params.lh_row, 'custom:a1');
  assert.deepStrictEqual(row.params.lh_custom, custom);
});

test('test_custom_tv_and_anime_rows_get_badges', () => {
  const tvCard = { id: 1, original_name: 'Show' };
  assert.strictEqual(wantsBadge('custom:a', tvCard, { kind: 'tv' }), true);
  assert.strictEqual(wantsBadge('custom:a', tvCard, { kind: 'anime' }), true);
  assert.strictEqual(wantsBadge('custom:a', { id: 2, original_title: 'Film' }, { kind: 'movie' }), false);
  assert.strictEqual(wantsBadge('movies', { id: 2 }), false);
  assert.strictEqual(wantsBadge('series', { id: 2 }), true);
});

test('test_home_loads_enabled_builtins_then_custom_rows', async () => {
  const cfg = {
    disabled: ['horror', 'anime', 'series', 'cartoons', 'russian_tv', 'history'],
    custom: [{ id: 'z', kind: 'movie', genre: 35 }],
  };
  const seen = [];
  const loaders = {
    row: (key, today) => { seen.push(['row', key, today]); return Promise.resolve(key); },
    custom: (c, today) => { seen.push(['custom', c.id, today]); return Promise.resolve(c.id); },
  };
  const loaded = await loadHomeRows(cfg, '2026-11-15', loaders);
  assert.deepStrictEqual(loaded, ['movies', 'russian', 'z']);
  assert.deepStrictEqual(seen, [
    ['row', 'movies', '2026-11-15'],
    ['row', 'russian', '2026-11-15'],
    ['custom', 'z', '2026-11-15'],
  ]);
});

test('test_empty_rows_are_dropped', () => {
  assert.deepStrictEqual(buildRows([{ title: 'x', rowKey: 'movies', results: [] }]), []);
});
