import css from './styles.css';
import * as menu from './menu.js';
import * as home from './home.js';
import * as catalog from './catalog.js';
import * as templates from './templates.js';
import * as play from './play.js';
import * as notify from './notify.js';
import * as settings from './settings.js';
import * as downloads from './downloads.js';
import { store } from './lampa.js';

// Every Lampa API the plugin relies on; a missing one means an incompatible Lampa.
function guard() {
  const L = window.Lampa;
  return !!(L && L.Maker && L.Activity && L.Api && L.Api.sources && L.Api.sources.tmdb && L.Api.sources.tmdb.get &&
    L.Parser && L.Torserver && L.Player && L.Loading && L.SettingsApi && L.Template && L.Select && L.Favorite && L.Menu);
}

function injectCss(text) {
  if (document.getElementById('lh-style')) return;
  const style = document.createElement('style');
  style.id = 'lh-style';
  style.textContent = text;
  document.head.appendChild(style);
}

// Each module registers on its own: a failing one is reported and skipped, the
// others (and Lampa's native screens) keep working.
const STEPS = [
  ['styles', () => injectCss(css)],
  ['storage', () => store.prune()],
  ['templates', () => templates.register()],
  ['settings', () => settings.register()],
  ['home', () => home.register()],
  ['catalog', () => catalog.register()],
  ['downloads', () => downloads.register()],
  ['play', () => play.init()],
  ['downloads-menu', () => downloads.init()],
  ['menu', () => menu.init()],
  ['notify', () => notify.start()],
];

function init() {
  for (const [name, step] of STEPS) {
    try {
      step();
    } catch (e) {
      console.error('lampa-home', name, e);
      Lampa.Noty.show('Lampa Home: ошибка модуля ' + name);
    }
  }
}

function start() {
  if (!guard()) {
    Lampa.Noty.show('Lampa Home: несовместимая версия Lampa');
    return;
  }
  init();
}

if (!window.lampa_home_ready) {
  window.lampa_home_ready = true;
  if (window.appready) start();
  else Lampa.Listener.follow('app', (e) => { if (e.type == 'ready') start(); });
}
