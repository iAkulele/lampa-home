import test from 'node:test';
import assert from 'node:assert';
import {
  shortTitle, isLatinOrCyrillic, isLatin, queryTitle, latinAltTitles, queryTitles, firstQuery, secondQuery, needSecond, mergeResults,
} from '../src/search-query.js';

const CHEAT_RU = 'Изгнанный читер-чародей наслаждается беззаботной второй жизнью: Я могу накладывать «очки усиления» не только на оружие, но и на что угодно, в любой момент отменяя эффект по собственной воле, а с теми, кто остался, всё нормально?';
const CHEAT_JP = '追放されたチート付与魔術師は気ままなセカンドライフを謳歌する。 ～俺は武器だけじゃなく～';
const CHEAT_ALTS = {
  results: [
    { iso_3166_1: 'CN', title: '被放逐的作弊赋予魔术师' },
    { iso_3166_1: 'JP', title: 'チー付与' },
    { iso_3166_1: 'JP', title: 'Chii Fuyo' },
    { iso_3166_1: 'JP', title: 'Cheat Fuyo' },
    { iso_3166_1: 'JP', title: 'Tsuihou Sareta Cheat Fuyo Majutsushi wa Kimamana Second Life wo Ouka Suru. Ore wa Buki dake janaku' },
    { iso_3166_1: 'RU', title: 'Изгнанный читер-чародей' },
    { iso_3166_1: 'US', title: 'The Laid Off Cheat Granting Mage Enjoys a Second Life' },
    { iso_3166_1: 'CZ', title: 'Kluci' },
  ],
};

test('test_short_title', () => {
  assert.strictEqual(shortTitle(CHEAT_RU), 'Изгнанный читер-чародей наслаждается беззаботной второй');
  assert.strictEqual(shortTitle('Дюна: Часть вторая'), 'Дюна');
  assert.strictEqual(shortTitle('Звёздные войны — Андор'), 'Звёздные войны');
  assert.strictEqual(shortTitle('Show – Part 2'), 'Show');
  assert.strictEqual(shortTitle('Show ~ Extra'), 'Show');
  assert.strictEqual(shortTitle('Ода (2020)'), 'Ода (2020)'); // < 4 chars after the cut: keep
  assert.strictEqual(shortTitle('Up: Pixar'), 'Up: Pixar');
  const long = shortTitle('Tsuihou Sareta Cheat Fuyo Majutsushi wa Kimamana Second Life wo Ouka Suru');
  assert.ok(long.length <= 60);
  assert.strictEqual(long, 'Tsuihou Sareta Cheat Fuyo Majutsushi wa Kimamana Second Life');
});

test('test_script_checks', () => {
  assert.ok(isLatinOrCyrillic('Пацаны'));
  assert.ok(isLatinOrCyrillic('Tsuihō Sareta'));
  assert.ok(isLatinOrCyrillic('Siêu Anh Hùng'));
  assert.ok(!isLatinOrCyrillic(CHEAT_JP));
  assert.ok(!isLatinOrCyrillic('더 보이즈'));
  assert.ok(!isLatinOrCyrillic('الرفاق'));
  assert.ok(!isLatinOrCyrillic('Chii チー'));
  assert.ok(!isLatinOrCyrillic('2026'));
  assert.ok(isLatin('Chii Fuyo'));
  assert.ok(!isLatin('Пацаны'));
  assert.strictEqual(queryTitle(CHEAT_JP), '');
  // Short enough titles go as they are; long ones are cut before the subtitle.
  assert.strictEqual(queryTitle('Дюна: Часть вторая'), 'Дюна: Часть вторая');
  assert.strictEqual(queryTitle(CHEAT_RU), 'Изгнанный читер-чародей наслаждается беззаботной второй');
});

