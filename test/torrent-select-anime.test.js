import test from 'node:test';
import assert from 'node:assert';
import { selectTorrent, isRelevant, audioFromFfprobe, audioFromResult } from '../src/torrent-select.js';
import { queryTitles, latinAltTitles, cyrillicAltTitles } from '../src/search-query.js';
import { CHEAT_CARD, CHEAT_ALTS, FIRE_CARD, FIRE_ALTS, JJK_CARD } from './fixtures/tmdb-titles.js';

const namesOf = (card, json) => queryTitles(card, latinAltTitles(json), { kind: 'anime', cyrillic: cyrillicAltTitles(json) }).names;

const GiB = 1024 ** 3;
const item = (Title, Seeders = 20, extra = {}) => ({ Title, Seeders, Size: 2 * GiB, MagnetUri: 'magnet:?xt=' + Title, ...extra });
const find = (res, title) => res.scored.find((s) => s.result.Title === title);
const audio = (language, title) => ({ codec_type: 'audio', tags: { language, title } });

// TMDB tv 313346 (real jac.red titles, 2026-11-15).
const CHEAT = namesOf(CHEAT_CARD, CHEAT_ALTS);
const cheatCtx = { kind: 'anime', season: 1, episode: 1, absolute: 1, names: CHEAT };
const NDA_BIG = 'Изгнанный читер-чародей наслаждается беззаботной второй жизнью / Tsuihou Sareta Cheat Fuyo Majutsushi wa Kimama na Second Life o (wo) Ouka Suru [TV] [01-06 из XX] [RUS(int), ENG, JAP+Sub] [2026, Фэнтези, WEB-DL] [1080p]';
const NDA_DB = 'Изгнанный читер-чародей наслаждается беззаботной второй жизнью (1-6 серии из 12) / Chii Fuyo / 2026 / ДБ (NDA Studio), СТ / HEVC / WEBRip (1080p)';
const SUBS = '[SubsPlease] Chii Fuyo - 06 (1080p)';
const TUDORS = 'Тюдоры / The Tudors [S01-04] (2007-2010) BDRip 1080p | Rus';

test('test_anime_real_dub_titles_accepted', () => {
  const res = selectTorrent([item(NDA_BIG, 118), item(NDA_DB, 17), item(SUBS, 1), item(TUDORS, 50)], cheatCtx);
  assert.strictEqual(find(res, NDA_BIG).rejected, null);
  assert.strictEqual(find(res, NDA_DB).rejected, null);
  assert.strictEqual(find(res, SUBS).rejected, 'no-russian');
  assert.strictEqual(find(res, TUDORS).rejected, 'unrelated');
  assert.strictEqual(res.chosen.Title, NDA_BIG);
});

test('test_unrelated_comes_before_other_reasons', () => {
  const res = selectTorrent([item('The Tudors.TS.1080p')], cheatCtx);
  assert.strictEqual(res.scored[0].rejected, 'unrelated');
  // No names: no relevance check.
  assert.strictEqual(selectTorrent([item(TUDORS)], { kind: 'tv', season: 1, episode: 1 }).scored[0].rejected, null);
});

test('test_is_relevant_normalizes_and_short_names_need_word_boundary', () => {
  assert.ok(isRelevant('ЁЛКИ-5 (2016) WEB-DL', ['Елки-5']));
  assert.ok(isRelevant('Пацаны / The Boys [S04] LostFilm', ['Пацаны', 'The Boys']));
  assert.ok(!isRelevant('Boyska S01 Rus', ['The Boys']));
  // < 8 chars: a whole-word match only.
  assert.ok(!isRelevant('Dunes.of.Sahara.2020', ['Dune']));
  assert.ok(isRelevant('Dune.2021.2160p', ['Dune']));
  // >= 8 chars: substring after normalization.
  assert.ok(isRelevant('Tsuihou_sareta Cheat-Fuyo Majutsushi', ['Cheat Fuyo Majutsushi']));
  assert.ok(isRelevant('anything', []));
});

