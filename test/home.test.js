import test from 'node:test';
import assert from 'node:assert';
import { buildRows } from '../src/home.js';

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

test('test_short_history_row_has_no_more', () => {
  const [row] = buildRows([{ title: 'Недавно просмотренное', rowKey: 'history', results: cards(4) }]);
  assert.strictEqual(row.total_pages, 1);
});

test('test_empty_rows_are_dropped', () => {
  assert.deepStrictEqual(buildRows([{ title: 'x', rowKey: 'movies', results: [] }]), []);
});
