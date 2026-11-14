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

test('test_badge_text', async () => {
  const { badgeText } = await import('../src/cards.js');
  assert.strictEqual(badgeText({ aired: 7, total: 12 }), '7 из 12');
});

test('test_pick_banner_first_by_default', async () => {
  const { pickBannerCard } = await import('../src/cards.js');
  const cards = [{ id: 1 }, { id: 2 }, { id: 3 }];
  assert.strictEqual(pickBannerCard(cards, false, () => 0.99).id, 1);
  assert.strictEqual(pickBannerCard([], true), undefined);
});

test('test_pick_banner_random_within_first_five', async () => {
  const { pickBannerCard } = await import('../src/cards.js');
  const cards = [1, 2, 3, 4, 5, 6, 7].map((id) => ({ id }));
  assert.strictEqual(pickBannerCard(cards, true, () => 0).id, 1);
  assert.strictEqual(pickBannerCard(cards, true, () => 0.999).id, 5);
  assert.strictEqual(pickBannerCard(cards.slice(0, 2), true, () => 0.999).id, 2);
});
