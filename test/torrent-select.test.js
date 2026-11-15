import test from 'node:test';
import assert from 'node:assert';
import { parseTitle, selectTorrent, effectiveResolution } from '../src/torrent-select.js';

const GiB = 1024 ** 3;
const item = (Title, Seeders = 20, Size = 8 * GiB) => ({ Title, Seeders, Size, MagnetUri: 'magnet:?xt=' + Title });
const find = (res, title) => res.scored.find((s) => s.result.Title === title);

test('test_rejects_screener', () => {
  const t = 'Film.2026.TS.1080p RUS';
  const res = selectTorrent([item(t)], { kind: 'movie' });
  assert.strictEqual(find(res, t).rejected, 'screener');
  assert.strictEqual(res.chosen, null);
});

test('test_rejects_dv_without_hdr10', () => {
  const bad = 'Film.2026.2160p.WEB-DL.DV.HEVC RUS';
  const good = 'Film.2026.2160p.WEB-DL.DV.HDR10.P8 RUS';
  const res = selectTorrent([item(bad), item(good)], { kind: 'movie' });
  assert.strictEqual(find(res, bad).rejected, 'dv-only');
  assert.strictEqual(find(res, good).rejected, null);
});

test('test_rejects_no_russian', () => {
  const eng = 'Film.2026.1080p.WEB-DL.ENG.Sub';
  const dub = 'Film.2026.1080p.WEB-DL.Dub';
  const ok = 'Фильм / Film (2026) WEB-DL 1080p | Дубляж';
  const res = selectTorrent([item(eng), item(dub), item(ok)], { kind: 'movie' });
  assert.strictEqual(find(res, eng).rejected, 'no-russian');
  assert.strictEqual(find(res, dub).rejected, 'no-russian');
  assert.strictEqual(find(res, ok).rejected, null);
});

test('test_rejects_oversize_movie', () => {
  const t = 'Film 2026 1080p RUS';
  assert.strictEqual(find(selectTorrent([item(t, 20, 70 * GiB)], { kind: 'movie' }), t).rejected, 'oversize');
  const tv = selectTorrent([item(t, 20, 70 * GiB)], { kind: 'tv' });
  assert.strictEqual(find(tv, t).rejected, null);
});

test('test_prefers_2160_over_1080_when_alive', () => {
  const a = item('Film 2160p WEB-DL LostFilm', 20, 20 * GiB);
  const b = item('Film 1080p WEB-DL LostFilm', 50);
  assert.strictEqual(selectTorrent([b, a], { kind: 'movie' }).chosen, a);
});

test('test_dead_2160_loses_to_alive_1080', () => {
  const a = item('Film 2160p WEB-DL LostFilm', 1);
  const b = item('Film 1080p WEB-DL LostFilm', 30);
  assert.strictEqual(selectTorrent([a, b], { kind: 'movie' }).chosen, b);
});

test('test_voice_priority_lostfilm_over_hdrezka', () => {
  const a = item('Film 1080p WEB-DL HDRezka', 20);
  const b = item('Film 1080p WEB-DL LostFilm', 20);
  assert.strictEqual(selectTorrent([a, b], { kind: 'movie' }).chosen, b);
});

test('test_anime_prefers_anidub_and_allows_720', () => {
  const a = item('[AniDub] Show 720p', 15);
  const b = item('[AniLibria] Show 1080p', 15);
  assert.strictEqual(selectTorrent([a, b], { kind: 'anime', absolute: 5 }).chosen, b);
  const only = selectTorrent([a], { kind: 'anime', absolute: 5 });
  assert.strictEqual(only.chosen, a);
  assert.strictEqual(only.scored[0].rejected, null);
});

test('test_non_anime_720_only_when_nothing_else', () => {
  const a = item('Film 720p RUS', 30);
  assert.strictEqual(selectTorrent([a], { kind: 'movie' }).chosen, a);
  const b = item('Film 1080p RUS', 5);
  assert.strictEqual(selectTorrent([a, b], { kind: 'movie' }).chosen, b);
});

test('test_audio_preference_tiebreak', () => {
  const a = item('Film 1080p RUS DTS-HD MA');
  const b = item('Film 1080p RUS AC3');
  assert.strictEqual(selectTorrent([a, b], { kind: 'movie' }).chosen, b);
});

