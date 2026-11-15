// Home screen component `lh_home`: six rows of wide cards instead of Lampa's main page.
import { lampa, storageField, store } from './lampa.js';
import * as play from './play.js';
import * as catalog from './catalog.js';
import { loadRow, loadCustomRow, todayIso, tvStatus } from './tmdb.js';
import { homeRows, customPreset } from './rows.js';
import { toWideCard, attachEpisodeBadge, applyPosterClass, pickBannerCard, latestWins } from './cards.js';
import { BANNER, bannerText, bannerVars, genreMap } from './templates.js';

const NAME = 'lh_home';
const TITLE = 'Главная';
// Set on every live lh_home instance; menu.js uses it to tell ours from a nocomponent stub.
const MARKER = 'lh_home_live';

// Series and anime rows always get badges; history only for TV items; a custom row
// (custom: {kind}) like its catalog: TV and anime items.
export function wantsBadge(rowKey, cardData, custom) {
  if (rowKey === 'anime' || rowKey === 'series') return true;
  if (custom) return (custom.kind === 'tv' || custom.kind === 'anime') && !!cardData.original_name;
  return rowKey === 'history' && !!cardData.original_name;
}

// The rows of the lh_rows config (rows.js), loaded in screen order.
const LOADERS = { row: loadRow, custom: loadCustomRow };
export function loadHomeRows(cfg, today, loaders = LOADERS) {
  return Promise.all(homeRows(cfg).map((r) => (r.custom ? loaders.custom(r.custom, today) : loaders.row(r.key, today))));
}

// Source card of the banner: first card of the movies row, else of the first row.
export function bannerCard(rows) {
  const row = rows.find((r) => r.params.lh_row === 'movies') || rows[0];
  return row && pickBannerCard(row.results, storageField('lh_banner_random') === true);
}

// Sticky hero banner above the rows. It lives outside Main's transform-based scroll
// (the scroll gets `minus(hero)` height), so it stays while the rows move under it,
// and it follows the focused card (debounced, latest wins).
// Matches the .lh-banner__bg opacity transition in styles.css.
const FADE_MS = 400;

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
      const old = bgs[front];
      old.classList.remove('lh-banner__bg--on');
      front = next;
      // After the 0.4s fade drop the hidden image, so weak TVs do not keep two 1280px
      // backdrops decoded. Skipped if that layer was reused by a newer swap meanwhile.
      setTimeout(() => {
        if (!destroyed && !old.classList.contains('lh-banner__bg--on')) old.style.backgroundImage = 'none';
      }, FADE_MS + 100);
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
    // However the banner got focus (keys, mouse, re-entry), resume on it after Back.
    comp.lhOnBanner = true;
    // Same as the row cards: respects the user's background setting.
    L.Background.change(L.Utils.cardImgBackground(shown));
  });
  // A mouse click fires hover:enter without hover:focus, so mark the banner here too.
  html.find('.selector').on('hover:enter', () => {
    comp.lhOnBanner = true;
  });
  html.find('.lh-banner__play').on('hover:enter', () => play.run(shown));
  html.find('.lh-banner__more').on('hover:enter', () => L.Router.call('full', shown));

  return {
    follow: latestWins(show, 250),
    toggle() {
      L.Controller.add('lh_banner', {
        link: this,
        toggle: () => {
          comp.lhOnBanner = true;
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

// Lampa shows «Ещё» only when total_pages > 1 (line/module/more.js). A row's own TMDB
// query is narrower than its catalog (e.g. «Русское»: last 365 days, often one page),
// so every row with a catalog reports at least 2. History shows the last 20 and
// its «Ещё» opens Lampa's full history screen, so it always reports 2 as well.
export function rowPages(total) {
  return Math.max(2, total || 1);
}

export function buildRows(loaded) {
  return loaded
    .filter((row) => row.results.length)
    .map((row) => ({
      title: row.title,
      results: row.results.map(toWideCard),
      total_pages: rowPages(row.total_pages),
      params: { items: { view: 6 }, lh_row: row.rowKey, lh_custom: row.custom || null },
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
      loadHomeRows(store.rows.get(), today).then((loaded) => {
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
      const custom = (data.params && data.params.lh_custom) || null;
      item.use({
        onMore: () => (custom ? catalog.open(custom.kind, customPreset(custom)) : catalog.openForRow(rowKey)),
        onInstance(card, cardData) {
          if (wantsBadge(rowKey, cardData, custom)) attachEpisodeBadge(card, cardData, tvStatus, todayIso);
          card.use({
            onCreate() {
              applyPosterClass(card.render(true), cardData);
            },
            onEnter: L.Router.call.bind(L.Router, 'full', cardData),
            onFocus() {
              comp.lhOnBanner = false;
              if (comp.lhBanner) comp.lhBanner.follow(cardData);
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
