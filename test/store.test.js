import test from 'node:test';
import assert from 'node:assert';
import { createStore } from '../src/store.js';
import { STORAGE_KEYS, LIMITS } from '../src/config.js';

const H = 3600e3;

function fakeStorage() {
  const m = new Map();
  return {
    get: (key, empty) => (m.has(key) ? JSON.parse(m.get(key)) : empty),
    set: (key, value) => { m.set(key, JSON.stringify(value)); },
  };
}

function make(t0 = 1000) {
  const clock = { t: t0 };
  const storage = fakeStorage();
  const store = createStore(storage, () => clock.t);
  return { store, clock, storage };
}

test('test_progress_roundtrip', () => {
  const { store } = make(5000);
  store.progress.set(42, { season: 2, episode: 3, hash: 'abc' });
  assert.deepStrictEqual(store.progress.get(42), { season: 2, episode: 3, hash: 'abc', updated: 5000 });
});

test('test_progress_missing_is_null', () => {
  const { store } = make();
  assert.strictEqual(store.progress.get(1), null);
});

test('test_seen_roundtrip', () => {
  const { store } = make();
  assert.strictEqual(store.seen.get(7), null);
  store.seen.set(7, 5);
  assert.strictEqual(store.seen.get(7), 5);
});

test('test_tvcache_expires_after_12h', () => {
  const { store, clock } = make(0);
  store.tvcache.set(9, 'Returning Series');
  clock.t = 11 * H;
  assert.deepStrictEqual(store.tvcache.get(9), { status: 'Returning Series', checked: 0 });
  clock.t = LIMITS.tvCacheMs + 1 * H;
  assert.strictEqual(store.tvcache.get(9), null);
});

test('test_notify_due_first_time_true_then_false_after_mark', () => {
  const { store, clock } = make(10 * H);
  assert.strictEqual(store.notify.due(), true);
  store.notify.mark();
  assert.strictEqual(store.notify.due(), false);
  clock.t += 6 * H;
  assert.strictEqual(store.notify.due(), true);
});

test('test_filters_default', () => {
  const { store } = make();
  assert.deepStrictEqual(store.filters.get('movies'), { genre: null, year: null, sort: 'new' });
});

test('test_filters_per_kind_independent', () => {
  const { store } = make();
  store.filters.set('movies', { genre: 28, year: 2020, sort: 'popular' });
  assert.deepStrictEqual(store.filters.get('movies'), { genre: 28, year: 2020, sort: 'popular' });
  assert.deepStrictEqual(store.filters.get('series'), { genre: null, year: null, sort: 'new' });
});

test('test_rows_config_default_and_roundtrip', () => {
  const { store, storage } = make();
  assert.deepStrictEqual(store.rows.get(), { disabled: [], custom: [] });
  const cfg = { disabled: ['horror'], custom: [{ id: 'a', kind: 'movie', genre: 35 }] };
  store.rows.set(cfg);
  assert.deepStrictEqual(store.rows.get(), cfg);
  assert.deepStrictEqual(storage.get(STORAGE_KEYS.rows), cfg);
  assert.strictEqual(STORAGE_KEYS.rows, 'lh_rows');
});

test('test_prune_keeps_200_newest', () => {
  const { store, clock, storage } = make(0);
  for (let i = 0; i < 250; i++) {
    clock.t = i;
    store.progress.set(i, { season: 1, episode: 1, hash: 'h' });
    store.tvcache.set(i, 'Ended');
  }
  clock.t = 250;
  store.prune();
  assert.strictEqual(Object.keys(storage.get(STORAGE_KEYS.progress, {})).length, 200);
  assert.strictEqual(Object.keys(storage.get(STORAGE_KEYS.tvcache, {})).length, 200);
  assert.strictEqual(store.progress.get(49), null);
  assert.notStrictEqual(store.progress.get(50), null);
  assert.notStrictEqual(store.progress.get(249), null);
});

test('test_preload_all_newest_first', () => {
  const { store } = make();
  store.preload.set(1, { added: 100, title: 'a' });
  store.preload.set(2, { added: 300, title: 'b' });
  store.preload.set(3, { added: 200, title: 'c' });
  assert.deepStrictEqual(store.preload.get(2), { added: 300, title: 'b' });
  assert.deepStrictEqual(store.preload.all().map((e) => e.cardId), ['2', '3', '1']);
  assert.strictEqual(store.preload.all()[0].title, 'b');
});

test('test_preload_remove', () => {
  const { store } = make();
  store.preload.set(1, { added: 1 });
  store.preload.remove(1);
  assert.strictEqual(store.preload.get(1), null);
  assert.deepStrictEqual(store.preload.all(), []);
});

test('test_prune_skips_malformed_entries', () => {
  const { store, storage } = make(0);
  storage.set(STORAGE_KEYS.progress, { 1: null, 2: 'junk', 3: { season: 1, episode: 2, updated: 5 } });
  storage.set(STORAGE_KEYS.tvcache, { 7: null, 8: { status: null, checked: 1 } });
  assert.doesNotThrow(() => store.prune());
  assert.deepStrictEqual(Object.keys(storage.get(STORAGE_KEYS.progress, {})), ['3']);
  assert.deepStrictEqual(Object.keys(storage.get(STORAGE_KEYS.tvcache, {})), ['8']);
});

test('test_preload_replace_all', () => {
  const { store } = make();
  store.preload.set('movie:1', { added: 1 });
  store.preload.replace({ 'tv:2': { added: 2, hash: 'h' } });
  assert.strictEqual(store.preload.get('movie:1'), null);
  assert.deepStrictEqual(store.preload.all(), [{ cardId: 'tv:2', added: 2, hash: 'h' }]);
});
