import test from 'node:test';
import assert from 'node:assert';
import {
  pickerItems, seasonItems, watchedEpisodes, inProgressEpisodes, fallbackEpisodes, formatDate,
} from '../src/episode-picker.js';

const TODAY = '2026-11-14';
const EPISODES = [
  { episode_number: 1, name: 'Пилот', air_date: '2026-10-01' },
  { episode_number: 2, name: 'Вторая', air_date: '2026-10-08' },
  { episode_number: 3, name: 'Третья', air_date: '2026-10-15' },
  { episode_number: 4, name: 'Четвёртая', air_date: '2026-11-20' },
  { episode_number: 5, name: 'Пятая', air_date: null },
];

test('test_picker_marks_watched_and_selects_continue', () => {
  const items = pickerItems({
    season: 1, target: { season: 1, episode: 3 }, episodes: EPISODES, watchedSet: new Set([1, 2]), today: TODAY, seasonsCount: 2,
  });
  assert.deepStrictEqual(items[0], {
    title: 'Продолжить: серия 3', subtitle: 'Третья', season: 1, episode: 3, kind: 'continue', selected: true,
  });
  assert.strictEqual(items[1].title, '✓ Серия 1 — Пилот');
  assert.strictEqual(items[1].subtitle, '01.10.2026');
  assert.strictEqual(items[1].kind, 'episode');
  assert.strictEqual(items[1].selected, false);
  assert.strictEqual(items[2].title, '✓ Серия 2 — Вторая');
  assert.strictEqual(items[3].title, 'Серия 3 — Третья');
  assert.strictEqual(items.filter((i) => i.selected).length, 1);
  const tail = items.slice(-2).map((i) => [i.title, i.kind]);
  assert.deepStrictEqual(tail, [['Другой сезон…', 'season'], ['Все раздачи', 'list']]);
});

test('test_picker_hides_unaired', () => {
  const items = pickerItems({ season: 1, target: { season: 1, episode: 1 }, episodes: EPISODES, watchedSet: new Set(), today: TODAY });
  const eps = items.filter((i) => i.kind === 'episode').map((i) => i.episode);
  assert.deepStrictEqual(eps, [1, 2, 3]);
  // One season only: no «Другой сезон…».
  assert.ok(!items.some((i) => i.kind === 'season'));
  // Fallback episodes (TMDB season not loaded) are aired by construction.
  const fb = pickerItems({ season: 2, target: null, episodes: fallbackEpisodes(2, 3), watchedSet: new Set(), today: TODAY });
  assert.deepStrictEqual(fb.filter((i) => i.kind === 'episode').map((i) => i.title), ['Серия 1', 'Серия 2', 'Серия 3']);
  assert.ok(!fb.some((i) => i.kind === 'continue'));
});

test('test_picker_in_progress_label', () => {
  const items = pickerItems({
    season: 1, target: { season: 1, episode: 2 }, episodes: EPISODES, watchedSet: new Set([1]), inProgress: { 2: 42.4 }, today: TODAY,
  });
  assert.strictEqual(items.find((i) => i.episode === 2 && i.kind === 'episode').title, '▶ 42% Серия 2 — Вторая');
  assert.strictEqual(items.find((i) => i.episode === 1 && i.kind === 'episode').title, '✓ Серия 1 — Пилот');
});

test('test_watched_by_timeline_or_later_progress', () => {
  const views = { '1:1': { time: 900, percent: 90 }, '1:4': { time: 100, percent: 20 }, '2:1': { time: 0, percent: 0 } };
  const view = (s, e) => views[s + ':' + e] || null;
  // Progress says S01E03 was started: E1 and E2 count as watched; E1 also by the timeline.
  assert.deepStrictEqual([...watchedEpisodes(1, [1, 2, 3, 4], { season: 1, episode: 3 }, view)].sort(), [1, 2]);
  // A later season started: the whole earlier season is watched.
  assert.deepStrictEqual([...watchedEpisodes(1, [1, 2, 3], { season: 2, episode: 1 }, view)].sort(), [1, 2, 3]);
  assert.deepStrictEqual([...watchedEpisodes(2, [1, 2], { season: 1, episode: 3 }, view)], []);
  assert.deepStrictEqual(inProgressEpisodes(1, [1, 2, 3, 4], view), { 4: 20 });
});

test('test_season_items_and_date', () => {
  const tv = { seasons: [{ season_number: 0, episode_count: 2 }, { season_number: 1, episode_count: 8 }, { season_number: 2, episode_count: 10, air_date: '2027-01-01' }] };
  const items = seasonItems(tv, 1, TODAY);
  assert.deepStrictEqual(items.map((i) => [i.title, i.season, i.selected]), [['Сезон 1', 1, true]]);
  assert.strictEqual(formatDate('2026-03-09'), '09.03.2026');
  assert.strictEqual(formatDate(''), '');
});
