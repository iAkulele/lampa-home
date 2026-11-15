import test from 'node:test';
import assert from 'node:assert';
import { buildSeasonMap, isSingleSeason } from '../src/tmdb.js';
import { trackerPosition, absoluteOf } from '../src/episodes.js';
import { selectTorrent, inferSeasonMap } from '../src/torrent-select.js';
import { pickerItems, mappedEpisodes, mappedSeasonItems, mappedTarget, watchedEpisodes } from '../src/episode-picker.js';
import {
  pickFile, withTracker, inferTracker, previousEpisodeCtx, absoluteInPack, packNumbering, trackerFields,
} from '../src/play-pick.js';
import { buildSearchParams } from '../src/play-search.js';
import { TOKYO_GROUP } from './fixtures/tmdb-episode-group.js';

const GiB = 1024 ** 3;
const item = (Title, Seeders = 20) => ({ Title, Seeders, Size: 5 * GiB, MagnetUri: 'magnet:?xt=' + Title });
const find = (res, title) => res.scored.find((s) => s.result.Title === title);
const NAMES = ['Токийские мстители', 'Tokyo Revengers'];

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
// S1 1-24, S2 25-37, S3 38-50, S4 51-63.
const MAP = [
  { season: 1, start: 1, count: 24, episodes: range(1, 24) },
  { season: 2, start: 25, count: 13, episodes: range(25, 37) },
  { season: 3, start: 38, count: 13, episodes: range(38, 50) },
  { season: 4, start: 51, count: 13, episodes: range(51, 63) },
];

const S3 = 'Токийские мстители / Tokyo Revengers 3 сезон 1-13 из 13 [2023, WEB-DL 1080p] MVO (AniLibria)';
const S4 = 'Токийские мстители / Tokyo Revengers [4 сезон (1-6 из 13)] [2026, WEB-DL 1080p] MVO (AniLibria)';
const S2 = 'Токийские мстители / Tokyo Revengers S02 [13 из 13] [2023, WEB-DL 1080p] MVO';
const S1 = 'Токийские мстители / Tokyo Revengers [1 сезон (1-24 из 24)] [2021, BDRip 1080p] MVO';
const ABS = 'Токийские мстители / Tokyo Revengers [TV] [1-57 из 63] [2021-2026, WEB-DL 1080p] MVO';

const CTX = withTracker({ kind: 'anime', season: 1, episode: 40, absolute: 40 }, MAP);

test('test_build_season_map_from_episode_group', () => {
  const map = buildSeasonMap(TOKYO_GROUP);
  assert.deepStrictEqual(map.map((s) => [s.season, s.start, s.count]), [[1, 1, 24], [2, 25, 13], [3, 38, 13], [4, 51, 13]]);
  assert.deepStrictEqual(map[2].episodes, range(38, 50));
  // One real season only: nothing to map.
  assert.strictEqual(buildSeasonMap({ groups: [TOKYO_GROUP.groups[0], TOKYO_GROUP.groups[3]] }), null);
  assert.strictEqual(buildSeasonMap(null), null);
  assert.strictEqual(isSingleSeason({ number_of_seasons: 1, seasons: [{ season_number: 0 }, { season_number: 1 }] }), true);
  assert.strictEqual(isSingleSeason({ number_of_seasons: 3, seasons: [{ season_number: 1 }, { season_number: 2 }, { season_number: 3 }] }), false);
});

test('test_tracker_position_and_back', () => {
  assert.deepStrictEqual(trackerPosition(MAP, 40), { season: 3, episode: 3, start: 38, count: 13 });
  assert.deepStrictEqual(trackerPosition(MAP, 1), { season: 1, episode: 1, start: 1, count: 24 });
  assert.strictEqual(trackerPosition(MAP, 64), null);
  assert.strictEqual(absoluteOf(MAP, 3, 3), 40);
  assert.strictEqual(absoluteOf(MAP, 4, 14), null);
  assert.deepStrictEqual(trackerFields(CTX), { trackerSeason: 3, trackerEpisode: 3, trackerStart: 38, trackerCount: 13 });
  assert.deepStrictEqual(trackerFields({ season: 1 }), {});
});

