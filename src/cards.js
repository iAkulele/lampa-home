// Pure card helpers for the home rows. No window, no Lampa.

const ROW_TITLES = {
  movies: 'Новые фильмы',
  horror: 'Новые ужасы',
  anime: 'Аниме: онгоинги',
  series: 'Новые сериалы',
  cartoons: 'Новые мультфильмы',
  history: 'Недавно просмотренное',
};

export function rowTitle(rowKey) {
  return ROW_TITLES[rowKey] || rowKey;
}

// Copy of a TMDB card rendered in Lampa's wide (16:9) style. Cards without a
// backdrop fall back to the poster and are flagged so CSS can crop them.
export function toWideCard(card) {
  const out = { ...card, params: { ...(card.params || {}), style: { name: 'wide' } } };
  if (!out.backdrop_path && out.poster_path) {
    out.backdrop_path = out.poster_path;
    out.lh_poster_fallback = true;
  }
  return out;
}

export function badgeText(status) {
  return `${status.aired} из ${status.total}`;
}

// Adds the "N из M" badge to a card element once; skipped without usable status.
export function applyBadge(cardEl, status) {
  if (!cardEl || !status || !status.total) return;
  const view = cardEl.querySelector('.card__view');
  if (!view || view.querySelector('.lh-badge')) return;
  const el = document.createElement('div');
  el.className = 'lh-badge';
  el.textContent = badgeText(status);
  view.appendChild(el);
}
