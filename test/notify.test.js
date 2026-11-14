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

test('test_should_mark_only_when_a_status_arrived', async () => {
  const { shouldMark } = await import('../src/notify.js');
  assert.strictEqual(shouldMark([]), false);
  assert.strictEqual(shouldMark([{ status: null }, { status: null }]), false);
  assert.strictEqual(shouldMark([{ status: null }, { status: { airing: false, aired: 1 } }]), true);
});

test('test_candidate_kind_japanese_show_without_genres', async () => {
  const { candidateKind, confirmAnime } = await import('../src/notify.js');
  const frieren = { id: 1, original_name: 'Sousou no Frieren', origin_country: ['JP'], genre_ids: [16] };
  const bare = { id: 2, original_name: 'Sousou no Frieren', origin_country: ['JP'] };
  const shogun = { id: 3, original_name: 'Shogun', origin_country: ['JP'], genre_ids: [18] };
  const film = { id: 4, original_title: 'Akira', origin_country: ['JP'] };
  assert.strictEqual(candidateKind(frieren), 'anime');
  assert.strictEqual(candidateKind(bare), 'maybe');
  assert.strictEqual(candidateKind({ ...bare, genres: [{ id: 16, name: 'анимация' }] }), 'anime');
  assert.strictEqual(candidateKind(shogun), null);
  assert.strictEqual(candidateKind(film), null);
  // 'maybe' is kept only when the TV details confirm animation.
  const kept = confirmAnime([
    { card: frieren, status: { airing: true, aired: 3 } },
    { card: bare, status: { airing: true, aired: 3, animation: true } },
    { card: { ...bare, id: 5 }, status: { airing: true, aired: 3, animation: false } },
    { card: { ...bare, id: 6 }, status: null },
  ]);
  assert.deepStrictEqual(kept.map((i) => i.card.id), [1, 2]);
});
