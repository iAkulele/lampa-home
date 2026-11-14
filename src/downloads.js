// «Скачать заранее»: sends a release to TorrServer and asks it to preload the whole
// file into its disk cache. «Скачанное» (`lh_downloads`) lists those releases with
// their progress, plays them without a new search and deletes them through the
// helper on the PC (helper/ts-clean.js): TorrServer itself cannot delete its cache
// folder without changing its settings, which the plugin never does.
import { lampa, store, storageField } from './lampa.js';
import { resolveTarget, searchTorrents, buildSearchParams, pickFile, startFromHash } from './play.js';
import { selectTorrent } from './torrent-select.js';
import { toWideCard, applyPosterClass } from './cards.js';
import { createQueue } from './queue.js';
import { guarded } from './catalog.js';

const NAME = 'lh_downloads';
export const TITLE = 'Скачанное';
export const HELPER_DEFAULT = 'http://192.168.31.7:8091';
const COLS = 4;
const POLL_MS = 5000;
const FILES_EVERY_MS = 2000;
const FILES_TRIES = 30;
const PRELOAD_ABORT_MS = 3000;

const MSG = {
  search: 'Ищу раздачу…',
  server: 'Отправляю в TorrServer…',
  files: 'Жду список файлов…',
  started: 'Закачка начата',
  none: 'Подходящей раздачи не нашёл',
  noFile: 'Нужного файла в раздаче не нашёл',
  parser: 'Парсер не ответил',
  noServer: 'TorrServer не настроен',
  torrserver: 'TorrServer недоступен',
  noFiles: 'TorrServer не получил список файлов',
  helper: 'Помощник на ПК недоступен',
  removed: 'Удалено с диска',
  confirm: 'Удалить с диска?',
};

// Card fields the «Скачанное» screen and the player need; the rest of a full card
// (overview, credits, seasons...) is not stored.
const SNAPSHOT_FIELDS = ['id', 'title', 'name', 'original_title', 'original_name', 'original_language',
  'backdrop_path', 'poster_path', 'genre_ids', 'origin_country', 'release_date', 'first_air_date', 'runtime'];

// ---------- pure helpers ----------

// TorrServer's `get` answer -> progress of one file. loaded_size counts the whole
// torrent's cache, so neighbouring pieces may push it a bit past the file length.
export function preloadProgress({ loaded_size, file_stats, index }) {
  const file = (file_stats || []).find((f) => f.id === index);
  const size = (file && file.length) || 0;
  const loaded = loaded_size || 0;
  if (!size) return { percent: 0, done: false };
  const done = loaded >= size;
  return { percent: done ? 100 : Math.min(99, Math.floor((loaded / size) * 100)), done };
}

export function cardSnapshot(card) {
  const out = {};
  for (const key of SNAPSHOT_FIELDS) {
    if (card[key] !== undefined && card[key] !== null) out[key] = card[key];
  }
  if (!out.genre_ids && Array.isArray(card.genres)) out.genre_ids = card.genres.map((g) => g && g.id).filter((id) => id != null);
  return out;
}

export function badgeLabel(progress) {
  if (!progress) return '';
  return progress.done ? 'Скачано' : `Качается ${progress.percent} %`;
}

// Storage key: TMDB movie and tv ids overlap, so the kind is part of it.
export const entryKey = (card) => (card.original_name || card.name ? 'tv' : 'movie') + ':' + card.id;

// ---------- TorrServer / helper ----------

class DlError extends Error {}
const fail = (msg) => new DlError(msg);

function tsBase() {
  const L = lampa();
  const url = L.Torserver.url();
  if (!url) throw fail(MSG.noServer);
  return url.replace(/\/+$/, '');
}

// Same Basic auth Lampa adds for TorrServer requests (utils/reguest.js).
function tsHeaders() {
  const L = lampa();
  const headers = { 'Content-Type': 'application/json' };
  if (storageField('torrserver_auth')) {
    headers.Authorization = 'Basic ' + btoa(unescape(encodeURIComponent(
      L.Storage.get('torrserver_login', '') + ':' + L.Storage.get('torrserver_password', ''))));
  }
  return headers;
}