test('test_picker_uses_season_map', () => {
  const TODAY = '2026-11-15';
  const tmdb = range(1, 63).map((n) => ({ episode_number: n, season_number: 1, name: 'E' + n, air_date: n <= 57 ? '2026-01-01' : '2026-12-26' }));
  const target = mappedTarget(MAP, { season: 1, episode: 40 });
  assert.deepStrictEqual(target, { season: 3, episode: 3 });

  const eps = mappedEpisodes(MAP, 3, tmdb, 57);
  assert.strictEqual(eps.length, 13);
  const view = (s, e) => (s === 1 && e === 38 ? { time: 1200, percent: 95 } : s === 1 && e === 39 ? { time: 300, percent: 30 } : null);
  const numbers = eps.map((e) => e.absolute);
  const items = pickerItems({
    season: 3, target, episodes: eps, watchedSet: watchedEpisodes(1, numbers, null, view),
    inProgress: { 39: 30 }, today: TODAY, seasonsCount: 4,
  });
  assert.deepStrictEqual(items[0], {
    title: 'Продолжить: серия 3', subtitle: '', season: 3, episode: 3, absolute: 40, kind: 'continue', selected: true,
  });
  assert.strictEqual(items[1].kind, 'season');
  const list = items.filter((i) => i.kind === 'episode');
  assert.strictEqual(list.length, 13);
  assert.deepStrictEqual(list.slice(0, 3).map((i) => [i.title, i.subtitle, i.episode, i.absolute]), [
    ['✓ Серия 1 (#38)', '', 1, 38],
    ['▶ 30% Серия 2 (#39)', '', 2, 39],
    ['Серия 3 (#40)', '', 3, 40],
  ]);
  assert.strictEqual(list[12].title, 'Серия 13 (#50)');

  // Season 4 is airing: 7 of its 13 aired (57 absolute).
  const s4 = pickerItems({ season: 4, target: null, episodes: mappedEpisodes(MAP, 4, tmdb, 57), today: TODAY, seasonsCount: 4 });
  assert.strictEqual(s4.filter((i) => i.kind === 'episode').length, 7);
  const seasons = mappedSeasonItems(MAP, 3, 57);
  assert.deepStrictEqual(seasons.map((s) => s.title), ['Сезон 1 · 24 серии', 'Сезон 2 · 13 серий', '✓ Сезон 3 · 13 серий', 'Сезон 4 · 13 серий']);
  assert.strictEqual(seasons[3].subtitle, 'выходит, вышло 7 из 13 · #51–#63');
  assert.strictEqual(seasons[2].subtitle, 'вышел полностью · #38–#50');
  assert.strictEqual(mappedSeasonItems(MAP, 1, 30).length, 2);
});

test('test_tracker_season_release_selection', () => {
  assert.deepStrictEqual([CTX.trackerSeason, CTX.trackerEpisode, CTX.absolute, CTX.season, CTX.episode], [3, 3, 40, 1, 40]);
  const res = selectTorrent([item(S3, 30), item(S4, 80), item(S2, 50), item(S1, 60), item(ABS, 5)], { ...CTX, names: NAMES });
  assert.strictEqual(find(res, S3).rejected, null);
  assert.strictEqual(find(res, S4).rejected, 'episode-missing');
  assert.strictEqual(find(res, S2).rejected, 'episode-missing');
  assert.strictEqual(find(res, S1).rejected, 'episode-missing');
  assert.strictEqual(find(res, ABS).rejected, null);
  // Single-episode releases: tracker SxxEyy or a bare absolute number.
  const one = selectTorrent([
    item('[Erai-raws] Tokyo Revengers S03E03 [1080p] MVO'), item('[AniLibria] Tokyo Revengers - 40 [1080p] MVO'),
    item('[AniLibria] Tokyo Revengers - 41 [1080p] MVO'), item('Tokyo Revengers S01E40 1080p MVO'),
  ], { ...CTX, names: NAMES });
  assert.deepStrictEqual(one.scored.map((s) => [s.result.Title.slice(0, 32), s.rejected]).sort(), [
    ['Tokyo Revengers S01E40 1080p MVO', 'episode-missing'],
    ['[AniLibria] Tokyo Revengers - 40', null],
    ['[AniLibria] Tokyo Revengers - 41', 'episode-missing'],
    ['[Erai-raws] Tokyo Revengers S03E', null],
  ]);
  // An absolute range under a season-1 tag past tracker season 1.
  const s1abs = 'Токийские мстители / Tokyo Revengers S01 [1-57 из 63] MVO';
  assert.strictEqual(find(selectTorrent([item(s1abs)], { ...CTX, names: NAMES }), s1abs).rejected, null);
});

