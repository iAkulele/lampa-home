// Which rows the home screen shows: built-in rows the user switched off and the
// user's own genre rows. Pure: no window, no Lampa. Stored as lh_rows:
// { disabled: [rowKey...], custom: [{id, kind, genre}] }; configs are never mutated.
import { ROWS } from './config.js';
import { catalogQuery, genresFor } from './tmdb-queries.js';
import { hasRussianTitle, isAnimeCard, kindHidesAnime, rowTitle } from './cards.js';

export const CUSTOM_PREFIX = 'custom:';

// Catalog kinds, in the order offered when adding a row; plural lower-case for titles.
export const CUSTOM_KINDS = ['movie', 'tv', 'cartoon', 'anime'];
const KIND_WORDS = { movie: 'фильмы', tv: 'сериалы', cartoon: 'мультфильмы', anime: 'аниме' };

const findGenre = (kind, genre) => genresFor(kind).find((g) => g.id === genre);

export function normalizeRowsConfig(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const disabled = (Array.isArray(src.disabled) ? src.disabled : [])
    .filter((key, i, all) => ROWS.includes(key) && all.indexOf(key) === i);
  const ids = new Set();
  const custom = [];
  for (const r of Array.isArray(src.custom) ? src.custom : []) {
    if (!r || typeof r.id !== 'string' || !r.id || ids.has(r.id)) continue;
    if (!CUSTOM_KINDS.includes(r.kind) || !findGenre(r.kind, r.genre)) continue;
    ids.add(r.id);
    custom.push({ id: r.id, kind: r.kind, genre: r.genre });
  }
  return { disabled, custom };
}

export const customRowKey = (id) => CUSTOM_PREFIX + id;

// Rows to load, in screen order: enabled built-ins in ROWS order, then custom rows.
export function homeRows(cfg) {
  const builtins = ROWS.filter((key) => isRowEnabled(cfg, key)).map((key) => ({ key }));
  return builtins.concat(cfg.custom.map((custom) => ({ key: customRowKey(custom.id), custom })));
}

export const isRowEnabled = (cfg, key) => !cfg.disabled.includes(key);

export function toggleRow(cfg, key) {
  const disabled = isRowEnabled(cfg, key) ? cfg.disabled.concat(key) : cfg.disabled.filter((k) => k !== key);
  return { ...cfg, disabled };
}

export const hasCustomRow = (cfg, kind, genre) => cfg.custom.some((r) => r.kind === kind && r.genre === genre);

export function addCustomRow(cfg, kind, genre, id) {
  if (hasCustomRow(cfg, kind, genre)) return cfg;
  return { ...cfg, custom: cfg.custom.concat({ id, kind, genre }) };
}

// delta -1: up, +1: down; out of bounds or unknown id leaves the order as is.
export function moveCustomRow(cfg, id, delta) {
  const from = cfg.custom.findIndex((r) => r.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= cfg.custom.length) return cfg;
  const custom = cfg.custom.slice();
  [custom[from], custom[to]] = [custom[to], custom[from]];
  return { ...cfg, custom };
}

export const removeCustomRow = (cfg, id) => ({ ...cfg, custom: cfg.custom.filter((r) => r.id !== id) });

export function customRowOf(cfg, rowKey) {
  if (typeof rowKey !== 'string' || !rowKey.startsWith(CUSTOM_PREFIX)) return null;
  const id = rowKey.slice(CUSTOM_PREFIX.length);
  return cfg.custom.find((r) => r.id === id) || null;
}

export const kindWord = (kind) => KIND_WORDS[kind] || kind;

// «Комедия · фильмы»
export function customRowTitle(row) {
  const g = findGenre(row.kind, row.genre);
  return `${g ? g.title : 'Жанр'} · ${kindWord(row.kind)}`;
}

// The catalog filters a custom row stands for (also what «Ещё» opens).
export const customPreset = (row) => ({ genre: row.genre, year: null, sort: 'new', lang: null });

export const customRowQuery = (row, page, today) => catalogQuery(row.kind, customPreset(row), page, today);

// Same card filter as the catalog: Russian titles only; anime only in anime rows.
export const customRowKeeps = (kind) => (card) => hasRussianTitle(card) && !(kindHidesAnime(kind) && isAnimeCard(card));

// ---------- Lampa.Select items of the «Ленты главной» editor (rows-editor.js) ----------

const KIND_TITLES = { movie: 'Фильмы', tv: 'Сериалы', cartoon: 'Мультфильмы', anime: 'Аниме' };

// Built-ins as checkboxes (toggled in place), then custom rows, then "add".
export function editorItems(cfg) {
  const items = [{ title: 'Встроенные ленты', separator: true }];
  for (const key of ROWS) {
    items.push({ title: rowTitle(key), checkbox: true, checked: isRowEnabled(cfg, key), lh: { type: 'builtin', key } });
  }
  if (cfg.custom.length) {
    items.push({ title: 'Свои ленты', separator: true });
    for (const r of cfg.custom) items.push({ title: customRowTitle(r), lh: { type: 'custom', id: r.id } });
  }
  items.push({ title: '+ Добавить ленту по жанру', lh: { type: 'add' } });
  return items;
}

export function customActions(cfg, id) {
  const i = cfg.custom.findIndex((r) => r.id === id);
  const items = [];
  if (i > 0) items.push({ title: 'Выше', action: 'up' });
  if (i >= 0 && i < cfg.custom.length - 1) items.push({ title: 'Ниже', action: 'down' });
  items.push({ title: 'Удалить', action: 'remove' });
  return items;
}

export const kindItems = () => CUSTOM_KINDS.map((kind) => ({ title: KIND_TITLES[kind], kind }));

// Genres of a kind; ones already on the home screen are dimmed.
export function genreItems(cfg, kind) {
  return genresFor(kind).map((g) => {
    const item = { title: g.title, genre: g.id };
    if (hasCustomRow(cfg, kind, g.id)) Object.assign(item, { ghost: true, subtitle: 'Уже на главной' });
    return item;
  });
}

export function newRowId(now = Date.now(), rnd = Math.random) {
  return now.toString(36) + Math.floor(rnd() * 1e6).toString(36);
}
