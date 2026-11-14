import test from 'node:test';
import assert from 'node:assert';
import { diffNewEpisodes, toastLines } from '../src/notify.js';

const item = (id, status) => ({ card: { id, name: 'T' + id }, status });
const seenOf = (map) => (id) => (id in map ? map[id] : null);

test('test_diff_new_episode_detected', () => {
  const r = diffNewEpisodes([item(1, { airing: true, aired: 5 })], seenOf({ 1: 4 }));
  assert.deepStrictEqual(r.map((x) => [x.id, x.aired]), [[1, 5]]);
  assert.strictEqual(r[0].card.id, 1);
});

test('test_diff_first_seen_not_reported', () => {
  assert.deepStrictEqual(diffNewEpisodes([item(1, { airing: true, aired: 5 })], seenOf({})), []);
});

test('test_diff_not_airing_not_reported', () => {
  assert.deepStrictEqual(diffNewEpisodes([item(1, { airing: false, aired: 9 }), item(2, null)], seenOf({ 1: 4, 2: 1 })), []);
  assert.deepStrictEqual(diffNewEpisodes([item(1, { airing: true, aired: 4 })], seenOf({ 1: 4 })), []);
});

test('test_toast_lines_limit_three_plus_more', () => {
  const mk = (n) => Array.from({ length: n }, (_, i) => ({ id: i, aired: i + 1, card: { name: 'A' + i } }));
  assert.deepStrictEqual(toastLines(mk(2)), ['Вышла 1 серия: A0', 'Вышла 2 серия: A1']);
  assert.strictEqual(toastLines(mk(3)).length, 3);
  const five = toastLines(mk(5));
  assert.strictEqual(five.length, 4);
  assert.strictEqual(five[3], 'и ещё 2');
  assert.deepStrictEqual(toastLines([]), []);
});
