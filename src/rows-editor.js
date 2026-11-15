// «Ленты главной» (Settings → Lampa Home): switch built-in rows on/off, add genre rows,
// reorder or remove them. Changes are saved at once and show on the next home open.
import { lampa, store, noty } from './lampa.js';
import {
  editorItems, customActions, kindItems, genreItems, toggleRow, addCustomRow, moveCustomRow,
  removeCustomRow, customRowTitle, hasCustomRow, newRowId,
} from './rows.js';

const TITLE = 'Ленты главной';
const LATER = 'Изменения появятся при следующем открытии главной';
// Settings' own controller: where focus returns when the editor closes.
const SETTINGS_CONTROLLER = 'settings_component';

export function open() {
  const L = lampa();
  let told = false;
  const save = (cfg) => {
    store.rows.set(cfg);
    if (!told) noty(LATER);
    told = true;
  };

  function showMain(focusId) {
    const items = editorItems(store.rows.get()).map((it) => (
      focusId && it.lh && it.lh.id === focusId ? { ...it, selected: true } : it
    ));
    L.Select.show({
      title: TITLE,
      items,
      onCheck: (a) => {
        if (a.lh && a.lh.type === 'builtin') save(toggleRow(store.rows.get(), a.lh.key));
      },
      onSelect: (a) => {
        if (!a.lh) return showMain();
        if (a.lh.type === 'custom') showCustom(a.lh.id);
        else if (a.lh.type === 'add') showKinds();
        else showMain();
      },
      onBack: () => L.Controller.toggle(SETTINGS_CONTROLLER),
    });
  }

  function showCustom(id) {
    const cfg = store.rows.get();
    const row = cfg.custom.find((r) => r.id === id);
    if (!row) return showMain();
    L.Select.show({
      title: customRowTitle(row),
      items: customActions(cfg, id),
      onSelect: (a) => {
        const now = store.rows.get();
        if (a.action === 'up') save(moveCustomRow(now, id, -1));
        else if (a.action === 'down') save(moveCustomRow(now, id, 1));
        else if (a.action === 'remove') {
          save(removeCustomRow(now, id));
          return showMain();
        }
        showMain(id);
      },
      onBack: () => showMain(id),
    });
  }

  function showKinds() {
    L.Select.show({
      title: 'Новая лента',
      items: kindItems(),
      onSelect: (a) => showGenres(a.kind),
      onBack: () => showMain(),
    });
  }

  function showGenres(kind) {
    L.Select.show({
      title: 'Жанр',
      items: genreItems(store.rows.get(), kind),
      onSelect: (a) => {
        const cfg = store.rows.get();
        if (hasCustomRow(cfg, kind, a.genre)) {
          noty('Такая лента уже есть');
          return showGenres(kind);
        }
        const id = newRowId();
        told = true;
        store.rows.set(addCustomRow(cfg, kind, a.genre, id));
        noty(`Лента «${customRowTitle({ kind, genre: a.genre })}» добавлена: появится при следующем открытии главной`);
        showMain(id);
      },
      onBack: showKinds,
    });
  }

  showMain();
}
