import test from 'node:test';
import assert from 'node:assert';
import { detectKind, pickFile, buildSearchParams, advanceWatched, timelineHashString } from '../src/play.js';

const GiB = 1024 ** 3;

test('test_detect_kind_anime_tv_movie', () => {
  assert.strictEqual(detectKind({ original_name: 'Frieren', origin_country: ['JP'], genre_ids: [16, 10759] }), 'anime');
  // Full TMDB card: genres instead of genre_ids.
  assert.strictEqual(detectKind({ original_name: 'Frieren', origin_country: ['JP'], genres: [{ id: 16 }] }), 'anime');
  // Japanese live action and western animation are plain tv.
  assert.strictEqual(detectKind({ original_name: 'Shogun', origin_country: ['JP'], genre_ids: [18] }), 'tv');
  assert.strictEqual(detectKind({ original_name: 'Arcane', origin_country: ['US'], genre_ids: [16] }), 'tv');
  assert.strictEqual(detectKind({ original_title: 'Dune', genre_ids: [878] }), 'movie');
  assert.strictEqual(detectKind({ original_title: 'Akira', origin_country: ['JP'], genre_ids: [16] }), 'movie');
});

test('test_pick_file_largest_for_movie', () => {
  const files = [
    { id: 1, path: 'Film/sample.mkv', length: 0.1 * GiB },
    { id: 2, path: 'Film/Film.2026.2160p.mkv', length: 20 * GiB },
    { id: 3, path: 'Film/extras.iso', length: 40 * GiB },
    { id: 4, path: 'Film/Film.rus.srt', length: 1000 },
  ];
  assert.strictEqual(pickFile(files, { kind: 'movie' }).id, 2);
});

test('test_pick_file_by_season_episode', () => {
  const files = [
    { id: 1, path: 'Show S02/Show.S02E01.1080p.mkv', length: GiB },
    { id: 2, path: 'Show S02/Show.S02E02.1080p.mkv', length: GiB },
    { id: 3, path: 'Show S02/Show.S02E03.1080p.mkv', length: GiB },
    { id: 4, path: 'Show S02/Show.S02E03.rus.srt', length: 100 },
  ];
  assert.strictEqual(pickFile(files, { kind: 'tv', season: 2, episode: 2, absolute: 12 }).id, 2);
  // Wrong season numbers are not matched by episode alone.
  assert.strictEqual(pickFile(files, { kind: 'tv', season: 3, episode: 2, absolute: 22 }), null);
});

test('test_pick_file_by_absolute', () => {
  const files = [
    { id: 1, path: 'Anime/[Group] Anime - 13 [1080p].mkv', length: GiB },
    { id: 2, path: 'Anime/[Group] Anime - 14 [1080p].mkv', length: GiB },
    { id: 3, path: 'Anime/[Group] Anime - 15 [1080p].mkv', length: GiB },
  ];
  assert.strictEqual(pickFile(files, { kind: 'anime', season: 2, episode: 2, absolute: 14 }).id, 2);
  // Per-season numbering in a season pack: falls back to the in-season episode.
  const pack = [
    { id: 7, path: 'Anime S2/[Group] Anime - 01 [1080p].mkv', length: GiB },
    { id: 8, path: 'Anime S2/[Group] Anime - 02 [1080p].mkv', length: GiB },
  ];
  assert.strictEqual(pickFile(pack, { kind: 'anime', season: 2, episode: 2, absolute: 14 }).id, 8);
});

test('test_pick_file_returns_null_when_missing', () => {
  const files = [
    { id: 1, path: 'Show/Show.S01E01.mkv', length: GiB },
    { id: 2, path: 'Show/Show.S01E02.mkv', length: GiB },
  ];
  assert.strictEqual(pickFile(files, { kind: 'tv', season: 1, episode: 5, absolute: 5 }), null);
  assert.strictEqual(pickFile([], { kind: 'movie' }), null);
  assert.strictEqual(pickFile([{ id: 1, path: 'a.srt', length: 5 }], { kind: 'movie' }), null);
});

test('test_build_search_params', () => {
  const movie = { title: 'Дюна', original_title: 'Dune', release_date: '2021-09-15' };
  const p = buildSearchParams(movie, { kind: 'movie' }, 'df_year');
  assert.deepStrictEqual(p, { search: 'Dune 2021', search_one: 'Дюна', search_two: 'Dune', movie, page: 1 });
  assert.strictEqual(buildSearchParams(movie, { kind: 'movie' }, 'nope').search, 'Dune');

  // TV cards may only carry name/original_name; the season suffix goes on all three.
  const tv = { name: 'Пацаны', original_name: 'The Boys', first_air_date: '2019-07-25' };
  const t = buildSearchParams(tv, { kind: 'tv', season: 3, episode: 1 }, 'lg');
  assert.strictEqual(t.search, 'Пацаны S03');
  assert.strictEqual(t.search_one, 'Пацаны S03');
  assert.strictEqual(t.search_two, 'The Boys S03');
  assert.strictEqual(buildSearchParams(tv, { kind: 'tv', season: 12, episode: 1 }, 'df').search, 'The Boys S12');
});

const SEASONS = [{ season_number: 0, episode_count: 3 }, { season_number: 1, episode_count: 8 }, { season_number: 2, episode_count: 6 }];

test('test_advance_watched_skips_watched_episodes', () => {
  const watched = new Set(['1:2', '1:3']);
  const isWatched = (s, e) => watched.has(s + ':' + e);
  assert.deepStrictEqual(advanceWatched({ season: 1, episode: 2 }, SEASONS, isWatched), { season: 1, episode: 4 });
  assert.deepStrictEqual(advanceWatched({ season: 1, episode: 5 }, SEASONS, isWatched), { season: 1, episode: 5 });
});

test('test_advance_watched_rolls_season', () => {
  const isWatched = (s, e) => s === 1 && e === 8;
  assert.deepStrictEqual(advanceWatched({ season: 1, episode: 8 }, SEASONS, isWatched), { season: 2, episode: 1 });
  // Everything watched: stops at the last known episode.
  assert.deepStrictEqual(advanceWatched({ season: 1, episode: 7 }, SEASONS, () => true), { season: 2, episode: 6 });
});

test('test_timeline_hash_string_matches_lampa', () => {
  assert.strictEqual(timelineHashString(1, 4, 'The Boys'), '14The Boys');
  assert.strictEqual(timelineHashString(12, 3, 'One Piece'), '12:3One Piece');
});