test('test_tracker_season_pick_file', () => {
  const pack = range(1, 13).map((n) => ({ id: n, path: `Tokyo Revengers S3/Tokyo Revengers - ${String(n).padStart(2, '0')} [1080p].mkv`, length: GiB }));
  const picked = pickFile(pack, { ...CTX, titleHasSeason: true });
  assert.strictEqual(picked.path.endsWith('- 03 [1080p].mkv'), true);
  assert.strictEqual(packNumbering(pack, CTX), 'season');
  // Absolute pack: file «40».
  const abs = range(1, 57).map((n) => ({ id: 100 + n, path: `Tokyo Revengers/[AL] Tokyo Revengers - ${String(n).padStart(2, '0')} [1080p].mkv`, length: GiB }));
  const a = pickFile(abs, { ...CTX, titleHasSeason: false });
  assert.strictEqual(a.id, 140);
  assert.strictEqual(packNumbering(abs, CTX), 'absolute');
  // Even under a season tag a pack that holds «40» is absolutely numbered.
  assert.strictEqual(pickFile(abs, { ...CTX, titleHasSeason: true }).id, 140);
  // SxxEyy names of the tracker season.
  const sxe = range(1, 13).map((n) => ({ id: 200 + n, path: `TR/Tokyo.Revengers.S03E${String(n).padStart(2, '0')}.1080p.mkv`, length: GiB }));
  assert.strictEqual(pickFile(sxe, { ...CTX, titleHasSeason: true }).id, 203);
  // Playlist renumbering of the pack to absolute numbers.
  assert.deepStrictEqual([1, 3, 13].map((e) => absoluteInPack(e, CTX)), [38, 40, 50]);
});

test('test_tracker_previous_episode_and_search', () => {
  assert.deepStrictEqual(trackerFields(previousEpisodeCtx(CTX)), { trackerSeason: 3, trackerEpisode: 2, trackerStart: 38, trackerCount: 13 });
  assert.strictEqual(previousEpisodeCtx(withTracker({ kind: 'anime', season: 1, episode: 38, absolute: 38 }, MAP)), null);
  const card = { name: 'Токийские мстители', original_name: 'Tokyo Revengers', first_air_date: '2021-04-11' };
  // A SeasonMap from TMDB: no " S01" suffix; without one Lampa's suffix stays.
  assert.strictEqual(buildSearchParams(card, CTX, 'lg').search, 'Токийские мстители');
  assert.strictEqual(buildSearchParams(card, { kind: 'anime', season: 1 }, 'lg').search, 'Токийские мстители S01');
});

test('test_infer_season_map_from_releases', () => {
  const results = [item(S3), item(S4), item(S2), item(S1), item(ABS), item('Другое аниме / Other [2 сезон (1-12 из 12)]')];
  const map = inferSeasonMap(results, { names: NAMES, total: 63 });
  assert.deepStrictEqual(map.map((s) => [s.season, s.start, s.count]), [[1, 1, 24], [2, 25, 13], [3, 38, 13], [4, 51, 13]]);
  // A gap (no season 2 total): only season 1 -> nothing.
  assert.strictEqual(inferSeasonMap([item(S1), item(S3)], { names: NAMES, total: 63 }), null);
  // A sequel that TMDB keeps as another show: season 2 starts past TMDB's count.
  assert.strictEqual(inferSeasonMap([item(S1), item(S2)], { names: NAMES, total: 24 }), null);
  // inferTracker: only with ctx.inferTotal (single-season anime without a group).
  const ctx = { kind: 'anime', season: 1, episode: 40, absolute: 40, inferTotal: 63 };
  const out = inferTracker(ctx, results, NAMES);
  assert.deepStrictEqual(trackerFields(out), { trackerSeason: 3, trackerEpisode: 3, trackerStart: 38, trackerCount: 13 });
  assert.strictEqual(out.seasonMap, undefined);
  assert.strictEqual(inferTracker({ ...ctx, inferTotal: undefined }, results, NAMES).trackerSeason, undefined);
});

