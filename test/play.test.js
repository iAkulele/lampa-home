import test from 'node:test';
import assert from 'node:assert';
import {
  detectKind, pickFile, buildSearchParams, advanceWatched, timelineHashString, resumeTarget, normalizeTitles, titleHasSeason,
  nextCandidates, previousEpisodeCtx, tryCandidates, PlayError, releaseLabel,
} from '../src/play.js';

test('test_release_label', () => {
  assert.strictEqual(releaseLabel({ Title: 'Film 2160p WEB-DL HDRezka', Size: 16.6 * GiB }), '2160p · 16,6 ГБ · hdrezka');
  assert.strictEqual(releaseLabel({ Title: 'Film WEB-DL', Size: 0 }), '');
  assert.strictEqual(releaseLabel(null), '');
});

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

test('test_detect_kind_prefers_genres_when_genre_ids_empty', () => {
  // History cards may keep an empty genre_ids next to the full genres.
  assert.strictEqual(detectKind({ original_name: 'Frieren', origin_country: ['JP'], genre_ids: [], genres: [{ id: 16, name: 'Анимация' }] }), 'anime');
  assert.strictEqual(detectKind({ original_name: 'Frieren', origin_country: ['JP'], genres: [{ id: 10759 }, { id: 16 }] }), 'anime');
  assert.strictEqual(detectKind({ original_name: 'Frieren', origin_country: ['JP'] }), 'tv');
});

test('test_pick_file_tv_season_pack_uses_in_season_number', () => {
  // Breaking Bad «Сезон 2»: S1 has 7 episodes, so absolute S2E3 = 10.
  const files = Array.from({ length: 13 }, (_, i) => ({
    id: i + 1,
    path: `Во все тяжкие Сезон 2/Серия ${String(i + 1).padStart(2, '0')}.mkv`,
    length: GiB,
  }));
  const f = pickFile(files, { kind: 'tv', season: 2, episode: 3, absolute: 10 });
  assert.strictEqual(f.path, 'Во все тяжкие Сезон 2/Серия 03.mkv');
});

test('test_pick_file_two_season_pack_never_picks_other_season', () => {
  const files = [
    { id: 1, path: 'Show/Season 1/Серия 5.mkv', length: GiB },
    { id: 2, path: 'Show/Season 2/Серия 5.mkv', length: GiB },
  ];
  const ctx = { kind: 'tv', season: 2, episode: 5, absolute: 15 };
  // Bare "5" matches both files: without Lampa's parse no guess is made.
  assert.strictEqual(pickFile(files, ctx), null);
  // Torserver.parse reads the season folders.
  const infos = [{ id: 1, season: 1, episode: 5 }, { id: 2, season: 2, episode: 5 }];
  assert.strictEqual(pickFile(files, ctx, infos).id, 2);
});

test('test_pick_file_anime_season_pack_per_season_numbering', () => {
  // S1 had 12 episodes; the S2 pack is numbered 01..24 per season.
  const files = Array.from({ length: 24 }, (_, i) => ({
    id: i + 1,
    path: `[Group] Anime S2/[Group] Anime - ${String(i + 1).padStart(2, '0')} [1080p].mkv`,
    length: GiB,
  }));
  const ctx = { kind: 'anime', season: 2, episode: 2, absolute: 14 };
  // The release title names the season: per-season number first.
  assert.strictEqual(pickFile(files, { ...ctx, titleHasSeason: true }).id, 2);
  // No season in the title: absolute numbering first (long-running shows).
  assert.strictEqual(pickFile(files, { ...ctx, titleHasSeason: false }).id, 14);
});

test('test_title_has_season', () => {
  assert.strictEqual(titleHasSeason('Attack on Titan Season 3 [1080p]'), true);
  assert.strictEqual(titleHasSeason('Пацаны (4 сезон: 1-8 серии из 8)'), true);
  assert.strictEqual(titleHasSeason('Show.S02.1080p'), true);
  assert.strictEqual(titleHasSeason('[AniDub] One Piece [1090-1100]'), false);
});

test('test_resume_target_partly_watched', () => {
  const progress = { season: 1, episode: 4 };
  assert.deepStrictEqual(resumeTarget(progress, { time: 600, percent: 30 }), { season: 1, episode: 4 });
  // Finished (>= 85 %) or never started: move on.
  assert.strictEqual(resumeTarget(progress, { time: 2500, percent: 90 }), null);
  assert.strictEqual(resumeTarget(progress, { time: 0, percent: 0 }), null);
  assert.strictEqual(resumeTarget(null, { time: 600, percent: 30 }), null);
  assert.strictEqual(resumeTarget(progress, null), null);
});