test('test_smaller_size_tiebreak', () => {
  const big = item('Film 1080p RUS A', 20, 12 * GiB);
  const small = item('Film 1080p RUS B', 20, 8 * GiB);
  assert.strictEqual(selectTorrent([big, small], { kind: 'movie' }).chosen, small);
});

test('test_light_2160_movie_scores_as_1080', () => {
  const thin4k = item('Film 2160p WEB-DL LostFilm', 60, 6.5 * GiB);
  const fake4k = item('Film 2160p WEB-DL LostFilm', 60, 4 * GiB);
  const fullhd = item('Film 1080p WEB-DL LostFilm', 20, 8 * GiB);
  const real4k = item('Film 2160p WEB-DL LostFilm', 10, 16 * GiB);
  assert.strictEqual(selectTorrent([thin4k, fullhd, real4k], { kind: 'movie' }).chosen, real4k);
  // A 2160p under 6 GiB is 'thin': the 1080p beats it despite fewer seeders.
  assert.strictEqual(selectTorrent([fake4k, fullhd], { kind: 'movie' }).chosen, fullhd);
  // A 2160p between the floors is scored as a 1080p of the same size.
  const r = selectTorrent([thin4k, fullhd], { kind: 'movie' });
  assert.strictEqual(find(r, thin4k.Title).score - find(r, fullhd.Title).score > 0, true);
});

test('test_effective_resolution_floors_movies_only', () => {
  const p = (t) => parseTitle(t);
  assert.strictEqual(effectiveResolution(p('Film 2160p'), { Size: 20 * GiB }, { kind: 'movie' }), 2160);
  assert.strictEqual(effectiveResolution(p('Film 2160p'), { Size: 10 * GiB }, { kind: 'movie' }), 1080);
  assert.strictEqual(effectiveResolution(p('Film 2160p'), { Size: 4 * GiB }, { kind: 'movie' }), 'thin');
  assert.strictEqual(effectiveResolution(p('Film 1080p'), { Size: 5 * GiB }, { kind: 'movie' }), 'thin');
  assert.strictEqual(effectiveResolution(p('Film 1080p'), { Size: 6 * GiB }, { kind: 'movie' }), 1080);
  assert.strictEqual(effectiveResolution(p('Film 1080p'), { Size: 0 }, { kind: 'movie' }), 1080);
  assert.strictEqual(effectiveResolution(p('Show S01 2160p'), { Size: 10 * GiB }, { kind: 'tv' }), 2160);
});

test('test_thin_1080_loses_to_720_tie_but_not_rejected', () => {
  const thin = item('Film 1080p WEB-DL LostFilm', 20, 3 * GiB);
  const r = selectTorrent([thin], { kind: 'movie' });
  assert.strictEqual(r.chosen, thin);
  assert.strictEqual(find(r, thin.Title).rejected, null);
});

test('test_tv_requires_episode_present', () => {
  const ctx = { kind: 'tv', season: 2, episode: 5 };
  const titles = {
    short: 'Show S02 (1-4 of 10) 1080p LostFilm',
    full: 'Show S02 (1-10 of 10) 1080p LostFilm',
    single: 'Show S02E05 1080p LostFilm',
    multi: 'Show S01-S03 1080p LostFilm',
    wrong: 'Show S03E05 1080p LostFilm',
    ru: 'Фоллаут [S02, 1-6 из 8] (2026) WEB-DL 1080p | LostFilm',
    wholeSeason: 'Show S02 1080p LostFilm',
  };
  const res = selectTorrent(Object.values(titles).map((t) => item(t)), ctx);
  assert.strictEqual(find(res, titles.short).rejected, 'episode-missing');
  assert.strictEqual(find(res, titles.full).rejected, null);
  assert.strictEqual(find(res, titles.single).rejected, null);
  assert.strictEqual(find(res, titles.multi).rejected, null);
  assert.strictEqual(find(res, titles.wrong).rejected, 'episode-missing');
  assert.strictEqual(find(res, titles.ru).rejected, null);
  assert.strictEqual(find(res, titles.wholeSeason).rejected, null);
});

test('test_tv_without_episode_info_is_full_pack', () => {
  const t = 'Show 1080p LostFilm';
  assert.strictEqual(selectTorrent([item(t)], { kind: 'tv', season: 2, episode: 5 }).chosen.Title, t);
});

