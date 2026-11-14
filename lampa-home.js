(() => {
  // src/index.js
  var PLUGIN = "lampa-home";
  var VERSION = "0.1.0";
  function guard() {
    const L = window.Lampa;
    return !!(L && L.Maker && L.Activity && L.Api && L.Api.sources && L.Api.sources.tmdb && L.Api.sources.tmdb.get && L.Parser && L.Torserver && L.Player);
  }
  function init() {
    console.log(PLUGIN, VERSION, "loaded");
  }
  function start() {
    if (!guard()) {
      Lampa.Noty.show("Lampa Home: \u043D\u0435\u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F Lampa");
      return;
    }
    init();
  }
  if (window.lampa_home_ready) {
  } else {
    window.lampa_home_ready = true;
    if (window.appready) start();
    else Lampa.Listener.follow("app", (e) => {
      if (e.type == "ready") start();
    });
  }
})();
