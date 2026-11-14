// Hijacks Lampa's "main" menu item and start page so they open `lh_home`, and
// the movie / tv / cartoon / anime items so they open `lh_catalog`.
import { lampa } from './lampa.js';
import * as home from './home.js';
import * as catalog from './catalog.js';
import * as downloads from './downloads.js';

const CATALOG_ACTIONS = ['movie', 'tv', 'cartoon', 'anime'];
const DOWNLOADS_ACTION = 'lh_downloads';
const KEEP_ACTIONS = ['main', 'movie', 'tv', 'cartoon', 'anime', 'settings', DOWNLOADS_ACTION];
const DOWNLOADS_ICON = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3v12m0 0l-5-5m5 5l5-5M4 19h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const HIDE_CLASS = 'lh-hide';

// True for a menu action that is not one of the items we keep (six native + «Скачанное»).
export function shouldHide(action) {
  return !KEEP_ACTIONS.includes(action);
}

// Items added by other plugins (Sport, Shots) have no data-action and are hidden too.
// Marks every unused menu item with a CSS class (Lampa's own menu_hide storage
// is left alone). Idempotent: safe to call on any root, any number of times.
export function hideItems(root) {
  if (!root || typeof root.find !== 'function') return;
  root.find('.menu__item').each(function () {
    const el = window.$(this);
    if (shouldHide(el.attr('data-action'))) el.addClass(HIDE_CLASS);
  });
}

// True when the activity must be swapped for a live lh_home: it is Lampa's native
// main page, or an lh_home restored by start_page='last' before the plugin
// registered the component (Lampa then built its nocomponent page instead).
export function needsSwap(active) {
  if (!active) return false;
  if (active.component === 'main') return true;
  if (active.component === home.COMPONENT) {
    const comp = active.activity && active.activity.component;
    return !(comp && comp[home.MARKER]);
  }
  return false;
}

function swapStart() {
  const L = lampa();
  const active = L.Activity.active();
  if (!needsSwap(active)) return false;
  // pause() clears is_started, the same step Lampa's own limit() takes before an
  // activity is destroyed: a late build() of the native main page then hits the
  // is_started guard in ActivitySlide.toggle() instead of grabbing the controller.
  const old = active.activity;
  if (old && typeof old.pause === 'function') old.pause();
  L.Activity.replace({ component: home.COMPONENT, title: home.HOME_TITLE, source: 'tmdb' });
  return true;
}

// «Скачанное»: Lampa binds menu actions only for items present at its ready(), so
// the item gets its own handler; data-action keeps it out of hideItems().
function addDownloadsItem() {
  const L = lampa();
  if (!L.Menu || typeof L.Menu.addButton !== 'function') return;
  if (window.$('.menu .menu__item[data-action="' + DOWNLOADS_ACTION + '"]').length) return;
  const item = L.Menu.addButton(DOWNLOADS_ICON, downloads.TITLE, () => downloads.open());
  if (item && item.attr) item.attr('data-action', DOWNLOADS_ACTION);
}

export function init() {
  const L = lampa();
  addDownloadsItem();

  L.Listener.follow('menu', (e) => {
    if (e.type !== 'action') return;
    if (e.action === 'main') {
      e.abort();
      home.open();
    } else if (CATALOG_ACTIONS.includes(e.action)) {
      e.abort();
      catalog.open(e.action);
    }
  });

  // Hide unused menu items: when the menu is built, once more when it is done
  // (other plugins may add items) and once after the app is ready.
  const $ = window.$;
  // Plugins (Sport, Shots) add their items later still, so watch the menu too.
  const watch = (root) => {
    hideItems(root);
    if (typeof MutationObserver === 'function' && root[0]) {
      new MutationObserver(() => hideItems(root)).observe(root[0], { childList: true, subtree: true });
    }
  };
  L.Listener.follow('menu', (e) => {
    if (e.type === 'start') watch(e.body);
  });
  L.Listener.follow('app', (e) => {
    if (e.type === 'ready') hideItems($('.menu'));
  });
  if ($('.menu').length) watch($('.menu'));

  // Start page: swap whatever the first activity is if it needs it, whatever
  // the start_page setting; if Lampa has not started one yet, catch the first.
  if (L.Activity.active()) {
    swapStart();
  } else {
    const once = (e) => {
      if (e.type !== 'start') return;
      L.Listener.remove('activity', once);
      setTimeout(swapStart, 0);
    };
    L.Listener.follow('activity', once);
  }
}
