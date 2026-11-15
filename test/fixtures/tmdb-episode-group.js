// TMDB tv/episode_group/63ba5aedfa404600e63aa488 («Токийские мстители», type 6
// "Seasons"), 2026-11-15, trimmed to the fields the plugin reads. The real
// response lists Specials (season 0) with order 0 and the arcs with order 1..4.

const eps = (from, to) => {
  const out = [];
  for (let n = from; n <= to; n++) out.push({ season_number: 1, episode_number: n, order: n - from, air_date: '2021-04-11' });
  return out;
};
const specials = [];
for (let n = 2; n <= 25; n++) specials.push({ season_number: 0, episode_number: n, order: n - 2 });

export const TOKYO_GROUP = {
  id: '63ba5aedfa404600e63aa488',
  name: 'Seasons',
  type: 6,
  group_count: 5,
  episode_count: 87,
  groups: [
    { name: 'Season 1', order: 1, episodes: eps(1, 24) },
    { name: 'Christmas Showdown Arc', order: 2, episodes: eps(25, 37) },
    { name: 'Tenjiku Arc', order: 3, episodes: eps(38, 50) },
    { name: 'Specials', order: 0, episodes: specials },
    { name: 'War of the Three Titans Arc', order: 4, episodes: eps(51, 63) },
  ],
};
