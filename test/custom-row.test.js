import test from 'node:test';
import assert from 'node:assert';
import { loadCustomRow } from '../src/tmdb.js';
import { customRowQuery } from '../src/rows.js';

// Stub of Lampa's TMDB source: records requests, answers with `pages[page]`.
function stubTmdb(pages) {
  const calls = [];
  globalThis.window = {
    Lampa: {
      Api: {
        sources: {
          tmdb: {
            get(url, params, ok) {
              calls.push({ url, params });
              ok(pages[params.page] || { results: [], total_pages: 1 });
            },
          },
        },
      },
    },
  };
  return calls;
}

const ru = (id, extra = {}) => ({ id, name: 'Сериал ' + id, original_language: 'en', genre_ids: [18], ...extra });

test('test_custom_row_loads_catalog_query_with_catalog_filtering', async () => {
  const today = '2026-11-15';
  const row = { id: 'x1', kind: 'tv', genre: 18 };
  const anime = { id: 99, name: 'Аниме', original_language: 'ja', origin_country: ['JP'], genre_ids: [16, 18] };
  const english = { id: 98, name: 'Show', original_language: 'en', genre_ids: [18] };
  const page1 = { results: [ru(1), anime, english, ...Array.from({ length: 12 }, (_, i) => ru(10 + i))], total_pages: 1 };
  const calls = stubTmdb({ 1: page1 });

  const loaded = await loadCustomRow(row, today);

  const q = customRowQuery(row, 1, today);
  assert.strictEqual(calls[0].url, q.url);
  assert.deepStrictEqual(calls[0].params, q.params);
  assert.strictEqual(loaded.rowKey, 'custom:x1');
  assert.strictEqual(loaded.title, 'Драма · сериалы');
  assert.deepStrictEqual(loaded.custom, row);
  assert.strictEqual(loaded.total_pages, 1);
  const ids = loaded.results.map((c) => c.id);
  assert.ok(ids.includes(1));
  assert.ok(!ids.includes(98), 'no Russian title: dropped');
  assert.ok(!ids.includes(99), 'anime is hidden outside the anime kind');
});

test('test_custom_row_fills_from_further_pages', async () => {
  const row = { id: 'x2', kind: 'movie', genre: 35 };
  const calls = stubTmdb({
    1: { results: [ru(1)], total_pages: 3 },
    2: { results: Array.from({ length: 15 }, (_, i) => ru(100 + i)), total_pages: 3 },
  });
  const loaded = await loadCustomRow(row, '2026-11-15');
  assert.deepStrictEqual(calls.map((c) => c.params.page), [1, 2]);
  assert.strictEqual(loaded.results.length, 16);
  assert.strictEqual(loaded.total_pages, 3);
});

test('test_custom_row_failure_resolves_empty', async () => {
  globalThis.window = { Lampa: { Api: { sources: { tmdb: { get: (u, p, ok, fail) => fail(new Error('net')) } } } } };
  const loaded = await loadCustomRow({ id: 'x3', kind: 'movie', genre: 35 }, '2026-11-15');
  assert.deepStrictEqual(loaded.results, []);
  assert.strictEqual(loaded.rowKey, 'custom:x3');
});
