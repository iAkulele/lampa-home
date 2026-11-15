// «Скачанное» (`lh_downloads`): a grid of the downloads with a live progress
// badge; Enter plays without a new search, long press deletes.
import { lampa } from './lampa.js';
import { toWideCard, applyPosterClass } from './cards.js';
import { createQueue } from './queue.js';
import { guarded } from './catalog.js';
import { startFromHash } from './play-run.js';
import { MSG } from './downloads-messages.js';
import { badgeLabel, episodeMeta } from './downloads-entries.js';
import { DlError } from './downloads-api.js';
import { listDownloads, cachedDownloads, status, remove, forget } from './downloads-list.js';
import { startPreload } from './downloads-preload.js';

const NAME = 'lh_downloads';
export const TITLE = 'Скачанное';
const COLS = 4;
const POLL_MS = 5000;

const pollQueue = createQueue(2);

function component(object) {
  const L = lampa();
  object.params = { ...(object.params || {}), items: { mapping: 'grid', cols: COLS } };
  const comp = L.Maker.make('Category', object, (m) => m.MASK.base);
  const badges = new Map(); // hash -> {el, entry, missing, notStarted}
  let timer = null;
  let pending = 0; // status requests of the previous tick still in flight

  const isActive = () => {
    const a = L.Activity.active();
    return !!a && a.component === NAME && !comp.destroyed;
  };

  // The first call (from onCreate) runs before the activity becomes active.
  function refresh(first) {
    if ((!first && !isActive()) || pending) return;
    badges.forEach(({ el, entry }) => {
      pending++;
      pollQueue(() => status(entry.hash, entry.index))
        .then((p) => {
          const state = badges.get(entry.hash);
          if (state) {
            state.missing = !!p.missing;
            state.notStarted = !!p.notStarted;
          }
          el.textContent = badgeLabel(p);
          el.classList.toggle('lh-dl-badge--done', p.done);
        })
        .catch(() => {
          el.textContent = 'Нет связи';
        })
        .finally(() => {
          pending--;
        });
    });
  }

  const reload = () => {
    if (isActive()) L.Activity.replace();
  };

  function ask(title, items, onPick) {
    const enabled = L.Controller.enabled().name;
    L.Select.show({
      title,
      items: [...items, { title: 'Отмена' }],
      onSelect: (a) => {
        L.Controller.toggle(enabled);
        onPick(a);
      },
      onBack: () => L.Controller.toggle(enabled),
    });
  }

  const forgetAndReload = (entry) => forget(entry).then(reload);
  const removeAndReload = (entry) => remove(entry).then((ok) => (ok ? reload() : offerForget(entry)));

  // The helper failed: the entry can still leave the list, files stay on the PC.
  function offerForget(entry) {
    ask(MSG.helper, [{ title: MSG.forget, forget: true }], (a) => {
      if (a.forget) forgetAndReload(entry);
    });
  }

  function offerStart(entry) {
    ask(MSG.notStarted, [{ title: MSG.start, start: true }, { title: MSG.forget, forget: true }], (a) => {
      if (a.start) startPreload(entry).then((ok) => ok && reload());
      else if (a.forget) forgetAndReload(entry);
    });
  }

  function confirmRemove(entry) {
    const state = badges.get(entry.hash);
    if (state && state.missing) {
      ask(MSG.missing, [{ title: MSG.forget, forget: true }, { title: 'Удалить с диска', remove: true }], (a) => {
        if (a.forget) forgetAndReload(entry);
        else if (a.remove) removeAndReload(entry);
      });
      return;
    }
    ask(MSG.confirm, [{ title: 'Удалить', remove: true }], (a) => {
      if (a.remove) removeAndReload(entry);
    });
  }

  comp.use({
    onCreate() {
      this.render(true).classList.add('lh-catalog', 'lh-downloads');
      const show = guarded(this, (entries) => {
        const results = entries.map((e) => {
          const card = toWideCard(e.card);
          card.lh_entry = e;
          return card;
        });
        if (!results.length) return this.empty();
        this.build({ results, total_pages: 1 });
        refresh(true);
        timer = setInterval(refresh, POLL_MS);
      });
      // TorrServer's list is the same on every device; the local copy only when it is unreachable.
      listDownloads()
        .catch((err) => {
          if (!(err instanceof DlError)) console.error('lampa-home downloads', err);
          L.Noty.show(MSG.offline);
          return cachedDownloads();
        })
        .then(show);
    },
    onInstance(item, data) {
      const entry = data.lh_entry;
      item.use({
        onCreate() {
          const el = item.render(true);
          applyPosterClass(el, data);
          // Runs after the card's own modules: an empty list makes Lampa's long-press
          // menu (bookmarks, marks) bow out, so long-press shows only our «Удалить».
          item.menu_list = [];
          const view = el.querySelector('.card__view');
          if (view) {
            const badge = document.createElement('div');
            badge.className = 'lh-dl-badge';
            badge.textContent = '…';
            view.appendChild(badge);
            badges.set(entry.hash, { el: badge, entry });
          }
          el.addEventListener('hover:long', guarded(comp, () => confirmRemove(entry)));
        },
        onEnter: guarded(comp, () => {
          const state = badges.get(entry.hash);
          if (state && state.missing) return confirmRemove(entry);
          if (state && state.notStarted) return offerStart(entry);
          startFromHash(entry.hash, entry.card, { ...episodeMeta(entry), index: entry.index }, entry.title);
        }),
        onFocus() {
          L.Background.change(L.Utils.cardImgBackground(data));
        },
      });
    },
    onDestroy() {
      this.destroyed = true;
      clearInterval(timer);
      badges.clear();
    },
  });

  return comp;
}

export function register() {
  lampa().Component.add(NAME, component);
}

export function open() {
  lampa().Activity.push({ url: '', component: NAME, title: TITLE, page: 1 });
}