test('test_normalize_titles_for_timeline_hash', () => {
  assert.deepStrictEqual(normalizeTitles({ id: 1, name: 'Пацаны', original_name: 'The Boys' }),
    { id: 1, name: 'Пацаны', original_name: 'The Boys', title: 'Пацаны', original_title: 'The Boys' });
  const movie = { id: 2, title: 'Дюна', original_title: 'Dune' };
  assert.deepStrictEqual(normalizeTitles(movie), movie);
});

test('test_pick_file_rejects_bare_hit_from_other_season_folder', () => {
  const files = [
    { id: 1, path: 'Show/Season 1/Серия 5.mkv', length: GiB },
    { id: 2, path: 'Show/Season 2/Серия 4.mkv', length: GiB },
  ];
  const ctx = { kind: 'tv', season: 2, episode: 5, absolute: 12 };
  const infos = [{ id: 1, season: 1, episode: 5 }, { id: 2, season: 2, episode: 4 }];
  assert.strictEqual(pickFile(files, ctx, infos), null);
  // A season Lampa only guessed (no marker in the path) does not reject the hit.
  const guessed = [{ id: 1, season: 1, episode: 5, defaultSeason: true }, { id: 2, season: 1, episode: 4, defaultSeason: true }];
  assert.strictEqual(pickFile(files, ctx, guessed).id, 1);
});

test('test_next_candidates_skips_rejected_and_limits', () => {
  const r = (n, link) => ({ Title: 'T' + n, MagnetUri: link || 'magnet:' + n });
  const scored = [
    { result: r(1), score: 90, rejected: null },
    { result: r(2), score: 80, rejected: null },
    { result: r(3, 'magnet:1'), score: 70, rejected: null }, // same release as #1
    { result: r(4), score: 60, rejected: null },
    { result: r(5), score: 50, rejected: null },
    { result: r(6), score: 99, rejected: 'cam' },
  ];
  assert.deepStrictEqual(nextCandidates(scored).map((x) => x.Title), ['T1', 'T2', 'T4']);
  assert.deepStrictEqual(nextCandidates(scored, 1).map((x) => x.Title), ['T1']);
  assert.deepStrictEqual(nextCandidates([{ result: r(1), score: 1, rejected: 'x' }]), []);
  assert.deepStrictEqual(nextCandidates(null), []);
});

test('test_previous_episode_ctx', () => {
  assert.deepStrictEqual(previousEpisodeCtx({ kind: 'anime', season: 1, episode: 12, absolute: 12 }),
    { kind: 'anime', season: 1, episode: 11, absolute: 11 });
  assert.strictEqual(previousEpisodeCtx({ kind: 'tv', season: 1, episode: 1, absolute: 1 }), null);
  assert.strictEqual(previousEpisodeCtx({ kind: 'movie' }), null);
});

test('test_dead_first_release_does_not_end_the_run', async () => {
  const misses = [];
  const tried = [];
  // First release never returns its file list (pollFiles -> noFiles after 20 × 2 s).
  const outcome = await tryCandidates(['dead', 'good', 'third'], async (cand) => {
    tried.push(cand);
    if (cand === 'dead') throw new PlayError('TorrServer не получил список файлов');
    return 'played';
  }, { onMiss: () => misses.push(tried[tried.length - 1]) });
  assert.strictEqual(outcome, 'played');
  assert.deepStrictEqual(tried, ['dead', 'good']);
  assert.deepStrictEqual(misses, ['dead']);
});

test('test_candidate_loop_outcomes', async () => {
  // TorrServer unreachable is fatal on any candidate.
  await assert.rejects(tryCandidates(['a', 'b'], async () => {
    throw new PlayError('TorrServer недоступен', true);
  }), (e) => e.fatal === true);
  // Foreign errors are rethrown too.
  await assert.rejects(tryCandidates(['a'], async () => {
    throw new TypeError('bug');
  }), TypeError);
  // Every miss: 'nofile-prev' wins over 'nofile' at the end.
  assert.strictEqual(await tryCandidates(['a', 'b'], async (c) => (c === 'a' ? 'nofile-prev' : 'nofile')), 'nofile-prev');
  assert.strictEqual(await tryCandidates(['a'], async () => 'nofile'), 'nofile');
  // Cancelled while a miss happens: stop.
  let cancelled = false;
  const tried = [];
  const out = await tryCandidates(['a', 'b'], async (c) => {
    tried.push(c);
    cancelled = true;
    return 'nofile';
  }, { cancelled: () => cancelled });
  assert.strictEqual(out, 'cancelled');
  assert.deepStrictEqual(tried, ['a']);
});
