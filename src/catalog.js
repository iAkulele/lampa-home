// Catalog component `lh_catalog`: a grid of wide cards for one kind (movie / tv /
// cartoon / anime) with genre, year and sort chips above it.
import { lampa, tmdbGet, store } from './lampa.js';
import { catalogQuery, genresFor } from './tmdb-queries.js';
import { toWideCard, applyPosterClass, hasRussianTitle, attachEpisodeBadge, isAnimeCard, kindHidesAnime } from './cards.js';
import { todayIso, tvStatus } from './tmdb.js';

const NAME = 'lh_catalog';
const FILTER_CONTROLLER = 'lh_catalog_filter';
// Four wide cards per row; Lampa's .cols--4 gives each grid child 25% width.
const COLS = 4;
const FIRST_YEAR = 2010;
const DECADES = ['2000-2009', '1990-1999'];

export const KIND_TITLES = { movie: 'Фильмы', tv: 'Сериалы', cartoon: 'Мультфильмы', anime: 'Аниме' };

const SORT_TITLES = { new: 'Сначала новые', rating: 'По рейтингу' };

// «Происхождение»: all or Russian originals. Anime is Japanese by definition.
const ORIGIN_TITLES = { null: 'все', ru: 'русские' };
const RU_TITLES = { movie: 'Русские фильмы', tv: 'Русские сериалы', cartoon: 'Русские мультфильмы' };
export const hasOriginFilter = (kind) => kind in RU_TITLES;
export const catalogTitle = (kind, lang) => (lang === 'ru' && RU_TITLES[kind]) || KIND_TITLES[kind];

// Home row -> catalog kind and the filters it opens with. history has no catalog.
// The rows are "new" lists, so their catalogs always open on sort 'new' with no year.
const FRESH = { genre: null, year: null, sort: 'new', lang: null };
const ROW_PRESETS = {
  movies: { kind: 'movie', preset: FRESH },
  horror: { kind: 'movie', preset: { ...FRESH, genre: 27 } },
  anime: { kind: 'anime', preset: FRESH },
  series: { kind: 'tv', preset: FRESH },
  cartoons: { kind: 'cartoon', preset: FRESH },
  russian: { kind: 'movie', preset: { ...FRESH, lang: 'ru' } },
  russian_tv: { kind: 'tv', preset: { ...FRESH, lang: 'ru' } },
};

export function presetFor(rowKey) {
  const p = ROW_PRESETS[rowKey];
  return p ? { kind: p.kind, preset: { ...p.preset } } : null;
}

export function applyPreset(stored, preset) {
  return { ...stored, ...(preset || {}) };
}

const decadeTitle = (range) => range.replace('-', '–');

// Year choices: all, the current year down to 2010, then two decades.
export function yearOptions(today) {
  const current = Number(today.slice(0, 4));
  const out = [{ title: 'Все', value: null }];
  for (let y = current; y >= FIRST_YEAR; y--) out.push({ title: String(y), value: y });
  for (const d of DECADES) out.push({ title: decadeTitle(d), value: d });
  return out;
}

export function genreName(kind, id) {
  const g = id != null && genresFor(kind).find((x) => x.id === id);
  return g ? g.title : 'все';
}

export function chosenLabels(kind, f) {
  const year = f.year == null ? 'все' : typeof f.year === 'string' ? decadeTitle(f.year) : String(f.year);
  return {
    genre: `Жанр: ${genreName(kind, f.genre)}`,
    year: `Год: ${year}`,
    sort: SORT_TITLES[f.sort] || SORT_TITLES.new,
    lang: `Происхождение: ${ORIGIN_TITLES[f.lang === 'ru' ? 'ru' : null]}`,
  };
}

// Wraps a callback so it does nothing once comp is destroyed: a TMDB answer that
// arrives after Back or a filter change must not toggle a dead activity.
export function guarded(comp, fn) {
  return (...args) => {
    if (!comp.destroyed) fn(...args);
  };
}

