import test from 'node:test';
import assert from 'node:assert';
import { bannerVars, genreMap, truncate } from '../src/templates.js';

const img = (path, size) => `https://img/${size}${path}`;

test('test_banner_vars_builds_meta', () => {
  const card = {
    title: 'Фильм',
    release_date: '2026-03-01',
    vote_average: 7.44,
    genre_ids: [53],
    overview: 'слово '.repeat(50),
    backdrop_path: '/b.jpg',
    poster_path: '/p.jpg',
  };
  const vars = bannerVars(card, { img, genres: { 53: 'Триллер' } });
  assert.strictEqual(vars.title, 'Фильм');
  assert.strictEqual(vars.meta, '2026 · Триллер · ★ 7.4');
  assert.ok(vars.overview.length <= 180);
  assert.ok(vars.overview.endsWith('…'));
  assert.strictEqual(vars.backdrop, 'https://img/w1280/b.jpg');
});

test('test_banner_vars_without_backdrop_uses_poster', () => {
  const card = { name: 'Сериал', first_air_date: '2025-10-02', poster_path: '/p.jpg' };
  const vars = bannerVars(card, { img });
  assert.strictEqual(vars.title, 'Сериал');
  assert.strictEqual(vars.backdrop, 'https://img/w1280/p.jpg');
  assert.strictEqual(vars.meta, '2025', 'missing genre and rating are omitted');
  assert.strictEqual(vars.overview, '');
});

test('test_banner_vars_escapes_template_specials', () => {
  const card = { title: 'A <b> & $& "q"', overview: '' };
  const vars = bannerVars(card, { img });
  assert.ok(!/[<>"$]/.test(vars.title), vars.title);
  const braces = bannerVars({ title: 'X {meta} Y' }, { img });
  assert.ok(!/[{}]/.test(braces.title), braces.title);
});

test('test_genre_map_translates_and_keeps_first', () => {
  const tmdb = {
    movie: [{ id: 53, title: '#{t_thriller}' }],
    tv: [{ id: 53, title: '#{other}' }, { id: 10759, title: '#{t_action}' }],
  };
  const map = genreMap(tmdb, (s) => ({ '#{t_thriller}': 'триллер', '#{t_action}': 'боевик' })[s] || s);
  assert.deepStrictEqual(map, { 53: 'Триллер', 10759: 'Боевик' });
  assert.deepStrictEqual(genreMap(undefined, (s) => s), {});
});

test('test_banner_overview_truncated_at_word_boundary', () => {
  const words = 'alpha beta gamma delta epsilon zeta eta theta iota kappa'.split(' ');
  let text = '';
  for (let i = 0; text.length < 300; i++) text += (text ? ' ' : '') + words[i % words.length];
  const out = truncate(text, 180);
  assert.ok(out.length <= 180, String(out.length));
  assert.ok(out.endsWith('…'));
  const body = out.slice(0, -1);
  assert.ok(text.startsWith(body + ' '), 'cut must fall on a word boundary: ' + body);
  assert.strictEqual(truncate('short text', 180), 'short text');
  assert.strictEqual(truncate('x'.repeat(180), 180), 'x'.repeat(180));
});

test('test_banner_text_is_raw_for_live_updates', async () => {
  const { bannerText } = await import('../src/templates.js');
  const raw = bannerText({ name: 'A & <B>', first_air_date: '2025-01-01', backdrop_path: '/b.jpg' }, { img });
  assert.strictEqual(raw.title, 'A & <B>');
  assert.strictEqual(raw.meta, '2025');
  assert.strictEqual(raw.backdrop, 'https://img/w1280/b.jpg');
});
