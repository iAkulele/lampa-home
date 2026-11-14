import test from 'node:test';
import assert from 'node:assert';
import {
  episodeStatus,
  absoluteEpisode,
  nextEpisode,
  parseEpisode,
} from '../src/episodes.js';

const TODAY = '2026-11-14';

test('test_status_mid_season', () => {
  const tv = {
    seasons: [{ season_number: 1, episode_count: 12 }],
    last_episode_to_air: { season_number: 1, episode_number: 7, air_date: '2026-11-01' },
    next_episode_to_air: { season_number: 1, episode_number: 8, air_date: '2026-11-20' },
    status: 'Returning Series',
  };
  assert.deepStrictEqual(episodeStatus(tv, TODAY), { season: 1, aired: 7, total: 12, airing: true });
});

test('test_status_finished_season_uses_episode_count', () => {
  const tv = {
    seasons: [
      { season_number: 1, episode_count: 8 },
      { season_number: 2, episode_count: 10 },
    ],
    last_episode_to_air: { season_number: 2, episode_number: 10, air_date: '2026-05-01' },
    next_episode_to_air: null,
    status: 'Ended',
  };
  assert.deepStrictEqual(episodeStatus(tv, TODAY), { season: 2, aired: 10, total: 10, airing: false });
});

test('test_status_future_last_episode_is_not_aired', () => {
  const tv = {
    seasons: [{ season_number: 1, episode_count: 12 }],
    last_episode_to_air: { season_number: 1, episode_number: 7, air_date: '2026-12-01' },
    status: 'Ended',
  };
  assert.strictEqual(episodeStatus(tv, TODAY).aired, 6);
});

test('test_status_without_last_episode_uses_last_real_season', () => {
  const tv = {
    seasons: [
      { season_number: 0, episode_count: 3 },
      { season_number: 1, episode_count: 8 },
      { season_number: 2, episode_count: 6 },
    ],
    status: 'Ended',
  };
  assert.deepStrictEqual(episodeStatus(tv, TODAY), { season: 2, aired: 6, total: 6, airing: false });
});

test('test_absolute_episode_from_seasons', () => {
  const seasons = [
    { season_number: 0, episode_count: 5 },
    { season_number: 1, episode_count: 12 },
    { season_number: 2, episode_count: 13 },
  ];
  assert.strictEqual(absoluteEpisode(seasons, 2, 3), 15);
});

test('test_next_episode_defaults_to_s1e1', () => {
  const seasons = [{ season_number: 1, episode_count: 12 }];
  assert.deepStrictEqual(nextEpisode(null, seasons), { season: 1, episode: 1 });
});

test('test_next_episode_increments_within_season', () => {
  const seasons = [{ season_number: 1, episode_count: 12 }];
  assert.deepStrictEqual(nextEpisode({ season: 1, episode: 4 }, seasons), { season: 1, episode: 5 });
});

test('test_next_episode_rolls_to_next_season', () => {
  const seasons = [
    { season_number: 1, episode_count: 12 },
    { season_number: 2, episode_count: 13 },
  ];
  assert.deepStrictEqual(nextEpisode({ season: 1, episode: 12 }, seasons), { season: 2, episode: 1 });
});

test('test_next_episode_stays_when_no_next_season', () => {
  const seasons = [
    { season_number: 1, episode_count: 12 },
    { season_number: 2, episode_count: 13 },
  ];
  assert.deepStrictEqual(nextEpisode({ season: 2, episode: 13 }, seasons), { season: 2, episode: 13 });
});

test('test_parses_sxxexx', () => {
  assert.deepStrictEqual(parseEpisode('Show.S02E05.1080p.mkv'), { season: 2, episode: 5, absolute: null });
  assert.deepStrictEqual(parseEpisode('show s1e5.mkv'), { season: 1, episode: 5, absolute: null });
});

test('test_parses_1x05', () => {
  assert.deepStrictEqual(parseEpisode('1x05'), { season: 1, episode: 5, absolute: null });
});

test('test_parses_absolute_only', () => {
  assert.deepStrictEqual(parseEpisode('[AniDub] One Piece - 1095 [1080p].mkv'), {
    season: null,
    episode: 1095,
    absolute: 1095,
  });
});

test('test_parses_cyrillic', () => {
  assert.deepStrictEqual(parseEpisode('Сезон 1 Серия 5'), { season: 1, episode: 5, absolute: null });
});

test('test_parses_episode_only_tokens', () => {
  assert.deepStrictEqual(parseEpisode('Show.E05.mkv'), { season: null, episode: 5, absolute: 5 });
  assert.deepStrictEqual(parseEpisode('show ep07.mkv'), { season: null, episode: 7, absolute: 7 });
  assert.deepStrictEqual(parseEpisode('Шоу серия 5.mkv'), { season: null, episode: 5, absolute: 5 });
});

test('test_ignores_directory_path', () => {
  assert.deepStrictEqual(parseEpisode('D:\\Shows\\S03E01 pack\\Show.S01E02.mkv'), {
    season: 1,
    episode: 2,
    absolute: null,
  });
});

test('test_no_episode_returns_nulls', () => {
  assert.deepStrictEqual(parseEpisode('Movie.2024.2160p.mkv'), { season: null, episode: null, absolute: null });
});

test('test_ignores_resolution_tokens', () => {
  assert.deepStrictEqual(parseEpisode('Show.1080p.x265.mkv'), { season: null, episode: null, absolute: null });
  assert.deepStrictEqual(parseEpisode('Show 720p 10bit.mkv'), { season: null, episode: null, absolute: null });
});
