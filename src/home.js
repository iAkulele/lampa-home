// Home screen component `lh_home`: six rows of wide cards instead of Lampa's main page.
import { lampa, storageField } from './lampa.js';
import * as play from './play.js';
import * as catalog from './catalog.js';
import { ROWS } from './config.js';
import { loadRow, todayIso, tvStatus } from './tmdb.js';
import { toWideCard, applyBadge, applyPosterClass, pickBannerCard } from './cards.js';
import { BANNER, bannerVars, genreMap } from './templates.js';

const NAME = 'lh_home';
const TITLE = 'Главная';
// Set on every live lh_home instance; menu.js uses it to tell ours from a nocomponent stub.
const MARKER = 'lh_home_live';

// Series and anime rows always get badges; history only for TV items.
export function wantsBadge(rowKey, cardData) {
  if (rowKey === 'anime' || rowKey === 'series') return true;
  return rowKey === 'history' && !!cardData.original_name;
}

// Source card of the banner: first card of the movies row, else of the first row.
export function bannerCard(rows) {
  const row = rows.find((r) => r.params.lh_row === 'movies') || rows[0];
  return row && pickBannerCard(row.results, storageField('lh_banner_random') === true);
}

// The hero banner as a pseudo-row of Main: Main navigates its `items` by index
// (toggle / up / down), so the banner sits at items[0] with its own controller.
function createBanner(comp, card) {
  const L = lampa();
  const vars = bannerVars(card, {
    img: L.Api.img,
    genres: genreMap(L.Api.sources.tmdb.genres, L.Lang.translate),
  });
  const html = L.Template.get(BANNER, vars);
  const el = html[0];
  let last = false;

  html.find('.selector').on('hover:focus', function () {
    last = this;
    comp.scroll.update(el);
    // Same as the row cards: respects the user's background setting.
    L.Background.change(L.Utils.cardImgBackground(card));
  });
  html.find('.lh-banner__play').on('hover:enter', () => play.run(card));
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

// Our home failed to build: tell the user and put Lampa's native main page in its place.
function fallbackToNative(err) {
  const L = lampa();
  console.error('lampa-home home', err);
  L.Noty.show('Lampa Home: ошибка, открываю штатную главную');
  const active = L.Activity.active();
  if (!active || active.component !== NAME) return;
  L.Activity.replace({ component: 'main', title: L.Lang.translate('title_main') });
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
        const bcard = storageField('lh_banner') === false ? null : bannerCard(rows);
        const banner = bcard && createBanner(this, bcard);
        if (banner) {
          this.render(true).querySelector('.scroll__body').prepend(banner.render(true));
          this.items.push(banner);
        }
        this.build(rows);
      }).catch((e) => {
        if (!this.destroyed) fallbackToNative(e);
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
        onMore: () => catalog.openForRow(rowKey),
        onInstance(card, cardData) {
          card.use({
            onCreate() {
              applyPosterClass(card.render(true), cardData);
            },
            onEnter: L.Router.call.bind(L.Router, 'full', cardData),
            onVisible() {
              // Fires when the card scrolls into view; the queue in tvStatus caps requests.
              if (this.lhBadged || !wantsBadge(rowKey, cardData)) return;
              this.lhBadged = true;
              tvStatus(cardData.id, todayIso()).then((status) => {
                if (!this.destroyed) applyBadge(card.render(true), status);
              });
            },
            onDestroy() {
              this.destroyed = true;
            },
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
