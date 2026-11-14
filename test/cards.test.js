import test from 'node:test';
import assert from 'node:assert';
import { toWideCard, rowTitle } from '../src/cards.js';
import { ROWS } from '../src/config.js';

test('test_card_without_backdrop_gets_poster_fallback', () => {
  const src = { id: 1, poster_path: '/p.jpg' };
  const card = toWideCard(src);
  assert.strictEqual(card.backdrop_path, '/p.jpg');
  assert.strictEqual(card.lh_poster_fallback, true);
  assert.strictEqual(card.params.style.name, 'wide');
  assert.strictEqual(src.backdrop_path, undefined, 'source card must not be mutated');
});

test('test_card_with_backdrop_keeps_it', () => {
  const card = toWideCard({ id: 2, poster_path: '/p.jpg', backdrop_path: '/b.jpg' });
  assert.strictEqual(card.backdrop_path, '/b.jpg');
  assert.strictEqual(card.lh_poster_fallback, undefined);
  assert.strictEqual(card.params.style.name, 'wide');
});

test('test_row_titles_in_order', () => {
  assert.deepStrictEqual(ROWS.map(rowTitle), [
    'Новые фильмы',
    'Новые ужасы',
    'Аниме: онгоинги',
    'Новые сериалы',
    'Новые мультфильмы',
    'Недавно просмотренное',
  ]);
});