test('test_parses_absolute_episode_from_filename', () => {
  const ctx = { kind: 'anime', absolute: 1095 };
  const a = '[AniDub] One Piece [1090-1100] [1080p]';
  const b = '[AniDub] One Piece [1001-1050] [1080p]';
  const c = '[AniDub] One Piece - 1095 [1080p]';
  const res = selectTorrent([item(a), item(b), item(c)], ctx);
  assert.strictEqual(find(res, a).rejected, null);
  assert.strictEqual(find(res, b).rejected, 'episode-missing');
  assert.strictEqual(find(res, c).rejected, null);
});

test('test_returns_null_when_all_rejected', () => {
  const res = selectTorrent([item('Film.TS.1080p RUS'), item('Film 1080p ENG')], { kind: 'movie' });
  assert.strictEqual(res.chosen, null);
  assert.deepStrictEqual(res.scored.map((s) => s.rejected).sort(), ['no-russian', 'screener']);
});

test('test_parse_title_real_names', () => {
  const p = parseTitle('Чужая мама / Other Mommy (2026) UHD WEB-DL 2160p | 4K | HDR10 | Dolby Vision P8 | P | HDRezka Studio');
  assert.strictEqual(p.resolution, 2160);
  assert.strictEqual(p.hdr, true);
  assert.strictEqual(p.dvOnly, false);
  assert.strictEqual(p.voice, 'hdrezka');
  assert.strictEqual(p.russian, true);
  const f = parseTitle('Фоллаут / Fallout [S02, 1-6 из 8] (2026) WEB-DL 1080p | LostFilm');
  assert.deepStrictEqual(f.seasons, [2]);
  assert.strictEqual(f.voice, 'lostfilm');
});

test('test_rush_eng_is_not_russian', () => {
  const t = 'Rush (2013) 1080p BluRay ENG';
  assert.strictEqual(find(selectTorrent([item(t)], { kind: 'movie' }), t).rejected, 'no-russian');
});

test('test_russkiy_prefix_counts', () => {
  const t = 'Фильм (2024) 1080p Русский дубляж';
  assert.strictEqual(find(selectTorrent([item(t)], { kind: 'movie' }), t).rejected, null);
});

test('test_sxxexx_range_contains_episode', () => {
  const t = 'Show S02E01-E10 1080p LostFilm';
  const res = selectTorrent([item(t)], { kind: 'tv', season: 2, episode: 6 });
  assert.strictEqual(find(res, t).rejected, null);
});

test('test_sxxexx_range_excludes_episode', () => {
  const t = 'Show S02E01-E10 1080p LostFilm';
  const res = selectTorrent([item(t)], { kind: 'tv', season: 2, episode: 11 });
  assert.strictEqual(find(res, t).rejected, 'episode-missing');
});

test('test_rus_sub_only_is_rejected', () => {
  for (const t of [
    'Film (2024) 1080p WEB-DL ENG | Rus Sub',
    'Film (2024) 1080p ENG RusSub',
    'Film (2024) 1080p ENG Русские субтитры',
    'Film (2024) 1080p ENG субтитры: рус',
    'Film (2024) 1080p ENG Sub Rus',
  ]) {
    assert.strictEqual(find(selectTorrent([item(t)], { kind: 'movie' }), t).rejected, 'no-russian', t);
  }
});

test('test_rus_sub_plus_dub_is_ok', () => {
  const t = 'Фильм / Film (2024) 1080p | Дубляж | Rus Sub';
  assert.strictEqual(find(selectTorrent([item(t)], { kind: 'movie' }), t).rejected, null);
});

test('test_season_number_before_word', () => {
  assert.deepStrictEqual(parseTitle('Пацаны (4 сезон: 1-8 серии из 8) / The Boys / 2024').seasons, [4]);
  assert.deepStrictEqual(parseTitle('Пацаны (1-3 сезоны: 1-24 серии из 24) / The Boys').seasons, [1, 2, 3]);
  assert.deepStrictEqual(parseTitle('Пацаны / The Boys / Сезон: 1 / Серии: 1-8 из 8').seasons, [1]);
  const s4 = 'Пацаны (4 сезон: 1-8 серии из 8) / The Boys / 2024 / WEB-DL (1080p) | Дубляж';
  const s1 = 'Пацаны (1 сезон: 1-8 серии из 8) / The Boys / 2019 / WEB-DL (1080p) | Дубляж';
  const res = selectTorrent([item(s4, 200), item(s1, 20)], { kind: 'tv', season: 1, episode: 1, absolute: 1 });
  assert.strictEqual(find(res, s4).rejected, 'episode-missing');
  assert.strictEqual(res.chosen.Title, s1);
});

