// HTTP to TorrServer's own API (/torrents, /stream) and to the delete helper on
// the PC (helper/ts-clean.js). Errors meant for the user are DlError.
import { lampa, storageField } from './lampa.js';
import { MSG } from './downloads-messages.js';
import { preloadData } from './downloads-entries.js';

export const HELPER_DEFAULT = 'http://192.168.31.7:8091';
const FILES_EVERY_MS = 2000;
const FILES_TRIES = 30;
const PRELOAD_ABORT_MS = 3000;
const HELPER_TIMEOUT_MS = 10000;

export class DlError extends Error {}
export const fail = (msg) => new DlError(msg);

// An abort signal that fires after ms (none without ms or AbortController).
function abortAfter(ms) {
  const ctrl = ms && typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl && setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl && ctrl.signal, clear: () => clearTimeout(timer) };
}

// TorrServer's address; throws a DlError when it is not set up.
export function tsBase() {
  const url = lampa().Torserver.url();
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
// A non-OK answer throws a DlError carrying its HTTP status.
export async function tsTorrents(body, timeoutMs) {
  const url = tsBase() + '/torrents';
  const abort = abortAfter(timeoutMs);
  let res;
  try {
    res = await fetch(url, { method: 'POST', headers: tsHeaders(), body: JSON.stringify(body), signal: abort.signal });
  } catch (e) {
    throw fail(MSG.torrserver);
  } finally {
    abort.clear();
  }
  if (!res.ok) {
    const err = fail(MSG.torrserver);
    err.status = res.status;
    throw err;
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// The title/poster/category a `set` must repeat (TorrServer overwrites them all).
export const serverFields = (t) => ({ title: t.title || '', poster: t.poster || '', category: t.category || '' });

// Marks the torrent as a download (lh_preload in its data). Errors ignored: an
// unmarked entry of the local copy is marked by the next list.
export function markPreload(hash, fields, snapshot, meta) {
  return tsTorrents({ action: 'set', hash, ...fields, data: preloadData(snapshot, meta) }).catch(() => {});
}

// Starts the full preload. The request lasts as long as the download, so it is cut
// after 3 s: TorrServer keeps preloading on its own.
export function firePreload(hash, index) {
  const abort = abortAfter(PRELOAD_ABORT_MS);
  fetch(`${tsBase()}/stream?link=${hash}&index=${index}&preload`, { headers: tsHeaders(), signal: abort.signal })
    .then((res) => res.body && res.body.cancel && res.body.cancel())
    .catch(() => {})
    .finally(abort.clear);
}

// The torrent's file list once TorrServer has it; null when the job is cancelled.
export async function waitFiles(hash, job) {
  for (let i = 0; i < FILES_TRIES && !job.cancelled; i++) {
    const json = await tsTorrents({ action: 'get', hash }).catch(() => null);
    if (json && json.file_stats && json.file_stats.length) return json.file_stats;
    await new Promise((r) => setTimeout(r, FILES_EVERY_MS));
  }
  if (job.cancelled) return null;
  throw fail(MSG.noFiles);
}

// Removes a torrent from TorrServer (rem; settings are never touched). Errors ignored.
export function tsRem(hash) {
  return tsTorrents({ action: 'rem', hash }).catch(() => {});
}

export function helperUrl() {
  const v = lampa().Storage.get('lh_helper_url', HELPER_DEFAULT);
  return String(v || HELPER_DEFAULT).trim().replace(/\/+$/, '');
}

// POST <helper>/delete {hash}; throws on any failure. Times out after 10 s.
export async function helperDelete(hash) {
  const abort = abortAfter(HELPER_TIMEOUT_MS);
  try {
    const res = await fetch(helperUrl() + '/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash }),
      signal: abort.signal,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json || !json.ok) throw new Error((json && json.error) || String(res.status));
  } finally {
    abort.clear();
  }
}

// Who started the download (shown nowhere yet; for telling devices apart later).
// Storage.field() would answer the string "undefined" for an unknown key.
export const deviceName = () => String(lampa().Storage.get('lh_device', '') || 'lampa');
