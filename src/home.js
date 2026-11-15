// Home screen component `lh_home`: six rows of wide cards instead of Lampa's main page.
import { lampa, storageField } from './lampa.js';
import * as play from './play.js';
import * as catalog from './catalog.js';
import { ROWS } from './config.js';
import { loadRow, todayIso, tvStatus } from './tmdb.js';
import { toWideCard, applyBadge, applyPosterClass, pickBannerCard, latestWins } from './cards.js';
import { BANNER, bannerText, bannerVars, genreMap } from './templates.js';

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

// Sticky hero banner above the rows. It lives outside Main's transform-based scroll
// (the scroll gets `minus(hero)` height), so it stays while the rows move under it,
// and it follows the focused card (debounced, latest wins).
function createBanner(comp, card) {
  const L = lampa();
  const opts = {
    img: L.Api.img,
    genres: genreMap(L.Api.sources.tmdb.genres, L.Lang.translate),
  };
  const html = L.Template.get(BANNER, bannerVars(card, opts));
  const el = html[0];
  const bgs = el.querySelectorAll('.lh-banner__bg');
  const field = (name) => el.querySelector('.lh-banner__' + name);
  let shown = card;
  let front = 0; // index of the visible backdrop layer
  let token = 0; // latest-wins guard for image loads
  let last = false;
  let destroyed = false;

  function swapBackdrop(url) {
    const my = ++token;
    const apply = () => {
      if (destroyed || my !== token) return;
      const next = 1 - front;
      bgs[next].style.backgroundImage = url ? `url('${url.replace(/'/g, '%27')}')` : 'none';
      bgs[next].classList.add('lh-banner__bg--on');
      bgs[front].classList.remove('lh-banner__bg--on');
      front = next;
    };
    if (!url) return apply();
    // Fade in only once the image is decoded, so the banner never flashes empty.
    const img = new Image();
    img.onload = apply;
    img.onerror = apply;
    img.src = url;
  }

  function show(next) {
    if (destroyed || !next || next === shown) return;
    shown = next;
    const raw = bannerText(next, opts);
    field('title').textContent = raw.title;
    field('meta').textContent = raw.meta;
    field('overview').textContent = raw.overview;
    swapBackdrop(raw.backdrop);
  }

  html.find('.selector').on('hover:focus', function () {
    last = this;
    // Same as the row cards: respects the user's background setting.
    L.Background.change(L.Utils.cardImgBackground(shown));
  });
  html.find('.lh-banner__play').on('hover:enter', () => play.run(shown));
  html.find('.lh-banner__more').on('hover:enter', () => L.Router.call('full', shown));

  return {
    follow: latestWins(show, 250),
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
        up: () => L.Controller.toggle('head'),
        down: () => comp.lhRows(),
        back: () => comp.emit('back'),
      });
      L.Controller.toggle('lh_banner');
    },
    render: (js) => (js ? el : html),
    destroy() {
      destroyed = true;
      this.follow.cancel();
      html.remove();
    },
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
      const root = this.render(true);
      root.classList.add('lh-home');
      // Hero slot outside Main's scroll; the scroll height is the screen minus the hero
      // (Layer recomputes it on every Controller.toggle). Fixed height in CSS, so the
      // rows do not jump when the banner fills in.
      let hero = null;
      const dropHero = () => {
        if (hero) hero.remove();
        hero = null;
        this.scroll.minus();
      };
      if (storageField('lh_banner') !== false) {
        hero = document.createElement('div');
        hero.className = 'lh-home__hero';
        root.prepend(hero);
        this.scroll.minus(hero);
      }
      // Down from the banner: into the first row.
      this.lhRows = () => {
        if (!this.items.length) return;
        this.lhOnBanner = false;
        this.active = 0;
        this.items[0].toggle();
      };
      const today = todayIso();
      Promise.all(ROWS.map((key) => loadRow(key, today))).then((loaded) => {
        if (this.destroyed) return;
        const rows = buildRows(loaded);
        if (!rows.length) {
          dropHero();
          return this.empty();
        }
        // Before build(): build() toggles the content controller, which starts on the banner.
        const bcard = hero && bannerCard(rows);
        if (bcard) {
          this.lhBanner = createBanner(this, bcard);
          this.lhOnBanner = true;
          hero.append(this.lhBanner.render(true));
        } else dropHero();
        this.build(rows);
      }).catch((e) => {
        if (!this.destroyed) fallbackToNative(e);
      });
    },
    // Main re-enters the activity via the content controller: resume where focus was.
    onController(controller) {
      const rowsToggle = controller.toggle;
      controller.toggle = () => {
        if (this.lhBanner && this.lhOnBanner && L.Platform.screen('tv')) this.lhBanner.toggle();
        else rowsToggle();
      };
    },
    // Replaces Main's onUp: from the first row go to the banner instead of the head.
    onlyUp() {
      if (this.active > 0) {
        this.active--;
        this.items[this.active].toggle();
      } else if (this.lhBanner) {
        this.active = 0;
        this.lhOnBanner = true;
        this.lhBanner.toggle();
      } else {
        this.active = 0;
        L.Controller.toggle('head');
      }
    },
    // Replaces Main's onDown (also the wheel): from the banner into the first row.
    onlyDown() {
      if (this.lhOnBanner) return this.lhRows();
      if (!this.items.length) return;
      this.active = Math.min(this.active + 1, this.items.length - 1);
      this.items[this.active].toggle();
    },
    onNext(resolve, reject) {
      reject.call(this);
    },
    onDestroy() {
      if (this.lhBanner) this.lhBanner.destroy();
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
              comp.lhOnBanner = false;
              if (comp.lhBanner) comp.lhBanner.follow(cardData);
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