// Drops cards already shown (TMDB pages shift between requests); remembers new ids in seen.
export function dedupe(results, seen) {
  return results.filter((card) => {
    if (!card || card.id == null) return true;
    if (seen.has(card.id)) return false;
    seen.add(card.id);
    return true;
  });
}

// Bare global of Lampa's keyboard navigator; absent outside the app.
const nav = () => (typeof Navigator !== 'undefined' ? Navigator : null);
const canMove = (dir) => {
  const n = nav();
  return !!(n && n.canmove(dir));
};
const move = (dir) => nav().move(dir);

const EXTRA_PAGES = 3;

// A page that filters down to nothing must not end the list: try the next pages
// (bounded) and keep object.page in step so Lampa's pagination continues from there.
function load(object, kind, f, page, seen, ok, fail, extra = EXTRA_PAGES) {
  const q = catalogQuery(kind, f, page, todayIso());
  tmdbGet(
    q.url,
    q.params,
    (json) => {
      const keep = (c) => hasRussianTitle(c) && !(kindHidesAnime(kind) && isAnimeCard(c));
      const results = dedupe(((json && json.results) || []).filter(keep), seen).map(toWideCard);
      const total = (json && json.total_pages) || 1;
      if (!results.length && extra > 0 && page < total) {
        object.page = page + 1;
        load(object, kind, f, page + 1, seen, ok, fail, extra - 1);
        return;
      }
      ok({ ...json, results });
    },
    fail,
  );
}

