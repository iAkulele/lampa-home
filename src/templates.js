// Lampa templates of the plugin and the pure helpers that fill them.
import { lampa } from './lampa.js';

export const BANNER = 'lh_banner';

const BANNER_HTML = `<div class="lh-banner" style="background-image:url('{backdrop}')">
  <div class="lh-banner__shade"></div>
  <div class="lh-banner__body">
    <div class="lh-banner__title">{title}</div>
    <div class="lh-banner__meta">{meta}</div>
    <div class="lh-banner__overview">{overview}</div>
    <div class="lh-banner__buttons">
      <div class="lh-banner__button lh-banner__play selector">&#9654; Играть</div>
      <div class="lh-banner__button lh-banner__more selector">Подробнее</div>
    </div>
  </div>
</div>`;

// Template.get pastes values raw into HTML via String.replace, so escape HTML
// specials, `$` (replacement patterns like `$&`) and braces (a value holding
// `{meta}` would otherwise be substituted again by a later var).
function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\$/g, '&#36;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;');
}

// {id: 'Name'} from Lampa.Api.sources.tmdb.genres ({movie: [{id, title}], tv: [...]}).
// Titles are `#{lang_key}` and need translating; the first (movie) name wins.
export function genreMap(tmdbGenres, translate) {
  const map = {};
  if (!tmdbGenres) return map;
  ['movie', 'tv'].forEach((type) => {
    (tmdbGenres[type] || []).forEach((g) => {
      if (map[g.id]) return;
      const name = String(translate(g.title) || '');
      if (name) map[g.id] = name.charAt(0).toUpperCase() + name.slice(1);
    });
  });
  return map;
}

// Cut text to at most `max` chars at a word boundary, ending with `…`.
// (Lampa.Utils.shortText cuts out the middle, which reads badly for overviews.)
export function truncate(text, max) {
  const str = String(text == null ? '' : text);
  if (str.length <= max) return str;
  const head = str.slice(0, max - 3);
  const space = head.lastIndexOf(' ');
  const cut = space > 0 ? head.slice(0, space) : str.slice(0, max - 1);
  return cut.replace(/[\s,.;:—-]+$/, '') + '…';
}

// Vars for the banner template. `img(path, size)` is Lampa.Api.img;
// `genres` is a genreMap() result.
export function bannerVars(card, { img, genres = {} }) {
  const date = card.release_date || card.first_air_date || '';
  const genre = (card.genre_ids || []).map((id) => genres[id]).find(Boolean);
  const rating = Number(card.vote_average) > 0 ? '★ ' + Number(card.vote_average).toFixed(1) : '';
  const meta = [date.slice(0, 4), genre, rating].filter(Boolean).join(' · ');
  const path = card.backdrop_path || card.poster_path;
  return {
    title: esc(card.title || card.name),
    meta: esc(meta),
    overview: esc(truncate(card.overview, 180)),
    backdrop: path ? esc(img(path, 'w1280')) : '',
  };
}

export function register() {
  lampa().Template.add(BANNER, BANNER_HTML);
}
