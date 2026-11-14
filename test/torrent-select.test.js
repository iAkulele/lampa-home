import test from 'node:test';
import assert from 'node:assert';
import { parseTitle, selectTorrent } from '../src/torrent-select.js';

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
  const a = item('Film 2160p WEB-DL LostFilm', 20);
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
