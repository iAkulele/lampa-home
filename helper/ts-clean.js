// ts-clean: tiny helper next to TorrServer on the PC. It deletes the disk cache of
// one torrent on request from Lampa (TorrServer cannot do that without changing its
// settings, which closes every active torrent). Node 24, no dependencies.
//
//   node ts-clean.js            listens on 0.0.0.0:8091, TorrServer at 127.0.0.1:8090
//   PORT=8091 TS_URL=http://127.0.0.1:8090 node ts-clean.js
//
// GET  /status  -> {save_path, free_bytes, folders:[{hash, bytes}]}
// POST /delete  {hash} -> removes the torrent from TorrServer, then <TorrentsSavePath>\<hash>
// Only directories named by a 40-hex hash directly inside TorrentsSavePath are ever deleted.
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const PORT = Number(process.env.PORT) || 8091;
const HOST = process.env.HOST || '0.0.0.0';
const TS_URL = (process.env.TS_URL || 'http://127.0.0.1:8090').replace(/\/+$/, '');
const HASH_RE = /^[0-9a-f]{40}$/;
const REM_WAIT_MS = 2000;
const MAX_BODY = 4096;

const log = (...a) => console.log(new Date().toISOString(), ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ts(pathname, body) {
  const res = await fetch(TS_URL + pathname, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`TorrServer ${pathname} answered ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Read on every request: the user may change the path in TorrServer meanwhile.
async function savePath() {
  const s = await ts('/settings', { action: 'get' });
  const p = s && s.TorrentsSavePath;
  if (!p || !s.UseDisk) throw new Error('TorrServer does not keep its cache on disk (UseDisk/TorrentsSavePath)');
  return path.resolve(p);
}

// <root>/<hash>, or null when the result would leave root (it cannot for a 40-hex name).
function cacheDir(root, hash) {
  if (!HASH_RE.test(hash)) return null;
  const dir = path.resolve(root, hash);
  if (path.dirname(dir) !== root || path.basename(dir) !== hash) return null;
  return dir;
}

async function dirBytes(dir) {
  let total = 0;
  const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) total += await dirBytes(p);
    else if (e.isFile()) total += (await fsp.stat(p).catch(() => ({ size: 0 }))).size;
  }
  return total;
}

async function status() {
  const root = await savePath();
  const entries = await fsp.readdir(root, { withFileTypes: true });
  const folders = [];
  for (const e of entries) {
    if (e.isDirectory() && HASH_RE.test(e.name)) folders.push({ hash: e.name, bytes: await dirBytes(path.join(root, e.name)) });
  }
  const st = await fsp.statfs(root);
  return { save_path: root, free_bytes: st.bavail * st.bsize, folders };
}

async function remove(hash) {
  const root = await savePath();
  const dir = cacheDir(root, hash);
  if (!dir) throw Object.assign(new Error('bad hash'), { code: 400 });
  await ts('/torrents', { action: 'rem', hash });
  // TorrServer closes the cache files asynchronously; give it a moment.
  await sleep(REM_WAIT_MS);
  const existed = fs.existsSync(dir);
  if (existed) await fsp.rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  log('deleted', hash, existed ? dir : '(no cache folder)');
  return { ok: true, deleted: existed };
}

function send(res, code, obj) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  });
  res.end(obj === undefined ? '' : JSON.stringify(obj));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > MAX_BODY) {
        reject(Object.assign(new Error('body too large'), { code: 413 }));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(Object.assign(new Error('bad json'), { code: 400 }));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'OPTIONS') return send(res, 204);
    if (req.method === 'GET' && url.pathname === '/status') return send(res, 200, await status());
    if (req.method === 'POST' && url.pathname === '/delete') {
      const body = await readJson(req);
      const hash = String((body && body.hash) || '').toLowerCase();
      if (!HASH_RE.test(hash)) return send(res, 400, { ok: false, error: 'bad hash' });
      return send(res, 200, await remove(hash));
    }
    return send(res, 404, { ok: false, error: 'not found' });
  } catch (e) {
    log('error', req.method, url.pathname, e.message);
    return send(res, e.code >= 400 && e.code < 600 ? e.code : 500, { ok: false, error: e.message });
  }
});

server.listen(PORT, HOST, () => {
  log(`ts-clean listening on http://${HOST}:${PORT}, TorrServer ${TS_URL}`);
  savePath().then((p) => log('TorrentsSavePath', p), (e) => log('warning:', e.message));
});