async function tsTorrents(body) {
  let res;
  try {
    res = await fetch(tsBase() + '/torrents', { method: 'POST', headers: tsHeaders(), body: JSON.stringify(body) });
  } catch (e) {
    throw fail(MSG.torrserver);
  }
  if (!res.ok) throw fail(MSG.torrserver);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Starts the full preload. The request lasts as long as the download, so it is cut
// after 3 s: TorrServer keeps preloading on its own.
function firePreload(hash, index) {
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl && setTimeout(() => ctrl.abort(), PRELOAD_ABORT_MS);
  fetch(`${tsBase()}/stream?link=${hash}&index=${index}&preload`, { headers: tsHeaders(), signal: ctrl && ctrl.signal })
    .then((res) => res.body && res.body.cancel && res.body.cancel())
    .catch(() => {})
    .finally(() => clearTimeout(timer));
}

async function waitFiles(hash, job) {
  for (let i = 0; i < FILES_TRIES && !job.cancelled; i++) {
    const json = await tsTorrents({ action: 'get', hash }).catch(() => null);
    if (json && json.file_stats && json.file_stats.length) return json.file_stats;
    await new Promise((r) => setTimeout(r, FILES_EVERY_MS));
  }
  if (job.cancelled) return null;
  throw fail(MSG.noFiles);
}

export function helperUrl() {
  const v = lampa().Storage.get('lh_helper_url', HELPER_DEFAULT);
  return String(v || HELPER_DEFAULT).trim().replace(/\/+$/, '');
}

// ---------- public API ----------

let busy = false;

export async function preload(card) {
  const L = lampa();
  if (!card || busy) return;
  busy = true;
  const job = { cancelled: false };
  const finish = () => {
    busy = false;
    L.Loading.stop();
  };
  L.Loading.start(() => {
    job.cancelled = true;
    finish();
  }, MSG.search);
  try {
    tsBase();
    const { movie, ctx } = await resolveTarget(card);
    if (job.cancelled) return;
    const results = await searchTorrents(buildSearchParams(movie, ctx, storageField('parse_lang')));
    if (job.cancelled) return;
    const { chosen } = selectTorrent(results, ctx);
    if (!chosen) throw fail(MSG.none);

    L.Loading.setText(MSG.server);
    const snapshot = cardSnapshot(movie);
    const added = await tsTorrents({
      action: 'add',
      link: chosen.MagnetUri || chosen.Link,
      title: '[LAMPA] ' + String(chosen.Title).replace('??', '?'),
      poster: movie.poster_path ? L.Api.img(movie.poster_path) : '',
      data: JSON.stringify({ lampa: true, movie: snapshot }),
      save_to_db: true,
      category: ctx.kind === 'movie' ? 'movie' : 'tv',
    });
    const hash = added && added.hash;
    if (!hash) throw fail(MSG.torrserver);
    if (job.cancelled) return;

    L.Loading.setText(MSG.files);
    const files = await waitFiles(hash, job);
    if (job.cancelled || !files) return;
    const file = pickFile(files, ctx);
    if (!file) throw fail(MSG.noFile);

    firePreload(hash, file.id);
    store.preload.set(entryKey(movie), {
      hash,
      index: file.id,
      title: chosen.Title,
      kind: ctx.kind,
      season: ctx.season,
      episode: ctx.episode,
      absolute: ctx.absolute,
      size: file.length,
      added: Date.now(),
      card: snapshot,
    });
    console.log('lampa-home', 'preload', ctx, chosen.Title, hash, file.id);
    finish();
    L.Noty.show(MSG.started);
  } catch (err) {
    if (job.cancelled) return;
    finish();
    if (!(err instanceof DlError)) console.error('lampa-home preload', err);
    L.Noty.show(err instanceof DlError ? err.message : MSG.torrserver);
  }
}

// -> {loaded, size, percent, done}
export async function status(hash, index) {
  const json = await tsTorrents({ action: 'get', hash });
  const p = preloadProgress({ loaded_size: json && json.loaded_size, file_stats: json && json.file_stats, index });
  const file = ((json && json.file_stats) || []).find((f) => f.id === index);
  return { loaded: (json && json.loaded_size) || 0, size: (file && file.length) || 0, ...p };
}

// Deletes the release and its cache folder through the PC helper; true on success.
export async function remove(cardId) {
  const L = lampa();
  const entry = store.preload.get(cardId);
  if (!entry) return true;
  try {
    const res = await fetch(helperUrl() + '/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash: entry.hash }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json || !json.ok) throw new Error((json && json.error) || String(res.status));
  } catch (e) {
    console.log('lampa-home', 'helper delete failed', e && e.message);
    L.Noty.show(MSG.helper);
    return false;
  }
  store.preload.remove(cardId);
  L.Noty.show(MSG.removed);
  return true;
}

// ---------- «Скачанное» screen ----------

const pollQueue = createQueue(2);

function component(object) {
  const L = lampa();
  object.params = { ...(object.params || {}), items: { mapping: 'grid', cols: COLS } };
  const comp = L.Maker.make('Category', object, (m) => m.MASK.base);
  const badges = new Map(); // cardId -> {el, entry}
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

  function confirmRemove(cardId) {
    const enabled = L.Controller.enabled().name;
    L.Select.show({
      title: MSG.confirm,
      items: [{ title: 'Удалить', remove: true }, { title: 'Отмена' }],
      onSelect: (a) => {
        L.Controller.toggle(enabled);
        if (!a.remove) return;
        remove(cardId).then((ok) => {
          if (ok && isActive()) L.Activity.replace();
        });
      },
      onBack: () => L.Controller.toggle(enabled),
    });
  }

  comp.use({
    onCreate() {
      this.render(true).classList.add('lh-catalog', 'lh-downloads');
      const entries = store.preload.all().filter((e) => e.card && e.hash);
      const results = entries.map((e) => {
        const card = toWideCard(e.card);
        card.lh_entry = e;
        return card;
      });
      if (!results.length) return this.empty();
      this.build({ results, total_pages: 1 });
      refresh(true);
      timer = setInterval(refresh, POLL_MS);
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
            badges.set(entry.cardId, { el: badge, entry });
          }
          el.addEventListener('hover:long', guarded(comp, () => confirmRemove(entry.cardId)));
        },
        onEnter: guarded(comp, () => {
          const { card, hash, index, kind, season, episode, absolute } = entry;
          startFromHash(hash, card, { kind, season, episode, absolute, index });
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

// «Скачать заранее» in the card's «...» options.
export function init() {
  const L = lampa();
  L.Listener.follow('full', (e) => {
    if (e.type !== 'options' || !Array.isArray(e.options)) return;
    const card = (e.link && e.link.card) || (e.data && e.data.movie);
    if (!card || !card.id) return;
    e.options.push({ title: 'Скачать заранее', onSelect: () => preload(card) });
  });
}

export const COMPONENT = NAME;
