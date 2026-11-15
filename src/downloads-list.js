// The downloads list: TorrServer's own list (the same on every device), the local
// copy in Lampa.Storage for when it is unreachable, and per-entry status/removal.
import { lampa, store } from './lampa.js';
import { MSG } from './downloads-messages.js';
import { parseDownloadEntries, legacyEntries, preloadState, cacheUpdate, episodeMeta } from './downloads-entries.js';
import { fail, tsTorrents, serverFields, markPreload, helperDelete, deviceName } from './downloads-api.js';

const LIST_TIMEOUT_MS = 8000;

function syncCache(entries) {
  const map = cacheUpdate(entries, store.preload.all().length);
  if (map) store.preload.replace(map);
}

// The local copy, shaped like listDownloads() entries.
export function cachedDownloads() {
  return store.preload.all()
    .filter((e) => e.card && e.hash)
    .map(({ cardId, ...e }) => ({ ...e, key: cardId }));
}

// Downloads from TorrServer's own list, the same on every device. Throws a DlError
// when TorrServer is not set up or unreachable.
export async function listDownloads() {
  const list = await tsTorrents({ action: 'list' }, LIST_TIMEOUT_MS);
  // {error: ...} or anything else that is not a list: treated as unreachable.
  if (!Array.isArray(list)) throw fail(MSG.torrserver);
  const entries = parseDownloadEntries(list);
  const legacy = legacyEntries(list, cachedDownloads());
  for (const e of legacy) {
    const { server, ...entry } = e;
    const meta = { index: entry.index, ...episodeMeta(entry), added: entry.added || Date.now(), by: deviceName() };
    markPreload(entry.hash, serverFields(server), entry.card, meta);
    entries.push({ ...entry, size: server.torrent_size });
  }
  entries.sort((a, b) => (b.added || 0) - (a.added || 0));
  syncCache(entries);
  return entries;
}

// A hung request would freeze every badge: the screen polls only when the last tick is done.
const STATUS_TIMEOUT_MS = 8000;

// -> {loaded, size, percent, done}, or {missing: true} when TorrServer no longer
// knows the hash (removed on the server: `get` answers 404).
export async function status(hash, index) {
  let json;
  try {
    json = await tsTorrents({ action: 'get', hash }, STATUS_TIMEOUT_MS);
  } catch (err) {
    if (err && err.status === 404) return { loaded: 0, size: 0, percent: 0, done: false, missing: true };
    throw err;
  }
  const stats = (json && json.file_stats) || [];
  const p = preloadState({ index, loaded_size: json && json.loaded_size, file_stats: stats });
  const file = stats.find((f) => f.id === p.id);
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
// Never rejects: a 404 or a TorrServer that is down still drops the local entry.
export async function forget(entry) {
  if (!entry) return;
  try {
    if (entry.hash) await tsTorrents({ action: 'rem', hash: entry.hash });
  } catch (e) {
    // already gone on the server, or the server is down: the local entry goes anyway
  }
  store.preload.remove(entry.key);
  lampa().Noty.show(MSG.forgotten);
}