// Real jac.red titles for «Токийские мстители» (2026-11-15).
test('test_tracker_real_jacred_titles', () => {
  const ep3s4 = 'Токийские мстители 4 Сезон: Битва трёх небожителей / Tokyo Revengers: Santen Sensou-hen — Серия 3';
  const tv3 = 'Tokyo Revengers: Tenjiku Hen / Токийские мстители [ТВ-3] (13 из 13) Complete [1080p]';
  const s3part = 'Токийские мстители (3 сезон: 1-7 серии из 13) / Tokyo Revengers: Tenjiku Hen / 2023 / ЛМ (Dream Cast)';
  const s1all = 'Tokyo Revengers / Токийские мстители (24 из 24) Complete [1080p]';
  const s1ru = 'Токийские мстители (1 сезон: 1-24 серии из 24) / Tokyo Revengers / 2021 / ПМ (Crunchyroll), СТ / WEBRip (1080p)';
  const res = selectTorrent([item(ep3s4, 90), item(tv3, 40), item(s3part, 10), item(s1all, 60), item(s1ru, 60)], { ...CTX, names: NAMES });
  assert.strictEqual(find(res, ep3s4).rejected, 'episode-missing');
  assert.strictEqual(find(res, tv3).rejected, null);
  assert.strictEqual(find(res, s3part).rejected, null);
  assert.strictEqual(find(res, s1all).rejected, 'episode-missing');
  assert.notStrictEqual(find(res, s1ru).rejected, null);
  // Season 4 episode 3 itself is still found by its single-episode release.
  const s4e3 = withTracker({ kind: 'anime', season: 1, episode: 53, absolute: 53 }, MAP);
  assert.strictEqual(find(selectTorrent([item(ep3s4)], { ...s4e3, names: NAMES }), ep3s4).rejected, null);
});

test('test_tracker_pack_type_by_file_set', () => {
  // S1 = 12, S2 = 24 (absolute 13-36); target absolute 20 = S2E8.
  const map = [
    { season: 1, start: 1, count: 12, episodes: range(1, 12) },
    { season: 2, start: 13, count: 24, episodes: range(13, 36) },
  ];
  const ctx = { ...withTracker({ kind: 'anime', season: 1, episode: 20, absolute: 20 }, map), titleHasSeason: true };
  assert.deepStrictEqual(trackerFields(ctx), { trackerSeason: 2, trackerEpisode: 8, trackerStart: 13, trackerCount: 24 });
  const pack = range(1, 24).map((n) => ({ id: n, path: `Show S2/Show - ${String(n).padStart(2, '0')}.mkv`, length: GiB }));
  assert.strictEqual(packNumbering(pack, ctx), 'season');
  assert.strictEqual(pickFile(pack, ctx).path, 'Show S2/Show - 08.mkv');
  assert.deepStrictEqual([1, 8, 20, 24].map((e) => absoluteInPack(e, ctx)), [13, 20, 32, 36]);
  // A pack running past 24 is absolutely numbered: «20» is absolute 20.
  const abs = range(1, 36).map((n) => ({ id: 100 + n, path: `Show/Show - ${String(n).padStart(2, '0')}.mkv`, length: GiB }));
  assert.strictEqual(packNumbering(abs, ctx), 'absolute');
  assert.strictEqual(pickFile(abs, ctx).id, 120);
});

test('test_bare_episode_respects_season_tag', () => {
  const tv = (season, episode) => ({ kind: 'tv', season, episode, absolute: episode, names: ['Сериал'] });
  const a = 'Сериал 4 сезон — Серия 3 [1080p] LostFilm';
  const b = 'Сериал (4 сезон, серия 3) [1080p] LostFilm';
  for (const t of [a, b]) {
    assert.strictEqual(find(selectTorrent([item(t)], tv(1, 3)), t).rejected, 'episode-missing');
    assert.strictEqual(find(selectTorrent([item(t)], tv(4, 3)), t).rejected, null);
  }
});
