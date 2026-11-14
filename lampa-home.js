(() => {
  // src/styles.css
  var styles_default = `/* Home rows: wide 16:9 cards, five per row plus a peek of the sixth.
   Lampa sets body font-size = innerWidth / 84.17, so the layout is width-independent:
   1.5em left offset + 5.5 x (14em card + 1em gap) ~= 84em. */
.lh-home .card--wide {
  width: 14em;
}
.lh-home .card--wide .card__view {
  padding-bottom: 56.25%;
}
.lh-home .card--wide .card__img {
  object-fit: cover;
}
/* Narrower than Lampa's own wide card (34.3em): keep only a compact title. */
.lh-home .card--wide .card__promo {
  padding: 1.5em 0.8em 0.7em 0.8em;
}
.lh-home .card--wide .card__promo-title {
  font-size: 1.3em;
  padding-right: 2.6em; /* room for the rating badge */
}
.lh-home .card--wide .card__promo-text {
  display: none;
}

/* Hero banner above the rows: backdrop, left/bottom shade, text bottom-left. */
.lh-home .lh-banner {
  position: relative;
  height: 45vh;
  margin: 0 1.5em 1.5em 1.5em;
  border-radius: 1em;
  overflow: hidden;
  background-color: #111;
  background-size: cover;
  background-position: center;
}
.lh-home .lh-banner__shade {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to right, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.4) 45%, rgba(0, 0, 0, 0) 75%),
    linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0) 55%);
}
.lh-home .lh-banner__body {
  position: absolute;
  left: 2em;
  bottom: 2em;
  width: 50%;
  color: #fff;
}
.lh-home .lh-banner__title {
  font-size: 2.6em;
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 0.3em;
}
.lh-home .lh-banner__meta {
  font-size: 1.1em;
  opacity: 0.8;
  margin-bottom: 0.6em;
}
.lh-home .lh-banner__overview {
  font-size: 1.1em;
  line-height: 1.4;
  opacity: 0.9;
  margin-bottom: 1.2em;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.lh-home .lh-banner__buttons {
  display: flex;
  gap: 1em;
}
.lh-home .lh-banner__button {
  padding: 0.6em 1.6em;
  border-radius: 0.4em;
  font-size: 1.2em;
  font-weight: 600;
  outline: 0.2em solid transparent;
}
.lh-home .lh-banner__play {
  background: #fff;
  color: #000;
}
.lh-home .lh-banner__more {
  background: rgba(109, 109, 110, 0.7);
  color: #fff;
}
.lh-home .lh-banner__button.focus {
  outline-color: #fff;
  outline-offset: 0.15em;
}

/* Episode badge "7 \u0438\u0437 12" on series cards, loaded after render. */
.lh-home .lh-badge {
  position: absolute;
  top: 0.4em;
  left: 0.4em;
  background: #2b2b2b;
  border: 1px solid #555;
  color: #fff;
  font-size: 0.8em;
  padding: 0.1em 0.4em;
  border-radius: 0.2em;
  z-index: 2;
}

/* Catalog: chips row above a 4-column grid of the same wide 16:9 cards. */
.lh-catalog .lh-catalog__head {
  padding: 1em 1.5em 0 1.5em;
}
.lh-catalog .lh-catalog__head .scroll--nopadding .scroll__body {
  padding: 0;
}
.lh-catalog .card--wide .card__view {
  padding-bottom: 56.25%;
}
.lh-catalog .card--wide .card__img {
  object-fit: cover;
}
.lh-catalog .card--wide .card__promo {
  padding: 1.5em 0.8em 0.7em 0.8em;
}
.lh-catalog .card--wide .card__promo-title {
  font-size: 1.3em;
  padding-right: 2.6em;
}
.lh-catalog .card--wide .card__promo-text {
  display: none;
}
`;

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
  var GENRES_MOVIE = [
    { id: 28, title: "\u0411\u043E\u0435\u0432\u0438\u043A" },
    { id: 12, title: "\u041F\u0440\u0438\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F" },
    { id: 16, title: "\u041C\u0443\u043B\u044C\u0442\u0444\u0438\u043B\u044C\u043C" },
    { id: 35, title: "\u041A\u043E\u043C\u0435\u0434\u0438\u044F" },
    { id: 80, title: "\u041A\u0440\u0438\u043C\u0438\u043D\u0430\u043B" },
    { id: 18, title: "\u0414\u0440\u0430\u043C\u0430" },
    { id: 14, title: "\u0424\u044D\u043D\u0442\u0435\u0437\u0438" },
    { id: 27, title: "\u0423\u0436\u0430\u0441\u044B" },
    { id: 9648, title: "\u0414\u0435\u0442\u0435\u043A\u0442\u0438\u0432" },
    { id: 10749, title: "\u041C\u0435\u043B\u043E\u0434\u0440\u0430\u043C\u0430" },
    { id: 878, title: "\u0424\u0430\u043D\u0442\u0430\u0441\u0442\u0438\u043A\u0430" },
    { id: 53, title: "\u0422\u0440\u0438\u043B\u043B\u0435\u0440" },
    { id: 10752, title: "\u0412\u043E\u0435\u043D\u043D\u044B\u0439" }
  ];
  var GENRES_TV = [
    { id: 10759, title: "\u0411\u043E\u0435\u0432\u0438\u043A \u0438 \u043F\u0440\u0438\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F" },
    { id: 16, title: "\u0410\u043D\u0438\u043C\u0430\u0446\u0438\u044F" },
    { id: 35, title: "\u041A\u043E\u043C\u0435\u0434\u0438\u044F" },
    { id: 80, title: "\u041A\u0440\u0438\u043C\u0438\u043D\u0430\u043B" },
    { id: 18, title: "\u0414\u0440\u0430\u043C\u0430" },
    { id: 9648, title: "\u0414\u0435\u0442\u0435\u043A\u0442\u0438\u0432" },
    { id: 10765, title: "\u0424\u0430\u043D\u0442\u0430\u0441\u0442\u0438\u043A\u0430 \u0438 \u0444\u044D\u043D\u0442\u0435\u0437\u0438" },
    { id: "horror", title: "\u0423\u0436\u0430\u0441\u044B" }
    // TV has no horror genre: emulated via keywords
  ];
  var GENRE_HORROR_TV_KEYWORDS = [315058, 12377, 3133, 3358, 12339, 256183];
  var GENRE_ANIMATION = 16;
  var GENRE_DOCUMENTARY = 99;
  function genresFor(kind) {
    if (kind === "tv") return GENRES_TV;
    if (kind === "movie") return GENRES_MOVIE;
    const base = kind === "anime" ? GENRES_TV : kind === "cartoon" ? GENRES_MOVIE : [];
    return base.filter((g) => g.id !== GENRE_ANIMATION);
  }
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
  function yearRange(year) {
    const m = typeof year === "string" && /^(\d{4})-(\d{4})$/.exec(year);
    return m ? { from: `${m[1]}-01-01`, to: `${m[2]}-12-31` } : null;
  }
  function catalogQuery(kind, filters, page, today) {
    const isTv = kind === "tv" || kind === "anime";
    const params = { page, filter: {} };
    const f = params.filter;
    const fixed = kind === "anime" || kind === "cartoon";
    if (filters.genre === "horror") {
      params.keywords = GENRE_HORROR_TV_KEYWORDS.join("|");
      if (fixed) params.genres = GENRE_ANIMATION;
    } else if (fixed) {
      params.genres = filters.genre != null ? `${GENRE_ANIMATION},${filters.genre}` : GENRE_ANIMATION;
    } else if (filters.genre != null) {
      params.genres = filters.genre;
    }
    if (kind === "anime") f.with_origin_country = "JP";
    const dateField = isTv ? "first_air_date" : "primary_release_date";
    if (!isTv) Object.assign(f, movieFilter(today));
    if (filters.sort === "rating") {
      params.sort_by = "vote_average.desc";
      f["vote_count.gte"] = "100";
    } else {
      params.sort_by = `${dateField}.desc`;
      f[`${dateField}.lte`] = today;
      f["vote_count.gte"] = isTv ? "5" : "10";
    }
    const range = yearRange(filters.year);
    if (range) {
      f[`${dateField}.gte`] = range.from;
      f[`${dateField}.lte`] = range.to;
    } else if (filters.year != null) {
      f[isTv ? "first_air_date_year" : "primary_release_year"] = filters.year;
    }
    return { url: isTv ? "discover/tv" : "discover/movie", params };
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
  function badgeText(status) {
    return `${status.aired} \u0438\u0437 ${status.total}`;
  }
  function applyBadge(cardEl, status) {
    if (!cardEl || !status || !status.total) return;
    const view = cardEl.querySelector(".card__view");
    if (!view || view.querySelector(".lh-badge")) return;
    const el = document.createElement("div");
    el.className = "lh-badge";
    el.textContent = badgeText(status);
    view.appendChild(el);
  }

  // src/episodes.js
  var realSeasons = (seasons) => (seasons || []).filter((s) => s && s.season_number > 0).sort((a, b) => a.season_number - b.season_number);
  var findSeason = (seasons, n) => realSeasons(seasons).find((s) => s.season_number === n);
  function episodeStatus(tv, today) {
    const list = realSeasons(tv && tv.seasons);
    const last = tv && tv.last_episode_to_air;
    const airing = !!tv && (tv.status === "Returning Series" || !!tv.next_episode_to_air);
    if (!last) {
      const s = list[list.length - 1];
      const total2 = s ? s.episode_count : 0;
      return { season: s ? s.season_number : 1, aired: total2, total: total2, airing };
    }
    const season = last.season_number;
    const info = findSeason(list, season);
    const total = info ? info.episode_count : last.episode_number;
    const future = !!last.air_date && !!today && last.air_date > today;
    const aired = future ? Math.max(0, last.episode_number - 1) : last.episode_number;
    return { season, aired, total, airing };
  }

  // src/queue.js
  function createQueue(limit) {
    let active = 0;
    const waiting = [];
    const next = () => {
      if (active >= limit || !waiting.length) return;
      active++;
      const { job, resolve, reject } = waiting.shift();
      Promise.resolve().then(job).then(resolve, reject).finally(() => {
        active--;
        next();
      });
    };
    return (job) => new Promise((resolve, reject) => {
      waiting.push({ job, resolve, reject });
      next();
    });
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
  function loadTv(tvId) {
    return get(`tv/${tvId}`, {});
  }
  var tvQueue = createQueue(6);
  function tvStatus(tvId, today = todayIso()) {
    const hit = store.tvcache.get(tvId);
    if (hit) return Promise.resolve(hit.status);
    return tvQueue(() => loadTv(tvId)).then(
      (json) => {
        const status = episodeStatus(json, today);
        store.tvcache.set(tvId, status);
        return status;
      },
      () => null
    );
  }

  // src/catalog.js
  var NAME = "lh_catalog";
  var FILTER_CONTROLLER = "lh_catalog_filter";
  var COLS = 4;
  var FIRST_YEAR = 2010;
  var DECADES = ["2000-2009", "1990-1999"];
  var KIND_TITLES = { movie: "\u0424\u0438\u043B\u044C\u043C\u044B", tv: "\u0421\u0435\u0440\u0438\u0430\u043B\u044B", cartoon: "\u041C\u0443\u043B\u044C\u0442\u0444\u0438\u043B\u044C\u043C\u044B", anime: "\u0410\u043D\u0438\u043C\u0435" };
  var SORT_TITLES = { new: "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043D\u043E\u0432\u044B\u0435", rating: "\u041F\u043E \u0440\u0435\u0439\u0442\u0438\u043D\u0433\u0443" };
  var FRESH = { genre: null, year: null, sort: "new" };
  var ROW_PRESETS = {
    movies: { kind: "movie", preset: FRESH },
    horror: { kind: "movie", preset: { ...FRESH, genre: 27 } },
    anime: { kind: "anime", preset: FRESH },
    series: { kind: "tv", preset: FRESH },
    cartoons: { kind: "cartoon", preset: FRESH }
  };
  function presetFor(rowKey) {
    const p = ROW_PRESETS[rowKey];
    return p ? { kind: p.kind, preset: { ...p.preset } } : null;
  }
  function applyPreset(stored, preset) {
    return { ...stored, ...preset || {} };
  }
  var decadeTitle = (range) => range.replace("-", "\u2013");
  function yearOptions(today) {
    const current = Number(today.slice(0, 4));
    const out = [{ title: "\u0412\u0441\u0435", value: null }];
    for (let y = current; y >= FIRST_YEAR; y--) out.push({ title: String(y), value: y });
    for (const d of DECADES) out.push({ title: decadeTitle(d), value: d });
    return out;
  }
  function genreName(kind, id) {
    const g = id != null && genresFor(kind).find((x) => x.id === id);
    return g ? g.title : "\u0432\u0441\u0435";
  }
  function chosenLabels(kind, f) {
    const year = f.year == null ? "\u0432\u0441\u0435" : typeof f.year === "string" ? decadeTitle(f.year) : String(f.year);
    return {
      genre: `\u0416\u0430\u043D\u0440: ${genreName(kind, f.genre)}`,
      year: `\u0413\u043E\u0434: ${year}`,
      sort: SORT_TITLES[f.sort] || SORT_TITLES.new
    };
  }
  function guarded(comp, fn) {
    return (...args) => {
      if (!comp.destroyed) fn(...args);
    };
  }
  function dedupe(results, seen) {
    return results.filter((card) => {
      if (!card || card.id == null) return true;
      if (seen.has(card.id)) return false;
      seen.add(card.id);
      return true;
    });
  }
  var nav = () => typeof Navigator !== "undefined" ? Navigator : null;
  var canMove = (dir) => {
    const n = nav();
    return !!(n && n.canmove(dir));
  };
  var move = (dir) => nav().move(dir);
  function load(kind, f, page, seen, ok, fail) {
    const q = catalogQuery(kind, f, page, todayIso());
    tmdbGet(
      q.url,
      q.params,
      (json) => ok({ ...json, results: dedupe(json && json.results || [], seen).map(toWideCard) }),
      fail
    );
  }
  function component(object) {
    const L = lampa();
    const kind = object.kind;
    object.params = { ...object.params || {}, items: { mapping: "grid", cols: COLS } };
    const comp = L.Maker.make("Category", object, (m) => m.toggle(m.MASK.base, "Pagination"));
    const f = store.filters.get(kind);
    const filter = new L.Filter(object);
    const head = document.createElement("div");
    head.className = "lh-catalog__head";
    let lastChip = false;
    const seen = /* @__PURE__ */ new Set();
    function toggleFilter() {
      L.Controller.toggle(FILTER_CONTROLLER);
    }
    function apply(patch) {
      store.filters.set(kind, { ...f, ...patch });
      L.Activity.replace({ page: 1 });
    }
    function pick(title, items, current, onPick) {
      L.Select.show({
        title,
        items: items.map((it) => ({ title: it.title, value: it.value, selected: it.value === current })),
        onSelect: (a) => onPick(a.value),
        onBack: toggleFilter
      });
    }
    function buildFilter() {
      const labels = chosenLabels(kind, f);
      filter.set("filter", [
        { title: labels.genre, lh: "genre" },
        { title: labels.year, lh: "year" }
      ]);
      filter.set("sort", Object.keys(SORT_TITLES).map((key) => ({
        title: SORT_TITLES[key],
        lh: key,
        selected: key === f.sort
      })));
      filter.onBack = toggleFilter;
      filter.onSelect = (type, a) => {
        if (type === "sort") {
          if (a.lh === f.sort) toggleFilter();
          else apply({ sort: a.lh });
        } else if (a.lh === "genre") {
          const genres = [{ title: "\u0412\u0441\u0435", value: null }].concat(
            genresFor(kind).map((g) => ({ title: g.title, value: g.id }))
          );
          pick("\u0416\u0430\u043D\u0440", genres, f.genre, (genre) => apply({ genre }));
        } else {
          pick("\u0413\u043E\u0434", yearOptions(todayIso()), f.year, (year) => apply({ year }));
        }
      };
      const line = filter.render();
      line.find(".filter--search").remove();
      line.find(".filter--filter > div").text(`${labels.genre}, ${labels.year}`).removeClass("hide");
      line.find(".filter--sort > div").text(labels.sort).removeClass("hide");
      line.find(".selector").on("hover:focus", (e) => {
        lastChip = e.target;
      });
      head.append(line[0]);
    }
    const addFilterController = () => L.Controller.add(FILTER_CONTROLLER, {
      toggle: () => {
        L.Controller.collectionSet(head);
        L.Controller.collectionFocus(lastChip, head);
      },
      left: () => {
        if (canMove("left")) move("left");
        else L.Controller.toggle("menu");
      },
      right: () => {
        if (canMove("right")) move("right");
      },
      up: () => L.Controller.toggle("head"),
      down: () => comp.start(),
      back: () => L.Activity.backward()
    });
    comp.use({
      onStart: addFilterController,
      onCreate() {
        this.render(true).classList.add("lh-catalog");
        buildFilter();
        this.render(true).prepend(head);
        this.scroll.minus(head);
        load(kind, f, 1, seen, guarded(this, this.build.bind(this)), guarded(this, this.empty.bind(this)));
      },
      onNext(resolve, reject) {
        load(kind, f, object.page, seen, guarded(this, resolve.bind(this)), guarded(this, reject.bind(this)));
      },
      onController(controller) {
        controller.up = () => {
          if (canMove("up")) move("up");
          else toggleFilter();
        };
      },
      onEmpty() {
        if (this.empty_class) {
          this.empty_class.use({
            onStart: addFilterController,
            onController: (controller) => {
              controller.up = toggleFilter;
            }
          });
        }
      },
      onInstance(item, data) {
        item.use({
          onEnter: L.Router.call.bind(L.Router, "full", data),
          onFocus() {
            L.Background.change(L.Utils.cardImgBackground(data));
          }
        });
      },
      onDestroy() {
        this.destroyed = true;
        filter.destroy();
        head.remove();
      }
    });
    return comp;
  }
  function register() {
    lampa().Component.add(NAME, component);
  }
  function open(kind, preset) {
    if (preset) store.filters.set(kind, applyPreset(store.filters.get(kind), preset));
    lampa().Activity.push({ url: "", component: NAME, kind, title: KIND_TITLES[kind], page: 1, source: "tmdb" });
  }
  function openHistory() {
    const L = lampa();
    const fav = L.Favorite;
    const base = fav && typeof fav.historyActivity === "function" ? fav.historyActivity() : { component: "favorite", type: "history", title: L.Lang.translate("title_history") };
    L.Activity.push({ url: "", page: 1, ...base });
  }
  function openForRow(rowKey) {
    if (rowKey === "history") return openHistory();
    const p = presetFor(rowKey);
    if (p) open(p.kind, p.preset);
  }

  // src/templates.js
  var BANNER = "lh_banner";
  var BANNER_HTML = `<div class="lh-banner" style="background-image:url('{backdrop}')">
  <div class="lh-banner__shade"></div>
  <div class="lh-banner__body">
    <div class="lh-banner__title">{title}</div>
    <div class="lh-banner__meta">{meta}</div>
    <div class="lh-banner__overview">{overview}</div>
    <div class="lh-banner__buttons">
      <div class="lh-banner__button lh-banner__play selector">&#9654; \u0418\u0433\u0440\u0430\u0442\u044C</div>
      <div class="lh-banner__button lh-banner__more selector">\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u0435\u0435</div>
    </div>
  </div>
</div>`;
  function esc(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/\$/g, "&#36;").replace(/\{/g, "&#123;").replace(/\}/g, "&#125;");
  }
  function genreMap(tmdbGenres, translate) {
    const map = {};
    if (!tmdbGenres) return map;
    ["movie", "tv"].forEach((type) => {
      (tmdbGenres[type] || []).forEach((g) => {
        if (map[g.id]) return;
        const name = String(translate(g.title) || "");
        if (name) map[g.id] = name.charAt(0).toUpperCase() + name.slice(1);
      });
    });
    return map;
  }
  function truncate(text, max) {
    const str = String(text == null ? "" : text);
    if (str.length <= max) return str;
    const head = str.slice(0, max - 3);
    const space = head.lastIndexOf(" ");
    const cut = space > 0 ? head.slice(0, space) : str.slice(0, max - 1);
    return cut.replace(/[\s,.;:—-]+$/, "") + "\u2026";
  }
  function bannerVars(card, { img, genres = {} }) {
    const date = card.release_date || card.first_air_date || "";
    const genre = (card.genre_ids || []).map((id) => genres[id]).find(Boolean);
    const rating = Number(card.vote_average) > 0 ? "\u2605 " + Number(card.vote_average).toFixed(1) : "";
    const meta = [date.slice(0, 4), genre, rating].filter(Boolean).join(" \xB7 ");
    const path = card.backdrop_path || card.poster_path;
    return {
      title: esc(card.title || card.name),
      meta: esc(meta),
      overview: esc(truncate(card.overview, 180)),
      backdrop: path ? esc(img(path, "w1280")) : ""
    };
  }
  function register2() {
    lampa().Template.add(BANNER, BANNER_HTML);
  }

  // src/home.js
  var NAME2 = "lh_home";
  var TITLE = "\u0413\u043B\u0430\u0432\u043D\u0430\u044F";
  var MARKER = "lh_home_live";
  function wantsBadge(rowKey, cardData) {
    if (rowKey === "anime" || rowKey === "series") return true;
    return rowKey === "history" && !!cardData.original_name;
  }
  function bannerCard(rows) {
    const row = rows.find((r) => r.params.lh_row === "movies") || rows[0];
    return row && row.results[0];
  }
  function createBanner(comp, card) {
    const L = lampa();
    const vars = bannerVars(card, {
      img: L.Api.img,
      genres: genreMap(L.Api.sources.tmdb.genres, L.Lang.translate)
    });
    const html = L.Template.get(BANNER, vars);
    const el = html[0];
    let last = false;
    html.find(".selector").on("hover:focus", function() {
      last = this;
      comp.scroll.update(el);
      L.Background.change(L.Utils.cardImgBackground(card));
    });
    html.find(".lh-banner__play").on("hover:enter", () => {
      noty("\u0418\u0433\u0440\u0430\u0442\u044C \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u043F\u043E\u0437\u0436\u0435");
      L.Router.call("full", card);
    });
    html.find(".lh-banner__more").on("hover:enter", () => L.Router.call("full", card));
    return {
      toggle() {
        L.Controller.add("lh_banner", {
          link: this,
          toggle: () => {
            L.Controller.collectionSet(el);
            L.Controller.collectionFocus(last, el);
          },
          left: () => {
            if (Navigator.canmove("left")) Navigator.move("left");
            else L.Controller.toggle("menu");
          },
          right: () => {
            if (Navigator.canmove("right")) Navigator.move("right");
          },
          up: () => comp.emit("up"),
          down: () => comp.emit("down"),
          back: () => comp.emit("back")
        });
        L.Controller.toggle("lh_banner");
      },
      render: (js) => js ? el : html,
      destroy: () => html.remove()
    };
  }
  function buildRows(loaded) {
    return loaded.filter((row) => row.results.length).map((row) => ({
      title: row.title,
      results: row.results.map(toWideCard),
      total_pages: row.total_pages || 1,
      params: { items: { view: 6 }, lh_row: row.rowKey }
    }));
  }
  function component2(object) {
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
          if (!rows.length) return this.empty();
          const banner = createBanner(this, bannerCard(rows));
          this.render(true).querySelector(".scroll__body").prepend(banner.render(true));
          this.items.push(banner);
          this.build(rows);
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
          onMore: () => openForRow(rowKey),
          onInstance(card, cardData) {
            card.use({
              onEnter: L.Router.call.bind(L.Router, "full", cardData),
              onVisible() {
                if (this.lhBadged || !wantsBadge(rowKey, cardData)) return;
                this.lhBadged = true;
                tvStatus(cardData.id, todayIso()).then((status) => {
                  if (!this.destroyed) applyBadge(card.render(true), status);
                });
              },
              onDestroy() {
                this.destroyed = true;
              },
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
  function register3() {
    lampa().Component.add(NAME2, component2);
  }
  function open2() {
    lampa().Activity.push({ component: NAME2, title: TITLE, url: "", page: 1, source: "tmdb" });
  }
  var COMPONENT = NAME2;
  var HOME_TITLE = TITLE;

  // src/menu.js
  var CATALOG_ACTIONS = ["movie", "tv", "cartoon", "anime"];
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
      if (e.type !== "action") return;
      if (e.action === "main") {
        e.abort();
        open2();
      } else if (CATALOG_ACTIONS.includes(e.action)) {
        e.abort();
        open(e.action);
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
    register2();
    register3();
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
