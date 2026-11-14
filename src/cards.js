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

// True when the card shows a Russian title: Cyrillic in the title, or a Russian original.
export function hasRussianTitle(card) {
  if (!card) return false;
  return /[Ѐ-ӿ]/.test(card.title || card.name || '') || card.original_language === 'ru';
}

// Fetches pages 1..maxPages until at least `min` cards are collected; returns up to `limit`.
// fetchPage(page) -> Promise<card[]> (an empty array means no more pages).
export async function fillPages(fetchPage, { min = 12, maxPages = 3, limit = 20 } = {}) {
  let all = [];
  for (let page = 1; page <= maxPages; page++) {
    const part = await fetchPage(page);
    if (!part || !part.length) {
      if (page > 1) break;
    }
    all = all.concat(part || []);
    if (all.length >= min) break;
  }
  return all.slice(0, limit);
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

// Marks a poster-fallback card element so CSS can fit the poster instead of cropping it.
export function applyPosterClass(cardEl, cardData) {
  if (!cardEl || !cardData || !cardData.lh_poster_fallback) return;
  cardEl.classList.add('lh-card--poster');
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

// Banner source: the first card, or a random one among the first five.
export function pickBannerCard(cards, random, rnd = Math.random) {
  if (!cards || !cards.length) return undefined;
  if (!random) return cards[0];
  return cards[Math.floor(rnd() * Math.min(5, cards.length))];
}
