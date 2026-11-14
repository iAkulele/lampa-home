// Home screen component `lh_home`: six rows of wide cards instead of Lampa's main page.
import { lampa, noty } from './lampa.js';
import { ROWS } from './config.js';
import { loadRow, todayIso } from './tmdb.js';
import { toWideCard } from './cards.js';

const NAME = 'lh_home';
const TITLE = 'Главная';
// Set on every live lh_home instance; menu.js uses it to tell ours from a nocomponent stub.
const MARKER = 'lh_home_live';

// Until the catalog (Task 9) exists, "more" only announces it.
function openCatalog(rowKey) {
  noty('Каталог: скоро');
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
        if (rows.length) this.build(rows);
        else this.empty();
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
