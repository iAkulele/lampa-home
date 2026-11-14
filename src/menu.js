// Hijacks Lampa's "main" menu item and start page so they open `lh_home`.
import { lampa } from './lampa.js';
import * as home from './home.js';

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

export function init() {
  const L = lampa();

  L.Listener.follow('menu', (e) => {
    if (e.type === 'action' && e.action === 'main') {
      e.abort();
      home.open();
    }
  });

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
