import test from 'node:test';
import assert from 'node:assert';
import { preloadProgress, cardSnapshot, badgeLabel, replacePlan, parseDownloadEntries, findExisting, legacyEntries } from '../src/downloads.js';

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

const tsItem = (hash, data, extra = {}) => ({
  hash, title: '[LAMPA] Release ' + hash.slice(0, 2), timestamp: 1700000000, torrent_size: 1000,
  data: typeof data === 'string' ? data : JSON.stringify(data), ...extra,
});
const film = { id: 42, title: 'Синтел', original_title: 'Sintel' };
const show = { id: 7, name: 'Фрирен', original_name: 'Frieren' };

test('test_parse_entries_keeps_only_lh_preload', () => {
  const list = [
    tsItem('a'.repeat(40), { lampa: true, movie: film, lh_preload: { index: 2, kind: 'movie', added: 10, by: 'tv' } }),
    // Played with «Играть» or added by Lampa itself: not a download.
    tsItem('b'.repeat(40), { lampa: true, movie: film }),
    tsItem('c'.repeat(40), { lampa: true, movie: show, lh_preload: { season: 1, episode: 5, absolute: 5, kind: 'anime', added: 20 } }),
    { hash: 'd'.repeat(40), title: 'no data' },
  ];
  const out = parseDownloadEntries(list);
  assert.deepStrictEqual(out.map((e) => e.hash[0]), ['c', 'a']);
  assert.deepStrictEqual(out[1], {
    key: 'movie:42', hash: 'a'.repeat(40), card: film, index: 2, season: undefined, episode: undefined,
    absolute: undefined, kind: 'movie', added: 10, size: 1000, title: 'Release aa',
  });
  assert.strictEqual(out[0].key, 'tv:7');
  // No index yet (the file pick was not saved): picked again at play time.
  assert.strictEqual(out[0].index, undefined);
  assert.strictEqual(out[0].episode, 5);
});

test('test_parse_entries_skips_bad_json', () => {
  const list = [
    tsItem('a'.repeat(40), '{"lampa":true,"movie":'),
    tsItem('b'.repeat(40), 'null'),
    tsItem('c'.repeat(40), { lampa: true, lh_preload: { added: 1 } }), // no card
    tsItem('d'.repeat(40), { lampa: true, movie: film, lh_preload: 'yes' }),
    tsItem('e'.repeat(40), { lampa: true, movie: film, lh_preload: { kind: 'movie', added: 1 } }),
    null,
  ];
  assert.deepStrictEqual(parseDownloadEntries(list).map((e) => e.hash[0]), ['e']);
  assert.deepStrictEqual(parseDownloadEntries(null), []);
  assert.deepStrictEqual(parseDownloadEntries({ error: 'x' }), []);
});

test('test_parse_entries_newest_first', () => {
  const list = [
    tsItem('a'.repeat(40), { movie: film, lh_preload: { added: 100 } }),
    tsItem('b'.repeat(40), { movie: show, lh_preload: { added: 300 } }),
    // No `added`: TorrServer's own timestamp (seconds) is used.
    tsItem('c'.repeat(40), { movie: { id: 9, title: 'X' }, lh_preload: {} }, { timestamp: 0.2 }),
  ];
  assert.deepStrictEqual(parseDownloadEntries(list).map((e) => e.hash[0]), ['b', 'c', 'a']);
});

test('test_find_existing_prefers_same_hash', () => {
  const h1 = '1'.repeat(40);
  const h2 = '2'.repeat(40);
  const entries = [{ key: 'movie:42', hash: h2 }, { key: 'movie:42', hash: h1 }, { key: 'tv:42', hash: '3'.repeat(40) }];
  assert.strictEqual(findExisting(entries, 'movie:42', h1).hash, h1);
  assert.strictEqual(findExisting(entries, 'movie:42', '4'.repeat(40)).hash, h2);
  assert.strictEqual(findExisting(entries, 'movie:9', h1), null);
  assert.strictEqual(findExisting(null, 'movie:42', h1), null);
});

test('test_legacy_entries_only_unmarked_on_server', () => {
  const h = (c) => c.repeat(40);
  const list = [
    tsItem(h('a'), { lampa: true, movie: film }), // old download, not marked yet
    tsItem(h('b'), { lampa: true, movie: film, lh_preload: { added: 1 } }), // already marked
  ];
  const cached = [
    { key: 'movie:42', hash: h('a'), card: film, index: 1, added: 5 },
    { key: 'movie:42', hash: h('b'), card: film, added: 1 },
    { key: 'tv:7', hash: h('c'), card: show, added: 9 }, // gone from the server
  ];
  const out = legacyEntries(list, cached);
  assert.deepStrictEqual(out.map((e) => e.hash), [h('a')]);
  assert.strictEqual(out[0].server.hash, h('a'));
  assert.deepStrictEqual(legacyEntries(null, cached), []);
});
