import test from 'node:test';
import assert from 'node:assert';
import { preloadProgress, cardSnapshot, badgeLabel, replacePlan } from '../src/downloads.js';

const MiB = 1024 ** 2;
const files = [
  { id: 1, path: 'Film/sample.mkv', length: 10 * MiB },
  { id: 2, path: 'Film/Film.mkv', length: 1000 * MiB },
];

test('test_done_when_loaded_reaches_file_length', () => {
  assert.deepStrictEqual(preloadProgress({ loaded_size: 1000 * MiB, file_stats: files, index: 2 }), { percent: 100, done: true });
  // Over the file length (pieces of neighbouring files) still counts as done, capped at 100 %.
  assert.deepStrictEqual(preloadProgress({ loaded_size: 1001 * MiB, file_stats: files, index: 2 }), { percent: 100, done: true });
  assert.strictEqual(preloadProgress({ loaded_size: 999 * MiB, file_stats: files, index: 2 }).done, false);
});

test('test_percent_rounds_down', () => {
  assert.deepStrictEqual(preloadProgress({ loaded_size: 459.9 * MiB, file_stats: files, index: 2 }), { percent: 45, done: false });
  // 99.99 % is not shown as 100.
  assert.strictEqual(preloadProgress({ loaded_size: 999.9 * MiB, file_stats: files, index: 2 }).percent, 99);
  // Unknown file or nothing loaded yet: 0 %, not done.
  assert.deepStrictEqual(preloadProgress({ file_stats: files, index: 9 }), { percent: 0, done: false });
  assert.deepStrictEqual(preloadProgress({ loaded_size: 0, index: 2 }), { percent: 0, done: false });
});

test('test_card_snapshot_keeps_needed_fields', () => {
  const card = {
    id: 42, title: 'Синтел', original_title: 'Sintel', original_language: 'en',
    backdrop_path: '/b.jpg', poster_path: '/p.jpg', genre_ids: [16], origin_country: ['NL'],
    release_date: '2010-09-27', runtime: 15,
    overview: 'long text', genres: [{ id: 16, name: 'мультфильм' }], credits: { cast: [] }, params: { style: { name: 'wide' } },
  };
  const s = cardSnapshot(card);
  assert.deepStrictEqual(s, {
    id: 42, title: 'Синтел', original_title: 'Sintel', original_language: 'en',
    backdrop_path: '/b.jpg', poster_path: '/p.jpg', genre_ids: [16], origin_country: ['NL'],
    release_date: '2010-09-27', runtime: 15,
  });
  // Full cards have genres instead of genre_ids; kind detection still needs them.
  assert.deepStrictEqual(cardSnapshot({ id: 7, name: 'Фрирен', original_name: 'Frieren', genres: [{ id: 16 }, { id: 10759 }] }).genre_ids, [16, 10759]);
  // The snapshot is JSON-safe (stored in Lampa.Storage).
  assert.deepStrictEqual(JSON.parse(JSON.stringify(s)), s);
});

test('test_badge_label', () => {
  assert.strictEqual(badgeLabel({ percent: 45, done: false }), 'Качается 45 %');
  assert.strictEqual(badgeLabel({ percent: 100, done: true }), 'Скачано');
  assert.strictEqual(badgeLabel(null), '');
});

test('test_replace_plan', () => {
  const h1 = '1'.repeat(40);
  const h2 = '2'.repeat(40);
  assert.strictEqual(replacePlan(null, h1), 'new');
  assert.strictEqual(replacePlan({ hash: h1 }, h1), 'same');
  assert.strictEqual(replacePlan({ hash: h1 }, h2), 'replace');
  // An entry without a hash has nothing on disk to remove.
  assert.strictEqual(replacePlan({}, h1), 'new');
});

test('test_badge_label_missing_on_server', () => {
  assert.strictEqual(badgeLabel({ missing: true, percent: 0, done: false }), 'Удалено на сервере');
});
