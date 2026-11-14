import test from 'node:test';
import assert from 'node:assert';
import { toWideCard, rowTitle, hasRussianTitle, fillPages } from '../src/cards.js';
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

test('test_apply_poster_class_marks_only_fallback_cards', async () => {
  const { applyPosterClass } = await import('../src/cards.js');
  const mk = () => ({ classList: { added: [], add(c) { this.added.push(c); } } });
  const a = mk();
  applyPosterClass(a, { lh_poster_fallback: true });
  assert.deepStrictEqual(a.classList.added, ['lh-card--poster']);
  const b = mk();
  applyPosterClass(b, {});
  assert.deepStrictEqual(b.classList.added, []);
});

test('test_has_russian_title_cyrillic', () => {
  assert.strictEqual(hasRussianTitle({ title: 'Дюна' }), true);
  assert.strictEqual(hasRussianTitle({ name: 'Слово пацана' }), true);
});

test('test_has_russian_title_original_ru', () => {
  assert.strictEqual(hasRussianTitle({ title: 'Cheburashka', original_language: 'ru' }), true);
});

test('test_has_russian_title_rejects_latin_only', () => {
  assert.strictEqual(hasRussianTitle({ title: 'Dune', original_language: 'en' }), false);
  assert.strictEqual(hasRussianTitle({}), false);
  assert.strictEqual(hasRussianTitle(null), false);
});

test('test_fill_pages_stops_when_enough', async () => {
  const calls = [];
  const res = await fillPages(async (p) => { calls.push(p); return { cards: Array(7).fill(p), done: false }; });
  assert.deepStrictEqual(calls, [1, 2]);
  assert.strictEqual(res.length, 14);
});

test('test_fill_pages_stops_at_max_pages', async () => {
  const calls = [];
  const res = await fillPages(async (p) => { calls.push(p); return { cards: [p], done: false }; });
  assert.deepStrictEqual(calls, [1, 2, 3]);
  assert.strictEqual(res.length, 3);
});

test('test_fill_pages_keeps_page1_when_page2_fails', async () => {
  const res = await fillPages(async (p) => {
    if (p === 2) throw new Error('net');
    return { cards: [1, 2, 3], done: false };
  });
  assert.deepStrictEqual(res, [1, 2, 3]);
  await assert.rejects(fillPages(async () => { throw new Error('x'); }));
});

test('test_fill_pages_continues_past_empty_filtered_page', async () => {
  const calls = [];
  const res = await fillPages(async (p) => { calls.push(p); return { cards: p === 2 ? [] : Array(6).fill(p), done: false }; });
  assert.deepStrictEqual(calls, [1, 2, 3]);
  assert.strictEqual(res.length, 12);
});

test('test_fill_pages_stops_when_done', async () => {
  const calls = [];
  await fillPages(async (p) => { calls.push(p); return { cards: [p], done: true }; });
  assert.deepStrictEqual(calls, [1]);
});
