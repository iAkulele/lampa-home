// «Скачать заранее»: sends a release to TorrServer and asks it to preload the whole
// file into its disk cache. «Скачанное» (`lh_downloads`) lists those releases with
// their progress, plays them without a new search and deletes them through the
// helper on the PC (helper/ts-clean.js): TorrServer itself cannot delete its cache
// folder without changing its settings, which the plugin never does.
// The list itself lives on TorrServer (lh_preload in each torrent's `data`), so
// every device shows the same downloads; Lampa.Storage keeps only a local copy for
// when TorrServer is unreachable.
import { lampa, store, storageField } from './lampa.js';
import {
  resolveTarget, searchTorrents, buildSearchParams, pickFile, fileInfos, titleHasSeason, startFromHash, isBusy,
} from './play.js';
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
const HELPER_TIMEOUT_MS = 10000;
const LIST_TIMEOUT_MS = 8000;

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
  removing: 'Удаляю с диска…',
  replaced: 'Прежняя закачка удалена',
  replaceFailed: 'Помощник на ПК недоступен: прежняя закачка не удалена, новая не начата',
  confirm: 'Удалить с диска?',
  missing: 'Удалено на сервере',
  forget: 'Убрать из списка',
  forgotten: 'Убрано из списка',
  offline: 'TorrServer недоступен, показан локальный список',
};

// Card fields the «Скачанное» screen and the player need; the rest of a full card
// (overview, credits, seasons...) is not stored.
const SNAPSHOT_FIELDS = ['id', 'title', 'name', 'original_title', 'original_name', 'original_language',
  'backdrop_path', 'poster_path', 'genre_ids', 'origin_country', 'release_date', 'first_air_date', 'runtime',
  'number_of_seasons'];

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

// What to do with an earlier download of the same card when a new one is started:
// 'new' (none), 'same' (same release again) or 'replace' (delete the old one first).
export function replacePlan(existing, newHash) {
  if (!existing || !existing.hash) return 'new';
  return existing.hash === newHash ? 'same' : 'replace';
}

export function badgeLabel(progress) {
  if (!progress) return '';
  if (progress.missing) return MSG.missing;
  return progress.done ? 'Скачано' : `Качается ${progress.percent} %`;
}

// Storage key: TMDB movie and tv ids overlap, so the kind is part of it.
export const entryKey = (card) => (card.original_name || card.name ? 'tv' : 'movie') + ':' + card.id;

// The JSON string kept in TorrServer's `data` field: Lampa's own {lampa, movie} plus
// lh_preload, which marks the torrent as a download and lets every device list it.
export function preloadData(snapshot, meta) {
  return JSON.stringify({ lampa: true, movie: snapshot, lh_preload: meta });
}

const parseData = (data) => {
  if (data && typeof data === 'object') return data;
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
};

// TorrServer's `list` answer -> the downloads, newest first. Torrents without
// lh_preload (played with «Играть», added by Lampa) and broken `data` are skipped.
export function parseDownloadEntries(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const t of list) {
    if (!t || !t.hash) continue;
    const data = parseData(t.data);
    const meta = data && data.lh_preload;
    const card = data && data.movie;
    if (!meta || typeof meta !== 'object' || !card || typeof card !== 'object' || card.id == null) continue;
    out.push({
      key: entryKey(card),
      hash: t.hash,
      card,
      index: typeof meta.index === 'number' ? meta.index : undefined,
      season: meta.season,
      episode: meta.episode,
      absolute: meta.absolute,
      kind: meta.kind,
      added: Number(meta.added) || (Number(t.timestamp) || 0) * 1000,
      size: t.torrent_size,
      title: String(t.title || '').replace(/^\[LAMPA\]\s*/, ''),
    });
  }
  return out.sort((a, b) => b.added - a.added);
}

// Downloads made before the list moved to TorrServer: in the local copy, on the
// server, but without lh_preload. -> entries to mark on the server.
export function legacyEntries(list, cached) {
  if (!Array.isArray(list) || !Array.isArray(cached)) return [];
  const marked = new Set(parseDownloadEntries(list).map((e) => e.hash));
  const onServer = new Map(list.filter((t) => t && t.hash).map((t) => [t.hash, t]));
  return cached
    .filter((e) => e && e.hash && e.card && e.key && onServer.has(e.hash) && !marked.has(e.hash))
    .map((e) => ({ ...e, server: onServer.get(e.hash) }));
}

// An earlier download of the same card: the same release if there is one, else the newest.
export function findExisting(entries, key, hash) {
  const same = (entries || []).filter((e) => e && e.key === key);
  return same.find((e) => e.hash === hash) || same[0] || null;
}

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

// timeoutMs (optional): give up after it, for TorrServer on a PC that is switched off.
async function tsTorrents(body, timeoutMs) {
  const url = tsBase() + '/torrents';
  const ctrl = timeoutMs && typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl && setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(url, { method: 'POST', headers: tsHeaders(), body: JSON.stringify(body), signal: ctrl && ctrl.signal });
  } catch (e) {
    throw fail(MSG.torrserver);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const err = fail(MSG.torrserver);
    err.status = res.status;
    throw err;
  }
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

