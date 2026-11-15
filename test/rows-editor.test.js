import test from 'node:test';
import assert from 'node:assert';
import { open } from '../src/rows-editor.js';
import { STORAGE_KEYS } from '../src/config.js';

// Fake Lampa: Storage in a Map, Select records each shown list, Noty records texts.
function fakeLampa() {
  const data = new Map();
  const shown = [];
  const notes = [];
  const toggled = [];
  globalThis.window = {
    Lampa: {
      Storage: {
        get: (k, empty) => (data.has(k) ? JSON.parse(data.get(k)) : empty),
        set: (k, v) => data.set(k, JSON.stringify(v)),
      },
      Select: { show: (o) => shown.push(o) },
      Noty: { show: (t) => notes.push(t) },
      Controller: { toggle: (name) => toggled.push(name) },
    },
  };
  const saved = () => JSON.parse(data.get(STORAGE_KEYS.rows) || 'null');
  const last = () => shown[shown.length - 1];
  const pick = (pred) => last().items.find(pred);
  return { shown, notes, toggled, saved, last, pick };
}

test('test_editor_toggles_builtin_row_and_tells_when_it_applies', () => {
  const f = fakeLampa();
  open();
  assert.strictEqual(f.last().title, 'Ленты главной');
  const horror = f.pick((i) => i.lh && i.lh.key === 'horror');
  assert.strictEqual(horror.checked, true);
  f.last().onCheck(horror);
  assert.deepStrictEqual(f.saved().disabled, ['horror']);
  assert.strictEqual(f.notes.length, 1);
  assert.match(f.notes[0], /следующем открытии главной/);
  f.last().onBack();
  assert.deepStrictEqual(f.toggled, ['settings_component']);
});

test('test_editor_adds_moves_and_removes_custom_rows', () => {
  const f = fakeLampa();
  open();
  const addRow = (kindTitle, genreTitle) => {
    f.last().onSelect(f.pick((i) => i.lh && i.lh.type === 'add'));
    f.last().onSelect(f.pick((i) => i.title === kindTitle));
    f.last().onSelect(f.pick((i) => i.title === genreTitle));
  };
  addRow('Фильмы', 'Комедия');
  addRow('Аниме', 'Комедия');
  assert.deepStrictEqual(f.saved().custom.map((r) => [r.kind, r.genre]), [['movie', 35], ['anime', 35]]);
  const titles = () => f.last().items.filter((i) => i.lh && i.lh.type === 'custom').map((i) => i.title);
  assert.deepStrictEqual(titles(), ['Комедия · фильмы', 'Комедия · аниме']);

  // move the anime row up
  f.last().onSelect(f.pick((i) => i.title === 'Комедия · аниме'));
  f.last().onSelect(f.pick((i) => i.title === 'Выше'));
  assert.deepStrictEqual(titles(), ['Комедия · аниме', 'Комедия · фильмы']);

  // remove it
  f.last().onSelect(f.pick((i) => i.title === 'Комедия · аниме'));
  f.last().onSelect(f.pick((i) => i.title === 'Удалить'));
  assert.deepStrictEqual(titles(), ['Комедия · фильмы']);
  assert.deepStrictEqual(f.saved().custom.map((r) => r.genre), [35]);
});

test('test_editor_refuses_duplicate_row', () => {
  const f = fakeLampa();
  open();
  for (let n = 0; n < 2; n++) {
    f.last().onSelect(f.pick((i) => i.lh && i.lh.type === 'add'));
    f.last().onSelect(f.pick((i) => i.title === 'Сериалы'));
    f.last().onSelect(f.pick((i) => i.title === 'Драма'));
  }
  assert.strictEqual(f.saved().custom.length, 1);
  assert.ok(f.notes.includes('Такая лента уже есть'));
});
