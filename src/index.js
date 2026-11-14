import css from './styles.css';
import * as menu from './menu.js';
import * as home from './home.js';

const PLUGIN = 'lampa-home', VERSION = '0.1.0';
function guard(){ const L = window.Lampa; return !!(L && L.Maker && L.Activity && L.Api && L.Api.sources && L.Api.sources.tmdb && L.Api.sources.tmdb.get && L.Parser && L.Torserver && L.Player); }
function injectCss(text){ if(document.getElementById('lh-style')) return; const style = document.createElement('style'); style.id = 'lh-style'; style.textContent = text; document.head.appendChild(style); }
function init(){ injectCss(css); home.register(); menu.init(); console.log(PLUGIN, VERSION, 'loaded'); }
function start(){ if(!guard()){ Lampa.Noty.show('Lampa Home: несовместимая версия Lampa'); return; } init(); }
if(window.lampa_home_ready) {} else { window.lampa_home_ready = true; if(window.appready) start(); else Lampa.Listener.follow('app', e => { if(e.type == 'ready') start(); }); }