// Removes a torrent from TorrServer (rem; settings are never touched). Errors ignored.
function tsRem(hash) {
  return tsTorrents({ action: 'rem', hash }).catch(() => {});
}

// POST <helper>/delete {hash}; throws on any failure. Times out after 10 s.
async function helperDelete(hash) {
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl && setTimeout(() => ctrl.abort(), HELPER_TIMEOUT_MS);
  try {
    const res = await fetch(helperUrl() + '/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash }),
      signal: ctrl && ctrl.signal,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json || !json.ok) throw new Error((json && json.error) || String(res.status));
  } finally {
    clearTimeout(timer);
  }
}

// Who started the download (shown nowhere yet; for telling devices apart later).
// Storage.field() would answer the string "undefined" for an unknown key.
const deviceName = () => String(lampa().Storage.get('lh_device', '') || 'lampa');

export function helperUrl() {
  const v = lampa().Storage.get('lh_helper_url', HELPER_DEFAULT);
  return String(v || HELPER_DEFAULT).trim().replace(/\/+$/, '');
}

// ---------- public API ----------

let busy = false;

// The local copy of an entry (fallback when TorrServer is unreachable).
const cacheEntry = (e) => ({
  hash: e.hash, index: e.index, title: e.title, kind: e.kind, season: e.season, episode: e.episode,
  absolute: e.absolute, size: e.size, added: e.added, card: e.card,
});

// Keeps the local list equal to TorrServer's (oldest first: the newest of a card wins).
function syncCache(entries) {
  const map = {};
  for (const e of [...entries].reverse()) map[e.key] = cacheEntry(e);
  store.preload.replace(map);
}

// Downloads from TorrServer's own list, the same on every device. Throws a DlError
// when TorrServer is not set up or unreachable.
export async function listDownloads() {
  const list = await tsTorrents({ action: 'list' }, LIST_TIMEOUT_MS);
  const entries = parseDownloadEntries(list);
  const legacy = legacyEntries(list, cachedDownloads());
  for (const e of legacy) {
    const { server, ...entry } = e;
    const meta = {
      index: entry.index, kind: entry.kind, season: entry.season, episode: entry.episode, absolute: entry.absolute,
      added: entry.added || Date.now(), by: deviceName(),
    };
    const fields = { title: server.title || '', poster: server.poster || '', category: server.category || '' };
    tsTorrents({ action: 'set', hash: entry.hash, ...fields, data: preloadData(entry.card, meta) }).catch(() => {});
    entries.push({ ...entry, size: server.torrent_size });
  }
  entries.sort((a, b) => (b.added || 0) - (a.added || 0));
  syncCache(entries);
  return entries;
}

// The local copy, shaped like listDownloads() entries.
function cachedDownloads() {
  return store.preload.all()
    .filter((e) => e.card && e.hash)
    .map(({ cardId, ...e }) => ({ ...e, key: cardId }));
}

