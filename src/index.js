import css from './styles.css';
const PLUGIN = 'lampa-home', VERSION = '0.1.0';
function guard(){ const L = window.Lampa; return !!(L && L.Maker && L.Activity && L.Api && L.Api.sources && L.Api.sources.tmdb && L.Api.sources.tmdb.get && L.Parser && L.Torserver && L.Player); }
function init(){ /* Task 5+: injectCss(css); menu.init(); home.register(); ... */ console.log(PLUGIN, VERSION, 'loaded'); }
function start(){ if(!guard()){ Lampa.Noty.show('Lampa Home: несовместимая версия Lampa'); return; } init(); }
if(window.lampa_home_ready) {} else { window.lampa_home_ready = true; if(window.appready) start(); else Lampa.Listener.follow('app', e => { if(e.type == 'ready') start(); }); }
