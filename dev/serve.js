// Dev stand server: plugin bundle + Lampa core served from the local desktop install.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const CORE = process.env.LAMPA_CORE || 'C:/Users/Akulele/AppData/Roaming/Lampa/lampa-core/3.4.7';
// Static assets (jquery, navigator, fonts...) that the desktop core does not ship.
// Repo-local checkout made by `npm run dev:fetch` (fails if .lampa-source already exists).
const PUBLIC = process.env.LAMPA_PUBLIC || path.join(ROOT, '.lampa-source', 'public');
const PORT = 8099;

const TYPES = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };

function within(base, rel) {
  const root = path.resolve(base);
  const full = path.join(root, rel);
  return full.startsWith(root) ? full : null;
}

function resolve(url) {
  const p = decodeURIComponent(url.split('?')[0]);
  if (p === '/') return path.join(__dirname, 'index.html');
  if (p === '/lampa-home.js') return path.join(ROOT, 'lampa-home.js');
  if (p === '/core/app.js') return path.join(CORE, 'app.js');
  if (p === '/core/app.css') return path.join(CORE, 'app.css');
  if (/^\/(vender|img|fonts|sound|lang|css)\//.test(p)) return within(PUBLIC, p);
  return null;
}

http.createServer((req, res) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };
  const file = resolve(req.url);
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, headers);
    return res.end('not found');
  }
  res.writeHead(200, { ...headers, 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log(`lampa-home dev stand: http://127.0.0.1:${PORT}/`));