export async function preload(card) {
  const L = lampa();
  if (!card || busy || isBusy()) return;
  busy = true;
  // hash: added to TorrServer by us; kicked: the preload started (it is ours to keep).
  const job = { cancelled: false, hash: null, kicked: false };
  let before = []; // the downloads before this one was added
  // A torrent we added but never started preloading is removed again, unless it
  // is the one an existing download already uses.
  const dropAdded = () => {
    if (!job.hash || job.kicked) return;
    if (before.some((e) => e.hash === job.hash)) return;
    if (store.preload.all().some((e) => e.hash === job.hash)) return;
    tsRem(job.hash);
  };
  const finish = () => {
    busy = false;
    L.Loading.stop();
  };
  L.Loading.start(() => {
    job.cancelled = true;
    dropAdded();
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
    // Listed before `add`: afterwards the new torrent itself would be in the list.
    before = await listDownloads().catch(() => cachedDownloads());
    if (job.cancelled) return;
    const snapshot = cardSnapshot(movie);
    const title = String(chosen.Title).replace('??', '?');
    const meta = {
      kind: ctx.kind, season: ctx.season, episode: ctx.episode, absolute: ctx.absolute,
      added: Date.now(), by: deviceName(),
    };
    const fields = {
      title: '[LAMPA] ' + title,
      poster: movie.poster_path ? L.Api.img(movie.poster_path) : '',
      category: ctx.kind === 'movie' ? 'movie' : 'tv',
    };
    const added = await tsTorrents({
      action: 'add', link: chosen.MagnetUri || chosen.Link, ...fields, data: preloadData(snapshot, meta), save_to_db: true,
    });
    const hash = added && added.hash;
    if (!hash) throw fail(MSG.torrserver);
    job.hash = hash;
    if (job.cancelled) return dropAdded();

    L.Loading.setText(MSG.files);
    const files = await waitFiles(hash, job);
    if (job.cancelled || !files) return;
    const file = pickFile(files, { ...ctx, titleHasSeason: titleHasSeason(chosen.Title) }, fileInfos(files, movie));
    if (!file) throw fail(MSG.noFile);

    const key = entryKey(movie);
    const existing = findExisting(before, key, hash);
    let replaced = false;
    if (replacePlan(existing, hash) === 'replace') {
      L.Loading.setText(MSG.removing);
      try {
        await helperDelete(existing.hash);
      } catch (e) {
        throw fail(MSG.replaceFailed);
      }
      store.preload.remove(key);
      replaced = true;
    }
    if (job.cancelled) return;

    job.kicked = true;
    firePreload(hash, file.id);
    // `add` never changes the data of a torrent TorrServer already has (a release
    // played before, or the same one again), `set` does; without it the file is
    // picked again at play time.
    meta.index = file.id;
    tsTorrents({ action: 'set', hash, ...fields, data: preloadData(snapshot, meta) }).catch(() => {});
    store.preload.set(key, cacheEntry({ ...meta, hash, title: chosen.Title, size: file.length, card: snapshot }));
    finish();
    L.Noty.show(replaced ? `${MSG.replaced}. ${MSG.started}` : MSG.started);
  } catch (err) {
    if (job.cancelled) return;
    dropAdded();
    finish();
    if (!(err instanceof DlError)) console.error('lampa-home preload', err);
    L.Noty.show(err instanceof DlError ? err.message : MSG.torrserver);
  }
}

// -> {loaded, size, percent, done}, or {missing: true} when TorrServer no longer
// knows the hash (removed on the server: `get` answers 404).
export async function status(hash, index) {
  let json;
  try {
    json = await tsTorrents({ action: 'get', hash });
  } catch (err) {
    if (err && err.status === 404) return { loaded: 0, size: 0, percent: 0, done: false, missing: true };
    throw err;
  }
  const stats = (json && json.file_stats) || [];
  // No saved file index: the largest file stands for the release.
  const id = index != null ? index : (stats.reduce((b, f) => ((f.length || 0) > ((b && b.length) || 0) ? f : b), null) || {}).id;
  const p = preloadProgress({ loaded_size: json && json.loaded_size, file_stats: stats, index: id });
  const file = stats.find((f) => f.id === id);
  return { loaded: (json && json.loaded_size) || 0, size: (file && file.length) || 0, ...p };
}

// Deletes the release and its cache folder through the PC helper; true on success.
// entry: {key, hash} from listDownloads().
export async function remove(entry) {
  const L = lampa();
  if (!entry || !entry.hash) return true;
  // The helper waits ~2 s for TorrServer; Back only hides the loader, the request
  // itself still ends within 10 s.
  L.Loading.start(() => L.Loading.stop(), MSG.removing);
  try {
    await helperDelete(entry.hash);
  } catch (e) {
    L.Loading.stop();
    L.Noty.show(MSG.helper);
    return false;
  }
  L.Loading.stop();
  store.preload.remove(entry.key);
  L.Noty.show(MSG.removed);
  return true;
}

// Takes the entry off the list on every device: the torrent leaves TorrServer
// (rem), its files stay on the PC.
export async function forget(entry) {
  if (!entry) return;
  if (entry.hash) await tsRem(entry.hash);
  store.preload.remove(entry.key);
  lampa().Noty.show(MSG.forgotten);
}

// ---------- «Скачанное» screen ----------

const pollQueue = createQueue(2);

function component(object) {
  const L = lampa();
  object.params = { ...(object.params || {}), items: { mapping: 'grid', cols: COLS } };
  const comp = L.Maker.make('Category', object, (m) => m.MASK.base);
  const badges = new Map(); // hash -> {el, entry, missing}
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
          if (state) state.missing = !!p.missing;
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

  // The helper failed: the entry can still leave the list, files stay on the PC.
  function offerForget(entry) {
    ask(MSG.helper, [{ title: MSG.forget, forget: true }], (a) => {
      if (a.forget) forget(entry).then(reload);
    });
  }

  function confirmRemove(entry) {
    const state = badges.get(entry.hash);
    if (state && state.missing) {
      ask(MSG.missing, [{ title: MSG.forget, forget: true }, { title: 'Удалить с диска', remove: true }], (a) => {
        if (a.forget) {
          forget(entry).then(reload);
        } else if (a.remove) {
          remove(entry).then((ok) => (ok ? reload() : offerForget(entry)));
        }
      });
      return;
    }
    ask(MSG.confirm, [{ title: 'Удалить', remove: true }], (a) => {
      if (!a.remove) return;
      remove(entry).then((ok) => (ok ? reload() : offerForget(entry)));
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
          const { card, hash, index, kind, season, episode, absolute, title } = entry;
          startFromHash(hash, card, { kind, season, episode, absolute, index }, title);
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
