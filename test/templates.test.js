import test from 'node:test';
import assert from 'node:assert';
import { bannerVars, genreMap } from '../src/templates.js';

const img = (path, size) => `https://img/${size}${path}`;
const shortText = (text, len) => (text.length > len ? text.slice(0, len - 3) + '...' : text);

test('test_banner_vars_builds_meta', () => {
  const card = {
    title: 'Фильм',
    release_date: '2026-03-01',
    vote_average: 7.44,
    genre_ids: [53],
    overview: 'x'.repeat(300),
    backdrop_path: '/b.jpg',
    poster_path: '/p.jpg',
  };
  const vars = bannerVars(card, { img, shortText, genres: { 53: 'Триллер' } });
  assert.strictEqual(vars.title, 'Фильм');
  assert.strictEqual(vars.meta, '2026 · Триллер · ★ 7.4');
  assert.strictEqual(vars.overview.length, 180);
  assert.strictEqual(vars.backdrop, 'https://img/w1280/b.jpg');
});

test('test_banner_vars_without_backdrop_uses_poster', () => {
  const card = { name: 'Сериал', first_air_date: '2025-10-02', poster_path: '/p.jpg' };
  const vars = bannerVars(card, { img, shortText });
  assert.strictEqual(vars.title, 'Сериал');
  assert.strictEqual(vars.backdrop, 'https://img/w1280/p.jpg');
  assert.strictEqual(vars.meta, '2025', 'missing genre and rating are omitted');
  assert.strictEqual(vars.overview, '');
});

test('test_banner_vars_escapes_template_specials', () => {
  const card = { title: 'A <b> & $& "q"', overview: '' };
  const vars = bannerVars(card, { img, shortText });
  assert.ok(!/[<>"$]/.test(vars.title), vars.title);
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