test('test_latin_alt_titles', () => {
  assert.deepStrictEqual(latinAltTitles(CHEAT_ALTS), [
    'Chii Fuyo', 'Cheat Fuyo', 'Tsuihou Sareta Cheat Fuyo Majutsushi wa Kimamana Second Life', 'The Laid Off Cheat Granting Mage Enjoys a Second Life',
  ]);
  // Movies answer {titles}; JP before US.
  assert.deepStrictEqual(latinAltTitles({ titles: [{ iso_3166_1: 'US', title: 'Firefly Wedding' }, { iso_3166_1: 'JP', title: 'Hotaru no Yomeiri' }] }),
    ['Hotaru no Yomeiri', 'Firefly Wedding']);
  assert.deepStrictEqual(latinAltTitles(null), []);
  assert.deepStrictEqual(latinAltTitles({ results: [{ iso_3166_1: 'JP', title: 'G-1' }] }), []);
});

test('test_query_plan_anime_long_title', () => {
  const card = { name: CHEAT_RU, title: CHEAT_RU, original_name: CHEAT_JP, original_title: CHEAT_JP, first_air_date: '2026-01-08', genres: [] };
  const t = queryTitles(card, latinAltTitles(CHEAT_ALTS));
  assert.strictEqual(t.title, 'Изгнанный читер-чародей наслаждается беззаботной второй');
  assert.strictEqual(t.original, t.title); // the Japanese original is never sent
  assert.strictEqual(t.alt, 'Chii Fuyo');
  assert.ok(t.names.includes('Chii Fuyo'));
  assert.ok(t.names.every((n) => isLatinOrCyrillic(n)));
  const ctx = { kind: 'anime', season: 1, episode: 1 };
  const q1 = firstQuery(card, ctx, 'df', t);
  assert.strictEqual(q1.search, 'Изгнанный читер-чародей наслаждается беззаботной второй S01');
  assert.strictEqual(q1.movie.title, t.title);
  assert.strictEqual(q1.movie.original_title, t.title);
  assert.strictEqual(q1.movie.original_name, CHEAT_JP); // is_serial is still read from original_name
  const q2 = secondQuery(card, ctx, t);
  assert.strictEqual(q2.search, 'Chii Fuyo S01');
  assert.strictEqual(q2.movie.title, t.title);
  assert.strictEqual(q2.movie.original_title, 'Chii Fuyo');
  assert.ok(needSecond('anime', 50));
  assert.ok(needSecond('tv', 4));
  assert.ok(!needSecond('tv', 5));
});

test('test_query_plan_regular_show_unchanged', () => {
  const card = { name: 'Пацаны', title: 'Пацаны', original_name: 'The Boys', original_title: 'The Boys', first_air_date: '2019-07-25' };
  const t = queryTitles(card, []);
  const q1 = firstQuery(card, { kind: 'tv', season: 4, episode: 1 }, 'df', t);
  assert.strictEqual(q1.search, 'The Boys S04');
  assert.strictEqual(q1.movie.title, 'Пацаны');
  assert.strictEqual(q1.movie.original_title, 'The Boys');
  assert.deepStrictEqual(t.names, ['Пацаны', 'The Boys']);
  assert.strictEqual(secondQuery(card, {}, t), null);
  // An alt equal to the original adds no second query.
  assert.strictEqual(secondQuery(card, {}, queryTitles(card, ['the boys'])), null);
  const movie = { title: 'Дюна', original_title: 'Dune', release_date: '2021-09-15' };
  assert.strictEqual(firstQuery(movie, { kind: 'movie' }, 'df_year', queryTitles(movie)).search, 'Dune 2021');
});

test('test_merge_results_dedupes_by_link_then_title', () => {
  const a = [{ Title: 'A', MagnetUri: 'm1' }, { Title: 'B', Link: 'l2' }];
  const b = [{ Title: 'A again', MagnetUri: 'm1' }, { Title: 'b', MagnetUri: 'm3' }, { Title: 'C', MagnetUri: 'm4' }];
  assert.deepStrictEqual(mergeResults(a, b, null).map((r) => r.Title), ['A', 'B', 'C']);
});