test('test_anime_studio_markers_count_as_russian', () => {
  const ctx = { kind: 'anime', season: 1, episode: 1, absolute: 1, names: ['Frieren'] };
  for (const t of ['Frieren [AniStar]', 'Frieren [Studio Band]', 'Frieren (SHIZA Project)', 'Frieren | JAM', 'Frieren [Dream Cast]',
    'Frieren [AniMaunt]', 'Frieren [AniLiberty]', 'Frieren [Озвучка]', 'Frieren MVO', 'Frieren | D | Deep', 'Frieren [Persona99]']) {
    assert.strictEqual(selectTorrent([item(t)], ctx).scored[0].rejected, null, t);
  }
  // "JAM" outside anime is an ordinary word.
  assert.strictEqual(selectTorrent([item('Space Jam 1996 1080p JAM')], { kind: 'movie' }).scored[0].rejected, 'no-russian');
});

// TMDB tv 320909 «Свадьба светлячков» (real jac.red titles, 2026-11-15).
const FIRE = namesOf(FIRE_CARD, FIRE_ALTS);
const fireCtx = { kind: 'anime', season: 1, episode: 2, absolute: 2, names: FIRE };
const EP2 = 'Свадьба светлячков / Hotaru no Yomeiri — Серия 2';
const PACK = 'Свадьба светлячков / Hotaru no Yomeiri / 2026 / [WEB-DL 1080p][HEVC][1-5]';
const EXT = 'Свадьба светлячков / Hotaru no Yomeiri / Firefly Wedding [TV] [1-5 из 12] [RUS(ext), JAP+Sub] [2026, комедия, романтика, WEB-DL] [1080p]';
const RAW = 'Hotaru no Yomeiri | Firefly Wedding | Свадьба светлячков [2026, TV, 6 из 12 эп.] WebRip 720p raw';

test('test_anime_unmarked_titles_are_unknown_and_rank_below_ext', () => {
  const res = selectTorrent([item(EP2, 20), item(PACK, 20), item(EXT, 20), item(RAW, 20)], fireCtx);
  assert.strictEqual(find(res, EXT).rejected, null);
  assert.strictEqual(find(res, EXT).voice, 'other');
  assert.strictEqual(find(res, RAW).rejected, 'raw');
  assert.strictEqual(find(res, EP2).rejected, null);
  assert.strictEqual(find(res, EP2).voice, 'unknown');
  assert.strictEqual(find(res, PACK).rejected, null);
  assert.strictEqual(find(res, PACK).voice, 'unknown');
  assert.ok(find(res, EXT).score > find(res, PACK).score);
  assert.ok(find(res, EXT).score > find(res, EP2).score);
  assert.strictEqual(res.chosen.Title, EXT);
});

test('test_unknown_voice_only_for_anime', () => {
  const tv = { kind: 'tv', season: 1, episode: 2, absolute: 2, names: FIRE };
  assert.strictEqual(selectTorrent([item(PACK)], tv).scored[0].rejected, 'no-russian');
  // Subtitle-only release naming the show: still no Russian audio.
  const ukr = 'Весілля світлячків (Сезон 1, серії 1-6 з 12) / Hotaru no Yomeiri (Season 1) (2026) WEBRip 1080p H.265 Ukr/Jap | Sub Ukr';
  assert.strictEqual(selectTorrent([item(ukr)], fireCtx).scored[0].rejected, 'no-russian');
  const rawRus = 'Hotaru no Yomeiri | Свадьба светлячков [2026, TV, 04 из 12 эп.] WEBRip 1080p raw+rus';
  assert.strictEqual(selectTorrent([item(rawRus)], fireCtx).scored[0].rejected, 'raw');
});

test('test_audio_from_ffprobe', () => {
  assert.strictEqual(audioFromFfprobe(undefined), 'unknown');
  assert.strictEqual(audioFromFfprobe([{ codec_type: 'video' }]), 'unknown');
  assert.strictEqual(audioFromFfprobe([audio('rus', 'AniLiberty'), audio('jpn', 'Original')]), 'ru');
  assert.strictEqual(audioFromFfprobe([audio('ru')]), 'ru');
  assert.strictEqual(audioFromFfprobe([audio('jpn', 'Японский [Hulu Japan]')]), 'none');
  assert.strictEqual(audioFromFfprobe([audio('ukr', 'InariDub - [Українська]'), audio('jpn')]), 'none');
  // No language tag: the track name decides.
  assert.strictEqual(audioFromFfprobe([audio('und', 'Многоголосый')]), 'ru');
  assert.strictEqual(audioFromFfprobe([audio('', 'Rus DUB')]), 'ru');
  assert.strictEqual(audioFromFfprobe([audio('und', 'Українська')]), 'unknown');
  assert.strictEqual(audioFromFfprobe([audio('jpn'), audio(undefined)]), 'unknown');
});

