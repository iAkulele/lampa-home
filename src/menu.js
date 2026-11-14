// Hijacks Lampa's "main" menu item and start page so they open `lh_home`.
import { lampa } from './lampa.js';
import * as home from './home.js';

function replaceMain() {
  const L = lampa();
  const active = L.Activity.active();
  if (!active || active.component !== 'main') return false;
  // The native main page may still be loading. Activity.destroy() only stubs the
  // component's own functions, not Main.prototype.build, so a late build would call
  // activity.toggle() and steal the controller from lh_home. Mute that path first.
  const old = active.activity;
  if (old) {
    old.toggle = () => {};
    old.loader = () => {};
  }
  L.Activity.replace({ component: home.COMPONENT, title: home.HOME_TITLE, source: 'tmdb' });
  return true;
}

export function init() {
  const L = lampa();

  L.Listener.follow('menu', (e) => {
    if (e.type === 'action' && e.action === 'main') {
      e.abort();
      home.open();
    }
  });

  // Start page: if Lampa already opened its main page, swap it; otherwise
  // catch the first activity start and swap it if it is the main page.
  if (L.Activity.active()) {
    replaceMain();
  } else if (L.Storage.field('start_page') === 'main') {
    const once = (e) => {
      if (e.type !== 'start') return;
      L.Listener.remove('activity', once);
      if (e.component === 'main') setTimeout(replaceMain, 0);
    };
    L.Listener.follow('activity', once);
  }
}