function component(object) {
  const L = lampa();
  const kind = object.kind;
  object.params = { ...(object.params || {}), items: { mapping: 'grid', cols: COLS } };

  const comp = L.Maker.make('Category', object, (m) => m.toggle(m.MASK.base, 'Pagination'));
  // lang is not persisted: it lives in the activity, so the menu's Фильмы is unaffected.
  const f = { ...store.filters.get(kind), lang: object.lang || null };
  const filter = new L.Filter(object);
  const head = document.createElement('div');
  head.className = 'lh-catalog__head';
  let lastChip = false;
  const seen = new Set(); // card ids already in the grid, across pages

  function toggleFilter() {
    L.Controller.toggle(FILTER_CONTROLLER);
  }

  // Saves the filters and rebuilds the screen from page 1. lang lives in the
  // activity (Activity.replace keeps it), not in the stored filters.
  function apply(patch) {
    store.filters.set(kind, { ...f, ...patch });
    const next = { page: 1 };
    if ('lang' in patch) Object.assign(next, { lang: patch.lang, title: catalogTitle(kind, patch.lang) });
    L.Activity.replace(next);
  }

  function pick(title, items, current, onPick) {
    L.Select.show({
      title,
      items: items.map((it) => ({ title: it.title, value: it.value, selected: it.value === current })),
      onSelect: (a) => onPick(a.value),
      onBack: toggleFilter,
    });
  }

  function buildFilter() {
    const labels = chosenLabels(kind, f);
    filter.set('filter', [
      { title: labels.genre, lh: 'genre' },
      { title: labels.year, lh: 'year' },
    ].concat(hasOriginFilter(kind) ? [{ title: labels.lang, lh: 'lang' }] : []));
    filter.set('sort', Object.keys(SORT_TITLES).map((key) => ({
      title: SORT_TITLES[key], lh: key, selected: key === f.sort,
    })));

    filter.onBack = toggleFilter;
    filter.onSelect = (type, a) => {
      if (type === 'sort') {
        if (a.lh === f.sort) toggleFilter();
        else apply({ sort: a.lh });
      } else if (a.lh === 'genre') {
        const genres = [{ title: 'Все', value: null }].concat(
          genresFor(kind).map((g) => ({ title: g.title, value: g.id })),
        );
        pick('Жанр', genres, f.genre, (genre) => apply({ genre }));
      } else if (a.lh === 'lang') {
        pick('Происхождение', [{ title: 'Все', value: null }, { title: 'Русские', value: 'ru' }], f.lang, (lang) => apply({ lang }));
      } else {
        pick('Год', yearOptions(todayIso()), f.year, (year) => apply({ year }));
      }
    };

    const line = filter.render();
    line.find('.filter--search').remove();
    // Not filter.chosen(): it cuts the text to 25 chars ("Жанр: Ужасы...: 2000–2009").
    const chosen = [labels.genre, labels.year].concat(f.lang === 'ru' ? ['русские'] : []);
    line.find('.filter--filter > div').text(chosen.join(', ')).removeClass('hide');
    line.find('.filter--sort > div').text(labels.sort).removeClass('hide');
    line.find('.selector').on('hover:focus', (e) => {
      lastChip = e.target;
    });
    head.append(line[0]);
  }

  // Re-added on every start: the controller name is shared by all catalog
  // instances, so after "back" from another catalog it must point at this head again.
  const addFilterController = () => L.Controller.add(FILTER_CONTROLLER, {
    toggle: () => {
      L.Controller.collectionSet(head);
      L.Controller.collectionFocus(lastChip, head);
    },
    left: () => {
      if (canMove('left')) move('left');
      else L.Controller.toggle('menu');
    },
    right: () => {
      if (canMove('right')) move('right');
    },
    up: () => L.Controller.toggle('head'),
    down: () => comp.start(),
    back: () => L.Activity.backward(),
  });

  comp.use({
    onStart: addFilterController,
    onCreate() {
      this.render(true).classList.add('lh-catalog');
      buildFilter();
      this.render(true).prepend(head);
      this.scroll.minus(head);
      load(object, kind, f, 1, seen, guarded(this, this.build.bind(this)), guarded(this, this.empty.bind(this)));
    },
    onNext(resolve, reject) {
      load(object, kind, f, object.page, seen, guarded(this, resolve.bind(this)), guarded(this, reject.bind(this)));
    },
    onController(controller) {
      controller.up = () => {
        if (canMove('up')) move('up');
        else toggleFilter();
      };
    },
    onEmpty() {
      // The Empty module swapped start() for its own screen: route "up" to the chips there too.
      if (this.empty_class) {
        this.empty_class.use({
          onStart: addFilterController,
          onController: (controller) => {
            controller.up = toggleFilter;
          },
        });
      }
    },
    onInstance(item, data) {
      if ((kind === 'tv' || kind === 'anime') && data.original_name) attachEpisodeBadge(item, data, tvStatus, todayIso);
      item.use({
        onCreate() {
          applyPosterClass(item.render(true), data);
        },
        onEnter: L.Router.call.bind(L.Router, 'full', data),
      });
    },
    onDestroy() {
      this.destroyed = true;
      filter.destroy();
      head.remove();
    },
  });

  return comp;
}

export function register() {
  lampa().Component.add(NAME, component);
}

// Preset filters are merged over the stored ones and saved, so they stick.
export function open(kind, preset) {
  if (preset) store.filters.set(kind, applyPreset(store.filters.get(kind), preset));
  const lang = (preset && preset.lang) || null;
  const title = catalogTitle(kind, lang);
  lampa().Activity.push({ url: '', component: NAME, kind, lang, title, page: 1, source: 'tmdb' });
}

function openHistory() {
  const L = lampa();
  const fav = L.Favorite;
  const base = fav && typeof fav.historyActivity === 'function'
    ? fav.historyActivity()
    : { component: 'favorite', type: 'history', title: L.Lang.translate('title_history') };
  L.Activity.push({ url: '', page: 1, ...base });
}

export function openForRow(rowKey) {
  if (rowKey === 'history') return openHistory();
  const p = presetFor(rowKey);
  if (p) open(p.kind, p.preset);
}

export const COMPONENT = NAME;
