// Catalog component `lh_catalog`: a grid of wide cards for one kind (movie / tv /
// cartoon / anime) with genre, year and sort chips above it.
import { lampa, tmdbGet, store } from './lampa.js';
import { catalogQuery, genresFor } from './tmdb-queries.js';
import { toWideCard } from './cards.js';
import { todayIso } from './tmdb.js';

const NAME = 'lh_catalog';
const FILTER_CONTROLLER = 'lh_catalog_filter';
// Four wide cards per row; Lampa's .cols--4 gives each grid child 25% width.
const COLS = 4;
const FIRST_YEAR = 2010;
const DECADES = ['2000-2009', '1990-1999'];

export const KIND_TITLES = { movie: 'Фильмы', tv: 'Сериалы', cartoon: 'Мультфильмы', anime: 'Аниме' };

const SORT_TITLES = { new: 'Сначала новые', rating: 'По рейтингу' };

// Home row -> catalog kind and the filters it opens with. history has no catalog.
const ROW_PRESETS = {
  movies: { kind: 'movie', preset: {} },
  horror: { kind: 'movie', preset: { genre: 27 } },
  anime: { kind: 'anime', preset: { sort: 'new' } },
  series: { kind: 'tv', preset: {} },
  cartoons: { kind: 'cartoon', preset: {} },
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
  };
}

function load(kind, f, page, ok, fail) {
  const q = catalogQuery(kind, f, page, todayIso());
  tmdbGet(
    q.url,
    q.params,
    (json) => ok({ ...json, results: ((json && json.results) || []).map(toWideCard) }),
    fail,
  );
}

function component(object) {
  const L = lampa();
  const kind = object.kind;
  object.params = { ...(object.params || {}), items: { mapping: 'grid', cols: COLS } };

  const comp = L.Maker.make('Category', object, (m) => m.toggle(m.MASK.base, 'Pagination'));
  const f = store.filters.get(kind);
  const filter = new L.Filter(object);
  const head = document.createElement('div');
  head.className = 'lh-catalog__head';
  let lastChip = false;

  function toggleFilter() {
    L.Controller.toggle(FILTER_CONTROLLER);
  }

  // Saves the filters and rebuilds the screen from page 1.
  function apply(patch) {
    store.filters.set(kind, { ...f, ...patch });
    L.Activity.replace({ page: 1 });
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
    ]);
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
      } else {
        pick('Год', yearOptions(todayIso()), f.year, (year) => apply({ year }));
      }
    };

    const line = filter.render();
    line.find('.filter--search').remove();
    // Not filter.chosen(): it cuts the text to 25 chars ("Жанр: Ужасы...: 2000–2009").
    line.find('.filter--filter > div').text(`${labels.genre}, ${labels.year}`).removeClass('hide');
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
      if (Navigator.canmove('left')) Navigator.move('left');
      else L.Controller.toggle('menu');
    },
    right: () => {
      if (Navigator.canmove('right')) Navigator.move('right');
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
      load(kind, f, 1, this.build.bind(this), this.empty.bind(this));
    },
    onNext(resolve, reject) {
      load(kind, f, object.page, resolve.bind(this), reject.bind(this));
    },
    onController(controller) {
      controller.up = () => {
        if (Navigator.canmove('up')) Navigator.move('up');
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
      item.use({
        onEnter: L.Router.call.bind(L.Router, 'full', data),
        onFocus() {
          L.Background.change(L.Utils.cardImgBackground(data));
        },
      });
    },
    onDestroy() {
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
  lampa().Activity.push({ url: '', component: NAME, kind, title: KIND_TITLES[kind], page: 1, source: 'tmdb' });
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