test('test_audio_from_result_uses_languages', () => {
  // AniStar dub tagged "eng" in the file, JacRed lists "rus" from the tracker page.
  assert.strictEqual(audioFromResult({ ffprobe: [audio('eng')], languages: ['rus', 'eng'] }), 'ru');
  assert.strictEqual(audioFromResult({ languages: ['ukr', 'jpn'] }), 'none');
  assert.strictEqual(audioFromResult({ ffprobe: [audio('jpn')] }), 'none');
  assert.strictEqual(audioFromResult({}), 'unknown');
});

test('test_ffprobe_decides_unmarked_titles', () => {
  const rus = { ffprobe: [audio('rus', 'AniLiberty'), audio('jpn', 'Original')], languages: ['rus', 'jpn'], info: { voices: ['AniLiberty'] } };
  const jpn = { ffprobe: [audio('jpn')], languages: ['jpn'] };
  const res = selectTorrent([item(PACK, 20, rus), item(EP2, 20, jpn), item(EXT, 20, jpn)], fireCtx);
  const pack = find(res, PACK);
  assert.strictEqual(pack.rejected, null);
  assert.strictEqual(pack.voice, 'other');
  assert.strictEqual(find(res, EP2).rejected, 'no-russian');
  // The external Russian track is not inside the file: the title marker wins.
  assert.strictEqual(find(res, EXT).rejected, null);
  // AniLiberty (= AniLibria) is the second preferred anime voice and beats RUS(ext).
  assert.strictEqual(res.chosen.Title, PACK);
  // Movies: ffprobe Russian accepts an unmarked title, all-foreign audio rejects it.
  assert.strictEqual(selectTorrent([item('Film.2026.1080p', 20, { ffprobe: [audio('rus')] })], { kind: 'movie' }).scored[0].rejected, null);
  assert.strictEqual(selectTorrent([item('Film.2026.1080p', 20, { ffprobe: [audio('eng')] })], { kind: 'movie' }).scored[0].rejected, 'no-russian');
});

test('test_relevance_names_include_short_cyrillic_heads', () => {
  const t = 'Изгнанный читер-чародей [01-06 из 12] ДБ AniLibria';
  assert.ok(CHEAT.includes('Изгнанный читер-чародей'));
  assert.strictEqual(selectTorrent([item(t)], cheatCtx).scored[0].rejected, null);
});

test('test_anime_without_alternative_titles_skips_relevance', () => {
  const names = queryTitles(JJK_CARD, [], { kind: 'anime' }).names;
  assert.deepStrictEqual(names, []);
  const ctx = { kind: 'anime', season: 1, episode: 3, absolute: 3, names };
  assert.strictEqual(selectTorrent([item('Jujutsu Kaisen [01-24] AniLibria')], ctx).scored[0].rejected, null);
});

test('test_subtitle_ext_is_not_russian_audio', () => {
  const anime = { kind: 'anime', season: 1, episode: 1, absolute: 1, names: ['Frieren'] };
  assert.strictEqual(selectTorrent([item('Frieren [TV] [01-28 из 28] [JAP, Sub RUS(ext)]')], anime).scored[0].rejected, 'no-russian');
  assert.strictEqual(selectTorrent([item('Film / Film (2020) BDRip 1080p | Sub Rus(ext)')], { kind: 'movie' }).scored[0].rejected, 'no-russian');
  assert.strictEqual(selectTorrent([item('Frieren [TV] [01-28 из 28] [RUS(ext), JAP+Sub]')], anime).scored[0].rejected, null);
});

test('test_raw_rejection_is_anime_only', () => {
  const movie = 'Сырое / Raw / Grave (2016) BDRip 1080p | Дубляж';
  assert.strictEqual(selectTorrent([item(movie)], { kind: 'movie', names: ['Сырое', 'Grave'] }).scored[0].rejected, null);
});
