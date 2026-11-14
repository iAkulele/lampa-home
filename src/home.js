// Home screen component `lh_home`: six rows of wide cards instead of Lampa's main page.
import { lampa, noty } from './lampa.js';
import { ROWS } from './config.js';
import { loadRow, todayIso } from './tmdb.js';
import { toWideCard } from './cards.js';
import { BANNER, bannerVars, genreMap } from './templates.js';

const NAME = 'lh_home';
const TITLE = 'Главная';
// Set on every live lh_home instance; menu.js uses it to tell ours from a nocomponent stub.
const MARKER = 'lh_home_live';

// Until the catalog (Task 9) exists, "more" only announces it.
function openCatalog(rowKey) {
  noty('Каталог: скоро');
}

// Source card of the banner: first card of the movies row, else of the first row.
export function bannerCard(rows) {
  const row = rows.find((r) => r.params.lh_row === 'movies') || rows[0];
  return row && row.results[0];
}

// The hero banner as a pseudo-row of Main: Main navigates its `items` by index
// (toggle / up / down), so the banner sits at items[0] with its own controller.
function createBanner(comp, card) {
  const L = lampa();
  const vars = bannerVars(card, {
    img: L.Api.img,
    shortText: L.Utils.shortText,
    genres: genreMap(L.Api.sources.tmdb.genres, L.Lang.translate),
  });
  const html = L.Template.get(BANNER, vars);
  const el = html[0];
  const path = card.backdrop_path || card.poster_path;
  const background = path ? L.Api.img(path, 'w1280') : '';
  let last = false;

  html.find('.selector').on('hover:focus', function () {
    last = this;
    comp.scroll.update(el);
    if (background) L.Background.change(background);
  });
  html.find('.lh-banner__play').on('hover:enter', () => {
    noty('Играть появится позже');
    L.Router.call('full', card);
  });
  html.find('.lh-banner__more').on('hover:enter', () => L.Router.call('full', card));

  return {
    toggle() {
      L.Controller.add('lh_banner', {
        link: this,
        toggle: () => {
          L.Controller.collectionSet(el);
          L.Controller.collectionFocus(last, el);
        },
        left: () => {
          if (Navigator.canmove('left')) Navigator.move('left');
          else L.Controller.toggle('menu');
        },
        right: () => {
          if (Navigator.canmove('right')) Navigator.move('right');
        },
        up: () => comp.emit('up'),
        down: () => comp.emit('down'),
        back: () => comp.emit('back'),
      });
      L.Controller.toggle('lh_banner');
    },
    render: (js) => (js ? el : html),
    destroy: () => html.remove(),
  };
}

export function buildRows(loaded) {
  return loaded
    .filter((row) => row.results.length)
    .map((row) => ({
      title: row.title,
      results: row.results.map(toWideCard),
      total_pages: row.total_pages || 1,
      params: { items: { view: 6 }, lh_row: row.rowKey },
    }));
}

function component(object) {
  const L = lampa();
  const comp = L.Maker.make('Main', object);
  comp[MARKER] = true;

  comp.use({
    onCreate() {
      this.render(true).classList.add('lh-home');
      const today = todayIso();
      Promise.all(ROWS.map((key) => loadRow(key, today))).then((loaded) => {
        if (this.destroyed) return;
        const rows = buildRows(loaded);
        if (!rows.length) return this.empty();
        // Before build(): build() focuses items[active], which must be the banner.
        const banner = createBanner(this, bannerCard(rows));
        this.render(true).querySelector('.scroll__body').prepend(banner.render(true));
        this.items.push(banner);
        this.build(rows);
      }).catch(() => {
        if (!this.destroyed) this.empty();
      });
    },
    onNext(resolve, reject) {
      reject.call(this);
    },
    onDestroy() {
      this.destroyed = true;
    },
    onInstance(item, data) {
      const rowKey = data.params && data.params.lh_row;
      item.use({
        onMore: () => openCatalog(rowKey),
        onInstance(card, cardData) {
          card.use({
            onEnter: L.Router.call.bind(L.Router, 'full', cardData),
            onFocus() {
              L.Background.change(L.Utils.cardImgBackground(cardData));
            },
          });
        },
      });
    },
  });

  return comp;
}

export function register() {
  lampa().Component.add(NAME, component);
}

export function open() {
  lampa().Activity.push({ component: NAME, title: TITLE, url: '', page: 1, source: 'tmdb' });
}

export const COMPONENT = NAME;
export const HOME_TITLE = TITLE;
export { MARKER };
