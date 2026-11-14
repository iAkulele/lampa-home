(() => {
  // src/styles.css
  var styles_default = "/* Home rows: wide 16:9 cards, five per row plus a peek of the sixth.\n   Lampa sets body font-size = innerWidth / 84.17, so the layout is width-independent:\n   1.5em left offset + 5.5 x (14em card + 1em gap) ~= 84em. */\n.lh-home .card--wide {\n  width: 14em;\n}\n.lh-home .card--wide .card__view {\n  padding-bottom: 56.25%;\n}\n.lh-home .card--wide .card__img {\n  object-fit: cover;\n}\n/* Narrower than Lampa's own wide card (34.3em): keep only a compact title. */\n.lh-home .card--wide .card__promo {\n  padding: 1.5em 0.8em 0.7em 0.8em;\n}\n.lh-home .card--wide .card__promo-title {\n  font-size: 1.3em;\n  padding-right: 2.6em; /* room for the rating badge */\n}\n.lh-home .card--wide .card__promo-text {\n  display: none;\n}\n";

  // src/config.js
  var ROWS = ["movies", "horror", "anime", "series", "cartoons", "history"];
  var STORAGE_KEYS = {
    progress: "lh_progress",
    seen: "lh_seen",
    tvcache: "lh_tvcache",
    notifyAt: "lh_notify_at",
    filters: "lh_filters",
    preload: "lh_preload",
    settings: "lh_settings"
  };
  var LIMITS = {
    searchTimeoutMs: 12e3,
    maxMovieBytes: 60 * 1024 ** 3,
    maxToasts: 3,
    notifyEveryMs: 6 * 36e5,
    tvCacheMs: 12 * 36e5
  };

  // src/store.js
  var MAX_ENTRIES = 200;
  var DEFAULT_FILTER = { genre: null, year: null, sort: "new" };
  function createStore(storage2, now = () => Date.now()) {
    const read = (key) => {
      const v = storage2.get(key, {});
      return v && typeof v === "object" ? v : {};
    };
    const progress = {
      get(cardId) {
        return read(STORAGE_KEYS.progress)[cardId] || null;
      },
      set(cardId, { season, episode, hash }) {
        const all = read(STORAGE_KEYS.progress);
        all[cardId] = { season, episode, hash, updated: now() };
        storage2.set(STORAGE_KEYS.progress, all);
      }
    };
    const seen = {
      get(tvId) {
        const v = read(STORAGE_KEYS.seen)[tvId];
        return typeof v === "number" ? v : null;
      },
      set(tvId, aired) {
        const all = read(STORAGE_KEYS.seen);
        all[tvId] = aired;
        storage2.set(STORAGE_KEYS.seen, all);
      }
    };
    const tvcache = {
      get(tvId) {
        const e = read(STORAGE_KEYS.tvcache)[tvId];
        if (!e || now() - e.checked > LIMITS.tvCacheMs) return null;
        return e;
      },
      set(tvId, status) {
        const all = read(STORAGE_KEYS.tvcache);
        all[tvId] = { status, checked: now() };
        storage2.set(STORAGE_KEYS.tvcache, all);
      }
    };
    const notify = {
      due() {
        const at = storage2.get(STORAGE_KEYS.notifyAt, 0);
        return now() - (typeof at === "number" ? at : 0) >= LIMITS.notifyEveryMs;
      },
      mark() {
        storage2.set(STORAGE_KEYS.notifyAt, now());
      }
    };
    const filters = {
      get(kind) {
        return { ...DEFAULT_FILTER, ...read(STORAGE_KEYS.filters)[kind] || {} };
      },
      set(kind, f) {
        var _a, _b, _c;
        const all = read(STORAGE_KEYS.filters);
        all[kind] = { genre: (_a = f.genre) != null ? _a : null, year: (_b = f.year) != null ? _b : null, sort: (_c = f.sort) != null ? _c : "new" };
        storage2.set(STORAGE_KEYS.filters, all);
      }
    };
    const preload = {
      get(cardId) {
        return read(STORAGE_KEYS.preload)[cardId] || null;
      },
      set(cardId, data) {
        const all = read(STORAGE_KEYS.preload);
        all[cardId] = data;
        storage2.set(STORAGE_KEYS.preload, all);
      },
      remove(cardId) {
        const all = read(STORAGE_KEYS.preload);
        if (!(cardId in all)) return;
        delete all[cardId];
        storage2.set(STORAGE_KEYS.preload, all);
      },
      all() {
        const all = read(STORAGE_KEYS.preload);
        return Object.keys(all).map((cardId) => ({ cardId, ...all[cardId] })).sort((a, b) => (b.added || 0) - (a.added || 0));
      }
    };
    function trim(key, field) {
      const all = read(key);
      const ids = Object.keys(all);
      if (ids.length <= MAX_ENTRIES) return;
      ids.sort((a, b) => (all[b][field] || 0) - (all[a][field] || 0));
      const kept = {};
      for (const id of ids.slice(0, MAX_ENTRIES)) kept[id] = all[id];
      storage2.set(key, kept);
    }
    function prune() {
      trim(STORAGE_KEYS.progress, "updated");
      trim(STORAGE_KEYS.tvcache, "checked");
    }
    return { progress, seen, tvcache, notify, filters, preload, prune };
  }

  // src/lampa.js
  var storage = {
    get: (key, empty) => window.Lampa.Storage.get(key, empty),
    set: (key, value) => window.Lampa.Storage.set(key, value)
  };
  var noty = (text) => window.Lampa.Noty.show(text);
  var tmdbGet = (url, params, ok, fail) => window.Lampa.Api.sources.tmdb.get(url, params, ok, fail);
  var favoriteGet = (params) => window.Lampa.Favorite.get(params) || [];
  var lampa = () => window.Lampa;
  var store = createStore(storage);

  // src/tmdb-queries.js
  var GENRE_ANIMATION = 16;
  var GENRE_DOCUMENTARY = 99;
  function daysAgo(today, n) {
    const [y, m, d] = today.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10);
  }
  function movieFilter(today) {
    return {
      with_release_type: "4",
      region: "US",
      "primary_release_date.lte": today
    };
  }
  function rowQuery(rowKey, today) {
    switch (rowKey) {
      case "movies":
        return {
          url: "discover/movie",
          params: {
            sort_by: "primary_release_date.desc",
            filter: {
              ...movieFilter(today),
              without_genres: `${GENRE_ANIMATION},${GENRE_DOCUMENTARY}`
            }
          }
        };
      case "horror":
        return {
          url: "discover/movie",
          params: {
            genres: 27,
            sort_by: "primary_release_date.desc",
            filter: movieFilter(today)
          }
        };
      case "anime":
        return {
          url: "discover/tv",
          params: {
            genres: GENRE_ANIMATION,
            sort_by: "popularity.desc",
            filter: { with_origin_country: "JP", "air_date.gte": daysAgo(today, 14) }
          }
        };
      case "series":
        return {
          url: "discover/tv",
          params: {
            sort_by: "popularity.desc",
            filter: { without_genres: String(GENRE_ANIMATION), "air_date.gte": daysAgo(today, 30) }
          }
        };
      case "cartoons":
        return {
          url: "discover/movie",
          params: {
            genres: GENRE_ANIMATION,
            sort_by: "primary_release_date.desc",
            filter: movieFilter(today)
          }
        };
      default:
        return null;
    }
  }

  // src/cards.js
  var ROW_TITLES = {
    movies: "\u041D\u043E\u0432\u044B\u0435 \u0444\u0438\u043B\u044C\u043C\u044B",
    horror: "\u041D\u043E\u0432\u044B\u0435 \u0443\u0436\u0430\u0441\u044B",
    anime: "\u0410\u043D\u0438\u043C\u0435: \u043E\u043D\u0433\u043E\u0438\u043D\u0433\u0438",
    series: "\u041D\u043E\u0432\u044B\u0435 \u0441\u0435\u0440\u0438\u0430\u043B\u044B",
    cartoons: "\u041D\u043E\u0432\u044B\u0435 \u043C\u0443\u043B\u044C\u0442\u0444\u0438\u043B\u044C\u043C\u044B",
    history: "\u041D\u0435\u0434\u0430\u0432\u043D\u043E \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u043D\u043D\u043E\u0435"
  };
  function rowTitle(rowKey) {
    return ROW_TITLES[rowKey] || rowKey;
  }
  function toWideCard(card) {
    const out = { ...card, params: { ...card.params || {}, style: { name: "wide" } } };
    if (!out.backdrop_path && out.poster_path) {
      out.backdrop_path = out.poster_path;
      out.lh_poster_fallback = true;
    }
    return out;
  }

  // src/tmdb.js
  var HISTORY_LIMIT = 20;
  function todayIso(d = /* @__PURE__ */ new Date()) {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  function get(url, params) {
    return new Promise((resolve, reject) => tmdbGet(url, params, resolve, reject));
  }
  function loadHistory() {
    return favoriteGet({ type: "history" }).slice(0, HISTORY_LIMIT);
  }
  function loadRow(rowKey, today = todayIso()) {
    const base = { title: rowTitle(rowKey), rowKey, results: [] };
    if (rowKey === "history") {
      try {
        return Promise.resolve({ ...base, results: loadHistory() });
      } catch (e) {
        return Promise.resolve(base);
      }
    }
    const q = rowQuery(rowKey, today);
    if (!q) return Promise.resolve(base);
    return get(q.url, { ...q.params, page: 1 }).then(
      (json) => ({ ...base, results: json && json.results || [], total_pages: json && json.total_pages || 1 }),
      () => base
    );
  }

  // src/home.js
  var NAME = "lh_home";
  var TITLE = "\u0413\u043B\u0430\u0432\u043D\u0430\u044F";
  var MARKER = "lh_home_live";
  function openCatalog(rowKey) {
    noty("\u041A\u0430\u0442\u0430\u043B\u043E\u0433: \u0441\u043A\u043E\u0440\u043E");
  }
  function buildRows(loaded) {
    return loaded.filter((row) => row.results.length).map((row) => ({
      title: row.title,
      results: row.results.map(toWideCard),
      total_pages: row.total_pages || 1,
      params: { items: { view: 6 }, lh_row: row.rowKey }
    }));
  }
  function component(object) {
    const L = lampa();
    const comp = L.Maker.make("Main", object);
    comp[MARKER] = true;
    comp.use({
      onCreate() {
        this.render(true).classList.add("lh-home");
        const today = todayIso();
        Promise.all(ROWS.map((key) => loadRow(key, today))).then((loaded) => {
          if (this.destroyed) return;
          const rows = buildRows(loaded);
          if (rows.length) this.build(rows);
          else this.empty();
        }).catch(() => {
          if (!this.destroyed) this.empty();
        });
      },
      onNext(resolve, reject) {
        reject.call(this);
      },
      onDestroy() {
        this.destroyed = true;
      },
      onInstance(item, data) {
        const rowKey = data.params && data.params.lh_row;
        item.use({
          onMore: () => openCatalog(rowKey),
          onInstance(card, cardData) {
            card.use({
              onEnter: L.Router.call.bind(L.Router, "full", cardData),
              onFocus() {
                L.Background.change(L.Utils.cardImgBackground(cardData));
              }
            });
          }
        });
      }
    });
    return comp;
  }
  function register() {
    lampa().Component.add(NAME, component);
  }
  function open() {
    lampa().Activity.push({ component: NAME, title: TITLE, url: "", page: 1, source: "tmdb" });
  }
  var COMPONENT = NAME;
  var HOME_TITLE = TITLE;

  // src/menu.js
  function needsSwap(active) {
    if (!active) return false;
    if (active.component === "main") return true;
    if (active.component === COMPONENT) {
      const comp = active.activity && active.activity.component;
      return !(comp && comp[MARKER]);
    }
    return false;
  }
  function swapStart() {
    const L = lampa();
    const active = L.Activity.active();
    if (!needsSwap(active)) return false;
    const old = active.activity;
    if (old && typeof old.pause === "function") old.pause();
    L.Activity.replace({ component: COMPONENT, title: HOME_TITLE, source: "tmdb" });
    return true;
  }
  function init() {
    const L = lampa();
    L.Listener.follow("menu", (e) => {
      if (e.type === "action" && e.action === "main") {
        e.abort();
        open();
      }
    });
    if (L.Activity.active()) {
      swapStart();
    } else {
      const once = (e) => {
        if (e.type !== "start") return;
        L.Listener.remove("activity", once);
        setTimeout(swapStart, 0);
      };
      L.Listener.follow("activity", once);
    }
  }

  // src/index.js
  var PLUGIN = "lampa-home";
  var VERSION = "0.1.0";
  function guard() {
    const L = window.Lampa;
    return !!(L && L.Maker && L.Activity && L.Api && L.Api.sources && L.Api.sources.tmdb && L.Api.sources.tmdb.get && L.Parser && L.Torserver && L.Player);
  }
  function injectCss(text) {
    if (document.getElementById("lh-style")) return;
    const style = document.createElement("style");
    style.id = "lh-style";
    style.textContent = text;
    document.head.appendChild(style);
  }
  function init2() {
    injectCss(styles_default);
    register();
    init();
    console.log(PLUGIN, VERSION, "loaded");
  }
  function start() {
    if (!guard()) {
      Lampa.Noty.show("Lampa Home: \u043D\u0435\u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F Lampa");
      return;
    }
    init2();
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