test('test_subtitle_lists_are_not_russian_audio', () => {
  for (const t of [
    'Film (2024) 1080p WEB-DL ENG | Rus. Sub',
    'Film (2024) 1080p WEB-DL | Original + Sub (Rus, Eng)',
    'Film (2024) 1080p WEB-DL ENG | Subs: Rus, Eng',
    'Film (2024) 1080p WEB-DL ENG | Subs: Eng, Rus',
  ]) {
    assert.strictEqual(find(selectTorrent([item(t)], { kind: 'movie' }), t).rejected, 'no-russian', t);
  }
  const ok = 'Film (2024) 1080p WEB-DL | Sub (Rus) + MVO';
  assert.strictEqual(find(selectTorrent([item(ok)], { kind: 'movie' }), ok).rejected, null);
  // A title word starting with "sub" is not a subtitle mention.
  const substance = 'The Substance 2024 1080p WEB-DL Rus';
  assert.strictEqual(find(selectTorrent([item(substance)], { kind: 'movie' }), substance).rejected, null);
});

test('test_dolby_vision_spellings_and_profile_5', () => {
  const dovi = 'Dune.Part.Two.2024.2160p.WEB-DL.DoVi.Rus.mkv';
  const dolby = 'Dune.Part.Two.2024.2160p.WEB-DL.Dolby.Vision RUS';
  const p8 = 'Dune.Part.Two.2024.2160p.WEB-DL.DV HDR10 P8 RUS';
  const p5 = 'Dune.Part.Two.2024.2160p.WEB-DL.DV P5 HDR10 RUS';
  const res = selectTorrent([item(dovi), item(dolby), item(p8), item(p5)], { kind: 'movie' });
  assert.strictEqual(find(res, dovi).rejected, 'dv-only');
  assert.strictEqual(find(res, dolby).rejected, 'dv-only');
  assert.strictEqual(find(res, p8).rejected, null);
  assert.strictEqual(find(res, p5).rejected, 'dv-only');
  assert.strictEqual(res.chosen.Title, p8);
});

test('test_english_season_markers', () => {
  assert.deepStrictEqual(parseTitle('Attack on Titan Season 3 [1080p] RUS').seasons, [3]);
  assert.deepStrictEqual(parseTitle('Mushoku Tensei 2nd Season [AniLibria]').seasons, [2]);
  assert.deepStrictEqual(parseTitle('Shingeki no Kyojin TV-2 [AniDub]').seasons, [2]);
  assert.deepStrictEqual(parseTitle('Show Season 1-3 1080p').seasons, [1, 2, 3]);
});

// «Мстители: Судный день» (2026) must not launch «Мстители» (2012).
test('test_movie_rejects_release_of_another_year', () => {
  const old = 'Мстители / The Avengers (2012) BDRip 1080p | Дубляж';
  const right = 'Мстители: Судный день / Avengers: Doomsday (2026) WEB-DL 1080p | Дубляж';
  const noYear = 'Мстители Судный день WEB-DL 1080p Дубляж';
  const names = ['Мстители: Судный день', 'Avengers: Doomsday'];
  const res = selectTorrent([item(old, 500), item(right), item(noYear)], { kind: 'movie', year: 2026, names });
  assert.strictEqual(find(res, old).rejected, 'unrelated');
  assert.strictEqual(find(res, right).rejected, null);
  assert.strictEqual(find(res, noYear).rejected, null);
  assert.strictEqual(res.chosen.Title, right);
});

test('test_movie_year_check_tolerates_one_year_and_ranges', () => {
  const near = 'Дюна / Dune (2020) 2160p RUS';
  const far = 'Дюна / Dune (1984) 1080p RUS';
  const pack = 'Дюна / Dune (2021-2024) 1080p RUS';
  const res = selectTorrent([item(near), item(far), item(pack)], { kind: 'movie', year: 2021, names: ['Дюна', 'Dune'] });
  assert.strictEqual(find(res, near).rejected, null);
  assert.strictEqual(find(res, far).rejected, 'wrong-year');
  assert.strictEqual(find(res, pack).rejected, null);
});
